import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Upload from '../models/Upload';
import { parseExcelFile, validateExcelFile } from '../utils/excelParser';
import { startScraping } from '../scraper/scraper';
import { getPresignedUrl, getBulkPresignedUrls } from '../services/s3Service';
import archiver from 'archiver';

const router: express.Router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir: string = process.env.UPLOADS_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  },
});

const uploadMiddleware = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!validateExcelFile(file.originalname)) {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    } else {
      cb(null, true);
    }
  },
});

// Utility function: respond with JSON safely
function safeJsonResponse(res: express.Response, obj: any, status = 200) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    res.status(status).json(obj);
  } catch (err) {
    console.error('[safeJsonResponse] JSON serialization failed:', err);
    res.status(500).setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(
      JSON.stringify({ error: 'Failed to serialize response', details: String((err as any)?.message || err) })
    );
  }
}

// ============================================================================
// POST ROUTES - File Upload
// ============================================================================

// Upload endpoint
router.post('/', uploadMiddleware.single('file'), async (req: Request, res: Response) => {
  try {
    let { month, year } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Handle month and year as arrays (from form data) and extract the first value
    if (Array.isArray(month)) {
      month = month[0];
    }
    if (Array.isArray(year)) {
      year = year[0];
    }

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12 || yearNum < 2000 || yearNum > 2099) {
      return res.status(400).json({ error: 'Invalid month (1-12) or year (2000-2099)' });
    }

    // Parse Excel file
    const parsedData = await parseExcelFile(req.file.path, monthNum, yearNum);

    // Create upload record
    const uploadRecord = new Upload({
      filename: req.file.originalname,
      month: monthNum,
      year: yearNum,
      totalNames: parsedData.names.length,
      extractedNames: parsedData.names,
      status: 'pending',
      results: [] // Initialize empty results array
    });

    await uploadRecord.save();

    // Start scraping process asynchronously
    startScraping(uploadRecord._id.toString(), parsedData.names, monthNum, yearNum)
      .catch((error) => {
        console.error('Scraping error:', error);
        uploadRecord.status = 'failed';
        uploadRecord.errorMessage = error.message;
        uploadRecord.save();
      });

    res.json({
      message: 'File uploaded successfully',
      uploadId: uploadRecord._id,
      totalNames: parsedData.names.length,
      month: monthNum,
      year: yearNum,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET ROUTES - Fetch Data
// ============================================================================

// Get all uploads (must come BEFORE /:id route)
router.get('/list', async (req, res) => {
  try {
    const uploads = await Upload.find()
      .sort({ uploadDate: -1 })
      .limit(50);
    safeJsonResponse(res, uploads);
  } catch (error) {
    console.error('Error fetching uploads:', error);
    safeJsonResponse(res, { error: 'Failed to fetch uploads' }, 500);
  }
});

// Get all results across all uploads
router.get('/results/all', async (req, res) => {
  try {
    const uploads = await Upload.find({ status: 'completed' })
      .sort({ uploadDate: -1 })
      .select('results month year uploadDate');

    const allResults: any[] = [];
    uploads.forEach((upload) => {
      if (Array.isArray(upload.results) && upload.results.length > 0) {
        upload.results.forEach((result: any) => {
          allResults.push({
            name: result.name,
            platform: result.platform,
            found: result.found,
            s3Key: result.pdfUrl, // Store S3 key
            checkedAt: result.checkedAt,
            month: upload.month,
            year: upload.year,
            uploadId: upload._id,
          });
        });
      }
    });

    safeJsonResponse(res, allResults);
  } catch (error) {
    console.error('Error fetching results:', error);
    safeJsonResponse(res, { error: 'Failed to fetch results' }, 500);
  }
});

// Get summary stats
router.get('/results/alerts/summary', async (req, res) => {
  try {
    const { month, year } = req.query;

    let query: any = { status: 'completed' };
    if (month) query.month = parseInt(month as string);
    if (year) query.year = parseInt(year as string);

    const uploads = await Upload.find(query).select('results');

    let totalAlerts = 0;
    const uniqueNames = new Set();

    uploads.forEach((upload) => {
      if (Array.isArray(upload.results) && upload.results.length > 0) {
        upload.results.forEach((result: any) => {
          if (result.found) {
            totalAlerts++;
            uniqueNames.add(result.name);
          }
        });
      }
    });

    safeJsonResponse(res, {
      totalAlerts,
      uniqueNames: uniqueNames.size,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    safeJsonResponse(res, { error: 'Failed to fetch summary' }, 500);
  }
});

// Get all pre-signed URLs for an upload
router.get('/:id/pdfs/urls', async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);

    if (!upload) {
      return safeJsonResponse(res, { error: 'Upload not found' }, 404);
    }

    // Get all S3 keys
    const s3Keys = (Array.isArray(upload.results) ? upload.results : [])
      .filter((r) => r && r.pdfUrl)
      .map((r) => r.pdfUrl as string);

    if (s3Keys.length === 0) {
      return safeJsonResponse(res, { urls: [] });
    }

    // Generate pre-signed URLs for all PDFs
    const urlMap = await getBulkPresignedUrls(s3Keys, 3600);

    // Map results with their signed URLs
    const resultsWithUrls = (Array.isArray(upload.results) ? upload.results : [])
      .map((result, index) => {
        if (!result || !result.pdfUrl) return null;

        return {
          index,
          name: result.name,
          platform: result.platform,
          found: result.found,
          signedUrl: urlMap.get(result.pdfUrl) || null,
          s3Key: result.pdfUrl,
        };
      })
      .filter((r) => r !== null && r.signedUrl !== null);

    safeJsonResponse(res, {
      urls: resultsWithUrls,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating bulk pre-signed URLs:', error);
    safeJsonResponse(res, { error: 'Failed to generate download URLs' }, 500);
  }
});

// Get pre-signed URL for a specific PDF
router.get('/:id/pdf/:resultIndex/url', async (req, res) => {
  try {
    const { id, resultIndex } = req.params;
    const upload = await Upload.findById(id);

    if (!upload) {
      return safeJsonResponse(res, { error: 'Upload not found' }, 404);
    }

    const index = parseInt(resultIndex);
    if (
      isNaN(index) ||
      index < 0 ||
      !Array.isArray(upload.results) ||
      index >= upload.results.length
    ) {
      return safeJsonResponse(res, { error: 'Result not found' }, 404);
    }

    const result = upload.results[index];
    if (!result || !result.pdfUrl) {
      return safeJsonResponse(res, { error: 'PDF not available' }, 404);
    }

    // Generate pre-signed URL (valid for 1 hour)
    const signedUrl = await getPresignedUrl(result.pdfUrl, 3600);

    if (!signedUrl) {
      return safeJsonResponse(res, { error: 'Failed to generate download URL' }, 500);
    }

    safeJsonResponse(res, { url: signedUrl, expiresIn: 3600 });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    safeJsonResponse(res, { error: 'Failed to generate download URL' }, 500);
  }
});

// Download all PDFs as ZIP
router.get('/:id/pdfs/download-zip', async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);

    if (!upload) {
      return safeJsonResponse(res, { error: 'Upload not found' }, 404);
    }

    const { platform, status } = req.query;

    // Filter results based on query params
    let filteredResults = (Array.isArray(upload.results) ? upload.results : []).filter(
      (r) => r && r.pdfUrl
    );

    if (platform) {
      filteredResults = filteredResults.filter((r) => r.platform === platform);
    }

    if (status === 'found') {
      filteredResults = filteredResults.filter((r) => r.found);
    } else if (status === 'not-found') {
      filteredResults = filteredResults.filter((r) => !r.found);
    }

    if (filteredResults.length === 0) {
      return safeJsonResponse(res, { error: 'No PDFs match the criteria' }, 404);
    }

    // Generate pre-signed URLs
    const s3Keys = filteredResults.map((r) => r.pdfUrl as string);
    const urlMap = await getBulkPresignedUrls(s3Keys, 300); // 5 minutes for download

    // Set response headers for ZIP download
    const zipFilename = `compliance_pdfs_${upload.month}_${upload.year}_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    archive.on('error', (err: any) => {
      console.error('[ZIP] Error creating archive:', err);
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        archive.abort();
      }
    });

    archive.pipe(res);

    // Create manifest
    const manifest = filteredResults.map((result, index) => {
      const signedUrl = urlMap.get(result.pdfUrl as string);
      const folder = result.found ? 'found' : 'not-found';
      const safeName =
        typeof result.name === 'string'
          ? result.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '')
          : `name_${index}`;
      const safePlatform =
        typeof result.platform === 'string'
          ? result.platform.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '')
          : 'platform';
      const filename = `${safeName}_${safePlatform}.pdf`;

      return {
        name: result.name,
        platform: result.platform,
        status: result.found ? 'FOUND' : 'NOT FOUND',
        folder: `${safePlatform}/${folder}`,
        filename,
        downloadUrl: signedUrl,
      };
    });

    // Add manifest as JSON
    try {
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    } catch (jsonErr) {
      archive.append('[]', { name: 'manifest.json' });
      console.error('ZIP: Error serializing manifest json:', jsonErr);
    }

    // Add manifest as CSV
    let csv = 'Name,Platform,Status,Folder,Filename,Download URL\n';
    manifest.forEach((item) => {
      const safeVals = [item.name, item.platform, item.status, item.folder, item.filename, item.downloadUrl]
        .map((val) => String(val).replace(/"/g, '""'));
      csv += `"${safeVals[0]}","${safeVals[1]}","${safeVals[2]}","${safeVals[3]}","${safeVals[4]}","${safeVals[5]}"\n`;
    });
    archive.append(csv, { name: 'download_links.csv' });

    // Finalize the archive
    await archive.finalize();

    console.log(`[ZIP] Created archive with ${filteredResults.length} PDFs`);
  } catch (error) {
    console.error('Error creating ZIP:', error);
    if (!res.headersSent) {
      safeJsonResponse(res, { error: 'Failed to create ZIP file' }, 500);
    }
  }
});

// Get single upload with full details (MUST be last to avoid route conflicts)
router.get('/:id', async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);

    if (!upload) {
      return safeJsonResponse(res, { error: 'Upload not found' }, 404);
    }

    const uploadData = upload.toObject();
    console.log(`[API] Upload ${req.params.id} has ${uploadData.results?.length || 0} results`);

    if (uploadData.results && uploadData.results.length > 0) {
      const pdfCount = uploadData.results.filter((r: any) => r.pdfUrl).length;
      console.log(`[API] ${pdfCount} results have PDF URLs`);
    }

    safeJsonResponse(res, uploadData);
  } catch (error: any) {
    console.error('[API] Error fetching upload:', error);
    safeJsonResponse(res, { error: error.message }, 500);
  }
});

export default router;
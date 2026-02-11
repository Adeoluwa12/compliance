// import puppeteer from 'puppeteer';
// import fs from 'fs';
// import path from 'path';
// import Upload from '../models/Upload';
// import { uploadPdfToS3 } from '../services/s3Service';
// import { sendAlertEmail } from '../services/emailService';
// // import document from 'next/document';
// import { getPuppeteerConfig } from '../config/puppeteer';

// export async function startScraping(
//   uploadId: string,
//   names: string[],
//   month: number,
//   year: number
// ) {
//   const upload = await Upload.findById(uploadId);
//   if (!upload) {
//     console.error(`[Scraper] Upload not found: ${uploadId}`);
//     return;
//   }

//   upload.status = 'processing';
//   upload.extractedNames = names;
//   await upload.save();

//   // const browser = await puppeteer.launch({
//   //   headless: true,
//   //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
//   // });

//   const browser = await puppeteer.launch(getPuppeteerConfig());
//   const foundNames: { [key: string]: string[] } = {};

//   try {
//     for (const name of names) {
//       console.log(`[Scraper] Processing name: ${name}`);
//       const nameParts = name.trim().split(/\s+/);
//       const firstName = nameParts.slice(0, -1).join(' ') || '';
//       const lastName = nameParts[nameParts.length - 1] || '';

//       const searchResults: Array<{
//         platform: string;
//         found: boolean;
//         pdfUrl: string | null;
//       }> = [];

//       // ============================================
//       // 1. OPENSANCTIONS SEARCH
//       // ============================================
//       console.log(`\n[OpenSanctions] Searching for: ${name}`);
//       const page1 = await browser.newPage();
//       page1.setDefaultTimeout(45000);
//       page1.setDefaultNavigationTimeout(45000);

//       try {
//         // Navigate to the dataset page
//         await page1.goto('https://www.opensanctions.org/datasets/us_tn_med_exclusions/', {
//           waitUntil: 'networkidle2',
//           timeout: 30000,
//         });
//         console.log(`[OpenSanctions] Page loaded`);

//         // Wait for search input to be available
//         await page1.waitForSelector('input[name="q"]', { timeout: 10000 });

//         // Fill the search form with full name
//         await page1.type('input[name="q"]', name, { delay: 50 });
//         console.log(`[OpenSanctions] Typed name: ${name}`);

//         // Click the search button and wait for navigation
//         await Promise.all([
//           page1.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
//           page1.click('button[type="submit"]'),
//         ]);
//         console.log(`[OpenSanctions] Search submitted, results page loaded`);

//         // Wait a bit for content to render
//         await new Promise((resolve) => setTimeout(resolve, 2000));

//         // Check for results
//         let found = false;

//         try {

//           // const pageText = await page1.evaluate(() => {
//           //   return document.body.innerText;
//           // });
//           const pageText = await page1.evaluate(() => {
//             return document.body?.innerText || '';
//           });
          
//           // Check for "no results" message
//           found = !pageText.includes('No matching entities were found') &&
//                   !pageText.includes('Try searching a partial name');
          
//           console.log(`[OpenSanctions] Result: ${found ? 'FOUND' : 'NOT FOUND'}`);
//         } catch (evalError) {
//           console.warn(`[OpenSanctions] Could not evaluate page`);
//           found = false;
//         }

//         // Generate and upload PDF
//         let pdfUrl: string | null = null;
//         try {
//           const tmpDir = path.join(process.cwd(), 'tmp');
//           if (!fs.existsSync(tmpDir)) {
//             fs.mkdirSync(tmpDir, { recursive: true });
//           }

//           const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
//           const pdfPath = path.join(tmpDir, `os_${sanitizedName}_${Date.now()}.pdf`);

//           await page1.pdf({
//             path: pdfPath,
//             format: 'A4',
//             printBackground: true,
//           });

//           console.log(`[PDF] Generated: ${pdfPath}`);

//           // Upload to S3
//           const resultFolder = found ? 'found' : 'not-found';
//           const s3Key = `compliance/${year}/${month}/opensanctions/${resultFolder}/${sanitizedName}_${Date.now()}.pdf`;

//           pdfUrl = await uploadPdfToS3(pdfPath, s3Key);

//           if (pdfUrl) {
//             console.log(`[S3] Uploaded OpenSanctions PDF: ${pdfUrl}`);
//           }

//           // Clean up local file
//           if (fs.existsSync(pdfPath)) {
//             fs.unlinkSync(pdfPath);
//           }
//         } catch (pdfError) {
//           console.error(`[PDF] Error generating OpenSanctions PDF:`, pdfError);
//         }

//         searchResults.push({
//           platform: 'opensanctions',
//           found,
//           pdfUrl,
//         });

//         if (found) {
//           foundNames[name] = [...(foundNames[name] || []), 'opensanctions'];
//         }
//       } catch (error) {
//         console.error(`[OpenSanctions] Error:`, error);
//         searchResults.push({
//           platform: 'opensanctions',
//           found: false,
//           pdfUrl: null,
//         });
//       } finally {
//         await page1.close();
//       }

//       // ============================================
//       // 2. HHS EXCLUSIONS SEARCH
//       // ============================================
//       console.log(`\n[HHS] Searching for: ${firstName} ${lastName}`);
//       const page2 = await browser.newPage();
//       page2.setDefaultTimeout(45000);
//       page2.setDefaultNavigationTimeout(45000);

//       try {
//         await page2.goto('https://exclusions.oig.hhs.gov/', {
//           waitUntil: 'domcontentloaded',
//           timeout: 30000,
//         });
//         console.log(`[HHS] Main page loaded`);

//         // Wait for form to be ready
//         await page2.waitForSelector('input[name="ctl00$cpExclusions$txtSPLastName"]', { timeout: 10000 });

//         // Fill Last Name
//         await page2.type('input[name="ctl00$cpExclusions$txtSPLastName"]', lastName, {
//           delay: 50,
//         });
//         console.log(`[HHS] Typed last name: ${lastName}`);

//         // Fill First Name if available
//         if (firstName) {
//           await page2.type('input[name="ctl00$cpExclusions$txtSPFirstName"]', firstName, {
//             delay: 50,
//           });
//           console.log(`[HHS] Typed first name: ${firstName}`);
//         }

//         // Click search button and wait for navigation
//         await Promise.all([
//           page2.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
//           page2.click('input[name="ctl00$cpExclusions$ibSearchSP"]'),
//         ]);
//         console.log(`[HHS] Search submitted, results page loaded`);

//         // Wait for results to render
//         await new Promise((resolve) => setTimeout(resolve, 2000));

//         // Check results
//         let found = false;

//         try {

//           // const pageText = await page2.evaluate(() => {
//           //   return document.body.innerText;
//           // });

//           const pageText = await page2.evaluate(() => {
//             return document.body?.innerText || '';
//           });
          
//           // Check for "no results" message
//           found = !pageText.includes('No Results were found') &&
//                   pageText.includes('Exclusions Search Results');

//           console.log(`[HHS] Result: ${found ? 'FOUND' : 'NOT FOUND'}`);
//         } catch (evalError) {
//           console.warn(`[HHS] Could not evaluate results`);
//           found = false;
//         }

//         // Generate and upload PDF
//         let pdfUrl: string | null = null;
//         try {
//           const tmpDir = path.join(process.cwd(), 'tmp');
//           if (!fs.existsSync(tmpDir)) {
//             fs.mkdirSync(tmpDir, { recursive: true });
//           }

//           const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
//           const pdfPath = path.join(tmpDir, `hhs_${sanitizedName}_${Date.now()}.pdf`);

//           await page2.pdf({
//             path: pdfPath,
//             format: 'A4',
//             printBackground: true,
//           });

//           console.log(`[PDF] Generated: ${pdfPath}`);

//           // Upload to S3
//           const resultFolder = found ? 'found' : 'not-found';
//           const s3Key = `compliance/${year}/${month}/hhs/${resultFolder}/${sanitizedName}_${Date.now()}.pdf`;

//           pdfUrl = await uploadPdfToS3(pdfPath, s3Key);

//           if (pdfUrl) {
//             console.log(`[S3] Uploaded HHS PDF: ${pdfUrl}`);
//           }

//           // Clean up local file
//           if (fs.existsSync(pdfPath)) {
//             fs.unlinkSync(pdfPath);
//           }
//         } catch (pdfError) {
//           console.error(`[PDF] Error generating HHS PDF:`, pdfError);
//         }

//         searchResults.push({
//           platform: 'hhs',
//           found,
//           pdfUrl,
//         });

//         if (found) {
//           foundNames[name] = [...(foundNames[name] || []), 'hhs'];
//         }
//       } catch (error) {
//         console.error(`[HHS] Error:`, error);
//         searchResults.push({
//           platform: 'hhs',
//           found: false,
//           pdfUrl: null,
//         });
//       } finally {
//         await page2.close();
//       }

//       // Save all results for this name
//       searchResults.forEach((result) => {
//         upload.results.push({
//           name,
//           found: result.found,
//           platform: result.platform,
//           pdfUrl: result.pdfUrl,
//           checkedAt: new Date(),
//         });
//       });

//       upload.processedNames = (upload.processedNames || 0) + 1;
//       await upload.save();

//       console.log(`[DB] Saved ${searchResults.length} results for ${name}\n`);
//     }

//     // Send email alert if any names found
//     if (Object.keys(foundNames).length > 0) {
//       console.log(`\n[Email] Sending alerts for ${Object.keys(foundNames).length} names...`);
//       try {
//         await sendAlertEmail(foundNames, month, year);
//         console.log('[Email] Alert sent successfully');
//       } catch (emailError) {
//         console.error('[Email] Error sending alert:', emailError);
//       }
//     }

//     upload.status = 'completed';
//     await upload.save();
//     console.log(`\n[Scraper] COMPLETED - ${upload.processedNames}/${names.length} names processed`);
//   } catch (error) {
//     console.error(`[Scraper] Fatal error:`, error);
//     upload.status = 'failed';
//     upload.errorMessage = (error as Error).message;
//     await upload.save();
//   } finally {
//     try {
//       await browser.close();
//     } catch (closeError) {
//       console.error(`[Browser] Close error:`, closeError);
//     }
//   }
// }



// // // import puppeteer from 'puppeteer';
// // import { getPuppeteerConfig } from '../config/puppeteer';

// // import fs from 'fs';
// // import path from 'path';
// // import Upload from '../models/Upload';
// // import { uploadPdfToS3 } from '../services/s3Service';
// // import { sendAlertEmail } from '../services/emailService';
// // import document from 'next/document';
// // import puppeteer from 'puppeteer';

// // // const browser = await puppeteer.launch(getPuppeteerConfig());

// // export async function startScraping(
// //   uploadId: string,
// //   names: string[],
// //   month: number,
// //   year: number
// // ) {
// //   const upload = await Upload.findById(uploadId);
// //   if (!upload) {
// //     console.error(`[Scraper] Upload not found: ${uploadId}`);
// //     return;
// //   }

// //   upload.status = 'processing';
// //   upload.extractedNames = names;
// //   await upload.save();

// //   // const browser = await puppeteer.launch({
// //   //   headless: true,
// //   //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
// //   // });

// //   const browser = await puppeteer.launch(getPuppeteerConfig());
// //   const foundNames: { [key: string]: string[] } = {};

// //   try {
// //     for (const name of names) {
// //       console.log(`[Scraper] Processing name: ${name}`);
// //       const nameParts = name.trim().split(/\s+/);
// //       const firstName = nameParts.slice(0, -1).join(' ') || '';
// //       const lastName = nameParts[nameParts.length - 1] || '';

// //       const searchResults: Array<{
// //         platform: string;
// //         found: boolean;
// //         pdfUrl: string | null;
// //       }> = [];

// //       // ============================================
// //       // 1. OPENSANCTIONS SEARCH
// //       // ============================================
// //       console.log(`\n[OpenSanctions] Searching for: ${name}`);
// //       const page1 = await browser.newPage();
// //       page1.setDefaultTimeout(45000);
// //       page1.setDefaultNavigationTimeout(45000);

// //       try {
// //         // Navigate to the dataset page
// //         await page1.goto('https://www.opensanctions.org/datasets/us_tn_med_exclusions/', {
// //           waitUntil: 'networkidle2',
// //           timeout: 30000,
// //         });
// //         console.log(`[OpenSanctions] Page loaded`);

// //         // Wait for search input to be available
// //         await page1.waitForSelector('input[name="q"]', { timeout: 10000 });

// //         // Fill the search form with full name
// //         await page1.type('input[name="q"]', name, { delay: 50 });
// //         console.log(`[OpenSanctions] Typed name: ${name}`);

// //         // Click the search button and wait for navigation
// //         await Promise.all([
// //           page1.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
// //           page1.click('button[type="submit"]'),
// //         ]);
// //         console.log(`[OpenSanctions] Search submitted, results page loaded`);

// //         // Wait a bit for content to render
// //         await new Promise((resolve) => setTimeout(resolve, 2000));

// //         // Check for results
// //         let found = false;
// //         try {
// //           const pageText = await page1.evaluate(() => {
// //             // Ensure 'document' is typed as 'any' to access 'body'
// //             return (document as any).body.innerText;
// //           });

// //           // Check for "no results" message
// //           found = !pageText.includes('No matching entities were found') &&
// //                   !pageText.includes('Try searching a partial name');

// //           console.log(`[OpenSanctions] Result: ${found ? 'FOUND' : 'NOT FOUND'}`);
// //         } catch (evalError) {
// //           console.warn(`[OpenSanctions] Could not evaluate page`);
// //           found = false;
// //         }

// //         // Generate and upload PDF
// //         let opensanctionsS3Key: string | null = null;
// //         try {
// //           const tmpDir = path.join(process.cwd(), 'tmp');
// //           if (!fs.existsSync(tmpDir)) {
// //             fs.mkdirSync(tmpDir, { recursive: true });
// //           }

// //           const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
// //           const now = Date.now();
// //           const pdfPath = path.join(tmpDir, `os_${sanitizedName}_${now}.pdf`);

// //           await page1.pdf({
// //             path: pdfPath,
// //             format: 'A4',
// //             printBackground: true,
// //           });

// //           console.log(`[PDF] Generated: ${pdfPath}`);

// //           // Prepare S3 key and upload PDF
// //           const resultFolder = found ? 'found' : 'not-found';
// //           const s3Key = `compliance/${year}/${month}/opensanctions/${resultFolder}/${sanitizedName}_${now}.pdf`;

// //           opensanctionsS3Key = await uploadPdfToS3(pdfPath, s3Key);

// //           if (opensanctionsS3Key) {
// //             console.log(`[S3] Uploaded OpenSanctions PDF with key: ${opensanctionsS3Key}`);
// //           }

// //           // Clean up local file
// //           if (fs.existsSync(pdfPath)) {
// //             fs.unlinkSync(pdfPath);
// //           }
// //         } catch (pdfError) {
// //           console.error(`[PDF] Error generating OpenSanctions PDF:`, pdfError);
// //         }

// //         searchResults.push({
// //           platform: 'opensanctions',
// //           found,
// //           pdfUrl: opensanctionsS3Key, // Save S3 key, not URL
// //         });

// //         if (found) {
// //           foundNames[name] = [...(foundNames[name] || []), 'opensanctions'];
// //         }
// //       } catch (error) {
// //         console.error(`[OpenSanctions] Error:`, error);
// //         searchResults.push({
// //           platform: 'opensanctions',
// //           found: false,
// //           pdfUrl: null,
// //         });
// //       } finally {
// //         await page1.close();
// //       }

// //       // ============================================
// //       // 2. HHS EXCLUSIONS SEARCH
// //       // ============================================
// //       console.log(`\n[HHS] Searching for: ${firstName} ${lastName}`);
// //       const page2 = await browser.newPage();
// //       page2.setDefaultTimeout(45000);
// //       page2.setDefaultNavigationTimeout(45000);

// //       try {
// //         await page2.goto('https://exclusions.oig.hhs.gov/', {
// //           waitUntil: 'domcontentloaded',
// //           timeout: 30000,
// //         });
// //         console.log(`[HHS] Main page loaded`);

// //         // Wait for form to be ready
// //         await page2.waitForSelector('input[name="ctl00$cpExclusions$txtSPLastName"]', { timeout: 10000 });

// //         // Fill Last Name
// //         await page2.type('input[name="ctl00$cpExclusions$txtSPLastName"]', lastName, {
// //           delay: 50,
// //         });
// //         console.log(`[HHS] Typed last name: ${lastName}`);

// //         // Fill First Name if available
// //         if (firstName) {
// //           await page2.type('input[name="ctl00$cpExclusions$txtSPFirstName"]', firstName, {
// //             delay: 50,
// //           });
// //           console.log(`[HHS] Typed first name: ${firstName}`);
// //         }

// //         // Click search button and wait for navigation
// //         await Promise.all([
// //           page2.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
// //           page2.click('input[name="ctl00$cpExclusions$ibSearchSP"]'),
// //         ]);
// //         console.log(`[HHS] Search submitted, results page loaded`);

// //         // Wait for results to render
// //         await new Promise((resolve) => setTimeout(resolve, 2000));

// //         // Check results
// //         let found = false;
// //         try {
// //           const pageText = await page2.evaluate(() => {
// //             // Ensure 'document' is typed as 'any' to access 'body'
// //             return (document as any).body.innerText;
// //           });

// //           // Check for "no results" message
// //           found = !pageText.includes('No Results were found') &&
// //                   pageText.includes('Exclusions Search Results');

// //           console.log(`[HHS] Result: ${found ? 'FOUND' : 'NOT FOUND'}`);
// //         } catch (evalError) {
// //           console.warn(`[HHS] Could not evaluate results`);
// //           found = false;
// //         }

// //         // Generate and upload PDF
// //         let hhsS3Key: string | null = null;
// //         try {
// //           const tmpDir = path.join(process.cwd(), 'tmp');
// //           if (!fs.existsSync(tmpDir)) {
// //             fs.mkdirSync(tmpDir, { recursive: true });
// //           }

// //           const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
// //           const now = Date.now();
// //           const pdfPath = path.join(tmpDir, `hhs_${sanitizedName}_${now}.pdf`);

// //           await page2.pdf({
// //             path: pdfPath,
// //             format: 'A4',
// //             printBackground: true,
// //           });

// //           console.log(`[PDF] Generated: ${pdfPath}`);

// //           // Prepare S3 key and upload PDF
// //           const resultFolder = found ? 'found' : 'not-found';
// //           const s3Key = `compliance/${year}/${month}/hhs/${resultFolder}/${sanitizedName}_${now}.pdf`;

// //           hhsS3Key = await uploadPdfToS3(pdfPath, s3Key);

// //           if (hhsS3Key) {
// //             console.log(`[S3] Uploaded HHS PDF with key: ${hhsS3Key}`);
// //           }

// //           // Clean up local file
// //           if (fs.existsSync(pdfPath)) {
// //             fs.unlinkSync(pdfPath);
// //           }
// //         } catch (pdfError) {
// //           console.error(`[PDF] Error generating HHS PDF:`, pdfError);
// //         }

// //         searchResults.push({
// //           platform: 'hhs',
// //           found,
// //           pdfUrl: hhsS3Key, // Save S3 key, not URL
// //         });

// //         if (found) {
// //           foundNames[name] = [...(foundNames[name] || []), 'hhs'];
// //         }
// //       } catch (error) {
// //         console.error(`[HHS] Error:`, error);
// //         searchResults.push({
// //           platform: 'hhs',
// //           found: false,
// //           pdfUrl: null,
// //         });
// //       } finally {
// //         await page2.close();
// //       }

// //       // Save all results for this name
// //       searchResults.forEach((result) => {
// //         upload.results.push({
// //           name,
// //           found: result.found,
// //           platform: result.platform,
// //           pdfUrl: result.pdfUrl,
// //           checkedAt: new Date(),
// //         });
// //       });

// //       upload.processedNames = (upload.processedNames || 0) + 1;
// //       await upload.save();

// //       console.log(`[DB] Saved ${searchResults.length} results for ${name}\n`);
// //     }

// //     // Send email alert if any names found
// //     if (Object.keys(foundNames).length > 0) {
// //       console.log(`\n[Email] Sending alerts for ${Object.keys(foundNames).length} names...`);
// //       try {
// //         await sendAlertEmail(foundNames, month, year);
// //         console.log('[Email] Alert sent successfully');
// //       } catch (emailError) {
// //         console.error('[Email] Error sending alert:', emailError);
// //       }
// //     }

// //     upload.status = 'completed';
// //     await upload.save();
// //     console.log(`\n[Scraper] COMPLETED - ${upload.processedNames}/${names.length} names processed`);
// //   } catch (error) {
// //     console.error(`[Scraper] Fatal error:`, error);
// //     upload.status = 'failed';
// //     upload.errorMessage = (error as Error).message;
// //     await upload.save();
// //   } finally {
// //     try {
// //       await browser.close();
// //     } catch (closeError) {
// //       console.error(`[Browser] Close error:`, closeError);
// //     }
// //   }
// // }


import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import Upload from '../models/Upload';
import { uploadPdfToS3 } from '../services/s3Service';
import { sendAlertEmail } from '../services/emailService';
import { getPuppeteerConfig } from '../config/puppeteer';

export async function startScraping(
  uploadId: string,
  names: string[],
  month: number,
  year: number
) {
  const upload = await Upload.findById(uploadId);
  if (!upload) {
    console.error(`[Scraper] Upload not found: ${uploadId}`);
    return;
  }

  upload.status = 'processing';
  upload.extractedNames = names;
  await upload.save();

  const browser = await puppeteer.launch(getPuppeteerConfig());
  const foundNames: { [key: string]: string[] } = {};

  try {
    for (const name of names) {
      console.log(`[Scraper] Processing name: ${name}`);
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts.slice(0, -1).join(' ') || '';
      const lastName = nameParts[nameParts.length - 1] || '';

      const searchResults: Array<{
        platform: string;
        found: boolean;
        pdfUrl: string | null;
      }> = [];

      // ============================================
      // 1. OPENSANCTIONS SEARCH
      // ============================================
      console.log(`\n[OpenSanctions] Searching for: ${name}`);
      const page1 = await browser.newPage();
      page1.setDefaultTimeout(45000);
      page1.setDefaultNavigationTimeout(45000);

      try {
        await page1.goto('https://www.opensanctions.org/datasets/us_tn_med_exclusions/', {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
        console.log(`[OpenSanctions] Page loaded`);

        await page1.waitForSelector('input[name="q"]', { timeout: 10000 });
        await page1.type('input[name="q"]', name, { delay: 50 });
        console.log(`[OpenSanctions] Typed name: ${name}`);

        await Promise.all([
          page1.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          page1.click('button[type="submit"]'),
        ]);
        console.log(`[OpenSanctions] Search submitted, results page loaded`);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        let found = false;
        try {
          const pageText = await page1.evaluate(() => {
            return document.body?.innerText || '';
          });
          
          found = !pageText.includes('No matching entities were found') &&
                  !pageText.includes('Try searching a partial name');
          
          console.log(`[OpenSanctions] Result: ${found ? 'FOUND' : 'NOT FOUND'}`);
        } catch (evalError) {
          console.warn(`[OpenSanctions] Could not evaluate page`);
          found = false;
        }

        // Generate and upload PDF
        let pdfUrl: string | null = null;
        try {
          const tmpDir = path.join(process.cwd(), 'tmp');
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }

          const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
          const pdfPath = path.join(tmpDir, `os_${sanitizedName}_${Date.now()}.pdf`);

          await page1.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
          });

          console.log(`[PDF] Generated: ${pdfPath}`);

          const resultFolder = found ? 'found' : 'not-found';
          const s3Key = `compliance/${year}/${month}/opensanctions/${resultFolder}/${sanitizedName}_${Date.now()}.pdf`;

          pdfUrl = await uploadPdfToS3(pdfPath, s3Key);

          if (pdfUrl) {
            console.log(`[S3] Uploaded OpenSanctions PDF: ${pdfUrl}`);
          }

          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
          }
        } catch (pdfError) {
          console.error(`[PDF] Error generating OpenSanctions PDF:`, pdfError);
        }

        searchResults.push({
          platform: 'opensanctions',
          found,
          pdfUrl,
        });

        if (found) {
          foundNames[name] = [...(foundNames[name] || []), 'opensanctions'];
        }
      } catch (error) {
        console.error(`[OpenSanctions] Error:`, error);
        searchResults.push({
          platform: 'opensanctions',
          found: false,
          pdfUrl: null,
        });
      } finally {
        await page1.close();
      }

      // ============================================
      // 2. HHS EXCLUSIONS SEARCH
      // ============================================
      console.log(`\n[HHS] Searching for: ${firstName} ${lastName}`);
      const page2 = await browser.newPage();
      page2.setDefaultTimeout(45000);
      page2.setDefaultNavigationTimeout(45000);

      try {
        await page2.goto('https://exclusions.oig.hhs.gov/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        console.log(`[HHS] Main page loaded`);

        await page2.waitForSelector('input[name="ctl00$cpExclusions$txtSPLastName"]', { timeout: 10000 });

        await page2.type('input[name="ctl00$cpExclusions$txtSPLastName"]', lastName, {
          delay: 50,
        });
        console.log(`[HHS] Typed last name: ${lastName}`);

        if (firstName) {
          await page2.type('input[name="ctl00$cpExclusions$txtSPFirstName"]', firstName, {
            delay: 50,
          });
          console.log(`[HHS] Typed first name: ${firstName}`);
        }

        await Promise.all([
          page2.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          page2.click('input[name="ctl00$cpExclusions$ibSearchSP"]'),
        ]);
        console.log(`[HHS] Search submitted, results page loaded`);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        let found = false;
        try {
          const pageText = await page2.evaluate(() => {
            return document.body?.innerText || '';
          });
          
          found = !pageText.includes('No Results were found') &&
                  pageText.includes('Exclusions Search Results');

          console.log(`[HHS] Result: ${found ? 'FOUND' : 'NOT FOUND'}`);
        } catch (evalError) {
          console.warn(`[HHS] Could not evaluate results`);
          found = false;
        }

        // Generate and upload PDF
        let pdfUrl: string | null = null;
        try {
          const tmpDir = path.join(process.cwd(), 'tmp');
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }

          const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
          const pdfPath = path.join(tmpDir, `hhs_${sanitizedName}_${Date.now()}.pdf`);

          await page2.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
          });

          console.log(`[PDF] Generated: ${pdfPath}`);

          const resultFolder = found ? 'found' : 'not-found';
          const s3Key = `compliance/${year}/${month}/hhs/${resultFolder}/${sanitizedName}_${Date.now()}.pdf`;

          pdfUrl = await uploadPdfToS3(pdfPath, s3Key);

          if (pdfUrl) {
            console.log(`[S3] Uploaded HHS PDF: ${pdfUrl}`);
          }

          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
          }
        } catch (pdfError) {
          console.error(`[PDF] Error generating HHS PDF:`, pdfError);
        }

        searchResults.push({
          platform: 'hhs',
          found,
          pdfUrl,
        });

        if (found) {
          foundNames[name] = [...(foundNames[name] || []), 'hhs'];
        }
      } catch (error) {
        console.error(`[HHS] Error:`, error);
        searchResults.push({
          platform: 'hhs',
          found: false,
          pdfUrl: null,
        });
      } finally {
        await page2.close();
      }

      // Save all results for this name
      searchResults.forEach((result) => {
        upload.results.push({
          name,
          found: result.found,
          platform: result.platform,
          pdfUrl: result.pdfUrl,
          checkedAt: new Date(),
        });
      });

      upload.processedNames = (upload.processedNames || 0) + 1;
      await upload.save();

      console.log(`[DB] Saved ${searchResults.length} results for ${name}\n`);
    }

    // Send email alert if any names found
    if (Object.keys(foundNames).length > 0) {
      console.log(`\n[Email] Sending alerts for ${Object.keys(foundNames).length} names...`);
      try {
        await sendAlertEmail(foundNames, month, year);
        console.log('[Email] Alert sent successfully');
      } catch (emailError) {
        console.error('[Email] Error sending alert:', emailError);
      }
    }

    upload.status = 'completed';
    await upload.save();
    console.log(`\n[Scraper] COMPLETED - ${upload.processedNames}/${names.length} names processed`);
  } catch (error) {
    console.error(`[Scraper] Fatal error:`, error);
    upload.status = 'failed';
    upload.errorMessage = (error as Error).message;
    await upload.save();
  } finally {
    try {
      await browser.close();
    } catch (closeError) {
      console.error(`[Browser] Close error:`, closeError);
    }
  }
}
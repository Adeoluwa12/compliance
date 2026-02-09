// import express, { Request, Response } from 'express';
// import SearchResult from '../models/SearchResult';
// import Alert from '../models/Alert';

// const router: express.Router = express.Router();

// /**
//  * =========================
//  * RESULTS
//  * =========================
//  */

// // Get search results for an upload
// router.get('/upload/:uploadId', async (req: Request, res: Response) => {
//   try {
//     const results = await SearchResult.find({
//       uploadId: req.params.uploadId,
//     }).sort({ searchDate: -1 });

//     res.json(results);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get search results by platform
// router.get('/platform/:platform', async (req: Request, res: Response) => {
//   try {
//     const { month, year } = req.query;

//     const query: any = { platform: req.params.platform };
//     if (month) query.month = Number(month);
//     if (year) query.year = Number(year);

//     const results = await SearchResult.find(query).sort({
//       searchDate: -1,
//     });

//     res.json(results);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get results by month/year
// router.get('/by-month/:month/:year', async (req: Request, res: Response) => {
//   try {
//     const { month, year } = req.params;

//     const results = await SearchResult.find({
//       month: Number(month),
//       year: Number(year),
//     }).sort({ platform: 1, searchDate: -1 });

//     res.json(results);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// /**
//  * =========================
//  * FOLDER STRUCTURE ROUTES
//  * =========================
//  */

// // 1️⃣ List available folders (year + month)
// router.get('/folders', async (_req: Request, res: Response) => {
//   try {
//     const folders = await SearchResult.aggregate([
//       {
//         $group: {
//           _id: {
//             year: '$year',
//             month: '$month',
//           },
//         },
//       },
//       { $sort: { '_id.year': -1, '_id.month': -1 } },
//     ]);

//     res.json(folders.map(f => f._id));
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // 2️⃣ List platforms inside a month/year folder
// router.get(
//   '/folders/:year/:month/platforms',
//   async (req: Request, res: Response) => {
//     try {
//       const { year, month } = req.params;

//       const platforms = await SearchResult.distinct('platform', {
//         year: Number(year),
//         month: Number(month),
//       });

//       res.json(platforms);
//     } catch (error: any) {
//       res.status(500).json({ error: error.message });
//     }
//   }
// );

// // 3️⃣ List PDFs inside a folder
// router.get(
//   '/folders/:year/:month/:platform/:found',
//   async (req: Request, res: Response) => {
//     try {
//       const { year, month, platform, found } = req.params;

//       const results = await SearchResult.find({
//         year: Number(year),
//         month: Number(month),
//         platform,
//         found: found === 'found',
//       }).select('name pdfUrl searchDate');

//       res.json(results);
//     } catch (error: any) {
//       res.status(500).json({ error: error.message });
//     }
//   }
// );

// /**
//  * =========================
//  * ALERTS
//  * =========================
//  */

// // Get alerts
// router.get('/alerts', async (req: Request, res: Response) => {
//   try {
//     const { month, year, uploadId } = req.query;

//     const query: any = {};
//     if (month) query.month = Number(month);
//     if (year) query.year = Number(year);
//     if (uploadId) query.uploadId = uploadId;

//     const alerts = await Alert.find(query).sort({ alertDate: -1 });
//     res.json(alerts);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Alerts summary
// router.get('/alerts/summary', async (req: Request, res: Response) => {
//   try {
//     const { month, year } = req.query;

//     const query: any = {};
//     if (month) query.month = Number(month);
//     if (year) query.year = Number(year);

//     const alerts = await Alert.find(query);

//     const summary = {
//       totalAlerts: alerts.length,
//       emailsSent: alerts.filter(a => a.emailSent).length,
//       platformBreakdown: {} as Record<string, number>,
//     };

//     alerts.forEach(alert => {
//       alert.platforms.forEach(platform => {
//         summary.platformBreakdown[platform] =
//           (summary.platformBreakdown[platform] || 0) + 1;
//       });
//     });

//     res.json(summary);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Mark alert as sent
// router.put('/alerts/:alertId/sent', async (req: Request, res: Response) => {
//   try {
//     const alert = await Alert.findByIdAndUpdate(
//       req.params.alertId,
//       {
//         emailSent: true,
//         sentDate: new Date(),
//       },
//       { new: true }
//     );

//     if (!alert) {
//       return res.status(404).json({ error: 'Alert not found' });
//     }

//     res.json(alert);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// export default router;



import express, { Request, Response } from 'express';
import SearchResult from '../models/SearchResult';
import Upload from '../models/Upload';
import Alert from '../models/Alert';

const router: express.Router = express.Router();

// Get all results
router.get('/', async (req: Request, res: Response) => {
  try {
    const { platform, found, month, year, uploadId } = req.query;

    let filter: any = {};

    if (platform) filter.platform = platform;
    if (found !== undefined) filter.found = found === 'true';
    if (month) filter.month = parseInt(month as string);
    if (year) filter.year = parseInt(year as string);
    if (uploadId) filter.uploadId = uploadId;

    const results = await SearchResult.find(filter).sort({ searchDate: -1 }).limit(1000);

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get results summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const total = await SearchResult.countDocuments();
    const found = await SearchResult.countDocuments({ found: true });
    const notFound = await SearchResult.countDocuments({ found: false });

    const byPlatform = await SearchResult.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 }, foundCount: { $sum: { $cond: ['$found', 1, 0] } } } },
    ]);

    res.json({
      total,
      found,
      notFound,
      byPlatform,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get alerts summary
router.get('/alerts/summary', async (req: Request, res: Response) => {
  try {
    const totalAlerts = await Alert.countDocuments();
    const emailSent = await Alert.countDocuments({ emailSent: true });
    const pending = await Alert.countDocuments({ emailSent: false });

    res.json({
      totalAlerts,
      emailSent,
      pending,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await Alert.find().sort({ alertDate: -1 }).limit(100);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Download results as CSV
router.get('/download/csv', async (req: Request, res: Response) => {
  try {
    const results = await SearchResult.find().sort({ searchDate: -1 });

    let csv = 'Name,Platform,Found,Date\n';
    results.forEach((result) => {
      csv += `"${result.name}","${result.platform}",${result.found},"${result.searchDate.toISOString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="results.csv"');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
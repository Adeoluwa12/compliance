// import dotenv from 'dotenv';
// dotenv.config();

// import { checkAwsEnv } from './utils/envCheck';

// checkAwsEnv();

// import express, { Express } from 'express';
// import path from 'path';
// import { connectDB } from './config/database';
// import uploadRoutes from './routes/upload';
// import resultRoutes from './routes/results';
// import { setupScheduler } from './services/scheduler';



// const app: Express = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, '../views'));
// app.use(express.static(path.join(__dirname, '../public')));

// // Routes
// app.use('/api/upload', uploadRoutes);
// app.use('/api/results', resultRoutes);

// // Dashboard route
// app.get('/', (req, res) => {
//   res.render('dashboard');
// });

// app.get('/results', (req, res) => {
//   res.render('results');
// });

// app.get('/alerts', (req, res) => {
//   res.render('alerts');
// });

// // Error handling middleware
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error('Error:', err);
//   res.status(err.status || 500).json({
//     error: err.message || 'Internal server error',
//   });
// });

// // Start server
// const startServer = async () => {
//   try {
//     await connectDB();

//     // Initialize scheduler
//     setupScheduler();

//     app.listen(PORT, () => {
//       console.log(`Server running on http://localhost:${PORT}`);
//     });
//   } catch (error) {
//     console.error('Failed to start server:', error);
//     process.exit(1);
//   }
// };

// startServer();

// export default app;



import express, { Express } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import uploadRoutes from './routes/upload';
import resultRoutes from './routes/results';
import { setupScheduler } from './services/scheduler';
import { checkEnvironmentVariables } from './utils/envCheck';

dotenv.config();

// Check environment variables on startup
checkEnvironmentVariables();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/results', resultRoutes);

// Dashboard route
app.get('/', (req, res) => {
  res.render('dashboard');
});

app.get('/results', (req, res) => {
  res.render('results');
});

app.get('/alerts', (req, res) => {
  res.render('alerts');
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();

    // Initialize scheduler
    setupScheduler();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
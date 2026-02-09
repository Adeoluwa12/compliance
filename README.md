# Compliance Screening Bot

A Node.js/Express application that automatically screens names against government exclusion databases (OpenSanctions, HHS Exclusions, and Tennessee Medicaid). Uploads Excel files, searches databases, captures screenshots, and sends email alerts when matches are found.

## Features

- **Excel Import**: Upload Excel files with lists of names organized by month/year
- **Multi-Database Screening**: Searches three government exclusion databases:
  - OpenSanctions (US medical exclusions)
  - HHS Exclusions Database (federal health care program exclusions)
  - Tennessee Medicaid Terminated Providers List
- **Automated Alerts**: Sends email notifications when names are found in exclusion databases
- **Dashboard Portal**: Web interface to manage uploads and view results
- **Screenshot Capture**: Automatically captures and stores search result screenshots
- **Scheduled Tasks**: Automatic cleanup and monthly summaries
- **Results Filtering**: View results by month, year, platform, and status

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB
- **Email**: Nodemailer
- **Web Scraping**: Puppeteer
- **Excel Parsing**: ExcelJS
- **View Engine**: EJS
- **Task Scheduling**: node-cron

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Gmail account (or SMTP provider) for email alerts
- npm or yarn

### Installation

1. **Clone or download the project**

```bash
cd compliance-screening-bot
npm install
```

2. **Create .env file**

Copy `.env.example` to `.env` and update with your configuration:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/compliance-bot
NODE_ENV=development

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@compliancebot.com

# Alert Recipients (comma-separated)
ALERT_EMAIL_RECIPIENTS=admin@company.com,compliance@company.com

# File Paths
SCREENSHOTS_DIR=./screenshots
UPLOADS_DIR=./uploads

# Scraper Settings
SCRAPER_TIMEOUT=30000
SCRAPER_HEADLESS=true
```

### Gmail Setup (for Email Alerts)

If using Gmail for email alerts:

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to myaccount.google.com
   - Select "Security" from the left menu
   - Find "App passwords" (appears only if 2FA is enabled)
   - Generate a new app password for "Mail"
3. Use the generated password in `EMAIL_PASSWORD`

### Running the Application

**Development Mode:**
```bash
npm run dev
```

**Build for Production:**
```bash
npm run build
npm start
```

**Manual Scraping:**
```bash
npm run scrape
```

## Usage

### Dashboard

Access the web dashboard at `http://localhost:3000`

**Features:**
- Upload Excel files with names
- View upload status and progress
- See quick statistics

### Upload Excel Files

Excel files should have names in the first column:
- First row is treated as header (skipped)
- Names should be in Column A, one per row
- Supports .xlsx and .xls formats

Example Excel structure:
```
Full Name
John Smith
Jane Doe
Robert Johnson
```

### Viewing Results

- **Results Page**: View all search results with filtering options
- **Alerts Page**: View flagged names with platform breakdown
- **Export**: Download alerts as CSV

## Project Structure

```
src/
├── config/           # Database configuration
├── models/           # MongoDB schemas
├── routes/           # API endpoints
├── scraper/          # Puppeteer scraping logic
├── services/         # Email and scheduler services
├── utils/            # Excel parser utilities
└── index.ts          # Express server

views/
├── dashboard.ejs     # Main dashboard
├── results.ejs       # Results view
└── alerts.ejs        # Alerts view

.env.example          # Environment variables template
```

## API Endpoints

### Upload Endpoints
- `POST /api/upload` - Upload Excel file
- `GET /api/upload` - Get all uploads
- `GET /api/upload/status/:uploadId` - Get upload status

### Results Endpoints
- `GET /api/results/upload/:uploadId` - Get results for upload
- `GET /api/results/platform/:platform` - Get results by platform
- `GET /api/results/by-month/:month/:year` - Get results by month/year
- `GET /api/results/alerts` - Get all alerts
- `GET /api/results/alerts/summary` - Get alerts summary
- `PUT /api/results/alerts/:alertId/sent` - Mark alert as sent

### Page Routes
- `GET /` - Dashboard
- `GET /results` - Results page
- `GET /alerts` - Alerts page

## Database Schema

### Upload Collection
```javascript
{
  filename: String,
  month: Number,
  year: Number,
  uploadDate: Date,
  totalNames: Number,
  processedNames: Number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage: String
}
```

### SearchResult Collection
```javascript
{
  uploadId: ObjectId,
  name: String,
  platform: 'opensanctions' | 'hhs' | 'tennessee',
  found: Boolean,
  screenshotPath: String,
  details: String,
  searchDate: Date,
  month: Number,
  year: Number
}
```

### Alert Collection
```javascript
{
  uploadId: ObjectId,
  name: String,
  platforms: [String],
  details: String,
  emailSent: Boolean,
  sentDate: Date,
  alertDate: Date,
  month: Number,
  year: Number
}
```

## Scheduled Tasks

- **Daily (2 AM)**: Cleanup and status check
  - Processes pending uploads
  - Deletes failed uploads older than 30 days

- **Monthly (6 AM on 1st)**: Monthly summary
  - Generates summary of screened names
  - Logs monthly statistics

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Verify `MONGODB_URI` in `.env`

### Email Not Sending
- Check `EMAIL_USER` and `EMAIL_PASSWORD`
- Verify `ALERT_EMAIL_RECIPIENTS` is set
- Check Gmail app password if using Gmail

### Scraper Issues
- Increase `SCRAPER_TIMEOUT` if websites are slow
- Set `SCRAPER_HEADLESS=false` to see browser actions (debugging)
- Check website URLs are correct and accessible

### Screenshots Not Saving
- Verify `SCREENSHOTS_DIR` path exists and is writable
- Check file permissions

## Performance Tips

- Run scraping during off-peak hours
- Adjust `SCRAPER_TIMEOUT` based on your internet speed
- Use pagination when viewing large result sets
- Monitor MongoDB disk usage with large datasets

## Security Considerations

- Keep `.env` file secure and never commit to version control
- Use strong Gmail app passwords
- Restrict file upload sizes in production
- Validate all user inputs
- Use HTTPS in production
- Implement authentication for dashboard (optional)

## License

ISC

## Support

For issues or questions, please check:
1. MongoDB connection
2. Environment variables in `.env`
3. Email configuration
4. Website URLs in scraper (they may have changed)
5. File permissions for uploads and screenshots directories

## Future Enhancements

- User authentication and role-based access
- Advanced filtering and search
- Bulk alert resend
- Integration with external APIs
- Custom email templates
- Webhook notifications
- API rate limiting
- Database backup automation

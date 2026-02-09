export const getPuppeteerConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      // Render needs these for Puppeteer
      executablePath: isProduction 
        ? '/usr/bin/chromium-browser'  // Render's Chromium path
        : undefined
    };
  };
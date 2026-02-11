// export const getPuppeteerConfig = () => {
//   return {
//     headless: true,
//     args: [
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-dev-shm-usage',
//       '--disable-gpu',
//       '--no-first-run',
//       '--no-zygote',
//       '--single-process',
//       '--disable-accelerated-2d-canvas'
//     ],
//     timeout: 60000,
//   };
// };


// src/config/puppeteer.ts

// src/config/puppeteer.ts

export const getPuppeteerConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-accelerated-2d-canvas',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ],
    timeout: 60000,
  };

  // CRITICAL: Point to Chromium in production (Render)
  if (isProduction) {
    config.executablePath = '/usr/bin/chromium-browser';
    console.log('[Puppeteer] Production: Using Chromium at', config.executablePath);
  } else {
    console.log('[Puppeteer] Development: Using bundled Chrome');
  }

  return config;
};
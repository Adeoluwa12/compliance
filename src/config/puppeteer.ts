export const getPuppeteerConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    headless: true,
    executablePath: isProduction 
      ? process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
      : undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-accelerated-2d-canvas',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--safebrowsing-disable-auto-update',
    ],
    timeout: 60000,
  };
};
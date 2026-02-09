export const checkEnvironmentVariables = (): void => {
    console.log('\n=== ENVIRONMENT CHECK ===');
  
    const requiredVars = {
      MONGODB_URI: process.env.MONGODB_URI,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      AWS_S3_PUBLIC_URL: process.env.AWS_S3_PUBLIC_URL,
    };
  
    let allValid = true;
  
    Object.entries(requiredVars).forEach(([key, value]) => {
      const isSet = !!value;
      const displayValue = value ? (key.includes('KEY') || key.includes('PASS') ? '***MASKED***' : value) : 'NOT SET';
      console.log(`${key}: ${displayValue} ${isSet ? '✓' : '✗ MISSING'}`);
      if (!isSet && (key.includes('AWS') || key.includes('MONGODB') || key.includes('SMTP'))) {
        allValid = false;
      }
    });
  
    console.log('=========================\n');
  
    if (!allValid) {
      console.warn('[Warning] Some critical environment variables are not set!');
    }
  };








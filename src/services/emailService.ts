// import nodemailer, { Transporter } from 'nodemailer';

// let transporter: Transporter | null = null;

// const getTransporter = (): Transporter => {
//   if (!transporter) {
//     transporter = nodemailer.createTransport({
//       service: process.env.EMAIL_SERVICE || 'gmail',
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//     });
//   }
//   return transporter;
// };

// export interface AlertEmailData {
//   name: string;
//   platforms: string[];
//   month: number;
//   year: number;
// }

// export const sendAlertEmail = async (alerts: AlertEmailData[], month: number, year: number): Promise<void> => {
//   try {
//     const transporter = getTransporter();
//     const recipients = (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').map((email) => email.trim());

//     if (recipients.length === 0 || !recipients[0]) {
//       console.warn('No alert email recipients configured');
//       return;
//     }

//     const alertsHtml = alerts
//       .map(
//         (alert) => `
//       <tr>
//         <td style="padding: 8px; border: 1px solid #ddd;">${alert.name}</td>
//         <td style="padding: 8px; border: 1px solid #ddd;">${alert.platforms.join(', ')}</td>
//       </tr>
//     `
//       )
//       .join('');

//     const htmlContent = `
//       <h2>Compliance Screening Alert - ${month}/${year}</h2>
//       <p>The following individuals were found in government exclusion databases:</p>
//       <table style="border-collapse: collapse; width: 100%;">
//         <thead>
//           <tr style="background-color: #f2f2f2;">
//             <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
//             <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Platforms</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${alertsHtml}
//         </tbody>
//       </table>
//       <p style="margin-top: 20px; color: #666; font-size: 12px;">
//         This is an automated alert from the Compliance Screening Bot.
//       </p>
//     `;

//     const mailOptions = {
//       from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
//       to: recipients.join(','),
//       subject: `Compliance Alert: ${alerts.length} name(s) found in exclusion database(s) - ${month}/${year}`,
//       html: htmlContent,
//     };

//     await transporter.sendMail(mailOptions);
//     console.log(`Alert email sent to ${recipients.join(', ')}`);
//   } catch (error) {
//     console.error('Error sending alert email:', error);
//     throw error;
//   }
// };

// export const sendTestEmail = async (recipientEmail: string): Promise<void> => {
//   try {
//     const transporter = getTransporter();

//     const mailOptions = {
//       from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
//       to: recipientEmail,
//       subject: 'Compliance Screening Bot - Test Email',
//       html: '<p>This is a test email from the Compliance Screening Bot.</p>',
//     };

//     await transporter.sendMail(mailOptions);
//     console.log(`Test email sent to ${recipientEmail}`);
//   } catch (error) {
//     console.error('Error sending test email:', error);
//     throw error;
//   }
// };


import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface AlertData {
  name: string;
  platforms: string[];
  month: number;
  year: number;
}

export const sendAlertEmail = async (
  foundAlerts: { [key: string]: string[] },
  month: number,
  year: number
): Promise<void> => {
  try {
    const alertNames = Object.keys(foundAlerts);
    const alertsHtml = alertNames
      .map(
        (name) =>
          `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${foundAlerts[name].join(', ')}</td>
      </tr>`
      )
      .join('');

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@compliancebot.com',
      to: process.env.ALERT_TO_EMAIL || 'admin@company.com',
      subject: `Compliance Alert - ${alertNames.length} Names Found (${month}/${year})`,
      html: `
        <h2>Compliance Screening Alert</h2>
        <p>The following <strong>${alertNames.length}</strong> names were found in government exclusion databases during the screening for <strong>${month}/${year}</strong>:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Name</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Found On</th>
            </tr>
          </thead>
          <tbody>
            ${alertsHtml}
          </tbody>
        </table>

        <p><strong>Action Required:</strong> Please review these results immediately.</p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated alert from the Compliance Screening Bot.
        </p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('[Email] Alert email sent successfully');
  } catch (error) {
    console.error('[Email] Error sending alert:', error);
    throw error;
  }
};
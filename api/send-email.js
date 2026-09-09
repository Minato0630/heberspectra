import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || ''
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { to, subject, body, attachmentName } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing recipient, subject, or body details.' });
  }

  try {
    let transporter;
    let isTestAccount = false;

    if (SMTP_CONFIG.user && SMTP_CONFIG.user !== 'your_email@gmail.com' && SMTP_CONFIG.pass) {
      transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: parseInt(SMTP_CONFIG.port) || 465,
        secure: parseInt(SMTP_CONFIG.port) === 465,
        auth: {
          user: SMTP_CONFIG.user,
          pass: SMTP_CONFIG.pass
        }
      });
    } else {
      let testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      isTestAccount = true;
    }

    const mailOptions = {
      from: SMTP_CONFIG.user && SMTP_CONFIG.user !== 'your_email@gmail.com'
        ? SMTP_CONFIG.user
        : '"HeberSpectra Organizers" <noreply@heberspectra.com>',
      to: to,
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #ff0055; border-bottom: 2px solid #ff0055; padding-bottom: 10px;">HEBER SPECTRA 2026</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333; white-space: pre-line;">${body}</p>
          ${attachmentName ? `
            <div style="margin-top: 20px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; border: 1px dashed #00ccff; display: inline-block;">
              <span style="font-size: 20px; vertical-align: middle;">📎</span> 
              <strong style="color: #00ccff; font-size: 14px;">${attachmentName}</strong> 
              <span style="font-size: 12px; color: #666;">(Available for download in your Student Dashboard)</span>
            </div>
          ` : ''}
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0 15px;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated dispatch from Bishop Heber College, Tiruchirappalli.<br>
            Please do not reply directly to this mail.
          </p>
        </div>
      `
    };

    let info;
    let previewUrl = null;
    let isFallback = false;

    try {
      info = await transporter.sendMail(mailOptions);
    } catch (smtpErr) {
      console.warn('Primary SMTP delivery failed:', smtpErr.message);
      // Fallback to Ethereal sandbox if credentials expired/invalid
      let testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      isTestAccount = true;
      isFallback = true;
      info = await transporter.sendMail({
        ...mailOptions,
        from: '"HeberSpectra Dispatcher (Sandbox Mode)" <noreply@heberspectra.com>'
      });
    }

    if (isTestAccount) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl,
      isTest: isTestAccount,
      message: isFallback
        ? 'Email dispatched in sandbox mode (Gmail password rejected: 535 Bad Credentials). Update SMTP_PASS with a valid Google App Password.'
        : isTestAccount
          ? 'Test email dispatched! Access Ethereal link.'
          : 'Real email successfully sent to student inbox.'
    });
  } catch (error) {
    console.error('Nodemailer Error: ', error);
    return res.status(500).json({ error: 'Mail delivery failed: ' + error.message });
  }
}

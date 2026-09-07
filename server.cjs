const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

require('dotenv').config();
const { readDB, writeDB, connectDB } = require('./lib/db.cjs');

const PORT = process.env.PORT || 5001;

// Initialize MongoDB connection
connectDB().catch(e => console.error("MongoDB init error:", e.message));

app.get('/api/database', async (req, res) => {
  try {
    const dbData = await readDB();
    res.json(dbData);
  } catch (err) {
    console.error("GET /api/database error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/database', async (req, res) => {
  try {
    const success = await writeDB(req.body);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Failed to write database.' });
    }
  } catch (err) {
    console.error("POST /api/database error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================================
// ✉️ BACKEND SMTP CONFIGURATION
// ========================================================================
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  user: process.env.SMTP_USER || 'erenyeager6305@gmail.com',
  pass: process.env.SMTP_PASS || 'kbgotbrtjmmlqsph'
};

app.get('/', (req, res) => {
  res.send('<h1>HeberSpectra 2026 - Email Backend Server</h1><p>The backend API server is running successfully on port 5001 and is ready to process email requests!</p>');
});

app.post('/api/send-email', async (req, res) => {
  const { to, subject, body, attachmentName } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing recipient, subject, or body details.' });
  }

  let transporter;
  let isTestAccount = false;

  try {
    // 1. Determine SMTP Transporter Configuration
    if (SMTP_CONFIG.user && SMTP_CONFIG.user !== 'your_email@gmail.com' && SMTP_CONFIG.pass) {
      console.log(`Using backend configured SMTP for sending email to: ${to}`);
      transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: parseInt(SMTP_CONFIG.port) || 465,
        secure: parseInt(SMTP_CONFIG.port) === 465, // true for port 465, false for 587
        auth: {
          user: SMTP_CONFIG.user,
          pass: SMTP_CONFIG.pass
        }
      });
    } else {
      console.log(`No backend SMTP configured. Generating Ethereal test account...`);
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

    // 2. Prepare mail details
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

    // 3. Dispatch Email with Fallback
    let info;
    let previewUrl = null;
    let isFallback = false;

    try {
      info = await transporter.sendMail(mailOptions);
      console.log(`Email successfully dispatched to ${to}: ${info.messageId}`);
    } catch (smtpErr) {
      console.warn(`Primary SMTP delivery failed for ${to}: ${smtpErr.message}. Falling back to Ethereal sandbox.`);
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
      console.log(`Fallback sandbox email dispatched: ${info.messageId}`);
    }

    if (isTestAccount) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }

    res.status(200).json({
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
    res.status(500).json({ error: 'Mail delivery failed: ' + error.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Spectra Email Dispatcher active on: http://localhost:${PORT}`);
  });
}

module.exports = app;

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 5001;
const DB_FILE = process.env.VERCEL
  ? '/tmp/db.json'
  : path.join(__dirname, 'db.json');

const INITIAL_EVENTS = [
  {
    id: "hackathon",
    title: "ByteCraft Hackathon",
    desc: "A 24-hour intense software development competition. Form a team and build innovative solutions for real-world problems.",
    rules: "Bring your own devices. Projects must be coded from scratch during the event. Use of AI is allowed only for templates. No pre-written codes.",
    maxTeammates: 3,
    venue: "Ramanujan Computing Centre (Hall 1)",
    time: "09:00 AM - Oct 12, 2026",
    incharge: "Dr. K. R. Srinivasan (+91 98765 43210)"
  },
  {
    id: "adzap",
    title: "Ad-Zap Showdown",
    desc: "Showcase your marketing and creative skills! Convince the judges by advertising bizarre products on-the-spot.",
    rules: "5 minutes preparation time. 3 minutes presentation. Products assigned randomly. No vulgarity. Judges' decisions are final.",
    maxTeammates: 4,
    venue: "Golden Jubilee Seminar Hall (Hall 2)",
    time: "11:30 AM - Oct 12, 2026",
    incharge: "Prof. S. Anita (+91 94432 10987)"
  },
  {
    id: "coding",
    title: "CodeConquer Debug & Speed Run",
    desc: "Speed coding, algorithm design, and reverse engineering. Put your syntax and troubleshooting skills to the test.",
    rules: "Individual competition. No internet access allowed. Fastest correct compile wins. Standard libraries only.",
    maxTeammates: 0,
    venue: "MCA Lab (Hall 3)",
    time: "02:00 PM - Oct 12, 2026",
    incharge: "Dr. J. Ronald (+91 90012 34567)"
  },
  {
    id: "webdesign",
    title: "WebCraft UI/UX",
    desc: "Design and implement a premium, responsive webpage landing page within 3 hours. Showcase your CSS and layout expertise.",
    rules: "Max team size of 2. Raw HTML/CSS/JS only. No Tailwind or React framework. Templates must be designed live.",
    maxTeammates: 1,
    venue: "BCA Computer Center (Hall 4)",
    time: "10:00 AM - Oct 13, 2026",
    incharge: "Prof. M. David (+91 88877 66554)"
  },
  {
    id: "quiz",
    title: "MindSprint Tech Quiz",
    desc: "General IT, tech history, logic, and trivia. Fast-paced buzzer rounds for computer enthusiasts.",
    rules: "Team of 2. Written prelims followed by 6 stage rounds. Buzzer penalties apply for negative points.",
    maxTeammates: 1,
    venue: "Alumnae Seminar Hall (Hall 5)",
    time: "01:30 PM - Oct 13, 2026",
    incharge: "Dr. Sarah Paul (+91 77766 55443)"
  },
  {
    id: "treasurehunt",
    title: "CyberHunt: Cryptic Hunt",
    desc: "Solve puzzles, decode ciphers, and scour the campus for clues in this tech-themed treasure hunt.",
    rules: "Team of 3. Standard campus rules apply. Solve clues sequentially. Sharing answers results in disqualification.",
    maxTeammates: 2,
    venue: "College Main Auditorium (Hall 6)",
    time: "03:00 PM - Oct 13, 2026",
    incharge: "Prof. P. Karthik (+91 99911 22334)"
  }
];

function getInitialDB() {
  return {
    users: [],
    applications: [],
    emails: [],
    notifications: [],
    scans: [],
    events: INITIAL_EVENTS,
    registrationClosed: false,
    closedEvents: [],
    settings: { adminPassword: "AdminPassword123" }
  };
}

function readDB() {
  try {
    if (process.env.VERCEL && !fs.existsSync(DB_FILE)) {
      const srcPath = path.join(__dirname, 'db.json');
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, DB_FILE);
      } else {
        fs.writeFileSync(DB_FILE, JSON.stringify(getInitialDB(), null, 2), 'utf8');
      }
    } else if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to read database, returning initial structure:", e);
    return getInitialDB();
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("Failed to write database:", e);
    return false;
  }
}

app.get('/api/database', (req, res) => {
  const dbData = readDB();
  res.json(dbData);
});

app.post('/api/database', (req, res) => {
  const success = writeDB(req.body);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write database file.' });
  }
});

// ========================================================================
// ✉️ BACKEND SMTP CONFIGURATION (Configure Once Here)
// ========================================================================
// Replace with your SMTP settings (e.g. Gmail App Password) to send real
// emails. If user is left as 'your_email@gmail.com', it automatically falls
// back to Ethereal.email sandbox logs and prints a preview link in console.
// ========================================================================
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',         // SMTP Host (e.g., smtp.gmail.com)
  port: 465,                      // SMTP Port (e.g., 465 for SSL, 587 for TLS)
  user: 'erenyeager6305@gmail.com',   // Your sender email address
  pass: 'sorbacotvgyabqkw'       // Your SMTP Password or Google App Password
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

    // 3. Dispatch Email
    let info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully dispatched to ${to}: ${info.messageId}`);

    let previewUrl = isTestAccount ? nodemailer.getTestMessageUrl(info) : null;

    res.status(200).json({
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl,
      isTest: isTestAccount,
      message: isTestAccount ? 'Test email dispatched! Access Ethereal link.' : 'Real email successfully sent to student inbox.'
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

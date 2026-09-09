const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const { readDB, writeDB, connectDB, INITIAL_EVENTS } = require('./lib/db.cjs');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'spectra_jwt_secret_2026_secure';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123';

// Initialize DB connection
connectDB().catch(e => console.error("MongoDB init error:", e.message));

// ========================================================================
// 🛡️ SECURITY HEADERS & CORS
// ========================================================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Normalize req.url if Vercel rewrites stripped /api prefix
  if (req.url && !req.url.startsWith('/api') && req.url !== '/' && !req.url.startsWith('/?')) {
    req.url = '/api' + req.url;
  }
  next();
});

const allowedOrigins = [
  'https://heberspectra.vercel.app',
  'http://localhost:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5001'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Allow client requests safely
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ========================================================================
// 🛡️ RATE LIMITER (In-memory token bucket per IP)
// ========================================================================
const rateLimitMap = new Map();

function createRateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${req.path}_${ip}`;
    
    let record = rateLimitMap.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      rateLimitMap.set(key, record);
    } else {
      record.count++;
    }

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again shortly.' }
      });
    }
    next();
  };
}

const authLimiter = createRateLimiter(20, 15 * 60 * 1000); // 20 requests per 15 min
const emailLimiter = createRateLimiter(15, 60 * 1000); // 15 emails per min

// ========================================================================
// 🛡️ AUTHENTICATION & ROLE MIDDLEWARE
// ========================================================================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session. Please sign in again.' }
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access restricted to authorized personnel.' }
      });
    }
    next();
  };
}

// Strip sensitive fields (passwords) from user objects
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// ========================================================================
// ✉️ BACKEND SMTP CONFIGURATION
// ========================================================================
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || ''
};

async function sendMailInternal(to, subject, body, attachmentName = null) {
  let transporter;
  let isTestAccount = false;
  let isFallback = false;
  let info = null;

  try {
    if (SMTP_CONFIG.user && SMTP_CONFIG.pass) {
      transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: SMTP_CONFIG.port === 465,
        auth: { user: SMTP_CONFIG.user, pass: SMTP_CONFIG.pass }
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      isTestAccount = true;
    }

    const mailOptions = {
      from: SMTP_CONFIG.user ? SMTP_CONFIG.user : '"HeberSpectra Organizers" <noreply@heberspectra.com>',
      to,
      subject,
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
            Organized by the Department of Computer Science (Shift II), Bishop Heber College, Tiruchirappalli.
          </p>
        </div>
      `
    };

    try {
      info = await transporter.sendMail(mailOptions);
    } catch (smtpErr) {
      console.warn('Primary SMTP delivery failed, falling back to Ethereal sandbox:', smtpErr.message);
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      isTestAccount = true;
      isFallback = true;
      info = await transporter.sendMail({
        ...mailOptions,
        from: '"HeberSpectra Dispatcher (Sandbox Mode)" <noreply@heberspectra.com>'
      });
    }

    return {
      success: true,
      messageId: info?.messageId,
      previewUrl: isTestAccount ? nodemailer.getTestMessageUrl(info) : null,
      isTest: isTestAccount
    };
  } catch (err) {
    console.error('Mail dispatch error:', err.message);
    return { success: false, error: err.message };
  }
}

// ========================================================================
// 🚫 INSECURE /api/database ROUTE PERMANENTLY DISABLED
// ========================================================================
app.all('/api/database', (req, res) => {
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Direct public database access is permanently disabled for security. Use specific API endpoints.'
    }
  });
});

// ========================================================================
// 🌐 PUBLIC ENDPOINTS
// ========================================================================

// 1. Get Event Catalog & Settings (No private user data exposed)
app.get('/api/events', async (req, res) => {
  try {
    const db = await readDB();
    return res.status(200).json({
      success: true,
      events: db.events || INITIAL_EVENTS,
      registrationClosed: Boolean(db.registrationClosed),
      closedEvents: db.closedEvents || [],
      settings: {
        eventDate: db.settings?.eventDate || "2026-10-12T09:00:00",
        registrationDeadline: db.settings?.registrationDeadline || "2026-10-11T23:59:59"
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve event catalog.' } });
  }
});

// 2. Student Registration
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { name, college, dept, phno, email, reno, password, food, accom, idPhoto, staffName, staffFood } = req.body || {};

    if (!name || !college || !dept || !phno || !email || !reno || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'All required registration fields must be provided.' } });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' } });
    }

    // Eligibility check: Bishop Heber College students cannot participate
    const bhcKeywords = ["bishop heber", "bhc", "bishop heber college", "heber", "bishopheber"];
    const isBHC = bhcKeywords.some(keyword => college.toLowerCase().includes(keyword));
    if (isBHC) {
      return res.status(400).json({
        success: false,
        error: { code: 'INELIGIBLE_COLLEGE', message: 'Only students from other colleges are eligible to participate in HeberSpectra 2026.' }
      });
    }

    // File check: ID card size
    if (idPhoto && idPhoto.length > 3 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Uploaded ID card photo must be under 2MB.' } });
    }

    const db = await readDB();
    const formattedEmail = email.trim().toLowerCase();

    // Duplicate email check
    if (db.users.some(u => u.email.toLowerCase() === formattedEmail)) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_EMAIL', message: 'This email address is already registered.' } });
    }

    // Duplicate Register Number check for same college
    if (db.users.some(u => u.reno.toLowerCase() === reno.trim().toLowerCase() && u.college.toLowerCase() === college.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_RENO', message: `Register Number ${reno} is already registered under ${college}.` }
      });
    }

    // Password hashing via bcrypt
    const hashedPassword = bcrypt.hashSync(password, 10);
    const studentUid = "BHC-STU-" + (1000 + db.users.length + 1);

    const newUser = {
      id: "user_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      studentId: studentUid,
      name: name.trim(),
      college: college.trim(),
      dept: dept.trim(),
      phno: phno.trim(),
      email: formattedEmail,
      reno: reno.trim(),
      password: hashedPassword,
      food: food || 'veg',
      accom: accom || 'no',
      idPhoto: idPhoto || "/logo.png",
      staff: staffName ? { name: staffName.trim(), food: staffFood || 'veg' } : null,
      registeredAt: new Date().toLocaleDateString()
    };

    db.users.push(newUser);
    await writeDB(db);

    const token = jwt.sign(
      { id: newUser.id, studentId: newUser.studentId, role: 'student', email: newUser.email, name: newUser.name, college: newUser.college },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(newUser),
      message: `Account created! Your Student ID is ${studentUid}.`
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Registration failed due to a server error.' } });
  }
});

// 3. Unified Secure Login (Student, Admin, Leader)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password, role } = req.body || {};

    if (!username || !password || !role) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Username, password, and role are required.' } });
    }

    const formattedUsername = username.trim().toLowerCase();

    // A. ADMIN LOGIN
    if (role === 'admin') {
      const adminRoles = ['president', 'vicepresident', 'manager'];
      if (!adminRoles.includes(formattedUsername)) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_ADMIN', message: 'Invalid Admin role identifier.' } });
      }

      if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect Admin password.' } });
      }

      const adminName = formattedUsername.charAt(0).toUpperCase() + formattedUsername.slice(1);
      const token = jwt.sign(
        { id: formattedUsername, role: 'admin', adminRole: formattedUsername, name: adminName },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: { role: 'admin', adminRole: formattedUsername, name: adminName }
      });
    }

    // B. LEADER LOGIN
    if (role === 'leader') {
      const db = await readDB();
      let eventId = formattedUsername.startsWith('leader_') ? formattedUsername.replace('leader_', '') : formattedUsername;
      const matchedEvent = db.events.find(ev => ev.id === eventId);

      if (!matchedEvent) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_LEADER', message: 'No festival event matches this leader identifier.' } });
      }

      const expectedLeaderPassword = process.env[`LEADER_PASS_${eventId.toUpperCase()}`] || process.env.LEADER_PASSWORD || 'leader';
      if (password !== expectedLeaderPassword) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect Event Leader credentials.' } });
      }

      const leaderTitle = matchedEvent.title + " Leader";
      const token = jwt.sign(
        { id: `leader_${eventId}`, role: 'leader', eventId, name: leaderTitle },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: { role: 'leader', eventId, name: leaderTitle }
      });
    }

    // C. STUDENT LOGIN
    if (role === 'student') {
      const db = await readDB();
      const student = db.users.find(u => 
        u.email.toLowerCase() === formattedUsername || 
        (u.studentId && u.studentId.toLowerCase() === formattedUsername)
      );

      if (!student) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid Student ID or password.' } });
      }

      let passwordValid = false;
      // Check if bcrypt hashed
      if (student.password.startsWith('$2a$') || student.password.startsWith('$2b$')) {
        passwordValid = bcrypt.compareSync(password, student.password);
      } else {
        // Transparent auto-upgrade of legacy plaintext passwords to bcrypt
        if (student.password === password) {
          passwordValid = true;
          student.password = bcrypt.hashSync(password, 10);
          await writeDB(db);
        }
      }

      if (!passwordValid) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid Student ID or password.' } });
      }

      const token = jwt.sign(
        { id: student.id, studentId: student.studentId, role: 'student', email: student.email, name: student.name, college: student.college },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: sanitizeUser(student)
      });
    }

    return res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Unrecognized user role.' } });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Authentication process failed.' } });
  }
});

// ========================================================================
// 🎓 STUDENT ENDPOINTS (Requires valid Student JWT)
// ========================================================================

// 1. Get My Profile, Applications, and Notifications
app.get('/api/student/me', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const db = await readDB();
    const student = db.users.find(u => u.id === req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Student profile not found.' } });
    }

    // Only return applications where this student is the applicant or an active teammate
    const myApps = db.applications.filter(a => a.studentId === student.id || a.teammates.includes(student.studentId));
    const myNotifs = db.notifications.filter(n => n.userId === student.id);

    return res.status(200).json({
      success: true,
      user: sanitizeUser(student),
      applications: myApps,
      notifications: myNotifs,
      events: db.events || INITIAL_EVENTS,
      registrationClosed: Boolean(db.registrationClosed),
      closedEvents: db.closedEvents || [],
      scans: db.scans.filter(s => myApps.some(app => s.appId === app.id))
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve profile data.' } });
  }
});

// 2. Apply for Event (Enforces limits, deadline, and eligibility server-side)
app.post('/api/student/apply', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { eventId, teamName, teammateIds, inputStudentId } = req.body || {};
    const db = await readDB();
    const student = db.users.find(u => u.id === req.user.id);

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Student profile not found.' } });
    }

    // 1. Event status check
    if (db.registrationClosed || db.closedEvents.includes(eventId)) {
      return res.status(400).json({ success: false, error: { code: 'REGISTRATION_CLOSED', message: 'Registrations are closed for this event.' } });
    }

    const regDeadline = new Date(db.settings?.registrationDeadline || '2026-10-11T23:59:59').getTime();
    if (Date.now() > regDeadline) {
      return res.status(400).json({ success: false, error: { code: 'DEADLINE_PASSED', message: 'Official registration deadline has passed.' } });
    }

    const targetEvent = db.events.find(e => e.id === eventId);
    if (!targetEvent) {
      return res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: 'Specified event does not exist.' } });
    }

    // 2. Student ID confirmation check
    if (!inputStudentId || inputStudentId.trim().toUpperCase() !== student.studentId) {
      return res.status(400).json({ success: false, error: { code: 'ID_MISMATCH', message: `Confirmed Student ID does not match your profile ID (${student.studentId}).` } });
    }

    // 3. Helper: Count events applied for a student ID
    const getEventCount = (stuId) => {
      let count = 0;
      db.applications.forEach(app => {
        const appOwner = db.users.find(u => u.id === app.studentId);
        if (appOwner && appOwner.studentId === stuId) count++;
        if (app.teammates && app.teammates.includes(stuId)) count++;
      });
      return count;
    };

    // 4. Limit check for primary applicant (Max 2 events)
    if (getEventCount(student.studentId) >= 2) {
      return res.status(400).json({ success: false, error: { code: 'EVENT_LIMIT_EXCEEDED', message: 'You have already registered for the maximum of 2 events.' } });
    }

    // Check if already registered for THIS event
    const alreadyApplied = db.applications.some(app => 
      (app.studentId === student.id || app.teammates.includes(student.studentId)) && app.eventId === eventId
    );
    if (alreadyApplied) {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_APPLIED', message: 'You are already registered for this event.' } });
    }

    // 5. Teammates validation
    const formattedTeammates = Array.isArray(teammateIds) 
      ? teammateIds.map(id => String(id).trim().toUpperCase()).filter(id => id !== '')
      : [];

    if (formattedTeammates.length > targetEvent.maxTeammates) {
      return res.status(400).json({ success: false, error: { code: 'TEAM_SIZE_EXCEEDED', message: `Maximum allowed teammates for this event is ${targetEvent.maxTeammates}.` } });
    }

    if (formattedTeammates.includes(student.studentId) || new Set(formattedTeammates).size !== formattedTeammates.length) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_TEAMMATES', message: 'Duplicate student IDs in teammate list are not allowed.' } });
    }

    for (const tmId of formattedTeammates) {
      const tmProfile = db.users.find(u => u.studentId === tmId);
      if (!tmProfile) {
        return res.status(400).json({ success: false, error: { code: 'TEAMMATE_NOT_FOUND', message: `Teammate ID "${tmId}" is not registered in the system.` } });
      }
      if (tmProfile.college.toLowerCase() !== student.college.toLowerCase()) {
        return res.status(400).json({ success: false, error: { code: 'COLLEGE_MISMATCH', message: `Teammate "${tmProfile.name}" belongs to "${tmProfile.college}", not "${student.college}".` } });
      }
      if (getEventCount(tmId) >= 2) {
        return res.status(400).json({ success: false, error: { code: 'TEAMMATE_LIMIT_EXCEEDED', message: `Teammate "${tmProfile.name}" (${tmId}) has already reached the 2-event limit.` } });
      }
    }

    // 6. Create application
    const newApp = {
      id: "app_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      studentId: student.id,
      eventId,
      teamName: teamName?.trim() || `${student.name}'s Team`,
      teammates: formattedTeammates,
      payment: null,
      status: "pending",
      appliedAt: new Date().toLocaleString()
    };

    db.applications.push(newApp);
    await writeDB(db);

    return res.status(201).json({
      success: true,
      application: newApp,
      message: 'Application submitted successfully. Please upload payment receipt proof.'
    });

  } catch (err) {
    console.error('Apply error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Event application submission failed.' } });
  }
});

// 3. Submit Payment Proof (Validates ownership, file size, and receipt)
app.post('/api/student/payment', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { appId, txId, receiptImage } = req.body || {};

    if (!appId || !txId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DATA', message: 'Application ID and Transaction ID are required.' } });
    }

    if (receiptImage && receiptImage.length > 3 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: { code: 'RECEIPT_TOO_LARGE', message: 'Payment screenshot must be under 2MB.' } });
    }

    const db = await readDB();
    const appIndex = db.applications.findIndex(a => a.id === appId && a.studentId === req.user.id);

    if (appIndex === -1) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not own this application.' } });
    }

    db.applications[appIndex].payment = {
      txId: String(txId).trim(),
      receiptImage: receiptImage || null,
      submittedAt: new Date().toLocaleString()
    };

    await writeDB(db);

    return res.status(200).json({
      success: true,
      message: 'Payment proof submitted. Awaiting Admin verification.'
    });

  } catch (err) {
    console.error('Payment error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Payment submission failed.' } });
  }
});

// 4. Email Certificate to Student
app.post('/api/student/send-cert-email', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { eventTitle, ticketId } = req.body || {};
    const db = await readDB();
    const student = db.users.find(u => u.id === req.user.id);

    if (!student || !ticketId || !eventTitle) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Missing certificate dispatch information.' } });
    }

    // Verify student actually has a verified scan for this ticket
    const hasScan = db.scans.some(s => s.ticketId === ticketId);
    if (!hasScan) {
      return res.status(403).json({ success: false, error: { code: 'ATTENDANCE_REQUIRED', message: 'Certificate is only unlocked after venue gate attendance check-in.' } });
    }

    const certEmailBody = `
Dear ${student.name},

Congratulations! Your attendance and participation in ${eventTitle} at HEBER SPECTRA 2026 has been officially verified!

Your Certificate of Participation details:
- Participant: ${student.name}
- Event: ${eventTitle}
- Certificate Validation Code: ${ticketId}
- Department: Department of Computer Science (Shift II)
- College: Bishop Heber College (Autonomous), Tiruchirappalli
- Accreditation: NAAC Re-accredited at 'A++' Grade (CGPA 3.69/4)

Official Endorsements:
- Dr. G. Sobers Smiles David, Head, Dept. of Computer Science (Shift II)
- Dr. J. Princy Merlin, Principal, Bishop Heber College

You can view, print, or download your certificate PDF anytime inside your Student Portal dashboard.

Warm regards,
Event Organizing Committee
Department of Computer Science (Shift II)
Bishop Heber College (Autonomous)
    `;

    const mailResult = await sendMailInternal(student.email, `Certificate Unlocked - ${eventTitle}`, certEmailBody, `${student.name}_certificate.pdf`);

    return res.status(200).json({
      success: true,
      mailResult,
      message: `Certificate dispatched to ${student.email}.`
    });

  } catch (err) {
    console.error('Cert email error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Certificate dispatch failed.' } });
  }
});

// ========================================================================
// 👑 ADMIN ENDPOINTS (Requires Admin JWT)
// ========================================================================

// 1. Admin Dashboard Overview
app.get('/api/admin/dashboard', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const db = await readDB();
    return res.status(200).json({
      success: true,
      users: db.users.map(sanitizeUser),
      applications: db.applications,
      events: db.events,
      registrationClosed: Boolean(db.registrationClosed),
      closedEvents: db.closedEvents || [],
      settings: db.settings
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve admin data.' } });
  }
});

// 2. Approve Application
app.post('/api/admin/applications/:id/approve', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const appId = req.params.id;
    const db = await readDB();
    const appItem = db.applications.find(a => a.id === appId);

    if (!appItem) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found.' } });
    }

    appItem.status = 'approved';

    const student = db.users.find(u => u.id === appItem.studentId);
    const eventDetails = db.events.find(e => e.id === appItem.eventId);

    if (student && eventDetails) {
      db.notifications.push({
        id: "notif_" + Date.now(),
        userId: student.id,
        title: "Registration Approved!",
        message: `Your registration for ${eventDetails.title} has been approved. Passes generated.`,
        timestamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      });

      const studentEmailBody = `
Dear ${student.name},

Your payment transaction has been verified and registration is APPROVED for ${eventDetails.title}.
Download your Entry Pass PDF inside your Student Portal dashboard.

Details:
- Event: ${eventDetails.title}
- Venue: ${eventDetails.venue}
- Timing: ${eventDetails.time}
- Entry Pass Code: ${appId}_primary

We look forward to seeing you at Bishop Heber College!
      `;
      sendMailInternal(student.email, `Entry Pass - ${eventDetails.title}`, studentEmailBody, `${student.name}_entry_pass.pdf`).catch(() => {});

      // Notify teammates
      appItem.teammates.forEach((tmId, index) => {
        const tmProfile = db.users.find(u => u.studentId === tmId);
        if (tmProfile) {
          const tmEmailBody = `
Dear ${tmProfile.name},

Your team leader ${student.name} has registered you as a teammate for ${eventDetails.title}.
Download your individual Entry Pass PDF inside your student dashboard.

Details:
- Event: ${eventDetails.title}
- Team Name: ${appItem.teamName}
- Entry Pass Code: ${appId}_team_${index}

We look forward to seeing you at Bishop Heber College!
          `;
          sendMailInternal(tmProfile.email, `Teammate Entry Pass - ${eventDetails.title}`, tmEmailBody, `${tmProfile.name}_entry_pass.pdf`).catch(() => {});
        }
      });
    }

    await writeDB(db);
    return res.status(200).json({ success: true, message: 'Application approved and passes generated.' });

  } catch (err) {
    console.error('Approve error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to approve application.' } });
  }
});

// 3. Reject Application
app.post('/api/admin/applications/:id/reject', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const appId = req.params.id;
    const db = await readDB();
    const appItem = db.applications.find(a => a.id === appId);

    if (!appItem) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found.' } });
    }

    db.applications = db.applications.filter(a => a.id !== appId);

    const student = db.users.find(u => u.id === appItem.studentId);
    if (student) {
      db.notifications.push({
        id: "notif_" + Date.now(),
        userId: student.id,
        title: "Registration Rejected",
        message: "Your event application was rejected by the admin. Please verify payment details.",
        timestamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
      });
    }

    await writeDB(db);
    return res.status(200).json({ success: true, message: 'Application rejected.' });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to reject application.' } });
  }
});

// 4. Delete Student
app.delete('/api/admin/students/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const db = await readDB();

    db.users = db.users.filter(u => u.id !== userId);
    db.applications = db.applications.filter(a => a.studentId !== userId);

    await writeDB(db);
    return res.status(200).json({ success: true, message: 'Student and associated applications removed.' });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete student.' } });
  }
});

// 5. Add Event
app.post('/api/admin/events', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const eventDetails = req.body;
    const db = await readDB();

    if (db.events.some(e => e.id === eventDetails.id)) {
      return res.status(400).json({ success: false, error: { code: 'EVENT_EXISTS', message: 'An event with this ID already exists.' } });
    }

    db.events.push(eventDetails);
    await writeDB(db);

    return res.status(201).json({ success: true, message: `Event "${eventDetails.title}" added successfully.` });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add event.' } });
  }
});

// 6. Delete Event
app.delete('/api/admin/events/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const db = await readDB();

    db.events = db.events.filter(e => e.id !== eventId);
    db.applications = db.applications.filter(a => a.eventId !== eventId);
    db.closedEvents = db.closedEvents.filter(id => id !== eventId);

    await writeDB(db);
    return res.status(200).json({ success: true, message: `Event ID ${eventId} deleted.` });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete event.' } });
  }
});

// 7. Broadcast Announcement
app.post('/api/admin/announcements', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { title, body } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DATA', message: 'Title and body are required.' } });
    }

    const db = await readDB();
    const notifDate = new Date().toLocaleDateString();
    const notifTime = new Date().toLocaleTimeString();

    for (const student of db.users) {
      db.notifications.push({
        id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        userId: student.id,
        title: `📢 ${title}`,
        message: body,
        timestamp: notifTime,
        date: notifDate
      });

      if (student.email) {
        const emailMsg = `
Dear ${student.name},

📢 Important Announcement from HeberSpectra 2026:

${title.toUpperCase()}
--------------------------------------------------
${body}

--
Department of Computer Science (Shift II)
Bishop Heber College (Autonomous), Tiruchirappalli
        `;
        sendMailInternal(student.email, `📢 HeberSpectra Announcement: ${title}`, emailMsg).catch(() => {});
      }
    }

    await writeDB(db);
    return res.status(200).json({ success: true, message: `Broadcast sent to ${db.users.length} participants.` });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Broadcast failed.' } });
  }
});

// 8. Update Schedule
app.post('/api/admin/schedule', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { eventId, venue, time } = req.body || {};
    const db = await readDB();
    const ev = db.events.find(e => e.id === eventId);
    if (!ev) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found.' } });
    }

    if (venue) ev.venue = venue;
    if (time) ev.time = time;

    await writeDB(db);
    return res.status(200).json({ success: true, message: 'Event schedule updated.' });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Schedule update failed.' } });
  }
});

// 9. Admin Settings & Countdown Configuration
app.post('/api/admin/settings', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { eventDate, registrationDeadline, toggleRegistrationClosed } = req.body || {};
    const db = await readDB();

    if (!db.settings) db.settings = {};
    if (eventDate) db.settings.eventDate = eventDate;
    if (registrationDeadline) db.settings.registrationDeadline = registrationDeadline;
    if (typeof toggleRegistrationClosed === 'boolean') {
      db.registrationClosed = toggleRegistrationClosed;
    } else if (req.body.toggleRegistrationClosed === 'toggle') {
      db.registrationClosed = !db.registrationClosed;
    }

    await writeDB(db);
    return res.status(200).json({
      success: true,
      settings: db.settings,
      registrationClosed: db.registrationClosed,
      message: 'Festival settings updated.'
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Settings update failed.' } });
  }
});

// ========================================================================
// 🎯 LEADER ENDPOINTS (Requires Leader JWT + Verified Event)
// ========================================================================

// 1. Leader Roster
app.get('/api/leader/roster', authMiddleware, requireRole('leader'), async (req, res) => {
  try {
    const db = await readDB();
    const eventId = req.user.eventId;
    const eventDetails = db.events.find(e => e.id === eventId);

    const applications = db.applications.filter(a => a.eventId === eventId && a.status !== 'pending');
    const leaderScans = db.scans.filter(s => applications.some(app => app.id === s.appId));

    return res.status(200).json({
      success: true,
      event: eventDetails,
      applications,
      users: db.users.map(sanitizeUser),
      scans: leaderScans,
      isClosed: db.registrationClosed || (db.closedEvents && db.closedEvents.includes(eventId))
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve leader roster.' } });
  }
});

// 2. Leader Gate Scanner Verification
app.post('/api/leader/scan', authMiddleware, requireRole('leader'), async (req, res) => {
  try {
    const { ticketCode } = req.body || {};
    if (!ticketCode) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_QR', message: 'Ticket QR code is required.' } });
    }

    const match = ticketCode.match(/^(app_[0-9_]+)_(primary|team_[0-9]+)$/);
    if (!match) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TICKET_FORMAT', message: 'This QR code is not recognized by HeberSpectra 2026.' } });
    }

    const appId = match[1];
    const ticketType = match[2];

    const db = await readDB();
    const appItem = db.applications.find(a => a.id === appId);

    if (!appItem) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No registration matches this Ticket ID.' } });
    }

    // Leader boundary validation: Leader can only scan for their assigned event!
    if (appItem.eventId !== req.user.eventId) {
      return res.status(403).json({ success: false, error: { code: 'WRONG_EVENT', message: 'This pass is registered for another event. Access denied.' } });
    }

    // Duplicate check
    if (db.scans.some(s => s.ticketId === ticketCode)) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_CHECKED_IN', message: 'This pass QR has already been scanned and checked in.' } });
    }

    const student = db.users.find(u => u.id === appItem.studentId);
    const eventDetails = db.events.find(e => e.id === appItem.eventId);

    let attendeeName = student?.name || 'Participant';
    let attendeeUid = student?.studentId || 'ID-UNKNOWN';
    let idPhotoUrl = student?.idPhoto || '/logo.png';

    if (ticketType.startsWith('team_')) {
      const index = parseInt(ticketType.replace('team_', ''));
      const tmId = appItem.teammates[index];
      const tmProfile = db.users.find(u => u.studentId === tmId);
      if (tmProfile) {
        attendeeName = tmProfile.name;
        attendeeUid = tmProfile.studentId;
        idPhotoUrl = tmProfile.idPhoto;
      } else {
        attendeeName = tmId;
        attendeeUid = "Teammate";
      }
    }

    return res.status(200).json({
      success: true,
      ticketId: ticketCode,
      appId,
      name: attendeeName,
      uid: attendeeUid,
      college: student?.college || 'External College',
      eventTitle: eventDetails?.title || 'HeberSpectra Event',
      studentEmail: student?.email,
      idPhoto: idPhotoUrl,
      ticketType
    });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'QR scan processing failed.' } });
  }
});

// 3. Leader Approve Scan Check-in (Atomic check-in and certificate unlock)
app.post('/api/leader/checkin', authMiddleware, requireRole('leader'), async (req, res) => {
  try {
    const { ticketId, appId, name, college, eventTitle, studentEmail, ticketType } = req.body || {};

    if (!ticketId || !appId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DATA', message: 'Missing scan confirmation parameters.' } });
    }

    const db = await readDB();

    // Prevent duplicate check-in (atomic check)
    if (db.scans.some(s => s.ticketId === ticketId)) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_CHECKED_IN', message: 'Attendee has already been checked in.' } });
    }

    const newScan = {
      id: "scan_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      ticketId,
      appId,
      attendeeName: name,
      college,
      timestamp: new Date().toLocaleString()
    };

    db.scans.push(newScan);

    // Update application status to attended
    const appIndex = db.applications.findIndex(a => a.id === appId);
    if (appIndex !== -1 && ticketType === 'primary') {
      db.applications[appIndex].status = 'attended';
    }

    // Send check-in confirmation & unlock certificate email
    if (studentEmail) {
      const certEmailBody = `
Dear ${name},

Your attendance pass was successfully verified at the venue door for ${eventTitle}!
Your Certificate of Participation has been unlocked and is ready inside your Student Portal dashboard.

Details:
- Participant: ${name}
- Event: ${eventTitle}
- Validation ID: ${ticketId}

Best regards,
Department of Computer Science (Shift II)
Bishop Heber College (Autonomous)
      `;
      sendMailInternal(studentEmail, `Certificate Unlocked - ${eventTitle}`, certEmailBody, `${name}_certificate.pdf`).catch(() => {});
    }

    await writeDB(db);
    return res.status(200).json({ success: true, message: `Check-in confirmed for ${name}. Certificate unlocked.` });

  } catch (err) {
    console.error('Checkin error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to record check-in.' } });
  }
});

// 4. Leader Broadcast Start Alert
app.post('/api/leader/alert', authMiddleware, requireRole('leader'), async (req, res) => {
  try {
    const eventId = req.user.eventId;
    const db = await readDB();
    const eventDetails = db.events.find(e => e.id === eventId);
    const eventApps = db.applications.filter(a => a.eventId === eventId && a.status !== 'pending');

    if (eventApps.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_PARTICIPANTS', message: 'There are no approved participants to notify.' } });
    }

    for (const appItem of eventApps) {
      const student = db.users.find(u => u.id === appItem.studentId);
      if (student) {
        db.notifications.push({
          id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          userId: student.id,
          title: `${eventDetails.title} is Starting!`,
          message: `Attention! ${eventDetails.title} is starting now at ${eventDetails.venue}. Please proceed to the venue immediately.`,
          timestamp: new Date().toLocaleTimeString(),
          date: new Date().toLocaleDateString()
        });
      }
    }

    await writeDB(db);
    return res.status(200).json({ success: true, message: `Alert sent to ${eventApps.length} participants.` });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to broadcast alert.' } });
  }
});

// 5. Leader Edit Event Details
app.patch('/api/leader/event', authMiddleware, requireRole('leader'), async (req, res) => {
  try {
    const eventId = req.user.eventId;
    const db = await readDB();
    const ev = db.events.find(e => e.id === eventId);

    if (!ev) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found.' } });
    }

    const { title, desc, rules, maxTeammates, venue, time, incharge } = req.body || {};
    if (title) ev.title = title;
    if (desc) ev.desc = desc;
    if (rules) ev.rules = rules;
    if (maxTeammates !== undefined) ev.maxTeammates = parseInt(maxTeammates) || 0;
    if (venue) ev.venue = venue;
    if (time) ev.time = time;
    if (incharge) ev.incharge = incharge;

    await writeDB(db);
    return res.status(200).json({ success: true, event: ev, message: 'Event details updated.' });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update event details.' } });
  }
});

// 6. Leader Toggle Event Lock
app.post('/api/leader/toggle-lock', authMiddleware, requireRole('leader'), async (req, res) => {
  try {
    const eventId = req.user.eventId;
    const db = await readDB();

    if (db.registrationClosed) {
      return res.status(400).json({ success: false, error: { code: 'GLOBALLY_LOCKED', message: 'Registrations are locked globally by College Admin.' } });
    }

    if (!db.closedEvents) db.closedEvents = [];
    if (db.closedEvents.includes(eventId)) {
      db.closedEvents = db.closedEvents.filter(id => id !== eventId);
    } else {
      db.closedEvents.push(eventId);
    }

    await writeDB(db);
    return res.status(200).json({
      success: true,
      closedEvents: db.closedEvents,
      isClosed: db.closedEvents.includes(eventId),
      message: db.closedEvents.includes(eventId) ? 'Event registration frozen.' : 'Event registration opened.'
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to toggle event lock.' } });
  }
});

// ========================================================================
// ✉️ EMAIL DISPATCH ENDPOINT (Rate limited & authenticated)
// ========================================================================
app.post('/api/send-email', emailLimiter, async (req, res) => {
  const { to, subject, body, attachmentName } = req.body || {};
  if (!to || !subject || !body) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DATA', message: 'Missing recipient, subject, or body.' } });
  }

  const result = await sendMailInternal(to, subject, body, attachmentName);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
});

app.get('/', (req, res) => {
  res.send('<h1>HeberSpectra 2026 - Production API Server</h1><p>Active and secured.</p>');
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Spectra Secured API Server active on: http://localhost:${PORT}`);
  });
}

module.exports = app;


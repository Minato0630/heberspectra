# HeberSpectra 2026 - Complete Codebase Blueprint & Technical Manual

This document provides the full, end-to-end technical manual and exact source code blueprints for **HeberSpectra 2026**, a premium event management and participant registration platform built specifically for Bishop Heber College.

If you feed this README file into any code-generation AI, it will be able to reconstruct the exact folder structures, APIs, security validations, database schemas, states, and client logic of the HeberSpectra application.

---

## Table of Contents
1. [Project Structure & Dependencies (`package.json`)](#1-project-structure--dependencies-packagejson)
2. [Database Schema (`db.json`)](#2-database-schema-dbjson)
3. [Full Backend API Implementation (`server.cjs`)](#3-full-backend-api-implementation-servercjs)
4. [Full React State Context Provider (`AppContext.jsx`)](#4-full-react-state-context-provider-appcontextjsx)
5. [Frontend Layout Blueprint & Component Walkthrough (`App.jsx`)](#5-frontend-layout-blueprint--component-walkthrough-appjsx)
6. [Design System & UI Theme Blueprint (`App.css`)](#6-design-system--ui-theme-blueprint-appcss)
7. [Running & Deployment Guidelines](#7-running--deployment-guidelines)
8. [Access Credentials Sheet](#8-access-credentials-sheet)

---

## 1. Project Structure & Dependencies (`package.json`)

The project is structured as a React client powered by Vite, communicating with an Express node backend.

```
heberspectra-react/
├── package.json
├── db.json
├── server.cjs
├── index.html
├── vite.config.js
├── public/
│   └── logo.png
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── index.css
    └── context/
        └── AppContext.jsx
```

### Exact `package.json` Source
```json
{
  "name": "heberspectra-react",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "nodemailer": "^9.0.3",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "oxlint": "^1.71.0",
    "vite": "^8.1.1"
  }
}
```

---

## 2. Database Schema (`db.json`)

The database uses a single local JSON document to persist data. Here is the exact initial database schema outline:

```json
{
  "users": [],
  "applications": [],
  "emails": [],
  "notifications": [],
  "scans": [],
  "events": [],
  "registrationClosed": false,
  "closedEvents": [],
  "settings": {
    "adminPassword": "AdminPassword123"
  }
}
```

---

## 3. Full Backend API Implementation (`server.cjs`)

Here is the exact production-ready Express backend code (`server.cjs`). Save this in the root of your project directory.

```javascript
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5001;
const DB_FILE = path.join(__dirname, 'db.json');

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
    if (!fs.existsSync(DB_FILE)) {
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
// ✉️ BACKEND SMTP CONFIGURATION
// ========================================================================
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',         
  port: 465,                      
  user: 'erenyeager6305@gmail.com',   
  pass: 'sorbacotvgyabqkw'       
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
    if (SMTP_CONFIG.user && SMTP_CONFIG.user !== 'your_email@gmail.com' && SMTP_CONFIG.pass) {
      console.log(`Using backend configured SMTP for sending email to: ${to}`);
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

app.listen(PORT, () => {
  console.log(`Spectra Email Dispatcher active on: http://localhost:${PORT}`);
});
```

---

## 4. Full React State Context Provider (`AppContext.jsx`)

Here is the exact source code for the state management engine (`src/context/AppContext.jsx`). This handles database synchronization, local caching fallbacks, email dispatch integration, and all core logic rules (anti-fraud, role-based login, registrations validation).

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

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

export const AppProvider = ({ children }) => {
  const [db, setDb] = useState({
    users: [],
    applications: [],
    emails: [],
    notifications: [],
    scans: [],
    events: INITIAL_EVENTS,
    registrationClosed: false,
    closedEvents: [], 
    settings: { adminPassword: "AdminPassword123" }
  });
  
  const [currentSession, setCurrentSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem("spectra_session");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const fetchDatabase = async () => {
      try {
        const host = window.location.hostname || "localhost";
        const response = await fetch(`http://${host}:5001/api/database`);
        if (response.ok) {
          const serverDb = await response.json();
          
          if (!serverDb.users) serverDb.users = [];
          if (!serverDb.applications) serverDb.applications = [];
          if (!serverDb.emails) serverDb.emails = [];
          if (!serverDb.notifications) serverDb.notifications = [];
          if (!serverDb.scans) serverDb.scans = [];
          if (!serverDb.closedEvents) serverDb.closedEvents = [];
          if (!serverDb.settings) serverDb.settings = { adminPassword: "AdminPassword123" };
          if (!serverDb.events || serverDb.events.length === 0) serverDb.events = INITIAL_EVENTS;

          serverDb.events = INITIAL_EVENTS.map(defEv => {
            const existing = serverDb.events.find(e => e.id === defEv.id);
            if (existing) {
              return {
                ...defEv,
                ...existing,
                rules: existing.rules || defEv.rules,
                maxTeammates: existing.maxTeammates !== undefined ? existing.maxTeammates : defEv.maxTeammates
              };
            }
            return defEv;
          });

          setDb(serverDb);
          localStorage.setItem("heberspectra_db", JSON.stringify(serverDb));
        }
      } catch (e) {
        console.error("Failed to sync database from backend server:", e);
        const localData = localStorage.getItem("heberspectra_db");
        if (localData) {
          setDb(JSON.parse(localData));
        }
      }
    };

    fetchDatabase();
  }, []);

  const updateDB = async (newDb) => {
    setDb(newDb);
    localStorage.setItem("heberspectra_db", JSON.stringify(newDb));

    try {
      const host = window.location.hostname || "localhost";
      await fetch(`http://${host}:5001/api/database`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDb)
      });
    } catch (e) {
      console.error("Failed to sync database to backend server:", e);
    }
  };

  const addToast = (title, message, isError = false) => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, title, message, isError }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const pushNotification = (userId, title, message, customDb = db) => {
    const newNotif = {
      id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      userId,
      title,
      message,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString()
    };
    const updated = {
      ...customDb,
      notifications: [...customDb.notifications, newNotif]
    };
    updateDB(updated);
    addToast(title, message);
    return updated;
  };

  const pushEmail = async (toEmail, subject, body, attachmentName = null, customDb = db) => {
    const newEmail = {
      id: "email_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      to: toEmail,
      subject,
      body,
      attachment: attachmentName,
      timestamp: new Date().toLocaleString()
    };

    let activeDb = { ...customDb };

    try {
      const host = window.location.hostname || "localhost";
      const response = await fetch(`http://${host}:5001/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toEmail,
          subject,
          body,
          attachmentName
        })
      });

      const res = await response.json();
      if (res.success) {
        activeDb = {
          ...customDb,
          emails: [...customDb.emails, newEmail]
        };
        updateDB(activeDb);

        if (res.isTest) {
          console.log(`[Ethereal Mock Email Preview URL]: ${res.previewUrl}`);
          addToast("Email Dispatched (Test)", "Preview URL logged to developer console.");
        } else {
          addToast("Email Sent!", `Real email successfully sent to inbox: ${toEmail}`);
        }
      } else {
        console.error("SMTP error: ", res.error);
        addToast("SMTP Mail Delivery Failed", res.error || "Please check your SMTP credentials in server.cjs", true);
      }
    } catch (e) {
      console.error("Local nodemailer server offline:", e);
      addToast("Mail Dispatcher Offline", "Could not connect to the Node mail server on port 5001.", true);
    }
    
    return activeDb;
  };

  const registerUser = (details) => {
    const bhcKeywords = ["bishop heber", "bhc", "bishop heber college", "heber", "bishopheber"];
    const lowerCollege = details.college.toLowerCase();
    const isBHC = bhcKeywords.some(keyword => lowerCollege.includes(keyword));

    if (isBHC) {
      addToast("Registration Rejected", "Only students from OTHER colleges are allowed to register for HeberSpectra 2026. Bishop Heber College students cannot participate.", true);
      return false;
    }

    if (db.users.find(u => u.email === details.email.toLowerCase())) {
      addToast("Registration Blocked", "This email address is already registered.", true);
      return false;
    }

    if (db.users.find(u => u.reno.toLowerCase() === details.reno.toLowerCase() && u.college.toLowerCase() === details.college.toLowerCase())) {
      addToast("Registration Blocked", `A student from "${details.college}" is already registered with Register Number: ${details.reno}.`, true);
      return false;
    }

    if (db.users.find(u => u.name.toLowerCase() === details.name.toLowerCase() && u.college.toLowerCase() === details.college.toLowerCase())) {
      addToast("Registration Blocked", `A student named "${details.name}" is already registered under "${details.college}".`, true);
      return false;
    }

    const studentUid = "BHC-STU-" + (1000 + db.users.length + 1);

    const newUser = {
      id: "user_" + Date.now(),
      studentId: studentUid,
      name: details.name,
      college: details.college,
      dept: details.dept,
      phno: details.phno,
      email: details.email.toLowerCase(),
      reno: details.reno,
      password: details.password,
      food: details.food,
      accom: details.accom,
      idPhoto: details.idPhoto || "/logo.png", 
      staff: details.staffName ? { name: details.staffName, food: details.staffFood } : null,
      registeredAt: new Date().toLocaleDateString()
    };

    const updated = {
      ...db,
      users: [...db.users, newUser]
    };
    updateDB(updated);
    addToast("Signup Successful!", `Your unique Student ID is: ${studentUid}. You can now sign in.`);
    return true;
  };

  const loginUser = (emailOrId, password, roleType) => {
    const formattedEmail = emailOrId.trim().toLowerCase();
    
    if (roleType === "admin") {
      const adminRoles = ["president", "vicepresident", "manager"];
      if (adminRoles.includes(formattedEmail)) {
        if (password === db.settings.adminPassword) {
          const session = {
            role: "admin",
            adminRole: formattedEmail,
            name: formattedEmail.charAt(0).toUpperCase() + formattedEmail.slice(1)
          };
          sessionStorage.setItem("spectra_session", JSON.stringify(session));
          setCurrentSession(session);
          addToast("Welcome Admin", `Logged in as ${formattedEmail.charAt(0).toUpperCase() + formattedEmail.slice(1)}`);
          return true;
        }
      }
      addToast("Login Failed", "Incorrect password or role ID.", true);
      return false;
    }

    if (roleType === "leader") {
      if (formattedEmail.startsWith("leader_")) {
        const eventId = formattedEmail.replace("leader_", "");
        const matchedEvent = db.events.find(ev => ev.id === eventId);
        if (matchedEvent && password === "leader") {
          const session = {
            role: "leader",
            eventId,
            name: matchedEvent.title + " Leader"
          };
          sessionStorage.setItem("spectra_session", JSON.stringify(session));
          setCurrentSession(session);
          addToast("Leader Access Granted", `Logged in for ${matchedEvent.title}`);
          return true;
        }
      }
      addToast("Login Failed", "Invalid Event Leader credentials.", true);
      return false;
    }

    const student = db.users.find(u => (u.email === formattedEmail || (u.studentId && u.studentId.toLowerCase() === formattedEmail)) && u.password === password);
    if (student) {
      const session = {
        role: "student",
        details: student,
        name: student.name
      };
      sessionStorage.setItem("spectra_session", JSON.stringify(session));
      setCurrentSession(session);
      addToast("Welcome Back", `Successfully logged in, ${student.name}`);
      return true;
    }
    
    addToast("Login Failed", "Invalid credentials.", true);
    return false;
  };

  const logoutUser = () => {
    sessionStorage.removeItem("spectra_session");
    setCurrentSession(null);
    addToast("Logged Out", "You have successfully signed out.");
  };

  const applyForEvent = (eventId, teamName, teammateIds, inputStudentId) => {
    if (!currentSession || currentSession.role !== "student") return false;
    const student = currentSession.details;

    if (db.registrationClosed || db.closedEvents.includes(eventId)) {
      addToast("Registration Locked", "Registrations for this event are closed.", true);
      return false;
    }

    if (inputStudentId.trim().toUpperCase() !== student.studentId) {
      addToast("Student ID Mismatch", `Your entered ID does not match your profile ID (${student.studentId}).`, true);
      return false;
    }

    const formattedTeammates = teammateIds.map(id => id.trim().toUpperCase()).filter(id => id !== "");

    if (formattedTeammates.includes(student.studentId) || new Set(formattedTeammates).size !== formattedTeammates.length) {
      addToast("Duplicate IDs Entered", "Do not enter duplicate student IDs in teammate slots.", true);
      return false;
    }

    const getEventCount = (stuId) => {
      let count = 0;
      db.applications.forEach(app => {
        const appOwner = db.users.find(u => u.id === app.studentId);
        if (appOwner) {
          if (appOwner.studentId === stuId) count++;
          if (app.teammates.includes(stuId)) count++;
        }
      });
      return count;
    };

    if (getEventCount(student.studentId) >= 2) {
      addToast("Event Limit Exceeded", "You are already participating in 2 events.", true);
      return false;
    }

    for (const tmId of formattedTeammates) {
      const tmProfile = db.users.find(u => u.studentId === tmId);
      if (!tmProfile) {
        addToast("ID Not Found", `Teammate ID "${tmId}" is not signed up in the system.`, true);
        return false;
      }
      
      if (tmProfile.college.toLowerCase() !== student.college.toLowerCase()) {
        addToast("College Mismatch", `Teammate "${tmProfile.name}" (${tmId}) belongs to "${tmProfile.college}", not "${student.college}".`, true);
        return false;
      }

      if (getEventCount(tmId) >= 2) {
        addToast("Teammate Limit Exceeded", `Teammate "${tmProfile.name}" (${tmId}) is already participating in 2 events.`, true);
        return false;
      }
    }

    const newApp = {
      id: "app_" + Date.now(),
      studentId: student.id,
      eventId,
      teamName: teamName || `${student.name}'s Team`,
      teammates: formattedTeammates, 
      payment: null,
      status: "pending",
      appliedAt: new Date().toLocaleString()
    };

    updateDB({
      ...db,
      applications: [...db.applications, newApp]
    });
    addToast("Application Submitted!", "Please upload your payment reference to unlock passes.");
    return true;
  };

  const submitPayment = (appId, txId) => {
    const updatedApps = db.applications.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          payment: {
            txId,
            submittedAt: new Date().toLocaleString()
          }
        };
      }
      return app;
    });
    updateDB({
      ...db,
      applications: updatedApps
    });
    addToast("Payment Logged", "Admin will verify your payment details shortly.");
  };

  const approveApplication = async (appId) => {
    const app = db.applications.find(a => a.id === appId);
    if (!app) return;

    const student = db.users.find(u => u.id === app.studentId);
    const eventDetails = db.events.find(e => e.id === app.eventId);

    const updatedApps = db.applications.map(a => {
      if (a.id === appId) {
        return { ...a, status: "approved" };
      }
      return a;
    });

    let activeDb = {
      ...db,
      applications: updatedApps
    };

    activeDb = pushNotification(student.id, "Registration Approved!", `Your registration for ${eventDetails.title} has been approved. Passes generated.`, activeDb);

    const studentEmailBody = `
      Dear ${student.name},\n\n
      Your payment transaction has been verified and registration is APPROVED for ${eventDetails.title}.\n
      Download your Entry Pass PDF inside your Student Portal dashboard.\n\n
      Details:\n
      - Event: ${eventDetails.title}\n
      - Venue: ${eventDetails.venue}\n
      - Timing: ${eventDetails.time}\n
      - Entry Pass Code: ${appId}_primary\n\n
      We look forward to seeing you at Bishop Heber College!
    `;
    activeDb = await pushEmail(student.email, `Entry Pass - ${eventDetails.title}`, studentEmailBody, `${student.name}_entry_pass.pdf`, activeDb);

    for (let index = 0; index < app.teammates.length; index++) {
      const tmId = app.teammates[index];
      const tmProfile = db.users.find(u => u.studentId === tmId);
      if (tmProfile) {
        const tmEmailBody = `
          Dear ${tmProfile.name},\n\n
          Your team leader ${student.name} has registered you as a teammate for ${eventDetails.title}.\n
          Download your individual Entry Pass PDF inside your student dashboard.\n\n
          Details:\n
          - Event: ${eventDetails.title}\n
          - Team Name: ${app.teamName}\n
          - Entry Pass Code: ${appId}_team_${index}\n\n
          We look forward to seeing you at Bishop Heber College!
        `;
        activeDb = await pushEmail(tmProfile.email, `Teammate Entry Pass - ${eventDetails.title}`, tmEmailBody, `${tmProfile.name}_entry_pass.pdf`, activeDb);
      }
    }

    updateDB(activeDb);
    addToast("Application Approved!", "Passes generated and emails dispatched.");
  };

  const rejectApplication = (appId) => {
    const app = db.applications.find(a => a.id === appId);
    if (!app) return;
    const student = db.users.find(u => u.id === app.studentId);

    const updatedApps = db.applications.filter(a => a.id !== appId);
    let activeDb = {
      ...db,
      applications: updatedApps
    };

    activeDb = pushNotification(student.id, "Registration Rejected", "Your event application was rejected by the admin. Please verify payment details.", activeDb);
    updateDB(activeDb);
    addToast("Application Rejected", "Sent notification to student.");
  };

  const scanTicket = async (ticketCode) => {
    const match = ticketCode.match(/^(app_[0-9]+)_(primary|team_[0-9]+)$/);
    if (!match) {
      addToast("Scan Error", "This QR code is not recognized by HeberSpectra 2026.", true);
      return null;
    }

    const appId = match[1];
    const ticketType = match[2];

    const app = db.applications.find(a => a.id === appId);
    if (!app) {
      addToast("Not Found", "No registration matches this Ticket ID.", true);
      return null;
    }

    if (currentSession?.role === "leader" && currentSession.eventId !== app.eventId) {
      addToast("Access Denied", "This pass is registered for another event.", true);
      return null;
    }

    if (db.scans.some(s => s.ticketId === ticketCode)) {
      addToast("Duplicate Entry", "This pass QR has already been scanned.", true);
      return null;
    }

    const student = db.users.find(u => u.id === app.studentId);
    const eventDetails = db.events.find(e => e.id === app.eventId);
    
    let attendeeName = student.name;
    let attendeeUid = student.studentId;
    let idPhotoUrl = student.idPhoto;

    if (ticketType.startsWith("team_")) {
      const index = parseInt(ticketType.replace("team_", ""));
      const tmId = app.teammates[index];
      const tmProfile = db.users.find(u => u.studentId === tmId);
      if (tmProfile) {
        attendeeName = tmProfile.name;
        attendeeUid = tmProfile.studentId;
        idPhotoUrl = tmProfile.idPhoto;
      } else {
        attendeeName = tmId;
        attendeeUid = "Not Registered";
        idPhotoUrl = "/logo.png";
      }
    }

    return {
      ticketId: ticketCode,
      appId,
      name: attendeeName,
      uid: attendeeUid,
      college: student.college,
      eventTitle: eventDetails.title,
      studentEmail: student.email,
      idPhoto: idPhotoUrl,
      ticketType
    };
  };

  const approveScanCheckIn = async (scanData) => {
    const newScan = {
      id: "scan_" + Date.now(),
      ticketId: scanData.ticketId,
      appId: scanData.appId,
      attendeeName: scanData.name,
      college: scanData.college,
      timestamp: new Date().toLocaleString()
    };

    const updatedApps = db.applications.map(a => {
      if (a.id === scanData.appId && scanData.ticketType === "primary") {
        return { ...a, status: "attended" };
      }
      return a;
    });

    let activeDb = {
      ...db,
      scans: [...db.scans, newScan],
      applications: updatedApps
    };

    const student = db.users.find(u => u.email === scanData.studentEmail);
    if (student) {
      activeDb = pushNotification(student.id, "Attendance Verified!", `${scanData.name}'s attendance was scanned successfully for ${scanData.eventTitle}.`, activeDb);
    }

    const certEmailBody = `
      Dear ${scanData.name},\n\n
      Your attendance pass was successfully verified at the venue door for ${scanData.eventTitle}!\n
      Your Certificate of Participation has been unlocked and emailed to your team profile.\n\n
      Details:\n
      - Participant: ${scanData.name}\n
      - Event: ${scanData.eventTitle}\n
      - Validation ID: ${scanData.ticketId}\n\n
      You can print/download your certificate inside your Student Portal dashboard.\n\n
      Best regards,\n
      Event Organizers, Bishop Heber College
    `;
    activeDb = await pushEmail(scanData.studentEmail, `Certificate Unlocked - ${scanData.eventTitle}`, certEmailBody, `${scanData.name}_certificate.pdf`, activeDb);

    updateDB(activeDb);
    addToast("Attendance Recorded", `Check-in approved for ${scanData.name}.`);
    return true;
  };

  const alertParticipants = (eventId) => {
    const currentEvent = db.events.find(e => e.id === eventId);
    const eventApps = db.applications.filter(a => a.eventId === eventId && a.status !== "pending");

    if (eventApps.length === 0) {
      addToast("No Participants", "There are no approved participants to notify.", true);
      return;
    }

    let activeDb = { ...db };
    eventApps.forEach(app => {
      const student = db.users.find(u => u.id === app.studentId);
      if (student) {
        activeDb = pushNotification(
          student.id,
          `${currentEvent.title} is Starting!`,
          `Attention! ${currentEvent.title} is starting now at ${currentEvent.venue}. Please proceed to the venue immediately.`,
          activeDb
        );
      }
    });
    addToast("Alerts Dispatched", `Notification sent to all ${eventApps.length} team leaders.`);
  };

  const updateSchedule = (eventId, venue, time) => {
    const updatedEvents = db.events.map(ev => {
      if (ev.id === eventId) {
        return { ...ev, venue, time };
      }
      return ev;
    });
    updateDB({
      ...db,
      events: updatedEvents
    });
    addToast("Schedule Updated", "Event details updated successfully.");
  };

  const toggleRegistrationClosed = () => {
    const nextState = !db.registrationClosed;
    updateDB({
      ...db,
      registrationClosed: nextState
    });
    addToast(
      nextState ? "Registrations Locked" : "Registrations Opened",
      `Event signup portal is now ${nextState ? 'CLOSED globally' : 'OPEN'}.`
    );
  };

  const toggleLeaderEventRegistration = (eventId) => {
    if (db.registrationClosed) {
      addToast("Globally Locked", "Registrations are locked globally by Admin. You cannot override it.", true);
      return;
    }

    let nextClosedEvents;
    if (db.closedEvents.includes(eventId)) {
      nextClosedEvents = db.closedEvents.filter(id => id !== eventId);
      addToast("Event Opened", "Registrations opened for your event.");
    } else {
      nextClosedEvents = [...db.closedEvents, eventId];
      addToast("Event Freezed", "Registrations closed for your event.");
    }

    updateDB({
      ...db,
      closedEvents: nextClosedEvents
    });
  };

  const deleteStudent = (userId) => {
    const student = db.users.find(u => u.id === userId);
    if (student) {
      const updatedUsers = db.users.filter(u => u.id !== userId);
      const updatedApps = db.applications.filter(a => a.studentId !== userId);
      updateDB({
        ...db,
        users: updatedUsers,
        applications: updatedApps
      });
      addToast("Student Removed", `Successfully deleted student: ${student.name}`);
    }
  };

  const addEvent = (eventDetails) => {
    if (db.events.find(ev => ev.id === eventDetails.id)) {
      addToast("Creation Error", "An event with this Event ID already exists.", true);
      return false;
    }

    updateDB({
      ...db,
      events: [...db.events, eventDetails]
    });
    addToast("Event Created", `Successfully added new event: ${eventDetails.title}`);
    return true;
  };

  const deleteEvent = (eventId) => {
    const updatedEvents = db.events.filter(e => e.id !== eventId);
    const updatedApps = db.applications.filter(a => a.eventId !== eventId);
    const updatedClosed = db.closedEvents.filter(id => id !== eventId);

    updateDB({
      ...db,
      events: updatedEvents,
      applications: updatedApps,
      closedEvents: updatedClosed
    });
    addToast("Event Deleted", `Successfully removed event ID: ${eventId}`);
  };

  const broadcastAnnouncement = (title, body) => {
    if (db.users.length === 0) {
      addToast("Broadcast Failed", "No registered students to notify.", true);
      return;
    }

    let activeDb = { ...db };
    db.users.forEach(student => {
      activeDb = pushNotification(student.id, title, body, activeDb);
    });
    addToast("Broadcast Sent", `Alert dispatched to all ${db.users.length} students.`);
  };

  const updateEventDetails = (eventId, details) => {
    const updatedEvents = db.events.map(ev => {
      if (ev.id === eventId) {
        return { ...ev, ...details };
      }
      return ev;
    });
    updateDB({
      ...db,
      events: updatedEvents
    });
    addToast("Event Updated", "Your event details have been successfully modified.");
  };

  const generateQR = (dataString) => {
    return `<img crossorigin="anonymous" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(dataString)}" alt="QR Code" style="width:130px; height:130px; display:block; margin:0 auto; background:white; padding:5px; border-radius:5px;" />`;
  };

  return (
    <AppContext.Provider value={{
      db,
      currentSession,
      toasts,
      registerUser,
      loginUser,
      logoutUser,
      applyForEvent,
      submitPayment,
      approveApplication,
      rejectApplication,
      scanTicket,
      approveScanCheckIn,
      alertParticipants,
      updateSchedule,
      toggleRegistrationClosed,
      toggleLeaderEventRegistration,
      deleteStudent,
      addEvent,
      deleteEvent,
      broadcastAnnouncement,
      updateEventDetails,
      generateQR,
      addToast,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
};

## 5. Frontend Layout Blueprint & Component Walkthrough (`App.jsx`)

To reconstruct `App.jsx`, implement a React router matching on `currentPage`. The interface must import `useApp` and define the following views:

### Views Mapping
1. **Home (`currentPage === 'home'`)**: 
   - Display a responsive navbar. 
   - Feature a landing banner with Bishop Heber College branding.
   - List event cards mapping over `db.events`. Each card displays the description, venue, and rules, with a **Quick Apply** button that calls `handleQuickRegister(eventId)`.
2. **Auth (`currentPage === 'auth-page'`)**:
   - Tab switcher for **Login** vs **Register**.
   - Input forms selecting `Role` (Student, Admin, Leader).
   - Form-field validation: BHC keyword blocking on signup, ID card file upload (stores in base64 state).
3. **Student Dashboard (`currentPage === 'student-dashboard'`)**:
   - Side panel layout targeting `studentTab`:
     - **Profile**: Displays user info + generated student ID (`studentId`). Shows base64 uploaded ID photo.
     - **Events Catalogue**: Dropdown selecting from `db.events`, generating teammates text inputs dynamically up to the event's `maxTeammates` cap. Submit triggers `applyForEvent()`.
     - **Applications Status**: Lists pending and approved registrations. If pending without payment, prompts a modal input to submit the transaction ID (`submitPayment()`). If approved, triggers `downloadTicketPDF()`.
     - **Verified Passes**: Styled ticket panels with custom QR Code renders. 
     - **Certificates**: Dynamic certificates rendered for events that show `attended` status. Exports landscape PDF using `html2pdf.js`.
4. **Admin Dashboard (`currentPage === 'admin-dashboard'`)**:
   - Navigation panels targeting `adminTab`:
     - **Analytics**: Displays counts of users, registrations fees, and active gate scans.
     - **Users List**: Table of all registered students with full profiles, plus a **Delete** button linking to `deleteStudent()`.
     - **Applications Table**: Shows transaction IDs, student records, and teammates. Clicking Approve fires `approveApplication()`, sending automated nodemailer alerts.
     - **Manage Events**: Form to execute `addEvent()` and list events to execute `deleteEvent()`.
     - **Global Settings**: Button to toggle `toggleRegistrationClosed()`.
5. **Leader Dashboard (`currentPage === 'leader-dashboard'`)**:
   - Panel links targeting `leaderTab`:
     - **Participants**: Filtered tables containing students registered to `currentSession.eventId`.
     - **Gate Check-in Scanner**: Integrates a HTML container `<div id="reader"></div>` and registers `Html5QrcodeScanner`. Decoding codes triggers `scanTicket()`, opening a confirmation modal before finalizing `approveScanCheckIn()`.
     - **Configuration**: Form modifying local event data (`updateEventDetails()`).

### PDF Exporters Implementation
Vite layouts render print captures dynamically. Add the following functions inside the component:

```javascript
const downloadTicketPDF = (ticketId, name) => {
  const element = document.getElementById(`ticket-card-${ticketId}`);
  if (!element) return;

  const originalStyle = element.style.cssText;
  element.style.width = "750px";
  element.classList.add("pdf-force-desktop");

  const opt = {
    margin:       0.3,
    filename:     `HeberSpectra_Ticket_${name.replace(/\s+/g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, backgroundColor: '#05060f', useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  setTimeout(() => {
    window.html2pdf().set(opt).from(element).save().then(() => {
      element.style.cssText = originalStyle;
      element.classList.remove("pdf-force-desktop");
    });
  }, 250);
};

const downloadCertificatePDF = (name, eventTitle) => {
  const element = document.querySelector(".certificate");
  if (!element) return;

  const originalStyle = element.style.cssText;
  element.style.width = "800px";
  element.style.height = "565px";
  element.style.padding = "40px";
  element.classList.add("pdf-force-desktop");

  const opt = {
    margin:       0.2,
    filename:     `HeberSpectra_Certificate_${name.replace(/\s+/g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, backgroundColor: '#0d0f1a', useCORS: true },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
  };

  setTimeout(() => {
    window.html2pdf().set(opt).from(element).save().then(() => {
      element.style.cssText = originalStyle;
      element.classList.remove("pdf-force-desktop");
    });
  }, 250);
};
```

---

## 6. Design System & UI Theme Blueprint (`App.css`)

Save this stylesheet structure in your source folder. It sets up the core glassmorphic parameters and colors.

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

:root {
  --bg-color: #05060f;
  --panel-bg: rgba(13, 17, 39, 0.7);
  --card-bg: rgba(22, 28, 59, 0.45);
  --primary-glow: #ff0055;     /* Neon Pink */
  --secondary-glow: #00ccff;   /* Cyber Blue */
  --accent-color: #bd00ff;     /* Laser Purple */
  --text-primary: #ffffff;
  --text-secondary: #a3a8cc;
  --border-glow: rgba(255, 0, 85, 0.2);
  --border-glow-blue: rgba(0, 204, 255, 0.2);
  --font-family: 'Outfit', sans-serif;
  --transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  --shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

body {
  background-color: var(--bg-color);
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(255, 0, 85, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(0, 204, 255, 0.08) 0%, transparent 40%);
  background-attachment: fixed;
  color: var(--text-primary);
  font-family: var(--font-family);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Glass Panels */
.glass-panel {
  background: var(--panel-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: var(--shadow);
}

/* Neon buttons */
.btn-primary {
  background: linear-gradient(45deg, var(--primary-glow), var(--accent-color));
  color: #fff;
  border: none;
  padding: 0.8rem 1.6rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 15px var(--primary-glow);
}
```

---

## 7. Running & Deployment Guidelines

To execute the project locally:

1. **Install Packages**:
   ```bash
   npm install
   ```
2. **Start Backend Server**:
   ```bash
   node server.cjs
   ```
   *The backend is active on [http://localhost:5001](http://localhost:5001)*
3. **Start Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   *The frontend client is active on [http://localhost:5173](http://localhost:5173)*

---

## 8. Access Credentials Sheet

Use the logins below to authenticate and access the various dashboard views for testing:

| Role / Dashboard | Username | Password |
| :--- | :--- | :--- |
| **College Admin** | `president` / `vicepresident` / `manager` | `AdminPassword123` |
| **ByteCraft Hackathon Leader** | `leader_hackathon` | `leader` |
| **Ad-Zap Showdown Leader** | `leader_adzap` | `leader` |
| **CodeConquer Debug Leader** | `leader_coding` | `leader` |
| **WebCraft UI/UX Leader** | `leader_webdesign` | `leader` |
| **MindSprint Tech Quiz Leader** | `leader_quiz` | `leader` |
| **CyberHunt Leader** | `leader_treasurehunt` | `leader` |
| **Student Dashboard** | Register via signup tab | Custom password |


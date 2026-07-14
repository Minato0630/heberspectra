import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const INITIAL_EVENTS = [
  {
    id: "hackathon",
    title: "ByteCraft Hackathon",
    desc: "A 24-hour intense software development competition. Form a team and build innovative solutions for real-world problems.",
    rules: "Bring your own devices. Projects must be coded from scratch during the event. Use of AI is allowed only for templates. No pre-written codes.",
    maxTeammates: 3, // Team of 4
    venue: "Ramanujan Computing Centre (Hall 1)",
    time: "09:00 AM - Oct 12, 2026",
    incharge: "Dr. K. R. Srinivasan (+91 98765 43210)"
  },
  {
    id: "adzap",
    title: "Ad-Zap Showdown",
    desc: "Showcase your marketing and creative skills! Convince the judges by advertising bizarre products on-the-spot.",
    rules: "5 minutes preparation time. 3 minutes presentation. Products assigned randomly. No vulgarity. Judges' decisions are final.",
    maxTeammates: 4, // Team of 5
    venue: "Golden Jubilee Seminar Hall (Hall 2)",
    time: "11:30 AM - Oct 12, 2026",
    incharge: "Prof. S. Anita (+91 94432 10987)"
  },
  {
    id: "coding",
    title: "CodeConquer Debug & Speed Run",
    desc: "Speed coding, algorithm design, and reverse engineering. Put your syntax and troubleshooting skills to the test.",
    rules: "Individual competition. No internet access allowed. Fastest correct compile wins. Standard libraries only.",
    maxTeammates: 0, // Individual
    venue: "MCA Lab (Hall 3)",
    time: "02:00 PM - Oct 12, 2026",
    incharge: "Dr. J. Ronald (+91 90012 34567)"
  },
  {
    id: "webdesign",
    title: "WebCraft UI/UX",
    desc: "Design and implement a premium, responsive webpage landing page within 3 hours. Showcase your CSS and layout expertise.",
    rules: "Max team size of 2. Raw HTML/CSS/JS only. No Tailwind or React framework. Templates must be designed live.",
    maxTeammates: 1, // Team of 2
    venue: "BCA Computer Center (Hall 4)",
    time: "10:00 AM - Oct 13, 2026",
    incharge: "Prof. M. David (+91 88877 66554)"
  },
  {
    id: "quiz",
    title: "MindSprint Tech Quiz",
    desc: "General IT, tech history, logic, and trivia. Fast-paced buzzer rounds for computer enthusiasts.",
    rules: "Team of 2. Written prelims followed by 6 stage rounds. Buzzer penalties apply for negative points.",
    maxTeammates: 1, // Team of 2
    venue: "Alumnae Seminar Hall (Hall 5)",
    time: "01:30 PM - Oct 13, 2026",
    incharge: "Dr. Sarah Paul (+91 77766 55443)"
  },
  {
    id: "treasurehunt",
    title: "CyberHunt: Cryptic Hunt",
    desc: "Solve puzzles, decode ciphers, and scour the campus for clues in this tech-themed treasure hunt.",
    rules: "Team of 3. Standard campus rules apply. Solve clues sequentially. Sharing answers results in disqualification.",
    maxTeammates: 2, // Team of 3
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
    closedEvents: [], // Specific closed fests
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
        const response = await fetch(`/api/database`);
        if (response.ok) {
          const serverDb = await response.json();
          
          // Auto-migrate schema properties if they do not exist
          if (!serverDb.users) serverDb.users = [];
          if (!serverDb.applications) serverDb.applications = [];
          if (!serverDb.emails) serverDb.emails = [];
          if (!serverDb.notifications) serverDb.notifications = [];
          if (!serverDb.scans) serverDb.scans = [];
          if (!serverDb.closedEvents) serverDb.closedEvents = [];
          if (!serverDb.settings) serverDb.settings = { adminPassword: "AdminPassword123" };
          if (!serverDb.events || serverDb.events.length === 0) serverDb.events = INITIAL_EVENTS;

          // Migrate existing events to include default rules and maxTeammates properties
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
      await fetch(`/api/database`, {
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

  // Real Email Dispatcher via backend Node server on port 5001
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
      const response = await fetch(`/api/send-email`, {
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
        // Save simulated log in database only on success
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

  // Stricter Anti-Fraud validations check
  const registerUser = (details) => {
    const bhcKeywords = ["bishop heber", "bhc", "bishop heber college", "heber", "bishopheber"];
    const lowerCollege = details.college.toLowerCase();
    const isBHC = bhcKeywords.some(keyword => lowerCollege.includes(keyword));

    if (isBHC) {
      addToast("Registration Rejected", "Only students from OTHER colleges are allowed to register for HeberSpectra 2026. Bishop Heber College students cannot participate.", true);
      return false;
    }

    // Email check
    if (db.users.find(u => u.email === details.email.toLowerCase())) {
      addToast("Registration Blocked", "This email address is already registered.", true);
      return false;
    }

    // ReNo check
    if (db.users.find(u => u.reno.toLowerCase() === details.reno.toLowerCase() && u.college.toLowerCase() === details.college.toLowerCase())) {
      addToast("Registration Blocked", `A student from "${details.college}" is already registered with Register Number: ${details.reno}.`, true);
      return false;
    }

    // Name + College combination check
    if (db.users.find(u => u.name.toLowerCase() === details.name.toLowerCase() && u.college.toLowerCase() === details.college.toLowerCase())) {
      addToast("Registration Blocked", `A student named "${details.name}" is already registered under "${details.college}".`, true);
      return false;
    }

    // Unique Student ID generation
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
      idPhoto: details.idPhoto || "/logo.png", // base64 photo
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

  // Login (Supports ID login)
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

  // Event Registration (Validated by Student IDs)
  const applyForEvent = (eventId, teamName, teammateIds, inputStudentId) => {
    if (!currentSession || currentSession.role !== "student") return false;
    const student = currentSession.details;

    if (db.registrationClosed || db.closedEvents.includes(eventId)) {
      addToast("Registration Locked", "Registrations for this event are closed.", true);
      return false;
    }

    // Validate applicant Student ID
    if (inputStudentId.trim().toUpperCase() !== student.studentId) {
      addToast("Student ID Mismatch", `Your entered ID does not match your profile ID (${student.studentId}).`, true);
      return false;
    }

    const formattedTeammates = teammateIds.map(id => id.trim().toUpperCase()).filter(id => id !== "");

    // Check duplicate input IDs
    if (formattedTeammates.includes(student.studentId) || new Set(formattedTeammates).size !== formattedTeammates.length) {
      addToast("Duplicate IDs Entered", "Do not enter duplicate student IDs in teammate slots.", true);
      return false;
    }

    // Helper: Count events applied for a student ID
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

    // Check primary limit
    if (getEventCount(student.studentId) >= 2) {
      addToast("Event Limit Exceeded", "You are already participating in 2 events.", true);
      return false;
    }

    // Validate teammates profiles
    for (const tmId of formattedTeammates) {
      const tmProfile = db.users.find(u => u.studentId === tmId);
      if (!tmProfile) {
        addToast("ID Not Found", `Teammate ID "${tmId}" is not signed up in the system.`, true);
        return false;
      }
      
      // Check college match
      if (tmProfile.college.toLowerCase() !== student.college.toLowerCase()) {
        addToast("College Mismatch", `Teammate "${tmProfile.name}" (${tmId}) belongs to "${tmProfile.college}", not "${student.college}".`, true);
        return false;
      }

      // Check event limit
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
      teammates: formattedTeammates, // Array of Student IDs
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

  // Approve payment
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

    // Email Student
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

    // Email Teammates (By IDs)
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

  // Gate Scan verification check-in
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

    // Leader event boundaries validation
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

    // Return the popup payload to component instead of immediate check-in
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

  // Complete attendance verification check-in
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

  // Toggle global lock by Admin
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

  // Toggle leader specific lock
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

  // Admin student deletion
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

  // Admin event creation
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

  // Admin event deletion
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

  // Admin announcements broadcast
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

  // Event Leader modification of specific event
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

export const useApp = () => useContext(AppContext);

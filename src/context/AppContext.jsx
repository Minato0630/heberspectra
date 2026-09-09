import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
    venue: "Computer Science Lab (Hall 3)",
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
    settings: {
      eventDate: "2026-10-12T09:00:00",
      registrationDeadline: "2026-10-11T23:59:59"
    }
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

  // Toast Notification helper
  const addToast = useCallback((title, message, isError = false) => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, title, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Authenticated API request helper with JWT header
  const authFetch = useCallback(async (url, options = {}) => {
    const token = sessionStorage.getItem("spectra_token");
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (res.status === 401) {
        // Token expired or invalid
        sessionStorage.removeItem("spectra_token");
        sessionStorage.removeItem("spectra_session");
        setCurrentSession(null);
        addToast("Session Expired", "Please sign in again to continue.", true);
      }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.error(`API error on ${url}:`, err);
      return { ok: false, status: 500, data: { error: { message: "Server connection failed." } } };
    }
  }, [addToast]);

  // Initial Public Data Fetch: Events & Countdown Settings
  const fetchPublicEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDb(prev => ({
            ...prev,
            events: data.events || INITIAL_EVENTS,
            registrationClosed: Boolean(data.registrationClosed),
            closedEvents: data.closedEvents || [],
            settings: data.settings || prev.settings
          }));
        }
      }
    } catch (err) {
      console.warn("Public events fetch failed:", err);
    }
  }, []);

  // Refresh Authenticated Role Data
  const refreshRoleData = useCallback(async (session = currentSession) => {
    if (!session) return;
    const token = sessionStorage.getItem("spectra_token");
    if (!token) return;

    if (session.role === 'student') {
      const res = await authFetch('/api/student/me');
      if (res.ok && res.data.success) {
        const { user, applications, notifications, scans, events, registrationClosed, closedEvents } = res.data;
        setCurrentSession(prev => ({ ...prev, details: user, name: user.name }));
        setDb(prev => ({
          ...prev,
          users: [user],
          applications: applications || [],
          notifications: notifications || [],
          scans: scans || [],
          events: events || prev.events,
          registrationClosed: Boolean(registrationClosed),
          closedEvents: closedEvents || prev.closedEvents
        }));
      }
    } else if (session.role === 'admin') {
      const res = await authFetch('/api/admin/dashboard');
      if (res.ok && res.data.success) {
        const { users, applications, events, registrationClosed, closedEvents, settings } = res.data;
        setDb(prev => ({
          ...prev,
          users: users || [],
          applications: applications || [],
          events: events || prev.events,
          registrationClosed: Boolean(registrationClosed),
          closedEvents: closedEvents || prev.closedEvents,
          settings: settings || prev.settings
        }));
      }
    } else if (session.role === 'leader') {
      const res = await authFetch('/api/leader/roster');
      if (res.ok && res.data.success) {
        const { applications, users, scans, closedEvents, isClosed } = res.data;
        setDb(prev => ({
          ...prev,
          applications: applications || [],
          users: users || [],
          scans: scans || [],
          closedEvents: closedEvents || prev.closedEvents,
          registrationClosed: Boolean(isClosed)
        }));
      }
    }
  }, [authFetch, currentSession]);

  useEffect(() => {
    fetchPublicEvents();
    if (currentSession) {
      refreshRoleData(currentSession);
    }
  }, []);

  // 1. Unified Login
  const loginUser = async (username, password, roleType) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: roleType })
      });
      const data = await res.json();

      if (data.success && data.token) {
        sessionStorage.setItem("spectra_token", data.token);
        const session = {
          role: roleType,
          details: data.user,
          name: data.user.name || username,
          eventId: data.user.eventId,
          adminRole: data.user.adminRole
        };
        sessionStorage.setItem("spectra_session", JSON.stringify(session));
        setCurrentSession(session);
        addToast("Welcome Back!", `Signed in successfully as ${session.name}.`);
        await refreshRoleData(session);
        return true;
      } else {
        const msg = data.error?.message || "Invalid credentials.";
        addToast("Login Failed", msg, true);
        return false;
      }
    } catch (e) {
      addToast("Network Error", "Could not connect to authentication server.", true);
      return false;
    }
  };

  // 2. Student Signup / Registration
  const registerUser = async (details) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });
      const data = await res.json();

      if (data.success) {
        addToast("Signup Successful!", data.message || "Account registered. You can now sign in.");
        return true;
      } else {
        const msg = data.error?.message || "Registration failed.";
        addToast("Registration Blocked", msg, true);
        return false;
      }
    } catch (e) {
      addToast("Network Error", "Registration submission failed.", true);
      return false;
    }
  };

  // 3. Logout
  const logoutUser = () => {
    sessionStorage.removeItem("spectra_token");
    sessionStorage.removeItem("spectra_session");
    setCurrentSession(null);
    addToast("Logged Out", "You have successfully signed out.");
  };

  // 4. Student Apply for Event (Enforced on Server)
  const applyForEvent = async (eventId, teamName, teammateIds, inputStudentId) => {
    const res = await authFetch('/api/student/apply', {
      method: 'POST',
      body: JSON.stringify({ eventId, teamName, teammateIds, inputStudentId })
    });

    if (res.ok && res.data.success) {
      addToast("Application Submitted!", "Please upload your payment reference to unlock passes.");
      await refreshRoleData();
      return true;
    } else {
      addToast("Application Error", res.data.error?.message || "Could not complete registration.", true);
      return false;
    }
  };

  // 5. Student Submit Payment
  const submitPayment = async (appId, txId, receiptImage = null) => {
    const res = await authFetch('/api/student/payment', {
      method: 'POST',
      body: JSON.stringify({ appId, txId, receiptImage })
    });

    if (res.ok && res.data.success) {
      addToast("Payment Logged", "Admin will verify your payment details and receipt shortly.");
      await refreshRoleData();
      return true;
    } else {
      addToast("Payment Error", res.data.error?.message || "Could not submit payment proof.", true);
      return false;
    }
  };

  // 6. Admin Approve Application
  const approveApplication = async (appId) => {
    const res = await authFetch(`/api/admin/applications/${appId}/approve`, {
      method: 'POST'
    });

    if (res.ok && res.data.success) {
      addToast("Application Approved!", "Passes generated and emails dispatched.");
      await refreshRoleData();
      return true;
    } else {
      addToast("Action Failed", res.data.error?.message || "Could not approve application.", true);
      return false;
    }
  };

  // 7. Admin Reject Application
  const rejectApplication = async (appId) => {
    const res = await authFetch(`/api/admin/applications/${appId}/reject`, {
      method: 'POST'
    });

    if (res.ok && res.data.success) {
      addToast("Application Rejected", "Sent notification to student.");
      await refreshRoleData();
      return true;
    } else {
      addToast("Action Failed", res.data.error?.message || "Could not reject application.", true);
      return false;
    }
  };

  // 8. Gate Scan Verification (Leader)
  const scanTicket = async (ticketCode) => {
    const res = await authFetch('/api/leader/scan', {
      method: 'POST',
      body: JSON.stringify({ ticketCode })
    });

    if (res.ok && res.data.success) {
      return res.data;
    } else {
      addToast("Scan Result", res.data.error?.message || "Invalid QR pass.", true);
      return null;
    }
  };

  // 9. Approve Scan Check-in (Leader)
  const approveScanCheckIn = async (scanData) => {
    const res = await authFetch('/api/leader/checkin', {
      method: 'POST',
      body: JSON.stringify(scanData)
    });

    if (res.ok && res.data.success) {
      addToast("Attendance Recorded", `Check-in approved for ${scanData.name}. Certificate unlocked.`);
      await refreshRoleData();
      return true;
    } else {
      addToast("Check-in Error", res.data.error?.message || "Could not record attendance.", true);
      return false;
    }
  };

  // 10. Leader Broadcast Start Alert
  const alertParticipants = async (eventId) => {
    const res = await authFetch('/api/leader/alert', {
      method: 'POST',
      body: JSON.stringify({ eventId })
    });

    if (res.ok && res.data.success) {
      addToast("Alerts Dispatched", res.data.message || "Notification sent to participants.");
      return true;
    } else {
      addToast("Broadcast Error", res.data.error?.message || "Could not send alert.", true);
      return false;
    }
  };

  // 11. Admin Update Schedule
  const updateSchedule = async (eventId, venue, time) => {
    const res = await authFetch('/api/admin/schedule', {
      method: 'POST',
      body: JSON.stringify({ eventId, venue, time })
    });

    if (res.ok && res.data.success) {
      addToast("Schedule Updated", "Event details updated successfully.");
      await refreshRoleData();
      return true;
    } else {
      addToast("Update Failed", res.data.error?.message || "Could not update schedule.", true);
      return false;
    }
  };

  // 12. Admin Toggle Global Lock
  const toggleRegistrationClosed = async () => {
    const res = await authFetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ toggleRegistrationClosed: 'toggle' })
    });

    if (res.ok && res.data.success) {
      const nextState = res.data.registrationClosed;
      setDb(prev => ({ ...prev, registrationClosed: nextState }));
      addToast(
        nextState ? "Registrations Locked" : "Registrations Opened",
        `Event signup portal is now ${nextState ? 'CLOSED globally' : 'OPEN'}.`
      );
      return true;
    } else {
      addToast("Setting Failed", res.data.error?.message || "Could not toggle lock.", true);
      return false;
    }
  };

  // 13. Leader Toggle Event Lock
  const toggleLeaderEventRegistration = async (eventId) => {
    const res = await authFetch('/api/leader/toggle-lock', {
      method: 'POST',
      body: JSON.stringify({ eventId })
    });

    if (res.ok && res.data.success) {
      setDb(prev => ({ ...prev, closedEvents: res.data.closedEvents }));
      addToast("Event Lock Updated", res.data.message);
      return true;
    } else {
      addToast("Action Failed", res.data.error?.message || "Could not toggle event lock.", true);
      return false;
    }
  };

  // 14. Admin Delete Student
  const deleteStudent = async (userId) => {
    const res = await authFetch(`/api/admin/students/${userId}`, {
      method: 'DELETE'
    });

    if (res.ok && res.data.success) {
      addToast("Student Removed", "Successfully deleted student account.");
      await refreshRoleData();
      return true;
    } else {
      addToast("Delete Failed", res.data.error?.message || "Could not delete student.", true);
      return false;
    }
  };

  // 15. Admin Add Event
  const addEvent = async (eventDetails) => {
    const res = await authFetch('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify(eventDetails)
    });

    if (res.ok && res.data.success) {
      addToast("Event Created", `Successfully added new event: ${eventDetails.title}`);
      await refreshRoleData();
      return true;
    } else {
      addToast("Creation Error", res.data.error?.message || "Could not add event.", true);
      return false;
    }
  };

  // 16. Admin Delete Event
  const deleteEvent = async (eventId) => {
    const res = await authFetch(`/api/admin/events/${eventId}`, {
      method: 'DELETE'
    });

    if (res.ok && res.data.success) {
      addToast("Event Deleted", `Successfully removed event ID: ${eventId}`);
      await refreshRoleData();
      return true;
    } else {
      addToast("Deletion Failed", res.data.error?.message || "Could not delete event.", true);
      return false;
    }
  };

  // 17. Admin Broadcast Announcement
  const broadcastAnnouncement = async (title, body) => {
    const res = await authFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, body })
    });

    if (res.ok && res.data.success) {
      addToast("Broadcast Dispatched", res.data.message || "Notification and emails sent.");
      return true;
    } else {
      addToast("Broadcast Failed", res.data.error?.message || "Could not send broadcast.", true);
      return false;
    }
  };

  // 18. Admin Countdown Settings Updater
  const updateCountdownSettings = async (eventDate, registrationDeadline) => {
    const res = await authFetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ eventDate, registrationDeadline })
    });

    if (res.ok && res.data.success) {
      setDb(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          eventDate,
          registrationDeadline
        }
      }));
      addToast("Countdown Updated", "Event kickoff and registration deadlines updated successfully.");
      return true;
    } else {
      addToast("Update Failed", res.data.error?.message || "Could not save countdown settings.", true);
      return false;
    }
  };

  // 19. Student Certificate Email Sender
  const sendCertificateEmail = async (toEmail, name, eventTitle, ticketId) => {
    const res = await authFetch('/api/student/send-cert-email', {
      method: 'POST',
      body: JSON.stringify({ eventTitle, ticketId })
    });

    if (res.ok && res.data.success) {
      addToast("Certificate Sent", `Official certificate dispatched to ${toEmail}`);
      return true;
    } else {
      addToast("Dispatch Failed", res.data.error?.message || "Could not send certificate email.", true);
      return false;
    }
  };

  // 20. Leader Update Event Details
  const updateEventDetails = async (eventId, details) => {
    const res = await authFetch('/api/leader/event', {
      method: 'PATCH',
      body: JSON.stringify(details)
    });

    if (res.ok && res.data.success) {
      addToast("Event Updated", "Your event details have been successfully modified.");
      await refreshRoleData();
      return true;
    } else {
      addToast("Update Failed", res.data.error?.message || "Could not update event details.", true);
      return false;
    }
  };

  // 21. QR Code Generator SVG/Image
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
      updateCountdownSettings,
      sendCertificateEmail,
      generateQR,
      addToast,
      removeToast,
      refreshRoleData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);


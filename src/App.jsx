import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './context/AppContext';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [studentTab, setStudentTab] = useState('student-profile');
  const [adminTab, setAdminTab] = useState('admin-stats');
  const [leaderTab, setLeaderTab] = useState('leader-participants');
  
  // Modal states
  const [paymentAppId, setPaymentAppId] = useState(null);
  const [paymentTxId, setPaymentTxId] = useState('');
  const [certData, setCertData] = useState(null);
  
  // Scan verify popup modal state
  const [scanVerifyData, setScanVerifyData] = useState(null);
  const [selectedVerifiedScanId, setSelectedVerifiedScanId] = useState('');

  // Admin New Event Form state
  const [newEventForm, setNewEventForm] = useState({
    id: '', title: '', desc: '', rules: '', maxTeammates: 0, venue: '', time: '', incharge: ''
  });

  // Admin Announcement Form state
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' });

  // Admin Schedule states
  const [scheduleEventId, setScheduleEventId] = useState('hackathon');
  const [scheduleVenue, setScheduleVenue] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Event Leader Edit Event Form state
  const [leaderEventForm, setLeaderEventForm] = useState({
    title: '', desc: '', rules: '', maxTeammates: 0, venue: '', time: '', incharge: ''
  });

  const scannerRef = useRef(null);

  const {
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
  } = useApp();

  const studentDetails = currentSession?.role === 'student'
    ? (db.users.find(u => u.id === currentSession.details.id) || currentSession.details)
    : null;

  // Reset page / auto restore page on session shifts or mounts
  useEffect(() => {
    if (!currentSession) {
      setCurrentPage('home');
    } else {
      // Auto restore page on page load/refresh
      if (currentPage === 'home' || currentPage === 'auth-page') {
        if (currentSession.role === 'student') {
          setCurrentPage('student-dashboard');
          setStudentTab('student-profile');
        } else if (currentSession.role === 'admin') {
          setCurrentPage('admin-dashboard');
          setAdminTab('admin-stats');
        } else if (currentSession.role === 'leader') {
          setCurrentPage('leader-dashboard');
          setLeaderTab('leader-participants');
        }
      }
    }
  }, [currentSession]);

  // Pre-populate Leader Edit Event form
  useEffect(() => {
    if (currentSession?.role === 'leader') {
      const ev = db.events.find(e => e.id === currentSession.eventId);
      if (ev) {
        setLeaderEventForm({
          title: ev.title,
          desc: ev.desc,
          rules: ev.rules,
          maxTeammates: ev.maxTeammates,
          venue: ev.venue,
          time: ev.time,
          incharge: ev.incharge
        });
      }
    }
  }, [currentSession, leaderTab, db.events]);

  // Submit Schedule Reschedule
  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    updateSchedule(scheduleEventId, scheduleVenue, scheduleTime);
    setScheduleVenue('');
    setScheduleTime('');
  };

  // Submit Leader Event Update
  const handleLeaderEventUpdateSubmit = (e) => {
    e.preventDefault();
    updateEventDetails(currentSession.eventId, leaderEventForm);
  };

  // Cleanup scanner on page shifts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [currentPage, leaderTab]);

  // Handle camera QR scanning
  const startCamera = () => {
    stopCamera();
    try {
      scannerRef.current = new window.Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 170, height: 170 },
        aspectRatio: 1.0
      });
      scannerRef.current.render(async (decodedText) => {
        const data = await scanTicket(decodedText);
        if (data) {
          setScanVerifyData(data); // Open student verification popup modal
        }
        stopCamera();
      }, (err) => {
        // Suppress frame read exceptions
      });
    } catch (e) {
      console.error("Camera scan start error:", e);
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
        .then(() => {
          scannerRef.current = null;
        })
        .catch(e => console.error("Camera release error:", e));
    }
  };

  // Perform PDF Exports using html2pdf.js
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

  // Signup Form states
  const [signupForm, setSignupForm] = useState({
    name: '', college: '', dept: '', phno: '', email: '', reno: '', password: '',
    food: 'veg', accom: 'no', idPhoto: '', staffName: '', staffFood: 'veg'
  });
  const [showSignupWarning, setShowSignupWarning] = useState(false);

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    const success = registerUser(signupForm);
    if (success) {
      setLoginEmail(signupForm.email);
      setAuthTab('login');
      setSignupForm({
        name: '', college: '', dept: '', phno: '', email: '', reno: '', password: '',
        food: 'veg', accom: 'no', idPhoto: '', staffName: '', staffFood: 'veg'
      });
    }
  };

  const handleIdCardUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1.2 * 1024 * 1024) {
        addToast("File Too Large", "Please upload an ID card photo under 1MB.", true);
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setSignupForm(prev => ({ ...prev, idPhoto: evt.target.result })); // Save Base64
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCollegeChange = (val) => {
    setSignupForm(prev => ({ ...prev, college: val }));
    const bhcKeywords = ["bishop heber", "bhc", "bishop heber college", "heber", "bishopheber"];
    const isBHC = bhcKeywords.some(keyword => val.toLowerCase().includes(keyword));
    setShowSignupWarning(isBHC);
  };

  // Login Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('student');
  const [authTab, setAuthTab] = useState('login');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const success = loginUser(loginEmail, loginPassword, loginRole);
    if (success) {
      setLoginPassword('');
      if (loginRole === 'student') {
        setCurrentPage('student-dashboard');
        setStudentTab('student-profile');
      } else if (loginRole === 'admin') {
        setCurrentPage('admin-dashboard');
        setAdminTab('admin-stats');
      } else if (loginRole === 'leader') {
        setCurrentPage('leader-dashboard');
        setLeaderTab('leader-participants');
      }
    }
  };

  // Event Application Form states
  const [selectedEventId, setSelectedEventId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [eventStudentId, setEventStudentId] = useState('');
  const [teammateIds, setTeammateIds] = useState([]);

  const handleEventSelectChange = (eventId) => {
    setSelectedEventId(eventId);
    const selectedEvent = db.events.find(e => e.id === eventId);
    if (selectedEvent && selectedEvent.maxTeammates > 0) {
      setTeammateIds(Array(selectedEvent.maxTeammates).fill(''));
    } else {
      setTeammateIds([]);
    }
  };

  const handleApplySubmit = (e) => {
    e.preventDefault();
    if (!selectedEventId) return;

    const success = applyForEvent(selectedEventId, teamName, teammateIds, eventStudentId);
    if (success) {
      setSelectedEventId('');
      setTeamName('');
      setEventStudentId('');
      setTeammateIds([]);
      setStudentTab('student-applied');
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    submitPayment(paymentAppId, paymentTxId);
    setPaymentAppId(null);
    setPaymentTxId('');
  };

  // Admin New Event Form Submit
  const handleCreateEventSubmit = (e) => {
    e.preventDefault();
    const success = addEvent(newEventForm);
    if (success) {
      setNewEventForm({
        id: '', title: '', desc: '', rules: '', maxTeammates: 0, venue: '', time: '', incharge: ''
      });
    }
  };

  // Admin Broadcast Announcement Submit
  const handleAnnouncementSubmit = (e) => {
    e.preventDefault();
    broadcastAnnouncement(announcementForm.title, announcementForm.body);
    setAnnouncementForm({ title: '', body: '' });
  };

  // Modal scanner check-in confirmation
  const handleScanCheckInConfirm = async () => {
    if (!scanVerifyData) return;
    const success = await approveScanCheckIn(scanVerifyData);
    if (success) {
      setScanVerifyData(null);
    }
  };

  // Home card quick register / redirect triggers
  const handleQuickRegister = (eventId) => {
    if (!currentSession) {
      addToast("Auth Required", "Please sign up or login as an external student to apply.", true);
      setLoginRole('student');
      setAuthTab('login');
      setCurrentPage('auth-page');
      return;
    }
    if (currentSession.role !== 'student') {
      addToast("Registration Restricted", "Only students can register for events.", true);
      return;
    }
    setCurrentPage('student-dashboard');
    setStudentTab('student-events');
    handleEventSelectChange(eventId);
  };

  // Render Pass card layouts
  const renderTicketHTML = (name, college, eventTitle, venue, time, ticketId, isAttended) => {
    const qrSVG = generateQR(ticketId);
    return (
      <div className="ticket">
        <div className="ticket-main">
          <div className="ticket-header">
            <div className="ticket-logo">
              <img src="/logo.png" alt="Spectra" />
              <span>HEBER SPECTRA 2026</span>
            </div>
            <span className={`ticket-status ${isAttended ? 'status-attended' : 'status-approved'}`}>{isAttended ? 'attended' : 'approved'}</span>
          </div>
          <div className="ticket-body">
            <div>
              <div className="ticket-label">Participant</div>
              <div className="ticket-value">{name}</div>
            </div>
            <div>
              <div className="ticket-label">College</div>
              <div className="ticket-value">{college}</div>
            </div>
            <div>
              <div className="ticket-label">Event</div>
              <div className="ticket-value">{eventTitle}</div>
            </div>
            <div>
              <div className="ticket-label">Venue</div>
              <div className="ticket-value">{venue}</div>
            </div>
            <div>
              <div className="ticket-label">Schedule</div>
              <div className="ticket-value" style={{ fontSize: '0.9rem' }}>{time}</div>
            </div>
            <div>
              <div className="ticket-label">Ticket ID</div>
              <div className="ticket-value" style={{ fontFamily: 'monospace', color: 'var(--secondary-glow)' }}>{ticketId}</div>
            </div>
          </div>
        </div>
        <div className="ticket-stub">
          <div className="qr-code-svg" dangerouslySetInnerHTML={{ __html: qrSVG }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Entry Pass QR</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Dynamic Toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.isError ? 'toast-error' : ''}`}>
            <div className="toast-header">
              <span>{toast.title}</span>
              <span className="toast-close" onClick={() => removeToast(toast.id)}>&times;</span>
            </div>
            <div className="toast-body">{toast.message}</div>
          </div>
        ))}
      </div>

      {/* Navbar Header */}
      <nav>
        <div className="nav-brand" onClick={() => setCurrentPage('home')}>
          <img src="/logo.png" alt="Spectra" />
          <span className="nav-title">HeberSpectra '26</span>
        </div>
        
        <div className="nav-links">
          <span className={`nav-item ${currentPage === 'home' ? 'active' : ''}`} onClick={() => setCurrentPage('home')}>Catalog</span>
          {currentSession?.role === 'student' && (
            <span className={`nav-item ${currentPage === 'student-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('student-dashboard')}>My Portal</span>
          )}
          {currentSession?.role === 'admin' && (
            <span className={`nav-item ${currentPage === 'admin-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('admin-dashboard')}>Admin Panel</span>
          )}
          {currentSession?.role === 'leader' && (
            <span className={`nav-item ${currentPage === 'leader-dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('leader-dashboard')}>Leader Panel</span>
          )}
        </div>

        <div>
          {currentSession ? (
            <button className="nav-btn" onClick={logoutUser}>Logout ({currentSession.name})</button>
          ) : (
            <button className="nav-btn" onClick={() => setCurrentPage('auth-page')}>Student/Admin Sign In</button>
          )}
        </div>
      </nav>

      {/* Dynamic Views Router */}
      <div style={{ flex: 1 }}>

        {/* 1. HOME CATALOG (Prize details removed, Rules & Team size added) */}
        {currentPage === 'home' && (
          <main className="page-section">
            <div className="hero">
              <div className="hero-subtitle">BISHOP HEBER COLLEGE (AUTONOMOUS) PRESENTS</div>
              <div className="hero-title">HEBER SPECTRA 2026</div>
              <p className="hero-desc">
                Welcome to the annual Inter-Collegiate Cultural and Technical Fest conducted by Bishop Heber College, Tiruchirappalli. 
                Unleash your creativity, coding prowess, and marketing brilliance in a series of highly competitive technical challenges.
              </p>
              
              <div className="btn-container">
                <button className="btn-primary" onClick={() => setCurrentPage('auth-page')}>Register Now</button>
                <a href="#events-catalog" className="btn-secondary" style={{ textDecoration: 'none', lineHeight: '2.4', display: 'inline-block' }}>Explore Events</a>
              </div>

              <div className="hero-info-grid">
                <div className="hero-info-card">
                  <h4>Institution</h4>
                  <p>Bishop Heber College</p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tiruchirappalli</span>
                </div>
                <div className="hero-info-card">
                  <h4>Fest Date</h4>
                  <p>October 12 & 13</p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2026</span>
                </div>
                <div className="hero-info-card">
                  <h4>Eligibility</h4>
                  <p>Other Colleges Only</p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>BHC Students Excluded</span>
                </div>
              </div>
            </div>

            <div className="section-header" id="events-catalog">
              <h2>Festival Event Catalog</h2>
              <p>Select your arenas and challenge the best minds. (Each student can apply for up to 2 events maximum)</p>
              {db.registrationClosed && (
                <div className="error-text" style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '10px' }}>
                  ⚠️ REGISTRATIONS CLOSED: Organizers have closed event registrations globally.
                </div>
              )}
            </div>

            <div className="event-grid">
              {db.events.map(ev => {
                const isLocked = db.registrationClosed || db.closedEvents.includes(ev.id);
                const maxTeammatesCount = ev.maxTeammates;
                const teamSizeText = maxTeammatesCount > 0 ? `Team of 1 to ${maxTeammatesCount + 1} members` : "Individual (1 member)";
                return (
                  <div key={ev.id} className="event-card" style={isLocked ? { borderColor: '#ff3333', opacity: 0.85 } : {}}>
                    <div>
                      <span className="event-badge">{ev.venue}</span>
                      {isLocked && <span className="event-badge" style={{ backgroundColor: '#ff3333', marginLeft: '10px' }}>CLOSED</span>}
                      <h3 className="event-title">{ev.title}</h3>
                      <p className="event-desc">{ev.desc}</p>
                      <div style={{ marginTop: '15px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <strong style={{ color: 'var(--secondary-glow)', display: 'block', marginBottom: '4px' }}>Rules & guidelines:</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>{ev.rules}</span>
                      </div>
                    </div>
                    <div>
                      <div className="event-meta" style={{ gridTemplateColumns: '1fr', gap: '6px' }}>
                        <div className="meta-item">
                          <strong>Event Schedule</strong>
                          <span>{ev.time}</span>
                        </div>
                        <div className="meta-item">
                          <strong>Team Strength</strong>
                          <span>{teamSizeText}</span>
                        </div>
                        <div className="meta-item">
                          <strong>Event Incharge</strong>
                          <span>{ev.incharge}</span>
                        </div>
                      </div>
                      <button className="btn-primary" disabled={isLocked} style={isLocked ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#ff3333' } : {}} onClick={() => handleQuickRegister(ev.id)}>
                        {isLocked ? "Closed" : "Apply Now"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        )}

        {/* 2. AUTH PAGE (Login & signup with Base64 FileReader uploader) */}
        {currentPage === 'auth-page' && (
          <section className="page-section">
            <div className="section-header">
              <h2>Access Control Terminal</h2>
              <p>Sign up to participate or sign in to access your dashboard panel</p>
            </div>

            <div className="auth-container">
              <div className="auth-tabs">
                <div className={`auth-tab ${authTab === 'login' ? 'active' : ''}`} onClick={() => setAuthTab('login')}>Login</div>
                <div className={`auth-tab ${authTab === 'signup' ? 'active' : ''}`} onClick={() => setAuthTab('signup')}>Register (Other Colleges Only)</div>
              </div>

              {authTab === 'login' ? (
                <form className="auth-form" onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label>Identify Your Role</label>
                    <select className="form-control" value={loginRole} onChange={(e) => setLoginRole(e.target.value)}>
                      <option value="student">External College Student</option>
                      <option value="admin">College Admin (President/VP/Manager)</option>
                      <option value="leader">Event Leader (e.g. leader_hackathon)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email / Student ID / Role Username</label>
                    <input type="text" className="form-control" placeholder="john@student.com, BHC-STU-1001 or president" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" className="form-control" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                    <span className="form-info-msg">Default Admin: AdminPassword123 | Default Leader: leader</span>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>Sign In</button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleSignupSubmit}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" className="form-control" placeholder="John Doe" value={signupForm.name} onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>College Name</label>
                    <input type="text" className="form-control" placeholder="St. Joseph's College" value={signupForm.college} onChange={(e) => handleCollegeChange(e.target.value)} required />
                    {showSignupWarning && (
                      <span className="form-info-msg error-text" style={{ fontWeight: 'bold' }}>
                        ⚠️ Bishop Heber College students cannot register. This form is restricted to other colleges.
                      </span>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Department</label>
                      <input type="text" className="form-control" placeholder="Computer Science" value={signupForm.dept} onChange={(e) => setSignupForm(prev => ({ ...prev, dept: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Register Number (ReNo)</label>
                      <input type="text" className="form-control" placeholder="24CA101" value={signupForm.reno} onChange={(e) => setSignupForm(prev => ({ ...prev, reno: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input type="tel" className="form-control" placeholder="9876543210" value={signupForm.phno} onChange={(e) => setSignupForm(prev => ({ ...prev, phno: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input type="email" className="form-control" placeholder="john@student.com" value={signupForm.email} onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Create Account Password</label>
                    <input type="password" className="form-control" placeholder="Min 6 characters" value={signupForm.password} onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Upload College ID Card (Used for Verification Scanner)</label>
                    <input type="file" className="form-control" accept="image/*" onChange={handleIdCardUpload} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Food Preference</label>
                      <select className="form-control" value={signupForm.food} onChange={(e) => setSignupForm(prev => ({ ...prev, food: e.target.value }))}>
                        <option value="veg">Vegetarian (Veg)</option>
                        <option value="nonveg">Non-Vegetarian (Non-Veg)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Accommodation Required?</label>
                      <select className="form-control" value={signupForm.accom} onChange={(e) => setSignupForm(prev => ({ ...prev, accom: e.target.value }))}>
                        <option value="no">No, Not Required</option>
                        <option value="yes">Yes, Need Accommodation</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: '20px', paddingTop: '15px' }}>
                    <h4 style={{ marginBottom: '10px', fontSize: '0.95rem', color: 'var(--secondary-glow)' }}>Accompanying Faculty Incharge Details (Optional)</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Staff Full Name</label>
                        <input type="text" className="form-control" placeholder="Dr. Jane Smith" value={signupForm.staffName} onChange={(e) => setSignupForm(prev => ({ ...prev, staffName: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Staff Food Choice</label>
                        <select className="form-control" value={signupForm.staffFood} onChange={(e) => setSignupForm(prev => ({ ...prev, staffFood: e.target.value }))}>
                          <option value="veg">Vegetarian (Veg)</option>
                          <option value="nonveg">Non-Vegetarian (Non-Veg)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '15px' }}>Register Account</button>
                </form>
              )}
            </div>
          </section>
        )}

        {/* 3. STUDENT DASHBOARD */}
        {currentPage === 'student-dashboard' && currentSession?.role === 'student' && (
          <section className="page-section">
            <div className="section-header">
              <h2>Student Participant Dashboard</h2>
              <p>Manage your fests, payments, download passes, and certificates</p>
            </div>
            
            <div className="dashboard-grid">
              <div className="sidebar">
                <div className="sidebar-title">Student Panel</div>
                <div className={`sidebar-item ${studentTab === 'student-profile' ? 'active' : ''}`} onClick={() => setStudentTab('student-profile')}>My Profile</div>
                <div className={`sidebar-item ${studentTab === 'student-events' ? 'active' : ''}`} onClick={() => setStudentTab('student-events')}>Event Registration</div>
                <div className={`sidebar-item ${studentTab === 'student-applied' ? 'active' : ''}`} onClick={() => setStudentTab('student-applied')}>Applied Events</div>
                <div className={`sidebar-item ${studentTab === 'student-passes' ? 'active' : ''}`} onClick={() => setStudentTab('student-passes')}>Download Entry Passes</div>
                <div className={`sidebar-item ${studentTab === 'student-certs' ? 'active' : ''}`} onClick={() => setStudentTab('student-certs')}>My Certificates</div>
                <div className={`sidebar-item ${studentTab === 'student-inbox' ? 'active' : ''}`} onClick={() => setStudentTab('student-inbox')}>Realtime Notifications</div>
              </div>

              <div className="dashboard-content">
                {/* Profile tab */}
                {studentTab === 'student-profile' && (
                  <div>
                    <h3>Participant Profile Summary</h3>
                    <hr style={{ border: '1px solid rgba(255,255,255,0.05)', margin: '15px 0' }} />
                    <div className="hero-info-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '10px', textAlign: 'left' }}>
                      <div className="info-box"><strong>Unique Student ID:</strong> <span style={{ color: 'var(--secondary-glow)', fontFamily: 'monospace', fontWeight: '800' }}>{studentDetails.studentId}</span></div>
                      <div className="info-box"><strong>Name:</strong> <span>{studentDetails.name}</span></div>
                      <div className="info-box"><strong>College:</strong> <span>{studentDetails.college}</span></div>
                      <div className="info-box"><strong>Department:</strong> <span>{studentDetails.dept}</span></div>
                      <div className="info-box"><strong>Register No (ReNo):</strong> <span>{studentDetails.reno}</span></div>
                      <div className="info-box"><strong>Phone Number:</strong> <span>{studentDetails.phno}</span></div>
                      <div className="info-box"><strong>Email:</strong> <span>{studentDetails.email}</span></div>
                      <div className="info-box"><strong>Food Accommodation:</strong> <span>{studentDetails.food === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}</span> | Accom: <span>{studentDetails.accom === 'yes' ? 'Yes' : 'No'}</span></div>
                      <div className="info-box"><strong>Accompanying Staff:</strong> <span>{studentDetails.staff ? `${studentDetails.staff.name} (${studentDetails.staff.food === 'veg' ? 'Veg' : 'Non-Veg'})` : 'None'}</span></div>
                    </div>
                    <div className="info-box" style={{ marginTop: '20px' }}>
                      <h4>Your Uploaded ID Card / Photo:</h4>
                      <div style={{ marginTop: '10px', border: '1px solid var(--border-glow)', padding: '10px', display: 'inline-block', borderRadius: '10px', background: 'rgba(0,0,0,0.3)' }}>
                        <img src={studentDetails.idPhoto} alt="No ID Uploaded" style={{ maxHeight: '160px', borderRadius: '5px' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Event Register tab (Validate student IDs) */}
                {studentTab === 'student-events' && (
                  <div>
                    <h3>Event Signup Terminal</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Apply using Unique Student IDs. Teammates must belong to the same college.</p>
                    
                    {db.registrationClosed && (
                      <div className="error-text" style={{ fontWeight: 'bold', marginBottom: '15px' }}>
                        ⚠️ REGISTRATIONS CLOSED: Event registrations have been officially closed globally.
                      </div>
                    )}

                    <form onSubmit={handleApplySubmit}>
                      <div className="form-group">
                        <label>Select Festival Event</label>
                        <select className="form-control" value={selectedEventId} onChange={(e) => handleEventSelectChange(e.target.value)} required>
                          <option value="">-- Choose an Event --</option>
                          {db.events.map(ev => {
                            const isLocked = db.registrationClosed || db.closedEvents.includes(ev.id);
                            const isReg = db.applications.some(app => app.studentId === studentDetails.id && app.eventId === ev.id);
                            return (
                              <option key={ev.id} value={ev.id} disabled={isReg || isLocked}>
                                {ev.title} {isReg ? '(Applied)' : isLocked ? '(Closed)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Confirm Your Unique Student ID (e.g. BHC-STU-1001)</label>
                        <input type="text" className="form-control" placeholder="BHC-STU-XXXX" value={eventStudentId} onChange={(e) => setEventStudentId(e.target.value)} required />
                      </div>

                      {selectedEventId && db.events.find(e => e.id === selectedEventId)?.maxTeammates > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px dashed var(--border-glow)' }}>
                          <h4 style={{ marginBottom: '15px', color: 'var(--secondary-glow)' }}>Multi-User Team Registration (By Student IDs)</h4>
                          <div className="form-group">
                            <label>Team Name</label>
                            <input type="text" className="form-control" placeholder="e.g. CodeWarriors" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                          </div>
                          {teammateIds.map((id, index) => (
                            <div key={index} className="form-group">
                              <label>Teammate {index + 1} Unique Student ID (e.g. BHC-STU-1002)</label>
                              <input type="text" className="form-control" placeholder="BHC-STU-XXXX (Optional)" value={id} onChange={(e) => {
                                const newIds = [...teammateIds];
                                newIds[index] = e.target.value;
                                setTeammateIds(newIds);
                              }} />
                            </div>
                          ))}
                        </div>
                      )}

                      <button type="submit" className="btn-primary" disabled={db.registrationClosed} style={db.registrationClosed ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>Submit Application</button>
                    </form>
                  </div>
                )}

                {/* Applied Events tab */}
                {studentTab === 'student-applied' && (
                  <div>
                    <h3>Your Event Applications</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Verification pending payment approvals. Click 'Payment Details' to upload your payment reference.</p>
                    
                    {db.applications.filter(a => a.studentId === studentDetails.id).length === 0 ? (
                      <div className="info-box"><p>You haven't registered for any events yet. Max limit is 2 events.</p></div>
                    ) : (
                      db.applications.filter(a => a.studentId === studentDetails.id).map(app => {
                        const eventDetails = db.events.find(e => e.id === app.eventId);
                        if (!eventDetails) return null;
                        
                        const teammatesText = app.teammates.map(tmId => {
                          const tmProfile = db.users.find(u => u.studentId === tmId);
                          return tmProfile ? `${tmProfile.name} (${tmId})` : tmId;
                        });

                        return (
                          <div key={app.id} className="info-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ color: 'var(--secondary-glow)' }}>{eventDetails.title}</h4>
                              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Venue: {eventDetails.venue} | {eventDetails.time}</p>
                              <p style={{ fontSize: '0.85rem', marginTop: '5px' }}>Teammates: {teammatesText.length > 0 ? teammatesText.join(", ") : "None (Individual)"}</p>
                              <p style={{ fontSize: '0.85rem' }}>Payment status: <span className={`ticket-status ${app.status === 'approved' ? 'status-approved' : app.status === 'attended' ? 'status-attended' : 'status-pending'}`}>{app.status}</span></p>
                            </div>
                            <div>
                              {app.status === 'pending' ? (
                                <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 15px' }} onClick={() => setPaymentAppId(app.id)}>Payment Details</button>
                              ) : (
                                <span style={{ color: '#00ff88', fontWeight: '700' }}>✓ Approved</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Tickets Passes tab */}
                {studentTab === 'student-passes' && (
                  <div>
                    <h3>Individual Entry Passes</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '25px' }}>Entry passes are generated individually for you and your teammates. Present these QR codes at the venue door scanner.</p>
                    
                    <div className="ticket-container">
                      {db.applications.filter(a => a.studentId === studentDetails.id && (a.status === 'approved' || a.status === 'attended')).length === 0 ? (
                        <div className="info-box"><p>Entry Passes will be generated once your registrations are approved by the coordinators.</p></div>
                      ) : (
                        db.applications.filter(a => a.studentId === studentDetails.id && (a.status === 'approved' || a.status === 'attended')).map(app => {
                          const eventDetails = db.events.find(e => e.id === app.eventId);
                          if (!eventDetails) return null;
                          const primaryTicketId = `${app.id}_primary`;
                          
                          return (
                            <React.Fragment key={app.id}>
                              {/* Primary ticket */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                <div id={`ticket-card-${primaryTicketId}`}>
                                  {renderTicketHTML(studentDetails.name, studentDetails.college, eventDetails.title, eventDetails.venue, eventDetails.time, primaryTicketId, app.status === 'attended')}
                                </div>
                                <button className="btn-primary" style={{ alignSelf: 'flex-start', fontSize: '0.85rem', padding: '6px 15px', marginTop: '5px' }} onClick={() => downloadTicketPDF(primaryTicketId, studentDetails.name)}>Download Ticket Pass PDF</button>
                              </div>

                              {/* Teammates tickets */}
                              {app.teammates.map((tmId, idx) => {
                                const tmProfile = db.users.find(u => u.studentId === tmId);
                                const tmName = tmProfile ? tmProfile.name : "Teammate";
                                const tmTicketId = `${app.id}_team_${idx}`;
                                const isTMAttended = db.scans.some(s => s.ticketId === tmTicketId);
                                return (
                                  <div key={tmTicketId} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                                    <div id={`ticket-card-${tmTicketId}`}>
                                      {renderTicketHTML(tmName, studentDetails.college, eventDetails.title, eventDetails.venue, eventDetails.time, tmTicketId, isTMAttended)}
                                    </div>
                                    <button className="btn-primary" style={{ alignSelf: 'flex-start', fontSize: '0.85rem', padding: '6px 15px', marginTop: '5px' }} onClick={() => downloadTicketPDF(tmTicketId, tmName)}>Download Ticket Pass PDF</button>
                                  </div>
                                );
                              })}
                              <hr style={{ border: '1px solid rgba(255, 255, 255, 0.05)', margin: '20px 0' }} />
                            </React.Fragment>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Certificates tab */}
                {studentTab === 'student-certs' && (
                  <div>
                    <h3>Certificates of Participation</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '25px' }}>Once you attend the venue and the event leader scans your pass, your certificate is instantly unlocked below.</p>
                    
                    {db.applications.filter(a => a.studentId === studentDetails.id && (a.status === 'attended' || db.scans.some(s => s.ticketId.startsWith(a.id)))).length === 0 ? (
                      <div className="info-box"><p>Certificates will be unlocked after you attend the event and scan your entry passes.</p></div>
                    ) : (
                      db.applications.filter(a => a.studentId === studentDetails.id).map(app => {
                        const eventDetails = db.events.find(e => e.id === app.eventId);
                        if (!eventDetails) return null;
                        const primaryTicketId = `${app.id}_primary`;
                        const isPrimaryScanned = db.scans.some(s => s.ticketId === primaryTicketId);
                        
                        return (
                          <div key={app.id}>
                            {isPrimaryScanned && (
                              <div className="info-box" style={{ borderLeft: '4px solid var(--secondary-glow)' }}>
                                <h4>{studentDetails.name} - Certificate of Participation</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Event: {eventDetails.title}</p>
                                <button className="btn-primary" onClick={() => setCertData({ name: studentDetails.name, event: eventDetails.title, ticketId: primaryTicketId })}>Open Certificate Viewer</button>
                              </div>
                            )}
                            {app.teammates.map((tmId, idx) => {
                              const tmTicketId = `${app.id}_team_${idx}`;
                              const isTMScanned = db.scans.some(s => s.ticketId === tmTicketId);
                              if (isTMScanned) {
                                const tmProfile = db.users.find(u => u.studentId === tmId);
                                const tmName = tmProfile ? tmProfile.name : "Teammate";
                                return (
                                  <div key={tmTicketId} className="info-box" style={{ borderLeft: '4px solid var(--secondary-glow)', marginTop: '15px' }}>
                                    <h4>{tmName} - Certificate of Participation</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Event: {eventDetails.title}</p>
                                    <button className="btn-primary" onClick={() => setCertData({ name: tmName, event: eventDetails.title, ticketId: tmTicketId })}>Open Certificate Viewer</button>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Notifications & Emails tab */}
                {studentTab === 'student-inbox' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                    <div>
                      <h3>Real-Time Festival Alerts</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>Broadcast alerts sent from coordinators.</p>
                      
                      <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                        {db.notifications.filter(n => n.userId === studentDetails.id).length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)' }}>No notifications yet.</p>
                        ) : (
                          db.notifications.filter(n => n.userId === studentDetails.id).reverse().map(n => (
                            <div key={n.id} className="info-box" style={{ marginBottom: '10px', borderLeft: '3px solid var(--primary-glow)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <strong>{n.title}</strong>
                                <span>{n.date} {n.timestamp}</span>
                              </div>
                              <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3>Simulated Email Inbox</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>Real-time email logs dispatched to inbox.</p>
                      
                      <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                        {db.emails.filter(e => e.to === studentDetails.email).length === 0 ? (
                          <p style={{ color: 'var(--text-secondary)' }}>Your inbox is empty.</p>
                        ) : (
                          db.emails.filter(e => e.to === studentDetails.email).reverse().map(e => (
                            <div key={e.id} className="email-log-item">
                              <div className="email-log-header">
                                <span>To: {e.to}</span>
                                <span>{e.timestamp}</span>
                              </div>
                              <div className="email-log-title">{e.subject}</div>
                              <div className="email-log-body">{e.body}</div>
                              {e.attachment && (
                                <div style={{ marginTop: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary-glow)' }}>
                                  <span>📎 Attachment:</span>
                                  <strong style={{ textDecoration: 'underline' }}>{e.attachment}</strong>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 4. ADMIN DASHBOARD (Manage Students, Manage Events, Broadcast added, SMTP form removed) */}
        {currentPage === 'admin-dashboard' && currentSession?.role === 'admin' && (
          <section className="page-section">
            <div className="section-header">
              <h2>College Coordinator Control Panel ({currentSession.name})</h2>
              <p>Track metrics, approve registrations, verify payment screenshot records, and organize events</p>
            </div>

            <div className="dashboard-grid">
              <div className="sidebar">
                <div className="sidebar-title">Admin Panel</div>
                <div className={`sidebar-item ${adminTab === 'admin-stats' ? 'active' : ''}`} onClick={() => setAdminTab('admin-stats')}>Overall Statistics</div>
                <div className={`sidebar-item ${adminTab === 'admin-approvals' ? 'active' : ''}`} onClick={() => setAdminTab('admin-approvals')}>Registration Approvals</div>
                <div className={`sidebar-item ${adminTab === 'admin-students' ? 'active' : ''}`} onClick={() => setAdminTab('admin-students')}>Manage Students</div>
                <div className={`sidebar-item ${adminTab === 'admin-events' ? 'active' : ''}`} onClick={() => setAdminTab('admin-events')}>Manage Events</div>
                <div className={`sidebar-item ${adminTab === 'admin-announcements' ? 'active' : ''}`} onClick={() => setAdminTab('admin-announcements')}>Broadcast Announcement</div>
                <div className={`sidebar-item ${adminTab === 'admin-schedule' ? 'active' : ''}`} onClick={() => setAdminTab('admin-schedule')}>Coordinate Venues</div>
                <div className={`sidebar-item ${adminTab === 'admin-settings' ? 'active' : ''}`} onClick={() => setAdminTab('admin-settings')}>Fest Settings</div>
              </div>

              <div className="dashboard-content">
                {/* Stats tab */}
                {adminTab === 'admin-stats' && (
                  <div>
                    <h3>Event Overview Metrics</h3>
                    <hr style={{ border: '1px solid rgba(255,255,255,0.05)', margin: '15px 0' }} />
                    
                    <div className="stats-grid">
                      <div className="stats-card highlight-blue">
                        <span className="stats-label">Registered Students</span>
                        <div className="stats-value">{db.users.length}</div>
                      </div>
                      <div className="stats-card">
                        <span className="stats-label">Total Applications</span>
                        <div className="stats-value">{db.applications.length}</div>
                      </div>
                      <div className="stats-card highlight">
                        <span className="stats-label">Approved Teams</span>
                        <div className="stats-value">{db.applications.filter(a => a.status === 'approved' || a.status === 'attended').length}</div>
                      </div>
                      <div className="stats-card">
                        <span className="stats-label">Accommodations Needed</span>
                        <div className="stats-value">{db.users.filter(u => u.accom === 'yes').length}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '30px' }}>
                      <div>
                        <h3>Catering Food Requirements</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>Detailed veg and non-veg counts for students & accompanying staff.</p>
                        
                        <div className="table-responsive">
                          <table>
                            <thead>
                              <tr>
                                <th>Category</th>
                                <th>Vegetarian (Veg)</th>
                                <th>Non-Vegetarian (Non-Veg)</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td><strong>Students</strong></td>
                                <td>{db.users.filter(u => u.food === 'veg').length}</td>
                                <td>{db.users.filter(u => u.food === 'nonveg').length}</td>
                                <td>{db.users.length}</td>
                              </tr>
                              <tr>
                                <td><strong>Staff</strong></td>
                                <td>{db.users.filter(u => u.staff?.food === 'veg').length}</td>
                                <td>{db.users.filter(u => u.staff?.food === 'nonveg').length}</td>
                                <td>{db.users.filter(u => u.staff).length}</td>
                              </tr>
                              <tr style={{ background: 'rgba(255, 0, 85, 0.1)' }}>
                                <td><strong>Grand Total</strong></td>
                                <td><strong>{db.users.filter(u => u.food === 'veg').length + db.users.filter(u => u.staff?.food === 'veg').length}</strong></td>
                                <td><strong>{db.users.filter(u => u.food === 'nonveg').length + db.users.filter(u => u.staff?.food === 'nonveg').length}</strong></td>
                                <td><strong>{db.users.length + db.users.filter(u => u.staff).length}</strong></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h3>College Registrations breakdown</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>Participating college listings and student strengths.</p>
                        
                        <div className="table-responsive">
                          {db.users.length === 0 ? (
                            <p>No college registrations yet.</p>
                          ) : (
                            <table>
                              <thead>
                                <tr>
                                  <th>College Name</th>
                                  <th>Registered Students</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(db.users.reduce((acc, curr) => {
                                  acc[curr.college] = (acc[curr.college] || 0) + 1;
                                  return acc;
                                }, {})).map(([college, count]) => (
                                  <tr key={college}>
                                    <td>{college}</td>
                                    <td><strong>{count}</strong></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Approvals tab */}
                {adminTab === 'admin-approvals' && (
                  <div>
                    <h3>Pending Registration Approvals</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>Verify payment screenshots before approving entry passes.</p>
                    
                    <div className="table-responsive">
                      {db.applications.filter(a => a.status === 'pending').length === 0 ? (
                        <p style={{ padding: '15px', color: 'var(--text-secondary)' }}>All event applications are fully processed! No pending items.</p>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Student Details</th>
                              <th>College</th>
                              <th>Event Requested</th>
                              <th>Payment Proof</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {db.applications.filter(a => a.status === 'pending').map(app => {
                              const student = db.users.find(u => u.id === app.studentId);
                              const eventDetails = db.events.find(e => e.id === app.eventId);
                              if (!student || !eventDetails) return null;
                              return (
                                <tr key={app.id}>
                                  <td>
                                    <strong>{student.name}</strong> ({student.studentId})<br />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{student.email} | {student.phno}</span>
                                  </td>
                                  <td>{student.college}</td>
                                  <td>
                                    <strong>{eventDetails.title}</strong><br />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Team: {app.teamName} ({app.teammates.length + 1} members)</span>
                                  </td>
                                  <td>
                                    {app.payment ? (
                                      <>
                                        <span style={{ color: '#00ff88', fontSize: '0.85rem' }}>TxID: {app.payment.txId}</span><br />
                                        <span style={{ fontSize: '0.75rem', textDecoration: 'underline', color: 'var(--secondary-glow)', cursor: 'pointer' }} onClick={() => alert(`[Mock Payment Gateway View]\nTransaction ID: ${app.payment.txId}\nStatus: Verified\nReceipt: receipt_screenshot.png`)}>View Screenshot</span>
                                      </>
                                    ) : (
                                      <span style={{ color: '#ffaa00', fontSize: '0.85rem' }}>No payment uploaded</span>
                                    )}
                                  </td>
                                  <td>
                                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => approveApplication(app.id)}>Approve</button>
                                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem', marginLeft: '5px', borderColor: 'var(--primary-glow)', color: 'var(--primary-glow)' }} onClick={() => rejectApplication(app.id)}>Reject</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Manage Students tab (NEW) */}
                {adminTab === 'admin-students' && (
                  <div>
                    <h3>Registered Students Directory</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>View and manage student profiles. Deleting a student removes their user account and event registration records.</p>
                    
                    <div className="table-responsive">
                      {db.users.length === 0 ? (
                        <p style={{ padding: '15px', color: 'var(--text-secondary)' }}>No registered students inside the database.</p>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Student ID</th>
                              <th>Name</th>
                              <th>College</th>
                              <th>Register No</th>
                              <th>Email & Phone</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {db.users.map(u => (
                              <tr key={u.id}>
                                <td><strong style={{ color: 'var(--secondary-glow)', fontFamily: 'monospace' }}>{u.studentId}</strong></td>
                                <td><strong>{u.name}</strong></td>
                                <td>{u.college}</td>
                                <td>{u.reno}</td>
                                <td><span style={{ fontSize: '0.8rem' }}>{u.email}<br />{u.phno}</span></td>
                                <td>
                                  <button className="btn-secondary" style={{ borderColor: '#ff3333', color: '#ff3333', fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => { if(confirm("Delete this student profile?")) deleteStudent(u.id); }}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Manage Events tab (NEW) */}
                {adminTab === 'admin-events' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '35px' }}>
                      <div>
                        <h3>Add New Event</h3>
                        <form onSubmit={handleCreateEventSubmit} style={{ marginTop: '15px' }}>
                          <div className="form-group">
                            <label>Unique Event ID</label>
                            <input type="text" className="form-control" placeholder="e.g. coding" value={newEventForm.id} onChange={(e) => setNewEventForm(prev => ({ ...prev, id: e.target.value }))} required />
                          </div>
                          <div className="form-group">
                            <label>Event Title</label>
                            <input type="text" className="form-control" placeholder="e.g. Code Debugging" value={newEventForm.title} onChange={(e) => setNewEventForm(prev => ({ ...prev, title: e.target.value }))} required />
                          </div>
                          <div className="form-group">
                            <label>Description</label>
                            <textarea className="form-control" placeholder="Event details..." value={newEventForm.desc} onChange={(e) => setNewEventForm(prev => ({ ...prev, desc: e.target.value }))} required style={{ height: '65px' }} />
                          </div>
                          <div className="form-group">
                            <label>Rules</label>
                            <textarea className="form-control" placeholder="Event guidelines..." value={newEventForm.rules} onChange={(e) => setNewEventForm(prev => ({ ...prev, rules: e.target.value }))} required style={{ height: '65px' }} />
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Max Teammates</label>
                              <input type="number" className="form-control" min="0" max="6" value={newEventForm.maxTeammates} onChange={(e) => setNewEventForm(prev => ({ ...prev, maxTeammates: parseInt(e.target.value) || 0 }))} required />
                            </div>
                            <div className="form-group">
                              <label>Venue Hall</label>
                              <input type="text" className="form-control" placeholder="Ramanujan Hall" value={newEventForm.venue} onChange={(e) => setNewEventForm(prev => ({ ...prev, venue: e.target.value }))} required />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Schedule Time</label>
                            <input type="text" className="form-control" placeholder="10:00 AM - Oct 12" value={newEventForm.time} onChange={(e) => setNewEventForm(prev => ({ ...prev, time: e.target.value }))} required />
                          </div>
                          <div className="form-group">
                            <label>Incharge Contact</label>
                            <input type="text" className="form-control" placeholder="Prof. Jane (+91...)" value={newEventForm.incharge} onChange={(e) => setNewEventForm(prev => ({ ...prev, incharge: e.target.value }))} required />
                          </div>
                          <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Event</button>
                        </form>
                      </div>
                      
                      <div>
                        <h3>Festival Events Registry</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>List of events currently active in the catalog.</p>
                        
                        <div className="table-responsive">
                          <table>
                            <thead>
                              <tr>
                                <th>Event ID</th>
                                <th>Title</th>
                                <th>Venue</th>
                                <th>Timing</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {db.events.map(ev => (
                                <tr key={ev.id}>
                                  <td><strong style={{ fontFamily: 'monospace', color: 'var(--primary-glow)' }}>{ev.id}</strong></td>
                                  <td><strong>{ev.title}</strong></td>
                                  <td>{ev.venue}</td>
                                  <td>{ev.time}</td>
                                  <td>
                                    <button className="btn-secondary" style={{ borderColor: '#ff3333', color: '#ff3333', fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => { if(confirm("Delete this event?")) deleteEvent(ev.id); }}>Delete</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Broadcast Announcement tab (NEW) */}
                {adminTab === 'admin-announcements' && (
                  <div>
                    <h3>Send Festival Announcements</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Dispatch real-time alerts to the profiles of all registered students.</p>
                    
                    <form onSubmit={handleAnnouncementSubmit} style={{ maxWidth: '550px' }}>
                      <div className="form-group">
                        <label>Announcement Header / Title</label>
                        <input type="text" className="form-control" placeholder="e.g. Schedule Change Alert" value={announcementForm.title} onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>Announcement Message Message</label>
                        <textarea className="form-control" placeholder="Write message to broadcast to all students..." value={announcementForm.body} onChange={(e) => setAnnouncementForm(prev => ({ ...prev, body: e.target.value }))} required style={{ height: '120px' }} />
                      </div>
                      <button type="submit" className="btn-primary">Broadcast to All Students</button>
                    </form>
                  </div>
                )}

                {/* Schedule tab */}
                {adminTab === 'admin-schedule' && (
                  <div>
                    <h3>Venue & Hall Coordinator</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Relocate events to different blocks or reschedule timings as needed.</p>
                    
                    <form onSubmit={handleScheduleSubmit} style={{ maxWidth: '500px' }}>
                      <div className="form-group">
                        <label>Choose Event</label>
                        <select className="form-control" value={scheduleEventId} onChange={(e) => setScheduleEventId(e.target.value)} required>
                          {db.events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>New Hall Venue / Room No</label>
                        <input type="text" className="form-control" placeholder="e.g. Ramanujan Hall (Hall 1)" value={scheduleVenue} onChange={(e) => setScheduleVenue(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>New Schedule Timing</label>
                        <input type="text" className="form-control" placeholder="e.g. 09:00 AM - Oct 12, 2026" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} required />
                      </div>
                      <button type="submit" className="btn-primary">Update Schedule</button>
                    </form>
                  </div>
                )}

                {/* Settings tab */}
                {adminTab === 'admin-settings' && (
                  <div>
                    <h3>Festival Access Control</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Manage registrations freeze locks. (SMTP email server details are configured directly in backend files).</p>
                    
                    <div className="info-box" style={{ marginBottom: '25px', borderLeft: '4px solid var(--primary-glow)' }}>
                      <h4>Registration Control Panel</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                        Close registrations to freeze the catalog. Students will not be able to submit new applications.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button className="btn-primary" onClick={toggleRegistrationClosed} style={{ padding: '10px 20px' }}>Toggle Access</button>
                        <span style={{ fontWeight: '800', fontSize: '1.1rem', color: db.registrationClosed ? '#ff3333' : '#00ff88' }}>
                          Status: {db.registrationClosed ? 'CLOSED' : 'OPEN'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 5. LEADER PANEL */}
        {currentPage === 'leader-dashboard' && currentSession?.role === 'leader' && (
          <section className="page-section">
            <div className="section-header">
              <h2>Event Leader Operations Dashboard</h2>
              <p>Log in with event ID to manage registrations, scan entry codes, and broadcast alerts</p>
            </div>

            <div className="dashboard-grid">
              <div className="sidebar">
                <div className="sidebar-title">Leader Panel</div>
                <div className={`sidebar-item ${leaderTab === 'leader-participants' ? 'active' : ''}`} onClick={() => setLeaderTab('leader-participants')}>Roster Participants</div>
                <div className={`sidebar-item ${leaderTab === 'leader-scan' ? 'active' : ''}`} onClick={() => setLeaderTab('leader-scan')}>Gate QR Scanner</div>
                <div className={`sidebar-item ${leaderTab === 'leader-edit-event' ? 'active' : ''}`} onClick={() => setLeaderTab('leader-edit-event')}>Edit Event Details</div>
                <div className={`sidebar-item ${leaderTab === 'leader-settings' ? 'active' : ''}`} onClick={() => setLeaderTab('leader-settings')}>Settings</div>
              </div>

              <div className="dashboard-content">
                {/* Roster tab */}
                {leaderTab === 'leader-participants' && (
                  <div>
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
                      <div>
                        <h3>{db.events.find(e => e.id === currentSession.eventId)?.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Venue: {db.events.find(e => e.id === currentSession.eventId)?.venue}</p>
                      </div>
                      <button className="btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => alertParticipants(currentSession.eventId)}>📢 Broadcast Start Alert</button>
                    </div>

                    <div className="table-responsive">
                      <table>
                        <thead>
                          <tr>
                            <th>Participant Name</th>
                            <th>College</th>
                            <th>Team name</th>
                            <th>Ticket Code</th>
                            <th>Attendance Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {db.applications.filter(a => a.eventId === currentSession.eventId && a.status !== 'pending').length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>No approved registrations for this event yet.</td></tr>
                          ) : (
                            db.applications.filter(a => a.eventId === currentSession.eventId && a.status !== 'pending').flatMap(app => {
                              const student = db.users.find(u => u.id === app.studentId);
                              if (!student) return null;
                              const primaryTicketId = `${app.id}_primary`;
                              const isPrimaryAttended = db.scans.some(s => s.ticketId === primaryTicketId);
                              
                              const rows = [
                                <tr key={primaryTicketId}>
                                  <td><strong>{student.name}</strong> (Leader)</td>
                                  <td>{student.college}</td>
                                  <td>{app.teamName}</td>
                                  <td><span style={{ fontFamily: 'monospace' }}>{primaryTicketId}</span></td>
                                  <td><span className={`ticket-status ${isPrimaryAttended ? 'status-attended' : 'status-approved'}`}>{isPrimaryAttended ? 'attended' : 'approved'}</span></td>
                                </tr>
                              ];

                              app.teammates.forEach((tmId, idx) => {
                                const tmProfile = db.users.find(u => u.studentId === tmId);
                                const tmName = tmProfile ? tmProfile.name : "Teammate";
                                const tmTicketId = `${app.id}_team_${idx}`;
                                const isTMAttended = db.scans.some(s => s.ticketId === tmTicketId);
                                rows.push(
                                  <tr key={tmTicketId}>
                                    <td>{tmName} ({tmId})</td>
                                    <td>{student.college}</td>
                                    <td>{app.teamName}</td>
                                    <td><span style={{ fontFamily: 'monospace' }}>{tmTicketId}</span></td>
                                    <td><span className={`ticket-status ${isTMAttended ? 'status-attended' : 'status-approved'}`}>{isTMAttended ? 'attended' : 'approved'}</span></td>
                                  </tr>
                                );
                              });

                              return rows;
                            }).filter(Boolean)
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Gate Scanner tab (Manual simulation selector removed, Scan popup modal details panel and session checked-in review dropdown added) */}
                {leaderTab === 'leader-scan' && (
                  <div>
                    <h3>Venue Door Entry QR Code Scanner</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Scan student or teammate entry pass QR codes to mark attendance and instantly unlock their certificates.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px' }}>
                      <div>
                        <div className="scanner-screen" id="scanner-glow" style={{ height: 'auto', minHeight: '280px', padding: '10px' }}>
                          <div className="scanner-laser"></div>
                          <div id="reader" style={{ width: '100%', border: 'none', background: 'transparent' }}></div>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '6px 15px' }} onClick={startCamera}>Start Camera</button>
                          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 15px', borderColor: 'var(--primary-glow)', color: 'white' }} onClick={stopCamera}>Stop Camera</button>
                        </div>
                      </div>

                      <div>
                        <div className="info-box">
                          <h4 style={{ color: 'var(--secondary-glow)', marginBottom: '10px' }}>Verified Session Entries</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                            List of ticket passes verified and checked-in. Select one to display their scanned record.
                          </p>
                          <div className="form-group">
                            <label>Select Checked-in Pass</label>
                            <select className="form-control" value={selectedVerifiedScanId} onChange={(e) => setSelectedVerifiedScanId(e.target.value)}>
                              <option value="">-- No checked-in entries --</option>
                              {db.scans.filter(s => {
                                const app = db.applications.find(a => a.id === s.appId);
                                return app && app.eventId === currentSession.eventId;
                              }).map(scan => (
                                <option key={scan.ticketId} value={scan.ticketId}>{scan.attendeeName} ({scan.college}) - {scan.ticketId}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Selected scan review card */}
                        {selectedVerifiedScanId && (
                          <div style={{ marginTop: '20px', background: 'rgba(0,204,255,0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(0,204,255,0.2)' }}>
                            {(() => {
                              const s = db.scans.find(scan => scan.ticketId === selectedVerifiedScanId);
                              if (!s) return null;
                              const userProfile = db.users.find(u => u.name.toLowerCase() === s.attendeeName.toLowerCase());
                              const photoSrc = userProfile ? userProfile.idPhoto : "/logo.png";
                              return (
                                <div style={{ display: 'flex', gap: '15px' }}>
                                  <img src={photoSrc} style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-glow)' }} alt="" />
                                  <div>
                                    <h4 style={{ color: 'white', marginBottom: '4px' }}>{s.attendeeName}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.college}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--secondary-glow)' }}>Ticket ID: {s.ticketId}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Checked-in: {s.timestamp}</p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Settings tab (Leader-specific event locks) */}
                {leaderTab === 'leader-settings' && (
                  <div>
                    <h3>Registration Controls</h3>
                    <div className="info-box" style={{ marginTop: '15px', borderLeft: '4px solid var(--primary-glow)' }}>
                      <h4>Freeze Registrations for this Event</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                        Close registrations for your event only. Students will not be able to submit applications for this specific event.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button className="btn-primary" onClick={() => toggleLeaderEventRegistration(currentSession.eventId)} style={{ padding: '10px 20px' }}>Toggle Event Access</button>
                        <span style={{ fontWeight: '800', fontSize: '1.1rem', color: db.registrationClosed || db.closedEvents.includes(currentSession.eventId) ? '#ff3333' : '#00ff88' }}>
                          Status: {db.registrationClosed ? 'CLOSED (Globally Locked)' : db.closedEvents.includes(currentSession.eventId) ? 'CLOSED (Event Locked)' : 'OPEN'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Event Details tab */}
                {leaderTab === 'leader-edit-event' && (
                  <div>
                    <h3>Modify Event Settings</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                      Customize event details, rules, venue locations, and timing visible to students.
                    </p>
                    <form onSubmit={handleLeaderEventUpdateSubmit} style={{ maxWidth: '550px' }}>
                      <div className="form-group">
                        <label>Event Title</label>
                        <input type="text" className="form-control" value={leaderEventForm.title} onChange={(e) => setLeaderEventForm(prev => ({ ...prev, title: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea className="form-control" value={leaderEventForm.desc} onChange={(e) => setLeaderEventForm(prev => ({ ...prev, desc: e.target.value }))} required style={{ height: '70px' }} />
                      </div>
                      <div className="form-group">
                        <label>Rules & Guidelines</label>
                        <textarea className="form-control" value={leaderEventForm.rules} onChange={(e) => setLeaderEventForm(prev => ({ ...prev, rules: e.target.value }))} required style={{ height: '70px' }} />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Max Teammates (0 for Individual)</label>
                          <input type="number" className="form-control" min="0" max="6" value={leaderEventForm.maxTeammates} onChange={(e) => setLeaderEventForm(prev => ({ ...prev, maxTeammates: parseInt(e.target.value) || 0 }))} required />
                        </div>
                        <div className="form-group">
                          <label>Venue Hall</label>
                          <input type="text" className="form-control" value={leaderEventForm.venue} onChange={(e) => setLeaderEventForm(prev => ({ ...prev, venue: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Schedule Timing</label>
                        <input type="text" className="form-control" value={leaderEventForm.time} onChange={(e) => setLeaderEventForm(prev => ({ ...prev, time: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>Incharge Contact</label>
                        <input type="text" className="form-control" value={leaderEventForm.incharge} onChange={(e) => setLeaderEventForm(prev => ({ ...prev, incharge: e.target.value }))} required />
                      </div>
                      <button type="submit" className="btn-primary">Update Event Details</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      </div>

      {/* ==================== POPUPS / MODALS ==================== */}

      {/* Camera Scan Verification Popup Modal */}
      {scanVerifyData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 2000, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--panel-bg)', border: '2px solid var(--secondary-glow)', borderRadius: '25px', width: '100%', maxWidth: '480px', margin: '8% auto', padding: '30px', boxShadow: '0 0 30px rgba(0,204,255,0.3)', position: 'relative', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--secondary-glow)', marginBottom: '5px', fontWeight: 800, letterSpacing: '1px' }}>TICKET SCANNER VERIFICATION</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Please crosscheck the identity photo and database credentials below</p>
            
            <div style={{ marginBottom: '20px', display: 'inline-block', borderRadius: '15px', border: '2px solid var(--border-glow)', padding: '6px', background: 'rgba(0,0,0,0.4)', width: '130px', height: '130px' }}>
              <img src={scanVerifyData.idPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
            </div>

            <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem', lineHeight: '1.7' }}>
              <div><strong>Name:</strong> <span style={{ color: 'white', fontWeight: 'bold' }}>{scanVerifyData.name}</span></div>
              <div><strong>Student ID:</strong> <span style={{ color: 'var(--secondary-glow)', fontWeight: 'bold', fontFamily: 'monospace' }}>{scanVerifyData.uid}</span></div>
              <div><strong>College:</strong> <span style={{ color: 'white' }}>{scanVerifyData.college}</span></div>
              <div><strong>Event:</strong> <span style={{ color: 'var(--primary-glow)', fontWeight: 'bold' }}>{scanVerifyData.eventTitle}</span></div>
              <div><strong>Ticket Code:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{scanVerifyData.ticketId}</span></div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn-primary" style={{ padding: '10px 25px', fontWeight: 'bold', width: '60%' }} onClick={handleScanCheckInConfirm}>Approve & Check In</button>
              <button className="btn-secondary" style={{ borderColor: '#ff3333', color: '#ff3333', padding: '10px 20px', width: '35%' }} onClick={() => setScanVerifyData(null)}>Reject Pass</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Modal */}
      {paymentAppId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-glow)', borderRadius: '20px', width: '100%', maxWidth: '480px', margin: '10% auto', padding: '30px', boxShadow: 'var(--shadow)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '1.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setPaymentAppId(null)}>&times;</span>
            
            <h3 style={{ marginBottom: '10px' }}>Submit Registration Payment</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Application ID: <strong style={{ color: 'var(--secondary-glow)' }}>{paymentAppId}</strong><br />
              Please transfer the event fee to the college account: <strong>BHC-SPECTRA-SBI-00998877</strong>.<br />
              Upload screenshot and submit details below.
            </p>

            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group">
                <label>Transaction ID (TxID)</label>
                <input type="text" className="form-control" placeholder="TXN1098273612" value={paymentTxId} onChange={(e) => setPaymentTxId(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Upload Payment Receipt Screenshot (Simulation)</label>
                <input type="file" className="form-control" accept="image/*" required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Submit Payment Proof</button>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {certData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, overflowY: 'auto', padding: '20px 0' }}>
          <div style={{ maxWidth: '850px', margin: '2% auto', position: 'relative', padding: '0 20px' }}>
            <span style={{ position: 'absolute', top: '-30px', right: '30px', fontSize: '2.2rem', cursor: 'pointer', color: 'white', fontWeight: 'bold' }} onClick={() => setCertData(null)}>&times;</span>
            
            <div className="certificate-preview-box">
              <div className="certificate">
                <div className="certificate-border">
                  <img className="cert-logo" src="/logo.png" alt="Logo" />
                  <div className="cert-title">BISHOP HEBER COLLEGE (AUTONOMOUS)</div>
                  <div className="cert-subtitle">Nationally Re-accredited at 'A+' Grade by NAAC | Tiruchirappalli, Tamil Nadu</div>
                  <div style={{ fontSize: '1.5rem', marginTop: '20px', fontWeight: 600, color: 'white' }}>HEBER SPECTRA 2026</div>
                  <div className="cert-subtitle" style={{ color: 'var(--primary-glow)', marginBottom: '20px' }}>Inter-Collegiate Cultural & Technical Meet</div>
                  <div className="cert-text">This is to certify that</div>
                  <div className="cert-name">{certData.name}</div>
                  <div className="cert-text">of other college participant has successfully attended and participated in the event</div>
                  <div className="cert-details"><strong>{certData.event}</strong></div>
                  
                  <div className="cert-signatures">
                    <div className="cert-sig">
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>Dr. J. G. R. Sathiaseelan</span>
                      <span>Head, Dept of MCA</span>
                    </div>
                    <div className="cert-sig">
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>Dr. D. Paul Dhayabaran</span>
                      <span>Principal, BHC</span>
                    </div>
                  </div>
                  <div className="cert-id">Validation ID: {certData.ticketId}</div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
              <button className="btn-primary" onClick={() => downloadCertificatePDF(certData.name, certData.event)}>Download Certificate PDF</button>
              <button className="btn-secondary" onClick={() => setCertData(null)}>Close Certificate</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Section */}
      <footer style={{ marginTop: 'auto' }}>
        <p>&copy; 2026 Bishop Heber College (Autonomous), Trichy. All Rights Reserved.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '5px', color: 'rgba(255,255,255,0.3)' }}>
          Conducted by the Department of Computer Applications (MCA) | Web Design by Antigravity AI
        </p>
      </footer>

    </div>
  );
}

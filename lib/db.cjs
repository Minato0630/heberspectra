const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_FILE = process.env.VERCEL
  ? '/tmp/db.json'
  : path.join(__dirname, '..', 'db.json');

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

// Fallback Local File DB
function readLocalDB() {
  try {
    const srcPath = path.join(__dirname, '..', 'db.json');
    if (process.env.VERCEL && !fs.existsSync(DB_FILE)) {
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, DB_FILE);
      } else {
        fs.writeFileSync(DB_FILE, JSON.stringify(getInitialDB(), null, 2), 'utf8');
      }
    } else if (!fs.existsSync(DB_FILE)) {
      if (fs.existsSync(srcPath)) {
        return JSON.parse(fs.readFileSync(srcPath, 'utf8'));
      }
      const initial = getInitialDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error("[LocalDB] Read failed, returning default schema:", e.message);
    return getInitialDB();
  }
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("[LocalDB] Write failed:", e.message);
    return false;
  }
}

// Mongoose Schema
const SpectraDataSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    users: { type: Array, default: [] },
    applications: { type: Array, default: [] },
    emails: { type: Array, default: [] },
    notifications: { type: Array, default: [] },
    scans: { type: Array, default: [] },
    events: { type: Array, default: INITIAL_EVENTS },
    registrationClosed: { type: Boolean, default: false },
    closedEvents: { type: Array, default: [] },
    settings: {
      type: Object,
      default: { adminPassword: "AdminPassword123" }
    }
  },
  {
    timestamps: true,
    strict: false
  }
);

let SpectraModel;
try {
  SpectraModel = mongoose.model('SpectraData');
} catch (e) {
  SpectraModel = mongoose.model('SpectraData', SpectraDataSchema);
}

// Global cached connection for Serverless/Node environments
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(' Successfully connected to MongoDB Atlas');
      return mongooseInstance;
    }).catch((err) => {
      console.error(' MongoDB Connection Error:', err.message);
      cached.promise = null;
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
  }

  return cached.conn;
}

// Fetch database with automatic seed from local db.json if MongoDB is fresh
async function readDB() {
  try {
    const conn = await connectDB();
    if (conn) {
      let doc = await SpectraModel.findOne({ key: 'main' }).lean();
      if (!doc) {
        console.log('[MongoDB] Initializing and seeding SpectraData from db.json...');
        const seedData = readLocalDB();
        doc = await SpectraModel.create({
          key: 'main',
          ...seedData
        });
        doc = doc.toObject ? doc.toObject() : doc;
      }

      return {
        users: doc.users || [],
        applications: doc.applications || [],
        emails: doc.emails || [],
        notifications: doc.notifications || [],
        scans: doc.scans || [],
        events: (doc.events && doc.events.length > 0) ? doc.events : INITIAL_EVENTS,
        registrationClosed: Boolean(doc.registrationClosed),
        closedEvents: doc.closedEvents || [],
        settings: doc.settings || { adminPassword: "AdminPassword123" }
      };
    }
  } catch (err) {
    console.error('[MongoDB Read Error, falling back to local storage]:', err.message);
  }

  return readLocalDB();
}

// Persist database changes to MongoDB (and mirror to local db.json if non-serverless)
async function writeDB(data) {
  let mongoSuccess = false;
  try {
    const conn = await connectDB();
    if (conn) {
      await SpectraModel.findOneAndUpdate(
        { key: 'main' },
        {
          $set: {
            users: data.users || [],
            applications: data.applications || [],
            emails: data.emails || [],
            notifications: data.notifications || [],
            scans: data.scans || [],
            events: data.events || INITIAL_EVENTS,
            registrationClosed: Boolean(data.registrationClosed),
            closedEvents: data.closedEvents || [],
            settings: data.settings || { adminPassword: "AdminPassword123" },
            updatedAt: new Date()
          }
        },
        { upsert: true, returnDocument: 'after', runValidators: false }
      );
      mongoSuccess = true;
    }
  } catch (err) {
    console.error('[MongoDB Write Error]:', err.message);
  }

  // Backup to local file as well
  writeLocalDB(data);

  return mongoSuccess || !process.env.MONGODB_URI;
}

module.exports = {
  connectDB,
  readDB,
  writeDB,
  INITIAL_EVENTS,
  getInitialDB
};

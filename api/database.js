import { readDB, writeDB } from '../lib/db.cjs';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Phase 3 Security Fix: Direct full database dumping and overwriting is permanently disabled.
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Direct database access is permanently disabled for security. Please use authenticated API endpoints.'
    }
  });
}

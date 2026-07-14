import { readDB, writeDB } from '../lib/db.cjs';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const data = await readDB();
      return res.status(200).json(data);
    } catch (e) {
      console.error('API /database GET error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const success = await writeDB(req.body);
      if (success) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: 'Database write failed' });
      }
    } catch (e) {
      console.error('API /database POST error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

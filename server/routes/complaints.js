import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'indusconnect_secret_key_2026';

// POST /api/complaints — Submit a new complaint
router.post('/', (req, res) => {
  const { name, email, type, description } = req.body;

  if (!name || !email || !type || !description) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // If user is authenticated, associate their user_id
    const authHeader = req.headers['authorization'];
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwtToken = authHeader.split(' ')[1];
        const decoded = jwt.verify(jwtToken, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Token was invalid, proceed anonymously
      }
    }

    db.prepare(`
      INSERT INTO complaints (user_id, name, email, type, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, email, type, description);

    res.status(201).json({ message: 'Complaint submitted successfully!' });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ message: 'Server error submitting complaint' });
  }
});

// GET /api/complaints — Admin: list all complaints
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const complaints = db.prepare('SELECT * FROM complaints ORDER BY created_at DESC').all();
    res.json(complaints);
  } catch (error) {
    console.error('Fetch complaints error:', error);
    res.status(500).json({ message: 'Server error fetching complaints' });
  }
});

export default router;

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const JWT_SECRET = process.env.JWT_SECRET || 'indusconnect_secret_key_2026';

// Register
router.post('/register', (req, res) => {
  const { username, email, password, role, name, phone } = req.body;

  if (!username || !email || !password || !name) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const finalRole = role || 'buyer';

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, name, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, email, passwordHash, finalRole, name, phone || null, 'default_avatar.png');

    const userId = result.lastInsertRowid;
    const token = jwt.sign({ id: userId, username, role: finalRole }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: userId,
        username,
        email,
        role: finalRole,
        name,
        phone,
        avatar: 'default_avatar.png'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, name, phone, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ message: 'Server error fetching user details' });
  }
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  try {
    // Check if email taken by another user
    const otherUser = db.prepare('SELECT * FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
    if (otherUser) {
      return res.status(400).json({ message: 'Email already in use by another account' });
    }

    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, phone = ?
      WHERE id = ?
    `).run(name, email, phone || null, req.user.id);

    const updatedUser = db.prepare('SELECT id, username, email, role, name, phone, avatar FROM users WHERE id = ?').get(req.user.id);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Upload profile avatar
router.post('/profile/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload an image file' });
  }

  try {
    const avatarUrl = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.user.id);
    res.json({ message: 'Avatar updated successfully', avatar: avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Server error uploading avatar' });
  }
});

// Social Login / Registration
router.post('/social-login', (req, res) => {
  const { email, name, provider, role } = req.body;

  if (!email || !name || !provider) {
    return res.status(400).json({ message: 'Email, name and provider are required' });
  }

  try {
    // Generate a default username from email (e.g. john.doe for john.doe@gmail.com)
    let username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    
    // Check if username already exists, if so append random characters
    let userExists = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (userExists && userExists.email !== email) {
      username = `${username}_${Math.floor(100 + Math.random() * 900)}`;
    }

    // Check if user already exists by email
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const finalRole = role || 'buyer';

    if (!user) {
      // Register a new social user
      const salt = bcrypt.genSaltSync(10);
      // Random password for social login users
      const randomPassword = Math.random().toString(36).slice(-8);
      const passwordHash = bcrypt.hashSync(randomPassword, salt);
      const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

      const result = db.prepare(`
        INSERT INTO users (username, email, password_hash, role, name, phone, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(username, email, passwordHash, finalRole, name, null, avatar);

      const userId = result.lastInsertRowid;
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ message: 'Server error during social login' });
  }
});

export default router;

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

// POST /api/auth/forgot-password — Generate a 6-digit OTP and store it
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      // Return success even if email not found (security best practice)
      return res.json({ message: 'If this email exists, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = bcrypt.genSaltSync(10);
    const otpHash = bcrypt.hashSync(otp, salt);
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?')
      .run(otpHash, expiry, email);

    // Log OTP to server console
    console.log(`🔑 Password Reset OTP for ${email}: ${otp}`);

    // Always return OTP in response (no email service configured yet)
    // In production with email: remove 'otp' from response and send via SMTP
    res.json({ message: 'Your OTP code is ready. Copy it from the screen below.', otp });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error sending OTP' });
  }
});

// POST /api/auth/verify-otp — Verify OTP without resetting password
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.reset_token || !user.reset_token_expiry) {
      return res.status(400).json({ message: 'No active password reset request found' });
    }

    // Check expiry
    if (new Date() > new Date(user.reset_token_expiry)) {
      db.prepare('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE email = ?').run(email);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP hash
    const isValid = bcrypt.compareSync(otp, user.reset_token);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
});

// POST /api/auth/reset-password — Hash and save the new password
router.post('/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.reset_token || !user.reset_token_expiry) {
      return res.status(400).json({ message: 'No active password reset request found' });
    }

    // Check expiry
    if (new Date() > new Date(user.reset_token_expiry)) {
      db.prepare('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE email = ?').run(email);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    const isValid = bcrypt.compareSync(otp, user.reset_token);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // Hash new password and update
    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    db.prepare(`
      UPDATE users 
      SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL 
      WHERE email = ?
    `).run(newHash, email);

    console.log(`✅ Password successfully reset for: ${email}`);
    res.json({ message: 'Password reset successfully! You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

export default router;

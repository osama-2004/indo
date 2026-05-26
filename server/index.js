import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environmental variables
dotenv.config();

// Initialize DB schema & seed
import { initDB } from './db/database.js';
initDB();

// Import Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import rfqRoutes from './routes/rfq.js';
import complaintRoutes from './routes/complaints.js';
import favoriteRoutes from './routes/favorites.js';
import adminRoutes from './routes/admin.js';
import sampleRoutes from './routes/samples.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no origin header, e.g. from the same domain or mobile/server apps)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if the origin matches allowed list or matches production domains dynamically
    const isAllowed = allowedOrigins.includes(origin);
    const isRailway = origin.endsWith('.railway.app') || origin.includes('railway.app');
    const isRender = origin.endsWith('.onrender.com') || origin.includes('onrender.com');

    if (isAllowed || isRailway || isRender) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Health check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/rfq', rfqRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/samples', sampleRoutes);

// Serves build static assets in production mode
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}


// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Launch server
app.listen(PORT, () => {
  console.log(`🚀 IndusConnect Server running on port ${PORT}`);
});

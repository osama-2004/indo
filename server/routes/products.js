import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

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
    cb(null, `product_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/products — Fetch approved products with filters/sorting
router.get('/', (req, res) => {
  const { search, category, maxPrice, minRating, sort, page = 1, limit = 100 } = req.query;

  try {
    let query = "SELECT * FROM products WHERE status = 'Approved'";
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR category LIKE ? OR description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (category) {
      // Handles multiple categories as comma-separated or single
      const cats = category.split(',');
      const placeholders = cats.map(() => '?').join(',');
      query += ` AND category IN (${placeholders})`;
      params.push(...cats);
    }

    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (minRating) {
      query += ' AND rating >= ?';
      params.push(parseInt(minRating));
    }

    // Sorting
    if (sort === 'Price: Low to High') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'Newest') {
      query += ' ORDER BY id DESC';
    } else {
      query += ' ORDER BY id ASC'; // Default
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// GET /api/products/all — Admin: Fetch all products (any status)
router.get('/all', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const products = db.prepare('SELECT p.*, u.name as supplier_name FROM products p LEFT JOIN users u ON p.supplier_id = u.id ORDER BY p.id DESC').all();
    res.json(products);
  } catch (error) {
    console.error('Fetch all products error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// GET /api/products/supplier — Supplier: Fetch supplier's own products
router.get('/supplier', authenticateToken, requireRole('supplier', 'admin'), (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE supplier_id = ? ORDER BY id DESC').all(req.user.id);
    res.json(products);
  } catch (error) {
    console.error('Fetch supplier products error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// GET /api/products/:id — Get single product
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const product = db.prepare('SELECT p.*, u.name as supplier_name, u.phone as supplier_phone, u.email as supplier_email FROM products p LEFT JOIN users u ON p.supplier_id = u.id WHERE p.id = ?').get(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment viewed_count
    let viewVal = 1;
    if (product.viewed_count && product.viewed_count.endsWith('+')) {
      viewVal = parseInt(product.viewed_count.replace('+', '')) + 1;
    } else if (product.viewed_count) {
      viewVal = parseInt(product.viewed_count) + 1;
    }
    const updatedView = `${viewVal}+`;
    db.prepare('UPDATE products SET viewed_count = ? WHERE id = ?').run(updatedView, id);

    res.json({ ...product, viewed_count: updatedView });
  } catch (error) {
    console.error('Fetch product detail error:', error);
    res.status(500).json({ message: 'Server error fetching product details' });
  }
});

// POST /api/products — Create product
router.post('/', authenticateToken, requireRole('supplier', 'admin'), upload.single('image'), (req, res) => {
  const { name, price, category, description, moq, unitPrice } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ message: 'Name, price, and category are required' });
  }

  try {
    let imageUrl = 'product_agri_equipment.png'; // default fallback image
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const defaultStatus = req.user.role === 'admin' ? 'Approved' : 'Pending';

    const result = db.prepare(`
      INSERT INTO products (name, price, category, description, image, rating, reviews, viewed_count, moq, unit_price, status, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      parseFloat(price),
      category,
      description || '',
      imageUrl,
      5, // default rating
      0, // default reviews
      '0+', // viewed count
      moq || '1pc',
      unitPrice || `${price}EGP`,
      defaultStatus,
      req.user.id
    );

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
});

// PUT /api/products/:id — Update product
router.put('/:id', authenticateToken, requireRole('supplier', 'admin'), upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, price, category, description, moq, unitPrice, status } = req.body;

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Suppliers can only edit their own products
    if (req.user.role === 'supplier' && product.supplier_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: cannot edit this product' });
    }

    let imageUrl = product.image;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Keep status approved if admin edited, reset to Pending if supplier edited (requiring re-approval), or set explicitly by admin
    let finalStatus = product.status;
    if (req.user.role === 'admin') {
      finalStatus = status || product.status;
    } else if (req.user.role === 'supplier') {
      finalStatus = 'Pending'; // Require re-approval after edit
    }

    db.prepare(`
      UPDATE products
      SET name = ?, price = ?, category = ?, description = ?, image = ?, moq = ?, unit_price = ?, status = ?
      WHERE id = ?
    `).run(
      name || product.name,
      price ? parseFloat(price) : product.price,
      category || product.category,
      description !== undefined ? description : product.description,
      imageUrl,
      moq || product.moq,
      unitPrice || product.unit_price,
      finalStatus,
      id
    );

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// DELETE /api/products/:id — Delete product
router.delete('/:id', authenticateToken, requireRole('supplier', 'admin'), (req, res) => {
  const { id } = req.params;

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (req.user.role === 'supplier' && product.supplier_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: cannot delete this product' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
});

// PUT /api/products/:id/status — Admin: Approve/Reject product
router.put('/:id/status', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required' });
  }

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, id);
    res.json({ message: `Product status updated to ${status}` });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ message: 'Server error updating product status' });
  }
});

export default router;

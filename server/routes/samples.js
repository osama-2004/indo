import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// POST /api/samples — Buyer requests a sample for a product
router.post('/', authenticateToken, requireRole('buyer', 'admin'), (req, res) => {
  const { productId, message } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND status = ?').get(productId, 'Approved');
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not available' });
    }

    // Check if buyer already requested a sample for this product
    const existing = db.prepare(
      'SELECT * FROM sample_requests WHERE buyer_id = ? AND product_id = ? AND (status = ? OR status = ?)'
    ).get(req.user.id, productId, 'Pending', 'pending');
    
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending sample request for this product' });
    }

    const quantity = req.body.quantity || 1;
    const result = db.prepare(`
      INSERT INTO sample_requests (buyer_id, supplier_id, product_id, product_name, quantity, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      product.supplier_id,
      productId,
      product.name,
      quantity,
      message || '',
      'Pending'
    );

    res.status(201).json({ 
      message: 'Sample request submitted successfully! The supplier will review your request.', 
      sampleId: result.lastInsertRowid 
    });
  } catch (error) {
    console.error('Submit sample request error:', error);
    res.status(500).json({ message: 'Server error submitting sample request' });
  }
});

// GET /api/samples — Get sample requests based on role
router.get('/', authenticateToken, (req, res) => {
  try {
    if (req.user.role === 'buyer') {
      // Buyer: see their own requests
      const samples = db.prepare(`
        SELECT sr.*, p.image as product_image, u.name as supplier_name
        FROM sample_requests sr
        LEFT JOIN products p ON sr.product_id = p.id
        LEFT JOIN users u ON sr.supplier_id = u.id
        WHERE sr.buyer_id = ?
        ORDER BY sr.created_at DESC
      `).all(req.user.id);
      return res.json(samples);
    }

    if (req.user.role === 'supplier') {
      // Supplier: see requests for their products
      const samples = db.prepare(`
        SELECT sr.*, p.image as product_image, u.name as buyer_name, u.email as buyer_email
        FROM sample_requests sr
        LEFT JOIN products p ON sr.product_id = p.id
        LEFT JOIN users u ON sr.buyer_id = u.id
        WHERE sr.supplier_id = ?
        ORDER BY sr.created_at DESC
      `).all(req.user.id);
      return res.json(samples);
    }

    if (req.user.role === 'admin') {
      // Admin: see all requests
      const samples = db.prepare(`
        SELECT sr.*, p.image as product_image,
               buyer.name as buyer_name, buyer.email as buyer_email,
               supplier.name as supplier_name
        FROM sample_requests sr
        LEFT JOIN products p ON sr.product_id = p.id
        LEFT JOIN users buyer ON sr.buyer_id = buyer.id
        LEFT JOIN users supplier ON sr.supplier_id = supplier.id
        ORDER BY sr.created_at DESC
      `).all();
      return res.json(samples);
    }

    res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Fetch sample requests error:', error);
    res.status(500).json({ message: 'Server error fetching sample requests' });
  }
});

// PUT /api/samples/:id/status — Supplier: approve or reject a sample request
router.put('/:id/status', authenticateToken, requireRole('supplier', 'admin'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Valid status required: approved, rejected, or pending' });
  }

  try {
    const sample = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(id);
    if (!sample) {
      return res.status(404).json({ message: 'Sample request not found' });
    }

    // Suppliers can only update their own sample requests
    if (req.user.role === 'supplier' && sample.supplier_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: cannot update this sample request' });
    }

    db.prepare('UPDATE sample_requests SET status = ? WHERE id = ?').run(status, id);
    res.json({ message: `Sample request ${status} successfully` });
  } catch (error) {
    console.error('Update sample status error:', error);
    res.status(500).json({ message: 'Server error updating sample request status' });
  }
});

export default router;

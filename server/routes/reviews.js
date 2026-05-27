import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/reviews/:productId ─────────────────────────────────────────────
// Public — list all reviews for a product, newest first
router.get('/:productId', (req, res) => {
  const { productId } = req.params;
  try {
    const reviews = db.prepare(`
      SELECT
        pr.id,
        pr.product_id,
        pr.user_id,
        pr.rating,
        pr.comment,
        pr.created_at,
        pr.updated_at,
        u.name  AS user_name,
        u.avatar AS user_avatar
      FROM product_reviews pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.product_id = ?
      ORDER BY pr.created_at DESC
    `).all(productId);

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
});

// ─── POST /api/reviews/:productId ────────────────────────────────────────────
// Auth required — submit or update own review (upsert behaviour)
router.post('/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  try {
    // Verify product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed
    const existing = db.prepare(
      'SELECT id FROM product_reviews WHERE product_id = ? AND user_id = ?'
    ).get(productId, userId);

    if (existing) {
      // Update existing review
      db.prepare(`
        UPDATE product_reviews
        SET rating = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND user_id = ?
      `).run(rating, comment || '', productId, userId);

      const updated = db.prepare(`
        SELECT pr.*, u.name AS user_name, u.avatar AS user_avatar
        FROM product_reviews pr JOIN users u ON pr.user_id = u.id
        WHERE pr.product_id = ? AND pr.user_id = ?
      `).get(productId, userId);

      return res.json({ message: 'Review updated successfully', review: updated });
    }

    // Insert new review
    const result = db.prepare(`
      INSERT INTO product_reviews (product_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `).run(productId, userId, rating, comment || '');

    const created = db.prepare(`
      SELECT pr.*, u.name AS user_name, u.avatar AS user_avatar
      FROM product_reviews pr JOIN users u ON pr.user_id = u.id
      WHERE pr.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Review submitted successfully', review: created });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ message: 'Server error submitting review' });
  }
});

// ─── DELETE /api/reviews/:reviewId ───────────────────────────────────────────
// Auth required — owner or admin can delete
router.delete('/:reviewId', authenticateToken, (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id;

  try {
    const review = db.prepare('SELECT * FROM product_reviews WHERE id = ?').get(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Only owner or admin
    if (review.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: you can only delete your own reviews' });
    }

    db.prepare('DELETE FROM product_reviews WHERE id = ?').run(reviewId);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error deleting review' });
  }
});

export default router;

import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/favorites — Get user's favorite products
router.get('/', authenticateToken, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ?
    `).all(req.user.id);

    res.json(products);
  } catch (error) {
    console.error('Fetch favorites error:', error);
    res.status(500).json({ message: 'Server error fetching favorites' });
  }
});

// POST /api/favorites/:productId — Toggle favorite status for a product
router.post('/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const existing = db.prepare('SELECT * FROM favorites WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);

    if (existing) {
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
      res.json({ message: 'Removed from favorites', isFavorite: false });
    } else {
      db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(req.user.id, productId);
      res.json({ message: 'Added to favorites', isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Server error toggling favorite' });
  }
});

// DELETE /api/favorites/:productId — Remove product from favorites
router.delete('/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;

  try {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Server error removing favorite' });
  }
});

export default router;

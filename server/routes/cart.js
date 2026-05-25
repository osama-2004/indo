import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/cart — Get user's cart items
router.get('/', authenticateToken, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT 
        c.product_id as id,
        p.name,
        p.price,
        p.image,
        COALESCE(u.name, 'IndusConnect Official') as seller,
        c.quantity
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN users u ON p.supplier_id = u.id
      WHERE c.user_id = ?
    `).all(req.user.id);

    res.json(items);
  } catch (error) {
    console.error('Fetch cart error:', error);
    res.status(500).json({ message: 'Server error fetching cart' });
  }
});

// POST /api/cart — Add item to cart or increment quantity
router.post('/', authenticateToken, (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if item exists in cart
    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);

    if (existing) {
      const newQty = existing.quantity + parseInt(quantity);
      db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(newQty, req.user.id, productId);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, productId, parseInt(quantity));
    }

    // Fetch updated cart to return it
    const items = db.prepare(`
      SELECT 
        c.product_id as id,
        p.name,
        p.price,
        p.image,
        COALESCE(u.name, 'IndusConnect Official') as seller,
        c.quantity
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN users u ON p.supplier_id = u.id
      WHERE c.user_id = ?
    `).all(req.user.id);

    res.json(items);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error updating cart' });
  }
});

// PUT /api/cart/:productId — Update item quantity
router.put('/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || parseInt(quantity) < 1) {
    return res.status(400).json({ message: 'Valid quantity greater than 0 is required' });
  }

  try {
    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
    if (!existing) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(parseInt(quantity), req.user.id, productId);

    // Fetch updated cart
    const items = db.prepare(`
      SELECT 
        c.product_id as id,
        p.name,
        p.price,
        p.image,
        COALESCE(u.name, 'IndusConnect Official') as seller,
        c.quantity
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN users u ON p.supplier_id = u.id
      WHERE c.user_id = ?
    `).all(req.user.id);

    res.json(items);
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ message: 'Server error updating cart' });
  }
});

// DELETE /api/cart/:productId — Remove item from cart
router.delete('/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;

  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);

    // Fetch updated cart
    const items = db.prepare(`
      SELECT 
        c.product_id as id,
        p.name,
        p.price,
        p.image,
        COALESCE(u.name, 'IndusConnect Official') as seller,
        c.quantity
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN users u ON p.supplier_id = u.id
      WHERE c.user_id = ?
    `).all(req.user.id);

    res.json(items);
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ message: 'Server error updating cart' });
  }
});

// DELETE /api/cart — Clear entire cart
router.delete('/', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.json([]);
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error clearing cart' });
  }
});

export default router;

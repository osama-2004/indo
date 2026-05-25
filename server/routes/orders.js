import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/orders — Create order from cart (Checkout)
router.post('/', authenticateToken, (req, res) => {
  const { address, receiverName, receiverPhone, deliveryInstruction, paymentMethod } = req.body;

  if (!address || !receiverName || !receiverPhone || !paymentMethod) {
    return res.status(400).json({ message: 'Address, receiver name, phone, and payment method are required' });
  }

  try {
    // 1. Get cart items
    const cartItems = db.prepare(`
      SELECT c.*, p.name, p.price, p.image, p.supplier_id
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `).all(req.user.id);

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // 2. Calculations
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += item.price * item.quantity;
    }
    const tax = Math.round(subtotal * 0.14 * 100) / 100; // 14% VAT
    const shipping = 50; // Flat shipping rate
    const total = subtotal + tax + shipping;

    // 3. Insert order
    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (user_id, address, receiver_name, receiver_phone, delivery_instruction, payment_method, subtotal, tax, shipping, total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderResult = insertOrderStmt.run(
      req.user.id,
      address,
      receiverName,
      receiverPhone,
      deliveryInstruction || '',
      paymentMethod,
      subtotal,
      tax,
      shipping,
      total,
      'Pending'
    );

    const orderId = orderResult.lastInsertRowid;

    // 4. Insert order items
    const insertOrderItemStmt = db.prepare(`
      INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of cartItems) {
      insertOrderItemStmt.run(
        orderId,
        item.product_id,
        item.name,
        item.price,
        item.quantity,
        item.image
      );
    }

    // 5. Clear cart
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

    // 6. Return response
    res.status(201).json({
      message: 'Order created successfully',
      orderId,
      total
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ message: 'Server error processing order' });
  }
});

// GET /api/orders — Get orders based on role
router.get('/', authenticateToken, (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Admin: see all orders
      const orders = db.prepare(`
        SELECT o.*, u.username, u.name as buyer_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `).all();

      // Attach items to each order
      for (const order of orders) {
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      }
      return res.json(orders);
    } 
    
    if (req.user.role === 'supplier') {
      // Supplier: see order items that belong to their products
      const supplierOrderItems = db.prepare(`
        SELECT 
          oi.order_id as id,
          oi.name as product_name,
          oi.price,
          oi.quantity as qty,
          oi.image as img,
          o.created_at as date,
          o.status,
          u.name as name
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN users u ON o.user_id = u.id
        WHERE p.supplier_id = ?
        ORDER BY o.created_at DESC
      `).all(req.user.id);

      // Re-map to match the style in SupplierDashboard: id, name (buyer), date, price, qty, status, img
      const formatted = supplierOrderItems.map(item => {
        // Format date: Mar 22, 2026
        const dateObj = new Date(item.date);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const dateStr = dateObj.toLocaleDateString('en-US', options);

        return {
          id: `#${item.id}`,
          name: item.name, // Buyer name
          date: dateStr,
          price: item.price,
          qty: item.qty,
          status: item.status,
          img: item.img.startsWith('data:') || item.img.startsWith('http') 
            ? item.img 
            : `${item.img}` // Client will handle base URL
        };
      });

      return res.json(formatted);
    }

    // Buyer/Default: see their own orders
    const orders = db.prepare(`
      SELECT * FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);

    for (const order of orders) {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    }
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// GET /api/orders/:id — Get detailed order
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  try {
    let order;
    if (req.user.role === 'admin') {
      order = db.prepare(`
        SELECT o.*, u.username, u.name as buyer_name, u.phone as buyer_phone, u.email as buyer_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `).get(id);
    } else {
      order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, req.user.id);
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    res.json(order);
  } catch (error) {
    console.error('Fetch order detail error:', error);
    res.status(500).json({ message: 'Server error fetching order details' });
  }
});

// PUT /api/orders/:id/status — Update order status (Admin / Supplier)
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // e.g. Pending, Confirmed, On Way, Delivered, Cancelled

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    // If Admin, they can update anything
    if (req.user.role === 'admin') {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
      return res.json({ message: 'Order status updated successfully' });
    }

    // If Supplier, they can only update status if the order contains their products
    if (req.user.role === 'supplier') {
      const belongsToSupplier = db.prepare(`
        SELECT COUNT(*) as count 
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ? AND p.supplier_id = ?
      `).get(id, req.user.id);

      if (belongsToSupplier.count === 0) {
        return res.status(403).json({ message: 'Access denied: cannot update status of this order' });
      }

      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
      return res.json({ message: 'Order status updated successfully' });
    }

    res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

export default router;

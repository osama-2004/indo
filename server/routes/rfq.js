import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/rfq — Submit an RFQ request and auto-generate supplier offers
router.post('/', authenticateToken, (req, res) => {
  const { product, date, quantity, budget, notes } = req.body;

  if (!product || !date || !quantity) {
    return res.status(400).json({ message: 'Product, date needed, and quantity are required' });
  }

  try {
    const qtyVal = parseInt(quantity.toString().replace(/\D/g, '')) || 100;
    const budgetVal = parseFloat(budget ? budget.toString().replace(/\D/g, '') : '0') || 50000;

    const rfqResult = db.prepare(`
      INSERT INTO rfq_requests (user_id, product, date_needed, quantity, budget, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, product, date, qtyVal, budgetVal, notes || '');

    const rfqId = rfqResult.lastInsertRowid;

    // Premium Feature: Auto-generate 3-4 competitive supplier bids immediately!
    const baseUnitPrice = budgetVal / qtyVal;
    
    const bidSuppliers = [
      { name: 'Mobica', location: 'Cairo', rating: 4.8, reviews: 120, unitPriceFactor: 0.9, deliveryDays: 10 },
      { name: 'Alex Industrial Co.', location: 'Alexandria', rating: 4.6, reviews: 95, unitPriceFactor: 0.82, deliveryDays: 12 },
      { name: 'Aswan Nile Supplies', location: 'Aswan', rating: 4.4, reviews: 60, unitPriceFactor: 0.88, deliveryDays: 10 },
      { name: 'Delta Pack Industries', location: 'Menoufia', rating: 4.2, reviews: 75, unitPriceFactor: 0.95, deliveryDays: 15 }
    ];

    const insertResponseStmt = db.prepare(`
      INSERT INTO rfq_responses (rfq_id, supplier_name, location, rating, reviews, unit_price, qty, total, delivery_days, delivery_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Target delivery date is date_needed minus a few days, or custom calculated
    const targetDate = new Date();
    
    for (const supplier of bidSuppliers) {
      const calculatedUnit = Math.round((baseUnitPrice > 0 ? baseUnitPrice * supplier.unitPriceFactor : 100 * supplier.unitPriceFactor) * 100) / 100;
      const total = Math.round(calculatedUnit * qtyVal * 100) / 100;
      
      const deliveryDateObj = new Date();
      deliveryDateObj.setDate(deliveryDateObj.getDate() + supplier.deliveryDays);
      const deliveryDateStr = deliveryDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      insertResponseStmt.run(
        rfqId,
        supplier.name,
        supplier.location,
        supplier.rating,
        supplier.reviews,
        calculatedUnit,
        qtyVal,
        total,
        supplier.deliveryDays,
        deliveryDateStr,
        'pending'
      );
    }

    res.status(201).json({ message: 'RFQ submitted successfully and supplier responses generated!', rfqId });
  } catch (error) {
    console.error('Submit RFQ error:', error);
    res.status(500).json({ message: 'Server error submitting RFQ' });
  }
});

// GET /api/rfq — Get all RFQs for the current user and their responses
router.get('/', authenticateToken, (req, res) => {
  try {
    // If supplier, show incoming RFQs (all requests)
    if (req.user.role === 'supplier') {
      const rfqs = db.prepare(`
        SELECT r.*, u.name as buyer_name, u.avatar as buyer_avatar
        FROM rfq_requests r
        JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
      `).all();
      return res.json(rfqs);
    }

    // Buyer: see their own requests and all received responses
    const rfqs = db.prepare(`
      SELECT * FROM rfq_requests 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);

    // Get all responses for these RFQs
    const responses = [];
    for (const rfq of rfqs) {
      const rfqResponses = db.prepare('SELECT * FROM rfq_responses WHERE rfq_id = ?').all(rfq.id);
      
      for (const resp of rfqResponses) {
        // Map to exact frontend names
        const totalDiscount = resp.unit_price < (rfq.budget / rfq.quantity)
          ? `↓ ${Math.round((1 - (resp.unit_price / (rfq.budget / rfq.quantity))) * 100)}% lower`
          : '';

        responses.push({
          id: resp.id,
          rfqId: resp.rfq_id,
          name: resp.supplier_name,
          location: resp.location,
          rating: resp.rating.toString(),
          reviews: resp.reviews.toString(),
          unitPrice: `${resp.unit_price} EGP`,
          unitDiscount: totalDiscount,
          qty: `${resp.qty.toLocaleString()} pcs`,
          total: `${resp.total.toLocaleString()} EGP`,
          totalDiscount: totalDiscount,
          delivery: `${resp.delivery_days} Days`,
          deliveryDate: resp.delivery_date,
          status: resp.status,
          product: rfq.product
        });
      }
    }

    res.json(responses);
  } catch (error) {
    console.error('Fetch RFQs error:', error);
    res.status(500).json({ message: 'Server error fetching RFQs' });
  }
});

// POST /api/rfq/:id/respond — Supplier: respond manually to an RFQ
router.post('/:id/respond', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { unitPrice, deliveryDays } = req.body;

  if (!unitPrice || !deliveryDays) {
    return res.status(400).json({ message: 'Unit price and delivery days are required' });
  }

  try {
    const rfq = db.prepare('SELECT * FROM rfq_requests WHERE id = ?').get(id);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    // Get supplier info
    const supplier = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    
    const qtyVal = rfq.quantity;
    const totalVal = parseFloat(unitPrice) * qtyVal;
    
    const deliveryDateObj = new Date();
    deliveryDateObj.setDate(deliveryDateObj.getDate() + parseInt(deliveryDays));
    const deliveryDateStr = deliveryDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    db.prepare(`
      INSERT INTO rfq_responses (rfq_id, supplier_name, location, rating, reviews, unit_price, qty, total, delivery_days, delivery_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      supplier.name,
      supplier.phone ? 'Egypt' : 'Local',
      5.0,
      0,
      parseFloat(unitPrice),
      qtyVal,
      totalVal,
      parseInt(deliveryDays),
      deliveryDateStr,
      'pending'
    );

    res.status(201).json({ message: 'RFQ response sent successfully!' });
  } catch (error) {
    console.error('Respond RFQ error:', error);
    res.status(500).json({ message: 'Server error responding to RFQ' });
  }
});

// PUT /api/rfq/response/:responseId/confirm — Confirm response and push to cart
router.put('/response/:responseId/confirm', authenticateToken, (req, res) => {
  const { responseId } = req.params;

  try {
    const response = db.prepare('SELECT * FROM rfq_responses WHERE id = ?').get(responseId);
    if (!response) {
      return res.status(404).json({ message: 'Supplier response not found' });
    }

    // Update this response's status to 'confirmed' and others for the same RFQ to 'pending'
    db.prepare("UPDATE rfq_responses SET status = 'pending' WHERE rfq_id = ?").run(response.rfq_id);
    db.prepare("UPDATE rfq_responses SET status = 'confirmed' WHERE id = ?").run(responseId);

    // Fetch the RFQ request name
    const rfq = db.prepare('SELECT * FROM rfq_requests WHERE id = ?').get(response.rfq_id);

    // Insert into user's cart automatically!
    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, response.id);
    
    // We can simulate an RFQ product by adding it to cart.
    // Wait, in database schema we have a foreign key to `products` for cart items.
    // So let's insert a temporary RFQ product in the products table!
    // This is super clever because it doesn't break foreign key constraints!
    const productResult = db.prepare(`
      INSERT INTO products (name, price, category, description, image, rating, reviews, viewed_count, moq, unit_price, status, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rfq.product || 'RFQ Custom Order',
      response.unit_price,
      'Raw Material',
      `Custom RFQ Order accepted from ${response.supplier_name}`,
      'https://placehold.co/150x150/fef2f2/c24438?text=RFQ',
      5,
      0,
      '0+',
      `${response.qty} pcs`,
      `${response.unit_price} EGP`,
      'Approved',
      null // custom RFQ
    );

    const tempProductId = productResult.lastInsertRowid;

    // Now insert this product into `cart_items`
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)')
      .run(req.user.id, tempProductId, response.qty);

    res.json({ message: 'RFQ Offer confirmed and added to your shopping cart successfully!' });
  } catch (error) {
    console.error('Confirm RFQ error:', error);
    res.status(500).json({ message: 'Server error confirming RFQ response' });
  }
});

export default router;

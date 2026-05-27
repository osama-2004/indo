import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// 1. Approve Sample Request
// Method: PATCH
// Endpoint: /sample-request/:id/approve
router.patch('/:id/approve', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;

  try {
    const sample = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(id);
    if (!sample) {
      return res.status(404).json({ success: false, message: 'Sample request not found' });
    }

    db.prepare("UPDATE sample_requests SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

    res.json({
      success: true,
      message: "Sample request approved",
      status: "Approved"
    });
  } catch (error) {
    console.error('Approve sample request error:', error);
    res.status(500).json({ success: false, message: 'Server error approving sample request' });
  }
});

// 2. Reject Sample Request
// Method: PATCH
// Endpoint: /sample-request/:id/reject
router.patch('/:id/reject', authenticateToken, requireRole('supplier', 'admin'), (req, res) => {
  const { id } = req.params;

  try {
    const sample = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(id);
    if (!sample) {
      return res.status(404).json({ success: false, message: 'Sample request not found' });
    }

    // Role checks & ownership validation
    if (req.user.role === 'supplier' && sample.supplier_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: cannot modify another supplier\'s sample requests' });
    }

    db.prepare("UPDATE sample_requests SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

    res.json({
      success: true,
      message: "Sample request rejected",
      status: "Rejected"
    });
  } catch (error) {
    console.error('Reject sample request error:', error);
    res.status(500).json({ success: false, message: 'Server error rejecting sample request' });
  }
});

// 3. Delete Sample Request
// Method: DELETE
// Endpoint: /sample-request/:id
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;

  try {
    const sample = db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(id);
    if (!sample) {
      return res.status(404).json({ success: false, message: 'Sample request not found' });
    }

    // Let's do a hard delete as requested ("Request removed from supplier/buyer dashboard & database")
    db.prepare('DELETE FROM sample_requests WHERE id = ?').run(id);

    res.json({
      success: true,
      message: "Sample request deleted"
    });
  } catch (error) {
    console.error('Delete sample request error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting sample request' });
  }
});

export default router;

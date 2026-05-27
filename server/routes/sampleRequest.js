import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSample(id) {
  return db.prepare('SELECT * FROM sample_requests WHERE id = ?').get(id);
}

function canManage(user, sample) {
  if (user.role === 'admin') return true;
  if (user.role === 'supplier' && sample.supplier_id === user.id) return true;
  return false;
}

// ─── 1. Approve ─────────────────────────────────────────────────────────────
// PATCH /api/sample-request/:id/approve
// Roles: supplier (own requests only) | admin (all)
router.patch('/:id/approve', authenticateToken, requireRole('supplier', 'admin'), (req, res) => {
  const { id } = req.params;
  try {
    const sample = getSample(id);
    if (!sample) return res.status(404).json({ success: false, message: 'Sample request not found' });

    if (!canManage(req.user, sample)) {
      return res.status(403).json({ success: false, message: 'Access denied: you can only manage your own sample requests' });
    }

    db.prepare(
      "UPDATE sample_requests SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(id);

    res.json({ success: true, message: 'Sample request approved successfully', status: 'Approved' });
  } catch (error) {
    console.error('Approve sample request error:', error);
    res.status(500).json({ success: false, message: 'Server error approving sample request' });
  }
});

// ─── 2. Reject ──────────────────────────────────────────────────────────────
// PATCH /api/sample-request/:id/reject
// Roles: supplier (own requests only) | admin (all)
router.patch('/:id/reject', authenticateToken, requireRole('supplier', 'admin'), (req, res) => {
  const { id } = req.params;
  try {
    const sample = getSample(id);
    if (!sample) return res.status(404).json({ success: false, message: 'Sample request not found' });

    if (!canManage(req.user, sample)) {
      return res.status(403).json({ success: false, message: 'Access denied: you can only manage your own sample requests' });
    }

    db.prepare(
      "UPDATE sample_requests SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(id);

    res.json({ success: true, message: 'Sample request rejected successfully', status: 'Rejected' });
  } catch (error) {
    console.error('Reject sample request error:', error);
    res.status(500).json({ success: false, message: 'Server error rejecting sample request' });
  }
});

// ─── 3. Delete ──────────────────────────────────────────────────────────────
// DELETE /api/sample-request/:id
// Roles: supplier (own requests only) | admin (all)
router.delete('/:id', authenticateToken, requireRole('supplier', 'admin'), (req, res) => {
  const { id } = req.params;
  try {
    const sample = getSample(id);
    if (!sample) return res.status(404).json({ success: false, message: 'Sample request not found' });

    if (!canManage(req.user, sample)) {
      return res.status(403).json({ success: false, message: 'Access denied: you can only delete your own sample requests' });
    }

    db.prepare('DELETE FROM sample_requests WHERE id = ?').run(id);

    res.json({ success: true, message: 'Sample request deleted successfully' });
  } catch (error) {
    console.error('Delete sample request error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting sample request' });
  }
});

export default router;

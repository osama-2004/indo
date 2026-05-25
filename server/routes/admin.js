import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/admin/stats — Retrieve system analytical statistics
router.get('/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const approvedProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE status = 'Approved'").get().count;
    const pendingProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE status = 'Pending'").get().count;
    const rejectedProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE status = 'Rejected'").get().count;
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const salesSum = db.prepare('SELECT SUM(total) as sum FROM orders').get().sum || 0;

    res.json({
      totalUsers: userCount,
      totalProducts: productCount,
      approvedProducts,
      pendingProducts,
      rejectedProducts,
      totalOrders: orderCount,
      totalSales: Math.round(salesSum * 100) / 100
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

// GET /api/admin/users — List all registered users
router.get('/users', authenticateToken, requireRole('admin'), (req, res) => {
  const { search } = req.query;

  try {
    let query = 'SELECT id, username, email, role, name, phone, avatar, created_at FROM users';
    const params = [];

    if (search) {
      query += ' WHERE username LIKE ? OR email LIKE ? OR name LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY id DESC';

    const users = db.prepare(query).all(...params);

    // Map fields to match exactly what AdminDashboard expects (id, name, email, date, status, img)
    const formattedUsers = users.map(u => {
      const dateObj = new Date(u.created_at);
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      const dateStr = dateObj.toLocaleDateString('en-US', options);

      return {
        id: u.id.toString(),
        name: u.name,
        email: u.email,
        date: dateStr,
        status: u.role.charAt(0).toUpperCase() + u.role.slice(1), // 'Buyer', 'Supplier', 'Admin'
        img: u.avatar && (u.avatar.startsWith('http') || u.avatar.startsWith('data:') || u.avatar.startsWith('/')) 
          ? u.avatar 
          : 'https://i.pravatar.cc/150?u=' + u.id
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// GET /api/admin/chart-data — Retrieve interactive charts datasets
router.get('/chart-data', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    // Generate realistic/seeded buyer/supplier chart points
    const dummyChartData = [
      { name: '2', supplier: 500, buyer: 480 }, { name: '4', supplier: 900, buyer: 620 },
      { name: '6', supplier: 850, buyer: 780 }, { name: '8', supplier: 650, buyer: 750 },
      { name: '10', supplier: 720, buyer: 630 }, { name: '12', supplier: 880, buyer: 920 },
      { name: '14', supplier: 820, buyer: 750 }, { name: '16', supplier: 780, buyer: 720 },
      { name: '18', supplier: 850, buyer: 680 }, { name: '20', supplier: 820, buyer: 740 },
      { name: '22', supplier: 890, buyer: 820 }, { name: '24', supplier: 830, buyer: 910 },
      { name: '26', supplier: 880, buyer: 820 }, { name: '28', supplier: 800, buyer: 780 }
    ];

    res.json(dummyChartData);
  } catch (error) {
    console.error('Fetch chart data error:', error);
    res.status(500).json({ message: 'Server error fetching chart data' });
  }
});

// DELETE /api/admin/users/:id — Admin: Delete a user
router.delete('/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;

  if (req.user.id === parseInt(id)) {
    return res.status(400).json({ message: 'You cannot delete your own admin account.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// PUT /api/admin/users/:id/role — Admin: Change a user's role
router.put('/users/:id/role', authenticateToken, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['buyer', 'supplier', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Valid role is required (buyer, supplier, admin)' });
  }

  if (req.user.id === parseInt(id) && role !== 'admin') {
    return res.status(400).json({ message: 'You cannot demote your own admin account.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    res.json({ message: `User role updated to ${role}` });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
});

export default router;

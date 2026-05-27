import wasm from 'node-sqlite3-wasm';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Database: WasmDatabase } = wasm;

// ─────────────────────────────────────────────
// Compatibility shim: node-sqlite3-wasm → better-sqlite3 API
// Allows all existing routes to use the same .prepare().run() / .get() / .all() pattern.
// ─────────────────────────────────────────────
class BetterSQLiteShim {
  constructor(filePath, _opts) {
    this._db = new WasmDatabase(filePath);
  }

  pragma(pragmaStr) {
    this._db.exec(`PRAGMA ${pragmaStr}`);
  }

  exec(sql) {
    this._db.exec(sql);
    return this;
  }

  prepare(sql) {
    const db = this._db;
    return {
      _sql: sql,
      /** Run a write statement. Accept variadic args or a single array */
      run(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.run(sql, params);
      },
      /** Return a single row */
      get(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.get(sql, params);
      },
      /** Return all rows */
      all(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.all(sql, params);
      }
    };
  }

  /**
   * Wraps a function in a BEGIN / COMMIT transaction.
   * Rolls back on error, mirroring better-sqlite3's .transaction() helper.
   */
  transaction(fn) {
    return (...args) => {
      this._db.exec('BEGIN');
      try {
        const result = fn(...args);
        this._db.exec('COMMIT');
        return result;
      } catch (err) {
        this._db.exec('ROLLBACK');
        throw err;
      }
    };
  }

  close() {
    this._db.close();
  }
}

// ─────────────────────────────────────────────
// Open / create the database file
// ─────────────────────────────────────────────
const dbPath = path.join(__dirname, 'indusconnect.db');
const db = new BetterSQLiteShim(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────────
// Schema initialisation
// ─────────────────────────────────────────────
export function initDB() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('buyer', 'supplier', 'admin')) NOT NULL DEFAULT 'buyer',
      name TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      reset_token TEXT,
      reset_token_expiry DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add reset_token columns if they don't exist (for existing DBs)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
  } catch (_) { /* already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME`);
  } catch (_) { /* already exists */ }

  // 2. Products Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      image TEXT,
      rating INTEGER DEFAULT 5,
      reviews INTEGER DEFAULT 0,
      viewed_count TEXT DEFAULT '0+',
      moq TEXT DEFAULT '1pc',
      unit_price TEXT,
      status TEXT CHECK(status IN ('Pending', 'Approved', 'Rejected')) NOT NULL DEFAULT 'Approved',
      supplier_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 3. Cart Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    )
  `);

  // 4. Orders Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      address TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      receiver_phone TEXT NOT NULL,
      delivery_instruction TEXT,
      payment_method TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      shipping REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 5. Order Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      image TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `);

  // 6. RFQ Requests Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rfq_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product TEXT NOT NULL,
      date_needed TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      budget REAL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration: add status column if it doesn't exist
  try {
    db.exec(`ALTER TABLE rfq_requests ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`);
  } catch (_) { /* already exists */ }

  // 7. RFQ Responses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rfq_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rfq_id INTEGER NOT NULL,
      supplier_id INTEGER,
      supplier_name TEXT NOT NULL,
      location TEXT NOT NULL,
      rating REAL DEFAULT 5,
      reviews INTEGER DEFAULT 0,
      unit_price REAL NOT NULL,
      qty INTEGER NOT NULL,
      total REAL NOT NULL,
      delivery_days INTEGER NOT NULL,
      delivery_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (rfq_id) REFERENCES rfq_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Migration: add supplier_id to rfq_responses if not exists
  try {
    db.exec(`ALTER TABLE rfq_responses ADD COLUMN supplier_id INTEGER`);
  } catch (_) { /* already exists */ }

  // 8. Complaints Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 9. Favorites Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    )
  `);

  // 10. Sample Requests Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sample_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      supplier_id INTEGER,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Migration: add quantity, updated_at, and deleted_at to sample_requests table if they don't exist
  try {
    db.exec(`ALTER TABLE sample_requests ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`);
  } catch (_) { /* already exists */ }
  try {
    db.exec(`ALTER TABLE sample_requests ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
  } catch (_) { /* already exists */ }
  try {
    db.exec(`ALTER TABLE sample_requests ADD COLUMN deleted_at DATETIME`);
  } catch (_) { /* already exists */ }

  seedData();
}

// ─────────────────────────────────────────────
// Seed initial data
// ─────────────────────────────────────────────
function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    console.log('🌱 Seeding default users...');
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('admin123', salt);
    const supplierHash = bcrypt.hashSync('supplier123', salt);
    const buyerHash = bcrypt.hashSync('buyer123', salt);

    // Insert Admin
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, name, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin@indusconnect.com', adminHash, 'admin', 'System Administrator', '+201012345678', 'avatar_admin.png');

    // Insert Supplier
    const supplierResult = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, name, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('supplier', 'supplier@indusconnect.com', supplierHash, 'supplier', 'IndusConnect Official Supplier', '+201123456789', 'avatar_supplier.png');

    const supplierId = supplierResult.lastInsertRowid;

    // Insert Buyer
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, name, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('buyer', 'buyer@indusconnect.com', buyerHash, 'buyer', 'Osama Buyer', '+201234567890', 'avatar_buyer.png');

    // Seed default products
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    if (productCount.count === 0) {
      console.log('🌱 Seeding default products...');
      const defaultProducts = [
        { name: 'Modern Pendant Light', price: 600, category: 'Furniture', rating: 4, reviews: 100, image: 'product_amber_pendant.png', description: 'Modern lamp with a practical and artistic design.', viewed_count: '50+', moq: '20pcs', unit_price: '700EGP', status: 'Approved' },
        { name: 'Synthetic Leather', price: 30, category: 'Raw Material', rating: 2, reviews: 50, image: 'product_leather_chair_premium.png', description: 'Leather ideal for wallets and small accessories.', viewed_count: '20+', moq: '60pcs', unit_price: '30EGP', status: 'Approved' },
        { name: 'Cardboard Boxes', price: 10, category: 'Package', rating: 5, reviews: 50, image: 'product_agri_equipment.png', description: 'Strong boxes for safe packaging and delivery.', viewed_count: '70+', moq: '500pcs', unit_price: '10EGP', status: 'Approved' },
        { name: 'Solid Shelf Table', price: 1000, category: 'Furniture', rating: 5, reviews: 300, image: 'cat_furniture_shelf.png', description: 'Sleek wooden table with a functional shelf.', viewed_count: '200+', moq: '12pcs', unit_price: '1000EGP', status: 'Approved' },
        { name: 'Hoodies', price: 250, category: 'Textile', rating: 4, reviews: 100, image: 'cat_textile_hoodies.png', description: 'Comfortable hoodies suitable for casual wear.', viewed_count: '500+', moq: '50pcs', unit_price: '250EGP', status: 'Approved' },
        { name: 'PVC Rolls', price: 500, category: 'Raw Material', rating: 3, reviews: 400, image: 'cat_raw_pvc.png', description: 'High-quality PVC rolls for construction and packaging.', viewed_count: '400+', moq: '100pcs', unit_price: '500EGP', status: 'Approved' },
        { name: 'Industrial Drill', price: 850, category: 'Electronic & Spare Parts', rating: 4, reviews: 80, image: 'product_amber_pendant.png', description: 'High-performance drill for industrial use.', viewed_count: '150+', moq: '5pcs', unit_price: '850EGP', status: 'Approved' },
        { name: 'Cotton Fabric Roll', price: 120, category: 'Textile', rating: 5, reviews: 120, image: 'product_leather_chair_premium.png', description: 'Premium quality cotton fabric for garments.', viewed_count: '300+', moq: '100m', unit_price: '120EGP', status: 'Approved' },
        { name: 'Office Chair', price: 950, category: 'Furniture', rating: 4, reviews: 210, image: 'product_agri_equipment.png', description: 'Ergonomic chair for long working hours.', viewed_count: '400+', moq: '10pcs', unit_price: '950EGP', status: 'Approved' }
      ];

      const stmt = db.prepare(`
        INSERT INTO products (name, price, category, rating, reviews, image, description, viewed_count, moq, unit_price, status, supplier_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const p of defaultProducts) {
        stmt.run(p.name, p.price, p.category, p.rating, p.reviews, p.image, p.description, p.viewed_count, p.moq, p.unit_price, p.status, supplierId);
      }
    }
  }
}

export default db;

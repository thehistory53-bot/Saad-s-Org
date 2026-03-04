import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("dealerflow.db");

// Helper to normalize stock (cartons/pieces) and prevent negative values
function normalizeStock(productId: number | bigint) {
  const product = db.prepare("SELECT pieces_per_carton FROM products WHERE id = ?").get(productId) as any;
  const stock = db.prepare("SELECT cartons, pieces FROM stock WHERE product_id = ?").get(productId) as any;
  
  if (!product || !stock) return;

  const ppc = product.pieces_per_carton || 1;
  let totalPieces = (stock.cartons * ppc) + stock.pieces;
  
  // Prevent negative stock
  if (totalPieces < 0) totalPieces = 0;

  const newCartons = Math.floor(totalPieces / ppc);
  const newPieces = totalPieces % ppc;

  db.prepare("UPDATE stock SET cartons = ?, pieces = ? WHERE product_id = ?")
    .run(newCartons, newPieces, productId);
}

// Initialize Database
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT DEFAULT 'DealerFlow',
      address TEXT DEFAULT '',
      logo_url TEXT DEFAULT ''
    );

    INSERT OR IGNORE INTO settings (id, company_name) VALUES (1, 'DealerFlow');

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('admin', 'manager', 'staff')),
      full_name TEXT
    );

    INSERT OR IGNORE INTO users (username, password, role, full_name) 
    VALUES ('admin', 'admin123', 'admin', 'System Administrator');

    CREATE TABLE IF NOT EXISTS routes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
    CREATE TABLE IF NOT EXISTS srs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
    CREATE TABLE IF NOT EXISTS delivery_boys (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
    CREATE TABLE IF NOT EXISTS vans (id INTEGER PRIMARY KEY AUTOINCREMENT, van_no TEXT);

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      pieces_per_carton INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0,
      min_stock_level INTEGER DEFAULT 10,
      profit_percent REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      cartons INTEGER DEFAULT 0,
      pieces INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('issue', 'return', 'damage')),
      date DATE DEFAULT (DATE('now')),
      sr_id INTEGER,
      route_id INTEGER,
      delivery_boy_id INTEGER,
      van_id INTEGER,
      notes TEXT,
      FOREIGN KEY(sr_id) REFERENCES srs(id),
      FOREIGN KEY(route_id) REFERENCES routes(id),
      FOREIGN KEY(delivery_boy_id) REFERENCES delivery_boys(id),
      FOREIGN KEY(van_id) REFERENCES vans(id)
    );

    CREATE TABLE IF NOT EXISTS operation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER,
      product_id INTEGER,
      cartons INTEGER DEFAULT 0,
      pieces INTEGER DEFAULT 0,
      FOREIGN KEY(operation_id) REFERENCES operations(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS dues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      date DATE DEFAULT (DATE('now')),
      status TEXT DEFAULT 'pending'
    );

    -- Migration for old schema
    PRAGMA table_info(dues);
  `);

  // Ensure columns exist if table was created with old schema
  const columns = db.prepare("PRAGMA table_info(dues)").all();
  const hasTotalAmount = columns.some((c: any) => c.name === 'total_amount');
  if (!hasTotalAmount) {
    db.exec(`
      ALTER TABLE dues ADD COLUMN total_amount REAL DEFAULT 0;
      ALTER TABLE dues ADD COLUMN remaining_amount REAL DEFAULT 0;
      UPDATE dues SET total_amount = amount, remaining_amount = amount;
    `);
  }

  const prodColumns = db.prepare("PRAGMA table_info(products)").all();
  const hasProfitPercent = prodColumns.some((c: any) => c.name === 'profit_percent');
  if (!hasProfitPercent) {
    db.exec(`ALTER TABLE products ADD COLUMN profit_percent REAL DEFAULT 0;`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS due_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      due_id INTEGER,
      amount_collected REAL NOT NULL,
      collection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(due_id) REFERENCES dues(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE DEFAULT (DATE('now')),
      category TEXT,
      amount REAL,
      description TEXT
    );

    -- Cleanup Duplicates
    DELETE FROM routes WHERE id NOT IN (SELECT MIN(id) FROM routes GROUP BY name);
    DELETE FROM srs WHERE id NOT IN (SELECT MIN(id) FROM srs GROUP BY name);
    DELETE FROM delivery_boys WHERE id NOT IN (SELECT MIN(id) FROM delivery_boys GROUP BY name);
    DELETE FROM vans WHERE id NOT IN (SELECT MIN(id) FROM vans GROUP BY van_no);
    DELETE FROM products WHERE id NOT IN (SELECT MIN(id) FROM products GROUP BY name);

    -- Enforce Uniqueness with Indexes
    CREATE UNIQUE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_srs_name ON srs(name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_boys_name ON delivery_boys(name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vans_no ON vans(van_no);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name ON products(name);
  `);
  console.log("Database initialized successfully");
} catch (err) {
  console.error("Database initialization failed:", err);
}

const app = express();
app.use(express.json());

// API Routes
app.get("/api/users", (req, res) => {
  res.json(db.prepare("SELECT id, username, role, full_name FROM users").all());
});

app.post("/api/users", (req, res) => {
  const { username, password, role, full_name } = req.body;
  try {
    const info = db.prepare("INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)")
      .run(username, password, role, full_name);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT id, username, role, full_name FROM users WHERE username = ? AND password = ?")
    .get(username, password);
  
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, error: "Invalid username or password" });
  }
});

app.post("/api/users/change-password", (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND password = ?").get(userId, oldPassword);
  
  if (user) {
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, userId);
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "পুরানো পাসওয়ার্ডটি সঠিক নয়" });
  }
});

app.delete("/api/users/:id", (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/masters/:type", (req, res) => {
  const { type } = req.params;
  const { name, van_no } = req.body;
  
  let info;
  if (type === 'routes') {
    info = db.prepare("INSERT INTO routes (name) VALUES (?)").run(name);
  } else if (type === 'srs') {
    info = db.prepare("INSERT INTO srs (name) VALUES (?)").run(name);
  } else if (type === 'delivery_boys') {
    info = db.prepare("INSERT INTO delivery_boys (name) VALUES (?)").run(name);
  } else if (type === 'vans') {
    info = db.prepare("INSERT INTO vans (van_no) VALUES (?)").run(van_no);
  }
  
  res.json({ id: info?.lastInsertRowid });
});

app.delete("/api/masters/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const table = type; // routes, srs, delivery_boys, vans
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  res.json({ success: true });
});

app.get("/api/settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  res.json(settings);
});

app.post("/api/settings", (req, res) => {
  const { company_name, address, logo_url } = req.body;
  db.prepare("UPDATE settings SET company_name = ?, address = ?, logo_url = ? WHERE id = 1")
    .run(company_name, address, logo_url);
  res.json({ success: true });
});

app.get("/api/dashboard/stats", (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const todaySales = db.prepare(`
    SELECT SUM(oi.cartons * p.unit_price * p.pieces_per_carton + oi.pieces * p.unit_price) as total
    FROM operation_items oi
    JOIN operations o ON oi.operation_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.type = 'issue' AND o.date = ?
  `).get(today);

  const totalDues = db.prepare("SELECT SUM(amount) as total FROM dues WHERE status = 'pending'").get();
  
  const lowStock = db.prepare(`
    SELECT COUNT(*) as count 
    FROM stock s 
    JOIN products p ON s.product_id = p.id 
    WHERE (s.cartons * p.pieces_per_carton + s.pieces) < p.min_stock_level
  `).get();

  res.json({
    todaySales: todaySales.total || 0,
    totalDues: totalDues.total || 0,
    lowStockCount: lowStock.count || 0
  });
});

app.get("/api/products", (req, res) => {
  const products = db.prepare(`
    SELECT p.*, s.cartons, s.pieces 
    FROM products p 
    LEFT JOIN stock s ON p.id = s.product_id
  `).all();
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const { name, category, pieces_per_carton, unit_price, min_stock_level, cartons, pieces, profit_percent } = req.body;
  const info = db.prepare("INSERT INTO products (name, category, pieces_per_carton, unit_price, min_stock_level, profit_percent) VALUES (?, ?, ?, ?, ?, ?)")
    .run(name, category, pieces_per_carton, unit_price, min_stock_level, profit_percent || 0);
  
  db.prepare("INSERT INTO stock (product_id, cartons, pieces) VALUES (?, ?, ?)")
    .run(info.lastInsertRowid, cartons || 0, pieces || 0);
  
  normalizeStock(info.lastInsertRowid);
    
  res.json({ id: info.lastInsertRowid });
});

app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const { name, category, pieces_per_carton, unit_price, min_stock_level, profit_percent } = req.body;
  db.prepare("UPDATE products SET name = ?, category = ?, pieces_per_carton = ?, unit_price = ?, min_stock_level = ?, profit_percent = ? WHERE id = ?")
    .run(name, category, pieces_per_carton, unit_price, min_stock_level, profit_percent || 0, id);
  res.json({ success: true });
});

app.post("/api/stock/add", (req, res) => {
  const { product_id, cartons, pieces } = req.body;
  db.prepare("UPDATE stock SET cartons = cartons + ?, pieces = pieces + ? WHERE product_id = ?")
    .run(cartons, pieces, product_id);
  normalizeStock(product_id);
  res.json({ success: true });
});

app.get("/api/masters", (req, res) => {
  res.json({
    routes: db.prepare("SELECT * FROM routes").all(),
    srs: db.prepare("SELECT * FROM srs").all(),
    delivery_boys: db.prepare("SELECT * FROM delivery_boys").all(),
    vans: db.prepare("SELECT * FROM vans").all()
  });
});

app.get("/api/issued-items/:date/:delivery_boy_id", (req, res) => {
  const { date, delivery_boy_id } = req.params;
  
  const metadata = db.prepare(`
    SELECT sr_id, route_id, van_id 
    FROM operations 
    WHERE type = 'issue' AND date = ? AND delivery_boy_id = ?
    LIMIT 1
  `).get(date, delivery_boy_id);

  const items = db.prepare(`
    SELECT 
      oi.product_id, 
      p.name as product_name,
      SUM(oi.cartons) as cartons, 
      SUM(oi.pieces) as pieces
    FROM operation_items oi
    JOIN operations o ON oi.operation_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.type = 'issue' AND o.date = ? AND o.delivery_boy_id = ?
    GROUP BY oi.product_id
  `).all(date, delivery_boy_id);
  
  res.json({ items, metadata });
});

app.post("/api/operations", (req, res) => {
  const { type, date, sr_id, route_id, delivery_boy_id, van_id, items } = req.body;
  
  const transaction = db.transaction(() => {
    const op = db.prepare(`
      INSERT INTO operations (type, date, sr_id, route_id, delivery_boy_id, van_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, date, sr_id, route_id, delivery_boy_id, van_id);

    const opId = op.lastInsertRowid;

    for (const item of items) {
      db.prepare("INSERT INTO operation_items (operation_id, product_id, cartons, pieces) VALUES (?, ?, ?, ?)")
        .run(opId, item.product_id, item.cartons, item.pieces);
      
      // Update stock based on type
      if (type === 'issue') {
        db.prepare("UPDATE stock SET cartons = cartons - ?, pieces = pieces - ? WHERE product_id = ?")
          .run(item.cartons, item.pieces, item.product_id);
        normalizeStock(item.product_id);
      } else if (type === 'return' || type === 'damage') {
        if (type === 'return') {
          db.prepare("UPDATE stock SET cartons = cartons + ?, pieces = pieces + ? WHERE product_id = ?")
            .run(item.cartons, item.pieces, item.product_id);
          normalizeStock(item.product_id);
        }
      }
    }
    return opId;
  });

  const id = transaction();
  res.json({ id });
});

app.get("/api/operations/combined/:date/:delivery_boy_id", (req, res) => {
  const { date, delivery_boy_id } = req.params;
  
  const items = db.prepare(`
    SELECT 
      p.id as product_id,
      p.name as product_name,
      SUM(CASE WHEN o.type = 'issue' THEN oi.cartons ELSE 0 END) as issue_cartons,
      SUM(CASE WHEN o.type = 'issue' THEN oi.pieces ELSE 0 END) as issue_pieces,
      SUM(CASE WHEN o.type = 'return' THEN oi.cartons ELSE 0 END) as return_cartons,
      SUM(CASE WHEN o.type = 'return' THEN oi.pieces ELSE 0 END) as return_pieces,
      SUM(CASE WHEN o.type = 'damage' THEN oi.cartons ELSE 0 END) as damage_cartons,
      SUM(CASE WHEN o.type = 'damage' THEN oi.pieces ELSE 0 END) as damage_pieces
    FROM products p
    JOIN operation_items oi ON p.id = oi.product_id
    JOIN operations o ON oi.operation_id = o.id
    WHERE o.date = ? AND o.delivery_boy_id = ?
    GROUP BY p.id
  `).all(date, delivery_boy_id);
  
  res.json(items);
});

app.put("/api/operations/combined", (req, res) => {
  const { date, delivery_boy_id, items } = req.body;
  
  const transaction = db.transaction(() => {
    for (const item of items) {
      // For each type, we need to find the operation and update its items
      const types = ['issue', 'return', 'damage'];
      
      for (const type of types) {
        let op = db.prepare("SELECT id FROM operations WHERE date = ? AND delivery_boy_id = ? AND type = ?").get(date, delivery_boy_id, type);
        
        if (!op && (item[`${type}_cartons`] > 0 || item[`${type}_pieces`] > 0)) {
          // Create operation if it doesn't exist but we have data
          // We need to fetch metadata from an existing operation for this date/delivery_boy if possible
          const meta = db.prepare("SELECT sr_id, route_id, van_id FROM operations WHERE date = ? AND delivery_boy_id = ? LIMIT 1").get(date, delivery_boy_id);
          
          const newOp = db.prepare(`
            INSERT INTO operations (type, date, sr_id, route_id, delivery_boy_id, van_id) 
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(type, date, meta?.sr_id || null, meta?.route_id || null, delivery_boy_id, meta?.van_id || null);
          
          op = { id: newOp.lastInsertRowid };
        }

        if (op) {
          const oldItem = db.prepare("SELECT cartons, pieces FROM operation_items WHERE operation_id = ? AND product_id = ?").get(op.id, item.product_id);
          
          const newCartons = item[`${type}_cartons`];
          const newPieces = item[`${type}_pieces`];
          
          if (oldItem) {
            // Calculate difference for stock adjustment
            const diffCartons = newCartons - oldItem.cartons;
            const diffPieces = newPieces - oldItem.pieces;
            
            // Update operation item
            db.prepare("UPDATE operation_items SET cartons = ?, pieces = ? WHERE operation_id = ? AND product_id = ?")
              .run(newCartons, newPieces, op.id, item.product_id);
              
            // Update stock
            if (type === 'issue') {
              db.prepare("UPDATE stock SET cartons = cartons - ?, pieces = pieces - ? WHERE product_id = ?")
                .run(diffCartons, diffPieces, item.product_id);
              normalizeStock(item.product_id);
            } else if (type === 'return') {
              db.prepare("UPDATE stock SET cartons = cartons + ?, pieces = pieces + ? WHERE product_id = ?")
                .run(diffCartons, diffPieces, item.product_id);
              normalizeStock(item.product_id);
            }
          } else if (newCartons > 0 || newPieces > 0) {
            // New item for this operation
            db.prepare("INSERT INTO operation_items (operation_id, product_id, cartons, pieces) VALUES (?, ?, ?, ?)")
              .run(op.id, item.product_id, newCartons, newPieces);
              
            if (type === 'issue') {
              db.prepare("UPDATE stock SET cartons = cartons - ?, pieces = pieces - ? WHERE product_id = ?")
                .run(newCartons, newPieces, item.product_id);
              normalizeStock(item.product_id);
            } else if (type === 'return') {
              db.prepare("UPDATE stock SET cartons = cartons + ?, pieces = pieces + ? WHERE product_id = ?")
                .run(newCartons, newPieces, item.product_id);
              normalizeStock(item.product_id);
            }
          }
        }
      }
    }
    return { success: true };
  });

  res.json(transaction());
});

app.get("/api/reports/invoice/:date", (req, res) => {
  const { date } = req.params;
  const delivery_boy_id = req.query.delivery_boy_id as string;
  
  let query = `
    SELECT 
      p.name,
      p.unit_price,
      p.pieces_per_carton,
      SUM(CASE WHEN o.type = 'issue' THEN oi.cartons ELSE 0 END) as issued_cartons,
      SUM(CASE WHEN o.type = 'issue' THEN oi.pieces ELSE 0 END) as issued_pieces,
      SUM(CASE WHEN o.type = 'return' THEN oi.cartons ELSE 0 END) as returned_cartons,
      SUM(CASE WHEN o.type = 'return' THEN oi.pieces ELSE 0 END) as returned_pieces,
      SUM(CASE WHEN o.type = 'damage' THEN oi.cartons ELSE 0 END) as damaged_cartons,
      SUM(CASE WHEN o.type = 'damage' THEN oi.pieces ELSE 0 END) as damaged_pieces
    FROM products p
    LEFT JOIN operation_items oi ON p.id = oi.product_id
    LEFT JOIN operations o ON oi.operation_id = o.id AND o.date = ?
  `;
  
  const params: any[] = [date];
  
  if (delivery_boy_id && delivery_boy_id !== 'undefined' && delivery_boy_id !== 'null') {
    query += ` AND o.delivery_boy_id = ? `;
    params.push(delivery_boy_id);
  }
  
  query += `
    GROUP BY p.id
    HAVING issued_cartons > 0 OR issued_pieces > 0 OR returned_cartons > 0 OR returned_pieces > 0 OR damaged_cartons > 0 OR damaged_pieces > 0
  `;
  
  const report = db.prepare(query).all(...params);
  res.json(report);
});

app.get("/api/dues", (req, res) => {
  res.json(db.prepare(`
    SELECT * FROM dues 
    WHERE status != 'paid' 
    ORDER BY date DESC
  `).all());
});

app.post("/api/dues", (req, res) => {
  const { customer_name, amount, date } = req.body;
  const result = db.prepare("INSERT INTO dues (customer_name, total_amount, remaining_amount, date) VALUES (?, ?, ?, ?)")
    .run(customer_name, amount, amount, date || new Date().toISOString().split('T')[0]);
  res.json({ id: result.lastInsertRowid });
});

app.post("/api/dues/collect", (req, res) => {
  const { due_id, amount_collected } = req.body;
  
  const transaction = db.transaction(() => {
    // Record the collection
    db.prepare("INSERT INTO due_collections (due_id, amount_collected) VALUES (?, ?)")
      .run(due_id, amount_collected);
    
    // Update the due record
    const due = db.prepare("SELECT remaining_amount FROM dues WHERE id = ?").get(due_id);
    const newRemaining = due.remaining_amount - amount_collected;
    const status = newRemaining <= 0 ? 'paid' : 'pending';
    
    db.prepare("UPDATE dues SET remaining_amount = ?, status = ? WHERE id = ?")
      .run(newRemaining, status, due_id);
      
    return { newRemaining, status };
  });

  const result = transaction();
  res.json(result);
});

app.get("/api/expenses", (req, res) => {
  res.json(db.prepare("SELECT * FROM expenses ORDER BY date DESC").all());
});

app.get("/api/profit/analysis", (req, res) => {
  // Calculate Gross Profit from sales (issues - returns)
  const salesData = db.prepare(`
    SELECT 
      strftime('%Y-%m', o.date) as month,
      SUM(CASE WHEN o.type = 'issue' THEN (oi.cartons * p.pieces_per_carton + oi.pieces) * p.unit_price * (p.profit_percent / 100.0) ELSE 0 END) as issue_profit,
      SUM(CASE WHEN o.type = 'return' THEN (oi.cartons * p.pieces_per_carton + oi.pieces) * p.unit_price * (p.profit_percent / 100.0) ELSE 0 END) as return_profit
    FROM operations o
    JOIN operation_items oi ON o.id = oi.operation_id
    JOIN products p ON oi.product_id = p.id
    GROUP BY month
    ORDER BY month ASC
  `).all();

  const expenseData = db.prepare(`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total_expenses
    FROM expenses
    GROUP BY month
    ORDER BY month ASC
  `).all();

  // Merge data
  const months = Array.from(new Set([...salesData.map((s: any) => s.month), ...expenseData.map((e: any) => e.month)])).sort();
  
  const monthlyAnalysis = months.map(month => {
    const sale = salesData.find((s: any) => s.month === month) || { issue_profit: 0, return_profit: 0 };
    const expense = expenseData.find((e: any) => e.month === month) || { total_expenses: 0 };
    const grossProfit = (sale.issue_profit || 0) - (sale.return_profit || 0);
    return {
      month,
      grossProfit,
      expenses: expense.total_expenses || 0,
      netProfit: grossProfit - (expense.total_expenses || 0)
    };
  });

  const totalGrossProfit = monthlyAnalysis.reduce((acc, curr) => acc + curr.grossProfit, 0);
  const totalExpenses = monthlyAnalysis.reduce((acc, curr) => acc + curr.expenses, 0);
  const netProfit = totalGrossProfit - totalExpenses;

  res.json({
    totalGrossProfit,
    totalExpenses,
    netProfit,
    monthlyAnalysis
  });
});

app.post("/api/expenses", (req, res) => {
  const { category, amount, description, date } = req.body;
  db.prepare("INSERT INTO expenses (category, amount, description, date) VALUES (?, ?, ?, ?)")
    .run(category, amount, description, date || new Date().toISOString().split('T')[0]);
  res.json({ success: true });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

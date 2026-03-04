import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to normalize stock (cartons/pieces) and prevent negative values
async function normalizeStock(productId: number | string) {
  const { data: product } = await supabase.from("products").select("pieces_per_carton").eq("id", productId).single();
  const { data: stock } = await supabase.from("stock").select("cartons, pieces").eq("product_id", productId).single();
  
  if (!product || !stock) return;

  const ppc = product.pieces_per_carton || 1;
  let totalPieces = (stock.cartons * ppc) + stock.pieces;
  
  // Prevent negative stock
  if (totalPieces < 0) totalPieces = 0;

  const newCartons = Math.floor(totalPieces / ppc);
  const newPieces = totalPieces % ppc;

  await supabase.from("stock").update({ cartons: newCartons, pieces: newPieces }).eq("product_id", productId);
}

// Initialize Database
// Note: Supabase tables should be created in the Supabase Dashboard.
// You can use the following SQL in the Supabase SQL Editor:
/*
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_name TEXT DEFAULT 'DealerFlow',
  address TEXT DEFAULT '',
  logo_url TEXT DEFAULT ''
);
INSERT INTO settings (id, company_name) VALUES (1, 'DealerFlow') ON CONFLICT (id) DO NOTHING;

CREATE TABLE users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT CHECK(role IN ('admin', 'manager', 'staff')),
  full_name TEXT
);
INSERT INTO users (username, password, role, full_name) 
VALUES ('admin', 'admin123', 'admin', 'System Administrator') ON CONFLICT (username) DO NOTHING;

CREATE TABLE routes (id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name TEXT UNIQUE);
CREATE TABLE srs (id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name TEXT UNIQUE);
CREATE TABLE delivery_boys (id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, name TEXT UNIQUE);
CREATE TABLE vans (id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, van_no TEXT UNIQUE);

CREATE TABLE products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  pieces_per_carton INTEGER DEFAULT 1,
  unit_price REAL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  profit_percent REAL DEFAULT 0
);

CREATE TABLE stock (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  product_id BIGINT REFERENCES products(id),
  cartons INTEGER DEFAULT 0,
  pieces INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE operations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT CHECK(type IN ('issue', 'return', 'damage')),
  date DATE DEFAULT CURRENT_DATE,
  sr_id BIGINT REFERENCES srs(id),
  route_id BIGINT REFERENCES routes(id),
  delivery_boy_id BIGINT REFERENCES delivery_boys(id),
  van_id BIGINT REFERENCES vans(id),
  notes TEXT
);

CREATE TABLE operation_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  operation_id BIGINT REFERENCES operations(id),
  product_id BIGINT REFERENCES products(id),
  cartons INTEGER DEFAULT 0,
  pieces INTEGER DEFAULT 0
);

CREATE TABLE dues (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_name TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE due_collections (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  due_id BIGINT REFERENCES dues(id),
  amount_collected REAL NOT NULL,
  collection_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  amount REAL,
  description TEXT
);
*/
console.log("Supabase client initialized. Please ensure tables are created in the Supabase dashboard.");

const app = express();
app.use(express.json());

export default app;

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    // Check if admin exists, if not create it
    const { data: adminUser } = await supabase.from("users").select("id").eq("username", "admin").maybeSingle();
    if (!adminUser) {
      console.log("Admin user not found, creating default admin...");
      await supabase.from("users").insert([{ 
        username: "admin", 
        password: "admin123", 
        role: "admin", 
        full_name: "System Administrator" 
      }]);
    }

    const { data, error } = await supabase.from("users").select("count", { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: "ok", message: "Database connected", userCount: data });
  } catch (err: any) {
    console.error("Health check failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  const { data, error } = await supabase.from("users").select("id, username, role, full_name");
  if (error) return res.status(500).json(error);
  res.json(data);
});

app.post("/api/users", async (req, res) => {
  const { username, password, role, full_name } = req.body;
  const { data, error } = await supabase.from("users").insert([{ username, password, role, full_name }]).select().single();
  if (error) return res.status(400).json({ error: "Username already exists or invalid data" });
  res.json({ id: data.id });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for user: ${username}`);
  
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, role, full_name")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle(); // Use maybeSingle to avoid error if not found
    
    if (error) {
      console.error("Supabase login error:", error);
      return res.status(500).json({ success: false, error: "Database connection error" });
    }

    if (data) {
      console.log(`Login successful for user: ${username}`);
      res.json({ success: true, user: data });
    } else {
      console.log(`Login failed for user: ${username} - Invalid credentials`);
      res.status(401).json({ success: false, error: "Invalid username or password" });
    }
  } catch (err) {
    console.error("Unexpected login error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/api/users/change-password", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const { data: user } = await supabase.from("users").select("id").eq("id", userId).eq("password", oldPassword).single();
  
  if (user) {
    await supabase.from("users").update({ password: newPassword }).eq("id", userId);
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "পুরানো পাসওয়ার্ডটি সঠিক নয়" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  await supabase.from("users").delete().eq("id", req.params.id);
  res.json({ success: true });
});

app.post("/api/masters/:type", async (req, res) => {
  const { type } = req.params;
  const { name, van_no } = req.body;
  
  let result;
  if (type === 'routes') {
    result = await supabase.from("routes").insert([{ name }]).select().single();
  } else if (type === 'srs') {
    result = await supabase.from("srs").insert([{ name }]).select().single();
  } else if (type === 'delivery_boys') {
    result = await supabase.from("delivery_boys").insert([{ name }]).select().single();
  } else if (type === 'vans') {
    result = await supabase.from("vans").insert([{ van_no }]).select().single();
  }
  
  res.json({ id: result?.data?.id });
});

app.delete("/api/masters/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  await supabase.from(type).delete().eq("id", id);
  res.json({ success: true });
});

app.get("/api/settings", async (req, res) => {
  try {
    const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    res.json(data || { company_name: 'DealerFlow', address: '', logo_url: '' });
  } catch (err) {
    console.error("Settings fetch error:", err);
    res.json({ company_name: 'DealerFlow', address: '', logo_url: '' });
  }
});

app.post("/api/settings", async (req, res) => {
  const { company_name, address, logo_url } = req.body;
  await supabase.from("settings").update({ company_name, address, logo_url }).eq("id", 1);
  res.json({ success: true });
});

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: salesItems, error: salesError } = await supabase.from("operation_items")
      .select("cartons, pieces, products(unit_price, pieces_per_carton), operations!inner(type, date)")
      .eq("operations.type", "issue")
      .eq("operations.date", today);

    if (salesError) console.error("Sales stats error:", salesError);

    const todaySalesTotal = salesItems?.reduce((acc, item: any) => {
      const p = item.products;
      if (!p) return acc;
      return acc + (item.cartons * p.unit_price * p.pieces_per_carton + item.pieces * p.unit_price);
    }, 0) || 0;

    const { data: pendingDues, error: duesError } = await supabase.from("dues").select("remaining_amount").eq("status", "pending");
    if (duesError) console.error("Dues stats error:", duesError);
    const totalDues = pendingDues?.reduce((acc, d) => acc + (d.remaining_amount || 0), 0) || 0;
    
    const { data: stockData, error: stockError } = await supabase.from("stock").select("cartons, pieces, products!inner(min_stock_level, pieces_per_carton)");
    if (stockError) console.error("Stock stats error:", stockError);
    const lowStockCount = stockData?.filter((s: any) => {
      if (!s.products) return false;
      const totalPieces = (s.cartons * s.products.pieces_per_carton) + s.pieces;
      return totalPieces < s.products.min_stock_level;
    }).length || 0;

    res.json({
      todaySales: todaySalesTotal,
      totalDues: totalDues,
      lowStockCount: lowStockCount
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.json({ todaySales: 0, totalDues: 0, lowStockCount: 0 });
  }
});

app.get("/api/products", async (req, res) => {
  const { data } = await supabase.from("products").select("*, stock(cartons, pieces)");
  const formatted = data?.map((p: any) => ({
    ...p,
    cartons: p.stock?.[0]?.cartons || 0,
    pieces: p.stock?.[0]?.pieces || 0
  }));
  res.json(formatted || []);
});

app.post("/api/products", async (req, res) => {
  const { name, category, pieces_per_carton, unit_price, min_stock_level, cartons, pieces, profit_percent } = req.body;
  const { data: product, error: pError } = await supabase.from("products")
    .insert([{ name, category, pieces_per_carton, unit_price, min_stock_level, profit_percent: profit_percent || 0 }])
    .select().single();
  
  if (pError) return res.status(400).json(pError);

  await supabase.from("stock").insert([{ product_id: product.id, cartons: cartons || 0, pieces: pieces || 0 }]);
  await normalizeStock(product.id);
    
  res.json({ id: product.id });
});

app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, pieces_per_carton, unit_price, min_stock_level, profit_percent } = req.body;
  await supabase.from("products").update({ name, category, pieces_per_carton, unit_price, min_stock_level, profit_percent: profit_percent || 0 }).eq("id", id);
  res.json({ success: true });
});

app.post("/api/stock/add", async (req, res) => {
  const { product_id, cartons, pieces } = req.body;
  const { data: current } = await supabase.from("stock").select("cartons, pieces").eq("product_id", product_id).single();
  if (current) {
    await supabase.from("stock").update({ 
      cartons: (current.cartons || 0) + (cartons || 0), 
      pieces: (current.pieces || 0) + (pieces || 0) 
    }).eq("product_id", product_id);
    await normalizeStock(product_id);
  }
  res.json({ success: true });
});

app.get("/api/masters", async (req, res) => {
  const [r, s, d, v] = await Promise.all([
    supabase.from("routes").select("*"),
    supabase.from("srs").select("*"),
    supabase.from("delivery_boys").select("*"),
    supabase.from("vans").select("*")
  ]);
  res.json({
    routes: r.data || [],
    srs: s.data || [],
    delivery_boys: d.data || [],
    vans: v.data || []
  });
});

app.get("/api/issued-items/:date/:delivery_boy_id", async (req, res) => {
  const { date, delivery_boy_id } = req.params;
  
  const { data: op } = await supabase.from("operations")
    .select("sr_id, route_id, van_id")
    .eq("type", "issue").eq("date", date).eq("delivery_boy_id", delivery_boy_id)
    .limit(1).single();

  const { data: items } = await supabase.from("operation_items")
    .select("product_id, cartons, pieces, products(name)")
    .eq("operations.type", "issue")
    .eq("operations.date", date)
    .eq("operations.delivery_boy_id", delivery_boy_id);

  // Group by product_id manually since Supabase doesn't support GROUP BY in simple select
  const groupedItems: any[] = [];
  items?.forEach((item: any) => {
    const existing = groupedItems.find(i => i.product_id === item.product_id);
    if (existing) {
      existing.cartons += item.cartons;
      existing.pieces += item.pieces;
    } else {
      groupedItems.push({
        product_id: item.product_id,
        product_name: item.products.name,
        cartons: item.cartons,
        pieces: item.pieces
      });
    }
  });
  
  res.json({ items: groupedItems, metadata: op });
});

app.post("/api/operations", async (req, res) => {
  const { type, date, sr_id, route_id, delivery_boy_id, van_id, items } = req.body;
  
  const { data: op, error: opError } = await supabase.from("operations")
    .insert([{ type, date, sr_id, route_id, delivery_boy_id, van_id }])
    .select().single();

  if (opError) return res.status(400).json(opError);

  for (const item of items) {
    await supabase.from("operation_items").insert([{ operation_id: op.id, product_id: item.product_id, cartons: item.cartons, pieces: item.pieces }]);
    
    const { data: currentStock } = await supabase.from("stock").select("cartons, pieces").eq("product_id", item.product_id).single();
    if (currentStock) {
      if (type === 'issue') {
        await supabase.from("stock").update({
          cartons: (currentStock.cartons || 0) - (item.cartons || 0),
          pieces: (currentStock.pieces || 0) - (item.pieces || 0)
        }).eq("product_id", item.product_id);
        await normalizeStock(item.product_id);
      } else if (type === 'return') {
        await supabase.from("stock").update({
          cartons: (currentStock.cartons || 0) + (item.cartons || 0),
          pieces: (currentStock.pieces || 0) + (item.pieces || 0)
        }).eq("product_id", item.product_id);
        await normalizeStock(item.product_id);
      }
    }
  }
  res.json({ id: op.id });
});

app.get("/api/operations/combined/:date/:delivery_boy_id", async (req, res) => {
  const { date, delivery_boy_id } = req.params;
  
  const { data: items } = await supabase.from("operation_items")
    .select("cartons, pieces, product_id, products(name), operations!inner(type, date, delivery_boy_id)")
    .eq("operations.date", date)
    .eq("operations.delivery_boy_id", delivery_boy_id);

  const combined: any[] = [];
  items?.forEach((item: any) => {
    let entry = combined.find(c => c.product_id === item.product_id);
    if (!entry) {
      entry = {
        product_id: item.product_id,
        product_name: item.products.name,
        issue_cartons: 0, issue_pieces: 0,
        return_cartons: 0, return_pieces: 0,
        damage_cartons: 0, damage_pieces: 0
      };
      combined.push(entry);
    }
    const type = item.operations.type;
    entry[`${type}_cartons`] += item.cartons;
    entry[`${type}_pieces`] += item.pieces;
  });
  
  res.json(combined);
});

app.put("/api/operations/combined", async (req, res) => {
  const { date, delivery_boy_id, items } = req.body;
  
  for (const item of items) {
    const types = ['issue', 'return', 'damage'];
    for (const type of types) {
      let { data: op } = await supabase.from("operations")
        .select("id")
        .eq("date", date).eq("delivery_boy_id", delivery_boy_id).eq("type", type)
        .single();
      
      if (!op && (item[`${type}_cartons`] > 0 || item[`${type}_pieces`] > 0)) {
        const { data: meta } = await supabase.from("operations")
          .select("sr_id, route_id, van_id")
          .eq("date", date).eq("delivery_boy_id", delivery_boy_id)
          .limit(1).single();
          
        const { data: newOp } = await supabase.from("operations")
          .insert([{ type, date, sr_id: meta?.sr_id || null, route_id: meta?.route_id || null, delivery_boy_id, van_id: meta?.van_id || null }])
          .select().single();
        op = newOp;
      }

      if (op) {
        const { data: oldItem } = await supabase.from("operation_items")
          .select("cartons, pieces")
          .eq("operation_id", op.id).eq("product_id", item.product_id)
          .single();
        
        const newCartons = item[`${type}_cartons`];
        const newPieces = item[`${type}_pieces`];
        
        if (oldItem) {
          const diffCartons = newCartons - oldItem.cartons;
          const diffPieces = newPieces - oldItem.pieces;
          
          await supabase.from("operation_items").update({ cartons: newCartons, pieces: newPieces }).eq("operation_id", op.id).eq("product_id", item.product_id);
            
          const { data: currentStock } = await supabase.from("stock").select("cartons, pieces").eq("product_id", item.product_id).single();
          if (currentStock) {
            if (type === 'issue') {
              await supabase.from("stock").update({
                cartons: (currentStock.cartons || 0) - diffCartons,
                pieces: (currentStock.pieces || 0) - diffPieces
              }).eq("product_id", item.product_id);
              await normalizeStock(item.product_id);
            } else if (type === 'return') {
              await supabase.from("stock").update({
                cartons: (currentStock.cartons || 0) + diffCartons,
                pieces: (currentStock.pieces || 0) + diffPieces
              }).eq("product_id", item.product_id);
              await normalizeStock(item.product_id);
            }
          }
        } else if (newCartons > 0 || newPieces > 0) {
          await supabase.from("operation_items").insert([{ operation_id: op.id, product_id: item.product_id, cartons: newCartons, pieces: newPieces }]);
            
          const { data: currentStock } = await supabase.from("stock").select("cartons, pieces").eq("product_id", item.product_id).single();
          if (currentStock) {
            if (type === 'issue') {
              await supabase.from("stock").update({
                cartons: (currentStock.cartons || 0) - newCartons,
                pieces: (currentStock.pieces || 0) - newPieces
              }).eq("product_id", item.product_id);
              await normalizeStock(item.product_id);
            } else if (type === 'return') {
              await supabase.from("stock").update({
                cartons: (currentStock.cartons || 0) + newCartons,
                pieces: (currentStock.pieces || 0) + newPieces
              }).eq("product_id", item.product_id);
              await normalizeStock(item.product_id);
            }
          }
        }
      }
    }
  }
  res.json({ success: true });
});

app.get("/api/reports/invoice/:date", async (req, res) => {
  const { date } = req.params;
  const delivery_boy_id = req.query.delivery_boy_id as string;
  
  let query = supabase.from("products").select("*, operation_items(cartons, pieces, operations!inner(type, date, delivery_boy_id))")
    .eq("operation_items.operations.date", date);
  
  if (delivery_boy_id && delivery_boy_id !== 'undefined' && delivery_boy_id !== 'null') {
    query = query.eq("operation_items.operations.delivery_boy_id", delivery_boy_id);
  }
  
  const { data } = await query;
  
  const report = data?.map((p: any) => {
    const stats = {
      issued_cartons: 0, issued_pieces: 0,
      returned_cartons: 0, returned_pieces: 0,
      damaged_cartons: 0, damaged_pieces: 0
    };
    p.operation_items?.forEach((oi: any) => {
      const type = oi.operations.type;
      stats[`${type}_cartons`] += oi.cartons;
      stats[`${type}_pieces`] += oi.pieces;
    });
    return {
      name: p.name,
      unit_price: p.unit_price,
      pieces_per_carton: p.pieces_per_carton,
      ...stats
    };
  }).filter(r => r.issued_cartons > 0 || r.issued_pieces > 0 || r.returned_cartons > 0 || r.returned_pieces > 0 || r.damaged_cartons > 0 || r.damaged_pieces > 0);
  
  res.json(report || []);
});

app.get("/api/dues", async (req, res) => {
  const { data } = await supabase.from("dues").select("*").neq("status", "paid").order("date", { ascending: false });
  res.json(data || []);
});

app.post("/api/dues", async (req, res) => {
  const { customer_name, amount, date } = req.body;
  const { data } = await supabase.from("dues")
    .insert([{ customer_name, total_amount: amount, remaining_amount: amount, date: date || new Date().toISOString().split('T')[0] }])
    .select().single();
  res.json({ id: data?.id });
});

app.post("/api/dues/collect", async (req, res) => {
  const { due_id, amount_collected } = req.body;
  
  await supabase.from("due_collections").insert([{ due_id, amount_collected }]);
  
  const { data: due } = await supabase.from("dues").select("remaining_amount").eq("id", due_id).single();
  if (due) {
    const newRemaining = due.remaining_amount - amount_collected;
    const status = newRemaining <= 0 ? 'paid' : 'pending';
    await supabase.from("dues").update({ remaining_amount: newRemaining, status }).eq("id", due_id);
    res.json({ newRemaining, status });
  } else {
    res.status(404).json({ error: "Due record not found" });
  }
});

app.get("/api/expenses", async (req, res) => {
  const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false });
  res.json(data || []);
});

app.get("/api/profit/analysis", async (req, res) => {
  const { data: sales } = await supabase.from("operation_items")
    .select("cartons, pieces, products(unit_price, pieces_per_carton, profit_percent), operations!inner(type, date)");

  const { data: expenses } = await supabase.from("expenses").select("amount, date");

  const monthlyData: any = {};

  sales?.forEach((item: any) => {
    const month = item.operations.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { grossProfit: 0, expenses: 0 };
    
    const p = item.products;
    const profit = (item.cartons * p.pieces_per_carton + item.pieces) * p.unit_price * (p.profit_percent / 100.0);
    
    if (item.operations.type === 'issue') {
      monthlyData[month].grossProfit += profit;
    } else if (item.operations.type === 'return') {
      monthlyData[month].grossProfit -= profit;
    }
  });

  expenses?.forEach((e: any) => {
    const month = e.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { grossProfit: 0, expenses: 0 };
    monthlyData[month].expenses += e.amount;
  });

  const monthlyAnalysis = Object.keys(monthlyData).sort().map(month => ({
    month,
    grossProfit: monthlyData[month].grossProfit,
    expenses: monthlyData[month].expenses,
    netProfit: monthlyData[month].grossProfit - monthlyData[month].expenses
  }));

  const totalGrossProfit = monthlyAnalysis.reduce((acc, curr) => acc + curr.grossProfit, 0);
  const totalExpenses = monthlyAnalysis.reduce((acc, curr) => acc + curr.expenses, 0);

  res.json({
    totalGrossProfit,
    totalExpenses,
    netProfit: totalGrossProfit - totalExpenses,
    monthlyAnalysis
  });
});

app.post("/api/expenses", async (req, res) => {
  const { category, amount, description, date } = req.body;
  await supabase.from("expenses").insert([{ category, amount, description, date: date || new Date().toISOString().split('T')[0] }]);
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
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

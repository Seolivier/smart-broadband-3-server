
import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 4000;

// ===============================
// 🟢 CORS Configuration
// ===============================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://smart-broadband-3.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow curl/postman
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

// ===============================
// 🗄️ PostgreSQL Connection (Supabase)
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // important for Supabase self-signed SSL
});

// Test DB connection
pool.connect((err, client, release) => {
  if (err) console.error("❌ Error acquiring client:", err.message);
  else {
    console.log("✅ Connected to Supabase PostgreSQL database");
    release();
  }
});

// Ensure table exists
const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        location VARCHAR(255),
        service_type VARCHAR(100),
        serial_number VARCHAR(100),
        price DECIMAL(10,2),
        supporter VARCHAR(255),
        has_bonus BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Clients table ready");
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
  }
};
createTable();

// ===============================
// 🛠️ API ROUTES
// ===============================

// Get all clients with pagination
app.get("/api/clients", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      "SELECT * FROM clients ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    const totalCount = await pool.query("SELECT COUNT(*) FROM clients");
    const totalClients = parseInt(totalCount.rows[0].count);
    const totalPages = Math.ceil(totalClients / limit);

    res.json({
      data: result.rows,
      currentPage: page,
      totalPages,
      totalClients,
    });
  } catch (err) {
    console.error("❌ Error fetching clients:", err.message);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// Get single client
app.get("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM clients WHERE id = $1", [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Client not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching client:", err.message);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

// Create client
app.post("/api/clients", async (req, res) => {
  try {
    const { full_name, email, phone, location, service_type, serial_number, price, supporter, has_bonus } = req.body;

    const result = await pool.query(
      `INSERT INTO clients 
      (full_name,email,phone,location,service_type,serial_number,price,supporter,has_bonus)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [full_name, email, phone, location, service_type, serial_number, price, supporter, has_bonus]
    );

    res.json({ message: "✅ Client added successfully", client: result.rows[0] });
  } catch (err) {
    console.error("❌ Error adding client:", err.message);
    res.status(500).json({ error: "Failed to add client" });
  }
});

// Update client
app.put("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, location, service_type, serial_number, price, supporter, has_bonus } = req.body;

    const result = await pool.query(
      `UPDATE clients SET
        full_name=$1,
        email=$2,
        phone=$3,
        location=$4,
        service_type=$5,
        serial_number=$6,
        price=$7,
        supporter=$8,
        has_bonus=$9,
        updated_at=NOW()
      WHERE id=$10 RETURNING *`,
      [full_name, email, phone, location, service_type, serial_number, price, supporter, has_bonus, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Client not found" });

    res.json({ message: "✅ Client updated successfully", client: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating client:", err.message);
    res.status(500).json({ error: "Failed to update client" });
  }
});

// Delete client
app.delete("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM clients WHERE id=$1 RETURNING *", [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Client not found" });

    res.json({ message: "✅ Client deleted successfully", client: result.rows[0] });
  } catch (err) {
    console.error("❌ Error deleting client:", err.message);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "✅ Smart Broadband Server is running!", timestamp: new Date().toISOString() });
});

// ===============================
// 🚀 Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🌐 Allowed Origins:", allowedOrigins);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? "Supabase Connected" : "Not configured"}`);
});





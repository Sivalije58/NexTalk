import express from "express";
import cors from "cors";
import pkg from "pg";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";



dotenv.config({ path: '.env', quiet: true });



const { Pool } = pkg;
const app = express();



app.use(cors());
app.use(express.json());



//// 🔗 PostgreSQL Connection

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false 
  }
});



// ✅ Database Initialization (Automatic table creation)

const initDB = async () => {
  try {

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

    `);



    // Messages table (Includes DROP option for reset logic)

    await pool.query("DROP TABLE IF EXISTS messages CASCADE;"); 
    await pool.query(`

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ All tables are ready!");
  } catch (err) {
    console.error("❌ Database initialization error:", err);
  }
};

initDB();



// HTTP + WS server setup

const server = http.createServer(app);
const wss = new WebSocketServer({ server });



wss.on("connection", (ws) => {
  console.log("🟢 New user connected!");
  ws.on("close", () => console.log("🔴 User disconnected!"));
});



// ───────────── API ROUTES ─────────────



// 🟢 GET all users (Required for Available Users list)
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT username FROM users ORDER BY username ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});



// 🟢 GET all messages
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM messages ORDER BY created_at ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error loading messages." });
  }
});



// 🟢 POST new message + Real-time broadcast
app.post("/api/messages", async (req, res) => {
  try {
    const { username, content } = req.body;
    const result = await pool.query(
      "INSERT INTO messages (username, content) VALUES ($1, $2) RETURNING *",
      [username, content]
    );

    const newMessage = result.rows[0];
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "message", data: newMessage }));
      }
    });

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Error saving message." });
  }
});



// ✅ User Login (Saves/Ensures user exists in the database)
app.post("/api/login", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username not found." });
  try {
    await pool.query("INSERT INTO users (username) VALUES ($1) ON CONFLICT (username) DO NOTHING", [username]);
    res.json({ success: true, username });
  } catch (err) {
    res.status(500).json({ error: "Login error." });
  }
});



// ❌ SOS: Delete all messages
app.delete("/api/sos", async (req, res) => {
  try {
    await pool.query("DELETE FROM messages");
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "delete_all" }));
      }
    });

    res.json({ message: "All messages deleted." });
  } catch (err) {
    res.status(500).json({ error: "SOS error." });
  }
});



// 🚀 Start server

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});  

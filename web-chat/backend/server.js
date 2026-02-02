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

// ✅ Database Initialization (Create tables if they don't exist)
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

    // Messages table (Includes the recipient column for 1:1 chat)
    // NOTE: DROP TABLE removed to prevent data loss on every restart
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        recipient VARCHAR(255), 
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ Tables are ready!");
  } catch (err) {
    console.error("❌ Database initialization error:", err);
  }
};

initDB();

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🟢 New user connected to WebSocket!");
  ws.on("close", () => console.log("🔴 User disconnected!"));
});

// ───────────── API ROUTES ─────────────

// 🟢 GET: All users (For the Available Users list)
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT username FROM users ORDER BY username ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users." });
  }
});

// 🟢 GET: Private messages between two specific users
app.get("/api/messages/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (username = $1 AND recipient = $2) 
       OR (username = $2 AND recipient = $1) 
       ORDER BY created_at ASC`,
      [user1, user2]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error loading private messages." });
  }
});

// 🟢 POST: New message + Real-time broadcast via WebSocket
app.post("/api/messages", async (req, res) => {
  try {
    const { username, content, recipient } = req.body;
    const result = await pool.query(
      "INSERT INTO messages (username, content, recipient) VALUES ($1, $2, $3) RETURNING *",
      [username, content, recipient]
    );

    const newMessage = result.rows[0];
    
    // Broadcast the new message to all connected WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "message", data: newMessage }));
      }
    });

    res.status(201).json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error sending message." });
  }
});

// ✅ Login: Ensure user exists in the database
app.post("/api/login", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is missing." });
  try {
    await pool.query("INSERT INTO users (username) VALUES ($1) ON CONFLICT (username) DO NOTHING", [username]);
    res.json({ success: true, username });
  } catch (err) {
    res.status(500).json({ error: "Login error." });
  }
});

// ❌ SOS: Delete all messages (Global wipe)
app.delete("/api/sos", async (req, res) => {
  try {
    await pool.query("DELETE FROM messages");
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "delete_all" }));
      }
    });
    res.json({ message: "All messages have been deleted." });
  } catch (err) {
    res.status(500).json({ error: "SOS command error." });
  }
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
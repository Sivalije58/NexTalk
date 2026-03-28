import express from "express";
import http from "http";
import pg from "pg";
const { Pool } = pg;
import cors from "cors";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);

// ✅ WebSocket Setup
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false },
});

// ───────────── API ROUTES (AUTH & USERS) ─────────────

app.post("/api/login", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username not found." });
  try {
    await pool.query(
      "INSERT INTO users (username) VALUES ($1) ON CONFLICT (username) DO NOTHING", 
      [username]
    );
    res.json({ success: true, username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login error in DB." });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT username FROM users ORDER BY username ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────── API ROUTES (CHAT CORE) ─────────────

// 1. Global chat with LIMIT.
app.get("/api/messages", async (req, res) => {
  const limit = 20;
  const offset = req.query.offset || 0;
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE room_id IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: err.message });
  }
});
// 2. Private chat with  LIMIT-om (Old route changed)
app.get("/api/messages/:room_id", async (req, res) => {
  const { room_id } = req.params;
  const limit = 20;
  const offset = req.query.offset || 0;
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", 
      [room_id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Sending messages.
app.post("/api/messages", async (req, res) => {
  const { username, content, room_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO messages (username, content, room_id) VALUES ($1, $2, $3) RETURNING *",
      [username, content, room_id || null]
    );
    
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "message", data: result.rows[0] }));
      }
    });
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update and 5. Delete stay the same as before...
app.put("/api/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const result = await pool.query("UPDATE messages SET content = $1 WHERE id = $2 RETURNING *", [content, id]);
    wss.clients.forEach(client => { if (client.readyState === 1) client.send(JSON.stringify({ type: "edit", data: result.rows[0] })); });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/messages/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM messages WHERE id = $1", [id]);
    wss.clients.forEach(client => { if (client.readyState === 1) client.send(JSON.stringify({ type: "delete", id })); });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ───────────── ROOMS & SOS ─────────────

app.post("/api/rooms/join", async (req, res) => {
  const { user1, user2, room_id } = req.body;
  try {
    const existing = await pool.query("SELECT * FROM active_chats WHERE room_id = $1", [room_id]);
    if (existing.rows.length === 0) {
      const newUser = await pool.query("INSERT INTO active_chats (user1, user2, room_id) VALUES ($1, $2, $3) RETURNING *", [user1, user2, room_id]);
      res.json(newUser.rows[0]);
    } else { res.json(existing.rows[0]); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/rooms/leave", async (req, res) => {
  const { room_id } = req.body;
  try {
    await pool.query("DELETE FROM active_chats WHERE room_id = $1", [room_id]);
    res.json({ message: "Room deleted." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/sos", async (req, res) => {
  try {
    await pool.query("DELETE FROM messages");
    await pool.query("DELETE FROM active_chats");
    wss.clients.forEach(client => { if (client.readyState === 1) client.send(JSON.stringify({ type: "delete_all" })); });
    res.json({ message: "Everything deleted." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 500
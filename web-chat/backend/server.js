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

// ✅ NOVA LOGIN RUTA (VRAĆENA)
app.post("/api/login", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username not found." });

  try {
    // Proverava da li korisnik postoji, ako ne, pravi ga u bazi
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

// RUTA ZA DOBIJANJE LISTE SVIH KORISNIKA
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT username FROM users ORDER BY username ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────── API ROUTES (1:1 CHAT) ─────────────

// 1. RUTA ZA SPAJANJE (JOIN)
app.post("/api/rooms/join", async (req, res) => {
  const { user1, user2, room_id } = req.body;
  try {
    const existing = await pool.query("SELECT * FROM active_chats WHERE room_id = $1", [room_id]);
    if (existing.rows.length === 0) {
      const newUser = await pool.query(
        "INSERT INTO active_chats (user1, user2, room_id) VALUES ($1, $2, $3) RETURNING *",
        [user1, user2, room_id]
      );
      res.json(newUser.rows[0]);
    } else {
      res.json(existing.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. RUTA ZA IZLAZAK (LEAVE)
app.post("/api/rooms/leave", async (req, res) => {
  const { room_id } = req.body;
  try {
    await pool.query("DELETE FROM active_chats WHERE room_id = $1", [room_id]);
    res.json({ message: "Soba obrisana, veza prekinuta." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PORUKE (Filtrirane po room_id)
app.get("/api/messages/:room_id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC",
      [req.params.room_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SLANJE PORUKE
app.post("/api/messages", async (req, res) => {
  const { username, content, room_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO messages (username, content, room_id) VALUES ($1, $2, $3) RETURNING *",
      [username, content, room_id]
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

// ───────────── SYSTEM ROUTES ─────────────

// SOS: Briše sve poruke i sesije
app.delete("/api/sos", async (req, res) => {
  try {
    await pool.query("DELETE FROM messages");
    await pool.query("DELETE FROM active_chats");
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "delete_all" }));
      }
    });
    res.json({ message: "Sve obrisano" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server radi na portu ${PORT}`);
});
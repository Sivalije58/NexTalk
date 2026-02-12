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

// ✅ LOGIN RUTA
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

// LISTA KORISNIKA
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT username FROM users ORDER BY username ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────── API ROUTES (CHAT CORE: CRUD) ─────────────

// 1. DOBIJANJE PORUKA (Globalno ili po sobi)
app.get("/api/messages/:room_id?", async (req, res) => {
  const { room_id } = req.params;
  try {
    let result;
    if (room_id) {
      result = await pool.query("SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC", [room_id]);
    } else {
      result = await pool.query("SELECT * FROM messages WHERE room_id IS NULL ORDER BY created_at ASC");
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. SLANJE PORUKE
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

// 3. ✏️ UPDATE PORUKE (IZMENA)
app.put("/api/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    const result = await pool.query(
      "UPDATE messages SET content = $1 WHERE id = $2 RETURNING *",
      [content, id]
    );
    const updatedMsg = result.rows[0];

    // Obavesti sve klijente o izmeni
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "edit", data: updatedMsg }));
      }
    });

    res.json(updatedMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. 🗑️ DELETE PORUKE (BRISANJE)
app.delete("/api/messages/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM messages WHERE id = $1", [id]);

    // Obavesti sve klijente o brisanju
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "delete", id: id }));
      }
    });

    res.json({ message: "Poruka obrisana" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────── API ROUTES (1:1 ROOMS) ─────────────

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

app.post("/api/rooms/leave", async (req, res) => {
  const { room_id } = req.body;
  try {
    await pool.query("DELETE FROM active_chats WHERE room_id = $1", [room_id]);
    res.json({ message: "Soba obrisana" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────── SYSTEM ROUTES ─────────────

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
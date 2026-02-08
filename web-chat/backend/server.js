const express = require("express");
const http = require("http");
const { Pool } = require("pg");
const cors = require("cors");
const { Server } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new Server({ server });

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false },
});

// 1. RUTE for joining (JOIN)
app.post("/api/rooms/join", async (req, res) => {
  const { user1, user2, room_id } = req.body;
  try {
    // We check if the room exists.
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

// 2. Root for leaving (LEAVE)
app.post("/api/rooms/leave", async (req, res) => {
  const { room_id } = req.body;
  try {
    await pool.query("DELETE FROM active_chats WHERE room_id = $1", [room_id]);
    res.json({ message: "Soba obrisana, veza prekinuta." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Message Routes (Filtered by room_id)
app.get("/api/messages/:room_id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC",
      [req.params.room_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post("/api/messages", async (req, res) => {
  const { username, content, room_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO messages (username, content, room_id) VALUES ($1, $2, $3) RETURNING *",
      [username, content, room_id]
    );
    // Notification for everyone through WebSocket.
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ type: "message", data: result.rows[0] }));
    });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json(err);
  }
});

// SOS button
app.delete("/api/sos", async (req, res) => {
  await pool.query("DELETE FROM messages");
  await pool.query("DELETE FROM active_chats");
  wss.clients.forEach(client => client.send(JSON.stringify({ type: "delete_all" })));
  res.json({ message: "Sve obrisano" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server works on port: ${PORT}`));
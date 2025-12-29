import express from "express";
import cors from "cors";
import pkg from "pg";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config({ path: '.env', quiet: true });




const { Pool } = pkg;
const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

//// 🔗 PostgreSQL
const pool = new Pool({
 user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});



// ✅ Creating tables
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL
    );
  `);

  
};
initDB();

// Creating HTTP + WS server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("🟢 New user has connected!");
  ws.on("close", () => console.log("🔴 User has left!"));
});

// ───────────── API ROUTES ─────────────

// 🟢 Retrieve all messages
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM messages ORDER BY created_at ASC");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Error loading messages." });
  }
});

// 🟢 Save message + broadcast real-time ✅
app.post("/api/messages", async (req, res) => {
  try {
    const { username, content } = req.body;
    const result = await pool.query(
      "INSERT INTO messages (username, content) VALUES ($1, $2) RETURNING *",
      [username, content]
    );

    const newMessage = result.rows[0];

    // 📡 Broadcast WS to all clients
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "message", data: newMessage }));
      }
    });

    res.status(201).json(newMessage);
  } catch {
    res.status(500).json({ error: "Error loading messages." });
  }
});

// ✏️ Edit messages
app.put("/api/messages/:id", async (req, res) => {
  try {
    const { content } = req.body;
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE messages SET content = $1 WHERE id = $2 RETURNING *",
      [content, id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "Message doesn't exist." });

    const updated = result.rows[0];

    // Broadcast edit
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "edit", data: updated }));
      }
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Message editing error." });
  }
});

// ❌ Delete messages
app.delete("/api/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM messages WHERE id = $1", [id]);

    // broadcast delete
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: "delete", id }));
      }
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Message editing error." });
  }
});

// ✅ User Login
app.post("/api/login", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username not found." });

  await pool.query("INSERT INTO users (username) VALUES ($1) ON CONFLICT DO NOTHING", [username]);
  res.json({ success: true, username });
});

// ✅ Check the user
app.get("/api/users/check/:username", async (req, res) => {
  const { username } = req.params;
  const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  if (!result.rows.length) return res.status(404).json({ exists: false });

  res.json({ exists: true, user: result.rows[0] });
});

// 🚀 We run the backend (API + WS) on port 5000 ✅
const PORT = 5000;
server.listen(PORT, () => {});

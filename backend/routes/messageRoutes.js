import express from "express";
import pg from "pg";

const router = express.Router();


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


// 💬 GET — load all messages.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM messages ORDER BY created_at ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Loading messages error:", err.message);
    res.status(500).json({ error: "Loading messages error." });
  }
});

// 💌 POST — Save new message.
// POST /api/messages
router.post("/", async (req, res) => {

 // console.log("POST /api/messages body:", req.body); 


  const { username, content } = req.body;
  if (!username || !content) return res.status(400).json({ message: "Data is missing." });

  try {
    const result = await pool.query(
      "INSERT INTO messages (username, content) VALUES ($1, $2) RETURNING *",
      [username, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Writing message error:", err);

    console.error("Details:", err.message);

    res.status(500).json({ error: "Writing message error." });
  }
});


export default router;

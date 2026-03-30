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




pool.connect()
 



router.post("/", async (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ message: "Username is mandatory." });
  }

  try {
    // 1️⃣ Check if user exists.
    const found = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username.trim()]
    );

    if (found.rows.length > 0) {
      return res.status(200).json(found.rows[0]); // Existing user.
    }

    // 2️⃣ Add new user.
    const result = await pool.query(
      "INSERT INTO users (username) VALUES ($1) RETURNING *",
      [username.trim()]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding user:", err);
    return res.status(500).json({ error: "Error adding user." });
  }
});

export default router;

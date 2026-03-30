// controllers/userController.js
import { pool } from "../db/index.js";

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
  console.error("❌ Database query error:", err.message);
  res.status(500).json({ message: "Server error:", error: err.message });
}

};

// NEW: ADDING USERS
export const createUser = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: "Username is mandatory!" });
    }

    const result = await pool.query(
      "INSERT INTO users (username) VALUES ($1) RETURNING *",
      [username]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Adding user error:", err.message);
    res.status(500).json({ message: "Server error: ", error: err.message });
  }
};


// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User is not found." });
    }

    res.json({ message: "User deleted.", user: result.rows[0] });
  } catch (err) {
    console.error("❌ Deleting user error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};


// PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is mandatory!" });
    }

    const result = await pool.query(
      "UPDATE users SET username = $1 WHERE id = $2 RETURNING *",
      [username, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User is not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Changing user error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};




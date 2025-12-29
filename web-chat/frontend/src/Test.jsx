import { useEffect, useState } from "react";

function Test() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");   // for adding
  const [newName, setNewName] = useState("");     // for update

  // GET users
  const fetchUsers = () => {
    fetch("http://localhost:5000/api/users")
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  };

  // POST - adding users
  const addUser = () => {
    if (!username) return;

    fetch("http://localhost:5000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
      .then(res => res.json())
      .then(data => {
        setUsers(prev => [...prev, data]);
        setUsername("");
      })
      .catch(err => console.error(err));
  };

  // DELETE - deleting users
  const deleteUser = (id) => {
    fetch(`http://localhost:5000/api/users/${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(() => fetchUsers())
      .catch(err => console.error(err));
  };

  // UPDATE - change of username
  const updateUser = (id, newName) => {
    if (!newName) return;
    fetch(`http://localhost:5000/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newName }),
    })
      .then(res => res.json())
      .then(() => {
        fetchUsers();
        setNewName("");
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">NexTalk 👋</h1>

      {/* Input for adding */}
      <div className="mb-4">
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Add username..."
          className="p-2 border rounded mr-2"
        />
        <button onClick={addUser} className="p-2 bg-blue-500 text-white rounded">
          Add
        </button>
      </div>

      {/* User list with buttons */}
      <ul>
        {users.map((u) => (
          <li key={u.id} className="mb-2 flex items-center gap-2">
            {u.username}

            {/* Delete button */}
            <button
              onClick={() => deleteUser(u.id)}
              className="px-2 bg-red-500 text-white rounded"
            >
              🗑️
            </button>

            {/* Input, update button */}
            <input
              type="text"
              placeholder="New name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="p-1 border rounded"
            />
            <button
              onClick={() => updateUser(u.id, newName)}
              className="px-2 bg-green-500 text-white rounded"
            >
              ✏️
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Test;

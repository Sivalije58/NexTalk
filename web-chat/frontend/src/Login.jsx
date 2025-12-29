import { useState } from "react";

function Login({ setUsername }) {
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      // 🟢 Send a POST request to the backend to add/return a user.
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name.trim() }),
      });

      if (!res.ok) {
        throw new Error("Greška pri prijavi korisnika");
      }

      const data = await res.json();
      console.log("✅ Login uspešan:", data);

      // Save your username and go to the chat.
      setUsername(data.username);
    } catch (err) {
      console.error("❌ Error:", err);
      alert("I cannot connect to the server.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white">
      <h1 className="text-3xl font-bold mb-6">NexTalk</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-[#1e1e1e] p-6 rounded-lg shadow-md w-[300px]"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type username: "
          className="w-full p-2 rounded bg-[#2c2c2c] text-white mb-4 outline-none"
        />
        <button
          type="submit"
          className="w-full bg-[#444] hover:bg-[#555] p-2 rounded text-white"
        >
          Enter
        </button>
      </form>
    </div>
  );
}

export default Login;

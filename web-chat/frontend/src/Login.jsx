import { useState } from "react";

function Login({ setUsername }) {
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch("https://nextalk-backend-v4df.onrender.com/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name.trim() }),
      });

      if (!res.ok) {
        throw new Error("User login error.");
      }

      const data = await res.json();
      console.log("✅ Login successful:", data);

      setUsername(data.username);
    } catch (err) {
      console.error("❌ Error:", err);
      alert("I cannot connect to the server.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900 font-sans p-4">
      <h1 className="text-6xl font-black mb-8 tracking-tighter text-blue-600 italic">NexTalk</h1>

      <div className="bg-gray-100 p-8 rounded-2xl shadow-2xl w-full max-w-[400px] border border-gray-200">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type username: "
            className="w-full p-4 rounded-xl bg-white text-black mb-6 outline-none border border-gray-300 focus:border-blue-500 transition-all shadow-sm text-lg"
          />

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg flex justify-center items-center text-lg uppercase"
          >
            ENTER
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
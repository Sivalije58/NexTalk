import { useState } from "react";

function ConnectUsername({ onCancel, onConfirm }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white">
      <h2 className="text-2xl font-bold mb-4">Connect User</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-[#1e1e1e] p-6 rounded-lg shadow-md w-[300px]"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Username to connect:"
          className="w-full p-2 rounded bg-[#2c2c2c] text-white mb-4 outline-none"
        />

        <div className="flex gap-4 justify-center">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
          >
            ✅ Connect
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded text-white"
          >
            ❌ Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ConnectUsername;

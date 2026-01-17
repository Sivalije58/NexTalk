import { useState } from "react";

function ConnectUsername({ onCancel, onConfirm }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900 font-sans p-4">
      <h2 className="text-4xl font-black mb-6 tracking-tighter text-blue-600">Connect User</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-100 p-8 rounded-2xl shadow-2xl w-full max-w-[400px] border border-gray-200"
      >
        <p className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">Enter existing username</p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type Username: "
          className="w-full p-4 rounded-xl bg-white text-black mb-6 outline-none border border-gray-300 focus:border-blue-500 transition-all shadow-sm"
        />

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-all active:scale-95 shadow-md flex justify-center items-center gap-2"
          >
            ✅ CONNECT USER
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-4 bg-gray-400 hover:bg-gray-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-md"
          >
            ❌ CANCEL
          </button>


          <button
            type="button"
            onClick={() => {}} 
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all active:scale-95 shadow-md flex justify-center items-center gap-2"
          >
            📶 AVAILABLE USERS
          </button>


        </div>
      </form>
    </div>
  );
}

export default ConnectUsername;
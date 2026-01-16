import React from "react";

function DeleteAccount({ username, onCancel, onConfirm }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900 font-sans p-4">
      <h1 className="text-4xl font-black mb-6 tracking-tighter text-blue-600">NexTalk</h1>

      <div className="bg-gray-100 p-8 rounded-2xl shadow-2xl w-full max-w-[400px] border border-gray-200 text-center">
        <h2 className="text-xl font-black mb-4 uppercase tracking-tight text-gray-800">
          Delete Account
        </h2>
        
        <p className="mb-8 text-gray-600 leading-relaxed">
          Are you sure you want to permanently delete user: <br />
          <span className="font-black text-red-500 text-lg uppercase tracking-wider block mt-2">
            "{username}"
          </span>
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-all active:scale-95 shadow-md flex justify-center items-center gap-2"
          >
            ✅ YES
          </button>

          <button
            onClick={onCancel}
            className="w-full py-4 bg-gray-400 hover:bg-gray-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-md"
          >
            ❌ NO
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccount;
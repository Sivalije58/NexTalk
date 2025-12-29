import React from "react";

function DeleteAccount({ username, onCancel, onConfirm }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white">
      <h2 className="text-2xl font-bold mb-4">Delete Account</h2>
      <p className="mb-6 text-center">
        Are you sure you want to delete user:  <br />
        <span className="font-semibold text-red-400">"{username}"</span>?
      </p>

      <div className="flex gap-4">
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white"
        >
          ✅ Yes
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded text-white"
        >
          ❌ No
        </button>
      </div>
    </div>
  );
}

export default DeleteAccount;

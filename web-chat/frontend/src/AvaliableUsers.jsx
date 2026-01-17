import { useState, useEffect } from "react";

function AvailableUsers({ onCancel, onConnect }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetch("https://nextalk-backend-v4df.onrender.com/api/users") 
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900 font-sans p-4">
    
      <h2 className="text-4xl font-black mb-6 tracking-tighter text-blue-600 italic">Available Users</h2>

      <div className="bg-gray-100 p-6 rounded-2xl shadow-2xl w-full max-w-[400px] border border-gray-200">
        <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto mb-6 pr-2">
          {loading ? (
            <p className="text-center font-bold text-gray-400 uppercase tracking-widest">Loading users...</p>
          ) : users.length > 0 ? (
            users.map((user, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <span className="font-black text-gray-700 uppercase tracking-tight">{user.username}</span>
                <div className="flex gap-2">
                
                  <button 
                    onClick={() => onConnect(user.username)}
                    className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                  >
                    ✅
                  </button>
                  <button className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors">
                    ❌
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No users found.</p>
          )}
        </div>

      
        <button
          onClick={onCancel}
          className="w-full py-4 bg-gray-400 hover:bg-gray-500 text-white font-black rounded-xl transition-all active:scale-95 shadow-md uppercase"
        >
          BACK
        </button>
      </div>
    </div>
  );
}

export default AvailableUsers;
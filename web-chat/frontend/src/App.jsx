import { useState, useEffect, useRef } from "react";
import Login from "./Login";
import Chat from "./Chat"; 
import DeleteAccount from "./DeleteAccount";
import ConnectUsername from "./ConnectUsername";
import AvaliableUsers from "./AvaliableUsers"; 

function App() {
  // 🧱 State Management
  const [showAvailableUsers, setShowAvailableUsers] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const ws = useRef(null);
  const chatBoxRef = useRef(null);

  // 🔁 Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // 🔁 Automatic login using localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  // 🔗 WebSocket connection + Fetch initial messages
  useEffect(() => {
    if (username) {
      fetch("https://nextalk-backend-v4df.onrender.com/api/messages")
        .then((res) => res.json())
        .then((data) => setMessages(data))
        .catch((err) => console.error("❌ Loading messages error:", err));

      if (!ws.current) {
        ws.current = new WebSocket("wss://nextalk-backend-v4df.onrender.com");

        ws.current.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "message") {
              if (msg.data.username !== username) {
                setMessages((prev) => [...prev, { ...msg.data, sender: "other" }]);
              }
            } else if (msg.type === "edit") {
              setMessages(prev =>
                prev.map(m => (m.id === msg.data.id || m._id === msg.data.id ? { ...m, content: msg.data.content } : m))
              );
            } else if (msg.type === "delete") {
              setMessages(prev => prev.filter(m => m.id !== msg.id && m._id !== msg.id));
            }
          } catch (err) {
            console.error("❌ WebSocket parse error:", err);
          }
        };

        ws.current.onclose = () => { ws.current = null; };
      }
    }
    return () => { if (ws.current) ws.current.close(); };
  }, [username]);

  // ✉️ Send a new message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    try {
      const res = await fetch("https://nextalk-backend-v4df.onrender.com/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, content: text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { ...data, sender: "user" }]); 

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ 
          type: "message", 
          data: { id: data.id, username: data.username, content: data.content } 
        }));
      }
    } catch (err) {
      console.error("❌ Message sending error:", err);
    }
  };

  // ✏️ Update an existing message
  const handleUpdate = async (id) => {
    try {
      const res = await fetch(`https://nextalk-backend-v4df.onrender.com/api/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      const updatedData = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === id || m._id === id ? { ...m, content: updatedData.content } : m)));
      setEditingMessageId(null);
      setSelectedMessageId(null);
    } catch (error) {
      console.error("❌ Update error:", error);
    } 
  };

  // 🔴 Delete a specific message
  const handleDelete = async (id) => {
    try {
      await fetch(`https://nextalk-backend-v4df.onrender.com/api/messages/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((msg) => msg.id !== id && msg._id !== id));
      setSelectedMessageId(null);
    } catch (error) {
      console.error("❌ Deletion error:", error);
    }
  };

  // 👤 Switch user logic
  const handleConnect = async (name) => {
    try {
      const res = await fetch(`https://nextalk-backend-v4df.onrender.com/api/users/check/${name}`);
      if (res.ok) {
        setUsername(name);
        localStorage.setItem("username", name);
      } else {
        alert("User not found in the database.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ───────────── MODALS & SCREENS ─────────────

  // 1. First check if we should show the Available Users list
  if (showAvailableUsers) {
    return (
      <AvaliableUsers 
        onBackToConnect={() => {
          setShowAvailableUsers(false);
          setShowConnectModal(true);
        }}
        onConnect={(name) => { 
          handleConnect(name); 
          setShowAvailableUsers(false); 
        }} 
      />
    );
  }

  // 2. Then check if we should show the Connect (Switch) Modal
  if (showConnectModal) {
    return (
      <ConnectUsername 
        onCancel={() => setShowConnectModal(false)} 
        onShowAvailable={() => {
          setShowConnectModal(false);
          setShowAvailableUsers(true);
        }}
        onConfirm={(name) => { 
          handleConnect(name); 
          setShowConnectModal(false); 
        }} 
      />
    );
  }

  // 3. Then check for Delete confirmation
  if (showDeleteConfirm) {
    return (
      <DeleteAccount 
        username={username} 
        onCancel={() => setShowDeleteConfirm(false)} 
        onConfirm={async () => {
          await fetch(`https://nextalk-backend-v4df.onrender.com/api/users/${username}`, { method: "DELETE" });
          localStorage.removeItem("username");
          setUsername("");
          setMessages([]);
          setShowDeleteConfirm(false);
        }} 
      />
    );
  }

  // 4. ONLY IF NONE OF THE ABOVE, check if user is logged in
  if (!username) {
    return <Login setUsername={(name) => { setUsername(name); localStorage.setItem("username", name); }} />;
  }

  // ───────────── MAIN CHAT UI ─────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900 font-sans p-4">
      <h1 className="text-4xl font-black mb-6 tracking-tighter text-blue-600 italic">NexTalk</h1>

      <div className="w-full max-w-2xl flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200">
        <div
          ref={chatBoxRef}
          className="h-[500px] bg-gray-400 p-4 flex flex-col gap-4 overflow-y-auto"
          onClick={() => { setSelectedMessageId(null); setEditingMessageId(null); }}
        >
          {messages.map((msg, idx) => {
            const id = msg._id || msg.id || idx;
            const isSelected = selectedMessageId === id;
            const isEditing = editingMessageId === id;
            const isMe = msg.username === username;

            return (
              <div key={id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && <span className="text-xs font-bold text-orange-600 mb-1 ml-1 uppercase tracking-wider">{msg.username}</span>}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMessageId(isSelected ? null : id);
                    setEditContent(msg.content);
                  }}
                  className={`p-3 rounded-2xl max-w-[85%] break-words relative cursor-pointer transition-all ${
                    isMe ? "bg-blue-600 text-white rounded-tr-none shadow-md" : "bg-white text-gray-800 rounded-tl-none shadow-sm"
                  } ${isSelected ? "ring-2 ring-blue-400 shadow-lg" : ""}`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input 
                        autoFocus
                        value={editContent} 
                        onChange={(e) => setEditContent(e.target.value)} 
                        className="w-full bg-white text-black p-2 rounded border border-blue-500 outline-none" 
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleUpdate(id)} className="bg-green-500 px-2 py-1 rounded text-xs font-bold uppercase text-white">Save</button>
                        <button onClick={() => setEditingMessageId(null)} className="bg-gray-400 px-2 py-1 rounded text-xs font-bold uppercase text-white">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[15px] leading-relaxed">{msg.content}</span>
                      {isSelected && isMe && (
                        <div className="absolute -bottom-10 right-0 flex gap-2 bg-white p-1 rounded-lg border border-gray-200 z-10 shadow-xl">
                          <button onClick={(e) => { e.stopPropagation(); setEditingMessageId(id); }} className="hover:bg-yellow-100 p-2 rounded text-yellow-600 transition-colors">✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(id); }} className="hover:bg-red-100 p-2 rounded text-red-600 transition-colors">🗑️</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex p-3 bg-gray-100 border-t border-gray-200 gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Write a message..."
            className="flex-1 p-3 rounded-xl bg-white text-black outline-none border border-gray-300 focus:border-blue-500 transition-all"
          />
          <button onClick={sendMessage} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md">
            <span>SEND ✈️</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-2 mt-6 gap-4">
        <button onClick={() => setShowDeleteConfirm(true)} className="py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl transition-colors shadow-md uppercase">Delete Account</button>
        <button onClick={async () => { await fetch("https://nextalk-backend-v4df.onrender.com/api/sos", { method: "DELETE" }); localStorage.clear(); window.location.reload(); }} className="py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-colors shadow-md uppercase">⚠️ SOS (WIPE)</button>
        <button onClick={() => setShowConnectModal(true)} className="py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-colors shadow-md uppercase">Connect ➕</button>
        <button onClick={() => setShowAvailableUsers(true)} className="py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl transition-colors shadow-md uppercase">📶 Available</button>
      </div>
    </div>
  );
}

export default App;
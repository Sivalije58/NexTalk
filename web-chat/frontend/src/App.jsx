import { useState, useEffect, useRef } from "react";
import Login from "./Login";
import Chat from "./Chat"; 
import DeleteAccount from "./DeleteAccount";
import ConnectUsername from "./ConnectUsername";

function App() {
  // 🧱 State
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

  // 🔁 Automatic login from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  // 🔗 WebSocket connection + Fetch initial messages
  useEffect(() => {
    if (username) {
      // Load all messages from the database
      fetch("https://nextalk-backend-v4df.onrender.com/api/messages")
        .then((res) => res.json())
        .then((data) => setMessages(data))
        .catch((err) => console.error("❌ Loading messages error:", err));

      // Initialize WebSocket if not already connected
      if (!ws.current) {
        ws.current = new WebSocket("wss://nextalk-backend-v4df.onrender.com");

        ws.current.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === "message") {
              // Only add the message if it's from another user
              if (msg.data.username !== username) {
                setMessages((prev) => [...prev, { 
                  id: msg.data.id, 
                  username: msg.data.username, 
                  content: msg.data.content,
                  sender: "other" 
                }]);
              }
            } else if (msg.type === "edit") {
              // Update the specific message content in the list
              setMessages(prev =>
                prev.map(m => (m.id === msg.data.id || m._id === msg.data.id ? { ...m, content: msg.data.content } : m))
              );
            } else if (msg.type === "delete") {
              // Remove the deleted message from the list
              setMessages(prev => prev.filter(m => m.id !== msg.id && m._id !== msg.id));
            }
          } catch (err) {
            console.error("❌ WebSocket parse error:", err);
          }
        };

        ws.current.onclose = () => {
          console.log("WS Disconnected. Reconnecting logic can be added here.");
          ws.current = null;
        };
      }
    }

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [username]);

  // ✉️ Send message to API and broadcast via WebSocket
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

      if (!res.ok) throw new Error("Error sending message to database.");

      const data = await res.json();
      
      // Update local state immediately
      setMessages((prev) => [...prev, { ...data, sender: "user" }]); 

      // Broadcast message to others using JSON format
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ 
          type: "message", 
          data: { 
            id: data.id, 
            username: data.username, 
            content: data.content 
          } 
        }));
      }
    } catch (err) {
      console.error("❌ Message sending error:", err);
    }
  };

  // ✏️ Handle message update
  const handleUpdate = async (id) => {
     try {
      const res = await fetch(`https://nextalk-backend-v4df.onrender.com/api/messages/${id}`, {
        method: "PUT", // Mora biti PUT za izmenu
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error("Updating message error.");
      const updatedData = await res.json();

      setMessages((prev) =>
        prev.map((m) => (m.id === id || m._id === id ? { ...m, content: updatedData.content } : m))
      );
      setEditingMessageId(null);
      setSelectedMessageId(null);
    } catch (error) {
      console.error("❌ Update error:", error);
    } 
  };

  // 🔴 Handle message deletion
  const handleDelete = async (id) => {
   try {
      const res = await fetch(`https://nextalk-backend-v4df.onrender.com/api/messages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Deleting message error.");

      setMessages((prev) => prev.filter((msg) => msg.id !== id && msg._id !== id));
      setSelectedMessageId(null);
    } catch (error) {
      console.error("❌ Deletion error:", error);
    }
  };

  // 👤 Connect existing user
  const handleConnect = async (name) => {
    try {
      const res = await fetch(`https://nextalk-backend-v4df.onrender.com/api/users/check/${name}`);
      if (res.ok) {
        setUsername(name);
        localStorage.setItem("username", name);
      } else {
        alert("User error or not found.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Conditional Rendering for Modals
  if (showConnectModal) {
    return <ConnectUsername onCancel={() => setShowConnectModal(false)} onConfirm={(name) => { handleConnect(name); setShowConnectModal(false); }} />;
  }

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

  // If not logged in, show Login screen
  if (!username) return <Login setUsername={(name) => { setUsername(name); localStorage.setItem("username", name); }} />;

  // Main Chat UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] text-white font-sans p-4">
      <h1 className="text-4xl font-black mb-6 tracking-tighter text-blue-500">NexTalk</h1>

      {/* 2. Responsive Width: max-w-2xl (approx 670px) for better desktop experience */}
      <div className="w-full max-w-2xl flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-800">
        
        {/* Chat Messages Area */}
        <div
          ref={chatBoxRef}
          className="h-[500px] bg-[#161616] p-4 flex flex-col gap-4 overflow-y-auto"
          onClick={() => { setSelectedMessageId(null); setEditingMessageId(null); }}
        >
          {messages.map((msg, idx) => {
            const id = msg._id || msg.id || idx;
            const isSelected = selectedMessageId === id;
            const isEditing = editingMessageId === id;
            const isMe = msg.username === username;

            return (
              <div key={id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {/* 4. Username is now YELLOW and placed above the bubble (WhatsApp style) */}
                {!isMe && <span className="text-xs font-bold text-yellow-400 mb-1 ml-1 uppercase tracking-wider">{msg.username}</span>}
                
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMessageId(isSelected ? null : id);
                    setEditContent(msg.content);
                  }}
                  className={`p-3 rounded-2xl max-w-[85%] break-words relative cursor-pointer transition-all ${
                    isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-[#2a2a2a] text-gray-200 rounded-tl-none"
                  } ${isSelected ? "ring-2 ring-yellow-400 shadow-lg" : ""}`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input 
                        autoFocus
                        value={editContent} 
                        onChange={(e) => setEditContent(e.target.value)} 
                        className="w-full bg-[#111] text-white p-2 rounded border border-blue-500 outline-none" 
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleUpdate(id)} className="bg-green-500 px-2 py-1 rounded text-xs font-bold uppercase">Save</button>
                        <button onClick={() => setEditingMessageId(null)} className="bg-gray-500 px-2 py-1 rounded text-xs font-bold uppercase">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[15px] leading-relaxed">{msg.content}</span>
                      {isSelected && isMe && (
                        <div className="absolute -bottom-10 right-0 flex gap-2 bg-[#1f1f1f] p-1 rounded-lg border border-gray-700 z-10 shadow-xl">
                          <button onClick={(e) => { e.stopPropagation(); setEditingMessageId(id); }} className="hover:bg-yellow-500/20 p-2 rounded text-yellow-500 transition-colors">✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(id); }} className="hover:bg-red-500/20 p-2 rounded text-red-500 transition-colors">🗑️</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Input Area - Blue Send Button and dark high-contrast input */}
        <div className="flex p-3 bg-[#1f1f1f] border-t border-gray-800 gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Write a message..."
            className="flex-1 p-3 rounded-xl bg-[#0f0f0f] text-white outline-none border border-transparent focus:border-blue-500 transition-all"
          />
          <button 
            onClick={sendMessage} 
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            <span>SEND</span>
            <span>✈️</span>
          </button>
        </div>
      </div>

      {/* 1. Control Buttons with distinctive colors for better UX */}
      <div className="w-full max-w-2xl flex justify-between mt-6 gap-4">
        <button 
          onClick={() => setShowDeleteConfirm(true)} 
          className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-black rounded-xl transition-colors shadow-lg shadow-yellow-900/10"
        >
          DELETE ACCOUNT
        </button>
        
        <button 
          onClick={async () => {
             // SOS Button: Wipes all messages and clears the current session
             await fetch("https://nextalk-backend-v4df.onrender.com/api/sos", { method: "DELETE" });
             localStorage.clear();
             window.location.reload();
          }} 
          className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-colors shadow-lg shadow-red-900/20"
        >
          ⚠️ SOS (WIPE)
        </button>

        <button 
          onClick={() => setShowConnectModal(true)} 
          className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl transition-colors shadow-lg shadow-green-900/20"
        >
          CONNECT ➕
        </button>
      </div>
    </div>
  );
}

export default App;
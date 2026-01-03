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
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Deleting message error.");

      setMessages((prev) => prev.filter((msg) => msg.id !== id && msg._id !== id));
      setSelectedMessageId(null);
    } catch (error) {
      console.error("❌ Deletion error:", error);
    }
  };

  // 🔴 Handle message deletion
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`https://nextalk-backend-v4df.onrender.com/api/messages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Deleting message error.");

      setMessages((prev) => prev.filter((msg) => msg._id !== id && msg.id !== id));
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white font-sans">
      <h1 className="text-3xl font-bold mb-4">NexTalk</h1>

      {/* Chat Messages Area */}
      <div
        ref={chatBoxRef}
        className="w-[300px] h-[400px] bg-[#1e1e1e] border border-gray-700 p-2 flex flex-col gap-2 overflow-y-auto mb-4 rounded"
        onClick={() => { setSelectedMessageId(null); setEditingMessageId(null); }}
      >
        {messages.map((msg, idx) => {
          const id = msg._id || msg.id || idx;
          const isSelected = selectedMessageId === id;
          const isEditing = editingMessageId === id;

          return (
            <div
              key={id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMessageId(isSelected ? null : id);
                setEditContent(msg.content);
              }}
              className={`p-2 rounded-lg max-w-[70%] break-words relative ${
                msg.username === username ? "bg-[#333] self-end" : "bg-[#264d3b] self-start"
              }`}
            >
              {isEditing ? (
                <>
                  <input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-[#222] text-white p-1 rounded mb-1" />
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => handleUpdate(id)} className="bg-green-500 p-1 rounded text-xs">✅</button>
                    <button onClick={() => setEditingMessageId(null)} className="bg-red-500 p-1 rounded text-xs">❌</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs block text-gray-400">{msg.username}</span>
                  <span>{msg.content}</span>
                  {isSelected && msg.username === username && (
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setEditingMessageId(id); }} className="bg-yellow-500 p-1 rounded text-xs">✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(id); }} className="bg-red-500 p-1 rounded text-xs">🗑️</button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="flex w-[300px]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type message..."
          className="flex-1 p-2 rounded-l bg-[#2c2c2c] text-white outline-none"
        />
        <button onClick={sendMessage} className="px-4 rounded-r bg-[#444] hover:bg-[#555] text-white">Send</button>
      </div>

      {/* Control Buttons */}
      <div className="w-[300px] flex justify-between mt-3 gap-2">
        <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 py-2 bg-[#444] hover:bg-[#555] rounded">🗑</button>
        <button onClick={async () => {
           // SOS Button: Delete all messages and clear session
           await fetch("https://nextalk-backend-v4df.onrender.com/api/sos", { method: "DELETE" });
           localStorage.clear();
           window.location.reload();
        }} className="flex-1 py-2 bg-[#444] hover:bg-[#555] rounded">⚠️</button>
        <button onClick={() => setShowConnectModal(true)} className="flex-1 py-2 bg-[#444] hover:bg-[#555] rounded">➕</button>
      </div>

      
      <div className="w-[300px] flex justify-between mt-1 px-1 text-[10px] text-gray-500 uppercase font-bold">
        <span className="flex-1 text-center">Delete Account</span>
        <span className="flex-1 text-center">SOS button (delete all)</span>
        <span className="flex-1 text-center">Connect button</span>
      </div>
    </div>
  );
}

export default App;
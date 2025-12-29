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

  // 🔁 Automatic login from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  // 🔗 WebSocket + Fetch message from base
  useEffect(() => {
    if (username) {
      // load messages from base
      fetch("http://localhost:5000/api/messages")
        .then((res) => res.json())
        .then((data) => setMessages(data))
        .catch((err) => console.error("❌ Loading messages error:", err));

      if (!ws.current) {
        ws.current = new WebSocket("ws://localhost:5000");

      ws.current.onmessage = (event) => {
         const msg = JSON.parse(event.data);

         if (msg.type === "message") {
           
           if (msg.data.username !== username) {
             addMessage(msg.data.content, "bot", msg.data.id);
           }
         } else if (msg.type === "edit") {
           setMessages(prev =>
             prev.map(m => (m.id === msg.data.id ? { ...m, text: msg.data.content } : m))
           );
         } else if (msg.type === "delete") {
           setMessages(prev => prev.filter(m => m.id !== msg.id));
         }
       };

        
      }
    }

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [username]);

  // 💬 Add message locally
  const addMessage = (text, sender, id = Date.now()) => {
    setMessages((prev) => [...prev, { id, text, sender }]);
    setTimeout(() => {
      if (chatBoxRef.current)
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }, 10);
  };

  // ✉️ Sending message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    setInput("");

    try {
      const res = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, content: text }),
      });

      if (!res.ok) throw new Error("Error sending message to database.");

      const data = await res.json();
     setMessages((prev) => [...prev, { ...data, sender: "user", text: data.content }]); 

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(`${data.username}: ${data.content}`);
      }
    } catch (err) {
      console.error("❌ Entering message error:", err);
    }
  };

  // ✏️ Updating message.
  const handleUpdate = async (id) => {
    try {
      const oldMsg = messages.find((msg) => msg.id === id || msg._id === id);
      if (!oldMsg) return console.error("⚠️ Message is not found.");

      const delRes = await fetch(`http://localhost:5000/api/messages/${id}`, {
        method: "DELETE",
      });
      if (!delRes.ok) throw new Error("Deleting old message error.");

      const postRes = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: oldMsg.username, content: editContent }),
      });
      if (!postRes.ok) throw new Error("Adding new message error.");
      const newMsg = await postRes.json();

      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === id || m._id === id);
        if (index === -1) return prev;
        const newArr = [...prev];
        newArr[index] = { ...newMsg, sender: oldMsg.sender, text: newMsg.content };
        return newArr;
      });

      setEditingMessageId(null);
      setSelectedMessageId(null);
      setEditContent("");
    } catch (error) {
      console.error("❌ Updating (delete+insert) error:", error);
    }
  };

  // 🔴 Deleting message
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Deleting message error.");

      setMessages((prev) =>
        prev.filter((msg) => msg._id !== id && msg.id !== id)
      );
      setSelectedMessageId(null);
    } catch (error) {
      console.error("❌ Unsuccessful deletion:", error);
    }
  };

const handleConnect = async (name) => {
  try {
    const res = await fetch(`http://localhost:5000/api/users/check/${name}`);
    if (res.ok) {
      alert(`User '${name}' found and connected!`);
      setUsername(name);
      localStorage.setItem("username", name);
    } else if (res.status === 404) {
      alert("User does not exist in the database!");
    } else {
      alert("Connecting user error.");
    }
  } catch (err) {
    console.error(err);
    alert("While connecting server error!");
  }
};




  //User connection module
if (showConnectModal) {
  return (
    <ConnectUsername
      onCancel={() => setShowConnectModal(false)}
      onConfirm={(name) => {
        handleConnect(name);
        setShowConnectModal(false);
      }}
    />
  );
}
  

  // ⚠️ A module for deleting users
  if (showDeleteConfirm) {
    return (
      <DeleteAccount
        username={username}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          try {
            const res = await fetch(`http://localhost:5000/api/users/${username}`, {
              method: "DELETE",
            });

            if (!res.ok) throw new Error("Deleting user error.");

            // 🧹 Clear localStorage and state
            localStorage.removeItem("username");
            setUsername("");
            setMessages([]);
            setInput("");
            setSelectedMessageId(null);
            setEditingMessageId(null);
            setEditContent("");
            setShowDeleteConfirm(false);
          } catch (err) {
            console.error("❌ Error while deleting:", err);
          }
        }}
      />
    );
  }

  // 🧩 Login deo
  if (!username) return <Login setUsername={(name) => {
    setUsername(name);
    localStorage.setItem("username", name);
  }} />;

  // 💬 Chat UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white font-sans">
      <h1 className="text-3xl font-bold mb-4">NexTalk</h1>

      <div
        ref={chatBoxRef}
        className="w-[300px] h-[400px] bg-[#1e1e1e] border border-gray-700 p-2 flex flex-col gap-2 overflow-y-auto mb-4 rounded"
        onClick={() => {
          setSelectedMessageId(null);
          setEditingMessageId(null);
        }}
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
                setEditContent(msg.content || msg.text);
              }}
              className={`p-2 rounded-lg max-w-[70%] break-words relative ${
                msg.username === username
                  ? "bg-[#333] self-end"
                  : "bg-[#264d3b] self-start"
              }`}
            >
              {isEditing ? (
                <>
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-[#222] text-white p-1 rounded mb-1"
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => handleUpdate(id)}
                      className="bg-green-500 text-white px-1 rounded text-xs"
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => setEditingMessageId(null)}
                      className="bg-red-500 text-white px-1 rounded text-xs"
                    >
                      ❌
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span>{msg.content || msg.text}</span>

                  {isSelected && msg.username === username && (
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMessageId(id);
                          setEditContent(msg.content || msg.text);
                        }}
                        className="bg-yellow-500 text-black px-1 rounded text-xs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(id);
                        }}
                        className="bg-red-500 text-white px-1 rounded text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex w-[300px]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type message..."
          className="flex-1 p-2 rounded-l bg-[#2c2c2c] text-white outline-none"
        />
        <button
          onClick={sendMessage}
          className="px-4 rounded-r bg-[#444] hover:bg-[#555] text-white"
        >
          Send
        </button>
      </div>

      <div className="w-[300px] flex justify-start mt-3">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-[#444] hover:bg-[#555] text-white rounded"
        >
          🗑
        </button>

<button
    onClick={async () => {
    
        try {
          const res = await fetch("http://localhost:5000/api/sos", { method: "DELETE" });
          if (!res.ok) throw new Error("SOS Error while deleting ");
          localStorage.removeItem("username");
          setUsername("");
          setMessages([]);
          
        } catch (err) {
          console.error(err);
         
        }
      }
    }
    className="px-4 py-2 bg-[#444] hover:bg-[#555] text-white rounded"
  >
    ⚠️ 
  </button>

<button
  onClick={() => setShowConnectModal(true)}
    className="px-4 py-2 bg-[#444] hover:bg-[#555] text-white rounded"
  >
    ➕
  </button>

      </div>
    </div>
  );
}

export default App;

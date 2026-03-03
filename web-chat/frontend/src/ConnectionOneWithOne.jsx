import React, { useState, useEffect, useRef } from "react";

function ConnectionOneWithOne({ myName, otherUser, roomId, onExit }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  
  // CRUD States
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const chatBoxRef = useRef(null);
  const ws = useRef(null);
  const BACKEND_URL = "https://nextalk-backend-v4df.onrender.com";

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const startChat = async () => {
      try {
        await fetch(`${BACKEND_URL}/api/rooms/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user1: myName, user2: otherUser, room_id: roomId })
        });

        const res = await fetch(`${BACKEND_URL}/api/messages/${roomId}`);
        const data = await res.json();
        if (Array.isArray(data)) setMessages(data);
      } catch (err) {
        console.error("❌ Connection error:", err);
      }
    };

    startChat();

    ws.current = new WebSocket("wss://nextalk-backend-v4df.onrender.com");
    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === "message" && msg.data.room_id === roomId) {
          setMessages((prev) => [...prev, msg.data]);
        } else if (msg.type === "edit") {
          setMessages(prev => prev.map(m => m.id === parseInt(msg.data.id) ? { ...m, content: msg.data.content } : m));
        } else if (msg.type === "delete") {
          setMessages(prev => prev.filter(m => m.id !== parseInt(msg.id)));
        }
      } catch (err) {
        console.error("❌ WS parsing error:", err);
      }
    };

    return () => { if (ws.current) ws.current.close(); };
  }, [roomId, myName, otherUser]);

  // CRUD FUNCTIONS
  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await fetch(`${BACKEND_URL}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: myName, content: text, room_id: roomId })
    });
  };

  const handleUpdate = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        setEditingMessageId(null);
        setSelectedMessageId(null);
      }
    } catch (error) { console.error("❌ Update error:", error); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages/${id}`, { method: "DELETE" });
      if (res.ok) setSelectedMessageId(null);
    } catch (error) { console.error("❌ Deletion error:", error); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4" onClick={() => { setSelectedMessageId(null); setEditingMessageId(null); }}>
      {/* Header */}
      <div className="bg-white p-4 rounded-t-xl shadow-md flex justify-between items-center border-b-2 border-blue-500">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Private Chat</span>
          <h2 className="font-black text-xl text-blue-600 uppercase italic">{otherUser}</h2>
        </div>
        <button onClick={onExit} className="bg-red-100 text-red-600 w-10 h-10 rounded-full font-black text-2xl flex items-center justify-center">×</button>
      </div>

      {/* Chat Area */}
      <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
        {messages.map((m) => {
          const isMe = m.username === myName;
          const isSelected = selectedMessageId === m.id;
          const isEditing = editingMessageId === m.id;

          return (
            <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if(isMe) setSelectedMessageId(isSelected ? null : m.id); 
                  setEditContent(m.content);
                }}
                className={`p-3 rounded-2xl max-w-[85%] shadow-sm relative cursor-pointer transition-all ${
                  isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                } ${isSelected ? "ring-2 ring-blue-400" : ""}`}
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <input 
                      autoFocus
                      value={editContent} 
                      onChange={(e) => setEditContent(e.target.value)} 
                      className="text-black p-1 rounded outline-none" 
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleUpdate(m.id)} className="text-[10px] bg-green-500 p-1 rounded font-bold">SAVE</button>
                      <button onClick={() => setEditingMessageId(null)} className="text-[10px] bg-gray-400 p-1 rounded font-bold">X</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{m.content}</p>
                    {isSelected && isMe && (
                      <div className="absolute -bottom-12 right-0 flex gap-2 bg-white p-1 rounded-lg shadow-xl border z-20">
                        <button onClick={(e) => { e.stopPropagation(); setEditingMessageId(m.id); }} className="p-2 hover:bg-gray-100">✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="p-2 hover:bg-red-50">🗑️</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t flex gap-2 shadow-inner" onClick={(e) => e.stopPropagation()}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage()} 
          placeholder="Type a private message..."
          className="flex-1 border border-gray-300 p-3 rounded-xl outline-none focus:border-blue-500 transition-all"
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">SEND 🚀</button>
      </div>
    </div>
  );
}

export default ConnectionOneWithOne;
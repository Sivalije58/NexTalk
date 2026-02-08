import React, { useState, useEffect, useRef } from "react";

function ConnectionOneWithOne({ myName, otherUser, roomId, onExit }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatBoxRef = useRef(null);
  const ws = useRef(null);

  const BACKEND_URL = "https://nextalk-backend-v4df.onrender.com";

  // Auto-scroll logic
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const startChat = async () => {
      try {
        // 1. Join the room in DB
        await fetch(`${BACKEND_URL}/api/rooms/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user1: myName, user2: otherUser, room_id: roomId })
        });

        // 2. Fetch history for this room
        const res = await fetch(`${BACKEND_URL}/api/messages/${roomId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setMessages(data);
        }
      } catch (err) {
        console.error("❌ Connection error (server might be waking up):", err);
      }
    };

    startChat();

    // 3. WebSocket Setup
    ws.current = new WebSocket("wss://nextalk-backend-v4df.onrender.com");

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Only add message if it belongs to THIS room
        if (msg.type === "message" && msg.data.room_id === roomId) {
          setMessages((prev) => [...prev, msg.data]);
        }
      } catch (err) {
        console.error("❌ WS parsing error:", err);
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [roomId, myName, otherUser]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");

    try {
      await fetch(`${BACKEND_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: myName, 
          content: text, 
          room_id: roomId 
        })
      });
    } catch (err) {
      console.error("❌ Send error:", err);
    }
  };

  const handleExit = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/rooms/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId })
      });
    } catch (err) {
      console.error("❌ Exit error:", err);
    }
    onExit();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4">
      <div className="bg-white p-4 rounded-t-xl shadow-md flex justify-between items-center border-b-2 border-blue-500">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Chatting with</span>
          <h2 className="font-black text-xl text-blue-600 uppercase italic">{otherUser}</h2>
        </div>
        <button onClick={handleExit} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white w-10 h-10 rounded-full transition-all font-black text-2xl flex items-center justify-center">×</button>
      </div>

      <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-10 italic">No messages yet. Say hi! 👋</p>
        )}
        {messages.map((m, i) => {
          const isMe = m.username === myName;
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm ${
                isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
              }`}>
                <p className="text-sm">{m.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-white border-t flex gap-2 shadow-inner">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage()} 
          placeholder="Type a private message..."
          className="flex-1 border border-gray-300 p-3 rounded-xl outline-none focus:border-blue-500 transition-all"
        />
        <button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg">
          SEND 🚀
        </button>
      </div>
    </div>
  );
}

export default ConnectionOneWithOne;
import React, { useState, useEffect, useRef } from "react";

function ConnectionOneWithOne({ myName, otherUser, roomId, onExit }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatBoxRef = useRef(null);
  const ws = useRef(null);

  const BACKEND_URL = "https://nextalk-backend-v4df.onrender.com";

  useEffect(() => {
    // 1. Javi bazi da smo se povezali
    fetch(`${BACKEND_URL}/api/rooms/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user1: myName, user2: otherUser, room_id: roomId })
    });

    // 2. Učitaj stare poruke za ovu sobu
    fetch(`${BACKEND_URL}/api/messages/${roomId}`)
      .then(res => res.json())
      .then(data => setMessages(data));

    // 3. WebSocket konekcija
    ws.current = new WebSocket("wss://nextalk-backend-v4df.onrender.com");
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "message" && msg.data.room_id === roomId) {
        setMessages((prev) => [...prev, msg.data]);
      }
    };

    return () => ws.current.close();
  }, [roomId]);

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

  const handleExit = async () => {
    await fetch(`${BACKEND_URL}/api/rooms/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId })
    });
    onExit();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4">
      <div className="bg-white p-4 rounded-t-xl shadow flex justify-between items-center">
        <h2 className="font-bold text-blue-600">Chat sa: {otherUser}</h2>
        <button onClick={handleExit} className="text-red-500 font-black text-xl">×</button>
      </div>
      <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 rounded-lg max-w-[80%] ${m.username === myName ? "bg-blue-500 text-white self-end" : "bg-white self-start"}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="p-4 bg-white flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} className="flex-1 border p-2 rounded" />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">Pošalji</button>
      </div>
    </div>
  );
}

export default ConnectionOneWithOne;
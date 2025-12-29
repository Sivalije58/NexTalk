import { useEffect, useState, useRef } from "react";

function Chat({ username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatBoxRef = useRef(null);

  // 🔁 Load messages from the database when the component is loaded.
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/messages");
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("❌ Error loading messages:", err);
      }
    };

    fetchMessages();
  }, []);

  // 💬 Sending messages
  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;

    // 1️⃣ Show it locally
    const newMessage = { username, content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      // 2️⃣ Send it to the backend (database).
      const res = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, content }),
      });

      if (!res.ok) throw new Error("Error sending message.");
    } catch (err) {
      console.error("❌ Sending message error:", err);
    }
  };

  // 🎯 Auto-scroll to the bottom.
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white font-sans">
      <h1 className="text-3xl font-bold mb-4">NexTalk</h1>

      <div
        ref={chatBoxRef}
        className="w-[300px] h-[400px] bg-[#1e1e1e] border border-gray-700 p-2 flex flex-col gap-2 overflow-y-auto mb-4 rounded"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg max-w-[70%] break-words ${
              msg.username === username ? "bg-[#333] self-end" : "bg-[#264d3b] self-start"
            }`}
          >
            <span className="text-sm text-gray-400">{msg.username}: </span>
            {msg.content}
          </div>
        ))}
      </div>

      <div className="flex w-[300px]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Unesi poruku..."
          className="flex-1 p-2 rounded-l bg-[#2c2c2c] text-white outline-none"
        />
        <button
          onClick={sendMessage}
          className="px-4 rounded-r bg-[#444] hover:bg-[#555] text-white"
        >
         Send
        </button>
      </div>
    </div>
  );
}

export default Chat;

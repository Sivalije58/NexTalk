import { useState, useEffect, useRef } from "react";
import Login from "./Login";
import DeleteAccount from "./DeleteAccount";
import ConnectUsername from "./ConnectUsername";
import AvaliableUsers from "./AvaliableUsers";

function App() {
  const [showAvailableUsers, setShowAvailableUsers] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  
  const [username, setUsername] = useState("");
  const [chattingWith, setChattingWith] = useState(null); 
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const ws = useRef(null);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    if (savedUser) setUsername(savedUser);
  }, []);

  useEffect(() => {
    if (username) {
      if (chattingWith) {
        fetch(`https://nextalk-backend-v4df.onrender.com/api/messages/${username}/${chattingWith}`)
          .then((res) => res.json())
          .then((data) => setMessages(data))
          .catch((err) => console.error("❌ Loading error:", err));
      } else {
        setMessages([]); 
      }

      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
        ws.current = new WebSocket("wss://nextalk-backend-v4df.onrender.com");
        ws.current.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "message") {
              const { username: sender, recipient } = msg.data;
              if ((sender === chattingWith && recipient === username) || 
                  (sender === username && recipient === chattingWith)) {
                setMessages((prev) => [...prev, msg.data]);
              }
            } else if (msg.type === "delete_all") {
              setMessages([]);
            }
          } catch (err) { console.error(err); }
        };
      }
    }
  }, [username, chattingWith]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !chattingWith) return;
    setInput("");

    try {
      const res = await fetch("https://nextalk-backend-v4df.onrender.com/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username, 
          content: text, 
          recipient: chattingWith 
        }),
      });
      const data = await res.json();
     
      if (!messages.find(m => m.id === data.id)) {
          setMessages((prev) => [...prev, data]);
      }
    } catch (err) { console.error(err); }
  };

  if (showAvailableUsers) {
    return (
      <AvaliableUsers 
        onBackToConnect={() => { setShowAvailableUsers(false); setShowConnectModal(true); }}
        onConnect={(name) => { 
          setChattingWith(name);
          setShowAvailableUsers(false); 
        }} 
      />
    );
  }

  if (showConnectModal) {
    return (
      <ConnectUsername 
        onCancel={() => setShowConnectModal(false)} 
        onShowAvailable={() => { setShowConnectModal(false); setShowAvailableUsers(true); }}
        onConfirm={(name) => { setUsername(name); localStorage.setItem("username", name); setShowConnectModal(false); }} 
      />
    );
  }

  if (!username) return <Login setUsername={(name) => { setUsername(name); localStorage.setItem("username", name); }} />;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-900 font-sans p-4">
      <h1 className="text-4xl font-black mb-2 tracking-tighter text-blue-600 italic">NexTalk</h1>
      
      <div className="mb-4 flex items-center gap-3">
        {chattingWith ? (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold flex items-center gap-2 border border-green-200 shadow-sm">
            ● Chatting with: <span className="text-green-900 uppercase">{chattingWith}</span>
            <button onClick={() => setChattingWith(null)} className="ml-2 text-red-500 hover:text-red-700 text-xl font-black">×</button>
          </div>
        ) : (
          <div className="text-gray-500 italic">Select a user from 'Available' to start chatting</div>
        )}
      </div>

      <div className="w-full max-w-2xl flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200">
        <div ref={chatBoxRef} className="h-[500px] bg-gray-100 p-4 flex flex-col gap-4 overflow-y-auto">
          {messages.map((msg, idx) => {
            const isMe = msg.username === username;
            return (
              <div key={msg.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm ${isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none"}`}>
                  <span className="text-[15px]">{msg.content}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex p-3 bg-gray-50 border-t gap-2">
          <input 
            disabled={!chattingWith}
            type="text" value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={chattingWith ? "Type a message..." : "Select someone first!"}
            className="flex-1 p-3 rounded-xl border border-gray-300 outline-none focus:border-blue-500 disabled:bg-gray-200"
          />
          <button disabled={!chattingWith} onClick={sendMessage} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-gray-400">
            SEND ✈️
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-2 mt-6 gap-4">
        <button onClick={() => setShowAvailableUsers(true)} className="py-3 bg-blue-500 text-white font-bold rounded-xl shadow-md uppercase">📶 Available</button>
        <button onClick={async () => { await fetch("https://nextalk-backend-v4df.onrender.com/api/sos", { method: "DELETE" }); }} className="py-3 bg-red-500 text-white font-bold rounded-xl shadow-md uppercase">⚠️ SOS (WIPE)</button>
      </div>
    </div>
  );
}

export default App; 
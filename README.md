# 🚀 NexTalk - Real-time Chat Application

NexTalk is a high-performance, real-time chat application built to demonstrate seamless full-stack integration and instant communication.

---

## 🌟 Key Features

* **Instant Messaging**: Powered by **WebSockets** for zero-latency communication.
* **Persistent Storage**: Integrated with **Neon (PostgreSQL)** to ensure chat history is never lost.
* **Full Message Control**: Real-time CRUD operations (Edit/Delete) using WebSocket events.
* **Automatic UI Updates**: Intelligent auto-scroll to the latest message for better UX.
* **Session Management**: Local storage integration for persistent user identity.
* **Client-Side Encryption**: All messages are encrypted using AES-256 (CryptoJS) before leaving the browser. This ensures that even the database provider cannot read private conversations.

## 🛠 Tech Stack

* **Frontend**: React (Vite), Tailwind CSS, CryptoJS
* **Backend**: Node.js
* **Database**: Neon (PostgreSQL)
* **Communication**: WebSockets (WS)
* **Hosting**: Render (Cloud Deployment)

---

## 🚀 How to Run Locally

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/Sivalije58/NexTalk](https://github.com/Sivalije58/NexTalk)
    cd NexTalk
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

---

## 🌐 Live Demo

Experience NexTalk live here: [https://nextalk-chat-3ihi.onrender.com/](https://nextalk-chat-3ihi.onrender.com/)

## 📸 Screenshots

### 👤 Login Page
![Login Page]<img width="599" height="464" alt="LoginFixed" src="https://github.com/user-attachments/assets/4683559a-7be4-402d-92cb-b25229db4ee9" />


### 💬 Chat Interface
![Chat Interface]<img width="908" height="905" alt="Capture" src="https://github.com/user-attachments/assets/037a3c25-4a01-437b-a3e6-20663ea8f598" />


---

> Developed as a practical engineering project exploring real-time systems and cloud infrastructure.

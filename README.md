# CollabBoard.io 🎨

A high-performance, professional-grade collaborative whiteboard engine designed for low-latency visual communication[cite: 2, 4]. Built with a focus on **event-driven architecture**, **state synchronization**, and **modular hooks**[cite: 2, 4].

## 🚀 Features
- **Real-time Sync:** Powered by a dedicated Socket.io engine for instantaneous drawing updates across all clients[cite: 2, 4].
- **Vector Engine:** Custom-built React hooks for precise mouse coordinate tracking and canvas rendering[cite: 2, 4].
- **Conflict Management:** (In Progress) Advanced concurrency handling using Redis Pub/Sub for horizontal scaling[cite: 2, 4].
- **Modular Design:** Strictly typed with TypeScript to ensure data integrity during packet transmission[cite: 2, 4].

## 🛠 Tech Stack
- **Frontend:** Next.js 15 (App Router), Tailwind CSS[cite: 2, 4].
- **Real-time Engine:** Socket.io with a standalone Node.js (ESM) server[cite: 3, 4].
- **State Management:** Custom React Hooks and Context API[cite: 3, 4].
- **Backend Infrastructure:** Redis (Planned for global state distribution)[cite: 2, 4].

## 📂 Project Structure
- `server.mjs`: Standalone WebSocket server with custom CORS security policies[cite: 2, 3, 4].
- `hooks/useDraw.ts`: Abstracted drawing logic and canvas event listeners[cite: 2, 3, 4].
- `types/canvas.ts`: Unified type definitions shared across the full stack[cite: 2, 3, 4].
- `app/`: Next.js application directory utilizing modern routing patterns[cite: 2, 4].

## ⚙️ Development Setup
1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
3. **Start the WebSocket Server:**
    ```bash
    node server.mjs
4. **Run the Next.js Frontend:**
   ```bash
   npm run dev
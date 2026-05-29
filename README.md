# CollabBoard.io 🎨

A production-grade, distributed real-time collaborative whiteboard engine designed for ultra-low latency canvas interactions. Engineered with an optimized event-driven architecture capable of scaling horizontally across server nodes.

## 🚀 Key Architectural Features
- **Zero-Latency Feel (Optimistic UI):** Local user canvas operations execute instantly on vector layers while packet broadcasts execute asynchronously in the background.
- **State Hydration Pipeline:** Utilizes atomic memory arrays via Redis caching layers, allowing users to safely refresh their sessions or join rooms mid-session without experiencing graphics context loss.
- **Advanced Concurrency Handling:** Built with standalone Node.js ECMAScript Modules decoupled from core routing constraints to maximize WebSocket handshake capacity.
- **Responsive Vector Toolset:** Supports dynamic brush metrics, multi-palette dynamic color configurations, responsive scaling matrices, and administrative canvas purging events.

## 🛠 Tech Stack
- **Frontend Engine:** Next.js 15 (App Router with Client Components optimizations)
- **Real-time Vector Ingestion:** Socket.io (Standalone Server Architecture)
- **State Storage & Recovery Cache:** Redis Database Instance
- **Local Infrastructure Orchestration:** Docker Containerization Patterns
- **Typing Guardrails:** Systemwide TypeScript

## 📂 Structural Highlights
- `server.mjs`: Standalone multi-client state communication engine using native JavaScript modules.
- `components/Whiteboard.tsx`: Floating interface layer controlling mouse trajectory conversions and canvas layout behaviors.
- `hooks/useDraw.ts`: Abstracted event listeners managing coordinate transformations and active drag calculations.

## ⚙️ Engineering Launch Instructions
1. **Clone & Install Dependencies:**
   ```bash
   npm install
// server.mjs
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://192.168.0.103:3000"],
    methods: ["GET", "POST"]
  }
});

// Initialize Redis client
// Note: If using a cloud database, replace 'redis://localhost:6379' with your connection string
const redis = new Redis('redis://localhost:6379');

redis.on('connect', () => console.log('🔮 Connected to Redis Cache Successfully'));
redis.on('error', (err) => console.error('Redis Connection Error:', err));

io.on('connection', async (socket) => {
  console.log('✅ Client connected:', socket.id);

  // 1. STATE RECOVERY: Fetch drawing history from Redis and send to the new client
  try {
    const history = await redis.lrange('canvas_history', 0, -1);
    if (history.length > 0) {
      const parsedHistory = history.map(line => JSON.parse(line));
      socket.emit('canvas-history', parsedHistory);
    }
  } catch (error) {
    console.error('Failed to retrieve canvas history from Redis:', error);
  }

  // 2. REAL-TIME BROADCAST & CACHING
  socket.on('draw-line', async (state) => {
    // Broadcast to everyone else immediately (Zero-latency feel)
    socket.broadcast.emit('draw-line', state);

    // Save to Redis list to persist state across refreshes
    try {
      await redis.rpush('canvas_history', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to cache line to Redis:', error);
    }
  });

  // 3. ATOMIC STATE PURGE
  socket.on('clear', async () => {
    try {
      await redis.del('canvas_history');
      io.emit('clear');
    } catch (error) {
      console.error('Failed to clear Redis history:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Distributed WebSocket Server running on port ${PORT}`);
});
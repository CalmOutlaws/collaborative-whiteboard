// server.mjs
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import dotenv from 'dotenv';

// Load environment variables from a backend .env file
dotenv.config();

const httpServer = createServer();

// Dynamically handle production CORS rules
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ["http://localhost:3000", "http://192.168.0.100:3000"];

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Production Grade Redis Handshake Connection String
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => console.log('🔮 Connected to Redis Cache Pool Successfully'));
redis.on('error', (err) => console.error('⚠️ Redis Core Connection Failure:', err.message));

io.on('connection', async (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Broadcast the updated user count to everyone online
  io.emit('user-count', io.engine.clientsCount);

  try {
    const history = await redis.lrange('canvas_history', 0, -1);
    if (history.length > 0) {
      socket.emit('canvas-history', history.map(line => JSON.parse(line)));
    }
  } catch (error) {
    console.error('Redis recovery failed:', error);
  }

  socket.on('draw-line', async (state) => {
    socket.broadcast.emit('draw-line', state);
    try {
      await redis.rpush('canvas_history', JSON.stringify(state));
    } catch (error) {
      console.error('Redis append failed:', error);
    }
  });

  socket.on('clear', async () => {
    try {
      await redis.del('canvas_history');
      io.emit('clear');
    } catch (error) {
      console.error('Redis delete failed:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
    // Update everyone with the new count after a disconnection
    io.emit('user-count', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`🚀 Distributed WebSocket Server running on port ${PORT}`));
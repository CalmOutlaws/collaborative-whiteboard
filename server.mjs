// server.mjs
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    // We allow localhost and your network IP for testing
    origin: ["http://localhost:3000", "http://192.168.0.103:3000"],
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // When a user draws, broadcast that data to everyone else
  socket.on('draw-line', (state) => {
    socket.broadcast.emit('draw-line', state);
  });

  // When a user clears the canvas
  socket.on('clear', () => {
    io.emit('clear');
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket Server ready at http://localhost:${PORT}`);
});
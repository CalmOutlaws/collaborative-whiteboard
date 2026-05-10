// server.mjs
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('draw-line', (data) => {
    // Broadcast to everyone EXCEPT the sender
    socket.broadcast.emit('draw-line', data);
  });

  socket.on('clear', () => io.emit('clear'));

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

httpServer.listen(3001, () => {
  console.log('🚀 WebSocket Server running on port 3001');
});
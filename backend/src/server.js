const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { addToQueue, removeFromQueue, findMatch } = require('./matchmaking/queueManager');
const { reportUser, isBanned, banUser } = require('./moderation/reportManager');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track users' current language for cleanup
const userLanguages = new Map();

io.on('connection', async (socket) => {
  // Check if banned (In real app, check IP/Fingerprint)
  if (await isBanned(socket.id)) {
    socket.emit('error', { message: 'You are temporarily banned due to multiple reports.' });
    socket.disconnect();
    return;
  }

  console.log('A user connected:', socket.id);

  socket.on('find_match', async ({ language }) => {
    console.log(`User ${socket.id} looking for match in ${language}`);
    userLanguages.set(socket.id, language);

    const peerId = await findMatch(language, socket.id);

    if (peerId) {
      const roomId = uuidv4();
      
      io.to(socket.id).emit('match_found', { roomId, peerId, initiator: true });
      io.to(peerId).emit('match_found', { roomId, peerId: socket.id, initiator: false });
      
      console.log(`Match found: ${socket.id} <-> ${peerId} in room ${roomId}`);
      
      userLanguages.delete(socket.id);
      userLanguages.delete(peerId);
    } else {
      await addToQueue(language, socket.id);
    }
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('end_call', ({ to }) => {
    io.to(to).emit('call_ended');
  });

  socket.on('send_message', ({ to, message }) => {
    console.log(`Message from ${socket.id} to ${to}`);
    io.to(to).emit('receive_message', { from: socket.id, message });
  });

  socket.on('report_user', async ({ targetId }) => {
    const shouldBan = await reportUser(targetId, socket.id);
    if (shouldBan) {
      await banUser(targetId);
      io.to(targetId).emit('error', { message: 'You have been banned due to reports.' });
      io.in(targetId).disconnectSockets();
    }
  });

  socket.on('cancel_search', async () => {
    const language = userLanguages.get(socket.id);
    if (language) {
      await removeFromQueue(language, socket.id);
      userLanguages.delete(socket.id);
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    const language = userLanguages.get(socket.id);
    if (language) {
      await removeFromQueue(language, socket.id);
      userLanguages.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

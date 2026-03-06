const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

// In-memory room storage
const rooms = {};

// Generate random 5-letter room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Fisher-Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Build card array from config
function buildCardArray(cardConfig) {
  const cards = [];
  for (let i = 0; i < cardConfig.king; i++) cards.push('KING');
  for (let i = 0; i < cardConfig.queen; i++) cards.push('QUEEN');
  for (let i = 0; i < cardConfig.thief; i++) cards.push('THIEF');
  return cards;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Host creates a room
  socket.on('createRoom', ({ cardConfig, hostName }, callback) => {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (rooms[roomCode]);

    rooms[roomCode] = {
      host: socket.id,
      players: [{ id: socket.id, name: hostName || 'Host', card: null, isHost: true }],
      cardConfig,
      gameStarted: false
    };

    socket.join(roomCode);
    socket.roomCode = roomCode;

    console.log(`Room created: ${roomCode}`, rooms[roomCode].cardConfig);
    callback({ success: true, roomCode });

    // Broadcast updated player list
    io.to(roomCode).emit('updatePlayers', {
      players: rooms[roomCode].players,
      host: rooms[roomCode].host
    });
  });

  // Player joins a room
  socket.on('joinRoom', ({ name, roomCode }, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      return callback({ success: false, error: 'Room not found. Check the code and try again.' });
    }
    if (room.gameStarted) {
      return callback({ success: false, error: 'Game has already started in this room.' });
    }

    // Check if total players would exceed total cards
    const totalCards = room.cardConfig.king + room.cardConfig.queen + room.cardConfig.thief;
    if (room.players.length >= totalCards) {
      return callback({ success: false, error: `Room is full. Max ${totalCards} players allowed.` });
    }

    room.players.push({ id: socket.id, name, card: null, isHost: false });
    socket.join(roomCode);
    socket.roomCode = roomCode;

    console.log(`${name} joined room ${roomCode}`);
    callback({ success: true, roomCode, cardConfig: room.cardConfig });

    // Broadcast updated player list
    io.to(roomCode).emit('updatePlayers', {
      players: room.players,
      host: room.host
    });
  });

  // Host shuffles and distributes cards
  socket.on('shuffleCards', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.host) return;

    const totalCards = room.cardConfig.king + room.cardConfig.queen + room.cardConfig.thief;
    if (room.players.length < totalCards) {
      socket.emit('error', { message: `Need ${totalCards} players. Currently ${room.players.length} joined.` });
      return;
    }

    const cards = shuffle(buildCardArray(room.cardConfig));
    room.gameStarted = true;

    room.players.forEach((player, index) => {
      player.card = cards[index];
      // Send card only to that specific player
      io.to(player.id).emit('receiveCard', { card: player.card, playerName: player.name });
    });

    // Notify everyone game started (without revealing cards)
    io.to(roomCode).emit('gameStarted', {
      players: room.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost }))
    });

    console.log(`Cards shuffled in room ${roomCode}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms[roomCode]) return;

    const room = rooms[roomCode];
    room.players = room.players.filter(p => p.id !== socket.id);

    if (room.players.length === 0) {
      delete rooms[roomCode];
      console.log(`Room ${roomCode} deleted (empty)`);
    } else {
      // If host left, assign new host
      if (room.host === socket.id && room.players.length > 0) {
        room.host = room.players[0].id;
        room.players[0].isHost = true;
      }
      io.to(roomCode).emit('updatePlayers', {
        players: room.players,
        host: room.host
      });
    }

    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎴 Raja-Rani Game Server running at http://localhost:${PORT}\n`);
});

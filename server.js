const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {
  console.log('New player:', socket.id);

  socket.on('createRoom', ({ roomCode, name }) => {
    rooms[roomCode] = { players: [], imposter: null, word: null, votes: {} };
    socket.join(roomCode);
    rooms[roomCode].players.push({ id: socket.id, name });
    io.to(roomCode).emit('playerList', rooms[roomCode].players);
  });

  socket.on('joinRoom', ({ roomCode, name }) => {
    if (rooms[roomCode]) {
      socket.join(roomCode);
      rooms[roomCode].players.push({ id: socket.id, name });
      io.to(roomCode).emit('playerList', rooms[roomCode].players);
    } else {
      socket.emit('errorMsg', 'Room not found');
    }
  });

  socket.on('startGame', ({ roomCode, wordList }) => {
    const players = rooms[roomCode].players;
    const imposterIndex = Math.floor(Math.random() * players.length);
    const imposter = players[imposterIndex];
    const word = wordList[Math.floor(Math.random() * wordList.length)];

    rooms[roomCode].imposter = imposter.id;
    rooms[roomCode].word = word;
    rooms[roomCode].votes = {};

    players.forEach((p) => {
      if (p.id === imposter.id) {
        io.to(p.id).emit('yourWord', '??? (You are the Imposter!)');
      } else {
        io.to(p.id).emit('yourWord', word);
      }
    });

    io.to(roomCode).emit('gameStarted');
  });

  socket.on('submitHint', ({ roomCode, hint }) => {
    const player = rooms[roomCode].players.find(p => p.id === socket.id);
    io.to(roomCode).emit('newHint', { name: player.name, hint });
  });

  socket.on('submitVote', ({ roomCode, votedName }) => {
    const player = rooms[roomCode].players.find(p => p.id === socket.id);
    rooms[roomCode].votes[player.name] = votedName;

    io.to(roomCode).emit('voteReceived', {
      voter: player.name,
      votedFor: votedName
    });

    // If all players have voted
    if (Object.keys(rooms[roomCode].votes).length === rooms[roomCode].players.length) {
      const voteCounts = {};
      Object.values(rooms[roomCode].votes).forEach(v => {
        voteCounts[v] = (voteCounts[v] || 0) + 1;
      });

      // Find who got the most votes
      let mostVoted = Object.keys(voteCounts).reduce((a, b) => 
        voteCounts[a] > voteCounts[b] ? a : b
      );

      const imposter = rooms[roomCode].players.find(p => p.id === rooms[roomCode].imposter);

      io.to(roomCode).emit('revealResults', {
        mostVoted,
        imposter: imposter.name
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));

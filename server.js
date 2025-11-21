const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

app.get('/google0231d57f2d4dd65a (1).html', (req, res) => {
  res.sendFile(path.join(__dirname, 'google0231d57f2d4dd65a.html'));
});
let rooms = {};

// ========== SOCKET CONNECTION ==========
io.on("connection", (socket) => {

  // CREATE ROOM
  socket.on("createRoom", ({ roomCode, name }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], started: false, votes: {} };
    }

    rooms[roomCode].players.push({
      id: socket.id,
      name,
      isImposter: false,
      word: ""
    });

    socket.join(roomCode);
    io.to(roomCode).emit("playerList", rooms[roomCode].players);
  });

  // JOIN ROOM
  socket.on("joinRoom", ({ roomCode, name }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit("error", "Room does not exist");
    if (room.started) return socket.emit("error", "Game already started");

    room.players.push({
      id: socket.id,
      name,
      isImposter: false,
      word: ""
    });

    socket.join(roomCode);
    io.to(roomCode).emit("playerList", room.players);
  });

  // START GAME
  socket.on("startGame", ({ roomCode, wordList }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.started = true;
    const players = room.players;

    const imposterIndex = Math.floor(Math.random() * players.length);
    const realWord = wordList[Math.floor(Math.random() * wordList.length)];

    players.forEach((p, i) => {
      if (i === imposterIndex) {
        p.isImposter = true;
        p.word = "❓ You are the imposter!";
        io.to(p.id).emit("yourWord", "❓ You are the IMPOSTER!");
      } else {
        p.word = realWord;
        io.to(p.id).emit("yourWord", realWord);
      }
    });

    io.to(roomCode).emit("gameStarted");
  });

  // HINT SUBMISSION
  socket.on("submitHint", ({ roomCode, hint }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(roomCode).emit("newHint", { name: player.name, hint });
  });

  // SEND PLAYER LIST FOR VOTING
  socket.on("getVoteList", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    io.to(roomCode).emit("votePlayerList", room.players);
  });

  // RECEIVE A VOTE
  socket.on("submitVote", ({ roomCode, votedName }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const voter = room.players.find(p => p.id === socket.id);
    if (!voter) return;

    room.votes[voter.name] = votedName;

    if (Object.keys(room.votes).length === room.players.length) {
      revealResults(roomCode);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(roomCode).emit("playerList", room.players);

      if (room.players.length === 0) delete rooms[roomCode];
    }
  });

});

// ========== RESULTS ==========
function revealResults(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const votes = room.votes;
  const voteCount = {};

  Object.values(votes).forEach(name => {
    voteCount[name] = (voteCount[name] || 0) + 1;
  });

  let mostVoted = null;
  let maxVotes = -1;

  for (const name in voteCount) {
    if (voteCount[name] > maxVotes) {
      maxVotes = voteCount[name];
      mostVoted = name;
    }
  }

  const imposter = room.players.find(p => p.isImposter)?.name;

  io.to(roomCode).emit("revealResults", {
    mostVoted,
    imposter
  });

  room.started = false;
  room.votes = {};
}

server.listen(3000, () => console.log("Server running on http://localhost:3000"));

const socket = io();
let currentRoom = null;
let playerName = null;

// ========== CREATE ROOM ==========
document.getElementById('createRoom').onclick = () => {
  currentRoom = document.getElementById('roomCode').value;
  playerName = document.getElementById('playerName').value;

  if (!playerName || !currentRoom) return alert('Enter name and room code');

  socket.emit('createRoom', { roomCode: currentRoom, name: playerName });
  showLobby();
};

// ========== JOIN ROOM ==========
document.getElementById('joinRoom').onclick = () => {
  currentRoom = document.getElementById('roomCode').value;
  playerName = document.getElementById('playerName').value;

  if (!playerName || !currentRoom) return alert('Enter name and room code');

  socket.emit('joinRoom', { roomCode: currentRoom, name: playerName });
  showLobby();
};

// ========== START GAME ==========
document.getElementById('startGame').onclick = () => {
  const wordList = ['Pizza', 'Laptop', 'Elephant', 'Chocolate', 'Volcano', 'Guitar'];
  socket.emit('startGame', { roomCode: currentRoom, wordList });
};

// ========== SEND HINT ==========
document.getElementById('sendHint').onclick = () => {
  const hint = document.getElementById('hintInput').value;
  if (!hint) return;
  socket.emit('submitHint', { roomCode: currentRoom, hint });
  document.getElementById('hintInput').value = '';
};

// ========== LOBBY UI ==========
function showLobby() {
  document.getElementById('menu').classList.add("hidden");
  document.getElementById('lobby').classList.remove("hidden");
}

// ========== SOCKET LISTENERS ==========
socket.on('playerList', (players) => {
  document.getElementById('players').innerHTML =
    '<h3>Players:</h3>' +
    players.map(p => `<div>${p.name}</div>`).join('');
});

socket.on('gameStarted', () => {
  document.getElementById('voteSection').classList.add("hidden");
  document.getElementById('hints').innerHTML = '';

  setTimeout(() => {
    socket.emit('getVoteList', currentRoom);
    document.getElementById('voteSection').classList.remove("hidden");
  }, 8000);
});

socket.on('yourWord', (word) => {
  document.getElementById('lobby').classList.add("hidden");
  document.getElementById('gameArea').classList.remove("hidden");
  document.getElementById('yourWord').innerText = word;
});

socket.on('newHint', ({ name, hint }) => {
  const div = document.createElement('div');
  div.textContent = `${name}: ${hint}`;
  document.getElementById('hints').appendChild(div);
});

socket.on('votePlayerList', (players) => {
  const container = document.getElementById('voteButtons');
  container.innerHTML = '';

  players.forEach(p => {
    if (p.name !== playerName) {
      const btn = document.createElement('button');
      btn.textContent = p.name;

      btn.onclick = () => {
        socket.emit('submitVote', { roomCode: currentRoom, votedName: p.name });
        document.getElementById('voteSection').classList.add("hidden");
      };

      container.appendChild(btn);
    }
  });
});

socket.on('revealResults', ({ mostVoted, imposter }) => {
  document.getElementById('results').innerHTML = `
    <h2>Most Voted: ${mostVoted}</h2>
    <h2>Imposter was: ${imposter}</h2>
    <h3>${mostVoted === imposter ? 'Crewmates Win 🎉' : 'Imposter Wins 😈'}</h3>
  `;
});

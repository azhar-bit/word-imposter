const socket = io();
let currentRoom = null;
let playerName = null;

document.getElementById('createRoom').onclick = () => {
  currentRoom = document.getElementById('roomCode').value;
  playerName = document.getElementById('playerName').value;
  if (!playerName || !currentRoom) return alert('Enter name and room code');
  socket.emit('createRoom', { roomCode: currentRoom, name: playerName });
  showLobby();
};

document.getElementById('joinRoom').onclick = () => {
  currentRoom = document.getElementById('roomCode').value;
  playerName = document.getElementById('playerName').value;
  if (!playerName || !currentRoom) return alert('Enter name and room code');
  socket.emit('joinRoom', { roomCode: currentRoom, name: playerName });
  showLobby();
};

document.getElementById('startGame').onclick = () => {
  const wordList = ['Pizza', 'Laptop', 'Elephant', 'Chocolate', 'Volcano', 'Guitar'];
  socket.emit('startGame', { roomCode: currentRoom, wordList });
};

document.getElementById('sendHint').onclick = () => {
  const hint = document.getElementById('hintInput').value;
  if (!hint) return;
  socket.emit('submitHint', { roomCode: currentRoom, hint });
  document.getElementById('hintInput').value = '';
};

// Show lobby
function showLobby() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('lobby').style.display = 'block';
}

// Socket listeners
socket.on('playerList', (players) => {
  document.getElementById('players').innerHTML =
    '<h3>Players:</h3>' + players.map(p => `<div>${p.name}</div>`).join('');
});

socket.on('yourWord', (word) => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('gameArea').style.display = 'block';
  document.getElementById('yourWord').innerText = word;
});

socket.on('newHint', ({ name, hint }) => {
  const div = document.createElement('div');
  div.textContent = `${name}: ${hint}`;
  document.getElementById('hints').appendChild(div);
});

socket.on('gameStarted', () => {
  document.getElementById('voteSection').style.display = 'none';
  document.getElementById('hints').innerHTML = '';
});

socket.on('voteReceived', ({ voter, votedFor }) => {
  console.log(`${voter} voted for ${votedFor}`);
});

socket.on('revealResults', ({ mostVoted, imposter }) => {
  document.getElementById('results').innerHTML =
    `<h2>Most Voted: ${mostVoted}</h2>
     <h2>Imposter was: ${imposter}</h2>
     <h3>${mostVoted === imposter ? 'Crewmates Win 🎉' : 'Imposter Wins 😈'}</h3>`;
});

socket.on('gameStarted', () => {
  // After some time (like after all hints), show voting buttons
  setTimeout(() => {
    document.getElementById('voteSection').style.display = 'block';
    socket.emit('getPlayerList', currentRoom);
  }, 8000); // 8 seconds after hints start
});

socket.on('playerList', (players) => {
  document.getElementById('voteButtons').innerHTML = '';
  players.forEach(p => {
    if (p.name !== playerName) {
      const btn = document.createElement('button');
      btn.textContent = p.name;
      btn.onclick = () => {
        socket.emit('submitVote', { roomCode: currentRoom, votedName: p.name });
        document.getElementById('voteSection').style.display = 'none';
      };
      document.getElementById('voteButtons').appendChild(btn);
    }
  });
});

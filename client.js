const socket = io();

// DOM Elements
const startScreen = document.getElementById('startScreen');
const hostForm = document.getElementById('hostForm');
const joinForm = document.getElementById('joinForm');
const waitingRoom = document.getElementById('waitingRoom');
const gameScreen = document.getElementById('gameScreen');
const playerList = document.getElementById('playerList');
const blackCard = document.getElementById('blackCard');
const whiteCardsContainer = document.getElementById('whiteCardsContainer');
const submissions = document.getElementById('submissions');
const status = document.getElementById('status');

const hostBtn = document.getElementById('hostBtn');
const joinBtn = document.getElementById('joinBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const startGameBtn = document.getElementById('startGameBtn');
const startRoundBtn = document.getElementById('startRoundBtn');
const stopGameBtn = document.getElementById('stopGameBtn');
const rejoinBtn = document.getElementById('rejoinBtn');
const retryJoinBtn = document.getElementById('retryJoinBtn'); // You need to add this in your HTML

const hostNameInput = document.getElementById('hostName');
const playerCountInput = document.getElementById('playerCount');
const roomPasswordInput = document.getElementById('roomPassword');
const playerNameInput = document.getElementById('playerName');
const roomCodeInput = document.getElementById('roomCode');
const joinPasswordInput = document.getElementById('joinPassword');
const waitingRoomStatus = document.getElementById('waitingRoomStatus');

let currentPlayerId = '';
let isHost = false;
let currentRoomCode = '';
let isJudge = false;
let currentJudgeName = '';
let currentPlayerName = '';

// Track socket ID
socket.on('connect', () => {
  currentPlayerId = socket.id;
});

hostBtn.onclick = () => {
  startScreen.classList.add('hidden');
  hostForm.classList.remove('hidden');
  document.getElementById('scoreboard').classList.add('hidden');
};

joinBtn.onclick = () => {
  startScreen.classList.add('hidden');
  joinForm.classList.remove('hidden');
  document.getElementById('scoreboard').classList.add('hidden');
};

rejoinBtn.onclick = () => {
  const savedRoom = localStorage.getItem('roomCode');
  const savedName = localStorage.getItem('playerName');

  if (!savedRoom || !savedName) {
    alert("No previous game info found.");
    return;
  }

  startScreen.classList.add('hidden');
  socket.emit('rejoinRoom', { code: savedRoom, name: savedName });
  status.innerText = `Rejoining game...`;
};

retryJoinBtn.onclick = () => {
  const savedRoom = localStorage.getItem('roomCode');
  const savedName = localStorage.getItem('playerName');
  if (savedRoom && savedName) {
    socket.emit('rejoinRoom', { code: savedRoom, name: savedName });
    status.innerText = 'Trying again to rejoin...';
  }
};

createRoomBtn.onclick = () => {
  const name = hostNameInput.value.trim();
  const count = parseInt(playerCountInput.value);
  const password = roomPasswordInput.value.trim();
  if (!name || !count || !password) return alert("Fill all fields");

  isHost = true;
  currentPlayerName = name;
  socket.emit('createRoom', { name, count, password });
};

joinRoomBtn.onclick = () => {
  const name = playerNameInput.value.trim();
  const code = roomCodeInput.value.trim().toUpperCase();
  const password = joinPasswordInput.value.trim();
  if (!name || !code || !password) return alert("Fill all fields");

  currentPlayerName = name;
  socket.emit('joinRoom', { name, code, password });
  localStorage.setItem('roomCode', code || currentRoomCode);
  localStorage.setItem('playerName', name);
};

startGameBtn.onclick = () => {
  socket.emit('startGame', currentRoomCode);
};

startRoundBtn.onclick = () => {
  socket.emit('startRound', currentRoomCode);
};

stopGameBtn.onclick = () => {
  socket.emit('stopGame', currentRoomCode);
};

// SOCKET EVENTS
socket.on('roomCreated', (code) => {
  currentRoomCode = code;
  hostForm.classList.add('hidden');
  waitingRoom.classList.remove('hidden');
  waitingRoomStatus.innerText = `Room Code: ${code}`;
  document.getElementById('scoreboard').classList.add('hidden');

  localStorage.setItem('roomCode', code);
  localStorage.setItem('playerName', hostNameInput.value.trim());
});

socket.on('roomJoined', ({ code, players }) => {
  currentRoomCode = code;
  joinForm.classList.add('hidden');
  waitingRoom.classList.remove('hidden');
  waitingRoomStatus.innerText = `Room Code: ${code}`;
  document.getElementById('scoreboard').classList.add('hidden');
  updatePlayerList(players);
  updateScoreboard(players);
});

socket.on('roomRejoined', ({ code, players }) => {
  currentRoomCode = code;
  waitingRoom.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  document.getElementById('scoreboard').classList.remove('hidden');
  updatePlayerList(players);
  updateScoreboard(players);

  if (isHost) {
    startRoundBtn.classList.remove('hidden');
    stopGameBtn.classList.remove('hidden');
  }
});

socket.on('updatePlayerList', (players) => {
  updatePlayerList(players);
  updateScoreboard(players);
});

socket.on('allowStart', () => {
  if (isHost) {
    startGameBtn.classList.remove('hidden');
  }
});

socket.on('gameStarted', () => {
  waitingRoom.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  document.getElementById('scoreboard').classList.remove('hidden');
  if (isHost) {
    startRoundBtn.classList.remove('hidden');
    stopGameBtn.classList.remove('hidden');
  }
});

socket.on('newRound', ({ black, whiteCards, judge }) => {
  // ✅ Force transition out of waiting room if this player was stuck there
  waitingRoom.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  document.getElementById('scoreboard').classList.remove('hidden');

  startRoundBtn.classList.add('hidden');
  blackCard.innerText = black;
  whiteCardsContainer.innerHTML = '';
  submissions.innerHTML = '';
  currentJudgeName = judge;
  isJudge = (currentPlayerName === judge);

  status.innerText = isJudge ? `You are the judge` : `Judge: ${judge}`;
  retryJoinBtn.classList.add('hidden');

  if (whiteCards.length > 0 && !isJudge) {
    whiteCards.forEach(card => {
      const btn = document.createElement('button');
      btn.innerText = card;
      btn.onclick = () => {
        socket.emit('submitCard', { roomCode: currentRoomCode, card });
        whiteCardsContainer.innerHTML = '<p>Waiting for others...</p>';
      };
      whiteCardsContainer.appendChild(btn);
    });
  } else if (isJudge) {
    whiteCardsContainer.innerHTML = '<p>Waiting for submissions...</p>';
  } else {
    whiteCardsContainer.innerHTML = '<p>Waiting for others...</p>';
  }
});

socket.on('revealSubmissions', (submitted) => {
  submissions.innerHTML = '';
  whiteCardsContainer.innerHTML = '';

  submitted.forEach(({ card, playerId }) => {
    const p = document.createElement('p');
    p.innerText = card;

    if (isJudge) {
      p.style.cursor = 'pointer';
      p.style.border = '1px solid #999';
      p.style.padding = '10px';
      p.style.margin = '5px';
      p.onclick = () => {
        socket.emit('pickWinner', { roomCode: currentRoomCode, playerId });
      };
    }

    submissions.appendChild(p);
  });
});

socket.on('roundWinner', ({ name, score }) => {
  status.innerText = `${name} won the round! Total points: ${score}`;
  if (isJudge) {
    startRoundBtn.classList.remove('hidden');
  }
  launchConfetti();
});

socket.on('statusMessage', (msg) => {
  status.innerText = msg;
  if (msg.includes('Please wait for the next round')) {
    retryJoinBtn.classList.remove('hidden');
    whiteCardsContainer.innerHTML = ''; // Clear UI
    submissions.innerHTML = ''; // Optional: clear old state
  } else {
    retryJoinBtn.classList.add('hidden');
  }
});

socket.on('gameOver', ({ winner }) => {
  status.innerText = `🏆 ${winner} has won the game!`;
  startRoundBtn.classList.add('hidden');
  launchConfetti();
  localStorage.removeItem('roomCode');
  localStorage.removeItem('playerName');
});

socket.on('startNewRound', () => {
  if (isHost || isJudge) {
    startRoundBtn.classList.remove('hidden');
  }
});

function updatePlayerList(players) {
  playerList.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.innerText = p.name;
    playerList.appendChild(li);
  });
}

function updateScoreboard(players) {
  const scoreList = document.getElementById('scoreList');
  scoreList.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    li.innerText = `${p.name}: ${p.score}`;
    scoreList.appendChild(li);
  });
}

function launchConfetti() {
  confetti({
    particleCount: 200,
    spread: 70,
    origin: { y: 0.6 }
  });
}

socket.on('roomJoined', ({ code, players }) => {
  console.log('Rejoined Room:', code);
  // existing UI logic...
});

socket.on('statusMessage', (msg) => {
  status.innerText = msg;
  setTimeout(() => {
    status.innerText = '';
  }, 5000); // clears message after 5 seconds
});

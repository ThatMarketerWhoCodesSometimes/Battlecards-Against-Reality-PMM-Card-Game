// Revised implementation to restore stable rejoining behavior for non-judge players
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

app.use(express.static(__dirname + '/'));

const cards = JSON.parse(fs.readFileSync('./cards.json'));
const rooms = {};

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

function startNewRound(code) {
  console.log(`--- Starting new round in room ${code} ---`);
  const room = rooms[code];
  if (!room) return;

  const connectedPlayers = room.players.filter(p => p.connected);
  if (connectedPlayers.length === 0) return;

  let currentIndex = room.judgeIndex;
  let nextJudge = null;

  while (!nextJudge) {
    currentIndex = (currentIndex + 1) % room.players.length;
    const candidate = room.players[currentIndex];
    if (candidate.connected) {
      nextJudge = candidate;
      break;
    }
    if (currentIndex === room.judgeIndex) break;
  }

  if (!nextJudge) {
    console.log(`[${code}] ⚠️ No connected judge found. Round not started.`);
    return;
  }

  room.judgeIndex = room.players.findIndex(p => p.name === nextJudge.name);
  room.judge = nextJudge.id;
  const black = cards.blackCards[Math.floor(Math.random() * cards.blackCards.length)];
  room.currentBlackCard = black;
  room.submissions = [];
  room.roundActive = true;
  room.judgingInProgress = false;
  room.roundSubmitters = [];

  room.players.forEach(p => {
    p.submitted = false;
    if (p.connected && p.id === room.judge) {
      p.hand = [];
      io.to(p.id).emit('newRound', { black, whiteCards: [], judge: nextJudge.name });
      console.log(`📤 Sent new round to judge ${p.name}`);
    } else if (p.connected) {
      const whiteCards = Array.from({ length: 5 }, () => cards.whiteCards[Math.floor(Math.random() * cards.whiteCards.length)]);
      p.hand = whiteCards;
      room.roundSubmitters.push(p.id);
      io.to(p.id).emit('newRound', { black, whiteCards, judge: nextJudge.name });
      console.log(`📤 Sent new round to ${p.name} with white cards`);
    }
  });

  // ✅ INSERT THIS BLOCK HERE
  console.log(`Rejoining Players: ${room.rejoiningPlayers.join(', ')}`);
  room.rejoiningPlayers.forEach(playerName => {
    const rejoinPlayer = room.players.find(p => p.name === playerName);
    if (rejoinPlayer && rejoinPlayer.connected && rejoinPlayer.id !== room.judge) {
      const whiteCards = Array.from({ length: 5 }, () =>
        cards.whiteCards[Math.floor(Math.random() * cards.whiteCards.length)]
      );
      rejoinPlayer.hand = whiteCards;
      rejoinPlayer.submitted = false;

      if (!room.roundSubmitters.includes(rejoinPlayer.id)) {
        room.roundSubmitters.push(rejoinPlayer.id);
      }

      io.to(rejoinPlayer.id).emit('newRound', {
        black,
        whiteCards,
        judge: nextJudge.name
      });

      console.log(`🔁 Rejoining player ${rejoinPlayer.name} added to new round`);
    }
  });
  room.rejoiningPlayers = [];

  // ✅ FINAL ROUND START LOGS
  console.log(`✅ Round started in room ${code} with judge ${nextJudge.name}`);
  io.to(code).emit('statusMessage', `🧑‍⚖️ New round started. Judge is ${nextJudge.name}`);
}

  socket.on('createRoom', ({ name, count, password }) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      players: [{ id: socket.id, name, score: 0, connected: true, submitted: false }],
      password,
      expectedCount: count,
      host: socket.id,
      judgeIndex: 0,
      submissions: [],
      roundActive: false,
      currentBlackCard: null,
      judgingInProgress: false,
      roundSubmitters: [],
      rejoiningPlayers: []
    };
    console.log(`Room ${roomCode} created by ${name}`);
    socket.join(roomCode);
    io.to(socket.id).emit('roomCreated', roomCode);
    io.to(roomCode).emit('updatePlayerList', rooms[roomCode].players);
  });

  socket.on('joinRoom', ({ name, code, password }) => {
    const room = rooms[code];
    if (!room || room.password !== password) return;

    const existing = room.players.find(p => p.name === name);
    if (existing) {
      existing.id = socket.id;
      existing.connected = true;
      console.log(`${name} rejoined room ${code}`);
    } else {
      room.players.push({ id: socket.id, name, score: 0, connected: true, submitted: false });
      console.log(`${name} joined room ${code}`);
    }

    socket.join(code);
    io.to(socket.id).emit('roomJoined', { code, players: room.players });
    io.to(code).emit('updatePlayerList', room.players);

    if (room.players.length === room.expectedCount) {
      io.to(code).emit('allowStart');
    }
  });

  socket.on('rejoinRoom', ({ code, name }) => {
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find(p => p.name === name);
    if (!player) return;

    console.log(`🔁 Rejoin request from: ${name} (${socket.id})`);

    if (player.connected) {
      console.log(`⚠️ Rejoin attempt ignored: ${name} is already connected`);
      return;
    }

    player.id = socket.id;
    player.connected = true;
    player.submitted = false;

    socket.join(code);
    socket.emit('roomJoined', { code, players: room.players });
    io.to(code).emit('updatePlayerList', room.players);

    const isJudge = player.id === room.judge;

    if (!room.roundActive || room.judgingInProgress) {
      if (!room.rejoiningPlayers.includes(player.name)) {
        room.rejoiningPlayers.push(player.name);
        console.log(`🕒 ${player.name} added to waiting queue for next round`);
      }
      socket.emit('statusMessage', 'Please wait for the next round to begin...');
      return;
    }

    // Mid-round rejoin
    if (!isJudge) {
      if (!player.hand || player.hand.length === 0) {
        const whiteCards = Array.from({ length: 5 }, () =>
          cards.whiteCards[Math.floor(Math.random() * cards.whiteCards.length)]
        );
        player.hand = whiteCards;
      }

      if (!room.roundSubmitters.includes(player.id)) {
        room.roundSubmitters.push(player.id);
      }

      socket.emit('newRound', {
        black: room.currentBlackCard,
        whiteCards: player.hand,
        judge: room.players.find(p => p.id === room.judge)?.name || ''
      });
      console.log(`🃏 ${player.name} rejoined mid-round with cards`);
    } else {
      socket.emit('newRound', {
        black: room.currentBlackCard,
        whiteCards: [],
        judge: room.players.find(p => p.id === room.judge)?.name || ''
      });
      console.log(`🧑‍⚖️ Judge ${player.name} rejoined mid-round`);
      if (room.judgingInProgress) {
        socket.emit('revealSubmissions', room.submissions);
      }
    }
  });

  socket.on('startGame', (code) => io.to(code).emit('gameStarted'));
  socket.on('startRound', (roomCode) => startNewRound(roomCode));

  socket.on('submitCard', ({ roomCode, card }) => {
    const room = rooms[roomCode];
    if (!room || !room.roundActive || room.judgingInProgress) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.submitted || player.id === room.judge) return;

    player.submitted = true;
    room.submissions.push({ card, playerId: player.id });

    const required = room.roundSubmitters?.length || 0;
    const submitted = room.submissions.length;
    console.log(`${player.name} submitted a card. Total: ${submitted}/${required}`);

    if (submitted >= required) {
      room.judgingInProgress = true;
      io.to(roomCode).emit('revealSubmissions', room.submissions);
    }
  });

  socket.on('pickWinner', ({ roomCode, playerId }) => {
    const room = rooms[roomCode];
    if (!room) return;
    if (socket.id !== room.judge) return;

    const winner = room.players.find(p => p.id === playerId);
    if (!winner) return;

    winner.score += 1;
    io.to(roomCode).emit('roundWinner', { name: winner.name, score: winner.score });
    io.to(roomCode).emit('updatePlayerList', room.players);

    if (winner.score >= 10) {
      io.to(roomCode).emit('gameOver', { winner: winner.name });
    }

    room.roundActive = false;
    room.judgingInProgress = false;
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      const room = rooms[code];
      const player = room.players.find(p => p.id === socket.id);
      if (!player) continue;

      player.connected = false;
      io.to(code).emit('updatePlayerList', room.players);

      if (room.judge === socket.id && room.roundActive) {
        const available = room.players.filter(p => p.connected && p.id !== socket.id);
        if (available.length > 0) {
          const newJudge = available[Math.floor(Math.random() * available.length)];
          room.judge = newJudge.id;
          room.judgeIndex = room.players.findIndex(p => p.id === newJudge.id);
          io.to(code).emit('statusMessage', `🥖 Judge disconnected. New judge is ${newJudge.name}. Starting new round...`);
          setTimeout(() => startNewRound(code), 1000);
        } else {
          io.to(code).emit('statusMessage', 'All players disconnected. Ending game.');
          delete rooms[code];
        }
      }
    }
  });

  socket.on('stopGame', (roomCode) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.host) return;
    io.to(roomCode).emit('gameOver', { winner: '⚠️ Game ended early by host' });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

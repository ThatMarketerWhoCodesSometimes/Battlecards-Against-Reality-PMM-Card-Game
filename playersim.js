const io = require("socket.io-client");
const readline = require("readline");

const [,, playerName, roomCode, password = ""] = process.argv;

let socket = io("http://localhost:3000");

let currentHand = [];
let currentSubmissions = [];

const bindSocketEvents = (sock) => {
  sock.on("connect", () => {
    console.log(`🔌 Connected as ${playerName} (${sock.id})`);
    sock.emit("joinRoom", { name: playerName, code: roomCode, password });
  });

  sock.on("roomJoined", ({ code, players }) => {
    console.log(`✅ Joined room ${code}. Current players: ${players.map(p => p.name).join(", ")}`);
  });

  sock.on("allowStart", () => {
    console.log("✅ Host can now start the game.");
  });

  sock.on("newRound", ({ black, whiteCards, judge }) => {
    console.log(`🎴 [${playerName}] New round: ${black}`);
    console.log(`👨‍⚖️ Judge: ${judge}`);
    if (whiteCards && whiteCards.length > 0) {
      currentHand = whiteCards;
      console.log(`🃏 [${playerName}] White cards:`);
      whiteCards.forEach((card, i) => console.log(`  ${i + 1}: ${card}`));
    } else {
      currentHand = [];
      console.log("🧑‍⚖️ You are the judge this round.");
    }
  });

  sock.on("revealSubmissions", (submissions) => {
    currentSubmissions = submissions;
    console.log("👁️ Submissions to judge:");
    submissions.forEach((s, i) => {
      console.log(`  ${i + 1}: ${s.card}`);
    });
  });

  sock.on("roundWinner", ({ name, score }) => {
    console.log(`🏆 Round won by ${name}! Total score: ${score}`);
  });

  sock.on("statusMessage", (msg) => {
    console.log(`💬 ${msg}`);
  });

  sock.on("disconnect", () => {
    console.log("❌ Disconnected.");
  });
};

// Bind initial socket
bindSocketEvents(socket);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on("line", (input) => {
  const [command, arg] = input.trim().split(" ");

  if (command === "submit") {
    const index = parseInt(arg, 10) - 1;
    if (currentHand[index]) {
      socket.emit("submitCard", { roomCode, card: currentHand[index] });
      console.log(`📤 Submitted card: ${currentHand[index]}`);
    } else {
      console.log("❌ Invalid card number.");
    }
  }

  if (command === "pick") {
    const index = parseInt(arg, 10) - 1;
    const submission = currentSubmissions[index];
    if (submission) {
      socket.emit("pickWinner", { roomCode, playerId: submission.playerId });
      console.log(`👑 Picked winner: ${submission.card}`);
    } else {
      console.log("❌ Invalid pick number.");
    }
  }

  if (command === "leave") {
    console.log("👋 Simulating disconnect...");
    socket.disconnect();
  }

  if (command === "start") {
    socket.emit("startRound", roomCode);
    console.log("🚀 Starting a new round...");
  }

  if (command === "rejoin") {
    console.log("🔄 Simulating reconnect...");
    socket = io("http://localhost:3000"); // Replace old socket
    bindSocketEvents(socket); // Rebind all listeners to new socket
    socket.on("connect", () => {
      console.log(`♻️ Reconnected as ${playerName} (${socket.id})`);
      socket.emit("rejoinRoom", { code: roomCode, name: playerName });
    });
  }
});

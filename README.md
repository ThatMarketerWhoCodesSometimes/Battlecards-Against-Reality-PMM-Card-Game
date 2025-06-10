# 🃏 Battlecards Against Reality

Welcome to **Battlecards Against Reality** — a multiplayer, Cards Against Humanity-style web game built to help Product Marketing Managers (PMMs) unwind and laugh with their community.

## 💡 Why This Game?

PMMs work hard. From wrangling stakeholders to launching GTM campaigns, it can be chaotic. In the midst of building AI apps for GTM work, I wanted to vibecode something fun to bring the PMM community closer.

So I built this game — because nothing says “team bonding” like **"Webinarrrr"** being the winning card.

---

## 🎮 How to Play

1. **Choose a host**
2. Host clicks **Start Game**, sets number of players, name, and a passcode
3. Other players click **Join Room**, enter the room code, their name, and the passcode
4. Once all players have joined, the host can start the game
5. Each round:
   - A black card (prompt) is shown
   - Everyone submits a white card (response)
   - A rotating judge picks the best one
   - First to 10 points wins!

---

## 🔁 Features

- Multiplayer via Socket.IO
- Automatic judge rotation
- Mid-game **disconnect & rejoin support**
- Confetti celebration for round winners
- Room code + password protected
- Real-time UI updates
- Instructions popup + bug reporting link

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express.js + Socket.IO
- **Deployment:** (To be deployed on Render)
- **Other Tools:** Google Forms for bug reporting

---

## 🧪 Local Setup (Optional)

```bash
# Clone the repo
git clone https://github.com/yourusername/pmm-card-game.git

# Navigate into folder
cd pmm-card-game

# Install dependencies
npm install

# Start the server
node server.js
```

[Play locally at http://localhost:3000](http://localhost:3000)


## 🐞 Facing bugs?
[Click here to report them!](https://docs.google.com/forms/d/e/1FAIpQLSduGxlfCz_K2Sli5cxU0qZBUkXDybzUl50L2O0_qXiQ4TSXEg/viewform?usp=header)


Made with ❤️ by a PMM for PMMs

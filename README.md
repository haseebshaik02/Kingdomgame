# ♛ Raja Rani — Multiplayer Card Game

A mobile-friendly multiplayer card distribution game built with Node.js, Express, and Socket.IO.

## 🚀 Getting Started

### Prerequisites
- Node.js v14 or higher

### Installation

```bash
# Clone or download the project, then:
cd raja-rani-game
npm install
```

### Running the Server

```bash
node server.js
```

Server starts at **http://localhost:3000**

Open this URL in any browser (works great on mobile too!).

---

## 🎮 How to Play

### Hosting a Game
1. Open the app and tap **Host a Game**
2. Enter your name and configure the card counts (Kings, Queens, Thieves)
3. Tap **Create Room** — a 5-letter room code appears
4. Share the code with your friends

### Joining a Game
1. Open the app and tap **Join a Game**
2. Enter your name and the room code
3. Tap **Join Room** — you'll appear in the player list

### Starting the Game
1. Once all players have joined, the **Host** taps **Shuffle & Deal Cards**
2. Each player instantly sees only their own card:
   - 👑 **King** — the ruler
   - 👸 **Queen** — the royal consort
   - 🕵️ **Thief** — the hidden criminal

> Total players must equal total cards (Kings + Queens + Thieves)

---

## 🗂️ Project Structure

```
raja-rani-game/
├── server.js          # Express + Socket.IO server
├── package.json
├── README.md
└── public/
    ├── index.html     # All pages (SPA)
    ├── style.css      # Styling with royal theme
    └── script.js      # Client-side socket logic
```

## ⚙️ Technical Details

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Storage**: In-memory (no database needed)
- **Card shuffle**: Fisher-Yates algorithm
- **Room codes**: Random 5-character alphanumeric

## 🌐 Multiplayer on Your Network

To play with others on the same Wi-Fi network:

```bash
# Find your local IP (e.g. 192.168.1.5)
# Others can join at:
http://192.168.1.5:3000
```

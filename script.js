const socket = io();

// ── STATE ──
let myName = '';
let myRoomCode = '';
let isHost = false;
let cardConfig = { king: 1, queen: 1, thief: 1 };

// ── PAGE NAVIGATION ──
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');
  window.scrollTo(0, 0);
}

// ── TOAST ──
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── ERROR HELPERS ──
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}
function clearError(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.classList.remove('show');
}

// ── CREATE ROOM (HOST) ──
function createRoom() {
  clearError('host-error');

  const hostName = document.getElementById('host-name').value.trim();
  const king = parseInt(document.getElementById('king-count').value) || 0;
  const queen = parseInt(document.getElementById('queen-count').value) || 0;
  const thief = parseInt(document.getElementById('thief-count').value) || 0;

  if (!hostName) {
    showError('host-error', 'Please enter your name.');
    return;
  }
  if (king + queen + thief < 2) {
    showError('host-error', 'Total cards must be at least 2.');
    return;
  }
  if (king + queen + thief > 30) {
    showError('host-error', 'Total cards cannot exceed 30.');
    return;
  }

  myName = hostName;
  isHost = true;
  cardConfig = { king, queen, thief };

  socket.emit('createRoom', { cardConfig, hostName }, (res) => {
    if (res.success) {
      myRoomCode = res.roomCode;
      enterRoom();
    } else {
      showError('host-error', res.error || 'Failed to create room.');
    }
  });
}

// ── JOIN ROOM ──
function joinRoom() {
  clearError('join-error');

  const name = document.getElementById('join-name').value.trim();
  const code = document.getElementById('join-code').value.trim().toUpperCase();

  if (!name) {
    showError('join-error', 'Please enter your name.');
    return;
  }
  if (code.length !== 5) {
    showError('join-error', 'Room code must be 5 characters.');
    return;
  }

  myName = name;
  isHost = false;

  socket.emit('joinRoom', { name, roomCode: code }, (res) => {
    if (res.success) {
      myRoomCode = res.roomCode;
      cardConfig = res.cardConfig;
      enterRoom();
    } else {
      showError('join-error', res.error || 'Could not join room.');
    }
  });
}

// ── ENTER ROOM UI ──
function enterRoom() {
  document.getElementById('room-display-code').textContent = myRoomCode;
  document.getElementById('room-display-name').textContent = myName;

  // Render config pills
  const pillWrap = document.getElementById('config-pills-wrap');
  pillWrap.innerHTML = `
    <div class="config-pill king">👑 ${cardConfig.king} King${cardConfig.king !== 1 ? 's' : ''}</div>
    <div class="config-pill queen">👸 ${cardConfig.queen} Queen${cardConfig.queen !== 1 ? 's' : ''}</div>
    <div class="config-pill thief">🕵️ ${cardConfig.thief} Thief${cardConfig.thief !== 1 ? '' : ''}</div>
  `;

  // Host controls
  document.getElementById('host-controls').style.display = isHost ? 'block' : 'none';
  document.getElementById('waiting-for-host').style.display = isHost ? 'none' : 'block';

  showPage('room');
}

// ── SHUFFLE CARDS ──
function shuffleCards() {
  clearError('shuffle-error');
  document.getElementById('shuffle-btn').disabled = true;
  socket.emit('shuffleCards', { roomCode: myRoomCode });
}

// ── CARD DATA ──
const cardData = {
  KING:  { emoji: '👑', label: 'KING',  class: 'king'  },
  QUEEN: { emoji: '👸', label: 'QUEEN', class: 'queen' },
  THIEF: { emoji: '🕵️', label: 'THIEF', class: 'thief' },
};

// ── REVEAL CARD ──
function revealCard(cardType) {
  const data = cardData[cardType];
  if (!data) return;

  // Hide controls, show card area
  document.getElementById('host-controls').style.display = 'none';
  document.getElementById('waiting-for-host').style.display = 'none';
  document.getElementById('card-reveal-area').style.display = 'flex';

  const card = document.getElementById('playing-card');
  card.className = `playing-card ${data.class}`;

  document.getElementById('card-main-emoji').textContent = data.emoji;
  document.getElementById('card-main-label').textContent = data.label;
  document.getElementById('card-corner-emoji-tl').textContent = data.emoji;
  document.getElementById('card-corner-label-tl').textContent = data.label;
  document.getElementById('card-corner-emoji-br').textContent = data.emoji;
  document.getElementById('card-corner-label-br').textContent = data.label;

  // Trigger animation
  setTimeout(() => card.classList.add('revealed'), 100);
}

// ── RENDER PLAYER LIST ──
function renderPlayers(players, hostId) {
  const list = document.getElementById('players-list');
  const badge = document.getElementById('player-count-badge');
  badge.textContent = players.length;

  list.innerHTML = players.map(player => {
    const initials = player.name.charAt(0).toUpperCase();
    const isThisHost = player.id === hostId;
    return `
      <li class="player-item">
        <div class="player-avatar">${initials}</div>
        <span class="player-name">${escapeHtml(player.name)}</span>
        ${isThisHost ? '<span class="player-badge">HOST</span>' : ''}
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── SOCKET EVENTS ──
socket.on('updatePlayers', ({ players, host }) => {
  renderPlayers(players, host);
});

socket.on('receiveCard', ({ card }) => {
  revealCard(card);
  showToast('Your card has been revealed! 🎴');
});

socket.on('gameStarted', ({ players }) => {
  // Update player list without cards (just names)
  // UI already handles reveal via receiveCard
});

socket.on('error', ({ message }) => {
  if (document.getElementById('shuffle-btn')) {
    document.getElementById('shuffle-btn').disabled = false;
    showError('shuffle-error', message);
  }
});

socket.on('disconnect', () => {
  showToast('Connection lost. Please refresh.');
});

// ── ENTER KEY HELPERS ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('host-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') createRoom();
  });
  document.getElementById('join-code').addEventListener('keydown', e => {
    if (e.key === 'Enter') joinRoom();
  });
  document.getElementById('join-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('join-code').focus();
  });
});

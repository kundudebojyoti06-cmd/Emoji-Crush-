const board = document.getElementById("board");
const scoreEl = document.getElementById("score");
const movesEl = document.getElementById("moves");
const bombCountEl = document.getElementById("bombCount");

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");

const startBtn = document.getElementById("startBtn");
const helpBtn = document.getElementById("helpBtn");
const helpBox = document.getElementById("helpBox");

const exitBtn = document.getElementById("exitBtn");

const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popupTitle");
const popupMsg = document.getElementById("popupMsg");
const restartBtn = document.getElementById("restartBtn");

const bgMusic = document.getElementById("bgMusic");
const swapSound = document.getElementById("swapSound");
const matchSound = document.getElementById("matchSound");
const bombSound = document.getElementById("bombSound");
const laughSound = document.getElementById("laughSound");

const muteBtnHome = document.getElementById("muteBtnHome");
const muteBtnGame = document.getElementById("muteBtnGame");

const size = 7;
let grid = [];
let score = 0;
let moves = 30;
let bombsMade = 0;

let selected = null;
let isBusy = false;

let musicMuted = false;

const emojis = ["😂", "😭", "😍", "😨", "😎"];
const angryEmoji = "😡";
const bombEmoji = "💣";

// 😡 কম রাখার জন্য probability
function randomEmoji() {
  const chance = Math.random();
  if (chance < 0.07) return angryEmoji; 
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// Audio helper
function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// Music control
function updateMusicButtons() {
  if (musicMuted) {
    muteBtnHome.textContent = "🔇 Music OFF";
    muteBtnGame.textContent = "🔇";
    bgMusic.muted = true;
  } else {
    muteBtnHome.textContent = "🔊 Music ON";
    muteBtnGame.textContent = "🔊";
    bgMusic.muted = false;
  }
}

// Init Game
function initGame() {
  board.innerHTML = "";
  grid = [];
  score = 0;
  moves = 30;
  bombsMade = 0;
  selected = null;

  scoreEl.textContent = score;
  movesEl.textContent = moves;
  bombCountEl.textContent = bombsMade;

  popup.style.display = "none";

  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = randomEmoji();
      const cell = createCell(r, c);
      board.appendChild(cell);
    }
  }

  removeStartMatches();
  renderBoard(false);
}

// Avoid starting auto match
function removeStartMatches() {
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (checkMatchAt(r, c)) {
          grid[r][c] = randomEmoji();
          changed = true;
        }
      }
    }
  }
}

// Create cell
function createCell(r, c) {
  const div = document.createElement("div");
  div.classList.add("cell");
  div.dataset.row = r;
  div.dataset.col = c;

  div.addEventListener("click", () => handleTap(r, c));
  div.addEventListener("touchstart", (e) => handleTouchStart(e, r, c), { passive: true });
  div.addEventListener("touchend", (e) => handleTouchEnd(e, r, c), { passive: true });

  return div;
}

// Render board (NO BLACK FLASH FIX)
function renderBoard(fallAnimate = false) {
  const cells = document.querySelectorAll(".cell");

  cells.forEach(cell => {
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);

    cell.textContent = grid[r][c] || "";

    if (fallAnimate) {
      cell.classList.remove("fall");
      void cell.offsetWidth;
      cell.classList.add("fall");
    }
  });
}

// Tap swap system
function handleTap(r, c) {
  if (isBusy) return;

  if (!selected) {
    selected = { r, c };
    return;
  }

  const sr = selected.r;
  const sc = selected.c;

  if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
    selected = null;
    swapAndProcess(sr, sc, r, c);
  } else {
    selected = { r, c };
  }
}

// Touch swipe system
let touchStartX = 0;
let touchStartY = 0;
let touchStartCell = null;

function handleTouchStart(e, r, c) {
  if (isBusy) return;
  touchStartCell = { r, c };
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}

function handleTouchEnd(e, r, c) {
  if (isBusy) return;
  if (!touchStartCell) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  let targetR = touchStartCell.r;
  let targetC = touchStartCell.c;

  if (absX > absY && absX > 25) {
    targetC += dx > 0 ? 1 : -1;
  } else if (absY > 25) {
    targetR += dy > 0 ? 1 : -1;
  } else {
    return;
  }

  if (targetR < 0 || targetR >= size || targetC < 0 || targetC >= size) return;

  swapAndProcess(touchStartCell.r, touchStartCell.c, targetR, targetC);
}

// Get cell
function getCell(r, c) {
  return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
}

// Faster swap animation
function animateSwap(r1, c1, r2, c2) {
  const cell1 = getCell(r1, c1);
  const cell2 = getCell(r2, c2);

  const rect1 = cell1.getBoundingClientRect();
  const rect2 = cell2.getBoundingClientRect();

  const dx = rect2.left - rect1.left;
  const dy = rect2.top - rect1.top;

  cell1.classList.add("swap");
  cell2.classList.add("swap");

  cell1.style.transform = `translate(${dx}px, ${dy}px)`;
  cell2.style.transform = `translate(${-dx}px, ${-dy}px)`;

  return new Promise(resolve => {
    setTimeout(() => {
      cell1.style.transform = "";
      cell2.style.transform = "";
      cell1.classList.remove("swap");
      cell2.classList.remove("swap");
      resolve();
    }, 190);
  });
}

// Swap and process
async function swapAndProcess(r1, c1, r2, c2) {
  if (isBusy) return;
  isBusy = true;

  playSound(swapSound);

  await animateSwap(r1, c1, r2, c2);

  // swap data
  const temp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = temp;

  renderBoard(false);

  // Bomb + Bomb swap
  if (grid[r1][c1] === bombEmoji && grid[r2][c2] === bombEmoji) {
    playSound(bombSound);
    clearAll();
    await refillBoard();
    endMove();
    isBusy = false;
    return;
  }

  // Bomb swap with emoji
  if (grid[r1][c1] === bombEmoji || grid[r2][c2] === bombEmoji) {
    playSound(bombSound);
    explodeBomb(r1, c1, r2, c2);
    await refillBoard();
    endMove();
    isBusy = false;
    return;
  }

  // normal match check
  const matched = findMatches();
  if (matched.length === 0) {
    await animateSwap(r1, c1, r2, c2);

    const t = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = t;

    renderBoard(false);
    isBusy = false;
    return;
  }

  await crushAndRefill();
  endMove();
  isBusy = false;
}

// End move
function endMove() {
  moves--;
  movesEl.textContent = moves;

  if (bombsMade >= 5) {
    showPopup("You Win 🎉", "Congrats! You made 5 bombs!");
    return;
  }

  if (moves <= 0) {
    showPopup("Game Over 😢", "Moves finished! Try again.");
  }
}

// Match check at position
function checkMatchAt(r, c) {
  const val = grid[r][c];

  let countH = 1;
  if (c > 0 && grid[r][c - 1] === val) countH++;
  if (c < size - 1 && grid[r][c + 1] === val) countH++;

  let countV = 1;
  if (r > 0 && grid[r - 1][c] === val) countV++;
  if (r < size - 1 && grid[r + 1][c] === val) countV++;

  return countH >= 3 || countV >= 3;
}

// Find matches
function findMatches() {
  let matched = [];

  // Horizontal
  for (let r = 0; r < size; r++) {
    let count = 1;
    for (let c = 1; c < size; c++) {
      if (grid[r][c] === grid[r][c - 1] && grid[r][c] !== null) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) matched.push({ r, c: c - 1 - k });
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) matched.push({ r, c: size - 1 - k });
    }
  }

  // Vertical
  for (let c = 0; c < size; c++) {
    let count = 1;
    for (let r = 1; r < size; r++) {
      if (grid[r][c] === grid[r - 1][c] && grid[r][c] !== null) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) matched.push({ r: r - 1 - k, c });
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) matched.push({ r: size - 1 - k, c });
    }
  }

  return matched;
}

// Crush and refill (NO BLACK SCREEN FIX)
async function crushAndRefill() {
  let matched = findMatches();
  if (matched.length === 0) return;

  playSound(matchSound);

  let hasLaugh = matched.some(m => grid[m.r][m.c] === "😂");
  if (hasLaugh) playSound(laughSound);

  let angryMatched = matched.filter(m => grid[m.r][m.c] === angryEmoji);
  let bombPlaced = false;

  if (angryMatched.length >= 3) {
    bombsMade++;
    bombCountEl.textContent = bombsMade;

    const pos = angryMatched[0];
    grid[pos.r][pos.c] = bombEmoji;
    bombPlaced = true;
  }

  matched.forEach(m => {
    if (bombPlaced && grid[m.r][m.c] === bombEmoji) return;
    grid[m.r][m.c] = null;
  });

  score += matched.length * 10;
  scoreEl.textContent = score;

  renderBoard(false);

  await refillBoard();

  let again = findMatches();
  if (again.length > 0) {
    await crushAndRefill();
  }
}

// Gravity refill ONLY match হলে
async function refillBoard() {
  return new Promise(resolve => {
    setTimeout(() => {
      for (let c = 0; c < size; c++) {
        let emptySpaces = 0;

        for (let r = size - 1; r >= 0; r--) {
          if (grid[r][c] === null) {
            emptySpaces++;
          } else if (emptySpaces > 0) {
            grid[r + emptySpaces][c] = grid[r][c];
            grid[r][c] = null;
          }
        }

        for (let r = 0; r < emptySpaces; r++) {
          grid[r][c] = randomEmoji();
        }
      }

      renderBoard(true);
      resolve();
    }, 80);
  });
}

// Bomb explosion
function explodeBomb(r1, c1, r2, c2) {
  let bombR, bombC;

  if (grid[r1][c1] === bombEmoji) {
    bombR = r1;
    bombC = c1;
  } else {
    bombR = r2;
    bombC = c2;
  }

  for (let rr = bombR - 1; rr <= bombR + 1; rr++) {
    for (let cc = bombC - 1; cc <= bombC + 1; cc++) {
      if (rr >= 0 && rr < size && cc >= 0 && cc < size) {
        grid[rr][cc] = null;
      }
    }
  }

  score += 90;
  scoreEl.textContent = score;

  renderBoard(false);
}

// Clear all (Bomb + Bomb)
function clearAll() {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid[r][c] = null;
    }
  }

  score += 300;
  scoreEl.textContent = score;

  renderBoard(false);
}

// Popup
function showPopup(title, msg) {
  popupTitle.textContent = title;
  popupMsg.textContent = msg;
  popup.style.display = "flex";
}

// Events
startBtn.addEventListener("click", () => {
  homeScreen.classList.remove("active");
  gameScreen.classList.add("active");

  initGame();

  bgMusic.volume = 0.6;
  bgMusic.play().catch(() => {});
});

helpBtn.addEventListener("click", () => {
  helpBox.style.display = helpBox.style.display === "block" ? "none" : "block";
});

exitBtn.addEventListener("click", () => {
  gameScreen.classList.remove("active");
  homeScreen.classList.add("active");
});

restartBtn.addEventListener("click", () => {
  popup.style.display = "none";
  initGame();
});

muteBtnHome.addEventListener("click", () => {
  musicMuted = !musicMuted;
  updateMusicButtons();
});

muteBtnGame.addEventListener("click", () => {
  musicMuted = !musicMuted;
  updateMusicButtons();
});

// Init music state
updateMusicButtons();

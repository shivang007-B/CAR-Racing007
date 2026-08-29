/**
 * CAR Racing 007 - Cyberpunk Neon Turbo Edition
 * Advanced real-time racing engine featuring point collection, nitro boost,
 * collectibles, car selection, synth audio engine, particle FX, and SVG icons.
 */

// ==========================================
// 1. SOUND & AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.engineOsc = null;
    this.engineGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupEngineRumble();
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.ctx && this.ctx.state === "suspended" && this.enabled) {
      this.ctx.resume();
    }
    if (!this.enabled && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.enabled;
  }

  setupEngineRumble() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  updateEngine(speed, isBoosting) {
    if (!this.ctx || !this.enabled || !this.engineOsc) return;
    const freq = 50 + speed * 12 + (isBoosting ? 40 : 0);
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    const volume = this.enabled ? (isBoosting ? 0.08 : 0.04) : 0;
    this.engineGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
  }

  playCoinSound() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playNitroSound() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playShieldSound() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playCrashSound() {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.45);
  }
}

const sounds = new SoundEngine();

// ==========================================
// 2. GAME STATE & CONSTANTS
// ==========================================
const CAR_TYPES = {
  cruiser: { name: "Cyber Cruiser", speed: 6, maxSpeed: 16, health: 100, handling: 7, color: "#00f3ff" },
  phantom: { name: "Phantom Speed", speed: 8, maxSpeed: 20, health: 70, handling: 9, color: "#ffe600" },
  vanguard: { name: "Vanguard Enforcer", speed: 5, maxSpeed: 14, health: 140, handling: 5, color: "#ff007f" }
};

const LANES = [40, 130, 220, 310];

let gameState = {
  active: false,
  paused: false,
  selectedCarKey: "cruiser",
  score: 0,
  highScore: parseInt(localStorage.getItem("cyber_race_highscore")) || 0,
  coins: 0,
  combo: 0,
  multiplier: 1,
  distance: 0,
  speed: 5,
  nitro: 100,
  health: 100,
  maxHealth: 100,
  shieldTimer: 0,
  isBoosting: false
};

let keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  nitro: false
};

let lines = [];
let enemies = [];
let collectibles = [];
let particles = [];
let playerCarElem = null;
let playerPos = { x: 180, y: 550 };
let animFrameId = null;

// SVG Icon Templates
const SVG_ICONS = {
  coin: `<svg class="icon icon-yellow" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  nitro: `<svg class="icon icon-cyan" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2.5-1.12 2.5-2.5 0-1.78-1.5-3.5-2.5-5-1 1.5-2.5 3.22-2.5 5zm3.5-12.5C6.5 6 4 10 4 14a8 8 0 0 0 16 0c0-6-7-10-8-12zm0 18a6 6 0 0 1-6-6c0-3.3 2.7-6.7 6-9.7 3.3 3 6 6.4 6 9.7a6 6 0 0 1-6 6z"/></svg>`,
  shield: `<svg class="icon icon-green" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8Z"/></svg>`,
  repair: `<svg class="icon icon-magenta" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.4-2.4c.4-.4.4-1 0-1.3z"/></svg>`,
  soundOn: `<svg class="icon icon-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  soundMute: `<svg class="icon icon-pink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>`
};

// ==========================================
// 3. DOM ELEMENTS
// ==========================================
const gameArea = document.getElementById("gameArea");
const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const coinsDisplay = document.getElementById("coinsDisplay");
const distanceDisplay = document.getElementById("distanceDisplay");
const speedometer = document.getElementById("speedometer");
const nitroBar = document.getElementById("nitroBar");
const healthBar = document.getElementById("healthBar");
const multiplierBadge = document.getElementById("multiplierBadge");

const startModal = document.getElementById("startModal");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverModal = document.getElementById("gameOverModal");
const startBtn = document.getElementById("startBtn");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtn = document.getElementById("restartBtn");

const finalScore = document.getElementById("finalScore");
const bestScore = document.getElementById("bestScore");
const finalCoins = document.getElementById("finalCoins");
const finalDistance = document.getElementById("finalDistance");
const pauseScore = document.getElementById("pauseScore");

const audioBtn = document.getElementById("audioBtn");
const audioIcon = document.getElementById("audioIcon");
const audioText = document.getElementById("audioText");

highScoreDisplay.innerText = gameState.highScore.toString().padStart(6, '0');

// ==========================================
// 4. EVENT LISTENERS & CONTROLS
// ==========================================
audioBtn.addEventListener("click", () => {
  sounds.init();
  const enabled = sounds.toggle();
  audioIcon.innerHTML = enabled ? SVG_ICONS.soundOn : SVG_ICONS.soundMute;
  audioText.innerText = enabled ? "SOUND: ON" : "MUTED";
});

document.querySelectorAll(".car-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".car-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    gameState.selectedCarKey = card.dataset.car;
  });
});

startBtn.addEventListener("click", () => {
  sounds.init();
  startGame();
});

resumeBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", () => {
  gameOverModal.classList.add("hide");
  startModal.classList.remove("hide");
});

document.addEventListener("keydown", e => {
  sounds.init();
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyS", "KeyA", "KeyD"].includes(e.code)) {
    e.preventDefault();
  }

  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.nitro = true;

  if ((e.code === "Space" || e.code === "KeyP") && gameState.active) {
    togglePause();
  }
});

document.addEventListener("keyup", e => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.nitro = false;
});

const bindTouch = (elemId, keyProp) => {
  const btn = document.getElementById(elemId);
  if (!btn) return;
  btn.addEventListener("touchstart", e => { e.preventDefault(); keys[keyProp] = true; });
  btn.addEventListener("touchend", e => { e.preventDefault(); keys[keyProp] = false; });
  btn.addEventListener("mousedown", () => keys[keyProp] = true);
  btn.addEventListener("mouseup", () => keys[keyProp] = false);
};

bindTouch("btnLeft", "left");
bindTouch("btnRight", "right");
bindTouch("btnNitro", "nitro");

// ==========================================
// 5. GAME INITIALIZATION & SETUP
// ==========================================
function startGame() {
  const carConfig = CAR_TYPES[gameState.selectedCarKey];
  
  gameState.active = true;
  gameState.paused = false;
  gameState.score = 0;
  gameState.coins = 0;
  gameState.combo = 0;
  gameState.multiplier = 1;
  gameState.distance = 0;
  gameState.speed = carConfig.speed;
  gameState.nitro = 100;
  gameState.health = carConfig.health;
  gameState.maxHealth = carConfig.health;
  gameState.shieldTimer = 0;
  gameState.isBoosting = false;

  startModal.classList.add("hide");
  pauseScreen.classList.add("hide");
  gameOverModal.classList.add("hide");

  gameArea.innerHTML = `
    <div class="road-side-glow road-side-left"></div>
    <div class="road-side-glow road-side-right"></div>
  `;

  lines = [];
  enemies = [];
  collectibles = [];
  particles = [];

  for (let l = 1; l < 4; l++) {
    const xPos = l * 110;
    for (let i = 0; i < 6; i++) {
      let line = document.createElement("div");
      line.classList.add("lane-marker");
      line.style.left = xPos + "px";
      line.y = i * 150;
      line.style.top = line.y + "px";
      gameArea.appendChild(line);
      lines.push(line);
    }
  }

  playerCarElem = document.createElement("div");
  playerCarElem.classList.add("car");
  playerCarElem.innerHTML = `
    <div class="shield-aura"></div>
    <div class="car-body">
      <div class="car-headlights">
        <div class="headlight"></div>
        <div class="headlight"></div>
      </div>
      <div class="car-windshield"></div>
      <div class="car-taillights">
        <div class="taillight"></div>
        <div class="taillight"></div>
      </div>
    </div>
    <div class="thruster-flame"></div>
  `;
  
  if (gameState.selectedCarKey === "phantom") {
    playerCarElem.querySelector(".car-body").style.borderColor = "var(--neon-yellow)";
    playerCarElem.querySelector(".car-body").style.boxShadow = "0 0 20px var(--neon-yellow)";
  } else if (gameState.selectedCarKey === "vanguard") {
    playerCarElem.querySelector(".car-body").style.borderColor = "var(--neon-magenta)";
    playerCarElem.querySelector(".car-body").style.boxShadow = "0 0 20px var(--neon-magenta)";
  }

  gameArea.appendChild(playerCarElem);
  playerPos = { x: 194, y: 560 };
  updatePlayerCarPosition();

  for (let i = 0; i < 3; i++) {
    spawnEnemy( (i + 1) * -280 );
  }

  for (let i = 0; i < 2; i++) {
    spawnCollectible( (i + 1) * -400 );
  }

  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(gameLoop);
}

// ==========================================
// 6. MAIN GAME LOOP & UPDATES
// ==========================================
function gameLoop() {
  if (!gameState.active) return;
  if (gameState.paused) return;

  const carConfig = CAR_TYPES[gameState.selectedCarKey];

  const wantsBoost = (keys.nitro || keys.up) && gameState.nitro > 5;
  if (wantsBoost) {
    gameState.isBoosting = true;
    gameState.speed = Math.min(carConfig.maxSpeed, gameState.speed + 0.3);
    gameState.nitro = Math.max(0, gameState.nitro - 0.6);
    playerCarElem.classList.add("boosting");
    sounds.playNitroSound();
    
    createParticle(playerPos.x + 26, playerPos.y + 90, "var(--neon-cyan)", 4, (Math.random() - 0.5) * 2, 4 + Math.random() * 3);
  } else {
    gameState.isBoosting = false;
    gameState.speed = Math.max(carConfig.speed, gameState.speed - 0.2);
    gameState.nitro = Math.min(100, gameState.nitro + 0.15);
    playerCarElem.classList.remove("boosting");
  }

  if (gameState.shieldTimer > 0) {
    gameState.shieldTimer -= 1;
    playerCarElem.classList.add("shielded");
  } else {
    playerCarElem.classList.remove("shielded");
  }

  sounds.updateEngine(gameState.speed, gameState.isBoosting);

  const steerSpeed = carConfig.handling;
  if (keys.left && playerPos.x > 15) playerPos.x -= steerSpeed;
  if (keys.right && playerPos.x < 370) playerPos.x += steerSpeed;
  if (keys.up && playerPos.y > 80) playerPos.y -= 2;
  if (keys.down && playerPos.y < 620) playerPos.y += 2;

  updatePlayerCarPosition();

  lines.forEach(line => {
    line.y += gameState.speed;
    if (line.y >= 800) line.y -= 900;
    line.style.top = line.y + "px";
  });

  enemies.forEach((enemy, idx) => {
    enemy.y += (gameState.speed - enemy.speedDiff);
    enemy.style.top = enemy.y + "px";

    if (isColliding(playerCarElem, enemy)) {
      handleCrash(enemy, idx);
    }

    if (enemy.y >= 850) {
      resetEnemy(enemy, -250 - Math.random() * 300);
    }
  });

  collectibles.forEach((item, idx) => {
    item.y += gameState.speed;
    item.style.top = item.y + "px";

    if (isColliding(playerCarElem, item)) {
      collectItem(item, idx);
    } else if (item.y >= 850) {
      resetCollectible(item, -300 - Math.random() * 400);
    }
  });

  updateParticles();

  gameState.distance += (gameState.speed * 0.001);
  const basePoints = Math.floor(gameState.speed * 0.5 * gameState.multiplier);
  gameState.score += basePoints;

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("cyber_race_highscore", gameState.highScore);
  }

  updateHUD();

  animFrameId = requestAnimationFrame(gameLoop);
}

function updatePlayerCarPosition() {
  playerCarElem.style.left = playerPos.x + "px";
  playerCarElem.style.top = playerPos.y + "px";
  
  let rot = 0;
  if (keys.left) rot = -6;
  if (keys.right) rot = 6;
  playerCarElem.style.transform = `rotate(${rot}deg)`;
}

// ==========================================
// 7. ENEMY TRAFFIC & COLLECTIBLES MANAGEMENT
// ==========================================
function spawnEnemy(startY) {
  const enemy = document.createElement("div");
  enemy.classList.add("enemy");
  
  const type = Math.random() < 0.25 ? "truck" : (Math.random() < 0.3 ? "speedster" : "sedan");
  enemy.classList.add(type);
  
  enemy.innerHTML = `
    <div class="enemy-body">
      <div class="car-headlights"><div class="headlight"></div><div class="headlight"></div></div>
      <div class="car-windshield" style="background: rgba(255, 0, 127, 0.4);"></div>
    </div>
  `;

  resetEnemy(enemy, startY);
  gameArea.appendChild(enemy);
  enemies.push(enemy);
}

function resetEnemy(enemy, newY) {
  const laneIndex = Math.floor(Math.random() * LANES.length);
  enemy.x = LANES[laneIndex];
  enemy.y = newY;
  enemy.speedDiff = Math.random() * 2.5 - 1;
  enemy.style.left = enemy.x + "px";
  enemy.style.top = enemy.y + "px";
}

function spawnCollectible(startY) {
  const item = document.createElement("div");
  item.classList.add("collectible");
  
  resetCollectible(item, startY);
  gameArea.appendChild(item);
  collectibles.push(item);
}

function resetCollectible(item, newY) {
  const rand = Math.random();
  let type = "coin";

  if (rand < 0.55) {
    type = "coin";
  } else if (rand < 0.75) {
    type = "nitro";
  } else if (rand < 0.88) {
    type = "shield";
  } else {
    type = "repair";
  }

  item.className = `collectible ${type}`;
  item.dataset.type = type;
  item.innerHTML = SVG_ICONS[type];

  const laneIndex = Math.floor(Math.random() * LANES.length);
  item.x = LANES[laneIndex] + 8;
  item.y = newY;
  item.style.left = item.x + "px";
  item.style.top = item.y + "px";
}

function collectItem(item, idx) {
  const type = item.dataset.type;
  
  if (type === "coin") {
    sounds.playCoinSound();
    gameState.coins += 1;
    gameState.combo += 1;
    const bonus = 250 * gameState.multiplier;
    gameState.score += bonus;
    
    if (gameState.combo % 5 === 0 && gameState.multiplier < 4) {
      gameState.multiplier += 1;
      createFloatingText("MULTIPLIER UP x" + gameState.multiplier + "!", playerPos.x, playerPos.y - 20, "var(--neon-purple)");
    } else {
      createFloatingText("+" + bonus + " PTS", playerPos.x, playerPos.y - 20, "var(--neon-yellow)");
    }

    for (let i = 0; i < 10; i++) {
      createParticle(item.x + 16, item.y + 16, "var(--neon-yellow)", 4, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }
  } else if (type === "nitro") {
    sounds.playNitroSound();
    gameState.nitro = Math.min(100, gameState.nitro + 40);
    createFloatingText("NITRO REFILLED!", playerPos.x, playerPos.y - 20, "var(--neon-cyan)");
  } else if (type === "shield") {
    sounds.playShieldSound();
    gameState.shieldTimer = 480;
    createFloatingText("SHIELD ACTIVE!", playerPos.x, playerPos.y - 20, "var(--neon-green)");
  } else if (type === "repair") {
    sounds.playShieldSound();
    gameState.health = Math.min(gameState.maxHealth, gameState.health + 35);
    createFloatingText("HULL REPAIRED!", playerPos.x, playerPos.y - 20, "var(--neon-magenta)");
  }

  resetCollectible(item, -400 - Math.random() * 400);
}

// ==========================================
// 8. COLLISION & DAMAGE SYSTEM
// ==========================================
function isColliding(a, b) {
  const aRect = a.getBoundingClientRect();
  const bRect = b.getBoundingClientRect();
  const padding = 6;

  return !(
    aRect.bottom - padding < bRect.top ||
    aRect.top + padding > bRect.bottom ||
    aRect.right - padding < bRect.left ||
    aRect.left + padding > bRect.right
  );
}

function handleCrash(enemy, idx) {
  if (gameState.shieldTimer > 0) {
    sounds.playCrashSound();
    createFloatingText("SHIELD BLOCKED!", playerPos.x, playerPos.y - 20, "var(--neon-green)");
    for (let i = 0; i < 15; i++) {
      createParticle(playerPos.x + 26, playerPos.y + 45, "var(--neon-green)", 5, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }
    resetEnemy(enemy, -300);
    return;
  }

  sounds.playCrashSound();
  const damage = enemy.classList.contains("truck") ? 40 : 25;
  gameState.health -= damage;
  gameState.combo = 0;
  gameState.multiplier = 1;

  gameArea.style.transform = "translate(5px, 5px)";
  setTimeout(() => gameArea.style.transform = "translate(-5px, -5px)", 50);
  setTimeout(() => gameArea.style.transform = "translate(0, 0)", 100);

  for (let i = 0; i < 20; i++) {
    createParticle(playerPos.x + 26, playerPos.y + 45, "var(--neon-magenta)", 6, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
  }

  createFloatingText("-" + damage + " HP!", playerPos.x, playerPos.y - 20, "var(--neon-magenta)");
  resetEnemy(enemy, -350);

  if (gameState.health <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  gameState.active = false;
  sounds.playCrashSound();

  finalScore.innerText = gameState.score.toString();
  bestScore.innerText = gameState.highScore.toString();
  finalCoins.innerHTML = `${SVG_ICONS.coin} <span>${gameState.coins}</span>`;
  finalDistance.innerText = gameState.distance.toFixed(1) + " KM";

  gameOverModal.classList.remove("hide");
}

function togglePause() {
  if (!gameState.active) return;
  gameState.paused = !gameState.paused;
  
  if (gameState.paused) {
    pauseScore.innerText = gameState.score.toString();
    pauseScreen.classList.remove("hide");
  } else {
    pauseScreen.classList.add("hide");
    animFrameId = requestAnimationFrame(gameLoop);
  }
}

// ==========================================
// 9. PARTICLE ENGINE & POPUPS
// ==========================================
function createParticle(x, y, color, size, vx, vy) {
  const p = document.createElement("div");
  p.classList.add("particle");
  p.style.left = x + "px";
  p.style.top = y + "px";
  p.style.width = size + "px";
  p.style.height = size + "px";
  p.style.background = color;
  p.style.boxShadow = `0 0 10px ${color}`;

  gameArea.appendChild(p);

  particles.push({
    elem: p,
    x: x,
    y: y,
    vx: vx,
    vy: vy,
    life: 1.0
  });
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;

    p.elem.style.left = p.x + "px";
    p.elem.style.top = p.y + "px";
    p.elem.style.opacity = p.life;

    if (p.life <= 0) {
      p.elem.remove();
      particles.splice(i, 1);
    }
  }
}

function createFloatingText(text, x, y, color) {
  const elem = document.createElement("div");
  elem.classList.add("floating-text");
  elem.innerText = text;
  elem.style.left = Math.min(300, Math.max(20, x)) + "px";
  elem.style.top = y + "px";
  if (color) {
    elem.style.color = color;
    elem.style.textShadow = `0 0 10px ${color}`;
  }

  gameArea.appendChild(elem);
  setTimeout(() => elem.remove(), 800);
}

// ==========================================
// 10. HUD UPDATES
// ==========================================
function updateHUD() {
  scoreDisplay.innerText = gameState.score.toString().padStart(6, '0');
  highScoreDisplay.innerText = gameState.highScore.toString().padStart(6, '0');
  coinsDisplay.innerHTML = `${SVG_ICONS.coin} <span>${gameState.coins}</span>`;
  distanceDisplay.innerText = gameState.distance.toFixed(1) + " KM";
  
  const kmh = Math.floor(gameState.speed * 18);
  speedometer.innerText = kmh + " KM/H";
  
  nitroBar.style.width = gameState.nitro + "%";
  
  const healthPercent = Math.max(0, (gameState.health / gameState.maxHealth) * 100);
  healthBar.style.width = healthPercent + "%";

  multiplierBadge.innerText = "x" + gameState.multiplier;
}

import './style.css'
import { Game } from './game.js'
import { inject } from '@vercel/analytics'

// Initialize Vercel Analytics
inject()

// Game state
let gameState = {
  score: 0,
  lives: 3,
  isPlaying: false
};

// DOM Elements
let startScreen;
let gameScreen;
let gameOverScreen;
let playButton;
let playAgainButton;
let scoreElement;
let livesElement;
let finalScoreElement;
let canvas;
let ctx;

// Set canvas size
function resizeCanvas() {
  if (!gameScreen || !canvas) return;
  
  // Get the actual dimensions of the game screen
  const rect = gameScreen.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  console.log('Canvas resized:', canvas.width, canvas.height);
}

// Screen management
function showScreen(screen) {
  startScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  screen.classList.remove('hidden');
  console.log('Showing screen:', screen.id);
  
  // Resize canvas when showing game screen
  if (screen === gameScreen) {
    resizeCanvas();
  }
}

// Game instance
let game = null;
let animationFrameId = null;

// Game initialization
function initGame() {
  console.log('Initializing game...');
  gameState.score = 0;
  gameState.lives = 3;
  gameState.isPlaying = true;
  updateHUD();
  showScreen(gameScreen);

  // Initialize game instance
  if (game) {
    game.stop();
  }
  game = new Game(canvas, ctx);
  game.start();
  console.log('Game instance created and started');

  // Start game loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  gameLoop();
}

// Game loop
function gameLoop() {
  if (!gameState.isPlaying) {
    console.log('Game loop stopped: game not playing');
    return;
  }
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update game state
  const result = game.update(performance.now());
  
  // Update score and lives
  gameState.score += result.slicedFruits;
  // Deduct lives for hitting bombs instead of missing fruits
  if (result.hitBomb) {
    gameState.lives--;
  }
  
  // Check for game over
  if (gameState.lives <= 0) {
    gameOver();
    return;
  }
  
  // Update HUD
  updateHUD();
  
  // Continue game loop
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Game over
function gameOver() {
  console.log('Game over');
  gameState.isPlaying = false;
  if (game) {
    game.stop();
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  finalScoreElement.textContent = gameState.score;
  showScreen(gameOverScreen);
}

// Update HUD
function updateHUD() {
  scoreElement.textContent = gameState.score;
  livesElement.textContent = gameState.lives;
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  startScreen = document.getElementById('start-screen');
  gameScreen = document.getElementById('game-screen');
  gameOverScreen = document.getElementById('game-over-screen');
  playButton = document.getElementById('play-button');
  playAgainButton = document.getElementById('play-again-button');
  scoreElement = document.getElementById('score');
  livesElement = document.getElementById('lives');
  finalScoreElement = document.getElementById('final-score');
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  // Add event listeners
  playButton.addEventListener('click', initGame);
  playAgainButton.addEventListener('click', initGame);
  window.addEventListener('resize', resizeCanvas);

  // Initialize game
  showScreen(startScreen);
});

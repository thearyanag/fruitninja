import React, { useState, useEffect, useRef } from 'react';
import { Game as GameLogic } from '../game';

const Game = () => {
  const [gameState, setGameState] = useState({
    score: 0,
    lives: 3,
    isPlaying: false
  });

  const [currentScreen, setCurrentScreen] = useState('start'); // 'start', 'game', 'gameOver'
  const canvasRef = useRef(null);
  const gameInstanceRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize game
  const initGame = () => {
    setGameState({
      score: 0,
      lives: 3,
      isPlaying: true
    });
    setCurrentScreen('game');
  };

  // Handle canvas initialization when game screen is shown
  useEffect(() => {
    if (currentScreen === 'game' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set initial canvas size
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      if (gameInstanceRef.current) {
        gameInstanceRef.current.stop();
      }
      gameInstanceRef.current = new GameLogic(canvas, ctx);
      gameInstanceRef.current.start();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      gameLoop();
    }
  }, [currentScreen]);

  // Game loop
  const gameLoop = () => {
    if (!gameState.isPlaying || !gameInstanceRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const result = gameInstanceRef.current.update(performance.now());

    // Only update state if we have a valid result
    if (result) {
      setGameState(prev => {
        const newState = {
          ...prev,
          score: prev.score + (result.slicedFruits || 0),
          lives: result.lives || prev.lives
        };
        
        // Check if game is over after updating lives
        if (newState.lives <= 0 || result.gameOver) {
          gameOver();
          return newState;
        }
        
        return newState;
      });
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // Game over
  const gameOver = () => {
    setGameState(prev => ({ ...prev, isPlaying: false }));
    if (gameInstanceRef.current) {
      gameInstanceRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setCurrentScreen('gameOver');
  };

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameInstanceRef.current) {
        gameInstanceRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="game-container">
      {currentScreen === 'start' && (
        <div className="screen start-screen">
          <h1 className="cyberpunk-title">Fruit Ninja</h1>
          <button onClick={initGame}>Play</button>
        </div>
      )}

      {currentScreen === 'game' && (
        <div className="screen game-screen">
          <div className="hud">
            <div className="score">Score: {gameState.score}</div>
            <div className="lives">Lives: {gameState.lives}</div>
          </div>
          <canvas ref={canvasRef} id="gameCanvas" />
        </div>
      )}

      {currentScreen === 'gameOver' && (
        <div className="screen game-over-screen">
          <h2 className="cyberpunk-title">Game Over</h2>
          <p>Final Score: {gameState.score}</p>
          <button onClick={initGame}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default Game; 
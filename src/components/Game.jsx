import React, { useState, useEffect, useRef } from 'react';
import { Game as GameLogic } from '../game';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection } from '../constants';
import { getSliceReward, transferTokens } from '../token';

const Game = ({ isWalletConnected = false, sendTransaction }) => {
  const [gameState, setGameState] = useState({
    score: 0,
    lives: 3,
    isPlaying: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyStatus, setCopyStatus] = useState({ house: false, contract: false });
  const [rewardStatus, setRewardStatus] = useState({ loading: false, success: false, error: null });
  const { publicKey } = useWallet();

  const [currentScreen, setCurrentScreen] = useState('start'); // 'start', 'game', 'gameOver'
  const canvasRef = useRef(null);
  const gameInstanceRef = useRef(null);
  const animationFrameRef = useRef(null);

  const HOUSE_ADDRESS = "FJFbqp53DiyFcSAwf9VgMQqs4eyCnpNqEK1WrtJoEWVj";
  const CONTRACT_ADDRESS = '5H7zBHxqGZyGkvhnWT2HTcEHoXuCkehzzdeANnt5pump';

  const formatAddress = (address) => {
    if (!address) return '---';
    return `${address.toString().slice(0, 6)}...${address.toString().slice(-4)}`;
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Initialize game
  const initGame = async () => {
    // Check both wallet connection and wallet availability
    if (!isWalletConnected || isProcessing || !publicKey) {
      console.log('Wallet conditions not met:', {
        isWalletConnected,
        isProcessing,
        publicKey: !!publicKey
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Create a transaction to deduct 0.01 SOL
      const transaction = new Transaction();
      
      // Add transfer instruction of 0.01 SOL
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey('FJFbqp53DiyFcSAwf9VgMQqs4eyCnpNqEK1WrtJoEWVj'),
          lamports: 0.01 * LAMPORTS_PER_SOL
        })
      );

      console.log('Sending transaction with wallet:', publicKey.toString());

      // Send the transaction
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);

      console.log("Transaction sent with signature:", signature);

      // If transaction is successful, start the game
      setGameState({
        score: 0,
        lives: 3,
        isPlaying: true
      });
      setCurrentScreen('game');
    } catch (error) {
      console.error('Error sending transaction:', error);
      alert('Failed to process transaction. Please make sure you have enough SOL.');
    } finally {
      setIsProcessing(false);
    }
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
  const gameOver = async () => {
    setGameState(prev => ({ ...prev, isPlaying: false }));
    if (gameInstanceRef.current) {
      gameInstanceRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setCurrentScreen('gameOver');

    // Calculate and transfer token reward
    if (publicKey && gameState.score > 0) {
      setRewardStatus({ loading: true, success: false, error: null });
      try {
        const rewardAmount = getSliceReward(gameState.score);
        if (rewardAmount > 0) {
          await transferTokens(connection, publicKey, publicKey, rewardAmount);
          setRewardStatus({ loading: false, success: true, error: null });
        }
      } catch (error) {
        console.error('Error transferring reward:', error);
        setRewardStatus({ loading: false, success: false, error: error.message });
      }
    }
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

  const [isClaimed, setIsClaimed] = useState(false);
  const [isClaimProcessing, setIsClaimProcessing] = useState(false);

  const handleClaim = async () => {
    if (!publicKey || !gameState.score) {
      console.log('Cannot claim: missing wallet or score', { publicKey: !!publicKey, score: gameState.score });
      return;
    }
    
    setIsClaimProcessing(true);
    setRewardStatus({ loading: true, success: false, error: null });
    
    try {
      const rewardAmount = getSliceReward(gameState.score);
      console.log('Calculating reward:', { score: gameState.score, rewardAmount });
      
      if (rewardAmount > 0) {
        console.log('Initiating claim process...');
        await transferTokens(publicKey.toString(), gameState.score);
        console.log('Claim successful');
        setRewardStatus({ 
          loading: false, 
          success: true, 
          error: null,
          message: `Successfully claimed ${rewardAmount} tokens!`
        });
        setIsClaimed(true);
      } else {
        setRewardStatus({ 
          loading: false, 
          success: false, 
          error: 'Score too low to receive rewards'
        });
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      setRewardStatus({ 
        loading: false, 
        success: false, 
        error: error.message || 'Failed to claim reward'
      });
    } finally {
      setIsClaimProcessing(false);
    }
  };

  const resetGame = () => {
    setIsClaimed(false);
    setIsClaimProcessing(false);
    initGame();
  };

  return (
    <div className="game-wrapper">
      <div className="address-info">
        <div className="address-field">
          <span className="address-label">House Wallet:</span>
          <div className="address-copy-wrapper">
            <span className="address-value">{formatAddress(HOUSE_ADDRESS)}</span>
            <button 
              className={`copy-button ${copyStatus.house ? 'copied' : ''}`}
              onClick={() => copyToClipboard(HOUSE_ADDRESS, 'house')}
              title="Copy address"
            >
              {copyStatus.house ? '✓' : '📋'}
            </button>
          </div>
        </div>
        <div className="address-field">
          <span className="address-label">Contract Address:</span>
          <div className="address-copy-wrapper">
            <span className="address-value">{formatAddress(CONTRACT_ADDRESS)}</span>
            <button 
              className={`copy-button ${copyStatus.contract ? 'copied' : ''}`}
              onClick={() => copyToClipboard(CONTRACT_ADDRESS, 'contract')}
              title="Copy address"
            >
              {copyStatus.contract ? '✓' : '📋'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="game-container">
        {currentScreen === 'start' && (
          <div className="screen start-screen">
            <h1 className="cyberpunk-title">Fruit Ninja</h1>
            <button 
              onClick={initGame} 
              disabled={!isWalletConnected || isProcessing}
              className={(!isWalletConnected || isProcessing) ? 'disabled' : ''}
            >
              {isProcessing ? 'Processing...' : 'Play'}
            </button>
            {!isWalletConnected && (
              <p className="wallet-message">Connect your wallet to play</p>
            )}
            {isProcessing && (
              <p className="wallet-message processing">Processing transaction...</p>
            )}
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
            <div id="final-score">Final Score: {gameState.score}</div>
            {rewardStatus.loading && (
              <p className="reward-status loading">Processing your reward...</p>
            )}
            {rewardStatus.success && (
              <p className="reward-status success">
                Congratulations! You earned {getSliceReward(gameState.score)} tokens!
              </p>
            )}
            {rewardStatus.error && (
              <p className="reward-status error">
                Error processing reward: {rewardStatus.error}
              </p>
            )}
            {!isClaimed ? (
              <button 
                className={`claim-button ${isClaimProcessing ? 'processing' : ''}`}
                onClick={handleClaim}
                disabled={isClaimProcessing}
              >
                {isClaimProcessing ? 'Claiming...' : 'Claim Now'}
              </button>
            ) : (
              <button onClick={resetGame} className="play-again-button">
                Play Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Game; 
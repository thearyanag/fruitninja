import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import { connection } from './constants';
import './style.css';

function App() {
  const { publicKey, sendTransaction } = useWallet();
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance) => {
    if (balance === null) return '...';
    return `${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`;
  };

  const fetchBalance = async (address) => {
    try {
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      setBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleAddBalance = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey('FJFbqp53DiyFcSAwf9VgMQqs4eyCnpNqEK1WrtJoEWVj'),
          lamports: 0.01 * LAMPORTS_PER_SOL
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);
      await fetchBalance(publicKey.toString());
    } catch (error) {
      console.error('Error adding balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (publicKey) {
      fetchBalance(publicKey.toString());
      // Set up balance polling every 10 seconds
      const interval = setInterval(() => fetchBalance(publicKey.toString()), 10000);
      return () => clearInterval(interval);
    }
  }, [publicKey]);

  return (
    <div className="app">
      <header className="game-header">
        <div className="header-content">
          <h1 className="game-title">Solana Fruit Ninja</h1>
          <div className="auth-section">
            {publicKey ? (
              <div className="user-info">
                <div className="wallet-info">
                  <div className="wallet-details">
                    <span className="address-label">Wallet:</span>
                    <span className="address">{formatAddress(publicKey.toString())}</span>
                    <span className="separator">|</span>
                    <span className="balance-label">Balance:</span>
                    <span className="balance">{formatBalance(balance)}</span>
                    <button 
                      className="add-balance-button" 
                      onClick={handleAddBalance}
                      disabled={isLoading}
                      title="Add Balance"
                    >
                      {isLoading ? '⌛' : '+'}
                    </button>
                  </div>
                </div>
                <WalletMultiButton />
              </div>
            ) : (
              <WalletMultiButton />
            )}
          </div>
        </div>
      </header>
      <Game isWalletConnected={!!publicKey} sendTransaction={sendTransaction} />
    </div>
  );
}

export default App; 
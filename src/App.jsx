import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import { usePrivy, useSolanaWallets  } from '@privy-io/react-auth';
import { useFundWallet , useSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection } from './constants';
import './style.css';

function App() {
  const { login, user, logout, ready } = usePrivy();
  const { wallets } = useSolanaWallets();
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { sendTransaction } = useSendTransaction();
  const { fundWallet } = useFundWallet();


  const handleLogin = () => {
    login();
  };

  const handleLogout = () => {
    logout();
  };

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
    if (!wallets[0]?.address) return;

    console.log('Funding wallet:', wallets[0].address);

    setIsLoading(true);
    try {
      await fundWallet(wallets[0].address, {
        amount: 0.01,
      });
      await fetchBalance(wallets[0].address);
    } catch (error) {
      console.error('Error adding balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (wallets[0]?.address) {
      fetchBalance(wallets[0].address);
      // Set up balance polling every 10 seconds
      const interval = setInterval(() => fetchBalance(wallets[0].address), 10000);
      return () => clearInterval(interval);
    }
  }, [wallets[0]?.address]);

  if (!ready) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="game-header">
        <div className="header-content">
          <h1 className="game-title">Solana Fruit Ninja</h1>
          <div className="auth-section">
            {user ? (
              <div className="user-info">
                <div className="wallet-info">
                  <div className="wallet-details">
                    <span className="address-label">Wallet:</span>
                    <span className="address">{formatAddress(wallets[0]?.address)}</span>
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
                <button className="login-button" onClick={handleLogout}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="login-button" onClick={handleLogin}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>
      <Game isWalletConnected={user && wallets[0]?.address} sendTransaction={sendTransaction} />
    </div>
  );
}

export default App; 
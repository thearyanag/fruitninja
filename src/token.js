import { PublicKey } from '@solana/web3.js';

// Token mint address - replace with your actual token mint address
const TOKEN_MINT = new PublicKey('5H7zBHxqGZyGkvhnWT2HTcEHoXuCkehzzdeANnt5pump');

// House wallet address that will send the rewards
const HOUSE_WALLET = new PublicKey('FJFbqp53DiyFcSAwf9VgMQqs4eyCnpNqEK1WrtJoEWVj');

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'https://fnbe-production.up.railway.app';

// Calculate reward based on score
export function getSliceReward(score, playerAddress) {
  // Check for special reward eligibility
  if (score >= 1000) {
    return 50000;
  }
  
  // Regular reward tiers
  if (score < 20) return 0; 
  if (score < 40) return 500;
  if (score < 60) return 1000;
  if (score < 80) return 1500;
  if (score < 100) return 2000;
  if (score < 120) return 3000;
  return 6000;
}


// Transfer tokens to player through backend API
export async function transferTokens(playerAddress, score) {
  try {
    // Get JWT token from localStorage
    const jwtToken = localStorage.getItem('gameToken');
    if (!jwtToken) {
      throw new Error('No authentication token found. Please login first.');
    }

    console.log('Initiating token transfer:', { playerAddress, score });

    const response = await fetch(`${BACKEND_URL}/api/transfer-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}` // Using JWT token instead of VITE_AUTH_TOKEN
      },
      body: JSON.stringify({
        playerAddress,
        score
      })
    });

    const data = await response.json();
    console.log('Server response:', data);

    if (!response.ok) {
      // Handle specific authentication errors
      if (response.status === 401) {
        localStorage.removeItem('jwt_token'); // Clear invalid token
        throw new Error('Authentication expired. Please login again.');
      }
      throw new Error(data.error || data.details || 'Failed to transfer tokens');
    }

    return data.signature;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw new Error(`Failed to transfer tokens: ${error.message}`);
  }
} 
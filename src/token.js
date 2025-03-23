import { PublicKey } from '@solana/web3.js';

// Token mint address - replace with your actual token mint address
const TOKEN_MINT = new PublicKey('5H7zBHxqGZyGkvhnWT2HTcEHoXuCkehzzdeANnt5pump');

// House wallet address that will send the rewards
const HOUSE_WALLET = new PublicKey('FJFbqp53DiyFcSAwf9VgMQqs4eyCnpNqEK1WrtJoEWVj');

// Calculate reward based on score
function getSliceReward(score) {
  if (score < 20) return 0; 
  if (score < 40) return 500;
  if (score < 60) return 1000;
  if (score < 80) return 1500 ;
  if (score < 100) return 2000;
  if (score < 120) return 3000;
  return 6000;
}
// Debug environment variables
console.log('Environment variables:', {
  VITE_AUTH_TOKEN: import.meta.env.VITE_AUTH_TOKEN,
  allEnv: import.meta.env
});

// Transfer tokens to player through backend API
export async function transferTokens(playerAddress, score) {
  try {
    console.log('Initiating token transfer:', { playerAddress, score });
    console.log('Auth token:', import.meta.env.VITE_AUTH_TOKEN ? 'Present' : 'Missing');

    const response = await fetch('http://localhost:3001/api/transfer-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        playerAddress,
        score
      })
    });

    const data = await response.json();
    console.log('Server response:', data);

    if (!response.ok) {
      throw new Error(data.error || data.details || 'Failed to transfer tokens');
    }

    return data.signature;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw new Error(`Failed to transfer tokens: ${error.message}`);
  }
} 
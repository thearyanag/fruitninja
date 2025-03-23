import express from 'express';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey, Transaction, SystemProgram, Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// Configure CORS to only allow requests from the frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['POST'], // Only allow POST requests
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Token mint address
const TOKEN_MINT = new PublicKey('5H7zBHxqGZyGkvhnWT2HTcEHoXuCkehzzdeANnt5pump');
// const HOUSE_WALLET = new PublicKey('FJFbqp53DiyFcSAwf9VgMQqs4eyCnpNqEK1WrtJoEWVj');

// Initialize connection and payer
const connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');
const PAYER_SOFT_WALLET = Keypair.fromSecretKey(bs58.decode(process.env.PAYER_SOFT_WALLET_SECRET_KEY));
const HOUSE_WALLET = PAYER_SOFT_WALLET.publicKey;
const auth_token = process.env.AUTH_TOKEN;

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

// Get or create associated token account
async function getOrCreateAssociatedTokenAccount(owner) {
  try {
    const associatedToken = await getAssociatedTokenAddress(
      TOKEN_MINT,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    try {
      await connection.getTokenAccountBalance(associatedToken);
      return associatedToken;
    } catch (error) {
      console.log('Creating new token account for:', owner.toString());
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          PAYER_SOFT_WALLET.publicKey,
          associatedToken,
          owner,
          TOKEN_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      const signature = await connection.sendTransaction(transaction, [PAYER_SOFT_WALLET]);
      await connection.confirmTransaction(signature);
      return associatedToken;
    }
  } catch (error) {
    console.error('Error in getOrCreateAssociatedTokenAccount:', error);
    throw error;
  }
}

// API endpoint to transfer tokens
app.post('/api/transfer-tokens', async (req, res) => {
  try {
    // Check for auth token
    const requestAuthToken = req.headers['authorization'];
    console.log("Received auth token:", requestAuthToken);
    console.log("Expected auth token:", `Bearer ${auth_token}`);
    
    if (!requestAuthToken || requestAuthToken !== `Bearer ${auth_token}`) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or missing authentication token' });
    }

    const { playerAddress, score } = req.body;
    console.log("Received request:", { playerAddress, score });
    
    if (!playerAddress || !score) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const player = new PublicKey(playerAddress);
    const amount = getSliceReward(score);
    console.log("Calculated reward amount:", amount);

    if (amount <= 0) {
      return res.status(400).json({ error: 'Score too low to receive rewards' });
    }

    // Get or create player's token account
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(player);
    const houseTokenAccount = await getOrCreateAssociatedTokenAccount(HOUSE_WALLET);
    console.log("Token accounts:", {
      player: playerTokenAccount.toString(),
      house: houseTokenAccount.toString()
    });

    // Check house wallet balance
    const houseBalance = await connection.getTokenAccountBalance(houseTokenAccount);
    console.log("House wallet balance:", houseBalance.value.uiAmount);
    
    if (houseBalance.value.uiAmount < amount) {
      return res.status(400).json({ error: 'Insufficient funds in house wallet' });
    }

    // Create transfer instruction
    const transaction = new Transaction().add(
      createTransferInstruction(
        houseTokenAccount,
        playerTokenAccount,
        HOUSE_WALLET,
        amount * 10 ** 6
      )
    );

    transaction.feePayer = PAYER_SOFT_WALLET.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Simulate transaction to get logs
    const simulationResult = await connection.simulateTransaction(transaction);
    console.log("Simulation result:", {
      err: simulationResult.value.err,
      logs: simulationResult.value.logs,
      unitsConsumed: simulationResult.value.unitsConsumed
    });

    if (simulationResult.value.err) {
      throw new Error(`Transaction simulation failed: ${simulationResult.value.err}`);
    }

    console.log("Transaction:", simulationResult.value.logs);

    // Send transaction
    const signature = await connection.sendTransaction(transaction, [PAYER_SOFT_WALLET]);
    await connection.confirmTransaction(signature);
    console.log("Transaction successful:", signature);

    res.json({ 
      success: true, 
      signature,
      amount,
      message: `Successfully transferred ${amount} tokens to ${playerAddress}`
    });
  } catch (error) {
    console.error('Error transferring tokens:', error);
    res.status(500).json({ 
      error: 'Failed to transfer tokens',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
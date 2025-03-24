import express from 'express';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey, Transaction, SystemProgram, Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import { Redis } from '@upstash/redis'

dotenv.config();

const app = express();

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Configure CORS to only allow requests from the frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['POST'], // Only allow POST requests
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Apply rate limiting to all routes
app.use(limiter);

// Token mint address
const TOKEN_MINT = new PublicKey('5H7zBHxqGZyGkvhnWT2HTcEHoXuCkehzzdeANnt5pump');

// Initialize connection and payer
const connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');
const PAYER_SOFT_WALLET = Keypair.fromSecretKey(bs58.decode(process.env.PAYER_SOFT_WALLET_SECRET_KEY));
const HOUSE_WALLET = PAYER_SOFT_WALLET.publicKey;
const auth_token = process.env.AUTH_TOKEN;

// Add Redis client initialization after other constants
const redis = Redis.fromEnv();

// Replace the in-memory Set with Redis-based function
async function getSliceReward(score, playerAddress) {
  // Check for special reward eligibility
  if (score >= 1000) {
    // Check if player has already claimed special reward
    const hasClaimedSpecial = await redis.get(`special_reward:${playerAddress}`);
    if (!hasClaimedSpecial) {
      // Mark this player as received in Redis
      await redis.set(`special_reward:${playerAddress}`, true);
      return 50000;
    }
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
    
    // Extract token from Authorization header
    const token = requestAuthToken?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - Missing authentication token' });
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Attach decoded user info to request
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication token' });
    }

    const { playerAddress, score } = req.body;
    
    if (!playerAddress || !score) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const player = new PublicKey(playerAddress);
    const amount = await getSliceReward(score, playerAddress);

    if (amount <= 0) {
      return res.status(400).json({ error: 'Score too low to receive rewards' });
    }

    // Get or create player's token account
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(player);
    const houseTokenAccount = await getOrCreateAssociatedTokenAccount(HOUSE_WALLET);

    // Check house wallet balance
    const houseBalance = await connection.getTokenAccountBalance(houseTokenAccount);
    
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
    if (simulationResult.value.err) {
      throw new Error(`Transaction simulation failed: ${simulationResult.value.err}`);
    }

    // Send transaction
    const signature = await connection.sendTransaction(transaction, [PAYER_SOFT_WALLET]);
    await connection.confirmTransaction(signature);

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

// Add these variables after other const declarations
const NONCE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const nonceStore = new Map(); // Store nonces in memory

// Add this new API endpoint before the server.listen call
app.post('/api/get-nonce', async (req, res) => {
  try {
    // Check for auth token
    const requestAuthToken = req.headers['authorization'];

    console.log(requestAuthToken);
    
    if (!requestAuthToken || requestAuthToken !== `Bearer ${auth_token}`) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or missing authentication token' });
    }

    // Generate a random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Store the nonce with timestamp
    nonceStore.set(nonce, {
      timestamp: Date.now(),
      used: false
    });

    // Clean up expired nonces
    for (const [storedNonce, data] of nonceStore.entries()) {
      if (Date.now() - data.timestamp > NONCE_EXPIRY_TIME) {
        nonceStore.delete(storedNonce);
      }
    }

    res.json({ 
      success: true,
      nonce,
      expiresIn: NONCE_EXPIRY_TIME
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    res.status(500).json({ 
      error: 'Failed to generate nonce',
      details: error.message
    });
  }
});

// Add these constants after other const declarations
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Make sure to set this in .env
const JWT_EXPIRY = '4h';

// Add this new endpoint before the server.listen call
app.post('/api/verify-wallet', async (req, res) => {
  try {
    const { signature, publicKey, message, nonce } = req.body;

    // Validate request body
    if (!signature || !publicKey || !message || !nonce) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if nonce exists and is valid
    const nonceData = nonceStore.get(nonce);
    if (!nonceData) {
      return res.status(400).json({ error: 'Invalid nonce' });
    }

    // Check if nonce is expired
    if (Date.now() - nonceData.timestamp > NONCE_EXPIRY_TIME) {
      nonceStore.delete(nonce);
      return res.status(400).json({ error: 'Nonce expired' });
    }

    // Check if nonce was already used
    if (nonceData.used) {
      return res.status(400).json({ error: 'Nonce already used' });
    }

    // Verify the signature
    const messageBytes = new TextEncoder().encode(message);
    
    // Convert base64 signature to Uint8Array
    const signatureBytes = new Uint8Array(
      Buffer.from(signature, 'base64')
    );
    
    const publicKeyBytes = new PublicKey(publicKey).toBytes();

    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!verified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Mark nonce as used
    nonceData.used = true;

    // Generate JWT token
    const token = jwt.sign(
      { 
        publicKey,
        wallet: publicKey
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token
    });

  } catch (error) {
    console.error('Error verifying wallet:', error);
    res.status(500).json({
      error: 'Failed to verify wallet',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


// Convert Express app to serverless function
const handler = app;

// Export the handler
export default handler; 
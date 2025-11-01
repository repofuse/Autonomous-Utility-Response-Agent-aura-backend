require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3001;
const USE_MOCK = String(process.env.USE_MOCK || 'false').toLowerCase() === 'true';

// Middleware
app.use(cors());
app.use(express.json());

// AuraProtocol ABI (paste your actual ABI here)
const AURA_ABI = [
  "function triggerEvent(uint256 bountyPerWatt, uint256 duration) external",
  "function submitProofOfSaving(address deviceAddress, uint256 savings) external",
  "function getCurrentEvent() external view returns (bool active, uint256 bountyPerWatt, uint256 endTime)",
  "event GridStressEventTriggered(uint256 bountyPerWatt, uint256 duration, uint256 endTime)",
  "event ProofOfSavingSubmitted(address indexed device, uint256 savings, uint256 reward)"
];

let provider;
let aiAgentWallet;
let oracleWallet;
let auraContract;

if (USE_MOCK) {
  // Mock provider, wallets, and contract
  provider = null;
  aiAgentWallet = { address: '0xAIa9e7fA1A9E7fA1A9e7FA1A9e7fA1A9E7fA1A9e7' };
  oracleWallet = { address: '0xORaC13dEaDBeEfC0FFEe0000DeAdBeEfC0FFEe00' };
  auraContract = {
    connect: () => auraContract,
    async triggerEvent(bountyPerWatt, duration) {
      const hash = `0xmocktx_${Date.now()}_${bountyPerWatt}_${duration}`;
      return {
        hash,
        async wait() { return { hash }; }
      };
    },
    async submitProofOfSaving(deviceAddress, savings) {
      const hash = `0xmocktx_${Date.now()}_${deviceAddress}_${savings}`;
      return {
        hash,
        async wait() { return { hash }; }
      };
    }
  };
  console.log('\n🧪 Running in MOCK mode. No blockchain calls will be made.');
} else {
  // Real provider and wallets
  if (!process.env.RPC_URL || !process.env.AI_AGENT_PRIVATE_KEY || !process.env.ORACLE_PRIVATE_KEY || !process.env.CONTRACT_ADDRESS) {
    console.error('Missing required environment variables. Set RPC_URL, AI_AGENT_PRIVATE_KEY, ORACLE_PRIVATE_KEY, CONTRACT_ADDRESS or set USE_MOCK=true.');
    process.exit(1);
  }
  provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  aiAgentWallet = new ethers.Wallet(process.env.AI_AGENT_PRIVATE_KEY, provider);
  oracleWallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
  auraContract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    AURA_ABI,
    provider
  );
}

// In-memory grid status
let gridStatus = "normal";

// Routes

// GET /grid-status - Returns the current grid status
app.get('/grid-status', (req, res) => {
  res.json({ status: gridStatus });
});

// POST /simulate-stress-event - Triggers a grid stress event on-chain
app.post('/simulate-stress-event', async (req, res) => {
  try {
    console.log('🚨 Triggering grid stress event...');
    
    // Set grid status to STRESSED
    gridStatus = "STRESSED";
    
    // Connect AI Agent wallet to contract (noop in mock)
    const contractWithAI = auraContract.connect ? auraContract.connect(aiAgentWallet) : auraContract;
    
    // Trigger event: 100 per watt bounty for 300 seconds (5 minutes)
    const bountyPerWatt = 100;
    const duration = 300;
    
    console.log(`Calling triggerEvent(${bountyPerWatt}, ${duration})...`);
    const tx = await contractWithAI.triggerEvent(bountyPerWatt, duration);
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt.hash);
    
    res.json({
      success: true,
      message: 'Grid stress event triggered on-chain.',
      transactionHash: receipt.hash,
      bountyPerWatt,
      duration
    });
    
  } catch (error) {
    console.error('❌ Error triggering stress event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger stress event.',
      error: error.message
    });
  }
});

// POST /report-savings - IoT device reports energy savings
app.post('/report-savings', async (req, res) => {
  try {
    const { deviceAddress, savings } = req.body;
    
    if (!deviceAddress || savings === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: deviceAddress and savings'
      });
    }
    
    console.log(`📊 Reporting savings for device ${deviceAddress}: ${savings} watts`);
    
    // Set grid status back to normal (event is over)
    gridStatus = "normal";
    
    // Connect Oracle wallet to contract (noop in mock)
    const contractWithOracle = auraContract.connect ? auraContract.connect(oracleWallet) : auraContract;
    
    console.log(`Calling submitProofOfSaving(${deviceAddress}, ${savings})...`);
    const tx = await contractWithOracle.submitProofOfSaving(deviceAddress, savings);
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt.hash);
    
    res.json({
      success: true,
      message: 'Proof submitted to oracle.',
      transactionHash: receipt.hash,
      deviceAddress,
      savings
    });
    
  } catch (error) {
    console.error('❌ Error submitting proof:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit proof of saving.',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: USE_MOCK ? 'mock' : 'live',
    wallets: {
      aiAgent: aiAgentWallet.address,
      oracle: oracleWallet.address
    },
    contract: process.env.CONTRACT_ADDRESS || '0xMockContract'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Aura Protocol Mock Backend Server`);
  console.log(`==================================`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Network: ${USE_MOCK ? 'MOCK' : process.env.RPC_URL}`);
  console.log(`📄 Contract: ${process.env.CONTRACT_ADDRESS || '0xMockContract'}`);
  console.log(`🤖 AI Agent: ${aiAgentWallet.address}`);
  console.log(`🔮 Oracle: ${oracleWallet.address}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /grid-status - Get current grid status`);
  console.log(`  POST /simulate-stress-event - Trigger grid stress event`);
  console.log(`  POST /report-savings - Submit proof of savings`);
  console.log(`==================================\n`);
});


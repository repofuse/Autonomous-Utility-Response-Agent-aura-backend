# Aura Protocol Mock Backend Server

This is a "Wizard of Oz" mock backend server for the Aura Protocol hackathon demo. It simulates an AI Agent and Oracle interacting with the Aura smart contract on the blockchain.

## Setup

### Zero-Config Mock Mode (no blockchain setup)

If you just want to demo without any keys or RPC:

1. Create a `.env` file with:
   
   ```env
   USE_MOCK=true
   PORT=3001
   ```

2. Start the server:

   ```bash
   npm start
   ```

You’ll see "Running in MOCK mode" and all endpoints will work with fake transaction hashes. No wallet, RPC, or contract required.

---

### 1. Install Dependencies

```bash
npm install
```

### 2. Create .env File (live mode)

Create a `.env` file in the root directory with the following variables:

```env
# RPC URL for Base Sepolia (or your preferred network)
RPC_URL=https://sepolia.base.org

# Private keys (NEVER commit the actual .env file!)
AI_AGENT_PRIVATE_KEY=your_ai_agent_private_key_here
ORACLE_PRIVATE_KEY=your_oracle_private_key_here

# Smart contract address
CONTRACT_ADDRESS=0x_your_contract_address_here

# Server port (optional, defaults to 3001)
PORT=3001

# Optional: set to true to disable blockchain calls and use mocks
USE_MOCK=false
```

### 3. Update the ABI (if needed)

If your smart contract ABI differs from the default, update the `AURA_ABI` array in `index.js` with your contract's ABI.

## Running the Server

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on port 3001 (or the PORT specified in your .env file).

## API Endpoints

### GET `/health`
Health check endpoint that returns server status and wallet addresses.

**Response:**
```json
{
  "status": "healthy",
  "wallets": {
    "aiAgent": "0x...",
    "oracle": "0x..."
  },
  "contract": "0x..."
}
```

### GET `/grid-status`
Returns the current grid status.

**Response:**
```json
{
  "status": "normal"  // or "STRESSED"
}
```

### POST `/simulate-stress-event`
Triggers a grid stress event on-chain using the AI Agent wallet.

**Request:** No body required

**Response:**
```json
{
  "success": true,
  "message": "Grid stress event triggered on-chain.",
  "transactionHash": "0x...",
  "bountyPerWatt": 100,
  "duration": 300
}
```

### POST `/report-savings`
Submits proof of energy savings to the oracle.

**Request Body:**
```json
{
  "deviceAddress": "0x...",
  "savings": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Proof submitted to oracle.",
  "transactionHash": "0x...",
  "deviceAddress": "0x...",
  "savings": 50
}
```

## Architecture

- **AI Agent Wallet**: Triggers grid stress events on the smart contract
- **Oracle Wallet**: Submits proofs of energy savings to the smart contract
- **Grid Status**: In-memory variable that tracks whether the grid is "normal" or "STRESSED"

## Demo Flow

1. Frontend polls `/grid-status` to check grid status
2. When a stress event is needed, call `/simulate-stress-event`
   - Sets grid status to "STRESSED"
   - AI Agent triggers event on-chain with bounty
3. IoT device detects stress and reduces energy consumption
4. IoT device calls `/report-savings` with savings data
   - Sets grid status back to "normal"
   - Oracle submits proof to smart contract
   - Device receives reward tokens

## Notes

- This is a mock server for demo purposes
- In production, the AI agent and oracle would be separate automated systems
- Make sure to never commit your `.env` file with real private keys
- Ensure both wallets have enough ETH for gas fees

## Deployment

### Option A: Render (simplest, free tier)
1. Push this folder to a Git repo (GitHub/GitLab).
2. Create new Web Service on Render.
3. Select the repo, set:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: add variables
     - For mock demo: `USE_MOCK=true`, `PORT=3001`
     - For live: `RPC_URL`, `AI_AGENT_PRIVATE_KEY`, `ORACLE_PRIVATE_KEY`, `CONTRACT_ADDRESS`, `PORT=3001`, `USE_MOCK=false`
4. Deploy. Your public URL will be like `https://your-app.onrender.com`.

### Option B: Railway
1. Create a new project → Deploy from repo.
2. Set variables as above (mock or live).
3. Railway assigns a public URL automatically.

### Option C: Docker (any VPS or cloud)
Build and run locally to test:
```bash
docker build -t aura-backend .
docker run -p 3001:3001 --env-file .env aura-backend
```
On a server (AWS Lightsail/DO Droplet/Fly.io), run the same commands. Ensure port 3001 is open or use a reverse proxy.

### Health Check
After deployment, verify:
```bash
curl https://YOUR_PUBLIC_URL/health
```
It should return JSON with `status` and `mode`.


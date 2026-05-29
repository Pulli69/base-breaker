# Base Brick Breaker - Deployment Guide

## Overview

**Base Brick Breaker** is a neon-themed breakout arcade game with Web3 integration on Base Mainnet. This guide covers contract deployment and frontend configuration.

---

## 🎮 What's Included

### ✅ Frontend Features
- **10 Levels** of progressive brick-breaking gameplay
- **7 Power-ups** with unique mechanics (Big Paddle, Multi-Ball, Slow Ball, Laser, Fire Ball, Shield, Extra Life)
- **Leaderboard Screen** - View top 10 players on Base
- **Player Stats** - Track best score, level reached, badge status
- **Web3 Integration** - Wallet connection, contract interactions
- **Mobile Optimized** - Responsive design for all devices
- **Neon Graphics** - Canvas-based procedural rendering (no asset files needed)

### 📋 Smart Contracts (Ready to Deploy)
1. **BaseBrickBreaker.sol** - A unified smart contract handling the Score Leaderboard, Daily Check-ins, and ERC721 Player Badges.

---

## 🚀 Step 1: Deploy Smart Contracts

### Option A: Deploy via Remix (Easiest)

1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create a new file: `BaseBrickBreaker.sol`
3. Copy the entire contents from `/contracts/BaseBrickBreaker.sol`
4. Compile: Press "Compile" (should be v0.8.20)
5. Deploy:
   - Select "Injected Provider" (connects MetaMask)
   - Ensure MetaMask is on **Base Mainnet** (Chain ID: 8453)
   - Select `BaseBrickBreaker` from the Contract dropdown.
   - Click "Deploy"
   - Confirm in MetaMask
6. Copy the deployed contract address

### Option B: Deploy via Hardhat/Foundry (Advanced)
See the project's `.github/workflows` or documentation for CI/CD deployment.

---

## 🔑 Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Open `.env.local` and fill in your deployed contract address:
```env
VITE_GAME_CONTRACT_ADDRESS=0xYourAddressHere
```

---

## 📱 Step 3: Run the Frontend

### Development
```bash
npm install
npm run dev
```
Opens at `http://localhost:5173`

### Build for Production
```bash
npm run build
```
Generates optimized build in `/dist`

---

## 🧪 Step 4: Testing

### Manual Testing
1. **Home Screen**
   - Verify text and buttons render correctly
   - Test responsive design on mobile/tablet

2. **Gameplay**
   - Launch the game with Space/Click
   - Move paddle with arrow keys or mouse
   - Verify collision detection and physics
   - Test all power-ups
   - Complete a level

3. **Web3 Features** (with deployed contracts)
   - Connect wallet (MetaMask)
   - Verify you're on Base Mainnet
   - Submit a score
   - Check leaderboard updates
   - Perform daily check-in
   - Mint badge

### Automated Testing
```bash
npm run lint     # ESLint code quality checks
npm run build    # Verify TypeScript compilation
```

---

## 📊 Leaderboard Screen

The leaderboard shows:
- **Top 10 players** sorted by score
- **Player address** (shortened)
- **Final score**
- **Level reached**
- **Gold/Silver/Bronze medals** for top 3

*Note:* Leaderboard will be empty until scores are submitted via the game.

---

## 👤 Player Stats (Home Screen)

When connected to Base, players see:
- **Best Score** - Highest score submitted to contract
- **Level Reached** - Highest level achieved
- **Badge Status** - ✅ if badge has been minted

---

## ⚙️ Configuration

### Environment Variables (.env.local)
```env
# Contract address on Base Mainnet
VITE_GAME_CONTRACT_ADDRESS=0x...
```

### Wagmi Configuration
- **Chain:** Base Mainnet (ID: 8453)
- **RPC:** Configured via Wagmi's default providers
- **Supported Wallets:** MetaMask, WalletConnect, Coinbase Wallet

---

## 🎯 How It Works

### Gameplay Flow
1. Connect wallet (optional, required for Web3 features)
2. Press PLAY to start
3. Move paddle and launch ball with Space/Click
4. Break bricks to earn points and power-ups
5. Progress through 10 levels
6. On Game Over/Victory: Submit score to Base
7. View updated leaderboard

### Score Submission
- Only scores higher than player's previous best are recorded
- Submitted to `ScoreLeaderboard` contract on Base
- Visible on leaderboard immediately

### Daily Check-in
- Submit once per 24-hour period
- Generates blockchain transaction
- Contract enforces rate limiting

### Badge Minting
- ERC721 NFT badge minted to player wallet
- One badge per player (contract checks `hasBadge`)
- Visible on player profile stats

---

## 🐛 Troubleshooting

### Contract Addresses Not Loading
- Verify `.env.local` file exists and is in the root directory
- Restart dev server after updating `.env.local`
- Check that addresses are valid (start with `0x`)

### Leaderboard Empty
- Ensure ScoreLeaderboard contract is deployed
- Submit a score in-game and confirm transaction
- Leaderboard updates after block confirmation (~12s on Base)

### Wrong Network Error
- MetaMask is showing different chain
- Click "Switch to Base" button or manually switch in MetaMask
- Base Mainnet Chain ID: **8453**

### Transaction Fails
- Insufficient gas (Base has low fees, usually ~0.001 ETH)
- Contract not deployed at configured address
- User not connected to Base Mainnet

---

## 📈 Next Steps / Future Enhancements

- [ ] Sound effects and music
- [ ] Achievement system
- [ ] Multiplayer leaderboard filtering (by day/week/all-time)
- [ ] Difficulty modes (Easy/Normal/Hard)
- [ ] Tournament mode with rewards
- [ ] Governance token rewards
- [ ] Mobile app (React Native)
- [ ] Performance optimizations

---

## 📝 Notes

- **Contracts are immutable** once deployed - test thoroughly before mainnet
- **Player data is on-chain** - all scores permanently recorded on Base
- **No centralized server** - all data sourced from blockchain
- **Gas costs** - Base offers extremely cheap transactions (~$0.00001 per interaction)

---

## 🆘 Support

For issues or questions:
1. Check console for error messages (F12)
2. Verify contract addresses in `.env.local`
3. Ensure MetaMask is on Base Mainnet
4. Clear browser cache and rebuild

---

**Last Updated:** May 28, 2026
**Version:** 1.0.0
**Network:** Base Mainnet (Chain ID: 8453)

# CricketVerse | Premier Decentralized Web3 Cricket Arena & Dynamic NFT Ecosystem

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Cancun_EVM-3C3C3D?logo=ethereum)](https://ethereum.org/)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.29-FFF100?logo=ethereum)](https://hardhat.org/)
[![ZK-SNARK](https://img.shields.io/badge/Zero--Knowledge-Groth16_BN254-4F46E5)](#zero-knowledge-zk-snark-squad-verification)
[![Test Suite](https://img.shields.io/badge/Tests-47%2F47_Passing_(100%25)-16A34A)](#testing--verification-suite)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **CS6666 Course Project**  
> **Author / Lead Engineer:** Tejaswini Kunkulagunta (Roll No: `CS23B032`)  
> **Department:** Department of Computer Science & Engineering  
> **Target Network:** Cancun EVM (Hardhat Local Chain ID `31337`) / Polygon Amoy L2  

---

## Executive Summary & Value Proposition

The global sports economy represents an estimated **$12.8 billion market**, spanning memorabilia, fantasy sports, broadcasting, and stadium ticketing. However, legacy Web2 solutions suffer from four systemic vulnerabilities:

1. **Rampant Secondary Market Scalping:** Automated bots drain primary ticket inventories within seconds, relisting passes at **300% to 500% premiums** on secondary markets while circulating counterfeit barcodes.
2. **Strategy Front-Running in Fantasy Sports:** Public on-chain lineup submission allows competitors to mirror top strategists' rosters (copy-trading attacks) or mathematically counter declared squads.
3. **Static "Orphaned" Digital Collectibles:** Legacy NFTs store inert images on IPFS that never reflect a player's live athletic achievements or tournament milestones.
4. **Centralized Prize Custody:** Contest operators retain opaque custody of tournament entry fees, introducing counterparty and insolvency risks.

**CricketVerse** eliminates these issues through an end-to-end decentralized application on Ethereum Cancun EVM:
- **ERC-721 Anti-Scalping Stadium Passes (`MatchTicketNFT`):** An immutable **15% maximum resale markup ceiling** enforced in the smart contract (`11500 bps`), coupled with **deterministic vector SVG QR codes** and laser turnstile scanners with double-entry prevention.
- **Zero-Knowledge (ZK-SNARK) Squad Verification:** A **Groth16 proof & commitment scheme over the BN254 (alt_bn128) prime field** that proves an 11-player lineup complies with the 120-credit salary cap and role balance without leaking tactical player identities prior to match start.
- **Dynamic On-Chain NFTs (`PlayerCardNFT` ERC-1155):** Standalone, on-chain vector SVG card synthesis updated in real time via an **ESPN Cricket Live REST API** oracle pipeline.
- **Non-Custodial English Auction Marketplace:** 10-minute anti-sniping soft-close extensions and automated escrow settlement.
- **Fan DAO Governance:** Stake-weighted quadratic voting ($\text{Votes} = \lfloor\sqrt{\text{Balance}}\rfloor$) giving fans democratic control over tournament regulations.

---

## System Architecture

```
+----------------------------------------------------------------------------------------+
|                               CRICKETVERSE CLIENT LAYER                                |
|  React 19 SPA | TypeScript | Dark Turf CSS Constitution | PWA Service Worker (sw.js)   |
|                                                                                        |
|  [The Pavilion]    [My Collection]    [Auction Room]    [Matchday XI]   [Stadium Gate] |
|   Player Roster       NFT Vault        English Escrow    ZK Squad Seal   QR Turnstile  |
+----------------------------------------------------------------------------------------+
            |                                           |                     |
     JSON-RPC / Web3                             ZK Witness Prover     REST Polling / WS
            v                                           v                     v
+------------------------+                  +----------------------+  +-----------------+
|  LOCAL HARDHAT NODE    |                  |  Groth16 / BN254     |  | ESPN Live API   |
|  Cancun EVM (31337)    |                  |  Circuit Generator   |  | Ingestion Engine|
|  (Auto-Healing Plugin) |                  +----------------------+  +-----------------+
+------------------------+                             |                      |
            |                                          v                      v
            |                        +--------------------------------------------------+
            |                        |                 ORACLE & ADAPTERS                |
            |                        |  Ball-by-Ball Commentary | Live Telemetry Matrix |
            +------------------------+--------------------------------------------------+
                                     |
                                     v
+---------------------------------------------------------------------------------------+
|                         SOLIDITY 0.8.24 SMART CONTRACT SUITE                          |
|  * CRIC Utility Token (ERC-20)      * PlayerCardNFT (ERC-1155) * MatchTicketNFT (721)   |
|  * CricketMarketplace (Escrow)     * CricketOracleConsumer      * TournamentPool (ZK)    |
|  * CardSVGGenerator (On-Chain)     * FanPolls (Governance)                               |
+---------------------------------------------------------------------------------------+
```

---

## Core Features

### 1. The Pavilion (Dynamic Player Collectibles)
- **Extensive Athlete Catalog:** International and franchise cricketers with verified historical and live career statistics (matches, runs, wickets, strike rate, economy).
- **Rarity Tier Multipliers:** Common (1.0x), Uncommon (1.1x), Rare (1.25x), Epic (1.5x), and Legendary (2.0x, supply capped at 25).
- **Primary Minting:** Direct minting in $CRIC utility tokens with instant wallet registration.
- **On-Chain Vector SVG Renderer:** Real-time generation of standalone vector cards featuring dynamic milestone badges:
  - `CENTURION 100+` (Runs $\ge$ 100)
  - `HALF-TON 50+` (Runs $\ge$ 50)
  - `5-WKT HAUL` / `3-WKT CRUSH` (Wickets $\ge$ 5 / $\ge$ 3)
  - `STRIKE MASTER` (Strike Rate $\ge$ 140)
  - `ECONOMY KING` (Economy $\le$ 6.5)

### 2. My Collection (Portfolio Vault)
- Real-time valuation of collected NFT assets in $CRIC.
- Breakdown of cards owned, rarest tiers, and individual player stats.
- 1-click **"List on Auction"** with transparent breakdown of seller proceeds and creator royalties.

### 3. Auction Room (Peer-to-Peer Marketplace)
- **Non-Custodial Escrow:** NFTs are deposited directly into `CricketMarketplace.sol` during active listings, preventing double-selling.
- **Anti-Sniping Soft-Close Extension:** Any bid received within the final 10 minutes of an auction automatically extends the countdown by 10 minutes:
  $$\text{endTime} = \max(\text{endTime}, \text{block.timestamp} + 600)$$
- **Instantaneous Atomic Settlement:** Upon auction conclusion, the winning bidder receives the NFT and the seller receives 97.5% of funds, with 2.5% routed to the community treasury.

### 4. Matchday XI (Live Fantasy Arena)
- **Budget & Role Optimization:** 120-credit salary cap with mandatory role distribution:
  - $\ge$ 1 Wicketkeeper (WK)
  - $\ge$ 3 Batsmen (BAT)
  - $\ge$ 3 Bowlers (BOWL)
  - $\ge$ 1 All-Rounder (AR)
- **Real-Time ESPN API Synchronization:** Automated polling every 25 seconds through `/espn-api`, updating live team scores, wickets, and player points.
- **Deterministic 6-Ball Over Simulator:** Simulates live overs (runs, boundaries, extras, dismissals) with commentary telemetry.

### 5. Zero-Knowledge (ZK-SNARK) Squad Verification
- **Groth16 over the BN254 (`alt_bn128`) Prime Field:** Proves an 11-player squad satisfies all constraints without revealing the secret player identities prior to match start.
- **Secret Witness:** $W = (p_1, \dots, p_{11}, \sigma)$, with 256-bit cryptographic blinding salt $\sigma \in \{0,1\}^{256}$.
- **Canonical Commitment:** $C = \text{Keccak256}(\text{Sorted}(p) \parallel \sigma)$ packed alongside `[commitmentHash, packedConstraints, tournamentId, timestamp]` public signals.
- **Full Verifier Suite (`VK_CRIC_SQUAD_BN254_REV1`):** Validates BN254 base-field membership ($1 \le x < p$), R1CS role quotas & 11-player sum, packed public signals, deterministic witness integrity, squad-commitment opening match, and includes a 1-click **Tamper Test** to verify forged proofs are rejected.
- **Tournament & On-Chain Integration:** Commit verified ZK proofs on-chain or automatically attach your real Groth16 commitment hash when entering `TournamentPool` contests.

### 6. Stadium Passes (Anti-Scalping Smart Ticketing)
- **Immutable 15% Resale Markup Cap:** Hard-coded into `MatchTicketNFT.sol` & `CricketMarketplace.sol`, permanently blocking price gouging:
  $$\text{salePrice} \le \text{faceValue} \times 1.15$$
- **Anti-Scalping Auditor:** Real-time pricing calculator to test secondary listing compliance.
- **Deterministic Vector SVG QR Codes:** Lightweight, resolution-independent vector QR codes generated client-side from `CV-PASS-<tokenId>`.
- **Stadium Turnstile Laser Scanner:** Animated gate scanner with atomic state mutation (`used = true`) and strict double-entry prevention.

### 7. Fan DAO Governance
- **Quadratic Voting Formulation:** Voting weight $W$ scales with the square root of token balance $V$:
  $$W = \lfloor\sqrt{V}\rfloor$$
- **Proposal Lifecycle:** 72-hour voting windows, 20% quorum threshold, and timelocked execution.

### 8. Tournament Arena
- Stake verified Playing XI lineups into contest pools.
- Automated prize distribution: 95% net prize pool to top-ranked strategists, 5% to ecosystem treasury.

---

## Smart Contract Architecture & Deployed Addresses

All 8 smart contracts are deployed on the local Cancun Hardhat EVM (Chain ID `31337`) and ready for Polygon Amoy Layer 2:

| Contract | Standard / Interface | Address (Local Hardhat) | Description |
|---|---|---|---|
| **CRIC** | ERC-20 + Burnable | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Primary $CRIC utility token (100,000,000 max supply, 50k faucet) |
| **PlayerCardNFT** | ERC-1155 Dynamic URI | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Collectible player cards with evolving telemetry & tier caps |
| **MatchTicketNFT** | ERC-721 + ResaleCap | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | Matchday stadium passes with 15% resale markup ceiling |
| **CricketMarketplace** | Escrow P2P Marketplace | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` | Secondary marketplace with 5% royalties & anti-scalping checks |
| **CardSVGGenerator** | On-Chain SVG Engine | `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6` | Standalone SVG synthesis library for player cards |
| **CricketOracleConsumer** | Chainlink-Compatible Oracle | `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318` | Consumes live match telemetry and updates player cards |
| **TournamentPool** | ZK-Verified Prize Escrow | `0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0` | Fantasy tournament entry, escrow, and 95/5 payout |
| **FanPolls** | Governance & Vote Rewards | `0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82` | Decentralized fan polls with CRIC vote rewards |

---

## Step-by-Step Installation & Setup Guide

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Git:** Installed on local system
- **MetaMask (or any EIP-1193 browser wallet):** Installed as a browser extension

### 1. Clone Repository & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/cricketverse.git
cd cricketverse

# Install dependencies (React, Vite, Hardhat, Ethers, OpenZeppelin)
npm install
```

### 2. Configure Environment Variables
```bash
# Copy example environment configuration
cp .env.example .env
```
Default parameters in `.env`:
```ini
GATEKEEPER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
HARDHAT_RPC=http://127.0.0.1:8545
LOCAL_MNEMONIC=test test test test test test test test test test test junk
ORGANIZER_ADDRESS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology/
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
TREASURY_ADDRESS=0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

### 3. Compile Smart Contracts
```bash
# Compile Solidity contracts with viaIR optimization
npx hardhat compile
```

### 4. Start Local Hardhat Blockchain Node
In your terminal, start the Cancun EVM node:
```bash
# Spawns local EVM node with 20 pre-funded test accounts on 127.0.0.1:8545
npm run chain:node
```

### 5. Deploy Smart Contracts to Local Chain
In a second terminal, deploy the full ecosystem:
```bash
# Deploys all 8 contracts, seeds initial cards, issues passes, and funds faucet
npm run chain:deploy
```

### 6. Launch Frontend Development Server
```bash
# Starts Vite development server on port 3000
npm run dev
```
### How to Start Over from `0 CRIC` Anytime 
Run this single command from the project root while the local Hardhat node is running:

```bash
node scripts/reset_user_wallet.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🦊 Connecting MetaMask to Local Hardhat Node

1. Open MetaMask and select **Add Network** → **Add a network manually**:
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
2. **Import Pre-Funded Demo Account:**
   - In MetaMask, select **Import Account** → **Private Key**.
   - Paste the primary developer private key:
     ```
     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
     ```
   - Target test address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Loaded with 10,000 test ETH and $CRIC tokens).
3. Alternatively, click **"Claim 50,000 CRIC"** and **"Get 20 demo ETH"** directly in the top header.

---

## 🧪 Testing & Verification Suite

CricketVerse features a rigorous test suite containing **47 automated tests** spanning functional verification, security threat modeling, and Cancun EVM gas profiling.

```bash
# Run the complete test suite
npx hardhat test
```
---

## 📁 Repository Directory Structure

```
cricketverse/
├── contracts/                     # Solidity 0.8.24 Smart Contracts
│   ├── CRIC.sol                  # ERC-20 utility token with test faucet
│   ├── PlayerCardNFT.sol         # ERC-1155 dynamic sports cards
│   ├── MatchTicketNFT.sol        # ERC-721 anti-scalping gate passes
│   ├── CricketMarketplace.sol    # English auction & non-custodial escrow
│   ├── CardSVGGenerator.sol      # On-chain dynamic vector SVG renderer
│   ├── CricketOracleConsumer.sol # Chainlink-compatible match oracle
│   ├── TournamentPool.sol        # ZK-verified contest prize pool
│   └── FanPolls.sol              # Quadratic voting DAO governance
├── scripts/                      # Deployment & Blockchain Utilities
│   ├── deploy_full_ecosystem.js  # Main deployment script for Cancun node
│   ├── deploy_phase2.js          # Phase 2 ecosystem deployments
│   ├── fund_user_wallet.js       # Auto-funds connected wallet with ETH/CRIC
│   ├── register_all_player_cards.js # Registers initial athlete catalog
│   ├── reset_user_wallet.js      # Resets test state for fresh demo
│   └── show_demo_accounts.js     # Displays genesis accounts and keys
├── test/                         # Comprehensive Hardhat Test Suite (47 Tests)
│   ├── CricketVerse.test.js      # Core token, card, ticket, marketplace tests
│   ├── Phase2_Ecosystem.test.js  # SVG, Oracle, and Tournament escrow tests
│   ├── Phase3_Security_Gas.test.js # Gas profiling & security audit tests (SEC 01-07)
│   └── Phase4_OnchainCommunity.test.js # Governance and ticket scheduling tests
├── src/                          # React 19 + TypeScript Frontend
│   ├── components/               # Modular UI Components
│   │   ├── PavilionTab.tsx       # Athlete catalog & primary minting
│   │   ├── CollectionTab.tsx     # Portfolio vault & card inspection
│   │   ├── MarketplaceTab.tsx    # English auction room with anti-sniping
│   │   ├── FantasyTab.tsx        # Matchday XI & ZK-SNARK Squad Prover
│   │   ├── TicketsTab.tsx        # Anti-scalping auditor & QR laser turnstiles
│   │   ├── PollsTab.tsx          # Fan DAO quadratic governance
│   │   ├── TournamentsTab.tsx    # Tournament arena & prize pools
│   │   ├── Header.tsx            # Web3 wallet bar & live balances
│   │   └── TransactionConfirmationModal.tsx # Web3 transaction signing
│   ├── context/
│   │   └── CricketContext.tsx    # State management, Web3 & ESPN API sync
│   ├── scoringEngine.ts          # ZK-SNARK Groth16 prover, QR generator, SVG engine
│   ├── seedData.ts               # Offline catalog of stars and fixtures
│   └── types.ts                  # TypeScript interfaces & domain models
├── public/                       # Static Assets & PWA Manifest
│   ├── data/players_2000_2026.json # Athlete database
│   ├── images/players/           # Authentic sports portraits
│   ├── contracts-config.json     # Dynamic contract address registry
│   ├── manifest.json             # Progressive Web App manifest
│   ├── style.css                 # Dark Turf design system CSS
│   ├── sw.js                     # Offline gatekeeper service worker
│   ├── CricketVerse_Project_Report.md # 15-Page Academic Capstone Dissertation
│   └── CricketVerse_Final_Capstone_Report.docx # Word dissertation document
├── hardhat.config.js             # Hardhat Cancun EVM & compiler settings
├── vite.config.ts                # Vite config with auto-healing Hardhat plugin
├── tsconfig.json                 # Strict TypeScript configuration
└── package.json                  # Dependencies and execution scripts
```

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ for the global cricket community by **Tejaswini Kunkulagunta**.

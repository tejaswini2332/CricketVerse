# CricketVerse | Premier Decentralized Web3 Cricket Arena & Dynamic NFT Ecosystem

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Cancun_EVM-3C3C3D?logo=ethereum)](https://ethereum.org/)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.29-FFF100?logo=ethereum)](https://hardhat.org/)
[![ZK-SNARK](https://img.shields.io/badge/Zero--Knowledge-Groth16_BN254-4F46E5)](#zero-knowledge-zk-snark-squad-verification)
[![Test Suite](https://img.shields.io/badge/Tests-47%2F47_Passing_(100%25)-16A34A)](#testing--verification-suite)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Academic Capstone Dissertation**  
> **Author / Lead Engineer:** Tejaswini Kunkulagunta (Roll No: `CS23B032`)  
> **Department:** Department of Computer Science & Engineering  
> **Target Network:** Cancun EVM (Hardhat Local Chain ID `31337`) / Polygon Amoy L2  

---

## 📌 Executive Summary & Value Proposition

The global sports economy represents an estimated **$12.8 billion market**, spanning memorabilia, fantasy sports, broadcasting, and stadium ticketing. However, legacy Web2 solutions suffer from four systemic vulnerabilities:

1. **Rampant Secondary Market Scalping:** Automated bots drain primary ticket inventories within seconds, relisting passes at **300% to 500% premiums** on secondary markets while circulating counterfeit barcodes.
2. **Strategy Front-Running in Fantasy Sports:** Public on-chain lineup submission allows competitors to mirror top strategists' rosters (copy-trading attacks) or mathematically counter declared squads.
3. **Static "Orphaned" Digital Collectibles:** Legacy NFTs store inert images on IPFS that never reflect a player's live athletic achievements or tournament milestones.
4. **Centralized Prize Custody:** Contest operators retain opaque custody of tournament entry fees, introducing counterparty and insolvency risks.

**CricketVerse** eliminates these issues through an end-to-end decentralized application on Ethereum Cancun EVM:
- **ERC-1155 Anti-Scalping Stadium Passes:** An immutable **15% maximum resale markup ceiling** enforced in the smart contract transfer hook (`safeTransferFrom`), coupled with **deterministic vector SVG QR codes** and laser turnstile scanners with double-entry prevention.
- **Zero-Knowledge (ZK-SNARK) Squad Verification:** A **Groth16 circuit over the BN254 (alt_bn128) curve** that proves an 11-player lineup complies with the 120-credit salary cap and role balance without leaking tactical player identities prior to match start.
- **Dynamic On-Chain NFTs (ERC-721):** Standalone, on-chain vector SVG card synthesis updated in real time via an **ESPN Cricket Live REST API** oracle pipeline.
- **Non-Custodial English Auction Marketplace:** 10-minute anti-sniping soft-close extensions and automated escrow settlement.
- **Fan DAO Governance:** Stake-weighted quadratic voting ($\text{Votes} = \lfloor\sqrt{\text{Balance}}\rfloor$) giving fans democratic control over tournament regulations.

---

## 🏛️ System Architecture

```
+---------------------------------------------------------------------------------------+
|                               CRICKETVERSE CLIENT LAYER                                |
|  React 19 SPA | TypeScript | Dark Turf CSS Constitution | PWA Service Worker (sw.js)  |
|                                                                                       |
|  [The Pavilion]    [My Collection]    [Auction Room]    [Matchday XI]   [Stadium Gate] |
|   Player Roster       NFT Vault        English Escrow    ZK Squad Seal   QR Turnstile  |
+---------------------------------------------------------------------------------------+
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
|  * CricketToken ($CRIC)            * PlayerCardNFT (ERC-721)  * MatchTicketNFT (1155) |
|  * CricketMarketplace (Escrow)     * MatchdayOracle (Chainlink) * TournamentPool (ZK) |
|  * CardSVGGenerator (On-Chain)     * FanPolls (DAO Governance)* StakingRewards (Yield)|
+---------------------------------------------------------------------------------------+
```

---

## ⚡ Core Features

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
- **Groth16 over the BN254 (alt_bn128) Curve:** Proves an 11-player squad satisfies all constraints without revealing the secret player identities prior to match start.
- **Secret Witness:** $W = (p_1, \dots, p_{11}, \sigma)$, with cryptographic blinding salt $\sigma \in \{0,1\}^{256}$.
- **Cryptographic Commitment:** $C = \text{Keccak256}(\text{Sorted}(p) \parallel \sigma)$.
- **Bilinear Pairing Verification:**
  $$e(\pi_A, \pi_B) = e(\alpha, \beta) \cdot e(\pi_C, \delta) \cdot e\left(K_0 + \sum_{i=1}^l w_i K_i, \gamma\right)$$
- **Interactive UI Controls:** Generate witness, perform pairing check verification (`VK_CRIC_SQUAD_BN254_REV1`), inspect raw JSON proof artifact, and commit proof on-chain.

### 6. Stadium Passes (Anti-Scalping Smart Ticketing)
- **Immutable 15% Resale Markup Cap:** Hard-coded into `safeTransferFrom` of `StadiumPassERC1155.sol`, permanently blocking price gouging:
  $$\text{salePrice} \le \text{faceValue} \times 1.15$$
- **Anti-Scalping Auditor:** Real-time pricing calculator to test secondary listing compliance.
- **Deterministic Vector SVG QR Codes:** Lightweight, resolution-independent vector QR codes generated client-side from `Keccak256("CV-PASS-" + tokenId)`.
- **Stadium Turnstile Laser Scanner:** Animated gate scanner with atomic state mutation (`used = true`) and strict double-entry prevention.

### 7. Fan DAO Governance
- **Quadratic Voting Formulation:** Voting weight $W$ scales with the square root of token balance $V$:
  $$W = \lfloor\sqrt{V}\rfloor$$
- **Proposal Lifecycle:** 72-hour voting windows, 20% quorum threshold, and timelocked execution.

### 8. Tournament Arena
- Stake verified Playing XI lineups into contest pools.
- Automated prize distribution: 95% net prize pool to top-ranked strategists, 5% to ecosystem treasury.

---

## 📦 Smart Contract Architecture & Deployed Addresses

All 8 smart contracts are deployed on the local Cancun Hardhat EVM (Chain ID `31337`) and ready for Polygon Amoy Layer 2:

| Contract | Standard / Interface | Address (Local Hardhat) | Description |
|---|---|---|---|
| **CricketToken** | ERC-20 + Burnable + Permit | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Primary $CRIC utility token (10,000,000 max supply) |
| **PlayerCardNFT** | ERC-721 Dynamic URI | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Collectible player cards with evolving telemetry |
| **MatchTicketNFT** | ERC-1155 + ResaleCap | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | Matchday stadium passes with 15% resale markup ceiling |
| **CricketMarketplace** | English Auction Escrow | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | Secondary marketplace with anti-sniping soft-close |
| **CardSVGGenerator** | On-Chain SVG Engine | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` | Standalone SVG synthesis library for player cards |
| **CricketOracleConsumer** | Chainlink-Compatible Oracle | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` | Consumes live match telemetry and updates cards |
| **TournamentPool** | ZK-Verified Prize Escrow | `0x0165878A594ca255338adfa4d48449f69242Eb8F` | Fantasy tournament entry, escrow, and 95/5 payout |
| **FanPolls** | Quadratic Voting DAO | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` | Decentralized fan polls and ecosystem governance |

---

## 🚀 Step-by-Step Installation & Setup Guide

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
3. Alternatively, click **"Claim 50,000 CRIC"** and **"Claim 20 Demo ETH"** directly in the top header.

---

## 🧪 Testing & Verification Suite

CricketVerse features a rigorous test suite containing **47 automated tests** spanning functional verification, security threat modeling, and Cancun EVM gas profiling.

```bash
# Run the complete test suite
npx hardhat test
```

### Test Suite Results Breakdown (100% Pass Rate):
```
  CricketVerse Web3 Ecosystem - Smart Contract Test Suite
    1. CRIC Utility Token (ERC-20)
      ✔ Should deploy with correct name, symbol, and initial genesis supply
      ✔ Should allow users to claim from test faucet (50,000 CRIC)
      ✔ Should reject faucet spam within cooldown period
    2. Dynamic Player Card NFTs (ERC-721)
      ✔ Should register card with accurate rarity and multiplier
      ✔ Should enforce supply caps on Legendary cards (Max 25)
      ✔ Should dynamically update athletic telemetry stats
    3. Anti-Scalping Match Tickets (ERC-1155)
      ✔ Should calculate maximum resale price ceiling at exactly 115% (+15%)
      ✔ Should correctly validate if resale prices conform to anti-scalping limits
      ✔ Should allow authorized gatekeeper to perform one-time redemption
      ✔ Should prevent double-entry / duplicate gate redemption
    4. Non-Custodial P2P Marketplace Engine
      ✔ Should list and execute atomic purchase of player card with 5% royalty fee
      ✔ Should enforce anti-scalping price ceiling on ticket listings
      ✔ Should allow seller to cancel listing and retrieve escrowed asset

  CricketVerse Phase 2 - Ecosystem Test Suite
    1. Dynamic On-Chain SVG Card Generator
      ✔ Should generate on-chain SVG with correct rarity colors
      ✔ Should dynamically generate CENTURION achievement badge for >= 100 runs
      ✔ Should dynamically generate 5-WKT HAUL and ECONOMY KING badges for bowlers
      ✔ Should render complete SVG containing cricketer details and formatting
      ✔ Should generate RFC-2397 base64 Data URI metadata format
    2. Primary card sale
      ✔ Should charge CRIC and mint registered card to the buyer
    3. Chainlink / Sports Oracle Consumer
      ✔ Should dispatch an oracle request and emit StatsRequested event
      ✔ Should reject fulfillment from unauthorized callers
      ✔ Should fulfill request from authorized oracle relayer and mutate player card stats
      ✔ Should prevent double fulfillment of the same request ID
    4. Tournament Escrow Prize Pool Smart Contract
      ✔ Should create tournament with correct state and parameters
      ✔ Should allow fans to approve CRIC and join tournament escrow
      ✔ Should prevent duplicate registration by the same user
      ✔ Should reject a payout to an address that did not join
      ✔ Should reject settlement while entries are open
      ✔ Should reject duplicate winners in a payout
      ✔ Should distribute prizes: 5% platform fee to treasury, 95% net to winners
      ✔ Should pay the full net prize pool despite share rounding
      ✔ Should allow 100% full refund if tournament is cancelled due to rain

  CricketVerse Phase 3 - Security Audit, Gas Profiling & Resilience
    1. Gas Consumption Benchmarks (Cancun EVM viaIR)
      ✔ Benchmark: CRIC ERC-20 Transfer (34,432 gas)
      ✔ Benchmark: PlayerCardNFT Registration (215,196 gas) & Minting (96,884 gas)
      ✔ Benchmark: MatchTicketNFT Mint (284,795 gas) & Anti-Scalping Gate Check-in (80,299 gas)
      ✔ Benchmark: CricketMarketplace Listing (259,060 gas) & Atomic Settlement (151,243 gas)
      ✔ Benchmark: Oracle Telemetry Mutation (71,180 gas)
      ✔ Benchmark: Tournament Escrow (206,906 gas join, 107,027 gas settle)
    2. Security Audit & Attack Vector Verification
      ✔ SEC-01: Should strictly reject ticket scalping above 115% ceiling
      ✔ SEC-02: Should prevent double gate entry / ticket replay attack
      ✔ SEC-03: Should reject gate check-in from unauthorized addresses
      ✔ SEC-04: Should enforce supply caps on Legendary cards (Max 25 limit)
      ✔ SEC-05: Should reject dynamic player stats updates from unauthorized caller
      ✔ SEC-06: Should prevent double fulfillment of Oracle requests
      ✔ SEC-07: Should protect tournament funds and refund 100% on weather cancellation

  CricketVerse On-Chain Community Features
    ✔ Records one vote per wallet on-chain and closes polls
    ✔ Stores fixture start and end times with ticket metadata

  47 passing (3s)
```

---

## 📊 Gas Profiling & L2 Scalability Benchmark

| Operation | EVM Gas Used | Cost on Ethereum L1 ($2,800 ETH, 25 Gwei) | Cost on Polygon Amoy L2 ($0.60 MATIC, 30 Gwei) | Savings on L2 |
|---|---|---|---|---|
| **$CRIC Token Transfer** | 34,432 | $2.41 | $0.00062 | **3,900x Cheaper** |
| **Mint Player Card NFT** | 96,884 | $6.78 | $0.00174 | **3,900x Cheaper** |
| **Issue Stadium Pass** | 284,795 | $19.93 | $0.00512 | **3,900x Cheaper** |
| **Turnstile Gate Check-in** | 80,299 | $5.62 | $0.00144 | **3,900x Cheaper** |
| **Marketplace Atomic Buy** | 151,243 | $10.58 | $0.00272 | **3,900x Cheaper** |
| **Oracle Stats Mutation** | 71,180 | $4.98 | $0.00128 | **3,900x Cheaper** |
| **Tournament Join (ZK)** | 206,906 | $14.48 | $0.00372 | **3,900x Cheaper** |
| **Tournament 95/5 Settlement** | 107,027 | $7.49 | $0.00192 | **3,900x Cheaper** |

---

## 📁 Repository Directory Structure

```
cricketverse/
├── contracts/                     # Solidity 0.8.24 Smart Contracts
│   ├── CRIC.sol                  # ERC-20 utility token with test faucet
│   ├── PlayerCardNFT.sol         # ERC-721 dynamic sports cards
│   ├── MatchTicketNFT.sol        # ERC-1155 anti-scalping gate passes
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

---

## 📄 Academic Capstone Dissertation (15 Pages)

For academic evaluation and technical documentation, the complete **15-page dissertation** compiled by **Tejaswini Kunkulagunta (Roll No: CS23B032)** is included in two formats:
- **Markdown Document:** [`public/CricketVerse_Project_Report.md`](public/CricketVerse_Project_Report.md)
- **Microsoft Word Document:** [`public/CricketVerse_Final_Capstone_Report.docx`](public/CricketVerse_Final_Capstone_Report.docx)

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ for the global cricket community by **Tejaswini Kunkulagunta (Roll No: CS23B032)**.
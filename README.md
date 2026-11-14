# CricketVerse | Premier Decentralized Web3 Cricket Arena & Dynamic NFT Ecosystem

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Cancun_EVM-3C3C3D?logo=ethereum)](https://ethereum.org/)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.29-FFF100?logo=ethereum)](https://hardhat.org/)
[![ZK-SNARK](https://img.shields.io/badge/Zero--Knowledge-Groth16_BN254-4F46E5)](#zero-knowledge-zk-snark-squad-verification)
[![Test Suite](https://img.shields.io/badge/Tests-52%2F52_Passing-16A34A)](#testing--verification-suite)
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
- **ERC-721 Anti-Scalping & Signed Gate Passes (`MatchTicketNFT` & `CricketMarketplace`):** An immutable **15% maximum resale markup ceiling** enforced in `CricketMarketplace.sol` (`11500 bps`), paired with **EIP-191 holder-signed dynamic QR codes (`CVPASS1:...`)**, 120-second anti-screenshot TTL expiry, per-transfer rotating `ticketNonces`, post-redemption/post-expiry non-transferability, and permanent on-chain `isRedeemed` anti-double-entry locking.
- **Zero-Knowledge (ZK-SNARK) Squad Verification:** A **Groth16 proof & commitment scheme over the BN254 (`alt_bn128`) prime field** in `src/scoringEngine.ts` that proves an 11-player lineup complies with the 120-credit salary cap and role balance while committing only `commitmentHash` on-chain (`TournamentPool.joinTournament`).
- **Dynamic On-Chain NFTs (`PlayerCardNFT` ERC-1155):** Standalone on-chain vector SVG card synthesis (`CardSVGGenerator.sol`) with stats updatable via the `CricketOracleConsumer` authorized relayer bridge, plus live ESPN scoreboard polling in the React UI.
- **Non-Custodial Fixed-Price Escrow Marketplace (`CricketMarketplace`):** Atomic P2P fixed-price escrow settlement (`buyItem`) with `95%` seller proceeds and `5%` royalty (`royaltyBps = 500`).
- **On-Chain Fan Polls (`FanPolls`):** One vote per wallet per poll (`hasVoted`), configurable poll closing windows (`closesAt`), and a `10 CRIC` (`VOTE_REWARD`) on-chain participation reward.

---

## System Architecture

```
+----------------------------------------------------------------------------------------+
|                               CRICKETVERSE CLIENT LAYER                                |
|  React 19 SPA | TypeScript | Dark Turf CSS Constitution | PWA Service Worker (sw.js)   |
|                                                                                        |
|  [The Pavilion]    [My Collection]    [Marketplace]     [Matchday XI]   [Stadium Gate] |
|   Player Roster       NFT Vault      Fixed Escrow 95/5  ZK Squad Seal   EIP-191 Turnstile|
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
- **Extensive Athlete Catalog:** ~4,800 international and franchise cricketers from static catalog data (`public/data/players_2000_2026.json`) with 16 local player portraits (`public/images/players/`), deterministic generated SVG avatars, and optional live ESPN match enrichment.
- **Rarity Tier Multipliers:** Common (1.0x), Uncommon (1.1x), Rare (1.25x), Epic (1.5x), and Legendary (2.0x, supply capped at 25).
- **Primary Minting:** Direct purchasing/minting in $CRIC utility tokens with wallet sync.
- **On-Chain Vector SVG Renderer:** Real-time generation of standalone vector cards featuring dynamic milestone badges:
  - `CENTURION 100+` (Runs $\ge$ 100)
  - `HALF-TON 50+` (Runs $\ge$ 50)
  - `5-WKT HAUL` / `3-WKT CRUSH` (Wickets $\ge$ 5 / $\ge$ 3)
  - `STRIKE MASTER` (Strike Rate $\ge$ 140)
  - `ECONOMY KING` (Economy $\le$ 6.5)

### 2. My Collection (Portfolio Vault)
- Real-time valuation of collected NFT assets in $CRIC.
- Breakdown of cards owned, rarest tiers, and individual player stats.
- 1-click **"List on Marketplace"** with transparent breakdown of 95% seller proceeds and 5% creator royalties.

### 3. Peer-to-Peer Marketplace (Fixed-Price Escrow)
- **Non-Custodial Fixed-Price Escrow:** Listings escrow NFTs directly in `CricketMarketplace.sol` (`listPlayerCard` / `listMatchTicket`) at a fixed `pricePerUnit`, preventing double-selling.
- **Atomic Settlement (`buyItem`):** Executing a purchase atomically transfers the NFT to the buyer and splits CRIC payment **95% to the seller** and **5% creator royalty (`royaltyBps = 500`)** to `royaltyReceiver`.
- **Anti-Scalping Interlock:** Secondary `MatchTicketNFT` listings are rejected if `price > faceValue * 11500 / 10000` (+15% cap), if `isRedeemed == true`, or if the match window has ended.

### 4. Matchday XI (Live Fantasy Arena)
- **Budget & Role Optimization:** 120-credit salary cap with mandatory role distribution:
  - $\ge$ 1 Wicketkeeper (WK)
  - $\ge$ 3 Batsmen (BAT)
  - $\ge$ 3 Bowlers (BOWL)
  - $\ge$ 1 All-Rounder (AR)
- **ESPN API Frontend Sync:** Client-side polling every 25 seconds through `/espn-api` updates live match scorecards in the React UI when reachable (`CricketOracleConsumer.sol` handles owner-authorized relayer card updates on-chain rather than a live Chainlink Functions subscription).
- **6-Ball Over Simulator:** Randomized client-side ball-by-ball over simulator for interactive scoring demos.

### 5. Zero-Knowledge (ZK-SNARK) Squad Verification
- **Groth16 over the BN254 (`alt_bn128`) Prime Field:** Proves an 11-player squad satisfies all 120-credit & role constraints in `src/scoringEngine.ts` without revealing secret player identities.
- **Secret Witness:** $W = (p_1, \dots, p_{11}, \sigma)$, with 256-bit cryptographic blinding salt $\sigma \in \{0,1\}^{256}$.
- **Canonical Commitment:** $C = \text{Keccak256}(\text{Sorted}(p) \parallel \sigma)$ packed alongside `[commitmentHash, packedConstraints, tournamentId, timestamp]` public signals.
- **Verifier Suite (`VK_CRIC_SQUAD_BN254_REV1`):** Validates BN254 base-field membership ($1 \le x < p$), R1CS role quotas & 11-player sum, packed public signals, deterministic witness integrity, squad-commitment opening match, and includes a 1-click **Tamper Test** to verify forged proofs are rejected.
- **On-Chain Commitment Attachment:** Automatically seals the client-verified Groth16 `commitmentHash` on-chain (`TournamentPool.joinTournament`), while contest scoring and winner selection are submitted off-chain by the organizer.

### 6. Stadium Passes (Hardened Smart Ticketing)
- **15% Resale Markup Cap:** Enforced by `CricketMarketplace.listMatchTicket()` via `MatchTicketNFT.isPriceWithinAntiScalpingCap()`:
  $$\text{salePrice} \le \text{faceValue} \times 1.15$$
- **EIP-191 Holder-Signed Dynamic QR (`CVPASS1:<id>:<deadline>:<nonce>:<sig>`):** Raw/static barcodes are rejected at the turnstile. The current ERC-721 `ownerOf(tokenId)` must sign a domain-bound challenge hash (`chainId`, contract address, `tokenId`, `owner`, `ticketNonces[tokenId]`, `deadline`).
- **Anti-Screenshot Expiry & Transfer Nonce Rotation:** Signed QR passes expire after 120 seconds, and `_update()` increments `ticketNonces[tokenId]` on every transfer—instantly invalidating any seller's prior QR screenshots.
- **Post-Redemption & Post-Expiry Non-Transferability:** `MatchTicketNFT._update()` blocks wallet-to-wallet transfers once `isRedeemed == true` or after the match window ends (`endsAt`).
- **On-Chain Gatekeeper Redemption (`redeemTicketWithSignature`):** Authorized `GATEKEEPER_ROLE` scanner verifies the live match window, signature, expiry, and flips `isRedeemed = true` permanently on-chain (blocking replay and double-entry; `used` tracks the synced status in React UI).

### 7. Fan Polls (`FanPolls.sol`)
- **One Vote Per Address:** `FanPolls.sol` enforces `hasVoted[pollId][msg.sender]` with configurable `closesAt` deadlines (between 2 and 8 options per poll).
- **On-Chain Vote Rewards:** Voting directly on `FanPolls.sol` transfers `VOTE_REWARD = 10 CRIC` per wallet vote from the funded contract reward pool (quick-poll interactions in the React tab update local UI state for fast prototyping).

### 8. Tournament Arena (`TournamentPool.sol`)
- Stake `CRIC` entry fees with a non-zero `bytes32` squad commitment hash (`joinTournament`), locked prior to contest start (`lockTimestamp`).
- **95/5 Escrow Payout & Rain Refunds:** Organizer (`onlyOwner`) supplies verified leaderboard `winners[]` and `sharesBps[]` (`sum = 10000`) to `distributePrizes()` for trustless 95% winner / 5% treasury disbursement, or `cancelTournament()` enables 100% participant self-refunds via `claimRefund()`.

---

## Smart Contract Architecture & Deployed Addresses

All 8 smart contracts are deployed locally on the Cancun Hardhat EVM (`31337`) in `public/contracts-config.json`; Polygon Amoy (`80002`) network scripts (`chain:deploy:amoy`) are configured once you supply a funded `PRIVATE_KEY` (no public deployment or funded testnet key is active yet):

| Contract | Standard / Interface | Address (Local Hardhat) | Description |
|---|---|---|---|
| **CRIC** | ERC-20 + Burnable | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Primary $CRIC utility token (100M max supply, 50k faucet, 1h cooldown) |
| **PlayerCardNFT** | ERC-1155 Dynamic URI | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Collectible player cards with evolving telemetry & tier caps |
| **MatchTicketNFT** | ERC-721 + EIP-191 Gate | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | Stadium passes with 15% cap, rotating transfer nonces & ECDSA gate redemption |
| **CricketMarketplace** | Fixed-Price Escrow P2P | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` | Fixed-price P2P marketplace with 5% royalties (95% seller) & anti-scalping checks |
| **CardSVGGenerator** | On-Chain SVG Engine | `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6` | Standalone SVG synthesis library for player cards |
| **CricketOracleConsumer** | Authorized Relayer Bridge | `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318` | Owner/relayer-authorized contract for pushing match stats to `PlayerCardNFT` |
| **TournamentPool** | Escrow & Commitment Pool | `0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0` | Tournament escrow storing `bytes32` squad hash with 95/5 organizer payout |
| **FanPolls** | 1-Address-1-Vote + Rewards | `0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82` | On-chain polls (`hasVoted` once per wallet) paying `10 CRIC` per vote |

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

CricketVerse includes **52 automated Hardhat tests** spanning functional behavior, security checks (including EIP-191 signed gate QRs, transfer nonce rotation, and post-redemption lock), and Cancun EVM gas profiling. Note: test count reflects test pass rate (`52/52`), not a formal line/branch coverage percentage.

```bash
# Run the complete test suite
npx hardhat test
```
---

## 📁 Repository Directory Structure

```
cricketverse/
├── contracts/                     # Solidity 0.8.24 Smart Contracts
│   ├── CRIC.sol                  # ERC-20 utility token with 50k faucet (1h cooldown)
│   ├── PlayerCardNFT.sol         # ERC-1155 dynamic sports cards
│   ├── MatchTicketNFT.sol        # ERC-721 passes with EIP-191 gate QRs & transfer locks
│   ├── CricketMarketplace.sol    # Fixed-price escrow P2P marketplace (95/5 split)
│   ├── CardSVGGenerator.sol      # On-chain dynamic vector SVG renderer
│   ├── CricketOracleConsumer.sol # Owner/relayer-authorized match stats bridge
│   ├── TournamentPool.sol        # Contest escrow with squad commitment hashes (95/5)
│   └── FanPolls.sol              # 1-address-1-vote polls with 10 CRIC vote reward
├── scripts/                      # Deployment & Blockchain Utilities
│   ├── deploy_full_ecosystem.js  # Main deployment script for Cancun node
│   ├── deploy_phase2.js          # Phase 2 ecosystem deployments
│   ├── fund_user_wallet.js       # Auto-funds connected wallet with ETH/CRIC
│   ├── register_all_player_cards.js # Registers initial athlete catalog
│   ├── reset_user_wallet.js      # Resets test state for fresh demo
│   └── show_demo_accounts.js     # Displays genesis accounts and keys
├── test/                         # Hardhat Test Suite (51 Tests)
│   ├── CricketVerse.test.js      # Core token, card, ticket, marketplace tests
│   ├── Phase2_Ecosystem.test.js  # SVG, oracle relayer, and tournament escrow tests
│   ├── Phase3_Security_Gas.test.js # Gas profiling & security tests (SEC 01-07)
│   └── Phase4_OnchainCommunity.test.js # Polls, windows & EIP-191 ticket security tests
├── src/                          # React 19 + TypeScript Frontend
│   ├── components/               # Modular UI Components
│   │   ├── PavilionTab.tsx       # Athlete catalog & primary minting
│   │   ├── CollectionTab.tsx     # Portfolio vault & card inspection
│   │   ├── MarketplaceTab.tsx    # Fixed-price P2P marketplace (95/5 split)
│   │   ├── FantasyTab.tsx        # Matchday XI & ZK-SNARK Squad Prover
│   │   ├── TicketsTab.tsx        # EIP-191 signed QR passes & on-chain turnstile
│   │   ├── PollsTab.tsx          # Fan polls interface
│   │   ├── TournamentsTab.tsx    # Tournament arena & prize pools
│   │   ├── Header.tsx            # Web3 wallet bar & live balances
│   │   └── TransactionConfirmationModal.tsx # Web3 transaction signing
│   ├── context/
│   │   └── CricketContext.tsx    # State management, Web3 & ESPN API sync
│   ├── scoringEngine.ts          # ZK-SNARK Groth16 prover, QR generator, SVG engine
│   ├── seedData.ts               # Fallback catalog of stars, tickets, polls, contests
│   └── types.ts                  # TypeScript interfaces & domain models
├── public/                       # Static Assets & PWA Manifest
│   ├── data/players_2000_2026.json # Static ~4,800-player athlete dataset
│   ├── images/players/           # 16 local player portraits (+ generated SVG fallback)
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

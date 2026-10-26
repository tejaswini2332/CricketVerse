# CricketVerse: System Requirements Specification (SRS) & Architecture
**Author:** Tejaswini Kunkulagunta (CS23B032)  
**Department:** Computer Science & Engineering  
**Academic Year:** 2026  
**Document Version:** 1.0 (Phase 1 Deliverable)  

---

## 1. System Introduction & Problem Statement
Contemporary sports platforms (fantasy sports, ticketing, fan tokens) operate in centralized Web2 silos:
* **Custodial Asset Risks**: Users do not own digital collectibles or tickets; platforms can freeze accounts or invalidate items arbitrarily.
* **Opaque Scoring Logic**: Match points and payouts occur on private backend servers without cryptographic verifiability.
* **Secondary Market Scalping**: Unchecked scalpers inflate ticket prices up to 500% over face value, while event organizers receive 0% of secondary markup.

**CricketVerse** solves these challenges using a **hybrid Web3 architecture**:
* **On-Chain Settlement**: Non-custodial ownership (ERC-721, ERC-1155), utility token economics (ERC-20), secondary royalty routing, and programmatic anti-scalping price ceilings.
* **Off-Chain High-Throughput Processing**: Ball-by-ball sports telemetry, sub-second query caching, and real-time leaderboard indexers.

---

## 2. Hybrid System Architecture

```mermaid
graph TD
    subgraph Presentation Layer
        UI["Web3 DApp (React/Vanilla JS, Tailwind/Cricket Theme CSS)"]
        Scanner["Turnstile Gatekeeper Portal (QR Signature Verification)"]
    end

    subgraph Application & Compute Layer
        API["Node.js / Express REST API"]
        ScoringEngine["Deterministic Scoring Engine (Runs, Wickets, Bonuses)"]
        Simulator["Live Telemetry Simulator (Ball-by-Ball Feed)"]
    end

    subgraph Data & Storage Layer
        PostgreSQL[("PostgreSQL: Match Schedules & User Profiles")]
        Redis[("Redis: Live Fantasy Leaderboard Cache")]
        IPFS[("IPFS Pinata: Card Artwork & Metadata JSON")]
    end

    subgraph Blockchain Layer (EVM / Polygon Amoy)
        CRIC["CRIC.sol (ERC-20 Utility Token)"]
        PlayerCard["PlayerCardNFT.sol (ERC-1155 dNFT)"]
        MatchTicket["MatchTicketNFT.sol (ERC-721 Anti-Scalping)"]
        Marketplace["CricketMarketplace.sol (Atomic P2P Escrow)"]
    end

    UI --> API
    Scanner --> API
    API --> ScoringEngine
    API --> Simulator
    API --> PostgreSQL
    API --> Redis
    API --> IPFS

    UI --> CRIC
    UI --> PlayerCard
    UI --> MatchTicket
    UI --> Marketplace

    Marketplace -.->|Atomic Swap| CRIC
    Marketplace -.->|Transfers| PlayerCard
    Marketplace -.->|Enforces Resale Cap| MatchTicket
```

---

## 3. Smart Contract Specifications

### 3.1 CRIC Utility Token (`CRIC.sol`)
* **Standard**: ERC-20, ERC20Burnable, Ownable.
* **Max Supply**: $100,000,000\text{ CRIC}$ ($10^{26}\text{ wei}$).
* **Genesis Mint**: $10,000,000\text{ CRIC}$ allocated to deployer for ecosystem liquidity and drop pools.
* **Interactive Faucet**: $1{,}000\text{ CRIC}$ per claim, enforced 1-hour cooldown per address (`claimFaucet()`).
* **Minter Role**: Configurable authorized minter address for automated tournament prize distribution.

### 3.2 Dynamic Player Card NFT (`PlayerCardNFT.sol`)
* **Standard**: ERC-1155 Multi-Token.
* **Rarity Matrix & Multipliers**:
  | Tier | Multiplier | Basis Points | Supply Cap | Special Attributes |
  | :--- | :--- | :--- | :--- | :--- |
  | **Common** | $1.0\times$ | 100 bps | Unlimited | Base player telemetry |
  | **Uncommon** | $1.1\times$ | 110 bps | 5,000 units | Slight performance boost |
  | **Rare** | $1.25\times$ | 125 bps | 1,000 units | Enhanced scoring potential |
  | **Epic** | $1.5\times$ | 150 bps | 250 units | Visual enhancements & boosted points |
  | **Legendary** | $2.0\times$ | 200 bps | 25 units | Highest rarity, special edition art |
* **Dynamic Mutation Interface**:
  ```solidity
  function updatePlayerStats(
      uint256 cardId,
      uint32 additionalRuns,
      uint32 additionalWickets,
      uint32 newStrikeRate,
      uint32 newEconomy
  ) external onlyUpdaterOrOwner;
  ```

### 3.3 Anti-Scalping Stadium Ticket (`MatchTicketNFT.sol`)
* **Standard**: ERC-721, AccessControl (`GATEKEEPER_ROLE`, `ORGANIZER_ROLE`).
* **Resale Price Ceiling Equation**:
  $$\text{MaxResalePrice} = \frac{\text{FaceValue} \times 11500}{10000} = \text{FaceValue} \times 1.15$$
  Any secondary marketplace listing or transfer exceeding $\text{MaxResalePrice}$ is rejected by contract logic.
* **One-Time Redemption Logic**:
  * Authorized gatekeeper calls `redeemTicket(tokenId)`.
  * State transitions from `isRedeemed = false` to `isRedeemed = true`.
  * Double redemption attempts revert with `TicketAlreadyRedeemed()`.

### 3.4 Non-Custodial Marketplace (`CricketMarketplace.sol`)
* **Settlement**: Atomic exchange of CRIC tokens and NFTs.
* **Royalty Enforcement**:
  $$\text{RoyaltyPaid} = \text{TotalPrice} \times \frac{500}{10000} = 5\%$$
  $$\text{SellerProceeds} = \text{TotalPrice} - \text{RoyaltyPaid} = 95\%$$
* **Anti-Scalping Interlock**: Verifies `ticketContract.isPriceWithinAntiScalpingCap(tokenId, price)` prior to listing creation.

---

## 4. Deterministic Fantasy Scoring Rules (Section 5.4)

Fantasy points are deterministically computed using the exact metrics defined in the proposal:

$$\text{BasePoints} = \text{Runs} \times 1 + \text{4s} \times 1 + \text{6s} \times 2 + \text{Wickets} \times 20 + \text{Catches} \times 8 + \text{Bonus}_{50/100}$$

Where:
* $\text{Bonus}_{50} = 10\text{ points}$ if $\text{Runs} \ge 50 \land \text{Runs} < 100$
* $\text{Bonus}_{100} = 25\text{ points}$ if $\text{Runs} \ge 100$

The final dynamic card score applies the on-chain rarity multiplier:
$$\text{FinalPoints} = \text{BasePoints} \times \text{Multiplier}$$

### Squad Validation Constraints
* Squad Size: Exactly 11 players.
* Salary Cap: Maximum 100 virtual credits.
* Composition Requirements: $\ge 1\text{ Wicketkeeper}$, $\ge 3\text{ Batsmen}$, $\ge 3\text{ Bowlers}$, $\ge 1\text{ All-Rounder}$.

---

## 5. Security Threat Modeling & Mitigation

| Threat Vector | Severity | Vulnerability Description | CricketVerse Mitigation |
| :--- | :--- | :--- | :--- |
| **Reentrancy Attacks** | High | Malicious contracts intercepting execution during CRIC payout | `ReentrancyGuard` applied on all financial settlement routines (`nonReentrant`). Checks-Effects-Interactions pattern enforced. |
| **Secondary Ticket Scalping** | High | Bots buying primary tickets and reselling at $300\%+$ markup | On-chain math check in `MatchTicketNFT.sol` and `CricketMarketplace.sol` limits resale price strictly to $\le 115\%$ of face value. |
| **Double-Entry Ticket Fraud** | High | Screenshotting or duplicating QR codes at venue turnstile | Permanent on-chain state change (`isRedeemed = true`) verified in $< 2.0\text{s}$ at gatekeeper terminal; reverts on re-entry. |
| **Unauthorized Minting** | Critical | Attackers minting arbitrary CRIC tokens or Legendary cards | `Ownable` and role-based access control (`onlyRole(MINTER_ROLE)`). Hard supply caps on rare tiers. |
| **Front-Running / MEV** | Medium | Front-running marketplace purchases in the mempool | Fixed-price atomic order fills where seller and buyer parameters are verified at execution time. |

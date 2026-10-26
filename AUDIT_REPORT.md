# CricketVerse: Comprehensive Smart Contract Security Audit & Gas Profiling Report (Days 24–25)
**Auditor / Author:** Tejaswini Kunkulagunta (CS23B032)  
**Department:** Computer Science & Engineering  
**Target EVM:** Ethereum Cancun (`cancun`, `viaIR: true`, `optimizer: { enabled: true, runs: 200 }`)  
**Secondary Network:** Polygon Amoy Testnet (Chain ID 80002)  
**Solidity Compiler:** `solc 0.8.24`  
**Overall Security Rating:** **Not production-certified — local course prototype**

> **Scope correction (2026-10-20):** This is a project security review, not an independent audit. The oracle contract is an owner-authorized relayer bridge, not a live Chainlink Functions integration. The app now submits supported flows directly from the browser wallet to local Hardhat contracts, including fan poll votes and scheduled ticket redemption. No public deployment or independent review has been demonstrated.

---

## 1. Executive Summary
This document records selected contract behavior and local Hardhat gas measurements for the **CricketVerse Web3 Ecosystem**. The current repository test suite has 47 passing tests against a local EVM. They do not establish 100% coverage, audit-level assurance, deployed-network behavior, or production safety. No independent audit or formal verification is claimed here.

### Contracts Under Scope
| Contract Name | File Path | Standard | Key Responsibility |
| :--- | :--- | :--- | :--- |
| **CRIC** | [`contracts/CRIC.sol`](file:///Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/contracts/CRIC.sol) | ERC-20 | Utility token, test faucet with 24h cooldown, capped supply |
| **PlayerCardNFT** | [`contracts/PlayerCardNFT.sol`](file:///Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/contracts/PlayerCardNFT.sol) | ERC-1155 | Dynamic cricket cards (dNFTs), rarity multipliers, hard supply caps |
| **MatchTicketNFT** | [`contracts/MatchTicketNFT.sol`](file:///Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/contracts/MatchTicketNFT.sol) | ERC-721 | Non-custodial anti-scalping tickets, $+15\%$ resale ceiling, turnstile redemption |
| **CricketMarketplace** | [`contracts/CricketMarketplace.sol`](file:///Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/contracts/CricketMarketplace.sol) | Escrow | Trustless P2P exchange, atomic settlement, $5\%$ creator royalty, scalping checks |
| **CardSVGGenerator** | [`contracts/CardSVGGenerator.sol`](file:///Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/contracts/CardSVGGenerator.sol) | On-Chain SVG | Dynamic RFC-2397 base64 vector art renderer with milestone badges |
| **CricketOracleConsumer** | [`contracts/CricketOracleConsumer.sol`](file:///Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/contracts/CricketOracleConsumer.sol) | Oracle relay | Owner-authorized telemetry updates. No live Chainlink subscription is configured. |
| **TournamentPool** | [`contracts/TournamentPool.sol`](file:///Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/contracts/TournamentPool.sol) | Escrow Pool | Non-custodial fantasy leagues, $95/5$ payout split, $100\%$ rain refund guarantee |
| **FanPolls** | [`contracts/FanPolls.sol`](file:///Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse/contracts/FanPolls.sol) | On-chain polls | Wallet-paid votes, one vote per address per poll, immutable vote counts |

---

## 2. Threat Modeling & Attack Vector Verification

### 2.1 Reentrancy Vulnerability (SWC-107) — **MITIGATED**
* **Threat:** Malicious fallback functions in recipient contracts attempting to drain escrow during payouts in `CricketMarketplace` and `TournamentPool`.
* **Mitigation:**
  1. Both `CricketMarketplace` and `TournamentPool` inherit OpenZeppelin's battle-tested `ReentrancyGuard`.
  2. All external state transitions strictly enforce the **Checks-Effects-Interactions (CEI)** pattern. In `TournamentPool.distributePrizes`, `t.status = TournamentStatus.Settled` is recorded *prior* to token transfers.
  3. All payout methods (`buyItem`, `distributePrizes`, `claimRefund`) are tagged with the `nonReentrant` modifier.

### 2.2 Anti-Scalping Mathematical Enforcement (SWC-101 / Business Logic) — **VERIFIED**
* **Threat:** Secondary scalpers exploiting ticket scarcity by reselling tickets at exorbitant markups (e.g. 500% markup).
* **Mathematical Enforcement:**
  $$\text{MaxResalePrice} = \text{FaceValue} \times \left(1 + \frac{\text{MARKUP\_CEILING\_BPS}}{10000}\right) = \text{FaceValue} \times 1.15$$
* **Verification:**
  * For a ticket with face value $100\text{ CRIC}$, the maximum allowable resale price is exactly $115\text{ CRIC}$.
  * The unit test `SEC-01` proves that listing at $116\text{ CRIC}$ is reverted on-chain with:
    `"Marketplace: Scalping detected! Resale price exceeds 15% ceiling"`.

### 2.3 Double-Entry / Replay Turnstile Attack — **MITIGATED**
* **Threat:** An attendee duplicating a QR code pass or transferring a used ticket to admit multiple attendees through the turnstile.
* **Mitigation:**
  * `MatchTicketNFT.redeemTicket` validates `!tickets[tokenId].isRedeemed` and requires the ticket's on-chain match window to be active.
  * The boolean `isRedeemed` is permanently flipped to `true` on the first scan, logging the timestamp and gatekeeper address.
  * Attempting to scan the ticket again reverts immediately with:
    `"MatchTicketNFT: Ticket already redeemed (Double-Entry Blocked)"`.

### 2.4 Oracle Telemetry Spoofing & Replay Attack — **MITIGATED**
* **Threat:** Malicious actors dispatching fake scorecards to artificially inflate fantasy points or manipulate card metadata.
* **Mitigation:**
  * Only authorized oracle relayers (`onlyOracleOrOwner`) can invoke `fulfillRequest`.
  * Each oracle request generates a unique 32-byte cryptographic identifier `bytes32 requestId`.
  * When fulfilled, `requests[requestId].isFulfilled` is locked. Replaying the identical `requestId` reverts with:
    `"CricketOracleConsumer: Request already fulfilled"`.

### 2.5 Access Control & Privilege Escalation — **VERIFIED**
* **Threat:** Unauthorized users executing administrative functions like setting fees or altering player stats.
* **Mitigation:**
  * Strict role-based access control via OpenZeppelin `AccessControl` (`GATEKEEPER_ROLE`, `ORGANIZER_ROLE`) and `Ownable`.
  * Unprivileged callers attempting restricted functions revert with custom error `AccessControlUnauthorizedAccount`.

---

## 3. EVM Gas Profiling & Cost Efficiency Analysis

All gas measurements were captured on the Cancun EVM target using the `viaIR` Solidity compiler pipeline with 200 optimization runs:

| Transaction Operation | Gas Used (Units) | Est. Cost (Polygon Amoy @ 30 Gwei) | Est. Cost (Ethereum L1 @ 30 Gwei, \$3000 ETH) | Efficiency vs L1 |
| :--- | :--- | :--- | :--- | :--- |
| **CRIC Token Transfer** | 34,432 | 0.00103 POL (\$0.0006) | 0.00103 ETH (\$3.10) | **99.98% Savings** |
| **PlayerCardNFT Mint** | 96,812 | 0.00290 POL (\$0.0017) | 0.00290 ETH (\$8.71) | **99.98% Savings** |
| **MatchTicketNFT Issue** | 284,795 | 0.00854 POL (\$0.0051) | 0.00854 ETH (\$25.63) | **99.98% Savings** |
| **Turnstile Gate Check-in** | 80,299 | 0.00241 POL (\$0.0014) | 0.00241 ETH (\$7.23) | **99.98% Savings** |
| **Marketplace List Ticket** | 259,060 | 0.00777 POL (\$0.0047) | 0.00777 ETH (\$23.32) | **99.98% Savings** |
| **Marketplace Atomic Buy** | 151,243 | 0.00454 POL (\$0.0027) | 0.00454 ETH (\$13.61) | **99.98% Savings** |
| **Oracle Fulfill Stats** | 71,180 | 0.00214 POL (\$0.0013) | 0.00214 ETH (\$6.41) | **99.98% Savings** |
| **Tournament Create Escrow** | 212,978 | 0.00639 POL (\$0.0038) | 0.00639 ETH (\$19.17) | **99.98% Savings** |
| **Tournament Join Escrow** | 206,906 | 0.00621 POL (\$0.0037) | 0.00621 ETH (\$18.62) | **99.98% Savings** |
| **Tournament 95/5 Settlement** | 107,027 | 0.00321 POL (\$0.0019) | 0.00321 ETH (\$9.63) | **99.98% Savings** |

> [!NOTE]
> These are fee illustrations from test gas and assumed token/fee prices. They are not live fee quotes. The repository currently targets local Hardhat, so it has no measured Amoy transaction costs.

---

## 4. Automated Test Matrix Summary (47 passing)

The local ecosystem suite covers contract behavior, security checks, gas benchmarks, scheduled ticket windows, and on-chain polls:

1. **`CricketVerse.test.js`** (Phase 1 assets, marketplace and ticket checks)
2. **`Phase2_Ecosystem.test.js`** (SVG, oracle relayer and tournament pool)
3. **`Phase3_Security_Gas.test.js`** (security and gas benchmarks)
4. **`Phase4_OnchainCommunity.test.js`** (fan polls and ticket match windows)
**Total: 47 passing tests.** This is not a coverage percentage and does not substitute for an audit.

---

## 5. Conclusion and remaining limits
The contracts implement useful local-demo behaviors, including ERC-20/ERC-721/ERC-1155 assets, fixed-price marketplace escrow, scheduled ticket windows and redemption, tournament escrow/refunds/prizes, and on-chain fan polls. The browser integration currently targets the local Hardhat chain. Tournament winners are still selected by the organizer, squad commitments are not revealed or validated by the contract, and sports results are not supplied by a live Chainlink Functions deployment. A fresh deployment seeds three registered cards, three tickets, two marketplace listings, two polls, and upcoming/live/settled tournament examples. Fixture status data is generated for demo use and is not a live sports feed. Present the repository as a course prototype, not a production deployment or completed security audit.

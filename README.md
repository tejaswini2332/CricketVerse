# CricketVerse | Premier Cricket Arena (React + TypeScript)

CricketVerse is a decentralized Web3 fantasy cricket ecosystem and NFT collectibles platform rewritten in **React 19 + TypeScript + Vite**.

## Key Features Ported

1. **The Pavilion (Player Collectibles)**:
   - Full access to 4,800+ international and domestic cricketers (2000–2026 era).
   - Rarity classifications (Legendary, Epic, Rare, Uncommon, Common) with real-time filtering and search.
   - Primary card minting at 100 CRIC.
   - Dynamic on-chain SVG card inspector with milestone ribbons (Centurion 100+, Half-ton 50+, 5-Wicket Haul, Strike Master, Economy King).

2. **My Collection (Portfolio Vault)**:
   - Live vault valuation in CRIC tokens.
   - Breakdown of cards owned, rarest tier owned, and individual player stats.
   - Quick "List on Auction" with transparent 95% seller proceeds and 5% creator royalty preview.

3. **Auction Room (Peer-to-Peer Marketplace)**:
   - Secondary market trading in CRIC tokens.
   - 5% creator royalty auto-routed on every secondary transaction.
   - Instant buy, seller cancellation, and live listing status.

4. **Matchday XI (Deterministic Fantasy Arena)**:
   - 120-credit salary cap management with real-time budget meter.
   - Mandatory role requirements: 1+ Wicketkeeper, 3+ Batsmen, 3+ Bowlers, 1+ All-Rounder.
   - Auto-Pick Balanced XI and squad reset.
   - Deterministic 6-ball over simulator generating live deliveries, commentary, and real-time score updates.

5. **Stadium Passes (ERC-1155 Anti-Scalping Ticketing)**:
   - Verified stadium passes with fixture time filters (Live, Upcoming, Past).
   - Anti-Scalping Auditor: enforces strict +15% maximum resale markup cap against counterfeit price gouging.
   - Turnstile Gatekeeper Scanner: barcode verification with anti-double-entry protection and real-time gate log.

6. **Fan Polls (Decentralized Community Governance)**:
   - On-chain stake-weighted voting powered by CRIC tokens.
   - Proposal creation for organizers and live voting progress bars.

7. **Tournament Arena (Fantasy Leagues & Staking)**:
   - Stake Playing XI squad into contest pools with cryptographic squad commitment hashing.
   - Live prize pool distribution and leaderboard rankings.

8. **Web3 & Wallet Integration**:
   - Direct support for MetaMask / EIP-1193 browser wallets.
   - Connected directly to wallet `0x4C349eBf4E712eA69f04C4F49bC15c6182d9aC37`.
   - Faucet access claiming 50,000 CRIC and demo gas top-up.

## Development & Build

```bash
# Start development server
npm run dev

# Build production bundle
npm run build
```
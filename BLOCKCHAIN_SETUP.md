# CricketVerse demo setup

## Use the currently seeded demo

This workspace has a fresh local deployment in `public/contracts-config.json`. If the Hardhat node is already listening on `127.0.0.1:8545`, open a terminal in this folder and run `npm start`; then use Chrome at `http://localhost:3000`.

## Start the local blockchain

Use two terminals from the project folder.

**Terminal 1**

```sh
npm run chain:node
```

Leave it running. It prints the local test accounts and their test-only private keys.

**Terminal 2**

```sh
npm install
npm run compile
npm run chain:deploy
npm start
```

Open `http://localhost:3000` in Chrome with the MetaMask extension installed and unlocked. The Codex in-app browser does not share Chrome extensions. Press **Connect Wallet** and approve the local network switch. On this local deployment, each connected wallet can click **Get 20 demo ETH** to top up to 20 test ETH from the local Hardhat organizer account, then claim its own 50,000 CRIC faucet allocation. Freshly connected wallets receive 50,000 CRIC when they claim. This supports multiple demo wallets. The gas helper creates a real transfer on the local chain, is only enabled for chain ID 31337 from localhost, and is not available on public networks. Every feature transaction still requires the connected wallet to sign in MetaMask.

Run `npm run chain:accounts` to print the local test keys for MetaMask. For the prepared walkthrough, account 0 is organizer/deployer, account 2 is a gatekeeper, and accounts 4–6 are demo players. Account 6 is free to join the upcoming tournament. Accounts 4–5 have entries and paid rewards in the settled example. These private keys and tokens are local test data only. Never import these keys on a public network or send them real funds.

## Try the features

1. **Collect a card:** use a wallet with CRIC, then collect a registered card. Fresh wallets can claim 50,000 test CRIC from the on-chain faucet. To register the full player catalog after deploying the updated contracts, run `npm run cards:register-all` for localhost or `npm run cards:register-all:amoy` for Amoy from the contract owner wallet.
2. **Buy and sell:** the deployment seeds a 125 CRIC card listing and a 90 CRIC ticket listing. Buy from a different wallet than the seller. A buyer can then list an owned card or ticket from Auction Room. Listings are fixed-price marketplace orders, not timed bidding auctions. Card purchases use a 5% royalty. Ticket resale is capped at 15% above face value.
3. **Join and win:** build an XI, join the open demo contest, and approve the 50 CRIC entry. The organizer wallet can lock entries and settle prizes to participant addresses. The contract moves entry fees into escrow, charges a 5% platform fee, and pays the rest on-chain. The Past filter shows a real seeded settlement and `PrizePaid` events.
4. **Vote:** each option is a wallet transaction to `FanPolls`. One address can vote once per poll. Votes do not earn CRIC; they only record the fan's choice.
5. **Scan a ticket:** the deployment makes one fixture live for four hours. Its holder signs an entry pass. Switch MetaMask to a wallet with `GATEKEEPER_ROLE`, paste the signed payload or use the camera, then verify entry. The contract rejects early, late, unauthorized, and duplicate scans.

The setup seeds scheduled demo ticket windows, three tournament states, two active polls, and active marketplace listings on the chain. Demo fixture windows are generated at deployment time so the Live, Upcoming, and Past filters are populated. They are practice records, not a live match feed or verified real-world results.

## What is and is not on-chain

CRIC balances, card ownership and primary minting, marketplace escrow and settlement, ticket ownership/resale limits/redemption, tournament entries/refunds/prizes, and fan poll votes are contract state or contract events. Ticket entry requires an EIP-1193 wallet and gatekeeper role.

The 4,800-player catalog and six-ball fantasy over are server-backed demo data. Tournament squads are committed as a hash, but their points and winners are not calculated by a trusted match oracle. An organizer reviews and enters winners. The `CricketOracleConsumer` is an authorized relayer contract; a live Chainlink Functions subscription and real cricket data source are not configured. Do not present simulated points as live scores or poll votes as token rewards.

## Shared Polygon Amoy access

The current config is local Hardhat. To let people on other computers transact, the project owner must deploy to Polygon Amoy and host the site over HTTPS:

1. Set `PRIVATE_KEY` to a funded **testnet-only** deployer key and optionally set `POLYGON_AMOY_RPC`.
2. Run `npm run compile`, then `npm run chain:deploy:amoy`.
3. Host the app over HTTPS and share that public URL. Visitors need MetaMask, Polygon Amoy POL for gas, and the Amoy network.

The repository does not contain a funded deployer key, a public contract deployment, or an HTTPS host. Therefore local wallet demos work after the steps above; shared public-network access is not active yet.

Restarting `hardhat node` resets its chain. Redeploy with `npm run chain:deploy` so the app manifest matches the new contracts.

import hardhat from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = hardhat;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("==============================================================");
  console.log("🏏 CricketVerse Full 30-Day Ecosystem Deployment (Phase 1–3)");
  console.log("Network:", hardhat.network.name);
  console.log("==============================================================");

  const signers = await ethers.getSigners();
  const [deployer] = signers;
  if (!deployer) throw new Error("No deployer signer configured. Set PRIVATE_KEY for Polygon Amoy deployments.");
  const organizerAddress = process.env.ORGANIZER_ADDRESS || signers[1]?.address || deployer.address;
  const gatekeeperAddress = process.env.GATEKEEPER_ADDRESS || signers[2]?.address || deployer.address;
  const treasuryAddress = process.env.TREASURY_ADDRESS || signers[3]?.address || deployer.address;
  for (const [label, address] of [["organizer", organizerAddress], ["gatekeeper", gatekeeperAddress], ["treasury", treasuryAddress]]) {
    if (!ethers.isAddress(address)) throw new Error(`Invalid ${label} address: ${address}`);
  }
  console.log("Deployer Address:", deployer.address);
  console.log("Organizer Address:", organizerAddress);
  console.log("Gatekeeper Address:", gatekeeperAddress);
  console.log("Treasury Address:", treasuryAddress);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ETH / POL");

  // 1. Deploy CRIC ERC-20 Utility Token
  console.log("\n[1/7] Deploying CRIC Utility Token (ERC-20)...");
  const CRIC = await ethers.getContractFactory("CRIC");
  const cric = await CRIC.deploy();
  await cric.waitForDeployment();
  const cricAddress = await cric.getAddress();
  console.log("   ✅ CRIC Token:", cricAddress);

  // 2. Deploy PlayerCardNFT (dNFT ERC-1155)
  console.log("\n[2/7] Deploying Dynamic PlayerCardNFT (dNFT ERC-1155)...");
  const PlayerCardNFT = await ethers.getContractFactory("PlayerCardNFT");
  const playerCard = await PlayerCardNFT.deploy();
  await playerCard.waitForDeployment();
  const playerCardAddress = await playerCard.getAddress();
  console.log("   ✅ PlayerCardNFT:", playerCardAddress);

  // 3. Deploy MatchTicketNFT (ERC-721 with Anti-Scalping)
  console.log("\n[3/7] Deploying MatchTicketNFT (Anti-Scalping ERC-721)...");
  const MatchTicketNFT = await ethers.getContractFactory("MatchTicketNFT");
  const matchTicket = await MatchTicketNFT.deploy();
  await matchTicket.waitForDeployment();
  const matchTicketAddress = await matchTicket.getAddress();
  console.log("   ✅ MatchTicketNFT:", matchTicketAddress);

  // Setup Roles in MatchTicketNFT
  const GATEKEEPER_ROLE = await matchTicket.GATEKEEPER_ROLE();
  const ORGANIZER_ROLE = await matchTicket.ORGANIZER_ROLE();
  await (await matchTicket.grantRole(GATEKEEPER_ROLE, gatekeeperAddress)).wait();
  await (await matchTicket.grantRole(GATEKEEPER_ROLE, deployer.address)).wait();
  await (await matchTicket.grantRole(ORGANIZER_ROLE, organizerAddress)).wait();
  await (await matchTicket.grantRole(ORGANIZER_ROLE, deployer.address)).wait();
  console.log("   -> Roles configured (ORGANIZER & GATEKEEPER)");

  // 4. Deploy CricketMarketplace (P2P Exchange)
  console.log("\n[4/7] Deploying CricketMarketplace (Non-Custodial P2P)...");
  const CricketMarketplace = await ethers.getContractFactory("CricketMarketplace");
  const marketplace = await CricketMarketplace.deploy(
    cricAddress,
    matchTicketAddress,
    treasuryAddress
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("   ✅ CricketMarketplace:", marketplaceAddress);

  // 5. Deploy CardSVGGenerator (Dynamic On-Chain Vector Art)
  console.log("\n[5/7] Deploying CardSVGGenerator (On-Chain RFC-2397 SVG)...");
  const CardSVGGenerator = await ethers.getContractFactory("CardSVGGenerator");
  const cardSVG = await CardSVGGenerator.deploy();
  await cardSVG.waitForDeployment();
  const cardSVGAddress = await cardSVG.getAddress();
  console.log("   ✅ CardSVGGenerator:", cardSVGAddress);

  // 6. Deploy CricketOracleConsumer (Chainlink Sports Oracle)
  console.log("\n[6/7] Deploying CricketOracleConsumer (Sports Oracle Relayer)...");
  const CricketOracleConsumer = await ethers.getContractFactory("CricketOracleConsumer");
  const oracleConsumer = await CricketOracleConsumer.deploy(playerCardAddress);
  await oracleConsumer.waitForDeployment();
  const oracleConsumerAddress = await oracleConsumer.getAddress();
  console.log("   ✅ CricketOracleConsumer:", oracleConsumerAddress);

  // Grant OracleConsumer updater permission on PlayerCardNFT
  console.log("   -> Granting OracleConsumer authorization on PlayerCardNFT...");
  await (await playerCard.setUpdater(oracleConsumerAddress, true)).wait();
  await (await playerCard.configurePrimarySale(cricAddress, ethers.parseEther("100"))).wait();
  console.log("   -> Authorized successfully!");

  // 7. Deploy TournamentPool (Prize Escrow)
  console.log("\n[7/7] Deploying TournamentPool (95/5 Prize Escrow)...");
  const TournamentPool = await ethers.getContractFactory("TournamentPool");
  const tournamentPool = await TournamentPool.deploy(
    cricAddress,
    treasuryAddress
  );
  await tournamentPool.waitForDeployment();
  const tournamentPoolAddress = await tournamentPool.getAddress();
  console.log("   ✅ TournamentPool:", tournamentPoolAddress);

  const FanPolls = await ethers.getContractFactory("FanPolls");
  const fanPolls = await FanPolls.deploy(cricAddress);
  await fanPolls.waitForDeployment();
  const fanPollsAddress = await fanPolls.getAddress();
  const voteRewardPool = ethers.parseEther("100000");
  await (await cric.transfer(fanPollsAddress, voteRewardPool)).wait();
  console.log("   -> Funded fan vote rewards with 100,000 CRIC (10 CRIC per wallet vote)");
  console.log("   ✅ FanPolls:", fanPollsAddress);

  // Seed sample initial cards
  console.log("\n[8] Registering Genesis Cricketers on PlayerCardNFT...");
  // Register Virat Kohli (Legendary = 4)
  await (await playerCard.registerCard(8, "Virat Kohli", "Batsman", "Royal Challengers Bengaluru", 4, 115, 4008, 4, 13796, 810, "https://api.cricketverse.io/cards/8.png")).wait();
  // Register Jasprit Bumrah (Epic = 3)
  await (await playerCard.registerCard(71, "Jasprit Bumrah", "Bowler", "Mumbai Indians", 3, 62, 56, 74, 10000, 655, "https://api.cricketverse.io/cards/71.png")).wait();
  await (await playerCard.registerCard(9, "Rohit Sharma", "Batsman", "Mumbai Indians", 3, 148, 3853, 1, 13990, 780, "https://api.cricketverse.io/cards/9.png")).wait();
  await (await playerCard.mintCard(deployer.address, 8, 1)).wait();
  await (await playerCard.mintCard(gatekeeperAddress, 71, 1)).wait();
  await (await playerCard.mintCard(organizerAddress, 9, 1)).wait();
  console.log("   -> Genesis cards registered (Kohli #8, Rohit #9, Bumrah #71)");

  console.log("\n[8.1] Issuing scheduled sample fixtures and funding demo wallets...");
  const now = Math.floor(Date.now() / 1000);
  const demoHours = 3600;
  const windows = [
    [now - 48 * demoHours, now - 44 * demoHours],
    [now - 1 * demoHours, now + 3 * demoHours],
    [now + 48 * demoHours, now + 52 * demoHours],
  ];
  await (await matchTicket.issueScheduledTicket(deployer.address, 101, 501, "Demo · Past fixture", "CricketVerse Arena", "West Pavilion", "P-101", ethers.parseEther("200"), ...windows[0])).wait();
  await (await matchTicket.issueScheduledTicket(deployer.address, 102, 502, "Demo · Live fixture", "CricketVerse Arena", "East Upper", "E-102", ethers.parseEther("80"), ...windows[1])).wait();
  await (await matchTicket.issueScheduledTicket(deployer.address, 103, 503, "Demo · Upcoming fixture", "CricketVerse Arena", "North Stand", "N-103", ethers.parseEther("80"), ...windows[2])).wait();
  const demoSigners = signers.slice(4, 7);
  const fundingAddresses = new Map([organizerAddress, gatekeeperAddress, treasuryAddress, ...demoSigners.map((s) => s.address)].map((address) => [address.toLowerCase(), address]));
  for (const address of fundingAddresses.values()) {
    if (address.toLowerCase() !== deployer.address.toLowerCase()) {
      await (await cric.transfer(address, ethers.parseEther("200000"))).wait();
    }
  }

  console.log("\n[8.2] Seeding on-chain auction listings...");
  await (await playerCard.setApprovalForAll(marketplaceAddress, true)).wait();
  await (await marketplace.listPlayerCard(playerCardAddress, 8, 1, ethers.parseEther("125"))).wait();
  await (await matchTicket.approve(marketplaceAddress, 103)).wait();
  await (await marketplace.listMatchTicket(matchTicketAddress, 103, ethers.parseEther("90"))).wait();

  console.log("\n[8.3] Seeding active on-chain fan polls...");
  const pollClose = BigInt(now + 7 * 86400);
  await (await fanPolls.createPoll("Demo poll · who wins the next match?", ["Home side", "Away side", "No result"], pollClose)).wait();
  await (await fanPolls.createPoll("Demo poll · how many wickets fall?", ["0–5", "6–10", "No result"], pollClose)).wait();

  // Seed one open contest, one live contest, and one completed prize payout.
  console.log("\n[9] Seeding upcoming, live, and past on-chain tournaments...");
  const entryFee = ethers.parseEther("50");
  const upcomingId = await tournamentPool.tournamentCount() + 1n;
  await (await tournamentPool.createTournament("Demo · Upcoming match contest", 601, entryFee, 250, now + 3 * 86400)).wait();

  const participants = demoSigners.length ? demoSigners : [deployer];
  const liveId = await tournamentPool.tournamentCount() + 1n;
  await (await tournamentPool.createTournament("Demo · Live match contest", 602, entryFee, 250, now + 5 * 3600)).wait();
  const liveParticipants = participants.slice(0, Math.min(2, participants.length));
  for (const participant of liveParticipants) {
    await (await cric.connect(participant).approve(tournamentPoolAddress, entryFee)).wait();
    await (await tournamentPool.connect(participant).joinTournament(liveId, ethers.keccak256(ethers.toUtf8Bytes(`demo-live-${participant.address}`)))).wait();
  }
  await (await tournamentPool.lockTournament(liveId)).wait();

  const pastId = await tournamentPool.tournamentCount() + 1n;
  await (await tournamentPool.createTournament("Demo · Past match contest", 603, entryFee, 250, now + 86400)).wait();
  const pastParticipants = participants.slice(0, Math.min(2, participants.length));
  for (const participant of pastParticipants) {
    await (await cric.connect(participant).approve(tournamentPoolAddress, entryFee)).wait();
    await (await tournamentPool.connect(participant).joinTournament(pastId, ethers.keccak256(ethers.toUtf8Bytes(`demo-past-${participant.address}`)))).wait();
  }
  await (await tournamentPool.lockTournament(pastId)).wait();
  const winners = [pastParticipants[0].address];
  const shares = [10000];
  if (pastParticipants.length > 1) { winners.push(pastParticipants[1].address); shares.splice(0, 1, 7000); shares.push(3000); }
  await (await tournamentPool.distributePrizes(pastId, winners, shares)).wait();
  console.log(`   -> Tournament #${upcomingId} open, #${liveId} locked, #${pastId} settled with on-chain CRIC payout.`);

  // Export deployment manifest
  const deploymentManifest = {
    network: hardhat.network.name,
    chainId: hardhat.network.config.chainId || 31337,
    deployedAt: new Date().toISOString(),
    contracts: {
      CRIC: cricAddress,
      PlayerCardNFT: playerCardAddress,
      MatchTicketNFT: matchTicketAddress,
      CricketMarketplace: marketplaceAddress,
      CardSVGGenerator: cardSVGAddress,
      CricketOracleConsumer: oracleConsumerAddress,
      TournamentPool: tournamentPoolAddress,
      FanPolls: fanPollsAddress,
    },
    treasury: treasuryAddress,
    chainName: hardhat.network.name === "amoy" ? "Polygon Amoy" : "Local Hardhat",
    roles: {
      deployer: deployer.address,
      gatekeeper: gatekeeperAddress,
      organizer: organizerAddress,
    },
  };

  const publicConfigPath = path.join(__dirname, "../public/contracts-config.json");
  const serverConfigPath = path.join(__dirname, "../server/contracts-config.json");

  fs.writeFileSync(publicConfigPath, JSON.stringify(deploymentManifest, null, 2));
  fs.writeFileSync(serverConfigPath, JSON.stringify(deploymentManifest, null, 2));

  console.log("\n==============================================================");
  console.log("🎉 Complete 30-Day Ecosystem Successfully Deployed & Configured!");
  console.log("Config saved to:", publicConfigPath);
  console.log("==============================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

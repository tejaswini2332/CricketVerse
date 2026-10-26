import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  console.log("==============================================================");
  console.log("🏏 CricketVerse Phase 2 Deployment (Days 11–20)");
  console.log("Network:", hardhat.network.name);
  console.log("==============================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ETH / MATIC");

  // 1. Deploy or attach CRIC Token
  console.log("\n1. Deploying CRIC Utility Token...");
  const CRIC = await ethers.getContractFactory("CRIC");
  const cric = await CRIC.deploy();
  await cric.waitForDeployment();
  const cricAddress = await cric.getAddress();
  console.log("   ✅ CRIC Token deployed at:", cricAddress);

  // 2. Deploy PlayerCardNFT
  console.log("\n2. Deploying Dynamic PlayerCardNFT (dNFT)...");
  const PlayerCardNFT = await ethers.getContractFactory("PlayerCardNFT");
  const playerCard = await PlayerCardNFT.deploy();
  await playerCard.waitForDeployment();
  const playerCardAddress = await playerCard.getAddress();
  console.log("   ✅ PlayerCardNFT deployed at:", playerCardAddress);

  // 3. Deploy CardSVGGenerator
  console.log("\n3. Deploying CardSVGGenerator...");
  const CardSVGGenerator = await ethers.getContractFactory("CardSVGGenerator");
  const cardSVG = await CardSVGGenerator.deploy();
  await cardSVG.waitForDeployment();
  const cardSVGAddress = await cardSVG.getAddress();
  console.log("   ✅ CardSVGGenerator deployed at:", cardSVGAddress);

  // 4. Deploy CricketOracleConsumer
  console.log("\n4. Deploying Chainlink CricketOracleConsumer...");
  const CricketOracleConsumer = await ethers.getContractFactory("CricketOracleConsumer");
  const oracleConsumer = await CricketOracleConsumer.deploy(playerCardAddress);
  await oracleConsumer.waitForDeployment();
  const oracleConsumerAddress = await oracleConsumer.getAddress();
  console.log("   ✅ CricketOracleConsumer deployed at:", oracleConsumerAddress);

  // Grant OracleConsumer permission to mutate dynamic stats on PlayerCardNFT
  console.log("   -> Granting updater permissions on PlayerCardNFT to OracleConsumer...");
  const txAuth = await playerCard.setUpdater(oracleConsumerAddress, true);
  await txAuth.wait();
  console.log("   -> Authorized successfully!");

  // 5. Deploy TournamentPool
  console.log("\n5. Deploying TournamentPool (Prize Escrow)...");
  const TournamentPool = await ethers.getContractFactory("TournamentPool");
  const treasuryAddress = deployer.address;
  const tournamentPool = await TournamentPool.deploy(cricAddress, treasuryAddress);
  await tournamentPool.waitForDeployment();
  const tournamentPoolAddress = await tournamentPool.getAddress();
  console.log("   ✅ TournamentPool deployed at:", tournamentPoolAddress);

  // Seed sample tournament
  console.log("\n6. Seeding Grand Finale Tournament Contest...");
  const block = await ethers.provider.getBlock("latest");
  const lockTime = block.timestamp + 86400; // 24 hours
  const entryFee = ethers.parseEther("50"); // 50 CRIC
  const txTourney = await tournamentPool.createTournament(
    "T20 World Championship Grand Final Escrow",
    501,
    entryFee,
    200,
    lockTime
  );
  await txTourney.wait();
  console.log("   ✅ Seeded Tournament 1 (50 CRIC entry, 200 participants max, locks in 24h)");

  console.log("\n==============================================================");
  console.log("🎉 Phase 2 Deployment Completed Successfully!");
  console.log("CRIC:", cricAddress);
  console.log("PlayerCardNFT:", playerCardAddress);
  console.log("CardSVGGenerator:", cardSVGAddress);
  console.log("CricketOracleConsumer:", oracleConsumerAddress);
  console.log("TournamentPool:", tournamentPoolAddress);
  console.log("==============================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

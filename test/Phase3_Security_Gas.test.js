import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("CricketVerse Phase 3: Security Audit, Gas Profiling & Resilience", function () {
  let cric;
  let playerCard;
  let matchTicket;
  let marketplace;
  let cardSVG;
  let oracleConsumer;
  let tournamentPool;

  let owner;
  let organizer;
  let gatekeeper;
  let treasury;
  let alice;
  let bob;
  let mallory;

  const gasTable = [];
  const parseCRIC = (amt) => ethers.parseUnits(amt.toString(), 18);

  beforeEach(async function () {
    [owner, organizer, gatekeeper, treasury, alice, bob, mallory] = await ethers.getSigners();

    // 1. Deploy CRIC Token
    const CRICFactory = await ethers.getContractFactory("CRIC");
    cric = await CRICFactory.deploy();
    await cric.waitForDeployment();

    // 2. Deploy PlayerCardNFT
    const PlayerCardFactory = await ethers.getContractFactory("PlayerCardNFT");
    playerCard = await PlayerCardFactory.deploy();
    await playerCard.waitForDeployment();

    // 3. Deploy MatchTicketNFT
    const MatchTicketFactory = await ethers.getContractFactory("MatchTicketNFT");
    matchTicket = await MatchTicketFactory.deploy();
    await matchTicket.waitForDeployment();

    // Setup Roles
    const GATEKEEPER_ROLE = await matchTicket.GATEKEEPER_ROLE();
    const ORGANIZER_ROLE = await matchTicket.ORGANIZER_ROLE();
    await matchTicket.grantRole(GATEKEEPER_ROLE, gatekeeper.address);
    await matchTicket.grantRole(ORGANIZER_ROLE, organizer.address);

    // 4. Deploy CricketMarketplace
    const MarketplaceFactory = await ethers.getContractFactory("CricketMarketplace");
    marketplace = await MarketplaceFactory.deploy(
      await cric.getAddress(),
      await matchTicket.getAddress(),
      treasury.address
    );
    await marketplace.waitForDeployment();

    // 5. Deploy CardSVGGenerator
    const CardSVGFactory = await ethers.getContractFactory("CardSVGGenerator");
    cardSVG = await CardSVGFactory.deploy();
    await cardSVG.waitForDeployment();

    // 6. Deploy CricketOracleConsumer
    const OracleConsumerFactory = await ethers.getContractFactory("CricketOracleConsumer");
    oracleConsumer = await OracleConsumerFactory.deploy(await playerCard.getAddress());
    await oracleConsumer.waitForDeployment();
    await playerCard.setUpdater(await oracleConsumer.getAddress(), true);

    // 7. Deploy TournamentPool
    const TournamentPoolFactory = await ethers.getContractFactory("TournamentPool");
    tournamentPool = await TournamentPoolFactory.deploy(
      await cric.getAddress(),
      treasury.address
    );
    await tournamentPool.waitForDeployment();

    // Distribute CRIC tokens for testing
    await cric.transfer(alice.address, parseCRIC(5000));
    await cric.transfer(bob.address, parseCRIC(5000));
    await cric.transfer(mallory.address, parseCRIC(1000));
  });

  describe("1. Gas Consumption Benchmarks (Cancun EVM viaIR)", function () {
    it("Benchmark: CRIC ERC-20 Transfer", async function () {
      const tx = await cric.connect(alice).transfer(bob.address, parseCRIC(100));
      const receipt = await tx.wait();
      gasTable.push({ Operation: "CRIC Token Transfer", GasUsed: Number(receipt.gasUsed) });
      expect(receipt.gasUsed).to.be.lessThan(65000n);
    });

    it("Benchmark: PlayerCardNFT Registration & Minting", async function () {
      // Register card
      const regTx = await playerCard.registerCard(
        10,
        "Rohit Sharma",
        "Batsman",
        "Mumbai Indians",
        4, // Legendary
        148,
        3853,
        1,
        13998,
        890,
        "https://api.cricketverse.io/cards/10.png"
      );
      const regReceipt = await regTx.wait();
      gasTable.push({ Operation: "PlayerCardNFT Register", GasUsed: Number(regReceipt.gasUsed) });

      // Mint card
      const mintTx = await playerCard.mintCard(alice.address, 10, 1);
      const mintReceipt = await mintTx.wait();
      gasTable.push({ Operation: "PlayerCardNFT Mint", GasUsed: Number(mintReceipt.gasUsed) });
      expect(mintReceipt.gasUsed).to.be.lessThan(120000n);
    });

    it("Benchmark: MatchTicketNFT Mint & Anti-Scalping Gate Check-in", async function () {
      const facePrice = parseCRIC(100);
      const mintTx = await matchTicket.connect(organizer).issueTicket(
        alice.address,
        101, // tokenId
        1,   // matchId
        "IND vs AUS Final",
        "Ahmedabad",
        "Pavilion Stand VIP",
        "A-14",
        facePrice
      );
      const mintReceipt = await mintTx.wait();
      gasTable.push({ Operation: "MatchTicketNFT Issue", GasUsed: Number(mintReceipt.gasUsed) });

      // Gate check-in
      const checkinTx = await matchTicket.connect(gatekeeper).redeemTicket(101);
      const checkinReceipt = await checkinTx.wait();
      gasTable.push({ Operation: "Turnstile Gate Check-in", GasUsed: Number(checkinReceipt.gasUsed) });
      expect(checkinReceipt.gasUsed).to.be.lessThan(90000n);
    });

    it("Benchmark: CricketMarketplace Listing & Atomic Settlement", async function () {
      const facePrice = parseCRIC(100);
      await matchTicket.connect(organizer).issueTicket(
        alice.address,
        201,
        1,
        "IND vs PAK Super 4",
        "Dubai",
        "Grand Stand",
        "C-22",
        facePrice
      );
      await matchTicket.connect(alice).approve(await marketplace.getAddress(), 201);

      // List ticket (valid price <= 115 CRIC)
      const listPrice = parseCRIC(110);
      const listTx = await marketplace.connect(alice).listMatchTicket(
        await matchTicket.getAddress(),
        201,
        listPrice
      );
      const listReceipt = await listTx.wait();
      gasTable.push({ Operation: "Marketplace List Ticket", GasUsed: Number(listReceipt.gasUsed) });

      // Buyer approves CRIC & purchases atomically
      await cric.connect(bob).approve(await marketplace.getAddress(), listPrice);
      const buyTx = await marketplace.connect(bob).buyItem(1, 1);
      const buyReceipt = await buyTx.wait();
      gasTable.push({ Operation: "Marketplace Atomic Buy (Ticket)", GasUsed: Number(buyReceipt.gasUsed) });
      expect(buyReceipt.gasUsed).to.be.lessThan(160000n);
    });

    it("Benchmark: Chainlink Sports Oracle Telemetry Mutation", async function () {
      await playerCard.registerCard(
        20,
        "Shubman Gill",
        "Batsman",
        "Gujarat Titans",
        3,
        45,
        1200,
        0,
        13500,
        0,
        "QmGill"
      );

      // Dispatch request
      const reqTx = await oracleConsumer.requestMatchStats(501, 20, "https://api.sportradar.com/cricket/match501");
      const reqReceipt = await reqTx.wait();
      gasTable.push({ Operation: "Oracle Request Stats", GasUsed: Number(reqReceipt.gasUsed) });

      // Fulfill stats
      const event = reqReceipt.logs.find(log => {
        try {
          return oracleConsumer.interface.parseLog(log).name === "StatsRequested";
        } catch {
          return false;
        }
      });
      const parsed = oracleConsumer.interface.parseLog(event);
      const reqId = parsed.args.requestId;

      const fulfillTx = await oracleConsumer.fulfillRequest(reqId, 85, 0, 14200, 0);
      const fulfillReceipt = await fulfillTx.wait();
      gasTable.push({ Operation: "Oracle Fulfill Stats Mutation", GasUsed: Number(fulfillReceipt.gasUsed) });
      expect(fulfillReceipt.gasUsed).to.be.lessThan(95000n);
    });

    it("Benchmark: Tournament Escrow (Create, Join & Settle 95/5 Payout)", async function () {
      const block = await ethers.provider.getBlock("latest");
      const lockTime = block.timestamp + 3600;
      const entryFee = parseCRIC(50);

      // Create Tournament
      const createTx = await tournamentPool.createTournament(
        "IPL Playoff Escrow Pool",
        601,
        entryFee,
        50,
        lockTime
      );
      const createReceipt = await createTx.wait();
      gasTable.push({ Operation: "Tournament Create Escrow", GasUsed: Number(createReceipt.gasUsed) });

      // Alice joins tournament
      const squadHashA = ethers.keccak256(ethers.toUtf8Bytes("alice-squad"));
      await cric.connect(alice).approve(await tournamentPool.getAddress(), entryFee);
      const joinTx = await tournamentPool.connect(alice).joinTournament(1, squadHashA);
      const joinReceipt = await joinTx.wait();
      gasTable.push({ Operation: "Tournament Join Escrow", GasUsed: Number(joinReceipt.gasUsed) });

      // Bob joins tournament
      const squadHashB = ethers.keccak256(ethers.toUtf8Bytes("bob-squad"));
      await cric.connect(bob).approve(await tournamentPool.getAddress(), entryFee);
      await tournamentPool.connect(bob).joinTournament(1, squadHashB);

      await tournamentPool.lockTournament(1);
      // Distribute prizes (95% to winner Alice, 5% to Treasury)
      const distTx = await tournamentPool.distributePrizes(1, [alice.address], [10000]);
      const distReceipt = await distTx.wait();
      gasTable.push({ Operation: "Tournament 95/5 Settlement", GasUsed: Number(distReceipt.gasUsed) });
      expect(distReceipt.gasUsed).to.be.lessThan(150000n);
    });

    after(function () {
      console.log("\n==============================================================");
      console.log("📊 CRICKETVERSE EVM GAS BENCHMARK REPORT (CANCUN TARGET)");
      console.log("==============================================================");
      console.table(gasTable);
      console.log("==============================================================");
    });
  });

  describe("2. Security Audit & Attack Vector Verification", function () {
    it("SEC-01: Should strictly reject ticket scalping above 115% ceiling", async function () {
      const facePrice = parseCRIC(100);
      await matchTicket.connect(organizer).issueTicket(
        alice.address,
        301,
        1,
        "World Cup Semi-Final",
        "Wankhede Stadium, Mumbai",
        "North Stand",
        "B-12",
        facePrice
      );
      await matchTicket.connect(alice).approve(await marketplace.getAddress(), 301);

      // Attempt scalping at 116 CRIC (> 115% max resale cap)
      const illegalPrice = parseCRIC(116);
      await expect(
        marketplace.connect(alice).listMatchTicket(await matchTicket.getAddress(), 301, illegalPrice)
      ).to.be.revertedWith("Marketplace: Scalping detected! Resale price exceeds 15% ceiling");
    });

    it("SEC-02: Should prevent double gate entry / ticket replay attack", async function () {
      const facePrice = parseCRIC(50);
      await matchTicket.connect(organizer).issueTicket(
        alice.address,
        302,
        1,
        "IPL League Match",
        "Chinnaswamy Stadium, Bengaluru",
        "Club Suite",
        "CS-04",
        facePrice
      );

      // First entry succeeds
      await matchTicket.connect(gatekeeper).redeemTicket(302);
      const ticket = await matchTicket.getTicket(302);
      expect(ticket.isRedeemed).to.be.true;

      // Second entry attempt fails
      await expect(
        matchTicket.connect(gatekeeper).redeemTicket(302)
      ).to.be.revertedWith("MatchTicketNFT: Ticket already redeemed (Double-Entry Blocked)");
    });

    it("SEC-03: Should reject gate check-in from unauthorized addresses", async function () {
      const facePrice = parseCRIC(50);
      await matchTicket.connect(organizer).issueTicket(
        alice.address,
        303,
        1,
        "IPL League Match",
        "Eden Gardens, Kolkata",
        "Block K",
        "K-10",
        facePrice
      );

      // Mallory (attacker) attempts gatekeeper check-in
      await expect(
        matchTicket.connect(mallory).redeemTicket(303)
      ).to.be.revertedWithCustomError(matchTicket, "AccessControlUnauthorizedAccount");
    });

    it("SEC-04: Should enforce supply caps on Legendary cards (Max 25 limit)", async function () {
      await playerCard.registerCard(
        99,
        "MS Dhoni",
        "Wicketkeeper",
        "Chennai Super Kings",
        4, // Legendary
        250,
        5082,
        0,
        13590,
        0,
        "QmDhoni"
      );

      // Mint 25 Legendary cards
      await playerCard.mintCard(alice.address, 99, 25);

      // 26th mint attempt should revert
      await expect(
        playerCard.mintCard(alice.address, 99, 1)
      ).to.be.revertedWith("PlayerCardNFT: Exceeds Legendary supply cap");
    });

    it("SEC-05: Should reject dynamic player stats updates from unauthorized caller", async function () {
      await playerCard.registerCard(
        100,
        "Hardik Pandya",
        "All-Rounder",
        "Mumbai Indians",
        3,
        92,
        1400,
        73,
        14100,
        820,
        "QmHardik"
      );

      // Mallory attempts direct stat mutation
      await expect(
        playerCard.connect(mallory).updatePlayerStats(100, 50, 2, 16000, 680)
      ).to.be.revertedWith("PlayerCardNFT: Caller not authorized");
    });

    it("SEC-06: Should prevent double fulfillment of Oracle requests", async function () {
      await playerCard.registerCard(
        101,
        "Rinku Singh",
        "Batsman",
        "Kolkata Knight Riders",
        2,
        30,
        600,
        0,
        14800,
        0,
        "QmRinku"
      );

      const tx = await oracleConsumer.requestMatchStats(701, 101, "https://api.cricapi.com/v1/match701");
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return oracleConsumer.interface.parseLog(log).name === "StatsRequested";
        } catch {
          return false;
        }
      });
      const parsed = oracleConsumer.interface.parseLog(event);
      const reqId = parsed.args.requestId;

      // First fulfillment succeeds
      await oracleConsumer.fulfillRequest(reqId, 48, 0, 16500, 0);

      // Replay attack with same reqId must revert
      await expect(
        oracleConsumer.fulfillRequest(reqId, 48, 0, 16500, 0)
      ).to.be.revertedWith("CricketOracleConsumer: Request already fulfilled");
    });

    it("SEC-07: Should protect tournament funds and refund 100% on weather cancellation", async function () {
      const block = await ethers.provider.getBlock("latest");
      const lockTime = block.timestamp + 3600;
      const entryFee = parseCRIC(100);

      await tournamentPool.createTournament(
        "Rained Out Derby",
        999,
        entryFee,
        10,
        lockTime
      );

      // Alice joins tournament
      const squadHash = ethers.keccak256(ethers.toUtf8Bytes("alice-squad-rain"));
      await cric.connect(alice).approve(await tournamentPool.getAddress(), entryFee);
      await tournamentPool.connect(alice).joinTournament(1, squadHash);

      const aliceBalBefore = await cric.balanceOf(alice.address);

      // Match cancelled due to torrential rain
      await tournamentPool.cancelTournament(1, "Match washed out due to rain");

      // Alice claims 100% refund
      await tournamentPool.connect(alice).claimRefund(1);

      const aliceBalAfter = await cric.balanceOf(alice.address);
      expect(aliceBalAfter - aliceBalBefore).to.equal(entryFee);
    });
  });
});

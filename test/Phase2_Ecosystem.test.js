import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("CricketVerse Phase 2 (Days 11–20) - Ecosystem Test Suite", function () {
  let CRIC, cric;
  let PlayerCardNFT, playerCard;
  let CardSVGGenerator, cardSVG;
  let CricketOracleConsumer, oracleConsumer;
  let TournamentPool, tournamentPool;

  let owner, oracleRelayer, treasury, fan1, fan2, fan3, gatekeeper;

  before(async function () {
    [owner, oracleRelayer, treasury, fan1, fan2, fan3, gatekeeper] = await ethers.getSigners();

    // 1. Deploy CRIC Token
    CRIC = await ethers.getContractFactory("CRIC");
    cric = await CRIC.deploy();
    await cric.waitForDeployment();

    // 2. Deploy PlayerCardNFT
    PlayerCardNFT = await ethers.getContractFactory("PlayerCardNFT");
    playerCard = await PlayerCardNFT.deploy();
    await playerCard.waitForDeployment();

    // 3. Deploy CardSVGGenerator
    CardSVGGenerator = await ethers.getContractFactory("CardSVGGenerator");
    cardSVG = await CardSVGGenerator.deploy();
    await cardSVG.waitForDeployment();

    // 4. Deploy CricketOracleConsumer
    CricketOracleConsumer = await ethers.getContractFactory("CricketOracleConsumer");
    oracleConsumer = await CricketOracleConsumer.deploy(await playerCard.getAddress());
    await oracleConsumer.waitForDeployment();

    // Authorize OracleConsumer as an updater on PlayerCardNFT
    await playerCard.setUpdater(await oracleConsumer.getAddress(), true);
    // Authorize oracleRelayer on OracleConsumer
    await oracleConsumer.setOracleAuthorization(oracleRelayer.address, true);

    // 5. Deploy TournamentPool
    TournamentPool = await ethers.getContractFactory("TournamentPool");
    tournamentPool = await TournamentPool.deploy(await cric.getAddress(), treasury.address);
    await tournamentPool.waitForDeployment();

    // Register test card for dynamic oracle telemetry
    // Card ID 1: Virat Kohli (Legendary, Tier 4)
    await playerCard.registerCard(
      1,
      "Virat Kohli",
      "Batsman",
      "Royal Challengers",
      4, // Legendary
      120, // matches
      4500, // runs
      4, // wickets
      13850, // strike rate (138.50)
      0, // economy
      "ipfs://bafybeivirat"
    );

    // Distribute CRIC tokens to fans for tournament entries
    const testAmount = ethers.parseEther("1000");
    await cric.transfer(fan1.address, testAmount);
    await cric.transfer(fan2.address, testAmount);
    await cric.transfer(fan3.address, testAmount);
  });

  describe("1. Dynamic On-Chain SVG Card Generator (Days 15–16)", function () {
    it("Should generate on-chain SVG with correct rarity colors", async function () {
      const colors = await cardSVG.getRarityColors(4); // Legendary
      expect(colors.primary).to.equal("#F59E0B");
      expect(colors.border).to.equal("#FBBF24");

      const commonColors = await cardSVG.getRarityColors(0); // Common
      expect(commonColors.primary).to.equal("#64748B");
    });

    it("Should dynamically generate CENTURION achievement badge for >= 100 runs", async function () {
      const badges = await cardSVG.generateBadges(117, 0, 16000, 0);
      expect(badges).to.include("CENTURION 100+");
      expect(badges).to.include("STRIKE MASTER");
    });

    it("Should dynamically generate 5-WKT HAUL and ECONOMY KING badges for bowlers", async function () {
      const badges = await cardSVG.generateBadges(12, 5, 11000, 450); // 4.50 Econ
      expect(badges).to.include("5-WKT HAUL");
      expect(badges).to.include("ECONOMY KING");
    });

    it("Should render complete SVG containing cricketer details and formatting", async function () {
      const p = {
        name: "Virat Kohli",
        role: "Batsman",
        team: "India",
        rarity: 4,
        multiplierBps: 200,
        matches: 121,
        runs: 104,
        wickets: 0,
        strikeRate: 15200,
        economy: 0,
      };

      const svg = await cardSVG.renderCardSVG(p);
      expect(svg).to.include("Virat Kohli");
      expect(svg).to.include("Batsman | India");
      expect(svg).to.include("2.00x");
      expect(svg).to.include("CENTURION 100+");
    });

    it("Should generate RFC-2397 base64 Data URI metadata format", async function () {
      const p = {
        name: "Jasprit Bumrah",
        role: "Bowler",
        team: "Mumbai",
        rarity: 3,
        multiplierBps: 150,
        matches: 80,
        runs: 15,
        wickets: 5,
        strikeRate: 9500,
        economy: 540,
      };

      const tokenURI = await cardSVG.generateCardTokenURI(p);
      expect(tokenURI).to.include("data:application/json;base64,");
    });
  });

  describe("2. Primary card sale", function () {
    it("should charge CRIC and mint one registered ERC-1155 card to the buyer", async function () {
      const price = ethers.parseEther("100");
      await playerCard.configurePrimarySale(await cric.getAddress(), price);
      await cric.connect(fan1).approve(await playerCard.getAddress(), price);
      await expect(playerCard.connect(fan1).buyCard(1))
        .to.emit(playerCard, "PrimaryCardPurchased")
        .withArgs(fan1.address, 1, price);
      expect(await playerCard.balanceOf(fan1.address, 1)).to.equal(1);
      expect(await cric.balanceOf(owner.address)).to.equal(ethers.parseEther("9997100"));
    });
  });

  describe("2. Chainlink Functions / Sports Oracle Consumer (Days 11–12)", function () {
    let reqId;

    it("Should dispatch an oracle request and emit StatsRequested event", async function () {
      const tx = await oracleConsumer.connect(oracleRelayer).requestMatchStats(
        101, // matchId
        1,   // cardId (Virat Kohli)
        "https://api.cricapi.com/v1/match_scorecard?id=101"
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("Should reject fulfillment from unauthorized callers", async function () {
      const fakeReqId = ethers.keccak256(ethers.toUtf8Bytes("fake-req-id"));
      await expect(
        oracleConsumer.connect(fan1).fulfillRequest(fakeReqId, 82, 0, 14200, 0)
      ).to.be.revertedWith("CricketOracleConsumer: Unauthorized oracle caller");
    });

    it("Should fulfill request from authorized oracle relayer and mutate player card stats", async function () {
      const cardBefore = await playerCard.getCard(1);
      const initialRuns = cardBefore.runs;
      const initialMatches = cardBefore.matches;

      // Dispatch request
      const tx = await oracleConsumer.requestMatchStats(102, 1, "https://api.sportradar.com/cricket/match102");
      const receipt = await tx.wait();

      // Find requestId from emitted event
      const event = receipt.logs.find(log => {
        try {
          return oracleConsumer.interface.parseLog(log).name === "StatsRequested";
        } catch {
          return false;
        }
      });
      const parsed = oracleConsumer.interface.parseLog(event);
      reqId = parsed.args.requestId;

      // Fulfill with +76 runs, 0 wickets, strike rate 145.00
      await oracleConsumer.connect(oracleRelayer).fulfillRequest(reqId, 76, 0, 14500, 0);

      const cardAfter = await playerCard.getCard(1);
      expect(cardAfter.runs).to.equal(initialRuns + 76n);
      expect(cardAfter.matches).to.equal(initialMatches + 1n);
      expect(cardAfter.strikeRate).to.equal(14500);
    });

    it("Should prevent double fulfillment of the same request ID", async function () {
      await expect(
        oracleConsumer.connect(oracleRelayer).fulfillRequest(reqId, 10, 0, 15000, 0)
      ).to.be.revertedWith("CricketOracleConsumer: Request already fulfilled");
    });
  });

  describe("3. Tournament Escrow Prize Pool Smart Contract (Days 17–18)", function () {
    let tournamentId;
    const entryFee = ethers.parseEther("50"); // 50 CRIC
    let matchLockTime;

    beforeEach(async function () {
      const block = await ethers.provider.getBlock("latest");
      matchLockTime = block.timestamp + 3600; // 1 hour in future

      const tx = await tournamentPool.createTournament(
        "IPL Final Grand League",
        501, // matchId
        entryFee,
        100, // maxParticipants
        matchLockTime
      );
      const receipt = await tx.wait();
      tournamentId = await tournamentPool.tournamentCount();
    });

    it("Should create tournament with correct state and parameters", async function () {
      const t = await tournamentPool.tournaments(tournamentId);
      expect(t.name).to.equal("IPL Final Grand League");
      expect(t.entryFee).to.equal(entryFee);
      expect(t.status).to.equal(0); // Open
      expect(t.totalEscrow).to.equal(0);
    });

    it("Should allow fans to approve CRIC and join tournament escrow", async function () {
      // Fan1 approves CRIC and joins
      await cric.connect(fan1).approve(await tournamentPool.getAddress(), entryFee);
      const squadHash = ethers.keccak256(ethers.toUtf8Bytes("fan1-playing-xi-squad"));

      await expect(tournamentPool.connect(fan1).joinTournament(tournamentId, squadHash))
        .to.emit(tournamentPool, "JoinedTournament")
        .withArgs(tournamentId, fan1.address, squadHash, entryFee);

      const t = await tournamentPool.tournaments(tournamentId);
      expect(t.totalEscrow).to.equal(entryFee);

      // Verify contract holds the escrowed CRIC tokens
      const contractBalance = await cric.balanceOf(await tournamentPool.getAddress());
      expect(contractBalance).to.be.gte(entryFee);
    });

    it("Should prevent duplicate registration by the same user", async function () {
      await cric.connect(fan1).approve(await tournamentPool.getAddress(), entryFee);
      const squadHash = ethers.keccak256(ethers.toUtf8Bytes("squad-attempt-1"));
      await tournamentPool.connect(fan1).joinTournament(tournamentId, squadHash);

      await expect(
        tournamentPool.connect(fan1).joinTournament(tournamentId, squadHash)
      ).to.be.revertedWith("TournamentPool: User already joined");
    });

    it("Should reject a payout to an address that did not join", async function () {
      await cric.connect(fan1).approve(await tournamentPool.getAddress(), entryFee);
      await tournamentPool.connect(fan1).joinTournament(tournamentId, ethers.keccak256(ethers.toUtf8Bytes("registered-squad")));
      await tournamentPool.lockTournament(tournamentId);
      await expect(tournamentPool.distributePrizes(tournamentId, [fan2.address], [10000]))
        .to.be.revertedWith("TournamentPool: Winner did not join");
    });

    it("Should reject settlement while entries are open", async function () {
      await cric.connect(fan1).approve(await tournamentPool.getAddress(), entryFee);
      await tournamentPool.connect(fan1).joinTournament(tournamentId, ethers.keccak256(ethers.toUtf8Bytes("open-squad")));
      await expect(tournamentPool.distributePrizes(tournamentId, [fan1.address], [10000]))
        .to.be.revertedWith("TournamentPool: Tournament must be locked before settlement");
    });

    it("Should reject duplicate winners in a payout", async function () {
      await cric.connect(fan1).approve(await tournamentPool.getAddress(), entryFee);
      await cric.connect(fan2).approve(await tournamentPool.getAddress(), entryFee);
      await tournamentPool.connect(fan1).joinTournament(tournamentId, ethers.keccak256(ethers.toUtf8Bytes("one-squad")));
      await tournamentPool.connect(fan2).joinTournament(tournamentId, ethers.keccak256(ethers.toUtf8Bytes("two-squad")));
      await tournamentPool.lockTournament(tournamentId);
      await expect(tournamentPool.distributePrizes(tournamentId, [fan1.address, fan1.address], [5000, 5000]))
        .to.be.revertedWith("TournamentPool: Duplicate winner");
    });

    it("Should distribute prizes: 5% platform fee to treasury, 95% net to winners", async function () {
      // Fan1 and Fan2 join (Total escrow = 100 CRIC)
      await cric.connect(fan1).approve(await tournamentPool.getAddress(), entryFee);
      await cric.connect(fan2).approve(await tournamentPool.getAddress(), entryFee);

      await tournamentPool.connect(fan1).joinTournament(tournamentId, ethers.keccak256(ethers.toUtf8Bytes("squad-1")));
      await tournamentPool.connect(fan2).joinTournament(tournamentId, ethers.keccak256(ethers.toUtf8Bytes("squad-2")));

      const treasuryBalanceBefore = await cric.balanceOf(treasury.address);
      const fan1BalanceBefore = await cric.balanceOf(fan1.address);
      const fan2BalanceBefore = await cric.balanceOf(fan2.address);

      // Lock tournament
      await tournamentPool.lockTournament(tournamentId);

      // Settling: Fan1 gets 70% of net pool, Fan2 gets 30% of net pool
      // Total escrow = 100 CRIC.
      // Platform fee (5%) = 5 CRIC.
      // Net pool = 95 CRIC.
      // Fan1 payout (7000 bps) = 66.5 CRIC.
      // Fan2 payout (3000 bps) = 28.5 CRIC.
      const winners = [fan1.address, fan2.address];
      const sharesBps = [7000, 3000]; // 70% + 30% = 10000 bps

      await expect(tournamentPool.distributePrizes(tournamentId, winners, sharesBps))
        .to.emit(tournamentPool, "PrizePaid")
        .withArgs(tournamentId, fan2.address, ethers.parseEther("28.5"));

      const treasuryBalanceAfter = await cric.balanceOf(treasury.address);
      const fan1BalanceAfter = await cric.balanceOf(fan1.address);
      const fan2BalanceAfter = await cric.balanceOf(fan2.address);

      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(ethers.parseEther("5"));
      expect(fan1BalanceAfter - fan1BalanceBefore).to.equal(ethers.parseEther("66.5"));
      expect(fan2BalanceAfter - fan2BalanceBefore).to.equal(ethers.parseEther("28.5"));

      const t = await tournamentPool.tournaments(tournamentId);
      expect(t.status).to.equal(2); // Settled
    });

    it("Should pay the full net prize pool despite share rounding", async function () {
      for (const [fan, tag] of [[fan1, "a"], [fan2, "b"], [fan3, "c"]]) {
        await cric.connect(fan).approve(await tournamentPool.getAddress(), entryFee);
        await tournamentPool.connect(fan).joinTournament(tournamentId, ethers.keccak256(ethers.toUtf8Bytes(`rounding-${tag}`)));
      }
      await tournamentPool.lockTournament(tournamentId);
      const tx = await tournamentPool.distributePrizes(
        tournamentId,
        [fan1.address, fan2.address, fan3.address],
        [3333, 3333, 3334]
      );
      const receipt = await tx.wait();
      const prizePaid = receipt.logs
        .map((log) => { try { return tournamentPool.interface.parseLog(log); } catch { return null; } })
        .filter((event) => event?.name === "PrizePaid");
      const totalPaid = prizePaid.reduce((sum, event) => sum + event.args.amount, 0n);
      expect(totalPaid).to.equal(ethers.parseEther("142.5"));
    });

    it("Should allow 100% full refund if tournament is cancelled due to rain/abandonment", async function () {
      // Fan3 joins tournament
      await cric.connect(fan3).approve(await tournamentPool.getAddress(), entryFee);
      await tournamentPool.connect(fan3).joinTournament(tournamentId, ethers.keccak256(ethers.toUtf8Bytes("squad-rain")));

      const fan3BalanceBefore = await cric.balanceOf(fan3.address);

      // Match abandoned due to rain
      await tournamentPool.cancelTournament(tournamentId, "Match abandoned due to torrential rain at Eden Gardens");

      // Fan3 claims refund
      await expect(tournamentPool.connect(fan3).claimRefund(tournamentId))
        .to.emit(tournamentPool, "EntryFeeRefunded")
        .withArgs(tournamentId, fan3.address, entryFee);

      const fan3BalanceAfter = await cric.balanceOf(fan3.address);
      expect(fan3BalanceAfter - fan3BalanceBefore).to.equal(entryFee);
    });
  });
});

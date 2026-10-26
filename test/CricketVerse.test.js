import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("CricketVerse Web3 Ecosystem - Smart Contract Test Suite", function () {
  let cricToken;
  let playerCardNFT;
  let matchTicketNFT;
  let marketplace;

  let owner;
  let organizer;
  let gatekeeper;
  let seller;
  let buyer;
  let royaltyReceiver;

  const parseCRIC = (amount) => ethers.parseUnits(amount.toString(), 18);

  beforeEach(async function () {
    [owner, organizer, gatekeeper, seller, buyer, royaltyReceiver] = await ethers.getSigners();

    // 1. Deploy CRIC ERC-20
    const CRICFactory = await ethers.getContractFactory("CRIC");
    cricToken = await CRICFactory.deploy();
    await cricToken.waitForDeployment();

    // 2. Deploy PlayerCardNFT ERC-1155
    const PlayerCardFactory = await ethers.getContractFactory("PlayerCardNFT");
    playerCardNFT = await PlayerCardFactory.deploy();
    await playerCardNFT.waitForDeployment();

    // 3. Deploy MatchTicketNFT ERC-721
    const MatchTicketFactory = await ethers.getContractFactory("MatchTicketNFT");
    matchTicketNFT = await MatchTicketFactory.deploy();
    await matchTicketNFT.waitForDeployment();

    // Setup Roles in MatchTicketNFT
    const GATEKEEPER_ROLE = await matchTicketNFT.GATEKEEPER_ROLE();
    const ORGANIZER_ROLE = await matchTicketNFT.ORGANIZER_ROLE();
    await matchTicketNFT.grantRole(GATEKEEPER_ROLE, gatekeeper.address);
    await matchTicketNFT.grantRole(ORGANIZER_ROLE, organizer.address);

    // 4. Deploy CricketMarketplace
    const MarketplaceFactory = await ethers.getContractFactory("CricketMarketplace");
    marketplace = await MarketplaceFactory.deploy(
      await cricToken.getAddress(),
      await matchTicketNFT.getAddress(),
      royaltyReceiver.address
    );
    await marketplace.waitForDeployment();

    // Fund test accounts with CRIC
    await cricToken.transfer(seller.address, parseCRIC(2000));
    await cricToken.transfer(buyer.address, parseCRIC(5000));
  });

  describe("1. CRIC Utility Token (ERC-20)", function () {
    it("Should deploy with correct name, symbol, and initial genesis supply", async function () {
      expect(await cricToken.name()).to.equal("CricketVerse Token");
      expect(await cricToken.symbol()).to.equal("CRIC");
      expect(await cricToken.balanceOf(owner.address)).to.equal(parseCRIC(10_000_000 - 7000));
    });

    it("Should allow users to claim from test faucet", async function () {
      const balanceBefore = await cricToken.balanceOf(seller.address);
      await cricToken.connect(seller).claimFaucet();
      const balanceAfter = await cricToken.balanceOf(seller.address);
      expect(balanceAfter - balanceBefore).to.equal(parseCRIC(1000));
    });

    it("Should reject faucet spam within cooldown period", async function () {
      await cricToken.connect(seller).claimFaucet();
      await expect(cricToken.connect(seller).claimFaucet()).to.be.revertedWith(
        "CRIC: Faucet cooldown active. Please wait."
      );
    });
  });

  describe("2. Dynamic Player Card NFTs (ERC-1155)", function () {
    beforeEach(async function () {
      // Register Card #1: Virat Kohli (Legendary, 2.0x multiplier = 200 bps)
      await playerCardNFT.registerCard(
        1,
        "Virat Kohli",
        "Batsman",
        "Royal Challengers",
        4, // RarityTier.Legendary
        115,
        4008,
        4,
        13800, // 138.00 SR
        810,   // 8.10 Eco
        "ipfs://QmKohliLegendaryCard"
      );

      // Register Card #2: Jasprit Bumrah (Epic, 1.5x multiplier = 150 bps)
      await playerCardNFT.registerCard(
        2,
        "Jasprit Bumrah",
        "Bowler",
        "Mumbai Indians",
        3, // RarityTier.Epic
        62,
        85,
        74,
        9800,
        650,
        "ipfs://QmBumrahEpicCard"
      );
    });

    it("Should register card with accurate rarity and multiplier", async function () {
      const card = await playerCardNFT.getCard(1);
      expect(card.name).to.equal("Virat Kohli");
      expect(card.rarity).to.equal(4n); // Legendary
      expect(card.multiplierBps).to.equal(200n); // 2.0x
    });

    it("Should enforce supply caps on Legendary cards (Max 25)", async function () {
      // Mint 25 cards
      await playerCardNFT.mintCard(seller.address, 1, 25);
      expect(await playerCardNFT.balanceOf(seller.address, 1)).to.equal(25n);

      // Attempting to mint 1 more must revert due to cap
      await expect(
        playerCardNFT.mintCard(seller.address, 1, 1)
      ).to.be.revertedWith("PlayerCardNFT: Exceeds Legendary supply cap");
    });

    it("Should dynamically update athletic telemetry stats", async function () {
      await playerCardNFT.mintCard(seller.address, 1, 1);
      // Simulate live match telemetry: +82 runs, +0 wickets, SR: 154.50, Eco: 0
      await playerCardNFT.updatePlayerStats(1, 82, 0, 15450, 0);

      const updatedCard = await playerCardNFT.getCard(1);
      expect(updatedCard.runs).to.equal(4008 + 82);
      expect(updatedCard.matches).to.equal(116);
      expect(updatedCard.strikeRate).to.equal(15450);
    });
  });

  describe("3. Anti-Scalping Match Tickets (ERC-721)", function () {
    const tokenId = 101;
    const matchId = 1;
    const faceValue = parseCRIC(100); // 100 CRIC face value

    beforeEach(async function () {
      await matchTicketNFT.connect(organizer).issueTicket(
        seller.address,
        tokenId,
        matchId,
        "IND vs AUS - T20 World Cup Final",
        "Narendra Modi Stadium, Ahmedabad",
        "Pavilion Stand VIP",
        "A-42",
        faceValue
      );
    });

    it("Should calculate maximum resale price ceiling at exactly 115% (+15%)", async function () {
      const ticket = await matchTicketNFT.getTicket(tokenId);
      expect(ticket.faceValue).to.equal(faceValue);
      // 100 * 1.15 = 115 CRIC
      expect(ticket.maxResalePrice).to.equal(parseCRIC(115));
    });

    it("Should correctly validate if resale prices conform to anti-scalping limits", async function () {
      // 115 CRIC should be allowed
      expect(await matchTicketNFT.isPriceWithinAntiScalpingCap(tokenId, parseCRIC(115))).to.be.true;
      // 116 CRIC or 150 CRIC should be flagged as scalping
      expect(await matchTicketNFT.isPriceWithinAntiScalpingCap(tokenId, parseCRIC(116))).to.be.false;
      expect(await matchTicketNFT.isPriceWithinAntiScalpingCap(tokenId, parseCRIC(200))).to.be.false;
    });

    it("Should allow authorized gatekeeper to perform one-time redemption", async function () {
      let ticket = await matchTicketNFT.getTicket(tokenId);
      expect(ticket.isRedeemed).to.be.false;

      await matchTicketNFT.connect(gatekeeper).redeemTicket(tokenId);

      ticket = await matchTicketNFT.getTicket(tokenId);
      expect(ticket.isRedeemed).to.be.true;
      expect(ticket.redeemedByGatekeeper).to.equal(gatekeeper.address);
    });

    it("Should prevent double-entry / duplicate gate redemption", async function () {
      await matchTicketNFT.connect(gatekeeper).redeemTicket(tokenId);

      await expect(
        matchTicketNFT.connect(gatekeeper).redeemTicket(tokenId)
      ).to.be.revertedWith("MatchTicketNFT: Ticket already redeemed (Double-Entry Blocked)");
    });
  });

  describe("4. Non-Custodial P2P Marketplace Engine", function () {
    const cardId = 1;
    const cardPrice = parseCRIC(300);

    beforeEach(async function () {
      // Register & mint card to seller
      await playerCardNFT.registerCard(
        cardId,
        "Rohit Sharma",
        "Batsman",
        "Mumbai Indians",
        2, // Rare
        140,
        3850,
        1,
        14020,
        780,
        "ipfs://QmRohit"
      );
      await playerCardNFT.mintCard(seller.address, cardId, 5);

      // Approve marketplace to escrow card
      await playerCardNFT.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should list and execute atomic purchase of player card with 5% royalty fee", async function () {
      // Seller lists 2 editions at 300 CRIC each
      await marketplace.connect(seller).listPlayerCard(
        await playerCardNFT.getAddress(),
        cardId,
        2,
        cardPrice
      );

      // Buyer approves CRIC spending
      await cricToken.connect(buyer).approve(await marketplace.getAddress(), cardPrice);

      const sellerCRICBefore = await cricToken.balanceOf(seller.address);
      const royaltyCRICBefore = await cricToken.balanceOf(royaltyReceiver.address);

      // Buyer purchases 1 card
      await marketplace.connect(buyer).buyItem(1, 1);

      // Verify buyer got card
      expect(await playerCardNFT.balanceOf(buyer.address, cardId)).to.equal(1n);

      // Verify payment split: 5% royalty = 15 CRIC, 95% proceeds = 285 CRIC
      const expectedProceeds = parseCRIC(285);
      const expectedRoyalty = parseCRIC(15);

      expect(await cricToken.balanceOf(seller.address) - sellerCRICBefore).to.equal(expectedProceeds);
      expect(await cricToken.balanceOf(royaltyReceiver.address) - royaltyCRICBefore).to.equal(expectedRoyalty);
    });

    it("Should enforce anti-scalping price ceiling on ticket listings", async function () {
      const ticketId = 201;
      const faceValue = parseCRIC(100);

      // Issue ticket to seller
      await matchTicketNFT.connect(organizer).issueTicket(
        seller.address,
        ticketId,
        2,
        "IPL Final - CSK vs MI",
        "Wankhede Stadium, Mumbai",
        "Grand Stand",
        "B-14",
        faceValue
      );

      // Approve marketplace
      await matchTicketNFT.connect(seller).approve(await marketplace.getAddress(), ticketId);

      // Case A: Attempting to list ticket at 130 CRIC (30% markup > 15% cap) -> REVERTS
      await expect(
        marketplace.connect(seller).listMatchTicket(
          await matchTicketNFT.getAddress(),
          ticketId,
          parseCRIC(130)
        )
      ).to.be.revertedWith("Marketplace: Scalping detected! Resale price exceeds 15% ceiling");

      // Case B: Listing ticket at 115 CRIC (exactly 15% markup) -> SUCCEEDS
      await expect(
        marketplace.connect(seller).listMatchTicket(
          await matchTicketNFT.getAddress(),
          ticketId,
          parseCRIC(115)
        )
      ).to.emit(marketplace, "ItemListed");
    });

    it("Should allow seller to cancel listing and retrieve escrowed asset", async function () {
      await marketplace.connect(seller).listPlayerCard(
        await playerCardNFT.getAddress(),
        cardId,
        1,
        cardPrice
      );

      expect(await playerCardNFT.balanceOf(seller.address, cardId)).to.equal(4n); // 5 - 1 in escrow

      await marketplace.connect(seller).cancelListing(1);

      expect(await playerCardNFT.balanceOf(seller.address, cardId)).to.equal(5n); // Returned from escrow
    });
  });
});

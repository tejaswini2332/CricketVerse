import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("CricketVerse on-chain community features", function () {
  it("records one vote per wallet on-chain and closes polls", async function () {
    const [owner, fan] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("CRIC");
    const token = await Token.deploy();
    const Polls = await ethers.getContractFactory("FanPolls");
    const polls = await Polls.deploy(await token.getAddress());
    await token.transfer(await polls.getAddress(), ethers.parseEther("100"));
    const block = await ethers.provider.getBlock("latest");
    const closesAt = block.timestamp + 3600;
    await polls.createPoll("Who wins?", ["Home", "Away"], closesAt);

    const fanBefore = await token.balanceOf(fan.address);
    await expect(polls.connect(fan).vote(1, 0)).to.emit(polls, "VoteCast").withArgs(1, fan.address, 0, ethers.parseEther("10"));
    expect(await token.balanceOf(fan.address)).to.equal(fanBefore + ethers.parseEther("10"));
    await expect(polls.connect(fan).vote(1, 1)).to.be.revertedWith("Poll: already voted");
    await expect(polls.connect(owner).vote(1, 2)).to.be.revertedWith("Poll: invalid option");
    const poll = await polls.getPoll(1);
    expect(poll.voteCounts.map(Number)).to.deep.equal([1, 0]);
    expect(Number(poll.totalVotes)).to.equal(1);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await expect(polls.connect(owner).vote(1, 0)).to.be.revertedWith("Poll: closed");
  });

  it("stores fixture start and end times with a ticket", async function () {
    const [owner, holder] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("MatchTicketNFT");
    const ticket = await Ticket.deploy();
    const block = await ethers.provider.getBlock("latest");
    const start = block.timestamp + 600;
    const end = start + 14400;
    await ticket.issueScheduledTicket(holder.address, 1001, 7001, "Demo fixture", "Arena", "North", "N-1", ethers.parseEther("80"), start, end);
    const window = await ticket.matchWindows(1001);
    expect(Number(window.startsAt)).to.equal(start);
    expect(Number(window.endsAt)).to.equal(end);
    await expect(ticket.redeemTicket(1001)).to.be.revertedWith("Match window: not active");
    await ethers.provider.send("evm_increaseTime", [601]);
    await ethers.provider.send("evm_mine", []);
    await ticket.redeemTicket(1001);
    await expect(ticket.redeemTicket(1001)).to.be.revertedWith("MatchTicketNFT: Ticket already redeemed (Double-Entry Blocked)");
    await expect(ticket.issueScheduledTicket(holder.address, 1002, 7002, "Bad fixture", "Arena", "North", "N-2", ethers.parseEther("80"), end, start))
      .to.be.revertedWith("Match window: invalid times");
  });

  it("verifies holder-signed dynamic QR entry passes and blocks replay", async function () {
    const [, holder] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("MatchTicketNFT");
    const ticket = await Ticket.deploy();
    const block = await ethers.provider.getBlock("latest");
    const start = block.timestamp - 60;
    const end = block.timestamp + 3600;
    await ticket.issueScheduledTicket(holder.address, 2001, 8001, "Live Derby", "Wankhede", "East", "E-12", ethers.parseEther("100"), start, end);

    const deadline = block.timestamp + 120;
    const challengeHash = await ticket.getEntryChallengeHash(2001, deadline);
    const sig = await holder.signMessage(ethers.getBytes(challengeHash));

    const preCheck = await ticket.verifyEntryPass(2001, deadline, sig);
    expect(preCheck.valid).to.be.true;
    expect(preCheck.holder).to.equal(holder.address);

    await expect(ticket.redeemTicketWithSignature(2001, deadline, sig))
      .to.emit(ticket, "EntryChallengeVerified");
    expect((await ticket.getTicket(2001)).isRedeemed).to.be.true;

    await expect(ticket.redeemTicketWithSignature(2001, deadline, sig))
      .to.be.revertedWith("MatchTicketNFT: Ticket already redeemed (Double-Entry Blocked)");
  });

  it("rejects expired QR screenshots and forged non-owner signatures", async function () {
    const [, holder, attacker] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("MatchTicketNFT");
    const ticket = await Ticket.deploy();
    const block = await ethers.provider.getBlock("latest");
    await ticket.issueScheduledTicket(holder.address, 2002, 8002, "Live Cup", "Eden", "Club", "C-1", ethers.parseEther("120"), block.timestamp - 60, block.timestamp + 3600);

    // Forged signature from attacker
    const validDeadline = block.timestamp + 120;
    const hash = await ticket.getEntryChallengeHash(2002, validDeadline);
    const forgedSig = await attacker.signMessage(ethers.getBytes(hash));
    const checkForged = await ticket.verifyEntryPass(2002, validDeadline, forgedSig);
    expect(checkForged.valid).to.be.false;
    await expect(ticket.redeemTicketWithSignature(2002, validDeadline, forgedSig))
      .to.be.revertedWith("MatchTicketNFT: Invalid holder signature");

    // Valid signature that expires
    const realSig = await holder.signMessage(ethers.getBytes(hash));
    await ethers.provider.send("evm_increaseTime", [125]);
    await ethers.provider.send("evm_mine", []);
    const checkExpired = await ticket.verifyEntryPass(2002, validDeadline, realSig);
    expect(checkExpired.valid).to.be.false;
    await expect(ticket.redeemTicketWithSignature(2002, validDeadline, realSig))
      .to.be.revertedWith("MatchTicketNFT: Entry QR pass expired");
  });

  it("rotates nonce on transfer to invalidate old QRs and blocks transfer of redeemed tickets", async function () {
    const [, seller, buyer] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("MatchTicketNFT");
    const ticket = await Ticket.deploy();
    const block = await ethers.provider.getBlock("latest");
    await ticket.issueScheduledTicket(seller.address, 2003, 8003, "Live Semi", "Chinnaswamy", "VIP", "V-9", ethers.parseEther("150"), block.timestamp - 60, block.timestamp + 3600);

    // Seller generates a QR before selling
    const deadline = block.timestamp + 300;
    const oldHash = await ticket.getEntryChallengeHash(2003, deadline);
    const oldSellerSig = await seller.signMessage(ethers.getBytes(oldHash));

    // Seller transfers ticket to buyer -> nonce increments
    await ticket.connect(seller).transferFrom(seller.address, buyer.address, 2003);
    expect(Number(await ticket.ticketNonces(2003))).to.equal(1);

    // Seller's old QR signature is now invalid on-chain
    await expect(ticket.redeemTicketWithSignature(2003, deadline, oldSellerSig))
      .to.be.revertedWith("MatchTicketNFT: Invalid holder signature");

    // Buyer signs fresh QR and redeems at turnstile
    const newHash = await ticket.getEntryChallengeHash(2003, deadline);
    const buyerSig = await buyer.signMessage(ethers.getBytes(newHash));
    await ticket.redeemTicketWithSignature(2003, deadline, buyerSig);

    // Redeemed ticket becomes non-transferable (blocks reselling used passes)
    await expect(ticket.connect(buyer).transferFrom(buyer.address, seller.address, 2003))
      .to.be.revertedWith("MatchTicketNFT: Redeemed ticket is non-transferable");
  });

  it("blocks transferring expired passes after match window ends", async function () {
    const [, seller, buyer] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("MatchTicketNFT");
    const ticket = await Ticket.deploy();
    const block = await ethers.provider.getBlock("latest");
    await ticket.issueScheduledTicket(seller.address, 2004, 8004, "Short Match", "Chepauk", "A", "A-1", ethers.parseEther("50"), block.timestamp - 60, block.timestamp + 60);

    await ethers.provider.send("evm_increaseTime", [65]);
    await ethers.provider.send("evm_mine", []);
    await expect(ticket.connect(seller).transferFrom(seller.address, buyer.address, 2004))
      .to.be.revertedWith("MatchTicketNFT: Expired ticket cannot be transferred");
  });

  it("supports delegated device gate signers and revokes them automatically on transfer", async function () {
    const [, seller, buyer, deviceKey] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("MatchTicketNFT");
    const ticket = await Ticket.deploy();
    const block = await ethers.provider.getBlock("latest");
    await ticket.issueScheduledTicket(seller.address, 2005, 8005, "Live Final", "Wankhede", "North", "N-5", ethers.parseEther("100"), block.timestamp - 60, block.timestamp + 3600);

    await ticket.connect(seller).setGateSigner(2005, deviceKey.address);
    const deadline = block.timestamp + 300;
    const hash = await ticket.getEntryChallengeHash(2005, deadline);
    const sig = await deviceKey.signMessage(ethers.getBytes(hash));
    expect((await ticket.verifyEntryPass(2005, deadline, sig)).valid).to.be.true;

    // Transfer clears authorizedGateSigner automatically
    await ticket.connect(seller).transferFrom(seller.address, buyer.address, 2005);
    expect(await ticket.authorizedGateSigner(2005)).to.equal(ethers.ZeroAddress);
    await expect(ticket.redeemTicketWithSignature(2005, deadline, sig))
      .to.be.revertedWith("MatchTicketNFT: Invalid holder signature");
  });
});

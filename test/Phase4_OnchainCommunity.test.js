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
});

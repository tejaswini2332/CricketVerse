import hardhat from "hardhat";
import fs from "fs";

const { ethers } = hardhat;

async function main() {
  const targetAddress = "0x4C349eBf4E712eA69f04C4F49bC15c6182d9aC37";
  console.log("Funding user wallet on local blockchain:", targetAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Send 100 ETH for gas
  const txEth = await deployer.sendTransaction({
    to: targetAddress,
    value: ethers.parseEther("100"),
  });
  await txEth.wait();
  console.log("Sent 100 ETH to user wallet. Tx hash:", txEth.hash);

  // Send 100,000 CRIC tokens
  const config = JSON.parse(fs.readFileSync("./public/contracts-config.json", "utf8"));
  const cricAddress = config.contracts.CRIC;
  const CRIC = await ethers.getContractAt("CRIC", cricAddress);

  const txCric = await CRIC.transfer(targetAddress, ethers.parseEther("100000"));
  await txCric.wait();
  console.log("Transferred 100,000 CRIC tokens to user wallet. Tx hash:", txCric.hash);

  const ethBal = await ethers.provider.getBalance(targetAddress);
  const cricBal = await CRIC.balanceOf(targetAddress);

  console.log("User ETH balance:", ethers.formatEther(ethBal));
  console.log("User CRIC balance:", ethers.formatEther(cricBal));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

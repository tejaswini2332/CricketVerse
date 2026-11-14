import { JsonRpcProvider, Interface, formatEther } from "ethers";
import fs from "fs";

async function main() {
  const targetAddress = "0x4C349eBf4E712eA69f04C4F49bC15c6182d9aC37";
  const deployerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const provider = new JsonRpcProvider("http://127.0.0.1:8545");

  const config = JSON.parse(fs.readFileSync("./public/contracts-config.json", "utf8"));
  const cricAddress = config.contracts.CRIC;

  await provider.send("hardhat_impersonateAccount", [targetAddress]);

  const iface = new Interface([
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function lastFaucetClaim(address) view returns (uint256)",
  ]);

  const balHex = await provider.call({
    to: cricAddress,
    data: iface.encodeFunctionData("balanceOf", [targetAddress]),
  });
  const currentCric = BigInt(balHex);

  if (currentCric > 0n) {
    const txHash = await provider.send("eth_sendTransaction", [
      {
        from: targetAddress,
        to: cricAddress,
        data: iface.encodeFunctionData("transfer", [deployerAddress, currentCric]),
      },
    ]);
    console.log("Cleared CRIC tx:", txHash);
  }

  // Advance EVM block time past CRIC faucet 1-hour cooldown if the user previously claimed in this node session
  const lastClaimHex = await provider.call({
    to: cricAddress,
    data: iface.encodeFunctionData("lastFaucetClaim", [targetAddress]),
  });
  const lastClaim = BigInt(lastClaimHex);
  const latestBlock = await provider.getBlock("latest");
  const nowTs = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));
  if (lastClaim > 0n && nowTs < lastClaim + 3600n) {
    const jumpSeconds = Number(lastClaim + 3601n - nowTs);
    await provider.send("evm_increaseTime", [jumpSeconds]);
    await provider.send("evm_mine", []);
    console.log(`Advanced local EVM clock by ${jumpSeconds}s to unlock CRIC faucet claim.`);
  }

  // Set user ETH balance to 0.5 ETH so they have initial gas to sign transactions, and can claim 20 Demo ETH
  await provider.send("hardhat_setBalance", [
    targetAddress,
    "0x6F05B59D3B20000", // 0.5 ETH
  ]);

  await provider.send("hardhat_stopImpersonatingAccount", [targetAddress]);

  const finalCricHex = await provider.call({
    to: cricAddress,
    data: iface.encodeFunctionData("balanceOf", [targetAddress]),
  });
  console.log("ETH Balance:", formatEther(await provider.getBalance(targetAddress)));
  console.log("CRIC Balance:", formatEther(BigInt(finalCricHex)));
  console.log("Ready to start over! Refresh the browser to see 'Claim 50,000 CRIC' and 'Get 20 demo ETH'.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

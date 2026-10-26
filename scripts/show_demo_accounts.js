import { HDNodeWallet } from "ethers";

const phrase = process.env.LOCAL_MNEMONIC || "test test test test test test test test test test test junk";
for (let index = 0; index < 7; index++) {
  const wallet = HDNodeWallet.fromPhrase(phrase, undefined, `m/44'/60'/0'/0/${index}`);
  console.log(`Account ${index}: ${wallet.address}  Private key: ${wallet.privateKey}`);
}
console.warn("These are local Hardhat development keys only. Never use them on a public network or with real funds.");

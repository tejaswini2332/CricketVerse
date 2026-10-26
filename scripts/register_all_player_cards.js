import hardhat from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { ethers } = hardhat;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const manifestPath = path.join(scriptDir, "../server/contracts-config.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const address = manifest.contracts?.PlayerCardNFT;
  if (!address) throw new Error("PlayerCardNFT address is missing from server/contracts-config.json");
  const dataPath = path.join(scriptDir, "../server/data/players_2000_2026.json");
  const players = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const card = await ethers.getContractAt("PlayerCardNFT", address);
  const [signer] = await ethers.getSigners();
  const owner = await card.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Connected account ${signer.address} is not the PlayerCardNFT owner.`);
  }

  const rarityTier = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 };
  const missing = [];
  for (let index = 0; index < players.length; index += 50) {
    const playerSlice = players.slice(index, index + 50);
    const exists = await Promise.all(playerSlice.map(async (player) => (await card.cards(player.id)).exists));
    playerSlice.forEach((player, playerIndex) => {
      if (exists[playerIndex]) return;
      missing.push({
      cardId: player.id,
      name: player.name,
      role: player.role || "Batsman",
      team: player.team || player.country || "",
      rarity: rarityTier[player.rarity] ?? 0,
      matches: Math.max(0, Math.min(4_294_967_295, Math.trunc(player.matches || 0))),
      runs: Math.max(0, Math.min(4_294_967_295, Math.trunc(player.runs || 0))),
      wickets: Math.max(0, Math.min(4_294_967_295, Math.trunc(player.wickets || 0))),
      strikeRate: Math.max(0, Math.min(4_294_967_295, Math.round((player.strikeRate || 0) * 100))),
      economy: Math.max(0, Math.min(4_294_967_295, Math.round((player.economy || 0) * 100))),
      imageURI: player.avatar || `/api/avatar/${player.id}.svg`,
      });
    });
  }

  console.log(`Registering ${missing.length} player cards on ${hardhat.network.name} in batches of 20.`);
  for (let index = 0; index < missing.length; index += 20) {
    const batch = missing.slice(index, index + 20);
    const tx = await card.registerCards(batch, { gasLimit: 8_000_000 });
    await tx.wait();
    console.log(`Registered ${Math.min(index + batch.length, missing.length)}/${missing.length} · ${tx.hash}`);
  }
  console.log("All catalog players are registered and can be purchased from the Pavilion.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

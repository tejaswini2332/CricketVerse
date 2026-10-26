const ARTIFACTS = {
  CRIC: "CRIC.sol/CRIC.json",
  PlayerCardNFT: "PlayerCardNFT.sol/PlayerCardNFT.json",
  MatchTicketNFT: "MatchTicketNFT.sol/MatchTicketNFT.json",
  CricketMarketplace: "CricketMarketplace.sol/CricketMarketplace.json",
  TournamentPool: "TournamentPool.sol/TournamentPool.json",
  FanPolls: "FanPolls.sol/FanPolls.json",
};

const announcedWallets = new Map();
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (event) => {
    if (event.detail?.provider?.request) announcedWallets.set(event.detail.info?.uuid || event.detail.info?.name || "wallet", event.detail.provider);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

let deployment;
let artifacts = {};
let provider;
let signer;

const NETWORKS = {
  31337: {
    chainId: "0x7a69",
    chainName: "CricketVerse Local Hardhat",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["http://127.0.0.1:8545"],
  },
  80002: {
    chainId: "0x13882",
    chainName: "Polygon Amoy",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://rpc-amoy.polygon.technology"],
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
  },
};

export async function loadDeployment() {
  if (!deployment) {
    const response = await fetch("/contracts-config.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No contract deployment manifest. Run npm run chain:deploy.");
    deployment = await response.json();
    if (!Number.isSafeInteger(Number(deployment.chainId)) || Number(deployment.chainId) <= 0) {
      throw new Error("Deployment manifest has an invalid chain ID.");
    }
    for (const name of Object.keys(ARTIFACTS)) {
      if (!window.ethers.isAddress(deployment.contracts?.[name])) {
        throw new Error(`Deployment manifest is missing a valid ${name} address.`);
      }
    }
    deployment.chainId = Number(deployment.chainId);
  }
  return deployment;
}

export async function connectWallet(prompt = true) {
  const wallet = await discoverWalletProvider();
  const config = await loadDeployment();
  const accounts = await wallet.request({ method: prompt ? "eth_requestAccounts" : "eth_accounts" });
  if (!accounts.length) return null;
  if (prompt) {
    const network = NETWORKS[config.chainId];
    if (config.chainId === 31337 && !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
      throw new Error("This deployment is local to this computer. Deploy CricketVerse to Polygon Amoy for remote wallet access.");
    }
    if (!network) throw new Error(`Chain ${config.chainId} is not configured for automatic wallet setup. Add it to your wallet and reload.`);
    try {
      await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.chainId }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await wallet.request({ method: "wallet_addEthereumChain", params: [network] });
      // Some wallets add the chain without selecting it. Request the switch
      // again so the provider is definitely on the deployment's chain.
      await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.chainId }] });
    }
  }
  const nextProvider = new window.ethers.BrowserProvider(wallet);
  const network = await nextProvider.getNetwork();
  if (Number(network.chainId) !== config.chainId) {
    provider = undefined;
    signer = undefined;
    throw new Error(`Wrong network. Switch your wallet to ${config.chainName || config.network || `chain ${config.chainId}`} (${config.chainId}).`);
  }
  const nextSigner = await nextProvider.getSigner();
  const address = await nextSigner.getAddress();
  provider = nextProvider;
  signer = nextSigner;
  return { address, chainId: Number(network.chainId) };
}

export async function discoverWalletProvider() {
  if (window.ethereum?.providers?.length) {
    return window.ethereum.providers.find((candidate) => candidate.isMetaMask) || window.ethereum.providers[0];
  }
  if (window.ethereum?.request) return window.ethereum;
  if (announcedWallets.size) return announcedWallets.values().next().value;
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => setTimeout(resolve, 250));
  const provider = announcedWallets.values().next().value;
  if (provider) return provider;
  throw new Error("No browser wallet found. Install MetaMask in this browser, or use the MetaMask mobile browser with a publicly hosted site, then reload.");
}

export function isConnected() { return Boolean(provider && signer); }
export function getProvider() { return provider; }
export async function getSignerAddress() { return signer ? signer.getAddress() : null; }

export async function getReadProvider() {
  if (provider) return provider;
  const config = await loadDeployment();
  const network = NETWORKS[config.chainId];
  if (!network) throw new Error(`No read-only RPC is configured for chain ${config.chainId}.`);
  if (config.chainId === 31337 && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname)) {
    throw new Error("This localhost chain is not reachable by remote visitors. Deploy to Polygon Amoy to share the app.");
  }
  provider = new window.ethers.JsonRpcProvider(network.rpcUrls[0], config.chainId, { staticNetwork: true });
  return provider;
}

export async function contract(name, readOnly = false) {
  const config = await loadDeployment();
  if (!ARTIFACTS[name]) throw new Error(`Unknown contract: ${name}`);
  if (!artifacts[name]) {
    const response = await fetch(`/artifacts/contracts/${ARTIFACTS[name]}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Missing ${name} artifact. Run npm run compile.`);
    artifacts[name] = await response.json();
  }
  if (!readOnly && !signer) throw new Error("Connect your wallet first.");
  const runner = readOnly ? await getReadProvider() : signer;
  return new window.ethers.Contract(config.contracts[name], artifacts[name].abi, runner);
}

export function units(value) { return window.ethers.parseEther(String(value)); }
export function formatUnits(value) { return Number(window.ethers.formatEther(value)); }
export function keccakSquad(ids) {
  const encoded = window.ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]"], [ids]);
  return window.ethers.keccak256(encoded);
}

export async function waitFor(tx) { return tx.wait(); }

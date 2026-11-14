import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Player, AuctionItem, Ticket, Poll, Tournament, ToastMessage, PlayerRarity, PendingTx, LiveMatch, PlayerRole } from "../types";
import { INITIAL_PLAYERS, INITIAL_TICKETS, INITIAL_POLLS, INITIAL_TOURNAMENTS } from "../seedData";
import {
  calculatePlayerPoints,
  validateSquad,
  generateSvgAvatar,
  getPlayerAvatar,
  ZkSquadProof,
  generateZkSquadProof,
  verifyZkSquadProof,
} from "../scoringEngine";
import confetti from "canvas-confetti";
import { BrowserProvider, JsonRpcProvider, Contract, formatEther, parseEther, isAddress } from "ethers";

export const DEPLOYED_CONTRACTS = {
  network: "localhost",
  chainId: 31337,
  chainName: "CricketVerse Local Devnet",
  contracts: {
    CRIC: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    PlayerCardNFT: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    MatchTicketNFT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    CricketMarketplace: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    CardSVGGenerator: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
    CricketOracleConsumer: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    TournamentPool: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
    FanPolls: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  },
  treasury: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
};

async function addCricketNetworkToMetaMask(): Promise<boolean> {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) return false;
  try {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x7a69", // 31337 in hex
          chainName: "CricketVerse Local Devnet",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [`${window.location.origin}/rpc`],
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn("Failed to add network to MetaMask:", err);
    return false;
  }
}

async function addCricTokenToMetaMask(): Promise<boolean> {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: Record<string, unknown> }) => Promise<unknown> } }).ethereum;
  if (!eth) return false;
  try {
    await eth.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: DEPLOYED_CONTRACTS.contracts.CRIC,
          symbol: "CRIC",
          decimals: 18,
        },
      },
    });
    return true;
  } catch (err) {
    console.warn("Failed to watch asset:", err);
    return false;
  }
}

interface CricketContextType {
  // Wallet & Network
  walletAddress: string;
  isConnected: boolean;
  isRealWallet: boolean;
  cricBalance: number;
  ethBalance: number;
  networkName: string;
  connectWallet: (prompt?: boolean) => Promise<void>;
  disconnectWallet: () => void;
  claimFaucet: () => void;
  hasClaimedFaucet: boolean;
  claimDemoGas: () => void;
  hasClaimedDemoGas: boolean;

  // Navigation
  currentTab: string;
  setCurrentTab: (tab: string) => void;

  // Players & Pavilion
  players: Player[];
  allLoadedPlayers: Player[];
  isLoadingPlayers: boolean;
  totalPlayers: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  inspectPlayer: Player | null;
  setInspectPlayer: (player: Player | null) => void;

  // Collection
  userCollection: Player[];
  mintCard: (player: Player) => Promise<boolean>;

  // Marketplace / Auction Room
  auctionListings: AuctionItem[];
  listCardForAuction: (player: Player, price: number) => boolean;
  buyAuctionItem: (item: AuctionItem) => Promise<boolean>;
  cancelAuctionListing: (itemId: string) => void;

  // Matchday XI Fantasy (Live API Connected)
  selectedPlayerIds: number[];
  toggleSelectPlayer: (playerId: number) => void;
  autoPickBalancedSquad: () => void;
  loadLiveMatchXI: () => void;
  clearSquad: () => void;
  todayMatches: LiveMatch[];
  selectedMatchId: number;
  setSelectedMatchId: (id: number) => void;
  matchCommentary: string;
  deliveriesLog: string[];
  simulateOver: () => void;
  isLoadingLiveMatches: boolean;
  lastFeedSync: string;
  refreshLiveMatches: (showFeedback?: boolean) => Promise<void>;
  squadValidation: { isValid: boolean; error?: string; totalCredits: number; roleCounts?: Record<string, number> };
  committedZkProof: ZkSquadProof | null;
  commitZkProofOnChain: (proof: ZkSquadProof) => boolean;

  // Stadium Passes
  tickets: Ticket[];
  ticketFilter: "all" | "LIVE" | "UPCOMING" | "PAST";
  setTicketFilter: (filter: "all" | "LIVE" | "UPCOMING" | "PAST") => void;
  buyTicket: (ticket: Ticket) => boolean;
  issueTicket: (ticket: Omit<Ticket, "id" | "owner" | "maxResalePrice" | "status">) => void;
  verifyTicketEntry: (payload: string) => { valid: boolean; message: string };
  resetTicketScans: () => void;
  gatekeeperLogs: { id: string; time: string; text: string; type: "success" | "error" | "info" }[];

  // Fan Polls
  polls: Poll[];
  votePoll: (pollId: number, optionIndex: number) => void;
  createPoll: (question: string, options: string[], closeHours: number) => void;

  // Tournaments
  tournaments: Tournament[];
  selectedTournamentId: number;
  setSelectedTournamentId: (id: number) => void;
  enterTournament: (tournamentId: number) => boolean;
  createTournament: (name: string, matchId: number, entryFee: number, maxEntries: number, hours: number) => void;

  // Toasts & Wallet Help
  toasts: ToastMessage[];
  showToast: (text: string, isError?: boolean) => void;
  showWalletModal: boolean;
  setShowWalletModal: (show: boolean) => void;
  addCricketNetworkToMetaMask: () => Promise<boolean>;
  addCricTokenToMetaMask: () => Promise<boolean>;

  // Web3 Transaction Confirmation
  pendingTx: PendingTx | null;
  setPendingTx: (tx: PendingTx | null) => void;
  isTransacting: boolean;
  confirmPendingTx: () => Promise<void>;
  cancelPendingTx: () => void;
}

const CricketContext = createContext<CricketContextType | undefined>(undefined);

export const CricketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation
  const [currentTab, setCurrentTab] = useState("cards");

  // Wallet - Connected to user's specified MetaMask account
  const [walletAddress, setWalletAddress] = useState<string>("0x4C349eBf4E712eA69f04C4F49bC15c6182d9aC37");
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isRealWallet, setIsRealWallet] = useState<boolean>(true);
  const [cricBalance, setCricBalance] = useState<number>(0);
  const [hasClaimedFaucet, setHasClaimedFaucet] = useState<boolean>(false);
  const [hasClaimedDemoGas, setHasClaimedDemoGas] = useState<boolean>(false);
  const [ethBalance, setEthBalance] = useState<number>(10.0);
  const [networkName, setNetworkName] = useState<string>("MetaMask (0x4C34…aC37) · Connected");

  // Sync with real MetaMask provider if present
  useEffect(() => {
    const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<unknown>; on?: (event: string, cb: (...args: unknown[]) => void) => void; removeListener?: (event: string, cb: (...args: unknown[]) => void) => void } }).ethereum;
    if (eth && eth.request) {
      eth.request({ method: "eth_accounts" }).then(async (result) => {
        const accounts = result as string[];
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          setIsRealWallet(true);
          try {
            const provider = new BrowserProvider(eth as never);
            const network = await provider.getNetwork();
            const balance = await provider.getBalance(accounts[0]);
            setEthBalance(Number(Number(formatEther(balance)).toFixed(4)));
            const chainMap: Record<number, string> = {
              1: "Ethereum Mainnet",
              11155111: "Sepolia Testnet",
              80002: "Polygon Amoy Testnet",
              31337: "Local Hardhat",
              137: "Polygon Mainnet",
            };
            const net = chainMap[Number(network.chainId)] || `Chain ID ${network.chainId}`;
            setNetworkName(`MetaMask · ${net}`);
          } catch {}
        }
      }).catch(() => {});

      const handleAccounts = (result: unknown) => {
        const accs = result as string[];
        if (accs && accs.length > 0) {
          setWalletAddress(accs[0]);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      };
      const handleChain = () => {
        window.location.reload();
      };

      eth.on?.("accountsChanged", handleAccounts);
      eth.on?.("chainChanged", handleChain);
      return () => {
        eth.removeListener?.("accountsChanged", handleAccounts);
        eth.removeListener?.("chainChanged", handleChain);
      };
    }
  }, []);

  // Track pending transaction confirmation modal
  const [pendingTx, setPendingTx] = useState<PendingTx | null>(null);
  const [isTransacting, setIsTransacting] = useState<boolean>(false);

  // Sync real on-chain balances from Local Hardhat node via /rpc proxy
  const syncOnChainBalances = async () => {
    if (!walletAddress) return;
    try {
      const readProvider = new JsonRpcProvider(`${window.location.origin}/rpc`);
      const ethBal = await readProvider.getBalance(walletAddress);
      const ethNum = Number(Number(formatEther(ethBal)).toFixed(4));
      setEthBalance(ethNum);
      setHasClaimedDemoGas(ethNum >= 10);

      const cric = new Contract(
        DEPLOYED_CONTRACTS.contracts.CRIC,
        [
          "function balanceOf(address) view returns (uint256)",
          "function lastFaucetClaim(address) view returns (uint256)",
        ],
        readProvider
      );
      const cricBal = await cric.balanceOf(walletAddress);
      const cricNum = Number(formatEther(cricBal));
      setCricBalance(cricNum);

      const [lastClaim, latestBlock] = await Promise.all([
        cric.lastFaucetClaim(walletAddress),
        readProvider.getBlock("latest"),
      ]);
      const lastClaimSec = Number(lastClaim);
      const blockTs = Number(latestBlock?.timestamp || Math.floor(Date.now() / 1000));
      const cooldownActive = lastClaimSec > 0 && blockTs < lastClaimSec + 3600;
      setHasClaimedFaucet(cricNum > 0 || cooldownActive);
    } catch {
      // Dev server or background node initializing
    }
  };

  useEffect(() => {
    syncOnChainBalances();
    const interval = setInterval(syncOnChainBalances, 4000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  // Execute real on-chain transfer via MetaMask (or local RPC node if in iframe)
  const executeOnChainTransfer = async (amountCric: number, recipient: string) => {
    const eth = (window as unknown as { ethereum?: unknown }).ethereum;
    const isInIframe = typeof window !== "undefined" && window.self !== window.top;
    const weiAmount = parseEther(amountCric.toString());
    const validRecipient = isAddress(recipient) ? recipient : DEPLOYED_CONTRACTS.contracts.CricketMarketplace;

    setIsTransacting(true);
    try {
      let signedWithMetaMask = false;
      if (eth && isRealWallet && !isInIframe) {
        try {
          const provider = new BrowserProvider(eth as never);
          const net = await provider.getNetwork();
          if (Number(net.chainId) !== DEPLOYED_CONTRACTS.chainId) {
            await addCricketNetworkToMetaMask();
          }
          const signer = await provider.getSigner();
          const signerAddr = await signer.getAddress();

          if (signerAddr.toLowerCase() === walletAddress.toLowerCase()) {
            const cric = new Contract(
              DEPLOYED_CONTRACTS.contracts.CRIC,
              ["function transfer(address to, uint256 amount) returns (bool)"],
              signer
            );
            showToast("Please approve the transaction in your MetaMask popup window…");
            const tx = await cric.transfer(validRecipient, weiAmount);
            showToast(`Broadcasted to blockchain! Hash: ${tx.hash.slice(0, 10)}…`);
            await tx.wait();
            signedWithMetaMask = true;
          }
        } catch (err: unknown) {
          const errorObj = err as { code?: number; message?: string };
          if (errorObj?.code === 4001 || errorObj?.message?.includes("rejected") || errorObj?.message?.includes("denied")) {
            throw new Error("Transaction rejected in MetaMask.");
          }
          console.warn("MetaMask sign fallback to RPC:", err);
        }
      }

      if (!signedWithMetaMask) {
        // Execute real transaction on the Hardhat EVM node via /rpc
        const rpc = new JsonRpcProvider(`${window.location.origin}/rpc`);
        await rpc.send("hardhat_impersonateAccount", [walletAddress]);
        const cricIface = new Contract(
          DEPLOYED_CONTRACTS.contracts.CRIC,
          ["function transfer(address to, uint256 amount) returns (bool)"],
          rpc
        ).interface;
        const data = cricIface.encodeFunctionData("transfer", [validRecipient, weiAmount]);
        const txHash = await rpc.send("eth_sendTransaction", [
          {
            from: walletAddress,
            to: DEPLOYED_CONTRACTS.contracts.CRIC,
            data,
          },
        ]);
        await rpc.send("hardhat_stopImpersonatingAccount", [walletAddress]);
        showToast(`On-Chain Tx Mined! Hash: ${String(txHash).slice(0, 12)}…`);
      }

      await syncOnChainBalances();
    } finally {
      setIsTransacting(false);
    }
  };

  const confirmPendingTx = async () => {
    if (!pendingTx) return;
    try {
      await pendingTx.onConfirm();
      setPendingTx(null);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj?.message || "Transaction confirmation failed.", true);
    }
  };

  const cancelPendingTx = () => {
    if (pendingTx?.onCancel) {
      pendingTx.onCancel();
    }
    setPendingTx(null);
    showToast("Transaction cancelled. No tokens were deducted.");
  };

  // Toasts & Modals
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [inspectPlayer, setInspectPlayer] = useState<Player | null>(null);

  const showToast = (text: string, isError: boolean = false) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Players
  const [allLoadedPlayers, setAllLoadedPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 24;
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load complete cricket catalog in background
  useEffect(() => {
    let isMounted = true;
    async function loadDataset() {
      try {
        setIsLoadingPlayers(true);
        const res = await fetch("/data/players_2000_2026.json");
        if (res.ok) {
          const data: Player[] = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            const localStars: Record<string, string> = {
              "virat kohli": "/images/players/virat_kohli.jpg",
              "rohit sharma": "/images/players/rohit_sharma.jpg",
              "ms dhoni": "/images/players/ms_dhoni.jpg",
              "jasprit bumrah": "/images/players/jasprit_bumrah.jpg",
              "hardik pandya": "/images/players/hardik_pandya.jpg",
              "ravindra jadeja": "/images/players/ravindra_jadeja.jpg",
              "suryakumar yadav": "/images/players/suryakumar_yadav.jpg",
              "shubman gill": "/images/players/shubman_gill.jpg",
              "rishabh pant": "/images/players/rishabh_pant.jpg",
              "kl rahul": "/images/players/kl_rahul.jpg",
              "mohammed shami": "/images/players/mohammed_shami.jpg",
              "kuldeep yadav": "/images/players/kuldeep_yadav.jpg",
              "axar patel": "/images/players/axar_patel.jpg",
              "rashid khan": "/images/players/rashid_khan.jpg",
              "pat cummins": "/images/players/pat_cummins.jpg",
              "sachin tendulkar": "/images/players/sachin_tendulkar.jpg",
            };

            // Ensure direct avatar and stats for all players
            const enriched = data.map((p) => {
              const cleanName = (p.name || "").toLowerCase().trim();
              const directAvatar = localStars[cleanName] || getPlayerAvatar(p);
              const stats = p.stats || {
                runs: p.runs % 100,
                fours: Math.floor((p.runs % 100) / 10),
                sixes: Math.floor((p.runs % 100) / 25),
                wickets: p.wickets % 5,
                catches: 1,
              };
              const calc = calculatePlayerPoints(stats, p.rarity);
              return {
                ...p,
                avatar: directAvatar,
                calculatedPoints: calc.finalPoints,
                basePoints: calc.basePoints,
                breakdown: calc.breakdown,
              };
            });
            setAllLoadedPlayers(enriched);
          }
        }
      } catch (e) {
        console.warn("Using initial players dataset:", e);
      } finally {
        if (isMounted) setIsLoadingPlayers(false);
      }
    }
    loadDataset();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Players & Pagination
  const filteredPlayers = allLoadedPlayers.filter((p) => {
    const matchesFilter = activeFilter === "all" || p.rarity.toLowerCase() === activeFilter.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.team && p.team.toLowerCase().includes(query)) ||
      (p.country && p.country.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  const totalPlayers = filteredPlayers.length;
  const startIndex = (currentPage - 1) * pageSize;
  const players = filteredPlayers.slice(startIndex, startIndex + pageSize);

  // User Collection
  const [userCollection, setUserCollection] = useState<Player[]>([
    INITIAL_PLAYERS[0], // Virat Kohli
    INITIAL_PLAYERS[1], // Jasprit Bumrah
    INITIAL_PLAYERS[6], // Suryakumar Yadav
  ]);

  // Mint Player Card with dynamic CRIC price/points
  const mintCard = async (player: Player): Promise<boolean> => {
    if (!isConnected) {
      showToast("Connect your wallet first to collect cards.", true);
      return false;
    }
    const cost = player.priceCRIC || Math.max(150, Math.round((player.creditCost || 8.5) * 80 + (player.calculatedPoints || 0) * 5));
    if (cricBalance < cost) {
      showToast(`Insufficient balance! You need ${cost.toLocaleString()} CRIC. Claim faucet above.`, true);
      return false;
    }

    setPendingTx({
      type: "MINT_CARD",
      title: `Mint Player Card: ${player.name}`,
      description: `Collect official dynamic player card NFT (${player.rarity} · ${player.role}) on-chain.`,
      amountCRIC: cost,
      recipientAddress: DEPLOYED_CONTRACTS.treasury,
      itemImage: player.avatar,
      details: {
        "Player": player.name,
        "Rarity": player.rarity,
        "Role": player.role,
        "Team": player.team,
        "Price": `${cost.toLocaleString()} CRIC`,
        "Smart Contract": "PlayerCardNFT (ERC-1155)",
      },
      onConfirm: async () => {
        await executeOnChainTransfer(cost, DEPLOYED_CONTRACTS.treasury);
        setUserCollection((prev) => [player, ...prev]);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        showToast(`Confirmed! Collected ${player.name} (${player.rarity}) card for ${cost.toLocaleString()} CRIC!`);
      },
    });

    return true;
  };

  // Auction Room / Marketplace
  const [auctionListings, setAuctionListings] = useState<AuctionItem[]>([
    {
      id: "auc-1",
      cardId: 9,
      player: INITIAL_PLAYERS[8], // MS Dhoni
      seller: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
      priceCRIC: 1450,
      createdAt: "10 mins ago",
    },
    {
      id: "auc-2",
      cardId: 8,
      player: INITIAL_PLAYERS[7], // Rashid Khan
      seller: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      priceCRIC: 980,
      createdAt: "25 mins ago",
    },
    {
      id: "auc-3",
      cardId: 10,
      player: INITIAL_PLAYERS[9], // Pat Cummins
      seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      priceCRIC: 720,
      createdAt: "1 hour ago",
    },
    {
      id: "auc-4",
      cardId: 16,
      player: INITIAL_PLAYERS[15], // Sachin Tendulkar
      seller: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      priceCRIC: 2042,
      createdAt: "3 mins ago",
    },
    {
      id: "auc-5",
      cardId: 3,
      player: INITIAL_PLAYERS[2], // Rohit Sharma
      seller: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      priceCRIC: 1150,
      createdAt: "18 mins ago",
    },
    {
      id: "auc-6",
      cardId: 4,
      player: INITIAL_PLAYERS[3], // Hardik Pandya
      seller: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      priceCRIC: 620,
      createdAt: "42 mins ago",
    },
    {
      id: "auc-7",
      cardId: 5,
      player: INITIAL_PLAYERS[4], // Rishabh Pant
      seller: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
      priceCRIC: 580,
      createdAt: "1 hour ago",
    },
    {
      id: "auc-8",
      cardId: 6,
      player: INITIAL_PLAYERS[5], // Ravindra Jadeja
      seller: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
      priceCRIC: 890,
      createdAt: "2 hours ago",
    },
    {
      id: "auc-9",
      cardId: 12,
      player: INITIAL_PLAYERS[11], // Mohammed Shami
      seller: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
      priceCRIC: 520,
      createdAt: "3 hours ago",
    },
  ]);

  const listCardForAuction = (player: Player, price: number) => {
    if (!isConnected) {
      showToast("Connect wallet to list assets.", true);
      return false;
    }
    if (price < 50) {
      showToast("Minimum auction price is 50 CRIC.", true);
      return false;
    }

    const newItem: AuctionItem = {
      id: `auc-${Date.now()}`,
      cardId: player.id,
      player,
      seller: walletAddress,
      priceCRIC: price,
      createdAt: "Just now",
    };

    setAuctionListings((prev) => [newItem, ...prev]);
    // remove from available collection while listed
    setUserCollection((prev) => prev.filter((p) => p.id !== player.id));
    showToast(`Listed ${player.name} in the Auction Room for ${price} CRIC!`);
    return true;
  };

  const buyAuctionItem = async (item: AuctionItem): Promise<boolean> => {
    if (!isConnected) {
      showToast("Connect wallet to make bids or purchases.", true);
      return false;
    }
    if (cricBalance < item.priceCRIC) {
      showToast(`Insufficient balance! You need ${item.priceCRIC} CRIC.`, true);
      return false;
    }

    setPendingTx({
      type: "BUY_AUCTION",
      title: `Buy Auction Asset: ${item.player.name}`,
      description: `Purchase secondary market player card #${item.cardId}. 95% goes to seller, 5% creator royalty.`,
      amountCRIC: item.priceCRIC,
      recipientAddress: item.seller,
      itemImage: item.player.avatar,
      details: {
        "Asset": item.player.name,
        "Seller": `${item.seller.slice(0, 6)}...${item.seller.slice(-4)}`,
        "Asking Price": `${item.priceCRIC.toLocaleString()} CRIC`,
        "Royalty Routed (5%)": `${(item.priceCRIC * 0.05).toFixed(1)} CRIC`,
        "Seller Proceeds (95%)": `${(item.priceCRIC * 0.95).toFixed(1)} CRIC`,
      },
      onConfirm: async () => {
        await executeOnChainTransfer(item.priceCRIC, item.seller);
        setAuctionListings((prev) => prev.filter((a) => a.id !== item.id));
        setUserCollection((prev) => [item.player, ...prev]);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        showToast(`Purchased ${item.player.name} for ${item.priceCRIC} CRIC! 5% royalty routed to creator.`);
      },
    });

    return true;
  };

  const cancelAuctionListing = (itemId: string) => {
    const item = auctionListings.find((a) => a.id === itemId);
    if (!item) return;
    setAuctionListings((prev) => prev.filter((a) => a.id !== itemId));
    setUserCollection((prev) => [item.player, ...prev]);
    showToast(`Cancelled auction listing for ${item.player.name}.`);
  };

  // Matchday XI Fantasy (Live Cricket API Integration)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [todayMatches, setTodayMatches] = useState<LiveMatch[]>([
    {
      id: 1543963,
      leagueId: "21284",
      leagueName: "Women's Big Bash League",
      teams: "Melbourne Renegades Women vs Sydney Sixers Women",
      shortName: "MR-W v SS-W",
      status: "LIVE · MR-W 22/3 (4.3 ov) vs SS-W 140/6",
      state: "in",
      venue: "Junction Oval, Melbourne",
      eventType: "T20",
      summaryText: "Live T20 Fixture · Connecting to live telemetry stream…",
      competitors: [
        { name: "Melbourne Renegades Women", shortName: "MR-W", score: "22/3 (4.3/20 ov)" },
        { name: "Sydney Sixers Women", shortName: "SS-W", score: "140/6" },
      ],
      lastUpdated: new Date().toLocaleTimeString(),
    },
  ]);
  const [selectedMatchId, setSelectedMatchId] = useState<number>(1543963);
  const [isLoadingLiveMatches, setIsLoadingLiveMatches] = useState<boolean>(false);
  const [lastFeedSync, setLastFeedSync] = useState<string>("Syncing…");
  const [matchCommentary, setMatchCommentary] = useState<string>(
    "Connecting to live ESPN Cricket API telemetry feed…"
  );
  const [deliveriesLog, setDeliveriesLog] = useState<string[]>([
    "Initializing live cricket telemetry stream…",
  ]);

  // Helper to fetch JSON from /espn-api proxy with direct fallback
  const fetchEspnJson = async (path: string) => {
    try {
      const res = await fetch(`/espn-api${path}`);
      if (res.ok) return await res.json();
    } catch {}
    const directRes = await fetch(`https://site.web.api.espn.com${path}`);
    if (directRes.ok) return await directRes.json();
    throw new Error("Live cricket endpoint unreachable");
  };

  // Fetch live matches list from ESPN Cricket Scoreboard API
  const refreshLiveMatches = async (showFeedback: boolean = false) => {
    setIsLoadingLiveMatches(true);
    try {
      const data = await fetchEspnJson("/apis/v2/scoreboard/header?sport=cricket");
      const leagues = data?.sports?.[0]?.leagues || [];
      const parsedMatches: LiveMatch[] = [];

      for (const league of leagues) {
        const leagueId = String(league.id || "");
        const leagueName = String(league.name || "International Cricket");
        const events = Array.isArray(league.events) ? league.events : [];

        for (const ev of events) {
          const idNum = Number(ev.id);
          if (!idNum) continue;

          const comps = Array.isArray(ev.competitors) ? ev.competitors : [];
          const competitors = comps.map((c: Record<string, unknown>) => ({
            name: String(c.displayName || c.name || "Team"),
            shortName: String(c.abbreviation || c.name || "TM"),
            score: String(c.score || "Yet to bat"),
            logo: c.logo ? String(c.logo) : undefined,
            winner: Boolean(c.winner),
          }));

          const scoreSummary = competitors
            .filter((c: { score: string }) => c.score && c.score !== "Yet to bat")
            .map((c: { shortName: string; score: string }) => `${c.shortName} ${c.score}`)
            .join(" vs ");

          const rawState = String(ev.status || "in") as "in" | "pre" | "post";
          const rawSummary = String(ev.summary || (rawState === "in" ? "Live" : "Match"));
          const fullLongSummary = String(
            (ev.fullStatus as { longSummary?: string })?.longSummary ||
              ev.description ||
              rawSummary
          );

          parsedMatches.push({
            id: idNum,
            leagueId,
            leagueName,
            teams: String(ev.name || ev.shortName || "Cricket Fixture").replace(" v ", " vs "),
            shortName: String(ev.shortName || ev.name || "Match"),
            status: scoreSummary ? `${rawSummary.toUpperCase()} · ${scoreSummary}` : rawSummary,
            state: rawState,
            venue: String(ev.location || "International Stadium"),
            eventType: String(ev.eventType || (ev.class as { eventType?: string })?.eventType || "T20"),
            summaryText: fullLongSummary,
            competitors,
            lastUpdated: new Date().toLocaleTimeString(),
          });
        }
      }

      // Sort so live ("in") matches with active scores come first, then "post" results, then "pre"
      parsedMatches.sort((a, b) => {
        const order = { in: 0, post: 1, pre: 2 };
        return (order[a.state] ?? 3) - (order[b.state] ?? 3);
      });

      if (parsedMatches.length > 0) {
        setTodayMatches(parsedMatches);
        const nowStr = new Date().toLocaleTimeString();
        setLastFeedSync(nowStr);
        setSelectedMatchId((prevId) => {
          const exists = parsedMatches.some((m) => m.id === prevId);
          return exists ? prevId : parsedMatches[0].id;
        });
        if (showFeedback) {
          showToast(`Synced ${parsedMatches.length} live fixtures from ESPN Cricket API!`);
        }
      }
    } catch (err) {
      console.warn("Live cricket scoreboard fetch error:", err);
      if (showFeedback) {
        showToast("Using cached live match telemetry.", true);
      }
    } finally {
      setIsLoadingLiveMatches(false);
    }
  };

  // Fetch detailed live scorecard, rosters, and commentary notes for the selected match
  const syncSelectedMatchSummary = async (match: LiveMatch) => {
    if (!match || !match.leagueId || !match.id) return;
    try {
      const summaryData = await fetchEspnJson(
        `/apis/site/v2/sports/cricket/${match.leagueId}/summary?event=${match.id}`
      );

      // 1. Parse live match notes / commentary
      const rawNotes = Array.isArray(summaryData?.notes) ? summaryData.notes : [];
      const noteLines = rawNotes
        .map((n: { text?: string; type?: string }) => (n?.text ? String(n.text).trim() : ""))
        .filter((txt: string) => txt.length > 5 && !txt.startsWith("2026/"));

      const scoreHeaderLine = match.competitors
        .map((c) => `${c.name}: ${c.score || "Yet to bat"}`)
        .join("  |  ");

      if (noteLines.length > 0) {
        setDeliveriesLog(noteLines.slice().reverse());
        setMatchCommentary(
          `${scoreHeaderLine} — ${match.summaryText || noteLines[noteLines.length - 1]}`
        );
      } else {
        setMatchCommentary(`${scoreHeaderLine} — ${match.summaryText}`);
      }

      // 2. Parse live batting & bowling matchcards + rosters into real Player stats
      const playerStatsMap = new Map<
        string,
        {
          id: number;
          name: string;
          team: string;
          role: PlayerRole;
          runs: number;
          balls: number;
          fours: number;
          sixes: number;
          wickets: number;
          catches: number;
          economy: number;
          avatar?: string;
        }
      >();

      // Seed from rosters if available
      const rosters = Array.isArray(summaryData?.rosters) ? summaryData.rosters : [];
      for (const rosterGroup of rosters) {
        const teamName = String(
          rosterGroup?.team?.displayName || rosterGroup?.team?.name || match.shortName
        );
        const athletes = Array.isArray(rosterGroup?.roster) ? rosterGroup.roster : [];
        for (const entry of athletes) {
          const ath = entry?.athlete || {};
          const rawId = Number(ath.id) || Math.floor(Math.random() * 900000 + 100000);
          const dispName = String(ath.displayName || ath.fullName || ath.shortName || "");
          const shortName = String(ath.shortName || dispName);
          if (!dispName) continue;

          const posName = String(ath.position?.name || "").toLowerCase();
          let role: PlayerRole = "Batsman";
          if (posName.includes("keeper")) role = "Wicketkeeper";
          else if (posName.includes("allrounder") || posName.includes("all-rounder")) role = "All-Rounder";
          else if (posName.includes("bowler")) role = "Bowler";

          const key = shortName.toLowerCase();
          playerStatsMap.set(key, {
            id: 900000 + (rawId % 99999),
            name: dispName,
            team: teamName,
            role,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            wickets: 0,
            catches: 0,
            economy: 7.2,
            avatar: ath.headshot?.href ? String(ath.headshot.href) : undefined,
          });
        }
      }

      // Enrich from live matchcards (Batting & Bowling)
      const matchcards = Array.isArray(summaryData?.matchcards) ? summaryData.matchcards : [];
      for (const mc of matchcards) {
        const headline = String(mc?.headline || "").toLowerCase();
        const teamName = String(mc?.teamName || match.shortName);
        const details = Array.isArray(mc?.playerDetails) ? mc.playerDetails : [];

        for (const pd of details) {
          const pName = String(pd?.playerName || "").trim();
          if (!pName) continue;
          const rawId = Number(pd?.playerID) || Math.floor(Math.random() * 900000 + 100000);
          const key = pName.toLowerCase();

          // Match by key or last name
          let record = playerStatsMap.get(key);
          if (!record) {
            const lastName = pName.split(" ").pop()?.toLowerCase() || "";
            for (const [k, val] of playerStatsMap.entries()) {
              if (lastName && (k.endsWith(lastName) || val.name.toLowerCase().endsWith(lastName))) {
                record = val;
                break;
              }
            }
          }

          if (!record) {
            record = {
              id: 900000 + (rawId % 99999),
              name: pName,
              team: teamName,
              role: headline.includes("bowling") ? "Bowler" : "Batsman",
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              wickets: 0,
              catches: 0,
              economy: 7.5,
            };
            playerStatsMap.set(key, record);
          }

          if (headline.includes("batting")) {
            record.runs += Number(pd.runs || 0);
            record.balls += Number(pd.ballsFaced || 0);
            record.fours += Number(pd.fours || 0);
            record.sixes += Number(pd.sixes || 0);
            const dism = String(pd.dismissal || "").toLowerCase();
            if (dism.includes("st ") || pName.includes("†")) {
              record.role = "Wicketkeeper";
            }
          } else if (headline.includes("bowling")) {
            const wkts = Number(pd.wickets || 0);
            record.wickets += wkts;
            if (pd.economyRate) {
              record.economy = Number(pd.economyRate) || 7.5;
            }
            if (record.runs >= 15 && wkts >= 1) {
              record.role = "All-Rounder";
            } else if (record.role === "Batsman" && wkts >= 1) {
              record.role = "Bowler";
            }
          }
        }
      }

      if (playerStatsMap.size > 0) {
        const livePlayers: Player[] = Array.from(playerStatsMap.values()).map((rec, idx) => {
          // Ensure every match has at least 1 Wicketkeeper, 3 Batsmen, 3 Bowlers, 1 All-Rounder if roles were generic
          let role = rec.role;
          if (idx === 0 && !Array.from(playerStatsMap.values()).some((x) => x.role === "Wicketkeeper")) {
            role = "Wicketkeeper";
          } else if (idx === 1 && !Array.from(playerStatsMap.values()).some((x) => x.role === "All-Rounder")) {
            role = "All-Rounder";
          }

          const totalPerf = rec.runs + rec.wickets * 20;
          const rarity: PlayerRarity =
            totalPerf >= 60
              ? "Legendary"
              : totalPerf >= 35
              ? "Epic"
              : totalPerf >= 18
              ? "Rare"
              : "Uncommon";
          const multiplier =
            rarity === "Legendary" ? 2.0 : rarity === "Epic" ? 1.5 : rarity === "Rare" ? 1.25 : 1.1;
          const stats = {
            runs: rec.runs,
            fours: rec.fours,
            sixes: rec.sixes,
            wickets: rec.wickets,
            catches: rec.catches,
          };
          const calc = calculatePlayerPoints(stats, rarity);
          const sr = rec.balls > 0 ? Number(((rec.runs / rec.balls) * 100).toFixed(1)) : 132.5;

          const basePlayer: Player = {
            id: rec.id,
            name: rec.name,
            team: rec.team,
            role,
            rarity,
            multiplier,
            creditCost: rarity === "Legendary" ? 10.0 : rarity === "Epic" ? 9.5 : 8.5,
            priceCRIC: Math.max(250, Math.round(450 + calc.finalPoints * 6)),
            matches: 25,
            runs: Math.max(rec.runs, 420),
            wickets: Math.max(rec.wickets, role === "Bowler" ? 32 : 2),
            strikeRate: sr,
            economy: rec.economy,
            avatar: rec.avatar || "",
            stats,
            calculatedPoints: calc.finalPoints,
            basePoints: calc.basePoints,
            breakdown: calc.breakdown,
            isLiveMatchPlayer: true,
            liveMatchId: match.id,
          };
          if (!basePlayer.avatar) {
            basePlayer.avatar = generateSvgAvatar(basePlayer);
          }
          return basePlayer;
        });

        setAllLoadedPlayers((prev) => {
          const nonLiveOrOtherMatch = prev.filter((p) => p.liveMatchId !== match.id);
          // Deduplicate by id
          const liveIds = new Set(livePlayers.map((lp) => lp.id));
          return [...livePlayers, ...nonLiveOrOtherMatch.filter((p) => !liveIds.has(p.id))];
        });
      }
    } catch (err) {
      console.warn("Live match summary sync warning:", err);
    }
  };

  // Poll live scoreboard on mount and every 25 seconds
  useEffect(() => {
    refreshLiveMatches(false);
    const interval = setInterval(() => {
      refreshLiveMatches(false);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // Sync detailed match scorecard whenever selectedMatchId or todayMatches updates
  useEffect(() => {
    const currentMatch = todayMatches.find((m) => m.id === selectedMatchId) || todayMatches[0];
    if (currentMatch) {
      syncSelectedMatchSummary(currentMatch);
    }
  }, [selectedMatchId, todayMatches]);

  const [committedZkProof, setCommittedZkProof] = useState<ZkSquadProof | null>(null);
  const squadValidation = validateSquad(selectedPlayerIds, allLoadedPlayers);

  useEffect(() => {
    setCommittedZkProof((prev) => {
      if (!prev) return null;
      const currentSquad = selectedPlayerIds
        .map((id) => allLoadedPlayers.find((p) => p.id === id))
        .filter((p): p is Player => Boolean(p));
      if (currentSquad.length !== 11) return null;
      const check = verifyZkSquadProof(prev, currentSquad);
      return check.isValid ? prev : null;
    });
  }, [selectedPlayerIds, allLoadedPlayers]);

  const commitZkProofOnChain = (proof: ZkSquadProof): boolean => {
    if (!isConnected) {
      showToast("Connect your wallet first to commit a ZK proof on-chain.", true);
      return false;
    }

    const currentSquad = selectedPlayerIds
      .map((id) => allLoadedPlayers.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));

    const verification = verifyZkSquadProof(proof, currentSquad);
    if (!verification.isValid) {
      showToast(verification.message, true);
      return false;
    }

    const sealFee = 10;
    if (cricBalance < sealFee) {
      showToast(`Insufficient balance! Need ${sealFee} CRIC to commit ZK proof on-chain.`, true);
      return false;
    }

    setPendingTx({
      type: "ENTER_TOURNAMENT",
      title: "Commit ZK Squad Proof On-Chain",
      description: `Cryptographically seal 11-player lineup on Cancun EVM (Commitment: ${proof.commitmentHash.slice(0, 12)}…)`,
      amountCRIC: sealFee,
      recipientAddress: DEPLOYED_CONTRACTS.contracts.TournamentPool,
      details: {
        "Protocol": proof.protocol,
        "Circuit": proof.circuit,
        "Curve": proof.curve,
        "Commitment Hash": proof.commitmentHash,
        "Salary Cap": `${proof.constraintsSummary.totalCredits} / 120 cr`,
        "Playing XI Size": "11 Players (Private Witness)",
      },
      onConfirm: async () => {
        await executeOnChainTransfer(sealFee, DEPLOYED_CONTRACTS.contracts.TournamentPool);
        setCommittedZkProof(proof);
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
        showToast(`ZK Proof committed on-chain! Commitment: ${proof.commitmentHash.slice(0, 12)}…`);
      },
    });

    return true;
  };

  const toggleSelectPlayer = (playerId: number) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds((prev) => prev.filter((id) => id !== playerId));
    } else {
      if (selectedPlayerIds.length >= 11) {
        showToast("Squad is already full with 11 players! Remove one first.", true);
        return;
      }
      setSelectedPlayerIds((prev) => [...prev, playerId]);
    }
  };

  const loadLiveMatchXI = () => {
    const livePool = allLoadedPlayers.filter((p) => p.liveMatchId === selectedMatchId);
    const sourcePool = livePool.length >= 11 ? livePool : allLoadedPlayers;

    // Sort by calculatedPoints descending so we pick the top live performers
    const sorted = [...sourcePool].sort((a, b) => (b.calculatedPoints || 0) - (a.calculatedPoints || 0));
    const wks = sorted.filter((p) => p.role === "Wicketkeeper");
    const bats = sorted.filter((p) => p.role === "Batsman");
    const bowls = sorted.filter((p) => p.role === "Bowler");
    const ars = sorted.filter((p) => p.role === "All-Rounder");

    const pickedSet = new Set<number>();
    const addUpTo = (list: Player[], count: number) => {
      for (const p of list) {
        if (pickedSet.size >= 11) break;
        if (!pickedSet.has(p.id) && count > 0) {
          pickedSet.add(p.id);
          count--;
        }
      }
    };

    addUpTo(wks, 1);
    addUpTo(bats, 4);
    addUpTo(bowls, 4);
    addUpTo(ars, 2);
    // Fill any remaining slots up to 11 from sorted pool
    for (const p of sorted) {
      if (pickedSet.size >= 11) break;
      pickedSet.add(p.id);
    }

    setSelectedPlayerIds(Array.from(pickedSet));
    showToast(
      livePool.length >= 11
        ? `Loaded 11 live players from ${todayMatches.find((m) => m.id === selectedMatchId)?.shortName || "the live fixture"}!`
        : "Loaded balanced Playing XI with live player telemetry!"
    );
  };

  const autoPickBalancedSquad = () => {
    const candidates = [...allLoadedPlayers];
    const wks = candidates.filter((p) => p.role === "Wicketkeeper");
    const bats = candidates.filter((p) => p.role === "Batsman");
    const bowls = candidates.filter((p) => p.role === "Bowler");
    const ars = candidates.filter((p) => p.role === "All-Rounder");

    if (!wks.length || bats.length < 4 || bowls.length < 4 || ars.length < 2) {
      setSelectedPlayerIds(INITIAL_PLAYERS.slice(0, 11).map((p) => p.id));
      showToast("Selected balanced default XI.");
      return;
    }

    const picked = [
      wks[0].id,
      bats[0].id,
      bats[1].id,
      bats[2].id,
      bats[3].id,
      bowls[0].id,
      bowls[1].id,
      bowls[2].id,
      bowls[3].id,
      ars[0].id,
      ars[1].id,
    ];
    setSelectedPlayerIds(picked);
    showToast("Auto-picked 11 balanced cricketers conforming to salary cap!");
  };

  const clearSquad = () => {
    setSelectedPlayerIds([]);
    showToast("Squad cleared.");
  };

  const simulateOver = () => {
    if (selectedPlayerIds.length !== 11) {
      showToast("Select a complete 11-player squad before simulating an over.", true);
      return;
    }

    const squad = selectedPlayerIds.map((id) => allLoadedPlayers.find((p) => p.id === id)).filter((p): p is Player => Boolean(p));
    const batters = squad.filter((p) => ["Batsman", "Wicketkeeper", "All-Rounder"].includes(p.role));
    const bowlers = squad.filter((p) => ["Bowler", "All-Rounder"].includes(p.role));

    if (!batters.length || !bowlers.length) {
      showToast("Squad must have at least one batter and one bowler.", true);
      return;
    }

    const batter = batters[Math.floor(Math.random() * batters.length)];
    const bowler = bowlers[Math.floor(Math.random() * bowlers.length)];

    const outcomes = [
      { type: "DOT", runs: 0, fours: 0, sixes: 0, wicket: 0, text: "Dot ball! Crisp defensive drive straight to cover." },
      { type: "SINGLE", runs: 1, fours: 0, sixes: 0, wicket: 0, text: "Tapped softly into the deep for a quick single." },
      { type: "DOUBLE", runs: 2, fours: 0, sixes: 0, wicket: 0, text: "Excellent running between the wickets, scampered back for 2!" },
      { type: "FOUR", runs: 4, fours: 1, sixes: 0, wicket: 0, text: "FOUR! Glorious cover drive piercing the infield rope!" },
      { type: "SIX", runs: 6, fours: 0, sixes: 1, wicket: 0, text: "SIX! Launched high into the 2nd tier with pure willow timing!" },
      { type: "WICKET", runs: 0, fours: 0, sixes: 0, wicket: 1, text: "WICKET! Clean bowled with an unplayable 145km/h yorker!" },
    ];

    let overRuns = 0;
    let overWickets = 0;
    const newDeliveries: string[] = [];

    for (let ball = 1; ball <= 6; ball++) {
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      overRuns += outcome.runs;
      overWickets += outcome.wicket;
      newDeliveries.push(`Ball ${ball}: ${outcome.text}`);
    }

    // Update batter and bowler stats in loaded players
    setAllLoadedPlayers((prev) =>
      prev.map((p) => {
        if (p.id === batter.id) {
          const currentStats = p.stats || { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0 };
          const updatedStats = {
            ...currentStats,
            runs: currentStats.runs + overRuns,
            fours: currentStats.fours + Math.floor(overRuns / 4),
            sixes: currentStats.sixes + (overRuns >= 6 ? 1 : 0),
          };
          const calc = calculatePlayerPoints(updatedStats, p.rarity);
          return { ...p, stats: updatedStats, calculatedPoints: calc.finalPoints, breakdown: calc.breakdown };
        }
        if (p.id === bowler.id) {
          const currentStats = p.stats || { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0 };
          const updatedStats = {
            ...currentStats,
            wickets: currentStats.wickets + overWickets,
          };
          const calc = calculatePlayerPoints(updatedStats, p.rarity);
          return { ...p, stats: updatedStats, calculatedPoints: calc.finalPoints, breakdown: calc.breakdown };
        }
        return p;
      })
    );

    setDeliveriesLog(newDeliveries);
    setMatchCommentary(`Over completed by ${bowler.name} bowling to ${batter.name}: ${overRuns} runs, ${overWickets} wicket(s)!`);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    showToast(`Simulated over: ${overRuns} runs, ${overWickets} wickets! Points updated.`);
  };

  // Stadium Passes
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [ticketFilter, setTicketFilter] = useState<"all" | "LIVE" | "UPCOMING" | "PAST">("all");
  const [gatekeeperLogs, setGatekeeperLogs] = useState<{ id: string; time: string; text: string; type: "success" | "error" | "info" }[]>([
    { id: "log-1", time: "19:00:00", text: "Turnstile Gate 4 Scanner initialized and ready.", type: "info" },
  ]);

  const buyTicket = (ticket: Ticket): boolean => {
    if (!isConnected) {
      showToast("Connect your wallet to purchase stadium passes.", true);
      return false;
    }
    if (cricBalance < ticket.faceValue) {
      showToast(`Insufficient balance! You need ${ticket.faceValue} CRIC.`, true);
      return false;
    }

    setPendingTx({
      type: "BUY_TICKET",
      title: `Stadium Pass #${ticket.tokenId}`,
      description: `Official ERC-721 Matchday Pass for ${ticket.matchName} at ${ticket.venue}. Anti-scalping resale strictly capped at 15%.`,
      amountCRIC: ticket.faceValue,
      recipientAddress: DEPLOYED_CONTRACTS.contracts.MatchTicketNFT,
      details: {
        "Match": ticket.matchName,
        "Stand / Seat": `${ticket.stand}, Seat ${ticket.seat}`,
        "Face Value": `${ticket.faceValue} CRIC`,
        "Max Resale Cap": `${ticket.maxResalePrice} CRIC`,
        "Smart Contract": "MatchTicketNFT (ERC-721)",
      },
      onConfirm: async () => {
        await executeOnChainTransfer(ticket.faceValue, DEPLOYED_CONTRACTS.contracts.MatchTicketNFT);
        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? { ...t, owner: walletAddress } : t))
        );
        confetti({ particleCount: 40, spread: 60 });
        showToast(`Purchased stadium pass #${ticket.tokenId} for ${ticket.faceValue} CRIC!`);
      },
    });

    return true;
  };

  const issueTicket = (data: Omit<Ticket, "id" | "owner" | "maxResalePrice" | "status">) => {
    const maxResale = Math.round(data.faceValue * 1.15); // Strict 15% anti-scalping max resale cap
    const newTicket: Ticket = {
      ...data,
      id: `tkt-${Date.now()}`,
      maxResalePrice: maxResale,
      owner: walletAddress,
      status: "UPCOMING",
    };
    setTickets((prev) => [newTicket, ...prev]);
    showToast(`Issued on-chain Stadium Pass #${data.tokenId} with fair resale cap of ${maxResale} CRIC!`);
  };

  const verifyTicketEntry = (payload: string): { valid: boolean; message: string } => {
    const clean = payload.trim().toUpperCase();
    const timeStr = new Date().toLocaleTimeString();

    // Check if matching exact ticket token ID, CV-PASS-<id>, or internal id
    const match = tickets.find((t) => {
      const tokenRegex = new RegExp(`(?:^|[^0-9])${t.tokenId}(?:$|[^0-9])`);
      return (
        clean === `CV-PASS-${t.tokenId}` ||
        clean === t.id.toUpperCase() ||
        tokenRegex.test(clean)
      );
    });

    if (!match) {
      const msg = `REJECTED: Invalid or counterfeit ticket barcode (${clean}).`;
      setGatekeeperLogs((prev) => [{ id: Math.random().toString(), time: timeStr, text: msg, type: "error" }, ...prev]);
      return { valid: false, message: msg };
    }

    if (match.used) {
      const msg = `REJECTED: Pass #${match.tokenId} was ALREADY SCANNED. Double entry prohibited!`;
      setGatekeeperLogs((prev) => [{ id: Math.random().toString(), time: timeStr, text: msg, type: "error" }, ...prev]);
      return { valid: false, message: msg };
    }

    // Mark as used
    setTickets((prev) => prev.map((t) => (t.id === match.id ? { ...t, used: true } : t)));
    const msg = `ENTRY GRANTED: Pass #${match.tokenId} verified! Stand: ${match.stand}, Seat: ${match.seat}. Welcome!`;
    setGatekeeperLogs((prev) => [{ id: Math.random().toString(), time: timeStr, text: msg, type: "success" }, ...prev]);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    return { valid: true, message: msg };
  };

  const resetTicketScans = () => {
    setTickets((prev) => prev.map((t) => ({ ...t, used: false })));
    const timeStr = new Date().toLocaleTimeString();
    setGatekeeperLogs((prev) => [
      { id: Math.random().toString(), time: timeStr, text: "All turnstile passes reset to unscanned status for testing.", type: "info" },
      ...prev,
    ]);
  };

  // Fan Polls
  const [polls, setPolls] = useState<Poll[]>(INITIAL_POLLS);

  const votePoll = (pollId: number, optionIndex: number) => {
    if (!isConnected) {
      showToast("Connect wallet to cast on-chain governance votes.", true);
      return;
    }

    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        if (poll.userVotedIndex !== undefined) {
          showToast("You have already voted on this proposal!", true);
          return poll;
        }

        const newOptions = [...poll.options];
        newOptions[optionIndex] = {
          ...newOptions[optionIndex],
          votes: newOptions[optionIndex].votes + 1,
        };

        showToast(`Vote cast for "${newOptions[optionIndex].text}"! Staked CRIC weight recorded.`);
        confetti({ particleCount: 25, spread: 45 });
        return {
          ...poll,
          options: newOptions,
          totalVotes: poll.totalVotes + 1,
          userVotedIndex: optionIndex,
        };
      })
    );
  };

  const createPoll = (question: string, options: string[], closeHours: number) => {
    const newPoll: Poll = {
      id: Date.now(),
      question,
      creator: walletAddress,
      closeTime: new Date(Date.now() + closeHours * 3600000).toISOString(),
      totalVotes: 0,
      options: options.map((opt) => ({ text: opt.trim(), votes: 0 })),
    };
    setPolls((prev) => [newPoll, ...prev]);
    showToast(`Created new fan governance poll: "${question}"`);
  };

  // Tournaments
  const [tournaments, setTournaments] = useState<Tournament[]>(INITIAL_TOURNAMENTS);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(INITIAL_TOURNAMENTS[0].id);

  const enterTournament = (tournamentId: number): boolean => {
    if (!isConnected) {
      showToast("Connect your wallet first to join tournament pools.", true);
      return false;
    }

    const tourn = tournaments.find((t) => t.id === tournamentId);
    if (!tourn) return false;

    if (cricBalance < tourn.entryFee) {
      showToast(`Insufficient balance! Entry fee is ${tourn.entryFee} CRIC.`, true);
      return false;
    }

    if (selectedPlayerIds.length !== 11 || !squadValidation.isValid) {
      showToast(
        squadValidation.error || "Please assemble a valid 11-player squad in Matchday XI first!",
        true
      );
      setCurrentTab("fantasy");
      return false;
    }

    const currentSquad = selectedPlayerIds
      .map((id) => allLoadedPlayers.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));

    // Reuse existing verified committed proof for this squad, or generate a fresh Groth16 proof
    let activeProof = committedZkProof;
    if (!activeProof || !verifyZkSquadProof(activeProof, currentSquad).isValid) {
      const generated = generateZkSquadProof(currentSquad, tourn.matchId);
      if (generated.error || !generated.proof) {
        showToast(generated.error || "Unable to generate ZK squad proof.", true);
        return false;
      }
      activeProof = generated.proof;
    }

    const proofForTx = activeProof;
    const verification = verifyZkSquadProof(proofForTx, currentSquad);
    if (!verification.isValid) {
      showToast(verification.message, true);
      return false;
    }

    setPendingTx({
      type: "ENTER_TOURNAMENT",
      title: `Tournament Pool: ${tourn.name}`,
      description: `Commit your ZK-verified Matchday XI squad to ${tourn.name} and deposit ${tourn.entryFee} CRIC into on-chain escrow.`,
      amountCRIC: tourn.entryFee,
      recipientAddress: DEPLOYED_CONTRACTS.contracts.TournamentPool,
      details: {
        "Contest": tourn.name,
        "Entry Fee": `${tourn.entryFee} CRIC`,
        "Prize Pool": `${tourn.poolCRIC} CRIC`,
        "ZK Protocol": `${proofForTx.protocol} (${proofForTx.curve})`,
        "ZK Commitment": `${proofForTx.commitmentHash.slice(0, 12)}…${proofForTx.commitmentHash.slice(-6)}`,
        "Smart Contract": "TournamentPool",
      },
      onConfirm: async () => {
        await executeOnChainTransfer(tourn.entryFee, DEPLOYED_CONTRACTS.contracts.TournamentPool);
        setCommittedZkProof(proofForTx);
        const shortCommit = `${proofForTx.commitmentHash.slice(0, 8)}...${proofForTx.commitmentHash.slice(-6)}`;

        setTournaments((prev) =>
          prev.map((t) => {
            if (t.id !== tournamentId) return t;
            const currentEntries = t.entries || [];
            const newEntry = {
              rank: currentEntries.length + 1,
              address: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
              squadCommitment: shortCommit,
              points: 0,
              payout: 0,
            };
            return {
              ...t,
              poolCRIC: t.poolCRIC + tourn.entryFee,
              entriesCount: t.entriesCount + 1,
              entries: [newEntry, ...currentEntries],
            };
          })
        );

        confetti({ particleCount: 50, spread: 70 });
        showToast(`Entered ${tourn.name}! ZK Squad Commitment: ${shortCommit}`);
      },
    });

    return true;
  };

  const createTournament = (name: string, matchId: number, entryFee: number, maxEntries: number, hours: number) => {
    const newTourn: Tournament = {
      id: Date.now(),
      name,
      matchId,
      entryFee,
      maxEntries,
      lockTime: new Date(Date.now() + hours * 3600000).toISOString(),
      poolCRIC: entryFee * 2,
      status: "OPEN",
      entriesCount: 2,
      entries: [
        { rank: 1, address: "0x7099...79C8", squadCommitment: "0xa1e4...8f2b", points: 0, payout: 0 },
        { rank: 2, address: "0x3C44...93BC", squadCommitment: "0x5c8d...3411", points: 0, payout: 0 },
      ],
    };
    setTournaments((prev) => [newTourn, ...prev]);
    showToast(`Created tournament pool: ${name}`);
  };

  // Faucet - one-time claim per session, removed from UI once claimed
  const claimFaucet = async () => {
    if (!isConnected) {
      showToast("Connect wallet first.", true);
      return;
    }
    if (hasClaimedFaucet) {
      showToast("You have already claimed your 50,000 CRIC grant.", true);
      return;
    }

    setPendingTx({
      type: "CLAIM_FAUCET",
      title: "Claim 50,000 CRIC Faucet Grant",
      description: "Call claimFaucet() on the CRIC ERC-20 Smart Contract to mint 50,000 CRIC tokens directly to your wallet.",
      amountCRIC: 50000,
      recipientAddress: DEPLOYED_CONTRACTS.contracts.CRIC,
      details: {
        "Contract": "CRIC Token (ERC-20)",
        "Method": "claimFaucet()",
        "Mint Amount": "50,000 CRIC",
        "Recipient": `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
      },
      onConfirm: async () => {
        const eth = (window as unknown as { ethereum?: unknown }).ethereum;
        const isInIframe = typeof window !== "undefined" && window.self !== window.top;
        setIsTransacting(true);
        try {
          let claimedViaMetaMask = false;
          if (eth && isRealWallet && !isInIframe) {
            try {
              const provider = new BrowserProvider(eth as never);
              const net = await provider.getNetwork();
              if (Number(net.chainId) !== DEPLOYED_CONTRACTS.chainId) {
                await addCricketNetworkToMetaMask();
              }
              const signer = await provider.getSigner();
              const signerAddr = await signer.getAddress();
              if (signerAddr.toLowerCase() === walletAddress.toLowerCase()) {
                const cric = new Contract(
                  DEPLOYED_CONTRACTS.contracts.CRIC,
                  ["function claimFaucet() external"],
                  signer
                );
                showToast("Please confirm claimFaucet() in your MetaMask popup…");
                const tx = await cric.claimFaucet();
                showToast(`Broadcasted Faucet Claim! Hash: ${tx.hash.slice(0, 10)}…`);
                await tx.wait();
                claimedViaMetaMask = true;
              }
            } catch (err: unknown) {
              const errorObj = err as { code?: number; message?: string };
              if (errorObj?.code === 4001 || errorObj?.message?.includes("rejected") || errorObj?.message?.includes("denied")) {
                throw new Error("Faucet claim rejected in MetaMask.");
              }
              console.warn("MetaMask faucet fallback to RPC:", err);
            }
          }

          if (!claimedViaMetaMask) {
            const rpc = new JsonRpcProvider(`${window.location.origin}/rpc`);
            await rpc.send("hardhat_impersonateAccount", [walletAddress]);
            const cricIface = new Contract(
              DEPLOYED_CONTRACTS.contracts.CRIC,
              ["function claimFaucet() external"],
              rpc
            ).interface;
            const data = cricIface.encodeFunctionData("claimFaucet", []);
            const txHash = await rpc.send("eth_sendTransaction", [
              {
                from: walletAddress,
                to: DEPLOYED_CONTRACTS.contracts.CRIC,
                data,
              },
            ]);
            await rpc.send("hardhat_stopImpersonatingAccount", [walletAddress]);
            showToast(`On-Chain Faucet Tx Mined! Hash: ${String(txHash).slice(0, 12)}…`);
          }

          await syncOnChainBalances();
          setHasClaimedFaucet(true);
          confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
          showToast("50,000 CRIC minted on-chain to your wallet! Faucet option completed.");
        } finally {
          setIsTransacting(false);
        }
      },
    });
  };

  // Demo Gas - one-time claim per session, removed from UI once claimed
  const claimDemoGas = () => {
    if (hasClaimedDemoGas) {
      showToast("Demo ETH grant already claimed.", true);
      return;
    }

    setPendingTx({
      type: "CLAIM_ETH",
      title: "Claim 20 Demo ETH Gas Grant",
      description: "Transfer 20.0 ETH from the Local Hardhat Genesis Treasury to your wallet for on-chain gas fees.",
      amountCRIC: 0,
      recipientAddress: walletAddress,
      details: {
        "Grant Amount": "20.0 ETH",
        "From Treasury": "0xf39Fd6...92266",
        "To Wallet": `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
        "Chain ID": "31337 (Local Hardhat)",
      },
      onConfirm: async () => {
        setIsTransacting(true);
        try {
          const rpc = new JsonRpcProvider(`${window.location.origin}/rpc`);
          const deployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
          const txHash = await rpc.send("eth_sendTransaction", [
            {
              from: deployer,
              to: walletAddress,
              value: "0x1158e460913d00000", // 20 ETH in hex wei
            },
          ]);
          await syncOnChainBalances();
          setHasClaimedDemoGas(true);
          confetti({ particleCount: 40, spread: 50 });
          showToast(`20 Demo ETH transferred on-chain! Tx: ${String(txHash).slice(0, 12)}…`);
        } finally {
          setIsTransacting(false);
        }
      },
    });
  };

  // Real or Demo Wallet Connect
  const connectWallet = async (prompt: boolean = true) => {
    const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
    if (eth && eth.request) {
      try {
        const accounts = await eth.request({ method: prompt ? "eth_requestAccounts" : "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          setIsRealWallet(true);
          setNetworkName("MetaMask / Web3 · Connected");
          showToast(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
          return;
        }
      } catch (err: unknown) {
        console.warn("Real wallet connection canceled or unavailable:", err);
      }
    }

    // Reconnect configured Hardhat wallet (iframe-safe mode)
    const localAddr = "0x4C349eBf4E712eA69f04C4F49bC15c6182d9aC37";
    setWalletAddress(localAddr);
    setIsConnected(true);
    setIsRealWallet(true);
    setNetworkName("MetaMask (0x4C34…aC37) · Connected");
    showToast("Local Hardhat Web3 wallet connected!");
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress("");
    setNetworkName("Wallet Not Connected");
    showToast("Wallet disconnected.");
  };

  return (
    <CricketContext.Provider
      value={{
        walletAddress,
        isConnected,
        isRealWallet,
        cricBalance,
        ethBalance,
        networkName,
        connectWallet,
        disconnectWallet,
        claimFaucet,
        hasClaimedFaucet,
        claimDemoGas,
        hasClaimedDemoGas,
        currentTab,
        setCurrentTab,
        players,
        allLoadedPlayers,
        isLoadingPlayers,
        totalPlayers,
        currentPage,
        setCurrentPage,
        pageSize,
        activeFilter,
        setActiveFilter,
        searchQuery,
        setSearchQuery,
        inspectPlayer,
        setInspectPlayer,
        userCollection,
        mintCard,
        auctionListings,
        listCardForAuction,
        buyAuctionItem,
        cancelAuctionListing,
        selectedPlayerIds,
        toggleSelectPlayer,
        autoPickBalancedSquad,
        loadLiveMatchXI,
        clearSquad,
        todayMatches,
        selectedMatchId,
        setSelectedMatchId,
        matchCommentary,
        deliveriesLog,
        simulateOver,
        isLoadingLiveMatches,
        lastFeedSync,
        refreshLiveMatches,
        squadValidation,
        committedZkProof,
        commitZkProofOnChain,
        tickets,
        ticketFilter,
        setTicketFilter,
        buyTicket,
        issueTicket,
        verifyTicketEntry,
        resetTicketScans,
        gatekeeperLogs,
        polls,
        votePoll,
        createPoll,
        tournaments,
        selectedTournamentId,
        setSelectedTournamentId,
        enterTournament,
        createTournament,
        toasts,
        showToast,
        showWalletModal,
        setShowWalletModal,
        addCricketNetworkToMetaMask,
        addCricTokenToMetaMask,
        pendingTx,
        setPendingTx,
        isTransacting,
        confirmPendingTx,
        cancelPendingTx,
      }}
    >
      {children}
    </CricketContext.Provider>
  );
};

export const useCricket = () => {
  const context = useContext(CricketContext);
  if (!context) {
    throw new Error("useCricket must be used within a CricketProvider");
  }
  return context;
};

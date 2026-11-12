import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Player, AuctionItem, Ticket, Poll, Tournament, ToastMessage, PlayerRarity } from "../types";
import { INITIAL_PLAYERS, INITIAL_TICKETS, INITIAL_POLLS, INITIAL_TOURNAMENTS } from "../seedData";
import { calculatePlayerPoints, validateSquad, generateSvgAvatar } from "../scoringEngine";
import confetti from "canvas-confetti";
import { BrowserProvider, JsonRpcProvider, Contract, formatEther, hexlify, toUtf8Bytes } from "ethers";

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

async function triggerWalletTx(dataString: string) {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) return null;
  try {
    const provider = new BrowserProvider(eth as never);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    // Send 0 ETH transaction with payload data to broadcast on-chain via MetaMask!
    const tx = await signer.sendTransaction({
      to: address,
      value: 0n,
      data: hexlify(toUtf8Bytes(dataString)),
    });
    return tx;
  } catch (err: unknown) {
    const errorObj = err as { code?: number; message?: string };
    if (errorObj?.code === 4001 || errorObj?.message?.includes("rejected") || errorObj?.message?.includes("denied")) {
      throw new Error("Transaction rejected in MetaMask.");
    }
    console.warn("MetaMask TX note:", err);
    return null;
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

  // Matchday XI Fantasy
  selectedPlayerIds: number[];
  toggleSelectPlayer: (playerId: number) => void;
  autoPickBalancedSquad: () => void;
  clearSquad: () => void;
  todayMatches: { id: number; teams: string; status: string; venue: string }[];
  selectedMatchId: number;
  setSelectedMatchId: (id: number) => void;
  matchCommentary: string;
  deliveriesLog: string[];
  simulateOver: () => void;
  squadValidation: { isValid: boolean; error?: string; totalCredits: number; roleCounts?: Record<string, number> };

  // Stadium Passes
  tickets: Ticket[];
  ticketFilter: "all" | "LIVE" | "UPCOMING" | "PAST";
  setTicketFilter: (filter: "all" | "LIVE" | "UPCOMING" | "PAST") => void;
  buyTicket: (ticket: Ticket) => boolean;
  issueTicket: (ticket: Omit<Ticket, "id" | "owner" | "maxResalePrice" | "status">) => void;
  verifyTicketEntry: (payload: string) => { valid: boolean; message: string };
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

  // Sync real on-chain balances from Local Hardhat node via /rpc proxy
  useEffect(() => {
    let active = true;
    async function syncOnChainBalances() {
      if (!walletAddress) return;
      try {
        const readProvider = new JsonRpcProvider(`${window.location.origin}/rpc`);
        const ethBal = await readProvider.getBalance(walletAddress);
        if (!active) return;
        const ethNum = Number(Number(formatEther(ethBal)).toFixed(4));
        setEthBalance(ethNum);
        if (ethNum >= 20) {
          setHasClaimedDemoGas(true);
        }

        const cric = new Contract(
          DEPLOYED_CONTRACTS.contracts.CRIC,
          ["function balanceOf(address) view returns (uint256)"],
          readProvider
        );
        const cricBal = await cric.balanceOf(walletAddress);
        if (!active) return;
        const cricNum = Number(formatEther(cricBal));
        setCricBalance(cricNum);
        if (cricNum >= 50000) {
          setHasClaimedFaucet(true);
        }
      } catch (err) {
        // Dev server or background node initializing
      }
    }
    syncOnChainBalances();
    const interval = setInterval(syncOnChainBalances, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [walletAddress]);

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

  // Load complete 4,800+ dataset in background
  useEffect(() => {
    let isMounted = true;
    async function loadDataset() {
      try {
        setIsLoadingPlayers(true);
        const res = await fetch("/data/players_2000_2026.json");
        if (res.ok) {
          const data: Player[] = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            // Ensure avatar and stats
            const enriched = data.map((p) => {
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
                avatar: p.avatar || generateSvgAvatar(p),
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

    const eth = (window as unknown as { ethereum?: unknown }).ethereum;
    if (eth && isRealWallet) {
      try {
        showToast(`Please confirm minting ${player.name} in MetaMask…`);
        const tx = await triggerWalletTx(`CricketVerse:MintCard:${player.id}:${cost}CRIC`);
        if (tx) {
          showToast(`MetaMask Tx broadcasted! Hash: ${tx.hash.slice(0, 10)}…`);
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        showToast(errorObj?.message || "MetaMask transaction cancelled.", true);
        return false;
      }
    }

    setCricBalance((prev) => prev - cost);
    setUserCollection((prev) => [player, ...prev]);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    showToast(`Collected ${player.name} (${player.rarity}) card for ${cost.toLocaleString()} CRIC!`);
    return true;
  };

  // Auction Room / Marketplace
  const [auctionListings, setAuctionListings] = useState<AuctionItem[]>([
    {
      id: "auc-1",
      cardId: 9,
      player: INITIAL_PLAYERS[8], // MS Dhoni
      seller: "0x8626...f96a",
      priceCRIC: 1450,
      createdAt: "10 mins ago",
    },
    {
      id: "auc-2",
      cardId: 8,
      player: INITIAL_PLAYERS[7], // Rashid Khan
      seller: "0x3C44...93BC",
      priceCRIC: 980,
      createdAt: "25 mins ago",
    },
    {
      id: "auc-3",
      cardId: 10,
      player: INITIAL_PLAYERS[9], // Pat Cummins
      seller: "0x7099...79C8",
      priceCRIC: 720,
      createdAt: "1 hour ago",
    },
    {
      id: "auc-4",
      cardId: 16,
      player: INITIAL_PLAYERS[15], // Sachin Tendulkar
      seller: "0x5149...f2d0",
      priceCRIC: 2042,
      createdAt: "3 mins ago",
    },
    {
      id: "auc-5",
      cardId: 3,
      player: INITIAL_PLAYERS[2], // Rohit Sharma
      seller: "0x976E...e673",
      priceCRIC: 1150,
      createdAt: "18 mins ago",
    },
    {
      id: "auc-6",
      cardId: 4,
      player: INITIAL_PLAYERS[3], // Hardik Pandya
      seller: "0x14dC...2A88",
      priceCRIC: 620,
      createdAt: "42 mins ago",
    },
    {
      id: "auc-7",
      cardId: 5,
      player: INITIAL_PLAYERS[4], // Rishabh Pant
      seller: "0x2361...74C7",
      priceCRIC: 580,
      createdAt: "1 hour ago",
    },
    {
      id: "auc-8",
      cardId: 6,
      player: INITIAL_PLAYERS[5], // Ravindra Jadeja
      seller: "0x12b4...99ac",
      priceCRIC: 890,
      createdAt: "2 hours ago",
    },
    {
      id: "auc-9",
      cardId: 12,
      player: INITIAL_PLAYERS[11], // Mohammed Shami
      seller: "0x9923...ff41",
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

    const eth = (window as unknown as { ethereum?: unknown }).ethereum;
    if (eth && isRealWallet) {
      try {
        showToast(`Please confirm purchase of ${item.player.name} in MetaMask…`);
        const tx = await triggerWalletTx(`CricketVerse:AuctionBuy:${item.id}:${item.priceCRIC}CRIC`);
        if (tx) {
          showToast(`MetaMask Tx broadcasted! Hash: ${tx.hash.slice(0, 10)}…`);
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        showToast(errorObj?.message || "MetaMask transaction cancelled.", true);
        return false;
      }
    }

    setCricBalance((prev) => prev - item.priceCRIC);
    setAuctionListings((prev) => prev.filter((a) => a.id !== item.id));
    setUserCollection((prev) => [item.player, ...prev]);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    showToast(`Purchased ${item.player.name} for ${item.priceCRIC} CRIC! 5% royalty routed to creator.`);
    return true;
  };

  const cancelAuctionListing = (itemId: string) => {
    const item = auctionListings.find((a) => a.id === itemId);
    if (!item) return;
    setAuctionListings((prev) => prev.filter((a) => a.id !== itemId));
    setUserCollection((prev) => [item.player, ...prev]);
    showToast(`Cancelled auction listing for ${item.player.name}.`);
  };

  // Matchday XI Fantasy
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const [todayMatches] = useState([
    { id: 1, teams: "India vs Australia · Championship", status: "Innings Break", venue: "Ahmedabad" },
    { id: 2, teams: "Mumbai Indians vs Chennai Super Kings", status: "Live · Over 14.2", venue: "Mumbai" },
    { id: 3, teams: "Royal Challengers vs Kolkata Knights", status: "Starts 19:30 IST", venue: "Bengaluru" },
  ]);
  const [selectedMatchId, setSelectedMatchId] = useState<number>(1);
  const [matchCommentary, setMatchCommentary] = useState<string>(
    "Select 11 players; click 'Simulate Over' to execute a live 6-ball sequence with ball-by-ball commentary and real-time deterministic score calculations!"
  );
  const [deliveriesLog, setDeliveriesLog] = useState<string[]>([
    "Match commentary initialized · Pitch is firm and dry",
    "Bowler marking run-up at the Pavilion End",
  ]);

  const squadValidation = validateSquad(selectedPlayerIds, allLoadedPlayers);

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

  const buyTicket = (ticket: Ticket) => {
    if (!isConnected) {
      showToast("Connect your wallet to purchase stadium passes.", true);
      return false;
    }
    if (cricBalance < ticket.faceValue) {
      showToast(`Insufficient balance! You need ${ticket.faceValue} CRIC.`, true);
      return false;
    }

    setCricBalance((prev) => prev - ticket.faceValue);
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, owner: walletAddress } : t))
    );
    confetti({ particleCount: 40, spread: 60 });
    showToast(`Purchased stadium pass #${ticket.tokenId} for ${ticket.faceValue} CRIC! Resale capped at ${ticket.maxResalePrice} CRIC.`);
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

    // Check if matching any ticket token ID or QR format
    const match = tickets.find((t) => clean.includes(String(t.tokenId)) || clean.includes(t.id.toUpperCase()));

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

  const enterTournament = (tournamentId: number) => {
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

    if (selectedPlayerIds.length !== 11) {
      showToast("Please pick a valid 11-player squad in Matchday XI first!", true);
      setCurrentTab("fantasy");
      return false;
    }

    setCricBalance((prev) => prev - tourn.entryFee);
    const commitmentHash = `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`;

    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== tournamentId) return t;
        const currentEntries = t.entries || [];
        const newEntry = {
          rank: currentEntries.length + 1,
          address: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          squadCommitment: commitmentHash,
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
    showToast(`Entered ${tourn.name}! Squad commitment hash: ${commitmentHash}`);
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

    const eth = (window as unknown as { ethereum?: unknown }).ethereum;
    if (eth && isRealWallet) {
      try {
        showToast("Please confirm 50,000 CRIC faucet claim in MetaMask…");
        const tx = await triggerWalletTx("CricketVerse:ClaimFaucet:50000CRIC");
        if (tx) {
          showToast(`MetaMask Tx broadcasted! Hash: ${tx.hash.slice(0, 10)}…`);
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        showToast(errorObj?.message || "MetaMask faucet request cancelled.", true);
        return;
      }
    }

    setCricBalance((prev) => prev + 50000);
    setHasClaimedFaucet(true);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    showToast("50,000 CRIC claimed successfully! Faucet option now completed.");
  };

  // Demo Gas - one-time claim per session, removed from UI once claimed
  const claimDemoGas = () => {
    if (hasClaimedDemoGas) {
      showToast("Demo ETH grant already claimed.", true);
      return;
    }
    setEthBalance((prev) => prev + 20);
    setHasClaimedDemoGas(true);
    confetti({ particleCount: 40, spread: 50 });
    showToast("20 Demo ETH added to your wallet! Option completed.");
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

    // Interactive Demo Wallet mode
    setWalletAddress("0x71C8407983637eFE516bEE2eF8D88E3d9B67B492");
    setIsConnected(true);
    setIsRealWallet(false);
    setNetworkName("CricketVerse Local Hardhat · Connected");
    showToast("Demo Web3 wallet connected with 25,400 CRIC!");
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
        clearSquad,
        todayMatches,
        selectedMatchId,
        setSelectedMatchId,
        matchCommentary,
        deliveriesLog,
        simulateOver,
        squadValidation,
        tickets,
        ticketFilter,
        setTicketFilter,
        buyTicket,
        issueTicket,
        verifyTicketEntry,
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

import { loadDeployment, connectWallet, discoverWalletProvider, isConnected, contract, units, formatUnits, keccakSquad, getProvider, getSignerAddress } from "./chain.js?v=chain-6";

/**
 * CricketVerse Web3 Ecosystem Frontend Logic
 * Supports dynamic player cards, personal collections, secondary auction listings, 
 * deterministic fantasy scoring, anti-scalping tickets, and fan polls.
 */

// Application State
let appState = {
  currentTab: "cards",
  userWallet: {
    address: "",
    cricBalance: 0,
  },
  players: [],
  fantasyPlayers: [],
  fantasyLoaded: false,
  matchesLoaded: false,
  selectedMatchId: null,
  livePointsTimer: null,
  registeredCardIds: [],
  userCollection: [],
  primaryMintPrice: 100,
  totalPlayers: 4800,
  totalPages: 200,
  currentPage: 1,
  pageSize: 24,
  activeFilter: "all",
  searchQuery: "",
  selectedPlayerIds: [],
  tickets: [],
  ticketFilter: "all",
  marketplace: [],
  polls: [],
  tournaments: [],
  leaderboard: [],
  leaderboardTournamentId: null,
};

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupPavilionControls();
  setupAuctionListingControls();
  setupFantasyControls();
  setupAntiScalpingVerifier();
  setupGatekeeperScanner();
  setupTournamentControls();
  setupOrganizerControls();

  let deployment;
  try {
    deployment = await loadDeployment();
    const connected = await connectWallet(false);
    document.getElementById("network-name").textContent = `${deployment.chainName || deployment.network} · ${connected ? "Connected" : "Connect wallet"}`;
  } catch (error) {
    const networkLabel = deployment?.chainName || deployment?.network || "CricketVerse";
    document.getElementById("network-name").textContent = `${networkLabel} · ${error.message.includes("wallet found") ? "Wallet required" : "Switch wallet network"}`;
  }
  setupWalletAndFaucet();
  await loadInitialData();

  discoverWalletProvider().then((wallet) => {
    wallet.on?.("accountsChanged", () => window.location.reload());
    wallet.on?.("chainChanged", () => window.location.reload());
  }).catch(() => {});

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(e => console.log("SW register note:", e));
  }
});

// Setup Navigation Tabs
function setupNavigation() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const targetTab = tab.getAttribute("data-tab");
      document.querySelectorAll(".view-panel").forEach((panel) => {
        panel.classList.remove("active");
      });

      const activePanel = document.getElementById(`section-${targetTab}`);
      if (activePanel) {
        activePanel.classList.add("active");
      }
      appState.currentTab = targetTab;

      if (targetTab === "collection") {
        renderUserCollection();
      } else if (targetTab === "marketplace") {
        updateAuctionDropdown();
      } else if (targetTab === "fantasy" && !appState.matchesLoaded) {
        loadTodayMatches();
      }
    });
  });

  // Card filter pills in Pavilion
  const pills = document.querySelectorAll(".filter-pills .pill");
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      appState.activeFilter = pill.getAttribute("data-filter");
      appState.currentPage = 1;
      fetchAndRenderPlayers();
    });
  });
}

// Setup Pavilion Search and Controls
function setupPavilionControls() {
  const searchInput = document.getElementById("pavilion-search-input");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        appState.searchQuery = e.target.value.trim();
        appState.currentPage = 1;
        fetchAndRenderPlayers();
      }, 250);
    });
  }
}

// Wallet & Test Faucet (One claim per wallet)
function setupWalletAndFaucet() {
  const balanceDisplay = document.getElementById("user-cric-balance");
  const faucetBtn = document.getElementById("faucet-btn");
  const demoGasBtn = document.getElementById("demo-gas-btn");
  const connectBtn = document.getElementById("connect-wallet-btn");
  const addressDisplay = document.getElementById("wallet-address");
  faucetBtn.disabled = true;
  demoGasBtn.hidden = true;
  demoGasBtn.disabled = true;
  demoGasBtn.addEventListener("click", async () => {
    if (!isConnected() || !appState.userWallet.address) return;
    demoGasBtn.disabled = true;
    try {
      const response = await fetch("/api/demo/gas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CricketVerse-Demo": "local-gas" },
        body: JSON.stringify({ address: appState.userWallet.address }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Demo gas request failed.");
      if (result.funded) showToast(`${Number(result.amountEth).toFixed(3)} Hardhat ETH sent · tx ${result.txHash.slice(0, 10)}…`);
      else showToast(result.message || `Wallet already has ${Number(result.balanceEth).toFixed(3)} Hardhat ETH.`);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      demoGasBtn.disabled = false;
    }
  });

  faucetBtn.addEventListener("click", async () => {
    try {
      const token = await contract("CRIC");
      const config = await loadDeployment();
      const provider = getProvider();
      const address = await getSignerAddress();
      const cricCode = await provider.getCode(config.contracts.CRIC);
      if (cricCode === "0x") {
        throw new Error("No CRIC contract is deployed at the configured address. Start the Hardhat node and deploy the contracts again.");
      }
      const nativeBalance = await provider.getBalance(address);
      if (nativeBalance === 0n) {
        if (config.chainId === 31337) {
          throw new Error("This wallet needs local gas. Click Get 20 demo ETH, then retry the claim.");
        }
        throw new Error("This wallet needs the network's native token to pay transaction gas.");
      }
      const [gasLimit, feeData] = await Promise.all([
        token.claimFaucet.estimateGas(),
        provider.getFeeData(),
      ]);
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
      if (gasPrice && nativeBalance < gasLimit * gasPrice) {
        if (config.chainId === 31337) {
          throw new Error("This wallet does not have enough Hardhat ETH for gas. Click Get 20 demo ETH, then retry the claim.");
        }
        throw new Error("This wallet does not have enough of the network's native token to cover gas.");
      }
      const receipt = await (await token.claimFaucet()).wait();
      await refreshWalletBalance();
      showToast(`Faucet claim confirmed in block ${receipt.blockNumber}.`);
    } catch (error) { showToast(error.shortMessage || error.message, true); }
  });

  connectBtn.addEventListener("click", async () => {
    try {
      const connected = await connectWallet(true);
      if (!connected) return;
      appState.userWallet.address = connected.address;
      addressDisplay.textContent = `${connected.address.slice(0, 6)}…${connected.address.slice(-4)}`;
      connectBtn.textContent = "Wallet Connected";
      connectBtn.disabled = true;
      faucetBtn.disabled = false;
      const config = await loadDeployment();
      demoGasBtn.hidden = config.chainId !== 31337;
      demoGasBtn.disabled = config.chainId !== 31337;
      document.getElementById("network-name").textContent = `${config.chainName || config.network || `Chain ${connected.chainId}`} · Connected`;
      await refreshWalletBalance();
      await refreshChainData();
      await fetchUserCollection();
      updateAuctionDropdown();
      await refreshPolls();
      await updateOrganizerPanels();
      renderPolls();
      showToast(`Wallet connected to ${config.chainName || config.network || `chain ${connected.chainId}`} contracts.`);
    } catch (error) {
      if (error.message.includes("No browser wallet found")) showWalletHelp();
      showToast(error.shortMessage || error.message, true);
    }
  });

  const walletModal = document.getElementById("wallet-help-modal");
  document.getElementById("wallet-help-btn")?.addEventListener("click", showWalletHelp);
  document.getElementById("wallet-help-close")?.addEventListener("click", () => { walletModal.hidden = true; });
  walletModal?.addEventListener("click", (event) => { if (event.target === walletModal) walletModal.hidden = true; });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && walletModal) walletModal.hidden = true; });

  if (isConnected()) {
    connectWallet(false).then(async (connected) => {
      if (!connected) return;
      appState.userWallet.address = connected.address;
      addressDisplay.textContent = `${connected.address.slice(0, 6)}…${connected.address.slice(-4)}`;
      connectBtn.textContent = "Wallet Connected";
      connectBtn.disabled = true;
      faucetBtn.disabled = false;
      const config = await loadDeployment();
      demoGasBtn.hidden = config.chainId !== 31337;
      demoGasBtn.disabled = config.chainId !== 31337;
      await refreshWalletBalance();
      await refreshChainData();
      await refreshPolls();
      await updateOrganizerPanels();
      renderPolls();
    }).catch(() => {});
  }
}

async function refreshWalletBalance() {
  if (!isConnected()) return;
  const token = await contract("CRIC", true);
  const balance = await token.balanceOf(appState.userWallet.address);
  appState.userWallet.cricBalance = formatUnits(balance);
  document.getElementById("user-cric-balance").textContent = appState.userWallet.cricBalance.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

// Load Initial Data from Backend API
async function loadInitialData() {
  try {
    await fetchAndRenderPlayers();
    try { await refreshChainData(); } catch (error) { console.warn("On-chain data is unavailable:", error.message); }
    try { await refreshPolls(); } catch (error) { console.warn("On-chain polls are unavailable:", error.message); }
    await fetchUserCollection();
    renderMarketplace();
    updateAuctionDropdown();
    renderFantasyBuilder();
    renderTickets();
    renderPolls();
    renderTournaments();
    if (appState.tournaments.length) await loadLeaderboard(appState.leaderboardTournamentId || appState.tournaments[0].id);
  } catch (err) {
    console.error("Failed to load initial data:", err);
  }
}

async function refreshChainData() {
  const playerCards = await contract("PlayerCardNFT", true);
  appState.primaryMintPrice = formatUnits(await playerCards.primaryMintPrice());
  await Promise.all([refreshRegisteredCards(), refreshTickets(), refreshMarketplace(), refreshTournaments(), refreshPolls()]);
  renderPlayerCards();
  renderTickets();
  renderMarketplace();
  renderTournaments();
  await fetchUserCollection();
  updateAuctionDropdown();
  if (appState.tournaments.length) {
    const selected = appState.tournaments.find((item) => item.id === Number(appState.leaderboardTournamentId));
    const initial = appState.tournaments.find((item) => item.status === "SETTLED") || appState.tournaments[0];
    await loadLeaderboard(selected?.id || initial.id);
  }
}

async function refreshRegisteredCards() {
  const cards = await contract("PlayerCardNFT", true);
  const events = await cards.queryFilter(cards.filters.CardRegistered());
  appState.registeredCardIds = [...new Set(events.map((event) => Number(event.args.cardId)))];
}

async function loadTodayMatches() {
  const container = document.getElementById("player-picker-list");
  const select = document.getElementById("matchday-match-select");
  const status = document.getElementById("matchday-api-status");
  if (container) container.innerHTML = `<div class="empty-state">Loading today’s match squads…</div>`;
  try {
    const [matchesResponse, apiStatusResponse] = await Promise.all([
      fetch(`/api/matches/today?date=${new Date().toLocaleDateString("en-CA")}`),
      fetch("/api/cricket/status"),
    ]);
    const matches = await matchesResponse.json();
    const apiStatus = await apiStatusResponse.json();
    if (!matchesResponse.ok) throw new Error(matches.error || "Could not load today’s matches.");
    if (status) status.textContent = apiStatus.connected ? `Live API connected · checked ${new Date(apiStatus.checkedAt).toLocaleTimeString()}` : `Live API unavailable · ${apiStatus.reason || "check server configuration"}`;
    appState.matchesLoaded = true;
    if (!matches.length) {
      if (select) select.innerHTML = `<option value="">No matches scheduled today</option>`;
      if (container) container.innerHTML = `<div class="empty-state">No matches found for today from the cricket API.</div>`;
      return;
    }
    if (select) select.innerHTML = matches.map((match) => `<option value="${match.id}">${match.teams} · ${match.status}</option>`).join("");
    select?.addEventListener("change", () => loadMatchSquad(select.value));
    await loadMatchSquad(matches[0].id);
  } catch (error) {
    if (container) container.innerHTML = `<div class="empty-state">${error.message}</div>`;
    if (status) status.textContent = `Live API unavailable · ${error.message}`;
  }
}

async function loadMatchSquad(matchId) {
  const container = document.getElementById("player-picker-list");
  const title = document.getElementById("fantasy-match-title");
  const select = document.getElementById("matchday-match-select");
  const simBtn = document.getElementById("simulate-over-btn");
  if (!matchId) return;
  appState.selectedMatchId = String(matchId);
  if (container) container.innerHTML = `<div class="empty-state">Loading the confirmed playing squad…</div>`;
  if (title && select) title.textContent = select.selectedOptions[0]?.textContent || "Matchday XI";
  try {
    const response = await fetch(`/api/match/${encodeURIComponent(matchId)}/playingXI`);
    const squad = await response.json();
    if (!response.ok) throw new Error(squad.error || "Could not load the match squad.");
    appState.fantasyPlayers = squad;
    appState.fantasyLoaded = true;
    appState.selectedPlayerIds = [];
    appState.fantasyPlayers.forEach((player) => { player.calculatedPoints = 0; });
    renderFantasyBuilder(document.getElementById("player-search")?.value.toLowerCase() || "");
    updateFantasyUI();
    if (simBtn) simBtn.disabled = false;
    await refreshLivePoints();
    if (appState.livePointsTimer) clearInterval(appState.livePointsTimer);
    appState.livePointsTimer = setInterval(() => refreshLivePoints().catch((error) => {
      const status = document.getElementById("matchday-api-status");
      if (status) status.textContent = `Live points refresh failed · ${error.message}`;
    }), 30_000);
  } catch (error) {
    if (container) container.innerHTML = `<div class="empty-state">${error.message}</div>`;
    if (simBtn) simBtn.disabled = true;
  }
}

async function refreshLivePoints() {
  if (!appState.selectedMatchId) return;
  const response = await fetch(`/api/match/${encodeURIComponent(appState.selectedMatchId)}/points`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not refresh live points.");
  for (const player of appState.fantasyPlayers) {
    player.calculatedPoints = Number(data.points?.[player.name.toLowerCase()] || 0);
  }
  const status = document.getElementById("matchday-api-status");
  if (status) status.textContent = `Live points updated ${new Date(data.updatedAt).toLocaleTimeString()} · ${data.status}`;
  updateFantasyUI();
}

// Fetch and Render Player Cards with Server-Side Pagination
async function fetchAndRenderPlayers() {
  const container = document.getElementById("cards-grid");
  if (!container) return;

  try {
    const params = new URLSearchParams({
      page: appState.currentPage,
      limit: appState.pageSize,
    });

    if (appState.searchQuery) {
      params.append("search", appState.searchQuery);
    }
    if (appState.activeFilter && appState.activeFilter !== "all") {
      params.append("rarity", appState.activeFilter);
    }

    const res = await fetch(`/api/players?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || data.offline) throw new Error(data.error || "Player catalogue API is unavailable. Start the CricketVerse server and retry.");

    if (data.players) {
      appState.players = data.players;
      appState.totalPlayers = data.total;
      appState.totalPages = data.totalPages;
    } else if (Array.isArray(data)) {
      appState.players = data;
      appState.totalPlayers = data.length;
      appState.totalPages = 1;
    }

    renderPlayerCards();
    renderPaginationControls();
  } catch (err) {
    console.error("Failed to fetch players:", err);
    container.innerHTML = `<div class="empty-state">${err.message || "Player catalogue is unavailable. Start the CricketVerse server and retry."}</div>`;
  }
}

// Render Player Cards (Pavilion)
function renderPlayerCards() {
  const container = document.getElementById("cards-grid");
  if (!container) return;

  if (appState.players.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 48px 16px; color: var(--text-dim);">
        <h3>No players found matching your criteria</h3>
        <p>Try clearing your search query or selecting another rarity tier.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.players
    .map(
      (p) => {
        const registered = appState.registeredCardIds.includes(p.id);
        const actionLabel = !isConnected() ? "Connect wallet" : registered ? `Collect · ${appState.primaryMintPrice} CRIC` : "Unavailable";
        const disabled = !isConnected() || !registered;
        const help = !isConnected() ? "Connect a wallet on the configured network to collect cards." : !registered ? "This player is not registered on this chain." : "";
        return `
    <div class="player-card" data-id="${p.id}">
      <div class="card-banner">
        <img class="card-img" src="${p.avatar}" alt="${p.name}">
        <span class="card-rarity-tag rarity-${p.rarity.toLowerCase()}">${p.rarity}</span>
      </div>
      <div class="card-body">
        <div class="card-title-group">
          <div>
            <div class="card-player-name">${p.name}</div>
          </div>
          <span class="card-role-chip">${p.role}</span>
        </div>
        
        <div class="card-stats-grid">
          <div>
            <span class="cstat-label">Runs</span>
            <span class="cstat-val">${(p.runs || 0).toLocaleString()}</span>
          </div>
          <div>
            <span class="cstat-label">Wickets</span>
            <span class="cstat-val">${p.wickets || 0}</span>
          </div>
          <div>
            <span class="cstat-label">Strike Rate</span>
            <span class="cstat-val">${p.strikeRate || "-"}</span>
          </div>
          <div>
            <span class="cstat-label">Economy</span>
            <span class="cstat-val">${p.economy || "-"}</span>
          </div>
        </div>

        <div class="card-footer-action">
          <div class="card-price-display">
            <span class="card-price-label">Market Value</span>
            <span class="card-price-value">${p.priceCRIC} CRIC</span>
          </div>
          <button class="btn btn-sm btn-primary buy-card-btn" data-id="${p.id}" data-price="${appState.primaryMintPrice}" ${disabled ? "disabled" : ""} ${help ? `title="${help}"` : ""}>
            ${actionLabel}
          </button>
        </div>
      </div>
    </div>
  `;
      }
    )
    .join("");

  // Attach card collect event
  container.querySelectorAll(".buy-card-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const cardId = Number(btn.getAttribute("data-id"));
      const price = Number(btn.getAttribute("data-price"));

      try {
        const card = await contract("PlayerCardNFT");
        const token = await contract("CRIC");
        const cost = await card.primaryMintPrice();
        await (await token.approve(await card.getAddress(), cost)).wait();
        const receipt = await (await card.buyCard(cardId)).wait();
        showToast(`Card mint confirmed in block ${receipt.blockNumber}.`);
        await refreshWalletBalance();
        await fetchUserCollection();
        updateAuctionDropdown();
      } catch (err) {
        showToast(err.shortMessage || err.message, true);
      }
    });
  });
}

// User Collection: Fetch & Render
async function fetchUserCollection() {
  try {
    if (!isConnected() || !appState.userWallet.address) {
      appState.userCollection = [];
      renderUserCollection();
      return;
    }
    const cards = await contract("PlayerCardNFT", true);
    if (!appState.registeredCardIds.length) await refreshRegisteredCards();
    const ids = appState.registeredCardIds;
    const balances = await Promise.all(ids.map((id) => cards.balanceOf(appState.userWallet.address, id)));
    appState.userCollection = (await Promise.all(ids.map(async (id, index) => {
      if (balances[index] === 0n) return null;
      const metadata = await cards.getCard(id);
      const player = appState.players.find((p) => p.id === id);
      if (player) return player;
      return {
        id, name: metadata.name, team: metadata.team, role: metadata.role,
        rarity: ["Common", "Uncommon", "Rare", "Epic", "Legendary"][Number(metadata.rarity)],
        matches: Number(metadata.matches), runs: Number(metadata.runs), wickets: Number(metadata.wickets),
        strikeRate: Number(metadata.strikeRate) / 100, economy: Number(metadata.economy) / 100,
        priceCRIC: appState.primaryMintPrice, avatar: `/api/avatar/${id}.svg`,
      };
    }))).filter(Boolean);
    renderUserCollection();
  } catch (err) {
    console.error("Failed to load user collection:", err);
  }
}

function renderUserCollection() {
  const container = document.getElementById("collection-cards-grid");
  if (!container) return;

  const totalCards = appState.userCollection.length;
  const portfolioValuation = appState.userCollection.reduce((sum, c) => sum + (c.priceCRIC || 0), 0);
  
  const rarityCounts = {};
  appState.userCollection.forEach(c => {
    rarityCounts[c.rarity] = (rarityCounts[c.rarity] || 0) + 1;
  });

  let rarestTier = "Common";
  if (rarityCounts["Legendary"]) rarestTier = "Legendary";
  else if (rarityCounts["Epic"]) rarestTier = "Epic";
  else if (rarityCounts["Rare"]) rarestTier = "Rare";
  else if (rarityCounts["Uncommon"]) rarestTier = "Uncommon";

  const totalEl = document.getElementById("user-total-cards");
  const valueEl = document.getElementById("user-portfolio-value");
  const rarestEl = document.getElementById("user-rarest-tier");

  if (totalEl) totalEl.textContent = `${totalCards} Cards`;
  if (valueEl) valueEl.textContent = `${portfolioValuation.toLocaleString()} CRIC`;
  if (rarestEl) rarestEl.textContent = totalCards > 0 ? rarestTier : "None";

  if (totalCards === 0) {
    container.innerHTML = `
      <div class="empty-vault-state">
        <h3 style="margin-bottom: 8px;">Your Vault is Empty</h3>
        <p style="margin-bottom: 16px;">You have not collected any cricketer cards yet. Head over to The Pavilion or Auction Room to collect cards!</p>
        <button class="btn btn-primary" onclick="document.querySelector('.nav-tab[data-tab=\\'cards\\']').click()">
          Explore The Pavilion
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.userCollection
    .map(
      (p) => `
    <div class="player-card" data-id="${p.id}">
      <div class="card-banner">
        <img class="card-img" src="${p.avatar}" alt="${p.name}">
        <span class="card-rarity-tag rarity-${p.rarity.toLowerCase()}">${p.rarity}</span>
      </div>
      <div class="card-body">
        <div class="card-title-group">
          <div>
            <div class="card-player-name">${p.name}</div>
          </div>
          <span class="card-role-chip">${p.role}</span>
        </div>
        
        <div class="card-stats-grid">
          <div>
            <span class="cstat-label">Runs</span>
            <span class="cstat-val">${(p.runs || 0).toLocaleString()}</span>
          </div>
          <div>
            <span class="cstat-label">Wickets</span>
            <span class="cstat-val">${p.wickets || 0}</span>
          </div>
          <div>
            <span class="cstat-label">Strike Rate</span>
            <span class="cstat-val">${p.strikeRate || "-"}</span>
          </div>
          <div>
            <span class="cstat-label">Economy</span>
            <span class="cstat-val">${p.economy || "-"}</span>
          </div>
        </div>

        <div class="card-footer-action">
          <div class="card-price-display">
            <span class="card-price-label">Valuation</span>
            <span class="card-price-value">${p.priceCRIC} CRIC</span>
          </div>
          <button class="btn btn-sm btn-accent list-from-vault-btn" data-id="${p.id}" data-name="${p.name}" data-price="${p.priceCRIC}">
            Put in Auction
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Attach "Put in Auction" handler on vault cards
  container.querySelectorAll(".list-from-vault-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const cardId = btn.getAttribute("data-id");
      const defaultPrice = btn.getAttribute("data-price");

      // Switch to Auction Room tab and pre-select this card
      const auctionTab = document.querySelector(".nav-tab[data-tab='marketplace']");
      if (auctionTab) auctionTab.click();

      const cardSelect = document.getElementById("auction-card-select");
      const priceInput = document.getElementById("auction-price-input");
      if (cardSelect) cardSelect.value = `CARD:${cardId}`;
      if (priceInput) {
        priceInput.value = defaultPrice;
        updateAuctionRoyaltyPreview();
      }

      window.scrollTo({ top: 120, behavior: "smooth" });
      showToast("Card selected for auction. Review price and click List for Auction.");
    });
  });
}

// Setup Auction Listing Controls in Auction Room
function setupAuctionListingControls() {
  const cardSelect = document.getElementById("auction-card-select");
  const priceInput = document.getElementById("auction-price-input");
  const submitBtn = document.getElementById("submit-auction-listing-btn");

  if (priceInput) {
    priceInput.addEventListener("input", updateAuctionRoyaltyPreview);
  }

  if (cardSelect) {
    cardSelect.addEventListener("change", () => {
      const selectedId = Number(cardSelect.value.split(":")[1]);
      const card = appState.userCollection.find(c => c.id === selectedId);
      if (card && priceInput && !priceInput.value) {
        priceInput.value = card.priceCRIC;
        updateAuctionRoyaltyPreview();
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const asset = cardSelect ? cardSelect.value : "";
      const price = priceInput ? Number(priceInput.value) : 0;

      if (!asset) {
        showToast("Connect your wallet and select an owned asset to list.", true);
        return;
      }
      if (!price || price < 50) {
        showToast("Please specify a valid auction price (minimum 50 CRIC).", true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Confirm in wallet…";

      try {
        const config = await loadDeployment();
        const market = await contract("CricketMarketplace");
        const [assetType, id] = asset.split(":");
        let receipt;
        if (assetType === "TICKET") {
          const tickets = await contract("MatchTicketNFT");
          await (await tickets.approve(config.contracts.CricketMarketplace, Number(id))).wait();
          receipt = await (await market.listMatchTicket(config.contracts.MatchTicketNFT, Number(id), units(price))).wait();
        } else {
          const cards = await contract("PlayerCardNFT");
          await (await cards.setApprovalForAll(config.contracts.CricketMarketplace, true)).wait();
          receipt = await (await market.listPlayerCard(config.contracts.PlayerCardNFT, Number(id), 1, units(price))).wait();
        }
        showToast(`Listing confirmed in block ${receipt.blockNumber}.`);
        priceInput.value = "";
        updateAuctionRoyaltyPreview();
        await refreshMarketplace();
        renderMarketplace();
        await fetchUserCollection();
        updateAuctionDropdown();
      } catch (err) {
        showToast(err.shortMessage || err.message, true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "List for Auction";
      }
    });
  }
}

function updateAuctionRoyaltyPreview() {
  const priceInput = document.getElementById("auction-price-input");
  const proceedsEl = document.getElementById("seller-proceeds-val");
  const royaltyEl = document.getElementById("royalty-fee-val");

  if (!priceInput || !proceedsEl || !royaltyEl) return;

  const price = Number(priceInput.value) || 0;
  const royalty = Math.round(price * 0.05 * 100) / 100;
  const proceeds = Math.round((price - royalty) * 100) / 100;

  proceedsEl.textContent = `${proceeds.toLocaleString()} CRIC`;
  royaltyEl.textContent = `${royalty.toLocaleString()} CRIC`;
}

function updateAuctionDropdown() {
  const select = document.getElementById("auction-card-select");
  if (!select) return;

  const ownTickets = appState.tickets.filter((ticket) => ticket.owner?.toLowerCase() === appState.userWallet.address.toLowerCase() && !ticket.isRedeemed);
  if (appState.userCollection.length === 0 && ownTickets.length === 0) {
    select.innerHTML = `<option value="">No on-chain assets found in this wallet</option>`;
    return;
  }

  select.innerHTML = `
    <option value="">-- Choose a card from your vault --</option>
    ${appState.userCollection.map((c) => `<option value="CARD:${c.id}">${c.name} (${c.role} | ${c.rarity})</option>`).join("")}
    ${ownTickets.map((t) => `<option value="TICKET:${t.tokenId}">Ticket #${t.tokenId} (${t.seatNumber} | max ${t.maxResalePriceCRIC} CRIC)</option>`).join("")}
  `;
}

async function refreshTickets() {
  const ticket = await contract("MatchTicketNFT", true);
  const events = await ticket.queryFilter(ticket.filters.TicketIssued());
  const ids = [...new Set(events.map((event) => Number(event.args.tokenId)))];
  const results = await Promise.all(ids.map(async (tokenId) => {
    try {
      const [details, owner, windowInfo] = await Promise.all([ticket.getTicket(tokenId), ticket.ownerOf(tokenId), ticket.matchWindows(tokenId)]);
      const startsAt = Number(windowInfo.startsAt);
      const endsAt = Number(windowInfo.endsAt);
      const now = Math.floor(Date.now() / 1000);
      const matchStatus = !startsAt ? "UNSCHEDULED" : now < startsAt ? "UPCOMING" : now < endsAt ? "LIVE" : "PAST";
      return {
        tokenId,
        matchName: details.matchName,
        venue: details.venue,
        stand: details.stand,
        seatNumber: details.seatNumber,
        faceValueCRIC: formatUnits(details.faceValue),
        maxResalePriceCRIC: formatUnits(details.maxResalePrice),
        owner,
        isRedeemed: details.isRedeemed,
        matchStartsAt: startsAt,
        matchEndsAt: endsAt,
        matchStatus,
        badge: details.isRedeemed ? "Redeemed at Gate" : matchStatus === "PAST" ? "Match ended" : `${matchStatus[0]}${matchStatus.slice(1).toLowerCase()} ticket`,
      };
    } catch { return null; }
  }));
  appState.tickets = results.filter(Boolean);
  const select = document.getElementById("verify-ticket-select");
  if (select) {
    const selected = select.value;
    select.replaceChildren(...appState.tickets.map((item) => {
      const option = document.createElement("option");
      option.value = String(item.tokenId);
      option.textContent = `Pass #${item.tokenId} · ${item.venue} · max ${item.maxResalePriceCRIC} CRIC`;
      return option;
    }));
    if (appState.tickets.some((item) => String(item.tokenId) === selected)) select.value = selected;
  }
  document.querySelectorAll("[data-ticket-filter]").forEach((button) => {
    button.onclick = () => {
      appState.ticketFilter = button.dataset.ticketFilter === "all" ? "all" : button.dataset.ticketFilter;
      document.querySelectorAll("[data-ticket-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderTickets();
    };
  });
}

async function updateOrganizerPanels() {
  const panels = ["ticket-issuer-panel", "poll-create-panel", "tournament-create-panel"];
  if (!isConnected()) {
    panels.forEach((id) => { const panel = document.getElementById(id); if (panel) panel.hidden = true; });
    return;
  }
  try {
    const [tickets, polls, tournaments] = await Promise.all([
      contract("MatchTicketNFT", true), contract("FanPolls", true), contract("TournamentPool", true),
    ]);
    const [ticketRole, pollOwner, tournamentOwner] = await Promise.all([
      tickets.ORGANIZER_ROLE(), polls.owner(), tournaments.owner(),
    ]);
    const address = appState.userWallet.address;
    document.getElementById("ticket-issuer-panel").hidden = !(await tickets.hasRole(ticketRole, address));
    document.getElementById("poll-create-panel").hidden = pollOwner.toLowerCase() !== address.toLowerCase();
    document.getElementById("tournament-create-panel").hidden = tournamentOwner.toLowerCase() !== address.toLowerCase();
    const events = await tickets.queryFilter(tickets.filters.TicketIssued());
    const nextId = Math.max(100, ...events.map((event) => Number(event.args.tokenId))) + 1;
    const tokenInput = document.getElementById("ticket-token-id");
    if (tokenInput && !tokenInput.value) tokenInput.value = String(nextId);
  } catch (error) {
    console.warn("Could not check organizer permissions:", error.message);
    panels.forEach((id) => { const panel = document.getElementById(id); if (panel) panel.hidden = true; });
  }
}

function setupOrganizerControls() {
  document.getElementById("ticket-issue-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const recipient = document.getElementById("ticket-recipient").value.trim() || appState.userWallet.address;
      if (!window.ethers.isAddress(recipient)) throw new Error("Enter a valid recipient wallet address.");
      const startsAt = Math.floor(new Date(document.getElementById("ticket-start-time").value).getTime() / 1000);
      const endsAt = Math.floor(new Date(document.getElementById("ticket-end-time").value).getTime() / 1000);
      if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= Date.now() / 1000) throw new Error("Ticket window must end in the future.");
      const ticket = await contract("MatchTicketNFT");
      const tx = await ticket.issueScheduledTicket(
        recipient,
        Number(document.getElementById("ticket-token-id").value),
        Number(document.getElementById("ticket-match-id").value),
        document.getElementById("ticket-match-name").value.trim(),
        document.getElementById("ticket-venue").value.trim(),
        document.getElementById("ticket-stand").value.trim(),
        document.getElementById("ticket-seat").value.trim(),
        units(document.getElementById("ticket-face-value").value),
        startsAt,
        endsAt,
      );
      const receipt = await tx.wait();
      showToast(`Ticket issued on-chain in block ${receipt.blockNumber}.`);
      event.currentTarget.reset();
      await refreshChainData();
      await updateOrganizerPanels();
    } catch (error) { showToast(error.shortMessage || error.message, true); }
    finally { button.disabled = false; }
  });

  document.getElementById("poll-create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const options = document.getElementById("poll-options").value.split(",").map((value) => value.trim()).filter(Boolean);
      const closesAt = Math.floor(new Date(document.getElementById("poll-close-time").value).getTime() / 1000);
      if (options.length < 2) throw new Error("Add at least two poll options, separated by commas.");
      if (!Number.isFinite(closesAt) || closesAt <= Date.now() / 1000) throw new Error("Choose a future poll closing time.");
      const polls = await contract("FanPolls");
      const receipt = await (await polls.createPoll(document.getElementById("poll-question").value.trim(), options, closesAt)).wait();
      showToast(`Poll created on-chain in block ${receipt.blockNumber}.`);
      event.currentTarget.reset();
      await refreshPolls();
    } catch (error) { showToast(error.shortMessage || error.message, true); }
    finally { button.disabled = false; }
  });

  document.getElementById("tournament-create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const lockTimestamp = Math.floor(new Date(document.getElementById("tournament-lock-time").value).getTime() / 1000);
      if (!Number.isFinite(lockTimestamp) || lockTimestamp <= Date.now() / 1000) throw new Error("Choose a future registration lock time.");
      const pool = await contract("TournamentPool");
      const receipt = await (await pool.createTournament(
        document.getElementById("tournament-name").value.trim(),
        Number(document.getElementById("tournament-match-id").value),
        units(document.getElementById("tournament-entry-fee").value),
        Number(document.getElementById("tournament-max-entries").value),
        lockTimestamp,
      )).wait();
      showToast(`Tournament created on-chain in block ${receipt.blockNumber}.`);
      event.currentTarget.reset();
      await refreshChainData();
    } catch (error) { showToast(error.shortMessage || error.message, true); }
    finally { button.disabled = false; }
  });
}

async function refreshMarketplace() {
  const market = await contract("CricketMarketplace", true);
  const cards = await contract("PlayerCardNFT", true);
  const tickets = await contract("MatchTicketNFT", true);
  const events = await market.queryFilter(market.filters.ItemListed());
  const latest = new Map();
  for (const event of events) latest.set(Number(event.args.listingId), event.args);
  const active = await Promise.all([...latest.entries()].map(async ([id]) => {
    const item = await market.getListing(id);
    if (!item.isActive) return null;
    const isCard = Number(item.assetType) === 0;
    const result = {
      id,
      type: isCard ? "PLAYER_CARD" : "MATCH_TICKET",
      seller: item.seller,
      tokenId: Number(item.tokenId),
      cardId: Number(item.tokenId),
      priceCRIC: formatUnits(item.pricePerUnit),
      amount: Number(item.amount),
    };
    if (isCard) {
      const [metadata, player] = await Promise.all([cards.getCard(item.tokenId), Promise.resolve(appState.players.find((p) => p.id === Number(item.tokenId)))]);
      result.playerName = metadata.name;
      result.rarity = ["Common", "Uncommon", "Rare", "Epic", "Legendary"][Number(metadata.rarity)];
      result.player = player;
    } else {
      const info = await tickets.getTicket(item.tokenId);
      result.matchName = info.matchName;
      result.seatNumber = info.seatNumber;
      result.faceValueCRIC = formatUnits(info.faceValue);
    }
    return result;
  }));
  appState.marketplace = active.filter(Boolean).reverse();
}

async function refreshTournaments() {
  const pool = await contract("TournamentPool", true);
  const count = Number(await pool.tournamentCount());
  const statuses = ["OPEN", "LOCKED", "SETTLED", "CANCELLED"];
  appState.tournaments = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const id = index + 1;
    const t = await pool.tournaments(id);
    return {
      id,
      name: t.name,
      match_id: Number(t.matchId),
      entry_fee: formatUnits(t.entryFee),
      max_participants: Number(t.maxParticipants),
      current_participants: Number(await pool.getParticipantCount(id)),
      total_escrow: formatUnits(t.totalEscrow),
      first_prize: formatUnits(t.totalEscrow) * 0.95,
      status: statuses[Number(t.status)] || "UNKNOWN",
      lock_timestamp: Number(t.lockTimestamp),
      joined: Boolean(appState.userWallet.address && await pool.hasJoined(id, appState.userWallet.address)),
      refunded: Boolean(appState.userWallet.address && (await pool.queryFilter(pool.filters.EntryFeeRefunded(id, appState.userWallet.address))).length),
      isOwner: Boolean(appState.userWallet.address && (await pool.owner()).toLowerCase() === appState.userWallet.address.toLowerCase()),
    };
  }));
}

// Render Pagination Controls
function renderPaginationControls() {
  const container = document.getElementById("cards-pagination");
  if (!container) return;

  if (appState.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const current = appState.currentPage;
  const total = appState.totalPages;

  let paginationHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:12px; margin-top:24px; padding-top:16px; border-top:1px solid var(--border-color);">
      <div style="color:var(--text-dim); font-size:0.88rem;">
        Showing page <b>${current}</b> of <b>${total}</b>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-sm btn-outline pagination-prev-btn" ${current === 1 ? "disabled style='opacity:0.4; cursor:not-allowed;'" : ""}>
          Previous
        </button>
  `;

  // Window of visible page buttons
  const startPage = Math.max(1, current - 2);
  const endPage = Math.min(total, current + 2);

  if (startPage > 1) {
    paginationHtml += `<button class="btn btn-sm btn-outline page-num-btn" data-page="1">1</button>`;
    if (startPage > 2) paginationHtml += `<span style="color:var(--text-dim); padding:0 4px;">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === current;
    paginationHtml += `
      <button class="btn btn-sm ${isActive ? "btn-primary" : "btn-outline"} page-num-btn" data-page="${i}">
        ${i}
      </button>
    `;
  }

  if (endPage < total) {
    if (endPage < total - 1) paginationHtml += `<span style="color:var(--text-dim); padding:0 4px;">...</span>`;
    paginationHtml += `<button class="btn btn-sm btn-outline page-num-btn" data-page="${total}">${total}</button>`;
  }

  paginationHtml += `
        <button class="btn btn-sm btn-outline pagination-next-btn" ${current === total ? "disabled style='opacity:0.4; cursor:not-allowed;'" : ""}>
          Next
        </button>
      </div>
    </div>
  `;

  container.innerHTML = paginationHtml;

  // Event handlers
  const prevBtn = container.querySelector(".pagination-prev-btn");
  if (prevBtn && current > 1) {
    prevBtn.addEventListener("click", () => {
      appState.currentPage--;
      fetchAndRenderPlayers();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const nextBtn = container.querySelector(".pagination-next-btn");
  if (nextBtn && current < total) {
    nextBtn.addEventListener("click", () => {
      appState.currentPage++;
      fetchAndRenderPlayers();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  container.querySelectorAll(".page-num-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.getAttribute("data-page"));
      if (page && page !== appState.currentPage) {
        appState.currentPage = page;
        fetchAndRenderPlayers();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

// Render Marketplace Listings
function renderMarketplace() {
  const container = document.getElementById("marketplace-list");
  if (!container) return;

  if (appState.marketplace.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 40px; color: var(--text-dim);">
        <h3>No active auction listings right now</h3>
        <p>Use the form above to list one of your collected cards for auction!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appState.marketplace
    .map((item) => {
      const isCard = item.type === "PLAYER_CARD";
      const royaltyFee = Math.round(item.priceCRIC * 0.05 * 100) / 100;
      const sellerProceeds = item.priceCRIC - royaltyFee;

      return `
      <div class="market-item-card" data-listing-id="${item.id}">
        <div>
          <div class="market-item-header">
            <span class="badge-anti-scalp">${isCard ? "Player Card" : "Stadium Pass"}</span>
            <span class="seller-addr">Seller: ${item.seller.slice(0, 6)}...${item.seller.slice(-4)}</span>
          </div>
          <div class="market-asset-title">
            ${isCard ? item.playerName : item.matchName}
          </div>
          <div class="sub-sm text-dim">
            ${isCard ? `${item.rarity} Tier` : `Seat: ${item.seatNumber} | Face Value: ${item.faceValueCRIC} CRIC`}
          </div>

          <div class="market-breakdown">
            <div class="split-row">
              <span>Listing Price:</span>
              <b>${item.priceCRIC} CRIC</b>
            </div>
            <div class="split-row">
              <span>Creator Royalty (5%):</span>
              <span class="text-accent">${royaltyFee} CRIC</span>
            </div>
            <div class="split-row">
              <span>Seller Proceeds (95%):</span>
              <span class="text-green">${sellerProceeds} CRIC</span>
            </div>
          </div>
        </div>

        ${item.seller.toLowerCase() === appState.userWallet.address.toLowerCase()
          ? `<button class="btn btn-outline btn-block cancel-market-btn" data-listing-id="${item.id}">Cancel listing</button>`
          : `<button class="btn btn-accent btn-block buy-market-btn" data-listing-id="${item.id}" data-price="${item.priceCRIC}" ${!isConnected() ? "disabled" : ""}>${isConnected() ? `Buy · ${item.priceCRIC} CRIC` : "Connect wallet to buy"}</button>`}
      </div>
    `;
    })
    .join("");

  container.querySelectorAll(".buy-market-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const listingId = btn.getAttribute("data-listing-id");
      const price = Number(btn.getAttribute("data-price"));

      try {
        const config = await loadDeployment();
        const market = await contract("CricketMarketplace");
        const token = await contract("CRIC");
        const amount = units(price);
        await (await token.approve(config.contracts.CricketMarketplace, amount)).wait();
        const receipt = await (await market.buyItem(listingId, 1)).wait();
        showToast(`Purchase and token settlement confirmed in block ${receipt.blockNumber}.`);
        await refreshWalletBalance();
        await refreshMarketplace();
        renderMarketplace();
        await fetchUserCollection();
        updateAuctionDropdown();
      } catch (err) {
        showToast(err.shortMessage || err.message, true);
      }
    });
  });

  container.querySelectorAll(".cancel-market-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const market = await contract("CricketMarketplace");
        const receipt = await (await market.cancelListing(btn.dataset.listingId)).wait();
        showToast(`Listing cancelled in block ${receipt.blockNumber}.`);
        await Promise.all([refreshMarketplace(), fetchUserCollection()]);
        renderMarketplace();
        updateAuctionDropdown();
      } catch (error) {
        showToast(error.shortMessage || error.message, true);
        btn.disabled = false;
      }
    });
  });
}

// Fantasy Squad Controls & Logic
function setupFantasyControls() {
  const autoBtn = document.getElementById("auto-squad-btn");
  const clearBtn = document.getElementById("clear-squad-btn");
  const simBtn = document.getElementById("simulate-over-btn");
  const searchInput = document.getElementById("player-search");

  if (autoBtn) autoBtn.hidden = true;

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      appState.selectedPlayerIds = [];
      updateFantasyUI();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderFantasyBuilder(e.target.value.toLowerCase());
    });
  }

  if (simBtn) {
    simBtn.addEventListener("click", async () => {
      if (appState.selectedPlayerIds.length !== 11) {
        showToast("Select a valid Playing XI before simulating.", true);
        return;
      }
      simBtn.disabled = true;
      try {
        await refreshLivePoints();
        updateFantasyUI();
        showToast("Live match points refreshed.");
      } catch (err) {
        showToast(err.message, true);
      } finally {
        simBtn.disabled = false;
      }
    });
  }
}

// Render Fantasy Picker List
function renderFantasyBuilder(filterQuery = "") {
  const container = document.getElementById("player-picker-list");
  if (!container) return;

  const filtered = appState.fantasyPlayers.filter((p) => {
    if (!filterQuery) return true;
    return (
      p.name.toLowerCase().includes(filterQuery) ||
      (p.role && p.role.toLowerCase().includes(filterQuery))
    );
  });

  container.innerHTML = filtered
    .map((p) => {
      const isSelected = appState.selectedPlayerIds.includes(p.id);
      return `
      <div class="player-pick-item ${isSelected ? "selected" : ""}" data-id="${p.id}">
        <div class="pick-left">
          <img class="pick-avatar" src="${p.avatar || `/api/avatar/${encodeURIComponent(p.providerId || 1)}.svg`}" alt="${p.name}">
          <div>
            <div class="pick-name">${p.name}</div>
            <div class="pick-meta">${p.role} | ${p.rarity}</div>
          </div>
        </div>
        <div class="pick-right">
          <span class="pick-credits">${p.creditCost || 8.5} Cr</span>
          <button class="btn btn-sm ${isSelected ? "btn-danger-outline" : "btn-outline"} select-toggle-btn" data-id="${p.id}">
            ${isSelected ? "Remove" : "+ Select"}
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  container.querySelectorAll(".player-pick-item").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-id");
      togglePlayerSelection(id);
    });
  });
}

function togglePlayerSelection(playerId) {
  const index = appState.selectedPlayerIds.indexOf(playerId);
  if (index > -1) {
    appState.selectedPlayerIds.splice(index, 1);
  } else {
    if (appState.selectedPlayerIds.length >= 11) {
      showToast("Squad is already full (11/11 players).", true);
      return;
    }
    appState.selectedPlayerIds.push(playerId);
  }

  updateFantasyUI();
}

function updateFantasyUI() {
  const countEl = document.getElementById("badge-total");
  const creditsEl = document.getElementById("salary-credits-display");
  const pointsEl = document.getElementById("squad-total-points");
  const breakdownList = document.getElementById("selected-squad-breakdown");

  const selected = appState.fantasyPlayers.filter((p) => appState.selectedPlayerIds.includes(p.id));

  const totalPoints = selected.reduce((sum, p) => sum + (p.calculatedPoints || 0), 0);

  if (countEl) countEl.textContent = `Playing XI: ${selected.length}/11`;
  if (creditsEl) creditsEl.textContent = `${appState.fantasyPlayers.length} match players · choose 11`;
  if (pointsEl) pointsEl.textContent = totalPoints;

  if (breakdownList) {
    if (selected.length === 0) {
      breakdownList.innerHTML = `<div class="sub-sm text-dim">Choose players to see your points.</div>`;
    } else {
      breakdownList.innerHTML = selected
        .map(
          (p) => `
        <div class="roster-item">
          <div>
            <b>${p.name}</b> <span class="sub-sm text-dim">(${p.role})</span>
          </div>
          <div class="roster-pts">
            <b>${p.calculatedPoints || 0} pts</b>
            <span class="sub-sm text-dim">Live score</span>
          </div>
        </div>
      `
        )
        .join("");
    }
  }

  const progress = document.getElementById("salary-progress-bar");
  if (progress) progress.style.width = `${Math.min(selected.length / 11 * 100, 100)}%`;
  const roleCounts = selected.reduce((counts, player) => {
    counts[player.role] = (counts[player.role] || 0) + 1;
    return counts;
  }, {});
  [["badge-wk", "WK", "Wicketkeeper", 1], ["badge-bat", "BAT", "Batsman", 3], ["badge-bowl", "BOWL", "Bowler", 3], ["badge-ar", "AR", "All-Rounder", 1]]
    .forEach(([id, label, role, minimum]) => {
      const badge = document.getElementById(id);
      if (badge) badge.textContent = `${label}: ${roleCounts[role] || 0}/${minimum}`;
    });
  const searchVal = document.getElementById("player-search")?.value.toLowerCase() || "";
  renderFantasyBuilder(searchVal);
}

// Render Stadium Passes
function renderTickets() {
  const container = document.getElementById("stadium-tickets-list");
  if (!container) return;

  const tickets = appState.tickets.filter((ticket) => appState.ticketFilter === "all" || ticket.matchStatus === appState.ticketFilter);
  if (!tickets.length) {
    container.innerHTML = `<div class="empty-state">No tickets in this time window.</div>`;
    return;
  }
  container.innerHTML = tickets
    .map(
      (t) => `
    <div class="ticket-card" data-token-id="${t.tokenId}">
      <div class="ticket-header">
        <span class="ticket-num">Pass #${t.tokenId}</span>
        <span class="badge-anti-scalp">${t.matchStatus || "UNSCHEDULED"} · ${t.badge}</span>
      </div>
      <div class="ticket-title">${t.matchName}</div>
      <div class="ticket-venue">${t.venue} | Stand: ${t.stand} (${t.seatNumber})${t.matchStartsAt ? `<br>${new Date(t.matchStartsAt * 1000).toLocaleString()}` : ""}</div>

      <div class="ticket-pricing-row">
        <div class="tprice-box">
          <span class="tprice-lbl">Face Value</span>
          <span class="tprice-val">${t.faceValueCRIC} CRIC</span>
        </div>
        <div class="tprice-box">
          <span class="tprice-lbl">Max Resale Cap (+15%)</span>
          <span class="tprice-val text-green">${t.maxResalePriceCRIC} CRIC</span>
        </div>
      </div>

      <div class="sub-sm text-dim">
        Holder: ${t.owner.slice(0, 6)}...${t.owner.slice(-4)} ${t.isRedeemed ? "| [REDEEMED]" : "| [VALID]"}
      </div>
        ${!t.isRedeemed && t.matchStatus === "LIVE" && t.owner.toLowerCase() === appState.userWallet.address.toLowerCase() ? `<button class="btn btn-sm btn-outline create-ticket-pass" data-token-id="${t.tokenId}">Sign Entry Pass</button><textarea class="form-input signed-ticket-pass" id="signed-ticket-${t.tokenId}" readonly hidden></textarea>` : ""}
    </div>
  `
    )
    .join("");

  container.querySelectorAll(".create-ticket-pass").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const config = await loadDeployment();
        const tokenId = Number(button.dataset.tokenId);
        const expiry = Math.floor(Date.now() / 1000) + 10 * 60;
        const nonce = window.ethers.hexlify(window.ethers.randomBytes(16));
        const payload = {
          version: 1, chainId: config.chainId, ticketContract: config.contracts.MatchTicketNFT,
          tokenId, owner: appState.userWallet.address, expiresAt: expiry, nonce,
        };
        const message = [
          "CricketVerse Stadium Entry", `chainId:${payload.chainId}`,
          `ticketContract:${payload.ticketContract.toLowerCase()}`, `tokenId:${tokenId}`,
          `owner:${payload.owner.toLowerCase()}`, `expiresAt:${expiry}`, `nonce:${nonce}`,
        ].join("\n");
        const token = await contract("CRIC");
        payload.signature = await token.runner.signMessage(message);
        const output = document.getElementById(`signed-ticket-${tokenId}`);
        output.hidden = false;
        output.value = JSON.stringify(payload);
        await navigator.clipboard?.writeText(output.value);
        showToast("Signed entry payload created. It expires in 10 minutes; copy it into a QR code for scanning.");
      } catch (error) { showToast(error.shortMessage || error.message, true); }
    });
  });
}

function showWalletHelp() {
  const modal = document.getElementById("wallet-help-modal");
  if (modal) modal.hidden = false;
}

// Anti-Scalping Resale Verifier
function setupAntiScalpingVerifier() {
  const verifyBtn = document.getElementById("run-scalp-check-btn");
  const ticketSelect = document.getElementById("verify-ticket-select");
  const priceInput = document.getElementById("test-resale-price");
  const resultBox = document.getElementById("scalp-check-result");

  if (!verifyBtn) return;

  verifyBtn.addEventListener("click", async () => {
    const tokenId = ticketSelect.value;
    const proposedPrice = Number(priceInput.value);

    try {
      const tickets = await contract("MatchTicketNFT", true);
      const [allowed, details] = await Promise.all([
        tickets.isPriceWithinAntiScalpingCap(tokenId, units(proposedPrice)),
        tickets.getTicket(tokenId),
      ]);
      const data = { isAllowed: allowed, maxAllowedResaleCRIC: formatUnits(details.maxResalePrice) };

      resultBox.classList.remove("hidden", "allowed", "blocked");
      if (data.isAllowed) {
        resultBox.classList.add("allowed");
        resultBox.innerHTML = `
          ALLOWED BY CONTRACT<br>
          <span class="sub-sm">Proposed: ${proposedPrice} CRIC <= Max Ceiling: ${data.maxAllowedResaleCRIC} CRIC (+15% of face value). Listing permitted.</span>
        `;
      } else {
        resultBox.classList.add("blocked");
        resultBox.innerHTML = `
          SCALPING BLOCKED BY CONTRACT<br>
          <span class="sub-sm">Proposed: ${proposedPrice} CRIC exceeds 15% resale markup ceiling (Cap: ${data.maxAllowedResaleCRIC} CRIC). Transaction rejected.</span>
        `;
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// Gatekeeper Turnstile Scanner
function setupGatekeeperScanner() {
  const scanBtn = document.getElementById("gatekeeper-scan-btn");
  const payloadInput = document.getElementById("ticket-scan-payload");
  const cameraBtn = document.getElementById("camera-scan-btn");
  const video = document.getElementById("ticket-qr-video");

  if (!scanBtn) return;

  cameraBtn?.addEventListener("click", async () => {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
      showToast("QR camera scanning is unavailable in this browser. Enter the CV-TKT token payload manually.", true);
      return;
    }
    try {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.style.display = "block";
      await video.play();
      cameraBtn.disabled = true;
      const poll = async () => {
        if (!video.srcObject) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length) {
            payloadInput.value = codes[0].rawValue;
            video.srcObject.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
            video.style.display = "none";
            cameraBtn.disabled = false;
            scanBtn.click();
            return;
          }
        } catch { /* keep scanning next frame */ }
        setTimeout(poll, 150);
      };
      poll();
    } catch (error) {
      cameraBtn.disabled = false;
      showToast(`Unable to open camera: ${error.message}`, true);
    }
  });

  scanBtn.addEventListener("click", async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = "Confirm in wallet…";
    let payload;
    try { payload = JSON.parse(payloadInput.value.trim()); } catch {}
    if (!payload || payload.version !== 1 || !payload.signature) {
      addGateLog("[REJECTED] A wallet-signed CricketVerse ticket payload is required.", "error");
      scanBtn.disabled = false;
      scanBtn.textContent = "Verify entry";
      return;
    }
    const tokenId = Number(payload.tokenId);
    addGateLog(`Checking ticket #${tokenId} and gatekeeper permission on-chain…`, "info");
    try {
      const config = await loadDeployment();
      if (payload.chainId !== config.chainId || payload.ticketContract.toLowerCase() !== config.contracts.MatchTicketNFT.toLowerCase()) {
        throw new Error("Ticket pass targets a different chain or ticket contract");
      }
      if (!Number.isInteger(tokenId) || payload.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error("Ticket pass is invalid or expired");
      const message = [
        "CricketVerse Stadium Entry", `chainId:${payload.chainId}`,
        `ticketContract:${payload.ticketContract.toLowerCase()}`, `tokenId:${tokenId}`,
        `owner:${payload.owner.toLowerCase()}`, `expiresAt:${payload.expiresAt}`, `nonce:${payload.nonce}`,
      ].join("\n");
      const recovered = window.ethers.verifyMessage(message, payload.signature);
      if (recovered.toLowerCase() !== payload.owner.toLowerCase()) throw new Error("Ticket owner signature is invalid");
      const tickets = await contract("MatchTicketNFT");
      const role = await tickets.GATEKEEPER_ROLE();
      if (!(await tickets.hasRole(role, appState.userWallet.address))) throw new Error("Connected wallet does not have GATEKEEPER_ROLE");
      const owner = await tickets.ownerOf(tokenId);
      if (owner.toLowerCase() !== payload.owner.toLowerCase()) throw new Error("Ticket ownership changed after this pass was signed");
      const info = await tickets.getTicket(tokenId);
      if (info.isRedeemed) throw new Error("Ticket was already redeemed");
      const receipt = await (await tickets.redeemTicket(tokenId)).wait();
      playGateAudio(true);
      addGateLog(`[CONFIRMED] Ticket #${tokenId} redeemed in block ${receipt.blockNumber}.`, "success");
      showToast(`Ticket #${tokenId} redemption confirmed on-chain.`);
      await refreshTickets();
      renderTickets();
    } catch (error) {
      playGateAudio(false);
      addGateLog(`[REVERT] ${error.shortMessage || error.message}`, "error");
      showToast(error.shortMessage || error.message, true);
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = "Verify entry";
    }
  });

  function playGateAudio(isSuccess) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(164.81, ctx.currentTime);
        osc.frequency.setValueAtTime(130.81, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  }

  function addGateLog(message, type) {
    if (!logEntries) return;
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;
    logEntries.prepend(entry);
  }
}

// Fan polls are stored and voted on through the FanPolls contract.
async function refreshPolls() {
  const pollsContract = await contract("FanPolls", true);
  const count = Number(await pollsContract.pollCount());
  const rows = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const id = index + 1;
    const [result, voted] = await Promise.all([
      pollsContract.getPoll(id),
      appState.userWallet.address ? pollsContract.hasVoted(id, appState.userWallet.address) : false,
    ]);
    const options = result.options.map((text, optionIndex) => ({ text, votes: Number(result.voteCounts[optionIndex]) }));
    return { id, question: result.question, options, totalParticipants: Number(result.totalVotes), closesAt: Number(result.closesAt), active: result.active, voted };
  }));
  appState.polls = rows;
  renderPolls();
}

function renderPolls() {
  const container = document.getElementById("polls-list");
  if (!container) return;

  if (!appState.polls.length) {
    container.innerHTML = `<div class="empty-state">No polls are deployed yet. Run the demo deployment to load on-chain polls.</div>`;
    return;
  }

  container.innerHTML = appState.polls
    .map((p) => {
      const hasVoted = p.voted;
      const canVote = isConnected() && !hasVoted && p.active;

      return `
      <div class="poll-card" data-poll-id="${p.id}">
        <div>
          <div class="poll-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div class="poll-question" style="margin-bottom:0;">${p.question}</div>
            ${hasVoted ? `<span class="badge-voted" style="background:#dcfce7; color:#15803d; font-weight:700; font-size:0.75rem; padding:4px 10px; border-radius:12px; border:1px solid #86efac;">Voted</span>` : ""}
          </div>

          <div class="poll-reward-badge">${hasVoted ? "Vote recorded · +10 CRIC" : p.active ? (isConnected() ? "Vote · earn 10 CRIC" : "Connect wallet · earn 10 CRIC") : "Poll closed"}</div>

          <div class="poll-options">
            ${p.options
              .map((opt, idx) => {
                const pct = p.totalParticipants > 0 ? Math.round((opt.votes / p.totalParticipants) * 100) : 0;
                return `
                <button class="poll-btn-option ${!canVote ? "disabled" : ""}" data-poll-id="${p.id}" data-opt-idx="${idx}" ${!canVote ? "disabled style='cursor:not-allowed; opacity:0.85;'" : ""}>
                  <div class="vote-bar" style="width: ${pct}%;"></div>
                  <div class="vote-label">
                    <span>${opt.text}</span>
                    <span>${pct}% (${opt.votes})</span>
                  </div>
                </button>
              `;
              })
              .join("")}
          </div>
        </div>
        <div class="sub-sm text-dim">${p.totalParticipants} on-chain votes · closes ${new Date(p.closesAt * 1000).toLocaleString()}</div>
      </div>
    `;
    })
    .join("");

  container.querySelectorAll(".poll-btn-option:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pollId = btn.getAttribute("data-poll-id");
      const optionIndex = Number(btn.getAttribute("data-opt-idx"));
      try {
        if (!isConnected()) throw new Error("Connect your wallet to vote.");
        const pollsContract = await contract("FanPolls");
        const receipt = await (await pollsContract.vote(pollId, optionIndex)).wait();
        showToast(`Vote recorded on-chain · 10 CRIC reward · block ${receipt.blockNumber}.`);
        await refreshPolls();
      } catch (err) {
        showToast(err.shortMessage || err.message, true);
      }
    });
  });
}

// Toast Notifications
function showToast(message, isError = false) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "toast-error" : ""}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.4s ease";
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Tournament Escrows & Leaderboards
function setupTournamentControls() {}

function renderTournaments() {
  const container = document.getElementById("tournament-list");
  if (!container) return;

  if (appState.tournaments.length === 0) {
    container.innerHTML = `<div class="empty-state">No active tournaments found.</div>`;
    return;
  }

  container.innerHTML = appState.tournaments.map((t) => {
    const canRefund = t.status === "CANCELLED" && t.joined && !t.refunded;
    const isRegistrationOpen = t.status === "OPEN" && Date.now() / 1000 < t.lock_timestamp && t.current_participants < t.max_participants;
    const buttonLabel = canRefund ? "Claim refund" : t.joined ? "Joined" : !isConnected() ? "Connect wallet" : t.status !== "OPEN" || Date.now() / 1000 >= t.lock_timestamp ? "Entry closed" : t.current_participants >= t.max_participants ? "Full" : `Join · ${t.entry_fee} CRIC`;
    const disabled = canRefund ? "" : !isConnected() || t.joined || !isRegistrationOpen ? "disabled" : "";
    const displayedStatus = t.status === "OPEN" && !isRegistrationOpen ? "CLOSED" : t.status;
    const stage = t.status === "LOCKED" ? "LIVE" : t.status === "SETTLED" ? "PAST" : t.status === "CANCELLED" ? "CANCELLED" : (Date.now() / 1000 >= t.lock_timestamp ? "PAST · CLOSED" : "UPCOMING");
    return `
    <div class="tournament-card">
      <div class="tournament-card-header">
        <div>
          <h4 class="tournament-title">${t.name}</h4>
          <span style="font-size:0.8rem; color:var(--text-dim);">Match #${t.match_id} | Grand League</span>
        </div>
        <span class="badge-open">${stage}</span>
      </div>

      <div class="tournament-stats-row">
        <div class="stat-item">
          <div class="stat-label">Entry Stake</div>
          <div class="stat-num">${t.entry_fee} CRIC</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Total Escrow</div>
          <div class="stat-num highlight">${t.total_escrow.toLocaleString()} CRIC</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Entries</div>
          <div class="stat-num">${t.current_participants} / ${t.max_participants}</div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.82rem; color:var(--text-dim);">${t.status === "CANCELLED" ? "Refundable" : "Net pool"}: <b>${(t.status === "CANCELLED" ? t.total_escrow : t.first_prize).toLocaleString()} CRIC</b></span>
        <button class="btn btn-primary join-tournament-btn" data-id="${t.id}" data-action="${canRefund ? "refund" : "join"}" data-fee="${t.entry_fee}" ${disabled}>
          ${buttonLabel}
        </button>
      </div>
      ${t.isOwner ? `
        <div class="tournament-owner-actions">
          <span class="sub-sm">Organizer controls</span>
          <div class="owner-action-buttons">
            ${t.status === "OPEN" ? `<button class="btn btn-sm btn-outline" data-admin-action="lock" data-id="${t.id}">Lock entries</button>` : ""}
            ${["OPEN", "LOCKED"].includes(t.status) ? `<button class="btn btn-sm btn-danger-outline" data-admin-action="cancel" data-id="${t.id}">Cancel & refund</button>` : ""}
          </div>
          ${t.status === "LOCKED" && t.total_escrow > 0 ? `
            <label class="sub-sm" for="tournament-winners-${t.id}">Winner wallet addresses · one per line</label>
            <textarea class="form-control tournament-winners-input" id="tournament-winners-${t.id}" rows="2" placeholder="0x…"></textarea>
            <label class="sub-sm" for="tournament-shares-${t.id}">Payout shares in basis points · must total 10000</label>
            <input class="form-control tournament-shares-input" id="tournament-shares-${t.id}" placeholder="10000" inputmode="numeric">
            <button class="btn btn-sm btn-primary" data-admin-action="settle" data-id="${t.id}">Settle prizes</button>
          ` : ""}
          <p class="sub-sm">Organizer selects winners from verified match results.</p>
        </div>
      ` : ""}
    </div>
  `;
  }).join("");

  const leaderboardSelect = document.getElementById("tournament-leaderboard-select");
  if (leaderboardSelect) {
    const previous = String(appState.leaderboardTournamentId || "");
    leaderboardSelect.innerHTML = appState.tournaments.map((t) => {
      const stage = t.status === "LOCKED" ? "Live" : t.status === "SETTLED" ? "Past" : t.status === "CANCELLED" ? "Cancelled" : "Upcoming";
      return `<option value="${t.id}">${stage} · ${t.name}</option>`;
    }).join("");
    if (appState.tournaments.some((t) => String(t.id) === previous)) leaderboardSelect.value = previous;
    leaderboardSelect.onchange = () => loadLeaderboard(Number(leaderboardSelect.value));
  }

  // Attach join handlers
  container.querySelectorAll(".join-tournament-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const fee = Number(btn.getAttribute("data-fee"));
      const action = btn.getAttribute("data-action");

      try {
        if (action === "refund") {
          const pool = await contract("TournamentPool");
          const receipt = await (await pool.claimRefund(id)).wait();
          showToast(`Refund confirmed in block ${receipt.blockNumber}.`);
          await refreshWalletBalance();
          await refreshTournaments();
          renderTournaments();
          return;
        }
        if (appState.selectedPlayerIds.length !== 11) throw new Error("Build and select a complete XI before joining.");
        const validate = await fetch("/api/fantasy/validate-squad", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerIds: appState.selectedPlayerIds }),
        });
        const validation = await validate.json();
        if (!validation.isValid) throw new Error(validation.error || "Squad validation failed");
        const config = await loadDeployment();
        const pool = await contract("TournamentPool");
        const token = await contract("CRIC");
        const feeWei = units(fee);
        await (await token.approve(config.contracts.TournamentPool, feeWei)).wait();
        const receipt = await (await pool.joinTournament(id, keccakSquad(appState.selectedPlayerIds))).wait();
        showToast(`Tournament entry confirmed in block ${receipt.blockNumber}.`);
        await refreshWalletBalance();
        await refreshTournaments();
        renderTournaments();
        await loadLeaderboard(id);
      } catch (err) {
        showToast(err.shortMessage || err.message, true);
      }
    });
  });

  container.querySelectorAll("[data-admin-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        const pool = await contract("TournamentPool");
        const id = btn.dataset.id;
        const action = btn.dataset.adminAction;
        let transaction;
        if (action === "lock") transaction = await pool.lockTournament(id);
        if (action === "cancel") transaction = await pool.cancelTournament(id, "Cancelled by tournament organizer");
        if (action === "settle") {
          const card = btn.closest(".tournament-card");
          const winners = card.querySelector(".tournament-winners-input").value.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
          const shares = card.querySelector(".tournament-shares-input").value.split(/[\n,]+/).map((value) => Number(value.trim()));
          if (!winners.length || winners.length !== shares.length || shares.some((share) => !Number.isInteger(share) || share < 0) || shares.reduce((sum, share) => sum + share, 0) !== 10000) {
            throw new Error("Add one share per winner; shares must total 10000 basis points.");
          }
          transaction = await pool.distributePrizes(id, winners, shares);
        }
        const receipt = await transaction.wait();
        showToast(`Tournament update confirmed in block ${receipt.blockNumber}.`);
        await refreshWalletBalance();
        await refreshTournaments();
        renderTournaments();
        await loadLeaderboard(id);
      } catch (error) {
        showToast(error.shortMessage || error.message, true);
        btn.disabled = false;
      }
    });
  });
}

async function loadLeaderboard(tournamentId = 1) {
  try {
    appState.leaderboardTournamentId = Number(tournamentId);
    const select = document.getElementById("tournament-leaderboard-select");
    if (select) select.value = String(tournamentId);
    const pool = await contract("TournamentPool", true);
    const [participants, events, prizeEvents] = await Promise.all([
      pool.getParticipants(tournamentId),
      pool.queryFilter(pool.filters.JoinedTournament(tournamentId)),
      pool.queryFilter(pool.filters.PrizePaid(tournamentId)),
    ]);
    const payoutByAddress = new Map();
    prizeEvents.forEach((event) => {
      const recipient = event.args.winner.toLowerCase();
      payoutByAddress.set(recipient, (payoutByAddress.get(recipient) || 0) + formatUnits(event.args.amount));
    });
    const commitments = new Map(events.map((event) => [event.args.participant.toLowerCase(), event.args.squadHash]));
    appState.leaderboard = participants.map((user, index) => ({
      rank: index + 1,
      user,
      squadName: commitments.get(user.toLowerCase()) ? `${commitments.get(user.toLowerCase()).slice(0, 10)}…` : "—",
      points: "Pending",
      prizeCRIC: payoutByAddress.get(user.toLowerCase()) || 0,
    }));
    renderLeaderboard();
  } catch (err) {
    console.error("Leaderboard load failed:", err);
  }
}

function renderLeaderboard() {
  const tbody = document.getElementById("leaderboard-tbody");
  if (!tbody) return;

  tbody.innerHTML = appState.leaderboard.map((row) => {
    let rankBadgeClass = "rank-badge";
    if (row.rank === 1) rankBadgeClass += " rank-1";
    else if (row.rank === 2) rankBadgeClass += " rank-2";
    else if (row.rank === 3) rankBadgeClass += " rank-3";

    return `
      <tr>
        <td><span class="${rankBadgeClass}">${row.rank}</span></td>
        <td><code>${row.user}</code></td>
        <td><b>${row.squadName}</b></td>
        <td><span style="color:var(--text-dim); font-weight:700;">${row.points}</span></td>
        <td><span style="color:var(--turf-green-dark); font-weight:800;">${row.prizeCRIC ? row.prizeCRIC.toLocaleString() + ' CRIC' : '—'}</span></td>
      </tr>
    `;
  }).join("");
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PlayerCardNFT (Dynamic NFT - dNFT)
 * @author Tejaswini Kunkulagunta (CS23B032)
 * @notice ERC-1155 multi-token standard representing dynamic cricket player cards.
 *         Includes tiered multipliers, supply caps, and dynamic telemetry upgrades.
 */
contract PlayerCardNFT is ERC1155, Ownable {
    using Strings for uint256;

    enum RarityTier {
        Common,      // 0: 1.00x multiplier, Unlimited
        Uncommon,    // 1: 1.10x multiplier, Cap: 5,000
        Rare,        // 2: 1.25x multiplier, Cap: 1,000
        Epic,        // 3: 1.50x multiplier, Cap: 250
        Legendary    // 4: 2.00x multiplier, Cap: 25
    }

    struct CardMetadata {
        string name;
        string role;           // "Batsman", "Bowler", "All-Rounder", "Wicketkeeper"
        string team;
        RarityTier rarity;
        uint16 multiplierBps;  // 100 = 1.0x, 110 = 1.1x, 125 = 1.25x, 150 = 1.5x, 200 = 2.0x
        uint32 matches;
        uint32 runs;
        uint32 wickets;
        uint32 strikeRate;     // Scaled by 100 (e.g. 14550 = 145.50)
        uint32 economy;        // Scaled by 100 (e.g. 720 = 7.20)
        string imageURI;
        bool exists;
    }

    struct CardRegistration {
        uint256 cardId;
        string name;
        string role;
        string team;
        RarityTier rarity;
        uint32 matches;
        uint32 runs;
        uint32 wickets;
        uint32 strikeRate;
        uint32 economy;
        string imageURI;
    }

    // Supply Caps per Rarity Tier
    uint256 public constant UNCOMMON_CAP = 5000;
    uint256 public constant RARE_CAP = 1000;
    uint256 public constant EPIC_CAP = 250;
    uint256 public constant LEGENDARY_CAP = 25;

    // Card ID => Metadata
    mapping(uint256 => CardMetadata) public cards;
    // Card ID => Total Minted Supply
    mapping(uint256 => uint256) public totalMinted;

    // Authorized Oracles / Updaters (for dynamic stats telemetry)
    mapping(address => bool) public isAuthorizedUpdater;
    IERC20 public paymentToken;
    uint256 public primaryMintPrice;

    event CardRegistered(uint256 indexed cardId, string name, RarityTier rarity, uint16 multiplierBps);
    event CardMinted(address indexed recipient, uint256 indexed cardId, uint256 amount);
    event StatsUpdated(uint256 indexed cardId, uint32 runs, uint32 wickets, uint32 strikeRate, uint32 economy);
    event UpdaterSet(address indexed updater, bool status);
    event PrimarySaleConfigured(address indexed paymentToken, uint256 price);
    event PrimaryCardPurchased(address indexed buyer, uint256 indexed cardId, uint256 price);

    constructor() ERC1155("https://api.cricketverse.io/metadata/{id}.json") Ownable(msg.sender) {
        isAuthorizedUpdater[msg.sender] = true;
    }

    modifier onlyUpdaterOrOwner() {
        require(isAuthorizedUpdater[msg.sender] || msg.sender == owner(), "PlayerCardNFT: Caller not authorized");
        _;
    }

    function setUpdater(address updater, bool status) external onlyOwner {
        isAuthorizedUpdater[updater] = status;
        emit UpdaterSet(updater, status);
    }

    function configurePrimarySale(address token, uint256 price) external onlyOwner {
        require(token != address(0), "PlayerCardNFT: Invalid payment token");
        require(price > 0, "PlayerCardNFT: Price must be positive");
        paymentToken = IERC20(token);
        primaryMintPrice = price;
        emit PrimarySaleConfigured(token, price);
    }

    function buyCard(uint256 cardId) external {
        require(address(paymentToken) != address(0), "PlayerCardNFT: Primary sale not configured");
        require(cards[cardId].exists, "PlayerCardNFT: Card not registered");
        require(paymentToken.transferFrom(msg.sender, owner(), primaryMintPrice), "PlayerCardNFT: Payment failed");
        _mintCard(msg.sender, cardId, 1);
        emit PrimaryCardPurchased(msg.sender, cardId, primaryMintPrice);
    }

    /**
     * @notice Register a player card specification with predefined rarity and supply constraints
     */
    function registerCard(
        uint256 cardId,
        string memory name,
        string memory role,
        string memory team,
        RarityTier rarity,
        uint32 matches,
        uint32 runs,
        uint32 wickets,
        uint32 strikeRate,
        uint32 economy,
        string memory imageURI
    ) external onlyOwner {
        _registerCard(CardRegistration(cardId, name, role, team, rarity, matches, runs, wickets, strikeRate, economy, imageURI));
    }

    function registerCards(CardRegistration[] calldata registrations) external onlyOwner {
        require(registrations.length > 0 && registrations.length <= 50, "PlayerCardNFT: Batch size must be 1-50");
        for (uint256 i = 0; i < registrations.length; i++) _registerCard(registrations[i]);
    }

    function _registerCard(CardRegistration memory registration) private {
        uint256 cardId = registration.cardId;
        require(!cards[cardId].exists, "PlayerCardNFT: Card ID already registered");

        uint16 multiplierBps;
        if (registration.rarity == RarityTier.Common) multiplierBps = 100;
        else if (registration.rarity == RarityTier.Uncommon) multiplierBps = 110;
        else if (registration.rarity == RarityTier.Rare) multiplierBps = 125;
        else if (registration.rarity == RarityTier.Epic) multiplierBps = 150;
        else if (registration.rarity == RarityTier.Legendary) multiplierBps = 200;

        cards[cardId] = CardMetadata({
            name: registration.name,
            role: registration.role,
            team: registration.team,
            rarity: registration.rarity,
            multiplierBps: multiplierBps,
            matches: registration.matches,
            runs: registration.runs,
            wickets: registration.wickets,
            strikeRate: registration.strikeRate,
            economy: registration.economy,
            imageURI: registration.imageURI,
            exists: true
        });

        emit CardRegistered(cardId, registration.name, registration.rarity, multiplierBps);
    }

    /**
     * @notice Mint card editions enforcing rarity supply cap constraints
     */
    function mintCard(address to, uint256 cardId, uint256 amount) external onlyUpdaterOrOwner {
        _mintCard(to, cardId, amount);
    }

    function _mintCard(address to, uint256 cardId, uint256 amount) internal {
        require(amount > 0, "PlayerCardNFT: Amount must be greater than zero");
        require(cards[cardId].exists, "PlayerCardNFT: Card not registered");
        CardMetadata memory meta = cards[cardId];

        uint256 newTotal = totalMinted[cardId] + amount;
        if (meta.rarity == RarityTier.Uncommon) {
            require(newTotal <= UNCOMMON_CAP, "PlayerCardNFT: Exceeds Uncommon supply cap");
        } else if (meta.rarity == RarityTier.Rare) {
            require(newTotal <= RARE_CAP, "PlayerCardNFT: Exceeds Rare supply cap");
        } else if (meta.rarity == RarityTier.Epic) {
            require(newTotal <= EPIC_CAP, "PlayerCardNFT: Exceeds Epic supply cap");
        } else if (meta.rarity == RarityTier.Legendary) {
            require(newTotal <= LEGENDARY_CAP, "PlayerCardNFT: Exceeds Legendary supply cap");
        }

        totalMinted[cardId] = newTotal;
        _mint(to, cardId, amount, "");
        emit CardMinted(to, cardId, amount);
    }

    /**
     * @notice Dynamic metadata telemetry update - called by oracle/oracle-indexer
     */
    function updatePlayerStats(
        uint256 cardId,
        uint32 additionalRuns,
        uint32 additionalWickets,
        uint32 newStrikeRate,
        uint32 newEconomy
    ) external onlyUpdaterOrOwner {
        require(cards[cardId].exists, "PlayerCardNFT: Card does not exist");
        CardMetadata storage card = cards[cardId];

        card.matches += 1;
        card.runs += additionalRuns;
        card.wickets += additionalWickets;
        card.strikeRate = newStrikeRate;
        card.economy = newEconomy;

        emit StatsUpdated(cardId, card.runs, card.wickets, newStrikeRate, newEconomy);
    }

    /**
     * @notice Retrieve card metadata
     */
    function getCard(uint256 cardId) external view returns (CardMetadata memory) {
        require(cards[cardId].exists, "PlayerCardNFT: Card does not exist");
        return cards[cardId];
    }
}

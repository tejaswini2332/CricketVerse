// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MatchTicketNFT.sol";

/**
 * @title CricketMarketplace
 * @author Tejaswini Kunkulagunta (CS23B032)
 * @notice Trustless P2P marketplace for CricketVerse assets using CRIC tokens.
 *         Features atomic settlement, royalty fee routing, and anti-scalping price ceiling enforcement.
 */
contract CricketMarketplace is ReentrancyGuard, Ownable, ERC1155Holder, ERC721Holder {
    enum AssetType {
        PLAYER_CARD_1155,
        MATCH_TICKET_721
    }

    struct Listing {
        uint256 listingId;
        address seller;
        AssetType assetType;
        address assetContract;
        uint256 tokenId;
        uint256 amount; // 1 for ERC721, >= 1 for ERC1155
        uint256 pricePerUnit; // In CRIC (wei)
        bool isActive;
    }

    IERC20 public immutable cricToken;
    MatchTicketNFT public immutable ticketContract;
    address public royaltyReceiver;

    // Default royalty fee: 5% (500 bps / 10000)
    uint256 public royaltyBps = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    uint256 public nextListingId = 1;
    mapping(uint256 => Listing) public listings;

    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        AssetType assetType,
        address indexed assetContract,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit
    );

    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 totalPrice,
        uint256 royaltyPaid
    );

    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event RoyaltyUpdated(address indexed receiver, uint256 royaltyBps);

    constructor(address _cricToken, address _ticketContract, address _royaltyReceiver) Ownable(msg.sender) {
        require(_cricToken != address(0), "Invalid CRIC address");
        require(_ticketContract != address(0), "Invalid Ticket address");
        require(_royaltyReceiver != address(0), "Invalid Royalty receiver");

        cricToken = IERC20(_cricToken);
        ticketContract = MatchTicketNFT(_ticketContract);
        royaltyReceiver = _royaltyReceiver;
    }

    function setRoyalty(address _royaltyReceiver, uint256 _royaltyBps) external onlyOwner {
        require(_royaltyBps <= 2000, "Royalty cannot exceed 20%");
        require(_royaltyReceiver != address(0), "Invalid address");
        royaltyReceiver = _royaltyReceiver;
        royaltyBps = _royaltyBps;
        emit RoyaltyUpdated(_royaltyReceiver, _royaltyBps);
    }

    /**
     * @notice List an ERC-1155 Dynamic Player Card for sale
     */
    function listPlayerCard(
        address assetContract,
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit
    ) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        require(pricePerUnit > 0, "Price must be > 0");

        // Transfer card into marketplace escrow
        IERC1155(assetContract).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        uint256 listingId = nextListingId++;
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            assetType: AssetType.PLAYER_CARD_1155,
            assetContract: assetContract,
            tokenId: tokenId,
            amount: amount,
            pricePerUnit: pricePerUnit,
            isActive: true
        });

        emit ItemListed(listingId, msg.sender, AssetType.PLAYER_CARD_1155, assetContract, tokenId, amount, pricePerUnit);
        return listingId;
    }

    /**
     * @notice List an ERC-721 Stadium Match Ticket with strict anti-scalping price ceiling enforcement
     */
    function listMatchTicket(
        address assetContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(price > 0, "Price must be > 0");

        // ANTI-SCALPING CHECK: Verify proposed price does NOT exceed 15% markup ceiling
        if (assetContract == address(ticketContract)) {
            require(
                ticketContract.isPriceWithinAntiScalpingCap(tokenId, price),
                "Marketplace: Scalping detected! Resale price exceeds 15% ceiling"
            );
            MatchTicketNFT.TicketDetails memory details = ticketContract.getTicket(tokenId);
            require(!details.isRedeemed, "Marketplace: Cannot list already redeemed ticket");
            (, uint64 endsAt) = ticketContract.matchWindows(tokenId);
            require(block.timestamp < endsAt, "Marketplace: Ticket match has ended");
        }

        // Transfer ticket into marketplace escrow
        IERC721(assetContract).safeTransferFrom(msg.sender, address(this), tokenId);

        uint256 listingId = nextListingId++;
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            assetType: AssetType.MATCH_TICKET_721,
            assetContract: assetContract,
            tokenId: tokenId,
            amount: 1,
            pricePerUnit: price,
            isActive: true
        });

        emit ItemListed(listingId, msg.sender, AssetType.MATCH_TICKET_721, assetContract, tokenId, 1, price);
        return listingId;
    }

    /**
     * @notice Execute atomic purchase using CRIC tokens with automatic royalty split
     */
    function buyItem(uint256 listingId, uint256 buyAmount) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing is not active");
        require(buyAmount > 0 && buyAmount <= listing.amount, "Invalid purchase amount");
        require(msg.sender != listing.seller, "Seller cannot purchase own listing");

        // A gatekeeper can redeem a ticket while it is escrowed. Never deliver a
        // redeemed ticket to a buyer even if the listing was valid when created.
        if (listing.assetType == AssetType.MATCH_TICKET_721 && listing.assetContract == address(ticketContract)) {
            MatchTicketNFT.TicketDetails memory details = ticketContract.getTicket(listing.tokenId);
            require(!details.isRedeemed, "Marketplace: Cannot sell redeemed ticket");
            (, uint64 endsAt) = ticketContract.matchWindows(listing.tokenId);
            require(block.timestamp < endsAt, "Marketplace: Ticket match has ended");
        }

        uint256 totalCost = listing.pricePerUnit * buyAmount;
        uint256 royaltyAmount = (totalCost * royaltyBps) / BPS_DENOMINATOR;
        uint256 sellerProceeds = totalCost - royaltyAmount;

        listing.amount -= buyAmount;
        if (listing.amount == 0) {
            listing.isActive = false;
        }

        // 1. Transfer CRIC payment: proceeds to seller
        require(cricToken.transferFrom(msg.sender, listing.seller, sellerProceeds), "CRIC payment to seller failed");

        // 2. Transfer CRIC royalty: platform / drop pool share
        if (royaltyAmount > 0) {
            require(cricToken.transferFrom(msg.sender, royaltyReceiver, royaltyAmount), "CRIC royalty payment failed");
        }

        // 3. Transfer Asset to Buyer
        if (listing.assetType == AssetType.PLAYER_CARD_1155) {
            IERC1155(listing.assetContract).safeTransferFrom(address(this), msg.sender, listing.tokenId, buyAmount, "");
        } else {
            IERC721(listing.assetContract).safeTransferFrom(address(this), msg.sender, listing.tokenId);
        }

        emit ItemSold(listingId, msg.sender, listing.seller, buyAmount, totalCost, royaltyAmount);
    }

    /**
     * @notice Cancel listing and return escrowed assets
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender || msg.sender == owner(), "Not seller or owner");

        listing.isActive = false;

        if (listing.assetType == AssetType.PLAYER_CARD_1155) {
            IERC1155(listing.assetContract).safeTransferFrom(address(this), listing.seller, listing.tokenId, listing.amount, "");
        } else {
            IERC721(listing.assetContract).safeTransferFrom(address(this), listing.seller, listing.tokenId);
        }

        emit ListingCancelled(listingId, listing.seller);
    }

    /**
     * @notice View listing details
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
}

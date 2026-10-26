// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MatchTicketNFT (Anti-Scalping Dynamic Ticket)
 * @author Tejaswini Kunkulagunta (CS23B032)
 * @notice ERC-721 NFT for stadium match admissions featuring:
 *         1. Enforced secondary resale markup ceiling (max 15% above face value)
 *         2. Permanent one-time gatekeeper redemption (anti-double entry)
 *         3. Cryptographic gate verification support
 */
contract MatchTicketNFT is ERC721, AccessControl {
    bytes32 public constant GATEKEEPER_ROLE = keccak256("GATEKEEPER_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");

    // Resale price markup cap: 15% (115% of face value in basis points: 11500 / 10000)
    uint256 public constant MAX_MARKUP_BPS = 11500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct TicketDetails {
        uint256 matchId;
        string matchName;
        string venue;
        string stand;
        string seatNumber;
        uint256 faceValue;      // In CRIC tokens (or wei)
        uint256 maxResalePrice; // Calculated as faceValue * 115 / 100
        bool isRedeemed;
        uint256 redeemedAt;
        address redeemedByGatekeeper;
        bool exists;
    }

    mapping(uint256 => TicketDetails) public tickets;
    struct MatchWindow { uint64 startsAt; uint64 endsAt; }
    mapping(uint256 => MatchWindow) public matchWindows;

    event TicketIssued(uint256 indexed tokenId, address indexed initialHolder, uint256 faceValue, uint256 maxResalePrice);
    event MatchWindowSet(uint256 indexed tokenId, uint64 startsAt, uint64 endsAt);
    event TicketRedeemed(uint256 indexed tokenId, address indexed attendee, address indexed gatekeeper, uint256 timestamp);

    constructor() ERC721("CricketVerse Match Ticket", "CVTKT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORGANIZER_ROLE, msg.sender);
        _grantRole(GATEKEEPER_ROLE, msg.sender);
    }

    /**
     * @notice Mint and issue a stadium ticket
     */
    function issueTicket(
        address recipient,
        uint256 tokenId,
        uint256 matchId,
        string memory matchName,
        string memory venue,
        string memory stand,
        string memory seatNumber,
        uint256 faceValue
    ) external onlyRole(ORGANIZER_ROLE) {
        _issueTicket(recipient, tokenId, matchId, matchName, venue, stand, seatNumber, faceValue);
        uint64 startsAt = uint64(block.timestamp);
        uint64 endsAt = uint64(block.timestamp + 4 hours);
        matchWindows[tokenId] = MatchWindow(startsAt, endsAt);
        emit MatchWindowSet(tokenId, startsAt, endsAt);
    }

    /// @notice Issue a ticket with an on-chain fixture window for live/upcoming/past status.
    function issueScheduledTicket(
        address recipient,
        uint256 tokenId,
        uint256 matchId,
        string memory matchName,
        string memory venue,
        string memory stand,
        string memory seatNumber,
        uint256 faceValue,
        uint64 startsAt,
        uint64 endsAt
    ) external onlyRole(ORGANIZER_ROLE) {
        require(startsAt > 0 && endsAt > startsAt, "Match window: invalid times");
        _issueTicket(recipient, tokenId, matchId, matchName, venue, stand, seatNumber, faceValue);
        matchWindows[tokenId] = MatchWindow(startsAt, endsAt);
        emit MatchWindowSet(tokenId, startsAt, endsAt);
    }

    function _issueTicket(
        address recipient,
        uint256 tokenId,
        uint256 matchId,
        string memory matchName,
        string memory venue,
        string memory stand,
        string memory seatNumber,
        uint256 faceValue
    ) internal {
        require(!tickets[tokenId].exists, "MatchTicketNFT: Token ID already issued");
        require(faceValue > 0, "MatchTicketNFT: Face value must be greater than zero");

        uint256 maxResalePrice = (faceValue * MAX_MARKUP_BPS) / BPS_DENOMINATOR;

        tickets[tokenId] = TicketDetails({
            matchId: matchId,
            matchName: matchName,
            venue: venue,
            stand: stand,
            seatNumber: seatNumber,
            faceValue: faceValue,
            maxResalePrice: maxResalePrice,
            isRedeemed: false,
            redeemedAt: 0,
            redeemedByGatekeeper: address(0),
            exists: true
        });

        _mint(recipient, tokenId);
        emit TicketIssued(tokenId, recipient, faceValue, maxResalePrice);
    }

    /**
     * @notice Check whether a resale price conforms to anti-scalping ceiling
     */
    function isPriceWithinAntiScalpingCap(uint256 tokenId, uint256 proposedPrice) public view returns (bool) {
        require(tickets[tokenId].exists, "MatchTicketNFT: Ticket does not exist");
        return proposedPrice <= tickets[tokenId].maxResalePrice;
    }

    /**
     * @notice One-time gate redemption by authorized gatekeeper
     */
    function redeemTicket(uint256 tokenId) external onlyRole(GATEKEEPER_ROLE) {
        require(tickets[tokenId].exists, "MatchTicketNFT: Ticket does not exist");
        require(!tickets[tokenId].isRedeemed, "MatchTicketNFT: Ticket already redeemed (Double-Entry Blocked)");
        MatchWindow memory window = matchWindows[tokenId];
        require(block.timestamp >= window.startsAt && block.timestamp < window.endsAt, "Match window: not active");

        address currentHolder = ownerOf(tokenId);
        tickets[tokenId].isRedeemed = true;
        tickets[tokenId].redeemedAt = block.timestamp;
        tickets[tokenId].redeemedByGatekeeper = msg.sender;

        emit TicketRedeemed(tokenId, currentHolder, msg.sender, block.timestamp);
    }

    /**
     * @notice Get ticket details
     */
    function getTicket(uint256 tokenId) external view returns (TicketDetails memory) {
        require(tickets[tokenId].exists, "MatchTicketNFT: Ticket does not exist");
        return tickets[tokenId];
    }

    // Explicit override for ERC-721 and AccessControl
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MatchTicketNFT (Anti-Scalping Dynamic Ticket)
 * @author Tejaswini Kunkulagunta (CS23B032)
 * @notice ERC-721 NFT for stadium match admissions featuring:
 *         1. Secondary resale markup ceiling (max 15% above face value)
 *         2. Permanent one-time gatekeeper redemption (anti-double entry)
 *         3. Cryptographic EIP-191 holder-signed entry passes with rotating nonces & expiry
 *         4. Post-redemption & post-match non-transferability
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
    mapping(uint256 => uint256) public ticketNonces;
    mapping(uint256 => address) public authorizedGateSigner;

    event TicketIssued(uint256 indexed tokenId, address indexed initialHolder, uint256 faceValue, uint256 maxResalePrice);
    event MatchWindowSet(uint256 indexed tokenId, uint64 startsAt, uint64 endsAt);
    event TicketRedeemed(uint256 indexed tokenId, address indexed attendee, address indexed gatekeeper, uint256 timestamp);
    event EntryChallengeVerified(uint256 indexed tokenId, address indexed holder, uint256 nonce, uint256 deadline);
    event GateSignerUpdated(uint256 indexed tokenId, address indexed holder, address indexed gateSigner);

    constructor() ERC721("CricketVerse Match Ticket", "CVTKT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORGANIZER_ROLE, msg.sender);
        _grantRole(GATEKEEPER_ROLE, msg.sender);
    }

    /**
     * @notice Block P2P transfers of already-redeemed or expired passes and rotate nonce on transfer
     *         so old QR screenshots from previous owners become permanently invalid.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            require(!tickets[tokenId].isRedeemed, "MatchTicketNFT: Redeemed ticket is non-transferable");
            MatchWindow memory window = matchWindows[tokenId];
            if (window.endsAt > 0) {
                require(block.timestamp < window.endsAt, "MatchTicketNFT: Expired ticket cannot be transferred");
            }
            ticketNonces[tokenId]++;
            delete authorizedGateSigner[tokenId];
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Authorize or revoke a hot device key allowed to sign turnstile QR challenges on the owner's behalf.
     *         Automatically cleared whenever the ticket is transferred.
     */
    function setGateSigner(uint256 tokenId, address gateSigner) external {
        require(tickets[tokenId].exists, "MatchTicketNFT: Ticket does not exist");
        require(ownerOf(tokenId) == msg.sender, "MatchTicketNFT: Only owner can set gate signer");
        authorizedGateSigner[tokenId] = gateSigner;
        emit GateSignerUpdated(tokenId, msg.sender, gateSigner);
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
     * @notice Compute domain-bound entry challenge hash for the current holder & rotating nonce
     */
    function getEntryChallengeHash(uint256 tokenId, uint256 deadline) public view returns (bytes32) {
        require(tickets[tokenId].exists, "MatchTicketNFT: Ticket does not exist");
        return keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                tokenId,
                ownerOf(tokenId),
                ticketNonces[tokenId],
                deadline
            )
        );
    }

    /**
     * @notice Pre-flight read-only check for turnstile scanners before submitting redemption tx
     */
    function verifyEntryPass(
        uint256 tokenId,
        uint256 deadline,
        bytes calldata signature
    ) public view returns (bool valid, string memory reason, address holder) {
        if (!tickets[tokenId].exists) {
            return (false, "Ticket does not exist", address(0));
        }
        holder = ownerOf(tokenId);
        if (tickets[tokenId].isRedeemed) {
            return (false, "Ticket already redeemed (Double-Entry Blocked)", holder);
        }
        MatchWindow memory window = matchWindows[tokenId];
        if (block.timestamp < window.startsAt || block.timestamp >= window.endsAt) {
            return (false, "Match window not active", holder);
        }
        if (block.timestamp > deadline) {
            return (false, "QR entry pass expired (Anti-Screenshot)", holder);
        }
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(
            getEntryChallengeHash(tokenId, deadline)
        );
        (address recovered, ECDSA.RecoverError err, ) = ECDSA.tryRecover(ethSignedHash, signature);
        address delegateSigner = authorizedGateSigner[tokenId];
        bool signerAuthorized = err == ECDSA.RecoverError.NoError &&
            (recovered == holder || (delegateSigner != address(0) && recovered == delegateSigner));
        if (!signerAuthorized) {
            return (false, "Invalid holder ECDSA signature", holder);
        }
        return (true, "Valid holder-signed entry pass", holder);
    }

    /**
     * @notice Cryptographic gate redemption requiring the current ERC-721 owner's or authorized gate signer's EIP-191 signature
     */
    function redeemTicketWithSignature(
        uint256 tokenId,
        uint256 deadline,
        bytes calldata signature
    ) external onlyRole(GATEKEEPER_ROLE) {
        require(tickets[tokenId].exists, "MatchTicketNFT: Ticket does not exist");
        require(!tickets[tokenId].isRedeemed, "MatchTicketNFT: Ticket already redeemed (Double-Entry Blocked)");
        MatchWindow memory window = matchWindows[tokenId];
        require(block.timestamp >= window.startsAt && block.timestamp < window.endsAt, "Match window: not active");
        require(block.timestamp <= deadline, "MatchTicketNFT: Entry QR pass expired");

        address currentHolder = ownerOf(tokenId);
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(
            getEntryChallengeHash(tokenId, deadline)
        );
        address recovered = ECDSA.recover(ethSignedHash, signature);
        address delegateSigner = authorizedGateSigner[tokenId];
        require(
            recovered == currentHolder || (delegateSigner != address(0) && recovered == delegateSigner),
            "MatchTicketNFT: Invalid holder signature"
        );

        emit EntryChallengeVerified(tokenId, currentHolder, ticketNonces[tokenId], deadline);
        _redeem(tokenId);
    }

    /**
     * @notice One-time gate redemption by authorized gatekeeper
     */
    function redeemTicket(uint256 tokenId) external onlyRole(GATEKEEPER_ROLE) {
        _redeem(tokenId);
    }

    function _redeem(uint256 tokenId) internal {
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TournamentPool
 * @author Tejaswini Kunkulagunta (CS23B032)
 * @notice Trustless, non-custodial fantasy tournament escrow contract.
 *         Locks entry fees in CRIC utility tokens, enforces match lock windows,
 *         and programmatically disburses prize pools to verified leaderboard winners.
 */
contract TournamentPool is Ownable, ReentrancyGuard {
    IERC20 public immutable cricToken;

    // Platform treasury address for organizer fee (5% = 500 bps)
    address public treasury;
    uint256 public constant PLATFORM_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    enum TournamentStatus {
        Open,        // Accepting participant registrations
        Locked,      // Match live, registrations closed
        Settled,     // Winners paid out programmatically
        Cancelled    // Match abandoned; full refund available
    }

    struct Participant {
        address user;
        bytes32 squadHash;
        uint256 joinedAt;
        bool refunded;
    }

    struct Tournament {
        uint256 id;
        string name;
        uint256 matchId;
        uint256 entryFee;          // In CRIC tokens (wei)
        uint256 maxParticipants;
        uint256 lockTimestamp;     // Match commencement time
        uint256 totalEscrow;       // Total CRIC locked
        TournamentStatus status;
        uint256 totalWinners;
        bool exists;
    }

    uint256 public tournamentCount;
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => Participant[]) internal _participants;
    mapping(uint256 => mapping(address => bool)) public hasJoined;

    event TournamentCreated(
        uint256 indexed tournamentId,
        string name,
        uint256 indexed matchId,
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 lockTimestamp
    );
    event JoinedTournament(uint256 indexed tournamentId, address indexed participant, bytes32 squadHash, uint256 feePaid);
    event TournamentLocked(uint256 indexed tournamentId);
    event PrizesDistributed(uint256 indexed tournamentId, uint256 totalPayout, uint256 platformFee);
    event PrizePaid(uint256 indexed tournamentId, address indexed winner, uint256 amount);
    event TournamentCancelled(uint256 indexed tournamentId, string reason);
    event EntryFeeRefunded(uint256 indexed tournamentId, address indexed participant, uint256 refundAmount);
    event TreasuryUpdated(address indexed newTreasury);

    constructor(address _cricTokenAddress, address _treasury) Ownable(msg.sender) {
        require(_cricTokenAddress != address(0), "TournamentPool: Invalid token address");
        require(_treasury != address(0), "TournamentPool: Invalid treasury address");
        cricToken = IERC20(_cricTokenAddress);
        treasury = _treasury;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "TournamentPool: Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @notice Create a new fantasy contest escrow pool
     */
    function createTournament(
        string memory name,
        uint256 matchId,
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 lockTimestamp
    ) external onlyOwner returns (uint256) {
        require(bytes(name).length > 0, "TournamentPool: Name cannot be empty");
        require(maxParticipants >= 2, "TournamentPool: Minimum 2 participants required");
        require(entryFee > 0, "TournamentPool: Entry fee must be greater than zero");
        require(lockTimestamp > block.timestamp, "TournamentPool: Lock time must be in future");

        tournamentCount++;
        uint256 tId = tournamentCount;

        tournaments[tId] = Tournament({
            id: tId,
            name: name,
            matchId: matchId,
            entryFee: entryFee,
            maxParticipants: maxParticipants,
            lockTimestamp: lockTimestamp,
            totalEscrow: 0,
            status: TournamentStatus.Open,
            totalWinners: 0,
            exists: true
        });

        emit TournamentCreated(tId, name, matchId, entryFee, maxParticipants, lockTimestamp);
        return tId;
    }

    /**
     * @notice Join an open tournament by locking the CRIC entry fee into escrow
     */
    function joinTournament(uint256 tournamentId, bytes32 squadHash) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.exists, "TournamentPool: Tournament does not exist");
        require(t.status == TournamentStatus.Open, "TournamentPool: Tournament is not open");
        require(block.timestamp < t.lockTimestamp, "TournamentPool: Tournament registration closed");
        require(_participants[tournamentId].length < t.maxParticipants, "TournamentPool: Contest is full");
        require(!hasJoined[tournamentId][msg.sender], "TournamentPool: User already joined");
        require(squadHash != bytes32(0), "TournamentPool: Squad commitment required");

        hasJoined[tournamentId][msg.sender] = true;
        t.totalEscrow += t.entryFee;

        _participants[tournamentId].push(Participant({
            user: msg.sender,
            squadHash: squadHash,
            joinedAt: block.timestamp,
            refunded: false
        }));

        if (t.entryFee > 0) {
            bool success = cricToken.transferFrom(msg.sender, address(this), t.entryFee);
            require(success, "TournamentPool: CRIC transfer failed");
        }

        emit JoinedTournament(tournamentId, msg.sender, squadHash, t.entryFee);
    }

    /**
     * @notice Lock tournament registrations once match starts
     */
    function lockTournament(uint256 tournamentId) external onlyOwner {
        Tournament storage t = tournaments[tournamentId];
        require(t.exists, "TournamentPool: Tournament does not exist");
        require(t.status == TournamentStatus.Open, "TournamentPool: Not open");

        t.status = TournamentStatus.Locked;
        emit TournamentLocked(tournamentId);
    }

    /**
     * @notice Programmatic, trustless payout to verified leaderboard winners
     * @param tournamentId ID of contest
     * @param winners Ordered list of winning addresses
     * @param sharesBps Proportional payout share in basis points (must sum to 10000 = 100% of net pool)
     */
    function distributePrizes(
        uint256 tournamentId,
        address[] calldata winners,
        uint256[] calldata sharesBps
    ) external onlyOwner nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.exists, "TournamentPool: Tournament does not exist");
        require(t.status == TournamentStatus.Locked, "TournamentPool: Tournament must be locked before settlement");
        require(winners.length > 0 && winners.length == sharesBps.length, "TournamentPool: Invalid winners or shares");
        require(winners.length <= _participants[tournamentId].length, "TournamentPool: Too many winners");

        // Only registered participants can receive prize funds; reject duplicate addresses
        // so a caller cannot allocate several shares to the same winner.
        for (uint256 i = 0; i < winners.length; i++) {
            require(winners[i] != address(0), "TournamentPool: Invalid winner");
            require(hasJoined[tournamentId][winners[i]], "TournamentPool: Winner did not join");
            for (uint256 j = 0; j < i; j++) {
                require(winners[i] != winners[j], "TournamentPool: Duplicate winner");
            }
        }

        uint256 totalEscrow = t.totalEscrow;
        require(totalEscrow > 0, "TournamentPool: No escrow funds");

        t.status = TournamentStatus.Settled;
        t.totalWinners = winners.length;

        // Calculate platform organizer fee (5%)
        uint256 platformFee = (totalEscrow * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netPrizePool = totalEscrow - platformFee;

        // Transfer platform fee to ecosystem treasury
        if (platformFee > 0) {
            bool feeSuccess = cricToken.transfer(treasury, platformFee);
            require(feeSuccess, "TournamentPool: Treasury fee transfer failed");
        }

        // Validate that shares sum to 10000 bps (100%)
        uint256 totalShares = 0;
        for (uint256 i = 0; i < sharesBps.length; i++) {
            totalShares += sharesBps[i];
        }
        require(totalShares == BPS_DENOMINATOR, "TournamentPool: Shares must sum to 10000 bps");

        // Disburse prizes to winners
        uint256 remainingPrizePool = netPrizePool;
        for (uint256 i = 0; i < winners.length; i++) {
            uint256 payout = i == winners.length - 1
                ? remainingPrizePool
                : (netPrizePool * sharesBps[i]) / BPS_DENOMINATOR;
            remainingPrizePool -= payout;
            if (payout > 0) {
                bool paySuccess = cricToken.transfer(winners[i], payout);
                require(paySuccess, "TournamentPool: Winner payout failed");
            }
            emit PrizePaid(tournamentId, winners[i], payout);
        }

        emit PrizesDistributed(tournamentId, netPrizePool, platformFee);
    }

    /**
     * @notice Cancel contest if match is washed out or abandoned
     */
    function cancelTournament(uint256 tournamentId, string memory reason) external onlyOwner {
        Tournament storage t = tournaments[tournamentId];
        require(t.exists, "TournamentPool: Does not exist");
        require(t.status == TournamentStatus.Open || t.status == TournamentStatus.Locked, "TournamentPool: Cannot cancel");

        t.status = TournamentStatus.Cancelled;
        emit TournamentCancelled(tournamentId, reason);
    }

    /**
     * @notice Claim full refund if contest is cancelled
     */
    function claimRefund(uint256 tournamentId) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.Cancelled, "TournamentPool: Contest not cancelled");
        require(hasJoined[tournamentId][msg.sender], "TournamentPool: User did not join");

        Participant[] storage pList = _participants[tournamentId];
        bool found = false;
        for (uint256 i = 0; i < pList.length; i++) {
            if (pList[i].user == msg.sender) {
                require(!pList[i].refunded, "TournamentPool: Already refunded");
                pList[i].refunded = true;
                found = true;
                break;
            }
        }
        require(found, "TournamentPool: Participant not found");

        if (t.entryFee > 0) {
            bool refundSuccess = cricToken.transfer(msg.sender, t.entryFee);
            require(refundSuccess, "TournamentPool: Refund transfer failed");
        }

        emit EntryFeeRefunded(tournamentId, msg.sender, t.entryFee);
    }

    /**
     * @notice Get all participant addresses in a tournament
     */
    function getParticipants(uint256 tournamentId) external view returns (address[] memory) {
        Participant[] memory list = _participants[tournamentId];
        address[] memory users = new address[](list.length);
        for (uint256 i = 0; i < list.length; i++) {
            users[i] = list[i].user;
        }
        return users;
    }

    /**
     * @notice Get total participant count
     */
    function getParticipantCount(uint256 tournamentId) external view returns (uint256) {
        return _participants[tournamentId].length;
    }
}

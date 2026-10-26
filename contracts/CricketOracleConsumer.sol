// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PlayerCardNFT.sol";

/**
 * @title CricketOracleConsumer
 * @author Tejaswini Kunkulagunta (CS23B032)
 * @notice Oracle consumer and bridge contract adhering to Chainlink Functions architecture.
 *         Receives off-chain sports API telemetry (CricAPI/Sportradar) and cryptographically
 *         commits verified match outcomes to PlayerCardNFT on-chain.
 */
contract CricketOracleConsumer is Ownable {
    // Reference to dynamic NFT contract
    PlayerCardNFT public immutable playerCardContract;

    // Authorized oracle relayers / Chainlink Functions router addresses
    mapping(address => bool) public isAuthorizedOracle;

    struct OracleRequest {
        uint256 matchId;
        uint256 cardId;
        string apiEndpoint;
        uint256 timestamp;
        bool isFulfilled;
    }

    // Request nonce tracking
    uint256 private _requestNonce;
    mapping(bytes32 => OracleRequest) public requests;

    event StatsRequested(bytes32 indexed requestId, uint256 indexed matchId, uint256 indexed cardId, string endpoint);
    event StatsFulfilled(
        bytes32 indexed requestId,
        uint256 indexed cardId,
        uint32 additionalRuns,
        uint32 additionalWickets,
        uint32 strikeRate,
        uint32 economy
    );
    event OracleAuthorizationUpdated(address indexed oracle, bool status);

    modifier onlyOracleOrOwner() {
        require(isAuthorizedOracle[msg.sender] || msg.sender == owner(), "CricketOracleConsumer: Unauthorized oracle caller");
        _;
    }

    constructor(address _playerCardAddress) Ownable(msg.sender) {
        require(_playerCardAddress != address(0), "CricketOracleConsumer: Invalid card address");
        playerCardContract = PlayerCardNFT(_playerCardAddress);
        isAuthorizedOracle[msg.sender] = true;
    }

    /**
     * @notice Set or revoke oracle router / relayer authorization
     */
    function setOracleAuthorization(address oracle, bool status) external onlyOwner {
        require(oracle != address(0), "CricketOracleConsumer: Invalid address");
        isAuthorizedOracle[oracle] = status;
        emit OracleAuthorizationUpdated(oracle, status);
    }

    /**
     * @notice Dispatch oracle query request to fetch player match telemetry
     */
    function requestMatchStats(
        uint256 matchId,
        uint256 cardId,
        string memory apiEndpoint
    ) external onlyOracleOrOwner returns (bytes32 requestId) {
        _requestNonce++;
        requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender, matchId, cardId, _requestNonce));

        requests[requestId] = OracleRequest({
            matchId: matchId,
            cardId: cardId,
            apiEndpoint: apiEndpoint,
            timestamp: block.timestamp,
            isFulfilled: false
        });

        emit StatsRequested(requestId, matchId, cardId, apiEndpoint);
        return requestId;
    }

    /**
     * @notice Fulfill oracle telemetry request and update player card on-chain
     */
    function fulfillRequest(
        bytes32 requestId,
        uint32 additionalRuns,
        uint32 additionalWickets,
        uint32 newStrikeRate,
        uint32 newEconomy
    ) external onlyOracleOrOwner {
        OracleRequest storage req = requests[requestId];
        require(req.timestamp != 0, "CricketOracleConsumer: Request not found");
        require(!req.isFulfilled, "CricketOracleConsumer: Request already fulfilled");

        req.isFulfilled = true;

        // Propagate dynamic mutation to PlayerCardNFT
        playerCardContract.updatePlayerStats(
            req.cardId,
            additionalRuns,
            additionalWickets,
            newStrikeRate,
            newEconomy
        );

        emit StatsFulfilled(
            requestId,
            req.cardId,
            additionalRuns,
            additionalWickets,
            newStrikeRate,
            newEconomy
        );
    }

    /**
     * @notice Direct emergency batch sync for post-match finalization
     */
    function batchSyncMatchStats(
        uint256[] calldata cardIds,
        uint32[] calldata additionalRuns,
        uint32[] calldata additionalWickets,
        uint32[] calldata newStrikeRates,
        uint32[] calldata newEconomies
    ) external onlyOracleOrOwner {
        require(
            cardIds.length == additionalRuns.length &&
            cardIds.length == additionalWickets.length &&
            cardIds.length == newStrikeRates.length &&
            cardIds.length == newEconomies.length,
            "CricketOracleConsumer: Array length mismatch"
        );

        for (uint256 i = 0; i < cardIds.length; i++) {
            playerCardContract.updatePlayerStats(
                cardIds[i],
                additionalRuns[i],
                additionalWickets[i],
                newStrikeRates[i],
                newEconomies[i]
            );
        }
    }
}

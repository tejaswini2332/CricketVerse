// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice On-chain fan polls. Every vote is a wallet transaction and is counted once per address.
contract FanPolls is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant VOTE_REWARD = 10 ether;
    IERC20 public immutable cricToken;
    struct Poll {
        string question;
        uint64 closesAt;
        uint256 totalVotes;
        bool exists;
    }

    uint256 public pollCount;
    mapping(uint256 => Poll) private _polls;
    mapping(uint256 => string[]) private _options;
    mapping(uint256 => mapping(uint256 => uint256)) private _votes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event PollCreated(uint256 indexed pollId, string question, uint64 closesAt);
    event VoteCast(uint256 indexed pollId, address indexed voter, uint256 indexed optionIndex, uint256 reward);

    constructor(address cricTokenAddress) Ownable(msg.sender) {
        require(cricTokenAddress != address(0), "Poll: token required");
        cricToken = IERC20(cricTokenAddress);
    }

    function createPoll(string calldata question, string[] calldata options, uint64 closesAt)
        external onlyOwner returns (uint256 pollId)
    {
        require(bytes(question).length > 0, "Poll: question required");
        require(options.length >= 2 && options.length <= 8, "Poll: use 2-8 options");
        require(closesAt > block.timestamp, "Poll: close time must be future");
        pollId = ++pollCount;
        Poll storage poll = _polls[pollId];
        poll.question = question;
        poll.closesAt = closesAt;
        poll.exists = true;
        for (uint256 i; i < options.length; ++i) {
            require(bytes(options[i]).length > 0, "Poll: empty option");
            _options[pollId].push(options[i]);
        }
        emit PollCreated(pollId, question, closesAt);
    }

    function vote(uint256 pollId, uint256 optionIndex) external {
        Poll storage poll = _polls[pollId];
        require(poll.exists, "Poll: not found");
        require(block.timestamp < poll.closesAt, "Poll: closed");
        require(optionIndex < _options[pollId].length, "Poll: invalid option");
        require(!hasVoted[pollId][msg.sender], "Poll: already voted");
        hasVoted[pollId][msg.sender] = true;
        _votes[pollId][optionIndex]++;
        poll.totalVotes++;
        cricToken.safeTransfer(msg.sender, VOTE_REWARD);
        emit VoteCast(pollId, msg.sender, optionIndex, VOTE_REWARD);
    }

    function getPoll(uint256 pollId) external view returns (
        string memory question,
        string[] memory options,
        uint256[] memory voteCounts,
        uint256 totalVotes,
        uint64 closesAt,
        bool active
    ) {
        Poll storage poll = _polls[pollId];
        require(poll.exists, "Poll: not found");
        uint256 length = _options[pollId].length;
        options = new string[](length);
        voteCounts = new uint256[](length);
        for (uint256 i; i < length; ++i) {
            options[i] = _options[pollId][i];
            voteCounts[i] = _votes[pollId][i];
        }
        return (poll.question, options, voteCounts, poll.totalVotes, poll.closesAt, block.timestamp < poll.closesAt);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CRIC Utility Token
 * @author Tejaswini Kunkulagunta (CS23B032)
 * @notice Native utility token for the CricketVerse Web3 Ecosystem.
 *         Used for fantasy entry, marketplace purchases, fan polls, and match ticketing.
 */
contract CRIC is ERC20, ERC20Burnable, Ownable {
    // Maximum supply cap: 100,000,000 CRIC
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    // Faucet configuration for testing and prototype demonstrations
    uint256 public constant FAUCET_AMOUNT = 50_000 * 10 ** 18; // 50,000 CRIC per claim
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    // Authorized minters (e.g., tournament reward escrow or marketplace contract)
    mapping(address => bool) public isAuthorizedMinter;

    event FaucetClaimed(address indexed recipient, uint256 amount);
    event MinterStatusUpdated(address indexed minter, bool status);

    constructor() ERC20("CricketVerse Token", "CRIC") Ownable(msg.sender) {
        // Initial genesis mint for platform liquidity, drops & tournament rewards (10M CRIC)
        _mint(msg.sender, 10_000_000 * 10 ** 18);
        isAuthorizedMinter[msg.sender] = true;
    }

    /**
     * @notice Set minter authorization status
     */
    function setMinter(address minter, bool status) external onlyOwner {
        isAuthorizedMinter[minter] = status;
        emit MinterStatusUpdated(minter, status);
    }

    /**
     * @notice Mint CRIC tokens (restricted to owner or authorized reward engines)
     */
    function mint(address to, uint256 amount) external {
        require(isAuthorizedMinter[msg.sender] || msg.sender == owner(), "CRIC: Caller not authorized to mint");
        require(totalSupply() + amount <= MAX_SUPPLY, "CRIC: Exceeds maximum supply cap");
        _mint(to, amount);
    }

    /**
     * @notice Interactive faucet allowing prototype users to request test tokens
     */
    function claimFaucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "CRIC: Faucet cooldown active. Please wait."
        );
        require(totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY, "CRIC: Maximum supply reached");

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
}

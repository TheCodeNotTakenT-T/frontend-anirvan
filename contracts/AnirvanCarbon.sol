// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AnirvanDynamic is ERC721, Ownable {
    uint256 private _nextTokenId;

    // --- CONFIGURATION ---
    // Price per ARTHA Token = $10 USD
    // Exchange Rate: 1 POL = $0.50 USD -> So $10 = 20 POL
    uint256 public constant POL_PER_TOKEN = 20 ether; 

    // DEMO SPEED: 1 Token every 60 seconds. 
    // (In production, change this to 1 days)
    uint256 public constant SECONDS_PER_TOKEN = 120; 

    struct Project {
        address landowner;
        uint256 lastClaimTime; // Time when tokens were last bought/reset
        bool isRegistered;
    }

    // Map ID (0, 1, 2...) to Project Data
    mapping(uint256 => Project) public projects;
    
    // Metadata for the NFTs created upon purchase
    mapping(uint256 => string) private _tokenURIs;
    
    // Total number of registered land projects
    uint256 public projectCount;

    event ProjectStarted(uint256 projectId, address landowner);
    event CreditsHarvested(uint256 projectId, address buyer, uint256 tokenAmount, uint256 cost);

    constructor() ERC721("Anirvan Credit", "ARTHA") Ownable(msg.sender) {}

    // 1. Validator starts the clock
    function registerLand(address landowner) external {
        uint256 projectId = projectCount++;
        
        projects[projectId] = Project({
            landowner: landowner,
            lastClaimTime: block.timestamp, // Clock starts NOW
            isRegistered: true
        });

        emit ProjectStarted(projectId, landowner);
    }

    // 2. View function: How many tokens are waiting to be bought?
    function getPendingTokens(uint256 projectId) public view returns (uint256) {
        Project memory p = projects[projectId];
        if (!p.isRegistered) return 0;

        uint256 timeElapsed = block.timestamp - p.lastClaimTime;
        // Return whole tokens (integer math)
        return timeElapsed / SECONDS_PER_TOKEN;
    }

    // 3. Buy function: Harvest all pending tokens
    function buyPendingCredits(uint256 projectId) external payable {
        Project storage p = projects[projectId];
        require(p.isRegistered, "Project not found");

        uint256 amount = getPendingTokens(projectId);
        require(amount > 0, "No tokens accumulated yet");

        uint256 cost = amount * POL_PER_TOKEN;
        require(msg.value >= cost, "Insufficient POL");

        // RESET THE CLOCK
        // We effectively "harvest" the time up to now.
        p.lastClaimTime = block.timestamp;

        // Mint NFT to Buyer representing this batch
        uint256 nftId = _nextTokenId++;
        _mint(msg.sender, nftId);

        // Transfer POL to Landowner
        (bool success, ) = payable(p.landowner).call{value: msg.value}("");
        require(success, "Transfer failed");

        emit CreditsHarvested(projectId, msg.sender, amount, cost);
    }
}
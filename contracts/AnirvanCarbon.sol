// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract AnirvanCarbon is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // --- State Variables ---
    AggregatorV3Interface internal priceFeed; // MATIC/USD
    
    struct LandParcel {
        address landowner;
        uint256 acres;
        uint256 vegetationPercent; // 0-100
        uint8 regionType; // 1: Rural(1x), 2: Urban(2x), 3: Metro(3x)
        uint256 lastMintTime;
        bool isRegistered;
    }

    struct CarbonCredit {
        uint256 co2Amount;
        uint256 priceUsd; // Fixed at $10 base
        bool isListed;
    }

    mapping(string => LandParcel) public parcels; // ID (e.g., "SRV-KL-992") -> Parcel
    mapping(uint256 => CarbonCredit) public credits; // TokenID -> Credit Data
    mapping(address => bool) public validators;

    event LandRegistered(string parcelId, address owner);
    event CreditMinted(uint256 tokenId, uint256 amount, address owner);
    event CreditBought(uint256 tokenId, address buyer, uint256 price);

    constructor(address _priceFeed) ERC721("Anirvan Carbon", "ARTHA") Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        validators[msg.sender] = true; // Deployer is default validator
    }

    // --- Modifiers ---
    modifier onlyValidator() {
        require(validators[msg.sender], "Not authorized validator");
        _;
    }

    // --- Core Logic 1: Registration & Initial Mint ---
    function registerLandAndMint(
        string memory parcelId,
        address landowner,
        uint256 acres,
        uint256 vegPercent,
        uint8 regionType,
        string memory tokenURI
    ) external onlyValidator {
        require(!parcels[parcelId].isRegistered, "Parcel already registered");
        require(regionType >= 1 && regionType <= 3, "Invalid region");

        // 1. Store Parcel Data
        parcels[parcelId] = LandParcel({
            landowner: landowner,
            acres: acres,
            vegetationPercent: vegPercent,
            regionType: regionType,
            lastMintTime: block.timestamp,
            isRegistered: true
        });

        emit LandRegistered(parcelId, landowner);

        // 2. Trigger Initial Mint (Immediate)
        _mintCredits(parcelId, tokenURI);
    }

    // --- Core Logic 2: Calculation & Minting ---
    function _mintCredits(string memory parcelId, string memory tokenURI) internal {
        LandParcel storage p = parcels[parcelId];
        
        // Formula: Acres * (Veg% / 100) * Multiplier
        uint256 effectiveArea = (p.acres * p.vegetationPercent) / 100;
        uint256 multiplier = p.regionType; // 1, 2, or 3
        uint256 offsetAmount = effectiveArea * multiplier;

        if (offsetAmount == 0) return;

        // Mint 1 NFT representing the total tonnage for this period
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();

        _mint(p.landowner, newItemId);
        _setTokenURI(newItemId, tokenURI);

        // Set Metadata
        uint256 baseValuation = offsetAmount * 10; // $10 per ton
        credits[newItemId] = CarbonCredit({
            co2Amount: offsetAmount,
            priceUsd: baseValuation,
            isListed: true // Auto-list
        });

        emit CreditMinted(newItemId, offsetAmount, p.landowner);
    }

    // --- Marketplace Logic ---
    function getMaticPrice(uint256 usdAmount) public view returns (uint256) {
        // Chainlink returns 8 decimals (e.g. 0.50 USD = 50000000)
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price feed");
        
        // usdAmount (e.g. 10) * 10^18 (Wei) * 10^8 (Feed Decimals) / price (Feed)
        // Adjusting for precision:
        // We want MATIC wei cost. 
        // 1 MATIC = $0.70 (approx example) -> Feed: 70000000
        // Cost $10 -> 10 / 0.70 = 14.28 MATIC
        
        uint256 maticCost = (usdAmount * 1e18 * 1e8) / uint256(price); 
        return maticCost; // Returns Wei
    }

    function buyCredit(uint256 tokenId) external payable {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        require(credits[tokenId].isListed, "Not for sale");
        
        uint256 costInMatic = getMaticPrice(credits[tokenId].priceUsd);
        require(msg.value >= costInMatic, "Insufficient MATIC sent");

        address seller = ownerOf(tokenId);
        
        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);
        credits[tokenId].isListed = false;

        // Transfer Funds to Seller
        payable(seller).transfer(msg.value);

        emit CreditBought(tokenId, msg.sender, msg.value);
    }
    
    // --- Admin ---
    function addValidator(address _val) external onlyOwner {
        validators[_val] = true;
    }
}
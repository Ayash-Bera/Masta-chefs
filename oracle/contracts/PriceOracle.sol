// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title PriceOracle
 * @dev Smart contract that integrates with Pyth Network to fetch real-time price feeds
 * @notice This contract provides ETH/USD price data using Pyth Network oracles
 * @author Masta Chefs Team
 */
contract PriceOracle {
    /// @notice The Pyth contract interface for interacting with price feeds
    IPyth public immutable pyth;
    
    /// @notice ETH/USD price feed ID from Pyth Network
    /// @dev This is the unique identifier for ETH/USD price feed on Pyth
    bytes32 public constant ETH_USD_FEED_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    
    /// @notice BTC/USD price feed ID from Pyth Network
    bytes32 public constant BTC_USD_FEED_ID = 0xe62df6c8b4c85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
    
    /// @notice Event emitted when a price is successfully retrieved
    event PriceRetrieved(
        bytes32 indexed feedId,
        int64 price,
        uint64 confidence,
        int32 exponent,
        uint256 publishTime,
        string symbol
    );
    
    /// @notice Event emitted when price feeds are updated with fresh data
    event PriceFeedsUpdated(bytes32[] feedIds, uint256 updateFee);
    
    /**
     * @notice Constructor to initialize the Pyth contract
     * @param _pythContract The address of the Pyth contract
     * @dev On Ethereum Sepolia: 0xff1a0f4744e8582DF1aE09D5611b887B6a12925C
     * @dev On Ethereum Mainnet: 0x4305FB66699C3B2702D4d05CF36551390A4c69C6
     */
    constructor(address _pythContract) {
        require(_pythContract != address(0), "PriceOracle: Invalid Pyth contract address");
        pyth = IPyth(_pythContract);
    }
    
    /**
     * @notice Get the latest ETH/USD price from Pyth Network
     * @return price The price as a signed integer with decimals determined by exponent
     * @return confidence The confidence interval of the price
     * @return exponent The exponent to apply to the price (negative means division)
     * @return publishTime The timestamp when the price was published
     * @dev Uses getPriceUnsafe which returns cached price without requiring updates
     * @dev Price calculation: actualPrice = price * (10 ^ exponent)
     */
    function getEthUsdPrice() 
        external 
        view 
        returns (
            int64 price,
            uint64 confidence,
            int32 exponent,
            uint256 publishTime
        ) 
    {
        // Fetch the latest cached price data from Pyth
        // This doesn't require payment but may return stale data
        PythStructs.Price memory priceData = pyth.getPriceUnsafe(ETH_USD_FEED_ID);
        
        return (
            priceData.price,
            priceData.conf,
            priceData.expo,
            priceData.publishTime
        );
    }
    
    /**
     * @notice Get human-readable ETH/USD price with proper decimal formatting
     * @return humanPrice The price formatted as a uint256 with 18 decimals
     * @return confidence The confidence interval
     * @return publishTime The timestamp when price was published
     * @dev Converts Pyth price format to standard 18-decimal format used in DeFi
     */
    function getHumanReadableEthUsdPrice()
        external
        view
        returns (
            uint256 humanPrice,
            uint64 confidence,
            uint256 publishTime
        )
    {
        // Get raw price data from Pyth
        PythStructs.Price memory priceData = pyth.getPriceUnsafe(ETH_USD_FEED_ID);
        
        require(priceData.price > 0, "PriceOracle: Invalid price data");
        
        // Convert price using the exponent
        // Pyth typically uses negative exponents (e.g., -8 means price is in 1e-8 units)
        uint256 price = uint256(uint64(priceData.price));
        int32 expo = priceData.expo;
        
        // Calculate human readable price with 18 decimal places
        if (expo >= 0) {
            // Positive exponent: multiply by 10^expo
            humanPrice = price * (10 ** uint32(expo)) * 1e18 / 1e8;
        } else {
            // Negative exponent: divide by 10^|expo|, then normalize to 18 decimals
            uint32 absExpo = uint32(-expo);
            humanPrice = (price * 1e18) / (10 ** absExpo);
        }
        
        return (humanPrice, priceData.conf, priceData.publishTime);
    }
    
    /**
     * @notice Get BTC/USD price from Pyth Network
     * @return price The BTC price as a signed integer
     * @return confidence The confidence interval
     * @return exponent The exponent for price calculation
     * @return publishTime The timestamp when price was published
     */
    function getBtcUsdPrice()
        external
        view
        returns (
            int64 price,
            uint64 confidence,
            int32 exponent,
            uint256 publishTime
        )
    {
        PythStructs.Price memory priceData = pyth.getPriceUnsafe(BTC_USD_FEED_ID);
        
        return (
            priceData.price,
            priceData.conf,
            priceData.expo,
            priceData.publishTime
        );
    }
    
    /**
     * @notice Update price feeds with fresh data from Pyth Network
     * @param updateData Array of price update data from Pyth
     * @dev Requires payment to cover the update fee
     * @dev Get updateData from Pyth's price service API
     */
    function updatePriceFeeds(bytes[] calldata updateData) 
        external 
        payable 
    {
        // Calculate the required fee for updating prices
        uint256 fee = pyth.getUpdateFee(updateData);
        require(msg.value >= fee, "PriceOracle: Insufficient fee for price update");
        
        // Update the price feeds with provided data
        pyth.updatePriceFeeds{value: fee}(updateData);
        
        // Create array of feed IDs for the event
        bytes32[] memory feedIds = new bytes32[](2);
        feedIds[0] = ETH_USD_FEED_ID;
        feedIds[1] = BTC_USD_FEED_ID;
        
        emit PriceFeedsUpdated(feedIds, fee);
    }
    
    /**
     * @notice Get the required fee for updating price feeds
     * @param updateData Array of price update data
     * @return fee The required fee in wei
     */
    function getUpdateFee(bytes[] calldata updateData) 
        external 
        view 
        returns (uint256 fee) 
    {
        return pyth.getUpdateFee(updateData);
    }
    
    /**
     * @notice Get price with age validation
     * @param feedId The price feed identifier
     * @param maxAge Maximum acceptable age in seconds
     * @return price The price data if fresh enough
     * @dev Reverts if price is older than maxAge
     */
    function getPriceNoOlderThan(bytes32 feedId, uint256 maxAge)
        external
        view
        returns (
            int64 price,
            uint64 confidence,
            int32 exponent,
            uint256 publishTime
        )
    {
        PythStructs.Price memory priceData = pyth.getPriceNoOlderThan(feedId, maxAge);
        
        return (
            priceData.price,
            priceData.conf,
            priceData.expo,
            priceData.publishTime
        );
    }
    
    /**
     * @notice Check if a price feed exists
     * @param feedId The price feed identifier to check
     * @return exists True if the feed exists and has valid data
     */
    function priceFeedExists(bytes32 feedId) 
        external 
        view 
        returns (bool exists) 
    {
        try pyth.getPriceUnsafe(feedId) returns (PythStructs.Price memory priceData) {
            // Check if we got valid price data
            return priceData.publishTime > 0;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Get multiple prices at once for efficiency
     * @param feedIds Array of price feed identifiers
     * @return prices Array of price data structs
     */
    function getMultiplePrices(bytes32[] calldata feedIds)
        external
        view
        returns (PythStructs.Price[] memory prices)
    {
        prices = new PythStructs.Price[](feedIds.length);
        
        for (uint256 i = 0; i < feedIds.length; i++) {
            prices[i] = pyth.getPriceUnsafe(feedIds[i]);
        }
        
        return prices;
    }
    
    /**
     * @notice Calculate percentage change between two prices
     * @param oldPrice Previous price value
     * @param newPrice Current price value
     * @return changePercent Percentage change (scaled by 1e4, so 100 = 1%)
     */
    function calculatePriceChangePercent(int64 oldPrice, int64 newPrice)
        external
        pure
        returns (int256 changePercent)
    {
        if (oldPrice == 0) return 0;
        
        // Calculate: ((newPrice - oldPrice) * 10000) / oldPrice
        int256 difference = int256(newPrice) - int256(oldPrice);
        changePercent = (difference * 10000) / int256(oldPrice);
        
        return changePercent;
    }
    
    /**
     * @notice Get the Pyth contract address
     * @return The address of the Pyth contract this oracle uses
     */
    function getPythContract() external view returns (address) {
        return address(pyth);
    }
}
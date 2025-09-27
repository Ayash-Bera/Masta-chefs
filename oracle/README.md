# Pyth Price Oracle

A Solidity smart contract that integrates with Pyth Network to provide real-time cryptocurrency price feeds.

## Overview

This project provides a comprehensive price oracle solution using Pyth Network's decentralized price feeds. It supports fetching real-time prices for ETH/USD and BTC/USD with various utility functions for DeFi applications.

## Features

- ✅ Real-time ETH/USD and BTC/USD price feeds
- ✅ Human-readable price formatting (18 decimals)
- ✅ Price freshness validation
- ✅ Batch price fetching for multiple feeds
- ✅ Price change percentage calculations
- ✅ Gas-optimized operations
- ✅ Comprehensive error handling

## Contract Addresses

### Pyth Network Contracts
- **Ethereum Mainnet**: `0x4305FB66699C3B2702D4d05CF36551390A4c69C6`
- **Ethereum Sepolia**: `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C`

### Price Feed IDs
- **ETH/USD**: `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`
- **BTC/USD**: `0xe62df6c8b4c85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

3. Compile the contracts:
```bash
npm run compile
```

## Deployment

### Deploy to Sepolia Testnet
```bash
npm run deploy
```

### Deploy to Local Network
```bash
# Start local Hardhat node
npm run node

# Deploy to local network (in another terminal)
npm run deploy-local
```

## Usage

### Basic Price Fetching
```solidity
// Get raw ETH/USD price data
(int64 price, uint64 confidence, int32 exponent, uint256 publishTime) = priceOracle.getEthUsdPrice();

// Calculate actual price: price * (10 ^ exponent)
uint256 actualPrice = uint256(price) * (10 ** uint256(-exponent));
```

### Human-Readable Prices
```solidity
// Get price formatted with 18 decimals
(uint256 humanPrice, uint64 confidence, uint256 publishTime) = priceOracle.getHumanReadableEthUsdPrice();

// Convert to standard decimal format
uint256 priceInUsd = humanPrice / 1e18;
```

### Price Updates with Fresh Data
```solidity
// Update prices with fresh data from Pyth (requires payment)
bytes[] memory updateData = getPriceUpdateData(); // From Pyth API
uint256 fee = priceOracle.getUpdateFee(updateData);
priceOracle.updatePriceFeeds{value: fee}(updateData);
```

### Batch Price Fetching
```solidity
bytes32[] memory feedIds = new bytes32[](2);
feedIds[0] = priceOracle.ETH_USD_FEED_ID();
feedIds[1] = priceOracle.BTC_USD_FEED_ID();

PythStructs.Price[] memory prices = priceOracle.getMultiplePrices(feedIds);
```

## JavaScript Integration

```javascript
const { ethers } = require("ethers");

// Connect to deployed contract
const oracle = await ethers.getContractAt("PriceOracle", contractAddress);

// Get ETH price
const [price, confidence, exponent, publishTime] = await oracle.getEthUsdPrice();
console.log(`ETH/USD: $${Number(price) * Math.pow(10, Number(exponent))}`);

// Get human-readable price
const [humanPrice] = await oracle.getHumanReadableEthUsdPrice();
console.log(`ETH/USD: $${ethers.formatEther(humanPrice)}`);
```

## Testing

Run the test suite:
```bash
npm test
```

For live testing on Sepolia (tests actual Pyth integration):
```bash
npx hardhat test --network sepolia
```

## API Reference

### Core Functions

#### `getEthUsdPrice()`
Returns raw ETH/USD price data from Pyth Network.
- **Returns**: `(int64 price, uint64 confidence, int32 exponent, uint256 publishTime)`

#### `getHumanReadableEthUsdPrice()`
Returns ETH/USD price formatted with 18 decimals.
- **Returns**: `(uint256 humanPrice, uint64 confidence, uint256 publishTime)`

#### `getBtcUsdPrice()`
Returns raw BTC/USD price data from Pyth Network.
- **Returns**: `(int64 price, uint64 confidence, int32 exponent, uint256 publishTime)`

### Utility Functions

#### `updatePriceFeeds(bytes[] updateData)`
Updates price feeds with fresh data (requires payment).

#### `getUpdateFee(bytes[] updateData)`
Returns the required fee for updating price feeds.

#### `priceFeedExists(bytes32 feedId)`
Checks if a specific price feed exists and has valid data.

#### `getMultiplePrices(bytes32[] feedIds)`
Fetches multiple price feeds in a single call.

#### `calculatePriceChangePercent(int64 oldPrice, int64 newPrice)`
Calculates percentage change between two prices.

## Security Considerations

- ⚠️ Always validate price data freshness for critical applications
- ⚠️ Use confidence intervals to assess price reliability
- ⚠️ Implement circuit breakers for abnormal price movements
- ⚠️ Consider using `getPriceNoOlderThan()` for time-sensitive operations

## Gas Optimization

- Use `getMultiplePrices()` for fetching multiple feeds
- Cache price data when possible to reduce calls
- Consider price update frequency vs. gas costs

## Support

- 📚 [Pyth Network Documentation](https://docs.pyth.network/)
- 🔗 [Pyth Price Feeds](https://pyth.network/price-feeds/)
- 🛠️ [Pyth SDK](https://github.com/pyth-network/pyth-sdk-solidity)

## License

MIT License
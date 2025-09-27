// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RouterConfig
 * @notice Configuration contract for 1inch Limit Order Protocol (LOP) addresses per chain.
 * @dev Based on official 1inch LOP deployments: https://github.com/1inch/limit-order-protocol
 */
library RouterConfig {
    // 1inch Limit Order Protocol (LOP) addresses per chain
    // These are the actual LOP contract addresses, not Router V6
    address public constant ETHEREUM_MAINNET = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Ethereum
    address public constant BSC_MAINNET = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on BSC
    address public constant POLYGON_MAINNET = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Polygon
    address public constant OPTIMISM_MAINNET = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Optimism
    address public constant ARBITRUM_ONE = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Arbitrum
    address public constant GNOSIS_CHAIN = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Gnosis
    address public constant AVALANCHE = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Avalanche
    address public constant FANTOM = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Fantom
    address public constant AURORA = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Aurora
    address public constant KAIA = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Kaia
    address public constant BASE = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Base
    address public constant ZKSYNC_ERA = 0x6fd4383cB451173D5f9304F041C7BCBf27d561fF; // LOP on zkSync Era

    // Testnets (if available)
    address public constant SEPOLIA = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Sepolia
    address public constant BASE_SEPOLIA = 0x111111125421cA6dc452d289314280a0f8842A65; // LOP on Base Sepolia
    
    function getRouterForChain(uint256 chainId) internal pure returns (address) {
        if (chainId == 1) return ETHEREUM_MAINNET;
        if (chainId == 56) return BSC_MAINNET;
        if (chainId == 137) return POLYGON_MAINNET;
        if (chainId == 10) return OPTIMISM_MAINNET;
        if (chainId == 42161) return ARBITRUM_ONE;
        if (chainId == 100) return GNOSIS_CHAIN;
        if (chainId == 43114) return AVALANCHE;
        if (chainId == 250) return FANTOM;
        if (chainId == 1313161554) return AURORA;
        if (chainId == 8217) return KAIA;
        if (chainId == 8453) return BASE;
        if (chainId == 324) return ZKSYNC_ERA;
        if (chainId == 11155111) return SEPOLIA;
        if (chainId == 84532) return BASE_SEPOLIA; // Base Sepolia testnet
        
        revert("Unsupported chain");
    }
    
    function isValidRouter(address router, uint256 chainId) internal pure returns (bool) {
        return router == getRouterForChain(chainId);
    }
}


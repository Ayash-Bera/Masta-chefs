// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title RouterConfig
 * @notice Configuration contract for 1inch Router V6 addresses per chain.
 * @dev Based on official 1inch deployments: https://github.com/1inch/limit-order-protocol
 */
library RouterConfig {
    // 1inch Router V6 addresses per chain (from official docs)
    address public constant ETHEREUM_MAINNET = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant BSC_MAINNET = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant POLYGON_MAINNET = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant OPTIMISM_MAINNET = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant ARBITRUM_ONE = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant GNOSIS_CHAIN = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant AVALANCHE = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant FANTOM = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant AURORA = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant KAIA = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant BASE = 0x111111125421ca6dc452d289314280a0f8842a65;
    address public constant ZKSYNC_ERA = 0x6fd4383cb451173d5f9304f041c7bcbf27d561ff;

    // Testnets (if available)
    address public constant SEPOLIA = 0x111111125421ca6dc452d289314280a0f8842a65; // Assuming same as mainnet
    
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
        
        revert("Unsupported chain");
    }
    
    function isValidRouter(address router, uint256 chainId) internal pure returns (bool) {
        return router == getRouterForChain(chainId);
    }
}


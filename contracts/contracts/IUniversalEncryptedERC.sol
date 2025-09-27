// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IUniversalEncryptedERC
 * @notice Interface for fhERC UniversalEncryptedERC contract integration
 */
interface IUniversalEncryptedERC {
    struct Point {
        uint256 x;
        uint256 y;
    }

    struct EGCT {
        Point c1;
        Point c2;
    }

    struct AmountPCT {
        uint256[7] pct;
        uint256 index;
    }

    enum TokenType { ERC20, NATIVE, UNSUPPORTED }

    // Events
    event PrivateBurn(
        address indexed user,
        uint256[7] auditorPCT,
        address indexed auditorAddress
    );

    event PrivateMint(
        address indexed user,
        uint256[7] auditorPCT,
        address indexed auditorAddress
    );

    // View functions
    function getBalanceFromTokenAddress(
        address user,
        address tokenAddress
    ) external view returns (
        EGCT memory eGCT,
        uint256 nonce,
        AmountPCT[] memory amountPCTs,
        uint256[7] memory balancePCT,
        uint256 transactionIndex
    );

    function balanceOf(
        address user,
        uint256 tokenId
    ) external view returns (
        EGCT memory eGCT,
        uint256 nonce,
        AmountPCT[] memory amountPCTs,
        uint256[7] memory balancePCT,
        uint256 transactionIndex
    );

    function tokenIds(address tokenAddress) external view returns (uint256);
    function tokenAddresses(uint256 tokenId) external view returns (address);
    function isConverter() external view returns (bool);
    function decimals() external view returns (uint8);

    // Pool-only functions (will need to be added to fhERC or use a wrapper)
    function poolBurn(
        address from,
        address tokenAddress,
        uint256 amount,
        uint256[7] memory amountPCT
    ) external;

    function poolMint(
        address to,
        address tokenAddress,
        uint256 amount,
        uint256[7] memory amountPCT
    ) external;

    // Check if address is authorized pool
    function authorizedPools(address pool) external view returns (bool);
}


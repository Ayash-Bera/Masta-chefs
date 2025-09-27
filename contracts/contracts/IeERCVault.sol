// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IeERCVault
 * @notice Interface for eERC vault operations needed by StealthSwapPool
 */
interface IeERCVault {
    struct EGCT {
        struct Point {
            uint256 x;
            uint256 y;
        }
        Point c1;
        Point c2;
    }

    struct AmountPCT {
        uint256[7] pct;
        uint256 index;
    }

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

    function burnEncrypted(
        address from,
        address tokenAddress,
        uint256 amount,
        uint256[7] memory amountPCT
    ) external;

    function mintEncrypted(
        address to,
        address tokenAddress,
        uint256 amount,
        uint256[7] memory amountPCT
    ) external;

    function tokenIds(address tokenAddress) external view returns (uint256);
}


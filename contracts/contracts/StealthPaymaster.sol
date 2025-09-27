// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./IERC4337.sol";
import "./IUniversalEncryptedERC.sol";

/**
 * @title StealthPaymaster
 * @notice ERC-4337 paymaster that accepts gas payment in eERC tokens
 * @dev Integrates with fhERC UniversalEncryptedERC for private gas payments
 */
contract StealthPaymaster is IPaymaster, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IUniversalEncryptedERC public fhERC;
    IEntryPoint public immutable entryPoint;
    
    // Gas price oracle for converting eERC to ETH value
    mapping(address => uint256) public tokenToEthRate; // Rate in wei per token unit
    mapping(address => bool) public supportedTokens;
    
    // User deposits for gas payment
    mapping(address => mapping(address => uint256)) public userDeposits; // user => token => amount
    
    // Constants
    uint256 public constant MIN_GAS_PRICE = 1 gwei;
    uint256 public constant MAX_GAS_PRICE = 500 gwei;
    uint256 public constant RATE_PRECISION = 1e18;
    uint256 public constant MAX_COST_MULTIPLIER = 120; // 20% buffer for gas price fluctuation
    
    // Events
    event TokenRateUpdated(address indexed token, uint256 newRate);
    event TokenSupportUpdated(address indexed token, bool supported);
    event GasPayment(address indexed user, address indexed token, uint256 tokenAmount, uint256 ethValue);
    event DepositMade(address indexed user, address indexed token, uint256 amount);
    event WithdrawalMade(address indexed user, address indexed token, uint256 amount);
    
    // Errors
    error UnsupportedToken();
    error InsufficientDeposit();
    error InvalidGasPrice();
    error InvalidRate();
    error EntryPointOnly();

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert EntryPointOnly();
        _;
    }

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        _transferOwnership(msg.sender);
    }

    function setFhERC(address _fhERC) external onlyOwner {
        require(_fhERC != address(0), "fhERC=0");
        fhERC = IUniversalEncryptedERC(_fhERC);
    }

    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    function setTokenRate(address token, uint256 rateWeiPerToken) external onlyOwner {
        if (rateWeiPerToken == 0) revert InvalidRate();
        tokenToEthRate[token] = rateWeiPerToken;
        emit TokenRateUpdated(token, rateWeiPerToken);
    }

    /**
     * @notice Deposit tokens for gas payment
     * @param token Token to deposit (must be supported)
     * @param amount Amount to deposit
     */
    function depositForGas(address token, uint256 amount) external nonReentrant {
        if (!supportedTokens[token]) revert UnsupportedToken();
        
        // Check if it's an encrypted token
        bool isEncrypted = _isEncryptedToken(token);
        
        if (isEncrypted && address(fhERC) != address(0)) {
            // For encrypted tokens, we need a different deposit mechanism
            // This would require integration with fhERC's deposit/burn system
            // For now, we'll handle regular ERC20 deposits
            revert("Encrypted token deposits not yet implemented");
        } else {
            // Regular ERC20 deposit
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }
        
        userDeposits[msg.sender][token] += amount;
        emit DepositMade(msg.sender, token, amount);
    }

    /**
     * @notice Withdraw unused gas deposits
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function withdrawDeposit(address token, uint256 amount) external nonReentrant {
        require(userDeposits[msg.sender][token] >= amount, "Insufficient balance");
        
        userDeposits[msg.sender][token] -= amount;
        
        bool isEncrypted = _isEncryptedToken(token);
        
        if (isEncrypted && address(fhERC) != address(0)) {
            // For encrypted tokens, mint back to user
            uint256[7] memory amountPCT = _generateAmountPCT(msg.sender, amount);
            fhERC.poolMint(msg.sender, token, amount, amountPCT);
        } else {
            // Regular ERC20 withdrawal
            IERC20(token).safeTransfer(msg.sender, amount);
        }
        
        emit WithdrawalMade(msg.sender, token, amount);
    }

    /**
     * @notice ERC-4337 paymaster validation function
     * @param userOp The user operation
     * @param userOpHash Hash of the user operation
     * @param maxCost Maximum cost in wei
     * @return context Encoded context for postOp
     * @return validationData Validation result
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        // Decode paymaster data: [token_address][max_token_amount]
        if (userOp.paymasterAndData.length < 52) {
            return ("", 1); // Validation failed
        }
        
        address token = address(bytes20(userOp.paymasterAndData[20:40]));
        uint256 maxTokenAmount = uint256(bytes32(userOp.paymasterAndData[40:72]));
        
        // Validate token is supported
        if (!supportedTokens[token]) {
            return ("", 1); // Validation failed
        }
        
        // Validate gas price is reasonable
        if (userOp.maxFeePerGas < MIN_GAS_PRICE || userOp.maxFeePerGas > MAX_GAS_PRICE) {
            return ("", 1); // Validation failed
        }
        
        // Calculate required token amount
        uint256 tokenRate = tokenToEthRate[token];
        if (tokenRate == 0) {
            return ("", 1); // No rate set
        }
        
        // Add buffer for gas price fluctuation
        uint256 maxCostWithBuffer = (maxCost * MAX_COST_MULTIPLIER) / 100;
        uint256 requiredTokenAmount = (maxCostWithBuffer * RATE_PRECISION) / tokenRate;
        
        if (requiredTokenAmount > maxTokenAmount) {
            return ("", 1); // User didn't authorize enough tokens
        }
        
        // Check user has sufficient deposit
        if (userDeposits[userOp.sender][token] < requiredTokenAmount) {
            return ("", 1); // Insufficient deposit
        }
        
        // Reserve the tokens
        userDeposits[userOp.sender][token] -= requiredTokenAmount;
        
        // Encode context for postOp
        context = abi.encode(
            userOp.sender,
            token,
            requiredTokenAmount,
            maxCost,
            tokenRate
        );
        
        return (context, 0); // Validation succeeded
    }

    /**
     * @notice ERC-4337 post-operation function
     * @param mode Operation result mode
     * @param context Encoded context from validatePaymasterUserOp
     * @param actualGasCost Actual gas cost in wei
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override onlyEntryPoint {
        (
            address user,
            address token,
            uint256 reservedTokenAmount,
            uint256 maxCost,
            uint256 tokenRate
        ) = abi.decode(context, (address, address, uint256, uint256, uint256));
        
        if (mode == PostOpMode.postOpReverted) {
            // If postOp reverted, refund the reserved tokens
            userDeposits[user][token] += reservedTokenAmount;
            return;
        }
        
        // Calculate actual token cost
        uint256 actualTokenCost = (actualGasCost * RATE_PRECISION) / tokenRate;
        
        // Refund unused tokens
        if (reservedTokenAmount > actualTokenCost) {
            userDeposits[user][token] += (reservedTokenAmount - actualTokenCost);
        }
        
        emit GasPayment(user, token, actualTokenCost, actualGasCost);
    }

    /**
     * @notice Get user's deposit balance for a token
     */
    function getDepositBalance(address user, address token) external view returns (uint256) {
        return userDeposits[user][token];
    }

    /**
     * @notice Calculate gas cost in tokens
     */
    function calculateTokenCost(
        address token,
        uint256 gasLimit,
        uint256 gasPrice
    ) external view returns (uint256) {
        uint256 ethCost = gasLimit * gasPrice;
        uint256 tokenRate = tokenToEthRate[token];
        
        if (tokenRate == 0) return 0;
        
        return (ethCost * RATE_PRECISION) / tokenRate;
    }

    /**
     * @notice Owner can withdraw accumulated ETH from gas payments
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner()).transfer(amount);
    }

    /**
     * @notice Emergency token recovery
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    function _isEncryptedToken(address token) internal view returns (bool) {
        if (address(fhERC) == address(0)) return false;
        
        try fhERC.tokenIds(token) returns (uint256 tokenId) {
            return tokenId > 0 || token == address(0);
        } catch {
            return false;
        }
    }

    function _generateAmountPCT(address user, uint256 amount) internal view returns (uint256[7] memory) {
        // Simple PCT generation for gas payments
        uint256[7] memory pct;
        uint256 seed = uint256(keccak256(abi.encodePacked(user, amount, block.timestamp, "gas")));
        for (uint256 i = 0; i < 7; i++) {
            pct[i] = uint256(keccak256(abi.encodePacked(seed, i))) % (2**254);
        }
        return pct;
    }

    // Receive ETH for gas payments
    receive() external payable {}
}


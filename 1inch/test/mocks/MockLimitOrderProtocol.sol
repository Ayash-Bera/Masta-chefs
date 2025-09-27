// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";

contract MockLimitOrderProtocol is IOrderMixin {
    using AddressLib for Address;
    mapping(bytes32 => uint256) public remainingAmounts;
    mapping(address => mapping(uint256 => uint256)) public bitInvalidators;
    mapping(bytes32 => bool) public cancelledOrders;

    function fillOrder(
        Order calldata order,
        bytes32 r,
        bytes32 vs,
        uint256 amount,
        TakerTraits takerTraits
    ) public payable override returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash) {
        orderHash = keccak256(abi.encode(order));
        makingAmount = (amount * order.makingAmount) / order.takingAmount;
        takingAmount = amount;

        // Actual token transfers
        IERC20(order.makerAsset.get()).transferFrom(order.maker.get(), msg.sender, makingAmount);
        IERC20(order.takerAsset.get()).transferFrom(msg.sender, order.maker.get(), takingAmount);

        emit OrderFilled(orderHash, 0);
    }

    function fillOrderArgs(
        Order calldata order,
        bytes32 r,
        bytes32 vs,
        uint256 amount,
        TakerTraits takerTraits,
        bytes calldata args
    ) external payable override returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash) {
        return fillOrder(order, r, vs, amount, takerTraits);
    }

    function fillContractOrder(
        Order calldata order,
        bytes calldata signature,
        uint256 amount,
        TakerTraits takerTraits
    ) external override returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash) {
        return fillOrder(order, bytes32(0), bytes32(0), amount, takerTraits);
    }

    function fillContractOrderArgs(
        Order calldata order,
        bytes calldata signature,
        uint256 amount,
        TakerTraits takerTraits,
        bytes calldata args
    ) external override returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash) {
        return fillOrder(order, bytes32(0), bytes32(0), amount, takerTraits);
    }

    function cancelOrder(MakerTraits makerTraits, bytes32 orderHash) external override {
        cancelledOrders[orderHash] = true;
        emit OrderCancelled(orderHash);
    }

    function cancelOrders(MakerTraits[] calldata makerTraits, bytes32[] calldata orderHashes) external override {
        for (uint256 i = 0; i < orderHashes.length; i++) {
            cancelledOrders[orderHashes[i]] = true;
            emit OrderCancelled(orderHashes[i]);
        }
    }

    function bitsInvalidateForOrder(MakerTraits makerTraits, uint256 additionalMask) external override {
        bitInvalidators[msg.sender][0] |= additionalMask;
        emit BitInvalidatorUpdated(msg.sender, 0, bitInvalidators[msg.sender][0]);
    }

    function bitInvalidatorForOrder(address maker, uint256 slot) external view override returns (uint256) {
        return bitInvalidators[maker][slot];
    }

    function remainingInvalidatorForOrder(address maker, bytes32 orderHash) external view override returns (uint256) {
        return remainingAmounts[orderHash];
    }

    function rawRemainingInvalidatorForOrder(address maker, bytes32 orderHash) external view override returns (uint256) {
        return remainingAmounts[orderHash];
    }

    function hashOrder(Order calldata order) external pure override returns (bytes32) {
        return keccak256(abi.encode(order));
    }

    function simulate(address target, bytes calldata data) external override {
        (bool success, bytes memory result) = target.delegatecall(data);
        revert SimulationResults(success, result);
    }
}
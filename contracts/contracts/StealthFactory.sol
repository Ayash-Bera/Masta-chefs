// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StealthAccount.sol";

/**
 * @title StealthFactory
 * @notice Deploys minimal StealthAccount instances via CREATE2 (Clones) for deterministic per-intent accounts.
 * @dev Ownership model: owner provided at creation time. "meta" is a salt to derive a unique address.
 */
contract StealthFactory is Ownable {
    using Clones for address;

    address public immutable implementation;

    event StealthCreated(address indexed owner, bytes32 indexed salt, address stealth);

    constructor() {
        // deploy one implementation instance
        StealthAccount impl = new StealthAccount(address(this));
        implementation = address(impl);
    }

    function predictStealth(address owner, bytes32 metaSalt) external view returns (address predicted) {
        bytes32 salt = _salt(owner, metaSalt);
        predicted = implementation.predictDeterministicAddress(salt, address(this));
    }

    function createStealth(address owner, bytes32 metaSalt) external returns (address stealth) {
        require(owner != address(0), "owner=0");
        bytes32 salt = _salt(owner, metaSalt);
        stealth = implementation.cloneDeterministic(salt);
        // initialize ownership via low-level call to avoid storage in impl
        StealthAccount(payable(stealth)).transferOwnership(owner);
        emit StealthCreated(owner, metaSalt, stealth);
    }

    function _salt(address owner, bytes32 metaSalt) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner, metaSalt));
    }
}




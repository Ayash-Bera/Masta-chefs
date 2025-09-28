// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";

/// @title BaseScript
/// @notice Base script contract providing common functionality for deployment scripts
abstract contract BaseScript is Script {
    /// @notice Modifier to handle broadcasting of transactions
    modifier broadcast() {
        vm.startBroadcast();
        _;
        vm.stopBroadcast();
    }

    /// @notice Get the deployer address from private key
    /// @return deployer The address that will deploy contracts
    function getDeployer() internal view returns (address deployer) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(privateKey);
    }

    /// @notice Log deployment information
    /// @param contractName The name of the deployed contract
    /// @param contractAddress The address of the deployed contract
    function logDeployment(string memory contractName, address contractAddress) internal pure {
        console.log("=================================================================================");
        console.log("Contract Deployed:");
        console.log("Name:", contractName);
        console.log("Address:", contractAddress);
        console.log("=================================================================================");
    }

    /// @notice Validate that an address is not zero
    /// @param addr The address to validate
    /// @param name The name of the address for error messages
    function validateAddress(address addr, string memory name) internal pure {
        require(addr != address(0), string(abi.encodePacked(name, " cannot be zero address")));
    }

    /// @notice Validate that a string is not empty
    /// @param str The string to validate
    /// @param name The name of the string for error messages
    function validateString(string memory str, string memory name) internal pure {
        require(bytes(str).length > 0, string(abi.encodePacked(name, " cannot be empty")));
    }
}
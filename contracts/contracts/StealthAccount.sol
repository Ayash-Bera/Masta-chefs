// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StealthAccount
 * @notice Minimal per-intent account controlled by an owner. Supports arbitrary call execution and optional self-destruct.
 */
contract StealthAccount is Ownable {
    event Executed(address indexed target, uint256 value, bytes data, bytes result);
    event Destroyed(address indexed to, uint256 balance);
    
    error TargetNotSet();
    error ToNotSet();
    error EthXferFailed();
    error BalOfFailed();

    constructor(address _owner) Ownable(_owner) {
    }

    function exec(address target, uint256 value, bytes calldata data) external onlyOwner returns (bytes memory result) {
        if (target == address(0)) revert TargetNotSet();
        // solhint-disable-next-line avoid-low-level-calls
        (bool ok, bytes memory ret) = target.call{ value: value }(data);
        require(ok, _extractRevert(ret));
        emit Executed(target, value, data, ret);
        return ret;
    }

    function sweep(address token, address to) external onlyOwner {
        if (to == address(0)) revert ToNotSet();
        if (token == address(0)) {
            // ETH
            // solhint-disable-next-line avoid-low-level-calls
            (bool ok, ) = to.call{ value: address(this).balance }("");
            if (!ok) revert EthXferFailed();
        } else {
            // Minimal ERC20 sweep
            bytes4 sel = bytes4(keccak256("transfer(address,uint256)"));
            uint256 bal;
            // balanceOf
            {
                bytes memory d = abi.encodeWithSelector(bytes4(0x70a08231), address(this));
                // solhint-disable-next-line avoid-low-level-calls
                (bool ok, bytes memory ret) = token.call(d);
                if (!ok || ret.length < 32) revert BalOfFailed();
                bal = abi.decode(ret, (uint256));
            }
            if (bal > 0) {
                bytes memory d2 = abi.encodeWithSelector(sel, to, bal);
                // solhint-disable-next-line avoid-low-level-calls
                (bool ok2, bytes memory ret2) = token.call(d2);
                require(ok2 && (ret2.length == 0 || abi.decode(ret2, (bool))), "erc20-xfer");
            }
        }
    }

    function destroy(address payable to) external onlyOwner {
        emit Destroyed(to, address(this).balance);
        selfdestruct(to);
    }

    receive() external payable {}

    function _extractRevert(bytes memory ret) private pure returns (string memory) {
        if (ret.length < 4) return "exec";
        bytes4 sel;
        assembly { sel := mload(add(ret, 32)) }
        if (sel == 0x08c379a0 && ret.length >= 68) {
            uint256 strlen;
            assembly { strlen := mload(add(ret, 68)) }
            if (ret.length >= 100 + strlen) {
                bytes memory s = new bytes(strlen);
                for (uint256 i = 0; i < strlen; i++) {
                    s[i] = ret[100 + i];
                }
                return string(s);
            }
        }
        return "exec";
    }
}




// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IeERC} from "../interfaces/IeERC.sol";

contract eERC is IeERC {
    string private _name;
    string private _symbol;
    uint8 private constant _decimals = 18;

    address public immutable vault;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    error TransfersDisabled();
    error NotVault();

    constructor(string memory name_, string memory symbol_, address vault_) {
        _name = name_;
        _symbol = symbol_;
        vault = vault_;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    function name() external view returns (string memory) { return _name; }
    function symbol() external view returns (string memory) { return _symbol; }
    function decimals() external pure returns (uint8) { return _decimals; }
    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address a) external view returns (uint256) { return _balances[a]; }
    function allowance(address o, address s) external view returns (uint256) { return _allowances[o][s]; }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address, uint256) external pure returns (bool) {
        revert TransfersDisabled();
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert TransfersDisabled();
    }

    function mint(address to, uint256 amount) external onlyVault {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyVault {
        uint256 bal = _balances[from];
        require(bal >= amount, "INSUFFICIENT_BALANCE");
        _balances[from] = bal - amount;
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}



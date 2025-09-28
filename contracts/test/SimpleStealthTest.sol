// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";

// Simple test contract to verify Foundry is working
contract SimpleStealthTest is Test {
    function testBasic() public {
        assertTrue(true);
    }
    
    function testMath() public {
        uint256 a = 100;
        uint256 b = 200;
        uint256 sum = a + b;
        assertEq(sum, 300);
    }
    
    function testAddress() public {
        address addr = makeAddr("test");
        assertTrue(addr != address(0));
    }
}

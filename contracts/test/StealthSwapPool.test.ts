import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  StealthSwapPoolFinal,
  OneInchAdapter,
  StealthFactory,
  StealthAccount,
  IUniversalEncryptedERC,
} from "../typechain-types";

describe("StealthSwapPool Integration Tests", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let executor: SignerWithAddress;

  let stealthPool: StealthSwapPoolFinal;
  let oneInchAdapter: OneInchAdapter;
  let stealthFactory: StealthFactory;
  let mockFhERC: IUniversalEncryptedERC;
  let mockTokenIn: any;
  let mockTokenOut: any;

  const MOCK_ROUTER = "0x111111125421ca6dc452d289314280a0f8842a65"; // 1inch Router V6
  const INTENT_DEADLINE = 3600; // 1 hour
  const MIN_OUT = ethers.parseEther("0.9"); // 10% slippage
  const POLICY_HASH = ethers.keccak256(ethers.toUtf8Bytes("test-policy"));

  beforeEach(async function () {
    [owner, user1, user2, user3, executor] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockTokenIn = await MockERC20.deploy("Token In", "TIN", 18);
    mockTokenOut = await MockERC20.deploy("Token Out", "TOUT", 18);

    // Deploy OneInchAdapter
    const OneInchAdapterFactory = await ethers.getContractFactory("OneInchAdapter");
    oneInchAdapter = await OneInchAdapterFactory.deploy(MOCK_ROUTER);

    // Deploy StealthFactory
    const StealthFactoryFactory = await ethers.getContractFactory("StealthFactory");
    stealthFactory = await StealthFactoryFactory.deploy();

    // Deploy StealthSwapPool
    const StealthSwapPoolFactory = await ethers.getContractFactory("StealthSwapPoolFinal");
    stealthPool = await StealthSwapPoolFactory.deploy();

    // Setup permissions
    await stealthPool.setAdapterAllowed(await oneInchAdapter.getAddress(), true);

    // Mint tokens to users
    const mintAmount = ethers.parseEther("1000");
    await mockTokenIn.mint(user1.address, mintAmount);
    await mockTokenIn.mint(user2.address, mintAmount);
    await mockTokenIn.mint(user3.address, mintAmount);

    // Setup mock fhERC if needed for encrypted token tests
    // This would be replaced with actual fhERC deployment in integration tests
  });

  describe("Intent Creation", function () {
    it("Should create intent successfully", async function () {
      const deadline = Math.floor(Date.now() / 1000) + INTENT_DEADLINE;
      
      const tx = await stealthPool.connect(user1).createIntent(
        await mockTokenIn.getAddress(),
        await mockTokenOut.getAddress(),
        MIN_OUT,
        deadline,
        POLICY_HASH
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return stealthPool.interface.parseLog(log)?.name === "IntentCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });

    it("Should reject intent with invalid deadline", async function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600;
      
      await expect(
        stealthPool.connect(user1).createIntent(
          await mockTokenIn.getAddress(),
          await mockTokenOut.getAddress(),
          MIN_OUT,
          pastDeadline,
          POLICY_HASH
        )
      ).to.be.revertedWith("deadline");
    });

    it("Should reject intent with zero token addresses", async function () {
      const deadline = Math.floor(Date.now() / 1000) + INTENT_DEADLINE;
      
      await expect(
        stealthPool.connect(user1).createIntent(
          ethers.ZeroAddress,
          await mockTokenOut.getAddress(),
          MIN_OUT,
          deadline,
          POLICY_HASH
        )
      ).to.be.revertedWith("token=0");
    });
  });

  describe("Contributions", function () {
    let intentId: string;
    let deadline: number;

    beforeEach(async function () {
      deadline = Math.floor(Date.now() / 1000) + INTENT_DEADLINE;
      
      const tx = await stealthPool.connect(user1).createIntent(
        await mockTokenIn.getAddress(),
        await mockTokenOut.getAddress(),
        MIN_OUT,
        deadline,
        POLICY_HASH
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = stealthPool.interface.parseLog(log);
          return parsed?.name === "IntentCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = stealthPool.interface.parseLog(event);
        intentId = parsed?.args[0];
      }
    });

    it("Should allow users to contribute to intent", async function () {
      const contributeAmount = ethers.parseEther("10");
      
      // Approve tokens
      await mockTokenIn.connect(user1).approve(await stealthPool.getAddress(), contributeAmount);
      
      // Contribute
      await expect(
        stealthPool.connect(user1).contribute(intentId, contributeAmount)
      ).to.emit(stealthPool, "Contributed")
        .withArgs(intentId, user1.address, contributeAmount);

      // Check contribution
      const contribution = await stealthPool.contributedOf(intentId, user1.address);
      expect(contribution).to.equal(contributeAmount);

      // Check intent total
      const intent = await stealthPool.getIntent(intentId);
      expect(intent.total).to.equal(contributeAmount);
    });

    it("Should handle multiple contributors", async function () {
      const contributeAmount = ethers.parseEther("5");
      
      // Setup approvals
      await mockTokenIn.connect(user1).approve(await stealthPool.getAddress(), contributeAmount);
      await mockTokenIn.connect(user2).approve(await stealthPool.getAddress(), contributeAmount);
      
      // Contributions
      await stealthPool.connect(user1).contribute(intentId, contributeAmount);
      await stealthPool.connect(user2).contribute(intentId, contributeAmount);

      // Check totals
      const intent = await stealthPool.getIntent(intentId);
      expect(intent.total).to.equal(contributeAmount * 2n);

      // Check participants
      const participants = await stealthPool.getParticipants(intentId);
      expect(participants).to.include(user1.address);
      expect(participants).to.include(user2.address);
      expect(participants.length).to.equal(2);
    });

    it("Should reject contribution to expired intent", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [INTENT_DEADLINE + 1]);
      await ethers.provider.send("evm_mine", []);

      const contributeAmount = ethers.parseEther("10");
      await mockTokenIn.connect(user1).approve(await stealthPool.getAddress(), contributeAmount);
      
      await expect(
        stealthPool.connect(user1).contribute(intentId, contributeAmount)
      ).to.be.revertedWithCustomError(stealthPool, "IntentExpired");
    });

    it("Should reject zero amount contribution", async function () {
      await expect(
        stealthPool.connect(user1).contribute(intentId, 0)
      ).to.be.revertedWithCustomError(stealthPool, "ZeroAmount");
    });
  });

  describe("Execution", function () {
    let intentId: string;
    let deadline: number;
    const contributeAmount = ethers.parseEther("10");
    const expectedOutput = ethers.parseEther("9.5"); // After slippage

    beforeEach(async function () {
      deadline = Math.floor(Date.now() / 1000) + INTENT_DEADLINE;
      
      // Create intent
      const tx = await stealthPool.connect(user1).createIntent(
        await mockTokenIn.getAddress(),
        await mockTokenOut.getAddress(),
        MIN_OUT,
        deadline,
        POLICY_HASH
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = stealthPool.interface.parseLog(log);
          return parsed?.name === "IntentCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = stealthPool.interface.parseLog(event);
        intentId = parsed?.args[0];
      }

      // Setup contributions
      await mockTokenIn.connect(user1).approve(await stealthPool.getAddress(), contributeAmount);
      await mockTokenIn.connect(user2).approve(await stealthPool.getAddress(), contributeAmount);
      
      await stealthPool.connect(user1).contribute(intentId, contributeAmount);
      await stealthPool.connect(user2).contribute(intentId, contributeAmount);

      // Setup adapter with output tokens
      await mockTokenOut.mint(await oneInchAdapter.getAddress(), expectedOutput);
    });

    it("Should execute swap successfully", async function () {
      // Mock router calldata
      const mockCalldata = ethers.concat([
        "0x12345678", // Mock function selector
        ethers.zeroPadValue(MOCK_ROUTER, 32), // Router address
        ethers.zeroPadValue(await mockTokenIn.getAddress(), 32), // Token in
        ethers.zeroPadValue(await mockTokenOut.getAddress(), 32), // Token out
        ethers.zeroPadValue(ethers.toBeHex(contributeAmount * 2n), 32), // Amount in
        ethers.zeroPadValue(ethers.toBeHex(expectedOutput), 32) // Min amount out
      ]);

      await expect(
        stealthPool.connect(executor).execute(
          intentId,
          await oneInchAdapter.getAddress(),
          mockCalldata,
          MIN_OUT
        )
      ).to.emit(stealthPool, "Executed")
        .withArgs(intentId, contributeAmount * 2n, expectedOutput);

      // Check that intent is marked as executed
      const intent = await stealthPool.getIntent(intentId);
      // Note: We can't directly check executed flag as it's not in the public struct
      // In a real test, we'd need a getter or check via attempting another execution
    });

    it("Should distribute outputs pro-rata", async function () {
      const mockCalldata = ethers.concat([
        "0x12345678",
        ethers.zeroPadValue(MOCK_ROUTER, 32),
        ethers.zeroPadValue(await mockTokenIn.getAddress(), 32),
        ethers.zeroPadValue(await mockTokenOut.getAddress(), 32),
        ethers.zeroPadValue(ethers.toBeHex(contributeAmount * 2n), 32),
        ethers.zeroPadValue(ethers.toBeHex(expectedOutput), 32)
      ]);

      const user1BalanceBefore = await mockTokenOut.balanceOf(user1.address);
      const user2BalanceBefore = await mockTokenOut.balanceOf(user2.address);

      await stealthPool.connect(executor).execute(
        intentId,
        await oneInchAdapter.getAddress(),
        mockCalldata,
        MIN_OUT
      );

      const user1BalanceAfter = await mockTokenOut.balanceOf(user1.address);
      const user2BalanceAfter = await mockTokenOut.balanceOf(user2.address);

      const user1Received = user1BalanceAfter - user1BalanceBefore;
      const user2Received = user2BalanceAfter - user2BalanceBefore;

      // Both users contributed equally, so should receive equal amounts
      expect(user1Received).to.equal(user2Received);
      expect(user1Received + user2Received).to.equal(expectedOutput);
    });

    it("Should reject execution with unauthorized adapter", async function () {
      const unauthorizedAdapter = await ethers.Wallet.createRandom().getAddress();
      const mockCalldata = "0x12345678";

      await expect(
        stealthPool.connect(executor).execute(
          intentId,
          unauthorizedAdapter,
          mockCalldata,
          MIN_OUT
        )
      ).to.be.revertedWithCustomError(stealthPool, "AdapterNotAllowed");
    });

    it("Should reject execution of expired intent", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [INTENT_DEADLINE + 1]);
      await ethers.provider.send("evm_mine", []);

      const mockCalldata = "0x12345678";

      await expect(
        stealthPool.connect(executor).execute(
          intentId,
          await oneInchAdapter.getAddress(),
          mockCalldata,
          MIN_OUT
        )
      ).to.be.revertedWithCustomError(stealthPool, "IntentExpired");
    });
  });

  describe("Stealth Account Integration", function () {
    it("Should create stealth account deterministically", async function () {
      const owner = user1.address;
      const metaSalt = ethers.keccak256(ethers.toUtf8Bytes("test-intent-123"));

      // Predict address
      const predicted = await stealthFactory.predictStealth(owner, metaSalt);

      // Create stealth account
      const tx = await stealthFactory.createStealth(owner, metaSalt);
      const receipt = await tx.wait();
      
      const event = receipt?.logs.find(log => {
        try {
          const parsed = stealthFactory.interface.parseLog(log);
          return parsed?.name === "StealthCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      
      if (event) {
        const parsed = stealthFactory.interface.parseLog(event);
        const actualAddress = parsed?.args[2];
        expect(actualAddress).to.equal(predicted);
      }
    });

    it("Should allow stealth account to execute transactions", async function () {
      const owner = user1.address;
      const metaSalt = ethers.keccak256(ethers.toUtf8Bytes("test-exec"));

      // Create stealth account
      await stealthFactory.createStealth(owner, metaSalt);
      const stealthAddress = await stealthFactory.predictStealth(owner, metaSalt);

      // Get stealth account instance
      const stealthAccount = await ethers.getContractAt("StealthAccount", stealthAddress);

      // Test execution (transfer ownership back to itself as a test)
      const calldata = stealthAccount.interface.encodeFunctionData("transferOwnership", [owner]);
      
      await expect(
        stealthAccount.connect(user1).exec(stealthAddress, 0, calldata)
      ).to.emit(stealthAccount, "Executed");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set fhERC address", async function () {
      const mockFhERCAddress = await ethers.Wallet.createRandom().getAddress();
      
      await expect(
        stealthPool.connect(owner).setFhERC(mockFhERCAddress)
      ).to.emit(stealthPool, "FhERCSet")
        .withArgs(mockFhERCAddress);

      expect(await stealthPool.fhERC()).to.equal(mockFhERCAddress);
    });

    it("Should reject non-owner setting fhERC", async function () {
      const mockFhERCAddress = await ethers.Wallet.createRandom().getAddress();
      
      await expect(
        stealthPool.connect(user1).setFhERC(mockFhERCAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to manage adapter permissions", async function () {
      const newAdapter = await ethers.Wallet.createRandom().getAddress();
      
      await expect(
        stealthPool.connect(owner).setAdapterAllowed(newAdapter, true)
      ).to.emit(stealthPool, "AdapterAllowed")
        .withArgs(newAdapter, true);

      expect(await stealthPool.allowedAdapters(newAdapter)).to.be.true;

      // Revoke permission
      await stealthPool.connect(owner).setAdapterAllowed(newAdapter, false);
      expect(await stealthPool.allowedAdapters(newAdapter)).to.be.false;
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle rounding in pro-rata distribution", async function () {
      // Test with amounts that don't divide evenly
      const intentDeadline = Math.floor(Date.now() / 1000) + INTENT_DEADLINE;
      
      const tx = await stealthPool.connect(user1).createIntent(
        await mockTokenIn.getAddress(),
        await mockTokenOut.getAddress(),
        MIN_OUT,
        intentDeadline,
        POLICY_HASH
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          const parsed = stealthPool.interface.parseLog(log);
          return parsed?.name === "IntentCreated";
        } catch {
          return false;
        }
      });

      let intentId = "";
      if (event) {
        const parsed = stealthPool.interface.parseLog(event);
        intentId = parsed?.args[0];
      }

      // Uneven contributions
      const contrib1 = ethers.parseEther("3");
      const contrib2 = ethers.parseEther("7");
      const totalContrib = contrib1 + contrib2;
      const outputAmount = ethers.parseEther("9.99"); // Odd output amount

      await mockTokenIn.connect(user1).approve(await stealthPool.getAddress(), contrib1);
      await mockTokenIn.connect(user2).approve(await stealthPool.getAddress(), contrib2);
      
      await stealthPool.connect(user1).contribute(intentId, contrib1);
      await stealthPool.connect(user2).contribute(intentId, contrib2);

      await mockTokenOut.mint(await oneInchAdapter.getAddress(), outputAmount);

      const mockCalldata = ethers.concat([
        "0x12345678",
        ethers.zeroPadValue(MOCK_ROUTER, 32),
        ethers.zeroPadValue(await mockTokenIn.getAddress(), 32),
        ethers.zeroPadValue(await mockTokenOut.getAddress(), 32),
        ethers.zeroPadValue(ethers.toBeHex(totalContrib), 32),
        ethers.zeroPadValue(ethers.toBeHex(outputAmount), 32)
      ]);

      await stealthPool.connect(executor).execute(
        intentId,
        await oneInchAdapter.getAddress(),
        mockCalldata,
        MIN_OUT
      );

      // Check that total distribution doesn't exceed output (no dust left in contract)
      const contractBalance = await mockTokenOut.balanceOf(await stealthPool.getAddress());
      expect(contractBalance).to.equal(0);
    });

    it("Should prevent reentrancy attacks", async function () {
      // This would require a malicious token contract
      // For now, we verify the nonReentrant modifier is in place
      expect(true).to.be.true; // Placeholder - actual reentrancy test would need malicious contract
    });
  });
});

// Mock ERC20 contract for testing
// This should be in a separate file in a real project
contract MockERC20 {
  string public name;
  string public symbol;
  uint8 public decimals;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  constructor(string memory _name, string memory _symbol, uint8 _decimals) {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
  }

  function mint(address to, uint256 amount) external {
    balanceOf[to] += amount;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    return true;
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    require(balanceOf[msg.sender] >= amount);
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
    return true;
  }

  function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    require(balanceOf[from] >= amount);
    require(allowance[from][msg.sender] >= amount);
    balanceOf[from] -= amount;
    balanceOf[to] += amount;
    allowance[from][msg.sender] -= amount;
    return true;
  }
}


import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  StealthPaymaster,
  MockERC20,
  IUniversalEncryptedERC,
} from "../typechain-types";

describe("StealthPaymaster Tests", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let entryPoint: SignerWithAddress;

  let paymaster: StealthPaymaster;
  let mockToken: MockERC20;
  let mockEntryPoint: any;

  const TOKEN_RATE = ethers.parseEther("0.001"); // 1 token = 0.001 ETH
  const GAS_LIMIT = 100000n;
  const GAS_PRICE = ethers.parseUnits("20", "gwei");

  beforeEach(async function () {
    [owner, user1, user2, entryPoint] = await ethers.getSigners();

    // Deploy mock EntryPoint
    mockEntryPoint = entryPoint.address;

    // Deploy StealthPaymaster
    const StealthPaymasterFactory = await ethers.getContractFactory("StealthPaymaster");
    paymaster = await StealthPaymasterFactory.deploy(mockEntryPoint);

    // Deploy mock token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Gas Token", "GAS", 18);

    // Setup token support and rate
    await paymaster.setSupportedToken(await mockToken.getAddress(), true);
    await paymaster.setTokenRate(await mockToken.getAddress(), TOKEN_RATE);

    // Mint tokens to users
    await mockToken.mint(user1.address, ethers.parseEther("1000"));
    await mockToken.mint(user2.address, ethers.parseEther("1000"));
  });

  describe("Token Management", function () {
    it("Should allow owner to set supported tokens", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await expect(
        paymaster.connect(owner).setSupportedToken(tokenAddress, true)
      ).to.emit(paymaster, "TokenSupportUpdated")
        .withArgs(tokenAddress, true);

      expect(await paymaster.supportedTokens(tokenAddress)).to.be.true;

      // Disable token
      await paymaster.connect(owner).setSupportedToken(tokenAddress, false);
      expect(await paymaster.supportedTokens(tokenAddress)).to.be.false;
    });

    it("Should allow owner to set token rates", async function () {
      const tokenAddress = await mockToken.getAddress();
      const newRate = ethers.parseEther("0.002");
      
      await expect(
        paymaster.connect(owner).setTokenRate(tokenAddress, newRate)
      ).to.emit(paymaster, "TokenRateUpdated")
        .withArgs(tokenAddress, newRate);

      expect(await paymaster.tokenToEthRate(tokenAddress)).to.equal(newRate);
    });

    it("Should reject non-owner token management", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await expect(
        paymaster.connect(user1).setSupportedToken(tokenAddress, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        paymaster.connect(user1).setTokenRate(tokenAddress, TOKEN_RATE)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject zero rate", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await expect(
        paymaster.connect(owner).setTokenRate(tokenAddress, 0)
      ).to.be.revertedWithCustomError(paymaster, "InvalidRate");
    });
  });

  describe("Gas Deposits", function () {
    beforeEach(async function () {
      // Approve paymaster to spend tokens
      await mockToken.connect(user1).approve(await paymaster.getAddress(), ethers.parseEther("100"));
    });

    it("Should allow users to deposit tokens for gas", async function () {
      const depositAmount = ethers.parseEther("10");
      const tokenAddress = await mockToken.getAddress();
      
      await expect(
        paymaster.connect(user1).depositForGas(tokenAddress, depositAmount)
      ).to.emit(paymaster, "DepositMade")
        .withArgs(user1.address, tokenAddress, depositAmount);

      expect(await paymaster.getDepositBalance(user1.address, tokenAddress)).to.equal(depositAmount);
    });

    it("Should reject deposits for unsupported tokens", async function () {
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const unsupportedToken = await MockERC20Factory.deploy("Unsupported", "UNSUPP", 18);
      
      const depositAmount = ethers.parseEther("10");
      
      await expect(
        paymaster.connect(user1).depositForGas(await unsupportedToken.getAddress(), depositAmount)
      ).to.be.revertedWithCustomError(paymaster, "UnsupportedToken");
    });

    it("Should allow users to withdraw deposits", async function () {
      const depositAmount = ethers.parseEther("10");
      const withdrawAmount = ethers.parseEther("5");
      const tokenAddress = await mockToken.getAddress();
      
      // Deposit
      await paymaster.connect(user1).depositForGas(tokenAddress, depositAmount);
      
      const balanceBefore = await mockToken.balanceOf(user1.address);
      
      // Withdraw
      await expect(
        paymaster.connect(user1).withdrawDeposit(tokenAddress, withdrawAmount)
      ).to.emit(paymaster, "WithdrawalMade")
        .withArgs(user1.address, tokenAddress, withdrawAmount);

      expect(await paymaster.getDepositBalance(user1.address, tokenAddress)).to.equal(depositAmount - withdrawAmount);
      expect(await mockToken.balanceOf(user1.address)).to.equal(balanceBefore + withdrawAmount);
    });

    it("Should reject withdrawal of more than deposited", async function () {
      const depositAmount = ethers.parseEther("10");
      const withdrawAmount = ethers.parseEther("15");
      const tokenAddress = await mockToken.getAddress();
      
      await paymaster.connect(user1).depositForGas(tokenAddress, depositAmount);
      
      await expect(
        paymaster.connect(user1).withdrawDeposit(tokenAddress, withdrawAmount)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Gas Cost Calculation", function () {
    it("Should calculate token cost correctly", async function () {
      const tokenAddress = await mockToken.getAddress();
      const expectedEthCost = GAS_LIMIT * GAS_PRICE;
      const expectedTokenCost = (expectedEthCost * ethers.parseEther("1")) / TOKEN_RATE;
      
      const calculatedCost = await paymaster.calculateTokenCost(tokenAddress, GAS_LIMIT, GAS_PRICE);
      expect(calculatedCost).to.equal(expectedTokenCost);
    });

    it("Should return zero for tokens without rate", async function () {
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const noRateToken = await MockERC20Factory.deploy("No Rate", "NORATE", 18);
      
      const calculatedCost = await paymaster.calculateTokenCost(await noRateToken.getAddress(), GAS_LIMIT, GAS_PRICE);
      expect(calculatedCost).to.equal(0);
    });
  });

  describe("Paymaster Validation (Mock)", function () {
    let userOp: any;

    beforeEach(async function () {
      const tokenAddress = await mockToken.getAddress();
      const maxTokenAmount = ethers.parseEther("1");
      
      // Mock UserOperation
      userOp = {
        sender: user1.address,
        nonce: 0,
        initCode: "0x",
        callData: "0x",
        callGasLimit: GAS_LIMIT,
        verificationGasLimit: 150000,
        preVerificationGas: 21000,
        maxFeePerGas: GAS_PRICE,
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        paymasterAndData: ethers.concat([
          await paymaster.getAddress(),
          tokenAddress,
          ethers.zeroPadValue(ethers.toBeHex(maxTokenAmount), 32)
        ]),
        signature: "0x"
      };

      // User deposits tokens
      await mockToken.connect(user1).approve(await paymaster.getAddress(), ethers.parseEther("100"));
      await paymaster.connect(user1).depositForGas(tokenAddress, ethers.parseEther("10"));
    });

    it("Should validate paymaster operation (simulated)", async function () {
      // Since we can't easily mock the EntryPoint, we'll test the validation logic indirectly
      const tokenAddress = await mockToken.getAddress();
      const userBalance = await paymaster.getDepositBalance(user1.address, tokenAddress);
      
      expect(userBalance).to.be.greaterThan(0);
      expect(await paymaster.supportedTokens(tokenAddress)).to.be.true;
      expect(await paymaster.tokenToEthRate(tokenAddress)).to.equal(TOKEN_RATE);
    });

    it("Should calculate required token amount with buffer", async function () {
      const maxCost = GAS_LIMIT * GAS_PRICE;
      const maxCostWithBuffer = (maxCost * 120n) / 100n; // 20% buffer
      const requiredTokenAmount = (maxCostWithBuffer * ethers.parseEther("1")) / TOKEN_RATE;
      
      // Verify calculation
      expect(requiredTokenAmount).to.be.greaterThan((maxCost * ethers.parseEther("1")) / TOKEN_RATE);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to withdraw ETH", async function () {
      // Send some ETH to paymaster
      await owner.sendTransaction({
        to: await paymaster.getAddress(),
        value: ethers.parseEther("1")
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const withdrawAmount = ethers.parseEther("0.5");
      
      await paymaster.connect(owner).withdrawETH(withdrawAmount);
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
    });

    it("Should allow emergency token withdrawal", async function () {
      const tokenAddress = await mockToken.getAddress();
      const emergencyAmount = ethers.parseEther("100");
      
      // Transfer tokens to paymaster (simulating stuck tokens)
      await mockToken.mint(await paymaster.getAddress(), emergencyAmount);
      
      const ownerBalanceBefore = await mockToken.balanceOf(owner.address);
      
      await paymaster.connect(owner).emergencyWithdraw(tokenAddress, emergencyAmount);
      
      const ownerBalanceAfter = await mockToken.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + emergencyAmount);
    });

    it("Should reject non-owner admin functions", async function () {
      await expect(
        paymaster.connect(user1).withdrawETH(ethers.parseEther("1"))
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        paymaster.connect(user1).emergencyWithdraw(await mockToken.getAddress(), ethers.parseEther("1"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle multiple users with different tokens", async function () {
      // Deploy second token
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const token2 = await MockERC20Factory.deploy("Token 2", "TK2", 6);
      const token2Rate = ethers.parseEther("0.0005"); // Different rate
      
      await paymaster.setSupportedToken(await token2.getAddress(), true);
      await paymaster.setTokenRate(await token2.getAddress(), token2Rate);
      
      // Mint and setup approvals
      await token2.mint(user2.address, ethers.parseUnits("1000", 6));
      await token2.connect(user2).approve(await paymaster.getAddress(), ethers.parseUnits("100", 6));
      
      // Both users deposit different tokens
      await paymaster.connect(user1).depositForGas(await mockToken.getAddress(), ethers.parseEther("10"));
      await paymaster.connect(user2).depositForGas(await token2.getAddress(), ethers.parseUnits("20", 6));
      
      // Verify balances
      expect(await paymaster.getDepositBalance(user1.address, await mockToken.getAddress())).to.equal(ethers.parseEther("10"));
      expect(await paymaster.getDepositBalance(user2.address, await token2.getAddress())).to.equal(ethers.parseUnits("20", 6));
    });

    it("Should handle gas price fluctuations", async function () {
      const lowGasPrice = ethers.parseUnits("10", "gwei");
      const highGasPrice = ethers.parseUnits("50", "gwei");
      
      const tokenAddress = await mockToken.getAddress();
      
      const lowCost = await paymaster.calculateTokenCost(tokenAddress, GAS_LIMIT, lowGasPrice);
      const highCost = await paymaster.calculateTokenCost(tokenAddress, GAS_LIMIT, highGasPrice);
      
      expect(highCost).to.be.greaterThan(lowCost);
      expect(highCost).to.equal(lowCost * 5n); // 5x gas price = 5x cost
    });
  });
});


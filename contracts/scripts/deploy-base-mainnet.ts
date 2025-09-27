import { ethers } from "hardhat";
import { Contract } from "ethers";

// Base Mainnet Configuration
const BASE_MAINNET_RPC = "https://mainnet.base.org";
const PRIVATE_KEY = "0x286385f304709705c98f8e8ebde96cefde2e92efffbe558ea5bece836eb3f4ca";
const FHERC_ADDRESS = "0xD5afc45c69644CBd63f362D64B4198a7d81e53C7";
const LOP_ADDRESS = "0x111111125421cA6dc452d289314280a0f8842A65";

interface DeploymentData {
  network: string;
  chainId: number;
  deployer: string;
  deploymentTimestamp: string;
  contracts: {
    stealthSwapPool: string;
    oneInchAdapter: string;
    stealthFactory: string;
    stealthPaymaster: string;
    fhERC: string;
    lop: string;
  };
  gasUsed: {
    stealthSwapPool: number;
    oneInchAdapter: number;
    stealthFactory: number;
    stealthPaymaster: number;
    total: number;
  };
}

async function deployToBaseMainnet(): Promise<DeploymentData> {
  console.log("🚀 Deploying Stealth Swap System to Base Mainnet");
  console.log("=" * 60);

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(BASE_MAINNET_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Deployer address:", wallet.address);
  console.log("Network:", await provider.getNetwork());

  const deploymentData: DeploymentData = {
    network: "base-mainnet",
    chainId: 8453,
    deployer: wallet.address,
    deploymentTimestamp: new Date().toISOString(),
    contracts: {
      stealthSwapPool: "",
      oneInchAdapter: "",
      stealthFactory: "",
      stealthPaymaster: "",
      fhERC: FHERC_ADDRESS,
      lop: LOP_ADDRESS,
    },
    gasUsed: {
      stealthSwapPool: 0,
      oneInchAdapter: 0,
      stealthFactory: 0,
      stealthPaymaster: 0,
      total: 0,
    }
  };

  try {
    // 1. Deploy OneInchAdapter
    console.log("\n📦 1. Deploying OneInchAdapter...");
    const OneInchAdapterFactory = await ethers.getContractFactory("OneInchAdapter");
    const oneInchAdapter = await OneInchAdapterFactory.connect(wallet).deploy(LOP_ADDRESS);
    await oneInchAdapter.waitForDeployment();
    
    const adapterAddress = await oneInchAdapter.getAddress();
    const adapterTx = await oneInchAdapter.deploymentTransaction();
    const adapterGasUsed = adapterTx?.gasLimit || 0;
    
    deploymentData.contracts.oneInchAdapter = adapterAddress;
    deploymentData.gasUsed.oneInchAdapter = Number(adapterGasUsed);
    
    console.log("✅ OneInchAdapter deployed to:", adapterAddress);
    console.log("   Gas used:", adapterGasUsed.toString());

    // 2. Deploy StealthSwapPoolFinal
    console.log("\n📦 2. Deploying StealthSwapPoolFinal...");
    const StealthSwapPoolFactory = await ethers.getContractFactory("StealthSwapPoolFinal");
    const stealthSwapPool = await StealthSwapPoolFactory.connect(wallet).deploy();
    await stealthSwapPool.waitForDeployment();
    
    const poolAddress = await stealthSwapPool.getAddress();
    const poolTx = await stealthSwapPool.deploymentTransaction();
    const poolGasUsed = poolTx?.gasLimit || 0;
    
    deploymentData.contracts.stealthSwapPool = poolAddress;
    deploymentData.gasUsed.stealthSwapPool = Number(poolGasUsed);
    
    console.log("✅ StealthSwapPoolFinal deployed to:", poolAddress);
    console.log("   Gas used:", poolGasUsed.toString());

    // 3. Deploy StealthFactory
    console.log("\n📦 3. Deploying StealthFactory...");
    const StealthFactoryFactory = await ethers.getContractFactory("StealthFactory");
    const stealthFactory = await StealthFactoryFactory.connect(wallet).deploy();
    await stealthFactory.waitForDeployment();
    
    const factoryAddress = await stealthFactory.getAddress();
    const factoryTx = await stealthFactory.deploymentTransaction();
    const factoryGasUsed = factoryTx?.gasLimit || 0;
    
    deploymentData.contracts.stealthFactory = factoryAddress;
    deploymentData.gasUsed.stealthFactory = Number(factoryGasUsed);
    
    console.log("✅ StealthFactory deployed to:", factoryAddress);
    console.log("   Gas used:", factoryGasUsed.toString());

    // 4. Deploy StealthPaymaster
    console.log("\n📦 4. Deploying StealthPaymaster...");
    const StealthPaymasterFactory = await ethers.getContractFactory("StealthPaymaster");
    const stealthPaymaster = await StealthPaymasterFactory.connect(wallet).deploy(FHERC_ADDRESS);
    await stealthPaymaster.waitForDeployment();
    
    const paymasterAddress = await stealthPaymaster.getAddress();
    const paymasterTx = await stealthPaymaster.deploymentTransaction();
    const paymasterGasUsed = paymasterTx?.gasLimit || 0;
    
    deploymentData.contracts.stealthPaymaster = paymasterAddress;
    deploymentData.gasUsed.stealthPaymaster = Number(paymasterGasUsed);
    
    console.log("✅ StealthPaymaster deployed to:", paymasterAddress);
    console.log("   Gas used:", paymasterGasUsed.toString());

    // 5. Configure contracts
    console.log("\n⚙️ 5. Configuring contracts...");
    
    // Set adapter as allowed in pool
    const setAdapterTx = await stealthSwapPool.connect(wallet).setAdapterAllowed(adapterAddress, true);
    await setAdapterTx.wait();
    console.log("✅ Adapter allowed in pool");

    // Set fhERC in pool
    const setFhERCTx = await stealthSwapPool.connect(wallet).setFhERC(FHERC_ADDRESS);
    await setFhERCTx.wait();
    console.log("✅ fhERC set in pool");

    // Calculate total gas used
    deploymentData.gasUsed.total = 
      deploymentData.gasUsed.oneInchAdapter +
      deploymentData.gasUsed.stealthSwapPool +
      deploymentData.gasUsed.stealthFactory +
      deploymentData.gasUsed.stealthPaymaster;

    console.log("\n🎉 Deployment completed successfully!");
    console.log("=" * 60);
    console.log("📊 Deployment Summary:");
    console.log("   StealthSwapPool:", poolAddress);
    console.log("   OneInchAdapter:", adapterAddress);
    console.log("   StealthFactory:", factoryAddress);
    console.log("   StealthPaymaster:", paymasterAddress);
    console.log("   fhERC (existing):", FHERC_ADDRESS);
    console.log("   LOP Address:", LOP_ADDRESS);
    console.log("   Total Gas Used:", deploymentData.gasUsed.total);
    console.log("   Deployer:", wallet.address);

    return deploymentData;

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

async function main() {
  try {
    const deploymentData = await deployToBaseMainnet();
    
    // Save deployment data
    const fs = require("fs");
    const path = require("path");
    
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, "base-mainnet-deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    
    console.log("\n📁 Deployment data saved to:", deploymentFile);
    console.log("🔗 Explorer: https://basescan.org/address/" + deploymentData.contracts.stealthSwapPool);
    
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { deployToBaseMainnet };

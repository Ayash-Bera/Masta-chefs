import { ethers, network } from "hardhat";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🚀 Deploying StealthSwap System...");
  console.log("Network:", network.name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const deploymentData: any = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    deploymentTimestamp: new Date().toISOString(),
    contracts: {},
    gasUsed: {},
    addresses: {}
  };

  // 1. Deploy OneInchAdapter with correct router for chain
  console.log("\n📦 1. Deploying OneInchAdapter...");
  
  let routerAddress: string;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  
  // Get correct 1inch router for chain
  switch (chainId) {
    case 1: // Ethereum Mainnet
      routerAddress = "0x111111125421ca6dc452d289314280a0f8842a65";
      break;
    case 8453: // Base Mainnet
      routerAddress = "0x111111125421ca6dc452d289314280a0f8842a65";
      break;
    case 11155111: // Sepolia Testnet
      routerAddress = "0x111111125421ca6dc452d289314280a0f8842a65";
      break;
    case 84532: // Base Sepolia
      routerAddress = "0x111111125421ca6dc452d289314280a0f8842a65";
      break;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const OneInchAdapterFactory = await ethers.getContractFactory("OneInchAdapter");
  const oneInchAdapter = await OneInchAdapterFactory.deploy(routerAddress);
  await oneInchAdapter.waitForDeployment();
  
  const adapterAddress = await oneInchAdapter.getAddress();
  deploymentData.contracts.oneInchAdapter = adapterAddress;
  deploymentData.addresses.router = routerAddress;
  
  console.log("✅ OneInchAdapter deployed to:", adapterAddress);
  console.log("   Router address:", routerAddress);

  // 2. Deploy StealthFactory
  console.log("\n📦 2. Deploying StealthFactory...");
  
  const StealthFactoryFactory = await ethers.getContractFactory("StealthFactory");
  const stealthFactory = await StealthFactoryFactory.deploy();
  await stealthFactory.waitForDeployment();
  
  const factoryAddress = await stealthFactory.getAddress();
  deploymentData.contracts.stealthFactory = factoryAddress;
  
  console.log("✅ StealthFactory deployed to:", factoryAddress);

  // 3. Deploy StealthSwapPoolFinal
  console.log("\n📦 3. Deploying StealthSwapPoolFinal...");
  
  const StealthSwapPoolFactory = await ethers.getContractFactory("StealthSwapPoolFinal");
  const stealthSwapPool = await StealthSwapPoolFactory.deploy();
  await stealthSwapPool.waitForDeployment();
  
  const poolAddress = await stealthSwapPool.getAddress();
  deploymentData.contracts.stealthSwapPool = poolAddress;
  
  console.log("✅ StealthSwapPool deployed to:", poolAddress);

  // 4. Configure StealthSwapPool
  console.log("\n⚙️  4. Configuring StealthSwapPool...");
  
  // Allow OneInchAdapter
  const allowAdapterTx = await stealthSwapPool.setAdapterAllowed(adapterAddress, true);
  await allowAdapterTx.wait();
  console.log("✅ OneInchAdapter authorized");

  // Set fhERC address if provided via environment
  const fhERCAddress = process.env.FHERC_ADDRESS;
  if (fhERCAddress) {
    console.log("Setting fhERC address:", fhERCAddress);
    const setFhERCTx = await stealthSwapPool.setFhERC(fhERCAddress);
    await setFhERCTx.wait();
    deploymentData.addresses.fhERC = fhERCAddress;
    console.log("✅ fhERC address configured");
  } else {
    console.log("⚠️  No fhERC address provided. Set FHERC_ADDRESS environment variable if needed.");
  }

  // 5. Deploy test tokens for non-mainnet networks
  if (chainId !== 1 && chainId !== 8453) {
    console.log("\n📦 5. Deploying test tokens...");
    
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    
    const testTokenA = await MockERC20Factory.deploy("Test Token A", "TESTA", 18);
    await testTokenA.waitForDeployment();
    const testTokenAAddress = await testTokenA.getAddress();
    
    const testTokenB = await MockERC20Factory.deploy("Test Token B", "TESTB", 6);
    await testTokenB.waitForDeployment();
    const testTokenBAddress = await testTokenB.getAddress();
    
    deploymentData.contracts.testTokenA = testTokenAAddress;
    deploymentData.contracts.testTokenB = testTokenBAddress;
    
    console.log("✅ Test Token A deployed to:", testTokenAAddress);
    console.log("✅ Test Token B deployed to:", testTokenBAddress);
    
    // Mint test tokens to deployer
    await testTokenA.mint(deployer.address, ethers.parseEther("1000000"));
    await testTokenB.mint(deployer.address, ethers.parseUnits("1000000", 6));
    console.log("✅ Test tokens minted to deployer");
  }

  // 6. Verification info
  console.log("\n📋 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("Network:", network.name);
  console.log("Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  console.log("\n📍 Contract Addresses:");
  console.log("OneInchAdapter:", adapterAddress);
  console.log("StealthFactory:", factoryAddress);
  console.log("StealthSwapPool:", poolAddress);
  if (fhERCAddress) {
    console.log("fhERC:", fhERCAddress);
  }
  console.log("1inch Router:", routerAddress);

  // 7. Save deployment data
  const deploymentsDir = join(__dirname, "../deployments");
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `stealth-swap-${network.name}-${Date.now()}.json`;
  const filepath = join(deploymentsDir, filename);
  const latestFilepath = join(deploymentsDir, `latest-${network.name}.json`);
  
  writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  writeFileSync(latestFilepath, JSON.stringify(deploymentData, null, 2));
  
  console.log("\n💾 Deployment data saved to:");
  console.log("  ", filepath);
  console.log("  ", latestFilepath);

  // 8. Contract verification commands
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔍 Contract Verification Commands:");
    console.log("=".repeat(50));
    console.log(`npx hardhat verify --network ${network.name} ${adapterAddress} "${routerAddress}"`);
    console.log(`npx hardhat verify --network ${network.name} ${factoryAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${poolAddress}`);
    
    if (deploymentData.contracts.testTokenA) {
      console.log(`npx hardhat verify --network ${network.name} ${deploymentData.contracts.testTokenA} "Test Token A" "TESTA" 18`);
      console.log(`npx hardhat verify --network ${network.name} ${deploymentData.contracts.testTokenB} "Test Token B" "TESTB" 6`);
    }
  }

  console.log("\n🎉 Deployment completed successfully!");
  
  return {
    oneInchAdapter: adapterAddress,
    stealthFactory: factoryAddress,
    stealthSwapPool: poolAddress,
    router: routerAddress,
    fhERC: fhERCAddress
  };
}

// Handle both direct execution and module import
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployStealthSwap };


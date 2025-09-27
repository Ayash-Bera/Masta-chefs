const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying PriceOracle to Sepolia...");
  
  // Pyth Network contract address on Sepolia
  const PYTH_CONTRACT_SEPOLIA = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C";
  
  console.log(`📍 Using Pyth contract: ${PYTH_CONTRACT_SEPOLIA}`);
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying with account: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("❌ Insufficient balance for deployment. Need at least 0.01 ETH");
  }
  
  // Deploy PriceOracle
  console.log("📝 Getting contract factory...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  
  console.log("🔨 Deploying contract...");
  const priceOracle = await PriceOracle.deploy(PYTH_CONTRACT_SEPOLIA);
  
  console.log("⏳ Waiting for deployment confirmation...");
  await priceOracle.waitForDeployment();
  
  const contractAddress = await priceOracle.getAddress();
  console.log(`✅ PriceOracle deployed to: ${contractAddress}`);
  
  // Test the contract
  console.log("\n🧪 Testing contract functionality...");
  try {
    // Test ETH price fetch
    console.log("📈 Fetching ETH/USD price...");
    const [price, confidence, exponent, publishTime] = await priceOracle.getEthUsdPrice();
    console.log(`📊 Raw price data:`);
    console.log(`   Price: ${price}`);
    console.log(`   Confidence: ${confidence}`);
    console.log(`   Exponent: ${exponent}`);
    console.log(`   Publish Time: ${new Date(Number(publishTime) * 1000).toISOString()}`);
    
    // Test human readable price
    console.log("💲 Fetching human-readable price...");
    const [humanPrice, conf, pubTime] = await priceOracle.getHumanReadableEthUsdPrice();
    console.log(`💰 ETH/USD Price: $${ethers.formatEther(humanPrice)}`);
    console.log(`🎯 Confidence: ${conf}`);
    console.log(`⏰ Updated: ${new Date(Number(pubTime) * 1000).toISOString()}`);
    
  } catch (error) {
    console.log(`⚠️  Price test failed: ${error.message}`);
    console.log("This might be normal if Pyth feeds are not available or stale");
  }
  
  // Verify contract on Etherscan
  console.log("\n📋 Contract deployment summary:");
  console.log("================================");
  console.log(`Contract Name: PriceOracle`);
  console.log(`Network: Sepolia Testnet`);
  console.log(`Address: ${contractAddress}`);
  console.log(`Pyth Contract: ${PYTH_CONTRACT_SEPOLIA}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Transaction Hash: ${priceOracle.deploymentTransaction()?.hash}`);
  
  console.log("\n🔍 To verify on Etherscan, run:");
  console.log(`npx hardhat verify --network sepolia ${contractAddress} "${PYTH_CONTRACT_SEPOLIA}"`);
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    contractName: "PriceOracle",
    address: contractAddress,
    pythContract: PYTH_CONTRACT_SEPOLIA,
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    transactionHash: priceOracle.deploymentTransaction()?.hash
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    "./deployment-sepolia.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("📄 Deployment info saved to deployment-sepolia.json");
  console.log("✨ Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
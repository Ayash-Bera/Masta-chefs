import { ignition } from "hardhat";
import SelfKYCVerifierModule from "../ignition/modules/SelfKYCVerifier";

/**
 * Deploy SelfKYCVerifier to Celo Mainnet
 *
 * Usage:
 * npx hardhat ignition deploy ignition/modules/SelfKYCVerifier.ts --network celo --parameters deployments/parameters-mainnet.json
 */

async function main() {
  console.log("🚀 Deploying SelfKYCVerifier to Celo Mainnet...");
  console.log("==========================================");

  // Production deployment parameters
  const deploymentParameters = {
    SelfKYCVerifierModule: {
      configId: 1, // Update with production config ID from Self.xyz
      scope: "your-app-kyc-v1",
      requireOfacCheck: true,
      minimumAge: 18,
      allowedDocumentTypes: [1, 2, 3], // E-Passport, EU ID Card, Aadhaar
      excludedCountries: [], // Configure based on compliance requirements
    },
  };

  // Safety checks for mainnet deployment
  console.log("🔒 Running pre-deployment safety checks...");

  // Check balance
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const minimumBalance = ethers.parseEther("0.1"); // 0.1 CELO

  if (balance < minimumBalance) {
    console.error(`❌ Insufficient balance: ${ethers.formatEther(balance)} CELO`);
    console.error(`   Required minimum: ${ethers.formatEther(minimumBalance)} CELO`);
    process.exit(1);
  }

  // Confirm network
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 42220n) {
    console.error(`❌ Wrong network. Expected Celo Mainnet (42220), got ${network.chainId}`);
    process.exit(1);
  }

  console.log(`✅ Deployer: ${deployer.address}`);
  console.log(`✅ Balance: ${ethers.formatEther(balance)} CELO`);
  console.log(`✅ Network: Celo Mainnet (${network.chainId})`);
  console.log("");

  // Production deployment confirmation
  console.log("⚠️  MAINNET DEPLOYMENT CONFIRMATION ⚠️");
  console.log("This will deploy to Celo Mainnet with real funds.");
  console.log("Please verify all parameters are correct:");
  console.log(JSON.stringify(deploymentParameters, null, 2));
  console.log("");

  try {
    // Deploy using Hardhat Ignition
    console.log("🔄 Starting deployment...");
    const { selfKYCVerifier } = await ignition.deploy(SelfKYCVerifierModule, {
      parameters: deploymentParameters,
    });

    const contractAddress = await selfKYCVerifier.getAddress();

    console.log("");
    console.log("✅ MAINNET DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("==========================================");
    console.log(`📋 Contract Address: ${contractAddress}`);
    console.log(`🌐 Network: Celo Mainnet`);
    console.log(`🔗 Explorer: https://explorer.celo.org/address/${contractAddress}`);
    console.log(`⚡ Transaction: ${selfKYCVerifier.deploymentTransaction?.hash}`);
    console.log("");
    console.log("📝 CRITICAL POST-DEPLOYMENT STEPS:");
    console.log("1. ✅ Update SELFKYC_CONTRACT_ADDRESS_MAINNET in .env");
    console.log("2. ✅ Update frontend production configuration");
    console.log("3. ✅ Configure Self.xyz production settings");
    console.log("4. ✅ Test thoroughly on mainnet with small amounts");
    console.log("5. ✅ Set up monitoring and alerts");
    console.log("6. ✅ Backup private keys securely");
    console.log("");
    console.log("💡 Environment Variables to Update:");
    console.log(`SELFKYC_CONTRACT_ADDRESS_MAINNET=${contractAddress}`);
    console.log(`NEXT_PUBLIC_SELFKYC_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("");
    console.log("🔐 Security Reminders:");
    console.log("- Store contract address securely");
    console.log("- Set up contract monitoring");
    console.log("- Consider timelock for admin functions");
    console.log("- Verify contract on Celo Explorer");

  } catch (error) {
    console.error("❌ MAINNET DEPLOYMENT FAILED:", error);
    console.error("Please check your configuration and try again.");
    process.exit(1);
  }
}

// Execute deployment with additional safety checks
main()
  .then(() => {
    console.log("\n🎉 Mainnet deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Mainnet deployment script failed:", error);
    process.exit(1);
  });
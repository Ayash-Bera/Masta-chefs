import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import  ignition  from "hardhat";
import SelfKYCVerifierModule from "../ignition/modules/SelfKYCVerifier.js";

/**
 * Deploy SelfKYCVerifier to Celo Alfajores Testnet
 *
 * Usage:
 * npx hardhat ignition deploy ignition/modules/SelfKYCVerifier.ts --network alfajores --parameters deployments/parameters-alfajores.json
 */

async function main() {
  console.log("🚀 Deploying SelfKYCVerifier to Celo Alfajores Testnet...");
  console.log("==========================================");

  // Deployment parameters for Alfajores
  const deploymentParameters = {
    SelfKYCVerifierModule: {
      // TODO: Update with actual Self.xyz Hub V2 address for Celo Alfajores
      identityVerificationHubV2Address: "0x68c931C9a534D37aa78094877F46fE46a49F1A51",
      configId: 1, // Will be updated after Self.xyz configuration
      scope: 12345, // Convert string scope to uint256 hash
      requireOfacCheck: true,
      minimumAge: 18,
      allowedDocumentTypes: [1, 2], // E-Passport and EU ID Card
      excludedCountries: [], // No exclusions for testing
    },
  };

  try {
    // Deploy using Hardhat Ignition
    const { selfKYCVerifier } = await ignition.deploy(SelfKYCVerifierModule, {
      parameters: deploymentParameters,
    });

    const contractAddress = await selfKYCVerifier.getAddress();

    console.log("✅ Deployment completed successfully!");
    console.log("==========================================");
    console.log(`📋 Contract Address: ${contractAddress}`);
    console.log(`🌐 Network: Celo Alfajores Testnet`);
    console.log(`🔗 Explorer: https://alfajores-blockscout.celo-testnet.org/address/${contractAddress}`);
    console.log("");
    console.log("📝 Next Steps:");
    console.log("1. Update SELFKYC_CONTRACT_ADDRESS_ALFAJORES in .env");
    console.log("2. Update frontend configuration with contract address");
    console.log("3. Configure Self.xyz with proper config ID");
    console.log("4. Test verification flow with Self mobile app");
    console.log("");
    console.log("💡 Environment Variables to Update:");
    console.log(`SELFKYC_CONTRACT_ADDRESS_ALFAJORES=${contractAddress}`);
    console.log(`NEXT_PUBLIC_SELFKYC_CONTRACT_ADDRESS=${contractAddress}`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment script failed:", error);
    process.exit(1);
  });
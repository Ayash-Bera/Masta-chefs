import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying SelfKYCVerifier to Celo Alfajores Testnet...");
  console.log("==========================================");

  // Get the deployer account
  console.log("Available HRE keys:", Object.keys(hre));
  const [deployer] = await hre.viem.getWalletClients();
  console.log("📋 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "CELO");

  // Deployment parameters
  const deploymentParams = {
    identityVerificationHubV2Address: "0x0000000000000000000000000000000000000001", // Placeholder
    scope: 12345, // uint256 scope value
    configId: 1,
    requireOfacCheck: true,
    minimumAge: 18,
    excludedCountries: [], // Empty array for testing
    allowedDocumentTypes: [1, 2], // E-Passport and EU ID Card
  };

  console.log("🔧 Deployment parameters:");
  console.log("- Hub Address:", deploymentParams.identityVerificationHubV2Address);
  console.log("- Scope:", deploymentParams.scope);
  console.log("- Config ID:", deploymentParams.configId);
  console.log("- OFAC Check:", deploymentParams.requireOfacCheck);
  console.log("- Min Age:", deploymentParams.minimumAge);
  console.log("- Document Types:", deploymentParams.allowedDocumentTypes);
  console.log("");

  // Deploy the contract
  console.log("📦 Deploying SelfKYCVerifier contract...");
  const SelfKYCVerifier = await hre.ethers.getContractFactory("SelfKYCVerifier");

  const selfKYCVerifier = await SelfKYCVerifier.deploy(
    deploymentParams.identityVerificationHubV2Address,
    deploymentParams.scope,
    deploymentParams.configId,
    deploymentParams.requireOfacCheck,
    deploymentParams.minimumAge,
    deploymentParams.excludedCountries,
    deploymentParams.allowedDocumentTypes
  );

  await selfKYCVerifier.waitForDeployment();
  const contractAddress = await selfKYCVerifier.getAddress();

  console.log("✅ Deployment completed successfully!");
  console.log("==========================================");
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: Celo Alfajores Testnet`);
  console.log(`🔗 Explorer: https://alfajores-blockscout.celo-testnet.org/address/${contractAddress}`);
  console.log("");
  console.log("📝 Next Steps:");
  console.log("1. Update SELFKYC_CONTRACT_ADDRESS_ALFAJORES in backend .env");
  console.log("2. Update Self.xyz Hub V2 address in contract constructor");
  console.log("3. Configure Self.xyz with proper config ID and scope");
  console.log("4. Test verification flow with Self mobile app");
  console.log("");
  console.log("💡 Environment Variables to Update:");
  console.log(`SELFKYC_CONTRACT_ADDRESS_ALFAJORES=${contractAddress}`);
  console.log("");
  console.log("⚠️  IMPORTANT: The contract uses a placeholder Hub V2 address.");
  console.log("   You'll need to redeploy with the correct Self.xyz Hub V2 address.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
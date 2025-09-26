# SelfKYCVerifier Deployment Guide

This guide provides comprehensive instructions for deploying the SelfKYCVerifier contract to Celo networks using Foundry.

## 📋 Prerequisites

### 1. Environment Setup
```bash
# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install foundry-rs/forge-std
npm install
```

### 2. Environment Variables
Update your `.env` file with the following variables:

```bash
# Required for deployment
CELO_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
CELO_NETWORK=alfajores

# Network RPC URLs
CELO_ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_MAINNET_RPC_URL=https://forno.celo.org

# Optional: For contract verification
CELOSCAN_API_KEY=your_celoscan_api_key
```

## 🔧 Contract Configuration

### Self.xyz Hub V2 Addresses
- **Celo Alfajores (Testnet):** `0x68c931C9a534D37aa78094877F46fE46a49F1A51`
- **Celo Mainnet:** `0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF`

### Default Deployment Parameters
- **Scope:** `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
- **Config ID:** `0x0000000000000000000000000000000000000000000000000000000000000001`
- **OFAC Check:** `true`
- **Minimum Age:** `18`
- **Allowed Documents:** `[1, 2]` (E-Passport, EU ID Card)
- **Excluded Countries:** `[]` (empty for testing)

## 🚀 Deployment Commands

### Step 1: Compile Contracts
```bash
# Compile all contracts
forge build

# Check for compilation errors
forge build --sizes
```

### Step 2: Get Testnet Funds (Alfajores Only)
```bash
# Check deployer address
forge script script/DeploySelfKYC.s.sol --rpc-url alfajores

# Get your deployer address from the output, then visit:
# https://faucet.celo.org/alfajores
# Request testnet CELO for your deployer address
```

### Step 3: Deploy to Alfajores (Testnet)
```bash
# Deploy using Foundry script
forge script script/DeploySelfKYC.s.sol --rpc-url alfajores --broadcast

# Alternative: Direct deployment with forge create
forge create contracts/SelfKYCVerifier.sol:SelfKYCVerifier \
  --rpc-url alfajores \
  --private-key $CELO_PRIVATE_KEY \
  --constructor-args \
    "0x68c931C9a534D37aa78094877F46fE46a49F1A51" \
    "8234104122482341265491137074636836252947884782870784360943022469005013929455" \
    "0x0000000000000000000000000000000000000000000000000000000000000001" \
    "true" \
    "18" \
    "[]" \
    "[1,2]"
```

### Step 4: Verify Contract (Optional)
```bash
# Verify on Celoscan
forge verify-contract \
  --chain-id 44787 \
  --compiler-version 0.8.28 \
  --etherscan-api-key $CELOSCAN_API_KEY \
  CONTRACT_ADDRESS \
  contracts/SelfKYCVerifier.sol:SelfKYCVerifier \
  --constructor-args $(cast abi-encode "constructor(address,uint256,bytes32,bool,uint256,string[],uint8[])" \
    "0x68c931C9a534D37aa78094877F46fE46a49F1A51" \
    "8234104122482341265491137074636836252947884782870784360943022469005013929455" \
    "0x0000000000000000000000000000000000000000000000000000000000000001" \
    "true" \
    "18" \
    "[]" \
    "[1,2]")
```

### Step 5: Deploy to Mainnet (Production)
```bash
# ⚠️ PRODUCTION DEPLOYMENT - USE WITH CAUTION ⚠️
forge script script/DeploySelfKYC.s.sol --rpc-url celo --broadcast --verify

# Alternative: Direct deployment to mainnet
forge create contracts/SelfKYCVerifier.sol:SelfKYCVerifier \
  --rpc-url celo \
  --private-key $CELO_PRIVATE_KEY \
  --constructor-args \
    "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF" \
    "YOUR_PRODUCTION_SCOPE" \
    "YOUR_PRODUCTION_CONFIG_ID" \
    "true" \
    "18" \
    "[]" \
    "[1,2]" \
  --verify
```

## 🔍 Post-Deployment Tasks

### 1. Update Backend Environment
```bash
# Add deployed contract address to backend/.env
echo "SELFKYC_CONTRACT_ADDRESS_ALFAJORES=0xYOUR_CONTRACT_ADDRESS" >> ../backend/.env
```

### 2. Test Contract Functions
```bash
# Test getConfigId function
cast call CONTRACT_ADDRESS "getConfigId()" --rpc-url alfajores

# Test scope function
cast call CONTRACT_ADDRESS "scope()" --rpc-url alfajores

# Test owner function
cast call CONTRACT_ADDRESS "owner()" --rpc-url alfajores
```

### 3. Backend Integration Test
```bash
# Start backend server
cd ../backend && npm run dev

# Test health endpoint
curl http://localhost:3001/api/kyc/health

# Test configuration endpoint
curl http://localhost:3001/api/kyc/onchain/config
```

## 📊 Deployment Scripts

### Quick Deploy Script
```bash
#!/bin/bash
# quick-deploy.sh

echo "🚀 Deploying SelfKYCVerifier to Celo Alfajores..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it with CELO_PRIVATE_KEY"
    exit 1
fi

# Compile contracts
echo "📦 Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

# Deploy to Alfajores
echo "🌐 Deploying to Alfajores..."
forge script script/DeploySelfKYC.s.sol --rpc-url alfajores --broadcast

echo "✅ Deployment complete!"
echo "📝 Remember to update backend/.env with the contract address"
```

### Deployment Verification Script
```bash
#!/bin/bash
# verify-deployment.sh

CONTRACT_ADDRESS=$1

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "Usage: ./verify-deployment.sh <CONTRACT_ADDRESS>"
    exit 1
fi

echo "🔍 Verifying deployment at $CONTRACT_ADDRESS..."

# Test basic functions
echo "📋 Config ID: $(cast call $CONTRACT_ADDRESS 'getConfigId()' --rpc-url alfajores)"
echo "🎯 Scope: $(cast call $CONTRACT_ADDRESS 'scope()' --rpc-url alfajores)"
echo "👤 Owner: $(cast call $CONTRACT_ADDRESS 'owner()' --rpc-url alfajores)"

echo "✅ Deployment verification complete!"
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Insufficient Funds
```
Error: insufficient funds for gas * price + value
```
**Solution:** Get testnet CELO from https://faucet.celo.org/alfajores

#### 2. Private Key Format
```
Error: failed parsing $CELO_PRIVATE_KEY as type `uint256`
```
**Solution:** Ensure private key has `0x` prefix in `.env` file

#### 3. Compilation Errors
```
Error: Source "forge-std/Test.sol" not found
```
**Solution:** Run `forge install foundry-rs/forge-std`

#### 4. RPC Connection Issues
```
Error: Failed to send transaction
```
**Solution:** Check network connectivity and RPC URL

### Useful Commands

```bash
# Check account balance
cast balance 0xYOUR_ADDRESS --rpc-url alfajores

# Get current gas price
cast gas-price --rpc-url alfajores

# Estimate gas for deployment
forge script script/DeploySelfKYC.s.sol --rpc-url alfajores

# Check transaction status
cast tx TX_HASH --rpc-url alfajores
```

## 📚 Additional Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Celo Developer Docs](https://docs.celo.org/)
- [Self.xyz Documentation](https://docs.self.xyz/)
- [Celo Alfajores Faucet](https://faucet.celo.org/alfajores)
- [Celo Explorer](https://alfajores-blockscout.celo-testnet.org/)

## 🎯 Expected Output

After successful deployment, you should see:

```
✅ Deployment completed successfully!
=================================================
📋 Contract Address: 0xYOUR_CONTRACT_ADDRESS
🌐 Network: Celo Alfajores Testnet
🔗 Explorer: https://alfajores-blockscout.celo-testnet.org/address/0xYOUR_CONTRACT_ADDRESS

📝 Next Steps:
1. Update SELFKYC_CONTRACT_ADDRESS_ALFAJORES in backend .env
2. Configure Self.xyz with proper config ID and scope
3. Test verification flow with Self mobile app

💡 Environment Variables to Update:
SELFKYC_CONTRACT_ADDRESS_ALFAJORES=0xYOUR_CONTRACT_ADDRESS
```

The deployment is complete and ready for Self.xyz KYC verification testing! 🎉
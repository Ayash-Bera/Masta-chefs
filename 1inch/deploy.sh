#!/bin/bash

# Load environment variables
source .env

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 MultiBatch1inchHelper Deployment Script${NC}"
echo "========================================"

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ Error: PRIVATE_KEY not found in .env file${NC}"
    exit 1
fi

# Network selection
echo -e "${YELLOW}Select deployment network:${NC}"
echo "1) Base Sepolia (Testnet) - Recommended for testing"
echo "2) Base Mainnet"
echo "3) Ethereum Mainnet"
echo "4) Custom RPC"

read -p "Enter choice (1-4): " network_choice

case $network_choice in
    1)
        NETWORK="base-sepolia"
        RPC_URL="https://sepolia.base.org"
        CHAIN_ID="84532"
        EXPLORER="https://sepolia.basescan.org"
        echo -e "${GREEN}✅ Selected: Base Sepolia Testnet${NC}"
        ;;
    2)
        NETWORK="base"
        RPC_URL="https://mainnet.base.org"
        CHAIN_ID="8453"
        EXPLORER="https://basescan.org"
        echo -e "${YELLOW}⚠️  Selected: Base Mainnet (Real ETH will be used!)${NC}"
        ;;
    3)
        NETWORK="mainnet"
        RPC_URL="https://eth.llamarpc.com"
        CHAIN_ID="1"
        EXPLORER="https://etherscan.io"
        echo -e "${RED}⚠️  Selected: Ethereum Mainnet (Real ETH will be used!)${NC}"
        ;;
    4)
        read -p "Enter RPC URL: " RPC_URL
        read -p "Enter Chain ID: " CHAIN_ID
        NETWORK="custom"
        EXPLORER="Custom Network"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Confirmation for mainnet deployments
if [ "$CHAIN_ID" == "1" ] || [ "$CHAIN_ID" == "8453" ]; then
    echo -e "${RED}⚠️  WARNING: You are about to deploy to MAINNET!${NC}"
    read -p "Are you sure? Type 'yes' to continue: " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}📋 Deployment Details:${NC}"
echo "Network: $NETWORK"
echo "RPC URL: $RPC_URL"
echo "Chain ID: $CHAIN_ID"
echo "Explorer: $EXPLORER"
echo ""

# Check balance
echo -e "${YELLOW}💰 Checking deployer balance...${NC}"
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL)
BALANCE_ETH=$(cast to-unit $BALANCE ether)

echo "Deployer Address: $DEPLOYER_ADDRESS"
echo "Balance: $BALANCE_ETH ETH"

# Check if balance is sufficient (at least 0.01 ETH for testnet, 0.1 ETH for mainnet)
MIN_BALANCE="10000000000000000" # 0.01 ETH in wei
if [ "$CHAIN_ID" == "1" ] || [ "$CHAIN_ID" == "8453" ]; then
    MIN_BALANCE="100000000000000000" # 0.1 ETH for mainnet
fi

if [ "$BALANCE" -lt "$MIN_BALANCE" ]; then
    echo -e "${RED}❌ Insufficient balance for deployment${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Balance sufficient for deployment${NC}"
echo ""

# Build contracts
echo -e "${YELLOW}🔨 Building contracts...${NC}"
forge build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Deploy contract
echo -e "${YELLOW}🚀 Deploying MultiBatch1inchHelper...${NC}"

DEPLOY_CMD="forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast"

# Verification disabled - deploy without verification

echo "Executing: $DEPLOY_CMD"
echo ""

eval $DEPLOY_CMD

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment Successful!${NC}"
    echo ""

    # Read deployment info
    if [ -f "deployments.env" ]; then
        echo -e "${YELLOW}📄 Deployment Information:${NC}"
        cat deployments.env
        echo ""

        # Extract contract address
        CONTRACT_ADDRESS=$(grep "MULTIBATCH_HELPER_ADDRESS=" deployments.env | cut -d'=' -f2)

        echo -e "${GREEN}✅ Contract deployed at: $CONTRACT_ADDRESS${NC}"
        echo -e "${GREEN}🔍 View on explorer: $EXPLORER/address/$CONTRACT_ADDRESS${NC}"
        echo ""

        # Update the integration script with the deployed address
        if [ -f "scripts/testnet-integration.js" ]; then
            echo -e "${YELLOW}🔧 Updating integration script with deployed address...${NC}"
            sed -i.bak "s/const MULTI_BATCH_HELPER = \"\";/const MULTI_BATCH_HELPER = \"$CONTRACT_ADDRESS\";/" scripts/testnet-integration.js
            echo -e "${GREEN}✅ Integration script updated${NC}"
        fi

        echo ""
        echo -e "${YELLOW}📚 Next Steps:${NC}"
        echo "1. Update your scripts with the deployed contract address: $CONTRACT_ADDRESS"
        echo "2. Fund the deployer address with tokens for testing"
        echo "3. Run the integration script: node scripts/testnet-integration.js"
        echo "4. Test batch order creation and settlement"

    else
        echo -e "${RED}❌ Deployment info file not found${NC}"
    fi
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
# Tsunami Wallet - Proof of Human Deployment Guide

This guide walks you through deploying the Self Protocol Proof of Human integration for Tsunami Wallet.

## Prerequisites

1. **Foundry Installed**
   ```bash
   # Install Foundry if you haven't already
   curl -L https://foundry.paradigm.xyz | bash
   foundryup

   # For Celo Sepolia support, install version 0.3.0
   foundryup --install 0.3.0
   ```

2. **Celo Sepolia Testnet Funds**
   - Get testnet CELO from [Celo Faucet](https://faucet.celo.org/alfajores)
   - You'll need CELO for gas fees on deployment

3. **Private Key**
   - Have your deployer wallet private key ready
   - Make sure it has testnet CELO for gas

## Step 1: Configure Contract Environment

1. Navigate to the contracts directory:
   ```bash
   cd contracts
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your details:
   ```bash
   # Your private key (with 0x prefix)
   PRIVATE_KEY=0xyour_private_key_here

   # Network (use celo-sepolia for testnet)
   NETWORK=celo-sepolia

   # Hub address (auto-configured for celo-sepolia)
   IDENTITY_VERIFICATION_HUB_ADDRESS=0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74

   # Optional: CeloScan API key for verification
   CELOSCAN_API_KEY=your_api_key_here

   # Scope seed for Tsunami Wallet
   SCOPE_SEED="tsunami-proof-of-human"
   ```

## Step 2: Deploy the Contract

Run the automated deployment script:

```bash
# Make the script executable (if not already done)
chmod +x script/deploy-proof-of-human.sh

# Deploy the contract
./script/deploy-proof-of-human.sh
```

The script will:
- ✅ Validate your configuration
- ✅ Build the contracts with Foundry
- ✅ Deploy the ProofOfHuman contract to Celo Sepolia
- ✅ Verify the contract on CeloScan (if API key provided)
- ✅ Display deployment summary with contract address

## Step 3: Configure Frontend

After successful deployment, you'll get a contract address. Copy it and:

1. Navigate to the frontend directory:
   ```bash
   cd ../front
   ```

2. Update the `.env` file with your deployed contract address:
   ```bash
   # Replace with your deployed contract address (MUST be lowercase)
   NEXT_PUBLIC_SELF_ENDPOINT=0xyour_deployed_contract_address_lowercase
   NEXT_PUBLIC_SELF_APP_NAME="Tsunami Wallet"
   NEXT_PUBLIC_SELF_SCOPE="tsunami-proof-of-human"
   ```

   **Important**: The contract address MUST be lowercase!

## Step 4: Test the Integration

1. Start the frontend development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. Navigate to `http://localhost:3000/onboarding`

3. You should see:
   - QR code for Self Protocol verification
   - Tsunami Wallet branding
   - Copy link and open Self app buttons

## Step 5: Test with Self Protocol App

1. **Download the Self Protocol App**:
   - iOS: [App Store](https://apps.apple.com/app/self-protocol/id1234567890)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=com.selfxyz.app)

2. **Complete Verification**:
   - Scan the QR code with the Self app
   - Complete the identity verification process
   - You should be redirected to `/onboarding/verified` on success

## Verification Requirements

The contract is configured with:
- **Minimum Age**: 18 years old
- **Forbidden Countries**: USA (for testing purposes)
- **OFAC Check**: Disabled
- **Network**: Celo Sepolia testnet

## Troubleshooting

### Contract Deployment Issues

1. **Chain 11142220 not supported**:
   ```bash
   foundryup --install 0.3.0
   ```

2. **Insufficient funds**:
   - Get more testnet CELO from the faucet
   - Check your wallet balance

3. **Private key format**:
   - Must include the `0x` prefix
   - Should be 64 characters + `0x` = 66 total

### Frontend Issues

1. **QR code not loading**:
   - Check `NEXT_PUBLIC_SELF_ENDPOINT` is set correctly
   - Ensure contract address is lowercase
   - Verify the contract is deployed successfully

2. **Environment variables not loading**:
   - Restart the dev server after changing `.env`
   - Check for typos in variable names

### Self Protocol App Issues

1. **QR code scan fails**:
   - Ensure good lighting and steady hands
   - Try using the "Copy Link" button and paste in Self app

2. **Verification fails**:
   - Check network connection
   - Ensure you meet age requirements (18+)
   - Verify you're not in a forbidden country (USA for testing)

## Network Information

### Celo Sepolia Testnet
- **Chain ID**: 11142220
- **RPC URL**: https://forno.celo-sepolia.celo-testnet.org
- **Explorer**: https://celo-sepolia.blockscout.com
- **Hub Address**: 0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74
- **Supports**: Mock passports for testing

### Celo Mainnet (Production)
- **Chain ID**: 42220
- **RPC URL**: https://forno.celo.org
- **Explorer**: https://celoscan.io
- **Hub Address**: 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
- **Supports**: Real passport verification

## Contract Features

Your deployed ProofOfHuman contract includes:

- ✅ **Verification Tracking**: Stores verified humans mapping
- ✅ **Event Logging**: Emits verification completion events
- ✅ **Admin Functions**: Config management capabilities
- ✅ **Statistics**: Get verification stats
- ✅ **Self Protocol Integration**: Full compatibility with Self SDK

## Next Steps

After successful deployment and testing:

1. **Production Deployment**: Deploy to Celo Mainnet for production use
2. **Integration**: Add verification checks to sensitive wallet operations
3. **UI Enhancement**: Customize the onboarding flow to match your needs
4. **Monitoring**: Set up event monitoring for verification events

## Support

- **Self Protocol Docs**: [docs.self.xyz](https://docs.self.xyz)
- **Celo Docs**: [docs.celo.org](https://docs.celo.org)
- **Foundry Docs**: [book.getfoundry.sh](https://book.getfoundry.sh)

## Security Notes

- ✅ Never commit private keys to version control
- ✅ Use testnet for development and testing
- ✅ Verify contracts on block explorers
- ✅ Test thoroughly before mainnet deployment
- ✅ Keep your Self Protocol app updated
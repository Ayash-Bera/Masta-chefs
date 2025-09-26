# Self.xyz Onchain KYC Integration

A privacy-preserving KYC (Know Your Customer) system using Self.xyz zero-knowledge identity verification integrated with Celo blockchain.

## 🎯 Project Overview

This project implements a complete onchain KYC solution that verifies user identity without exposing personal information. It uses Self.xyz's zero-knowledge proof infrastructure to validate identity documents while storing only minimal compliance data on the Celo blockchain.

### Core Components

- **Frontend**: Next.js application with wallet integration and QR code scanning
- **Backend**: Express.js API server managing KYC sessions and blockchain interactions
- **Smart Contracts**: Solidity contracts on Celo for storing verification status
- **ZK Verification**: Self.xyz SDK for privacy-preserving identity proofs

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   Blockchain    │
│   (Next.js)     │◄──►│   (Express.js)   │◄──►│   (Celo)        │
│                 │    │                  │    │                 │
│ • React Hooks   │    │ • Self.xyz SDK   │    │ •SelfKYCVerifier│
│ • Wallet Connect│    │ • Celo SDK       │    │ •Hub V2         │
│ • Self QR Code  │    │ • MongoDB        │    │ •Zero-knowledge │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Deployment Status

### ✅ **DEPLOYED & OPERATIONAL**

#### Traditional KYC Contract
- **Contract Address**: `0x31fE360492189a0c03BACaE36ef9be682Ad3727B`
- **Network**: Celo Alfajores Testnet (Chain ID: 44787)
- **Explorer**: https://alfajores.celoscan.io/address/0x31fE360492189a0c03BACaE36ef9be682Ad3727B
- **Type**: Address-based KYC verification

#### 🔮 Stealth KYC Contract (NEW)
- **Contract Address**: `0xBe2187568d4E71a19afe973f5EDEF19E6276Dc84`
- **Network**: Celo Alfajores Testnet (Chain ID: 44787)
- **Explorer**: https://alfajores.celoscan.io/address/0xBe2187568d4E71a19afe973f5EDEF19E6276Dc84
- **Type**: EIP-5564 Stealth Address + Master Identity System
- **Features**:
  - Master nullifier-based identity system
  - Multiple stealth address linking
  - DOB commitment privacy
  - Zero-knowledge proof verification

#### Shared Configuration
- **Owner**: `0x5185bA8Fcc613e24B6a46bEf48335F9D4389449B`
- **Self.xyz Hub V2**: `0x68c931C9a534D37aa78094877F46fE46a49F1A51`
- **Scope**: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
- **Config ID**: `0x0000000000000000000000000000000000000000000000000000000000000001`
- **Minimum Age**: 18 years
- **OFAC Check**: Required
- **Allowed Documents**: E-Passport (1), EU ID Card (2)
- **Excluded Countries**: None

## 🔍 Privacy & Data Disclosure

### What Self.xyz Provides (Zero-Knowledge Proof Output)
```javascript
GenericDiscloseOutputV2 {
    attestationId,           // Document type identifier
    userIdentifier,          // Unique user ID
    nullifier,              // Anti-sybil protection
    forbiddenCountriesListPacked,
    issuingState,           // Country that issued document
    name[],                 // Array of name components
    idNumber,               // Document number
    nationality,            // User's nationality
    dateOfBirth,            // Birth date
    gender,                 // Gender
    expiryDate,            // Document expiry
    olderThan,             // Age verification (18+)
    ofac[3]                // OFAC compliance flags
}
```

### What Gets Stored On-Chain (Minimal Disclosure)
```solidity
struct KYCData {
    bool isVerified,        // ✅ Verification status
    uint256 timestamp,      // ✅ When verified
    string nationality,     // ✅ Nationality only
    uint8 documentType,     // ✅ Document type (1=E-Passport, 2=EU ID)
    bool isOfacClear,       // ✅ OFAC compliance
    uint256 verificationCount  // ✅ Number of verifications
}
```

### 🛡️ Privacy Features
- **Zero-Knowledge Proofs**: Identity verified without exposing raw personal data
- **Nullifier System**: Prevents duplicate verification while maintaining privacy
- **Selective Disclosure**: Only nationality and document type stored on-chain
- **No PII Storage**: Names, ID numbers, birth dates are NOT stored on blockchain

## 📚 Development Commands

### Frontend (Next.js)
```bash
cd front
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend (Express.js)
```bash
cd backend
npm run dev          # Start development server
npm run start        # Start production server
npm test             # Run all tests
npm run test:health  # Run health check tests
npm run test:load    # Run load tests
```

### Smart Contracts (Foundry)
```bash
cd contracts
forge build          # Compile contracts
forge test           # Run tests
forge fmt            # Format Solidity code
npx hardhat test     # Run Hardhat tests (alternative)
```

## 🌐 API Endpoints

### Traditional KYC Endpoints

1. `POST /api/kyc/session` - Create verification session
2. `GET /api/kyc/session/:id` - Get session status
3. `POST /api/kyc/onchain/submit` - Submit verification to blockchain
4. `GET /api/kyc/onchain/status/:address` - Get user verification status
5. `GET /api/kyc/onchain/config` - Get system configuration
6. `GET /api/kyc/health` - Health check
7. `GET /api/kyc/stats` - System statistics

### 🔮 Stealth KYC Endpoints (NEW)

1. `POST /api/stealth-kyc/session` - Create stealth KYC verification session
2. `GET /api/stealth-kyc/session/:sessionId` - Get stealth session status
3. `POST /api/stealth-kyc/verify` - Process stealth verification callback
4. `GET /api/stealth-kyc/status/:stealthAddress` - Get KYC status for stealth address
5. `GET /api/stealth-kyc/master/:masterNullifier` - Get master identity information
6. `POST /api/stealth-kyc/link` - Link new stealth address to existing master identity
7. `POST /api/stealth-kyc/verify-dob` - Verify DOB commitment for master identity
8. `GET /api/stealth-kyc/config` - Get stealth KYC system configuration
9. `GET /api/stealth-kyc/health` - Health check for stealth KYC services
10. `GET /api/stealth-kyc/stats` - Get stealth KYC system statistics

## 🔮 EIP-5564 Stealth Address Integration

### Overview

The new Stealth KYC system implements [EIP-5564](https://eips.ethereum.org/EIPS/eip-5564) stealth addresses to provide enhanced privacy for KYC verification. Instead of associating KYC status with a single visible address, users can generate multiple stealth addresses that are all linked to one master identity.

### Key Concepts

#### Master Identity System
- **Master Nullifier**: A unique identifier derived from Self.xyz zero-knowledge proofs
- **One Identity, Many Addresses**: Users can link multiple stealth addresses to a single verified identity
- **DOB Commitment**: Private date-of-birth verification using cryptographic commitments

#### Stealth Address Benefits
- **Transaction Privacy**: Each transaction can use a new stealth address
- **KYC Inheritance**: All stealth addresses inherit the master identity's KYC status
- **Compliance**: Maintains regulatory compliance while preserving privacy

### Usage Workflow

#### 1. Initial Master Identity Verification
```bash
# Create stealth KYC session
curl -X POST http://localhost:3001/api/stealth-kyc/session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "stealthAddress": "0x1234...abcd",
    "additionalRequirements": {}
  }'

# User completes Self.xyz verification flow
# System creates master identity linked to nullifier
```

#### 2. Linking Additional Stealth Addresses
```bash
# Link new stealth address to existing master identity
curl -X POST http://localhost:3001/api/stealth-kyc/link \
  -H "Content-Type: application/json" \
  -d '{
    "masterNullifier": "0xabcd...1234",
    "stealthAddress": "0x5678...efgh",
    "linkingProof": "proof_data"
  }'
```

#### 3. Verifying Stealth Address Status
```bash
# Check if stealth address is KYC verified
curl http://localhost:3001/api/stealth-kyc/status/0x1234...abcd

# Get master identity information
curl http://localhost:3001/api/stealth-kyc/master/0xabcd...1234
```

#### 4. DOB Commitment Verification
```bash
# Verify DOB without revealing exact date
curl -X POST http://localhost:3001/api/stealth-kyc/verify-dob \
  -H "Content-Type: application/json" \
  -d '{
    "masterNullifier": "0xabcd...1234",
    "dateOfBirth": "1990-01-01",
    "stealthAddress": "0x1234...abcd"
  }'
```

### Smart Contract Functions

#### StealthKYCVerifier Contract
```solidity
// Check if stealth address is verified
function isStealthAddressVerified(address stealthAddress) external view returns (bool)

// Verify DOB commitment
function verifyDOBCommitment(
    bytes32 masterNullifier,
    string memory dateOfBirth,
    address stealthAddress
) external view returns (bool)

// Get contract statistics
function getStatistics() external view returns (uint256, uint256, uint256)
```

### Privacy Features

#### DOB Commitment System
- **Input**: `hash(dateOfBirth + stealthAddress + timestamp)`
- **Storage**: Only the commitment hash is stored on-chain
- **Verification**: Can verify age/DOB without revealing exact date
- **Privacy**: Real DOB never exposed publicly

#### Master Identity Linking
- **Nullifier-Based**: Uses Self.xyz nullifiers as unique master identifiers
- **Multiple Addresses**: One identity can control many stealth addresses
- **Unlinkability**: Stealth addresses cannot be linked without knowing the master nullifier

### Testing

#### Basic Functionality Test
```bash
# Test configuration
curl http://localhost:3001/api/stealth-kyc/config

# Test health
curl http://localhost:3001/api/stealth-kyc/health

# Test statistics
curl http://localhost:3001/api/stealth-kyc/stats
```

#### Contract Testing
```bash
cd contracts
# Run comprehensive stealth contract tests
forge script script/TestStealthKYC.s.sol --rpc-url $CELO_ALFAJORES_RPC_URL --private-key $CELO_PRIVATE_KEY --broadcast
```

## ⚙️ Environment Configuration

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CELO_NETWORK=alfajores
```

### Backend (.env)
```bash
# Basic Configuration
NODE_ENV=development
PORT=3001

# Celo Configuration
CELO_NETWORK=alfajores
CELO_ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_MAINNET_RPC_URL=https://forno.celo.org
CELO_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Self.xyz Configuration
SELF_API_ENDPOINT=https://staging-api.self.xyz
SELF_APP_SCOPE=test-kyc-v1
SELF_CONFIG_ID=1

# Contract Addresses
SELFKYC_CONTRACT_ADDRESS_ALFAJORES=0x31fE360492189a0c03BACaE36ef9be682Ad3727B

# Stealth KYC Contract Addresses
STEALTH_CONTRACT_ADDRESS_ALFAJORES=0xBe2187568d4E71a19afe973f5EDEF19E6276Dc84

# API Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_KYC_MAX_REQUESTS=100
```

### Contracts (.env)
```bash
CELO_NETWORK=alfajores
CELO_ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_MAINNET_RPC_URL=https://forno.celo.org
CELO_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
CELOSCAN_API_KEY=your_celoscan_key
```

## 🧪 Testing & Verification

### Contract Testing
```bash
cd contracts
# Test basic contract functions
cast call 0x31fE360492189a0c03BACaE36ef9be682Ad3727B "getConfigId()" --rpc-url alfajores
cast call 0x31fE360492189a0c03BACaE36ef9be682Ad3727B "scope()" --rpc-url alfajores
cast call 0x31fE360492189a0c03BACaE36ef9be682Ad3727B "owner()" --rpc-url alfajores
```

### Backend Testing
```bash
cd backend
npm run dev &
# Test health endpoint
curl http://localhost:3001/api/kyc/health
# Test configuration endpoint
curl http://localhost:3001/api/kyc/onchain/config
```

### Full Stack Integration
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd front && npm run dev`
3. Connect wallet to Celo Alfajores testnet
4. Navigate to KYC verification page
5. Scan QR code with Self mobile app
6. Complete verification flow

## 🚀 Production Deployment

### Deploy to Celo Mainnet
```bash
cd contracts
# Update environment for mainnet
export CELO_NETWORK=celo
# Deploy to mainnet
forge script script/DeploySelfKYC.s.sol --rpc-url celo --broadcast --verify
```

### Production Configuration
- Update Self.xyz scope and config ID for production
- Set production API endpoints
- Configure proper webhook secrets
- Update CORS origins for production domains

## 📊 Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS v4
- **Backend**: Express.js, MongoDB, Celo ContractKit, Self.xyz SDK
- **Smart Contracts**: Solidity 0.8.28, Foundry, OpenZeppelin
- **Blockchain**: Celo network (Alfajores testnet, Mainnet ready)
- **Identity**: Self.xyz zero-knowledge proof infrastructure

## 🔗 Important Links

- [Contract Explorer](https://alfajores.celoscan.io/address/0x31fE360492189a0c03BACaE36ef9be682Ad3727B)
- [Self.xyz Documentation](https://docs.self.xyz/)
- [Celo Developer Docs](https://docs.celo.org/)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Celo Alfajores Faucet](https://faucet.celo.org/alfajores)

## 🏆 Features Implemented

### Traditional KYC Features
✅ **Zero-Knowledge Identity Verification** - Privacy-preserving proofs
✅ **Onchain Verification Storage** - Minimal data stored on Celo blockchain
✅ **Anti-Sybil Protection** - Nullifier system prevents duplicate verification
✅ **OFAC Compliance** - Automated sanctions screening
✅ **Document Type Validation** - Support for E-Passport and EU ID Cards
✅ **Age Verification** - Configurable minimum age requirements
✅ **Full Stack Integration** - End-to-end verification flow
✅ **Production Ready** - Comprehensive security and error handling

### 🔮 Stealth KYC Features (NEW)
✅ **EIP-5564 Stealth Addresses** - Enhanced transaction privacy
✅ **Master Identity System** - One identity, multiple stealth addresses
✅ **DOB Commitment Privacy** - Private date-of-birth verification system
✅ **Multiple Address Linking** - Link unlimited stealth addresses to master identity
✅ **Nullifier-Based Identity** - Self.xyz nullifiers as unique master identifiers
✅ **Privacy-Preserving Compliance** - KYC compliance without sacrificing privacy
✅ **Smart Contract Integration** - Deployed and tested on Celo Alfajores
✅ **Comprehensive API** - 10+ endpoints for stealth address functionality

## 📝 Next Steps

1. **Production Deployment**: Deploy to Celo mainnet when ready
2. **Frontend Polish**: Enhance UI/UX for better user experience
3. **Additional Document Types**: Add support for more identity documents
4. **Advanced Compliance**: Implement additional regulatory requirements
5. **Analytics Dashboard**: Add verification statistics and monitoring
6. **Mobile Optimization**: Optimize for mobile Self.xyz app integration

---

**Status**: ✅ **DEPLOYED & OPERATIONAL**
**Contract**: `0x31fE360492189a0c03BACaE36ef9be682Ad3727B`
**Network**: Celo Alfajores Testnet
**Ready for**: Production deployment and real-world testing 🚀
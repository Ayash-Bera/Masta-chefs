# Compliant Procedure Smart Contract

A simple and secure smart contract for managing user compliance verification using Foundry and Self.xyz integration.

## Overview

The CompliantProcedure contract provides a straightforward way to verify and manage user compliance by storing hashed personal data on-chain. It integrates with Self.xyz for identity verification while maintaining privacy through data hashing.

## Features

- **Hash-based Storage**: Stores `keccak256(address + name + dateOfBirth)` instead of raw personal data
- **Authorized Verifiers**: Multi-signature support with authorized verifier management
- **Compliance Management**: Verify and revoke compliance status
- **Duplicate Prevention**: Prevents reuse of the same data hash
- **Emergency Controls**: Pausable contract for emergency situations
- **Gas Optimized**: Efficient storage and operations

## Contract Structure

### Core Functions

- `verifyCompliance()`: Verify a user's compliance with personal data
- `revokeCompliance()`: Revoke a user's compliance status
- `isUserCompliant()`: Check if a user is compliant
- `getUserCompliance()`: Get complete compliance data for a user

### Administrative Functions

- `addAuthorizedVerifier()`: Add new authorized verifier
- `removeAuthorizedVerifier()`: Remove verifier authorization
- `pause()/unpause()`: Emergency contract controls

## Deployment

### Prerequisites

1. Install Foundry: https://book.getfoundry.sh/getting-started/installation
2. Set up environment variables

### Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `PRIVATE_KEY`: Your deployment wallet private key
- `CELOSCAN_API_KEY`: For contract verification
- `CELO_SEPOLIA_RPC_URL`: Celo Sepolia RPC endpoint

### Build and Test

```bash
# Build the contract
forge build

# Run tests
forge test

# Run tests with gas reporting
forge test --gas-report

# Run tests with coverage
forge coverage
```

### Deploy to Celo Sepolia

```bash
# Deploy to Celo Sepolia testnet
forge script script/Deploy.s.sol --rpc-url celo_sepolia --broadcast --verify

# Or with explicit RPC URL
forge script script/Deploy.s.sol --rpc-url https://forno.celo-sepolia.celo-testnet.org/ --broadcast --verify
```

### Verify Contract (if automatic verification fails)

```bash
forge verify-contract --chain celo_sepolia \
  --constructor-args $(cast abi-encode 'constructor()') \
  --etherscan-api-key $CELOSCAN_API_KEY \
  <CONTRACT_ADDRESS> \
  src/CompliantProcedure.sol:CompliantProcedure
```

## Usage

### Basic Verification Flow

1. **Deploy Contract**: Deploy the CompliantProcedure contract
2. **Add Verifiers**: Add Self.xyz verification service as an authorized verifier
3. **User Scans QR**: User scans QR code with Self.xyz mobile app
4. **Self.xyz Verification**: App verifies identity and calls `verifyCompliance()`
5. **Data Storage**: Contract stores hashed data and emits verification event
6. **Frontend Update**: Frontend listens for events and updates UI

### Example Contract Interaction

```solidity
// Verify a user's compliance
compliantProcedure.verifyCompliance(
    userAddress,
    "John Doe",
    "1990-01-01",
    "US",
    1 // Document type: 1=Passport, 2=ID Card
);

// Check if user is compliant
bool isCompliant = compliantProcedure.isUserCompliant(userAddress);

// Get complete user compliance data
ICompliantProcedure.UserCompliance memory userData =
    compliantProcedure.getUserCompliance(userAddress);
```

## Security Features

- **Access Control**: Only authorized verifiers can verify compliance
- **Hash Uniqueness**: Prevents duplicate verifications with same data
- **Emergency Pause**: Contract can be paused in emergency situations
- **Reentrancy Protection**: All state-changing functions are protected
- **Input Validation**: Comprehensive validation of all inputs

## Frontend Integration

The contract is designed to work with the existing Self.xyz QR code component. Key integration points:

- **Contract Events**: Listen for `ComplianceVerified` events
- **Status Checking**: Use `isUserCompliant()` for real-time status
- **Data Retrieval**: Use `getUserCompliance()` for displaying user data

## Network Configuration

### Celo Sepolia Testnet
- **Chain ID**: 11142220 (0xAA044C)
- **RPC URL**: https://forno.celo-sepolia.celo-testnet.org/
- **Block Explorer**: https://celo-sepolia.blockscout.com/
- **Native Currency**: S-CELO

### Gas Estimates

- Deploy: ~1,200,000 gas
- Verify Compliance: ~120,000 gas
- Check Compliance: ~25,000 gas
- Revoke Compliance: ~45,000 gas

## Testing

The contract includes comprehensive tests covering:

- Basic functionality (verify/revoke compliance)
- Access control (authorized verifiers only)
- Edge cases (invalid inputs, duplicate hashes)
- Administrative functions (pause/unpause, verifier management)
- Fuzz testing for input validation

Run tests with:
```bash
forge test -vv  # Verbose output
forge test --gas-report  # Include gas usage
forge coverage  # Coverage report
```

## Security Considerations

1. **Private Key Management**: Keep deployment private keys secure
2. **Authorized Verifiers**: Only add trusted verifiers
3. **Data Privacy**: Personal data is hashed, not stored in plain text
4. **Emergency Procedures**: Use pause functionality only when necessary
5. **Upgrade Path**: Contract is not upgradeable for security; deploy new version if needed

## License

MIT License - see LICENSE file for details.

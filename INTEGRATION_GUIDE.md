# Self.xyz Workshop Integration Guide

This guide explains the changes made to integrate the Self.xyz workshop pattern directly into your KYC system, eliminating the backend dependency.

## 🎯 Key Changes Made

### 1. Smart Contracts Updated to Workshop Pattern

**Before (Old Pattern):**
```solidity
constructor(
    address _identityVerificationHubV2Address,
    uint256 _scope,  // ❌ Wrong type
    // ...
) SelfVerificationRoot(_identityVerificationHubV2Address, _scope)
```

**After (Workshop Pattern):**
```solidity
constructor(
    address _identityVerificationHubV2Address,
    string memory _scopeSeed,  // ✅ Correct type
    // ...
) SelfVerificationRoot(_identityVerificationHubV2Address, _scopeSeed)
```

**Updated Files:**
- `contracts/contracts/SelfKYCVerifier.sol`
- `contracts/contracts/StealthKYCVerifier.sol`
- `contracts/script/DeploySelfKYC.s.sol`
- `contracts/script/DeployStealthKYC.s.sol`

### 2. Frontend SDK Converted to Direct Contract Integration

**Before (Backend API calls):**
```typescript
// Old: Called backend API
const result = await fetch('/api/kyc/verify', {...});
```

**After (Direct Wagmi Calls):**
```typescript
// New: Direct blockchain interaction
const { data } = useReadContract({
  address: contractAddress,
  abi: SELFKYC_ABI,
  functionName: 'isKYCVerified',
  args: [userAddress],
});
```

**Updated Files:**
- `front/lib/sdk/core/SelfKYCClient.ts` - Now returns wagmi configurations
- `front/lib/sdk/hooks/useSelfKYC.ts` - Uses wagmi hooks directly
- `front/components/self-qr-code.tsx` - Watches contract events for verification
- `front/components/kyc-step.tsx` - Updated to use new integration

### 3. Self.xyz Configuration Updated

**Before:**
```typescript
scope: 0x1234567890abcdef... // Hex number
endpoint: "https://staging-api.self.xyz" // Backend API
```

**After:**
```typescript
scope: "tcash-kyc" // Human-readable string
endpoint: "0x31fE360492189a0c03BACaE36ef9be682Ad3727B" // Contract address
endpointType: "contract" // Direct contract integration
```

## 🚀 How It Works Now

### 1. QR Code Generation
- Uses `SelfAppBuilder` with contract endpoint
- Points directly to your deployed contract address
- Uses string-based scope seeds like `"tcash-kyc"`

### 2. Mobile App Verification
- User scans QR code with Self.xyz mobile app
- App performs zero-knowledge proof generation
- App calls `customVerificationHook` function on your contract
- Contract validates proof and stores verification data

### 3. Frontend Monitoring
- Frontend watches for `KYCVerified` events from contract
- Real-time updates when verification completes
- No backend polling or API calls needed

## 📝 Deployment Steps

### 1. Deploy Updated Contracts

```bash
cd contracts

# Deploy SelfKYC with new scope pattern
forge script script/DeploySelfKYC.s.sol --rpc-url $CELO_RPC_URL --broadcast --verify

# Deploy StealthKYC with new scope pattern
forge script script/DeployStealthKYC.s.sol --rpc-url $CELO_RPC_URL --broadcast --verify
```

### 2. Update Contract Addresses

Update `front/lib/sdk/constants/contracts.ts`:
```typescript
export const CONTRACT_ADDRESSES = {
  SELFKYC_VERIFIER: {
    ALFAJORES: '0xYOUR_NEW_CONTRACT_ADDRESS', // ⬅️ Update this
    CELO: '0x...'
  },
  // ...
};
```

### 3. Configure Self.xyz Scopes

The new scope seeds are:
- **Regular KYC**: `"tcash-kyc"`
- **Stealth KYC**: `"tcash-stealth-kyc"`

These must match what's deployed in your contracts.

## 🧪 Testing

### 1. Frontend Testing
```bash
cd front
npm run dev
```

Navigate to `/onboarding` to test the KYC flow.

### 2. Contract Testing
```bash
cd contracts
forge test -vvv
```

### 3. Integration Testing

1. **QR Code Generation**: Verify QR codes generate with correct contract endpoints
2. **Event Watching**: Check that frontend correctly listens for `KYCVerified` events
3. **Mobile App**: Test actual verification with Self.xyz mobile app
4. **State Updates**: Confirm frontend updates after successful verification

## 🔧 Environment Variables

### Frontend (.env.local)
```bash
# Remove these - no longer needed
# NEXT_PUBLIC_BACKEND_URL=
# NEXT_PUBLIC_SELF_ENDPOINT=

# Update these
NEXT_PUBLIC_SELF_APP_NAME="Tsunami Wallet"
NEXT_PUBLIC_SELF_SCOPE="tcash-kyc"  # Must match contract deployment
```

### Contracts (.env)
```bash
CELO_PRIVATE_KEY=your_private_key
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
```

## 🎉 Benefits Achieved

1. **✅ No Backend Required**: Direct blockchain interaction
2. **✅ Workshop Compatible**: Follows official Self.xyz patterns
3. **✅ Real-time Updates**: Event-based verification monitoring
4. **✅ Simplified Architecture**: Fewer moving parts
5. **✅ Better Decentralization**: No centralized API dependency
6. **✅ Preserved Features**: All stealth address functionality maintained

## 🔍 Troubleshooting

### Contract Deployment Issues
- Ensure scope seed is a string ≤31 ASCII characters
- Verify Self.xyz Hub V2 addresses are correct for your network
- Check that constructor parameters match the new signature

### Frontend Integration Issues
- Confirm contract addresses are updated in constants
- Verify wagmi configuration matches your network
- Check that event watching is properly configured

### Self.xyz App Issues
- Ensure QR codes point to contract addresses, not API endpoints
- Verify scope seeds match between frontend and contract
- Check that `endpointType: "contract"` is set correctly

## 📚 Resources

- [Self.xyz Workshop](https://github.com/selfxyz/workshop)
- [Self.xyz Documentation](https://docs.self.xyz)
- [Wagmi Documentation](https://wagmi.sh)
- [Celo Documentation](https://docs.celo.org)
# Self KYC SDK

A comprehensive front-end SDK for integrating Self.xyz KYC verification with privacy-preserving features.

## Features

- **Self.xyz Integration**: Zero-knowledge identity verification
- **Stealth Address Support**: Privacy-preserving operations
- **Vault Operations**: Encrypted token management
- **Compliance Checking**: OFAC and regulatory compliance
- **React Hooks**: Easy integration with React applications
- **TypeScript Support**: Full type safety

## Installation

```bash
npm install @tcash/self-kyc-sdk
```

## Quick Start

### Basic KYC Verification

```tsx
import React from 'react';
import { useSelfKYC, KYCVerification } from '@tcash/self-kyc-sdk';

function App() {
  const { isVerified, kycData } = useSelfKYC();

  return (
    <div>
      <KYCVerification
        onVerificationComplete={(data) => {
          console.log('KYC verified:', data);
        }}
        onError={(error) => {
          console.error('KYC error:', error);
        }}
      />
      
      {isVerified && (
        <div>
          <h3>KYC Verified!</h3>
          <p>Nationality: {kycData?.nationality}</p>
          <p>Document Type: {kycData?.documentType}</p>
        </div>
      )}
    </div>
  );
}
```

### Stealth Address Management

```tsx
import React from 'react';
import { useStealthKYC, StealthAddressManager } from '@tcash/self-kyc-sdk';

function App() {
  const { stealthAddresses, masterIdentity } = useStealthKYC();

  return (
    <div>
      <StealthAddressManager
        onAddressCreated={(address) => {
          console.log('New stealth address:', address);
        }}
        onAddressLinked={(address, masterNullifier) => {
          console.log('Address linked:', address);
        }}
      />
      
      {masterIdentity && (
        <div>
          <h3>Master Identity</h3>
          <p>Nationality: {masterIdentity.nationality}</p>
          <p>Verified: {masterIdentity.isVerified ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
}
```

### Vault Operations

```tsx
import React from 'react';
import { useVault } from '@tcash/self-kyc-sdk';

function App() {
  const { deposit, withdraw, supportedTokens } = useVault();

  const handleDeposit = async () => {
    const result = await deposit(
      '0x...', // token address
      BigInt('1000000'), // amount
      '0x...', // commitment
      0 // denomination ID
    );
    
    if (result.success) {
      console.log('Deposit successful:', result.transactionHash);
    }
  };

  return (
    <div>
      <h3>Supported Tokens</h3>
      <ul>
        {supportedTokens.map((token, index) => (
          <li key={index}>{token}</li>
        ))}
      </ul>
      
      <button onClick={handleDeposit}>
        Deposit Tokens
      </button>
    </div>
  );
}
```

## API Reference

### Hooks

#### `useSelfKYC()`

Main hook for KYC verification functionality.

```tsx
const {
  isVerified,        // boolean - whether user is KYC verified
  kycData,          // KYCData | null - user's KYC information
  isLoading,        // boolean - loading state
  error,            // string | null - error message
  config,           // VerificationConfig | null - verification configuration
  stats,            // VerificationStats | null - verification statistics
  verifyKYC,        // function - verify KYC with proof
  checkStatus,      // function - check verification status
  getKYCData,       // function - get KYC data for user
  refresh,          // function - refresh all data
  clearError        // function - clear error state
} = useSelfKYC();
```

#### `useStealthKYC()`

Hook for stealth address management.

```tsx
const {
  stealthAddresses,     // StealthAddress[] - list of stealth addresses
  masterIdentity,      // MasterKYCIdentity | null - master identity
  isLoading,           // boolean - loading state
  error,               // string | null - error message
  createStealthAddress, // function - create new stealth address
  linkAddress,         // function - link address to master identity
  getMasterIdentity,   // function - get master identity
  verifyWithStealth,   // function - verify KYC with stealth address
  refresh,             // function - refresh all data
  clearError           // function - clear error state
} = useStealthKYC();
```

#### `useVault()`

Hook for vault operations.

```tsx
const {
  isLoading,           // boolean - loading state
  error,               // string | null - error message
  supportedTokens,     // string[] - list of supported tokens
  latestRoot,         // string - latest merkle root
  deposit,            // function - deposit tokens
  withdraw,           // function - withdraw tokens
  executeSpend,       // function - execute spend and swap
  checkCompliance,    // function - check compliance
  getSupportedTokens, // function - get supported tokens
  refresh,            // function - refresh all data
  clearError          // function - clear error state
} = useVault();
```

### Components

#### `KYCVerification`

Main component for KYC verification.

```tsx
<KYCVerification
  onVerificationComplete={(kycData) => {
    // Handle successful verification
  }}
  onError={(error) => {
    // Handle verification error
  }}
  className="custom-class"
/>
```

#### `StealthAddressManager`

Component for managing stealth addresses.

```tsx
<StealthAddressManager
  onAddressCreated={(address) => {
    // Handle new stealth address
  }}
  onAddressLinked={(address, masterNullifier) => {
    // Handle address linking
  }}
  className="custom-class"
/>
```

### Utility Classes

#### `SelfIntegration`

Utilities for Self.xyz integration.

```tsx
import { SelfIntegration } from '@tcash/self-kyc-sdk';

// Generate proof
const proof = await SelfIntegration.generateProof({
  configId: '0x...',
  scope: '0x...'
});

// Validate proof
const isValid = await SelfIntegration.validateProof(proof);

// Generate QR code
const qrCode = SelfIntegration.generateQRCode(configId, scope);
```

#### `StealthAddressUtils`

Utilities for stealth address operations.

```tsx
import { StealthAddressUtils } from '@tcash/self-kyc-sdk';

// Generate stealth address
const stealthAddress = StealthAddressUtils.generateStealthAddress();

// Validate address
const isValid = StealthAddressUtils.validateStealthAddress(address);

// Generate from master key
const address = StealthAddressUtils.deriveFromMaster(masterKey, index);
```

## Configuration

### Contract Addresses

```tsx
import { CONTRACT_ADDRESSES } from '@tcash/self-kyc-sdk';

// Get contract addresses for different networks
const alfajoresAddress = CONTRACT_ADDRESSES.SELFKYC_VERIFIER.ALFAJORES;
const celoAddress = CONTRACT_ADDRESSES.SELFKYC_VERIFIER.CELO;
```

### Network Configuration

```tsx
import { NETWORK_CONFIGS } from '@tcash/self-kyc-sdk';

// Get network configuration
const alfajoresConfig = NETWORK_CONFIGS.ALFAJORES;
const celoConfig = NETWORK_CONFIGS.CELO;
```

## Examples

### Basic KYC Example

```tsx
import { BasicKYCExample } from '@tcash/self-kyc-sdk/examples/basic-kyc';

function App() {
  return <BasicKYCExample />;
}
```

### Stealth KYC Example

```tsx
import { StealthKYCExample } from '@tcash/self-kyc-sdk/examples/stealth-kyc';

function App() {
  return <StealthKYCExample />;
}
```

### Full Integration Example

```tsx
import { FullIntegrationExample } from '@tcash/self-kyc-sdk/examples/full-integration';

function App() {
  return <FullIntegrationExample />;
}
```

## Types

### Core Types

```tsx
interface KYCData {
  isVerified: boolean;
  timestamp: number;
  nationality: string;
  documentType: number;
  isOfacClear: boolean;
  verificationCount: number;
}

interface StealthAddress {
  address: string;
  privateKey: string;
  isLinked: boolean;
  masterNullifier?: string;
}

interface SelfProof {
  nullifier: string;
  userIdentifier: string;
  nationality: string;
  documentType: number;
  ageAtLeast: number;
  isOfacMatch: boolean;
  attestationId: string;
  proof: string;
  timestamp: number;
}
```

## Error Handling

```tsx
const { error, clearError } = useSelfKYC();

if (error) {
  return (
    <div className="error">
      <p>{error}</p>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
}
```

## Loading States

```tsx
const { isLoading } = useSelfKYC();

if (isLoading) {
  return <div>Loading...</div>;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please open an issue on GitHub or contact the development team.

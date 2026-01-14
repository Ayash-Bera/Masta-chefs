# Tzunami Platform • Product Requirements Document (PRD)

## 🎯 Executive Summary

**Tzunami** delivers a privacy-preserving, regulation-compliant financial platform that fuses two cornerstone capabilities:

- **Self.xyz Onchain KYC Integration** – Zero-knowledge identity verification on Celo.
- **fhERC Universal Encrypted Token Protocol** – Privacy-first ERC20 operations on Mantle.

The result is a full-stack solution that lets users transact privately while satisfying compliance mandates, leveraging cutting-edge cryptography, deterministic identity proofs, and production-ready smart contracts.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TZUNAMI PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐ │
│  │   Frontend      │    │     Backend      │    │      Blockchain         │ │
│  │   (Next.js)     │◄──►│   (Express.js)   │◄──►│   (Celo + Sepolia)      │ │
│  │                 │    │                  │    │                         │ │
│  │ • KYC Dashboard │    │ • Self.xyz SDK   │    │ • SelfKYCVerifier       │ │
│  │ • Token Ops     │    │ • Celo SDK       │    │ • StealthKYCVerifier    │ │
│  │ • Wallet Connect│    │ • MongoDB        │    │ • UniversalEncryptedERC │ │
│  │ • ZK Proofs     │    │ • Rate Limiting  │    │ • Registrar Contract    │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          CORE TECHNOLOGIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐ │
│  │ Self.xyz ZK-KYC │    │   fhERC Protocol │    │   Privacy Infrastructure│ │
│  │                 │    │                  │    │                         │ │
│  │ • ZK Identity   │    │ • Encrypted ERC20│    │ • ElGamal Encryption    │ │
│  │ • Nullifiers    │    │ • ZK Transactions│    │ • Baby JubJub Curves    │ │
│  │ • OFAC Checks   │    │ • Multi-chain    │    │ • Poseidon Hashing      │ │
│  │ • Stealth Addr  │    │ • Auditor System │    │ • Groth16 Proofs        │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Major Product Components

### 1. Self.xyz KYC Integration Module (`backend/`, `contracts/`)

- **Purpose**: Privacy-preserving identity verification with zero-knowledge proofs.
- **Contract Addresses (Celo Alfajores 44787)**:
  - Traditional KYC (`SelfKYCVerifier.sol`): `0x31fE360492189a0c03BACaE36ef9be682Ad3727B`
  - Stealth KYC (`StealthKYCVerifier.sol`): `0xBe2187568d4E71a19afe973f5EDEF19E6276Dc84`
- **Self.xyz Hub V2**: `0x68c931C9a534D37aa78094877F46fE46a49F1A51`
- **Minimum Age**: 18 • **OFAC**: Required • **Allowed Docs**: E-Passport, EU ID
- **Data Stored On-chain** (minimal disclosure):
  ```solidity
  struct KYCData {
      bool isVerified;
      uint256 timestamp;
      string nationality;
      uint8 documentType;
      bool isOfacClear;
      uint256 verificationCount;
  }
  ```
- **APIs**: `backend/routes/kyc.js` exposes traditional (`/api/kyc/*`) and stealth (`/api/stealth-kyc/*`) endpoints covering session creation, verification callbacks, stealth address linking, DOB commitments, status queries, and health checks.
- **Flow**:
  ```mermaid
  sequenceDiagram
      participant UI as Frontend
      participant BE as Backend
      participant Self as Self.xyz
      participant Chain as Celo Alfajores
      UI->>BE: POST /api/kyc/session
      BE->>Self: createSession()
      Self-->>BE: Session + QR payload
      BE-->>UI: QR data
      Self->>BE: Verification webhook
      BE->>Chain: Submit proof to SelfKYCVerifier
      Chain-->>BE: Receipt
      BE-->>UI: Status via polling
  ```

### 2. fhERC Universal Encrypted Token Protocol (`fhERC/`, `front/`)

- **Purpose**: Privacy-first ERC20 & native token operations using encrypted balances and ZK proofs.
- **Deployment (Sepolia 11155111)**:
  - `UniversalEncryptedERC.sol`: `0xD5afc45c69644CBd63f362D64B4198a7d81e53C7`
  - `Registrar.sol`: `0x200C0a7C5B49871e41789F5E585Ddb3359e13e8B`
- **Key Features**:
  - Encrypted balances via ElGamal on Baby JubJub.
  - Groth16 circuits for register, mint, transfer, withdraw, burn.
  - Auditor-compliant logging (`AuditorManager`).
  - Multi-token (ERC20 + native) support with `TokenTracker` and `EncryptedUserBalances`.
  - Cross-chain ready via `multichain/` modules.
- **Gas Benchmarks**:
  - Registration ~500k (one-time)
  - Deposit ~150k • Transfer ~200k • Withdraw ~180k • Cross-chain ~300k
- **Contract Architecture**:

  ```
  UniversalEncryptedERC
  ├── TokenTracker
  ├── EncryptedUserBalances
  ├── AuditorManager
  └── Verifier Interfaces (Mint, Transfer, Withdraw, Burn)
  ```

---

## 🔄 End-to-End User Journeys

### Phase 1 – Identity Verification (KYC)
1. User connects wallet (`wagmi` hooks in `front/lib/wagmi-config.ts`).
2. Frontend (`front/components/kyc-dashboard.tsx`) invokes backend to start Self.xyz session.
3. Self mobile app completes verification; backend receives webhook.
4. Backend submits proof to `SelfKYCVerifier` / `StealthKYCVerifier` on Celo.
5. Frontend polls status and updates UI badges.

### Phase 2 – Platform Registration
1. Post-KYC, user derives deterministic private key (`lib/signing-cache.ts`).
2. Registration circuit proves key ownership.
3. `Registrar.register()` stores Baby JubJub public key used across encrypted operations.
4. Hooks `useRegistrationStatus` / `useRegistration` manage UX states.

### Phase 3 – Private Token Operations

#### Deposit (`front/components/deposit-page.tsx`)
- Supports ETH (`useNativeETH`) and ERC20 (`useERC20`).
- Handles allowance, amount presets, Poseidon encryption, and transaction submission.

#### Transfer (`front/components/transfer-page.tsx`)
- Uses `useEncryptedBalance` for real-time balance checking.
- Builds Groth16 proof before calling `UniversalEncryptedERC.transfer`.

#### Withdraw (`front/hooks/use-withdraw.ts` + `components/withdraw-page.tsx`)
- Fetches encrypted balance, auditor key, and user key.
- Decrypts via `decryptEGCTBalance()` from `front/lib/balances/balances.ts`.
- Normalizes decimals, builds proof inputs, validates circuit artifacts in `/public/circuits/`, and calls `withdraw` on-chain.
- Manages transaction state with `useWriteContract` and `useWaitForTransactionReceipt`.

---

## 🛡️ Cryptography & Privacy Stack

- **Zero-Knowledge Proofs**: Groth16 circuits compiled in `fhERC/circom/`, assets cached under `front/public/circuits/`.
- **Encryption**: ElGamal tuples (EGCT) over Baby JubJub curve, decrypted client-side.
- **Hashing**: Poseidon for circuit-friendly commitments and auditor payloads.
- **Nullifiers**: Stored on-chain to block double spends.
- **Auditor System**: `AuditorManager` enforces KYC compliance, logs encrypted payload slices for selective disclosure.

---

## 🧩 Frontend Architecture (`front/`)

- **Framework**: Next.js 14, React 18, TypeScript, Tailwind CSS v4.
- **State & Wallet**: Wagmi v2 + Viem; connectors configured in `lib/wagmi-config.ts`.
- **Key Modules**:
  - `components/dashboard.tsx`: Portfolio & compliance badge view.
  - `components/deposit-page.tsx`, `transfer-page.tsx`, `withdraw-page.tsx`: Token operation wizards.
  - `hooks/use-withdraw.ts`, `use-encrypted-balance.ts`, `use-tokens.ts`, `use-price-oracle.ts`: Business logic encapsulation.
  - UI primitives under `components/ui/` (Radix UI + custom design system).
- **Error Handling**: Proof errors, circuit asset validation, network mismatch prompts, toast notifications (`components/custom-toast.tsx`).

---

## 🔧 Backend Services (`backend/`)

- **Server**: Express.js with Helmet, rate limiting, CORS, centralized error handling.
- **Integrations**: Self.xyz SDK, Celo ContractKit, MongoDB persistence for sessions and identities.
- **Endpoints**:
  - `/api/kyc/session`, `/api/kyc/onchain/submit`, `/api/kyc/onchain/status/:address`, `/api/kyc/health`, `/api/kyc/stats`.
  - `/api/stealth-kyc/session`, `/link`, `/verify`, `/verify-dob`, `/master/:nullifier`, `/status/:stealthAddress`, `/config`, `/health`, `/stats`.
- **Testing**: `npm test`, `npm run test:health`, `npm run test:load`.

---

## 📜 Smart Contracts & Circuits

### Celo (KYC)
- Contracts compiled/deployed via Foundry scripts (`contracts/script/`).
- Config managed through `contracts/.env` (RPC URLs, private key, verification keys).

### Sepolia (fhERC)
- Hardhat project under `fhERC/` with tests in `fhERC/test/`.
- Circuits in `fhERC/circom/` with proving keys under `fhERC/zk/` and `fhERC/zkit/`.
- Registrar + UniversalEncryptedERC contracts imported into frontend via ABIs (`front/lib/contracts.ts`).

---

## 🧪 Performance, Security & Compliance

### Performance Targets
- Proof generation < 30 seconds client-side.
- API latency < 500 ms (excluding chain confirmation).
- 99.9% availability with health endpoints for monitoring.

### Security Controls
- Smart contracts leverage OpenZeppelin libraries and enforce access control, SafeERC20 transfers, nullifier tracking, and reentrancy guards.
- Backend applies rate limiting, schema validation, helmet, CORS restrictions.
- Frontend verifies circuit artifacts, handles transaction receipts, and obfuscates sensitive data.

### Compliance Framework
- Self.xyz enforces OFAC screening, minimum age, document verification.
- Auditor-encrypted payloads provide audit trail without exposing amounts publicly.
- Stealth KYC uses master nullifiers and DOB commitments for privacy-preserving compliance.

---

## 🚀 Roadmap & Next Steps

1. **Production Deployment**
   - Promote contracts to Celo & Ethereum mainnets.
   - Update `front/lib/contracts.ts` with mainnet addresses.
   - Harden backend configuration (secret management, observability).

2. **Security & Assurance**
   - Commission smart contract + circuit audits.
   - Launch bug bounty program post-audit.

3. **Feature Enhancements**
   - Batch operations, cross-chain gateway finalization.
   - Advanced analytics dashboard for compliance teams.
   - Mobile experience optimizations for Self.xyz flow.

---

## 📈 KPIs & Success Metrics

- **Adoption**: 1,000 active users in first quarter; $1M monthly private volume.
- **Compliance**: 100% KYC completion, zero regulatory incidents.
- **Performance**: Maintain gas costs within benchmarks; <1% failed proofs.
- **Ecosystem**: 5+ DeFi integrations, 20+ supported tokens, 5+ EVM chains, active developer community.

---

## 📚 Operational Runbooks

### Environment Configuration
- **Frontend** (`front/.env.local`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CELO_NETWORK`.
- **Backend** (`backend/.env`): Self.xyz credentials, Celo RPC URLs, contract addresses, rate limit configs.
- **Contracts** (`contracts/.env`): RPC URLs, private keys, Celoscan API key.

### Commands
- **Frontend**: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- **Backend**: `npm run dev`, `npm run start`, `npm test`, `npm run test:load`.
- **Contracts**: `forge build`, `forge test`, `forge script`, `npx hardhat test` (alt).

### Monitoring & Testing
- Health endpoints: `/api/kyc/health`, `/api/stealth-kyc/health`.
- Contract verification: Foundry `script/TestStealthKYC.s.sol`, `cast` commands in README.
- Manual QA: `/kyc-test` route for end-to-end verification.

---

## 💡 Innovation Snapshot

- First-of-its-kind fusion of Self.xyz ZK KYC with fhERC encrypted token standard.
- EIP-5564 stealth address integration with master nullifier identity graph.
- Auditor-compliant privacy enabling institutional-grade oversight without PII leakage.
- Developer-friendly architecture: comprehensive docs, modular hooks, reusable circuits.

---

## 📎 References

- README (`README.md`)
- Implementation summary (`IMPLEMENTATION_COMPLETE.md`)
- Contracts (`fhERC/contracts/`, `contracts/`)
- Frontend components (`front/components/`, `front/hooks/`, `front/lib/`)
- Backend services (`backend/`)

> Maintainers should update this PRD as deployment targets evolve, new networks are added, or compliance requirements change.

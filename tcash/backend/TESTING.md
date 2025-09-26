# 🧪 Backend Testing Guide

This guide explains how to test the Self.xyz Onchain KYC backend.

## 🚀 **Quick Start**

### 1. Start the Backend

```bash
cd backend

# Install dependencies (if not done)
npm install

# Start the server
npm run dev
```

The server will start on `http://localhost:3001`

### 2. Run Tests

```bash
# Run all tests
npm test

# Interactive testing
npm run test:interactive

# Health monitoring
npm run test:health

# Load testing
npm run test:load
```

## 📋 **Test Categories**

### **Connectivity Tests**
- ✅ Server health check
- ✅ API root endpoint
- ✅ Service availability

### **Service Tests**
- ✅ KYC service health
- ✅ Configuration validation
- ✅ Statistics endpoints

### **KYC Workflow Tests**
- ✅ Status checking
- ✅ Session initiation
- ✅ Session tracking
- ⚠️ Webhook simulation (expected to fail without Self.xyz signature)

## 🔧 **Manual Testing with curl**

### Health Check
```bash
curl http://localhost:3001/health
```

### KYC Configuration
```bash
curl http://localhost:3001/api/kyc/onchain/config
```

### Check KYC Status
```bash
curl "http://localhost:3001/api/kyc/onchain/status/0x742C7C4b7e69e8c95E6BB7eF8E3b5D9e65c12345"
```

### Initiate KYC
```bash
curl -X POST http://localhost:3001/api/kyc/onchain/initiate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -H "x-user-email: test@example.com" \
  -d '{
    "walletAddress": "0x742C7C4b7e69e8c95E6BB7eF8E3b5D9e65c12345",
    "requirements": {
      "minimumAge": 18,
      "allowedDocumentTypes": [1, 2]
    }
  }'
```

## 🔍 **Testing Different Scenarios**

### 1. **Without Database** (Basic Testing)
- Services will work with warnings
- No persistent session storage
- Configuration and health checks functional

### 2. **Without Blockchain** (API Testing)
- All endpoints accessible
- Mock data responses
- Contract interactions will show warnings

### 3. **With Full Setup** (Production Testing)
- Database connected
- Blockchain configured
- Contract deployed

## 📊 **Expected Test Results**

### ✅ **Should Pass:**
- Server health check
- API root endpoint
- KYC service health
- Configuration endpoints
- Statistics (even with empty data)
- Status checking (returns unverified)
- Session initiation (creates session)

### ⚠️ **Expected Warnings:**
- Database connection (if MongoDB not running)
- Contract deployment (if not deployed)
- Celo wallet (if private key not set)

### ❌ **Should Fail:**
- Webhook simulation (without proper Self.xyz signature)
- Contract interactions (if contract not deployed)
- Blockchain operations (if no wallet configured)

## 🐛 **Troubleshooting**

### Server Won't Start
```bash
# Check if port is in use
lsof -i :3001

# Check environment variables
cat .env
```

### Database Errors
```bash
# Start MongoDB (if using local)
mongod

# Or disable database in development by commenting out DATABASE_URL
```

### Blockchain Errors
```bash
# Check Celo network connectivity
curl https://alfajores-forno.celo-testnet.org

# Verify wallet address format
echo $CELO_PRIVATE_KEY
```

## 🔄 **Continuous Testing**

### Health Monitoring
```bash
# Monitor backend health every 10 seconds
npm run test:health
```

### Load Testing
```bash
# Test 20 concurrent requests
npm run test:load
```

### Integration Testing
```bash
# Run full test suite
npm test
```

## 📝 **Test Coverage**

The test suite covers:
- ✅ All API endpoints
- ✅ Error handling
- ✅ Authentication middleware
- ✅ Rate limiting
- ✅ Configuration validation
- ✅ Service health checks

## 🎯 **Next Steps**

After backend testing passes:
1. Deploy smart contracts to testnet
2. Configure Self.xyz settings
3. Test with Self mobile app
4. Frontend integration testing
5. End-to-end flow testing

## 📞 **Support**

If tests fail unexpectedly:
1. Check the server logs for detailed error messages
2. Verify environment configuration
3. Ensure all dependencies are installed
4. Check network connectivity to Celo and Self.xyz services
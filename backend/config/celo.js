const { newKit } = require('@celo/contractkit');
const { ethers } = require('ethers');

class CeloConfig {
  constructor() {
    this.network = process.env.CELO_NETWORK || 'alfajores';
    this.rpcUrl = this.getRpcUrl();
    this.privateKey = process.env.CELO_PRIVATE_KEY;
    this.contractAddress = this.getContractAddress();
    this.stealthContractAddress = this.getStealthContractAddress();

    // Initialize providers
    this.contractKit = null;
    this.provider = null;
    this.wallet = null;

    this.initialize();
  }

  getRpcUrl() {
    switch (this.network) {
      case 'alfajores':
        return process.env.CELO_ALFAJORES_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
      case 'mainnet':
      case 'celo':
        return process.env.CELO_MAINNET_RPC_URL || 'https://forno.celo.org';
      default:
        throw new Error(`Unsupported Celo network: ${this.network}`);
    }
  }

  getContractAddress() {
    switch (this.network) {
      case 'alfajores':
        return process.env.SELFKYC_CONTRACT_ADDRESS_ALFAJORES;
      case 'mainnet':
      case 'celo':
        return process.env.SELFKYC_CONTRACT_ADDRESS_MAINNET;
      default:
        throw new Error(`Unsupported Celo network: ${this.network}`);
    }
  }

  getStealthContractAddress() {
    switch (this.network) {
      case 'alfajores':
        return process.env.STEALTH_CONTRACT_ADDRESS_ALFAJORES;
      case 'mainnet':
      case 'celo':
        return process.env.STEALTH_CONTRACT_ADDRESS_MAINNET;
      default:
        throw new Error(`Unsupported Celo network: ${this.network}`);
    }
  }

  getChainId() {
    switch (this.network) {
      case 'alfajores':
        return 44787;
      case 'mainnet':
      case 'celo':
        return 42220;
      default:
        throw new Error(`Unsupported Celo network: ${this.network}`);
    }
  }

  getExplorerUrl() {
    switch (this.network) {
      case 'alfajores':
        return 'https://alfajores-blockscout.celo-testnet.org';
      case 'mainnet':
      case 'celo':
        return 'https://explorer.celo.org';
      default:
        return 'https://explorer.celo.org';
    }
  }

  initialize() {
    try {
      // Initialize ContractKit
      this.contractKit = newKit(this.rpcUrl);

      // Initialize ethers provider
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);

      // Initialize wallet if private key is available
      if (this.privateKey) {
        // Add account to ContractKit
        this.contractKit.addAccount(this.privateKey);
        this.contractKit.defaultAccount = this.contractKit.web3.eth.accounts.privateKeyToAccount(
          this.privateKey
        ).address;

        // Create ethers wallet
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);

        console.log(`🔗 Celo ${this.network} initialized with account: ${this.contractKit.defaultAccount}`);
      } else {
        console.warn('⚠️  Warning: CELO_PRIVATE_KEY not provided. Read-only mode enabled.');
      }

      if (!this.contractAddress) {
        console.warn(`⚠️  Warning: KYC contract address not set for ${this.network} network.`);
        console.warn('⚠️  KYC contract interactions will not work until address is configured.');
      }

      if (!this.stealthContractAddress) {
        console.warn(`⚠️  Warning: Stealth KYC contract address not set for ${this.network} network.`);
        console.warn('⚠️  Stealth KYC contract interactions will not work until address is configured.');
      } else {
        console.log(`🔮 Stealth KYC contract configured: ${this.stealthContractAddress}`);
      }

    } catch (error) {
      console.error('❌ Failed to initialize Celo configuration:', error.message);
      throw error;
    }
  }

  async validateConnection() {
    try {
      // Test ContractKit connection
      const latestBlock = await this.contractKit.web3.eth.getBlockNumber();
      console.log(`📊 Latest block on ${this.network}: ${latestBlock}`);

      // Test account balance if wallet is available
      if (this.wallet) {
        const balance = await this.provider.getBalance(this.wallet.address);
        const balanceInCelo = ethers.formatEther(balance);
        console.log(`💰 Account balance: ${balanceInCelo} CELO`);

        // Warn if balance is low
        if (parseFloat(balanceInCelo) < 0.1) {
          console.warn('⚠️  Warning: Low CELO balance. Transactions may fail.');
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Celo connection validation failed:', error.message);
      throw error;
    }
  }

  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getGasPrice();
      return gasPrice;
    } catch (error) {
      console.error('❌ Failed to get gas price:', error.message);
      throw error;
    }
  }

  async estimateGas(transaction) {
    try {
      const gasEstimate = await this.provider.estimateGas(transaction);
      return gasEstimate;
    } catch (error) {
      console.error('❌ Failed to estimate gas:', error.message);
      throw error;
    }
  }

  getNetworkInfo() {
    return {
      network: this.network,
      chainId: this.getChainId(),
      rpcUrl: this.rpcUrl,
      explorerUrl: this.getExplorerUrl(),
      contractAddress: this.contractAddress,
      stealthContractAddress: this.stealthContractAddress,
      hasWallet: !!this.wallet,
      account: this.wallet?.address || null,
    };
  }

  // Utility method to create transaction URL
  getTransactionUrl(txHash) {
    return `${this.getExplorerUrl()}/tx/${txHash}`;
  }

  // Utility method to create address URL
  getAddressUrl(address) {
    return `${this.getExplorerUrl()}/address/${address}`;
  }

  // Method to switch networks (useful for dynamic configuration)
  switchNetwork(network) {
    if (network !== this.network) {
      this.network = network;
      this.rpcUrl = this.getRpcUrl();
      this.contractAddress = this.getContractAddress();
      this.stealthContractAddress = this.getStealthContractAddress();
      this.initialize();
    }
  }

  // Clean up resources
  cleanup() {
    if (this.contractKit) {
      this.contractKit = null;
    }
    if (this.provider) {
      this.provider = null;
    }
    if (this.wallet) {
      this.wallet = null;
    }
  }
}

// Create singleton instance
let celoConfig = null;

const getCeloConfig = () => {
  if (!celoConfig) {
    celoConfig = new CeloConfig();
  }
  return celoConfig;
};

// Export both class and singleton
module.exports = {
  CeloConfig,
  getCeloConfig,
  // Export commonly used properties for convenience
  get config() {
    return getCeloConfig();
  },
  get kit() {
    return getCeloConfig().contractKit;
  },
  get provider() {
    return getCeloConfig().provider;
  },
  get wallet() {
    return getCeloConfig().wallet;
  },
};
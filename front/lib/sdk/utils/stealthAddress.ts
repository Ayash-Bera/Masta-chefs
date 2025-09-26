// SPDX-License-Identifier: MIT
import { StealthAddress } from '../types/contracts';

export class StealthAddressUtils {
  /**
   * Generate a new stealth address
   */
  static generateStealthAddress(): StealthAddress {
    const privateKey = this.generatePrivateKey();
    const address = this.deriveAddress(privateKey);
    
    return {
      address,
      privateKey,
      isLinked: false
    };
  }

  /**
   * Derive stealth address from master key
   */
  static deriveFromMaster(masterKey: string, index: number = 0): StealthAddress {
    const privateKey = this.derivePrivateKey(masterKey, index);
    const address = this.deriveAddress(privateKey);
    
    return {
      address,
      privateKey,
      isLinked: false
    };
  }

  /**
   * Validate stealth address format
   */
  static validateStealthAddress(address: string): boolean {
    try {
      // Check if it's a valid Ethereum address format
      if (!address.startsWith('0x') || address.length !== 42) {
        return false;
      }

      // Check if it contains only valid hex characters
      const hexPattern = /^0x[0-9a-fA-F]{40}$/;
      return hexPattern.test(address);
    } catch (error) {
      console.error('Error validating stealth address:', error);
      return false;
    }
  }

  /**
   * Validate private key format
   */
  static validatePrivateKey(privateKey: string): boolean {
    try {
      // Check if it's a valid private key format
      if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        return false;
      }

      // Check if it contains only valid hex characters
      const hexPattern = /^0x[0-9a-fA-F]{64}$/;
      return hexPattern.test(privateKey);
    } catch (error) {
      console.error('Error validating private key:', error);
      return false;
    }
  }

  /**
   * Generate multiple stealth addresses from master key
   */
  static generateMultipleAddresses(masterKey: string, count: number): StealthAddress[] {
    const addresses: StealthAddress[] = [];
    
    for (let i = 0; i < count; i++) {
      addresses.push(this.deriveFromMaster(masterKey, i));
    }
    
    return addresses;
  }

  /**
   * Create stealth address from seed phrase
   */
  static fromSeedPhrase(seedPhrase: string, index: number = 0): StealthAddress {
    const masterKey = this.deriveMasterKey(seedPhrase);
    return this.deriveFromMaster(masterKey, index);
  }

  /**
   * Generate stealth address with specific properties
   */
  static generateWithProperties(properties: {
    prefix?: string;
    suffix?: string;
    length?: number;
  }): StealthAddress {
    const { prefix = '', suffix = '', length = 42 } = properties;
    
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (attempts < maxAttempts) {
      const stealthAddress = this.generateStealthAddress();
      
      if (prefix && !stealthAddress.address.startsWith(prefix)) {
        attempts++;
        continue;
      }
      
      if (suffix && !stealthAddress.address.endsWith(suffix)) {
        attempts++;
        continue;
      }
      
      if (length !== 42 && stealthAddress.address.length !== length) {
        attempts++;
        continue;
      }
      
      return stealthAddress;
    }
    
    // If no matching address found, return a regular one
    return this.generateStealthAddress();
  }

  /**
   * Generate private key
   */
  private static generatePrivateKey(): string {
    // In a real implementation, this would use proper cryptographic methods
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive private key from master key
   */
  private static derivePrivateKey(masterKey: string, index: number): string {
    // In a real implementation, this would use proper key derivation
    const data = masterKey + index.toString();
    return '0x' + this.simpleHash(data).padStart(64, '0');
  }

  /**
   * Derive address from private key
   */
  private static deriveAddress(privateKey: string): string {
    // In a real implementation, this would use proper address derivation
    const hash = this.simpleHash(privateKey);
    return '0x' + hash.substring(0, 40);
  }

  /**
   * Derive master key from seed phrase
   */
  private static deriveMasterKey(seedPhrase: string): string {
    // In a real implementation, this would use proper key derivation
    return '0x' + this.simpleHash(seedPhrase).padStart(64, '0');
  }

  /**
   * Simple hash function for demonstration
   */
  private static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Generate stealth address with checksum
   */
  static generateWithChecksum(): StealthAddress {
    const stealthAddress = this.generateStealthAddress();
    
    // In a real implementation, this would generate a proper checksum
    const checksum = this.generateChecksum(stealthAddress.address);
    
    return {
      ...stealthAddress,
      address: stealthAddress.address + checksum
    };
  }

  /**
   * Generate checksum for address
   */
  private static generateChecksum(address: string): string {
    // Simple checksum for demonstration
    const hash = this.simpleHash(address);
    return hash.substring(0, 4);
  }

  /**
   * Verify checksum
   */
  static verifyChecksum(address: string): boolean {
    if (address.length !== 46) return false; // 42 + 4 checksum
    
    const addressPart = address.substring(0, 42);
    const checksumPart = address.substring(42);
    
    const expectedChecksum = this.generateChecksum(addressPart);
    return checksumPart === expectedChecksum;
  }

  /**
   * Get address without checksum
   */
  static getAddressWithoutChecksum(address: string): string {
    if (address.length === 46) {
      return address.substring(0, 42);
    }
    return address;
  }

  /**
   * Generate stealth address with specific entropy
   */
  static generateWithEntropy(entropy: string): StealthAddress {
    const privateKey = this.derivePrivateKeyFromEntropy(entropy);
    const address = this.deriveAddress(privateKey);
    
    return {
      address,
      privateKey,
      isLinked: false
    };
  }

  /**
   * Derive private key from entropy
   */
  private static derivePrivateKeyFromEntropy(entropy: string): string {
    // In a real implementation, this would use proper entropy derivation
    return '0x' + this.simpleHash(entropy).padStart(64, '0');
  }

  /**
   * Generate stealth address with specific pattern
   */
  static generateWithPattern(pattern: string): StealthAddress {
    let attempts = 0;
    const maxAttempts = 10000;
    
    while (attempts < maxAttempts) {
      const stealthAddress = this.generateStealthAddress();
      
      if (this.matchesPattern(stealthAddress.address, pattern)) {
        return stealthAddress;
      }
      
      attempts++;
    }
    
    // If no matching address found, return a regular one
    return this.generateStealthAddress();
  }

  /**
   * Check if address matches pattern
   */
  private static matchesPattern(address: string, pattern: string): boolean {
    if (pattern.length !== address.length) return false;
    
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] !== '*' && pattern[i] !== address[i]) {
        return false;
      }
    }
    
    return true;
  }
}

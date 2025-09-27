const { ethers } = require('ethers');

class OrderSigningUtils {
    constructor(chainId = 84532) { // Base Sepolia
        this.chainId = chainId;
        this.AGGREGATOR_CONTRACT = "0x111111125421cA6dc452d289314280a0f8842A65";
    }

    // EIP-712 domain for 1inch
    getDomain() {
        return {
            name: "1inch Limit Order Protocol",
            version: "4",
            chainId: this.chainId,
            verifyingContract: this.AGGREGATOR_CONTRACT
        };
    }

    // EIP-712 types for 1inch orders
    getTypes() {
        return {
            Order: [
                { name: "salt", type: "uint256" },
                { name: "maker", type: "address" },
                { name: "receiver", type: "address" },
                { name: "makerAsset", type: "address" },
                { name: "takerAsset", type: "address" },
                { name: "makingAmount", type: "uint256" },
                { name: "takingAmount", type: "uint256" },
                { name: "makerTraits", type: "uint256" }
            ]
        };
    }

    // Generate order hash
    getOrderHash(order) {
        return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "address", "address", "address", "address", "uint256", "uint256", "uint256"],
            [
                order.salt,
                order.maker,
                order.receiver,
                order.makerAsset,
                order.takerAsset,
                order.makingAmount,
                order.takingAmount,
                order.makerTraits
            ]
        ));
    }

    // Sign order with private key
    async signOrder(order, privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        return await wallet.signTypedData(
            this.getDomain(),
            this.getTypes(),
            order
        );
    }

    // Verify order signature
    async verifyOrderSignature(order, signature, expectedSigner) {
        const recoveredAddress = ethers.verifyTypedData(
            this.getDomain(),
            this.getTypes(),
            order,
            signature
        );
        return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    }

    // Convert your BatchedOrder to 1inch Order format
    convertBatchedOrderTo1inchOrder(batchedOrder, makerAsset, takerAsset, receiver = ethers.ZeroAddress) {
        return {
            salt: batchedOrder.salt,
            maker: batchedOrder.maker,
            receiver: receiver,
            makerAsset: makerAsset,
            takerAsset: takerAsset,
            makingAmount: batchedOrder.makingAmount,
            takingAmount: batchedOrder.takingAmount,
            makerTraits: 0 // Basic order, no special traits
        };
    }

    // Create multiple signed orders from batch
    async createSignedBatch(batchedOrders, makerAsset, takerAsset, privateKeys, receiver = ethers.ZeroAddress) {
        const signedOrders = [];

        for (let i = 0; i < batchedOrders.length; i++) {
            const order = this.convertBatchedOrderTo1inchOrder(
                batchedOrders[i],
                makerAsset,
                takerAsset,
                receiver
            );

            const signature = await this.signOrder(order, privateKeys[i]);
            const orderHash = this.getOrderHash(order);

            signedOrders.push({
                order,
                signature,
                orderHash,
                timestamp: Date.now()
            });
        }

        return signedOrders;
    }

    // Validate order before signing
    validateOrder(order) {
        const errors = [];

        if (!ethers.isAddress(order.maker)) {
            errors.push("Invalid maker address");
        }
        if (!ethers.isAddress(order.makerAsset)) {
            errors.push("Invalid makerAsset address");
        }
        if (!ethers.isAddress(order.takerAsset)) {
            errors.push("Invalid takerAsset address");
        }
        if (order.makingAmount <= 0) {
            errors.push("makingAmount must be positive");
        }
        if (order.takingAmount <= 0) {
            errors.push("takingAmount must be positive");
        }
        if (order.salt <= 0) {
            errors.push("salt must be positive");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Check if order is expired (if using time-based salt)
    isOrderExpired(order, expirationTime) {
        return Date.now() > expirationTime;
    }

    // Generate unique salt (timestamp + random)
    generateSalt() {
        return Date.now() * 1000 + Math.floor(Math.random() * 1000);
    }
}

class OrderStorage {
    constructor() {
        this.orders = new Map();
    }

    // Store signed order
    storeOrder(orderData) {
        this.orders.set(orderData.orderHash, orderData);
    }

    // Get stored order
    getOrder(orderHash) {
        return this.orders.get(orderHash);
    }

    // Get all orders for a specific maker
    getOrdersByMaker(makerAddress) {
        return Array.from(this.orders.values()).filter(
            order => order.order.maker.toLowerCase() === makerAddress.toLowerCase()
        );
    }

    // Get all orders for a token pair
    getOrdersByTokenPair(makerAsset, takerAsset) {
        return Array.from(this.orders.values()).filter(
            order =>
                order.order.makerAsset.toLowerCase() === makerAsset.toLowerCase() &&
                order.order.takerAsset.toLowerCase() === takerAsset.toLowerCase()
        );
    }

    // Remove order
    removeOrder(orderHash) {
        return this.orders.delete(orderHash);
    }

    // Get all orders
    getAllOrders() {
        return Array.from(this.orders.values());
    }

    // Export orders to JSON
    exportToJSON() {
        return JSON.stringify(Array.from(this.orders.entries()), null, 2);
    }

    // Import orders from JSON
    importFromJSON(jsonString) {
        const entries = JSON.parse(jsonString);
        this.orders = new Map(entries);
    }

    // Get orders ready for settlement (valid signatures, not expired)
    getSettleableOrders() {
        return Array.from(this.orders.values()).filter(orderData => {
            const validation = new OrderSigningUtils().validateOrder(orderData.order);
            return validation.isValid;
        });
    }
}

module.exports = {
    OrderSigningUtils,
    OrderStorage
};
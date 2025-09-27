const { ethers } = require('ethers');
const fs = require('fs');

// Base Sepolia configuration
const CHAIN_ID = 84532;
const AGGREGATOR_CONTRACT = "0x111111125421cA6dc452d289314280a0f8842A65";
const RPC_URL = "https://sepolia.base.org";

// Your MultiBatch1inchHelper contract (deploy this to Base Sepolia)
const MULTI_BATCH_HELPER = ""; // Add your deployed contract address

class TestnetLimitOrderManager {
    constructor(privateKey) {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.orders = new Map(); // Store signed orders locally
    }

    // 1. Create and sign orders using your batching contract
    async createBatchedOrders(tokenPairs) {
        const batchedOrders = [];

        for (const pair of tokenPairs) {
            // Use your MultiBatch1inchHelper to prepare orders
            const batch = await this.prepareBatch(pair);

            // Sign each order
            for (const order of batch.orders) {
                const signature = await this.signOrder(order);
                const orderData = {
                    order,
                    signature,
                    maker: order.maker,
                    timestamp: Date.now()
                };

                // Store locally (this is the "off-chain management" part)
                const orderHash = this.getOrderHash(order);
                this.orders.set(orderHash, orderData);
                batchedOrders.push(orderData);
            }
        }

        return batchedOrders;
    }

    // 2. Submit batched orders to 1inch Aggregator
    async settleBatchedOrders(orderHashes) {
        const aggregator = new ethers.Contract(
            AGGREGATOR_CONTRACT,
            [
                "function fillOrder(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits), bytes calldata signature, uint256 interaction, uint256 makingAmount, uint256 takingAmount) external"
            ],
            this.wallet
        );

        const settlements = [];

        for (const orderHash of orderHashes) {
            const orderData = this.orders.get(orderHash);
            if (!orderData) continue;

            try {
                // Submit to 1inch aggregator
                const tx = await aggregator.fillOrder(
                    orderData.order,
                    orderData.signature,
                    0, // no interaction
                    orderData.order.makingAmount,
                    orderData.order.takingAmount,
                    { gasLimit: 300000 }
                );

                settlements.push({
                    orderHash,
                    txHash: tx.hash,
                    status: 'pending'
                });

                console.log(`Order ${orderHash} submitted: ${tx.hash}`);

            } catch (error) {
                console.error(`Failed to settle order ${orderHash}:`, error.message);
            }
        }

        return settlements;
    }

    // 3. Helper function to prepare batch using your contract
    async prepareBatch(tokenPair) {
        const helperContract = new ethers.Contract(
            MULTI_BATCH_HELPER,
            [
                "function createTokenPairBatch(address makerAsset, address takerAsset, tuple(address maker, uint256 makingAmount, uint256 takingAmount, uint256 salt)[] calldata batchedOrders, address receiver) external view returns (tuple(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits)[] orders, bytes32[] orderHashes, address[] makers, uint256 totalOrders))"
            ],
            this.provider
        );

        return await helperContract.createTokenPairBatch(
            tokenPair.makerAsset,
            tokenPair.takerAsset,
            tokenPair.orders,
            ethers.ZeroAddress // or specific receiver
        );
    }

    // 4. Sign order using EIP-712
    async signOrder(order) {
        const domain = {
            name: "1inch Limit Order Protocol",
            version: "4",
            chainId: CHAIN_ID,
            verifyingContract: AGGREGATOR_CONTRACT
        };

        const types = {
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

        return await this.wallet.signTypedData(domain, types, order);
    }

    // 5. Generate order hash
    getOrderHash(order) {
        return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "address", "address", "address", "address", "uint256", "uint256", "uint256"],
            [order.salt, order.maker, order.receiver, order.makerAsset, order.takerAsset, order.makingAmount, order.takingAmount, order.makerTraits]
        ));
    }

    // 6. Save orders to local storage (off-chain management)
    saveOrdersToFile(filename = 'orders.json') {
        const ordersArray = Array.from(this.orders.entries()).map(([hash, data]) => ({
            hash,
            ...data
        }));
        fs.writeFileSync(filename, JSON.stringify(ordersArray, null, 2));
    }

    // 7. Load orders from local storage
    loadOrdersFromFile(filename = 'orders.json') {
        if (fs.existsSync(filename)) {
            const ordersArray = JSON.parse(fs.readFileSync(filename, 'utf8'));
            this.orders.clear();
            ordersArray.forEach(orderData => {
                this.orders.set(orderData.hash, orderData);
            });
        }
    }
}

// Example usage
async function main() {
    const privateKey = process.env.PRIVATE_KEY; // Your testnet private key
    const manager = new TestnetLimitOrderManager(privateKey);

    // Example: Create batched orders for ETH->USDC
    const tokenPairs = [{
        makerAsset: "0x...", // ETH address on Base Sepolia
        takerAsset: "0x...", // USDC address on Base Sepolia
        orders: [
            {
                maker: "0x...", // User A address
                makingAmount: ethers.parseEther("1"), // 1 ETH
                takingAmount: ethers.parseUnits("3000", 6), // 3000 USDC
                salt: Date.now()
            },
            {
                maker: "0x...", // User B address
                makingAmount: ethers.parseEther("0.5"), // 0.5 ETH
                takingAmount: ethers.parseUnits("1500", 6), // 1500 USDC
                salt: Date.now() + 1
            }
        ]
    }];

    // Step 1: Create and sign orders
    console.log("Creating batched orders...");
    const batchedOrders = await manager.createBatchedOrders(tokenPairs);

    // Step 2: Save orders locally
    manager.saveOrdersToFile();

    // Step 3: Later, settle the orders
    const orderHashes = batchedOrders.map(order => manager.getOrderHash(order.order));
    console.log("Settling orders...");
    const settlements = await manager.settleBatchedOrders(orderHashes);

    console.log("Settlement results:", settlements);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { TestnetLimitOrderManager };
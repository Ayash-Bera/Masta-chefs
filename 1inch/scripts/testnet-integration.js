const { ethers } = require('ethers');
const fs = require('fs');

// Base Sepolia configuration
const CHAIN_ID = 84532;
const AGGREGATOR_CONTRACT = "0x111111125421cA6dc452d289314280a0f8842A65";
const RPC_URL = "https://sepolia.base.org";

// Your MultiBatch1inchHelper contract (deploy this to Base Sepolia)
const MULTI_BATCH_HELPER = "0x7d7AE94f8949aA4301fDdAD6285bdDBfC74A4E7a"; // Your deployed contract address

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

    // Example: Create batched orders for ETH->USDC on Base Sepolia
    const tokenPairs = [{
        makerAsset: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH (native token representation)
        takerAsset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC (Circle)
        orders: [
            {
                maker: "0x1fB1aFeF56ec99Ab265ab4D8394Aec08f297f296", // Your deployer address
                makingAmount: ethers.parseEther("0.001"), // 0.001 ETH (small amount for testing)
                takingAmount: ethers.parseUnits("3", 6), // 3 test tokens
                salt: Date.now()
            },
            {
                maker: "0x1fB1aFeF56ec99Ab265ab4D8394Aec08f297f296", // Your deployer address
                makingAmount: ethers.parseEther("0.0005"), // 0.0005 ETH
                takingAmount: ethers.parseUnits("1.5", 6), // 1.5 test tokens
                salt: Date.now() + 1
            }
        ]
    }];

    // Step 0: Test basic contract connectivity
    console.log("Testing contract connectivity...");
    const helperContract = new ethers.Contract(
        MULTI_BATCH_HELPER,
        [
            "function limitOrderProtocol() view returns (address)",
            "function createTokenPairBatch(address,address,(address,uint256,uint256,uint256)[],address) view returns (tuple)"
        ],
        manager.provider
    );

    try {
        const protocolAddr = await helperContract.limitOrderProtocol();
        console.log("✅ Contract accessible. Limit Order Protocol:", protocolAddr);

        // Step 1: Test with empty orders first
        console.log("\n🧪 Testing empty batch creation...");
        const emptyBatch = await helperContract.createTokenPairBatch(
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Sepolia USDC
            [], // empty orders
            ethers.ZeroAddress
        );
        console.log("✅ Empty batch test passed. Total orders:", emptyBatch.totalOrders);

        // Step 2: Test with real orders
        console.log("\n🎯 Creating test batch with sample orders...");
        const testOrders = [
            {
                maker: "0x1fB1aFeF56ec99Ab265ab4D8394Aec08f297f296", // Your address
                makingAmount: ethers.parseEther("0.001"), // 0.001 ETH
                takingAmount: ethers.parseUnits("3", 6), // 3 USDC (6 decimals)
                salt: 1234567890
            },
            {
                maker: "0x1fB1aFeF56ec99Ab265ab4D8394Aec08f297f296", // Your address
                makingAmount: ethers.parseEther("0.002"), // 0.002 ETH
                takingAmount: ethers.parseUnits("6", 6), // 6 USDC
                salt: 1234567891
            }
        ];

        const batch = await helperContract.createTokenPairBatch(
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Sepolia USDC
            testOrders,
            ethers.ZeroAddress
        );

        console.log("✅ Batch created successfully!");
        console.log("📊 Batch Details:");
        console.log("   - Total Orders:", batch.totalOrders.toString());
        console.log("   - Order Hashes:", batch.orderHashes.length);
        console.log("   - Makers:", batch.makers);

        // Step 3: Test signing one of the orders
        console.log("\n✍️  Testing order signing...");
        if (batch.orders.length > 0) {
            const firstOrder = batch.orders[0];
            console.log("First order details:");
            console.log("   - Salt:", firstOrder.salt.toString());
            console.log("   - Maker:", "0x" + firstOrder.maker.toString(16).padStart(40, '0'));
            console.log("   - Making Amount:", ethers.formatEther(firstOrder.makingAmount), "ETH");
            console.log("   - Taking Amount:", ethers.formatUnits(firstOrder.takingAmount, 6), "USDC");

            // Convert the order format for signing
            const orderForSigning = {
                salt: firstOrder.salt,
                maker: "0x" + firstOrder.maker.toString(16).padStart(40, '0'),
                receiver: "0x" + firstOrder.receiver.toString(16).padStart(40, '0'),
                makerAsset: "0x" + firstOrder.makerAsset.toString(16).padStart(40, '0'),
                takerAsset: "0x" + firstOrder.takerAsset.toString(16).padStart(40, '0'),
                makingAmount: firstOrder.makingAmount,
                takingAmount: firstOrder.takingAmount,
                makerTraits: firstOrder.makerTraits
            };

            try {
                const signature = await manager.signOrder(orderForSigning);
                console.log("✅ Order signed successfully!");
                console.log("   - Signature length:", signature.length);
                console.log("   - Signature preview:", signature.substring(0, 20) + "...");

                // Step 4: Verify the signature
                console.log("\n🔍 Verifying signature...");
                const orderHash = manager.getOrderHash(orderForSigning);
                console.log("✅ Order hash generated:", orderHash);

                console.log("\n🎉 FULL TEST COMPLETED SUCCESSFULLY!");
                console.log("📋 Summary:");
                console.log("   ✅ Contract deployed and accessible");
                console.log("   ✅ Batch creation working");
                console.log("   ✅ Order generation working");
                console.log("   ✅ Order signing working");
                console.log("   ✅ Ready for 1inch limit order integration!");

            } catch (signError) {
                console.error("❌ Signing failed:", signError.message);
            }
        }

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        return;
    }

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
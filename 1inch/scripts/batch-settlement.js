const { ethers } = require('ethers');
const { OrderSigningUtils, OrderStorage } = require('./order-utils');

class BatchSettlement {
    constructor(privateKey, rpcUrl = "https://sepolia.base.org") {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.orderUtils = new OrderSigningUtils();
        this.orderStorage = new OrderStorage();

        // 1inch Aggregator on Base Sepolia
        this.AGGREGATOR_ADDRESS = "0x111111125421cA6dc452d289314280a0f8842A65";

        // Aggregator contract interface
        this.aggregatorContract = new ethers.Contract(
            this.AGGREGATOR_ADDRESS,
            [
                "function fillOrder(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes signature, uint256 interaction, uint256 makingAmount, uint256 takingAmount) external returns (uint256, uint256, bytes32)",
                "function hashOrder(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) external view returns (bytes32)",
                "function orderStatus(bytes32 orderHash) external view returns (uint256)"
            ],
            this.wallet
        );
    }

    // Load signed orders from your batch system
    loadOrdersFromBatch(signedOrders) {
        signedOrders.forEach(orderData => {
            this.orderStorage.storeOrder(orderData);
        });
    }

    // Settle a single order
    async settleSingleOrder(orderHash, makingAmount = null, takingAmount = null) {
        const orderData = this.orderStorage.getOrder(orderHash);
        if (!orderData) {
            throw new Error(`Order ${orderHash} not found`);
        }

        // Use full amounts if not specified
        const finalMakingAmount = makingAmount || orderData.order.makingAmount;
        const finalTakingAmount = takingAmount || orderData.order.takingAmount;

        console.log(`Settling order ${orderHash.slice(0, 10)}...`);

        try {
            // Check order status first
            const status = await this.aggregatorContract.orderStatus(orderHash);
            if (status > 0) {
                throw new Error(`Order already filled or cancelled. Status: ${status}`);
            }

            // Estimate gas first
            const gasEstimate = await this.aggregatorContract.fillOrder.estimateGas(
                orderData.order,
                orderData.signature,
                0, // no interaction
                finalMakingAmount,
                finalTakingAmount
            );

            // Execute with 20% gas buffer
            const tx = await this.aggregatorContract.fillOrder(
                orderData.order,
                orderData.signature,
                0, // no interaction
                finalMakingAmount,
                finalTakingAmount,
                {
                    gasLimit: Math.floor(gasEstimate * 1.2),
                    // You might want to set gas price for faster execution
                    // gasPrice: ethers.parseUnits("20", "gwei")
                }
            );

            console.log(`Order settlement transaction: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();
            console.log(`Order settled successfully in block ${receipt.blockNumber}`);

            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed
            };

        } catch (error) {
            console.error(`Failed to settle order ${orderHash}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Settle multiple orders sequentially
    async settleBatchSequential(orderHashes, delayMs = 1000) {
        const results = [];

        for (const orderHash of orderHashes) {
            const result = await this.settleSingleOrder(orderHash);
            results.push({ orderHash, ...result });

            // Delay between transactions to avoid nonce issues
            if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        return results;
    }

    // Settle orders for a specific token pair
    async settleTokenPairOrders(makerAsset, takerAsset) {
        const orders = this.orderStorage.getOrdersByTokenPair(makerAsset, takerAsset);
        const orderHashes = orders.map(order => order.orderHash);

        console.log(`Found ${orders.length} orders for ${makerAsset} -> ${takerAsset}`);

        return await this.settleBatchSequential(orderHashes);
    }

    // Get settlement statistics
    async getSettlementStats(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        const totalGasUsed = successful.reduce((sum, r) => sum + (r.gasUsed || 0n), 0n);

        return {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / results.length * 100).toFixed(2) + '%',
            totalGasUsed: totalGasUsed.toString(),
            failedReasons: failed.map(f => f.error)
        };
    }

    // Check order statuses before settlement
    async checkOrderStatuses(orderHashes) {
        const statuses = [];

        for (const orderHash of orderHashes) {
            try {
                const status = await this.aggregatorContract.orderStatus(orderHash);
                statuses.push({
                    orderHash,
                    status: status.toString(),
                    canSettle: status === 0n
                });
            } catch (error) {
                statuses.push({
                    orderHash,
                    status: 'error',
                    error: error.message,
                    canSettle: false
                });
            }
        }

        return statuses;
    }

    // Pre-settlement validation
    async validateOrdersForSettlement(orderHashes) {
        const validationResults = [];

        for (const orderHash of orderHashes) {
            const orderData = this.orderStorage.getOrder(orderHash);
            if (!orderData) {
                validationResults.push({
                    orderHash,
                    valid: false,
                    error: 'Order not found in storage'
                });
                continue;
            }

            // Validate order structure
            const validation = this.orderUtils.validateOrder(orderData.order);
            if (!validation.isValid) {
                validationResults.push({
                    orderHash,
                    valid: false,
                    error: validation.errors.join(', ')
                });
                continue;
            }

            // Verify signature
            try {
                const isValidSignature = await this.orderUtils.verifyOrderSignature(
                    orderData.order,
                    orderData.signature,
                    orderData.order.maker
                );

                validationResults.push({
                    orderHash,
                    valid: isValidSignature,
                    error: isValidSignature ? null : 'Invalid signature'
                });
            } catch (error) {
                validationResults.push({
                    orderHash,
                    valid: false,
                    error: `Signature verification failed: ${error.message}`
                });
            }
        }

        return validationResults;
    }

    // Monitor settlement transactions
    async monitorSettlementTransactions(txHashes) {
        const results = [];

        for (const txHash of txHashes) {
            try {
                const receipt = await this.provider.getTransactionReceipt(txHash);
                if (receipt) {
                    results.push({
                        txHash,
                        status: receipt.status === 1 ? 'success' : 'failed',
                        blockNumber: receipt.blockNumber,
                        gasUsed: receipt.gasUsed.toString()
                    });
                } else {
                    results.push({
                        txHash,
                        status: 'pending'
                    });
                }
            } catch (error) {
                results.push({
                    txHash,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return results;
    }
}

// Example usage script
async function main() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error("Please set PRIVATE_KEY environment variable");
        process.exit(1);
    }

    const settlement = new BatchSettlement(privateKey);

    // Example: Load some signed orders (you'd get these from your batch creation process)
    const exampleSignedOrders = [
        // These would come from your MultiBatch1inchHelper contract and signing process
        // {
        //     order: { ... },
        //     signature: "0x...",
        //     orderHash: "0x...",
        //     timestamp: Date.now()
        // }
    ];

    // Load orders into settlement system
    settlement.loadOrdersFromBatch(exampleSignedOrders);

    // Get all orders to settle
    const allOrders = settlement.orderStorage.getAllOrders();
    const orderHashes = allOrders.map(order => order.orderHash);

    if (orderHashes.length === 0) {
        console.log("No orders to settle");
        return;
    }

    console.log(`Found ${orderHashes.length} orders to settle`);

    // Step 1: Validate orders
    console.log("Validating orders...");
    const validationResults = await settlement.validateOrdersForSettlement(orderHashes);
    const validOrders = validationResults.filter(v => v.valid).map(v => v.orderHash);

    console.log(`${validOrders.length}/${orderHashes.length} orders are valid for settlement`);

    // Step 2: Check current order statuses
    console.log("Checking order statuses...");
    const statusResults = await settlement.checkOrderStatuses(validOrders);
    const settleableOrders = statusResults.filter(s => s.canSettle).map(s => s.orderHash);

    console.log(`${settleableOrders.length} orders can be settled`);

    // Step 3: Settle orders
    if (settleableOrders.length > 0) {
        console.log("Starting settlement...");
        const settlementResults = await settlement.settleBatchSequential(settleableOrders, 2000); // 2 second delay

        // Step 4: Get stats
        const stats = await settlement.getSettlementStats(settlementResults);
        console.log("Settlement Statistics:", stats);

        // Save results
        const fs = require('fs');
        fs.writeFileSync(
            'settlement-results.json',
            JSON.stringify({ results: settlementResults, stats }, null, 2)
        );
        console.log("Results saved to settlement-results.json");
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { BatchSettlement };
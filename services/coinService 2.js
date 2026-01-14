const User = require('../models/User');
const CoinTransaction = require('../models/CoinTransaction');

/**
 * Coin Service
 * Handles all coin-related operations with full transparency
 */

// Coin prices for redemptions
const REDEMPTION_PRICES = {
    EXTRA_ANALYSES_5: { coins: 50, description: '5 Extra AI Analyses' },
    EXTRA_HUMANIZE_10: { coins: 100, description: '10 Extra Humanize Attempts' },
    TEMP_PREMIUM_24H: { coins: 200, description: '24 Hour Premium Access' },
    TEMP_PREMIUM_72H: { coins: 500, description: '72 Hour Premium Access' },
};

class CoinService {
    /**
     * Award coins to user
     * @param {String} userId - User ID
     * @param {Number} amount - Coins to award
     * @param {String} source - Source of coins
     * @param {String} description - Human-readable description
     * @param {Object} metadata - Additional data
     */
    async awardCoins(userId, amount, source, description, metadata = {}) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Update user's coin balance
            user.coins += amount;
            const balanceAfter = user.coins;
            await user.save();

            // Record transaction
            const transaction = await CoinTransaction.create({
                userId,
                amount,
                type: 'earn',
                source,
                description,
                metadata,
                balanceAfter
            });

            return {
                success: true,
                newBalance: balanceAfter,
                transaction
            };
        } catch (error) {
            console.error('Error awarding coins:', error);
            throw error;
        }
    }

    /**
     * Spend coins for redemption
     * @param {String} userId - User ID
     * @param {Number} amount - Coins to spend
     * @param {String} source - What was purchased
     * @param {String} description - Human-readable description
     * @param {Object} metadata - Additional data
     */
    async spendCoins(userId, amount, source, description, metadata = {}) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Check if user has enough coins
            if (user.coins < amount) {
                throw new Error('Insufficient coins');
            }

            // Deduct coins
            user.coins -= amount;
            const balanceAfter = user.coins;
            await user.save();

            // Record transaction
            const transaction = await CoinTransaction.create({
                userId,
                amount: -amount, // Negative for spending
                type: 'spend',
                source,
                description,
                metadata,
                balanceAfter
            });

            return {
                success: true,
                newBalance: balanceAfter,
                transaction
            };
        } catch (error) {
            console.error('Error spending coins:', error);
            throw error;
        }
    }

    /**
     * Get user's coin balance and recent transactions
     * @param {String} userId - User ID
     * @param {Number} limit - Number of recent transactions to fetch
     */
    async getBalance(userId, limit = 10) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const recentTransactions = await CoinTransaction.find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit);

            return {
                balance: user.coins,
                transactions: recentTransactions
            };
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Get complete transaction history
     * @param {String} userId - User ID  
     * @param {Number} page - Page number
     * @param {Number} limit - Items per page
     */
    async getTransactionHistory(userId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;

            const transactions = await CoinTransaction.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await CoinTransaction.countDocuments({ userId });

            return {
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting transaction history:', error);
            throw error;
        }
    }

    /**
     * Redeem coins for a specific item
     * @param {String} userId - User ID
     * @param {String} itemType - Type of item to redeem
     */
    async redeem(userId, itemType) {
        try {
            const item = REDEMPTION_PRICES[itemType];
            if (!item) {
                throw new Error('Invalid redemption item');
            }

            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Check if user has enough coins
            if (user.coins < item.coins) {
                throw new Error('Insufficient coins');
            }

            // Spend coins
            const result = await this.spendCoins(
                userId,
                item.coins,
                itemType.toLowerCase(),
                `Redeemed: ${item.description}`,
                { itemType, redeemedAt: new Date() }
            );

            // TODO: Apply the actual benefit (extra analyses, temp premium, etc.)
            // This will be implemented based on your existing subscription/usage logic

            return {
                success: true,
                item: item.description,
                coinsSpent: item.coins,
                newBalance: result.newBalance
            };
        } catch (error) {
            console.error('Error redeeming coins:', error);
            throw error;
        }
    }

    /**
     * Get available redemption options
     */
    getRedemptionOptions() {
        return Object.entries(REDEMPTION_PRICES).map(([key, value]) => ({
            id: key,
            name: value.description,
            cost: value.coins
        }));
    }
}

module.exports = new CoinService();

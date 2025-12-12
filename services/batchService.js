/**
 * BATCH PROCESSING SERVICE
 * 
 * Handles bulk analysis for agency/enterprise users
 * Processes multiple texts with progress tracking
 */

const crypto = require('crypto');

// Simple UUID generator using built-in crypto (no external package needed)
const generateBatchId = () => {
    return crypto.randomBytes(16).toString('hex');
};

// In-memory batch storage (for MVP - use Redis/MongoDB for production)
const batches = new Map();

/**
 * Create a new batch job
 */
const createBatch = (userId, texts, options = {}) => {
    const batchId = generateBatchId();

    const batch = {
        id: batchId,
        userId: userId.toString(),
        status: 'pending', // pending, processing, completed, failed
        createdAt: new Date(),
        completedAt: null,
        totalItems: texts.length,
        processedItems: 0,
        items: texts.map((text, index) => ({
            id: `${batchId}-${index}`,
            text: text.substring(0, 10000), // Limit text length
            filename: options.filenames?.[index] || `Document ${index + 1}`,
            status: 'pending', // pending, processing, completed, failed
            result: null,
            error: null,
        })),
        summary: null,
        options,
    };

    batches.set(batchId, batch);
    return batch;
};

/**
 * Get batch by ID
 */
const getBatch = (batchId) => {
    return batches.get(batchId) || null;
};

/**
 * Update batch item result
 */
const updateBatchItem = (batchId, itemIndex, result, error = null) => {
    const batch = batches.get(batchId);
    if (!batch || !batch.items[itemIndex]) return null;

    const item = batch.items[itemIndex];
    item.status = error ? 'failed' : 'completed';
    item.result = result;
    item.error = error;

    batch.processedItems = batch.items.filter(i =>
        i.status === 'completed' || i.status === 'failed'
    ).length;

    // Check if batch is complete
    if (batch.processedItems === batch.totalItems) {
        batch.status = 'completed';
        batch.completedAt = new Date();
        batch.summary = generateBatchSummary(batch);
    }

    batches.set(batchId, batch);
    return batch;
};

/**
 * Set batch status to processing
 */
const startBatchProcessing = (batchId) => {
    const batch = batches.get(batchId);
    if (!batch) return null;

    batch.status = 'processing';
    batches.set(batchId, batch);
    return batch;
};

/**
 * Generate summary for completed batch
 */
const generateBatchSummary = (batch) => {
    const results = batch.items
        .filter(i => i.result)
        .map(i => i.result);

    if (results.length === 0) {
        return {
            avgPlagiarismScore: 0,
            avgAiScore: 0,
            totalPlagiarized: 0,
            totalClean: 0,
            failedItems: batch.items.filter(i => i.status === 'failed').length,
        };
    }

    const avgPlagiarismScore = Math.round(
        results.reduce((sum, r) => sum + (r.plagarismScore || 0), 0) / results.length
    );

    const avgAiScore = Math.round(
        results.reduce((sum, r) => sum + (r.aiScore || 0), 0) / results.length
    );

    const totalPlagiarized = results.filter(r => (r.plagarismScore || 0) > 20).length;
    const totalClean = results.filter(r => (r.plagarismScore || 0) <= 20).length;

    return {
        avgPlagiarismScore,
        avgAiScore,
        totalPlagiarized,
        totalClean,
        totalProcessed: results.length,
        failedItems: batch.items.filter(i => i.status === 'failed').length,
    };
};

/**
 * Get user's batch history
 */
const getUserBatches = (userId) => {
    const userBatches = [];
    for (const [id, batch] of batches) {
        if (batch.userId === userId.toString()) {
            // Return minimal info for list view
            userBatches.push({
                id: batch.id,
                status: batch.status,
                totalItems: batch.totalItems,
                processedItems: batch.processedItems,
                createdAt: batch.createdAt,
                completedAt: batch.completedAt,
                summary: batch.summary,
            });
        }
    }
    return userBatches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Delete a batch
 */
const deleteBatch = (batchId) => {
    return batches.delete(batchId);
};

/**
 * Get batch progress (for polling)
 */
const getBatchProgress = (batchId) => {
    const batch = batches.get(batchId);
    if (!batch) return null;

    return {
        id: batch.id,
        status: batch.status,
        progress: Math.round((batch.processedItems / batch.totalItems) * 100),
        processedItems: batch.processedItems,
        totalItems: batch.totalItems,
        summary: batch.summary,
    };
};

module.exports = {
    createBatch,
    getBatch,
    updateBatchItem,
    startBatchProcessing,
    generateBatchSummary,
    getUserBatches,
    deleteBatch,
    getBatchProgress,
};

const History = require('../models/History');
const { rewriteText } = require('../services/ai/rewriteService');

exports.rewriteContent = async (req, res) => {
    try {
        const { text, historyId } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const rewritten = await rewriteText(text);

        // If historyId is provided, update the record
        if (historyId) {
            await History.findByIdAndUpdate(historyId, { rewrittenText: rewritten });
        }

        res.json({
            rewrittenText: rewritten,
            rewriteScore: 95, // Mock score for "human-like" quality
        });

    } catch (error) {
        console.error('Error rewriting content:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

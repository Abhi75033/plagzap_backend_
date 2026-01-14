const History = require('../models/History');

/**
 * Save AI Writer content to history
 * POST /api/writer/save-to-history
 */
exports.saveToHistory = async (req, res) => {
    try {
        const {
            originalText,  // The generated content
            mode,          // blog/research/academic/professional
            aiRiskBefore,  // Optional: AI detection before refinement
            aiRiskAfter,   // Optional: AI detection after refinement
            refinements    // Optional: array of refinement actions applied
        } = req.body;

        if (!originalText) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const user = req.user; // From auth middleware

        // Calculate a basic "score" - for writer, we can use AI risk if available
        const overallScore = aiRiskAfter || aiRiskBefore || 0;

        // Create history entry
        const historyEntry = new History({
            userId: user._id,
            originalText,
            highlights: [], // No highlights for writer content
            overallScore,
            mode: mode || null,
            aiRiskBefore: aiRiskBefore || null,
            aiRiskAfter: aiRiskAfter || null,
            refinements: refinements || [],
        });

        await historyEntry.save();

        res.json({
            success: true,
            id: historyEntry._id,
            message: 'Saved to history'
        });

    } catch (error) {
        console.error('Save to history error:', error);
        res.status(500).json({ error: 'Failed to save to history' });
    }
};

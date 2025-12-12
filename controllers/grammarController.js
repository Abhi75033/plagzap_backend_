const { checkGrammar, applyCorrections } = require('../services/ai/grammarService');

/**
 * Check grammar and style for given text
 */
exports.checkGrammarAndStyle = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (text.length > 10000) {
            return res.status(400).json({ error: 'Text too long. Maximum 10,000 characters.' });
        }

        console.log(`Grammar check for user: ${req.user._id}, Length: ${text.length}`);

        const result = await checkGrammar(text);

        res.json({
            score: result.score,
            issues: result.issues,
            summary: result.summary,
            issueCount: {
                grammar: result.issues.filter(i => i.type === 'grammar').length,
                spelling: result.issues.filter(i => i.type === 'spelling').length,
                style: result.issues.filter(i => i.type === 'style').length,
                clarity: result.issues.filter(i => i.type === 'clarity').length,
            }
        });

    } catch (error) {
        console.error('Grammar check error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Apply selected corrections to text
 */
exports.applyGrammarFixes = async (req, res) => {
    try {
        const { text, issues } = req.body;

        if (!text || !issues) {
            return res.status(400).json({ error: 'Text and issues are required' });
        }

        const correctedText = applyCorrections(text, issues);

        res.json({
            correctedText,
            appliedCount: issues.length
        });

    } catch (error) {
        console.error('Apply fixes error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

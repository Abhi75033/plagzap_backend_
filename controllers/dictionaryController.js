const { runGeminiDictionary } = require('../services/ai/rewriteService');

exports.lookupDictionary = async (req, res) => {
    try {
        const { text, targetLang } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required for lookup.' });
        }

        const result = await runGeminiDictionary(text, targetLang);

        // Ensure result is parsed JSON if possible, otherwise wrap it
        let finalResult = result;
        if (typeof result === 'string') {
            try {
                finalResult = JSON.parse(result);
            } catch (e) {
                // If it's string, just return as definition type generic
                finalResult = { type: 'definition', definition: result, word: text };
            }
        }

        res.json(finalResult);

    } catch (error) {
        console.error('Dictionary Lookup Error:', error);
        res.status(500).json({ error: 'Failed to lookup definition/translation.' });
    }
};

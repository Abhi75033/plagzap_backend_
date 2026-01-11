const { scrapeUrl } = require('../services/scraperService');

exports.extractUrl = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const result = await scrapeUrl(url);

        if (!result.text || result.text.length < 50) {
            return res.status(400).json({ error: 'Could not extract enough text from this URL. Please verify the URL or try copying the text manually.' });
        }

        res.json({
            success: true,
            title: result.title,
            text: result.text
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

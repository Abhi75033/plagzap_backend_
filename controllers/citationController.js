const { generateCitation, extractMetadataFromUrl } = require('../services/citationService');

/**
 * Generate citation from URL or manual data
 */
exports.createCitation = async (req, res) => {
    try {
        const { url, format, manualData } = req.body;

        if (!url && !manualData) {
            return res.status(400).json({ error: 'URL or manual data is required' });
        }

        const validFormats = ['APA', 'MLA', 'CHICAGO'];
        const selectedFormat = format && validFormats.includes(format.toUpperCase())
            ? format.toUpperCase()
            : 'APA';

        let result;
        if (url) {
            result = await generateCitation(url, selectedFormat);
        } else {
            result = await generateCitation(manualData, selectedFormat);
        }

        res.json(result);

    } catch (error) {
        console.error('Citation generation error:', error);
        res.status(500).json({ error: 'Failed to generate citation' });
    }
};

/**
 * Get all citation formats for a URL
 */
exports.getAllFormats = async (req, res) => {
    try {
        const { url, manualData } = req.body;

        if (!url && !manualData) {
            return res.status(400).json({ error: 'URL or manual data is required' });
        }

        const input = url || manualData;

        const [apa, mla, chicago] = await Promise.all([
            generateCitation(input, 'APA'),
            generateCitation(input, 'MLA'),
            generateCitation(input, 'CHICAGO')
        ]);

        res.json({
            APA: apa.citation,
            MLA: mla.citation,
            Chicago: chicago.citation,
            metadata: apa.metadata
        });

    } catch (error) {
        console.error('Citation generation error:', error);
        res.status(500).json({ error: 'Failed to generate citations' });
    }
};

/**
 * Extract metadata from URL (for preview before generating)
 */
exports.extractMetadata = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const metadata = await extractMetadataFromUrl(url);
        res.json(metadata);

    } catch (error) {
        console.error('Metadata extraction error:', error);
        res.status(500).json({ error: 'Failed to extract metadata' });
    }
};

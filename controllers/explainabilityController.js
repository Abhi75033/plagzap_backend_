const axios = require('axios');

/**
 * Split text into sentences
 */
const splitIntoSentences = (text) => {
    // Simple sentence splitting (can be enhanced with NLP library)
    return text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
};

/**
 * Analyze a single sentence for AI detection and generate explanation
 */
const analyzeAndExplain = async (sentence) => {
    try {
        const prompt = `Analyze this sentence for AI-generated content and explain why:

Sentence: "${sentence}"

Provide:
1. AI Detection Score (0-100, where 100 is definitely AI)
2. Explanation: Why might this be flagged as AI? What patterns does it have?
3. Human-like traits: What makes it seem human-like (if any)?
4. Suggestions: How to make it more human-like?

Format as JSON:
{
  "aiScore": <number>,
  "explanation": "<string>",
  "humanTraits": "<string>",
  "suggestions": "<string>"
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }
        );

        const result = response.data.candidates[0].content.parts[0].text;

        // Extract JSON from response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            return {
                sentence,
                aiScore: analysis.aiScore || 0,
                explanation: analysis.explanation || 'No explanation available',
                humanTraits: analysis.humanTraits || 'None identified',
                suggestions: analysis.suggestions || 'No suggestions'
            };
        }

        // Fallback if JSON parsing fails
        return {
            sentence,
            aiScore: 50,
            explanation: result,
            humanTraits: 'Analysis in progress',
            suggestions: 'Refine for clarity'
        };

    } catch (error) {
        console.error('Sentence analysis error:', error.message);
        return {
            sentence,
            aiScore: 0,
            explanation: 'Unable to analyze',
            humanTraits: 'Unknown',
            suggestions: 'Try again'
        };
    }
};

/**
 * Main explainability endpoint
 * Analyzes text sentence-by-sentence with AI detection explanations
 */
exports.explainSentences = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Split into sentences
        const sentences = splitIntoSentences(text);

        if (sentences.length === 0) {
            return res.status(400).json({ error: 'No valid sentences found' });
        }

        // Limit for performance (analyze max 20 sentences at once)
        const sentencesToAnalyze = sentences.slice(0, 20);

        console.log(`Analyzing ${sentencesToAnalyze.length} sentences...`);

        // Analyze each sentence with slight delay to avoid rate limiting
        const explanations = [];
        for (let i = 0; i < sentencesToAnalyze.length; i++) {
            const result = await analyzeAndExplain(sentencesToAnalyze[i]);
            explanations.push(result);

            // Small delay between requests
            if (i < sentencesToAnalyze.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // Calculate overall AI score
        const overallAiScore = explanations.length > 0
            ? Math.round(explanations.reduce((sum, e) => sum + e.aiScore, 0) / explanations.length)
            : 0;

        res.json({
            overallAiScore,
            totalSentences: sentences.length,
            analyzedSentences: explanations.length,
            explanations
        });

    } catch (error) {
        console.error('Explainability error:', error);
        res.status(500).json({ error: 'Failed to analyze text' });
    }
};

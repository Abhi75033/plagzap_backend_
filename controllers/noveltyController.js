const axios = require('axios');

/**
 * Analyze text for novelty and research gaps
 * POST /api/novelty/analyze
 */
exports.analyzeNovelty = async (req, res) => {
    try {
        const { text, topic } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const prompt = `You are an academic research advisor analyzing text for novelty and research gaps.

Text to analyze:
"""
${text}
"""

${topic ? `Research Topic: ${topic}` : ''}

Analyze this text and provide:

1. NOVELTY SCORE (0-100):
   - 0-30: Highly derivative, mostly existing ideas
   - 31-60: Some novel elements, mostly builds on existing work
   - 61-85: Moderately novel, fresh perspectives on known topics
   - 86-100: Highly novel, original contributions

2. KEY CONCEPTS (3-5):
   - Main ideas and themes in the text

3. RESEARCH GAPS (2-4):
   - Areas not adequately covered
   - Questions left unanswered
   - Missing perspectives

4. UNEXPLORED ANGLES (3-5):
   - Novel approaches the author could take
   - Unique perspectives not yet addressed
   - Interdisciplinary connections

5. STRENGTHS (2-3):
   - Original elements in current text
   - Unique contributions

6. RECOMMENDATIONS (2-3):
   - How to increase novelty
   - Ways to address gaps

Return as JSON:
{
  "noveltyScore": 0-100,
  "noveltyLevel": "Low/Moderate/High/Very High",
  "keyConcepts": ["concept1", "concept2"],
  "researchGaps": [
    { "gap": "description", "importance": "Critical/Moderate/Minor" }
  ],
  "unexploredAngles": [
    { "angle": "description", "potential": "High/Medium/Low" }
  ],
  "strengths": ["strength1", "strength2"],
  "recommendations": ["rec1", "rec2"]
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.5,
                    responseMimeType: "application/json"
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const analysis = JSON.parse(response.data.candidates[0].content.parts[0].text);

        res.json({ analysis });
    } catch (error) {
        console.error('Novelty analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze novelty' });
    }
};

const axios = require('axios');

/**
 * SUPERVISOR FEEDBACK CONTROLLER
 * Provides academic supervisor-style feedback with comprehensive analysis
 */
exports.getSupervisorFeedback = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const prompt = `You are an experienced academic supervisor reviewing student work.

Analyze this text comprehensively:
"""
${text}
"""

Provide detailed feedback in these categories:

1. STRUCTURE & ORGANIZATION
   - Logical flow
   - Paragraph structure
   - Transitions

2. ARGUMENT & ANALYSIS
   - Thesis clarity
   - Evidence quality
   - Critical thinking
   - Depth of analysis

3. ACADEMIC QUALITY
   - Citation usage (if any)
   - Academic tone
   - Terminology
   - Precision

4. STRENGTHS
   - What works well
   - Notable aspects

5. AREAS FOR IMPROVEMENT
   - Critical issues
   - Moderate concerns
   - Minor suggestions

6. QUESTIONS FOR STUDENT
   - Clarifications needed
   - Extensions to consider

For each improvement, indicate severity: CRITICAL, MODERATE, or MINOR.

Return JSON:
{
  "overallGrade": "First/Upper Second/Lower Second/Third/Fail",
  "structure": {
    "score": 1-10,
    "comments": ["comment1", "comment2"],
    "severity": "CRITICAL/MODERATE/MINOR"
  },
  "argument": {
    "score": 1-10,
    "comments": ["comment1", "comment2"],
    "severity": "CRITICAL/MODERATE/MINOR"
  },
  "academicQuality": {
    "score": 1-10,
    "comments": ["comment1", "comment2"],
    "severity": "CRITICAL/MODERATE/MINOR"
  },
  "strengths": ["strength1", "strength2"],
  "improvements": [
    { "text": "improvement text", "severity": "CRITICAL/MODERATE/MINOR" }
  ],
  "questionsForStudent": ["question1", "question2"]
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    responseMimeType: "application/json"
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const feedback = JSON.parse(response.data.candidates[0].content.parts[0].text);

        res.json({ feedback });
    } catch (error) {
        console.error('Supervisor feedback error:', error);
        res.status(500).json({ error: 'Failed to generate supervisor feedback' });
    }
};

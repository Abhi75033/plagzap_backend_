const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * GRAMMAR & STYLE CHECKING SERVICE
 * 
 * Uses Gemini AI to analyze text for:
 * - Grammar errors
 * - Spelling mistakes
 * - Style improvements
 * - Readability suggestions
 */

const checkGrammar = async (text) => {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.3,
                topP: 0.9,
            }
        });

        const prompt = `You are a professional editor. Analyze this text for grammar, spelling, and style issues.

For each issue found, provide:
1. The original text (exact quote)
2. The corrected version
3. The type: "grammar", "spelling", "style", or "clarity"
4. A brief explanation

Also provide an overall score from 0-100 (100 = perfect).

TEXT TO ANALYZE:
"${text}"

Respond with ONLY valid JSON in this exact format:
{
  "score": <number 0-100>,
  "issues": [
    {
      "original": "<exact text with issue>",
      "corrected": "<corrected text>",
      "type": "<grammar|spelling|style|clarity>",
      "explanation": "<brief explanation>"
    }
  ],
  "summary": "<1-2 sentence overall assessment>"
}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                score: Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
                issues: parsed.issues || [],
                summary: parsed.summary || "Analysis complete."
            };
        }

        throw new Error('Invalid response format');

    } catch (error) {
        console.error('Grammar check error:', error.message);
        return {
            score: 0,
            issues: [],
            summary: "Unable to analyze. Please try again."
        };
    }
};

/**
 * Apply corrections to text
 */
const applyCorrections = (text, issues) => {
    let correctedText = text;

    // Sort by length descending to avoid overlapping replacements
    const sortedIssues = [...issues].sort((a, b) =>
        b.original.length - a.original.length
    );

    for (const issue of sortedIssues) {
        if (issue.original && issue.corrected) {
            correctedText = correctedText.replace(issue.original, issue.corrected);
        }
    }

    return correctedText;
};

module.exports = { checkGrammar, applyCorrections };

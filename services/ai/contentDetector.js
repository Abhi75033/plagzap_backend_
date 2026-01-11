const { GoogleGenerativeAI } = require('@google/generative-ai');

// Lazy initialization to prevent blocking server startup
let genAI = null;
const getGenAI = () => {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is missing from environment variables!");
            throw new Error("GEMINI_API_KEY not found");
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
};

/**
 * AI Content Detector - Provides REAL AI detection scores
 * 
 * This detector analyzes text to determine if it was written by AI.
 * Returns a score from 0-100 indicating likelihood of AI authorship.
 */

const AI_DETECTION_PROMPT = `You are an AI content detector. Analyze the following text to determine if it was written by AI (like ChatGPT, Claude, Gemini) or by a human.

SCORING GUIDELINES:
- 0-20%: Clearly human-written (personal voice, imperfections, unique style)
- 20-40%: Probably human (some AI-like patterns but mostly human)
- 40-60%: Mixed/Uncertain (could be either)
- 60-80%: Probably AI (formal, structured, AI patterns)
- 80-100%: Clearly AI-written (perfect grammar, generic explanations, no personality)

AI INDICATORS (increase score):
- Perfect grammar and punctuation
- Repetitive sentence structures
- Generic, encyclopedic explanations
- Overuse of transition words (Furthermore, Moreover, Additionally)
- Lack of personal opinions or emotions
- Lists with consistent formatting
- Overly balanced viewpoints

HUMAN INDICATORS (decrease score):
- Contractions (don't, can't, won't)
- Personal opinions and experiences
- Conversational tone
- Minor grammatical imperfections
- Informal language or slang
- Emotional expressions
- Inconsistent formatting

Text to analyze:
"`;

/**
 * Heuristic-based AI detection fallback
 * This provides more realistic and varied scores when the API is unavailable
 */
const heuristicDetection = (text) => {
    let score = 50; // Start at neutral
    const reasons = [];

    // AI indicators (increase score)
    const aiPatterns = [
        { pattern: /\bFurthermore\b/gi, weight: 8, name: 'transition words' },
        { pattern: /\bMoreover\b/gi, weight: 8, name: 'transition words' },
        { pattern: /\bAdditionally\b/gi, weight: 6, name: 'transition words' },
        { pattern: /\bIn conclusion\b/gi, weight: 10, name: 'formal conclusions' },
        { pattern: /\bIt is important to note\b/gi, weight: 12, name: 'formal phrases' },
        { pattern: /\bIt is worth mentioning\b/gi, weight: 10, name: 'formal phrases' },
        { pattern: /\bOne might argue\b/gi, weight: 8, name: 'academic tone' },
        { pattern: /\bThis suggests that\b/gi, weight: 6, name: 'analytical language' },
        { pattern: /\bIn order to\b/gi, weight: 4, name: 'verbose phrasing' },
        { pattern: /\bDue to the fact that\b/gi, weight: 6, name: 'verbose phrasing' },
        { pattern: /\bIt should be noted\b/gi, weight: 8, name: 'formal phrases' },
        { pattern: /\bAs mentioned earlier\b/gi, weight: 6, name: 'structured references' },
    ];

    // Human indicators (decrease score)
    const humanPatterns = [
        { pattern: /\bI think\b/gi, weight: -8, name: 'personal opinion' },
        { pattern: /\bI feel\b/gi, weight: -8, name: 'personal opinion' },
        { pattern: /\bhonestly\b/gi, weight: -10, name: 'conversational tone' },
        { pattern: /\bto be fair\b/gi, weight: -8, name: 'conversational tone' },
        { pattern: /\bactually\b/gi, weight: -4, name: 'casual language' },
        { pattern: /\bdon't\b/gi, weight: -3, name: 'contractions' },
        { pattern: /\bcan't\b/gi, weight: -3, name: 'contractions' },
        { pattern: /\bwon't\b/gi, weight: -3, name: 'contractions' },
        { pattern: /\bit's\b/gi, weight: -2, name: 'contractions' },
        { pattern: /\bthat's\b/gi, weight: -2, name: 'contractions' },
        { pattern: /\bI'm\b/gi, weight: -4, name: 'contractions' },
        { pattern: /\bkinda\b/gi, weight: -10, name: 'slang' },
        { pattern: /\bgonna\b/gi, weight: -10, name: 'slang' },
        { pattern: /\bwanna\b/gi, weight: -10, name: 'slang' },
        { pattern: /\blol\b/gi, weight: -15, name: 'internet speak' },
        { pattern: /\bhaha\b/gi, weight: -12, name: 'laughter' },
        { pattern: /!{2,}/g, weight: -8, name: 'exclamation marks' },
        { pattern: /\.\.\./g, weight: -5, name: 'ellipsis' },
    ];

    // Check AI patterns
    for (const { pattern, weight, name } of aiPatterns) {
        const matches = (text.match(pattern) || []).length;
        if (matches > 0) {
            score += weight * Math.min(matches, 3); // Cap at 3 matches
            if (matches > 0 && !reasons.includes(name)) reasons.push(name);
        }
    }

    // Check human patterns
    for (const { pattern, weight, name } of humanPatterns) {
        const matches = (text.match(pattern) || []).length;
        if (matches > 0) {
            score += weight * Math.min(matches, 3);
        }
    }

    // Check sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
        // Check for similar sentence lengths (AI tends to be uniform)
        const lengths = sentences.map(s => s.trim().split(/\s+/).length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

        if (variance < 15) {
            score += 10; // Very uniform = likely AI
        } else if (variance > 50) {
            score -= 8; // High variance = likely human
        }
    }

    // Check for bullet points or numbered lists
    const hasList = /^\s*[-•*]\s+/m.test(text) || /^\s*\d+\.\s+/m.test(text);
    if (hasList) {
        score += 5; // Lists are common in AI content
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Generate reason
    let reason;
    if (score >= 70) {
        reason = `High AI probability: ${reasons.slice(0, 2).join(', ') || 'formal writing style'}`;
    } else if (score >= 40) {
        reason = 'Mixed indicators: could be AI-assisted or human';
    } else {
        reason = 'Low AI probability: conversational and personal tone detected';
    }

    return { score, reason, language: 'English' };
};

const detectAI = async (text) => {
    console.log('🔍 Starting AI detection for text length:', text.length);

    // Try multiple model names (Gemini models change frequently)
    const modelNames = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro',
        'models/gemini-pro',
        'models/gemini-1.5-flash'
    ];

    for (const modelName of modelNames) {
        try {
            console.log(`  Trying model: ${modelName}`);
            // Ensure client is initialized
            const aiClient = getGenAI();
            const model = aiClient.getGenerativeModel({ model: modelName });

            const prompt = AI_DETECTION_PROMPT + `${text.substring(0, 3000)}"

Respond with ONLY valid JSON in this exact format:
{"score": <number 0-100>, "reason": "<brief explanation>", "language": "<detected language>"}`;

            const result = await model.generateContent(prompt);
            const response = result.response.text().trim();

            console.log('📝 AI Detection raw response:', response.substring(0, 200));

            // Parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log(`✅ AI Detection complete with ${modelName}:`, parsed.score);
                return {
                    score: Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
                    reason: parsed.reason || "Analysis complete",
                    language: parsed.language || "English"
                };
            }

            throw new Error('Invalid response format from model');

        } catch (error) {
            console.log(`  Model ${modelName} failed: ${error.message.substring(0, 80)}`);
            continue; // Try next model
        }
    }

    // All models failed, use heuristic fallback
    console.warn('⚠️ All Gemini models failed, using heuristic detection');
    return heuristicDetection(text);
};

module.exports = { detectAI };

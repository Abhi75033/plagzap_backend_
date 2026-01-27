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

const AI_DETECTION_PROMPT = `You are an expert AI Forensic Analyst. Your task is to determine if the following text was written by an AI (like ChatGPT, Claude, Gemini) or a Human.

Use this Chain-of-Thought process:
1.  **Vocabulary Analysis**: Scan for "AI-isms" (e.g., "delve", "tapestry", "underscore", "crucial", "landscape", "fostering"). High frequency of these increases AI likelihood.
2.  **Structure Analysis**: Check for "Burstiness". Humans vary sentence length drastically (e.g., a 40-word sentence followed by a 4-word one). AI is often monotonous and uniform.
3.  **Tone Analysis**: Look for "Robotic Neutrality". AI avoids strong opinions or raw emotion. Humans use slang, idioms, and subjective qualifiers ("I hate when...", "It's super weird that...").
4.  **Formatting**: Perfectly structured lists and "In conclusion" headers are strong AI indicators.

SCORING GUIDELINES (0-100% AI Probability):
- **0-10%**: DEFINITELY HUMAN. (Typos, slang, deep personal context, messy structure).
- **11-30%**: LIKELY HUMAN. (Professional tone but with human nuance/irregularity).
- **31-59%**: UNCERTAIN / MIXED. (Could be AI-edited human text).
- **60-89%**: LIKELY AI. (Standard ChatGPT style, repetitive, generic).
- **90-100%**: DEFINITELY AI. (Robotic, "As an AI language model", perfect lists).

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
        { pattern: /\bFurthermore\b/gi, weight: 6, name: 'transition words' },
        { pattern: /\bMoreover\b/gi, weight: 6, name: 'transition words' },
        { pattern: /\bIn conclusion\b/gi, weight: 8, name: 'formal conclusions' },
        { pattern: /\bIt is important to note\b/gi, weight: 10, name: 'robotic phrasing' },
        { pattern: /\bIt is worth mentioning\b/gi, weight: 8, name: 'robotic phrasing' },
        { pattern: /\bdelve\b/gi, weight: 15, name: 'AI-specific vocabulary' },
        { pattern: /\btapestry\b/gi, weight: 15, name: 'AI-specific vocabulary' },
        { pattern: /\bunderscore\b/gi, weight: 10, name: 'AI-specific vocabulary' },
        { pattern: /\bfostering\b/gi, weight: 8, name: 'AI-specific vocabulary' },
        { pattern: /\bnuance\b/gi, weight: 5, name: 'common AI word' },
    ];

    // Human indicators (decrease score)
    const humanPatterns = [
        { pattern: /\bI think\b/gi, weight: -10, name: 'personal opinion' },
        { pattern: /\bI feel\b/gi, weight: -10, name: 'personal opinion' },
        { pattern: /\bhonestly\b/gi, weight: -12, name: 'conversational tone' },
        { pattern: /\bactually\b/gi, weight: -8, name: 'casual language' },
        { pattern: /\bdon't\b/gi, weight: -4, name: 'contractions' },
        { pattern: /\bcan't\b/gi, weight: -4, name: 'contractions' },
        { pattern: /\bit's\b/gi, weight: -4, name: 'contractions' },
        { pattern: /\bkinda\b/gi, weight: -15, name: 'slang' },
        { pattern: /\bgonna\b/gi, weight: -15, name: 'slang' },
        { pattern: /\bwhatever\b/gi, weight: -10, name: 'dismissive tone' },
        { pattern: /\bstuff\b/gi, weight: -8, name: 'vague language' },
        { pattern: /!{2,}/g, weight: -10, name: 'emotional punctuation' },
        { pattern: /\.\.\./g, weight: -5, name: 'trailing thought' },
    ];

    // Check AI patterns
    for (const { pattern, weight, name } of aiPatterns) {
        const matches = (text.match(pattern) || []).length;
        if (matches > 0) {
            score += weight * matches; // allow stacking
            if (!reasons.includes(name)) reasons.push(name);
        }
    }

    // Check human patterns
    for (const { pattern, weight, name } of humanPatterns) {
        const matches = (text.match(pattern) || []).length;
        if (matches > 0) {
            score += weight * matches;
            // Human markers reduce score drastically
        }
    }

    // Check sentence structure (Burstiness Proxy)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
        const lengths = sentences.map(s => s.trim().split(/\s+/).length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

        // High variance in sentence length is VERY human
        if (variance > 100) {
            score -= 15;
        } else if (variance < 10) {
            score += 15; // Robotic uniformity
            reasons.push('uniform sentence structure');
        }
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Generate reason
    let reason;
    if (score >= 70) {
        reason = `High AI probability: ${reasons.slice(0, 2).join(', ') || 'robotic structure & vocabulary'}`;
    } else if (score >= 35) {
        reason = 'Mixed indicators: formal style but lacks strong human voice';
    } else {
        reason = 'Low AI probability: high structural variance & natural tone';
    }

    return { score, reason, language: 'English' };
};

const detectAI = async (text) => {
    console.log('🔍 Starting AI detection for text length:', text.length);

    // Try multiple model names (Gemini models change frequently)
    const modelNames = [
        'gemini-2.0-flash-exp',
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

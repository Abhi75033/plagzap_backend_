const { GoogleGenerativeAI } = require('@google/generative-ai');
const { detectAI } = require('./contentDetector');

// Initialize AI clients
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * UTILITY: getGenAI
 */
function getGenAI() {
    if (!process.env.GEMINI_API_KEY) return null;
    return genAI;
}

// Helper for formatted logging
const logStage = (stage, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${stage} ${message}`);
    if (data) {
        if (typeof data === 'object') {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(`   └─ ${data}`);
        }
    }
};

// --- STAGE 1: PREPROCESS ---
function preprocessText(text) {
    logStage("➡️ [Stage 1]", "Preprocess (AI Markers, Normalization)...");
    logStage("   ℹ️", `Input Length: ${text.length} chars`);

    let processed = text
        .replace(/["']/g, '"')
        .replace(/\*\*.*?\*\*/g, "")
        .replace(/###/g, "")
        .replace(/([.!?])\s+(?=[A-Z])/g, "$1\n");

    const result = processed.trim();
    logStage("   ✅", `Preprocess Complete. New Length: ${result.length} chars`);
    return result;
}

// --- STAGE 2: GEMINI CHAOS START (Break Consistency) ---
async function runGeminiSoften(text) {
    logStage("➡️ [Stage 2]", "Gemini 2.0 Flash → Chaos Mode (Entropy Injection)...");

    const prompt = `
    ROLE: "The Lazy Texter".
    TASK: Rewrite this text. Do NOT try to be smart. Do NOT try to be professional.

    STRATEGY (MAX CHAOS):
    1.  **Dumb Down**: Use the simplest words possible. Ban 4-syllable words.
        -   Instead of "utilize", use "use".
        -   Instead of "however", use "but".
    2.  **Lazy Grammar**: It is okay to have run-on sentences. It is okay to skip a comma. Make it look like a human typed it fast.
    3.  **Variable Flow**: Write one huge sentence. Then a tiny one. Disconnect thoughts slightly.
    4.  **No AI polish**: If it looks perfect, it is wrong. Make it look "rough".

    STRICT OUTPUT FORMAT:
    Return valid JSON only: { "rewritten_text": "YOUR REWRITTEN TEXT HERE" }

    TEXT:
    "${text}"
    `;

    // High temperature for unpredictability
    const result = await runGeminiRewrite(text, prompt, 1.3);
    logStage("   ✅", "Chaos Mode Complete");
    return result;
}

// --- STAGE 3: GEMINI PRO REWRITE (The Destroyer) ---
async function runDeepRewrite(text, customPrompt = null) {
    logStage("➡️ [Stage 3]", "Gemini 2.0 Flash → Deep Rewrite (Chaos Mode)...");

    const defaultPrompt = `
    ROLE: Tired Human Writer.
    TASK: Rewrite this text so it passes as a human draft.

    RULES FOR BYPASSING DETECTION:
    1.  **High Perplexity**: Be unpredictable. Jump between ideas abruptly.
    2.  **Imperfect Grammar**:
        -   Start sentences with lowercase letters occasionally if it fits the "vibe".
        -   Use fragments. "Seriously." "Just like that."
    3.  **Vocabulary Ban**:
        -   NEVER use: "Furthermore", "Thus", "Therefore", "In conclusion", "Crucially".
        -   NEVER use complex metaphors "Tapestry", "Landscape".
    4.  **Voice**: Sound bored or opinionated. "Honestly, I think..." or "Whatever, point is..."

    STRICT OUTPUT FORMAT:
    Return valid JSON only: { "rewritten_text": "YOUR REWRITTEN TEXT HERE" }

    INPUT TEXT:
    "${text}"
    `;

    const finalPrompt = customPrompt || defaultPrompt;

    // MAXIMUM ENTROPY TEMPERATURE
    const result = await runGeminiRewrite(text, finalPrompt, 1.6);
    logStage("   ✅", "Deep Rewrite Complete");
    return result;
}

// --- REWRITE FLAGGED SENTENCES (Gemini Aggressive) ---
async function rewriteSpecificFlaggedParts(text, reason = "AI Detection") {
    logStage("➡️ [Loop]", `🔥 Gemini → Aggressive Rewrite (Reason: ${reason})...`);

    const aggressivePrompt = `
    ROLE: Anti-AI Saboteur.
    TASK: The text was flagged. Ruin the "AI Structure".

    STRATEGY:
    1.  **Delete & Simplfy**: Cut 30% of the words. Be blunt.
    2.  **Add Noise**: Add a random personal opinion. "I hate when that happens."
    3.  **Break Syntax**: Use a dash - or just stop a sentence mid-thought and start another.

    STRICT OUTPUT FORMAT:
    Return valid JSON only: { "rewritten_text": "YOUR REWRITTEN TEXT HERE" }

    CONTEXT:
    "${text}"
    `;

    return runGeminiRewrite(text, aggressivePrompt, 1.7);
}

// Helper generic Gemini
async function runGeminiRewrite(text, promptText, temp = 0.9) {
    const gen = getGenAI();
    if (!gen) {
        logStage("❌", "Gemini API Key missing.");
        return text;
    }
    try {
        const startTime = Date.now();
        const model = gen.getGenerativeModel({
            model: "gemini-2.0-flash", // Using the fast, new model
            generationConfig: {
                temperature: temp,
                topP: 0.95,
                topK: 40,
                responseMimeType: "application/json" // Force JSON
            }
        });
        const fullPrompt = `${promptText}\n\nTEXT TO REWRITE:\n"${text}"`;
        const result = await model.generateContent(fullPrompt);

        const rawText = result.response.text().trim();
        const duration = Date.now() - startTime;

        logStage("   ⚡", `Gemini Generation took ${duration}ms`);

        // Parse JSON output
        try {
            const parsed = JSON.parse(rawText);
            return parsed.rewritten_text || rawText; // Fallback if key missing
        } catch (parseError) {
            logStage("   ⚠️", "JSON Parse Failed, returning raw text", parseError.message);
            // Fallback cleanup if JSON fails (rare with responseMimeType)
            return rawText.replace(/```json|```/g, "").trim();
        }

    } catch (e) {
        logStage("   ❌", "Gemini Rewrite Failed", e.message);
        return text;
    }
}

// --- STAGE 4: POST-PROCESS ---
function postProcess(text) {
    logStage("➡️ [Stage 4]", "Post-process (Cleaning)...");

    let cleanText = text;

    // 1. Remove Markdown (*bold*, _italic_)
    cleanText = cleanText.replace(/[*_]/g, '');

    // 2. Ensure clean spacing
    const finalResult = cleanText.replace(/\s+/g, ' ').trim();

    logStage("   ✅", "Post-processing complete");
    return finalResult;
}

// --- MAIN PIPELINE CONTROLLER ---
const rewriteText = async (initialText) => {
    logStage("\n🚀 STARTING PIPELINE", "(Gemini-Only Humanization)");
    logStage("ℹ️", `Initial Length: ${initialText.length} chars`);

    let currentText = initialText;

    try {
        // Step 1: Preprocess
        currentText = preprocessText(currentText);

        // Step 2: Humanize (Soften)
        currentText = await runGeminiSoften(currentText);

        // Step 3: Deep Rewrite (Casual/Personality)
        currentText = await runDeepRewrite(currentText);

        // Step 4: AI Score Loop
        let attempts = 0;
        const MAX_ATTEMPTS = 3; // Reduced slightly for speed since we trust Gemini more now

        while (attempts < MAX_ATTEMPTS) {
            logStage(`🔄 [Loop]`, `AI Score Check (Attempt ${attempts + 1}/${MAX_ATTEMPTS})...`);

            const detectionResult = await detectAI(currentText);
            const score = detectionResult.score;
            logStage("   📊", `Current AI Score: ${score}%`);

            // Strict < 20% rule
            if (score <= 20) {
                logStage("   ✅", "Score is safe (<20%). Exiting loop.");
                break;
            } else {
                if (attempts < MAX_ATTEMPTS - 1) {
                    logStage("   ⚠️", `Score > 20% (Detected). LOOPING BACK...`);
                    // Use higher randomness for the retry
                    currentText = await rewriteSpecificFlaggedParts(currentText, `High AI Score (${score}%)`);
                }
                attempts++;
            }
        }

        // Step 5: Post-process
        currentText = postProcess(currentText);

        logStage("🏁", "Final Output Ready");
        logStage("ℹ️", `Final Length: ${currentText.length} chars`);

        return currentText;

    } catch (error) {
        logStage("❌", "Pipeline Error", error);
        return initialText; // Fail safe
    }
};

// --- DICTIONARY & TRANSLATOR ---
async function runGeminiDictionary(text, targetLang = 'English') {
    logStage("➡️ [Dictionary]", `Lookup: "${text}" (Target: ${targetLang})`);

    const prompt = `
    ROLE: Smart Dictionary & Translator.
    TASK: Analyze the following text and user's target language preference. Decide whether to provide a DEFINITION (for vocab lookup) or a TRANSLATION (for phrases/sentences/language conversion).

    INPUT TEXT: "${text}"
    TARGET LANGUAGE: "${targetLang}"

    GUIDELINES:
    1. If the text is a sentence or common phrase (e.g., "Hello world", "How are you"), or if the user clearly wants to convert language (e.g., "Apple" -> "Spanish"), choose TRANSLATION.
    2. If the text is a single complex word (e.g., "Serendipity", "Ephemeral") and likely a definition lookup, choose DEFINITION.
    3. If unsure, and the Target Language is different from the Detect Language of the text, default to TRANSLATION.
    4. CRITICAL: ALWAYS identify the "detectedLanguage" of the input text accurately (e.g., "English", "Spanish", "French"). Do NOT use "Detected" or "Unknown" unless it is gibberish.

    OUTPUT FORMAT (JSON) - Choose ONE based on your decision:

    OPTION 1 (DEFINITION):
    {
        "type": "definition",
        "word": "${text}",
        "definition": "Clear definition.",
        "partOfSpeech": "noun/verb...",
        "etymology": "Origin...",
        "synonyms": ["syn1", "syn2"],
        "example": "Usage example."
    }

    OPTION 2 (TRANSLATION):
    {
        "type": "translation",
        "original": "${text}",
        "translated": "The translated text in ${targetLang}",
        "targetLanguage": "${targetLang}",
        "detectedLanguage": "The source language (e.g. English, French)"
    }

    Return ONLY valid JSON.
    `;

    const result = await runGeminiRewrite(text, prompt, 0.4); // Low temp for logic
    logStage("   ✅", `Dictionary Result (${result.type || 'Unknown'}) Ready`);
    return result;
}

module.exports = { rewriteText, runGeminiDictionary };

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
// --- STAGE 2: GEMINI CHAOS START (Conversation Mode) ---
async function runGeminiSoften(text) {
    logStage("➡️ [Stage 2]", "Gemini 2.0 Flash → Softening (Conversational Flow)...");

    const prompt = `
    ROLE: A Casual, Friendly Human.
    TASK: Read this text and retell it to a friend. 
    
    GOAL:
    -   Remove stiffness. 
    -   Make it flow naturally.
    -   Use contractions (it's, can't, won't).
    -   Don't worry about being "academic". Just get the ideas across clearly and simply.
    
    STRICT OUTPUT FORMAT:
    Return valid JSON only: { "rewritten_text": "YOUR REWRITTEN TEXT HERE" }

    TEXT:
    "${text}"
    `;

    // High temperature for unpredictability
    const result = await runGeminiRewrite(text, prompt, 1.1);
    logStage("   ✅", "Softening Complete");
    return result;
}

// --- STAGE 3: GEMINI PRO REWRITE (The Destroyer) ---
// --- STAGE 3: GEMINI PRO REWRITE (The Ghostwriter) ---
// --- STAGE 3: GEMINI PRO REWRITE (The Imperfect Human) ---
// --- STAGE 3: GEMINI PRO REWRITE (The Idiosyncratic Expert) ---
// --- STAGE 3: GEMINI PRO REWRITE (The Narrative Scrambler) ---
async function runDeepRewrite(text, customPrompt = null) {
    logStage("➡️ [Stage 3]", "Gemini 2.0 Flash → Deep Rewrite (Narrative Anti-Pattern Mode)...");

    const defaultPrompt = `
    ROLE: A Gonzo Journalist / Storyteller.
    TASK: Take the following information and RETELL it. Do not "rewrite" it sentence-by-sentence. That will fail.
    
    STRATEGY: "The Narrative Pivot"
    1.  **Destroy the Linear Flow**: Standard AI writes: "Topic -> Evidence -> Conclusion". YOU must write: "Observation -> Flashback -> Fact -> Question".
    2.  **Use "Spoken Word" Rhythm**:
        -   Start sentences with conjunctions ("And so...", "But here's the thing...").
        -   Use direct address ("Look at this.", "You get the idea.").
        -   Use breathless run-ons followed by single words. "Boom."
    3.  **Metaphor First**: Start with a visual image, not a definition.
        -   Don't say: "Algorithms are complex."
        -   Say: "It's like trying to untangle headphones in the dark."
    4.  **BANNED STRUCTURES**:
        -   NO "Firstly, Secondly, Finally".
        -   NO "In conclusion".
        -   NO "It is important to note".
        -   NO Balanced views ("On one hand..."). BE BIASED.

    STRICT OUTPUT FORMAT:
    Return valid JSON only: { "rewritten_text": "YOUR REWRITTEN TEXT HERE" }

    INPUT TEXT:
    "${text}"
    `;

    const finalPrompt = customPrompt || defaultPrompt;

    // Use Temperature 1.4 for High Perplexity (Must be unpredictable)
    const result = await runGeminiRewrite(text, finalPrompt, 1.4);
    logStage("   ✅", "Deep Rewrite Complete");
    return result;
}

// --- REWRITE FLAGGED SENTENCES (Gemini Aggressive) ---
// --- REWRITE FLAGGED SENTENCES (Gemini Clinical) ---
// --- REWRITE FLAGGED SENTENCES (Gemini Naturalizer) ---
// --- REWRITE FLAGGED SENTENCES (Gemini Logic Inverter) ---
// --- REWRITE FLAGGED SENTENCES (Gemini Deconstructor) ---
async function rewriteSpecificFlaggedParts(text, reason = "AI Detection") {
    logStage("➡️ [Loop]", `🔥 Gemini → Deconstruction Rewrite (Reason: ${reason})...`);

    const aggressivePrompt = `
    ROLE: "The Breaker".
    TASK: The text "flows" too well. It looks fake. Break the flow.

    TACTICS:
    1.  **Insert Interruptions**: Add a thought inside dashes -- like this -- right in the middle of a sentence.
    2.  **Kill the Passive Voice**: If something "is done", change it to "we did it".
    3.  **Use "Power Verbs"**: Swap "walked" for "stomped". Swap "said" for "shouted".
    4.  **The "So What?" Test**: After a fact, add a sentence explaining WHY it matters emotionally. "And that scares me."

    GOAL: Make the reader feel something. AIs don't feel.

    STRICT OUTPUT FORMAT:
    Return valid JSON only: { "rewritten_text": "YOUR REWRITTEN TEXT HERE" }

    CONTEXT:
    "${text}"
    `;

    return runGeminiRewrite(text, aggressivePrompt, 1.5);
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

// --- WRITER HUMANIZATION PIPELINE (High IQ, Low AI Score) ---
const humanizeWriterContent = async (text) => {
    logStage("\n🚀 WRITER PIPELINE", "Starting Advanced Humanization...");

    let currentText = text;

    try {
        // Step 1: Preprocess
        currentText = preprocessText(currentText);

        // Step 2: Deep Rewrite (Aggressive Anti-AI)
        // We skip "Soften" (Stage 2) to preserve the intellectual quality of the Writer's output
        currentText = await runDeepRewrite(currentText);

        // Step 3: AI Score Loop (The Safety Net)
        let attempts = 0;
        const MAX_ATTEMPTS = 3;

        while (attempts < MAX_ATTEMPTS) {
            logStage(`🔄 [Writer Loop]`, `Checking AI Score (Attempt ${attempts + 1})...`);

            try {
                const detectionResult = await detectAI(currentText);
                const score = detectionResult.score;
                logStage("   📊", `Current AI Score: ${score}%`);

                // SUPER STRICT: Must be < 10% as requested by user
                if (score <= 10) {
                    logStage("   ✅", "Score is perfect (<10%). Exiting.");
                    break;
                }

                // If flagged, use NUCLEAR option
                logStage("   ⚠️", `Score too high (${score}%). ENGAGING NUCLEAR REWRITE...`);
                currentText = await rewriteSpecificFlaggedParts(currentText, `High AI Score (${score}%)`);

            } catch (err) {
                console.error("AI Detection failed in loop, breaking...", err.message);
                break;
            }
            attempts++;
        }

        // Step 4: Post-process
        currentText = postProcess(currentText);
        return currentText;

    } catch (error) {
        logStage("❌", "Writer Pipeline Failed", error);
        return text; // Fallback to original
    }
};

module.exports = { rewriteText, runGeminiDictionary, humanizeContent: humanizeWriterContent };

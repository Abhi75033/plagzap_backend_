require('dotenv').config();
const { detectAI } = require('./services/ai/contentDetector');
const { rewriteText } = require('./services/ai/rewriteService');

// Samples
const AI_TEXT_SAMPLE = `In the rapidly evolving landscape of artificial intelligence, the integration of machine learning algorithms plays a pivotal role. It is important to note that these systems underscore the potential for transformative change. By fostering innovation across various sectors, AI serves as a testament to human ingenuity. Furthermore, the seamless synergy between data and computational power is paramount for future advancements.`;

const HUMAN_TEXT_SAMPLE = `Honestly, I think AI is kinda weird sometimes. Like, I was trying to get it to write a poem yesterday and it just spat out this generic garbage about "digital dreams" or whatever. It's super frustrating when you want something original and it gives you a textbook answer. But hey, at least it's fast, right?`;

const runTest = async () => {
    console.log("🚀 STARTING AI IMPROVEMENT VERIFICATION\n");

    // 1. TEST DETECTION ON RAW AI TEXT
    console.log("--- TEST 1: DETECTING OBVIOUS AI TEXT ---");
    console.log("Input:", AI_TEXT_SAMPLE.substring(0, 50) + "...");
    const aiResult = await detectAI(AI_TEXT_SAMPLE);
    console.log(`Result: Score ${aiResult.score}% | Reason: ${aiResult.reason}`);
    if (aiResult.score > 70) console.log("✅ PASS: Correctly identified as AI.");
    else console.log("❌ FAIL: Failed to identify AI.");

    // 2. TEST DETECTION ON HUMAN TEXT
    console.log("\n--- TEST 2: DETECTING HUMAN TEXT ---");
    console.log("Input:", HUMAN_TEXT_SAMPLE.substring(0, 50) + "...");
    const humanResult = await detectAI(HUMAN_TEXT_SAMPLE);
    console.log(`Result: Score ${humanResult.score}% | Reason: ${humanResult.reason}`);
    if (humanResult.score < 30) console.log("✅ PASS: Correctly identified as Human.");
    else console.log("❌ FAIL: False positive on Human text.");

    // 3. TEST HUMANIZATION (The "Undetectable" Test)
    console.log("\n--- TEST 3: HUMANIZING AI TEXT ---");
    console.log("Original AI Text Length:", AI_TEXT_SAMPLE.length);
    const humanized = await rewriteText(AI_TEXT_SAMPLE);
    console.log("Humanized Output:", humanized);

    console.log("\n...Checking Humanized Text against Detector...");
    const recheckResult = await detectAI(humanized);
    console.log(`Final Score: ${recheckResult.score}%`);

    if (recheckResult.score < 20) console.log("🎉 SUCCESS: Humanized text is undetectable!");
    else if (recheckResult.score < 50) console.log("⚠️ WARNING: Humanized text is ambiguous.");
    else console.log("❌ FAIL: Humanized text still detected as AI.");
};

runTest();

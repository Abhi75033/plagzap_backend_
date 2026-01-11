const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { runGeminiDictionary } = require('./services/ai/rewriteService');

async function runTests() {
    console.log("--- TEST 1: Word Definition ---");
    const res1 = await runGeminiDictionary('Serendipity', 'Spanish');
    // Even if target is Spanish, current logic ignores it for definitions?
    console.log(JSON.stringify(res1, null, 2));

    console.log("\n--- TEST 2: Short Phrase Translation (<30 chars) ---");
    const res2 = await runGeminiDictionary('Hello World', 'Spanish');
    console.log(JSON.stringify(res2, null, 2));

    console.log("\n--- TEST 3: Long Sentence Translation ---");
    const res3 = await runGeminiDictionary('The quick brown fox jumps over the lazy dog because it is very energetic today.', 'Spanish');
    console.log(JSON.stringify(res3, null, 2));
}

runTests();

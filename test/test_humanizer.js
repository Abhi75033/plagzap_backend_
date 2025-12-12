require('dotenv').config();
const { rewriteText } = require('../services/ai/rewriteService');

const sampleText1 = "The internet has become an inseparable part of our lives, almost like a physical extension of our bodies. We are constantly connected.";
const sampleText2 = "The speed at which news spreads online is incredibly fast, faster than traffic during peak hours.";

async function test() {
    console.log("--- Test 1: Phone Addiction (Avoiding 'limb' metaphor) ---");
    console.log("Original:", sampleText1);
    try {
        const result1 = await rewriteText(sampleText1);
        console.log("Rewritten:", result1);
    } catch (error) { console.error(error); }

    console.log("\n--- Test 2: Speed (Avoiding 'rush hour' metaphor) ---");
    console.log("Original:", sampleText2);
    try {
        const result2 = await rewriteText(sampleText2);
        console.log("Rewritten:", result2);
    } catch (error) { console.error(error); }
}

test();

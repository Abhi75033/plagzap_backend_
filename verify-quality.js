require('dotenv').config();
const { rewriteText } = require('./services/ai/rewriteService');

async function testQuality() {
    console.log("---------------------------------------------------");
    console.log("TEST: QUALITY CHECK");
    console.log("---------------------------------------------------");
    const originalText = "The rapid advancement of artificial intelligence has revolutionized various industries, from healthcare to finance. However, this progress raises ethical concerns regarding privacy and job displacement.";

    try {
        console.log("Original Text:\n", originalText);
        console.log("---------------------------------------------------");

        const rewritten = await rewriteText(originalText);

        console.log("Rewritten Text:\n", rewritten);
        console.log("---------------------------------------------------");

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

testQuality();

require('dotenv').config();
const { rewriteText } = require('./services/ai/rewriteService');

const sampleText = `Artificial intelligence is a rapidly growing field of computer science. It plays a significant role in our daily lives. From virtual assistants to recommendation algorithms, AI is everywhere. However, there are concerns about its impact on jobs and privacy. We must ensure that AI is developed responsibly. Deep learning models are becoming more complex and capable. Generative AI can create text, images, and even code with remarkable accuracy. This technological revolution brings both opportunities and challenges for society.`;

async function runTest() {
    console.log("=== STARTING REWRITE TEST ===");
    try {
        const result = await rewriteText(sampleText);
        console.log("\n=== FINAL RESULT ===");
        console.log(result);
        console.log("=== TEST COMPLETE ===");
    } catch (error) {
        console.error("TEST FAILED:", error);
    }
}

runTest();

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    console.log("Testing Gemini API...");
    try {
        // Just verify the API key by listing models
        // Note: The SDK might not expose listModels easily on the instance, 
        // usually it's a static or separate call.
        // Let's try to just use 'gemini-pro' again but with a different logic if needed.
        // Actually, let's try a very basic 'gemini-pro' verification.
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        console.log("Configuration:", { apiKey: process.env.GEMINI_API_KEY ? 'Present' : 'Missing' });

        const result = await model.generateContent("Test");
        console.log("Success:", result.response.text());
    } catch (error) {
        console.error("Gemini API Error:", error.message);
    }
}

testGemini();

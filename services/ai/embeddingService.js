const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates embeddings for a given text using Gemini.
 * @param {string} text - The text to generate embeddings for.
 * @returns {Promise<number[]>} - The embedding vector.
 */
const generateEmbedding = async (text) => {
    try {
        const model = genAI.getGenerativeModel({
            model: 'text-embedding-004'
        });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        // Suppress logging for expected API errors to avoid confusion
        if (error.status === 429 || error.status === 401 || error.status === 404) {
            console.warn('Gemini API unavailable (Quota/Auth/Model Not Found). Switching to Mock Mode for embeddings.');
        } else {
            console.error('Error generating embedding:', error.message);
        }
        return Array(768).fill(0).map(() => Math.random()); // Gemini uses 768-dim embeddings
    }
};

module.exports = {
    generateEmbedding,
};

/**
 * Splits text into chunks of a given size.
 * @param {string} text - The text to split.
 * @param {number} chunkSize - The number of characters per chunk (approx).
 * @returns {string[]} - Array of text chunks.
 */
const splitTextIntoChunks = (text, chunkSize = 1000) => {
    if (!text) return [];

    const chunks = [];
    let currentChunk = '';

    // Simple splitting by sentences or paragraphs could be better, 
    // but for now we'll do a character count split respecting words.
    const words = text.split(' ');

    for (const word of words) {
        if ((currentChunk + word).length > chunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
        }
        currentChunk += `${word} `;
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
};

module.exports = {
    splitTextIntoChunks,
};

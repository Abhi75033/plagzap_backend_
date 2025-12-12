const crypto = require('crypto');

// Encryption key from environment or generate one
// IMPORTANT: Store this key securely in your .env file
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // AES block size
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encrypted (hex encoded)
 */
function encrypt(text) {
    // ENCRYPTION DISABLED - requires MESSAGE_ENCRYPTION_KEY in .env
    // Without a persistent key, messages can't be decrypted after server restart
    if (!process.env.MESSAGE_ENCRYPTION_KEY) {
        return text; // Store plain text
    }

    if (!text) return text;

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'); // 32 bytes for AES-256
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return iv:encrypted format
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return text; // Return original if encryption fails
    }
}

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText - Encrypted text in format: iv:encrypted
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;

    try {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return encryptedText; // Return original if decryption fails
    }
}

/**
 * Check if text is encrypted (has iv:encrypted format)
 */
function isEncrypted(text) {
    if (!text) return false;
    const parts = text.split(':');
    // Check if it looks like hex:hex format
    return parts.length === 2 && /^[0-9a-f]{32}$/i.test(parts[0]);
}

module.exports = { encrypt, decrypt, isEncrypted };

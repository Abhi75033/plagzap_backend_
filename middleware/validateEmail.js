const disposableEmails = require('../config/disposableEmails');

/**
 * Check if an email domain is disposable/temporary
 * @param {string} email - Email address to check
 * @returns {boolean} - True if email is disposable
 */
function isDisposableEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
        return false;
    }

    return disposableEmails.includes(domain);
}

/**
 * Middleware to validate email and reject disposable addresses
 */
function validateEmail(req, res, next) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if disposable
    console.log(`[Email Validation] Checking email: ${email}`);
    console.log(`[Email Validation] Domain extracted: ${email.split('@')[1]?.toLowerCase()}`);
    console.log(`[Email Validation] Disposable list size: ${disposableEmails.length}`);
    console.log(`[Email Validation] Is nctime.com in list: ${disposableEmails.includes('nctime.com')}`);

    if (isDisposableEmail(email)) {
        console.log(`[Email Validation] ❌ BLOCKED disposable email: ${email}`);
        return res.status(400).json({
            error: 'Disposable email addresses are not allowed. Please use a permanent email address.'
        });
    }

    console.log(`[Email Validation] ✅ ALLOWED email: ${email}`);

    next();
}

module.exports = { validateEmail, isDisposableEmail };

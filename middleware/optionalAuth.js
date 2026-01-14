const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Optional authentication middleware
 * Attaches user to request if token is provided, but allows anonymous requests
 * Use this for freemium endpoints that work for both logged-in and logged-out users
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        // If no token, allow request to continue without user
        if (!token) {
            req.user = null;
            return next();
        }

        // Verify token
        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Find user
            const user = await User.findById(decoded.userId);

            if (user) {
                // Attach user to request
                req.user = user;
            } else {
                // Invalid user but don't block request
                req.user = null;
            }
        } catch (tokenError) {
            // Invalid token but don't block request
            req.user = null;
        }

        next();
    } catch (error) {
        // Even if there's an error, allow the request
        req.user = null;
        next();
    }
};

module.exports = optionalAuthMiddleware;

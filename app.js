console.log('Entering app.js');
console.time('Require Express');
const express = require('express');
console.timeEnd('Require Express');
console.log('Loaded express');
const cors = require('cors');
console.log('Loaded cors');
const path = require('path');
const passport = require('./config/passport');
console.log('Loaded passport config');
const apiRoutes = require('./routes/api');
console.log('Loaded apiRoutes');
const authRoutes = require('./routes/auth');
console.log('Loaded authRoutes');
const subscriptionRoutes = require('./routes/subscription');
console.log('Loaded subscriptionRoutes');
const adminRoutes = require('./routes/admin');
console.log('Loaded adminRoutes');
const webhookRoutes = require('./routes/webhook');
console.log('Loaded webhookRoutes');
const rewardsRoutes = require('./routes/rewards');
console.log('Loaded rewardsRoutes');
const referralRoutes = require('./routes/referrals'); // Phase 2: Referrals
console.log('Loaded referralRoutes');
const adminSecurityRoutes = require('./routes/adminSecurity'); // Phase 4
console.log('Loaded adminSecurityRoutes');
const auth = require('./middleware/auth');
console.log('Loaded auth middleware');
const adminAuth = require('./middleware/adminAuth');
console.log('Loaded adminAuth middleware');

const app = express();

// Root endpoint
app.get('/', (req, res) => {
    res.send('Welcome to PlagZap API - Server is running!');
});

// Health check endpoint for UptimeRobot
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Simple ping endpoint (alternative)
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});


// Middleware
app.use(cors()); // Allow all origins for extension support
app.use(express.json({ limit: '50mb' })); // Increased limit for large text
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(passport.initialize()); // Initialize Passport

// Request Logger Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/rewards', rewardsRoutes); // Rewards system routes (Phase 1)
app.use('/api/referrals', referralRoutes); // Phase 2: Referrals
app.use('/api/admin', auth, adminAuth, adminRoutes); // Protect all admin routes (MOVED UP)
app.use('/api/admin/security', auth, adminAuth, adminSecurityRoutes); // Phase 4: Security Dashboard
app.use('/api/meetings', require('./routes/meetings')); // Video meeting routes
app.use('/api', apiRoutes);
app.use('/api/webhooks', webhookRoutes);

// TEST EMAIL ENDPOINT (temporary - for debugging)
app.post('/api/test-email', async (req, res) => {
    console.log('🔥 TEST EMAIL ENDPOINT CALLED');
    const emailService = require('./services/emailService');
    try {
        const result = await emailService.sendPromotionalEmail(
            'abhishekyadav1112.21@gmail.com',
            'Test User',
            'Test Subject',
            'This is a test email',
            'Click Here',
            'https://example.com',
            'TESTCODE'
        );
        console.log('Test email result:', result);
        res.json({ success: true, result });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;

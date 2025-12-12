/**
 * EMAIL SERVICE
 * Handles sending beautiful HTML emails for various events
 */

// Try to load nodemailer, but don't crash if not installed
let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    console.warn('⚠️ Nodemailer not installed. Email features disabled. Run: npm install nodemailer');
}

// Create transporter with SMTP settings
let transporter = null;

const initTransporter = () => {
    if (transporter) return transporter;

    // If nodemailer is not installed, return null
    if (!nodemailer) {
        return null;
    }

    console.log('Email Service: Checking SMTP configuration...');
    console.log('  SMTP_HOST:', process.env.SMTP_HOST ? '✓ Set' : '✗ Missing');
    console.log('  SMTP_USER:', process.env.SMTP_USER ? '✓ Set' : '✗ Missing');
    console.log('  SMTP_PASS:', process.env.SMTP_PASS ? '✓ Set' : '✗ Missing');

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log('✅ Email service initialized successfully');
    } else {
        console.warn('⚠️ SMTP credentials not configured. Email service disabled.');
    }
    return transporter;
};

// Initialize transporter when module is loaded
initTransporter();

// Base email template with beautiful styling
const getBaseTemplate = (content, title) => `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <!-- Google Fonts: Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    
    <style type="text/css">
        /* RESET STYLES */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #050505; font-family: 'Inter', Helvetica, Arial, sans-serif; }
        
        /* UTILITIES */
        .wrapper { width: 100%; table-layout: fixed; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #050505; }
        .webkit { max-width: 600px; margin: 0 auto; }
        
        /* MOBILE STYLES */
        @media screen and (max-width: 600px) {
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .mobile-stack { display: block !important; width: 100% !important; }
            .mobile-heading { font-size: 28px !important; line-height: 1.2 !important; }
            .mobile-text { font-size: 16px !important; line-height: 1.6 !important; }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; background-color: #050505;">
    
    <center class="wrapper" style="width: 100%; background-color: #050505;">
        <div class="webkit" style="max-width: 600px; margin: 0 auto;">
            
            <!-- Spacer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px;">
                <tr><td height="20" style="font-size: 0px; line-height: 0px;">&nbsp;</td></tr>
            </table>

            <!-- MAIN CONTAINER (Minimal, No Border) -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                <tr>
                    <td>
                        <!-- INNER CONTENT (No Background) -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: transparent; overflow: hidden;">
                            
                            <!-- Header Section with Logo -->
                            <tr>
                                <td align="center" style="padding: 40px 0 20px 0;">
                                    <table border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center">
                                                <!-- Logo Container -->
                                                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #2e1065 0%, #000000 100%); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.3); text-align: center; line-height: 64px; box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);">
                                                    <span style="font-size: 32px;">⚡</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Title Section -->
                            <tr>
                                <td align="center" class="mobile-padding" style="padding: 0 40px;">
                                    <h1 class="mobile-heading" style="margin: 0; color: #ffffff; font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 700; letter-spacing: -0.02em;">
                                        PlagZap
                                    </h1>
                                    <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 14px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase;">
                                        AI Intelligence
                                    </p>
                                </td>
                            </tr>

                            <!-- Divider Line -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 0 40px;">
                                    <div style="height: 1px; width: 100%; background: linear-gradient(90deg, rgba(139,92,246,0) 0%, rgba(139,92,246,0.5) 50%, rgba(139,92,246,0) 100%);"></div>
                                </td>
                            </tr>

                            <!-- Main Content Area -->
                            <tr>
                                <td class="mobile-padding" style="padding: 30px 40px 40px 40px; color: #d4d4d8; font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.7;">
                                    
                                    <!-- Dynamic Content Injection -->
                                    <div style="color: #e4e4e7;">
                                        ${content}
                                    </div>
                                    
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
            <!-- END MAIN CARD -->

            <!-- Footer Section -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                <tr>
                    <td align="center" style="color: #52525b; font-family: 'Inter', sans-serif; font-size: 13px;">
                        <p style="margin: 0 0 8px 0;">
                            © ${new Date().getFullYear()} PlagZap AI. All rights reserved.
                        </p>
                        <p style="margin: 15px 0 0 0;">
                            <a href="#" style="color: #71717a; text-decoration: underline;">Unsubscribe</a> &nbsp;•&nbsp; <a href="#" style="color: #71717a; text-decoration: underline;">Privacy Policy</a>
                        </p>
                    </td>
                </tr>
            </table>
            <!-- Spacer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr><td height="40" style="font-size: 0px; line-height: 0px;">&nbsp;</td></tr>
            </table>
        </div>
    </center>
</body>
</html>
`;

// 1. Welcome Email Template
const getWelcomeEmailTemplate = (userName) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            Welcome to PlagZap, ${userName}! 🎉
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Thank you for joining PlagZap! We're excited to have you on board.
        </p>
        <div style="background: rgba(102, 126, 234, 0.1); border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 16px;">What you can do now:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #b0b0b0; font-size: 14px; line-height: 1.8;">
                <li>Check your content for plagiarism</li>
                <li>Detect AI-generated text</li>
                <li>Humanize your content to make it unique</li>
                <li>Download detailed reports</li>
            </ul>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'https://plag-zap-frontend.vercel.app/'}/analyzer" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Start Analyzing Now →
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Welcome to PlagZap!');
};

// 2. SPECIAL: "FIRST50" Promotional Template (The specific one you asked for)
const getFirst50PromoTemplate = (userName) => {
    const clientUrl = process.env.CLIENT_URL || 'https://plag-zap-frontend.vercel.app/';

    const content = `
        <!-- Greeting -->
        <h2 style="margin: 0 0 15px 0; color: #ffffff; font-size: 24px; font-weight: 700;">Hey there, ${userName || 'Writer'}! 👋😄</h2>

        <p style="margin: 0 0 20px 0; color: #d4d4d8; font-size: 16px; line-height: 1.6;">
            Are AI detectors 🤖 or plagiarism checkers 📚 giving you trouble?<br>
            You’re not alone — even original text gets flagged these days. So frustrating, right? 😩
        </p>

        <p style="margin: 0 0 25px 0; color: #ffffff; font-size: 17px; line-height: 1.6; font-weight: 500;">
            But guess what? We’ve got something <span style="color: #a78bfa;">AMAZING</span> for you! 🎉✨
        </p>

        <!-- Feature Box -->
        <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 25px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; color: #a78bfa; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                💡 Fix AI Detection + Plagiarism Instantly!
            </h3>
            <p style="margin: 0 0 15px 0; color: #e4e4e7; font-size: 15px;">With our Premium Humanizer & Plagiarism Fixer, you can:</p>
            <ul style="margin: 0; padding: 0; list-style-type: none;">
                <li style="margin-bottom: 10px; color: #d4d4d8; display: flex;">
                    <span style="margin-right: 10px;">✨</span> Reduce AI score (look 100% human)
                </li>
                <li style="margin-bottom: 10px; color: #d4d4d8; display: flex;">
                    <span style="margin-right: 10px;">🧠</span> Humanize AI-written content
                </li>
                <li style="margin-bottom: 10px; color: #d4d4d8; display: flex;">
                    <span style="margin-right: 10px;">📉</span> Remove or drastically lower plagiarism
                </li>
                <li style="margin-bottom: 0; color: #d4d4d8; display: flex;">
                    <span style="margin-right: 10px;">⚡</span> Fast, accurate & super easy to use
                </li>
            </ul>
        </div>

        <!-- Special Offer Section -->
        <div style="text-align: center; margin-bottom: 35px; background: linear-gradient(180deg, rgba(236, 72, 153, 0.05) 0%, rgba(236, 72, 153, 0) 100%); padding: 20px; border-radius: 12px;">
            <p style="color: #ec4899; font-weight: 700; font-size: 18px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                🔥 Special Offer: Premium for JUST ₹49!
            </p>
            
            <!-- Coupon Code Box -->
            <div style="background: #18181b; border: 2px dashed #ec4899; border-radius: 12px; padding: 15px 25px; display: inline-block; margin-bottom: 12px;">
                <span style="color: #ffffff; font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700; letter-spacing: 2px;">FIRST50</span>
            </div>
            
            <p style="color: #a1a1aa; font-size: 13px; margin: 0;">(50% OFF — valid only for the first month!)</p>
            
            <!-- CTA Button -->
            <div style="margin-top: 25px;">
                <a href="${clientUrl}/pricing?code=FIRST50" style="background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; display: inline-block; font-weight: 700; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                    Unlock Premium Now
                </a>
            </div>
            <p style="color: #71717a; font-size: 12px; margin-top: 10px;">Limited-time offer for free users only ⏳</p>
        </div>

        <!-- Why Use It List -->
        <h4 style="margin: 0 0 15px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Why use it?</h4>
        <ul style="margin: 0 0 30px 0; padding: 0 0 0 20px; color: #d4d4d8; font-size: 15px; line-height: 1.6;">
            <li style="margin-bottom: 5px;">Beat AI detectors effortlessly ⭐</li>
            <li style="margin-bottom: 5px;">Fix plagiarism in seconds ⭐</li>
            <li style="margin-bottom: 5px;">Make your writing clean & natural ⭐</li>
            <li style="margin-bottom: 0;">Save hours of editing ⭐</li>
        </ul>

        <!-- Personal Sign-off -->
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
            <p style="margin: 0 0 5px 0; color: #d4d4d8; font-size: 15px; line-height: 1.6;">
                If you ever need help, just reply — I personally check every message ❤️
            </p>
            <p style="margin: 0 0 20px 0; color: #a1a1aa; font-size: 14px; font-style: italic;">
                — Abhishek Kumar
            </p>
            
            <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">
                Happy writing! ✍️✨<br>
                <span style="color: #a78bfa;">Team PlagZap 🔍✨</span>
            </p>
        </div>
    `;
    return getBaseTemplate(content, '🔥 Special Offer: Unlock Premium for ₹49');
};

// 3. Subscription Granted Email
const getSubscriptionGrantedTemplate = (userName, tier, expiry) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            🎁 Premium Subscription Activated!
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            Great news! Your premium subscription has been activated by our admin team.
        </p>
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 1px solid rgba(16, 185, 129, 0.3); padding: 25px; border-radius: 12px; margin: 25px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="color: #888; font-size: 14px; padding-bottom: 10px;">Plan:</td>
                    <td style="color: #10b981; font-size: 18px; font-weight: 600; text-align: right; text-transform: capitalize;">${tier}</td>
                </tr>
                <tr>
                    <td style="color: #888; font-size: 14px; padding-top: 10px;">Valid Until:</td>
                    <td style="color: #ffffff; font-size: 16px; text-align: right;">${new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                </tr>
            </table>
        </div>
        <p style="margin: 20px 0; color: #b0b0b0; font-size: 14px; line-height: 1.6;">
            Enjoy unlimited access to all premium features including AI detection, content humanizer, and detailed reports!
        </p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'https://plag-zap-frontend.vercel.app/'}/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Go to Dashboard →
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Subscription Activated - PlagZap');
};

// 4. Subscription Paused Email
const getSubscriptionPausedTemplate = (userName) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            ⏸️ Your Subscription is Paused
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            Your PlagZap subscription has been temporarily paused. Premium features are currently unavailable.
        </p>
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 20px; border-radius: 12px; margin: 25px 0;">
            <p style="margin: 0; color: #f59e0b; font-size: 14px;">
                <strong>What this means:</strong><br><br>
                • Premium features are temporarily disabled<br>
                • Your subscription time is preserved<br>
                • Contact support to resume your subscription
            </p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:abhishekyadav1112.21@gmail.com" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Contact Support
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Subscription Paused - PlagZap');
};

// 5. Subscription Suspended Email
const getSubscriptionSuspendedTemplate = (userName) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            🚫 Your Subscription is Suspended
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            Your PlagZap subscription has been suspended. All premium features have been disabled.
        </p>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 20px; border-radius: 12px; margin: 25px 0;">
            <p style="margin: 0; color: #ef4444; font-size: 14px;">
                <strong>Important:</strong><br><br>
                Your account has been suspended. Please contact our support team to resolve this issue and restore access to your premium features.
            </p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:abhishekyadav1112.21@gmail.com" 
               style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Contact Support Immediately
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Subscription Suspended - PlagZap');
};

// 6. Subscription Resumed Email
const getSubscriptionResumedTemplate = (userName, tier) => {
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            ✅ Your Subscription is Active Again!
        </h2>
        <p style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},<br><br>
            Great news! Your PlagZap subscription has been resumed. All premium features are now available again.
        </p>
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 1px solid rgba(16, 185, 129, 0.3); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
            <p style="margin: 0; color: #10b981; font-size: 18px; font-weight: 600;">
                🎉 Your ${tier} plan is back!
            </p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL || 'https://plag-zap-frontend.vercel.app/'}/analyzer" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Start Analyzing →
            </a>
        </div>
    `;
    return getBaseTemplate(content, 'Subscription Resumed - PlagZap');
};

// 7. Generic Promotional Email Template
const getPromotionalEmailTemplate = (userName, subject, message, ctaText, ctaUrl, couponCode = null) => {
    const couponSection = couponCode ? `
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%); border: 2px dashed #8b5cf6; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #888; font-size: 14px;">Use coupon code:</p>
            <p style="margin: 0; color: #8b5cf6; font-size: 28px; font-weight: 700; letter-spacing: 3px;">${couponCode}</p>
        </div>
    ` : '';

    // Wrapping message in a div instead of p to allow html content in message
    // Use whitespace: pre-wrap to preserve all spacing and layout exactly as entered
    // This respects multiple spaces, indentation, and newlines
    const content = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
            ${subject}
        </h2>
        
        <div style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
            Hello ${userName},
        </div>

        <div style="margin: 0 0 20px 0; color: #b0b0b0; font-size: 16px; line-height: 1.6; white-space: pre-wrap; font-family: 'Inter', sans-serif;">${message}</div>

        ${couponSection}
        <div style="text-align: center; margin-top: 30px;">
            <a href="${ctaUrl || process.env.CLIENT_URL || 'https://plag-zap-frontend.vercel.app/'}/pricing" 
               style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ${ctaText || 'Claim Offer Now'} →
            </a>
        </div>
    `;
    return getBaseTemplate(content, subject);
};

// Send email function
const sendEmail = async (to, subject, htmlContent) => {
    console.log(`📧 Attempting to send email to: ${to}`);
    try {
        const transport = initTransporter();
        if (!transport) {
            console.log('📧 Email service not configured - would be sent to:', to);
            return { success: false, message: 'Email service not configured' };
        }

        console.log(`📧 Sending email via SMTP to: ${to}`);
        const info = await transport.sendMail({
            from: `"PlagZap" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject,
            html: htmlContent,
        });

        console.log('✅ Email sent successfully:', info.messageId, 'to:', to);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Email error for ${to}:`, error.message);
        console.error('Full error:', error);
        return { success: false, error: error.message };
    }
};

// Export functions
module.exports = {
    sendWelcomeEmail: async (email, userName) => {
        const html = getWelcomeEmailTemplate(userName);
        return sendEmail(email, '🎉 Welcome to PlagZap!', html);
    },

    sendSubscriptionGrantedEmail: async (email, userName, tier, expiry) => {
        const html = getSubscriptionGrantedTemplate(userName, tier, expiry);
        return sendEmail(email, '🎁 Your Premium Subscription is Active!', html);
    },

    sendSubscriptionPausedEmail: async (email, userName) => {
        const html = getSubscriptionPausedTemplate(userName);
        return sendEmail(email, '⏸️ Your Subscription has been Paused', html);
    },

    sendSubscriptionSuspendedEmail: async (email, userName) => {
        const html = getSubscriptionSuspendedTemplate(userName);
        return sendEmail(email, '🚫 Your Subscription has been Suspended', html);
    },

    sendSubscriptionResumedEmail: async (email, userName, tier) => {
        const html = getSubscriptionResumedTemplate(userName, tier);
        return sendEmail(email, '✅ Your Subscription is Active Again!', html);
    },

    // Standard Generic Promotional Email
    sendPromotionalEmail: async (email, userName, subject, message, ctaText, ctaUrl, couponCode) => {
        const html = getPromotionalEmailTemplate(userName, subject, message, ctaText, ctaUrl, couponCode);
        return sendEmail(email, subject, html);
    },

    // SPECIAL: "FIRST50" Campaign Email
    sendFirst50PromoEmail: async (email, userName) => {
        const html = getFirst50PromoTemplate(userName);
        return sendEmail(email, '🔥 Special Offer: Premium for ₹49!', html);
    },

    // Bulk send promotional emails
    sendBulkPromotionalEmail: async (users, subject, message, ctaText, ctaUrl, couponCode) => {
        const results = [];
        for (const user of users) {
            const result = await module.exports.sendPromotionalEmail(
                user.email,
                user.name,
                subject,
                message,
                ctaText,
                ctaUrl,
                couponCode
            );
            results.push({ email: user.email, ...result });
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return results;
    }
};
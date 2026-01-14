const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

// Predefined notification templates
const TEMPLATES = {
    welcome: {
        title: '🎉 Welcome to PlagZap!',
        message: 'Start checking your content for plagiarism and AI detection now!',
        type: 'system',
        icon: 'sparkles'
    },
    subscription_expiring: {
        title: '⏰ Subscription Expiring Soon',
        message: 'Your premium subscription will expire in 3 days. Renew now to continue enjoying all features!',
        type: 'subscription',
        icon: 'alert-circle',
        link: '/pricing'
    },
    new_feature: {
        title: '✨ New Feature Released!',
        message: 'Check out our latest AI content humanizer - make your AI text sound more natural!',
        type: 'system',
        icon: 'star'
    },
    achievement_unlocked: {
        title: '🏆 Achievement Unlocked!',
        message: 'Congratulations! You\'ve completed your first plagiarism check.',
        type: 'achievement',
        icon: 'trophy'
    },
    system_maintenance: {
        title: '🔧 Scheduled Maintenance',
        message: 'System maintenance scheduled for tonight 2 AM - 4 AM. Services may be temporarily unavailable.',
        type: 'alert',
        icon: 'wrench'
    }
};

// Get user's notifications
const getUserNotifications = async (req, res) => {
    try {
        const { limit = 20, unreadOnly = false } = req.query;

        const query = { userId: req.user._id };
        if (unreadOnly === 'true') {
            query.read = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            read: false
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false },
            { read: true }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
};

// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};

// Admin: Get templates
const getTemplates = async (req, res) => {
    try {
        res.json(TEMPLATES);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get templates' });
    }
};

// Admin: Send notification to targeted audience
const sendToAllUsers = async (req, res) => {
    try {
        const { template, customTitle, customMessage, customType, customIcon, customLink, targetAudience = 'all' } = req.body;

        let notificationData;

        if (template && TEMPLATES[template]) {
            // Use predefined template
            notificationData = { ...TEMPLATES[template] };
        } else {
            // Use custom notification
            notificationData = {
                title: customTitle,
                message: customMessage,
                type: customType || 'custom',
                icon: customIcon || 'bell',
                link: customLink || null
            };
        }

        // Build user query based on target audience
        let userQuery = {};

        switch (targetAudience) {
            case 'free':
                // Free users: no active subscription or subscription tier is 'free'
                userQuery = {
                    $or: [
                        { 'subscription.status': { $exists: false } },
                        { 'subscription.status': { $ne: 'active' } },
                        { 'subscription.tier': 'free' },
                        { 'subscription.tier': { $exists: false } }
                    ]
                };
                break;

            case 'paid':
                // Paid users: active subscription with non-free tier
                userQuery = {
                    'subscription.status': 'active',
                    'subscription.tier': { $in: ['monthly', 'quarterly', 'biannual', 'annual'] }
                };
                break;

            case 'expiring':
                // Users whose subscription expires in next 10 days
                const now = new Date();
                const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
                userQuery = {
                    'subscription.status': 'active',
                    'subscription.endDate': {
                        $gte: now,
                        $lte: tenDaysFromNow
                    }
                };
                break;

            case 'all':
            default:
                // All users - no filter
                userQuery = {};
                break;
        }

        console.log(`[NOTIFICATION] Starting send to "${targetAudience}" audience`);
        console.log(`[NOTIFICATION] User query:`, JSON.stringify(userQuery));

        // Get filtered users with email and name for email sending
        console.log(`[NOTIFICATION] Querying users...`);
        const users = await User.find(userQuery, '_id email name');
        console.log(`[NOTIFICATION] Found ${users.length} users`);

        if (users.length === 0) {
            console.log(`[NOTIFICATION] No users found, returning error`);
            return res.status(400).json({ error: 'No users found matching the target audience' });
        }

        // Create notifications for filtered users
        console.log(`[NOTIFICATION] Creating ${users.length} notification documents...`);
        const notifications = users.map(user => ({
            ...notificationData,
            userId: user._id,
            createdBy: req.user._id
        }));

        console.log(`[NOTIFICATION] Inserting ${notifications.length} notifications into database...`);
        const insertStartTime = Date.now();
        await Notification.insertMany(notifications);
        const insertDuration = Date.now() - insertStartTime;
        console.log(`[NOTIFICATION] Database insert completed in ${insertDuration}ms`);

        // Send response immediately
        console.log(`[NOTIFICATION] Sending HTTP response...`);
        res.json({
            message: `Notification sent to ${users.length} user(s) in "${targetAudience}" audience`,
            count: users.length,
            audience: targetAudience
        });
        console.log(`[NOTIFICATION] HTTP response sent successfully`);

        // Send emails AFTER response is sent (non-blocking background task)
        console.log(`[NOTIFICATION] Starting email dispatch to ${users.length} users...`);
        setImmediate(async () => {
            let successCount = 0;
            let failureCount = 0;

            for (const user of users) {
                try {
                    const emailHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
                                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
                                .header h1 { margin: 0; font-size: 28px; }
                                .content { padding: 40px 30px; }
                                .notification-box { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                                .notification-title { font-weight: bold; font-size: 18px; color: #667eea; margin-bottom: 10px; }
                                .notification-message { color: #666; font-size: 15px; line-height: 1.6; }
                                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
                                .footer { text-align: center; padding: 20px; background: #f9f9f9; color: #999; font-size: 12px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>🔔 New Notification</h1>
                                </div>
                                <div class="content">
                                    <p>Hi <strong>${user.name || 'there'}</strong>,</p>
                                    <p>You have a new notification from PlagZap:</p>
                                    
                                    <div class="notification-box">
                                        <div class="notification-title">${notificationData.title}</div>
                                        <div class="notification-message">${notificationData.message}</div>
                                    </div>

                                    ${notificationData.link ? `
                                    <p style="text-align: center;">
                                        <a href="${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://plag-zap-frontend.vercel.app'}${notificationData.link}" class="button">
                                            View Details
                                        </a>
                                    </p>
                                    ` : ''}

                                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                        You can also view this notification in your <a href="${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://plag-zap-frontend.vercel.app'}/dashboard" style="color: #667eea;">dashboard</a>.
                                    </p>
                                </div>
                                <div class="footer">
                                    <p>&copy; ${new Date().getFullYear()} PlagZap. All rights reserved.</p>
                                    <p>This is an automated notification email.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    const result = await sendEmail(user.email, `🔔 ${notificationData.title}`, emailHtml);

                    if (result && result.success) {
                        successCount++;
                        console.log(`✅ Email sent to ${user.email}`);
                    } else {
                        failureCount++;
                        console.error(`❌ Failed to send email to ${user.email}:`, result?.error || 'Unknown error');
                    }

                    // Small delay to avoid rate limiting (100ms between emails)
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (err) {
                    failureCount++;
                    console.error(`❌ Error sending email to ${user.email}:`, err.message);
                }
            }

            console.log(`\n📊 Email Summary: ${successCount} sent, ${failureCount} failed out of ${users.length} total\n`);
        });
    } catch (error) {
        console.error('Send to all users error:', error);
        res.status(500).json({ error: 'Failed to send notifications' });
    }
};

// Admin: Send notification to specific user
const sendToUser = async (req, res) => {
    try {
        const { userId, title, message, type, icon, link } = req.body;

        const notification = new Notification({
            userId,
            title,
            message,
            type: type || 'custom',
            icon: icon || 'bell',
            link: link || null,
            createdBy: req.user._id
        });

        await notification.save();

        res.status(201).json(notification);
    } catch (error) {
        console.error('Send to user error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
};

// Admin: Get notification stats
const getStats = async (req, res) => {
    try {
        const totalSent = await Notification.countDocuments();
        const totalRead = await Notification.countDocuments({ read: true });
        const totalUnread = await Notification.countDocuments({ read: false });

        res.json({
            totalSent,
            totalRead,
            totalUnread,
            readRate: totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(2) : 0
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getTemplates,
    sendToAllUsers,
    sendToUser,
    getStats,
    TEMPLATES
};

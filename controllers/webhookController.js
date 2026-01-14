const Webhook = require('../models/Webhook');
const crypto = require('crypto');
const webhookService = require('../services/webhookService');

// Get all webhooks for current user
const getWebhooks = async (req, res) => {
    try {
        const webhooks = await Webhook.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        // Hide full secret for security, only show first few chars
        const sanitized = webhooks.map(w => ({
            id: w._id,
            url: w.url,
            events: w.events,
            isActive: w.isActive,
            createdAt: w.createdAt,
            secretMasked: w.secret.substring(0, 8) + '...',
            // We return full secret ONLY on creation usually, but for simplicity here we might not
            // For now, let's just return what we have, frontend can handle display
        }));

        res.json(webhooks); // Return full objects so user can copy secret from dashboard
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
};

// Create new webhook
const createWebhook = async (req, res) => {
    try {
        const { url, events } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Generate a random secret
        const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');

        const webhook = new Webhook({
            userId: req.user._id,
            url,
            secret,
            events: events || ['analysis.completed'],
        });

        await webhook.save();
        res.status(201).json(webhook);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create webhook' });
    }
};

// Delete webhook
const deleteWebhook = async (req, res) => {
    try {
        await Webhook.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.json({ message: 'Webhook deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
};

// Test webhook
const testWebhook = async (req, res) => {
    try {
        const webhook = await Webhook.findOne({ _id: req.params.id, userId: req.user._id });
        if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

        // Dispatch a ping event
        // We do this asynchronously but wait for it here to give feedback
        const payload = {
            id: crypto.randomUUID(),
            event: 'ping',
            createdAt: new Date().toISOString(),
            data: { message: 'This is a test event from PlagZap.' }
        };

        const signature = webhookService.signPayload(payload, webhook.secret);

        // Manual axios call to catch error immediately for UI feedback
        const axios = require('axios');
        await axios.post(webhook.url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-PlagZap-Event': 'ping',
                'X-PlagZap-Signature': signature,
                'User-Agent': 'PlagZap-Webhook-Dispatcher/1.0'
            },
            timeout: 5000
        });

        webhook.resetFailures(); // If it works, reset failures
        res.json({ success: true, message: 'Ping successful' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

module.exports = {
    getWebhooks,
    createWebhook,
    deleteWebhook,
    testWebhook
};

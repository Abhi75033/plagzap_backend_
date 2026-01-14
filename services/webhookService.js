const axios = require('axios');
const crypto = require('crypto');
const Webhook = require('../models/Webhook');

// Sign payload with HMAC-SHA256
const signPayload = (payload, secret) => {
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
};

const dispatch = async (userId, event, data) => {
    try {
        // Find active webhooks for this user and event
        const webhooks = await Webhook.find({
            userId,
            isActive: true,
            events: event
        });

        if (webhooks.length === 0) return;

        console.log(`Dispatching event ${event} to ${webhooks.length} webhooks for user ${userId}`);

        const payload = {
            id: crypto.randomUUID(),
            event: event,
            createdAt: new Date().toISOString(),
            data: data
        };

        const promises = webhooks.map(async (webhook) => {
            try {
                const signature = signPayload(payload, webhook.secret);

                await axios.post(webhook.url, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-PlagZap-Event': event,
                        'X-PlagZap-Signature': signature,
                        'User-Agent': 'PlagZap-Webhook-Dispatcher/1.0'
                    },
                    timeout: 5000 // 5s timeout
                });

                // Reset failures on success
                if (webhook.failureCount > 0) {
                    await webhook.resetFailures();
                }

                return { success: true, url: webhook.url };
            } catch (error) {
                console.error(`Webhook failed for ${webhook.url}:`, error.message);
                await webhook.recordFailure();
                return { success: false, url: webhook.url, error: error.message };
            }
        });

        await Promise.allSettled(promises);
    } catch (error) {
        console.error('Webhook dispatch error:', error);
    }
};

module.exports = {
    dispatch,
    signPayload // exported for testing/utils
};

const express = require('express');
const router = express.Router();
const DeviceFingerprintService = require('../services/deviceFingerprintService');
const adminAuth = require('../middleware/adminAuth');

/**
 * Admin Security Routes
 * All routes require admin authentication
 */

// GET /api/admin/security/stats - Get security dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
    try {
        // Get suspicious devices count
        const suspiciousDevices = await DeviceFingerprintService.getSuspiciousDevices(100);

        // TODO: Get from SecurityEvent model when created
        const stats = {
            suspiciousDevices: suspiciousDevices.length,
            blockedAttempts: 0, // Placeholder
            captchaChallenges: 0, // Placeholder
            activeUsers: 0, // Placeholder
            last24h: {
                suspiciousActivity: 0,
                blockedRequests: 0,
                captchasPassed: 0,
                captchasFailed: 0
            }
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Security stats error:', error);
        res.status(500).json({ error: 'Failed to fetch security stats' });
    }
});

// GET /api/admin/security/devices - Get suspicious devices
router.get('/devices', adminAuth, async (req, res) => {
    try {
        const { limit = 50, onlySuspicious = 'true' } = req.query;

        let devices;
        if (onlySuspicious === 'true') {
            devices = await DeviceFingerprintService.getSuspiciousDevices(parseInt(limit));
        } else {
            // Get all devices sorted by last seen
            const DeviceFingerprint = require('../models/DeviceFingerprint');
            devices = await DeviceFingerprint.find()
                .populate('userId', 'name email')
                .sort({ lastSeen: -1 })
                .limit(parseInt(limit));
        }

        res.json({ success: true, devices, total: devices.length });
    } catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// GET /api/admin/security/events - Get recent security events
router.get('/events', adminAuth, async (req, res) => {
    try {
        const { limit = 100 } = req.query;

        // TODO: Query SecurityEvent model when created
        // For now, return placeholder
        const events = [];

        res.json({ success: true, events, total: events.length });
    } catch (error) {
        console.error('Get security events error:', error);
        res.status(500).json({ error: 'Failed to fetch security events' });
    }
});

// POST /api/admin/security/device/:deviceId/flag - Flag a device as suspicious
router.post('/device/:deviceId/flag', adminAuth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { reason } = req.body;

        const DeviceFingerprint = require('../models/DeviceFingerprint');
        const device = await DeviceFingerprint.findById(deviceId);

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        device.isSuspicious = true;
        if (reason && !device.suspicionReasons.includes(reason)) {
            device.suspicionReasons.push(reason);
        }
        device.trustScore = Math.max(0, device.trustScore - 30);

        await device.save();

        res.json({ success: true, message: 'Device flagged as suspicious', device });
    } catch (error) {
        console.error('Flag device error:', error);
        res.status(500).json({ error: 'Failed to flag device' });
    }
});

// POST /api/admin/security/device/:deviceId/unflag - Remove suspicious flag
router.post('/device/:deviceId/unflag', adminAuth, async (req, res) => {
    try {
        const { deviceId } = req.params;

        const DeviceFingerprint = require('../models/DeviceFingerprint');
        const device = await DeviceFingerprint.findById(deviceId);

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        device.isSuspicious = false;
        device.suspicionReasons = [];
        device.trustScore = Math.min(100, device.trustScore + 20);

        await device.save();

        res.json({ success: true, message: 'Device unflagged', device });
    } catch (error) {
        console.error('Unflag device error:', error);
        res.status(500).json({ error: 'Failed to unflag device' });
    }
});

module.exports = router;

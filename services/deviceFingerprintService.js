const DeviceFingerprint = require('../models/DeviceFingerprint');
const crypto = require('crypto');

/**
 * Device Fingerprinting Service
 * Manages device tracking and trust scoring for security
 */
class DeviceFingerprintService {
    /**
     * Generate device fingerprint from request and client data
     */
    static generateFingerprint(req, clientFingerprint = {}) {
        const components = [
            req.headers['user-agent'] || '',
            req.headers['accept-language'] || '',
            clientFingerprint.canvas || '',
            clientFingerprint.screen || '',
            clientFingerprint.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        ];

        const fingerprintString = components.join('|');
        return crypto.createHash('sha256').update(fingerprintString).digest('hex');
    }

    /**
     * Track device for user
     */
    static async trackDevice(userId, req, clientFingerprint = {}) {
        try {
            const fingerprint = this.generateFingerprint(req, clientFingerprint);
            const ip = req.ip || req.connection.remoteAddress || 'unknown';

            let device = await DeviceFingerprint.findOne({ userId, fingerprint });

            if (device) {
                // Update existing device
                device.lastSeen = new Date();
                device.metadata.totalLogins += 1;
                device.metadata.lastLoginDate = new Date();

                // Update IP list
                const ipEntry = device.ipAddresses.find(i => i.ip === ip);
                if (ipEntry) {
                    ipEntry.lastSeen = new Date();
                } else {
                    // New IP for this device
                    device.ipAddresses.push({
                        ip,
                        firstSeen: new Date(),
                        lastSeen: new Date()
                    });

                    // Check for suspicious rapid IP changes
                    await this.checkIPChanges(device);
                }

                // Increase trust score over time for consistent devices
                if (device.trustScore < 100 && !device.isSuspicious) {
                    const daysSinceFirstSeen = (Date.now() - device.firstSeen) / (1000 * 60 * 60 * 24);
                    const trustIncrement = Math.min(5, daysSinceFirstSeen / 2);
                    device.trustScore = Math.min(100, device.trustScore + trustIncrement);
                }
            } else {
                // New device
                device = new DeviceFingerprint({
                    userId,
                    fingerprint,
                    deviceInfo: {
                        userAgent: req.headers['user-agent'],
                        platform: clientFingerprint.platform,
                        language: req.headers['accept-language'],
                        screenResolution: clientFingerprint.screen,
                        timezone: clientFingerprint.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                        canvas: clientFingerprint.canvas
                    },
                    ipAddresses: [{
                        ip,
                        firstSeen: new Date(),
                        lastSeen: new Date()
                    }],
                    trustScore: 30, // New devices start with lower trust
                    metadata: {
                        totalLogins: 1,
                        lastLoginDate: new Date()
                    }
                });
            }

            await device.save();
            return device;
        } catch (error) {
            console.error('Device tracking error:', error);
            return null;
        }
    }

    /**
     * Check for suspicious IP changes
     */
    static async checkIPChanges(device) {
        const recentIPs = device.ipAddresses.filter(ip =>
            (Date.now() - ip.lastSeen) < 24 * 60 * 60 * 1000 // Last 24 hours
        );

        if (recentIPs.length > 5) {
            device.isSuspicious = true;
            if (!device.suspicionReasons.includes('Rapid IP changes')) {
                device.suspicionReasons.push('Rapid IP changes');
            }
            device.trustScore = Math.max(0, device.trustScore - 20);
        }
    }

    /**
     * Check if device is suspicious
     */
    static async checkSuspicious(userId, fingerprint) {
        try {
            const device = await DeviceFingerprint.findOne({ userId, fingerprint });

            if (!device) {
                return {
                    suspicious: true,
                    reason: 'Unknown device',
                    trustScore: 0
                };
            }

            if (device.isSuspicious) {
                return {
                    suspicious: true,
                    reason: device.suspicionReasons.join(', '),
                    trustScore: device.trustScore
                };
            }

            // Check for rapid IP changes
            const recentIPs = device.ipAddresses.filter(ip =>
                (Date.now() - ip.lastSeen) < 24 * 60 * 60 * 1000
            );

            if (recentIPs.length > 5) {
                return {
                    suspicious: true,
                    reason: 'Rapid IP changes detected',
                    trustScore: device.trustScore
                };
            }

            return {
                suspicious: false,
                trustScore: device.trustScore,
                device
            };
        } catch (error) {
            console.error('Suspicious check error:', error);
            return { suspicious: false, trustScore: 50 };
        }
    }

    /**
     * Get all devices for a user
     */
    static async getUserDevices(userId) {
        return await DeviceFingerprint.find({ userId })
            .sort({ lastSeen: -1 })
            .limit(10);
    }

    /**
     * Get suspicious devices (admin)
     */
    static async getSuspiciousDevices(limit = 50) {
        return await DeviceFingerprint.find({ isSuspicious: true })
            .populate('userId', 'name email')
            .sort({ updatedAt: -1 })
            .limit(limit);
    }
}

module.exports = DeviceFingerprintService;

const Contact = require('../models/Contact');
const { sendEmail } = require('../services/emailService');

// Submit contact form (public)
exports.submitContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Get user agent and IP for tracking
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Create contact submission
        const contact = await Contact.create({
            name,
            email,
            subject,
            message,
            userAgent,
            ipAddress
        });

        // Send confirmation email to user
        const userEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .footer { text-align: center; padding: 20px; background: #f9f9f9; color: #999; font-size: 12px; }
                    .highlight { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ We Received Your Message!</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>${name}</strong>,</p>
                        <p>Thank you for reaching out to PlagZap! We've received your message and our team will review it shortly.</p>
                        
                        <div class="highlight">
                            <p style="margin: 0 0 10px 0;"><strong>📋 Your Message Details:</strong></p>
                            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
                            <p style="margin: 5px 0;"><strong>Message:</strong></p>
                            <p style="margin: 5px 0; color: #666;">${message}</p>
                        </div>

                        <p><strong>⏱️ What happens next?</strong></p>
                        <ul style="color: #666;">
                            <li>Our team reviews your message within 24 hours</li>
                            <li>We'll respond to your email: <strong>${email}</strong></li>
                            <li>For urgent matters, we prioritize responses</li>
                        </ul>

                        <p style="margin-top: 30px; color: #666; font-size: 14px;">
                            If you need immediate assistance, you can also reach us via:
                        </p>
                        <ul style="color: #666; font-size: 14px;">
                            <li>Email: support@plagzap.com</li>
                            <li>Live Chat (available on our website)</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} PlagZap. All rights reserved.</p>
                        <p>This is an automated confirmation email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send notification email to admin/support team
        const adminEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 20px; text-align: center; color: white; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                    .label { font-weight: bold; color: #667eea; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔔 New Contact Form Submission</h1>
                    </div>
                    <div class="content">
                        <p>A new contact form has been submitted on PlagZap.</p>
                        
                        <div class="info-box">
                            <p><span class="label">From:</span> ${name}</p>
                            <p><span class="label">Email:</span> ${email}</p>
                            <p><span class="label">Subject:</span> ${subject}</p>
                            <p><span class="label">Submitted:</span> ${new Date().toLocaleString()}</p>
                        </div>

                        <div class="info-box">
                            <p class="label">Message:</p>
                            <p style="color: #666; margin-top: 10px;">${message}</p>
                        </div>

                        <p style="margin-top: 20px; color: #666; font-size: 13px;">
                            <strong>Technical Details:</strong><br>
                            IP: ${ipAddress}<br>
                            User Agent: ${userAgent}
                        </p>

                        <p style="margin-top: 30px;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" 
                               style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                View in Admin Panel
                            </a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send emails (don't wait for them, send in background)
        sendEmail(email, 'We Received Your Message - PlagZap', userEmailHtml).catch(err => {
            console.error('Failed to send user confirmation email:', err);
        });

        sendEmail(process.env.ADMIN_EMAIL || 'support@plagzap.com', `New Contact: ${subject}`, adminEmailHtml).catch(err => {
            console.error('Failed to send admin notification email:', err);
        });

        res.status(201).json({
            success: true,
            message: 'Thank you for contacting us! We will get back to you soon.',
            contactId: contact._id
        });

    } catch (error) {
        console.error('Submit contact error:', error);
        res.status(500).json({ error: 'Failed to submit contact form' });
    }
};

// Get all contact submissions (admin only)
exports.getAllContacts = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } }
            ];
        }

        const contacts = await Contact.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('repliedBy', 'name email');

        const total = await Contact.countDocuments(query);

        res.json({
            contacts,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });

    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
};

// Get contact statistics (admin only)
exports.getContactStats = async (req, res) => {
    try {
        const stats = await Contact.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsObject = {
            total: 0,
            new: 0,
            read: 0,
            replied: 0,
            archived: 0
        };

        stats.forEach(stat => {
            statsObject[stat._id] = stat.count;
            statsObject.total += stat.count;
        });

        res.json(statsObject);

    } catch (error) {
        console.error('Get contact stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

// Update contact status (admin only)
exports.updateContactStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        const updateData = { status };
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
        if (status === 'replied') {
            updateData.repliedAt = new Date();
            updateData.repliedBy = req.user._id;
        }

        const contact = await Contact.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json({ success: true, contact });

    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({ error: 'Failed to update contact' });
    }
};

// Delete contact (admin only)
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findByIdAndDelete(id);

        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json({ success: true, message: 'Contact deleted successfully' });

    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
};

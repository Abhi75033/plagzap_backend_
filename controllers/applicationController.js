const Application = require('../models/Application');
const Job = require('../models/Job');
const { sendEmail } = require('../services/emailService');
const path = require('path');
const fs = require('fs');

// Email templates
const emailTemplates = {
    applicationReceived: (applicantName, jobTitle) => ({
        subject: `Application Received - ${jobTitle} at PlagZap`,
        html: `
            <h2>Thank You for Applying!</h2>
            <p>Dear ${applicantName},</p>
            <p>We have received your application for the <strong>${jobTitle}</strong> position at PlagZap.</p>
            <p>Our team will review your application and get back to you soon.</p>
            <p>Best regards,<br>The PlagZap Team</p>
        `
    }),
    applicationReviewed: (applicantName, jobTitle) => ({
        subject: `Application Update - ${jobTitle} at PlagZap`,
        html: `
            <h2>Application Update</h2>
            <p>Dear ${applicantName},</p>
            <p>Your application for the <strong>${jobTitle}</strong> position is currently being reviewed by our hiring team.</p>
            <p>We'll keep you updated on the next steps.</p>
            <p>Best regards,<br>The PlagZap Team</p>
        `
    }),
    interviewScheduled: (applicantName, jobTitle, interviewDate, interviewLink) => ({
        subject: `Interview Invitation - ${jobTitle} at PlagZap`,
        html: `
            <h2>Interview Invitation</h2>
            <p>Dear ${applicantName},</p>
            <p>Congratulations! We'd like to invite you for an interview for the <strong>${jobTitle}</strong> position.</p>
            <p><strong>Interview Details:</strong></p>
            <ul>
                <li>Date & Time: ${new Date(interviewDate).toLocaleString()}</li>
                <li>Interview Link: <a href="${interviewLink}">${interviewLink}</a></li>
            </ul>
            <p>Please join the meeting 5 minutes before the scheduled time.</p>
            <p>Best regards,<br>The PlagZap Team</p>
        `
    }),
    applicationApproved: (applicantName, jobTitle) => ({
        subject: `Congratulations! - ${jobTitle} at PlagZap`,
        html: `
            <h2>Congratulations!</h2>
            <p>Dear ${applicantName},</p>
            <p>We are pleased to inform you that your application for the <strong>${jobTitle}</strong> position has been approved!</p>
            <p>Welcome to the PlagZap team! Our HR team will contact you shortly with the next steps.</p>
            <p>Best regards,<br>The PlagZap Team</p>
        `
    }),
    applicationRejected: (applicantName, jobTitle) => ({
        subject: `Application Status - ${jobTitle} at PlagZap`,
        html: `
            <h2>Application Update</h2>
            <p>Dear ${applicantName},</p>
            <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at PlagZap.</p>
            <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
            <p>We appreciate the time you took to apply and wish you the best in your job search.</p>
            <p>Best regards,<br>The PlagZap Team</p>
        `
    })
};

// Apply for job (user)
const applyForJob = async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const { coverLetter } = req.body;

        // Check if job exists and is active
        const job = await Job.findOne({ _id: jobId, isActive: true });
        if (!job) {
            return res.status(404).json({ error: 'Job not found or not active' });
        }

        // Check if user already applied
        const existingApplication = await Application.findOne({
            jobId,
            userId: req.user._id
        });

        if (existingApplication) {
            return res.status(400).json({ error: 'You have already applied for this job' });
        }

        // Check if resume file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'Resume file is required' });
        }

        // Create application
        const application = new Application({
            jobId,
            userId: req.user._id,
            applicantName: req.user.name,
            applicantEmail: req.user.email,
            resumeUrl: req.file.path,
            coverLetter: coverLetter || ''
        });

        // Add initial status to history
        application.statusHistory.push({
            status: 'applied',
            changedBy: req.user._id,
            changedAt: new Date(),
            notes: 'Application submitted'
        });

        await application.save();

        // Send confirmation email
        const emailData = emailTemplates.applicationReceived(req.user.name, job.title);
        await sendEmail(req.user.email, emailData.subject, emailData.html);

        res.status(201).json({
            message: 'Application submitted successfully',
            application
        });
    } catch (error) {
        console.error('Apply for job error:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
};

// Get user's applications
const getMyApplications = async (req, res) => {
    try {
        const applications = await Application.find({ userId: req.user._id })
            .populate('jobId', 'title department location jobType')
            .sort({ appliedAt: -1 });

        res.json({ applications });
    } catch (error) {
        console.error('Get my applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};

// Get all applications (admin)
const getAllApplications = async (req, res) => {
    try {
        const { status, jobId, search } = req.query;

        const query = {};
        if (status) query.status = status;
        if (jobId) query.jobId = jobId;

        let applications = await Application.find(query)
            .populate('jobId', 'title department')
            .populate('userId', 'name email')
            .sort({ appliedAt: -1 });

        // Search filter
        if (search) {
            applications = applications.filter(app =>
                app.applicantName.toLowerCase().includes(search.toLowerCase()) ||
                app.applicantEmail.toLowerCase().includes(search.toLowerCase())
            );
        }

        res.json({ applications });
    } catch (error) {
        console.error('Get all applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};

// Get application by ID
const getApplicationById = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(id)
            .populate('jobId')
            .populate('userId', 'name email')
            .populate('statusHistory.changedBy', 'name');

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ application });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({ error: 'Failed to fetch application' });
    }
};

// Update application status (admin)
const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const application = await Application.findById(id).populate('jobId');
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Update status using the model method
        application.updateStatus(status, req.user._id, notes);
        await application.save();

        // Send appropriate email based on status
        let emailData;
        switch (status) {
            case 'reviewed':
                emailData = emailTemplates.applicationReviewed(
                    application.applicantName,
                    application.jobId.title
                );
                break;
            case 'approved':
                emailData = emailTemplates.applicationApproved(
                    application.applicantName,
                    application.jobId.title
                );
                break;
            case 'rejected':
                emailData = emailTemplates.applicationRejected(
                    application.applicantName,
                    application.jobId.title
                );
                break;
        }

        if (emailData) {
            await sendEmail(application.applicantEmail, emailData.subject, emailData.html);
        }

        res.json({
            message: 'Application status updated successfully',
            application
        });
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({ error: 'Failed to update application status' });
    }
};

// Schedule interview (admin)
const scheduleInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const { interviewDate, interviewLink, notes } = req.body;

        const application = await Application.findById(id).populate('jobId');
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        application.interviewDate = interviewDate;
        application.interviewLink = interviewLink;
        application.updateStatus('interviewed', req.user._id, notes || 'Interview scheduled');

        await application.save();

        // Send interview invitation email
        const emailData = emailTemplates.interviewScheduled(
            application.applicantName,
            application.jobId.title,
            interviewDate,
            interviewLink
        );

        await sendEmail(application.applicantEmail, emailData.subject, emailData.html);

        res.json({
            message: 'Interview scheduled successfully',
            application
        });
    } catch (error) {
        console.error('Schedule interview error:', error);
        res.status(500).json({ error: 'Failed to schedule interview' });
    }
};

// Download resume (admin)
const downloadResume = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const resumePath = path.join(__dirname, '..', application.resumeUrl);

        if (!fs.existsSync(resumePath)) {
            return res.status(404).json({ error: 'Resume file not found' });
        }

        res.download(resumePath);
    } catch (error) {
        console.error('Download resume error:', error);
        res.status(500).json({ error: 'Failed to download resume' });
    }
};

// Get application stats (admin)
const getApplicationStats = async (req, res) => {
    try {
        const total = await Application.countDocuments();
        const applied = await Application.countDocuments({ status: 'applied' });
        const reviewed = await Application.countDocuments({ status: 'reviewed' });
        const interviewed = await Application.countDocuments({ status: 'interviewed' });
        const approved = await Application.countDocuments({ status: 'approved' });
        const rejected = await Application.countDocuments({ status: 'rejected' });

        res.json({
            total,
            applied,
            reviewed,
            interviewed,
            approved,
            rejected
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

module.exports = {
    applyForJob,
    getMyApplications,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
    scheduleInterview,
    downloadResume,
    getApplicationStats
};

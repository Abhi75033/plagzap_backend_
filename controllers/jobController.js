const Job = require('../models/Job');

// Get all active jobs (public)
const getActiveJobs = async (req, res) => {
    try {
        const { department, location, jobType, search } = req.query;

        const query = { isActive: true };

        // Add filters if provided
        if (department) query.department = department;
        if (location) query.location = location;
        if (jobType) query.jobType = jobType;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const jobs = await Job.find(query)
            .select('-postedBy')
            .sort({ createdAt: -1 });

        res.json({ jobs });
    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
};

// Get job by ID (public)
const getJobById = async (req, res) => {
    try {
        const { id } = req.params;

        const job = await Job.findOne({ _id: id, isActive: true });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ job });
    } catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
};

// Create job (admin only)
const createJob = async (req, res) => {
    try {
        const {
            title,
            department,
            location,
            jobType,
            description,
            requirements,
            responsibilities,
            salaryRange
        } = req.body;

        const job = new Job({
            title,
            department,
            location,
            jobType,
            description,
            requirements: requirements || [],
            responsibilities: responsibilities || [],
            salaryRange: salaryRange || '',
            postedBy: req.user._id
        });

        await job.save();

        res.status(201).json({ message: 'Job created successfully', job });
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ error: 'Failed to create job' });
    }
};

// Update job (admin only)
const updateJob = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const job = await Job.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ message: 'Job updated successfully', job });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
};

// Delete job (admin only)
const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;

        const job = await Job.findByIdAndDelete(id);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ error: 'Failed to delete job' });
    }
};

// Get all jobs including inactive (admin only)
const getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find()
            .populate('postedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({ jobs });
    } catch (error) {
        console.error('Get all jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
};

module.exports = {
    getActiveJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob,
    getAllJobs
};

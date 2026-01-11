const History = require('../models/History');

exports.getHistory = async (req, res) => {
    try {
        const user = req.user; // From auth middleware
        const history = await History.find({ userId: user._id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

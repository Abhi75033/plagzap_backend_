const News = require('../models/News');

// Get all news (public - only published and not expired)
const getAllNews = async (req, res) => {
    try {
        const { category } = req.query;

        const now = new Date();
        console.log('📰 Getting news - Current time:', now);

        let query = {
            published: true
        };

        if (category) {
            query.category = category;
        }

        console.log('📰 Query:', JSON.stringify(query));

        // Find all published news
        let news = await News.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        console.log('📰 Found news count before expiration filter:', news.length);

        // EXPIRATION FILTERING DISABLED - All published news will show
        // To re-enable: uncomment the filter and fix timezone handling in admin form

        console.log('📰 News count (expiration check disabled):', news.length);

        res.json(news);
    } catch (error) {
        console.error('❌ getAllNews error:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
};

// Get single news item
const getNewsById = async (req, res) => {
    try {
        const newsItem = await News.findById(req.params.id);

        if (!newsItem || !newsItem.published) {
            return res.status(404).json({ error: 'News not found' });
        }

        res.json(newsItem);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
};

// Admin: Get all news (including unpublished)
const getAdminNews = async (req, res) => {
    try {
        const news = await News.find()
            .sort({ createdAt: -1 });

        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
};

// Admin: Create news
const createNews = async (req, res) => {
    try {
        const newsData = {
            ...req.body,
            createdBy: req.user._id
        };

        const newsItem = new News(newsData);
        await newsItem.save();

        res.status(201).json(newsItem);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create news' });
    }
};

// Admin: Update news
const updateNews = async (req, res) => {
    try {
        const newsItem = await News.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!newsItem) {
            return res.status(404).json({ error: 'News not found' });
        }

        res.json(newsItem);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update news' });
    }
};

// Admin: Delete news
const deleteNews = async (req, res) => {
    try {
        const newsItem = await News.findByIdAndDelete(req.params.id);

        if (!newsItem) {
            return res.status(404).json({ error: 'News not found' });
        }

        res.json({ message: 'News deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete news' });
    }
};

module.exports = {
    getAllNews,
    getNewsById,
    getAdminNews,
    createNews,
    updateNews,
    deleteNews
};

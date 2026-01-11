const Blog = require('../models/Blog');

// Get all blogs (public)
const getAllBlogs = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 10 } = req.query;

        let query = { published: true };

        if (category && category !== 'All Posts') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { excerpt: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const blogs = await Blog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Blog.countDocuments(query);

        res.json({
            blogs,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
};

// Get single blog by slug (public)
const getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug, published: true });

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Increment views
        blog.views += 1;
        await blog.save();

        res.json(blog);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blog' });
    }
};

// Admin: Get all blogs (including unpublished)
const getAdminBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find()
            .sort({ createdAt: -1 });

        res.json(blogs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
};

// Admin: Create blog
const createBlog = async (req, res) => {
    try {
        const blogData = {
            ...req.body,
            createdBy: req.user._id,
            author: req.user.name || 'Admin'
        };

        const blog = new Blog(blogData);
        await blog.save();

        res.status(201).json(blog);
    } catch (error) {
        console.error('Create blog error:', error);
        res.status(500).json({ error: error.message || 'Failed to create blog' });
    }
};

// Admin: Update blog
const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json(blog);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update blog' });
    }
};

// Admin: Delete blog
const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete blog' });
    }
};

// Admin: Toggle featured status
const toggleFeatured = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        blog.featured = !blog.featured;
        await blog.save();

        res.json(blog);
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle featured status' });
    }
};

module.exports = {
    getAllBlogs,
    getBlogBySlug,
    getAdminBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    toggleFeatured
};

const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    excerpt: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true,
        default: 'Admin'
    },
    category: {
        type: String,
        required: true,
        enum: ['AI & Technology', 'Guides', 'Tips & Tricks', 'Education', 'Product', 'Writing', 'News']
    },
    tags: [{
        type: String
    }],
    featured: {
        type: Boolean,
        default: false
    },
    published: {
        type: Boolean,
        default: true
    },
    readTime: {
        type: String,
        default: '5 min read'
    },
    views: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Auto-generate slug from title if not provided
blogSchema.pre('save', function (next) {
    if (!this.slug && this.title) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    next();
});

// Calculate reading time based on content length
blogSchema.pre('save', function (next) {
    if (this.content) {
        const wordsPerMinute = 200;
        const wordCount = this.content.split(/\s+/).length;
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        this.readTime = `${minutes} min read`;
    }
    next();
});

module.exports = mongoose.model('Blog', blogSchema);

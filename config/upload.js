const multer = require('multer');
const path = require('path');

// Configure storage for resumes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/resumes/');
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-userId-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const userId = req.user ? req.user._id : 'guest';
        cb(null, `resume-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter - only allow PDF, DOC, DOCX
const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB max file size
    },
    fileFilter: fileFilter
});

module.exports = upload;

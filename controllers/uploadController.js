const fs = require('fs');
const path = require('path');

// Polyfill for DOMMatrix to fix pdf-parse issue in Node environment
if (typeof DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix { };
}
if (typeof Path2D === 'undefined') {
    global.Path2D = class Path2D { };
}


// Lazy load heavier libraries only when needed
// const pdf = require('pdf-parse'); 
// const mammoth = require('mammoth');

exports.extractText = async (req, res) => {
    console.log('📄 File upload request received');

    try {
        if (!req.file) {
            console.log('❌ No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileType = req.file.mimetype;
        const fileName = req.file.originalname;

        console.log(`📁 Processing file: ${fileName}, Type: ${fileType}, Path: ${filePath}`);

        let text = '';

        // Extract based on file type
        if (fileType === 'application/pdf') {
            console.log('📕 Extracting PDF...');
            try {
                // Lazy load pdf-parse
                const pdf = require('pdf-parse');

                const dataBuffer = fs.readFileSync(filePath);
                console.log(`📊 PDF buffer size: ${dataBuffer.length} bytes`);
                const data = await pdf(dataBuffer);
                text = data.text;
                console.log(`✅ PDF extracted: ${text.length} characters`);
            } catch (pdfError) {
                console.error('❌ PDF extraction error:', pdfError.message);
                throw new Error('Failed to parse PDF: ' + pdfError.message);
            }
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            console.log('📘 Extracting DOCX...');
            // Lazy load mammoth
            const mammoth = require('mammoth');

            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
            if (result.messages.length > 0) {
                console.warn('Word extraction warnings:', result.messages);
            }
            console.log(`✅ DOCX extracted: ${text.length} characters`);
        } else if (fileType === 'text/plain' || fileType === 'text/markdown') {
            console.log('📝 Reading text file...');
            text = fs.readFileSync(filePath, 'utf8');
            console.log(`✅ Text file read: ${text.length} characters`);
        } else {
            // Fallback for some text types or error
            if (fileType.startsWith('text/')) {
                text = fs.readFileSync(filePath, 'utf8');
            } else {
                console.log(`❌ Unsupported file type: ${fileType}`);
                return res.status(400).json({ error: 'Unsupported file type' });
            }
        }

        // Clean up the file after extraction
        try {
            fs.unlinkSync(filePath);
            console.log('🗑️ Temp file deleted');
        } catch (err) {
            console.error('Failed to delete uploaded file:', err);
        }

        if (!text || text.trim().length === 0) {
            console.log('❌ Empty text extracted');
            return res.status(400).json({ error: 'Could not extract text from file or file is empty' });
        }

        console.log(`✅ Upload successful: ${fileName}`);
        res.json({
            success: true,
            text: text.trim(),
            fileName: fileName
        });

    } catch (error) {
        console.error('❌ File extraction error:', error.message);
        console.error('Stack:', error.stack);
        // Try to clean up file if it exists
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
};

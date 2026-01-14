
try {
    console.log('Testing requires...');

    console.log('Loading authMiddleware...');
    const authMiddleware = require('./middleware/auth');
    console.log('authMiddleware type:', typeof authMiddleware);

    console.log('Loading plagiarismController...');
    const plagiarismController = require('./controllers/plagiarismController');
    console.log('plagiarismController type:', typeof plagiarismController);
    if (plagiarismController) {
        console.log('checkPlagiarism type:', typeof plagiarismController.checkPlagiarism);
    }

} catch (e) {
    console.error('Error:', e);
}

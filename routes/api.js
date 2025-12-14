const express = require('express');
const router = express.Router();
const plagiarismController = require('../controllers/plagiarismController');
console.log('DEBUG MSG: plagiarismController type:', typeof plagiarismController);
if (plagiarismController) console.log('DEBUG MSG: checkPlagiarism type:', typeof plagiarismController.checkPlagiarism);

const rewriteController = require('../controllers/rewriteController');
const historyController = require('../controllers/historyController');
const authMiddleware = require('../middleware/auth');
console.log('DEBUG MSG: authMiddleware type:', typeof authMiddleware);

const uploadController = require('../controllers/uploadController');
const chatController = require('../controllers/chatController');
const urlController = require('../controllers/urlController'); // New import
const teamController = require('../controllers/teamController'); // New import
const multer = require('multer');
const upload = multer({
    dest: 'uploads/'
});

const grammarController = require('../controllers/grammarController');
const citationController = require('../controllers/citationController');

// Protected routes - require authentication
router.post('/plagiarism/check', authMiddleware, plagiarismController.checkPlagiarism);
router.post('/plagiarism/bulk', authMiddleware, plagiarismController.bulkCheck);
router.get('/plagiarism/bulk/:batchId', authMiddleware, plagiarismController.getBatchStatus);
router.get('/plagiarism/batches', authMiddleware, plagiarismController.getUserBatches);
router.post('/grammar/check', authMiddleware, grammarController.checkGrammarAndStyle);
router.post('/grammar/apply', authMiddleware, grammarController.applyGrammarFixes);
router.post('/rewrite', authMiddleware, rewriteController.rewriteContent);
router.get('/history', authMiddleware, historyController.getHistory);
router.post('/upload', authMiddleware, upload.single('file'), uploadController.extractText);
router.post('/extract-url', authMiddleware, urlController.extractUrl);
router.post('/chat', chatController.chat); // Public - no auth required for help

// Citation Routes
router.post('/citation/generate', authMiddleware, citationController.createCitation);
router.post('/citation/all-formats', authMiddleware, citationController.getAllFormats);
router.post('/citation/extract-metadata', authMiddleware, citationController.extractMetadata);

// Team Routes
router.get('/team', authMiddleware, teamController.getTeam);
router.post('/team/create', authMiddleware, teamController.createTeam);
router.post('/team/join', authMiddleware, teamController.joinTeam);
router.post('/team/leave', authMiddleware, teamController.leaveTeam);

// Team Messaging Routes
const messageController = require('../controllers/messageController');
router.get('/team/messages', authMiddleware, messageController.getMessages);
router.get('/team/messages/search', authMiddleware, messageController.searchMessages); // Search messages
router.post('/team/messages', authMiddleware, messageController.sendMessage);
router.post('/team/messages/read', authMiddleware, messageController.markAsRead);
router.delete('/team/messages/clear-all', authMiddleware, messageController.clearAllMessages);
router.delete('/team/messages/:id', authMiddleware, messageController.deleteMessage);
router.post('/team/messages/:id/react', authMiddleware, messageController.addReaction);
router.post('/team/messages/:id/pin', authMiddleware, messageController.togglePin);
router.get('/team/messages/:id/receipts', authMiddleware, messageController.getReadReceipts);
router.get('/team/messages/:id/replies', authMiddleware, messageController.getReplies); // Get thread replies
router.get('/team/members-list', authMiddleware, messageController.getTeamMembers);

// Team Admin Routes
router.get('/team/settings', authMiddleware, messageController.getTeamSettings);
router.patch('/team/settings', authMiddleware, messageController.updateTeamSettings);
router.patch('/team/members/:memberId/role', authMiddleware, messageController.updateMemberRole);
router.post('/team/members/:memberId/mute', authMiddleware, messageController.muteUnmuteMember);
router.delete('/team/members/:memberId', authMiddleware, messageController.removeMember);
router.get('/team/activity', authMiddleware, messageController.getActivityLog);

// Team History & Analytics Routes
const teamHistoryController = require('../controllers/teamHistoryController');
router.get('/team/history', authMiddleware, teamHistoryController.getTeamHistory);
router.get('/team/history/:id', authMiddleware, teamHistoryController.getSharedHistoryDetails);
router.post('/team/history/:id/share', authMiddleware, teamHistoryController.shareWithTeam);
router.post('/team/history/:id/unshare', authMiddleware, teamHistoryController.unshareFromTeam);
router.post('/team/history/:id/comment', authMiddleware, teamHistoryController.addComment);
router.delete('/team/history/:id/comment/:commentId', authMiddleware, teamHistoryController.deleteComment);
router.get('/team/analytics', authMiddleware, teamHistoryController.getTeamAnalytics);

// Team Tasks Routes
const teamTaskController = require('../controllers/teamTaskController');
router.get('/team/tasks', authMiddleware, teamTaskController.getTasks);
router.post('/team/tasks', authMiddleware, teamTaskController.createTask);
router.patch('/team/tasks/:id', authMiddleware, teamTaskController.updateTask);
router.delete('/team/tasks/:id', authMiddleware, teamTaskController.deleteTask);

// Gamification Route
const { getGamificationStats } = require('../services/gamificationService');
router.get('/gamification/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await getGamificationStats(req.user._id);
        res.json(stats);
    } catch (error) {
        console.error('Gamification stats error:', error);
        res.status(500).json({ error: 'Failed to get gamification stats' });
    }
});

// Feedback Routes (public)
const feedbackController = require('../controllers/feedbackController');
router.get('/feedback', feedbackController.getApprovedFeedbacks); // Public - get approved feedbacks
router.post('/feedback', feedbackController.submitFeedback); // Public - submit feedback

// Admin Feedback Management
const adminMiddleware = require('../middleware/adminAuth');
router.get('/admin/feedbacks', authMiddleware, adminMiddleware, feedbackController.getAllFeedbacks);
router.patch('/admin/feedbacks/:id', authMiddleware, adminMiddleware, feedbackController.updateFeedbackStatus);
router.delete('/admin/feedbacks/:id', authMiddleware, adminMiddleware, feedbackController.deleteFeedback);

// Promotional banner (public)
const { getActivePromo } = require('../controllers/promoSettingsController');
router.get('/promo-settings/active', getActivePromo);

// Dictionary Route
const dictionaryController = require('../controllers/dictionaryController');
router.post('/dictionary/lookup', authMiddleware, dictionaryController.lookupDictionary);

// AI Content Writer - Mode-based content generation
const contentController = require('../controllers/contentController');
router.post('/content/generate', authMiddleware, contentController.generateContent);

// Writer Intelligence Routes
const writerIntelligenceController = require('../controllers/writerIntelligenceController');
router.post('/writer/analyze-topic', authMiddleware, writerIntelligenceController.analyzeTopic);
router.post('/writer/suggest-titles', authMiddleware, writerIntelligenceController.generateTitles);
router.post('/writer/suggest-angles', authMiddleware, writerIntelligenceController.suggestAngles);
router.post('/writer/build-research', authMiddleware, writerIntelligenceController.buildResearchFramework);
router.post('/writer/refine-content', authMiddleware, writerIntelligenceController.refineContent);

// Writer History Route (save generated content)
const writerHistoryController = require('../controllers/writerHistoryController');
router.post('/writer/save-to-history', authMiddleware, writerHistoryController.saveToHistory);

// Explainability Route (sentence-level AI explanation)
const explainabilityController = require('../controllers/explainabilityController');
router.post('/explainability/analyze', authMiddleware, explainabilityController.explainSentences);

// Supervisor Feedback Route (academic grading and feedback)
const supervisorController = require('../controllers/supervisorController');
router.post('/supervisor/feedback', authMiddleware, supervisorController.getSupervisorFeedback);

module.exports = router;



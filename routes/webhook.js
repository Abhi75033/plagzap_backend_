const express = require('express');
const router = express.Router();
const { getWebhooks, createWebhook, deleteWebhook, testWebhook } = require('../controllers/webhookController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/', getWebhooks);
router.post('/', createWebhook);
router.delete('/:id', deleteWebhook);
router.post('/:id/test', testWebhook);

module.exports = router;

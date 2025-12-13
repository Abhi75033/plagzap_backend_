const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const meetingController = require('../controllers/meetingController');

// All routes require authentication
router.use(auth);

// Create a new meeting
router.post('/create', meetingController.createMeeting);

// Get meeting details
router.get('/:code', meetingController.getMeeting);

// Join a meeting (validate access)
router.post('/:code/join', meetingController.joinMeeting);

// End a meeting (host only)
router.post('/:code/end', meetingController.endMeeting);

// Get user's meetings
router.get('/user/my-meetings', meetingController.getUserMeetings);

module.exports = router;

const express = require('express');
const router = express.Router();
const { uploadPoster, deletePoster } = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/auth');

router.post('/poster', protect, authorize('organizer', 'admin'), uploadPoster);
router.delete('/poster/:fileName', protect, deletePoster);

module.exports = router;

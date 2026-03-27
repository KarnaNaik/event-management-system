const express = require('express');
const router = express.Router();
const {
  checkIn,
  verifyTicket,
  getCheckInStats
} = require('../controllers/checkinController');
const { protect } = require('../middleware/auth');

router.post('/scan', protect, checkIn);
router.post('/verify', protect, verifyTicket);
router.get('/stats/:eventId', protect, getCheckInStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  bookTicket,
  getMyTickets,
  getTicket,
  getEventTickets,
  cancelTicket
} = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

router.post('/book', protect, bookTicket);
router.get('/my-tickets', protect, getMyTickets);
router.get('/event/:eventId', protect, getEventTickets);
router.get('/:id', protect, getTicket);
router.put('/:id/cancel', protect, cancelTicket);

module.exports = router;

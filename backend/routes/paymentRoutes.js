const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  createManualPayment,
  getPayment,
  getMyPayments,
  processRefund
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.post('/create-intent', protect, createPaymentIntent);
router.post('/confirm/:paymentId', protect, confirmPayment);
router.post('/manual', protect, createManualPayment);
router.get('/my-payments', protect, getMyPayments);
router.get('/:id', protect, getPayment);
router.post('/:id/refund', protect, authorize('admin'), processRefund);

module.exports = router;

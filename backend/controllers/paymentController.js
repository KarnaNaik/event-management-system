const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const stripe = require('../config/stripe');

const isValidUpiTransactionId = (value) => /^[A-Za-z0-9]{12,30}$/.test(String(value || '').trim());

// @desc    Create payment intent (Stripe)
// @route   POST /api/payments/create-intent
// @access  Private
exports.createPaymentIntent = async (req, res) => {
  try {
    const { ticketId, billingDetails } = req.body;
    
    const ticket = await Ticket.findById(ticketId).populate('event');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(ticket.totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        ticketId: ticket._id.toString(),
        eventId: ticket.event._id.toString(),
        userId: req.user.id
      }
    });
    
    // Create payment record
    const payment = await Payment.create({
      user: req.user.id,
      ticket: ticketId,
      event: ticket.event._id,
      amount: ticket.totalAmount,
      paymentMethod: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      billingDetails,
      transactionId: paymentIntent.id
    });
    
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/confirm/:paymentId
// @access  Private
exports.confirmPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    payment.paymentStatus = 'completed';
    await payment.save();
    
    // Update ticket payment status
    const ticket = await Ticket.findById(payment.ticket);
    if (ticket) {
      ticket.paymentStatus = 'completed';
      ticket.paymentId = payment._id;
      await ticket.save();
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create manual payment
// @route   POST /api/payments/manual
// @access  Private
exports.createManualPayment = async (req, res) => {
  try {
    const { ticketId, paymentMethod, billingDetails, transactionId, instantConfirm } = req.body;
    
    const ticket = await Ticket.findById(ticketId).populate('event');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    const normalizedPaymentMethod = ['manual', 'cash', 'bank_transfer', 'upi'].includes(paymentMethod)
      ? paymentMethod
      : 'manual';

    if (normalizedPaymentMethod === 'upi') {
      if (!transactionId || !isValidUpiTransactionId(transactionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid UPI transaction ID format. Use 12-30 alphanumeric characters.'
        });
      }
    }

    const isInstantPayment = Boolean(instantConfirm);
    const resolvedPaymentStatus = isInstantPayment ? 'completed' : 'pending';

    // Create payment record
    const payment = await Payment.create({
      user: req.user.id,
      ticket: ticketId,
      event: ticket.event._id,
      amount: ticket.totalAmount,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: resolvedPaymentStatus,
      billingDetails,
      transactionId: transactionId || `MAN-${Date.now()}`
    });
    
    // In realtime mode, ticket is activated immediately after successful payment capture.
    ticket.paymentStatus = resolvedPaymentStatus;
    ticket.paymentId = payment._id;
    await ticket.save();
    
    res.status(201).json({
      success: true,
      message: isInstantPayment
        ? 'Payment completed and ticket issued successfully'
        : 'Payment submitted and pending admin approval',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('event', 'title')
      .populate('ticket');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check authorization
    if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user payments
// @route   GET /api/payments/my-payments
// @access  Private
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('event', 'title')
      .populate('ticket')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Process refund
// @route   POST /api/payments/:id/refund
// @access  Private (Admin)
exports.processRefund = async (req, res) => {
  try {
    const { refundReason } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment already refunded'
      });
    }
    
    // Process Stripe refund if payment was via Stripe
    if (payment.paymentMethod === 'stripe' && payment.stripePaymentIntentId) {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId
      });
    }
    
    payment.paymentStatus = 'refunded';
    payment.refundAmount = payment.amount;
    payment.refundReason = refundReason;
    await payment.save();
    
    // Update ticket status
    const ticket = await Ticket.findById(payment.ticket);
    if (ticket) {
      ticket.status = 'refunded';
      ticket.paymentStatus = 'refunded';
      await ticket.save();
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

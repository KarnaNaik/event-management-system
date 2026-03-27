const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const AdminLog = require('../models/AdminLog');
const { protect } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const auditAdminAction = require('../middleware/auditAdminAction');
const { logAdminAction } = require('../utils/auditLog');

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/users', [protect, adminAuth, auditAdminAction('view_users')], async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user (admin only)
// @access  Private/Admin
router.delete('/users/:id', [protect, adminAuth], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete yourself' });
    }

    await User.findByIdAndDelete(req.params.id);

    // Log the deletion
    await logAdminAction(req, 'delete_user', {
      resource: 'user',
      resourceId: req.params.id,
      details: {
        deletedUser: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/tickets
// @desc    Get all tickets (admin only)
// @access  Private/Admin
router.get('/tickets', [protect, adminAuth, auditAdminAction('view_tickets')], async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'name email')
      .populate('event', 'title date location')
      .populate('paymentId', 'paymentMethod paymentStatus transactionId createdAt')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/ticket-payments
// @desc    Get ticket payments (admin only)
// @access  Private/Admin
router.get('/ticket-payments', [protect, adminAuth, auditAdminAction('view_payments')], async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const filter = status === 'all' ? {} : { paymentStatus: status };

    const payments = await Payment.find(filter)
      .populate('user', 'name email')
      .populate('event', 'title startDate')
      .populate('ticket', 'ticketNumber quantity totalAmount status paymentStatus')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching ticket payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/ticket-payments/:paymentId
// @desc    Approve or reject ticket payment (admin only)
// @access  Private/Admin
router.put('/ticket-payments/:paymentId', [protect, adminAuth], async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Only pending payments can be reviewed' });
    }

    const ticket = await Ticket.findById(payment.ticket);
    if (!ticket) {
      return res.status(404).json({ message: 'Linked ticket not found' });
    }

    payment.paymentStatus = action === 'approve' ? 'completed' : 'failed';
    payment.reviewedBy = req.user.id;
    payment.reviewedAt = new Date();
    payment.reviewNote = note || '';
    await payment.save();

    if (action === 'approve') {
      ticket.paymentStatus = 'completed';
      ticket.paymentId = payment._id;
      await ticket.save();
    } else {
      ticket.paymentStatus = 'failed';
      ticket.status = 'cancelled';
      await ticket.save();

      const event = await Event.findById(ticket.event);
      if (event) {
        event.currentAttendees = Math.max(0, (event.currentAttendees || 0) - (ticket.quantity || 0));
        const matchingType = (event.ticketTypes || []).find((tt) => tt.name === ticket.ticketType?.name);
        if (matchingType) {
          matchingType.sold = Math.max(0, (matchingType.sold || 0) - (ticket.quantity || 0));
        }
        await event.save();
      }
    }

    // Log payment action
    const actionType = action === 'approve' ? 'approve_payment' : 'reject_payment';
    await logAdminAction(req, actionType, {
      resource: 'payment',
      resourceId: req.params.paymentId,
      details: {
        action,
        note,
        ticketId: payment.ticket,
        userId: payment.user
      }
    });

    return res.json({
      message: action === 'approve' ? 'Payment approved and ticket activated' : 'Payment rejected and ticket cancelled'
    });
  } catch (error) {
    console.error('Error reviewing ticket payment:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get system statistics (admin only)
// @access  Private/Admin
router.get('/stats', [protect, adminAuth, auditAdminAction('view_stats')], async (req, res) => {
  try {
    const [userCount, eventCount, ticketCount] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Ticket.countDocuments()
    ]);

    const revenueResult = await Ticket.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalUsers: userCount,
      totalEvents: eventCount,
      totalTickets: ticketCount,
      totalRevenue: revenueResult.length > 0 ? revenueResult[0].total : 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/verify-payment/:userId
// @desc    Verify user's payment details (admin only)
// @access  Private/Admin
router.put('/verify-payment/:userId', [protect, adminAuth], async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.paymentDetails) {
      return res.status(400).json({ message: 'No payment details to verify' });
    }

    user.paymentDetails.verified = true;
    await user.save();

    // Log payment verification
    await logAdminAction(req, 'verify_payment', {
      resource: 'user',
      resourceId: req.params.userId,
      details: {
        verifiedUser: {
          id: user._id,
          name: user.name,
          email: user.email,
          accountHolder: user.paymentDetails.accountHolderName
        }
      }
    });

    res.json({ message: 'Payment details verified successfully', user });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/pending-verifications
// @desc    Get users with unverified payment details
// @access  Private/Admin
router.get('/pending-verifications', [protect, adminAuth, auditAdminAction('view_pending_verifications')], async (req, res) => {
  try {
    const users = await User.find({
      'paymentDetails.verified': false,
      'paymentDetails': { $exists: true, $ne: null }
    }).select('-password');
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/logs
// @desc    Get admin audit logs (admin only)
// @access  Private/Admin
router.get('/logs', [protect, adminAuth, auditAdminAction('view_logs')], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const action = req.query.action || null;
    const adminEmail = req.query.adminEmail || null;

    let filter = {};
    if (action) filter.action = action;
    if (adminEmail) filter.adminEmail = adminEmail.toLowerCase();

    const logs = await AdminLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    const total = await AdminLog.countDocuments(filter);

    res.json({
      logs,
      total,
      limit,
      skip
    });
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

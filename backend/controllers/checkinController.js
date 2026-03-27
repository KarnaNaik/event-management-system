const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

const canManageEventCheckIn = (event, req) => {
  const userId = req.user.id || req.user._id?.toString();
  if (req.user.role === 'admin' || event.organizer.toString() === userId) {
    return true;
  }

  return (event.collaborators || []).some(
    (entry) => entry.user.toString() === userId && ['admin', 'manager', 'volunteer', 'co_organizer'].includes(entry.role)
  );
};

// @desc    Check-in with QR code
// @route   POST /api/checkin/scan
// @access  Private (Organizer/Admin)
exports.checkIn = async (req, res) => {
  try {
    const { ticketNumber, eventId } = req.body;
    
    // Find the ticket
    const ticket = await Ticket.findOne({ ticketNumber })
      .populate('event')
      .populate('user', 'name email');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Verify event matches
    if (ticket.event._id.toString() !== eventId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket is not for this event'
      });
    }
    
    // Check if ticket is active
    if (ticket.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Ticket is ${ticket.status}`
      });
    }
    
    // Check if payment is completed
    if (ticket.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed for this ticket'
      });
    }
    
    // Check if already checked in
    if (ticket.checkInStatus) {
      return res.status(400).json({
        success: false,
        message: 'Ticket already checked in',
        checkInTime: ticket.checkInTime
      });
    }
    
    // Verify organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event associated with this ticket was not found'
      });
    }

    if (!canManageEventCheckIn(event, req)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to check-in for this event'
      });
    }
    
    // Mark as checked in
    ticket.checkInStatus = true;
    ticket.checkInTime = new Date();
    ticket.status = 'used';
    await ticket.save();
    
    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: {
        ticket: ticket,
        attendee: {
          name: ticket.attendeeInfo.name || ticket.user.name,
          email: ticket.attendeeInfo.email || ticket.user.email
        },
        checkInTime: ticket.checkInTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify ticket (without checking in)
// @route   POST /api/checkin/verify
// @access  Private (Organizer/Admin)
exports.verifyTicket = async (req, res) => {
  try {
    const { ticketNumber, eventId } = req.body;
    
    const ticket = await Ticket.findOne({ ticketNumber })
      .populate('event', 'title startDate endDate')
      .populate('user', 'name email');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Verify event
    if (ticket.event._id.toString() !== eventId) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Ticket is not for this event'
      });
    }

    const event = await Event.findById(eventId);
    if (!event || !canManageEventCheckIn(event, req)) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'Not authorized to verify ticket for this event'
      });
    }
    
    // Check ticket validity
    const isValid = 
      ticket.status === 'active' && 
      ticket.paymentStatus === 'completed' &&
      !ticket.checkInStatus;
    
    res.status(200).json({
      success: true,
      valid: isValid,
      data: {
        ticketNumber: ticket.ticketNumber,
        event: ticket.event.title,
        attendee: ticket.attendeeInfo.name || ticket.user.name,
        ticketType: ticket.ticketType.name,
        quantity: ticket.quantity,
        status: ticket.status,
        checkInStatus: ticket.checkInStatus,
        checkInTime: ticket.checkInTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get check-in statistics for an event
// @route   GET /api/checkin/stats/:eventId
// @access  Private (Organizer/Admin)
exports.getCheckInStats = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Verify organizer
    if (!canManageEventCheckIn(event, req)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const totalTickets = await Ticket.countDocuments({ event: req.params.eventId });
    const checkedIn = await Ticket.countDocuments({ 
      event: req.params.eventId, 
      checkInStatus: true 
    });
    const pending = totalTickets - checkedIn;
    
    const recentCheckIns = await Ticket.find({ 
      event: req.params.eventId, 
      checkInStatus: true 
    })
      .populate('user', 'name email')
      .sort({ checkInTime: -1 })
      .limit(10);
    
    res.status(200).json({
      success: true,
      data: {
        totalTickets,
        checkedIn,
        pending,
        checkInRate: totalTickets > 0 ? ((checkedIn / totalTickets) * 100).toFixed(2) : 0,
        recentCheckIns
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

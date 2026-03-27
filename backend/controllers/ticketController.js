const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const QRCode = require('qrcode');

const canManageAttendees = (event, req) => {
  const userId = req.user.id || req.user._id?.toString();
  if (req.user.role === 'admin' || event.organizer.toString() === userId) {
    return true;
  }

  return (event.collaborators || []).some((entry) => {
    const collaboratorUserId = entry.user.toString();
    return collaboratorUserId === userId && ['admin', 'manager', 'co_organizer'].includes(entry.role);
  });
};

// @desc    Book a ticket
// @route   POST /api/tickets/book
// @access  Private
exports.bookTicket = async (req, res) => {
  try {
    const { eventId, ticketTypeIndex, quantity, attendeeInfo } = req.body;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if event is published
    if (event.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Event is not available for booking'
      });
    }

    // Respect organizer registration controls
    if (event.registrationSettings?.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Registration is currently closed for this event'
      });
    }

    if (event.registrationSettings?.closeAt && new Date() > new Date(event.registrationSettings.closeAt)) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    if (event.currentAttendees + quantity > event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'Attendee limit reached for this event'
      });
    }
    
    // Get ticket type
    const ticketType = event.ticketTypes[ticketTypeIndex];
    if (!ticketType) {
      return res.status(404).json({
        success: false,
        message: 'Ticket type not found'
      });
    }
    
    // Check availability
    if (ticketType.sold + quantity > ticketType.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough tickets available'
      });
    }
    
    // Calculate total amount
    const totalAmount = ticketType.price * quantity;
    
    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Generate QR code data
    const qrData = JSON.stringify({
      ticketNumber,
      eventId: eventId,
      userId: req.user.id,
      quantity: quantity
    });
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(qrData);
    
    // Create ticket
    const ticket = await Ticket.create({
      ticketNumber,
      event: eventId,
      user: req.user.id,
      ticketType: {
        name: ticketType.name,
        price: ticketType.price
      },
      quantity,
      totalAmount,
      paymentStatus: totalAmount <= 0 || event.paymentOptions?.isFreeEvent ? 'completed' : 'pending',
      qrCode,
      attendeeInfo: attendeeInfo || {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      }
    });
    
    // Update event ticket sold count
    event.ticketTypes[ticketTypeIndex].sold += quantity;
    event.currentAttendees += quantity;
    await event.save();
    
    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all tickets for a user
// @route   GET /api/tickets/my-tickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id })
      .populate('event', 'title startDate endDate venue')
      .populate('paymentId', 'paymentMethod paymentStatus transactionId createdAt')
      .sort({ purchaseDate: -1 });
    
    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('event')
      .populate('user', 'name email phone');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Make sure user owns the ticket or is admin
    if (ticket.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view this ticket'
      });
    }
    
    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get tickets for an event
// @route   GET /api/tickets/event/:eventId
// @access  Private (Organizer/Admin)
exports.getEventTickets = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Owner, admin and manager collaborators can view attendees
    if (!canManageAttendees(event, req)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view tickets for this event'
      });
    }
    
    const tickets = await Ticket.find({ event: req.params.eventId })
      .populate('user', 'name email phone')
      .populate('paymentId', 'paymentMethod paymentStatus transactionId createdAt')
      .sort({ purchaseDate: -1 });
    
    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel ticket
// @route   PUT /api/tickets/:id/cancel
// @access  Private
exports.cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Check if user owns ticket
    if (ticket.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to cancel this ticket'
      });
    }
    
    // Check if ticket is already used
    if (ticket.checkInStatus) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a used ticket'
      });
    }
    
    ticket.status = 'cancelled';
    await ticket.save();
    
    // Update event attendee count
    const event = await Event.findById(ticket.event);
    event.currentAttendees -= ticket.quantity;
    
    // Find the ticket type and reduce sold count
    const ticketType = event.ticketTypes.find(tt => tt.name === ticket.ticketType.name);
    if (ticketType) {
      ticketType.sold -= ticket.quantity;
    }
    
    await event.save();
    
    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

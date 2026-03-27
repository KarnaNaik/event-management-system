const Event = require('../models/Event');
const User = require('../models/User');

const getUserId = (req) => req.user.id || req.user._id?.toString();

const getCollaboratorRole = (event, userId) => {
  const collaborator = (event.collaborators || []).find(
    (entry) => entry.user.toString() === userId
  );
  return collaborator?.role;
};

const normalizeCollaboratorRole = (role) => {
  const validRoles = ['admin', 'manager', 'volunteer', 'viewer', 'co_organizer'];
  return validRoles.includes(role) ? role : 'viewer';
};

const isEventAdminRole = (role) => ['admin', 'co_organizer'].includes(role);

const canEditEvent = (event, req) => {
  const userId = getUserId(req);
  if (req.user.role === 'admin' || event.organizer.toString() === userId) {
    return true;
  }

  return isEventAdminRole(getCollaboratorRole(event, userId));
};

const canManageCollaborators = (event, req) => {
  const userId = getUserId(req);
  if (req.user.role === 'admin' || event.organizer.toString() === userId) {
    return true;
  }

  return isEventAdminRole(getCollaboratorRole(event, userId));
};

const snapshotEvent = (event) => ({
  title: event.title,
  description: event.description,
  category: event.category,
  visibility: event.visibility,
  eventFormat: event.eventFormat,
  onlineLink: event.onlineLink,
  theme: event.theme,
  ageRestriction: event.ageRestriction,
  registrationSettings: event.registrationSettings,
  paymentOptions: event.paymentOptions,
  venue: event.venue,
  startDate: event.startDate,
  endDate: event.endDate,
  ticketTypes: event.ticketTypes,
  status: event.status,
  maxAttendees: event.maxAttendees,
  hosts: event.hosts,
  coHosts: event.coHosts,
  speakers: event.speakers,
  posterUrl: event.posterUrl,
  posterPublicId: event.posterPublicId
});

const pushHistorySnapshot = (event, req, note) => {
  if (!event.editHistory) {
    event.editHistory = [];
  }

  event.editHistory.unshift({
    changedBy: getUserId(req),
    note,
    snapshot: snapshotEvent(event)
  });

  if (event.editHistory.length > 20) {
    event.editHistory = event.editHistory.slice(0, 20);
  }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Organizer/Admin)
exports.createEvent = async (req, res) => {
  try {
    req.body.organizer = req.user.id;
    
    const event = await Event.create(req.body);
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const { category, status, search, startDate, endDate } = req.query;
    
    let query = {};
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      // By default, only show published events
      query.status = 'published';
    }
    
    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }
    
    const events = await Event.find(query)
      .populate('organizer', 'name email profile')
      .sort({ startDate: 1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email phone profile')
      .populate('collaborators.user', 'name email role');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer/Admin)
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Organizer, admin, and co-organizer collaborators can edit
    if (!canEditEvent(event, req)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }
    
    pushHistorySnapshot(event, req, req.body?.editNote || 'Event updated');

    const payload = { ...req.body };
    delete payload.editNote;

    Object.assign(event, payload);
    await event.save();
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get event edit history
// @route   GET /api/events/:id/history
// @access  Private (Owner/Admin/Event Admin role)
exports.getEventHistory = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('editHistory.changedBy', 'name email');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!canEditEvent(event, req)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view event history' });
    }

    return res.status(200).json({
      success: true,
      count: (event.editHistory || []).length,
      data: event.editHistory || []
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Restore event from history snapshot
// @route   POST /api/events/:id/history/:historyId/restore
// @access  Private (Owner/Admin/Event Admin role)
exports.restoreEventVersion = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!canEditEvent(event, req)) {
      return res.status(403).json({ success: false, message: 'Not authorized to restore event version' });
    }

    const historyEntry = (event.editHistory || []).id(req.params.historyId);
    if (!historyEntry || !historyEntry.snapshot) {
      return res.status(404).json({ success: false, message: 'History version not found' });
    }

    pushHistorySnapshot(event, req, 'Restored previous version');
    Object.assign(event, historyEntry.snapshot);
    await event.save();

    return res.status(200).json({ success: true, data: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer/Admin)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Only organizer or admin can delete events
    if (!canManageCollaborators(event, req)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }
    
    await event.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get events by organizer
// @route   GET /api/events/organizer/:userId
// @access  Public
exports.getEventsByOrganizer = async (req, res) => {
  try {
    const events = await Event.find({
      $or: [
        { organizer: req.params.userId },
        { 'collaborators.user': req.params.userId }
      ]
    })
      .populate('organizer', 'name email')
      .populate('collaborators.user', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add collaborator to event
// @route   POST /api/events/:id/collaborators
// @access  Private (Organizer/Admin)
exports.addCollaborator = async (req, res) => {
  try {
    const { email, role } = req.body;
    const normalizedRole = normalizeCollaboratorRole(role);

    const event = await Event.findById(req.params.id).populate('collaborators.user', 'name email role');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!canManageCollaborators(event, req)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage collaborators' });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Collaborator email is required' });
    }

    const collaboratorUser = await User.findOne({ email: email.toLowerCase() });
    if (!collaboratorUser) {
      return res.status(404).json({ success: false, message: 'User with this email was not found' });
    }

    if (event.organizer.toString() === collaboratorUser._id.toString()) {
      return res.status(400).json({ success: false, message: 'Event organizer is already the primary owner' });
    }

    const exists = event.collaborators.some(
      (entry) => entry.user.toString() === collaboratorUser._id.toString()
    );

    if (exists) {
      return res.status(400).json({ success: false, message: 'Collaborator already added' });
    }

    event.collaborators.push({
      user: collaboratorUser._id,
      role: normalizedRole,
      addedBy: getUserId(req)
    });

    await event.save();

    const updatedEvent = await Event.findById(event._id).populate('collaborators.user', 'name email role');
    return res.status(200).json({ success: true, data: updatedEvent.collaborators });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update collaborator role
// @route   PATCH /api/events/:id/collaborators/:collaboratorId
// @access  Private (Organizer/Admin)
exports.updateCollaboratorRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'manager', 'volunteer', 'viewer', 'co_organizer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be admin, manager, volunteer, or viewer' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!canManageCollaborators(event, req)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage collaborators' });
    }

    const collaborator = event.collaborators.id(req.params.collaboratorId);
    if (!collaborator) {
      return res.status(404).json({ success: false, message: 'Collaborator not found' });
    }

    collaborator.role = role;
    await event.save();

    const updatedEvent = await Event.findById(event._id).populate('collaborators.user', 'name email role');
    return res.status(200).json({ success: true, data: updatedEvent.collaborators });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove collaborator
// @route   DELETE /api/events/:id/collaborators/:collaboratorId
// @access  Private (Organizer/Admin)
exports.removeCollaborator = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!canManageCollaborators(event, req)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage collaborators' });
    }

    const collaborator = event.collaborators.id(req.params.collaboratorId);
    if (!collaborator) {
      return res.status(404).json({ success: false, message: 'Collaborator not found' });
    }

    collaborator.deleteOne();
    await event.save();

    const updatedEvent = await Event.findById(event._id).populate('collaborators.user', 'name email role');
    return res.status(200).json({ success: true, data: updatedEvent.collaborators });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getEventsByOrganizer,
  addCollaborator,
  updateCollaboratorRole,
  removeCollaborator,
  getEventHistory,
  restoreEventVersion
} = require('../controllers/eventController');
const { validateEventCreation } = require('../middleware/eventValidation');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(getEvents)
  .post(protect, authorize('organizer', 'admin'), validateEventCreation, createEvent);

router.get('/organizer/:userId', getEventsByOrganizer);

router.route('/:id')
  .get(getEvent)
  .put(protect, updateEvent)
  .delete(protect, deleteEvent);

router.route('/:id/collaborators')
  .post(protect, addCollaborator);

router.route('/:id/collaborators/:collaboratorId')
  .patch(protect, updateCollaboratorRole)
  .delete(protect, removeCollaborator);

router.get('/:id/history', protect, getEventHistory);
router.post('/:id/history/:historyId/restore', protect, restoreEventVersion);

module.exports = router;

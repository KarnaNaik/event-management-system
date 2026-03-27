import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  API_ORIGIN,
  addCollaborator,
  deleteEvent,
  getEvent,
  getEventHistory,
  getEventTickets,
  removeCollaborator,
  restoreEventHistory,
  updateCollaboratorRole,
  updateEvent
} from '../api/api';

const toInputDateTime = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '');

const buildEditForm = (eventData) => ({
  title: eventData.title || '',
  description: eventData.description || '',
  category: eventData.category || 'other',
  visibility: eventData.visibility || 'public',
  eventFormat: eventData.eventFormat || 'offline',
  onlineLink: eventData.onlineLink || '',
  theme: eventData.theme || 'minimal',
  startDate: toInputDateTime(eventData.startDate),
  endDate: toInputDateTime(eventData.endDate),
  maxAttendees: eventData.maxAttendees || 1,
  status: eventData.status || 'draft',
  registrationSettings: {
    isClosed: eventData.registrationSettings?.isClosed || false,
    closeAt: toInputDateTime(eventData.registrationSettings?.closeAt),
    approvalMode: eventData.registrationSettings?.approvalMode || 'auto'
  },
  paymentOptions: {
    isFreeEvent: eventData.paymentOptions?.isFreeEvent || false,
    upiQrEnabled: eventData.paymentOptions?.upiQrEnabled ?? true,
    cardEnabled: eventData.paymentOptions?.cardEnabled ?? true,
    bankTransferEnabled: eventData.paymentOptions?.bankTransferEnabled || false,
    allowPartialPayment: eventData.paymentOptions?.allowPartialPayment || false,
    donationEnabled: eventData.paymentOptions?.donationEnabled || false
  }
});

function EventDetails({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const [isEditMode, setIsEditMode] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('viewer');
  const [collaboratorMessage, setCollaboratorMessage] = useState('');
  const [savingCollaborator, setSavingCollaborator] = useState(false);

  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState('');
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [quickActionMessage, setQuickActionMessage] = useState('');
  const [runningQuickAction, setRunningQuickAction] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getEvent(id);
      setEvent(response.data.data);
      setEditForm(buildEditForm(response.data.data));
    } catch (_err) {
      setError('Error loading event details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const refreshEvent = async () => {
    const response = await getEvent(id);
    setEvent(response.data.data);
    setEditForm(buildEditForm(response.data.data));
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (error || !event) {
    return (
      <div className="page">
        <div className="container">
          <div className="alert alert-error">{error || 'Event not found'}</div>
        </div>
      </div>
    );
  }

  const currentUserId = user?.id || user?._id;
  const isAdmin = user?.role === 'admin';
  const isOwner = Boolean(currentUserId && String(event.organizer?._id) === String(currentUserId));
  const currentCollaborator = (event.collaborators || []).find(
    (entry) => entry.user?._id && String(entry.user._id) === String(currentUserId)
  );
  const collaboratorRoleValue = currentCollaborator?.role;

  const canEditEventSettings = isOwner || isAdmin || ['admin', 'co_organizer'].includes(collaboratorRoleValue);
  const canManageCollaborators = isOwner || isAdmin || ['admin', 'co_organizer'].includes(collaboratorRoleValue);
  const canManageAttendees = isOwner || isAdmin || ['admin', 'manager', 'co_organizer'].includes(collaboratorRoleValue);
  const canAccessCheckIn = isOwner || isAdmin || ['admin', 'manager', 'volunteer', 'co_organizer'].includes(collaboratorRoleValue);

  const roleLabel = (role) => {
    if (role === 'admin' || role === 'co_organizer') return 'Admin';
    if (role === 'manager') return 'Manager';
    if (role === 'volunteer') return 'Volunteer';
    return 'Viewer';
  };

  const formatPreviewValue = (field, value) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (field === 'startDate' || field === 'endDate') {
      try {
        return new Date(value).toLocaleString();
      } catch (_err) {
        return String(value);
      }
    }

    return String(value);
  };

  const getHistoryDiff = (snapshot) => {
    if (!snapshot || !event) {
      return [];
    }

    const mapping = [
      { label: 'Title', field: 'title' },
      { label: 'Status', field: 'status' },
      { label: 'Visibility', field: 'visibility' },
      { label: 'Theme', field: 'theme' },
      { label: 'Start', field: 'startDate' },
      { label: 'End', field: 'endDate' },
      { label: 'Max Attendees', field: 'maxAttendees' }
    ];

    return mapping
      .map((item) => {
        const oldValue = snapshot[item.field];
        const newValue = event[item.field];
        return {
          label: item.label,
          oldValue: formatPreviewValue(item.field, oldValue),
          newValue: formatPreviewValue(item.field, newValue),
          changed: String(oldValue ?? '') !== String(newValue ?? '')
        };
      })
      .filter((entry) => entry.changed);
  };

  const contributors = [
    event.organizer?.name ? { name: event.organizer.name, role: 'Owner' } : null,
    ...((event.collaborators || []).map((entry) => ({
      name: entry.user?.name,
      role: roleLabel(entry.role)
    }))),
    ...(event.hosts || []).map((host) => ({ name: host.name, role: host.role || 'Host' })),
    ...(event.coHosts || []).map((coHost) => ({ name: coHost.name, role: 'Co-Host' })),
    ...(event.speakers || []).map((speaker) => ({ name: speaker.name, role: 'Speaker' }))
  ].filter((item) => item && item.name);

  const shareUrl = `${window.location.origin}/events/${event._id}`;
  const defaultShareText = `Hey! Join this event ${event.title} on ${new Date(event.startDate).toLocaleDateString()}.`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage('Event link copied to clipboard');
    } catch (_err) {
      setShareMessage('Unable to copy automatically. Please copy from browser URL.');
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('registrationSettings.')) {
      const field = name.split('.')[1];
      setEditForm((prev) => ({
        ...prev,
        registrationSettings: {
          ...prev.registrationSettings,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
      return;
    }
    if (name.startsWith('paymentOptions.')) {
      const field = name.split('.')[1];
      setEditForm((prev) => ({
        ...prev,
        paymentOptions: {
          ...prev.paymentOptions,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
      return;
    }
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (event.currentAttendees > 0) {
      const confirmProceed = window.confirm('This event already has registered attendees. Changes may affect attendees. Continue?');
      if (!confirmProceed) {
        return;
      }
    }

    setSavingEvent(true);
    setEditMessage('');
    try {
      const payload = {
        ...editForm,
        maxAttendees: Number(editForm.maxAttendees),
        registrationSettings: {
          ...editForm.registrationSettings,
          closeAt: editForm.registrationSettings.closeAt || null
        }
      };
      await updateEvent(event._id, payload);
      setEditMessage('Event updated successfully');
      setIsEditMode(false);
      await refreshEvent();
    } catch (apiError) {
      setEditMessage(apiError.response?.data?.message || 'Failed to update event');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!collaboratorEmail.trim()) {
      setCollaboratorMessage('Please enter collaborator email');
      return;
    }
    setSavingCollaborator(true);
    setCollaboratorMessage('');
    try {
      await addCollaborator(event._id, { email: collaboratorEmail.trim(), role: collaboratorRole });
      setCollaboratorEmail('');
      setCollaboratorRole('viewer');
      setCollaboratorMessage('Contributor added');
      await refreshEvent();
    } catch (apiError) {
      setCollaboratorMessage(apiError.response?.data?.message || 'Failed to add contributor');
    } finally {
      setSavingCollaborator(false);
    }
  };

  const handleCollaboratorRoleChange = async (collaboratorId, role) => {
    setSavingCollaborator(true);
    setCollaboratorMessage('');
    try {
      await updateCollaboratorRole(event._id, collaboratorId, { role });
      setCollaboratorMessage('Contributor role updated');
      await refreshEvent();
    } catch (apiError) {
      setCollaboratorMessage(apiError.response?.data?.message || 'Failed to update contributor role');
    } finally {
      setSavingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    setSavingCollaborator(true);
    setCollaboratorMessage('');
    try {
      await removeCollaborator(event._id, collaboratorId);
      setCollaboratorMessage('Contributor removed');
      await refreshEvent();
    } catch (apiError) {
      setCollaboratorMessage(apiError.response?.data?.message || 'Failed to remove contributor');
    } finally {
      setSavingCollaborator(false);
    }
  };

  const loadAttendees = async () => {
    setAttendeesLoading(true);
    setAttendeesError('');
    try {
      const response = await getEventTickets(event._id);
      setAttendees(response.data.data || []);
    } catch (apiError) {
      setAttendeesError(apiError.response?.data?.message || 'Failed to load attendees');
    } finally {
      setAttendeesLoading(false);
    }
  };

  const exportAttendeesCsv = () => {
    if (!attendees.length) return;
    const headers = ['Ticket Number', 'Name', 'Email', 'Phone', 'Quantity', 'Payment Status', 'Check-in Status'];
    const rows = attendees.map((ticket) => [
      ticket.ticketNumber,
      ticket.attendeeInfo?.name || ticket.user?.name || '',
      ticket.attendeeInfo?.email || ticket.user?.email || '',
      ticket.attendeeInfo?.phone || ticket.user?.phone || '',
      ticket.quantity,
      ticket.paymentStatus,
      ticket.checkInStatus ? 'Checked In' : 'Pending'
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.title.replace(/\s+/g, '-').toLowerCase()}-attendees.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryMessage('');
    try {
      const response = await getEventHistory(event._id);
      setHistoryItems(response.data.data || []);
    } catch (apiError) {
      setHistoryMessage(apiError.response?.data?.message || 'Failed to load version history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRestoreVersion = async (historyId) => {
    const shouldRestore = window.confirm('Restore this event version? Current details will be replaced.');
    if (!shouldRestore) {
      return;
    }

    setHistoryMessage('');
    try {
      await restoreEventHistory(event._id, historyId);
      setHistoryMessage('Version restored successfully');
      await refreshEvent();
      await loadHistory();
    } catch (apiError) {
      setHistoryMessage(apiError.response?.data?.message || 'Failed to restore version');
    }
  };

  const handleDeleteEvent = async () => {
    const hasAttendees = Number(event.currentAttendees || 0) > 0;
    const confirmMessage = hasAttendees
      ? 'This event has registered attendees. Deleting it will remove this event permanently. Continue?'
      : 'Delete this event permanently?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const titleInput = window.prompt('Type the event title to confirm deletion:');
    if (titleInput !== event.title) {
      setQuickActionMessage('Deletion cancelled: title did not match.');
      return;
    }

    setDeletingEvent(true);
    setQuickActionMessage('');
    try {
      await deleteEvent(event._id);
      navigate('/events');
    } catch (apiError) {
      setQuickActionMessage(apiError.response?.data?.message || 'Failed to delete event');
    } finally {
      setDeletingEvent(false);
    }
  };

  const handleQuickStatusUpdate = async (status) => {
    setRunningQuickAction(true);
    setQuickActionMessage('');
    try {
      await updateEvent(event._id, { status });
      setQuickActionMessage(`Event status updated to ${status}`);
      await refreshEvent();
    } catch (apiError) {
      setQuickActionMessage(apiError.response?.data?.message || 'Failed to update event status');
    } finally {
      setRunningQuickAction(false);
    }
  };

  const handleRegistrationToggle = async () => {
    setRunningQuickAction(true);
    setQuickActionMessage('');
    try {
      const isClosed = Boolean(event.registrationSettings?.isClosed);
      await updateEvent(event._id, {
        registrationSettings: {
          ...(event.registrationSettings || {}),
          isClosed: !isClosed,
          closeAt: !isClosed ? new Date().toISOString() : null
        }
      });
      setQuickActionMessage(isClosed ? 'Registration reopened' : 'Registration closed');
      await refreshEvent();
    } catch (apiError) {
      setQuickActionMessage(apiError.response?.data?.message || 'Failed to update registration');
    } finally {
      setRunningQuickAction(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="card">
          {event.posterUrl && (
            <img
              src={`${API_ORIGIN}${event.posterUrl}`}
              alt={event.title}
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '16px', marginBottom: '1.3rem' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}

          <h2 style={{ marginBottom: '0.5rem' }}>{event.title}</h2>
          <p style={{ color: '#66778d', marginBottom: '1rem' }}>Organized by {event.organizer?.name}</p>

          <div className="share-actions" style={{ marginBottom: '1rem' }}>
            <a className="btn btn-primary" href={`https://wa.me/?text=${encodeURIComponent(`${defaultShareText} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
            <a className="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent(`Join ${event.title}`)}&body=${encodeURIComponent(`${defaultShareText}\n${shareUrl}`)}`}>Share via Email</a>
            <button type="button" className="btn" onClick={handleCopyLink}>Copy Link</button>
          </div>
          {shareMessage && <div className="alert alert-info">{shareMessage}</div>}

          {canEditEventSettings && (
            <div style={{ marginBottom: '1rem' }}>
              <button type="button" className="btn btn-primary" onClick={() => setIsEditMode((prev) => !prev)}>
                {isEditMode ? 'Close Edit Mode' : 'Edit Event'}
              </button>
            </div>
          )}

          {canEditEventSettings && (
            <div className="card" style={{ border: '1px solid #f0d8bf', marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.8rem' }}>Quick Actions</h3>
              <div className="share-actions" style={{ marginBottom: '0.8rem' }}>
                {event.status !== 'published' && (
                  <button type="button" className="btn btn-success" onClick={() => handleQuickStatusUpdate('published')} disabled={runningQuickAction || deletingEvent}>
                    Publish Event
                  </button>
                )}
                {event.status !== 'completed' && (
                  <button type="button" className="btn btn-ghost" onClick={() => handleQuickStatusUpdate('completed')} disabled={runningQuickAction || deletingEvent}>
                    Mark Completed
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={handleRegistrationToggle} disabled={runningQuickAction || deletingEvent}>
                  {event.registrationSettings?.isClosed ? 'Reopen Registration' : 'Close Registration'}
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteEvent} disabled={runningQuickAction || deletingEvent}>
                  {deletingEvent ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
              {quickActionMessage && (
                <div className={`alert ${quickActionMessage.toLowerCase().includes('failed') ? 'alert-error' : 'alert-info'}`}>
                  {quickActionMessage}
                </div>
              )}
            </div>
          )}

          {isEditMode && editForm && (
            <div className="card" style={{ border: '1px dashed #bfd2e7' }}>
              <h3 style={{ marginBottom: '1rem' }}>Edit Mode</h3>
              {event.currentAttendees > 0 && <div className="alert alert-info">This event has registered attendees. Changes may affect attendees.</div>}
              {editMessage && <div className={`alert ${editMessage.toLowerCase().includes('failed') ? 'alert-error' : 'alert-success'}`}>{editMessage}</div>}
              <form onSubmit={handleSaveEvent} className="edit-grid">
                <input name="title" value={editForm.title} onChange={handleEditChange} placeholder="Event title" required />
                <input name="description" value={editForm.description} onChange={handleEditChange} placeholder="Description" required />
                <select name="category" value={editForm.category} onChange={handleEditChange}>
                  <option value="conference">Conference</option>
                  <option value="workshop">Workshop</option>
                  <option value="seminar">Seminar</option>
                  <option value="concert">Concert</option>
                  <option value="sports">Sports</option>
                  <option value="other">Other</option>
                </select>
                <select name="visibility" value={editForm.visibility} onChange={handleEditChange}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                </select>
                <select name="eventFormat" value={editForm.eventFormat} onChange={handleEditChange}>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <input name="onlineLink" value={editForm.onlineLink} onChange={handleEditChange} placeholder="Online link" />
                <select name="theme" value={editForm.theme} onChange={handleEditChange}>
                  <option value="minimal">Minimal</option>
                  <option value="corporate">Corporate</option>
                  <option value="festive">Festive</option>
                  <option value="dark">Dark</option>
                </select>
                <input type="datetime-local" name="startDate" value={editForm.startDate} onChange={handleEditChange} required />
                <input type="datetime-local" name="endDate" value={editForm.endDate} onChange={handleEditChange} required />
                <input type="number" min="1" name="maxAttendees" value={editForm.maxAttendees} onChange={handleEditChange} required />
                <select name="status" value={editForm.status} onChange={handleEditChange}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
                <label className="toggle-row"><span>Registration closed</span><input type="checkbox" name="registrationSettings.isClosed" checked={editForm.registrationSettings.isClosed} onChange={handleEditChange} /></label>
                <input type="datetime-local" name="registrationSettings.closeAt" value={editForm.registrationSettings.closeAt} onChange={handleEditChange} />
                <select name="registrationSettings.approvalMode" value={editForm.registrationSettings.approvalMode} onChange={handleEditChange}>
                  <option value="auto">Auto approve</option>
                  <option value="manual">Manual approve</option>
                </select>
                <div className="toggle-grid edit-toggle-grid">
                  <label className="toggle-row"><span>Free event</span><input type="checkbox" name="paymentOptions.isFreeEvent" checked={editForm.paymentOptions.isFreeEvent} onChange={handleEditChange} /></label>
                  <label className="toggle-row"><span>UPI QR</span><input type="checkbox" name="paymentOptions.upiQrEnabled" checked={editForm.paymentOptions.upiQrEnabled} onChange={handleEditChange} /></label>
                  <label className="toggle-row"><span>Card</span><input type="checkbox" name="paymentOptions.cardEnabled" checked={editForm.paymentOptions.cardEnabled} onChange={handleEditChange} /></label>
                  <label className="toggle-row"><span>Bank transfer</span><input type="checkbox" name="paymentOptions.bankTransferEnabled" checked={editForm.paymentOptions.bankTransferEnabled} onChange={handleEditChange} /></label>
                  <label className="toggle-row"><span>Partial payment</span><input type="checkbox" name="paymentOptions.allowPartialPayment" checked={editForm.paymentOptions.allowPartialPayment} onChange={handleEditChange} /></label>
                  <label className="toggle-row"><span>Donation</span><input type="checkbox" name="paymentOptions.donationEnabled" checked={editForm.paymentOptions.donationEnabled} onChange={handleEditChange} /></label>
                </div>
                <button type="submit" className="btn btn-success" disabled={savingEvent}>{savingEvent ? 'Saving...' : 'Save Event Changes'}</button>
              </form>

              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Version History</h4>
                <div className="share-actions" style={{ marginBottom: '0.8rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={loadHistory} disabled={historyLoading}>
                    {historyLoading ? 'Loading...' : 'Load History'}
                  </button>
                </div>
                {historyMessage && (
                  <div className={`alert ${historyMessage.toLowerCase().includes('failed') ? 'alert-error' : 'alert-info'}`}>
                    {historyMessage}
                  </div>
                )}
                {historyItems.length > 0 && (
                  <div className="history-list">
                    {historyItems.map((item) => (
                      <div key={item._id} className="history-row">
                        <div>
                          <strong>{new Date(item.changedAt).toLocaleString()}</strong>
                          <p style={{ margin: 0, color: '#5b6879', fontSize: '13px' }}>
                            By: {item.changedBy?.name || 'Unknown'}
                            {item.note ? ` | ${item.note}` : ''}
                          </p>
                          {getHistoryDiff(item.snapshot).length > 0 && (
                            <div className="history-diff">
                              {getHistoryDiff(item.snapshot).map((diff) => (
                                <p key={diff.label}>
                                  <strong>{diff.label}:</strong>{' '}
                                  <span className="diff-old">{diff.oldValue}</span>
                                  <span className="diff-arrow">{' -> '}</span>
                                  <span className="diff-new">{diff.newValue}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <button type="button" className="btn btn-primary" onClick={() => handleRestoreVersion(item._id)}>
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <h3>Description</h3>
            <p>{event.description}</p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h3>Event Details</h3>
            <p><strong>Category:</strong> {event.category}</p>
            <p><strong>Status:</strong> {event.status}</p>
            <p><strong>Visibility:</strong> {event.visibility || 'public'}</p>
            <p><strong>Theme:</strong> {event.theme || 'minimal'}</p>
            <p><strong>Start:</strong> {new Date(event.startDate).toLocaleString()}</p>
            <p><strong>End:</strong> {new Date(event.endDate).toLocaleString()}</p>
            <p><strong>Registration:</strong> {event.registrationSettings?.isClosed ? 'Closed' : 'Open'}</p>
          </div>

          {contributors.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h3>Event Contributors</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {contributors.map((contributor, index) => (
                  <div key={`${contributor.name}-${index}`} style={{ padding: '10px 12px', borderRadius: '12px', background: '#f7fbff', border: '1px solid #d8e1ee' }}>
                    <strong>{contributor.name}</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: '#5b6879' }}>{contributor.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="collaborator-manager" style={{ marginBottom: '1rem' }}>
            <h3>Organizer Management</h3>
            {canManageCollaborators && (
              <form onSubmit={handleAddCollaborator} className="collaborator-form" style={{ marginBottom: '0.8rem' }}>
                <input className="collaborator-input" type="email" value={collaboratorEmail} onChange={(e) => setCollaboratorEmail(e.target.value)} placeholder="Invite by email" required />
                <select className="collaborator-select" value={collaboratorRole} onChange={(e) => setCollaboratorRole(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" className="btn btn-primary" disabled={savingCollaborator}>{savingCollaborator ? 'Saving...' : 'Add'}</button>
              </form>
            )}
            {collaboratorMessage && <div className="alert alert-info">{collaboratorMessage}</div>}
            {(event.collaborators || []).length > 0 && (
              <div className="collaborator-list">
                {event.collaborators.map((entry) => (
                  <div key={entry._id} className="collaborator-row">
                    <div>
                      <strong>{entry.user?.name || 'Unknown'}</strong>
                      <p style={{ margin: 0, fontSize: '13px', color: '#5b6879' }}>{entry.user?.email}</p>
                    </div>
                    <div className="collaborator-actions">
                      {canManageCollaborators ? (
                        <>
                          <select value={entry.role} onChange={(e) => handleCollaboratorRoleChange(entry._id, e.target.value)} disabled={savingCollaborator}>
                            <option value="viewer">Viewer</option>
                            <option value="volunteer">Volunteer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                            <option value="co_organizer">Admin (legacy)</option>
                          </select>
                          <button type="button" className="btn btn-danger" onClick={() => handleRemoveCollaborator(entry._id)} disabled={savingCollaborator}>Remove</button>
                        </>
                      ) : (
                        <span className="badge">{roleLabel(entry.role)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManageAttendees && (
            <div style={{ marginBottom: '1rem' }}>
              <h3>Attendee Management</h3>
              <div className="share-actions" style={{ marginBottom: '0.8rem' }}>
                <button type="button" className="btn btn-primary" onClick={loadAttendees} disabled={attendeesLoading}>{attendeesLoading ? 'Loading...' : 'Load Attendees'}</button>
                <button type="button" className="btn btn-ghost" onClick={exportAttendeesCsv} disabled={!attendees.length}>Export CSV</button>
              </div>
              {attendeesError && <div className="alert alert-error">{attendeesError}</div>}
              {attendees.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #d8e1ee' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Ticket</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Qty</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Payment</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((ticket) => (
                        <tr key={ticket._id} style={{ borderBottom: '1px solid #e6edf7' }}>
                          <td style={{ padding: '8px' }}>{ticket.ticketNumber}</td>
                          <td style={{ padding: '8px' }}>{ticket.attendeeInfo?.name || ticket.user?.name || '-'}</td>
                          <td style={{ padding: '8px' }}>{ticket.attendeeInfo?.email || ticket.user?.email || '-'}</td>
                          <td style={{ padding: '8px' }}>{ticket.quantity}</td>
                          <td style={{ padding: '8px' }}>{ticket.paymentStatus}</td>
                          <td style={{ padding: '8px' }}>{ticket.checkInStatus ? 'Checked In' : 'Pending'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <h3>Available Tickets</h3>
            {(event.ticketTypes || []).map((ticket, index) => (
              <div key={index} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{ticket.name}</strong>
                    <p style={{ margin: '0.25rem 0' }}>{ticket.description}</p>
                    <p style={{ color: '#7f8c8d' }}>Available: {ticket.quantity - ticket.sold} / {ticket.quantity}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#27ae60' }}>${ticket.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {user && event.status === 'published' && (
            <Link to={`/book-ticket/${event._id}`} className="btn btn-success">Book Tickets Now</Link>
          )}
          {user && canAccessCheckIn && (
            <Link to={`/checkin/${event._id}`} className="btn btn-primary" style={{ marginLeft: '1rem' }}>Check-in Scanner</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventDetails;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, uploadPoster } from '../api/api';

function CreateEvent({ user }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    visibility: 'public',
    eventFormat: 'offline',
    onlineLink: '',
    theme: 'minimal',
    ageRestriction: '',
    venue: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: ''
    },
    startDate: '',
    endDate: '',
    maxAttendees: 100,
    ticketTypes: [
      { name: 'General Admission', price: 0, quantity: 100, description: '' }
    ],
    hosts: [],
    coHosts: [],
    speakers: [],
    registrationSettings: {
      isClosed: false,
      closeAt: '',
      approvalMode: 'auto'
    },
    paymentOptions: {
      isFreeEvent: false,
      upiQrEnabled: true,
      cardEnabled: true,
      bankTransferEnabled: false,
      allowPartialPayment: false,
      donationEnabled: false
    },
    status: 'draft',
    posterUrl: ''
  });
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('venue.')) {
      const venueField = name.split('.')[1];
      setFormData({
        ...formData,
        venue: {
          ...formData.venue,
          [venueField]: value
        }
      });
    } else if (name.startsWith('registrationSettings.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        registrationSettings: {
          ...formData.registrationSettings,
          [field]: value
        }
      });
    } else if (name.startsWith('paymentOptions.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        paymentOptions: {
          ...formData.paymentOptions,
          [field]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handlePosterChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) {
        setError('Poster size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleToggleChange = (name, checked) => {
    if (name.startsWith('registrationSettings.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        registrationSettings: {
          ...prev.registrationSettings,
          [field]: checked
        }
      }));
      return;
    }

    if (name.startsWith('paymentOptions.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        paymentOptions: {
          ...prev.paymentOptions,
          [field]: checked
        }
      }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleTicketChange = (index, field, value) => {
    const newTickets = [...formData.ticketTypes];
    newTickets[index][field] = value;
    setFormData({
      ...formData,
      ticketTypes: newTickets
    });
  };

  const addTicketType = () => {
    setFormData({
      ...formData,
      ticketTypes: [
        ...formData.ticketTypes,
        { name: '', price: 0, quantity: 0, description: '' }
      ]
    });
  };

  const removeTicketType = (index) => {
    const newTickets = formData.ticketTypes.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      ticketTypes: newTickets
    });
  };

  // Host management
  const addHost = () => {
    setFormData({
      ...formData,
      hosts: [...formData.hosts, { name: '', email: '', bio: '', avatar: '', role: '' }]
    });
  };

  const removeHost = (index) => {
    const newHosts = formData.hosts.filter((_, i) => i !== index);
    setFormData({ ...formData, hosts: newHosts });
  };

  const handleHostChange = (index, field, value) => {
    const newHosts = [...formData.hosts];
    newHosts[index][field] = value;
    setFormData({ ...formData, hosts: newHosts });
  };

  // Co-host management
  const addCoHost = () => {
    setFormData({
      ...formData,
      coHosts: [...formData.coHosts, { name: '', email: '', bio: '', avatar: '' }]
    });
  };

  const removeCoHost = (index) => {
    const newCoHosts = formData.coHosts.filter((_, i) => i !== index);
    setFormData({ ...formData, coHosts: newCoHosts });
  };

  const handleCoHostChange = (index, field, value) => {
    const newCoHosts = [...formData.coHosts];
    newCoHosts[index][field] = value;
    setFormData({ ...formData, coHosts: newCoHosts });
  };

  // Speaker management
  const addSpeaker = () => {
    setFormData({
      ...formData,
      speakers: [...formData.speakers, { 
        name: '', 
        email: '', 
        bio: '', 
        topic: '', 
        avatar: '', 
        company: '', 
        position: '',
        socialLinks: { twitter: '', linkedin: '' }
      }]
    });
  };

  const removeSpeaker = (index) => {
    const newSpeakers = formData.speakers.filter((_, i) => i !== index);
    setFormData({ ...formData, speakers: newSpeakers });
  };

  const handleSpeakerChange = (index, field, value) => {
    const newSpeakers = [...formData.speakers];
    if (field.startsWith('socialLinks.')) {
      const socialField = field.split('.')[1];
      newSpeakers[index].socialLinks[socialField] = value;
    } else {
      newSpeakers[index][field] = value;
    }
    setFormData({ ...formData, speakers: newSpeakers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let posterUrl = formData.posterUrl;

      // Upload poster first if selected
      if (posterFile) {
        setUploadingPoster(true);
        const posterFormData = new FormData();
        posterFormData.append('poster', posterFile);
        
        const uploadResponse = await uploadPoster(posterFormData);
        posterUrl = uploadResponse.data.data.filePath;
        setUploadingPoster(false);
      }

      const payload = {
        ...formData,
        posterUrl,
        maxAttendees: Number(formData.maxAttendees),
        registrationSettings: {
          ...formData.registrationSettings,
          closeAt: formData.registrationSettings.closeAt || null
        },
        ticketTypes: formData.ticketTypes.map((ticket) => ({
          ...ticket,
          price: Number(ticket.price),
          quantity: Number(ticket.quantity)
        }))
      };

      await createEvent(payload);
      navigate('/events');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
      setUploadingPoster(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h2>Create New Event</h2>
        </div>

        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          {uploadingPoster && (
            <div className="alert alert-info">📤 Uploading poster...</div>
          )}
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '1.5rem', color: '#667eea' }}>🎨 Event Poster</h3>
            
            <div 
              className="upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('poster-input').click()}
            >
              {posterPreview ? (
                <div>
                  <img 
                    src={posterPreview} 
                    alt="Poster Preview" 
                    style={{ 
                      width: '100%', 
                      maxHeight: '300px', 
                      objectFit: 'contain',
                      borderRadius: '12px'
                    }}
                  />
                  <p style={{ marginTop: '1rem', color: '#64748b' }}>
                    Click or drag to change poster
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
                  <h4 style={{ marginBottom: '0.5rem' }}>Upload Event Poster</h4>
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    Drag and drop or click to select<br/>
                    (Max 5MB, JPG, PNG, GIF)
                  </p>
                </div>
              )}
              <input
                id="poster-input"
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
                style={{ display: 'none' }}
              />
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>📝 Event Information</h3>
            <div className="form-group">
              <label>Event Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
                <option value="seminar">Seminar</option>
                <option value="concert">Concert</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Visibility</label>
                <select name="visibility" value={formData.visibility} onChange={handleChange}>
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted (Link only)</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div className="form-group">
                <label>Event Format</label>
                <select name="eventFormat" value={formData.eventFormat} onChange={handleChange}>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="form-group">
                <label>Theme</label>
                <select name="theme" value={formData.theme} onChange={handleChange}>
                  <option value="minimal">Minimal</option>
                  <option value="corporate">Corporate</option>
                  <option value="festive">Festive</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            {(formData.eventFormat === 'online' || formData.eventFormat === 'hybrid') && (
              <div className="form-group">
                <label>Online Meeting Link</label>
                <input
                  type="url"
                  name="onlineLink"
                  value={formData.onlineLink}
                  onChange={handleChange}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            <div className="form-group">
              <label>Age Restriction</label>
              <input
                type="text"
                name="ageRestriction"
                value={formData.ageRestriction}
                onChange={handleChange}
                placeholder="e.g., 18+, 21+, All Ages"
              />
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Venue Information</h3>

            <div className="form-group">
              <label>Venue Name *</label>
              <input
                type="text"
                name="venue.name"
                value={formData.venue.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Address *</label>
              <input
                type="text"
                name="venue.address"
                value={formData.venue.address}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="venue.city"
                  value={formData.venue.city}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="venue.state"
                  value={formData.venue.state}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Zip Code</label>
                <input
                  type="text"
                  name="venue.zipCode"
                  value={formData.venue.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Event Schedule</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Start Date & Time *</label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date & Time *</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Max Attendees *</label>
              <input
                type="number"
                name="maxAttendees"
                value={formData.maxAttendees}
                onChange={handleChange}
                required
                min="1"
              />
            </div>

            <h3 style={{ marginTop: '1.6rem', marginBottom: '1rem' }}>Registration Controls</h3>

            <div className="toggle-row">
              <label>Close registration manually</label>
              <input
                type="checkbox"
                checked={formData.registrationSettings.isClosed}
                onChange={(e) => handleToggleChange('registrationSettings.isClosed', e.target.checked)}
              />
            </div>

            <div className="form-group">
              <label>Registration closes at</label>
              <input
                type="datetime-local"
                name="registrationSettings.closeAt"
                value={formData.registrationSettings.closeAt}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Registration approval mode</label>
              <select
                name="registrationSettings.approvalMode"
                value={formData.registrationSettings.approvalMode}
                onChange={handleChange}
              >
                <option value="auto">Auto approve</option>
                <option value="manual">Manual approve</option>
              </select>
            </div>

            <h3 style={{ marginTop: '1.6rem', marginBottom: '1rem' }}>Payment Options</h3>
            <div className="toggle-grid">
              <label className="toggle-row"><span>Free event</span><input type="checkbox" checked={formData.paymentOptions.isFreeEvent} onChange={(e) => handleToggleChange('paymentOptions.isFreeEvent', e.target.checked)} /></label>
              <label className="toggle-row"><span>UPI QR enabled</span><input type="checkbox" checked={formData.paymentOptions.upiQrEnabled} onChange={(e) => handleToggleChange('paymentOptions.upiQrEnabled', e.target.checked)} /></label>
              <label className="toggle-row"><span>Card enabled</span><input type="checkbox" checked={formData.paymentOptions.cardEnabled} onChange={(e) => handleToggleChange('paymentOptions.cardEnabled', e.target.checked)} /></label>
              <label className="toggle-row"><span>Bank transfer enabled</span><input type="checkbox" checked={formData.paymentOptions.bankTransferEnabled} onChange={(e) => handleToggleChange('paymentOptions.bankTransferEnabled', e.target.checked)} /></label>
              <label className="toggle-row"><span>Allow partial payment</span><input type="checkbox" checked={formData.paymentOptions.allowPartialPayment} onChange={(e) => handleToggleChange('paymentOptions.allowPartialPayment', e.target.checked)} /></label>
              <label className="toggle-row"><span>Enable donation</span><input type="checkbox" checked={formData.paymentOptions.donationEnabled} onChange={(e) => handleToggleChange('paymentOptions.donationEnabled', e.target.checked)} /></label>
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Ticket Types</h3>

            {formData.ticketTypes.map((ticket, index) => (
              <div key={index} style={{ 
                border: '1px solid #ddd', 
                padding: '1rem', 
                borderRadius: '4px', 
                marginBottom: '1rem' 
              }}>
                <div className="form-group">
                  <label>Ticket Name *</label>
                  <input
                    type="text"
                    value={ticket.name}
                    onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={ticket.description}
                    onChange={(e) => handleTicketChange(index, 'description', e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Price ($) *</label>
                    <input
                      type="number"
                      value={ticket.price}
                      onChange={(e) => handleTicketChange(index, 'price', parseFloat(e.target.value))}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      value={ticket.quantity}
                      onChange={(e) => handleTicketChange(index, 'quantity', parseInt(e.target.value))}
                      required
                      min="1"
                    />
                  </div>
                </div>

                {formData.ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTicketType(index)}
                    className="btn btn-danger"
                  >
                    Remove Ticket Type
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addTicketType}
              className="btn btn-primary"
              style={{ marginBottom: '1rem' }}
            >
              Add Another Ticket Type
            </button>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Team & Speakers</h3>

            {/* Hosts Section */}
            <h4 style={{ marginBottom: '1rem' }}>Hosts</h4>
            {formData.hosts.map((host, index) => (
              <div key={index} style={{ 
                border: '1px solid #ddd', 
                padding: '1rem', 
                borderRadius: '4px', 
                marginBottom: '1rem',
                backgroundColor: '#fafafa'
              }}>
                <div className="form-group">
                  <label>Host Name *</label>
                  <input
                    type="text"
                    value={host.name}
                    onChange={(e) => handleHostChange(index, 'name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={host.email}
                    onChange={(e) => handleHostChange(index, 'email', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Role/Title</label>
                  <input
                    type="text"
                    value={host.role}
                    onChange={(e) => handleHostChange(index, 'role', e.target.value)}
                    placeholder="e.g., Lead Organizer, Event Director"
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={host.bio}
                    onChange={(e) => handleHostChange(index, 'bio', e.target.value)}
                    placeholder="Brief description about the host"
                  />
                </div>

                <div className="form-group">
                  <label>Avatar URL</label>
                  <input
                    type="url"
                    value={host.avatar}
                    onChange={(e) => handleHostChange(index, 'avatar', e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeHost(index)}
                  className="btn btn-danger"
                  style={{ padding: '5px 10px', fontSize: '12px' }}
                >
                  Remove Host
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addHost}
              className="btn"
              style={{ marginBottom: '1.5rem' }}
            >
              + Add Host
            </button>

            {/* Co-Hosts Section */}
            <h4 style={{ marginBottom: '1rem' }}>Co-Hosts</h4>
            {formData.coHosts.map((coHost, index) => (
              <div key={index} style={{ 
                border: '1px solid #ddd', 
                padding: '1rem', 
                borderRadius: '4px', 
                marginBottom: '1rem',
                backgroundColor: '#fafafa'
              }}>
                <div className="form-group">
                  <label>Co-Host Name *</label>
                  <input
                    type="text"
                    value={coHost.name}
                    onChange={(e) => handleCoHostChange(index, 'name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={coHost.email}
                    onChange={(e) => handleCoHostChange(index, 'email', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={coHost.bio}
                    onChange={(e) => handleCoHostChange(index, 'bio', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Avatar URL</label>
                  <input
                    type="url"
                    value={coHost.avatar}
                    onChange={(e) => handleCoHostChange(index, 'avatar', e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeCoHost(index)}
                  className="btn btn-danger"
                  style={{ padding: '5px 10px', fontSize: '12px' }}
                >
                  Remove Co-Host
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addCoHost}
              className="btn"
              style={{ marginBottom: '1.5rem' }}
            >
              + Add Co-Host
            </button>

            {/* Speakers Section */}
            <h4 style={{ marginBottom: '1rem' }}>Speakers</h4>
            {formData.speakers.map((speaker, index) => (
              <div key={index} style={{ 
                border: '1px solid #ddd', 
                padding: '1rem', 
                borderRadius: '4px', 
                marginBottom: '1rem',
                backgroundColor: '#fafafa'
              }}>
                <div className="form-group">
                  <label>Speaker Name *</label>
                  <input
                    type="text"
                    value={speaker.name}
                    onChange={(e) => handleSpeakerChange(index, 'name', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={speaker.email}
                    onChange={(e) => handleSpeakerChange(index, 'email', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={speaker.company}
                    onChange={(e) => handleSpeakerChange(index, 'company', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Position/Title</label>
                  <input
                    type="text"
                    value={speaker.position}
                    onChange={(e) => handleSpeakerChange(index, 'position', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Topic/Session</label>
                  <input
                    type="text"
                    value={speaker.topic}
                    onChange={(e) => handleSpeakerChange(index, 'topic', e.target.value)}
                    placeholder="What will this speaker talk about?"
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={speaker.bio}
                    onChange={(e) => handleSpeakerChange(index, 'bio', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Avatar URL</label>
                  <input
                    type="url"
                    value={speaker.avatar}
                    onChange={(e) => handleSpeakerChange(index, 'avatar', e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label>Twitter</label>
                  <input
                    type="text"
                    value={speaker.socialLinks.twitter}
                    onChange={(e) => handleSpeakerChange(index, 'socialLinks.twitter', e.target.value)}
                    placeholder="@username or URL"
                  />
                </div>

                <div className="form-group">
                  <label>LinkedIn</label>
                  <input
                    type="text"
                    value={speaker.socialLinks.linkedin}
                    onChange={(e) => handleSpeakerChange(index, 'socialLinks.linkedin', e.target.value)}
                    placeholder="LinkedIn profile URL"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeSpeaker(index)}
                  className="btn btn-danger"
                  style={{ padding: '5px 10px', fontSize: '12px' }}
                >
                  Remove Speaker
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addSpeaker}
              className="btn"
              style={{ marginBottom: '1.5rem' }}
            >
              + Add Speaker
            </button>

            <div className="form-group"
              style={{ marginTop: '2rem' }}
            >
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <button type="submit" className="btn btn-success" disabled={loading || uploadingPoster}>
              {loading ? '⏳ Creating...' : uploadingPoster ? '📤 Uploading...' : '✨ Create Event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateEvent;

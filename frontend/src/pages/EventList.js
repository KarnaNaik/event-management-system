import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_ORIGIN, getEvents } from '../api/api';

function EventList({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchEvents = async () => {
    try {
      const response = await getEvents(filters);
      setEvents(response.data.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h2>Browse Events</h2>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <input
                type="text"
                name="search"
                placeholder="Search events..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
                <option value="seminar">Seminar</option>
                <option value="concert">Concert</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center' }}>No events found</p>
          </div>
        ) : (
          <div className="card-grid">
            {events.map(event => (
              <div key={event._id} className="card event-card">
                {event.posterUrl && (
                  <img 
                    src={`${API_ORIGIN}${event.posterUrl}`}
                    alt={event.title}
                    className="event-poster"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="badge">{event.category}</div>
                <h3 style={{ marginBottom: '0.5rem' }}>{event.title}</h3>
                <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
                  {new Date(event.startDate).toLocaleDateString()} - {event.venue.name}
                </p>
                <p style={{ marginBottom: '1rem' }}>
                  {event.description.substring(0, 100)}...
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link to={`/events/${event._id}`} className="btn btn-primary">
                    View Details
                  </Link>
                  {user && (
                    <Link to={`/book-ticket/${event._id}`} className="btn btn-success">
                      Book Ticket
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventList;

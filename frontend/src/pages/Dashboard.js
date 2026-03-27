import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEventsByOrganizer, getMyTickets } from '../api/api';

function Dashboard({ user }) {
  const [myEvents, setMyEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      // Fetch user's tickets
      const ticketsResponse = await getMyTickets();
      setMyTickets(ticketsResponse.data.data);

      // If user is organizer, fetch their events
      if (user.role === 'organizer' || user.role === 'admin') {
        const eventsResponse = await getEventsByOrganizer(user.id);
        setMyEvents(eventsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const organizerPublished = myEvents.filter((event) => event.status === 'published').length;
  const organizerDrafts = myEvents.filter((event) => event.status === 'draft').length;
  const organizerCompleted = myEvents.filter((event) => event.status === 'completed').length;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Welcome back, {user.name}!</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div className="card" style={{ textAlign: 'center', background: '#ebf5fb' }}>
            <h3 style={{ fontSize: '2.5rem', color: '#3498db', marginBottom: '0.5rem' }}>
              {myTickets.length}
            </h3>
            <p style={{ fontSize: '1.1rem' }}>My Tickets</p>
          </div>

          {(user.role === 'organizer' || user.role === 'admin') && (
            <div className="card" style={{ textAlign: 'center', background: '#eafaf1' }}>
              <h3 style={{ fontSize: '2.5rem', color: '#27ae60', marginBottom: '0.5rem' }}>
                {myEvents.length}
              </h3>
              <p style={{ fontSize: '1.1rem' }}>My Events</p>
            </div>
          )}

          <div className="card" style={{ textAlign: 'center', background: '#fef5e7' }}>
            <h3 style={{ fontSize: '2.5rem', color: '#f39c12', marginBottom: '0.5rem' }}>
              {myTickets.filter(t => t.status === 'active').length}
            </h3>
            <p style={{ fontSize: '1.1rem' }}>Active Tickets</p>
          </div>

          <div className="card" style={{ textAlign: 'center', background: '#fdecea' }}>
            <h3 style={{ fontSize: '2.5rem', color: '#e74c3c', marginBottom: '0.5rem' }}>
              {myTickets.filter(t => t.checkInStatus).length}
            </h3>
            <p style={{ fontSize: '1.1rem' }}>Attended Events</p>
          </div>
        </div>

        {(user.role === 'organizer' || user.role === 'admin') && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Organizer Admin Functions</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to="/create-event" className="btn btn-success">Create Event</Link>
                <Link to="/payment-settings" className="btn btn-primary">Payment Settings</Link>
                {user.role === 'admin' && <Link to="/admin" className="btn btn-ghost">System Admin Panel</Link>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
              <div style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid #dce7f3', background: '#f8fbff' }}>
                <strong>Total Managed Events</strong>
                <p style={{ margin: '0.35rem 0 0', color: '#456' }}>{myEvents.length}</p>
              </div>
              <div style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid #dce7f3', background: '#f8fbff' }}>
                <strong>Published</strong>
                <p style={{ margin: '0.35rem 0 0', color: '#456' }}>{organizerPublished}</p>
              </div>
              <div style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid #dce7f3', background: '#f8fbff' }}>
                <strong>Drafts</strong>
                <p style={{ margin: '0.35rem 0 0', color: '#456' }}>{organizerDrafts}</p>
              </div>
              <div style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid #dce7f3', background: '#f8fbff' }}>
                <strong>Completed</strong>
                <p style={{ margin: '0.35rem 0 0', color: '#456' }}>{organizerCompleted}</p>
              </div>
            </div>
          </div>
        )}

        {(user.role === 'organizer' || user.role === 'admin') && myEvents.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>My Events</h3>
              <Link to="/create-event" className="btn btn-primary">Create New Event</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Event</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Attendees</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myEvents.slice(0, 5).map((event) => (
                    <tr key={event._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem' }}>{event.title}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {new Date(event.startDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          background: event.status === 'published' ? '#d5f4e6' : '#fadbd8',
                          color: event.status === 'published' ? '#27ae60' : '#e74c3c'
                        }}>
                          {event.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {event.currentAttendees} / {event.maxAttendees}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <Link to={`/events/${event._id}`} style={{ marginRight: '0.5rem' }}>Manage</Link>
                        <Link to={`/checkin/${event._id}`} style={{ marginRight: '0.5rem' }}>Check-in</Link>
                        <Link to={`/events/${event._id}`}>Team</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {myTickets.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Recent Tickets</h3>
              <Link to="/my-tickets" className="btn btn-primary">View All Tickets</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Event</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ticket Number</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myTickets.slice(0, 5).map((ticket) => (
                    <tr key={ticket._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem' }}>{ticket.event.title}</td>
                      <td style={{ padding: '0.75rem' }}>{ticket.ticketNumber}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {new Date(ticket.event.startDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          background: ticket.status === 'active' ? '#d5f4e6' : 
                                     ticket.status === 'used' ? '#d6eaf8' : '#fadbd8',
                          color: ticket.status === 'active' ? '#27ae60' : 
                                ticket.status === 'used' ? '#3498db' : '#e74c3c'
                        }}>
                          {ticket.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {myTickets.length === 0 && myEvents.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Get Started!</h3>
            <p style={{ marginBottom: '1.5rem', color: '#7f8c8d' }}>
              {user.role === 'organizer' || user.role === 'admin'
                ? 'Create your first event or browse existing events to book tickets.'
                : 'Browse events and book your first ticket!'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/events" className="btn btn-primary">Browse Events</Link>
              {(user.role === 'organizer' || user.role === 'admin') && (
                <Link to="/create-event" className="btn btn-success">Create Event</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

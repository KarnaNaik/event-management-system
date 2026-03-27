import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function AdminPanel() {
  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalTickets: 0,
    totalRevenue: 0
  });
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [pendingTicketPayments, setPendingTicketPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');

  const fetchAdminData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` }
      };

      const [usersRes, eventsRes, ticketsRes, pendingRes, pendingTicketPaymentsRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/admin/users`, config),
        axios.get(`${apiBaseUrl}/events`, {
          ...config,
          params: { status: 'all' }
        }),
        axios.get(`${apiBaseUrl}/admin/tickets`, config),
        axios.get(`${apiBaseUrl}/admin/pending-verifications`, config),
        axios.get(`${apiBaseUrl}/admin/ticket-payments`, config)
      ]);

      const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
      const eventsData = Array.isArray(eventsRes.data?.data) ? eventsRes.data.data : [];
      const ticketsData = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];
      const pendingData = Array.isArray(pendingRes.data) ? pendingRes.data : [];
      const pendingTicketPaymentsData = Array.isArray(pendingTicketPaymentsRes.data)
        ? pendingTicketPaymentsRes.data
        : [];

      setUsers(usersData);
      setEvents(eventsData);
      setTickets(ticketsData);
      setPendingVerifications(pendingData);
      setPendingTicketPayments(pendingTicketPaymentsData);

      // Calculate statistics
      const totalRevenue = ticketsData.reduce((sum, ticket) => sum + (ticket.totalAmount || 0), 0);
      setStats({
        totalUsers: usersData.length,
        totalEvents: eventsData.length,
        totalTickets: ticketsData.length,
        totalRevenue: totalRevenue
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setMessage('Error loading admin data');
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiBaseUrl}/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessage('User deleted successfully');
      fetchAdminData();
    } catch (error) {
      setMessage('Error deleting user');
    }
  };

  const deleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiBaseUrl}/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessage('Event deleted successfully');
      fetchAdminData();
    } catch (error) {
      setMessage('Error deleting event');
    }
  };

  const verifyPaymentDetails = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${apiBaseUrl}/admin/verify-payment/${userId}`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      setMessage('Payment details verified successfully');
      fetchAdminData();
    } catch (error) {
      setMessage('Error verifying payment details');
    }
  };

  const reviewTicketPayment = async (paymentId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${apiBaseUrl}/admin/ticket-payments/${paymentId}`,
        { action },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      setMessage(action === 'approve' ? 'Ticket payment approved' : 'Ticket payment rejected');
      fetchAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error reviewing ticket payment');
    }
  };

  if (loading) {
    return <div className="loading">Loading admin panel...</div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h2>Admin Panel</h2>
        </div>

        {message && (
          <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
            {message}
          </div>
        )}

        {/* Statistics Overview */}
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalEvents}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalTickets}</div>
            <div className="stat-label">Total Tickets</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">₹{stats.totalRevenue.toFixed(2)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : ''}`}
            style={{ marginRight: '10px', marginBottom: '10px' }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`}
            style={{ marginRight: '10px', marginBottom: '10px' }}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`btn ${activeTab === 'events' ? 'btn-primary' : ''}`}
            style={{ marginRight: '10px', marginBottom: '10px' }}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`btn ${activeTab === 'tickets' ? 'btn-primary' : ''}`}
            style={{ marginRight: '10px', marginBottom: '10px' }}
          >
            Tickets
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`btn ${activeTab === 'payments' ? 'btn-primary' : ''}`}
            style={{ marginBottom: '10px' }}
          >
            Payments ({pendingTicketPayments.length} pending)
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="admin-section">
            <h3>System Overview</h3>
            <div className="card">
              <p><strong>Total Registered Users:</strong> {stats.totalUsers}</p>
              <p><strong>Active Events:</strong> {stats.totalEvents}</p>
              <p><strong>Tickets Sold:</strong> {stats.totalTickets}</p>
              <p><strong>Total Revenue Generated:</strong> ₹{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-section">
            <h3>User Management</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{new Date(user.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => deleteUser(user._id)}
                        className="btn btn-danger"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="admin-section">
            <h3>Event Management</h3>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Organizer</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event._id}>
                    <td>{event.title}</td>
                    <td>{event.organizer?.name || 'N/A'}</td>
                    <td>{event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'}</td>
                    <td>{event.venue?.name || event.venue?.address || 'N/A'}</td>
                    <td>{event.currentAttendees || 0} / {event.maxAttendees || 0}</td>
                    <td>
                      <button
                        onClick={() => deleteEvent(event._id)}
                        className="btn btn-danger"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="admin-section">
            <h3>Ticket Management</h3>
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Event</th>
                  <th>User</th>
                  <th>Method</th>
                  <th>Price</th>
                  <th>Payment</th>
                  <th>Purchased</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket._id}>
                    <td>{ticket.ticketNumber}</td>
                    <td>{ticket.event?.title || 'N/A'}</td>
                    <td>{ticket.user?.email || 'N/A'}</td>
                    <td>{ticket.paymentId?.paymentMethod || 'N/A'}</td>
                    <td>₹{ticket.totalAmount || 0}</td>
                    <td>
                      <span className={`badge ${ticket.paymentStatus === 'completed' ? 'badge-success' : ''}`}>
                        {ticket.paymentStatus || 'pending'}
                      </span>
                    </td>
                    <td>{new Date(ticket.purchaseDate || Date.now()).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="admin-section">
            <h3>Payment Management</h3>

            <h4 style={{ marginBottom: '0.7rem' }}>Ticket Payment Approvals</h4>
            {pendingTicketPayments.length === 0 ? (
              <div className="card" style={{ marginBottom: '20px' }}>
                <p>No pending ticket payments</p>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {pendingTicketPayments.map((payment) => (
                  <div key={payment._id} className="card" style={{ marginBottom: '12px' }}>
                    <p><strong>Event:</strong> {payment.event?.title || 'N/A'}</p>
                    <p><strong>User:</strong> {payment.user?.name} ({payment.user?.email})</p>
                    <p><strong>Ticket:</strong> {payment.ticket?.ticketNumber || 'N/A'}</p>
                    <p><strong>Method:</strong> {payment.paymentMethod}</p>
                    <p><strong>Amount:</strong> ₹{payment.amount}</p>
                    <p><strong>Reference:</strong> {payment.transactionId || 'N/A'}</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => reviewTicketPayment(payment._id, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => reviewTicketPayment(payment._id, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h4 style={{ marginBottom: '0.7rem' }}>Organizer Payment Detail Verifications</h4>
            {pendingVerifications.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ fontSize: '18px', color: '#666' }}>
                  No pending payment verifications
                </p>
              </div>
            ) : (
              <div>
                {pendingVerifications.map(user => (
                  <div key={user._id} className="card" style={{ marginBottom: '20px' }}>
                    <h4>{user.name}</h4>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                    
                    <div style={{ 
                      marginTop: '15px', 
                      padding: '15px', 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}>
                      <h5 style={{ marginBottom: '10px' }}>Payment Details:</h5>
                      {user.paymentDetails.bankName && (
                        <p><strong>Bank:</strong> {user.paymentDetails.bankName}</p>
                      )}
                      {user.paymentDetails.accountHolderName && (
                        <p><strong>Account Holder:</strong> {user.paymentDetails.accountHolderName}</p>
                      )}
                      {user.paymentDetails.accountNumber && (
                        <p><strong>Account Number:</strong> {user.paymentDetails.accountNumber}</p>
                      )}
                      {user.paymentDetails.ifscCode && (
                        <p><strong>IFSC Code:</strong> {user.paymentDetails.ifscCode}</p>
                      )}
                      {user.paymentDetails.upiId && (
                        <p><strong>UPI ID:</strong> {user.paymentDetails.upiId}</p>
                      )}
                    </div>

                    <button
                      onClick={() => verifyPaymentDetails(user._id)}
                      className="btn btn-success"
                      style={{ marginTop: '15px' }}
                    >
                      Verify Payment Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;

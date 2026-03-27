import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyTickets } from '../api/api';
import QRCode from 'react-qr-code';

function MyTickets({ user }) {
  const AUTO_REFRESH_MS = 15000;
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await getMyTickets();
      setTickets(response.data.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const hasPendingPayments = tickets.some((ticket) => ticket.paymentStatus === 'pending');

  useEffect(() => {
    if (!hasPendingPayments) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTickets(true);
      }
    }, AUTO_REFRESH_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTickets(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [AUTO_REFRESH_MS, fetchTickets, hasPendingPayments]);

  const showQRCode = (ticket) => {
    setSelectedTicket(ticket);
  };

  const closeQRCode = () => {
    setSelectedTicket(null);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h2>My Tickets</h2>
        </div>

        {searchParams.get('booking') === 'confirmed' && (
          <div className="alert alert-success">Ticket confirmed and issued successfully.</div>
        )}
        {searchParams.get('booking') === 'pending' && (
          <div className="alert alert-info">Payment submitted. Ticket will be issued after admin approval.</div>
        )}
        {hasPendingPayments && (
          <div className="alert alert-info">Auto-refresh is active. Ticket status checks every 15 seconds.</div>
        )}

        {tickets.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center' }}>You don't have any tickets yet</p>
          </div>
        ) : (
          <div className="card-grid">
            {tickets.map(ticket => (
              <div key={ticket._id} className="card">
                <h3 style={{ marginBottom: '0.5rem' }}>{ticket.event.title}</h3>
                <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
                  {new Date(ticket.event.startDate).toLocaleDateString()}
                </p>
                
                <div style={{ marginBottom: '1rem' }}>
                  <p>
                    <strong>Ticket Number:</strong>{' '}
                    {ticket.paymentStatus === 'completed' ? ticket.ticketNumber : 'Will be issued after payment approval'}
                  </p>
                  <p><strong>Type:</strong> {ticket.ticketType.name}</p>
                  <p><strong>Quantity:</strong> {ticket.quantity}</p>
                  <p><strong>Amount:</strong> ${ticket.totalAmount}</p>
                  <p>
                    <strong>Payment:</strong>{' '}
                    <span style={{
                      color: ticket.paymentStatus === 'completed' ? '#27ae60' :
                             ticket.paymentStatus === 'pending' ? '#d97706' : '#e74c3c'
                    }}>
                      {ticket.paymentStatus?.toUpperCase()}
                    </span>
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span style={{
                      color: ticket.status === 'active' ? '#27ae60' : 
                             ticket.status === 'used' ? '#3498db' : '#e74c3c'
                    }}>
                      {ticket.status.toUpperCase()}
                    </span>
                  </p>
                  {ticket.checkInStatus && (
                    <p><strong>Checked In:</strong> {new Date(ticket.checkInTime).toLocaleString()}</p>
                  )}
                </div>

                <button
                  onClick={() => showQRCode(ticket)}
                  className="btn btn-primary"
                  disabled={ticket.status !== 'active' || ticket.paymentStatus !== 'completed'}
                >
                  {ticket.paymentStatus !== 'completed' ? 'Pending Admin Approval' : 'Show QR Code'}
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedTicket && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }} onClick={closeQRCode}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              textAlign: 'center',
              maxWidth: '500px'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginBottom: '1rem' }}>{selectedTicket.event.title}</h3>
              <p style={{ marginBottom: '1rem' }}>Ticket: {selectedTicket.ticketNumber}</p>
              
              <div style={{ 
                padding: '1rem', 
                background: 'white',
                display: 'inline-block',
                marginBottom: '1rem'
              }}>
                <QRCode
                  value={JSON.stringify({
                    ticketNumber: selectedTicket.ticketNumber,
                    eventId: selectedTicket.event._id,
                    userId: user.id
                  })}
                  size={256}
                />
              </div>
              
              <br />
              <button onClick={closeQRCode} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTickets;

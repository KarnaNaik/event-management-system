import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getEvent, checkIn, getCheckInStats, verifyTicket } from '../api/api';
import QRScanner from '../components/QRScanner';

function CheckIn({ user }) {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [ticketNumber, setTicketNumber] = useState('');
  const [scanning, setScanning] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [lastScan, setLastScan] = useState(null);

  useEffect(() => {
    fetchEvent();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await getEvent(eventId);
      setEvent(response.data.data);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getCheckInStats(eventId);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCheckIn = async (ticketNum) => {
    const finalTicketNumber = (ticketNum || ticketNumber || '').trim();
    if (!finalTicketNumber) {
      setMessage('Please provide a valid ticket number');
      setMessageType('error');
      return;
    }

    setScanning(true);
    setMessage('');

    try {
      const verificationResponse = await verifyTicket({
        ticketNumber: finalTicketNumber,
        eventId
      });

      if (!verificationResponse.data.valid) {
        setMessage(verificationResponse.data.message || 'Ticket is not valid for check-in');
        setMessageType('error');
        return;
      }

      const response = await checkIn({
        ticketNumber: finalTicketNumber,
        eventId
      });

      setMessage(`Verified: ${finalTicketNumber}. Attendance marked for ${event.title}. Welcome ${response.data.data.attendee.name}.`);
      setMessageType('success');
      setTicketNumber('');
      setLastScan({
        ticketNumber: finalTicketNumber,
        attendee: response.data.data.attendee.name,
        checkedInAt: response.data.data.checkInTime
      });
      fetchStats(); // Refresh stats
      
      // Play success sound if available
      if (typeof Audio !== 'undefined') {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a4+yVkJ');
        audio.play().catch(() => {});
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Check-in failed');
      setMessageType('error');
    } finally {
      setScanning(false);
    }
  };

  const handleScanSuccess = (data) => {
    const ticketNum = typeof data === 'string' ? data : data.ticketNumber;
    setTicketNumber(ticketNum);
    handleCheckIn(ticketNum);
  };

  const handleScanError = (error) => {
    setMessage(error);
    setMessageType('error');
  };

  if (!event) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h2>Check-in for {event.title}</h2>
        </div>

        {stats && (
          <div className="card checkin-stats-card">
            <h3 style={{ marginBottom: '1rem' }}>Check-in Statistics</h3>
            <div className="checkin-stats-grid">
              <div className="checkin-stat-tile checkin-stat-total">
                <h4 style={{ fontSize: '2rem', color: '#3498db' }}>{stats.totalTickets}</h4>
                <p>Total Tickets</p>
              </div>
              <div className="checkin-stat-tile checkin-stat-checked">
                <h4 style={{ fontSize: '2rem', color: '#27ae60' }}>{stats.checkedIn}</h4>
                <p>Checked In</p>
              </div>
              <div className="checkin-stat-tile checkin-stat-pending">
                <h4 style={{ fontSize: '2rem', color: '#e74c3c' }}>{stats.totalTickets - stats.checkedIn}</h4>
                <p>Pending</p>
              </div>
            </div>
          </div>
        )}

        <div className="card checkin-main-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Check-in Method</h3>
          <div className="checkin-method-switch">
            <button 
              type="button"
              onClick={() => setUseCamera(true)}
              className={`btn ${useCamera ? 'btn-primary' : 'btn-success'}`}
              style={{ flex: '1', minWidth: '180px' }}
            >
              📷 Camera Scan
            </button>
            <button 
              type="button"
              onClick={() => setUseCamera(false)}
              className={`btn ${!useCamera ? 'btn-primary' : 'btn-success'}`}
              style={{ flex: '1', minWidth: '180px' }}
            >
              ⌨️ Manual Entry
            </button>
          </div>
          
          {message && (
            <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}

          {lastScan && (
            <div className="alert alert-info">
              Last Verified: <strong>{lastScan.ticketNumber}</strong> for <strong>{lastScan.attendee}</strong> at{' '}
              {new Date(lastScan.checkedInAt).toLocaleTimeString()}
            </div>
          )}

          {useCamera ? (
            <div style={{ marginTop: '1rem' }}>
              <QRScanner 
                onScanSuccess={handleScanSuccess}
                onScanError={handleScanError}
                autoStart={true}
              />
              <p style={{ 
                textAlign: 'center', 
                marginTop: '1rem', 
                color: '#64748b',
                fontSize: '0.875rem'
              }}>
                📱 Position the QR code within the camera frame
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleCheckIn(); }}>
              <div className="form-group">
                <label>Ticket Number</label>
                <input
                  type="text"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="Enter or scan ticket number"
                  required
                  autoFocus
                />
                <p style={{ fontSize: '0.875rem', color: '#7f8c8d', marginTop: '0.5rem' }}>
                  Manually enter the ticket number from the ticket
                </p>
              </div>

              <button type="submit" className="btn btn-success" disabled={scanning}>
                {scanning ? '⏳ Processing...' : '✅ Check In'}
              </button>
            </form>
          )}
        </div>

        {stats && stats.recentCheckIns && stats.recentCheckIns.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Recent Check-ins</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ticket Number</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Attendee</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Check-in Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentCheckIns.map((ticket) => (
                    <tr key={ticket._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem' }}>{ticket.ticketNumber}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {ticket.attendeeInfo?.name || ticket.user?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {new Date(ticket.checkInTime).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckIn;

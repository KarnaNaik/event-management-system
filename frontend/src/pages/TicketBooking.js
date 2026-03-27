import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent, bookTicket, createManualPayment } from '../api/api';

function TicketBooking({ user }) {
  const UPI_TXN_PATTERN = /^[A-Za-z0-9]{12,30}$/;
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod] = useState('upi');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookingStage, setBookingStage] = useState('idle');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('ticketBookingDarkMode') === '1');

  useEffect(() => {
    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    localStorage.setItem('ticketBookingDarkMode', isDarkMode ? '1' : '0');
  }, [isDarkMode]);

  const fetchEvent = async () => {
    try {
      const response = await getEvent(eventId);
      setEvent(response.data.data);
    } catch (err) {
      setError('Error loading event');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBooking(true);
    setBookingStage('submitting');

    try {
      if (totalAmount > 0 && !transactionId.trim()) {
        setError('Please enter your UPI transaction/reference ID');
        setBooking(false);
        setBookingStage('idle');
        return;
      }

      if (totalAmount > 0 && !UPI_TXN_PATTERN.test(transactionId.trim())) {
        setError('Invalid UPI transaction ID. Use 12-30 letters/numbers only.');
        setBooking(false);
        setBookingStage('idle');
        return;
      }

      // Book the ticket
      const ticketResponse = await bookTicket({
        eventId,
        ticketTypeIndex: selectedTicketIndex,
        quantity,
        attendeeInfo: {
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      });

      const ticket = ticketResponse.data.data;
      let bookingResult = 'confirmed';

      if (totalAmount > 0) {
        // Submit UPI payment in realtime mode for instant confirmation.
        const paymentResponse = await createManualPayment({
          ticketId: ticket._id,
          paymentMethod,
          transactionId: transactionId.trim(),
          instantConfirm: true,
          billingDetails: {
            name: user.name,
            email: user.email,
            phone: user.phone
          }
        });
        const paymentStatus = paymentResponse?.data?.data?.paymentStatus;
        if (paymentStatus === 'completed') {
          setSuccess('Payment successful. Ticket confirmed and issued.');
          setBookingStage('confirmed');
          bookingResult = 'confirmed';
        } else {
          setSuccess('Payment submitted. Ticket is awaiting confirmation.');
          setBookingStage('pendingApproval');
          bookingResult = 'pending';
        }
      } else {
        setSuccess('Ticket confirmed. Your free ticket is issued successfully.');
        setBookingStage('confirmed');
        bookingResult = 'confirmed';
      }
      setTimeout(() => {
        navigate(`/my-tickets?booking=${bookingResult}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
      setBookingStage('idle');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!event) {
    return (
      <div className="page">
        <div className="container">
          <div className="alert alert-error">Event not found</div>
        </div>
      </div>
    );
  }

  const selectedTicket = event.ticketTypes[selectedTicketIndex];
  const totalAmount = selectedTicket ? selectedTicket.price * quantity : 0;
  const registrationClosed = Boolean(
    event.registrationSettings?.isClosed ||
    (event.registrationSettings?.closeAt && new Date() > new Date(event.registrationSettings.closeAt))
  );
  const capacityReached = event.currentAttendees >= event.maxAttendees;
  const bookingBlocked = registrationClosed || capacityReached;
  const containerClassName = `ticket-booking-page ${isDarkMode ? 'theme-dark' : 'theme-light'}`;
  const ctaLabel = booking
    ? 'Submitting...'
    : bookingStage === 'confirmed'
      ? 'Ticket Confirmed'
      : bookingStage === 'pendingApproval'
        ? 'Awaiting Admin Approval'
        : totalAmount > 0
          ? 'Pay And Confirm Ticket'
          : 'Book Free Ticket';

  return (
    <div className={containerClassName}>
      <svg className="ticket-booking-bg" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,256L60,240C120,224,240,192,360,176C480,160,600,160,720,170.7C840,181,960,203,1080,202.7C1200,203,1320,181,1380,170.7L1440,160L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z" />
      </svg>
      <div className="container">
        <div className="page-header ticket-booking-header">
          <h2>Book Ticket for {event.title}</h2>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIsDarkMode((prev) => !prev)}
          >
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <div className="card ticket-booking-card fade-in-up">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success pulse-soft">{success}</div>}
          {bookingBlocked && (
            <div className="alert alert-info">
              {registrationClosed
                ? 'Registration is closed for this event.'
                : 'This event has reached maximum attendee capacity.'}
            </div>
          )}

          <form onSubmit={handleBooking}>
            <div className="form-group">
              <label>Select Ticket Type</label>
              <select
                value={selectedTicketIndex}
                onChange={(e) => setSelectedTicketIndex(parseInt(e.target.value))}
                required
              >
                {event.ticketTypes.map((ticket, index) => (
                  <option key={index} value={index}>
                    {ticket.name} - ${ticket.price} (Available: {ticket.quantity - ticket.sold})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                min="1"
                max={selectedTicket ? selectedTicket.quantity - selectedTicket.sold : 1}
                required
              />
            </div>

            {totalAmount > 0 && (
              <>
                <div className="form-group">
                  <label>Payment Method</label>
                  <div style={{ 
                    padding: '1rem', 
                    background: 'linear-gradient(135deg, #1f9d55 0%, #15803d 100%)',
                    borderRadius: '12px',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</div>
                    <strong>UPI Realtime Payment</strong>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.9 }}>
                      Complete payment in your UPI app and submit your UPI reference ID for instant confirmation.
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label>UPI Transaction/Reference ID *</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Example: 412345678901"
                    minLength={12}
                    maxLength={30}
                    pattern="[A-Za-z0-9]{12,30}"
                    required
                  />
                  <p style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: '#5b6879' }}>
                    We will verify payment in realtime and issue your ticket immediately.
                  </p>
                </div>
              </>
            )}

            <div style={{ 
              padding: '1rem', 
              background: '#f8f9fa', 
              borderRadius: '4px', 
              marginBottom: '1.5rem' 
            }}>
              <h3>Order Summary</h3>
              <p><strong>Ticket:</strong> {selectedTicket?.name}</p>
              <p><strong>Quantity:</strong> {quantity}</p>
              <p><strong>Price per ticket:</strong> ${selectedTicket?.price}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1rem' }}>
                <strong>Total:</strong> ${totalAmount.toFixed(2)}
              </p>
            </div>

            <button
              type="submit"
              className={`btn btn-success booking-cta ${bookingStage === 'confirmed' ? 'cta-confirmed' : ''}`}
              disabled={booking || bookingBlocked || bookingStage === 'confirmed'}
            >
              {ctaLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TicketBooking;

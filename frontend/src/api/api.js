import axios from 'axios';

// This will use your Render URL in production, and localhost when you run it locally!
export const API_ORIGIN = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const API = axios.create({
  baseURL: API_ORIGIN
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const register = (userData) => API.post('/auth/register', userData);
export const login = (credentials) => API.post('/auth/login', credentials);
export const forgotPassword = (payload) => API.post('/auth/forgot-password', payload);
export const getMe = () => API.get('/auth/me');
export const updatePaymentDetails = (paymentData) => API.put('/auth/payment-details', paymentData);

// Event APIs
export const getEvents = (params) => API.get('/events', { params });
export const getEvent = (id) => API.get(`/events/${id}`);
export const createEvent = (eventData) => API.post('/events', eventData);
export const updateEvent = (id, eventData) => API.put(`/events/${id}`, eventData);
export const deleteEvent = (id) => API.delete(`/events/${id}`);
export const getEventsByOrganizer = (userId) => API.get(`/events/organizer/${userId}`);
export const getEventHistory = (eventId) => API.get(`/events/${eventId}/history`);
export const restoreEventHistory = (eventId, historyId) =>
  API.post(`/events/${eventId}/history/${historyId}/restore`);
export const addCollaborator = (eventId, payload) => API.post(`/events/${eventId}/collaborators`, payload);
export const updateCollaboratorRole = (eventId, collaboratorId, payload) =>
  API.patch(`/events/${eventId}/collaborators/${collaboratorId}`, payload);
export const removeCollaborator = (eventId, collaboratorId) =>
  API.delete(`/events/${eventId}/collaborators/${collaboratorId}`);

// Upload APIs
export const uploadPoster = (formData) => {
  return API.post('/upload/poster', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// Ticket APIs
export const bookTicket = (bookingData) => API.post('/tickets/book', bookingData);
export const getMyTickets = () => API.get('/tickets/my-tickets');
export const getTicket = (id) => API.get(`/tickets/${id}`);
export const getEventTickets = (eventId) => API.get(`/tickets/event/${eventId}`);
export const cancelTicket = (id) => API.put(`/tickets/${id}/cancel`);

// Payment APIs
export const createPaymentIntent = (paymentData) => API.post('/payments/create-intent', paymentData);
export const confirmPayment = (paymentId) => API.post(`/payments/confirm/${paymentId}`);
export const createManualPayment = (paymentData) => API.post('/payments/manual', paymentData);
export const getMyPayments = () => API.get('/payments/my-payments');
export const getPayment = (id) => API.get(`/payments/${id}`);

// Check-in APIs
export const checkIn = (checkInData) => API.post('/checkin/scan', checkInData);
export const verifyTicket = (verifyData) => API.post('/checkin/verify', verifyData);
export const getCheckInStats = (eventId) => API.get(`/checkin/stats/${eventId}`);

// Admin APIs
export const getAdminUsers = () => API.get('/admin/users');
export const deleteAdminUser = (id) => API.delete(`/admin/users/${id}`);
export const getAdminTickets = () => API.get('/admin/tickets');
export const getAdminPayments = (status = 'pending') => API.get('/admin/ticket-payments', { params: { status } });
export const approvePayment = (paymentId, note) => API.put(`/admin/ticket-payments/${paymentId}`, { action: 'approve', note });
export const rejectPayment = (paymentId, note) => API.put(`/admin/ticket-payments/${paymentId}`, { action: 'reject', note });
export const getAdminStats = () => API.get('/admin/stats');
export const verifyUserPayment = (userId) => API.put(`/admin/verify-payment/${userId}`);
export const getPendingVerifications = () => API.get('/admin/pending-verifications');
export const getAdminLogs = (limit = 100, skip = 0, action = null, adminEmail = null) => {
  const params = { limit, skip };
  if (action) params.action = action;
  if (adminEmail) params.adminEmail = adminEmail;
  return API.get('/admin/logs', { params });
};

export default API;

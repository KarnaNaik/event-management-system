import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import EventList from './pages/EventList';
import EventDetails from './pages/EventDetails';
import CreateEvent from './pages/CreateEvent';
import MyTickets from './pages/MyTickets';
import TicketBooking from './pages/TicketBooking';
import CheckIn from './pages/CheckIn';
import Dashboard from './pages/Dashboard';
import PaymentSettings from './pages/PaymentSettings';
import AdminPanel from './pages/AdminPanel';
import OrganizerProfile from './pages/OrganizerProfile';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="loading" style={{ textAlign: 'center', marginTop: '50px' }}>Loading application...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={user ? <Navigate to="/events" /> : <Login onLogin={handleLogin} />} />
          <Route path="/forgot-password" element={user ? <Navigate to="/events" /> : <ForgotPassword />} />
          <Route path="/register" element={user ? <Navigate to="/events" /> : <Register onLogin={handleLogin} />} />
          <Route path="/events" element={<EventList user={user} />} />
          <Route path="/events/:id" element={<EventDetails user={user} />} />
          <Route
            path="/create-event"
            element={
              user && (user.role === 'organizer' || user.role === 'admin')
                ? <CreateEvent user={user} />
                : <Navigate to="/" />
            }
          />
          <Route path="/book-ticket/:eventId" element={user ? <TicketBooking user={user} /> : <Navigate to="/login" />} />
          <Route path="/my-tickets" element={user ? <MyTickets user={user} /> : <Navigate to="/login" />} />
          <Route path="/checkin/:eventId" element={user ? <CheckIn user={user} /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/payment-settings" element={user && (user.role === 'organizer' || user.role === 'admin') ? <PaymentSettings user={user} /> : <Navigate to="/" />} />
          <Route path="/admin" element={user && user.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <OrganizerProfile user={user} /> : <Navigate to="/login" />} />
          <Route path="/profile/:id" element={<OrganizerProfile user={user} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

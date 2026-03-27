import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="brand-link">
          <span className="brand-mark" aria-hidden="true">EM</span>
          <h1>Event Manager</h1>
        </Link>
        <ul className="nav-links">
          <li><Link to="/events">Events</Link></li>
          {user ? (
            <>
              {(user.role === 'organizer' || user.role === 'admin') && (
                <>
                  <li><Link to="/create-event">Create Event</Link></li>
                  <li><Link to="/payment-settings">Payment Settings</Link></li>
                </>
              )}
              {user.role === 'admin' && (
                <li><Link to="/admin">Admin Panel</Link></li>
              )}
              <li><Link to="/my-tickets">My Tickets</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/profile">My Profile</Link></li>
              <li><button type="button" onClick={onLogout} className="btn btn-danger">Logout</button></li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;

import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="page home-page">
      <div className="container">
        <section className="hero-shell">
          <div className="hero-content">
            <p className="hero-kicker">An elevated event platform</p>
            <h1 className="hero-title">Plan with precision. Host with style.</h1>
            <p className="hero-subtitle">
              Create standout events, sell tickets confidently, and run smooth check-ins from one beautifully practical workspace.
            </p>
            <div className="hero-actions">
              <Link to="/events" className="btn btn-primary">Explore Events</Link>
              <Link to="/register" className="btn btn-ghost">Start Free</Link>
            </div>
          </div>
          <div className="hero-orb" aria-hidden="true"></div>
        </section>

        <section className="stats-strip" aria-label="Platform highlights">
          <div className="stats-tile">
            <strong>Fast launch</strong>
            <span>Publish events in minutes</span>
          </div>
          <div className="stats-tile">
            <strong>Smart access</strong>
            <span>QR-based entry validation</span>
          </div>
          <div className="stats-tile">
            <strong>Multi-role</strong>
            <span>User, organizer, and admin views</span>
          </div>
        </section>

        <section className="feature-grid">
          <div className="card feature-card">
            <h3>Create polished event pages</h3>
            <p>Publish venues, ticket tiers, hosts, and speaker details in a structure attendees immediately trust.</p>
          </div>
          <div className="card feature-card">
            <h3>Deliver frictionless booking</h3>
            <p>Let users reserve tickets quickly with transparent pricing and instant confirmations.</p>
          </div>
          <div className="card feature-card">
            <h3>Run smooth check-in operations</h3>
            <p>Use QR verification for quick gate flow, reliable attendance tracking, and fewer manual errors.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../api/api';

function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await register(formData);
      onLogin(response.data.user, response.data.token);
      navigate(response.data.user.role === 'admin' ? '/admin' : '/events');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Register</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="user">User (Attendee)</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>
                {formData.role === 'organizer' && (
                  <p style={{ 
                    marginTop: '10px', 
                    padding: '10px', 
                    backgroundColor: '#d1ecf1', 
                    border: '1px solid #bee5eb',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#0c5460'
                  }}>
                    ℹ️ After registration, please add your payment details in Payment Settings to receive event payments.
                  </p>
                )}
                {formData.role === 'admin' && (
                  <p style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeeba',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#856404'
                  }}>
                    Admin account can be created only with email <strong>admin@event.co.gmail</strong> and password <strong>Admin777</strong>.
                  </p>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </button>
            </form>
            <p style={{ marginTop: '20px', textAlign: 'center' }}>
              Already have an account? <a href="/login" style={{ color: '#2c3e50' }}>Login here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

import React, { useState, useEffect, useCallback } from 'react';
import { getMe, updatePaymentDetails } from '../api/api';

function PaymentSettings({ user }) {
  const STATUS_REFRESH_MS = 15000;
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    accountHolderName: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [currentDetails, setCurrentDetails] = useState(null);

  const fetchPaymentDetails = useCallback(async () => {
    try {
      const response = await getMe();
      if (response.data.data.paymentDetails) {
        setCurrentDetails(response.data.data.paymentDetails);
        setFormData({
          bankName: response.data.data.paymentDetails.bankName || '',
          accountNumber: response.data.data.paymentDetails.accountNumber || '',
          ifscCode: response.data.data.paymentDetails.ifscCode || '',
          upiId: response.data.data.paymentDetails.upiId || '',
          accountHolderName: response.data.data.paymentDetails.accountHolderName || ''
        });
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  }, []);

  useEffect(() => {
    if (user && (user.role === 'organizer' || user.role === 'admin')) {
      fetchPaymentDetails();
    }
  }, [fetchPaymentDetails, user]);

  useEffect(() => {
    if (!currentDetails || currentDetails.verified) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPaymentDetails();
      }
    }, STATUS_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [STATUS_REFRESH_MS, currentDetails, fetchPaymentDetails]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await updatePaymentDetails(formData);
      setMessage('Payment details saved successfully.');
      setMessageType('success');
      await fetchPaymentDetails();
    } catch (error) {
      console.error('Payment details error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update payment details';
      
      if (error.response?.status === 403) {
        setMessage('⚠️ Access denied. Only organizers can update payment details.');
      } else if (error.response?.status === 401) {
        setMessage('⚠️ Please login again to continue.');
      } else {
        setMessage(`❌ ${errorMsg}`);
      }
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission - after all hooks are called
  if (user && user.role !== 'organizer' && user.role !== 'admin') {
    return (
      <div className="page">
        <div className="container">
          <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
            <h2 style={{ color: '#e74c3c', marginBottom: '1rem' }}>⚠️ Access Denied</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              Only event organizers can manage payment settings.
            </p>
            <p style={{ color: '#64748b' }}>
              If you want to organize events, please contact the administrator to upgrade your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h2>💳 Payment Settings</h2>
          <p style={{ color: 'white', marginTop: '0.5rem' }}>
            Add your bank or UPI details to receive payments
          </p>
        </div>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {currentDetails && currentDetails.verified && (
            <div className="alert alert-success" style={{ marginBottom: '2rem' }}>
              ✅ Your payment details are verified
            </div>
          )}

          {currentDetails && !currentDetails.verified && (
            <div className="alert alert-info" style={{ marginBottom: '2rem' }}>
              ⏳ Your payment details are awaiting verification. Admin approval is required before payouts.
            </div>
          )}

          {message && (
            <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '1.5rem', color: '#667eea' }}>🏦 Bank Details</h3>
            
            <div className="form-group">
              <label>Bank Name</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g., State Bank of India"
              />
            </div>

            <div className="form-group">
              <label>Account Holder Name</label>
              <input
                type="text"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleChange}
                placeholder="As per bank records"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  placeholder="Enter account number"
                />
              </div>

              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  placeholder="e.g., SBIN0001234"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1.5rem', color: '#667eea' }}>
              📱 UPI Details
            </h3>

            <div className="form-group">
              <label>UPI ID</label>
              <input
                type="text"
                name="upiId"
                value={formData.upiId}
                onChange={handleChange}
                placeholder="e.g., yourname@paytm"
              />
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                You can provide either bank details or UPI ID, or both
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-success" 
              disabled={loading}
              style={{ marginTop: '1rem' }}
            >
              {loading ? 'Saving...' : 'Save Payment Details'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: '1rem', marginLeft: '0.6rem' }}
              onClick={fetchPaymentDetails}
            >
              Check Verification Status
            </button>
          </form>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            color: 'white'
          }}>
            <h4 style={{ marginBottom: '1rem' }}>ℹ️ Important Information</h4>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li>Your payment details will be verified by our admin team</li>
              <li>Once verified, you'll receive payments directly to your account</li>
              <li>All payment information is encrypted and secure</li>
              <li>You can update your details anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSettings;

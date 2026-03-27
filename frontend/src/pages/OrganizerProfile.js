import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function OrganizerProfile({ user }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    company: '',
    position: '',
    website: '',
    avatar: '',
    twitter: '',
    linkedin: '',
    facebook: '',
    instagram: ''
  });

  const isOwnProfile = user && (!id || id === user.id || id === user._id);

  const fetchProfile = useCallback(async () => {
    try {
      const userId = id || user.id || user._id;
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/profile/${userId}`);
      setProfile(response.data);
      
      // Populate form data
      setFormData({
        name: response.data.name || '',
        phone: response.data.phone || '',
        bio: response.data.profile?.bio || '',
        company: response.data.profile?.company || '',
        position: response.data.profile?.position || '',
        website: response.data.profile?.website || '',
        avatar: response.data.profile?.avatar || '',
        twitter: response.data.profile?.socialLinks?.twitter || '',
        linkedin: response.data.profile?.socialLinks?.linkedin || '',
        facebook: response.data.profile?.socialLinks?.facebook || '',
        instagram: response.data.profile?.socialLinks?.instagram || ''
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage('Error loading profile');
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/profile`,
        {
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
          company: formData.company,
          position: formData.position,
          website: formData.website,
          avatar: formData.avatar,
          socialLinks: {
            twitter: formData.twitter,
            linkedin: formData.linkedin,
            facebook: formData.facebook,
            instagram: formData.instagram
          }
        },
        {
          headers: { 'x-auth-token': token }
        }
      );
      
      setMessage('Profile updated successfully!');
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile');
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="page"><div className="container">Profile not found</div></div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h2>{isOwnProfile ? 'My Profile' : `${profile.name}'s Profile`}</h2>
          {isOwnProfile && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              Edit Profile
            </button>
          )}
        </div>

        {message && (
          <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
            {message}
          </div>
        )}

        {isEditing ? (
          <div className="card">
            <h3>Edit Profile</h3>
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
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label>Avatar URL</label>
                <input
                  type="url"
                  name="avatar"
                  value={formData.avatar}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '15px' }}>Social Links</h4>

              <div className="form-group">
                <label>Twitter</label>
                <input
                  type="text"
                  name="twitter"
                  value={formData.twitter}
                  onChange={handleChange}
                  placeholder="@username or URL"
                />
              </div>

              <div className="form-group">
                <label>LinkedIn</label>
                <input
                  type="text"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  placeholder="LinkedIn profile URL"
                />
              </div>

              <div className="form-group">
                <label>Facebook</label>
                <input
                  type="text"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  placeholder="Facebook profile URL"
                />
              </div>

              <div className="form-group">
                <label>Instagram</label>
                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  placeholder="@username or URL"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-success">
                  Save Changes
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
              {profile.profile?.avatar && (
                <div style={{ flexShrink: 0 }}>
                  <img 
                    src={profile.profile.avatar} 
                    alt={profile.name}
                    style={{ 
                      width: '150px', 
                      height: '150px', 
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #2c3e50'
                    }}
                  />
                </div>
              )}
              
              <div style={{ flex: 1 }}>
                <h3 style={{ marginTop: 0 }}>{profile.name}</h3>
                
                {profile.profile?.position && profile.profile?.company && (
                  <p style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>
                    {profile.profile.position} at {profile.profile.company}
                  </p>
                )}
                
                <div className="badge">{profile.role}</div>
                
                <p style={{ marginTop: '15px' }}>
                  <strong>Email:</strong> {profile.email}
                </p>
                
                {profile.phone && (
                  <p><strong>Phone:</strong> {profile.phone}</p>
                )}
                
                {profile.profile?.website && (
                  <p>
                    <strong>Website:</strong>{' '}
                    <a href={profile.profile.website} target="_blank" rel="noopener noreferrer">
                      {profile.profile.website}
                    </a>
                  </p>
                )}
                
                {profile.profile?.bio && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>About</h4>
                    <p>{profile.profile.bio}</p>
                  </div>
                )}
                
                {profile.profile?.socialLinks && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>Social Links</h4>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                      {profile.profile.socialLinks.twitter && (
                        <a href={profile.profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="btn">
                          Twitter
                        </a>
                      )}
                      {profile.profile.socialLinks.linkedin && (
                        <a href={profile.profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="btn">
                          LinkedIn
                        </a>
                      )}
                      {profile.profile.socialLinks.facebook && (
                        <a href={profile.profile.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="btn">
                          Facebook
                        </a>
                      )}
                      {profile.profile.socialLinks.instagram && (
                        <a href={profile.profile.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="btn">
                          Instagram
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrganizerProfile;

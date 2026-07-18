import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../services/profileService';

const Profile = () => {
  const { user, updateUser } = useAuth();
  
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ type: '', text: '' });
    try {
      const res = await updateProfile(profileData);
      updateUser(res.data.data.user);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'danger', text: 'New passwords do not match' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });
    try {
      await changePassword({ 
        currentPassword: passwordData.currentPassword, 
        newPassword: passwordData.newPassword 
      });
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mt-5 fade-in mb-5">
      <h2 className="font-serif fw-bold text-primary mb-4">My Profile</h2>
      <div className="row g-4">
        {/* Profile Info */}
        <div className="col-lg-6">
          <div className="modern-card p-4 shadow-sm h-100">
            <h4 className="fw-bold mb-4 text-accent border-bottom pb-2">Personal Information</h4>
            {profileMessage.text && (
              <div className={`alert alert-${profileMessage.type} py-2`}>{profileMessage.text}</div>
            )}
            <form onSubmit={handleProfileSubmit}>
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">Email (Read-only)</label>
                <input type="email" className="form-control bg-light" value={user.email} disabled />
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">Role (Read-only)</label>
                <input type="text" className="form-control bg-light text-capitalize" value={user.role} disabled />
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="first_name" className="form-label fw-bold">First Name</label>
                  <input id="first_name" type="text" name="first_name" className="form-control" value={profileData.first_name} onChange={handleProfileChange} required />
                </div>
                <div className="col-md-6 mt-3 mt-md-0">
                  <label htmlFor="last_name" className="form-label fw-bold">Last Name</label>
                  <input id="last_name" type="text" name="last_name" className="form-control" value={profileData.last_name} onChange={handleProfileChange} required />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="phone" className="form-label fw-bold">Phone Number</label>
                <input id="phone" type="text" name="phone" className="form-control" value={profileData.phone} onChange={handleProfileChange} />
              </div>
              <button type="submit" className="btn btn-primary px-4" disabled={profileLoading}>
                {profileLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Update Profile'}
              </button>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="col-lg-6">
          <div className="modern-card p-4 shadow-sm h-100">
            <h4 className="fw-bold mb-4 text-accent border-bottom pb-2">Change Password</h4>
            {passwordMessage.text && (
              <div className={`alert alert-${passwordMessage.type} py-2`}>{passwordMessage.text}</div>
            )}
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-3">
                <label htmlFor="currentPassword" className="form-label fw-bold">Current Password</label>
                <input id="currentPassword" type="password" name="currentPassword" className="form-control" value={passwordData.currentPassword} onChange={handlePasswordChange} required />
              </div>
              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label fw-bold">New Password</label>
                <input id="newPassword" type="password" name="newPassword" className="form-control" value={passwordData.newPassword} onChange={handlePasswordChange} required minLength={6} />
              </div>
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="form-label fw-bold">Confirm New Password</label>
                <input id="confirmPassword" type="password" name="confirmPassword" className="form-control" value={passwordData.confirmPassword} onChange={handlePasswordChange} required minLength={6} />
              </div>
              <button type="submit" className="btn btn-outline-primary px-4" disabled={passwordLoading}>
                {passwordLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

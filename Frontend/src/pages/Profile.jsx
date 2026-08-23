import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  User,
  Mail,
  Phone,
  Hash,
  ShieldCheck,
  Edit3,
  Save,
  X
} from 'lucide-react';

import '../styles/Profile.css';

const Profile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    usn: '',
    role: ''
  });

  const [editMode, setEditMode] = useState(false);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      setProfile({
        name: payload.name || 'Student',
        email: payload.email || '',
        phone: payload.phone || '',
        usn: payload.usn || '',
        role: payload.role || 'student'
      });

      const savedPhoto = localStorage.getItem('profilePhoto');

      if (savedPhoto) {
        setPhoto(savedPhoto);
      }
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setPhoto(reader.result);
      localStorage.setItem('profilePhoto', reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    /*
      UI-only save for now.

      Permanent name/phone changes require
      a backend profile-update API.
    */

    setEditMode(false);

    alert(
      'Profile changes saved for this session.'
    );
  };

  const handleCancel = () => {
    setEditMode(false);

    const token = localStorage.getItem('token');

    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      setProfile({
        name: payload.name || 'Student',
        email: payload.email || '',
        phone: payload.phone || '',
        usn: payload.usn || '',
        role: payload.role || 'student'
      });
    } catch (error) {
      console.error(error);
    }
  };

  const getInitials = () => {
    if (!profile.name) return 'S';

    return profile.name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="profile-page">

      {/* Header */}

      <div className="profile-page-header">

        <button
          className="profile-back-btn"
          onClick={() => navigate('/student')}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div>
          <h1>My Profile</h1>

          <p>
            Manage your personal information and account details.
          </p>
        </div>

      </div>


      {/* Main */}

      <div className="profile-container">

        {/* Profile Hero */}

        <section className="profile-hero">

          <div className="profile-photo-wrapper">

            {photo ? (
              <img
                src={photo}
                alt="Profile"
                className="profile-photo"
              />
            ) : (
              <div className="profile-photo-placeholder">
                {getInitials()}
              </div>
            )}

            {editMode && (
              <label
                htmlFor="profile-photo"
                className="photo-edit-btn"
              >
                <Camera size={17} />
              </label>
            )}

            <input
              id="profile-photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              hidden
            />

          </div>

          <div className="profile-hero-info">

            <div className="profile-name-row">

              <h2>{profile.name || 'Student'}</h2>

              <span className="profile-role">
                <ShieldCheck size={14} />
                Student
              </span>

            </div>

            <p>{profile.email}</p>

            <span className="profile-status">
              <span className="status-dot"></span>
              Active account
            </span>

          </div>

          {!editMode && (
            <button
              className="edit-profile-btn"
              onClick={() => setEditMode(true)}
            >
              <Edit3 size={17} />
              Edit Profile
            </button>
          )}

        </section>


        {/* Personal Information */}

        <section className="profile-card">

          <div className="profile-card-header">

            <div>
              <h3>Personal Information</h3>

              <p>
                Update your personal details.
              </p>
            </div>

            <User size={21} />

          </div>


          <div className="profile-form-grid">

            {/* Name */}

            <div className="profile-field">

              <label>Full Name</label>

              <div className="profile-input-wrapper">

                <User size={18} />

                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  disabled={!editMode}
                  placeholder="Your full name"
                />

              </div>

            </div>


            {/* Email */}

            <div className="profile-field">

              <label>Email Address</label>

              <div className="profile-input-wrapper">

                <Mail size={18} />

                <input
                  type="email"
                  value={profile.email}
                  disabled
                />

              </div>

              <span className="field-note">
                Email address cannot be changed.
              </span>

            </div>


            {/* Phone */}

            <div className="profile-field">

              <label>Phone Number</label>

              <div className="profile-input-wrapper">

                <Phone size={18} />

                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!editMode}
                  placeholder="Add phone number"
                />

              </div>

            </div>


            {/* USN */}

            <div className="profile-field">

              <label>University Serial Number</label>

              <div className="profile-input-wrapper">

                <Hash size={18} />

                <input
                  type="text"
                  value={profile.usn || 'Not provided'}
                  disabled
                />

              </div>

            </div>


            {/* Role */}

            <div className="profile-field">

              <label>Account Type</label>

              <div className="profile-input-wrapper">

                <ShieldCheck size={18} />

                <input
                  type="text"
                  value="Student"
                  disabled
                />

              </div>

            </div>

          </div>


          {/* Actions */}

          {editMode && (

            <div className="profile-actions">

              <button
                className="cancel-profile-btn"
                onClick={handleCancel}
              >
                <X size={17} />
                Cancel
              </button>

              <button
                className="save-profile-btn"
                onClick={handleSave}
              >
                <Save size={17} />
                Save Changes
              </button>

            </div>

          )}

        </section>


        {/* Security */}

        <section className="profile-card security-card">

          <div className="security-icon">
            <ShieldCheck size={22} />
          </div>

          <div>

            <h3>Your account is protected</h3>

            <p>
              Your account uses secure authentication to
              protect your queue and appointment information.
            </p>

          </div>

        </section>

      </div>

    </div>
  );
};

export default Profile;
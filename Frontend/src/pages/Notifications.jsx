import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  Clock,
  Info,
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import '../styles/Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const parts = token.split('.');

      if (parts.length !== 3) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const payload = JSON.parse(atob(parts[1]));

      if (payload.role !== 'student') {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const response = await api.get('/notifications');

      setNotifications(
        Array.isArray(response.data?.notifications)
          ? response.data.notifications
          : []
      );
    } catch (error) {
      console.error(
        'Error fetching notifications:',
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: 1
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        'Error marking notification as read:',
        error.response?.data || error.message
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: 1
        }))
      );
    } catch (error) {
      console.error(
        'Error marking all notifications as read:',
        error.response?.data || error.message
      );
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'YOUR_TURN':
        return <CheckCircle size={22} />;

      case 'FACULTY_BUSY':
        return <Clock size={22} />;

      case 'QUEUE_JOINED':
        return <Bell size={22} />;

      case 'QUEUE_CANCELLED':
        return <AlertCircle size={22} />;

      default:
        return <Info size={22} />;
    }
  };

  const formatTime = (dateValue) => {
    if (!dateValue) {
      return '';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-loading">
          Loading notifications...
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">

      <div className="notifications-header">

        <button
          className="notifications-back"
          onClick={() => navigate('/student')}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="notifications-title-row">

          <div>
            <h1>Notifications</h1>

            <p>
              Stay updated about your queue and appointments.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              className="mark-all-button"
              onClick={markAllAsRead}
            >
              Mark all as read
            </button>
          )}

        </div>

      </div>

      {notifications.length === 0 ? (

        <div className="notifications-empty">

          <Bell size={55} />

          <h2>No Notifications</h2>

          <p>
            You don't have any notifications yet.
          </p>

        </div>

      ) : (

        <div className="notifications-list">

          {notifications.map((notification) => (

            <div
              key={notification.id}
              className={`notification-card ${
                !notification.is_read
                  ? 'unread'
                  : ''
              }`}
              onClick={() =>
                !notification.is_read &&
                markAsRead(notification.id)
              }
            >

              <div className="notification-icon">
                {getIcon(notification.type)}
              </div>

              <div className="notification-content">

                <div className="notification-top">

                  <h3>
                    {notification.title}
                  </h3>

                  {!notification.is_read && (
                    <span className="unread-dot" />
                  )}

                </div>

                <p>
                  {notification.message}
                </p>

                <span className="notification-time">
                  {formatTime(notification.created_at)}
                </span>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
};

export default Notifications;
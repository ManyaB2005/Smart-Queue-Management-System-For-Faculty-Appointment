import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) return;

    let payload;

    try {
      payload = JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
      console.error('Invalid token:', error);
      return;
    }

    if (payload.role !== 'student') return;

    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      console.log('🔔 Notification socket connected');

      socket.emit('join_student_room', payload.id);
    });

    socket.on('student_notification', (notification) => {
      console.log('🔔 New notification:', notification);

      setNotifications((prev) => [
        {
          id: Date.now(),
          message: notification.message,
          type: notification.type || 'info',
          read: false,
          createdAt: new Date()
        },
        ...prev
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true
      }))
    );
  };

  const removeNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '🟢';

      case 'warning':
        return '🟡';

      case 'error':
        return '🔴';

      case 'queue':
        return '🎫';

      case 'turn':
        return '🔔';

      default:
        return 'ℹ️';
    }
  };

  const formatTime = (date) => {
    if (!date) return '';

    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="notification-container">

      <button
        className="notification-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">

          <div className="notification-header">

            <div>
              <h3>Notifications</h3>

              <span>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'All caught up'}
              </span>
            </div>

            <button
              className="notification-close"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </button>

          </div>

          {notifications.length > 0 ? (
            <>
              <div className="notification-actions">

                <button onClick={markAllAsRead}>
                  <CheckCheck size={15} />
                  Mark all as read
                </button>

                <button onClick={clearAll}>
                  Clear all
                </button>

              </div>

              <div className="notification-list">

                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${
                      notification.read ? 'read' : 'unread'
                    }`}
                  >

                    <div className="notification-icon">
                      {getIcon(notification.type)}
                    </div>

                    <div className="notification-content">

                      <p>
                        {notification.message}
                      </p>

                      <span>
                        {formatTime(
                          notification.createdAt
                        )}
                      </span>

                    </div>

                    <button
                      className="notification-delete"
                      onClick={() =>
                        removeNotification(notification.id)
                      }
                    >
                      <X size={14} />
                    </button>

                  </div>
                ))}

              </div>
            </>
          ) : (
            <div className="notification-empty">

              <Bell size={35} />

              <h4>No notifications</h4>

              <p>
                Queue updates and important
                announcements will appear here.
              </p>

            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default NotificationBell;
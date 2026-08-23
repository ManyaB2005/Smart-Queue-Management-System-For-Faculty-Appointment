import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import './NotificationBell.css';

const NotificationBell = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);

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

    const socket = io(import.meta.env.VITE_API_URL);

    socket.on('connect', () => {
      console.log('🔔 Notification socket connected');

      socket.emit(
        'join_student_room',
        payload.id
      );
    });

    socket.on(
      'student_notification',
      (notification) => {
        console.log(
          '🔔 New notification:',
          notification
        );

        setNotifications((prev) => [
          {
            id: Date.now(),
            message: notification.message,
            type:
              notification.type || 'info',
            read: false,
            createdAt: new Date()
          },
          ...prev
        ]);
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) =>
      !notification.read
  ).length;

  return (
    <div className="notification-container">

      <button
        className="notification-button"
        onClick={() =>
          navigate('/notifications')
        }
        aria-label="Notifications"
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 9
              ? '9+'
              : unreadCount}
          </span>
        )}
      </button>

    </div>
  );
};

export default NotificationBell;
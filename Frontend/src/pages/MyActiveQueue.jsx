import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  Clock,
  Users,
  Ticket,
  User,
  XCircle
} from 'lucide-react';
import api from '../api/axios';
import QueueProgress from '../components/QueueProgress';
import '../styles/MyActiveQueue.css';

const MyActiveQueue = () => {
  const navigate = useNavigate();

  const [activeQueue, setActiveQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchActiveQueue = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const tokenParts = token.split('.');

      if (tokenParts.length !== 3) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const payload = JSON.parse(atob(tokenParts[1]));

      if (payload.role !== 'student') {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const response = await api.get('/queue/my-active-queue');

      setActiveQueue(
        response.data?.activeQueue || null
      );
    } catch (error) {
      console.error(
        'Error fetching active queue:',
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
    fetchActiveQueue();
  }, [fetchActiveQueue]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);

    socket.on('dashboard_update', () => {
      fetchActiveQueue();
    });

    socket.on('queue_advanced', () => {
      fetchActiveQueue();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchActiveQueue]);

  const handleCancel = async () => {
    if (!activeQueue?.id || cancelling) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to cancel this appointment?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancelling(true);

      await api.delete(
        `/queue/leave/${activeQueue.id}`
      );

      setActiveQueue(null);

      alert(
        'Appointment cancelled successfully.'
      );
    } catch (error) {
      console.error(
        'Cancel queue error:',
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
        'Failed to cancel appointment.'
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="active-queue-page">
        <div className="no-queue-card">
          <h2>Loading your queue...</h2>
        </div>
      </div>
    );
  }

  const isFacultyUnavailable =
    activeQueue &&
    activeQueue.faculty_status !== 'Available';

  return (
    <div className="active-queue-page">

      <div className="active-queue-header">

        <button
          className="back-button"
          onClick={() => navigate('/student')}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div>
          <h1>My Active Queue</h1>

          <p>
            Track your appointment in real time.
          </p>
        </div>

      </div>

      {!activeQueue ? (

        <div className="no-queue-card">

          <Ticket size={60} />

          <h2>No Active Queue</h2>

          <p>
            You are not currently waiting for any
            faculty member.
          </p>

          <button
            onClick={() => navigate('/student')}
          >
            Find Faculty
          </button>

        </div>

      ) : (

        <div className="queue-main-card">

          {/* STATUS */}

          <div className="queue-status-row">

            <span
              className={`faculty-status ${
                activeQueue.faculty_status
                  ?.toLowerCase()
                  .replace(/ /g, '-')
              }`}
            >
              {activeQueue.faculty_status}
            </span>

            <span className="queue-state">

              {activeQueue.status === 'active'
                ? 'Your Turn'
                : 'Waiting'}

            </span>

          </div>

          {/* FACULTY */}

          <div className="faculty-info">

            <div className="faculty-avatar">

              {activeQueue.facultyName
                ? activeQueue.facultyName
                    .substring(0, 2)
                    .toUpperCase()
                : 'FC'}

            </div>

            <div>

              <span>Faculty</span>

              <h2>
                {activeQueue.facultyName}
              </h2>

            </div>

          </div>

          {/* TOKEN */}

          <div className="token-section">

            <span>Your Token</span>

            <strong>
              {activeQueue.token_number}
            </strong>

          </div>

          {/* QUEUE METRICS */}

          <div className="queue-metrics">

            <div className="queue-metric">

              <Users size={22} />

              <span>Position</span>

              <strong>
                #{Number(activeQueue.position) || 1}
              </strong>

            </div>

            <div className="queue-metric">

              <Users size={22} />

              <span>People Ahead</span>

              <strong>
                {Number(activeQueue.peopleAhead) || 0}
              </strong>

            </div>

            <div className="queue-metric">

              <Clock size={22} />

              <span>Estimated Wait</span>

              <strong>

                {Number(activeQueue.estimatedWait) === 0
  ? 'No wait'
  : `~${(
      Number(activeQueue.estimatedWait) / 60
    ).toFixed(1)} min`
}

              </strong>

            </div>

          </div>

          {/* QUEUE PROGRESS */}

          <QueueProgress
            position={
              Number(activeQueue.position) || 1
            }
            status={activeQueue.status}
          />

          {/* FACULTY UNAVAILABLE MESSAGE */}

          {isFacultyUnavailable && (
            <div className="faculty-warning">

              <User size={20} />

              <div>

                <strong>
                  Faculty is currently{' '}
                  {activeQueue.faculty_status}
                </strong>

                <p>
                  Your position is saved in the queue.
                  The queue will continue when the
                  faculty becomes available again.
                </p>

              </div>

            </div>
          )}

          {/* YOUR TURN */}

          {activeQueue.status === 'active' && (
            <div className="your-turn-message">

              🎉 It's your turn!

              <p>
                Please proceed to the faculty desk.
              </p>

            </div>
          )}

          {/* CANCEL */}

          <button
            className="cancel-queue-button"
            onClick={handleCancel}
            disabled={cancelling}
          >

            <XCircle size={19} />

            {cancelling
              ? 'Cancelling...'
              : 'Cancel Appointment'}

          </button>

        </div>
      )}

    </div>
  );
};

export default MyActiveQueue;
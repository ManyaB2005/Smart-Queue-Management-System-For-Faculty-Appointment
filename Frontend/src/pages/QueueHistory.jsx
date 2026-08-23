import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Ticket,
  CalendarDays
} from 'lucide-react';
import api from '../api/axios';
import '../styles/QueueHistory.css';

const QueueHistory = () => {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
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

      const response = await api.get('/queue/history');

      setHistory(
        Array.isArray(response.data?.history)
          ? response.data.history
          : []
      );

    } catch (error) {
      console.error(
        'Error fetching queue history:',
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
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Date unavailable';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateValue) => {
    if (!dateValue) {
      return '';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (
      seconds === null ||
      seconds === undefined ||
      Number(seconds) <= 0
    ) {
      return 'Not recorded';
    }

    const totalSeconds = Number(seconds);

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${remainingSeconds} sec`;
    }

    if (remainingSeconds === 0) {
      return `${minutes} min`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="queue-history-page">
        <div className="history-loading">
          <h2>Loading queue history...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-history-page">

      <div className="queue-history-header">

        <button
          className="history-back-button"
          onClick={() => navigate('/student')}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div>
          <h1>Queue History</h1>

          <p>
            View your previous appointments and queue activity.
          </p>
        </div>

      </div>

      {history.length === 0 ? (

        <div className="empty-history-card">

          <Ticket size={60} />

          <h2>No Queue History</h2>

          <p>
            You have not completed or cancelled any
            appointments yet.
          </p>

          <button
            onClick={() => navigate('/student')}
          >
            Find Faculty
          </button>

        </div>

      ) : (

        <div className="history-list">

          {history.map((item) => {

            const isCompleted =
              item.status === 'completed';

            return (
              <div
                className="history-card"
                key={item.id}
              >

                <div className="history-card-top">

                  <div className="history-faculty">

                    <div className="history-avatar">
                      {item.facultyName
                        ? item.facultyName
                            .substring(0, 2)
                            .toUpperCase()
                        : 'FC'}
                    </div>

                    <div>
                      <span className="history-label">
                        Faculty
                      </span>

                      <h2>
                        {item.facultyName}
                      </h2>
                    </div>

                  </div>

                  <span
                    className={`history-status ${
                      isCompleted
                        ? 'completed'
                        : 'cancelled'
                    }`}
                  >

                    {isCompleted ? (
                      <>
                        <CheckCircle size={16} />
                        Completed
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        Cancelled
                      </>
                    )}

                  </span>

                </div>

                <div className="history-divider" />

                <div className="history-details">

                  <div className="history-detail">

                    <Ticket size={18} />

                    <div>
                      <span>Token</span>

                      <strong>
                        {item.tokenNumber}
                      </strong>
                    </div>

                  </div>

                  <div className="history-detail">

                    <CalendarDays size={18} />

                    <div>
                      <span>Date</span>

                      <strong>
                        {formatDate(item.createdAt)}
                      </strong>
                    </div>

                  </div>

                  <div className="history-detail">

                    <Clock size={18} />

                    <div>
                      <span>Joined</span>

                      <strong>
                        {formatTime(item.createdAt)}
                      </strong>
                    </div>

                  </div>

                  {isCompleted && (
                    <div className="history-detail">

                      <Clock size={18} />

                      <div>
                        <span>Meeting Duration</span>

                        <strong>
                          {formatDuration(
                            item.actualDuration
                          )}
                        </strong>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};

export default QueueHistory;
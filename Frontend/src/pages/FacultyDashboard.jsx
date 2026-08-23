import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Users,
  Play,
  CheckCircle,
  Pause,
  CircleStop,
  ChevronRight,
  Clock,
  BarChart3
} from 'lucide-react';
import { io } from 'socket.io-client';
import '../styles/FacultyDashboard.css';

const FacultyDashboard = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState('Available');
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [queue, setQueue] = useState([]);

  const [facultyName, setFacultyName] = useState('Loading...');
  const [facultyId, setFacultyId] = useState(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // =====================================================
  // FETCH FACULTY DATA
  // =====================================================

  const fetchQueueData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.role !== 'faculty') {
        alert('Unauthorized: Please log in as Faculty.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      setFacultyId(payload.id);
      setFacultyName(payload.name || 'Faculty');

      const queueResponse = await api.get('/faculty/queue');

      setCurrentStudent(
        queueResponse.data.currentStudent
      );

      setQueue(
        queueResponse.data.queue || []
      );

      const statusResponse = await api.get(
        `/queue/faculties/${payload.id}`
      );

      if (
        statusResponse.data &&
        statusResponse.data.faculty_status
      ) {
        setStatus(
          statusResponse.data.faculty_status
        );
      }

    } catch (error) {
      console.error(
        'Error fetching faculty dashboard:',
        error.response?.status,
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [navigate]);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // =====================================================
  // LIVE MEETING STOPWATCH
  // =====================================================

  useEffect(() => {
    let interval;

    if (
      currentStudent &&
      currentStudent.started_at
    ) {
      const startTime = new Date(
        currentStudent.started_at
      ).getTime();

      const updateTimer = () => {
        const now = Date.now();

        const elapsed = Math.floor(
          (now - startTime) / 1000
        );

        setElapsedSeconds(
          Math.max(0, elapsed)
        );
      };

      updateTimer();

      interval = setInterval(
        updateTimer,
        1000
      );
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentStudent]);

  // =====================================================
  // SOCKET.IO
  // =====================================================

  useEffect(() => {
    if (!facultyId) {
      return;
    }

    const socket = io(
      'http://localhost:5000',
      {
        transports: ['websocket']
      }
    );

    console.log(
      'Connecting faculty socket:',
      facultyId
    );

    socket.on('connect', () => {
      console.log(
        'Faculty socket connected:',
        socket.id
      );

      socket.emit(
        'join_faculty_room',
        facultyId
      );
    });

    socket.on(
      'queue_updated',
      () => {
        console.log(
          'Queue updated - refreshing faculty dashboard'
        );

        fetchQueueData();
      }
    );

    socket.on(
      'queue_advanced',
      () => {
        console.log(
          'Queue advanced - refreshing faculty dashboard'
        );

        fetchQueueData();
      }
    );

    socket.on('disconnect', () => {
      console.log(
        'Faculty socket disconnected'
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [facultyId, fetchQueueData]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // =====================================================
  // OPEN ANALYTICS
  // =====================================================

  const handleAnalytics = () => {
    navigate('/faculty/analytics');
  };

  // =====================================================
  // CHANGE FACULTY STATUS
  // =====================================================

  const handleStatusChange = async (newStatus) => {
    const previousStatus = status;

    setStatus(newStatus);

    // Busy and In Meeting should never pause the queue
    if (
      newStatus === 'Busy' ||
      newStatus === 'In Meeting'
    ) {
      setIsQueuePaused(false);
    }

    try {
      const response = await api.put(
        '/faculty/status',
        {
          status: newStatus
        }
      );

      console.log(
        'STATUS UPDATE SUCCESS:',
        response.data
      );

      await fetchQueueData();

    } catch (error) {
      console.error(
        'STATUS UPDATE FAILED:',
        error.response?.status,
        error.response?.data || error.message
      );

      setStatus(previousStatus);

      alert(
        error.response?.data?.message ||
        'Failed to update faculty status.'
      );
    }
  };

  // =====================================================
  // CALL NEXT STUDENT
  // =====================================================

  const callNextStudent = async () => {
    if (queue.length === 0) {
      return;
    }

    if (isQueuePaused) {
      return;
    }

    if (currentStudent !== null) {
      alert(
        'Please complete the current meeting first.'
      );

      return;
    }

    const nextStudent = queue[0];

    try {
      await api.post(
        '/faculty/call-next',
        {
          nextQueueId:
            nextStudent.queueId
        }
      );

      await fetchQueueData();

    } catch (error) {
      console.error(
        'Failed to call next student:',
        error.response?.status,
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
        'Failed to call next student.'
      );
    }
  };

  // =====================================================
  // COMPLETE CURRENT MEETING
  // =====================================================

  const markCompleted = async () => {
    if (!currentStudent) {
      return;
    }

    try {
      await api.post(
        '/faculty/complete',
        {
          queueId:
            currentStudent.queueId
        }
      );

      setElapsedSeconds(0);

      await fetchQueueData();

    } catch (error) {
      console.error(
        'Failed to complete meeting:',
        error.response?.status,
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
        'Failed to complete meeting.'
      );
    }
  };

  // =====================================================
  // FORMAT STOPWATCH
  // =====================================================

  const formatTime = (totalSeconds) => {
    if (totalSeconds < 0) {
      return '0:00';
    }

    const minutes = Math.floor(
      totalSeconds / 60
    );

    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  // =====================================================
  // OVERTIME
  // =====================================================

  const isOvertime =
    elapsedSeconds > 600;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="faculty-layout">

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <nav className="faculty-nav">

        <div className="nav-brand">
          <h2>
            Smart Queue
            <span> | Faculty Desk</span>
          </h2>
        </div>

        <div className="nav-profile">

          <span className="user-greeting">
            <User size={18} />
            Prof. {facultyName}
          </span>

          {/* ANALYTICS BUTTON */}

          <button
            type="button"
            onClick={handleAnalytics}
            className="btn-analytics"
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </button>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            className="btn-logout"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>

        </div>

      </nav>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="faculty-main">

        {/* =================================================
            STATUS PANEL
        ================================================= */}

        <div className="bento-card status-panel">

          <div className="status-header">

            <h3>
              Current Availability
            </h3>

            <p className="subtitle">
              Update your status to inform
              waiting students.
            </p>

          </div>

          <div className="status-toggles">

            {[
              'Available',
              'Busy',
              'In Meeting',
              'Out of Office'
            ].map((s) => (

              <button
                key={s}
                type="button"
                onClick={() =>
                  handleStatusChange(s)
                }
                className={`status-btn ${
                  status === s
                    ? s
                        .toLowerCase()
                        .replace(/ /g, '-')
                    : 'inactive'
                }`}
              >
                {s}
              </button>

            ))}

          </div>

        </div>

        {/* =================================================
            FACULTY DASHBOARD GRID
        ================================================= */}

        <div className="faculty-bento-grid">

          {/* =================================================
              CURRENT SESSION
          ================================================= */}

          <div className="bento-card active-session">

            <div className="card-header">

              <h3>
                <Play size={20} />
                Currently Serving
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsQueuePaused(
                    !isQueuePaused
                  )
                }
                className={`queue-toggle ${
                  isQueuePaused
                    ? 'paused'
                    : 'active'
                }`}
              >

                {isQueuePaused ? (
                  <Play size={14} />
                ) : (
                  <Pause size={14} />
                )}

                {isQueuePaused
                  ? 'Resume Queue'
                  : 'Pause Queue'}

              </button>

            </div>

            {currentStudent ? (

              <div className="current-student-display">

                <div className="token-massive">
                  {currentStudent.token}
                </div>

                <div className="student-name">
                  {currentStudent.name}
                </div>

                {/* STOPWATCH */}

                <div
                  style={{
                    fontSize: '1.2rem',
                    margin: '10px 0',
                    fontWeight: 'bold',
                    color: isOvertime
                      ? '#ef4444'
                      : '#10b981'
                  }}
                >
                  ⏱ {formatTime(elapsedSeconds)}

                  {isOvertime &&
                    ` (+${Math.floor(
                      (elapsedSeconds - 600) / 60
                    )} min delay)`
                  }
                </div>

                <button
                  type="button"
                  onClick={markCompleted}
                  className="btn-complete"
                >
                  <CheckCircle size={20} />
                  Complete Meeting
                </button>

              </div>

            ) : (

              <div className="empty-state">

                <CircleStop
                  size={48}
                  className="empty-icon"
                />

                <p>
                  No student currently
                  being served.
                </p>

              </div>

            )}

            <button
              type="button"
              onClick={callNextStudent}
              className="btn-call-next"
              disabled={
                queue.length === 0 ||
                isQueuePaused ||
                currentStudent !== null
              }
            >
              Call Next Student
              <ChevronRight size={20} />
            </button>

          </div>

          {/* =================================================
              WAITING QUEUE
          ================================================= */}

          <div className="bento-card waiting-queue">

            <div className="card-header">

              <h3>
                <Users size={20} />
                Waiting List
              </h3>

              <span className="queue-count">
                {queue.length} Total
              </span>

            </div>

            <div className="queue-list">

              {queue.length > 0 ? (

                queue.map(
                  (student, index) => (

                    <div
                      key={student.queueId}
                      className="queue-item"
                    >

                      <div className="queue-rank">
                        #{index + 1}
                      </div>

                      <div className="queue-info">

                        <span className="token">
                          {student.token}
                        </span>

                        <span className="name">
                          {student.name}
                        </span>

                      </div>

                      <div className="queue-time">

                        <Clock size={14} />

                        {student.timeIn}

                      </div>

                    </div>

                  )
                )

              ) : (

                <div className="empty-state">

                  <p>
                    The queue is currently empty.
                  </p>

                </div>

              )}

            </div>

          </div>

        </div>

      </main>

    </div>
  );
};

export default FacultyDashboard;
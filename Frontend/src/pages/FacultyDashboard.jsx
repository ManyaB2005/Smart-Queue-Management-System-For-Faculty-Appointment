import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Users, Play, CheckCircle, Pause, CircleStop, ChevronRight, Clock } from 'lucide-react';
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

  // ADDED: State to track live seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchQueueData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }

      const payload = JSON.parse(atob(token.split('.')[1]));
      
      if (payload.role !== 'faculty') {
        alert("Unauthorized: Please log in as Faculty.");
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      setFacultyId(payload.id);
      setFacultyName(payload.name);

      const response = await axios.get(`http://localhost:5000/api/faculty/queue/${payload.id}`);
      setCurrentStudent(response.data.currentStudent);
      setQueue(response.data.queue);

      const statusRes = await axios.get(`http://localhost:5000/api/queue/faculties/${payload.id}`);
      if (statusRes.data && statusRes.data.faculty_status) {
          setStatus(statusRes.data.faculty_status);
      }

    } catch (error) {
      console.error("Error fetching queue data:", error);
    }
  }, [navigate]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // ADDED: The live stopwatch logic
  useEffect(() => {
    let interval;
    if (currentStudent && currentStudent.started_at) {
      const startTime = new Date(currentStudent.started_at).getTime();
      interval = setInterval(() => {
        const now = new Date().getTime();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [currentStudent]);

  useEffect(() => {
    if (!facultyId) return;
    const socket = io('http://localhost:5000');
    socket.emit('join_faculty_room', facultyId);
    socket.on('queue_updated', fetchQueueData);
    socket.on('queue_advanced', fetchQueueData);
    return () => socket.disconnect();
  }, [facultyId, fetchQueueData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus); 
    try {
      await axios.put('http://localhost:5000/api/faculty/status', { facultyId, status: newStatus });
    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  const callNextStudent = async () => {
    if (queue.length === 0) return;
    const nextStudent = queue[0];
    try {
      await axios.post('http://localhost:5000/api/faculty/call-next', {
        facultyId: facultyId,
        nextQueueId: nextStudent.queueId
      });
      fetchQueueData();
    } catch (error) { console.error("Failed to call next student:", error); }
  };

  const markCompleted = async () => {
    if (!currentStudent) return;
    try {
      await axios.post('http://localhost:5000/api/faculty/complete', {
        facultyId: facultyId,
        queueId: currentStudent.queueId
      });
      fetchQueueData();
    } catch (error) { console.error("Failed to complete meeting:", error); }
  };

  // Helper to format seconds into MM:SS
  const formatTime = (totalSeconds) => {
    if (totalSeconds < 0) return "0:00";
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // If time crosses 10 minutes (600 seconds), it's overtime!
  const isOvertime = elapsedSeconds > 600;

  return (
    <div className="faculty-layout">
      <nav className="faculty-nav">
        <div className="nav-brand">
          <h2>Smart Queue <span>| Faculty Desk</span></h2>
        </div>
        <div className="nav-profile">
          <span className="user-greeting"><User size={18}/> Prof. {facultyName}</span>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18}/> <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="faculty-main">
        <div className="bento-card status-panel">
          <div className="status-header">
            <h3>Current Availability</h3>
            <p className="subtitle">Update your status to inform waiting students.</p>
          </div>
          <div className="status-toggles">
            {['Available', 'Busy', 'In Meeting', 'Out of Office'].map((s) => (
              <button 
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`status-btn ${status === s ? s.toLowerCase().replace(/ /g, '-') : 'inactive'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="faculty-bento-grid">
          
          <div className="bento-card active-session">
            <div className="card-header">
              <h3><Play size={20}/> Currently Serving</h3>
              <button 
                onClick={() => setIsQueuePaused(!isQueuePaused)} 
                className={`queue-toggle ${isQueuePaused ? 'paused' : 'active'}`}
              >
                {isQueuePaused ? <Play size={14}/> : <Pause size={14}/>} 
                {isQueuePaused ? 'Resume Queue' : 'Pause Queue'}
              </button>
            </div>
            
            {currentStudent ? (
              <div className="current-student-display">
                <div className="token-massive">{currentStudent.token}</div>
                <div className="student-name">{currentStudent.name}</div>
                
                {/* NEW: The Live Stopwatch Display */}
                <div style={{ fontSize: '1.2rem', margin: '10px 0', fontWeight: 'bold', color: isOvertime ? '#ef4444' : '#10b981' }}>
                  ⏱ {formatTime(elapsedSeconds)} {isOvertime ? `(+${Math.floor((elapsedSeconds - 600) / 60)} min delay)` : ''}
                </div>

                <button onClick={markCompleted} className="btn-complete">
                  <CheckCircle size={20}/> Complete Meeting
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <CircleStop size={48} className="empty-icon" />
                <p>No student currently being served.</p>
              </div>
            )}

            <button 
              onClick={callNextStudent} 
              className="btn-call-next"
              disabled={queue.length === 0 || isQueuePaused || currentStudent !== null}
            >
              Call Next Student <ChevronRight size={20}/>
            </button>
          </div>

          <div className="bento-card waiting-queue">
            <div className="card-header">
              <h3><Users size={20}/> Waiting List</h3>
              <span className="queue-count">{queue.length} Total</span>
            </div>
            
            <div className="queue-list">
              {queue.length > 0 ? queue.map((student, index) => (
                <div key={student.queueId} className="queue-item">
                  <div className="queue-rank">#{index + 1}</div>
                  <div className="queue-info">
                    <span className="token">{student.token}</span>
                    <span className="name">{student.name}</span>
                  </div>
                  <div className="queue-time">
                    <Clock size={14} /> {student.timeIn}
                  </div>
                </div>
              )) : (
                <div className="empty-state">
                  <p>The queue is currently empty.</p>
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
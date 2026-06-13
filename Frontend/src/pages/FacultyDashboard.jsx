import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Users, Play, CheckCircle, Pause, CircleStop, ChevronRight } from 'lucide-react';
import '../styles/FacultyDashboard.css';

const FacultyDashboard = () => {
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('Available');
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [queue, setQueue] = useState([]);
  
  const [facultyName, setFacultyName] = useState('');
  const [facultyId, setFacultyId] = useState(null);

  // 1. DEFINE FUNCTION FIRST (Inside the component!)
  const fetchQueueData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      
      const payload = JSON.parse(atob(token.split('.')[1])); 
      setFacultyId(payload.id);
      setFacultyName(payload.name); 

      const response = await axios.get(`http://localhost:5000/api/faculty/queue/${payload.id}`);
      
      setCurrentStudent(response.data.currentStudent);
      setQueue(response.data.queue);
    } catch (error) {
      console.error("Error fetching queue data:", error);
    }
  };

  // 2. RUN IT IN USEEFFECT SECOND
  useEffect(() => {
    fetchQueueData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
  };

  // 3. REAL BUTTON LOGIC TO CALL NEXT STUDENT
  const callNextStudent = async () => {
    if (queue.length === 0) return;
    const nextStudent = queue[0];
    
    try {
      await axios.post('http://localhost:5000/api/faculty/call-next', {
        facultyId: facultyId,
        nextQueueId: nextStudent.queueId
      });
      fetchQueueData(); // Refresh the screen instantly
    } catch (error) {
      console.error("Error calling next student:", error);
    }
  };

  // 4. REAL BUTTON LOGIC TO COMPLETE MEETING
  const markCompleted = async () => {
    if (!currentStudent) return;
    
    try {
      await axios.post('http://localhost:5000/api/faculty/complete', {
        facultyId: facultyId,
        queueId: currentStudent.queueId
      });
      fetchQueueData(); // Refresh the screen instantly
    } catch (error) {
      console.error("Error completing meeting:", error);
    }
  };

  const getStatusColor = (currentStatus) => {
    switch(currentStatus) {
      case 'Available': return 'status-green';
      case 'Busy': return 'status-amber';
      case 'In Meeting': return 'status-blue';
      default: return 'status-red';
    }
  };

  return (
    <div className="dashboard-layout">
      <nav className="top-nav">
        <div className="nav-brand">
          <h2>Smart Queue <span>| Faculty Desk</span></h2>
        </div>
        <div className="nav-profile">
          <span className="user-greeting"><User size={18}/> Prof. {facultyName}</span>
          <button onClick={handleLogout} className="btn-logout"><LogOut size={18}/> Logout</button>
        </div>
      </nav>

      <main className="dashboard-content">
        <div className="dashboard-header faculty-header">
          <div>
            <h1>Control Panel</h1>
            <p>Manage your appointments and availability.</p>
          </div>
          
          <div className="status-controls">
            <span className="control-label">Current Status:</span>
            <div className="status-buttons">
              {['Available', 'Busy', 'In Meeting', 'Out of Office'].map((s) => (
                <button 
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`btn-status ${status === s ? getStatusColor(s) : 'status-inactive'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="faculty-grid layout-split">
          <div className="active-session-panel">
            <h2><Play size={20}/> Currently Serving</h2>
            
            {currentStudent ? (
              <div className="current-student-card">
                <div className="token-massive">{currentStudent.token}</div>
                <h3>{currentStudent.name}</h3>
                <button onClick={markCompleted} className="btn-action btn-complete">
                  <CheckCircle size={18}/> Mark as Completed
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <CircleStop size={48} color="#9ca3af" />
                <p>No student currently being served.</p>
              </div>
            )}

            <div className="queue-actions">
              <button 
                onClick={callNextStudent} 
                className="btn-action btn-next"
                disabled={queue.length === 0}
              >
                Call Next Student <ChevronRight size={18}/>
              </button>
              <button 
                onClick={() => setIsQueuePaused(!isQueuePaused)} 
                className={`btn-action ${isQueuePaused ? 'btn-resume' : 'btn-pause'}`}
              >
                {isQueuePaused ? <Play size={18}/> : <Pause size={18}/>} 
                {isQueuePaused ? 'Resume Queue' : 'Pause Queue'}
              </button>
            </div>
          </div>

          <div className="waiting-queue-panel">
            <div className="panel-header">
              <h2><Users size={20}/> Waiting Queue ({queue.length})</h2>
            </div>
            
            <div className="queue-list">
              {queue.length > 0 ? queue.map((student, index) => (
                <div key={student.queueId} className="queue-list-item">
                  <div className="queue-position">#{index + 1}</div>
                  <div className="queue-details">
                    <span className="queue-token">{student.token}</span>
                    <span className="queue-name">{student.name}</span>
                  </div>
                  <div className="queue-time">{student.timeIn}</div>
                </div>
              )) : (
                <p className="empty-queue-text">The queue is currently empty.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FacultyDashboard;
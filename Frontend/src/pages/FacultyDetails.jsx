import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users, MapPin, BookOpen } from 'lucide-react';
import '../styles/FacultyDetails.css'; 

const FacultyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ faculty: null, count: 0, loading: true });
  const [activeQueue, setActiveQueue] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        const studentId = payload.id;

        const [fRes, cRes, statusRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/queue/faculties/${id}`),
          axios.get(`http://localhost:5000/api/queue/faculty-queue-count/${id}`),
          axios.get(`http://localhost:5000/api/queue/check-status/${studentId}`)
        ]);

        setData({ faculty: fRes.data, count: cRes.data.count, loading: false });

        const existingQueue = statusRes.data.activeQueue;
        if (existingQueue) {
          if (String(existingQueue.faculty_id) === String(id)) {
            setActiveQueue({
              isHere: true,
              queueId: existingQueue.id,
              tokenNumber: existingQueue.token_number,
              // Calculate wait time based ONLY on position
              estimatedWait: existingQueue.estimatedWait || (existingQueue.position * 10),
              position: existingQueue.position
            });
          } else {
            setActiveQueue({
              isHere: false,
              facultyName: existingQueue.facultyName
            });
          }
        }
      } catch (err) { 
        console.error(err); 
        setData({ faculty: null, count: 0, loading: false });
      }
    };
    fetchData();
  }, [id]);

  const handleJoinQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const res = await axios.post('http://localhost:5000/api/queue/join', { 
        studentId: payload.id, 
        facultyId: id, 
        reason: 'General Visit'
      });
      
      // Calculate position based on the CURRENT count
      const newPosition = data.count + 1;

      setActiveQueue({
        isHere: true,
        queueId: res.data.data.queueId,
        tokenNumber: res.data.token || res.data.data.tokenNumber, // Fallback if API response varies
        estimatedWait: newPosition * 10,
        position: newPosition
      });
      
      setData(prev => ({ ...prev, count: prev.count + 1 }));
    } catch (err) { alert("Error: " + err.response?.data?.message); }
  };

  const handleCancelQueue = async () => {
    try {
      if (activeQueue && activeQueue.queueId) {
        await axios.delete(`http://localhost:5000/api/queue/leave/${activeQueue.queueId}`);
      }
      setActiveQueue(null);
      setData(prev => ({ ...prev, count: Math.max(0, prev.count - 1) }));
    } catch (err) { alert("Failed to cancel queue."); }
  };

  if (data.loading) return <div className="modern-details-page"><h2>Loading interface...</h2></div>;

  const initials = data.faculty?.name ? data.faculty.name.substring(0, 2).toUpperCase() : 'PR';

  // --- THE MATH FIX ---
  const isMyQueue = activeQueue && activeQueue.isHere;
  const displayCount = isMyQueue ? Math.max(0, data.count - 1) : data.count;
  const waitText = isMyQueue ? "ahead of you" : "students waiting";
  // ------------------

  return (
    <div className="modern-details-page">
      <div className="page-header">
        <button className="nav-back-btn" onClick={() => navigate('/student')}>
          <ArrowLeft size={18} /> <span>Back to Portal</span>
        </button>
      </div>

      <div className="integrated-panel">
        <div className="faculty-profile-section">
          <div className="avatar-large">{initials}</div>
          <div className="profile-text">
            <h1>{data.faculty?.name}</h1>
            <div className="meta-tags">
              <span className="tag"><BookOpen size={14}/> Engineering</span>
            </div>
            <div className="live-status-pill">
              {/* Uses the adjusted displayCount and waitText */}
              <Users size={16} /> <strong>{displayCount}</strong> {waitText}
            </div>
          </div>
        </div>

        <div className="action-section">
          {activeQueue ? (
            activeQueue.isHere ? (
              /* SHOWS IF JOINED THIS QUEUE */
              <div className="modern-token-card">
                <div className="token-header">Your Digital Token</div>
                <div className="token-id">{activeQueue.tokenNumber}</div>
                <div className="metrics-row">
                  <div className="metric">
                    <span className="metric-label">Position</span>
                    <span className="metric-value">#{activeQueue.position}</span>
                  </div>
                  <div className="metric divider"></div>
                  <div className="metric">
                    <span className="metric-label">Est. Wait</span>
                    <span className="metric-value">{activeQueue.estimatedWait} <small>min</small></span>
                  </div>
                </div>
                <button className="btn-cancel" onClick={handleCancelQueue}>Cancel Appointment</button>
              </div>
            ) : (
              /* SHOWS IF JOINED A DIFFERENT QUEUE */
              <div className="join-prompt-card">
                <h3>Queue Active Elsewhere</h3>
                <p>You are currently waiting in the queue for <strong>{activeQueue.facultyName}</strong>. You must cancel that appointment before joining a new one.</p>
                <button className="btn-primary-large" style={{background: '#cbd5e1', cursor: 'not-allowed'}} disabled>
                  Already in a Queue
                </button>
              </div>
            )
          ) : (
            /* SHOWS IF NOT JOINED ANYWHERE */
            <div className="join-prompt-card">
              <h3>Queue Status: Open</h3>
              <p>Reserve your spot to meet with {data.faculty?.name}.</p>
              <button className="btn-primary-large" onClick={handleJoinQueue}>
                Join Queue Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyDetails;
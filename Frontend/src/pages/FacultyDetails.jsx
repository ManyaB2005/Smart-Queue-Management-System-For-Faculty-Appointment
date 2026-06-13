import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users } from 'lucide-react';
import '../styles/StudentDashboard.css';

const FacultyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ faculty: null, count: 0, loading: true });
  const [activeQueue, setActiveQueue] = useState(null);
  const [selectedReason, setSelectedReason] = useState('Project Discussion');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fRes, cRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/queue/faculties/${id}`),
          axios.get(`http://localhost:5000/api/queue/faculty-queue-count/${id}`)
        ]);
        setData({ faculty: fRes.data, count: cRes.data.count, loading: false });
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [id]);

  const handleJoinQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const res = await axios.post('http://localhost:5000/api/queue/join', { 
        studentId: payload.id, facultyId: id, reason: selectedReason 
      });
      setActiveQueue(res.data.data);
    } catch (err) { alert("Error: " + err.response?.data?.message); }
  };

  if (data.loading) return <div className="loading">Loading...</div>;

  return (
    <div className="details-page">
      <button className="back-btn" onClick={() => navigate('/student')}><ArrowLeft size={20} /> Back</button>
      
      <div className="content-card">
        <h1>Queue for {data.faculty?.name}</h1>
        <div className="stats-pill"><Users size={18} /> {data.count} students are waiting</div>

        {activeQueue ? (
          <div className="token-display">
            <h2>Your Token: <span>{activeQueue.tokenNumber}</span></h2>
            <p>Position: #{activeQueue.position} | Wait: {activeQueue.estimatedWait}m</p>
            <button className="cancel-btn" onClick={() => setActiveQueue(null)}>Cancel Appointment</button>
          </div>
        ) : (
          <div className="join-form">
            <label>Reason for visit:</label>
            <select onChange={(e) => setSelectedReason(e.target.value)}>
              {['Project Discussion', 'Signature', 'Project Submission', 'General Query'].map(r => 
                <option key={r} value={r}>{r}</option>
              )}
            </select>
            <button className="join-btn" onClick={handleJoinQueue}>Join Queue</button>
          </div>
        )}
      </div>
    </div>
  );
};
export default FacultyDetails;
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Search, Users, Clock } from 'lucide-react'; 
import { io } from 'socket.io-client';
import "../styles/StudentDashboard.css";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  
  // ADDED 1: State to hold the student's active queue
  const [activeQueue, setActiveQueue] = useState(null);

  const fetchFaculties = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      if (payload.role !== 'student') {
        alert("Unauthorized: You are logged in as Faculty. Please log in as a Student.");
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      setStudentName(payload.name || 'Student');

      // ADDED 2: Fetch both faculties AND the student's status at the same time
      const [facultyRes, statusRes] = await Promise.all([
        axios.get('http://localhost:5000/api/queue/faculties'),
        axios.get(`http://localhost:5000/api/queue/check-status/${payload.id}`)
      ]);

      setFaculties(facultyRes.data);
      setActiveQueue(statusRes.data.activeQueue);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchFaculties();
  }, [fetchFaculties]);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.on('dashboard_update', () => {
      fetchFaculties(); 
    });
    return () => socket.disconnect();
  }, [fetchFaculties]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const filteredFaculties = faculties.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (f.department && f.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="dashboard-container"><h2>Loading Portal...</h2></div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#3b82f6', display: 'block', marginBottom: '4px' }}>
            Hello, {studentName} 👋
          </span>
          <h1>Student Portal</h1>
          <p className="subtitle">Queue Management Hub</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} /><span>Logout</span>
        </button>
      </header>

      <div className="controls-section">
        <h2>Available Faculty</h2>
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bento-grid">
        {filteredFaculties.length > 0 ? (
          filteredFaculties.map((faculty) => {
            
            // ADDED 3: The math logic to subtract 1 ONLY if it is your queue
            const isMyQueue = activeQueue && activeQueue.faculty_id === faculty.id;
            const displayCount = isMyQueue ? Math.max(0, faculty.queueCount - 1) : faculty.queueCount;
            const waitText = isMyQueue ? "ahead of you" : "waiting";

            return (
              <div 
                key={faculty.id} 
                className="faculty-card"
                onClick={() => navigate(`/faculty-details/${faculty.id}`)}
              >
                <div className="card-top">
                  <span className={`status-badge ${(faculty.faculty_status || 'available').toLowerCase().replace(' ', '-')}`}>
                    {faculty.faculty_status || 'Available'}
                  </span>
                </div>
                
                <div className="card-body">
                  <h3>{faculty.name}</h3>
                  <p className="department">{faculty.department}</p>
                  
                  <div className="card-stats">
                    <div className="stat">
                      <Users size={16} />
                      {/* ADDED 4: Use the math variables here */}
                      <span>{displayCount} {waitText}</span>
                    </div>
                    <div className="stat" style={{ color: '#8b5cf6', background: '#f5f3ff' }}>
                      <Clock size={16} />
                      {/* ADDED 5: Use the math variable here */}
                      <span>~{displayCount * 10} mins</span>
                    </div>
                  </div>
                  
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">No faculty members found.</div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
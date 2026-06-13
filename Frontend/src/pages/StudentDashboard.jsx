import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import '../styles/StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState([]);

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/queue/faculties');
      setFaculties(response.data);
    } catch (err) { console.error("Failed to load", err); }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Student Portal</h1>
        <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} className="logout-btn">
          <LogOut size={16} /> Logout
        </button>
      </header>
      
      <h2>Available Faculty</h2>
      <div className="grid">
        {faculties.map((f) => (
          <div key={f.id} className="faculty-card" onClick={() => navigate(`/faculty-details/${f.id}`)}>
            <h3>{f.name}</h3>
            <p className="status">{f.faculty_status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default StudentDashboard;
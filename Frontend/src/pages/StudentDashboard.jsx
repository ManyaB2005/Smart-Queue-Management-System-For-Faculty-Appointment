import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { LogOut, Search, Users, Clock } from 'lucide-react';
import { io } from 'socket.io-client';
import '../styles/StudentDashboard.css';
import StudentMenu from '../components/StudentMenu';
import NotificationBell from '../components/NotificationBell';

const StudentDashboard = () => {
  const navigate = useNavigate();

  const [faculties, setFaculties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [activeQueue, setActiveQueue] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const fetchFaculties = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload.role !== 'student') {
        alert('Unauthorized: Please log in as a Student.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      setStudentName(payload.name || 'Student');

      const [facultyRes, statusRes] = await Promise.all([
        api.get('/queue/faculties'),
        api.get('/queue/check-status')
      ]);

      console.log(
        'FACULTIES RECEIVED IN FRONTEND:',
        facultyRes.data
      );

      const facultyData = Array.isArray(facultyRes.data)
        ? facultyRes.data
        : [];

      setFaculties(facultyData);
      setActiveQueue(statusRes.data?.activeQueue || null);
      console.log(
  'ACTIVE QUEUE FROM BACKEND:',
  statusRes.data?.activeQueue
);

console.log(
  'ESTIMATED WAIT:',
  statusRes.data?.activeQueue?.estimatedWait
);

      console.log('Faculty count:', facultyData.length);

    } catch (error) {
      console.error(
        'Error loading student dashboard:',
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
    fetchFaculties();
  }, [fetchFaculties]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);

    socket.on('dashboard_update', () => {
      fetchFaculties();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchFaculties]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

 

  const filteredFaculties = faculties.filter((faculty) => {
    const name = (faculty.name || '').toLowerCase();
    const department = (
      faculty.department || ''
    ).toLowerCase();

    const search = searchTerm.toLowerCase();

    return (
      name.includes(search) ||
      department.includes(search)
    );
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <h2>Loading Portal...</h2>
      </div>
    );
  }

  return (
    <div className="dashboard-container">

      <StudentMenu
  isOpen={menuOpen}
  setIsOpen={setMenuOpen}
  onNotifications={() =>
    navigate('/notifications')
  }
/>

      <header className="dashboard-header">

        <div>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#3b82f6',
              display: 'block',
              marginBottom: '4px'
            }}
          >
            Hello, {studentName} 👋
          </span>

          <h1>Student Portal</h1>

          <p className="subtitle">
            Queue Management Hub
          </p>
        </div>

        <div className="dashboard-header-actions">

          <NotificationBell />

          <button
            onClick={handleLogout}
            className="logout-btn"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>

        </div>

      </header>

      <div className="controls-section">

        <h2>Available Faculty</h2>

        <div className="search-box">

          <Search
            size={18}
            className="search-icon"
          />

          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />

        </div>

      </div>

      <div className="bento-grid">

        {filteredFaculties.length > 0 ? (

          filteredFaculties.map((faculty) => {

            const isMyQueue =
              activeQueue &&
              String(activeQueue.faculty_id) ===
                String(faculty.id);

            const isAvailable =
              faculty.faculty_status === 'Available';

            let peopleAhead = 0;

            if (isMyQueue) {

              const activeInside =
                Number(activeQueue.activeCount) || 0;

              const myPosition =
                Number(activeQueue.position) || 1;

              peopleAhead =
                activeInside +
                (myPosition - 1);

            } else {

              const activeInside =
                Number(faculty.activeCount) || 0;

              const waiting =
                Number(faculty.queueCount) || 0;

              peopleAhead =
                activeInside + waiting;
            }

            const waitText = isMyQueue
              ? 'ahead of you'
              : 'waiting';

            const estimatedWaitSeconds =
  isMyQueue
    ? Number(activeQueue?.estimatedWait) || 0
    : 0;

const waitTimeDisplay =
  isMyQueue
    ? (
        estimatedWaitSeconds === 0
          ? 'No wait'
          : `~${(
              estimatedWaitSeconds / 60
            ).toFixed(1)} mins`
      )
    : (
        peopleAhead === 0
          ? 'No wait'
          : 'Wait time available after joining'
      );
            return (
              <div
                key={faculty.id}
                className={`faculty-card ${
                  !isAvailable && !isMyQueue
                    ? 'disabled-card'
                    : ''
                }`}
                onClick={() => {

                  if (isAvailable || isMyQueue) {
                    navigate(
                      `/faculty-details/${faculty.id}`
                    );
                  }

                }}
                style={{
                  opacity:
                    isAvailable || isMyQueue
                      ? 1
                      : 0.6,

                  cursor:
                    isAvailable || isMyQueue
                      ? 'pointer'
                      : 'not-allowed',

                  transition:
                    'all 0.3s ease'
                }}
              >

                <div className="card-top">

                  <span
                    className={`status-badge ${
                      (
                        faculty.faculty_status ||
                        'Available'
                      )
                        .toLowerCase()
                        .replace(/ /g, '-')
                    }`}
                  >
                    {
                      faculty.faculty_status ||
                      'Available'
                    }
                  </span>

                </div>

                <div className="card-body">

                  <h3>
                    {faculty.name}
                  </h3>

                  <p className="department">
                    {faculty.department}
                  </p>

                  <div className="card-stats">

                    <div className="stat">

                      <Users size={16} />

                      <span>
                        {peopleAhead} {waitText}
                      </span>

                    </div>

                    <div
                      className="stat"
                      style={{
                        color: '#8b5cf6',
                        background: '#f5f3ff'
                      }}
                    >

                      <Clock size={16} />

                      <span
                        style={{
                          fontWeight:
                            peopleAhead === 0
                              ? '600'
                              : 'normal'
                        }}
                      >
                        {waitTimeDisplay}
                      </span>

                    </div>

                  </div>

                </div>

              </div>
            );
          })

        ) : (

          <div className="empty-state">
            No faculty members found.
          </div>

        )}

      </div>

    </div>
  );
};

export default StudentDashboard;
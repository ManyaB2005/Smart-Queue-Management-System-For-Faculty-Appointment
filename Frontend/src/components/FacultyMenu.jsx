import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  BarChart3,
  User,
  LogOut
} from 'lucide-react';

const FacultyMenu = ({
  isOpen,
  setIsOpen,
  onAnalytics,
  onLogout
}) => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleAnalytics = () => {
    setIsOpen(false);

    if (onAnalytics) {
      onAnalytics();
    } else {
      navigate('/faculty/analytics');
    }
  };

  const handleLogout = () => {
    setIsOpen(false);

    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="faculty-hamburger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="faculty-menu-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`faculty-sidebar ${
          isOpen ? 'faculty-sidebar-open' : ''
        }`}
      >

        {/* Sidebar Header */}
        <div className="faculty-sidebar-header">

          <div>
            <h2>Smart Queue</h2>
            <span>Faculty Portal</span>
          </div>

          <button
            className="faculty-close-menu-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>

        </div>


        {/* Menu */}
        <div className="faculty-sidebar-menu">

          {/* Dashboard */}
          <button
            onClick={() =>
              handleNavigation('/faculty')
            }
          >
            <Home size={19} />
            <span>Dashboard</span>
          </button>


          {/* Analytics */}
          <button onClick={handleAnalytics}>
            <BarChart3 size={19} />
            <span>Analytics</span>
          </button>


          {/* My Profile */}
          <button
            onClick={() =>
              handleNavigation('/profile')
            }
          >
            <User size={19} />
            <span>My Profile</span>
          </button>

        </div>


        {/* Logout */}
        <div className="faculty-sidebar-bottom">

          <button onClick={handleLogout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>

        </div>

      </aside>
    </>
  );
};

export default FacultyMenu;
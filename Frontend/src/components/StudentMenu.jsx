import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Ticket,
  History,
  Bell,
  Bot,
  User,
  HelpCircle,
  LogOut
} from 'lucide-react';

const StudentMenu = ({ isOpen, setIsOpen, onNotifications }) => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleNotifications = () => {
    setIsOpen(false);

    if (onNotifications) {
      onNotifications();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsOpen(false);
    navigate('/login');
  };

  return (
    <>
      <button
        className="hamburger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div
          className="menu-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`student-sidebar ${
          isOpen ? 'sidebar-open' : ''
        }`}
      >
        <div className="sidebar-header">
          <div>
            <h2>Smart Queue</h2>
            <span>Student Portal</span>
          </div>

          <button
            className="close-menu-btn"
            onClick={() => setIsOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <div className="sidebar-menu">

          <button
            onClick={() => handleNavigation('/student')}
          >
            <Home size={19} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() =>
              handleNavigation('/my-queue')
            }
          >
            <Ticket size={19} />
            <span>My Active Queue</span>
          </button>

          <button
            onClick={() =>
              handleNavigation('/queue-history')
            }
          >
            <History size={19} />
            <span>Queue History</span>
          </button>

          <button onClick={handleNotifications}>
            <Bell size={19} />
            <span>Notifications</span>
          </button>

          <button
            onClick={() =>
              handleNavigation('/smart-assistant')
            }
          >
            <Bot size={19} />
            <span>Smart Assistant</span>
          </button>

          <button
            onClick={() =>
              handleNavigation('/profile')
            }
          >
            <User size={19} />
            <span>My Profile</span>
          </button>

          <button
            onClick={() =>
              handleNavigation('/help')
            }
          >
            <HelpCircle size={19} />
            <span>Help & Support</span>
          </button>

        </div>

        <div className="sidebar-bottom">
          <button onClick={handleLogout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default StudentMenu;
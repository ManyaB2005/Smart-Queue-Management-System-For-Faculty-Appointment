// Frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import your pages
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyDetails from './pages/FacultyDetails';
import MyActiveQueue from './pages/MyActiveQueue';
import QueueHistory from './pages/QueueHistory';
import FacultyAnalytics from './pages/FacultyAnalytics';
import Notifications from './pages/Notifications';
import SmartAssistant from './pages/SmartAssistant';
import Profile from './pages/Profile';
import HelpSupport from './pages/HelpSupport';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route
  path="/help-support"
  element={<HelpSupport />}
/>

        {/* Dashboards */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/faculty" element={<FacultyDashboard />} />

        {/* Faculty Details (the page we created) */}
        <Route path="/faculty-details/:id" element={<FacultyDetails />} />

        <Route
          path="/my-queue"
          element={<MyActiveQueue />}
        />
        <Route
          path="/queue-history"
          element={<QueueHistory />}
        />
        <Route
          path="/faculty/analytics"
          element={<FacultyAnalytics />}
        />
        <Route
          path="/notifications"
          element={<Notifications />}
        />
        <Route path="/profile" element={<Profile />} />
        <Route
  path="/smart-assistant"
  element={<SmartAssistant />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
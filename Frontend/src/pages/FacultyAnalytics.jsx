import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import '../styles/FacultyAnalytics.css';

const FacultyAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          navigate('/login');
          return;
        }

        const payload = JSON.parse(atob(token.split('.')[1]));

        if (payload.role !== 'faculty') {
          navigate('/login');
          return;
        }

        const response = await api.get('/analytics/faculty');
        setAnalytics(response.data);
      } catch (error) {
        console.error(
          'Error loading analytics:',
          error.response?.data || error.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [navigate]);

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) {
      return '0 min';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
      return `${remainingSeconds} sec`;
    }

    if (remainingSeconds === 0) {
      return `${minutes} min`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  };

  const chartData =
    analytics?.daily?.map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      }),
      total: Number(day.total) || 0,
      completed: Number(day.completed) || 0,
      cancelled: Number(day.cancelled) || 0
    })) || [];

  if (loading) {
    return (
      <div className="analytics-page">
        <h2>Loading Analytics...</h2>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-page">
        <h2>Unable to load analytics.</h2>

        <button
          className="back-btn"
          onClick={() => navigate('/faculty')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { statistics, today } = analytics;

  return (
    <div className="analytics-page">

      <div className="analytics-header">
        <button
          className="back-btn"
          onClick={() => navigate('/faculty')}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div>
          <h1>Faculty Analytics</h1>
          <p>
            Monitor your queue and appointment performance.
          </p>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <section className="analytics-cards">

        <div className="analytics-card">
          <div className="analytics-icon">
            <Users size={24} />
          </div>

          <div>
            <span>Total Appointments</span>
            <h2>{statistics.totalAppointments}</h2>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <CheckCircle size={24} />
          </div>

          <div>
            <span>Completed</span>
            <h2>{statistics.completedAppointments}</h2>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <XCircle size={24} />
          </div>

          <div>
            <span>Cancelled</span>
            <h2>{statistics.cancelledAppointments}</h2>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <Activity size={24} />
          </div>

          <div>
            <span>Current Queue</span>
            <h2>{statistics.currentQueue}</h2>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <Clock size={24} />
          </div>

          <div>
            <span>Average Meeting</span>
            <h2>
              {formatDuration(
                statistics.averageMeetingSeconds
              )}
            </h2>
          </div>
        </div>

      </section>

      {/* TODAY */}

      <section className="today-section">

        <div className="section-header">
          <h2>Today's Overview</h2>
          <span>Today</span>
        </div>

        <div className="today-grid">

          <div>
            <span>Total</span>
            <strong>{today.total}</strong>
          </div>

          <div>
            <span>Completed</span>
            <strong>{today.completed}</strong>
          </div>

          <div>
            <span>Cancelled</span>
            <strong>{today.cancelled}</strong>
          </div>

        </div>

      </section>

      {/* APPOINTMENT TREND */}

      <section className="chart-card">

        <div className="section-header">
          <div>
            <h2>Appointment Trend</h2>
            <p>Queue activity during the last 7 days</p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="chart-container">

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#3b82f6"
                  strokeWidth={3}
                />

                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#10b981"
                  strokeWidth={3}
                />

                <Line
                  type="monotone"
                  dataKey="cancelled"
                  name="Cancelled"
                  stroke="#ef4444"
                  strokeWidth={3}
                />

              </LineChart>
            </ResponsiveContainer>

          </div>
        ) : (
          <div className="empty-analytics">
            No appointment data available.
          </div>
        )}

      </section>

      {/* COMPLETED VS CANCELLED */}

      <section className="chart-card">

        <div className="section-header">
          <div>
            <h2>Completed vs Cancelled</h2>
            <p>Daily appointment outcome</p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="chart-container">

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="#10b981"
                />

                <Bar
                  dataKey="cancelled"
                  name="Cancelled"
                  fill="#ef4444"
                />

              </BarChart>
            </ResponsiveContainer>

          </div>
        ) : (
          <div className="empty-analytics">
            No appointment data available.
          </div>
        )}

      </section>

      {/* DAILY TABLE */}

      <section className="daily-section">

        <div className="section-header">
          <h2>Last 7 Days</h2>
        </div>

        {chartData.length === 0 ? (
          <div className="empty-analytics">
            No queue activity available.
          </div>
        ) : (
          <div className="daily-table">

            <div className="table-header">
              <span>Date</span>
              <span>Total</span>
              <span>Completed</span>
              <span>Cancelled</span>
            </div>

            {analytics.daily.map((day) => (
              <div
                className="table-row"
                key={day.date}
              >
                <span>
                  {new Date(day.date).toLocaleDateString()}
                </span>

                <span>{day.total}</span>

                <span>{day.completed}</span>

                <span>{day.cancelled}</span>
              </div>
            ))}

          </div>
        )}

      </section>

    </div>
  );
};

export default FacultyAnalytics;
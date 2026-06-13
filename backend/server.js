// backend/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialize Express and Server
const app = express();
const server = http.createServer(app);

// Middleware
// Ensure CORS is set to your Vite frontend port so they can communicate
app.use(cors({ 
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

// Initialize Socket.io (Real-time engine)
const io = new Server(server, {
    cors: { 
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

// Make Socket.io accessible inside all Express routes using req.app.get('socketio')
app.set('socketio', io);

// ==========================================
// API ROUTES
// ==========================================

// Basic health check route
app.get('/', (req, res) => {
    res.json({ message: 'Smart Queue API is running...' });
});

// Authentication Routes (Login & Register)
app.use('/api/auth', require('./routes/authRoutes'));

// Queue Engine Routes (Join, Leave, Fetch Faculties)
app.use('/api/queue', require('./routes/queueRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes')); // <--- ADD THIS LINE

// ==========================================
// SOCKET.IO EVENT LISTENERS
// ==========================================
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // When a user visits a faculty dashboard or a student joins a specific queue
    socket.on('join_faculty_room', (facultyId) => {
        socket.join(`faculty_${facultyId}`);
        console.log(`User joined real-time room: faculty_${facultyId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
const express = require('express');
const cors = require('cors');
const http = require('http'); // NEW: Required for WebSockets
const { Server } = require('socket.io'); // NEW: Import Socket.io
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const queueRoutes = require('./routes/queueRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// NEW: Create HTTP Server and bind Socket.io to it
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Make 'io' available inside all your route files!
app.set('socketio', io);

// NEW: Handle real-time connections
io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Allow a faculty member to join their specific private "room"
    socket.on('join_faculty_room', (facultyId) => {
        socket.join(`faculty_${facultyId}`);
        console.log(`👨‍🏫 Faculty joined room: faculty_${facultyId}`);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// Attach Routes
app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/queue', queueRoutes);

const PORT = 5000;
// CRITICAL: Change app.listen to server.listen
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} with WebSockets enabled!`));
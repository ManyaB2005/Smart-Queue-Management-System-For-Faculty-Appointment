const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const assistantRoutes =
    require('./routes/assistantRoutes');

require('dotenv').config();

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

const {
    authenticateToken,
    requireRole
} = require('./middleware/authMiddleware');

// =====================================================
// ROUTES
// =====================================================

const authRoutes = require('./routes/authRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const queueRoutes = require('./routes/queueRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// =====================================================
// AI AGENT
// =====================================================

const {
    runAssistant
} = require('./agents/assistantAgent');

// =====================================================
// EXPRESS APP
// =====================================================

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());

// =====================================================
// HTTP SERVER
// =====================================================

const server = http.createServer(app);

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: [
            'GET',
            'POST',
            'PUT',
            'DELETE'
        ]
    }
});

// Make Socket.IO available inside routes

app.set('socketio', io);

// =====================================================
// SOCKET.IO CONNECTION
// =====================================================

io.on('connection', (socket) => {

    console.log(
        `🔌 New client connected: ${socket.id}`
    );

    // -------------------------------------------------
    // Faculty joins private room
    // -------------------------------------------------

    socket.on(
        'join_faculty_room',
        (facultyId) => {

            socket.join(
                `faculty_${facultyId}`
            );

            console.log(
                `👨‍🏫 Faculty joined room: faculty_${facultyId}`
            );
        }
    );

    // -------------------------------------------------
    // Student joins private room
    // -------------------------------------------------

    socket.on(
        'join_student_room',
        (studentId) => {

            socket.join(
                `student_${studentId}`
            );

            console.log(
                `🎓 Student joined room: student_${studentId}`
            );
        }
    );

    // -------------------------------------------------
    // Disconnect
    // -------------------------------------------------

    socket.on(
        'disconnect',
        () => {

            console.log(
                `❌ Client disconnected: ${socket.id}`
            );
        }
    );

});

// =====================================================
// PUBLIC AUTH ROUTES
// =====================================================

app.use(
    '/api/auth',
    authRoutes
);
app.use(
    '/api/assistant',
    authenticateToken,
    requireRole('student'),
    assistantRoutes
);

// =====================================================
// ANALYTICS ROUTES
// FACULTY ONLY
// =====================================================

app.use(
    '/api/analytics',
    authenticateToken,
    requireRole('faculty'),
    analyticsRoutes
);

// =====================================================
// NOTIFICATION ROUTES
// STUDENT ONLY
// =====================================================

app.use(
    '/api/notifications',
    authenticateToken,
    requireRole('student'),
    notificationRoutes
);

// =====================================================
// FACULTY ROUTES
// FACULTY ONLY
// =====================================================

app.use(
    '/api/faculty',
    authenticateToken,
    requireRole('faculty'),
    facultyRoutes
);

// =====================================================
// QUEUE ROUTES
// STUDENTS + FACULTY
// =====================================================

app.use(
    '/api/queue',
    authenticateToken,
    queueRoutes
);

// =====================================================
// BASIC TEST ROUTE
// =====================================================

app.get(
    '/',
    (req, res) => {

        res.json({
            message:
                'Smart Queue Management API is running!'
        });

    }
);

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {

        console.error(
            'Unhandled server error:',
            err
        );

        res.status(500).json({
            message:
                'Internal server error.'
        });

    }
);

// =====================================================
// SERVER
// =====================================================

const PORT =
    process.env.PORT || 5000;

server.listen(
    PORT,
    () => {

        console.log(
            `🚀 Server running on port ${PORT} with WebSockets enabled!`
        );

    }
);
// backend/routes/facultyRoutes.js
const express = require('express');
const db = require('../config/db');
const router = express.Router();

// 1. GET FACULTY'S CURRENT QUEUE
router.get('/queue/:facultyId', async (req, res) => {
    try {
        const { facultyId } = req.params;

        const [active] = await db.query(
            `SELECT q.id as queueId, q.token_number as token, u.name, DATE_FORMAT(q.created_at, '%h:%i %p') as timeIn 
             FROM Queues q JOIN Users u ON q.student_id = u.id 
             WHERE q.faculty_id = ? AND q.status = 'active' LIMIT 1`,
            [facultyId]
        );

        const [waiting] = await db.query(
            `SELECT q.id as queueId, q.token_number as token, u.name, DATE_FORMAT(q.created_at, '%h:%i %p') as timeIn 
             FROM Queues q JOIN Users u ON q.student_id = u.id 
             WHERE q.faculty_id = ? AND q.status = 'waiting' ORDER BY q.created_at ASC`,
            [facultyId]
        );

        res.status(200).json({
            currentStudent: active.length > 0 ? active[0] : null,
            queue: waiting
        });
    } catch (error) {
        console.error("Error fetching queue:", error);
        res.status(500).json({ message: "Server error fetching queue." });
    }
});

// 2. CALL NEXT STUDENT
router.post('/call-next', async (req, res) => {
    try {
        const { facultyId, nextQueueId } = req.body;
        const io = req.app.get('socketio');

        await db.query(`UPDATE Queues SET status = 'active', started_at = NOW() WHERE id = ?`, [nextQueueId]);
        
        io.to(`faculty_${facultyId}`).emit('queue_advanced', { message: "Next student called." });
        res.status(200).json({ message: "Next student called successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error calling next student." });
    }
});

// 3. MARK STUDENT AS COMPLETED
router.post('/complete', async (req, res) => {
    try {
        const { facultyId, queueId } = req.body;
        const io = req.app.get('socketio');

        await db.query(`UPDATE Queues SET status = 'completed' WHERE id = ?`, [queueId]);
        
        io.to(`faculty_${facultyId}`).emit('queue_advanced', { message: "Meeting completed." });
        res.status(200).json({ message: "Meeting completed." });
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
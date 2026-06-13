const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/queue/:facultyId', async (req, res) => {
    try {
        const { facultyId } = req.params;

        // ADDED: q.started_at is now being fetched from the database
        const [active] = await db.query(
            `SELECT q.id as queueId, q.token_number as token, u.name, q.started_at, DATE_FORMAT(q.created_at, '%h:%i %p') as timeIn 
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
        res.status(500).json({ message: "Server error fetching queue." });
    }
});

router.post('/call-next', async (req, res) => {
    try {
        const { facultyId, nextQueueId } = req.body;
        const io = req.app.get('socketio');

        await db.query(`UPDATE Queues SET status = 'active', started_at = NOW() WHERE id = ?`, [nextQueueId]);
        
        if (io) {
            io.to(`faculty_${facultyId}`).emit('queue_advanced', { message: "Next student called." });
            io.emit('dashboard_update'); 
        }
        
        res.status(200).json({ message: "Next student called successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error calling next student." });
    }
});

router.post('/complete', async (req, res) => {
    try {
        const { facultyId, queueId } = req.body;
        const io = req.app.get('socketio');

        await db.query(`UPDATE Queues SET status = 'completed' WHERE id = ?`, [queueId]);
        
        if (io) {
            io.to(`faculty_${facultyId}`).emit('queue_advanced', { message: "Meeting completed." });
            io.emit('dashboard_update'); 
        }
        
        res.status(200).json({ message: "Meeting completed." });
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

router.put('/status', async (req, res) => {
    try {
        await db.query(`UPDATE Users SET faculty_status = ? WHERE id = ?`, [req.body.status, req.body.facultyId]);
        
        const io = req.app.get('socketio');
        if (io) io.emit('dashboard_update'); 

        res.json({ message: 'Status updated' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

module.exports = router;
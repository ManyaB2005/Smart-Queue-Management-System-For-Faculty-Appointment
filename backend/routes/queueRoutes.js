const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/faculties', async (req, res) => {
    try {
        const [faculties] = await db.query(
            `SELECT u.id, u.name, u.email, u.faculty_status, 'Engineering' as department,
             (SELECT COUNT(*) FROM Queues q WHERE q.faculty_id = u.id AND q.status = 'active') as activeCount,
             (SELECT COUNT(*) FROM Queues q WHERE q.faculty_id = u.id AND q.status = 'waiting') as queueCount
             FROM Users u 
             WHERE u.role = 'faculty'`
        );
        res.status(200).json(faculties.map(f => ({ 
            ...f, 
            activeCount: Number(f.activeCount),
            queueCount: Number(f.queueCount), 
            waitTimePerStudent: 10 
        })));
    } catch (error) {
        res.status(500).json({ message: "Server error fetching faculty list." });
    }
});

router.get('/faculties/:id', async (req, res) => {
    try {
        const [faculty] = await db.query(
            "SELECT id, name, email, faculty_status FROM Users WHERE id = ? AND role = 'faculty'",
            [req.params.id]
        );
        if (faculty.length === 0) return res.status(404).json({ message: "Faculty not found" });
        res.status(200).json(faculty[0]);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

router.post('/join', async (req, res) => {
    try {
        const { studentId, facultyId } = req.body;
        const io = req.app.get('socketio');

        const [existing] = await db.query(`SELECT id FROM Queues WHERE student_id = ? AND status IN ('waiting', 'active')`, [studentId]);
        if (existing.length > 0) return res.status(400).json({ message: "You are already in an active queue." });

        const [faculty] = await db.query(`SELECT faculty_status FROM Users WHERE id = ?`, [facultyId]);
        
        // STRICT LOCKOUT: Deny entry if not "Available"
        if (faculty.length === 0 || faculty[0].faculty_status !== 'Available') {
            return res.status(400).json({ message: "This faculty member is currently unavailable." });
        }

        const [tokenCount] = await db.query(`SELECT COUNT(*) as count FROM Queues WHERE faculty_id = ? AND DATE(created_at) = CURDATE()`, [facultyId]);
        const tokenNumber = `T-${tokenCount[0].count + 1}`;

        // MATH FIX: Count total people ahead. 0 people = 0 wait.
        const [aheadData] = await db.query(`SELECT COUNT(*) as count FROM Queues WHERE faculty_id = ? AND status IN ('waiting', 'active')`, [facultyId]);
        const estimatedWait = aheadData[0].count * 10; 

        // THE FINAL FIX: Replaced the hardcoded 10 with ? and added estimatedWait to the array
        const [result] = await db.query(
            `INSERT INTO Queues (faculty_id, student_id, token_number, estimated_duration, status) VALUES (?, ?, ?, ?, 'waiting')`, 
            [facultyId, studentId, tokenNumber, estimatedWait]
        );

        const newEntry = { queueId: result.insertId, tokenNumber, estimatedWait, position: tokenCount[0].count + 1 };

        if (io) {
            io.to(`faculty_${facultyId}`).emit('queue_updated', { message: "A new student joined.", token: tokenNumber });
            io.emit('dashboard_update'); 
        }

        res.status(201).json({ message: "Joined queue successfully", data: newEntry });
    } catch (error) {
        res.status(500).json({ message: "Server error while joining queue." });
    }
});

router.post('/cancel', async (req, res) => {
    const { studentId } = req.body;
    try {
        await db.query(`UPDATE Queues SET status = 'cancelled' WHERE student_id = ? AND status = 'waiting'`, [studentId]);
        const io = req.app.get('socketio');
        if (io) io.emit('dashboard_update'); 
        res.json({ message: 'Queue cancelled successfully' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

router.delete('/leave/:queueId', async (req, res) => {
    try {
        const { queueId } = req.params;
        const io = req.app.get('socketio');

        const [queueEntry] = await db.query(`SELECT faculty_id FROM Queues WHERE id = ?`, [queueId]);
        if (queueEntry.length === 0) return res.status(404).json({ message: "Queue entry not found." });

        await db.query(`UPDATE Queues SET status = 'cancelled' WHERE id = ?`, [queueId]);

        if (io) {
            io.to(`faculty_${queueEntry[0].faculty_id}`).emit('queue_advanced', { message: "Student left queue." });
            io.emit('dashboard_update'); 
        }

        res.status(200).json({ message: "Successfully left the queue." });
    } catch (error) {
        res.status(500).json({ message: "Server error while leaving queue." });
    }
});

router.get('/faculty-queue-count/:facultyId', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT COUNT(*) as count FROM Queues WHERE faculty_id = ? AND status = 'waiting'", [req.params.facultyId]);
        res.json({ count: rows[0].count });
    } catch (err) { res.status(500).json({ error: "Failed to get count" }); }
});

router.get('/check-status/:studentId', async (req, res) => {
    try {
        const [queue] = await db.query(`
            SELECT 
                q.id, q.faculty_id, q.token_number, q.estimated_duration, 
                u.name as facultyName, q.status,
                (SELECT COUNT(*) FROM Queues WHERE faculty_id = q.faculty_id AND status = 'active') as activeCount,
                (SELECT COUNT(*) FROM Queues WHERE faculty_id = q.faculty_id AND status = 'waiting' AND created_at <= q.created_at) as position
            FROM Queues q
            JOIN Users u ON q.faculty_id = u.id
            WHERE q.student_id = ? AND q.status IN ('waiting', 'active')
            LIMIT 1
        `, [req.params.studentId]);

        if (queue.length > 0) {
            const activeCount = Number(queue[0].activeCount);
            const position = Number(queue[0].position);
            
            // MATH FIX: (People inside + People waiting ahead of me) * 10
            const estimatedWait = Math.max(0, (activeCount + position - 1) * 10);
            
            res.json({ activeQueue: { ...queue[0], activeCount, position, estimatedWait } });
        } else {
            res.json({ activeQueue: null });
        }
    } catch (err) { 
        res.status(500).json({ error: "Server error" }); 
    }
});

module.exports = router;
// backend/routes/queueRoutes.js
const express = require('express');
const db = require('../config/db');

const router = express.Router();

// ==========================================
// 1. GET ALL FACULTY (For Student Dashboard)
// ==========================================
router.get('/faculties', async (req, res) => {
    try {
        const [faculties] = await db.query(
            `SELECT id, name, email, faculty_status 
             FROM Users 
             WHERE role = 'faculty'`
        );
        res.status(200).json(faculties);
    } catch (error) {
        console.error("Error fetching faculties:", error);
        res.status(500).json({ message: "Server error fetching faculty list." });
    }
});

// ==========================================
// 2. JOIN A QUEUE
// ==========================================
router.post('/join', async (req, res) => {
    try {
        const { studentId, facultyId } = req.body;
        const io = req.app.get('socketio');

        // Check 1: Is the student already in a queue?
        const [existing] = await db.query(
            `SELECT * FROM Queues 
             WHERE student_id = ? AND status IN ('waiting', 'active')`,
            [studentId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: "You are already in an active queue." });
        }

        // Check 2: Is the faculty actually available?
        const [faculty] = await db.query(
            `SELECT faculty_status FROM Users WHERE id = ?`, 
            [facultyId]
        );
        if (faculty.length === 0 || faculty[0].faculty_status === 'Out of Office') {
            return res.status(400).json({ message: "This faculty member is currently unavailable." });
        }

        // Calculate: Generate Token Number for today
        const [tokenCount] = await db.query(
            `SELECT COUNT(*) as count FROM Queues 
             WHERE faculty_id = ? AND DATE(created_at) = CURDATE()`,
            [facultyId]
        );
        const tokenNumber = `T-${tokenCount[0].count + 1}`;

        // Calculate: Estimated Wait Time
        const [waitData] = await db.query(
            `SELECT COALESCE(SUM(estimated_duration), 0) as totalWait 
             FROM Queues 
             WHERE faculty_id = ? AND status IN ('waiting', 'active')`,
            [facultyId]
        );
        const estimatedWait = parseInt(waitData[0].totalWait);

        // Insert into Database
        const [result] = await db.query(
            `INSERT INTO Queues (faculty_id, student_id, token_number, estimated_duration) 
             VALUES (?, ?, ?, 10)`, 
            [facultyId, studentId, tokenNumber]
        );

        const newEntry = {
            queueId: result.insertId,
            tokenNumber,
            estimatedWait,
            position: tokenCount[0].count + 1
        };

        // Emit Real-Time Socket Event to the Faculty's Room
        io.to(`faculty_${facultyId}`).emit('queue_updated', {
            message: "A new student joined the queue.",
            token: tokenNumber
        });

        res.status(201).json({ message: "Joined queue successfully", data: newEntry });

    } catch (error) {
        console.error("Join Queue Error:", error);
        res.status(500).json({ message: "Server error while joining queue." });
    }
});

// ==========================================
// 3. LEAVE / CANCEL QUEUE
// ==========================================
router.delete('/leave/:queueId', async (req, res) => {
    try {
        const { queueId } = req.params;
        const io = req.app.get('socketio');

        const [queueEntry] = await db.query(`SELECT faculty_id FROM Queues WHERE id = ?`, [queueId]);
        
        if (queueEntry.length === 0) {
            return res.status(404).json({ message: "Queue entry not found." });
        }

        // Update status to 'cancelled' instead of deleting the row
        await db.query(
            `UPDATE Queues SET status = 'cancelled' WHERE id = ?`,
            [queueId]
        );

        // Emit Real-Time Socket Event to update remaining students and faculty
        io.to(`faculty_${queueEntry[0].faculty_id}`).emit('queue_advanced', {
            message: "A student left the queue. Wait times have been recalculated."
        });

        res.status(200).json({ message: "Successfully left the queue." });

    } catch (error) {
        console.error("Leave Queue Error:", error);
        res.status(500).json({ message: "Server error while leaving queue." });
    }
});

// Add this to backend/routes/queueRoutes.js

// Fetch ONE specific faculty member
router.get('/faculties/:id', async (req, res) => {
    try {
        const [faculty] = await db.query(
            "SELECT id, name, email, faculty_status FROM Users WHERE id = ? AND role = 'faculty'",
            [req.params.id]
        );
        
        if (faculty.length === 0) {
            return res.status(404).json({ message: "Faculty not found" });
        }
        
        res.status(200).json(faculty[0]);
    } catch (error) {
        console.error("Error fetching faculty details:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// backend/routes/queueRoutes.js
router.get('/faculty-queue-count/:facultyId', async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT COUNT(*) as count FROM Queues WHERE faculty_id = ? AND status = 'waiting'",
            [req.params.facultyId]
        );
        res.json({ count: rows[0].count });
    } catch (err) { res.status(500).json({ error: "Failed to get count" }); }
});

router.get('/check-status/:studentId', async (req, res) => {
    const [rows] = await db.query(
        "SELECT * FROM Queues WHERE student_id = ? AND status IN ('waiting', 'active')",
        [req.params.studentId]
    );
    res.json({ activeQueue: rows.length > 0 ? rows[0] : null });
});

module.exports = router;
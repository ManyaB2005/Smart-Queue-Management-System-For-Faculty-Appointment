const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/queue', async (req, res) => {
    try {
        const facultyId = req.user.id;

        const [active] = await db.query(
            `SELECT
                q.id AS queueId,
                q.token_number AS token,
                u.name,
                q.started_at,
                DATE_FORMAT(q.created_at, '%h:%i %p') AS timeIn
             FROM Queues q
             JOIN Users u ON q.student_id = u.id
             WHERE q.faculty_id = ?
             AND q.status = 'active'
             ORDER BY q.started_at ASC
             LIMIT 1`,
            [facultyId]
        );

        const [waiting] = await db.query(
            `SELECT
                q.id AS queueId,
                q.token_number AS token,
                u.name,
                DATE_FORMAT(q.created_at, '%h:%i %p') AS timeIn
             FROM Queues q
             JOIN Users u ON q.student_id = u.id
             WHERE q.faculty_id = ?
             AND q.status = 'waiting'
             ORDER BY q.created_at ASC`,
            [facultyId]
        );

        res.status(200).json({
            currentStudent: active.length > 0 ? active[0] : null,
            queue: waiting
        });

    } catch (error) {
        console.error('Faculty queue error:', error);

        res.status(500).json({
            message: 'Server error fetching queue.'
        });
    }
});

router.post('/call-next', async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { nextQueueId } = req.body;
        const io = req.app.get('socketio');

        if (!nextQueueId) {
            return res.status(400).json({
                message: 'Queue ID is required.'
            });
        }

        const [queue] = await db.query(
            `SELECT id, status
             FROM Queues
             WHERE id = ?
             AND faculty_id = ?`,
            [nextQueueId, facultyId]
        );

        if (queue.length === 0) {
            return res.status(404).json({
                message: 'Queue entry not found.'
            });
        }

        if (queue[0].status !== 'waiting') {
            return res.status(400).json({
                message: 'This student is not waiting.'
            });
        }

        const [active] = await db.query(
            `SELECT id
             FROM Queues
             WHERE faculty_id = ?
             AND status = 'active'
             LIMIT 1`,
            [facultyId]
        );

        if (active.length > 0) {
            return res.status(400).json({
                message: 'A student is already being served.'
            });
        }

        await db.query(
            `UPDATE Queues
             SET status = 'active',
                 started_at = NOW()
             WHERE id = ?`,
            [nextQueueId]
        );

        if (io) {
            io.to(`faculty_${facultyId}`).emit(
                'queue_advanced',
                {
                    message: 'Next student called.'
                }
            );

            io.emit('dashboard_update');
        }

        res.status(200).json({
            message: 'Next student called successfully.'
        });

    } catch (error) {
        console.error('Call next error:', error);

        res.status(500).json({
            message: 'Server error calling next student.'
        });
    }
});

router.post('/complete', async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { queueId } = req.body;
        const io = req.app.get('socketio');

        if (!queueId) {
            return res.status(400).json({
                message: 'Queue ID is required.'
            });
        }

        const [queue] = await db.query(
            `SELECT id, status, started_at
             FROM Queues
             WHERE id = ?
             AND faculty_id = ?`,
            [queueId, facultyId]
        );

        if (queue.length === 0) {
            return res.status(404).json({
                message: 'Queue entry not found.'
            });
        }

        if (queue[0].status !== 'active') {
            return res.status(400).json({
                message: 'This meeting is not currently active.'
            });
        }

        if (!queue[0].started_at) {
            return res.status(400).json({
                message: 'Meeting start time is missing.'
            });
        }

        await db.query(
            `UPDATE Queues
             SET status = 'completed',
                 completed_at = NOW(),
                 actual_duration = TIMESTAMPDIFF(
                     SECOND,
                     started_at,
                     NOW()
                 )
             WHERE id = ?`,
            [queueId]
        );

        if (io) {
            io.to(`faculty_${facultyId}`).emit(
                'queue_advanced',
                {
                    message: 'Meeting completed.'
                }
            );

            io.emit('dashboard_update');
        }

        res.status(200).json({
            message: 'Meeting completed successfully.'
        });

    } catch (error) {
        console.error('Complete meeting error:', error);

        res.status(500).json({
            message: 'Server error completing meeting.'
        });
    }
});

router.put('/status', async (req, res) => {
    try {
        const facultyId = req.user.id;
        const { status } = req.body;
        const io = req.app.get('socketio');

        const validStatuses = [
            'Available',
            'Busy',
            'In Meeting',
            'Out of Office'
        ];

        if (!status) {
            return res.status(400).json({
                message: 'Status is required.'
            });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: 'Invalid faculty status.'
            });
        }

        const [result] = await db.query(
            `UPDATE Users
             SET faculty_status = ?
             WHERE id = ?
             AND role = 'faculty'`,
            [status, facultyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Faculty account not found.'
            });
        }

        if (io) {
            io.emit('dashboard_update');
        }

        res.status(200).json({
            message: 'Faculty status updated successfully.',
            status
        });

    } catch (error) {
        console.error('Status update error:', error);

        res.status(500).json({
            message: 'Server error updating faculty status.'
        });
    }
});
router.get('/analytics', async (req, res) => {
    try {
        const facultyId = req.user.id;

        const [stats] = await db.query(
            `SELECT
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS totalCompleted,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS totalCancelled,
                ROUND(
                    AVG(
                        CASE
                            WHEN status = 'completed'
                            THEN actual_duration
                        END
                    ), 0
                ) AS averageMeetingSeconds
             FROM Queues
             WHERE faculty_id = ?`,
            [facultyId]
        );

        const [currentQueue] = await db.query(
            `SELECT COUNT(*) AS count
             FROM Queues
             WHERE faculty_id = ?
             AND status = 'waiting'`,
            [facultyId]
        );

        const [todayStats] = await db.query(
            `SELECT
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completedToday,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelledToday
             FROM Queues
             WHERE faculty_id = ?
             AND DATE(created_at) = CURDATE()`,
            [facultyId]
        );

        const averageMeetingSeconds =
            Number(stats[0].averageMeetingSeconds) || 0;

        res.status(200).json({
            totalCompleted: Number(stats[0].totalCompleted) || 0,
            totalCancelled: Number(stats[0].totalCancelled) || 0,
            averageMeetingSeconds,
            averageMeetingMinutes:
                Number((averageMeetingSeconds / 60).toFixed(1)),
            currentQueue:
                Number(currentQueue[0].count) || 0,
            completedToday:
                Number(todayStats[0].completedToday) || 0,
            cancelledToday:
                Number(todayStats[0].cancelledToday) || 0
        });

    } catch (error) {
        console.error('Faculty analytics error:', error);

        res.status(500).json({
            message: 'Server error fetching faculty analytics.'
        });
    }
});
module.exports = router;
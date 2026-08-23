const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/faculty', async (req, res) => {
    try {
        const facultyId = req.user.id;

        const [stats] = await db.query(
            `
            SELECT
                COUNT(*) AS totalAppointments,

                SUM(status = 'completed') AS completedAppointments,

                SUM(status = 'cancelled') AS cancelledAppointments,

                SUM(status IN ('waiting', 'active')) AS currentQueue,

                ROUND(
                    AVG(
                        CASE
                            WHEN status = 'completed'
                            AND started_at IS NOT NULL
                            AND completed_at IS NOT NULL
                            THEN TIMESTAMPDIFF(
                                SECOND,
                                started_at,
                                completed_at
                            )
                        END
                    )
                ) AS averageMeetingSeconds

            FROM Queues
            WHERE faculty_id = ?
            `,
            [facultyId]
        );

        const [today] = await db.query(
            `
            SELECT
                COUNT(*) AS total,
                SUM(status = 'completed') AS completed,
                SUM(status = 'cancelled') AS cancelled
            FROM Queues
            WHERE faculty_id = ?
            AND DATE(created_at) = CURDATE()
            `,
            [facultyId]
        );

        const [daily] = await db.query(
            `
            SELECT
                DATE(created_at) AS date,
                COUNT(*) AS total,
                SUM(status = 'completed') AS completed,
                SUM(status = 'cancelled') AS cancelled
            FROM Queues
            WHERE faculty_id = ?
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
            `,
            [facultyId]
        );

        const statsData = stats[0];

        res.status(200).json({
            statistics: {
                totalAppointments: Number(statsData.totalAppointments) || 0,
                completedAppointments:
                    Number(statsData.completedAppointments) || 0,
                cancelledAppointments:
                    Number(statsData.cancelledAppointments) || 0,
                currentQueue:
                    Number(statsData.currentQueue) || 0,
                averageMeetingSeconds:
                    Number(statsData.averageMeetingSeconds) || 0
            },

            today: {
                total: Number(today[0].total) || 0,
                completed: Number(today[0].completed) || 0,
                cancelled: Number(today[0].cancelled) || 0
            },

            daily: daily.map(row => ({
                date: row.date,
                total: Number(row.total) || 0,
                completed: Number(row.completed) || 0,
                cancelled: Number(row.cancelled) || 0
            }))
        });

    } catch (error) {
        console.error('Faculty analytics error:', error);

        res.status(500).json({
            message: 'Server error fetching analytics.'
        });
    }
});

module.exports = router;
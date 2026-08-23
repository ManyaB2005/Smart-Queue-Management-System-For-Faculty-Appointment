const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const studentId = req.user.id;

        const [notifications] = await db.query(
            `SELECT
                id,
                type,
                title,
                message,
                is_read,
                created_at
             FROM Notifications
             WHERE student_id = ?
             ORDER BY created_at DESC`,
            [studentId]
        );

        res.status(200).json({
            notifications
        });
    } catch (error) {
        console.error('Fetch notifications error:', error);

        res.status(500).json({
            message: 'Server error fetching notifications.'
        });
    }
});

router.put('/:id/read', async (req, res) => {
    try {
        const studentId = req.user.id;
        const notificationId = req.params.id;

        const [result] = await db.query(
            `UPDATE Notifications
             SET is_read = TRUE
             WHERE id = ?
             AND student_id = ?`,
            [notificationId, studentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Notification not found.'
            });
        }

        res.status(200).json({
            message: 'Notification marked as read.'
        });
    } catch (error) {
        console.error('Mark notification error:', error);

        res.status(500).json({
            message: 'Server error updating notification.'
        });
    }
});

router.put('/read-all', async (req, res) => {
    try {
        const studentId = req.user.id;

        await db.query(
            `UPDATE Notifications
             SET is_read = TRUE
             WHERE student_id = ?
             AND is_read = FALSE`,
            [studentId]
        );

        res.status(200).json({
            message: 'All notifications marked as read.'
        });
    } catch (error) {
        console.error('Mark all notifications error:', error);

        res.status(500).json({
            message: 'Server error updating notifications.'
        });
    }
});

module.exports = router;
const express = require('express');
const db = require('../config/db');
const { execFile } = require('child_process');
const path = require('path');

const router = express.Router();
const predictDuration = (inputData) => {
    return new Promise((resolve, reject) => {

        const pythonScript = path.join(
            __dirname,
            '..',
            'ml',
            'predict.py'
        );

        const jsonInput = JSON.stringify(inputData);

        execFile(
            'python',
            [pythonScript, jsonInput],
            (error, stdout, stderr) => {

                if (error) {
                    console.error(
                        'ML prediction error:',
                        error.message
                    );

                    console.error(
                        'ML stderr:',
                        stderr
                    );

                    return reject(error);
                }

                try {
                    const result =
                        JSON.parse(stdout.trim());

                    if (!result.success) {
                        return reject(
                            new Error(
                                result.error ||
                                'ML prediction failed.'
                            )
                        );
                    }

                    resolve(
                        Number(
                            result.predicted_duration
                        )
                    );

                } catch (parseError) {
                    console.error(
                        'ML prediction parse error:',
                        parseError
                    );

                    console.error(
                        'Python output:',
                        stdout
                    );

                    reject(parseError);
                }
            }
        );
    });
};


// ======================================================
// GET ALL FACULTIES
// GET /api/queue/faculties
// ======================================================

router.get('/faculties', async (req, res) => {
    try {

        const [faculties] = await db.query(`
            SELECT
                u.id,
                u.name,
                u.email,
                u.faculty_status,
                'Engineering' AS department,

                (
                    SELECT COUNT(*)
                    FROM Queues q
                    WHERE q.faculty_id = u.id
                    AND q.status = 'active'
                ) AS activeCount,

                (
                    SELECT COUNT(*)
                    FROM Queues q
                    WHERE q.faculty_id = u.id
                    AND q.status = 'waiting'
                ) AS queueCount

            FROM Users u

            WHERE u.role = 'faculty'
        `);

        console.log(
            'FACULTIES SENT TO STUDENT:',
            faculties
        );

        res.status(200).json(
    faculties.map(f => ({
        ...f,

        activeCount:
            Number(f.activeCount),

        queueCount:
            Number(f.queueCount)
    }))
);

    } catch (error) {

        console.error(
            'FACULTY FETCH ERROR:',
            error
        );

        res.status(500).json({
            message:
                'Server error fetching faculty list.'
        });
    }
});


// ======================================================
// GET SINGLE FACULTY
// GET /api/queue/faculties/:id
// ======================================================

router.get('/faculties/:id', async (req, res) => {
    try {
        const [faculty] = await db.query(
            `SELECT 
                id,
                name,
                email,
                faculty_status
             FROM Users
             WHERE id = ?
             AND role = 'faculty'`,
            [req.params.id]
        );

        if (faculty.length === 0) {
            return res.status(404).json({
                message: "Faculty not found"
            });
        }

        res.status(200).json(faculty[0]);

    } catch (error) {
        console.error("Fetch faculty error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


// ======================================================
// JOIN QUEUE
// POST /api/queue/join
// ======================================================

router.post('/join', async (req, res) => {
    try {

        // Faculty ID comes from the frontend.
const { facultyId, appointmentType } = req.body;
const normalizedType = String(
    appointmentType || 'OTHER'
)
    .trim()
    .toUpperCase()
    .substring(0, 50);
        // IMPORTANT:
        // Student ID comes from the verified JWT.
        // We do NOT trust studentId from the frontend.
        const studentId = req.user.id;

        const io = req.app.get('socketio');


        // --------------------------------------------------
        // CHECK IF STUDENT IS ALREADY IN A QUEUE
        // --------------------------------------------------

        const [existing] = await db.query(
            `SELECT id
             FROM Queues
             WHERE student_id = ?
             AND status IN ('waiting', 'active')`,
            [studentId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                message: "You are already in an active queue."
            });
        }


        // --------------------------------------------------
        // CHECK FACULTY
        // --------------------------------------------------

        const [faculty] = await db.query(
            `SELECT faculty_status
             FROM Users
             WHERE id = ?
             AND role = 'faculty'`,
            [facultyId]
        );

        if (
            faculty.length === 0 ||
            faculty[0].faculty_status !== 'Available'
        ) {
            return res.status(400).json({
                message: "This faculty member is currently unavailable."
            });
        }


        // --------------------------------------------------
        // GENERATE TOKEN NUMBER
        // --------------------------------------------------

        const [lastToken] = await db.query(
    `SELECT token_number
     FROM Queues
     WHERE faculty_id = ?
     AND DATE(created_at) = CURDATE()
     AND token_number LIKE 'T-%'
     ORDER BY CAST(
         SUBSTRING(token_number, 3)
         AS UNSIGNED
     ) DESC
     LIMIT 1`,
    [facultyId]
);

let nextTokenNumber = 1;

if (lastToken.length > 0) {

    const lastNumber =
        parseInt(
            lastToken[0].token_number
                .replace('T-', ''),
            10
        );

    if (!isNaN(lastNumber)) {
        nextTokenNumber = lastNumber + 1;
    }
}

const tokenNumber =
    `T-${nextTokenNumber}`;


        // --------------------------------------------------
        // CALCULATE CURRENT WAIT
        // --------------------------------------------------

        const [aheadData] = await db.query(
            `SELECT COUNT(*) AS count
             FROM Queues
             WHERE faculty_id = ?
             AND status IN ('waiting', 'active')`,
            [facultyId]
        );
        const peopleAheadWhenJoined =
    Number(aheadData[0].count) || 0;

const queueLengthWhenJoined =
    peopleAheadWhenJoined;

        const now = new Date();

const hour = now.getHours();

const dayOfWeek = now.getDay() + 1;

let predictedDuration = null;

try {

    predictedDuration = await predictDuration({
        faculty_id: Number(facultyId),
        appointment_type: normalizedType,
        people_ahead_when_joined:
            peopleAheadWhenJoined,
        queue_length_when_joined:
            queueLengthWhenJoined,
        hour,
        day_of_week:
            dayOfWeek
    });

    console.log(
        'ML predicted duration:',
        predictedDuration,
        'seconds'
    );

} catch (error) {

    console.error(
        'ML prediction failed:',
        error.message
    );

    predictedDuration = null;
}


        // --------------------------------------------------
        // INSERT STUDENT INTO QUEUE
        // --------------------------------------------------

        const [result] = await db.query(
    `INSERT INTO Queues
        (
            faculty_id,
            student_id,
            appointment_type,
            token_number,
            estimated_duration,
            people_ahead_when_joined,
            queue_length_when_joined,
            status
        )
     VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')`,
    [
        facultyId,
        studentId,
        normalizedType,
        tokenNumber,
        predictedDuration,
        peopleAheadWhenJoined,
        queueLengthWhenJoined
    ]
);


        // --------------------------------------------------
        // CREATE RESPONSE DATA
        // --------------------------------------------------

        const estimatedWait =
    (peopleAheadWhenJoined || 0) * (predictedDuration || 0);

const newEntry = {
    queueId: result.insertId,
    tokenNumber,
    estimatedDuration: predictedDuration,
    estimatedWait,
    position: peopleAheadWhenJoined + 1
};


        // --------------------------------------------------
        // REAL-TIME SOCKET UPDATE
        // --------------------------------------------------

        if (io) {

            // Notify the selected faculty.
            io.to(`faculty_${facultyId}`).emit(
                'queue_updated',
                {
                    message: "A new student joined.",
                    token: tokenNumber
                }
            );

            // Update connected dashboards.
            io.emit('dashboard_update');
        }


        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        res.status(201).json({
            message: "Joined queue successfully",
            data: newEntry
        });

    } catch (error) {

        console.error("Join queue error:", error);

        res.status(500).json({
            message: "Server error while joining queue."
        });
    }
});


// ======================================================
// CANCEL QUEUE
// POST /api/queue/cancel
// ======================================================

router.post('/cancel', async (req, res) => {

    try {

        // Get student from verified JWT.
        const studentId = req.user.id;

        const [result] = await db.query(
            `UPDATE Queues
             SET status = 'cancelled'
             WHERE student_id = ?
             AND status = 'waiting'`,
            [studentId]
        );


        const io = req.app.get('socketio');

        if (io) {
            io.emit('dashboard_update');
        }


        res.json({
            message: 'Queue cancelled successfully'
        });

    } catch (error) {

        console.error("Cancel queue error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// LEAVE QUEUE
// DELETE /api/queue/leave/:queueId
// ======================================================

router.delete('/leave/:queueId', async (req, res) => {

    try {

        const { queueId } = req.params;

        const studentId = req.user.id;

        const io = req.app.get('socketio');


        // --------------------------------------------------
        // FIND QUEUE ENTRY
        // --------------------------------------------------

        const [queueEntry] = await db.query(
            `SELECT faculty_id, student_id, status
             FROM Queues
             WHERE id = ?`,
            [queueId]
        );


        if (queueEntry.length === 0) {

            return res.status(404).json({
                message: "Queue entry not found."
            });
        }


        // --------------------------------------------------
        // SECURITY CHECK
        // --------------------------------------------------
        // Make sure this queue belongs to the logged-in student.

        if (Number(queueEntry[0].student_id) !== Number(studentId)) {

            return res.status(403).json({
                message: "You are not allowed to modify this queue."
            });
        }


        // --------------------------------------------------
        // CANCEL QUEUE
        // --------------------------------------------------

        await db.query(
            `UPDATE Queues
             SET status = 'cancelled'
             WHERE id = ?`,
            [queueId]
        );


        // --------------------------------------------------
        // REAL-TIME UPDATE
        // --------------------------------------------------

        if (io) {

            io.to(`faculty_${queueEntry[0].faculty_id}`).emit(
                'queue_advanced',
                {
                    message: "Student left queue."
                }
            );

            io.emit('dashboard_update');
        }


        res.status(200).json({
            message: "Successfully left the queue."
        });

    } catch (error) {

        console.error("Leave queue error:", error);

        res.status(500).json({
            message: "Server error while leaving queue."
        });
    }
});


// ======================================================
// GET FACULTY QUEUE COUNT
// GET /api/queue/faculty-queue-count/:facultyId
// ======================================================

router.get('/faculty-queue-count/:facultyId', async (req, res) => {

    try {

        const [rows] = await db.query(
            `SELECT COUNT(*) AS count
             FROM Queues
             WHERE faculty_id = ?
             AND status = 'waiting'`,
            [req.params.facultyId]
        );


        res.json({
            count: Number(rows[0].count)
        });

    } catch (error) {

        console.error("Queue count error:", error);

        res.status(500).json({
            error: "Failed to get count"
        });
    }
});

router.get('/history', async (req, res) => {
    try {
        const studentId = req.user.id;

        const [history] = await db.query(
            `
            SELECT
                q.id,
                q.faculty_id,
                q.token_number,
                q.status,
                q.estimated_duration,
                q.started_at,
                q.completed_at,
                q.created_at,
                u.name AS facultyName
            FROM Queues q
            JOIN Users u ON q.faculty_id = u.id
            WHERE q.student_id = ?
            AND q.status IN ('completed', 'cancelled')
            ORDER BY q.created_at DESC
            `,
            [studentId]
        );

        const formattedHistory = history.map((item) => {
            let actualDuration = null;

            if (item.started_at && item.completed_at) {
                const start = new Date(item.started_at).getTime();
                const end = new Date(item.completed_at).getTime();

                actualDuration = Math.max(
                    0,
                    Math.floor((end - start) / 1000)
                );
            }

            return {
                id: item.id,
                facultyId: item.faculty_id,
                facultyName: item.facultyName,
                tokenNumber: item.token_number,
                status: item.status,
                estimatedDuration: item.estimated_duration,
                startedAt: item.started_at,
                completedAt: item.completed_at,
                createdAt: item.created_at,
                actualDuration
            };
        });

        res.status(200).json({
            history: formattedHistory
        });

    } catch (error) {
        console.error(
            'Queue history error:',
            error
        );

        res.status(500).json({
            message: 'Server error fetching queue history.'
        });
    }
});
// ======================================================
// CHECK CURRENT STUDENT QUEUE STATUS
// GET /api/queue/check-status
// ======================================================

router.get('/check-status', async (req, res) => {
    try {
        const studentId = req.user.id;

        const [queue] = await db.query(`
            SELECT
                q.id,
                q.faculty_id,
                q.token_number,
                q.estimated_duration,
                u.name AS facultyName,
                q.status,
                (
                    SELECT COUNT(*)
                    FROM Queues
                    WHERE faculty_id = q.faculty_id
                    AND status = 'active'
                ) AS activeCount,
                (
                    SELECT COUNT(*)
                    FROM Queues
                    WHERE faculty_id = q.faculty_id
                    AND status = 'waiting'
                    AND created_at <= q.created_at
                ) AS position
            FROM Queues q
            JOIN Users u ON q.faculty_id = u.id
            WHERE q.student_id = ?
            AND q.status IN ('waiting', 'active')
            LIMIT 1
        `, [studentId]);

        if (queue.length > 0) {
            const activeCount = Number(queue[0].activeCount);
            const position = Number(queue[0].position);

            const [aheadDurations] = await db.query(
    `
    SELECT COALESCE(
        SUM(
            CASE
                WHEN estimated_duration IS NOT NULL
                AND estimated_duration > 0
                THEN estimated_duration
                ELSE 0
            END
        ),
        0
    ) AS totalWaitSeconds
    FROM Queues
    WHERE faculty_id = ?
    AND status IN ('waiting', 'active')
    AND created_at < ?
    `,
    [
        queue[0].faculty_id,
        queue[0].created_at
    ]
);

const estimatedWait =
    Number(aheadDurations[0].totalWaitSeconds) || 0;

            res.json({
                activeQueue: {
                    ...queue[0],
                    activeCount,
                    position,
                    estimatedWait
                }
            });
        } else {
            res.json({
                activeQueue: null
            });
        }

    } catch (error) {
        console.error(
            'Check status error:',
            error
        );

        res.status(500).json({
            error: 'Server error'
        });
    }
});
router.get('/my-active-queue', async (req, res) => {
    try {
        const studentId = req.user.id;

        const [queue] = await db.query(
            `
            SELECT
                q.id,
                q.faculty_id,
                q.student_id,
                q.token_number,
                q.status,
                q.estimated_duration,
                q.started_at,
                q.created_at,
                u.name AS facultyName,
                u.faculty_status
            FROM Queues q
            JOIN Users u ON q.faculty_id = u.id
            WHERE q.student_id = ?
            AND q.status IN ('waiting', 'active')
            LIMIT 1
            `,
            [studentId]
        );

        if (queue.length === 0) {
            return res.status(200).json({
                activeQueue: null
            });
        }

        const currentQueue = queue[0];

        const [positionData] = await db.query(
            `
            SELECT COUNT(*) AS position
            FROM Queues
            WHERE faculty_id = ?
            AND status IN ('waiting', 'active')
            AND (
                created_at < ?
                OR (
                    created_at = ?
                    AND id <= ?
                )
            )
            `,
            [
                currentQueue.faculty_id,
                currentQueue.created_at,
                currentQueue.created_at,
                currentQueue.id
            ]
        );

        const position = Number(positionData[0].position) || 1;

        const [activeData] = await db.query(
            `
            SELECT COUNT(*) AS activeCount
            FROM Queues
            WHERE faculty_id = ?
            AND status = 'active'
            `,
            [currentQueue.faculty_id]
        );

        const activeCount = Number(activeData[0].activeCount) || 0;

        const peopleAhead = Math.max(
            0,
            activeCount + position - 1
        );

const [aheadDurations] = await db.query(
    `
    SELECT COALESCE(
        SUM(
            CASE
                WHEN estimated_duration IS NOT NULL
                AND estimated_duration > 0
                THEN estimated_duration
                ELSE 0
            END
        ),
        0
    ) AS totalWaitSeconds
    FROM Queues
    WHERE faculty_id = ?
    AND status IN ('waiting', 'active')
    AND created_at < ?
    `,
    [
        currentQueue.faculty_id,
        currentQueue.created_at
    ]
);

const estimatedWait =
    Number(aheadDurations[0].totalWaitSeconds) || 0;
        res.status(200).json({
            activeQueue: {
                ...currentQueue,
                position,
                activeCount,
                peopleAhead,
                estimatedWait
            }
        });

    } catch (error) {
        console.error(
            'My active queue error:',
            error
        );

        res.status(500).json({
            message: 'Server error fetching active queue.'
        });
    }
});

module.exports = router;
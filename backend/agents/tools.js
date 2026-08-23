const db = require('../config/db');

/*
========================================================
1. GET AVAILABLE FACULTY
========================================================
*/

const getAvailableFaculty = async () => {
    try {
        const [faculty] = await db.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.faculty_status,

                COUNT(
                    CASE
                        WHEN q.status = 'waiting'
                        THEN 1
                    END
                ) AS waitingCount,

                COUNT(
                    CASE
                        WHEN q.status = 'active'
                        THEN 1
                    END
                ) AS activeCount

             FROM Users u

             LEFT JOIN Queues q
                ON u.id = q.faculty_id

             WHERE u.role = 'faculty'

             GROUP BY
                u.id,
                u.name,
                u.email,
                u.faculty_status

             ORDER BY
                CASE
                    WHEN u.faculty_status = 'Available'
                    THEN 0
                    ELSE 1
                END,

                waitingCount ASC`
        );

        return faculty.map((item) => ({
            id: item.id,
            name: item.name,
            email: item.email,
            status: item.faculty_status,
            waitingCount:
                Number(item.waitingCount) || 0,
            activeCount:
                Number(item.activeCount) || 0
        }));

    } catch (error) {
        console.error(
            'getAvailableFaculty error:',
            error
        );

        throw new Error(
            'Unable to fetch faculty availability.'
        );
    }
};


/*
========================================================
2. GET MY QUEUE
========================================================

Returns the student's current waiting/active queue.

IMPORTANT:
estimated_duration now means:

"Expected duration of THIS appointment"

It does NOT mean total waiting time.

Actual ML wait prediction will be added later.
*/

const getMyQueue = async (studentId) => {

    try {

        const [queues] = await db.query(
            `SELECT
                q.id,
                q.faculty_id,
                u.name AS facultyName,
                u.faculty_status,

                q.token_number,
                q.status,

                q.appointment_type,
                q.estimated_duration,

                q.started_at,
                q.created_at

             FROM Queues q

             JOIN Users u
                ON q.faculty_id = u.id

             WHERE q.student_id = ?

             AND q.status IN (
                'waiting',
                'active'
             )

             ORDER BY q.created_at DESC

             LIMIT 1`,
            [studentId]
        );


        /*
        ------------------------------------------------
        NO ACTIVE QUEUE
        ------------------------------------------------
        */

        if (queues.length === 0) {

            return {
                hasQueue: false,

                message:
                    'You do not have an active queue.'
            };
        }


        const currentQueue = queues[0];


        /*
        ------------------------------------------------
        COUNT PEOPLE AHEAD
        ------------------------------------------------
        */

        const [positionResult] = await db.query(
            `SELECT
                COUNT(*) AS peopleAhead

             FROM Queues

             WHERE faculty_id = ?

             AND status = 'waiting'

             AND created_at < ?

             AND id != ?`,
            [
                currentQueue.faculty_id,
                currentQueue.created_at,
                currentQueue.id
            ]
        );


        const peopleAhead =
            Number(
                positionResult[0].peopleAhead
            ) || 0;


        /*
        ------------------------------------------------
        ACTIVE QUEUE
        ------------------------------------------------
        */

        const actualPeopleAhead =
            currentQueue.status === 'active'
                ? 0
                : peopleAhead;


        const position =
            currentQueue.status === 'active'
                ? 1
                : peopleAhead + 1;


        /*
        ------------------------------------------------
        ESTIMATED DURATION
        ------------------------------------------------

        This is NOT the waiting time.

        It represents the expected service duration
        for this student's appointment.

        At the moment we don't have enough ML data,
        so it may be NULL.
        ------------------------------------------------
        */

        const estimatedDuration =
            currentQueue.estimated_duration !== null
                ? Number(
                    currentQueue.estimated_duration
                )
                : null;


        /*
        ------------------------------------------------
        WAIT TIME

        We intentionally DON'T calculate:

        peopleAhead * 10

        because that was only a fake estimate.

        ML prediction will be added later.
        ------------------------------------------------
        */

        const estimatedWait = null;


        return {

            hasQueue: true,

            queueId:
                currentQueue.id,

            facultyId:
                currentQueue.faculty_id,

            facultyName:
                currentQueue.facultyName,

            facultyStatus:
                currentQueue.faculty_status,

            token:
                currentQueue.token_number,

            status:
                currentQueue.status,

            appointmentType:
                currentQueue.appointment_type,

            position,

            peopleAhead:
                actualPeopleAhead,

            estimatedWait,

            estimatedDuration,

            joinedAt:
                currentQueue.created_at
        };


    } catch (error) {

        console.error(
            'getMyQueue error:',
            error
        );

        throw new Error(
            'Unable to fetch your queue information.'
        );
    }
};


/*
========================================================
3. GET FACULTY QUEUE
========================================================
*/

const getFacultyQueue = async (facultyId) => {

    try {

        /*
        ------------------------------------------------
        FACULTY INFORMATION
        ------------------------------------------------
        */

        const [faculty] = await db.query(
            `SELECT
                id,
                name,
                email,
                faculty_status

             FROM Users

             WHERE id = ?

             AND role = 'faculty'`,
            [facultyId]
        );


        if (faculty.length === 0) {

            return {
                found: false,

                message:
                    'Faculty member not found.'
            };
        }


        /*
        ------------------------------------------------
        CURRENT ACTIVE STUDENT
        ------------------------------------------------
        */

        const [active] = await db.query(
            `SELECT
                q.id AS queueId,
                q.token_number AS token,
                u.name AS studentName,

                q.appointment_type,
                q.estimated_duration,

                q.started_at,
                q.created_at

             FROM Queues q

             JOIN Users u
                ON q.student_id = u.id

             WHERE q.faculty_id = ?

             AND q.status = 'active'

             ORDER BY q.started_at ASC

             LIMIT 1`,
            [facultyId]
        );


        /*
        ------------------------------------------------
        WAITING STUDENTS
        ------------------------------------------------
        */

        const [waiting] = await db.query(
            `SELECT
                q.id AS queueId,
                q.token_number AS token,
                u.name AS studentName,

                q.appointment_type,
                q.estimated_duration,

                q.created_at

             FROM Queues q

             JOIN Users u
                ON q.student_id = u.id

             WHERE q.faculty_id = ?

             AND q.status = 'waiting'

             ORDER BY q.created_at ASC`,
            [facultyId]
        );


        return {

            found: true,

            faculty: {
                id: faculty[0].id,
                name: faculty[0].name,
                email: faculty[0].email,
                status:
                    faculty[0].faculty_status
            },

            currentStudent:
                active.length > 0
                    ? active[0]
                    : null,

            waitingStudents:
                waiting,

            waitingCount:
                waiting.length,

            activeCount:
                active.length
        };


    } catch (error) {

        console.error(
            'getFacultyQueue error:',
            error
        );

        throw new Error(
            'Unable to fetch faculty queue.'
        );
    }
};


/*
========================================================
4. GET QUEUE HISTORY
========================================================
*/

const getQueueHistory = async (studentId) => {

    try {

        const [history] = await db.query(
            `SELECT
                q.id AS queueId,
                q.token_number AS token,

                u.name AS facultyName,

                q.status,
                q.appointment_type,

                q.created_at,
                q.started_at,
                q.completed_at,

                q.actual_duration

             FROM Queues q

             JOIN Users u
                ON q.faculty_id = u.id

             WHERE q.student_id = ?

             AND q.status IN (
                'completed',
                'cancelled'
             )

             ORDER BY q.created_at DESC

             LIMIT 20`,
            [studentId]
        );


        return {
            count: history.length,
            history
        };


    } catch (error) {

        console.error(
            'getQueueHistory error:',
            error
        );

        throw new Error(
            'Unable to fetch queue history.'
        );
    }
};


/*
========================================================
5. FIND BEST FACULTY
========================================================

For now we use queue size only.

The ML-based wait prediction will replace this
later.
========================================================
*/

const findBestFaculty = async () => {

    try {

        const [faculty] = await db.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.faculty_status,

                COUNT(
                    CASE
                        WHEN q.status = 'waiting'
                        THEN 1
                    END
                ) AS waitingCount,

                COUNT(
                    CASE
                        WHEN q.status = 'active'
                        THEN 1
                    END
                ) AS activeCount

             FROM Users u

             LEFT JOIN Queues q
                ON u.id = q.faculty_id

             WHERE u.role = 'faculty'

             GROUP BY
                u.id,
                u.name,
                u.email,
                u.faculty_status

             HAVING
                u.faculty_status = 'Available'

             ORDER BY
                waitingCount ASC,
                activeCount ASC

             LIMIT 1`
        );


        if (faculty.length === 0) {

            return {

                found: false,

                message:
                    'There are currently no available faculty members.'
            };
        }


        const best = faculty[0];


        const waitingCount =
            Number(best.waitingCount) || 0;

        const activeCount =
            Number(best.activeCount) || 0;


        return {

            found: true,

            faculty: {

                id: best.id,

                name: best.name,

                email: best.email,

                status:
                    best.faculty_status,

                waitingCount,

                activeCount,

                /*
                No fake wait calculation.
                */

                estimatedWait: null
            }
        };


    } catch (error) {

        console.error(
            'findBestFaculty error:',
            error
        );

        throw new Error(
            'Unable to find the best available faculty.'
        );
    }
};


/*
========================================================
6. CANCEL MY QUEUE
========================================================

UNCHANGED LOGIC
========================================================
*/

const cancelMyQueue = async (studentId) => {

    try {

        const [queues] = await db.query(
            `SELECT
                q.id,
                q.faculty_id,
                q.token_number,

                u.name AS facultyName

             FROM Queues q

             JOIN Users u
                ON q.faculty_id = u.id

             WHERE q.student_id = ?

             AND q.status IN (
                'waiting',
                'active'
             )

             ORDER BY q.created_at DESC

             LIMIT 1`,
            [studentId]
        );


        if (queues.length === 0) {

            return {

                success: false,

                message:
                    'You do not have an active appointment.'
            };
        }


        const queue = queues[0];


        const [result] = await db.query(
            `UPDATE Queues

             SET status = 'cancelled'

             WHERE id = ?

             AND student_id = ?

             AND status IN (
                'waiting',
                'active'
             )`,
            [
                queue.id,
                studentId
            ]
        );


        console.log(
            'Cancellation update:',
            {
                queueId: queue.id,
                studentId,
                token: queue.token_number,
                affectedRows:
                    result.affectedRows
            }
        );


        if (result.affectedRows === 0) {

            return {

                success: false,

                message:
                    'The appointment could not be cancelled.'
            };
        }


        return {

            success: true,

            queueId:
                queue.id,

            facultyId:
                queue.faculty_id,

            facultyName:
                queue.facultyName,

            token:
                queue.token_number,

            message:
                'Appointment cancelled successfully.'
        };


    } catch (error) {

        console.error(
            'cancelMyQueue error:',
            error
        );

        throw new Error(
            'Unable to cancel your appointment.'
        );
    }
};


/*
========================================================
7. GET FACULTY BY NAME
========================================================
*/

const getFacultyByName = async (facultyName) => {

    try {

        const [faculty] = await db.query(
            `SELECT
                id,
                name,
                email,
                faculty_status

             FROM Users

             WHERE role = 'faculty'

             AND LOWER(name) = LOWER(?)

             LIMIT 1`,
            [facultyName.trim()]
        );


        if (faculty.length === 0) {

            return {

                found: false,

                message:
                    `No faculty member named ${facultyName} was found.`
            };
        }


        return {

            found: true,

            faculty: {

                id:
                    faculty[0].id,

                name:
                    faculty[0].name,

                email:
                    faculty[0].email,

                status:
                    faculty[0].faculty_status
            }
        };


    } catch (error) {

        console.error(
            'getFacultyByName error:',
            error
        );

        throw new Error(
            'Unable to find faculty member.'
        );
    }
};


/*
========================================================
8. JOIN QUEUE
========================================================

appointmentType is optional for backwards compatibility.

Later the AI will pass values such as:

SIGNATURE
PROJECT
EXAM_QUERY
GENERAL_DOUBT
DOCUMENT
OTHER
========================================================
*/

const joinQueue = async (
    studentId,
    facultyId,
    appointmentType = 'OTHER'
) => {

    try {
        console.log("========== JOIN QUEUE DEBUG ==========");
console.log("studentId:", studentId);
console.log("facultyId:", facultyId);
console.log("appointmentType:", appointmentType);
console.log("======================================");

        // =================================================
        // NORMALIZE APPOINTMENT TYPE
        // =================================================

        const normalizedType =
            String(appointmentType || 'OTHER')
                .trim()
                .toUpperCase()
                .substring(0, 50);


        // =================================================
        // CHECK IF STUDENT ALREADY HAS ACTIVE QUEUE
        // =================================================

        const [existing] = await db.query(
            `SELECT
                id,
                token_number,
                status
             FROM Queues
             WHERE student_id = ?
             AND status IN ('waiting', 'active')
             LIMIT 1`,
            [studentId]
        );


        if (existing.length > 0) {

            return {
                success: false,

                message:
                    'You are already in an active queue.',

                queueId:
                    existing[0].id,

                token:
                    existing[0].token_number,

                status:
                    existing[0].status
            };
        }


        // =================================================
        // CHECK FACULTY
        // =================================================

        const [faculty] = await db.query(
            `SELECT
                id,
                name,
                email,
                faculty_status
             FROM Users
             WHERE id = ?
             AND role = 'faculty'`,
            [facultyId]
        );


        if (faculty.length === 0) {

            return {
                success: false,

                message:
                    'Faculty member not found.'
            };
        }


        // =================================================
        // CHECK FACULTY AVAILABILITY
        // =================================================

        if (
            faculty[0].faculty_status !==
            'Available'
        ) {

            return {
                success: false,

                message:
                    `Dr. ${faculty[0].name} is currently ${faculty[0].faculty_status} and is unavailable.`
            };
        }


        // =================================================
        // GENERATE TOKEN
        // =================================================

        const [tokenCount] = await db.query(
            `SELECT
                COUNT(*) AS count
             FROM Queues
             WHERE faculty_id = ?
             AND DATE(created_at) = CURDATE()`,
            [facultyId]
        );


        const tokenNumber =
            `T-${Number(tokenCount[0].count) + 1}`;


        // =================================================
        // GET CURRENT QUEUE INFORMATION
        // =================================================

        /*
        IMPORTANT:

        We take this count BEFORE inserting
        the new student.

        Therefore:

        peopleAhead
        =
        students currently waiting/active

        queueLength
        =
        total students currently waiting/active
        */

        const [queueData] = await db.query(
            `SELECT
                COUNT(*) AS queueLength
             FROM Queues
             WHERE faculty_id = ?
             AND status IN ('waiting', 'active')`,
            [facultyId]
        );


        const queueLength =
            Number(queueData[0].queueLength) || 0;


        const peopleAhead =
            queueLength;


        // =================================================
        // NO FAKE ESTIMATION
        // =================================================

        /*
        DO NOT DO:

            peopleAhead * 10

        We are collecting real data for ML.

        Therefore estimated_duration
        stays NULL for now.
        */

        const estimatedDuration = null;


        // =================================================
        // INSERT QUEUE
        // =================================================

        const [result] = await db.query(
            `INSERT INTO Queues
            (
                faculty_id,
                student_id,
                appointment_type,
                token_number,
                status,
                estimated_duration,
                people_ahead_when_joined,
                queue_length_when_joined
            )
            VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?)`,
            [
                facultyId,
                studentId,
                normalizedType,
                tokenNumber,
                estimatedDuration,
                peopleAhead,
                queueLength
            ]
        );


        // =================================================
        // POSITION
        // =================================================

        const position =
            peopleAhead + 1;


        // =================================================
        // RETURN RESULT
        // =================================================

        return {

            success: true,

            queueId:
                result.insertId,

            facultyId,

            facultyName:
                faculty[0].name,

            token:
                tokenNumber,

            appointmentType:
                normalizedType,

            position,

            peopleAhead,

            queueLength,

            estimatedWait:
                null,

            estimatedDuration:
                null,

            predictionAvailable:
                false,

            message:
                'Successfully joined the queue.'
        };


    } catch (error) {

        console.error(
            'joinQueue error:',
            error
        );

        /*
        IMPORTANT:
        Print the actual MySQL error so if
        something goes wrong we can identify it.
        */

        console.error(
            'MySQL error code:',
            error.code
        );

        console.error(
            'MySQL error message:',
            error.message
        );

        throw new Error(
            'Unable to join the queue.'
        );
    }
};


/*
========================================================
EXPORT ALL TOOLS
========================================================
*/

module.exports = {

    getAvailableFaculty,

    getMyQueue,

    getFacultyQueue,

    getQueueHistory,

    findBestFaculty,

    cancelMyQueue,

    getFacultyByName,

    joinQueue

};
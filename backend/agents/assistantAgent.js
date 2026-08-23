const Groq = require('groq-sdk');

const {
    getAvailableFaculty,
    getMyQueue,
    getFacultyQueue,
    getQueueHistory,
    findBestFaculty,
    cancelMyQueue,
    getFacultyByName,
    joinQueue
} = require('./tools');


// ========================================================
// GROQ CLIENT
// ========================================================

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


// ========================================================
// CONVERSATION MEMORY
// ========================================================

const conversationMemory = new Map();

const MAX_MESSAGES = 12;


// ========================================================
// PENDING ACTIONS
// ========================================================

const pendingActions = new Map();


// ========================================================
// GET CONVERSATION
// ========================================================

const getConversation = (studentId) => {

    const key = String(studentId);

    if (!conversationMemory.has(key)) {

        conversationMemory.set(
            key,
            []
        );
    }

    return conversationMemory.get(key);
};


// ========================================================
// ADD MESSAGE
// ========================================================

const addToConversation = (
    studentId,
    message
) => {

    const conversation =
        getConversation(studentId);

    conversation.push(message);

    if (
        conversation.length >
        MAX_MESSAGES
    ) {

        conversation.splice(
            0,
            conversation.length - MAX_MESSAGES
        );
    }
};


// ========================================================
// CLEAR CONVERSATION
// ========================================================

const clearConversation = (
    studentId
) => {

    const key = String(studentId);

    conversationMemory.delete(key);

    pendingActions.delete(key);
};


// ========================================================
// PENDING ACTION HELPERS
// ========================================================


// --------------------------------------------------------
// Cancellation
// --------------------------------------------------------

const setPendingCancellation = (
    studentId,
    queueInfo
) => {

    pendingActions.set(
        String(studentId),
        {
            type: 'cancel_queue',

            queueId:
                queueInfo.queueId,

            facultyName:
                queueInfo.facultyName,

            token:
                queueInfo.token
        }
    );
};


// --------------------------------------------------------
// Join Queue
// --------------------------------------------------------

const setPendingJoin = (
    studentId,
    facultyInfo
) => {

    pendingActions.set(
        String(studentId),
        {
            type: 'join_queue',

            facultyId:
                facultyInfo.facultyId,

            facultyName:
                facultyInfo.facultyName,

            peopleAhead:
                facultyInfo.peopleAhead,

            estimatedWait:
                facultyInfo.estimatedWait,

            appointmentType:
                facultyInfo.appointmentType
        }
    );
};
// --------------------------------------------------------
// Appointment Purpose
// --------------------------------------------------------

const setPendingPurpose = (
    studentId,
    facultyInfo
) => {

    pendingActions.set(
        String(studentId),
        {
            type: 'appointment_purpose',

            facultyId:
                facultyInfo.facultyId,

            facultyName:
                facultyInfo.facultyName
        }
    );
};


// --------------------------------------------------------
// Get pending action
// --------------------------------------------------------

const getPendingAction = (
    studentId
) => {

    return (
        pendingActions.get(
            String(studentId)
        ) || null
    );
};


// --------------------------------------------------------
// Clear pending action
// --------------------------------------------------------

const clearPendingAction = (
    studentId
) => {

    pendingActions.delete(
        String(studentId)
    );
};


// ========================================================
// APPOINTMENT TYPE DETECTION
// ========================================================

const detectAppointmentType = (
    message
) => {

    const text =
        message.toLowerCase();


    // Signature
    if (
        /\b(sign|signature|signing|sign my|signature work)\b/i
            .test(text)
    ) {

        return 'SIGNATURE';
    }


    // Project
    if (
        /\b(project|project discussion|project discussion)\b/i
            .test(text)
    ) {

        return 'PROJECT';
    }


    // Examination
    if (
        /\b(exam|examination|syllabus|exam syllabus|question paper)\b/i
            .test(text)
    ) {

        return 'EXAM_QUERY';
    }


    // Document
    if (
        /\b(document|documents|certificate|form|forms|paperwork)\b/i
            .test(text)
    ) {

        return 'DOCUMENT';
    }


    // General doubt
    if (
        /\b(doubt|question|clarification|clarify|help)\b/i
            .test(text)
    ) {

        return 'GENERAL_DOUBT';
    }


    return 'OTHER';
};


// ========================================================
// EXTRACT FACULTY NAME
// ========================================================

const extractFacultyName = (
    userMessage
) => {

    const patterns = [

        /i want to meet\s+(.+)/i,

        /i want to see\s+(.+)/i,

        /i need to meet\s+(.+)/i,

        /i need to see\s+(.+)/i,

        /meet\s+(.+)/i,

        /see\s+(.+)/i

    ];


    for (
        const pattern
        of patterns
    ) {

        const match =
            userMessage.match(pattern);

        if (match) {

            let name =
                match[1]
                    .replace(/[?.!,]/g, '')
                    .trim();


            /*
            Remove appointment-related
            phrases from the extracted
            faculty name.

            Example:

            "Sandeep for my project"

            becomes:

            "Sandeep"
            */

            name = name.replace(
                /\s+(for|about|regarding|to discuss)\s+.*$/i,
                ''
            );


            return name.trim();
        }
    }


    return null;
};


// ========================================================
// YES RESPONSE
// ========================================================

const isYesResponse = (message) => {

    const yesWords = [
        'yes',
        'yes please',
        'confirm',
        'confirmed',
        'sure',
        'okay',
        'ok',
        'join',
        'join it',
        'join queue',
        'do it',
        'go ahead'
    ];

    return yesWords.includes(
        message.trim().toLowerCase()
    );
};


// ========================================================
// NO RESPONSE
// ========================================================

const isNoResponse = (message) => {

    const noWords = [
        'no',
        'no thanks',
        'dont',
        "don't",
        'do not',
        'not now',
        'keep it',
        'keep my appointment',
        'keep appointment'
    ];

    return noWords.includes(
        message.trim().toLowerCase()
    );
};


// ========================================================
// AI TOOLS
// ========================================================

const tools = [

    // ====================================================
    // TOOL 1: AVAILABLE FACULTY
    // ====================================================

    {
        type: 'function',

        function: {

            name:
                'get_available_faculty',

            description:
                `Get the current faculty members,
their availability status, number of waiting students,
and number of active students.`,

            parameters: {

                type: 'object',

                properties: {},

                required: []
            }
        }
    },


    // ====================================================
    // TOOL 2: MY QUEUE
    // ====================================================

    {
        type: 'function',

        function: {

            name:
                'get_my_queue',

            description:
                `Get the authenticated student's
current queue information including faculty name,
token, queue status, position, people ahead,
appointment type and estimated waiting time.`,

            parameters: {

                type: 'object',

                properties: {},

                required: []
            }
        }
    },


    // ====================================================
    // TOOL 3: FACULTY QUEUE
    // ====================================================

    {
        type: 'function',

        function: {

            name:
                'get_faculty_queue',

            description:
                `Get the current queue of a specific
faculty member including their current student,
waiting students, queue count, and faculty status.`,

            parameters: {

                type: 'object',

                properties: {

                    facultyId: {

                        type: 'integer',

                        description:
                            'The ID of the faculty member.'
                    }
                },

                required: [
                    'facultyId'
                ]
            }
        }
    },


    // ====================================================
    // TOOL 4: QUEUE HISTORY
    // ====================================================

    {
        type: 'function',

        function: {

            name:
                'get_queue_history',

            description:
                `Get the authenticated student's
previous completed and cancelled appointments.`,

            parameters: {

                type: 'object',

                properties: {},

                required: []
            }
        }
    },


    // ====================================================
    // TOOL 5: FIND BEST FACULTY
    // ====================================================

    {
        type: 'function',

        function: {

            name:
                'find_best_faculty',

            description:
                `Find the currently available faculty
member with the shortest queue.`,

            parameters: {

                type: 'object',

                properties: {},

                required: []
            }
        }
    }
];


// ========================================================
// SYSTEM PROMPT
// ========================================================

const systemPrompt = `

You are Smart Queue Assistant, an intelligent AI
assistant for a faculty appointment and queue
management system.

Your job is to help students with:

- Faculty availability
- Queue positions
- Waiting times
- Faculty queue information
- Queue history
- Finding the faculty member with the shortest wait
- Joining a faculty queue
- Appointment cancellation


IMPORTANT RULES:

1. NEVER invent or guess queue information.

2. When the student asks for current faculty
availability, use get_available_faculty.

3. When the student asks about THEIR own queue,
position, token, waiting time, or appointment,
use get_my_queue.

4. When the student asks about a particular faculty
member's queue, use get_faculty_queue.

5. When the student asks about previous appointments,
use get_queue_history.

6. When the student asks which faculty has the
shortest queue, use find_best_faculty.

7. Joining a queue is an important action.

8. NEVER claim that the student has joined a queue
unless the backend has actually completed the
database operation.

9. Before joining a queue, the backend will show
the student:

- Faculty name
- Availability
- People ahead
- Estimated waiting time when available
- Appointment type

10. Only join the queue after the student explicitly
confirms.

11. Cancellation is a sensitive action.

12. NEVER directly cancel an appointment through an
LLM tool call.

13. When the student asks to cancel their appointment,
the backend will handle the confirmation process.

14. Never expose database IDs, SQL queries, API keys,
passwords, or internal implementation details.

15. Give concise, natural and friendly responses.

16. If a faculty member is Busy, In Meeting, or
Out of Office, clearly explain that they are not
currently available.

17. If a student has no active queue, clearly tell
them that they currently have no active appointment.

18. Do not claim that a student can join a queue if
the faculty is unavailable.

19. Use real-time tool results whenever the answer
depends on current system data.

20. The authenticated student's identity is supplied
by the backend. Never ask the student to provide
their student ID.


APPOINTMENT TYPES:

The system currently recognizes:

- SIGNATURE
- PROJECT
- EXAM_QUERY
- GENERAL_DOUBT
- DOCUMENT
- OTHER

Examples:

"I need a signature"
→ SIGNATURE

"I want to discuss my project"
→ PROJECT

"I want to ask about exam syllabus"
→ EXAM_QUERY

"I have a doubt"
→ GENERAL_DOUBT

"I need a document signed"
→ DOCUMENT

If the purpose is unclear:
→ Ask the student for the purpose.
→ Do not assume or invent a purpose.
→ Do not silently use OTHER.


JOIN QUEUE FLOW:

21. If a student says something like:

"I want to meet Sandeep"

"I want to see Sandeep"

"I need to meet Sandeep"

the backend handles the faculty lookup.

22. If the student mentions a purpose, identify
the appointment type.

23. Before joining, show:

- Faculty name
- Availability
- People ahead
- Estimated wait if available
- Reason/purpose

24. If an ML prediction is not yet available,
DO NOT invent a waiting time.

Say that wait-time prediction is currently
being collected/learned from appointment history.

25. Then ask:

"Would you like me to join you to [faculty]'s queue?"

26. Do NOT say the student has joined yet.

27. After confirmation, the backend performs the
actual queue insertion.

28. Pass the appointment type to the backend.

29. After successful insertion, report:

- Token
- Position
- People ahead
- Appointment type
- Estimated wait if available


CONVERSATION MEMORY:

30. Use previous messages in the conversation to
understand follow-up questions.

31. If the student says:

- "him"
- "her"
- "that faculty"
- "that person"
- "my queue"
- "there"
- "what about them"

use previous conversation context.

32. Do not repeat questions that have already been
answered when the student is clearly asking a
follow-up question.

33. If the previous conversation identifies a faculty
member, understand references to that faculty member.

34. However, whenever current queue information is
required, ALWAYS use the appropriate real-time tool.


RESPONSE FORMATTING:

35. Use clean Markdown when useful.

36. Use **bold** for important names, statuses,
tokens and numbers.

37. Use bullet points for short lists.

38. Use tables when presenting multiple history
records.

39. Do not expose raw JSON.

40. Do not expose tool calls or internal reasoning.

41. Keep responses concise and easy to read.

`;


// ========================================================
// RUN ASSISTANT
// ========================================================

const runAssistant = async (
    userMessage,
    studentId,
    io
) => {

    try {

        // =================================================
        // VALIDATE
        // =================================================

        if (!studentId) {

            throw new Error(
                'Student ID is required.'
            );
        }


        const normalizedMessage =
            userMessage
                .trim()
                .toLowerCase();


        // =================================================
        // CHECK PENDING ACTION
        // =================================================

        const pendingAction =
            getPendingAction(
                studentId
            );
            // =================================================
// HANDLE APPOINTMENT PURPOSE
// =================================================

if (
    pendingAction &&
    pendingAction.type ===
        'appointment_purpose'
) {

    const appointmentType =
        detectAppointmentType(
            userMessage
        );

    if (
        appointmentType ===
        'OTHER'
    ) {

        const response =
            `Please tell me the purpose of your visit to **${pendingAction.facultyName}**.

For example:
- Signature
- Project discussion
- Exam/syllabus query
- General doubt
- Document work`;

        addToConversation(
            studentId,
            {
                role: 'user',
                content: userMessage
            }
        );

        addToConversation(
            studentId,
            {
                role: 'assistant',
                content: response
            }
        );

        return response;
    }

    setPendingJoin(
        studentId,
        {
            facultyId:
                pendingAction.facultyId,

            facultyName:
                pendingAction.facultyName,

            peopleAhead: 0,

            estimatedWait: null,

            appointmentType
        }
    );

    const response =
        `**${pendingAction.facultyName}** is currently **Available**.

📋 **Purpose:** ${appointmentType}

⏱️ **Estimated wait:** Prediction not available yet

Would you like me to join you to **${pendingAction.facultyName}'s** queue?`;

    addToConversation(
        studentId,
        {
            role: 'user',
            content: userMessage
        }
    );

    addToConversation(
        studentId,
        {
            role: 'assistant',
            content: response
        }
    );

    return response;
}


        // =================================================
        // HANDLE JOIN CONFIRMATION
        // =================================================

        if (
            pendingAction &&
            pendingAction.type ===
                'join_queue'
        ) {

            // ---------------------------------------------
            // YES
            // ---------------------------------------------

            if (
                isYesResponse(
                    normalizedMessage
                )
            ) {

                try {

                    const result =
                        await joinQueue(
                            studentId,
                            pendingAction.facultyId,
                            pendingAction.appointmentType
                        );


                    // -----------------------------------------
                    // SOCKET.IO UPDATE
                    // -----------------------------------------

                    if (
                        result &&
                        result.success &&
                        io
                    ) {

                        io.to(
                            `student_${studentId}`
                        ).emit(
                            'queue_updated',
                            {
                                type:
                                    'queue_joined',

                                queue:
                                    result
                            }
                        );


                        io.to(
                            `faculty_${result.facultyId}`
                        ).emit(
                            'queue_updated',
                            {
                                type:
                                    'student_joined',

                                queue:
                                    result
                            }
                        );


                        io.emit(
                            'dashboard_update',
                            {
                                type:
                                    'queue_updated'
                            }
                        );
                    }


                    clearPendingAction(
                        studentId
                    );


                    addToConversation(
                        studentId,
                        {
                            role: 'user',
                            content: userMessage
                        }
                    );


                    if (
                        !result ||
                        result.success === false
                    ) {

                        const response =
                            result?.message ||
                            'I could not join the queue right now.';


                        addToConversation(
                            studentId,
                            {
                                role: 'assistant',
                                content: response
                            }
                        );


                        return response;
                    }


                    let waitText =
                        'Prediction not available yet';


                    if (
                        result.estimatedWait !== null &&
                        result.estimatedWait !== undefined
                    ) {

                        waitText =
                            result.estimatedWait === 0
                                ? 'No wait'
                                : `~${result.estimatedWait} minutes`;
                    }


                    const response =
                        `You're successfully added to **${result.facultyName}'s** queue! 🎉

🎟️ **Token:** ${result.token}

📍 **Position:** #${result.position}

👥 **People ahead:** ${result.peopleAhead}

📋 **Purpose:** ${result.appointmentType}

⏱️ **Estimated wait:** ${waitText}`;


                    addToConversation(
                        studentId,
                        {
                            role: 'assistant',
                            content: response
                        }
                    );


                    return response;


                } catch (error) {

                    console.error(
                        'Join queue confirmation error:',
                        error
                    );


                    clearPendingAction(
                        studentId
                    );


                    const response =
                        'I could not join the queue right now. Please try again.';


                    addToConversation(
                        studentId,
                        {
                            role: 'user',
                            content: userMessage
                        }
                    );


                    addToConversation(
                        studentId,
                        {
                            role: 'assistant',
                            content: response
                        }
                    );


                    return response;
                }
            }


            // ---------------------------------------------
            // NO
            // ---------------------------------------------

            if (
                isNoResponse(
                    normalizedMessage
                )
            ) {

                const facultyName =
                    pendingAction.facultyName;


                clearPendingAction(
                    studentId
                );


                addToConversation(
                    studentId,
                    {
                        role: 'user',
                        content: userMessage
                    }
                );


                const response =
                    `No problem! 👍 I haven't joined you to **${facultyName}'s** queue.`;


                addToConversation(
                    studentId,
                    {
                        role: 'assistant',
                        content: response
                    }
                );


                return response;
            }
        }


        // =================================================
        // HANDLE CANCELLATION CONFIRMATION
        // =================================================

        if (
            pendingAction &&
            pendingAction.type ===
                'cancel_queue'
        ) {

            console.log(
                '🟡 Pending cancellation found:',
                pendingAction
            );


            // ---------------------------------------------
            // YES
            // ---------------------------------------------

            if (
                isYesResponse(
                    normalizedMessage
                )
            ) {

                console.log(
                    '🟢 Cancellation confirmed by student.'
                );


                try {

                    const result =
                        await cancelMyQueue(
                            studentId
                        );


                    console.log(
                        '🟢 cancelMyQueue result:',
                        result
                    );


                    if (
                        !result ||
                        result.success === false
                    ) {

                        const response =
                            result?.message ||
                            'I could not cancel your appointment.';


                        addToConversation(
                            studentId,
                            {
                                role: 'user',
                                content: userMessage
                            }
                        );


                        addToConversation(
                            studentId,
                            {
                                role: 'assistant',
                                content: response
                            }
                        );


                        clearPendingAction(
                            studentId
                        );


                        return response;
                    }


                    clearPendingAction(
                        studentId
                    );


                    addToConversation(
                        studentId,
                        {
                            role: 'user',
                            content: userMessage
                        }
                    );


                    // -----------------------------------------
                    // SOCKET.IO UPDATE
                    // -----------------------------------------

                    if (io) {

                        io.to(
                            `student_${studentId}`
                        ).emit(
                            'queue_cancelled',
                            {
                                type:
                                    'queue_cancelled',

                                queueId:
                                    result.queueId,

                                token:
                                    result.token,

                                message:
                                    'Your appointment has been cancelled.'
                            }
                        );


                        io.to(
                            `faculty_${result.facultyId}`
                        ).emit(
                            'queue_updated',
                            {
                                type:
                                    'student_cancelled',

                                queueId:
                                    result.queueId,

                                token:
                                    result.token
                            }
                        );


                        io.emit(
                            'dashboard_update',
                            {
                                type:
                                    'queue_cancelled'
                            }
                        );
                    }


                    const response =
                        `Your appointment with **${result.facultyName || pendingAction.facultyName}** (Token **${result.token || pendingAction.token}**) has been cancelled successfully. 🎉`;


                    addToConversation(
                        studentId,
                        {
                            role: 'assistant',
                            content: response
                        }
                    );


                    return response;


                } catch (error) {

                    console.error(
                        '❌ Cancellation execution error:',
                        error
                    );


                    clearPendingAction(
                        studentId
                    );


                    const response =
                        'I could not cancel your appointment right now. Please try again.';


                    addToConversation(
                        studentId,
                        {
                            role: 'user',
                            content: userMessage
                        }
                    );


                    addToConversation(
                        studentId,
                        {
                            role: 'assistant',
                            content: response
                        }
                    );


                    return response;
                }
            }


            // ---------------------------------------------
            // NO
            // ---------------------------------------------

            if (
                isNoResponse(
                    normalizedMessage
                )
            ) {

                clearPendingAction(
                    studentId
                );


                addToConversation(
                    studentId,
                    {
                        role: 'user',
                        content: userMessage
                    }
                );


                const response =
                    'Okay 👍 I will keep your appointment active.';


                addToConversation(
                    studentId,
                    {
                        role: 'assistant',
                        content: response
                    }
                );


                return response;
            }
        }


        // =================================================
        // DETECT CANCELLATION REQUEST
        // =================================================

        const cancellationRequest =
            /\b(cancel|cancel my appointment|cancel my queue|leave queue|leave my queue|remove me from the queue|don't want to wait)\b/i
                .test(userMessage);


        if (cancellationRequest) {

            console.log(
                '🔵 Cancellation request detected:',
                userMessage
            );


            // ---------------------------------------------
            // GET CURRENT QUEUE
            // ---------------------------------------------

            const currentQueue =
                await getMyQueue(
                    studentId
                );


            // ---------------------------------------------
            // NO ACTIVE QUEUE
            // ---------------------------------------------

            if (
                !currentQueue ||
                !currentQueue.hasQueue
            ) {

                const response =
                    'You do not have an active appointment to cancel.';


                addToConversation(
                    studentId,
                    {
                        role: 'user',
                        content: userMessage
                    }
                );


                addToConversation(
                    studentId,
                    {
                        role: 'assistant',
                        content: response
                    }
                );


                return response;
            }


            // ---------------------------------------------
            // SAVE PENDING CANCELLATION
            // ---------------------------------------------

            setPendingCancellation(
                studentId,
                {
                    queueId:
                        currentQueue.queueId,

                    facultyName:
                        currentQueue.facultyName,

                    token:
                        currentQueue.token
                }
            );


            console.log(
                '🟡 Cancellation pending:',
                getPendingAction(studentId)
            );


            // ---------------------------------------------
            // ASK FOR CONFIRMATION
            // ---------------------------------------------

            let waitText =
                'Prediction not available yet';


            if (
                currentQueue.estimatedWait !== null &&
                currentQueue.estimatedWait !== undefined
            ) {

                waitText =
                    currentQueue.estimatedWait === 0
                        ? 'No wait'
                        : `~${currentQueue.estimatedWait} minutes`;
            }


            const response =
                `You currently have an appointment with **${currentQueue.facultyName}**.

🎟️ **Token:** ${currentQueue.token}

📍 **Position:** #${currentQueue.position}

👥 **People ahead:** ${currentQueue.peopleAhead}

⏱️ **Estimated wait:** ${waitText}

Are you sure you want to cancel this appointment?`;


            addToConversation(
                studentId,
                {
                    role: 'user',
                    content: userMessage
                }
            );


            addToConversation(
                studentId,
                {
                    role: 'assistant',
                    content: response
                }
            );


            return response;
        }


        // =================================================
        // DETECT JOIN REQUEST
        // =================================================

        const meetingRequest =
            /\b(i want to meet|i want to see|i need to meet|i need to see|meet|see)\b/i
                .test(userMessage);


        if (meetingRequest) {

            const facultyName =
                extractFacultyName(
                    userMessage
                );


            if (!facultyName) {

                const response =
                    'Sure! 😊 Which faculty member would you like to meet?';


                addToConversation(
                    studentId,
                    {
                        role: 'user',
                        content: userMessage
                    }
                );


                addToConversation(
                    studentId,
                    {
                        role: 'assistant',
                        content: response
                    }
                );


                return response;
            }


            // ---------------------------------------------
            // DETECT PURPOSE
            // ---------------------------------------------

            const appointmentType =
                detectAppointmentType(
                    userMessage
                );


            // ---------------------------------------------
            // FIND FACULTY
            // ---------------------------------------------

            const facultyResult =
                await getFacultyByName(
                    facultyName
                );


            if (
                !facultyResult ||
                !facultyResult.found
            ) {

                const response =
                    facultyResult?.message ||
                    `I couldn't find a faculty member named **${facultyName}**.`;


                addToConversation(
                    studentId,
                    {
                        role: 'user',
                        content: userMessage
                    }
                );


                addToConversation(
                    studentId,
                    {
                        role: 'assistant',
                        content: response
                    }
                );


                return response;
            }


            const faculty =
                facultyResult.faculty;


            // ---------------------------------------------
            // CHECK FACULTY AVAILABILITY
            // ---------------------------------------------

            if (
                faculty.status !==
                'Available'
            ) {

                const response =
                    `**${faculty.name}** is currently **${faculty.status}** and is not available right now.`;


                addToConversation(
                    studentId,
                    {
                        role: 'user',
                        content: userMessage
                    }
                );


                addToConversation(
                    studentId,
                    {
                        role: 'assistant',
                        content: response
                    }
                );


                return response;
            }


            // ---------------------------------------------
            // CHECK STUDENT QUEUE
            // ---------------------------------------------

            const currentQueue =
                await getMyQueue(
                    studentId
                );


            if (
                currentQueue &&
                currentQueue.hasQueue
            ) {

                const response =
                    `You are already in a queue for **${currentQueue.facultyName}** (Token **${currentQueue.token}**).

You need to leave your current queue before joining another faculty's queue.`;


                addToConversation(
                    studentId,
                    {
                        role: 'user',
                        content: userMessage
                    }
                );


                addToConversation(
                    studentId,
                    {
                        role: 'assistant',
                        content: response
                    }
                );


                return response;
            }


            // ---------------------------------------------
            // GET FACULTY QUEUE
            // ---------------------------------------------

            // ---------------------------------------------
// ASK FOR PURPOSE IF NOT PROVIDED
// ---------------------------------------------

if (
    appointmentType ===
    'OTHER'
) {

    setPendingPurpose(
        studentId,
        {
            facultyId:
                faculty.id,

            facultyName:
                faculty.name
        }
    );

    const response =
        `Sure! 😊 Before joining **${faculty.name}'s** queue, what is the purpose of your visit?

For example:
- Signature
- Project discussion
- Exam/syllabus query
- General doubt
- Document work`;

    addToConversation(
        studentId,
        {
            role: 'user',
            content: userMessage
        }
    );

    addToConversation(
        studentId,
        {
            role: 'assistant',
            content: response
        }
    );

    return response;
}
            const queueInfo =
                await getFacultyQueue(
                    faculty.id
                );


            const peopleAhead =
                Number(
                    queueInfo?.waitingCount || 0
                ) +
                Number(
                    queueInfo?.activeCount || 0
                );


            /*
            ------------------------------------------------
            IMPORTANT

            OLD:

            const estimatedWait =
                peopleAhead * 10;

            REMOVED.

            We do NOT invent a waiting time.

            ML prediction will be added later.
            ------------------------------------------------
            */

            const estimatedWait = null;


            // ---------------------------------------------
            // SAVE PENDING JOIN
            // ---------------------------------------------

            setPendingJoin(
                studentId,
                {
                    facultyId:
                        faculty.id,

                    facultyName:
                        faculty.name,

                    peopleAhead,

                    estimatedWait,

                    appointmentType
                }
            );


            // ---------------------------------------------
            // ASK CONFIRMATION
            // ---------------------------------------------

            const waitText =
                'Prediction not available yet';


            const response =
                `**${faculty.name}** is currently **Available**.

👥 **People ahead:** ${peopleAhead}

📋 **Purpose:** ${appointmentType}

⏱️ **Estimated wait:** ${waitText}

Would you like me to join you to **${faculty.name}'s** queue?`;


            addToConversation(
                studentId,
                {
                    role: 'user',
                    content: userMessage
                }
            );


            addToConversation(
                studentId,
                {
                    role: 'assistant',
                    content: response
                }
            );


            return response;
        }


        // =================================================
        // NORMAL CONVERSATION
        // =================================================

        const conversation =
            getConversation(
                studentId
            );


        // =================================================
        // ADD USER MESSAGE
        // =================================================

        addToConversation(
            studentId,
            {
                role: 'user',
                content: userMessage
            }
        );


        // =================================================
        // BUILD MESSAGES
        // =================================================

        const messages = [

            {
                role: 'system',
                content: systemPrompt
            },

            ...conversation
        ];


        // =================================================
        // FIRST GROQ REQUEST
        // =================================================

        const firstResponse =
            await groq.chat.completions.create({

                model:
                    'openai/gpt-oss-120b',

                messages,

                tools,

                tool_choice:
                    'auto',

                temperature:
                    0.2
            });


        const assistantMessage =
            firstResponse.choices[0].message;


        // =================================================
        // ADD ASSISTANT TOOL CALL
        // =================================================

        messages.push(
            assistantMessage
        );


        // =================================================
        // NO TOOL REQUIRED
        // =================================================

        if (
            !assistantMessage.tool_calls ||
            assistantMessage.tool_calls.length === 0
        ) {

            const response =
                assistantMessage.content ||
                'Sorry, I could not generate a response.';


            addToConversation(
                studentId,
                {
                    role: 'assistant',
                    content: response
                }
            );


            return response;
        }


        // =================================================
        // EXECUTE TOOLS
        // =================================================

        for (
            const toolCall
            of assistantMessage.tool_calls
        ) {

            const functionName =
                toolCall.function.name;


            let argumentsObject = {};


            // ---------------------------------------------
            // PARSE ARGUMENTS
            // ---------------------------------------------

            try {

                argumentsObject =
                    toolCall.function.arguments
                        ? JSON.parse(
                            toolCall.function.arguments
                        )
                        : {};

            } catch (error) {

                console.error(
                    'Tool argument parsing error:',
                    error
                );

                argumentsObject = {};
            }


            let toolResult;


            // ---------------------------------------------
            // AVAILABLE FACULTY
            // ---------------------------------------------

            if (
                functionName ===
                'get_available_faculty'
            ) {

                toolResult =
                    await getAvailableFaculty();

            }


            // ---------------------------------------------
            // MY QUEUE
            // ---------------------------------------------

            else if (
                functionName ===
                'get_my_queue'
            ) {

                toolResult =
                    await getMyQueue(
                        studentId
                    );
            }


            // ---------------------------------------------
            // FACULTY QUEUE
            // ---------------------------------------------

            else if (
                functionName ===
                'get_faculty_queue'
            ) {

                const facultyId =
                    Number(
                        argumentsObject.facultyId
                    );


                if (!facultyId) {

                    toolResult = {

                        error:
                            'Faculty ID is required.'
                    };

                } else {

                    toolResult =
                        await getFacultyQueue(
                            facultyId
                        );
                }
            }


            // ---------------------------------------------
            // QUEUE HISTORY
            // ---------------------------------------------

            else if (
                functionName ===
                'get_queue_history'
            ) {

                toolResult =
                    await getQueueHistory(
                        studentId
                    );
            }


            // ---------------------------------------------
            // BEST FACULTY
            // ---------------------------------------------

            else if (
                functionName ===
                'find_best_faculty'
            ) {

                toolResult =
                    await findBestFaculty();
            }


            // ---------------------------------------------
            // UNKNOWN TOOL
            // ---------------------------------------------

            else {

                toolResult = {

                    error:
                        `Unknown tool: ${functionName}`
                };
            }


            // ---------------------------------------------
            // SEND TOOL RESULT TO LLM
            // ---------------------------------------------

            messages.push({

                role: 'tool',

                tool_call_id:
                    toolCall.id,

                content:
                    JSON.stringify(
                        toolResult
                    )
            });
        }


        // =================================================
        // FINAL GROQ REQUEST
        // =================================================

        const finalResponse =
            await groq.chat.completions.create({

                model:
                    'openai/gpt-oss-120b',

                messages,

                temperature:
                    0.2
            });


        const finalMessage =
            finalResponse
                .choices[0]
                .message
                .content;


        // =================================================
        // SAVE FINAL RESPONSE
        // =================================================

        addToConversation(
            studentId,
            {
                role: 'assistant',
                content:
                    finalMessage
            }
        );


        return finalMessage;


    } catch (error) {

        console.error(
            'Assistant error:',
            error
        );

        throw error;
    }
};


// ========================================================
// EXPORT
// ========================================================

module.exports = {

    groq,

    tools,

    runAssistant,

    clearConversation
};
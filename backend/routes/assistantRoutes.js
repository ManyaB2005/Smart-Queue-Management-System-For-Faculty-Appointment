const express = require('express');

const {
    runAssistant
} = require('../agents/assistantAgent');

const router = express.Router();


/*
========================================================
POST /api/assistant/chat
========================================================

Authenticated student sends:

{
    "message": "Who is available right now?"
}

The student's ID comes from req.user.id,
NOT from the frontend.

Socket.IO instance comes from:

req.app.get('socketio')
========================================================
*/

router.post('/chat', async (req, res) => {

    try {

        // =================================================
        // GET AUTHENTICATED STUDENT
        // =================================================

        const studentId =
            req.user.id;


        // =================================================
        // GET SOCKET.IO INSTANCE
        // =================================================

        const io =
            req.app.get('socketio');


        // =================================================
        // GET MESSAGE
        // =================================================

        const { message } =
            req.body;


        // =================================================
        // VALIDATE MESSAGE
        // =================================================

        if (
            !message ||
            typeof message !== 'string' ||
            !message.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Please provide a valid message.'

            });

        }


        // =================================================
        // RUN AI AGENT
        // =================================================

        const response =
            await runAssistant(
                message.trim(),
                studentId,
                io
            );


        // =================================================
        // SEND RESPONSE
        // =================================================

        return res.status(200).json({

            success: true,

            response

        });


    } catch (error) {

        console.error(
            'Assistant route error:',
            error
        );


        return res.status(500).json({

            success: false,

            message:
                'Unable to process your request right now.'

        });

    }

});


module.exports = router;
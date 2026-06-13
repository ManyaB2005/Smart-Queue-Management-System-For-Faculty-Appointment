const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function resetMultiplePasswords() {
    try {
        // Connect to your DB
        const pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '645767', // Your DB password
            database: 'smart_queue_db'
        });

        // The list of emails from your database screenshot
        const emailsToUpdate = [
            'monikahp005@gmail.com',
            'prof@test.com',
            'class@gmail.com',
            'faculty@gmail.com'
        ];
        
        const newPassword = 'password123'; // The universal testing password

        console.log("Starting mass password upgrade...");

        // Generate the new secure hash just once to save time
        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(newPassword, salt);

        // Loop through each email and update them in the database
        for (let email of emailsToUpdate) {
            const [result] = await pool.query(
                `UPDATE Users SET password_hash = ? WHERE email = ?`,
                [newHashedPassword, email]
            );

            if (result.affectedRows > 0) {
                console.log(`✅ Success: Password for ${email} reset to '${newPassword}'`);
            } else {
                console.log(`⚠️ Warning: Could not find ${email} in database.`);
            }
        }

        console.log("All accounts have been upgraded securely!");
        process.exit();
    } catch (error) {
        console.error("Script error:", error);
        process.exit(1);
    }
}

resetMultiplePasswords();
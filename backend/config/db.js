const mysql = require('mysql2/promise');

require('dotenv').config();

const pool = mysql.createPool({

    host: process.env.DB_HOST,

    port: process.env.DB_PORT || 3306,

    user: process.env.DB_USER,

    password: process.env.DB_PASSWORD,

    database: process.env.DB_NAME,

    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0
});


// =====================================================
// TEST DATABASE CONNECTION
// =====================================================

pool.getConnection()

    .then(conn => {

        console.log(
            '✅ MySQL Database Connected Successfully'
        );

        conn.release();

    })

    .catch(err => {

        console.error(
            '❌ Database Connection Failed:',
            err.message
        );

    });


module.exports = pool;
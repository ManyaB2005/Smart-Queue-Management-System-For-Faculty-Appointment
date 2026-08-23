const express = require('express');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { role, name, email, password, phone, usn } = req.body;

        if (role === 'student' && (!usn || usn.trim() === '')) {
            return res.status(400).json({ message: "Students must provide a USN." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const finalUsn = role === 'student' ? usn : null;

        const [result] = await db.query(
            `INSERT INTO Users (role, name, email, password_hash, phone, usn) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [role, name, email, hashedPassword, phone || null, finalUsn]
        );

        const token = jwt.sign({ id: result.insertId, role, name }, process.env.JWT_SECRET || 'super_secret_key', { expiresIn: '8h' });
        res.status(201).json({ message: "Registration successful!", token });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Email or USN already exists." });
        res.status(500).json({ message: "Server error during registration." });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const [users] = await db.query('SELECT * FROM Users WHERE email = ? AND role = ?', [email, role]);
        
        if (users.length === 0) return res.status(401).json({ message: "Invalid credentials." });

        const isMatch = await bcrypt.compare(password, users[0].password_hash);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials." });

        const token = jwt.sign({ id: users[0].id, role: users[0].role, name: users[0].name }, process.env.JWT_SECRET || 'super_secret_key', { expiresIn: '8h' });
        res.status(200).json({ message: "Login successful!", token, user: { id: users[0].id, name: users[0].name, role: users[0].role } });

    } catch (error) {
        res.status(500).json({ message: "Server error during login." });
    }
});

module.exports = router;
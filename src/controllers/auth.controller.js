const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
    try {
        const { first_name, last_name, email, password, private_or_agency } = req.body;

        const existing = await db('users_seller').where({ email }).first();
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [id] = await db('users_seller').insert({
            first_name,
            last_name,
            email: email.toLowerCase(),
            password: hashedPassword,
            private_or_agency: private_or_agency || 'private'
        });

        const token = jwt.sign({ id, email, first_name }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ success: true, message: 'User registered successfully', token, user: { id, email, first_name, last_name } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await db('users_seller').where({ email: email.toLowerCase() }).first();
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.status === 0) {
            return res.status(403).json({ success: false, message: 'Account suspended' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, first_name: user.first_name }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                private_or_agency: user.private_or_agency
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await db('users_seller').where({ id: req.user.id }).first();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        delete user.password;
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    register,
    login,
    getMe
};

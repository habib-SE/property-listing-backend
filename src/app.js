require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const db = require('./config/db');

const app = express();

// Automatic migration for 'phone' column
db.schema.hasColumn('users_seller', 'phone').then(exists => {
    if (!exists) {
        return db.schema.table('users_seller', table => {
            table.string('phone', 50).nullable().after('email');
        }).then(() => console.log('Migration: Added phone column to users_seller'));
    }
}).catch(err => console.error('Migration error:', err));

// Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
// Serve static files with CORS headers
app.use('/uploads', express.static('uploads', {
    setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
    }
}));

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

const knex = require('knex');
const knexfile = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';
const configOptions = knexfile[env];

const db = knex(configOptions);

// Test database connection on initialization
db.raw('SELECT 1')
    .then(() => {
        console.log('Successfully connected to the database.');
    })
    .catch((err) => {
        console.error('Failed to connect to the database:', err.message);
    });

module.exports = db;

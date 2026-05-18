const mysql = require("mysql2/promise");
require("dotenv").config();

// Create a MySQL connection pool.
// A pool is better than creating a new connection every time.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
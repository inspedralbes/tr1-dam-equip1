// Pool de connexions mysql2 (un sol pool per a tot el servei).
const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

module.exports = pool;

import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "howmuch",
  password: process.env.DB_PASSWORD || "howmuchpassword",
  database: process.env.DB_NAME || "howmuch",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

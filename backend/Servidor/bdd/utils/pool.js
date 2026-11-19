const mysql = require("mysql2/promise");
const { dbConfig } = require("../config/database");

// UN sol pool per a tot el servidor
const pool = mysql.createPool({
  ...dbConfig,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  decimalNumbers: true, // els SUM() de MariaDB són DECIMAL: així arriben com a número i no com a text
});

// Per a consultes soltes (sense transacció)
async function consulta(sql, params = []) {
  const [files] = await pool.execute(sql, params);
  return files;
}

// Per a les transaccions: necessiten SEMPRE la mateixa connexió
// (qui la demana l'ha de tornar amb connection.release())
async function obtenirConnexio() {
  return pool.getConnection();
}

async function tancarPool() {
  await pool.end();
}

module.exports = { consulta, obtenirConnexio, tancarPool };

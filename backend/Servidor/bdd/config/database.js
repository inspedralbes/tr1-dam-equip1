// Dades de connexió a MariaDB. Surten de les variables d'entorn:
//  - en local, del fitxer .env (npm run dev)
//  - a Docker, del docker-compose.yml (DB_HOST = nom del servei)
const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "nodeuser",
  password: process.env.DB_PASSWORD || "nodepass",
  database: process.env.DB_NAME || "howmuch_live",
  timezone: "Z",
  dateStrings: ["DATE"],
};

module.exports = { dbConfig };

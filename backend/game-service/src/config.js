// Tota la configuració surt de variables d'entorn (docker-compose.yml).
// Els valors per defecte serveixen per executar-lo en local sense Docker.
module.exports = {
  port: Number(process.env.PORT) || 3001,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'nodeuser',
    password: process.env.DB_PASSWORD || 'nodepass',
    database: process.env.DB_NAME || 'howmuch_live',
  },
  game: {
    defaultRounds: Number(process.env.DEFAULT_ROUNDS) || 5,
    maxPlayersPerRoom: Number(process.env.MAX_PLAYERS) || 12,
  },
  heartbeatMs: 30000,
};

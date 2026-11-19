// Errors del joc que es poden ensenyar al client.
// code serveix perquè el client sàpiga quin error és sense llegir el text.
class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Converteix els errors de mysql2 i Sequelize en AppError amb un missatge clar.
// Si no el coneixem, el tornem tal qual (ja el veurem al log).
function traduirError(error) {
  if (error instanceof AppError) return error;

  // ---- mysql2 (error.code) ----
  if (error.code === "ER_DUP_ENTRY") {
    const msg = error.message || "";
    if (msg.includes("uq_respostes_ronda_participant"))
      return new AppError("ALREADY_ANSWERED", "Ja has respost aquesta ronda");
    if (msg.includes("uq_participants_partida_nom"))
      return new AppError("NAME_TAKEN", "Ja hi ha algú amb aquest nom a la sala");
    if (msg.includes("uq_partides_codi"))
      return new AppError("CODE_TAKEN", "Aquest codi de sala ja existeix");
    if (msg.includes("uq_rondes_partida_pregunta"))
      return new AppError("QUESTION_REPEATED", "Aquesta pregunta ja ha sortit a la partida");
    return new AppError("DUPLICATE", "Aquest element ja existeix");
  }
  if (error.code === "ER_NO_REFERENCED_ROW_2")
    return new AppError("NOT_FOUND", "Fa referència a una cosa que no existeix");
  if (error.code === "ER_ROW_IS_REFERENCED_2")
    return new AppError("HAS_DEPENDENCIES", "No es pot esborrar: hi ha dades que en depenen");
  if (error.errno === 4025) // CHECK no complert (MariaDB)
    return new AppError("INVALID_DATA", "Les dades no compleixen les restriccions");
  if (error.code === "ER_BAD_NULL_ERROR" || error.code === "ER_NO_DEFAULT_FOR_FIELD")
    return new AppError("INVALID_DATA", "Falta algun camp obligatori");
  if (error.code === "ECONNREFUSED" || error.code === "ER_ACCESS_DENIED_ERROR")
    return new AppError("DB_UNAVAILABLE", "No es pot connectar amb la base de dades");

  // ---- Sequelize (tipus d'error) ----
  if (error.name === "SequelizeUniqueConstraintError")
    return new AppError("DUPLICATE", "Ja existeix un element amb aquest nom o enunciat");
  if (error.name === "SequelizeValidationError") {
    const detalls = error.errors.map((e) => e.message).join(", ");
    return new AppError("INVALID_DATA", "Dades no vàlides: " + detalls);
  }
  if (error.name === "SequelizeForeignKeyConstraintError")
    return new AppError("HAS_DEPENDENCIES", "No es pot esborrar: hi ha dades que en depenen");
  if (error.name === "SequelizeConnectionRefusedError" || error.name === "SequelizeConnectionError")
    return new AppError("DB_UNAVAILABLE", "No es pot connectar amb la base de dades");

  return error;
}

// Per als logs del servidor (com a Ex1/Ex2): què ha passat i què pots fer
function explicarError(error) {
  switch (error.code) {
    case "ECONNREFUSED":
    case "DB_UNAVAILABLE":
      return { titol: "MariaDB no respon", solucio: "Engega el contenidor (docker compose up -d mariadb) i revisa DB_HOST i DB_PORT" };
    case "ER_ACCESS_DENIED_ERROR":
      return { titol: "Usuari o contrasenya incorrectes", solucio: "Revisa DB_USER i DB_PASSWORD" };
    case "ER_BAD_DB_ERROR":
      return { titol: "La base de dades no existeix", solucio: "Carrega database/schema.sql (o fes docker compose down -v i torna a aixecar)" };
    case "ER_NO_SUCH_TABLE":
      return { titol: "Falta alguna taula", solucio: "Torna a carregar database/schema.sql" };
    case "ER_DUP_ENTRY":
      return { titol: "Valor repetit", solucio: "Hi ha un UNIQUE que no deixa repetir-lo" };
    default:
      return { titol: error.message, solucio: "Mira el log complet de l'error" };
  }
}

module.exports = { AppError, traduirError, explicarError };

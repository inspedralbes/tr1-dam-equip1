// Exporta una partida acabada a CSV (es desa a exports/partida-<codi>.csv).
//   npm run exportar -- 10001
const fs = require("fs").promises;
const path = require("path");
const { exportarPartidaCsv } = require("../data/fitxers");
const { sequelize } = require("../data/sequelize");
const { tancarPool } = require("../utils/pool");
const { explicarError } = require("../utils/errors");

async function main() {
  const codi = process.argv[2];
  if (!codi) {
    console.log("Ús: npm run exportar -- <codi de la partida>");
    return;
  }

  try {
    const csv = await exportarPartidaCsv(codi);
    const carpeta = path.join(__dirname, "..", "exports");
    await fs.mkdir(carpeta, { recursive: true });
    const fitxer = path.join(carpeta, `partida-${codi}.csv`);
    await fs.writeFile(fitxer, csv, "utf8");
    console.log(`CSV desat a ${fitxer}`);
  } catch (error) {
    const { titol, solucio } = explicarError(error);
    console.error(`Error: ${titol}\n  ${solucio}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    await tancarPool();
  }
}

main();

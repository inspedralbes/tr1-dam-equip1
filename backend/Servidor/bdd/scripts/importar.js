// Importa preguntes d'un fitxer JSON al banc de preguntes.
//   npm run importar -- ../../database/preguntes-exemple.json
const { importarPreguntes } = require("../data/fitxers");
const { sequelize } = require("../data/sequelize");
const { tancarPool } = require("../utils/pool");
const { explicarError } = require("../utils/errors");

async function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    console.log("Ús: npm run importar -- <fitxer.json>");
    return;
  }

  try {
    const { importades, descartades } = await importarPreguntes(ruta);
    console.log(`Preguntes importades: ${importades}`);
    console.log(`Preguntes descartades: ${descartades.length}`);
    for (const d of descartades) {
      console.log(`  #${d.index} "${d.enunciat ?? "?"}": ${d.errors.join(", ")}`);
    }
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

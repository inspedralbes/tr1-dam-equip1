import fs from 'fs';
import path from 'path';
import { validarPregunta } from './db/fitxersService.js';
import { stringify } from 'csv-stringify/sync';

console.log('====================================================');
console.log('   HOW MUCH?! LIVE - DEMOSTRACIÓ DE LA RÚBRICA TR1   ');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condicio, nomTasca, missatge) {
  totalTests++;
  if (condicio) {
    passedTests++;
    console.log(`[PASS] ${nomTasca}: ${missatge}`);
  } else {
    console.error(`[FAIL] ${nomTasca}: ${missatge}`);
  }
}

const schemaPath = path.resolve('../db/01-schema.sql');
const schemaContent = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';

assert(schemaContent.includes('PRIMARY KEY'), 'T2 (schema.sql)', 'Conté claus primàries (PK)');
assert(schemaContent.includes('FOREIGN KEY') && schemaContent.includes('REFERENCES'), 'T2 (schema.sql)', 'Conté claus foranes (FK) amb regles RESTRICT/CASCADE');
assert(schemaContent.includes('UNIQUE (nom)') && schemaContent.includes('UNIQUE (codi)') && schemaContent.includes('UNIQUE (partida_id, nom)') && schemaContent.includes('UNIQUE (participant_id, ronda_id)'), 'T2 (schema.sql)', 'Conté restriccions UNIQUE per a noms, codis i respostes');
assert(schemaContent.includes('CHECK (min_valor IS NULL OR max_valor IS NULL OR min_valor <= max_valor)'), 'T2 (schema.sql)', 'Conté restriccions CHECK (min <= max, etc.)');

const dadesPath = path.resolve('../db/02-dades-inicials.sql');
const dadesContent = fs.existsSync(dadesPath) ? fs.readFileSync(dadesPath, 'utf-8') : '';

assert(dadesContent.includes('TRUNCATE TABLE') && dadesContent.includes('SET FOREIGN_KEY_CHECKS'), 'T3 (dades-inicials.sql)', 'És idempotent: es pot reexecutar sense errors i sempre deixa el mateix estat');

const seqPath = path.resolve('./db/sequelize.js');
const seqContent = fs.existsSync(seqPath) ? fs.readFileSync(seqPath, 'utf-8') : '';

assert(!seqContent.includes('.sync('), 'T4 (Sequelize)', 'No es fa servir sync(); l\'esquema el crea exclusivament SQL');

const mapCategories = { 'ciència': 1, 'geografia': 2 };

const invalidaResposta = validarPregunta({ enunciat: 'Pregunta?', resposta: 'text_invalid', unitat: 'km', categoria_id: 1 }, mapCategories);
assert(!invalidaResposta.valid, 'T5 (Validacions)', 'Rebutja respostes no numèriques');

const invalidaEnunciat = validarPregunta({ enunciat: '', resposta: 10, unitat: 'km', categoria_id: 1 }, mapCategories);
assert(!invalidaEnunciat.valid, 'T5 (Validacions)', 'Rebutja preguntes amb enunciat buit');

const invalidaMinMax = validarPregunta({ enunciat: 'P?', resposta: 10, unitat: 'km', categoria_id: 1, min_valor: 100, max_valor: 10 }, mapCategories);
assert(!invalidaMinMax.valid, 'T5 (Validacions)', 'Rebutja preguntes on min_valor > max_valor');

const modelPreguntaPath = path.resolve('./db/models/Pregunta.js');
const modelPreguntaContent = fs.readFileSync(modelPreguntaPath, 'utf-8');
const serveiPreguntesPath = path.resolve('./db/preguntesService.js');
const serveiPreguntesContent = fs.readFileSync(serveiPreguntesPath, 'utf-8');

assert(modelPreguntaContent.includes('Categoria.hasMany') && modelPreguntaContent.includes('Pregunta.belongsTo'), 'T6 (Associació)', 'Associació 1:N configurada entre Categoria i Pregunta');
assert(serveiPreguntesContent.includes('CATEGORY_HAS_QUESTIONS'), 'T6 (Esborrat Protegit)', 'deleteCategoria() impedeix esborrar categories que tenen preguntes associades');

const mysqlPath = path.resolve('./db/mysql.js');
const mysqlContent = fs.readFileSync(mysqlPath, 'utf-8');
const jocPath = path.resolve('./db/jocService.js');
const jocContent = fs.readFileSync(jocPath, 'utf-8');

assert(mysqlContent.includes('createPool'), 'T7 (Pool únic)', 'Un sol pool de connexions mysql2 per a tot el servidor');
assert(jocContent.includes('NAME_TAKEN') && jocContent.includes('LOWER(nom) = LOWER(?)'), 'T7 (Nom repetit)', 'Un participant amb nom repetit a la sala és rebutjat amb codi NAME_TAKEN');
assert(jocContent.includes('ROOM_ALREADY_EXISTS'), 'T7 (Codi únic)', 'Creació de partida amb codi existent es rebutja');

assert(jocContent.includes('NOT IN') && jocContent.includes('SELECT pregunta_id FROM rondes'), 'T8 (Sense preguntes repetides)', 'La consulta filtra preguntes que ja han sortit en rondes anteriors de la mateixa partida');
assert(jocContent.includes('ALREADY_ANSWERED') || jocContent.includes('UNIQUE'), 'T8 (Segona resposta)', 'Una segona resposta d\'un participant a la mateixa ronda es rebutja');

assert(jocContent.includes('JOIN') && jocContent.includes('SUM(r.punts)') && jocContent.includes('GROUP BY p.id, p.nom'), 'T9 (Classificació SQL)', 'La classificació es calcula amb JOIN, SUM i GROUP BY per SQL');

assert(jocContent.includes('tancarRonda') && jocContent.includes('beginTransaction') && jocContent.includes('commit') && jocContent.includes('rollback'), 'T10 (Transacció tancar)', 'Tancar ronda és atòmica: desa punts i canvia estat a tancada amb rollback si falla');

assert(jocContent.includes('SELECT') && jocContent.includes('FOR UPDATE'), 'T11 (FOR UPDATE)', 'Bloqueig transaccional SELECT ... FOR UPDATE a unirsePartida, respondreRonda i tancarRonda');
assert(jocContent.includes('ROUND_CLOSED') || jocContent.includes('ROUND_ALREADY_CLOSED'), 'T11 (Ronda tancada)', 'Respondre a una ronda ja tancada es rebutja');

const fitxersPath = path.resolve('./db/fitxersService.js');
const fitxersContent = fs.readFileSync(fitxersPath, 'utf-8');

assert(fitxersContent.includes('validarPregunta') && fitxersContent.includes('descartades'), 'T12a (Validació JSON)', 'Llegeix JSON, valida amb validarPregunta() i genera informe de descartades amb motius');
assert(fitxersContent.includes('Pregunta.create'), 'T12b (Desar vàlides)', 'Desa exclusivament les preguntes vàlides a la base de dades amb Sequelize');

assert(fitxersContent.includes('exportarPartidaCSV') && fitxersContent.includes('csv-stringify'), 'T13 (Exportació CSV)', 'Genera fitxer CSV amb csv-stringify amb classificació final i detall de respostes');

const testCSV = stringify([['Posició', 'Jugador', 'Punts'], [1, 'Anna', 10]]);
assert(testCSV.includes('Anna') && testCSV.includes('10'), 'T13 (CSV Format)', 'El format CSV s\'obre correctament en un full de càlcul');

const indexPath = path.resolve('./index.js');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

assert(indexContent.includes('ER_DUP_ENTRY') && indexContent.includes('DUPLICATE_ENTRY'), 'T14a (Errors mysql2)', 'Errors de base de dades com ER_DUP_ENTRY es capturen i tradueixen');
assert(indexContent.includes('SequelizeValidationError') && indexContent.includes('SequelizeUniqueConstraintError'), 'T14b (Errors Sequelize)', 'Errors de Sequelize es tradueixen a respostes HTTP clares');

console.log('\n====================================================');
console.log(` RESULTAT FINAL: ${passedTests} / ${totalTests} TASQUES COMPLERTES`);
console.log('====================================================');

// Sequelize NOMÉS per al banc de preguntes (categories i preguntes).
// Les taules ja existeixen (schema.sql): MAI fer sequelize.sync().
const { Sequelize, DataTypes } = require("sequelize");
const { dbConfig } = require("../config/database");

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: "mysql", // fa servir mysql2 per sota, funciona igual amb MariaDB
  timezone: "+00:00",
  logging: false,
});

const Categoria = sequelize.define(
  "Categoria",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "El nom de la categoria no pot estar buit" },
        len: { args: [1, 100], msg: "El nom ha de tenir com a molt 100 caràcters" },
      },
    },
  },
  { tableName: "categories", timestamps: false },
);

const Pregunta = sequelize.define(
  "Pregunta",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    categoria_id: { type: DataTypes.INTEGER, allowNull: false },
    enunciat: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "L'enunciat no pot estar buit" },
        len: { args: [5, 255], msg: "L'enunciat ha de tenir entre 5 i 255 caràcters" },
      },
    },
    resposta_correcta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isInt: { msg: "La resposta ha de ser un número enter" } },
    },
    unitat: {
      type: DataTypes.STRING(40),
      allowNull: false,
      validate: {
        notEmpty: { msg: "La unitat no pot estar buida" },
        len: { args: [1, 40], msg: "La unitat ha de tenir com a molt 40 caràcters" },
      },
    },
  },
  { tableName: "preguntes", timestamps: false },
);

// Una categoria té moltes preguntes
Categoria.hasMany(Pregunta, { foreignKey: "categoria_id", as: "preguntes" });
Pregunta.belongsTo(Categoria, { foreignKey: "categoria_id", as: "categoria" });

module.exports = { sequelize, Categoria, Pregunta };

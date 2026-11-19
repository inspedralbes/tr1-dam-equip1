import { DataTypes } from "sequelize";
import { sequelize } from "../sequelize.js";
import { Categoria } from "./Categoria.js";

export const Pregunta = sequelize.define(
  "preguntes",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "categories",
        key: "id",
      },
      validate: {
        notNull: { msg: "La categoria és obligatòria" },
      },
    },
    enunciat: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "L'enunciat no pot estar buit" },
      },
    },
    resposta: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      validate: {
        isNumeric: { msg: "La resposta ha de ser numèrica" },
      },
    },
    unitat: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: "La unitat no pot estar buida" },
      },
    },
    min_valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    max_valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
  },
  {
    tableName: "preguntes",
    timestamps: false,
  },
);

Categoria.hasMany(Pregunta, { foreignKey: "categoria_id", as: "preguntes" });
Pregunta.belongsTo(Categoria, { foreignKey: "categoria_id", as: "categoria" });

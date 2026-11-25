import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';

export const Categoria = sequelize.define('categories', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'El nom de la categoria no pot estar buit' },
    },
  },
}, {
  tableName: 'categories',
  timestamps: false,
});

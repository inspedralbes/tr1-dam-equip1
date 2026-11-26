import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  process.env.DB_NAME || "howmuch",
  process.env.DB_USER || "howmuch",
  process.env.DB_PASSWORD || "howmuchpassword",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    dialect: "mysql",
    logging: false,
    dialectOptions: { connectTimeout: 2000 },
    define: {
      timestamps: false,
      freezeTableName: true,
    },
  },
);

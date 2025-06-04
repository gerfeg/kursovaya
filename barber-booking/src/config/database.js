const { Sequelize } = require('sequelize');

// Создаём новый экземпляр Sequelize для подключения к базе данных:
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,   // адрес сервера БД
    port: process.env.DB_PORT,   // порт для подключения к БД
    dialect: 'mysql',            // используемый диалект
    logging: false               // отключаем логирование SQL-запросов в консоль
  }
);

// Экспортируем настроенный экземпляр Sequelize, чтобы его можно было импортировать в других модулях
module.exports = sequelize;

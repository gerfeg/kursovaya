const { DataTypes } = require('sequelize');      // Импортируем типы данных из Sequelize
const sequelize = require('../config/database'); // Импортируем настроенный экземпляр Sequelize

// Определяем модель User (Пользователь)
const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,     // Поле для имени пользователя (строка)
    allowNull: false,           // Обязательно для заполнения
  },
  surname: {
    type: DataTypes.STRING,     // Поле для фамилии пользователя (строка)
    allowNull: true             // Необязательно (может быть пустым)
  },
  email: {
    type: DataTypes.STRING,     // Поле для email пользователя (строка)
    unique: true,               // Значение должно быть уникальным (двух одинаковых email быть не может)
    allowNull: false,           // Обязательно для заполнения
  },
  password_hash: {
    type: DataTypes.STRING,     // Поле для хранения захешированного пароля (строка)
    allowNull: false,           // Обязательно для заполнения
  },
  role: {
    type: DataTypes.ENUM('user', 'manager', 'admin'), // Поле для роли пользователя (ограниченный набор значений)
    allowNull: false,           // Обязательно для заполнения
    defaultValue: 'user',       // По умолчанию роль – 'user'
  }
}, {
  tableName: 'users'            // Явно указываем имя таблицы в базе данных: "users"
});

// Экспорт модели User для использования в других частях приложения
module.exports = User;

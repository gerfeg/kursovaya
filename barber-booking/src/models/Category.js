const { DataTypes } = require('sequelize');      // Импортируем типы данных из Sequelize
const sequelize = require('../config/database'); // Импортируем настроенный экземпляр Sequelize

// Определяем модель Category (Категория услуг)
const Category = sequelize.define('Category', {
  name: { 
    type: DataTypes.STRING,    // Название категории (строковое поле)
    allowNull: false,          // Обязательно для заполнения
    unique: true               // Должно быть уникальным (две категории с одинаковым именем невозможны)
  },
  description: { 
    type: DataTypes.TEXT       // Описание категории (текстовое поле, необязательное)
  }
}, {
  tableName: 'categories'      // Явно указываем имя таблицы в базе данных: "categories"
});

// Экспорт модели Category для использования в других частях приложения
module.exports = Category;

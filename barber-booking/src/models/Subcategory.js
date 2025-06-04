const { DataTypes } = require('sequelize');      // Импортируем типы данных из Sequelize
const sequelize = require('../config/database'); // Импортируем настроенный экземпляр Sequelize
const Category = require('./Category');          // Импортируем модель Category для настройки связи

// Определяем модель Subcategory (Подкатегория услуг)
const Subcategory = sequelize.define('Subcategory', {
  name: { 
    type: DataTypes.STRING,    // Название подкатегории (строковое поле)
    allowNull: false           // Поле обязательно для заполнения
  },
  description: { 
    type: DataTypes.TEXT       // Описание подкатегории (текстовое поле, необязательное)
  }
}, {
  tableName: 'subcategories'   // Явно указываем имя таблицы в базе данных: "subcategories"
});

// Настраиваем связь между моделями:
// Одна категория может содержать множество подкатегорий.
// При удалении категории все связанные подкатегории удаляются (CASCADE).
Category.hasMany(Subcategory, { 
  foreignKey: 'category_id',   // В таблице subcategories будет колонка category_id
  onDelete: 'CASCADE'          // При удалении категории удаляются все её подкатегории
});
// Каждая подкатегория принадлежит одной категории через поле category_id.
Subcategory.belongsTo(Category, { 
  foreignKey: 'category_id'    // Колонка category_id связывает Subcategory с Category
});

// Экспорт модели Subcategory для использования в других частях приложения
module.exports = Subcategory;

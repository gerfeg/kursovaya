const { DataTypes } = require('sequelize');      // Импортируем типы данных из Sequelize
const sequelize = require('../config/database'); // Импортируем настроенный экземпляр Sequelize
const Subcategory = require('./Subcategory');    // Импортируем модель Subcategory для связи

// Определяем модель Service (Услуга)
const Service = sequelize.define('Service', {
  name: { 
    type: DataTypes.STRING,    // Название услуги (строковое поле)
    allowNull: false           // Поле обязательно для заполнения
  },
  duration_min: { 
    type: DataTypes.INTEGER,   // Продолжительность услуги в минутах (целочисленное поле)
    allowNull: false           // Поле обязательно для заполнения
  },
  price: { 
    type: DataTypes.DECIMAL(10, 2), // Стоимость услуги, формат DECIMAL (до 10 цифр, 2 после запятой)
    allowNull: false           // Поле обязательно для заполнения
  },
  description: { 
    type: DataTypes.TEXT       // Описание услуги (текстовое поле, необязательное)
  }
}, {
  tableName: 'services'       // Явно указываем имя таблицы в базе данных: "services"
});

// Настраиваем связь между моделями:
// Одна подкатегория может содержать множество услуг. 
// При удалении подкатегории все связанные услуги также удаляются (CASCADE).
Subcategory.hasMany(Service, { 
  foreignKey: 'subcategory_id', // В таблице services будет колонка subcategory_id
  onDelete: 'CASCADE'           // При удалении подкатегории удаляются все её услуги
});
// Каждая услуга связана с одной подкатегорией через поле subcategory_id.
Service.belongsTo(Subcategory, { 
  foreignKey: 'subcategory_id'  // Колонка subcategory_id связывает Service с Subcategory
});

// Экспорт модели Service для использования в других частях приложения
module.exports = Service;

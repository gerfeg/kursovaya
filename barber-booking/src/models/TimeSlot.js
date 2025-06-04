const { DataTypes } = require('sequelize');      // Импортируем типы данных из Sequelize для описания полей модели
const sequelize = require('../config/database'); // Импортируем настроенный экземпляр Sequelize
const Service = require('./Service');            // Импортируем модель Service для настройки связи

// Определяем модель TimeSlot (Слоты времени для записи)
const TimeSlot = sequelize.define('TimeSlot', {
  date: {
    type: DataTypes.DATEONLY,    // Дата слота (только дата, формат YYYY-MM-DD)
    allowNull: false             // Обязательно для заполнения
  },
  time: {
    type: DataTypes.TIME,        // Время слота (только время, формат HH:MM:SS)
    allowNull: false             // Обязательно для заполнения
  },
  is_available: {
    type: DataTypes.BOOLEAN,     // Флаг доступности слота (true — свободен, false — занят или закрыт)
    defaultValue: true           // По умолчанию слот доступен
  },
  closed_by_manager: {
    type: DataTypes.BOOLEAN,     // Флаг, указывающий, закрыт ли слот менеджером
    defaultValue: false          // По умолчанию менеджер не закрывал слот
  },
  closed_reason: {
    type: DataTypes.STRING,      // Причина закрытия слота (строковое поле)
    allowNull: true              // Необязательно, остается NULL, если слот не закрывался
  }
}, {
  tableName: 'time_slots'        // Явно указываем имя таблицы в базе данных: "time_slots"
});

// Настраиваем связь между Service и TimeSlot:
// Одна услуга может иметь множество временных слотов.
// При удалении услуги все связанные слоты удаляются (CASCADE).
Service.hasMany(TimeSlot, {
  foreignKey: 'service_id',      // В таблице time_slots будет колонка service_id
  onDelete: 'CASCADE'            // При удалении услуги удаляются все её слоты
});
// Каждый слот принадлежит одной услуге через поле service_id.
TimeSlot.belongsTo(Service, { 
  foreignKey: 'service_id'       // Колонка service_id связывает TimeSlot с Service
});

// Экспорт модели TimeSlot для использования в других частях приложения
module.exports = TimeSlot;

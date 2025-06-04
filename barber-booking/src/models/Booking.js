const { DataTypes } = require('sequelize');          // Импортируем типы данных из Sequelize
const sequelize = require('../config/database');     // Импортируем настроенный экземпляр Sequelize
const User = require('./User');                       // Импортируем модель User для связи
const Service = require('./Service');                 // Импортируем модель Service для связи

// Определяем модель Booking (Бронирование)
const Booking = sequelize.define('Booking', {
  date: { 
    type: DataTypes.DATEONLY,   // Поле date хранит только дату (YYYY-MM-DD)
    allowNull: false            // Обязательно для заполнения
  },
  time: { 
    type: DataTypes.TIME,       // Поле time хранит только время (HH:MM:SS)
    allowNull: false            // Обязательно для заполнения
  },
  status: { 
    type: DataTypes.ENUM(       // Используем ENUM для ограниченного набора значений
      'pending',                //   - pending: ожидает подтверждения
      'confirmed',              //   - confirmed: подтвержено
      'canceled',               //   - canceled: отменено
      'completed'               //   - completed: выполнено
    ), 
    defaultValue: 'pending'     // По умолчанию статус "pending"
  },
  canceled_at: { 
    type: DataTypes.DATE        // Если бронирование отменено, здесь будет храниться дата и время отмены
    // allowNull по умолчанию true, т.е. если не отменено, поле останется NULL
  }
}, {
  tableName: 'bookings'          // Явно указываем имя таблицы в базе данных
});

// Настраиваем связи между моделями

// Один пользователь может иметь много бронирований. 
// При удалении пользователя связанные бронирования будут удалены (CASCADE).
User.hasMany(Booking, { 
  foreignKey: 'user_id',        // В таблице bookings будет колонка user_id
  onDelete: 'CASCADE'           // При удалении пользователя удаляются все его бронирования
});
// Каждое бронирование принадлежит одному пользователю.
Booking.belongsTo(User, { 
  foreignKey: 'user_id'         // Колонка user_id связывает Booking с User
});

// Один сервис может быть у многих бронирований.
// При удалении сервиса связанные бронирования также удаляются (CASCADE).
Service.hasMany(Booking, { 
  foreignKey: 'service_id',     // В таблице bookings будет колонка service_id
  onDelete: 'CASCADE'           // При удалении сервиса удаляются все брони к этому сервису
});
// Каждое бронирование принадлежит одному сервису.
Booking.belongsTo(Service, { 
  foreignKey: 'service_id'      // Колонка service_id связывает Booking с Service
});

// Экспорт модели Booking, чтобы её можно было использовать в других частях приложения
module.exports = Booking;

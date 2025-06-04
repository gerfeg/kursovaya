const { DataTypes } = require('sequelize');      // Импортируем типы данных из Sequelize
const sequelize = require('../config/database'); // Импортируем настроенный экземпляр Sequelize
const Booking = require('./Booking');             // Импорт модели Booking для настройки связи
const User = require('./User');                   // Импорт модели User для настройки связи

// Определяем модель Review (Отзыв)
const Review = sequelize.define('Review', {
  comment: {
    type: DataTypes.STRING,    // Текст комментария (строковое поле)
    allowNull: true,           // Комментарий может быть пустым (необязательное поле)
  },
  rating: {
    type: DataTypes.INTEGER,   // Оценка (целочисленное поле)
    allowNull: false,          // Оценка обязательна для заполнения
  },
}, {
});

// Настраиваем связи между моделями

// Один объект Booking может иметь ровно один связанный отзыв.
// При удалении бронирования отзыв тоже удаляется (CASCADE).
Booking.hasOne(Review, {
  foreignKey: 'booking_id',    // В таблице reviews будет колонка booking_id
  onDelete: 'CASCADE'          // При удалении бронирования удаляется связанный отзыв
});
// Каждый отзыв принадлежит конкретному бронированию через поле booking_id.
Review.belongsTo(Booking, {
  foreignKey: 'booking_id'     // Колонка booking_id связывает Review с Booking
});

// Один пользователь может оставить много отзывов.
// При удалении пользователя его отзывы удаляются (CASCADE).
User.hasMany(Review, {
  foreignKey: 'user_id',       // В таблице reviews будет колонка user_id
  onDelete: 'CASCADE'          // При удалении пользователя удаляются все его отзывы
});
// Каждый отзыв принадлежит одному пользователю через поле user_id.
Review.belongsTo(User, {
  foreignKey: 'user_id'        // Колонка user_id связывает Review с User
});

// Экспорт модели Review для использования в других частях приложения
module.exports = Review;

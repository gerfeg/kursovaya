const express = require('express');                  // Импортируем Express для создания маршрутизатора
const router = express.Router();                     // Создаём новый экземпляр Router
const { Op } = require('sequelize');                 // Импортируем оператор Op для сложных запросов (если потребуется)

const User = require('../models/User');              // Модель пользователя
const Booking = require('../models/Booking');        // Модель бронирования
const Service = require('../models/Service');        // Модель услуги
const Category = require('../models/Category');      // Модель категории (используется через сервис → подкатегорию)
const Subcategory = require('../models/Subcategory');// Модель подкатегории (используется через сервис)
const Review = require('../models/Review');          // Модель отзыва
const TimeSlot = require('../models/TimeSlot');      // Модель временного слота

// Middleware — проверяет, что пользователь аутентифицирован
function isAuthenticated(req, res, next) {
  // req.isAuthenticated() добавляется Passport.js и возвращает true, если пользователь залогинен
  if (req.isAuthenticated()) return next();           // Если прошёл аутентификацию, переходим дальше
  res.redirect('/auth/login');                        // Иначе перенаправляем на страницу входа
}

// GET /profile
// Показ личного кабинета: профиль пользователя и список его бронирований
router.get('/', isAuthenticated, async (req, res) => {
  // Получаем все бронирования текущего пользователя, сортируя по дате и времени в порядке убывания
  const bookings = await Booking.findAll({
    where: { user_id: req.user.id },
    include: [
      // К каждому бронированию подключаем связанный сервис, в который вложена подкатегория и категория
      { 
        model: Service, 
        include: [
          { 
            model: Subcategory, 
            include: [Category] 
          }
        ] 
      },
      // Подключаем связанный отзыв (если он есть)
      { model: Review }
    ],
    order: [['date', 'DESC'], ['time', 'DESC']]
  });

  // Для отображения актуальных данных пользователя заново получаем его из базы
  const user = await User.findByPk(req.user.id);

  // Рендерим шаблон 'profile.ejs', передаём:
  // - user: объект пользователя с актуальными полями
  // - bookings: список бронирований с вложенными данными (сервис, подкатегория, категория, отзыв)
  // - title: заголовок страницы
  // - user: текущий пользователь (Passport кладёт его в req.user)
  res.render('profile', {
    user,
    bookings,
    title: 'Личный кабинет',
    user: req.user
  });
});

// GET /profile/edit
// Отображает форму редактирования данных профиля
router.get('/edit', isAuthenticated, async (req, res) => {
  // Получаем данные пользователя из базы по ID (req.user.id)
  const user = await User.findByPk(req.user.id);
  // Рендерим шаблон 'profile_edit.ejs', передаём:
  // - user: объект с текущими данными пользователя
  // - title: заголовок страницы
  res.render('profile_edit', { 
    user,
    title: 'Личный кабинет',
  });
});

// POST /profile/edit
// Обрабатывает форму редактирования профиля: сохраняет изменения name, surname, email
router.post('/edit', isAuthenticated, async (req, res) => {
  const { name, surname, email } = req.body;         // Извлекаем новые значения из тела запроса
  // Можно добавить валидацию (например, проверка формата email)
  const user = await User.findByPk(req.user.id);      // Находим пользователя в базе
  user.name = name.trim();                            // Обновляем поле name (удаляем лишние пробелы)
  user.surname = surname.trim();                      // Обновляем поле surname (удаляем лишние пробелы)
  user.email = email.trim();                          // Обновляем поле email (удаляем лишние пробелы)
  await user.save();                                   // Сохраняем изменения в базе
  req.flash('success', 'Данные профиля обновлены!');  // Сохраняем flash-сообщение об успехе
  res.redirect('/profile');                            // Перенаправляем обратно в личный кабинет
});

// POST /profile/cancel/:id
// Обрабатывает отмену бронирования (пользователь нажал "Отменить бронь")
router.post('/cancel/:id', isAuthenticated, async (req, res) => {
  // Находим бронь по её ID и по ID текущего пользователя (чтобы нельзя было отменить чужую)
  const booking = await Booking.findOne({ 
    where: { id: req.params.id, user_id: req.user.id } 
  });

  // Если брони нет или она уже отменена, выводим ошибку
  if (!booking || booking.status === 'canceled') {
    req.flash('error', 'Бронь не найдена или уже отменена');
    return res.redirect('/profile');
  }

  // Меняем статус брони на 'canceled'
  booking.status = 'canceled';
  await booking.save();  // Сохраняем изменения

  // Находим соответствующий временной слот, чтобы сделать его снова доступным
  const slot = await TimeSlot.findOne({ 
    where: { 
      service_id: booking.service_id, 
      date: booking.date, 
      time: booking.time 
    } 
  });
  if (slot) {
    slot.is_available = true;  // Помечаем слот как доступный
    await slot.save();         // Сохраняем изменения
  }

  req.flash('success', 'Бронь отменена');  // Flash-сообщение об успешной отмене
  res.redirect('/profile');                // Перенаправляем обратно в личный кабинет
});

// POST /profile/review/:id
// Обрабатывает добавление отзыва: пользователь отправляет оценку и комментарий для своего бронирования
router.post('/review/:id', isAuthenticated, async (req, res) => {
  const { rating, text } = req.body;                  // Извлекаем поля rating (оценка) и text (комментарий)
  // Находим бронь по ID и по ID текущего пользователя
  const booking = await Booking.findOne({ 
    where: { id: req.params.id, user_id: req.user.id } 
  });
  if (!booking) return res.redirect('/profile');       // Если нет брони — просто возвращаемся в профиль

  // Создаём новый отзыв:
  await Review.create({
    user_id: req.user.id,           // ID пользователя, который оставляет отзыв
    booking_id: booking.id,         // ID бронирования, к которому привязан отзыв
    service_id: booking.service_id, // ID услуги (опционально, но может понадобиться)
    rating: Number(rating),         // Конвертируем строку в число для поля rating
    comment: text.trim()            // Сохраняем комментарий (trim убирает пробелы в начале/конце)
  });

  req.flash('success', 'Спасибо за ваш отзыв!'); // Flash-сообщение об успехе
  res.redirect('/profile');                       // Перенаправляем обратно в личный кабинет
});

module.exports = router;  // Экспортируем маршрутизатор, чтобы его можно было подключить в основном приложении

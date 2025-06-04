const express = require('express');                   // Импортируем Express для создания роутера
const router = express.Router();                      // Создаём новый экземпляр Router

const { Op } = require('sequelize');                  // Импортируем оператор Op для сложных условий в запросах
const Category = require('../models/Category');        // Модель категорий
const Subcategory = require('../models/Subcategory');  // Модель подкатегорий
const Service = require('../models/Service');          // Модель услуг
const TimeSlot = require('../models/TimeSlot');        // Модель временных слотов
const Booking = require('../models/Booking');          // Модель бронирований

// Middleware — проверяет, что пользователь аутентифицирован
function isAuthenticated(req, res, next) {
  // req.isAuthenticated() метод Passport.js; возвращает true, если пользователь вошёл в систему
  if (req.isAuthenticated()) return next();            // Если аутентифицирован, переходим к следующему middleware/обработчику
  res.redirect('/auth/login');                         // В противном случае перенаправляем на страницу логина
}

// Перенаправление с /booking на /booking/schedule
router.get('/', (req, res) => {
  res.redirect('/booking/schedule');
});

// GET /booking/schedule — отображение расписания бронирований
router.get('/schedule', isAuthenticated, async (req, res) => {
  // Извлекаем параметры из query-строки: category_id, subcategory_id, service_id, date
  const { category_id, subcategory_id, service_id, date } = req.query;

  // Получаем все категории вместе с вложенными подкатегориями
  const categories = await Category.findAll({ include: Subcategory });
  let services = [];
  // Если выбранная подкатегория передана в параметрах, получаем все услуги этой подкатегории
  if (subcategory_id) {
    services = await Service.findAll({ where: { subcategory_id } });
  }

  // Определяем выбранную дату:
  // если date передан, используем его; иначе — сегодняшнюю дату (YYYY-MM-DD)
  let selectedDate = date || (new Date()).toISOString().slice(0,10);

  let slots = [];
  // Если переданы service_id и выбранная дата, начинаем сбор информации о слоты
  if (service_id && selectedDate) {
    // Получаем все слоты для данной услуги и даты, сортируя по времени по возрастанию
    slots = await TimeSlot.findAll({
      where: { service_id, date: selectedDate },
      order: [['time', 'ASC']]
    });

    // Получаем все брони текущего пользователя на этот сервис и дату, исключая отменённые
    const myBookings = await Booking.findAll({
      where: {
        user_id: req.user.id,
        service_id,
        date: selectedDate,
        status: { [Op.not]: 'canceled' }
      }
    });

    // Получаем все брони на этот сервис и дату (чтобы определить занятость слотов), исключая отменённые
    const allBookings = await Booking.findAll({
      where: {
        service_id,
        date: selectedDate,
        status: { [Op.not]: 'canceled' }
      }
    });

    // Строим массив слотов с дополнительным полем status
    slots = slots.map(slot => {
      // Находим бронь конкретного пользователя на этот же временной слот
      const myBooking = myBookings.find(b => b.time === slot.time);
      // Находим любую бронь (pending или confirmed) на этот же временной слот
      const anyBooking = allBookings.find(b => b.time === slot.time);

      // По умолчанию помечаем слот как свободный
      let status = 'free';

      // 1) Если у текущего пользователя есть бронь со статусом pending на этот слот
      if (myBooking && myBooking.status === 'pending') {
        status = 'pending';
      }
      // 2) Если у текущего пользователя есть бронь со статусом confirmed на этот слот
      else if (myBooking && myBooking.status === 'confirmed') {
        status = 'yours';
      }
      // 3) Если у кого-то другого есть бронь со статусом confirmed на этот слот
      else if (anyBooking && anyBooking.status === 'confirmed') {
        status = 'busy';
      }
      // 4) Если у кого-то другого есть бронь со статусом pending на этот слот
      else if (anyBooking && anyBooking.status === 'pending') {
        status = 'pending';
      }
      // 5) Если слот закрыт менеджером (is_available == false) и нет активных броней
      else if (!slot.is_available) {
        status = 'closed';
      }
      // В других случаях остаётся 'free'

      // Возвращаем объект слота с добавленными свойствами status и closed_reason
      return { ...slot.dataValues, status, closed_reason: slot.closed_reason };
    });
  }

  // Рендерим шаблон booking/schedule.ejs, передаём:
  // - categories: список категорий с подкатегориями
  // - services: список услуг выбранной подкатегории (или пустой)
  // - selected: объект с выбранными фильтрами (category_id, subcategory_id, service_id, date)
  // - title: заголовок страницы
  // - slots: массив слотов с рассчитанным статусом
  // - user: текущий пользователь (для отображения информации об авторизации)
  res.render('booking/schedule', {
    categories,
    services,
    selected: { category_id, subcategory_id, service_id, date: selectedDate },
    title: 'Расписание',
    slots,
    user: req.user
  });
});

// POST /booking/schedule/book — AJAX-запрос для бронирования слота
router.post('/schedule/book', isAuthenticated, async (req, res) => {
  // Извлекаем из тела запроса: service_id, date и идентификатор слота (slot_id)
  const { service_id, date, slot_id } = req.body;
  // Если отсутствуют необходимые данные — возвращаем JSON с ошибкой
  if (!service_id || !date || !slot_id) {
    return res.json({ success: false, message: 'Некорректные данные' });
  }

  try {
    // Проверяем, что слот существует и доступен (is_available == true)
    const slot = await TimeSlot.findOne({ where: { id: slot_id, is_available: true } });
    if (!slot) {
      // Если слот либо не найден, либо уже заблокирован, возвращаем ошибку
      return res.json({ success: false, message: 'Время занято или недоступно!' });
    }

    // Проверяем, нет ли у пользователя уже брони на этот же сервис, дату и время (исключая отменённые)
    const existing = await Booking.findOne({
      where: {
        user_id: req.user.id,
        service_id,
        date,
        time: slot.time,
        status: { [Op.not]: 'canceled' }
      }
    });
    if (existing) {
      // Если уже есть активная бронь на это время — возвращаем сообщение об ошибке
      return res.json({ success: false, message: 'У вас уже есть бронь на это время!' });
    }

    // Создаём новую бронь со статусом 'pending'
    await Booking.create({
      user_id: req.user.id,
      service_id,
      date,
      time: slot.time,
      status: 'pending'
    });

    // Помечаем сам слот как недоступный, чтобы никто другой не мог его забронировать
    slot.is_available = false;
    await slot.save();

    // Возвращаем успешный ответ
    return res.json({ success: true });
  } catch (err) {
    // В случае ошибки на сервере возвращаем сообщение об ошибке
    return res.json({ success: false, message: 'Ошибка на сервере' });
  }
});

// Экспортируем маршрутизатор, чтобы подключить его в основном приложении
module.exports = router;

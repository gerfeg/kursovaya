const express = require('express');                   // Импортируем Express для создания роутера
const router = express.Router();                      // Создаём новый экземпляр Router
const { Op } = require('sequelize');                  // Импортируем оператор Op для условий в запросах
const Booking = require('../models/Booking');          // Модель бронирований
const Service = require('../models/Service');          // Модель услуг
const User = require('../models/User');                // Модель пользователей
const TimeSlot = require('../models/TimeSlot');        // Модель временных слотов

// Middleware: проверяет, что текущий пользователь аутентифицирован и имеет роль "manager" или "admin"
function isManager(req, res, next) {
  // req.isAuthenticated() проверяет, вошёл ли пользователь (Passport.js)
  // req.user.role — роль пользователя (например, 'manager', 'admin', 'user')
  if (req.isAuthenticated() && (req.user.role === 'manager' || req.user.role === 'admin')) {
    return next();          // Если условие выполнено, переходим к следующему обработчику
  }
  // В противном случае возвращаем 403 Forbidden с сообщением
  res.status(403).send('Доступ только для менеджеров!');
}

// GET /manager — список всех бронирований с возможностью фильтрации по дате и услуге
router.get('/', isManager, async (req, res) => {
  // Извлекаем параметры фильтрации из query: date (дата) и service_id (ID услуги)
  const { date, service_id } = req.query;
  let where = {};             // Объект для условий поиска
  if (date) where.date = date;            // Если указана дата, добавляем условие по полю date
  if (service_id) where.service_id = service_id;  // Если указан ID услуги, добавляем условие по полю service_id

  // Получаем список бронирований по условиям, включая связанные модели User и Service
  const bookings = await Booking.findAll({
    where,
    include: [
      { model: User },      // Присоединяем данные пользователя, сделавшего бронь
      { model: Service }    // Присоединяем данные услуги, для которой сделано бронирование
    ],
    order: [['date', 'ASC'], ['time', 'ASC']] // Сортировка сначала по дате, потом по времени
  });
  // Получаем все доступные услуги (понадобятся для выпадающего списка фильтра)
  const services = await Service.findAll();
  // Рендерим шаблон 'manager/index.ejs', передаём:
  // - bookings: список бронирований с пользовательскими и сервис-данными
  // - services: список всех услуг
  // - selected: объект с текущими фильтрами (date, service_id)
  // - title: заголовок страницы
  // - user: текущий пользователь (для отображения информации о сессии)
  res.render('manager/index', {
    bookings,
    services,
    selected: { date, service_id },
    title: 'Менеджер-панель',
    user: req.user
  });
});

// POST /manager/confirm/:id — AJAX-запрос на подтверждение бронирования
router.post('/confirm/:id', isManager, async (req, res) => {
  // Находим бронь по её первичному ключу (ID)
  const booking = await Booking.findByPk(req.params.id);
  // Если бронь найдена и в статусе 'pending' (ждёт подтверждения)
  if (booking && booking.status === 'pending') {
    booking.status = 'confirmed'; // Меняем статус на 'confirmed'
    await booking.save();         // Сохраняем изменения в базе данных
    return res.json({ success: true }); // Возвращаем JSON с успехом
  }
  // Если не удалось подтвердить (нет такой брони или уже не в 'pending'), возвращаем success: false
  return res.json({ success: false });
});

// POST /manager/cancel/:id — AJAX-запрос на отмену бронирования
router.post('/cancel/:id', isManager, async (req, res) => {
  // Находим бронь по ID
  const booking = await Booking.findByPk(req.params.id);
  // Если бронь найдена и её статус ещё не 'canceled'
  if (booking && booking.status !== 'canceled') {
    booking.status = 'canceled';   // Меняем статус на 'canceled'
    await booking.save();          // Сохраняем изменения
    // После отмены брони делаем соответствующий слот снова доступным:
    await TimeSlot.update(
      { is_available: true },      // Устанавливаем флаг is_available в true
      {
        where: {
          service_id: booking.service_id,  // Находим слот по service_id
          date: booking.date,               // и по дате бронирования
          time: booking.time                // и по времени бронирования
        }
      }
    );
    return res.json({ success: true }); // Возвращаем JSON с успехом
  }
  // Если отмена не удалась (не найдена бронь или уже отменена), возвращаем success: false
  return res.json({ success: false });
});

// GET /manager/slots — страница управления временными слотами
router.get('/slots', isManager, async (req, res) => {
  // Извлекаем параметры фильтрации: date и service_id
  const { date, service_id } = req.query;
  let where = {};               // Объект для условий поиска слотов
  const today = new Date().toISOString().slice(0, 10);  // Определяем сегодняшнюю дату (YYYY-MM-DD)
  // Если date передан в query, используем его; иначе — используем сегодняшнюю дату
  const selectedDate = date || today;
  if (selectedDate) where.date = selectedDate;      // Добавляем условие по дате
  if (service_id) where.service_id = service_id;    // Добавляем условие по ID услуги

  // Получаем все услуги (понадобятся для выпадающего списка фильтра)
  const services = await Service.findAll();
  let slots = [];
  // Если указаны и дата, и ID услуги, получаем все слоты по этим условиям
  if (selectedDate && service_id) {
    slots = await TimeSlot.findAll({
      where,
      order: [['time', 'ASC']]  // Сортируем слоты по времени по возрастанию
    });
  }
  // Рендерим шаблон 'manager/slots.ejs', передаём:
  // - services: список всех услуг
  // - slots: слоты, соответствующие текущим фильтрам (либо пустой массив)
  // - selected: объект с текущими фильтрами (date, service_id)
  // - title: заголовок страницы
  // - user: текущий пользователь
  res.render('manager/slots', {
    services,
    slots,
    selected: { date: selectedDate, service_id },
    title: 'Слоты',
    user: req.user
  });
});

// POST /manager/slots/toggle — AJAX-запрос для открытия/закрытия слота
router.post('/slots/toggle', isManager, async (req, res) => {
  // Извлекаем из тела запроса: slot_id (ID слота), action ('open' или другое значение), и reason (причина закрытия)
  const { slot_id, action, reason } = req.body;
  // Если не переданы обязательные параметры, возвращаем JSON с ошибкой
  if (!slot_id || !action) return res.json({ success: false, message: 'Ошибка параметров' });

  let update = {};
  // Если action равно 'open', значит нужно открыть слот:
  if (action === 'open') {
    update = { is_available: true, closed_reason: null }; 
  } else {
    // Иначе предполагаем закрытие, и указываем причину закрытия (или null, если причина не передана)
    update = { is_available: false, closed_reason: reason || null };
  }
  // Обновляем соответствующую запись в таблице time_slots по ID
  await TimeSlot.update(update, { where: { id: slot_id } });
  // Возвращаем JSON с успехом
  return res.json({ success: true });
});

// Экспортируем маршрутизатор, чтобы подключить его в основном приложении (index.js)
module.exports = router;

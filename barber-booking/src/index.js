// Загружаем переменные окружения из файла .env (например, настройки БД, SECRET)
require('dotenv').config();

const express = require('express');              // Импортируем Express для создания приложения
const session = require('express-session');       // Импортируем express-session для работы с сессиями
const passport = require('passport');             // Импортируем Passport.js для аутентификации
const flash = require('connect-flash');           // Импортируем connect-flash для flash-сообщений (ошибки/успех)
const path = require('path');                     // Модуль Node.js для работы с путями файловой системы
const expressLayouts = require('express-ejs-layouts'); // Импортируем express-ejs-layouts для работы с layouts

// Импортируем Sequelize-экземпляр и модели, чтобы при sync они были зарегистрированы
const sequelize = require('./config/database');
const User = require('./models/User');
const Category = require('./models/Category');
const Subcategory = require('./models/Subcategory');
const Service = require('./models/Service');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const TimeSlot = require('./models/TimeSlot');

// Настраиваем Passport (импортируем функцию из config/passport и передаём сам passport)
require('./config/passport')(passport);

const app = express(); // Создаём экземпляр приложения Express

// Парсеры для данных из форм:
// express.urlencoded — обрабатывает данные application/x-www-form-urlencoded (HTML-формы)
// express.json — обрабатывает JSON-данные в теле запроса
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Настройка движка EJS и layouts
app.set('view engine', 'ejs'); // Указываем, что будем использовать EJS как шаблонизатор
app.set('views', path.join(__dirname, 'views')); // Путь к папке с шаблонами views/
app.use(expressLayouts);           // Подключаем middleware express-ejs-layouts
app.set('layout', 'layout');        // По умолчанию будет использоваться шаблон views/layout.ejs

// Раздача статических файлов из папки public (CSS, JS, изображения)
app.use(express.static(path.join(__dirname, 'public')));

// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultsecret', // Секрет для подписи cookie сессии
  resave: false,               // Не сохранять сессию в хранилище, если ничего не изменилось
  saveUninitialized: false     // Не сохранять пустые (неинициализированные) сессии
}));

// Инициализация Passport и подключение сессий Passport
app.use(passport.initialize());
app.use(passport.session());

// Подключаем flash-сообщения (flash хранит сообщения в сессии и очищает после отображения)
app.use(flash());

// Базовый маршрут: при заходе на “/” перенаправляем на /booking/schedule
app.get('/', (req, res) => res.redirect('/booking/schedule'));

// Подключаем роутеры для разных разделов приложения
// В каждом из них прописаны конкретные маршруты и логика
const authRoutes     = require('./routes/auth');
const bookingRoutes  = require('./routes/booking');
const profileRoutes  = require('./routes/profile');
const managerRoutes  = require('./routes/manager');
const adminRoutes    = require('./routes/admin');
const searchRoutes   = require('./routes/search');
const aboutRoutes    = require('./routes/about');
const servicesRoutes = require('./routes/services');

// Привязываем роутеры к префиксам URL
app.use('/auth', authRoutes);          // Маршруты авторизации: /auth/register, /auth/login, /auth/logout
app.use('/booking', bookingRoutes);    // Маршруты бронирования: /booking/schedule, /booking/schedule/book
app.use('/profile', profileRoutes);    // Маршруты личного кабинета: /profile, /profile/edit, /profile/cancel/:id, /profile/review/:id
app.use('/manager', managerRoutes);    // Маршруты менеджер-панели: /manager, /manager/confirm/:id, /manager/cancel/:id, /manager/slots, /manager/slots/toggle
app.use('/admin', adminRoutes);        // Маршруты админ-панели: /admin, /admin/users, /admin/category/…, /admin/subcategory/…, /admin/service/…
app.use('/search', searchRoutes);      // Маршруты поиска: /search?q=…
app.use('/about', aboutRoutes);        // Страница “О нас”: /about
app.use('/services', servicesRoutes);  // Страница со списком услуг: /services

// Определяем порт для запуска (из .env или 3000 по умолчанию)
const PORT = process.env.PORT || 3000;

// Асинхронная самовызывающаяся функция для подключения к базе и запуска сервера
(async () => {
  try {
    // Проверяем подключение к БД
    await sequelize.authenticate();
    // Синхронизируем модели с базой данных (создаются таблицы, если их нет)
    // Для разработки можно использовать sync({ force: true }), чтобы пересоздать таблицы
    await sequelize.sync();
    console.log('БД подключена!');

    // Запускаем сервер на указанном порту
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (e) {
    // Если не удалось подключиться к БД, выводим ошибку и завершает работу процесса
    console.error('Ошибка подключения к БД:', e);
    process.exit(1);
  }
})();

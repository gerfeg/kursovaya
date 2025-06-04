// Подключаем фреймворк Express и создаём новый Router для админских маршрутов
const express = require('express');
const router = express.Router();

// Импортируем модели для работы с данными
const Category    = require('../models/Category');    // Категории услуг
const Subcategory = require('../models/Subcategory'); // Подкатегории услуг
const Service     = require('../models/Service');     // Услуги
const User        = require('../models/User');        // Пользователи

// Middleware: проверка, что текущий пользователь аутентифицирован и имеет роль "admin"
function isAdmin(req, res, next) {
  // req.isAuthenticated() — метод Passport.js, проверяет, вошёл ли пользователь
  // req.user.role — роль пользователя (берётся из сессии)
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next(); // Если всё в порядке, передаём управление следующему обработчику
  }
  // Если пользователь не админ или не вошёл, возвращаем 403 Forbidden
  res.status(403).send('Доступ только для админов!');
}

// GET /admin
// Главная страница админки: выводит список категорий, подкатегорий и услуг
router.get('/', isAdmin, async (req, res) => {
  // Получаем все категории, включая связанные подкатегории
  const categories   = await Category.findAll({ include: [Subcategory] });
  // Получаем все подкатегории, включая родительскую категорию
  const subcategories = await Subcategory.findAll({ include: [Category] });
  // Получаем все услуги, включая связанные подкатегории
  const services     = await Service.findAll({ include: [Subcategory] });

  // Рендерим шаблон 'admin/index.ejs', передаём три массива и информацию о текущем пользователе
  res.render('admin/index', {
    categories,
    subcategories,
    services,
    title: 'Админ-панель', // Заголовок страницы
    user: req.user         // Объект текущего пользователя
  });
});

// GET /admin/users
// Страница управления пользователями: выводит всех пользователей
router.get('/users', isAdmin, async (req, res) => {
  // Получаем список всех пользователей
  const users = await User.findAll();
  // Рендерим шаблон 'admin/users.ejs', передаём список пользователей и текущего юзера
  res.render('admin/users', {
    users,
    title: 'Пользователи',
    user: req.user
  });
});

// POST /admin/users/role/:id
// Меняем роль пользователя (на "user" или "manager") по его ID
router.post('/users/role/:id', isAdmin, async (req, res) => {
  const userId = req.params.id;       // Берём ID пользователя из URL
  const newRole = req.body.role;      // Ожидаем из формы новое значение роли ("user" или "manager")

  // Находим пользователя по первичному ключу
  const user = await User.findByPk(userId);
  // Если пользователь существует и его текущая роль не "admin" (чтобы нельзя было поменять роль админа)
  if (user && user.role !== 'admin') {
    user.role = newRole;     // Устанавливаем новую роль
    await user.save();       // Сохраняем изменения в БД
  }

  // После обновления перенаправляем обратно на страницу управления пользователями
  res.redirect('/admin/users');
});

// POST /admin/users/delete/:id
// Удаляем пользователя по его ID (только если он не админ)
router.post('/users/delete/:id', isAdmin, async (req, res) => {
  const userId = req.params.id;       // ID пользователя из URL

  // Находим пользователя по первичному ключу
  const user = await User.findByPk(userId);
  // Если пользователь существует и он не админ
  if (user && user.role !== 'admin') {
    await User.destroy({ where: { id: userId } }); // Удаляем запись из таблицы users
  }

  // Перенаправляем обратно на страницу управления пользователями
  res.redirect('/admin/users');
});

// POST /admin/category/add
// Добавление новой категории услуг
router.post('/category/add', isAdmin, async (req, res) => {
  const { name } = req.body;            // Берём из формы имя новой категории
  await Category.create({ name });      // Создаём запись в таблице categories
  res.redirect('/admin');               // Возвращаемся на главную админки
});

// POST /admin/category/delete/:id
// Удаление категории по ID (и каскадно удаляет её подкатегории и услуги)
router.post('/category/delete/:id', isAdmin, async (req, res) => {
  await Category.destroy({ where: { id: req.params.id } }); // Удаляем категорию по ID
  res.redirect('/admin');                                    // Возвращаемся на главную админки
});

// POST /admin/subcategory/add
// Добавление новой подкатегории: имя и ID родительской категории
router.post('/subcategory/add', isAdmin, async (req, res) => {
  const { name, category_id } = req.body;       // Берём из формы имя подкатегории и её category_id
  await Subcategory.create({ name, category_id }); // Создаём запись в таблице subcategories
  res.redirect('/admin');                        // Возвращаемся на главную админки
});

// POST /admin/subcategory/delete/:id
// Удаление подкатегории по ID (каскадно удаляет связанные услуги)
router.post('/subcategory/delete/:id', isAdmin, async (req, res) => {
  await Subcategory.destroy({ where: { id: req.params.id } }); // Удаляем подкатегорию по ID
  res.redirect('/admin');                                        // Возвращаемся на главную админки
});

// POST /admin/service/add
// Добавление новой услуги: имя, ID подкатегории, длительность и цена
router.post('/service/add', isAdmin, async (req, res) => {
  const { name, subcategory_id, duration_min, price } = req.body; // Данные из формы
  await Service.create({ name, subcategory_id, duration_min, price }); // Создаём запись в таблице services
  res.redirect('/admin');                                           // Возвращаемся на главную админки
});

// POST /admin/service/delete/:id
// Удаление услуги по ID
router.post('/service/delete/:id', isAdmin, async (req, res) => {
  await Service.destroy({ where: { id: req.params.id } }); // Удаляем услугу по ID
  res.redirect('/admin');                                   // Возвращаемся на главную админки
});

// Экспортируем настроенный роутер, чтобы подключить его в основном приложении
module.exports = router;

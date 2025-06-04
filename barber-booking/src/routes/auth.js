const express = require('express');           // Импортируем фреймворк Express
const router = express.Router();              // Создаём новый Router для маршрутов авторизации
const bcrypt = require('bcryptjs');            // Импорт библиотеки для хеширования паролей
const User = require('../models/User');        // Импорт модели User для работы с данными пользователей
const passport = require('passport');          // Импорт Passport для аутентификации

// GET /auth/register
// Отображает форму регистрации (register.ejs)
// Передаём во view:
//   - message: flash-сообщение об ошибке (если было)
//   - title: заголовок страницы
//   - user: объект текущего пользователя (или undefined, если не авторизован)
router.get('/register', (req, res) => {
  res.render('auth/register', { 
    message: req.flash('error'), 
    title: 'Авторизация', 
    user: req.user 
  });
});

// POST /auth/register
// Обработка данных формы регистрации
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body; // Извлекаем name, email, password из тела запроса
  try {
    // Проверяем, существует ли уже пользователь с таким email
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      // Если пользователь найден, сохраняем flash-сообщение об ошибке и перенаправляем обратно
      req.flash('error', 'Пользователь с таким email уже существует');
      return res.redirect('/auth/register');
    }
    // Хешируем пароль с "солённым" раундом 10
    const password_hash = await bcrypt.hash(password, 10);
    // Создаём нового пользователя в таблице users
    await User.create({ name, email, password_hash });
    // После успешной регистрации перенаправляем на страницу входа
    res.redirect('/auth/login');
  } catch (e) {
    // При любой ошибке сохраняем flash-сообщение и возвращаем форму регистрации
    req.flash('error', 'Ошибка при регистрации');
    res.redirect('/auth/register');
  }
});

// GET /auth/login
// Отображает форму входа (login.ejs)
// Передаём:
//   - message: flash-сообщение об ошибке (если было)
//   - title: заголовок страницы
//   - user: текущий пользователь (или undefined, если не авторизован)
router.get('/login', (req, res) => {
  res.render('auth/login', { 
    message: req.flash('error'), 
    title: 'Регистрация', 
    user: req.user 
  });
});

// POST /auth/login
// Обработка данных формы входа через Passport.js
// passport.authenticate('local', …) автоматически:
//   - сверяет email/пароль с базой данных (локальная стратегия)
//   - при успехе перенаправляет на successRedirect
//   - при неудаче сохраняет flash-сообщение и перенаправляет на failureRedirect
router.post('/login', passport.authenticate('local', {
  successRedirect: '/',        // При успешной авторизации – на главную страницу
  failureRedirect: '/auth/login', // При провале – обратно на страницу логина
  failureFlash: true           // Включаем flash-сообщения об ошибке
}));

// POST /auth/logout
// Обработка выхода пользователя из системы
router.post('/logout', (req, res) => {
  // Passport.js добавляет метод logout в req
  req.logout(() => {
    // После выхода перенаправляем на страницу входа
    res.redirect('/auth/login');
  });
});

// Экспортируем маршруты, чтобы подключить их в основном приложении (index.js)
module.exports = router;

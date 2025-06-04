// Подключаем фреймворк Express для создания роутера
const express = require('express');
// Создаём новый экземпляр маршрутизатора (Router) Express
const router = express.Router();

// Обработчик GET-запроса по пути /about
router.get('/', (req, res) => {
  // Рендерим шаблон 'about' и передаём в него:
//   - title: заголовок страницы
//   - user: объект авторизованного пользователя (или undefined, если не вошёл)
  res.render('about', {
    title: 'О нас',
    user: req.user
  });
});

// Экспортируем настроенный роутер, чтобы его можно было подключить в основном файле приложения (index.js)
module.exports = router;

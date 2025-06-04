const express = require('express');      // Импортируем Express для создания маршрутизатора
const router = express.Router();         // Создаём новый экземпляр Router

// Обработчик GET-запроса по маршруту '/'
// Рендерит шаблон 'index' и передаёт в него объект user (если пользователь залогинен)
router.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

// Экспортируем настроенный роутер, чтобы подключить его в основном приложении (index.js)
module.exports = router;

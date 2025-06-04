// Middleware-функция, проверяющая, что пользователь аутентифицирован и имеет роль "manager" или "admin"
function isManager(req, res, next) {
  // req.isAuthenticated() проверяет, выполнен ли вход (Passport.js добавляет этот метод в req)
  // req.user.role содержит роль пользователя (например, 'manager', 'admin', 'user' и т.д.)
  if (req.isAuthenticated() && (req.user.role === 'manager' || req.user.role === 'admin')) {
    // Если пользователь аутентифицирован и его роль — менеджер или админ, переходим к следующему middleware или обработчику маршрута
    return next();
  }
  // В противном случае возвращаем ответ с кодом 403 Forbidden и сообщением
  res.status(403).send('Доступ только для менеджеров!');
}

// Middleware-функция, проверяющая, что пользователь аутентифицирован и имеет роль "admin"
function isAdmin(req, res, next) {
  // Аналогично: проверяем, что пользователь залогинен и его роль — 'admin'
  if (req.isAuthenticated() && req.user.role === 'admin') {
    // Если всё верно, переходим к следующему обработчику
    return next();
  }
  // Иначе возвращаем код 403 Forbidden
  res.status(403).send('Доступ только для админов!');
}

// Экспортируем обе функции, чтобы их можно было подключать в файлах с маршрутами
module.exports = { isManager, isAdmin };

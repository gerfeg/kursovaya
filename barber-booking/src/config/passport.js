const LocalStrategy = require('passport-local').Strategy; // Импорт локальной стратегии аутентификации Passport
const bcrypt = require('bcryptjs');                      // Импорт библиотеки для хеширования и сравнения паролей
const User = require('../models/User');                  // Импорт модели User (Sequelize-модель для таблицы пользователей)

module.exports = function(passport) {
  // Настраиваем локальную стратегию: будем использовать поле “email” вместо “username”
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Ищем пользователя в БД по введённому email
        const user = await User.findOne({ where: { email } });
        if (!user) {
          // Если пользователь не найден, возвращаем ошибку аутентификации
          return done(null, false, { message: 'Неверный email или пароль' });
        }
        // Сравниваем введённый пароль с захешированным паролем из базы (user.password_hash)
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
          // Если пароль не совпал, возвращаем ошибку аутентификации
          return done(null, false, { message: 'Неверный email или пароль' });
        }
        // Если всё совпало, возвращаем найденного пользователя
        return done(null, user);
      } catch (err) {
        // При ошибке при работе с БД или bcrypt передаём ошибку дальше в Passport
        return done(err);
      }
    })
  );

  // Сериализация пользователя: при успешной аутентификации в сессии сохраняем только user.id
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Десериализация пользователя: при последующих запросах по ID из сессии достаём полные данные пользователя из БД
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};

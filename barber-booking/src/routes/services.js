const express = require('express');                   // Импортируем фреймворк Express для создания маршрутизатора
const router = express.Router();                      // Создаём новый экземпляр Router

const Category    = require('../models/Category');    // Импорт модели Category (категории услуг)
const Subcategory = require('../models/Subcategory'); // Импорт модели Subcategory (подкатегории услуг)
const Service     = require('../models/Service');     // Импорт модели Service (услуги)

// GET /services
// Обработчик запроса для отображения страницы со списком услуг
router.get('/', async (req, res) => {
  try {
    // Получаем все категории из базы данных, включая вложенные подкатегории и услуги
    // Для каждой категории:
    //   include: [{ model: Subcategory, include: [Service] }]
    // значит: загрузить связанные подкатегории, а в каждой подкатегории загрузить связанные услуги
    const categories = await Category.findAll({
      include: [{
        model: Subcategory,
        include: [Service]
      }]
    });

    // Рендерим шаблон 'services.ejs', передаём:
    //   - title: заголовок страницы
    //   - categories: результат запроса (список категорий с подкатегориями и услугами)
    //   - user: объект текущего пользователя (req.user, если залогинен), чтобы в шаблоне можно было показать приветствие или кнопки
    res.render('services', {
      title: 'Услуги',
      categories,
      user: req.user
    });
  } catch (err) {
    // В случае ошибки при запросе данных выводим сообщение в консоль
    console.error('Ошибка при загрузке услуг:', err);
    // И возвращаем клиенту статус 500 (Internal Server Error) с текстом
    res.status(500).send('Ошибка сервера');
  }
});

// Экспортируем Router, чтобы подключить его в основном файле приложения (index.js)
module.exports = router;

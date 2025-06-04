// src/routes/search.js

const express = require('express');          // Импортируем Express для создания маршрутизатора
const router = express.Router();             // Создаём экземпляр Router

const Category    = require('../models/Category');    // Модель категорий
const Subcategory = require('../models/Subcategory'); // Модель подкатегорий
const Service     = require('../models/Service');     // Модель услуг

// Обработчик GET-запроса по маршруту /search, например: /search?q=парикмахер
router.get('/', async (req, res) => {
  // Берём параметр 'q' из query-строки; если его нет, используем пустую строку, затем убираем пробелы по краям
  const query = (req.query.q || '').trim();

  // Если поисковая строка пуста, сразу рендерим страницу результатов без данных
  if (!query) {
    return res.render('search_results', {
      title: 'Результаты поиска',
      query: '',          // Передаём пустую строку для отображения
      categories: [],     // Массив категорий пуст, т.к. нет запроса
      subcategories: [],  // Массив подкатегорий пуст
      services: [],       // Массив услуг пуст
      user: req.user      // Передаём объект залогиненного пользователя (или undefined)
    });
  }

  // Если есть непустой запрос, ищем совпадения в трёх моделях

  // 1) Ищем услуги, название которых содержит подстроку query (LIKE '%query%')
  //    - include: присоединяем связанные подкатегорию и через неё категорию, чтобы в результатах были все данные
  const services = await Service.findAll({
    where: {
      name: { [require('sequelize').Op.like]: `%${query}%` } // Оператор LIKE, вставляем % перед и после запроса
    },
    include: [{
      model: Subcategory,
      include: [Category]       // Вложенный include для получения категории через подкатегорию
    }]
  });

  // 2) Ищем подкатегории, название которых содержит подстроку query
  //    - include: присоединяем родительскую категорию
  const subcategories = await Subcategory.findAll({
    where: {
      name: { [require('sequelize').Op.like]: `%${query}%` }
    },
    include: [Category]           // Присоединяем модель Category, чтобы вывести её данные
  });

  // 3) Ищем категории, название которых содержит подстроку query
  const categories = await Category.findAll({
    where: {
      name: { [require('sequelize').Op.like]: `%${query}%` }
    }
  });

  // После получения всех трёх наборов данных, рендерим шаблон search_results.ejs
  res.render('search_results', {
    title: 'Результаты поиска', // Заголовок страницы
    query,                      // Передаём исходный поисковый запрос
    categories,                 // Результаты поиска по категориям
    subcategories,              // Результаты поиска по подкатегориям
    services,                   // Результаты поиска по услугам
    user: req.user              // Объект текущего пользователя (или undefined)
  });
});

// Экспортируем маршрутизатор, чтобы подключать его в основном приложении (index.js)
module.exports = router;

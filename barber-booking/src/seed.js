require('dotenv').config(); // Загружаем переменные окружения из .env (например, настройки БД)

const sequelize   = require('./config/database');   // Экземпляр Sequelize для работы с БД
const Category    = require('./models/Category');   // Модель категорий
const Subcategory = require('./models/Subcategory');// Модель подкатегорий
const Service     = require('./models/Service');    // Модель услуг
const TimeSlot    = require('./models/TimeSlot');   // Модель временных слотов

const dayjs = require('dayjs');                     // Библиотека для удобного работы с датами
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter'); // Плагин dayjs для сравнения дат “>=”
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore'); // Плагин dayjs для сравнения дат “<=”
dayjs.extend(isSameOrAfter);    // Подключаем плагин isSameOrAfter к dayjs
dayjs.extend(isSameOrBefore);   // Подключаем плагин isSameOrBefore к dayjs

async function seed() {
  try {
    await sequelize.authenticate(); // Проверяем, что подключение к БД установлено

    // Отключаем проверку внешних ключей, чтобы можно было свободно сбрасывать таблицы в нужном порядке
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // Удаляем таблицы в порядке зависимостей:
    // - Сначала таблицы, у которых есть внешние ключи: time_slots, bookings, reviews, services, subcategories, categories, users
    await sequelize.getQueryInterface().dropTable('time_slots');
    await sequelize.getQueryInterface().dropTable('bookings');
    await sequelize.getQueryInterface().dropTable('reviews');
    await sequelize.getQueryInterface().dropTable('services');
    await sequelize.getQueryInterface().dropTable('subcategories');
    await sequelize.getQueryInterface().dropTable('categories');
    await sequelize.getQueryInterface().dropTable('users');

    // Вновь включаем проверку внешних ключей после удаления всех таблиц
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Пересоздаём все таблицы заново на основе определений моделей (force: true сбрасывает их)
    await sequelize.sync({ force: true });
    console.log('Все таблицы пересозданы.');

    // 1. Список названий категорий, которые будем создавать
    const categoryNames = [
      'Стрижки',
      'Окрашивание',
      'Укладки',
      'Уход за бородой',
      'Маникюр'
    ];

    // 2. Для каждой категории задаём список подкатегорий
    const subcatNames = {
      'Стрижки': ['Мужские', 'Женские', 'Детские', 'Машинкой', 'Креативные'],
      'Окрашивание': ['Мелирование', 'Колорирование', 'Тонирование', 'Балаяж', 'Модное окрашивание'],
      'Укладки': ['Повседневные', 'Вечерние', 'Свадебные', 'Деловые', 'Спортивные'],
      'Уход за бородой': ['Full Service', 'Подравнивание', 'Оформление усов', 'Цветная борода', 'Лечебная маска'],
      'Маникюр': ['Классический', 'Аппаратный', 'Комбинированный', 'Гель-лак', 'SPA']
    };

    // 3. Шаблоны услуг для каждой категории: суффикс имени, продолжительность и цена
    const serviceTemplates = {
      'Стрижки': [
        { suffix: 'Стрижка стандартная',      duration: 30,  price: 800 },
        { suffix: 'Стрижка с мытьём',          duration: 40,  price: 1000 },
        { suffix: 'Стрижка + укладка',         duration: 45,  price: 1200 },
        { suffix: 'Стрижка + стайлинг',        duration: 50,  price: 1400 },
        { suffix: 'Барбер-стрижка',            duration: 35,  price: 900 }
      ],
      'Окрашивание': [
        { suffix: 'Мелирование классическое',   duration: 90,  price: 2500 },
        { suffix: 'Колорирование частичное',    duration: 100, price: 3000 },
        { suffix: 'Тонирование оттенок',        duration: 60,  price: 1800 },
        { suffix: 'Балаяж мелкий',              duration: 120, price: 3500 },
        { suffix: 'Насыщенное окрашивание',     duration: 110, price: 3200 }
      ],
      'Укладки': [
        { suffix: 'Укладка повседневная',      duration: 40,  price: 1000 },
        { suffix: 'Укладка вечерняя',          duration: 60,  price: 1500 },
        { suffix: 'Свадебная причёска',        duration: 90,  price: 3000 },
        { suffix: 'Деловая укладка',           duration: 50,  price: 1200 },
        { suffix: 'Спортивная укладка',        duration: 45,  price: 1100 }
      ],
      'Уход за бородой': [
        { suffix: 'Борода Full Service',       duration: 30,  price: 700 },
        { suffix: 'Подравнивание бороды',      duration: 20,  price: 500 },
        { suffix: 'Оформление усов',           duration: 15,  price: 300 },
        { suffix: 'Цветное тонирование',       duration: 25,  price: 800 },
        { suffix: 'Лечебная маска',            duration: 40,  price: 900 }
      ],
      'Маникюр': [
        { suffix: 'Классический маникюр',      duration: 45,  price: 800 },
        { suffix: 'Аппаратный маникюр',        duration: 50,  price: 1000 },
        { suffix: 'Комбинированный маникюр',   duration: 55,  price: 1100 },
        { suffix: 'Маникюр с гель-лаком',      duration: 60,  price: 1200 },
        { suffix: 'SPA-маникюр',               duration: 70,  price: 1500 }
      ]
    };

    // 4. Заполняем таблицы: создаём категории, для каждой категории — подкатегории, а затем услуги
    for (const catName of categoryNames) {
      // Создаём запись категории с именем и описанием
      const createdCategory = await Category.create({
        name: catName,
        description: `Категория: ${catName}`
      });

      // Пробегаем по списку подкатегорий для данной категории
      for (const subName of subcatNames[catName]) {
        // Создаём запись подкатегории, указываем внешний ключ category_id
        const createdSubcat = await Subcategory.create({
          name: subName,
          description: `Подкатегория: ${subName}`,
          category_id: createdCategory.id
        });

        // Для каждого шаблона услуги создаём конкретную услугу, связывая с текущей подкатегорией
        for (const tpl of serviceTemplates[catName]) {
          await Service.create({
            name: `${subName} — ${tpl.suffix}`, // Комбинируем имя: "Подкатегория — Суффикс"
            duration_min: tpl.duration,          // Продолжительность в минутах
            price: tpl.price,                    // Цена услуги
            description: `Услуга «${subName} — ${tpl.suffix}»`, // Описание
            subcategory_id: createdSubcat.id     // Внешний ключ на подкатегорию
          });
        }
      }
    }

    console.log('Категории, подкатегории и услуги успешно созданы.');

    // 5. Генерация временных слотов (TimeSlot) для всех услуг:
    //    Интервал: от месяца назад до месяца вперёд (будние дни),
    //    Время: с 10:00 до 18:00 каждые 30 минут.

    // Определяем сегодняшнюю дату без времени (00:00)
    const today       = dayjs().startOf('day');
    // Диапазон: от месяца назад
    const startDate   = today.subtract(1, 'month');
    // До месяца вперёд
    const endDate     = today.add(1, 'month');

    // Задаём рабочие часы: с 10 утра до 18 вечера
    const startHour = 10; // 10:00
    const endHour   = 18; // 18:00

    // Получаем все услуги, чтобы для каждой генерировать слоты
    const allServices = await Service.findAll();

    // Начинаем с даты startDate и движемся по дням до endDate
    let currentDate = startDate.clone();
    while (currentDate.isSameOrBefore(endDate, 'day')) {
      const weekday = currentDate.day(); // 0 = воскресенье, 6 = суббота
      // Генерируем только для будних дней (1–5)
      if (weekday !== 0 && weekday !== 6) {
        const dateStr = currentDate.format('YYYY-MM-DD'); // Форматируем дату в строку "YYYY-MM-DD"

        // Для каждой услуги создаём слоты в промежутке времени
        for (const svc of allServices) {
          // Цикл по часам с 10 до 17 (включительно создадим слоты 17:00 и 17:30)
          for (let hour = startHour; hour < endHour; hour++) {
            // Форматируем время “час:00”
            const t1 = `${String(hour).padStart(2, '0')}:00`;
            // И “час:30”
            const t2 = `${String(hour).padStart(2, '0')}:30`;

            // Создаём слот в hh:00
            await TimeSlot.create({
              service_id: svc.id,      // ID услуги, к которой привязан этот слот
              date: dateStr,           // Дата слота
              time: t1,                // Время “hh:00”
              is_available: true       // По умолчанию слот свободен
            });
            // Создаём слот в hh:30
            await TimeSlot.create({
              service_id: svc.id,
              date: dateStr,
              time: t2,
              is_available: true
            });
          }
        }
      }
      // Переходим к следующему дню
      currentDate = currentDate.add(1, 'day');
    }

    console.log('Тайм-слоты сгенерированы для всех услуг на месяц назад и вперёд (будни).');

    process.exit(0); // Выходим из процесса с кодом 0 (успех)
  } catch (err) {
    console.error('Ошибка при заполнении БД:', err);
    process.exit(1); // Выходим с кодом 1 (ошибка)
  }
}

seed(); // Вызываем функцию seed для выполнения всего описанного выше

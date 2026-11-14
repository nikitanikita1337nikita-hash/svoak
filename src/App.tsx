import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import { extraQuestionBank } from './extraQuestions';

const categories = [
  'История', 'География', 'Кино', 'Музыка', 'Видеоигры',
  'Спорт', 'Наука', 'Технологии', 'Мемы', 'Интернет',
  'Еда', 'Автомобили', 'Литература', 'Математика', 'Космос',
  'Животные', 'Природа', 'Мифология', 'Мультфильмы', 'Аниме',
  'Сериалы', 'YouTube', 'Блогеры', 'Социальные сети', 'Россия',
  'Страны мира', 'Изобретения', 'Знаменитости', 'Экономика',
  'Архитектура', 'Искусство', 'Мода', 'Медицина', 'Химия',
  'Физика', 'Биология', 'Настольные игры', 'Компьютеры',
  'Кулинария', 'Космические миссии', 'Олимпийские игры',
  'Футбол', 'Баскетбол', 'Авиация', 'История технологий',
  'Рекорды мира', 'Загадки', 'Поп-культура', 'СССР',
  'Общие знания'
];

const points = [100, 200, 300, 400, 500];
const MAX_PLAYERS = 7;

type Question = {
  question: string;
  answer: string;
};

const q = (...items: [string, string][]): Question[] =>
  items.map(([question, answer]) => ({ question, answer }));

const questionBank: Record<string, Question[]> = {
  'История': q(
    ['В каком году началась Вторая мировая война?', 'В 1939 году.'],
    ['Кто был первым президентом России?', 'Борис Ельцин.'],
    ['Как назывался корабль Колумба?', 'Санта-Мария.'],
    ['В каком году отменили крепостное право в России?', 'В 1861 году.'],
    ['Кто основал книгопечатание на Руси?', 'Иван Фёдоров.']
  ),
  'География': q(
    ['Столица Австралии?', 'Канберра.'],
    ['Самый большой океан?', 'Тихий океан.'],
    ['На каком материке находится Египет?', 'В Африке.'],
    ['Какая река традиционно считается самой длинной в мире?', 'Нил.'],
    ['Какая страна имеет форму сапога?', 'Италия.']
  ),
  'Кино': q(
    ['Как зовут директора Хогвартса?', 'Альбус Дамблдор.'],
    ['Как называется страна Чёрной Пантеры?', 'Ваканда.'],
    ['Кто снял фильм «Титаник»?', 'Джеймс Кэмерон.'],
    ['Как зовут главного героя фильма «Один дома»?', 'Кевин Маккаллистер.'],
    ['Как называется школа волшебства в «Гарри Поттере»?', 'Хогвартс.']
  ),
  'Музыка': q(
    ['Сколько струн у стандартной гитары?', 'Шесть.'],
    ['Кто руководит оркестром?', 'Дирижёр.'],
    ['Из какой страны группа ABBA?', 'Из Швеции.'],
    ['Сколько клавиш у стандартного фортепиано?', '88.'],
    ['Как называется музыкальный знак тишины?', 'Пауза.']
  ),
  'Видеоигры': q(
    ['Как зовут героя серии игр The Legend of Zelda?', 'Линк.'],
    ['В какой игре строят из блоков и добывают ресурсы?', 'Minecraft.'],
    ['Какая компания создала PlayStation?', 'Sony.'],
    ['Как зовут усатого героя игр Nintendo?', 'Марио.'],
    ['В какой игре есть королевская битва и строительство?', 'Fortnite.']
  ),
  'Спорт': q(
    ['Сколько игроков одной команды на поле в футболе?', '11.'],
    ['В каком спорте используют ракетку и волан?', 'Бадминтон.'],
    ['Сколько колец на олимпийском флаге?', 'Пять.'],
    ['Как называется площадка для хоккея?', 'Каток.'],
    ['Сколько очков дают за бросок из-за трёхочковой линии?', 'Три.']
  ),
  'Наука': q(
    ['Какая планета ближе всего к Солнцу?', 'Меркурий.'],
    ['Какой газ необходим человеку для дыхания?', 'Кислород.'],
    ['Сколько ног у паука?', 'Восемь.'],
    ['Как называется центр атома?', 'Ядро.'],
    ['Какой орган перекачивает кровь?', 'Сердце.']
  ),
  'Технологии': q(
    ['Как расшифровывается HTML?', 'HyperText Markup Language.'],
    ['Кто создал Windows?', 'Компания Microsoft.'],
    ['Как называется устройство для перемещения курсора?', 'Компьютерная мышь.'],
    ['Что такое Wi-Fi?', 'Технология беспроводной передачи данных.'],
    ['Как называется мозг компьютера?', 'Процессор.']
  ),
  'Мемы': q(
    ['Как называется мем с собакой породы сиба-ину?', 'Doge.'],
    ['Как называется мем с улыбающимся мужчиной, скрывающим боль?', 'Hide the Pain Harold.'],
    ['Какой мем изображает двух одинаковых Человеков-пауков?', 'Spider-Man Pointing.'],
    ['Что означает слово «рофл»?', 'Сильный смех, шутка.'],
    ['Что такое рикролл?', 'Неожиданная ссылка на клип Rick Astley.']
  ),
  'Интернет': q(
    ['Как называется адрес страницы в интернете?', 'URL.'],
    ['Как называется программа для просмотра сайтов?', 'Браузер.'],
    ['Что означает HTTP?', 'HyperText Transfer Protocol.'],
    ['Как называется скрытая часть интернета, доступная через специальные сети?', 'Даркнет.'],
    ['В каком году был запущен первый сайт?', 'В 1991 году.']
  ),
  'Еда': q(
    ['Из какой страны родом пицца?', 'Из Италии.'],
    ['Какой основной ингредиент у гуакамоле?', 'Авокадо.'],
    ['Из чего делают тофу?', 'Из соевых бобов.'],
    ['Как называется японское блюдо из риса и морепродуктов?', 'Суши.'],
    ['Какой фрукт является основой традиционного лимонада?', 'Лимон.']
  ),
  'Автомобили': q(
    ['Какая марка выпускает Mustang?', 'Ford.'],
    ['В какой стране появился бренд Ferrari?', 'В Италии.'],
    ['Что измеряется в лошадиных силах?', 'Мощность двигателя.'],
    ['Как называется система предотвращения блокировки колёс?', 'ABS.'],
    ['Какая компания производит модель Corolla?', 'Toyota.']
  ),
  'Литература': q(
    ['Кто написал роман «Война и мир»?', 'Лев Толстой.'],
    ['Кто создал Шерлока Холмса?', 'Артур Конан Дойл.'],
    ['Как зовут героя романа «Преступление и наказание»?', 'Родион Раскольников.'],
    ['Кто написал «Мастер и Маргарита»?', 'Михаил Булгаков.'],
    ['Как называется страна из «Путешествий Гулливера»?', 'Лилипутия.']
  ),
  'Математика': q(
    ['Сколько будет 12 × 12?', '144.'],
    ['Как называется результат сложения?', 'Сумма.'],
    ['Сколько градусов в прямом угле?', '90.'],
    ['Как называется число, на которое делят другое?', 'Делитель.'],
    ['Чему равно число пи, округлённое до сотых?', '3,14.']
  ),
  'Космос': q(
    ['Какая звезда находится ближе всего к Земле?', 'Солнце.'],
    ['Как называется естественный спутник Земли?', 'Луна.'],
    ['Какая планета известна своими кольцами?', 'Сатурн.'],
    ['Как называется наша галактика?', 'Млечный Путь.'],
    ['Какая планета Солнечной системы самая большая?', 'Юпитер.']
  ),
  'Животные': q(
    ['Какое животное называют кораблём пустыни?', 'Верблюд.'],
    ['Как называется детёныш лошади?', 'Жеребёнок.'],
    ['Какое млекопитающее умеет летать?', 'Летучая мышь.'],
    ['Какая самая крупная кошка в мире?', 'Тигр.'],
    ['Сколько сердец у осьминога?', 'Три.']
  ),
  'Природа': q(
    ['Как называется превращение воды в пар?', 'Испарение.'],
    ['Какое хвойное дерево сбрасывает иголки осенью?', 'Лиственница.'],
    ['Как называется наука о растениях?', 'Ботаника.'],
    ['Какой слой атмосферы защищает Землю от ультрафиолета?', 'Озоновый слой.'],
    ['Как называется самое глубокое озеро мира?', 'Байкал.']
  ),
  'Мифология': q(
    ['Кто был верховным богом Древней Греции?', 'Зевс.'],
    ['Как звали бога моря в Древней Греции?', 'Посейдон.'],
    ['Как назывался молот Тора?', 'Мьёльнир.'],
    ['Кто охранял вход в подземное царство?', 'Цербер.'],
    ['Как звали египетского бога солнца?', 'Ра.']
  ),
  'Мультфильмы': q(
    ['Как зовут главного героя мультфильма «Шрек»?', 'Шрек.'],
    ['Как зовут мышонка Disney?', 'Микки Маус.'],
    ['В каком мультфильме звучит песня «Отпусти и забудь»?', '«Холодное сердце».'],
    ['Как зовут львёнка из «Короля Льва»?', 'Симба.'],
    ['В каком городе живёт Губка Боб?', 'Бикини-Боттом.']
  ),
  'Аниме': q(
    ['Как зовут главного героя аниме «Наруто»?', 'Наруто Узумаки.'],
    ['Как называется команда Луффи в «Ван-Пис»?', 'Пираты Соломенной Шляпы.'],
    ['Как называется жанр аниме про гигантских роботов?', 'Меха.'],
    ['Как зовут героя «Тетради смерти»?', 'Лайт Ягами.'],
    ['Какая студия создала «Унесённые призраками»?', 'Studio Ghibli.']
  ),
  'Сериалы': q(
    ['В каком городе живут герои сериала «Друзья»?', 'В Нью-Йорке.'],
    ['Как зовут главного героя «Во все тяжкие»?', 'Уолтер Уайт.'],
    ['Как называется континент из «Игры престолов»?', 'Вестерос.'],
    ['Как зовут шерифа из «Очень странных дел»?', 'Джим Хоппер.'],
    ['Как называется кафе из сериала «Друзья»?', 'Central Perk.']
  ),
  'YouTube': q(
    ['Как называется награда YouTube за 100 тысяч подписчиков?', 'Серебряная кнопка.'],
    ['В каком году был запущен YouTube?', 'В 2005 году.'],
    ['Как называется короткий вертикальный формат видео YouTube?', 'YouTube Shorts.'],
    ['Как называют автора собственного канала?', 'Автор канала или блогер.'],
    ['Как называется платная подписка YouTube без рекламы?', 'YouTube Premium.']
  ),
  'Блогеры': q(
    ['Как называют автора, который регулярно публикует видео?', 'Видеоблогер.'],
    ['Как называется совместное видео двух блогеров?', 'Коллаборация.'],
    ['Что такое стрим?', 'Прямая трансляция.'],
    ['Как называется рекламная вставка в ролике?', 'Рекламная интеграция.'],
    ['Как называют людей, которые следят за блогером?', 'Подписчики.']
  ),
  'Социальные сети': q(
    ['Какая соцсеть известна короткими видео?', 'TikTok.'],
    ['Как называется публикация Instagram, исчезающая через сутки?', 'Stories.'],
    ['Как называется личное сообщение в Instagram?', 'Direct.'],
    ['Как раньше называлась социальная сеть X?', 'Twitter.'],
    ['Как называется подтверждение подлинности аккаунта?', 'Верификация.']
  ),
  'Россия': q(
    ['Какой город является столицей России?', 'Москва.'],
    ['Как называется самая длинная река России?', 'Лена.'],
    ['Какой город называют Северной столицей?', 'Санкт-Петербург.'],
    ['В каком году была принята действующая Конституция России?', 'В 1993 году.'],
    ['Как называется самая высокая гора России?', 'Эльбрус.']
  ),
  'Страны мира': q(
    ['Столица Японии?', 'Токио.'],
    ['Какая страна занимает целый континент?', 'Австралия.'],
    ['В какой стране находится Барселона?', 'В Испании.'],
    ['В какой стране сейчас самое большое население?', 'В Индии.'],
    ['Какое государство полностью окружено Италией?', 'Ватикан.']
  ),
  'Изобретения': q(
    ['Кто считается изобретателем телефона?', 'Александр Белл.'],
    ['Кто создал европейский печатный станок?', 'Иоганн Гутенберг.'],
    ['Какое изобретение братьев Райт изменило транспорт?', 'Самолёт.'],
    ['Кто усовершенствовал лампу накаливания для массового использования?', 'Томас Эдисон.'],
    ['Как называется аппарат для получения рентгеновских снимков?', 'Рентгеновский аппарат.']
  ),
  'Знаменитости': q(
    ['Кто сыграл Джека в фильме «Титаник»?', 'Леонардо Ди Каприо.'],
    ['Кто выпустил альбом «1989»?', 'Тейлор Свифт.'],
    ['Кто первым ступил на Луну?', 'Нил Армстронг.'],
    ['Кто известен под прозвищем CR7?', 'Криштиану Роналду.'],
    ['Кто написал картину «Мона Лиза»?', 'Леонардо да Винчи.']
  ),
  'Экономика': q(
    ['Как называется общий рост цен?', 'Инфляция.'],
    ['Как называется валюта Японии?', 'Иена.'],
    ['Что показывает ВВП?', 'Стоимость конечных товаров и услуг, произведённых в стране за период.'],
    ['Как называется ситуация, когда спрос превышает предложение?', 'Дефицит.'],
    ['Как называется центральный банк России?', 'Банк России.']
  ),
  'Архитектура': q(
    ['В каком городе находится Эйфелева башня?', 'Париж.'],
    ['Как называется стиль с массивными стенами и круглыми арками?', 'Романский стиль.'],
    ['Как называется верхняя часть здания в форме полусферы?', 'Купол.'],
    ['В каком городе находится Тадж-Махал?', 'Агра.'],
    ['Как называется вертикальная опора в архитектуре?', 'Колонна.']
  ),
  'Искусство': q(
    ['Кто написал картину «Звёздная ночь»?', 'Винсент ван Гог.'],
    ['Как называется искусство создания объёмных фигур?', 'Скульптура.'],
    ['Кто написал картину «Девятый вал»?', 'Иван Айвазовский.'],
    ['Как называется жанр изображения предметов быта?', 'Натюрморт.'],
    ['В каком музее находится «Мона Лиза»?', 'В Лувре.']
  ),
  'Мода': q(
    ['Какой дом моды основала Коко Шанель?', 'Chanel.'],
    ['Как называется показ новых коллекций одежды?', 'Модный показ.'],
    ['Из какой ткани обычно делают джинсы?', 'Деним.'],
    ['Как называется специалист, создающий коллекции одежды?', 'Дизайнер одежды.'],
    ['Как называется знаменитый бал моды в Нью-Йорке?', 'Met Gala.']
  ),
  'Медицина': q(
    ['Какой орган перекачивает кровь?', 'Сердце.'],
    ['Как называется врач, который лечит зубы?', 'Стоматолог.'],
    ['Как называется прибор для измерения температуры?', 'Термометр.'],
    ['Какой витамин организм вырабатывает под действием солнечного света?', 'Витамин D.'],
    ['Как называется исследование организма с помощью ультразвука?', 'УЗИ.']
  ),
  'Химия': q(
    ['Какой химический символ у золота?', 'Au.'],
    ['Как называется формула воды?', 'H₂O.'],
    ['Какой газ выделяется растениями при фотосинтезе?', 'Кислород.'],
    ['Как называется шкала кислотности?', 'Шкала pH.'],
    ['Какой элемент имеет атомный номер 6?', 'Углерод.']
  ),
  'Физика': q(
    ['В каких единицах измеряется сила?', 'В ньютонах.'],
    ['Какова приблизительная скорость света в вакууме?', '300 тысяч километров в секунду.'],
    ['Как называется сила, притягивающая тела к Земле?', 'Сила тяжести.'],
    ['Кто сформулировал закон всемирного тяготения?', 'Исаак Ньютон.'],
    ['Как называется частица света?', 'Фотон.']
  ),
  'Биология': q(
    ['Как называется наука о живых организмах?', 'Биология.'],
    ['Какая часть клетки содержит наследственную информацию?', 'Ядро.'],
    ['Как называется образование органических веществ на свету у растений?', 'Фотосинтез.'],
    ['Сколько хромосом обычно у человека?', '46.'],
    ['Как называется молекула, хранящая наследственную информацию?', 'ДНК.']
  ),
  'Настольные игры': q(
    ['Сколько клеток на шахматной доске?', '64.'],
    ['Как называется игра, в которой составляют слова из буквенных фишек?', 'Эрудит или Scrabble.'],
    ['Сколько костей используют в классических нардах?', 'Две.'],
    ['В какой игре покупают улицы и строят дома?', 'Монополия.'],
    ['Как называется ситуация, когда король не может избежать взятия?', 'Мат.']
  ),
  'Компьютеры': q(
    ['Как называется основная плата компьютера?', 'Материнская плата.'],
    ['Как расшифровывается CPU?', 'Central Processing Unit.'],
    ['Как называется временная память компьютера?', 'Оперативная память (RAM).'],
    ['Какая система счисления используется компьютерами?', 'Двоичная.'],
    ['Как называется программа, управляющая ресурсами компьютера?', 'Операционная система.']
  ),
  'Кулинария': q(
    ['Как называется приготовление пищи в кипящей воде?', 'Варка.'],
    ['Какой продукт является основой классического хумуса?', 'Нут.'],
    ['Как называется соус из масла, яиц и лимонного сока?', 'Голландский соус.'],
    ['Как называется нарезка овощей мелкими кубиками?', 'Брюнуаз.'],
    ['Какой рис традиционно используют для ризотто?', 'Арборио.']
  ),
  'Космические миссии': q(
    ['Как назывался первый искусственный спутник Земли?', 'Спутник-1.'],
    ['Кто был первым человеком в космосе?', 'Юрий Гагарин.'],
    ['Как называлась программа NASA, доставившая людей на Луну?', 'Аполлон.'],
    ['Как называется марсоход NASA, совершивший посадку в 2021 году?', 'Perseverance.'],
    ['Как называется космический телескоп, запущенный в 2021 году?', 'Телескоп Джеймса Уэбба.']
  ),
  'Олимпийские игры': q(
    ['Как часто обычно проводятся летние Олимпийские игры?', 'Раз в четыре года.'],
    ['Где прошли первые современные Олимпийские игры?', 'В Афинах, в 1896 году.'],
    ['Сколько колец на олимпийском символе?', 'Пять.'],
    ['Как называется спортсмен, несущий флаг страны на открытии?', 'Знаменосец.'],
    ['В каком году прошли первые зимние Олимпийские игры?', 'В 1924 году.']
  ),
  'Футбол': q(
    ['Сколько минут длится основное время матча?', '90 минут.'],
    ['Как называется удар с одиннадцатиметровой отметки?', 'Пенальти.'],
    ['Сколько игроков одной команды обычно на поле?', '11.'],
    ['Какая страна выиграла первый чемпионат мира в 1930 году?', 'Уругвай.'],
    ['Как называется ситуация, когда игрок забивает три гола?', 'Хет-трик.']
  ),
  'Баскетбол': q(
    ['Сколько игроков одной команды находится на площадке?', 'Пять.'],
    ['Сколько очков дают за штрафной бросок?', 'Одно.'],
    ['Сколько очков даёт бросок из-за трёхочковой линии?', 'Три.'],
    ['В какой лиге играет Los Angeles Lakers?', 'NBA.'],
    ['Как называется лишнее перемещение с мячом без ведения?', 'Пробежка.']
  ),
  'Авиация': q(
    ['Как называется передняя часть самолёта?', 'Носовая часть.'],
    ['Кто создал один из первых успешных самолётов?', 'Братья Райт.'],
    ['Как называется прибор для определения высоты полёта?', 'Высотомер.'],
    ['Какая часть самолёта создаёт основную подъёмную силу?', 'Крыло.'],
    ['Какой пассажирский самолёт известен как крупнейший серийный авиалайнер?', 'Airbus A380.']
  ),
  'История технологий': q(
    ['Как назывался первый персональный компьютер IBM?', 'IBM PC 5150.'],
    ['Кто основал Microsoft вместе с Полом Алленом?', 'Билл Гейтс.'],
    ['Как назывался первый iPhone?', 'iPhone первого поколения.'],
    ['В каком десятилетии появился World Wide Web?', 'В 1990-х годах.'],
    ['Как называлась ранняя электронная вычислительная машина общего назначения?', 'ENIAC.']
  ),
  'Рекорды мира': q(
    ['Какая самая высокая гора Земли над уровнем моря?', 'Эверест.'],
    ['Какое животное самое крупное из ныне живущих?', 'Синий кит.'],
    ['Какой океан самый большой по площади?', 'Тихий океан.'],
    ['Как называется самая большая жаркая пустыня?', 'Сахара.'],
    ['Какое здание считается самым высоким в мире?', 'Бурдж-Халифа.']
  ),
  'Загадки': q(
    ['Что можно увидеть с закрытыми глазами?', 'Сон.'],
    ['Чем больше из неё берёшь, тем больше она становится. Что это?', 'Яма.'],
    ['Что принадлежит тебе, но другие используют чаще?', 'Твоё имя.'],
    ['Что всегда идёт, но никогда не приходит?', 'Время.'],
    ['У чего есть города, леса и реки, но нет домов, деревьев и воды?', 'У карты.']
  ),
  'Поп-культура': q(
    ['В какой вселенной существуют Железный человек и Человек-паук?', 'Marvel.'],
    ['Как зовут волшебника с молнией на лбу?', 'Гарри Поттер.'],
    ['Как называется музыкальный конкурс европейских стран?', 'Евровидение.'],
    ['Как называется премия американской киноакадемии?', 'Оскар.'],
    ['Как называется знаменитый фестиваль комиксов в Сан-Диего?', 'Comic-Con.']
  ),
  'СССР': q(
    ['В каком году был образован СССР?', 'В 1922 году.'],
    ['Кто стал первым космонавтом СССР?', 'Юрий Гагарин.'],
    ['Как назывался первый искусственный спутник Земли?', 'Спутник-1.'],
    ['Как назывался автомобиль с маркой «Победа»?', 'ГАЗ-М-20.'],
    ['В каком году прекратил существование СССР?', 'В 1991 году.']
  ),
  'Общие знания': q(
    ['Сколько дней в високосном году?', '366.'],
    ['Какой язык имеет больше всего носителей как родной?', 'Китайский (мандаринский).'],
    ['Сколько цветов обычно выделяют в радуге?', 'Семь.'],
    ['Как называется прибор для измерения атмосферного давления?', 'Барометр.'],
    ['Какой металл находится в жидком состоянии при комнатной температуре?', 'Ртуть.']
  )
};

// Добавляем дополнительные вопросы из extraQuestions.ts
Object.entries(extraQuestionBank).forEach(([category, questions]) => {
  questionBank[category] = [
    ...(questionBank[category] || []),
    ...questions
  ];
});

type Player = {
  id: string;
  name: string;
  score: number;
};

type ActiveQuestion = {
  category: string;
  points: number;
  question: string;
  answer?: string;
  revealed: boolean;
  deadlineAt: number | null;
  expired: boolean;
};

type Room = {
  code: string;
  players: Player[];
  hostId: string;
  phase: 'lobby' | 'game';
  categories: string[];
  activeQuestion: ActiveQuestion | null;
  usedQuestions: string[];
  previousGameQuestions: string[];
  usedCells: string[];
  timerSeconds: number | null;
  serverNow?: number;
  clockOffset?: number;
};

const socket = io(
  import.meta.env.PROD
    ? window.location.origin
    : `http://${window.location.hostname}:3001`,
  { autoConnect: false }
);

export default function App() {
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [categorySearch, setCategorySearch] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      setSocketId(socket.id || null);
    };
    const handleDisconnect = () => {
      setConnected(false);
      setSocketId(null);
    };
    const handleRoomUpdate = (data: Room) => {
      const serverTime = Number(data.serverNow);
      setRoom({
        ...data,
        phase: data.phase || 'lobby',
        clockOffset: Number.isFinite(serverTime)
          ? serverTime - Date.now()
          : 0
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room-updated', handleRoomUpdate);
    socket.connect();
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-updated', handleRoomUpdate);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (room?.activeQuestion?.deadlineAt == null) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => clearInterval(interval);
  }, [room?.activeQuestion?.deadlineAt]);

  const isHost = !!room && !!socketId && room.hostId === socketId;

  const sortedPlayers = [...(room?.players || [])].sort(
    (a, b) => b.score - a.score
  );

  const createRoom = () => {
    setError('');

    socket.emit('create-room', name, (result: any) => {
      if (!result?.success) setError(result?.error || 'Операция не выполнена.');
    });
  };

  const joinRoom = () => {
    setError('');

    socket.emit('join-room', { code, name }, (result: any) => {
      if (!result?.success) setError(result?.error || 'Операция не выполнена.');
    });
  };

  const setTimer = (seconds: number | null) => {
    if (!room || !isHost) {
      setError('Изменять таймер может только ведущий.');
      return;
    }
    if (room.phase === 'game') {
      setError('Нельзя менять таймер после начала игры.');
      return;
    }

    setError('');
    socket.emit('set-timer', { code: room.code, seconds }, (result: any) => {
      if (!result?.success) setError(result?.error || 'Не удалось изменить таймер.');
    });
  };

  const updateCategories = (nextCategories: string[]) => {
    if (!room || !isHost) {
      setError('Выбирать категории может только ведущий.');
      return;
    }
    if (room.phase === 'game') {
      setError('Нельзя менять категории после начала игры.');
      return;
    }
    if (nextCategories.length > 6 || new Set(nextCategories).size !== nextCategories.length) {
      setError('Можно выбрать не более 6 разных категорий.');
      return;
    }

    setError('');
    socket.emit('set-categories', {
      code: room.code,
      categories: nextCategories
    }, (result: any) => {
      if (!result?.success) setError(result?.error || 'Не удалось сохранить категории.');
    });
  };

  const toggleCategory = (category: string) => {
    if (!room || !isHost || room.phase !== 'lobby') return;

    if (room.categories.includes(category)) {
      updateCategories(room.categories.filter(item => item !== category));
      return;
    }

    if (room.categories.length < 6) {
      updateCategories([...room.categories, category]);
    }
  };

  const startGame = () => {
    if (starting) return;

    if (!socket.connected) {
      setError('Нет соединения с сервером. Проверь, запущен ли node server.cjs.');
      return;
    }

    if (!room) {
      setError('Комната не найдена. Создай комнату заново.');
      return;
    }

    if (!isHost) {
      setError('Начать игру может только ведущий этой комнаты.');
      return;
    }

    if (room.phase !== 'lobby') {
      setError('Игра уже запущена.');
      return;
    }

    if (room.categories.length !== 6) {
      setError(`Выбрано ${room.categories.length} из 6 категорий. Выбери ещё ${6 - room.categories.length}.`);
      return;
    }

    setError('');
    setStarting(true);

    // Таймаут покажет ошибку, если на порту 3001 остался старый сервер,
    // в котором ещё нет обработчика события start-game.
    socket.timeout(6000).emit(
      'start-game',
      { code: room.code },
      (timeoutError: Error | null, result: any) => {
        setStarting(false);

        if (timeoutError) {
          setError('Сервер не ответил на запуск игры. Останови старый сервер (Ctrl+C) и снова выполни node server.cjs.');
          return;
        }

        if (!result?.success) {
          setError(result?.error || 'Сервер не смог запустить игру.');
          return;
        }

        // Сразу переключаем интерфейс ведущего; сервер также рассылает
        // обновлённую комнату всем участникам через room-updated.
        setRoom(current => current ? { ...current, phase: 'game' } : current);
        setError('');
      }
    );
  };

  const openQuestion = (category: string, index: number) => {
    if (!room || !isHost || room.phase !== 'game') return;

    const allQuestions = questionBank[category] || [];
    const used = new Set(room.usedQuestions || []);
    const previous = new Set(room.previousGameQuestions || []);

    const unused = allQuestions.filter(item =>
      !used.has(item.question) && !previous.has(item.question)
    );

    const available = unused.length
      ? unused
      : allQuestions.filter(item => !used.has(item.question));

    const cellKey = `${category}|${points[index]}`;

    if (room.usedCells?.includes(cellKey)) {
      setError('Этот вопрос уже использован.');
      return;
    }

    if (!available.length) {
      setError('В этой категории закончились вопросы.');
      return;
    }

    const question =
      available[Math.floor(Math.random() * available.length)];

    setError('');

    socket.emit('open-question', {
      code: room.code,
      category,
      points: points[index],
      question: question.question,
      answer: question.answer
    }, (result: any) => {
      if (!result?.success) setError(result?.error || 'Операция не выполнена.');
    });
  };

  const awardPoints = (playerId: string) => {
    if (!room || !isHost) return;

    socket.emit('award-points', {
      code: room.code,
      playerId
    }, (result: any) => {
      if (!result?.success) setError(result?.error || 'Операция не выполнена.');
    });
  };

  const finishQuestion = () => {
    if (!room || !isHost) return;

    socket.emit('finish-question', { code: room.code }, (result: any) => {
      if (!result?.success) setError(result?.error || 'Операция не выполнена.');
    });
  };

  const startNewGame = () => {
    if (!room || !isHost) return;

    if (!window.confirm('Начать новую игру? Очки всех игроков обнулятся.')) {
      return;
    }

    setError('');

    socket.emit('new-game', { code: room.code }, (result: any) => {
      if (!result?.success) setError(result?.error || 'Операция не выполнена.');
    });
  };

  const inviteLink = `${window.location.origin}/?room=${room?.code || ''}`;

  const visibleCategories = categories.filter(category =>
    category.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );

  if (!room) {
    return (
      <main className="app-shell entry-screen">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">С</div>
            <div>
              <div className="brand-name">СВОЯК</div>
              <div className="brand-caption">ИГРАЙ ГДЕ УДОБНО</div>
            </div>
          </div>

          <div className={`connection ${connected ? 'online' : ''}`}>
            <span className="status-dot" />
            {connected ? 'На связи' : 'Подключение...'}
          </div>
        </header>

        <section className="entry-content">
          <div className="eyebrow">МНОГОПОЛЬЗОВАТЕЛЬСКАЯ ВИКТОРИНА</div>
          <h1>СВОЯК <span>— игра начинается здесь.</span></h1>
          <p className="lead">
            Создай комнату, пригласи друзей и проверь, кто знает больше.
          </p>

          <div className="entry-card">
            <label htmlFor="player-name">ТВОЁ ИМЯ</label>

            <input
              id="player-name"
              className="game-input"
              placeholder="Например, Никита"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={24}
            />

            <button
              className="primary-button"
              onClick={createRoom}
              disabled={!connected || !name.trim()}
            >
              Создать комнату <span>→</span>
            </button>

            <div className="entry-divider">
              <span>ИЛИ ПРИСОЕДИНИТЬСЯ</span>
            </div>

            <input
              className="game-input"
              placeholder="Код комнаты"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
            />

            <button
              className="secondary-button full-width"
              onClick={joinRoom}
              disabled={!connected || !name.trim() || !code.trim()}
            >
              Войти в комнату
            </button>

            {error && <p className="error">{error}</p>}
          </div>
        </section>
      </main>
    );
  }

  const activeQuestion = room.activeQuestion;

  const remainingSeconds =
    activeQuestion?.deadlineAt != null
      ? Math.max(
          0,
          Math.ceil(
            (
              activeQuestion.deadlineAt -
              (now + (room.clockOffset || 0))
            ) / 1000
          )
        )
      : null;

  const timerText =
    remainingSeconds === null
      ? 'Без таймера'
      : `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">С</div>
          <div>
            <div className="brand-name">СВОЯК</div>
            <div className="brand-caption">ИГРАЙ ГДЕ УДОБНО</div>
          </div>
        </div>

        <div className={`connection ${connected ? 'online' : ''}`}>
          <span className="status-dot" />
          {connected ? 'На связи' : 'Нет соединения'}
        </div>
      </header>

      <section className="room-heading">
        <div className="eyebrow">
          {room.phase === 'game' ? 'ИДЁТ ИГРА' : 'ЛОББИ КОМНАТЫ'}
        </div>

        <h1>
          {room.phase === 'game'
            ? 'Время показать знания.'
            : <>Собираем <span>команду.</span></>}
        </h1>
      </section>

      {/* Открытый вопрос */}
      {activeQuestion ? (
        <div className="question-layout">
          <section className="panel question-panel">
            <div className="panel-kicker">
              ВОПРОС • {activeQuestion.category}
            </div>

            <div className="question-value">
              {activeQuestion.points} очков
            </div>

            <h2>{activeQuestion.question}</h2>

            {!activeQuestion.revealed && (
              <div className={`timer-display ${
                remainingSeconds !== null && remainingSeconds <= 10
                  ? 'timer-warning'
                  : ''
              }`}>
                {activeQuestion.expired ||
                (remainingSeconds !== null && remainingSeconds <= 0)
                  ? 'Время вышло!'
                  : timerText}
              </div>
            )}

            {isHost ? (
              <div className="host-answer">
                <div className="panel-kicker">ПРАВИЛЬНЫЙ ОТВЕТ</div>

                <div className="answer-text">
                  {activeQuestion.answer || 'Ответ не получен'}
                </div>

                <h3>
                  Кому начислить {activeQuestion.points} очков?
                </h3>

                <div className="award-list">
                  {room.players.map(player => (
                    <button
                      className="secondary-button"
                      key={player.id}
                      onClick={() => awardPoints(player.id)}
                    >
                      + {player.name}
                    </button>
                  ))}
                </div>

                <button
                  className="quiet-button"
                  onClick={finishQuestion}
                >
                  Закрыть вопрос без начисления
                </button>
              </div>
            ) : (
              <p className="muted">
                Ждём решения ведущего...
              </p>
            )}
          </section>

          <aside className="side-stack">
            <section className="panel compact-panel">
              <div className="panel-kicker">КОМНАТА</div>
              <div className="room-code">{room.code}</div>

              <button
                className="secondary-button full-width"
                onClick={() => navigator.clipboard?.writeText(inviteLink)}
              >
                Копировать ссылку
              </button>
            </section>

            <section className="panel compact-panel">
              <div className="panel-kicker">ИГРОКИ</div>
              <h2 className="panel-title">Таблица результатов</h2>

              {sortedPlayers.map((player, index) => (
                <div
                  className={`leaderboard-item ${index === 0 ? 'leader' : ''}`}
                  key={player.id}
                >
                  <span className="player-rank">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <strong>{player.name}</strong>
                  <span className="player-score">{player.score}</span>
                </div>
              ))}
            </section>
          </aside>
        </div>
      ) : room.phase === 'game' ? (
        /* Игровое поле */
        <div className="game-screen">
          <section className="panel board-panel">
            <div className="panel-kicker">ИГРОВОЕ ПОЛЕ</div>
            <h2 className="panel-title">Выбирай вопрос</h2>

            <div className="game-board">
              {room.categories.map(category => (
                <div className="game-column" key={category}>
                  <h3>{category}</h3>

                  {points.map((value, index) => {
                    const used = room.usedCells?.includes(
                      `${category}|${value}`
                    );

                    return isHost ? (
                      <button
                        key={value}
                        disabled={used}
                        className={used ? 'used-question' : ''}
                        onClick={() => openQuestion(category, index)}
                      >
                        {used ? '✓' : value}
                      </button>
                    ) : (
                      <div
                        className={`player-points ${
                          used ? 'used-question' : ''
                        }`}
                        key={value}
                      >
                        {used ? '✓' : value}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <p className="muted">
              {isHost
                ? 'Выбери стоимость вопроса, чтобы открыть его.'
                : 'Ведущий выбирает вопросы.'}
            </p>
          </section>

          <aside className="side-stack">
            <section className="panel compact-panel">
              <div className="panel-kicker">КОМНАТА</div>
              <div className="room-code">{room.code}</div>

              <button
                className="secondary-button full-width"
                onClick={() => navigator.clipboard?.writeText(inviteLink)}
              >
                Копировать ссылку
              </button>
            </section>

            <section className="panel compact-panel">
              <div className="panel-kicker">ИГРОКИ</div>
              <h2 className="panel-title">Таблица результатов</h2>

              {sortedPlayers.map((player, index) => (
                <div
                  className={`leaderboard-item ${
                    index === 0 ? 'leader' : ''
                  }`}
                  key={player.id}
                >
                  <span className="player-rank">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <strong>{player.name}</strong>
                  <span className="player-score">{player.score}</span>
                </div>
              ))}
            </section>

            {isHost && (
              <button
                className="quiet-button"
                onClick={startNewGame}
              >
                Новая игра
              </button>
            )}
          </aside>
        </div>
      ) : (
        /* Лобби — настройки и выбор категорий */
        <div className="room-layout">
          <div className="left-column">
            <section className="panel room-code-panel">
              <div className="panel-kicker">КОД КОМНАТЫ</div>

              <div className="code-row">
                <div>
                  <div className="room-code">{room.code}</div>
                  <p className="muted">Покажи этот код друзьям</p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => navigator.clipboard?.writeText(room.code)}
                >
                  Копировать
                </button>
              </div>
            </section>

            <section className="panel invite-panel">
              <div className="panel-kicker">ПРИГЛАШЕНИЕ</div>
              <h2>Собери друзей за одним игровым столом</h2>

              <p className="muted">
                Отправь ссылку или код комнаты участникам.
                Они смогут подключиться со своих телефонов.
              </p>

              <button
                className="secondary-button"
                onClick={() => navigator.clipboard?.writeText(inviteLink)}
              >
                Скопировать ссылку-приглашение
              </button>
            </section>

            <section className="panel players-panel">
              <div className="players-heading">
                <div>
                  <div className="panel-kicker">ПОДКЛЮЧИЛИСЬ</div>
                  <h2>
                    Игроки <span>{room.players.length}/{MAX_PLAYERS}</span>
                  </h2>
                </div>

                <div className="live-indicator">
                  <span className="status-dot" /> LIVE
                </div>
              </div>

              {room.players.length === 0 ? (
                <div className="empty-state">
                  Пока никого нет. Отправь друзьям код комнаты.
                </div>
              ) : (
                <div className="players-list">
                  {room.players.map((player, index) => (
                    <div className="player-line" key={player.id}>
                      <span className="player-rank">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <strong>{player.name}</strong>
                      <span className="player-score">
                        {player.score} очков
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="right-column">
            <section className="panel settings-panel">
              <div className="panel-kicker">НАСТРОЙ ИГРУ</div>
              <p className="role-hint">{isHost ? 'Вы ведущий — настройки доступны.' : 'Вы участник — настройки меняет ведущий.'} {connected ? 'Соединение активно.' : 'Нет соединения с сервером.'}</p>

              <div className="settings-title-row">
                <h2 className="panel-title">Настройки раунда</h2>

                {isHost && (
                  <button
                    className="quiet-button small"
                    onClick={startNewGame}
                  >
                    Новая игра
                  </button>
                )}
              </div>

              <div className="setting-group">
                <label>Категорий на поле</label>
                <div className="fixed-setting">
                  <strong>6 категорий</strong>
                  <span>5 вопросов в каждой теме</span>
                </div>
                <p className="setting-note">
                  Выбери шесть тем ниже — они появятся на игровом поле.
                </p>
              </div>

              <div className="setting-group">
                <label>Время на ответ</label>
                <div className="choice-grid three timer-choices">
                  <button
                    type="button"
                    className={`choice-button ${room.timerSeconds === 60 ? 'selected' : ''}`}
                    onClick={() => setTimer(60)}
                    disabled={!isHost || room.phase !== 'lobby'}
                    aria-pressed={room.timerSeconds === 60}
                  >
                    60 сек
                  </button>
                  <button
                    type="button"
                    className={`choice-button ${room.timerSeconds === 90 ? 'selected' : ''}`}
                    onClick={() => setTimer(90)}
                    disabled={!isHost || room.phase !== 'lobby'}
                    aria-pressed={room.timerSeconds === 90}
                  >
                    90 сек
                  </button>
                  <button
                    type="button"
                    className={`choice-button ${room.timerSeconds === null ? 'selected' : ''}`}
                    onClick={() => setTimer(null)}
                    disabled={!isHost || room.phase !== 'lobby'}
                    aria-pressed={room.timerSeconds === null}
                  >
                    Без таймера
                  </button>
                </div>
                {!isHost && <p className="setting-note">Таймер настраивает ведущий.</p>}
              </div>

              <div className="setting-group category-setting">
                <div className="category-heading">
                  <label>Выбери темы сам</label>
                  <span>{room.categories.length} из 6</span>
                </div>

                {isHost ? (
                  <>
                    <input
                      className="game-input search-input"
                      placeholder="Найти категорию..."
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                    />

                    <div className="category-tools">
                      <button
                        type="button"
                        className="secondary-button mini"
                        disabled={!isHost || room.phase !== 'lobby'}
                        onClick={() => {
                          const shuffled = [...categories]
                            .sort(() => Math.random() - 0.5)
                            .slice(0, 6);
                          updateCategories(shuffled);
                        }}
                      >
                        Случайный выбор
                      </button>

                      <button
                        type="button"
                        className="secondary-button mini"
                        disabled={!isHost || room.phase !== 'lobby'}
                        onClick={() => updateCategories([])}
                      >
                        Сбросить
                      </button>
                    </div>

                    <div className="category-list">
                      {visibleCategories.map(category => (
                        <button
                          type="button"
                          key={category}
                          aria-pressed={room.categories.includes(category)}
                          className={`category-option ${
                            room.categories.includes(category)
                              ? 'selected'
                              : ''
                          }`}
                          onClick={() => toggleCategory(category)}
                          disabled={
                            !isHost || room.phase !== 'lobby' ||
                            (!room.categories.includes(category) && room.categories.length >= 6)
                          }
                        >
                          <span className="fake-checkbox" aria-hidden="true" />

                          <span className="category-name">
                            {category}
                          </span>

                          <span className="question-count">
                            {(questionBank[category] || []).length} вопросов
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="selected-categories">
                    {room.categories.length ? (
                      room.categories.map(category => (
                        <span className="selected-chip" key={category}>
                          {category}
                        </span>
                      ))
                    ) : (
                      <p className="muted">
                        Ведущий пока выбирает категории...
                      </p>
                    )}
                  </div>
                )}

                <p className="setting-note">
                  Выбери ровно 6 категорий. Все игроки увидят выбранные темы.
                </p>
              </div>

              {isHost && (
                <button
                  type="button"
                  className="primary-button full-width"
                  onClick={startGame}
                  disabled={!isHost || starting || room.phase !== 'lobby' || room.categories.length !== 6}
                >
                  {starting
                    ? 'Запускаем игру...'
                    : room.categories.length === 6
                      ? 'Начать игру →'
                      : `Выбери ещё ${6 - room.categories.length} катег.`}
                </button>
              )}

              {!isHost && (
                <p className="muted">
                  Ожидаем, пока ведущий выберет категории и начнёт игру.
                </p>
              )}
            </section>
          </aside>
        </div>
      )}

      {error && <div className="error toast-error">{error}</div>}
    </main>
  );
}

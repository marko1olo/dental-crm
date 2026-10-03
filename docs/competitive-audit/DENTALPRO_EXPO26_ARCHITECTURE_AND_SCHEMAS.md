# ТЕХНИЧЕСКИЙ АУДИТ И РЕВЕРС-ИНЖИНИРИНГ РАСПИСАНИЯ DENTALPRO EXPO26
## Полная декомпиляция архитектуры, бандлов, схем данных, DnD и клинических статусов

> **Статус документа:** Исчерпывающий технический отчет по результатам полной декомпиляции JS-бандлов, CSS-таблиц, дампов DOM и перехваченных API-трасс нового расписания DentalPRO (expo26).
> **Дата аудита:** Октябрь 2026
> **Объект аудита:** Бандлы и дампы в `docs/competitive-audit/РЕВЕРС ИНЖИНИРИНГ DENTALPRO/expo26_new_schedule/`

---

## 1. СТЕК ТЕХНОЛОГИЙ И ВЕРХНЕУРОВНЕВАЯ АРХИТЕКТУРА

DentalPRO expo26 представляет собой **гибридное приложение переходного периода (Transitional Monolith)**, в котором поверх исторического PHP-бэкенда и jQuery/Backbone-оболочки развернут современный **React SPA модуль расписания**:

### 1.1. Базовые библиотеки и runtime
- **UI Framework:** **React 18 / 19 (React Fiber runtime)**. Входная точка в HTML монтируется через `.react-router-loader` с вызовом `ReactDOM.createRoot()`.
- **Сборщик:** **Webpack 5**. Весь код расписания упакован в один огромный монолитный бандл `/core/assets/build/vendor.js` объемом **5 071 583 байт (~5.1 МБ)**. 
- **Клиентский роутинг:** **React Router 6 (Data Router API)**:
  - Инициализация через `createBrowserRouter()` с декларативными роутами, `loader`-функциями и `HydrateFallback`.
  - Корневой роут: `/schedule` (загружает справочники через `/schedule/staticData`).
  - Дочерние роуты:
    - `/schedule/day` (однодневная сетка врачей/кресел).
    - `/schedule/three-days` (трехдневная сетка).
    - `/schedule/patient/search` (поиск пациента с автокомплитом по ФИО/телефону).
    - `/schedule/patient/record/:id` (пошаговый мастер записи пациента: `findIntervals` -> `foundIntervals` -> `completeRecord`).
    - `/schedule/record/service` (создание служебной записи / обеда / планерки).
    - `/schedule/record/edit/:id` (редактирование визита с выбором цвета `ScheduleColorPicker`).
    - `/schedule/patient/create` (быстрое заведение новой карты пациента).
- **Работа со временем:** **Day.js (модульная версия `Nl()`)**:
  - Подключена русская локаль `dayjs.locale("ru")`.
  - Переопределен прототип сериализации: `dayjs.prototype.toJSON = function() { return this.format("YYYY-MM-DD HH:mm:ss"); }`.
  - Расчет интервалов и тайм-зон с учетом `mvcfg.timezone_offset - dayjs().utcOffset()`.
- **Стилизация и UI-компоненты:** 
  - Базовый CSS-фреймворк: Bootstrap 5 + кастомная тема DentalPRO (`.btn-alt-primary`, `.btn-dp-icon`, `.btn-switcher`).
  - Модальные окна и алерты: SweetAlert (`swal`) + собственные вызовы оболочки `mivio.alertRemote()`.
  - Нотификации: Bootstrap-Notify + `mivio.notify()`.
- **Realtime шина данных (WebSockets & Push):**
  - Клиент: модуль `DpPush` (`push.39df256ba2404daa169ed8a49901b72a.js`).
  - Эндпоинт авторизации вебсокета: `GET /dppush/push/getConnectionString`.
  - Сервер Push: `wss://push.dental-pro.online/ws/<CLINIC_UUID>/<CLIENT_UUID>`.
  - События обновления: при изменении сетки в реальном времени триггерится событие `push-schedule-update`, на которое подписан React Router через хук `useRevalidator()`:
    ```javascript
    useEffect(() => {
      const onPush = () => revalidator.revalidate();
      $(document).on("push-schedule-update", onPush);
      return () => $(document).off("push-schedule-update", onPush);
    }, []);
    ```
  - Обновление задач колл-центра: событие `tickets:updated`.

---

## 2. АРХИТЕКТУРА СОСТОЯНИЯ РАСПИСАНИЯ

Состояние расписания управляется через комбинацию React Context и Data Loaders React Router.

### 2.1. Контексты приложения
1. **`ScheduleContext` (`dhA()` / `useLoaderData`):** хранит текущую загруженную модель дня/недели.
   - `options`: метаданные интервала (время начала, время конца, шаг сетки).
   - `columns`: массив активных колонок (врачи или кресла).
   - `cards`: массив карточек приёмов (пациентские и служебные).
   - `blocks`: массив графиков работы, обедов и блокировок.
2. **`ScheduleViewOptionsContext` (`ZfA()` / `VfA`):** хранит пользовательские настройки отображения:
   ```typescript
   interface ScheduleViewOptions {
     sidebarReduced: boolean;         // свернута ли левая колонка
     calendarReduced: boolean;        // свернут ли мини-календарь
     simpleMode: boolean;             // упрощенный режим (узкие колонки 50px)
     colorMode: boolean;              // режим окраски (по статусу vs по цвету врача)
     panelCallcenterReduced: boolean; // свернута ли панель задач на обзвон
   }
   ```
   Персистится в `localStorage` по ключу `"schedule.viewOptions"`.
3. **`SlotSelectionContext` (`rQA()` / `oQA`):** хранит активный выделенный мышью временной слот (для 1-кликового создания записи).
4. **`ActiveMenuContext` (`NQA()` / `FQA`):** контролирует открытые контекстные меню и тултипы карточек.

---

## 3. СТРУКТУРЫ ДАННЫХ (SCHEMAS & TYPESCRIPT DEFINITIONS)

### 3.1. Карточка приёма (Appointment / Card Schema)
```typescript
export interface DentalProAppointmentCard {
  id: number;                          // ID записи (recordID)
  doctorID: number;                    // ID врача
  chairID: number;                     // ID кресла
  dateStart: string;                   // "YYYY-MM-DD HH:mm:ss"
  dateEnd: string;                     // "YYYY-MM-DD HH:mm:ss"
  title: string;                       // ФИО пациента в кратком формате: "БОНДАРЧУК Ф. С."
  description: string | null;          // Назначенные услуги: "Удаление зуба, Имплантация Alpha-Bio DFI"
  comment: string | null;              // Служебный комментарий: "Часто опаздывает на приёмы"
  color: string;                       // HEX-код цвета карточки (по умолчанию #576d7c)
  borderColor: string | null;          // Акцентная граница карточки
  icons: DentalProCardIcon[];          // Массив иконок клинических и финансовых статусов
  
  // Метаданные всплывающего попапа и расширенные связи
  popover: {
    type: "record" | "service";        // Пациентский прием vs служебная запись
    title: string;                     // Полное ФИО и номер карты: "БОНДАРЧУК ФЕДОР СЕРГЕЕВИЧ [13]"
    paticardNumber: string;            // Номер амбулаторной карты 043/у
    body: string;                      // HTML-разметка тултипа (телефон, возраст, страховая, услуги)
    visitType: number;                 // 0 = обычный, 1 = консультация, 2 = операция
    branchName: string;                // Название филиала клиники
    doctorName: string;                // ФИО врача с должностью
    chairName: string;                 // Название кабинета/кресла: "Кресло 1/1 Хирургия"
    data: {
      record_id: string;               // ID записи в базе визитов
      client_id: string;               // ID пациента в базе cbase
      doctor_id: string;               // ID врача
      isFact: boolean;                 // Фактический визит (пациент в клинике)
      isDMS: boolean;                  // Страховой случай ДМС
      recordStartFlag: boolean;        // Прием начат
      cardLink: string;                // URL медкарты: "/cbase/detail.html?id=94&tab=..."
      options_mask: string;            // Битовая маска опций
      confirm_visit: number;           // 0 = не подтвержден, 1 = подтвержден пациентом
      call_by_robot: number;           // 1 = подтвержден голосовым роботом
      isVisitConfirmed: boolean;       // Статус подтверждения
      is_service_record?: boolean;     // Флаг служебной записи
    };
  };

  // Клинический профиль пациента
  patient?: {
    id: number;
    ages: number;                      // Возраст в годах
    birthday: string | null;           // Дата рождения
    cardNumber: string | null;         // Номер карты
    debt: number;                      // Финансовый долг пациента (в рублях)
  };
}
```

### 3.2. График работы врача, смены и блокировки (Blocks Schema)
```typescript
export interface DentalProBlock {
  id: number;                          // ID смены/блокировки
  type: "info" | "blocked";            // "info" = рабочая смена, "blocked" = закрытое время
  doctorID: number;                    // Врач
  chairID: number | null;              // Кресло (null для общих блокировок)
  dateStart: string;                   // "YYYY-MM-DD HH:mm:ss"
  dateEnd: string;                     // "YYYY-MM-DD HH:mm:ss"
  title: string;                       // Например: "Хирургов2 Х.Х. - Кресло 2/2 Хирургия"
  color: string | null;                // Цвет блока
  doctorColor: string | null;          // Персональный цвет врача
  borderColor: string | null;          // Граница
  assistants: Array<{                  // Назначенные ассистенты на смену
    id: number;
    name: string;
  }>;
}
```

### 3.3. Служебная запись (Service Record Schema)
Служебные записи (обед, планерка, техобслуживание, дезинфекция) используют ту же сетку, но имеют `popover.type = "service"`:
- `color`: желтый/янтарный для планерок и обедов (`#FFF59D` / `#FBC02D`).
- Поля: `commentForServiceTask`, `title`: "Обед" | "Планерка" | "Технический перерыв".
- Меню действий: добавление комментария и удаление через `POST /visits/ajax/deleteServiceRecord`.

---

## 4. ПОЛНАЯ ТАБЛИЦА СТАТУСОВ И КЛИНИЧЕСКИХ ИКОНОК (SCHI-1 .. SCHI-17)

В DentalPRO используется специальный векторный иконочный шрифт `schedule-icons.ttf` со стилевыми префиксами `.schi.schi-N`. На бэкенде сервер рассчитывает матрицу иконок для каждого приёма на основе медицинских данных пациента:

| Класс в CSS | Unicode глифа | Type в JSON API | Визуальный символ | Клиническое и операционное значение в стоматологии |
| :--- | :--- | :--- | :--- | :--- |
| `schi-1` | `\e008` | `locked` | 🔒 Замок | **Заблокированная запись**: защищена от случайного перемещения или редактирования без прав старшего администратора. |
| `schi-2` | `\e007` | `critical_disease` | ❄️ Снежинка / Звезда жизни | **Критическое заболевание / Отягощенный соматический статус**: у пациента в анамнезе зафиксированы тяжелые соматические патологии (аллергия на анестетики/пенициллин, гипертония, сахарный диабет, кардиостимулятор, бронхиальная астма, гепатит B/C, ВИЧ). Требует специального протокола безопасности. |
| `schi-3` | `\e006` | `record_reason` | ⚠️ / 📋 Блокнот / Внимание | **Особое клиническое требование к приёму**: специфика визита («Возможно понадобится анестезиолог», подготовка к седации, расширенная премедикация, сложная костная пластика). |
| `schi-4` | `\e005` | `first_record` | ⭐ Звезда (цвет `#00fbff`) | **Первичный пациент ("Первичка")**: пациент пришел в клинику в первый раз. Маркируется ярко-бирюзовой звездой. Требуется полный пакет документов: первичная консультация, анкета 043/у, ИДС, ОПТГ/КТ, фотопротокол. |
| `schi-5` | `\e004` | `insurance` | ❤️ Сердце / Щит ДМС | **Пациент по страховой (ДМС / ОМС)**: лечение по гарантийному письму страховой компании (АльфаСтрахование, СОГАЗ, Ингосстрах). Если класс `text-danger` — *«Отсутствуют активные документы, необходимо согласование»*. |
| `schi-6` | `\e003` | `create_date` | 📄 Лист / Договор | **Юридический статус договора**: `text-success` — договор на медицинские услуги подписан; `text-danger` — договор отсутствует или просрочен (*«Требуется оформить договор»*). |
| `schi-7` | `\e002` | `tickets` | 📞 Телефонная трубка | **Задача Колл-центра (Call-Center Task)**: задача на обзвон (подтверждение визита за 24ч, звонок заботы на следующий день после сложного удаления). Класс `callcentr-ticket-dontCreated` — задача еще не сформирована. |
| `schi-8` | `\e001` | `credit` | ✂️ Ножницы | **Рассрочка / Кредитный план лечения (Сплит)**: у пациента открыта банковская или клиникальная рассрочка (нарезка платежей на части для имплантации/ортодонтии). |
| `schi-9` | `\e000` | `age` | 👶 Лицо ребёнка | **Детский / Подростковый приём**: пациент младше 18 лет (*«Ребёнок 13 лет»*). На приеме обязательно присутствие законного представителя (родителя) для подписания ИДС по 323-ФЗ. |
| `schi-10` | `\e010` | `vip_manager` | 👤 Силуэт / Бейдж куратора | **Куратор лечения / Персональный менеджер**: за пациентом закреплен персональный куратор (сопровождение комплексных планов лечения All-on-4, тотального протезирования). |
| `schi-11` | `\e00f` | `unpayed` | 🔴 Красный круг / Долг | **Финансовая задолженность**: у пациента есть неоплаченные квитанции за предыдущие приемы (*«Не оплачено квитанций: N»*). |
| `schi-12` | `\e00e` | `pays` | 💼 Зеленый чемоданчик | **Оплата проведена (Касса закрыта)**: квитанция за данный прием полностью оплачена в кассе (наличные, карта, СБП). |
| `schi-14` | `\e00c` | `comments` | ✉️ Конверт / Сообщение | **Поведенческий комментарий**: предупреждение для ресепшена и ассистента (*«Часто опаздывает на приёмы»*, *«Очень нервный пациент»*, *«Боится уколов»*). |
| `schi-16` | `\e00a` | `workorder` | 🦷 Зуб / Наряд ЗТЛ | **Зуботехническая лаборатория (ЗТЛ)**: визит связан с лабораторным этапом (препарирование, снятие слепков, примерка коронки/каркаса, фиксация виниров). |
| `schi-17` | `\e009` | `collapsed` | ⋯ Многоточие | **Индикатор свернутых иконок**: отображается на ультракоротких карточках (< 26px / 15 минут), когда иконки не помещаются по высоте. |

---

## 5. МЕХАНИКА DRAG-AND-DROP И РАСЧЕТ СЕТКИ СЛОТОВ

В DentalPRO реализована **двойная механика манипуляции карточками**:
1. **Перемещение между слотами и креслами/врачами (Move):** нативный HTML5 Drag-and-Drop API.
2. **Изменение длительности приёма (Resize):** mouse-tracking через глобальные события `mousemove` / `mouseup`.

### 5.1. Геометрическая модель и расчет координат
- Базовая сетка настраивается параметрами `options`:
  - `interval`: шаг времени в минутах (обычно 15 минут).
  - `intervalHeight`: высота одного слота в пикселях (обычно 20px).
- Коэффициент масштаба времени (пикселей на минуту):
  $$	ext{minuteHeight} = rac{	ext{intervalHeight}}{	ext{interval}} = rac{20}{15} approx 1.333	ext{ px/min}$$
- Расчет вертикальной позиции слота ($Top$):
  $$	ext{top} = (	ext{dateStart} - 	ext{dayStart})_{	ext{minutes}} 	imes 	ext{minuteHeight}$$
- Расчет высоты карточки ($Height$):
  $$	ext{height} = (	ext{dateEnd} - 	ext{dateStart})_{	ext{minutes}} 	imes 	ext{minuteHeight}$$
- Позиционирование в DOM: карточка использует CSS-переменные:
  `style="--slot-position: 43; --slot-size: 2;"` либо абсолютные inline-стили `top: 320px; height: 80px;`.

### 5.2. Алгоритм изменения размера (Bottom Strip Resize)
На нижней кромке каждой карточки расположен невидимый интерактивный хитбокс:
`<div class="controlStrip"><div class="controlStripPanel controlStripBottom" /></div>`

1. **Захват (MouseDown):**
   - Запоминается начальная координата `this.resizeY = e.pageY`.
   - Запоминается исходная высота `this.height`.
   - Выставляется флаг блокировки клика `this.blockClick = true`.
2. **Тяга с привязкой к сетке (MouseMove & Snap to Grid):**
   - Рассчитывается смещение курсора: `deltaY = e.pageY - this.resizeY`.
   - Смещение квантуется по высоте интервала:
     ```javascript
     const intervalsCount = parseInt(deltaY / intervalHeight, 10);
     const snappedDelta = intervalsCount * intervalHeight;
     const newHeight = this.height + snappedDelta;
     ```
3. **Расчет коллизий со следующей записью (Collision Detection):**
   - Проверяется следующий соседний DOM-элемент (`nextSibling`):
     ```javascript
     let maxAllowedHeight = columnHeight - currentTop + intervalHeight;
     if (cardElem.nextSibling) {
       const nextTop = parseInt(cardElem.nextSibling.style.top, 10);
       maxAllowedHeight = nextTop - currentTop + intervalHeight;
     }
     if (newHeight < maxAllowedHeight) {
       cardElem.style.height = newHeight + "px";
       cardElem.style.minHeight = newHeight + "px";
     }
     ```
4. **Фиксация и подтверждение (MouseUp):**
   - Вычисляется новая длительность:
     ```javascript
     const newMinutes = parseInt((newHeight / intervalHeight) * interval, 10);
     const newTimeEnd = dayjs(task.date_start).add(newMinutes, "minutes").format("YYYY-MM-DD HH:mm:ss");
     ```
   - Открывается модальное окно подтверждения (`swal`):
     *«Изменить время записи на 14:00 - 15:30?»*
   - При подтверждении отправляется запрос:
     `POST /visits/ajax/dragNDropMoveRecord` с параметрами `{ recordID, timeBegin, timeEnd, doctorID / chairID }`.
   - При отмене — моментальный визуальный откат: `cardElem.style.height = originalHeight`.

### 5.3. Алгоритм Drag-and-Drop перемещения карточек
1. Карточка имеет атрибут `draggable="true"`.
2. В событии `onDragStart`:
   - `e.dataTransfer.setData("Text", task.id)`.
   - На следующем кадре анимации добавляется класс скрытия оригинала: `task.classList.add("js-dnd-hide")`.
3. Сетка времени (`fD`) состоит из строк-дропзон:
   - `onDragEnter`: подсвечивает целевую ячейку синим полупрозрачным фоном `rgba(74, 144, 226, 0.2)`.
   - `onDragLeave`: снимает подсветку.
   - `onDragOver`: вызывает `e.preventDefault()`, разрешая сброс.
4. В событии `onDrop`:
   - Извлекается `recordID = e.dataTransfer.getData("Text")`.
   - Рассчитывается новое время начала из координаты целевой ячейки.
   - Сохраняется точная исходная длительность визита (`duration = dateEnd - dateStart`).
   - Новое время конца: `timeEnd = newTimeStart + duration`.
   - Определяется контекст колонки (доктор `Mw` или кресло `Gw`).
   - Автоматический расчет отправки SMS пациенту: если до приёма осталось больше заданного порога `options.sendSmsHour`, чекбокс *«Отправить SMS о переносе»* активируется по умолчанию.
   - Вызывается диалог подтверждения `funcShowConfirmMove()`, отправляющий `POST /visits/ajax/dragNDropMoveRecord`.

---

## 6. МЕНЮ ДЕЙСТВИЙ И КОНТЕКСТНЫЕ ОПЕРАЦИИ (POPOVERS & ACTIONS)

Контекстное меню записи формируется массивом групп кнопок (`spA`):

1. **Группа I: Клинические разделы пациента**
   - `"Информация о пациенте"`: переход в карточку `/cbase/detail.html?id=${client_id}`.
   - `"Амбулаторная карта"`: быстрый переход в медкарту 043/у.
   - `"План лечения"`: открытие интерактивной зубной карты и планов `/medblock/toothsmap/index?id=${client_id}`.
2. **Группа II: Управление приёмом**
   - `"Информация о записи"`: модальное окно деталей визита `/visits/pages/appointmentInformation?id=${id}`.
   - `"Изменить запись"`: открытие мастера изменения `/schedule/record/edit/${id}`.
   - `"Копировать запись пациента"`: дублирование в буфер обмена `/visits/forms/copyRecord?recordID=${id}`.
3. **Группа III: Удаление**
   - `"Удалить"` (красный цвет): диалог отмены `/visits/forms/deleteScheduleRecord?id_record=${id}`.

Контекстное меню свободного слота (`RfA`):
- `"Служебная запись"`: переход на маршрут `/schedule/record/service` (добавление перерыва, обеда или техобслуживания).

---

## 7. РЕЕСТР СКРЫТЫХ И ВЫЯВЛЕННЫХ ЭНДПОИНТОВ API

| HTTP Метод | URL Эндпоинта | Заголовки / Формат | Описание и назначение |
| :--- | :--- | :--- | :--- |
| `GET` | `/schedule/staticData` | `Accept: application/json` | Загрузка справочников расписания (отделения, врачи с аватарами и цветами, кресла, филиалы, базовый интервал). |
| `GET` | `/schedule/day` | `Accept: application/ld+json` | Основной эндпоинт загрузки расписания на день. Возвращает `options`, `columns`, `blocks` и `cards`. |
| `GET` | `/schedule/three-days` | `Accept: application/ld+json` | Загрузка трехдневного расписания с разбивкой колонок по дням. |
| `GET` | `/schedule/callcenter/tickets` | `Accept: application/json` | Список актуальных задач колл-центра на обзвон пациентов (напоминания, подтверждения). |
| `GET` | `/schedule/recordform/clinicLoad` | `Accept: application/json` | Тепловая карта загрузки клиники по дням месяца (процент загрузки `load: 0..100` и класс `success/warning/danger`). |
| `GET` | `/schedule/recordform/getAppointments` | `appointmentsType, doctorIDS, clientID` | Получение доступных шаблонов приёмов и услуг из согласованного плана лечения пациента. |
| `GET` | `/dppush/push/getConnectionString` | `Accept: application/json` | Получение защищенного URL для подключения к WebSocket Push-серверу уведомлений. |
| `POST` | `/visits/ajax/dragNDropMoveRecord` | `recordID, timeBegin, timeEnd, doctorID/chairID, sendRecordSms` | Перемещение или растягивание приёма пациента по сетке расписания. |
| `POST` | `/visits/ajax/dragNDropMoveServiceRecord` | `recordID, timeBegin, timeEnd, doctorID/chairID` | Перемещение или растягивание служебной записи (обед, планерка). |
| `POST` | `/visits/ajax/deleteServiceRecord` | `id` | Удаление служебной записи из сетки. |
| `GET` | `/visits/forms/serviceRecord` | `date_start, date_end, doctorID` | HTML-форма создания служебного слота. |
| `GET` | `/visits/forms/copyRecord` | `recordID` | Модальная форма копирования записи на другую дату/время. |
| `GET` | `/visits/forms/deleteScheduleRecord` | `id_record` | Форма удаления визита с указанием причины отмены. |
| `GET` | `/visits/pages/appointmentInformation` | `id` | Полная сводка о приеме (анамнез, привязанные счета, наряды ЗТЛ). |
| `GET` | `/cbase/search` | `query` | Живой поиск по пациентам (ФИО, телефон, номер карты). |
| `GET` | `/stompro/scheduler/formAddInterval` | `doctorID, chairID, date, start, end` | Форма назначения смены врача в кресле. |

---

## 8. АРХИТЕКТУРНЫЕ ВЫВОДЫ И РЕКОМЕНДАЦИИ ДЛЯ DENTE (`apps/web/src/components/schedule/`)

Проведенный реверс-инжиниринг выявил как сильные находки DentalPRO, так и критические архитектурные слабости, которые мы обязаны устранить в нашем расписании DENTE:

### 8.1. Слабые места DentalPRO (Что мы НЕ копируем):
1. **Тяжелый раздутый бандл:** монолитный файл `vendor.js` на 5.1 МБ содержит тонны легаси-кода, Froala Editor, CanvasJS, Sip.js, Moment.js и устаревшие полифилы. Страница грузится секундами. В DENTE наш стек на React 19 + Vite весит в десятки раз меньше.
2. **Модальный ад и вызовы `mivio.alertRemote`:** вместо бесшовных современных шторок DentalPRO постоянно дергает AJAX-подгрузку устаревших HTML-диалогов поверх страницы, создавая модалки внутри модалок (грубейшее нарушение Мандата 8c).
3. **Хрупкий HTML5 DnD без сенсорной поддержки:** на планшетах iPad у кресла нативный браузерный Drag-and-Drop работает нестабильно, требуя костылей вроде `jui-touch-punch`. В DENTE мы используем легковесный сенсорно-ориентированный механизм с поддержкой Pointer Events и тач-жестов.

### 8.2. Превосходные решения DentalPRO (Что мы берем и внедряем в DENTE):
1. **Компактная матрица клинических бейджей:** 
   - Вывод на карточке визита строго информативных микро-иконок:
     * ❄️ **Отягощенный анамнез / Аллергия** (снежинка/звезда жизни).
     * ⭐ **Первичный пациент** (акцентный бейдж).
     * 📄 **Статус договора** (зеленый = подписан, красный = нет договора).
     * 💼 **Кассовый чек** (оплачено vs долг).
     * ✂️ **Рассрочка** (сплит).
     * 🦷 **Наряд ЗТЛ** (лабораторный этап).
     * 📞 **Задача обзвона**.
   - При высоте слота < 26px — изящное сворачивание в индикатор `⋯` (свернутые бейджи).
2. **Эргономичный переключатель группировки (Врачи vs Кресла):**
   - Возможность в 1 клик переключить вертикальные колонки: режим врачей (`jEA.doctor`) или режим кресел клиники (`jEA.chair`).
3. **Автоматический порог отправки SMS при переносе записи:**
   - Если визит переносится более чем за $N$ часов (например, за 12–24 часа), система автоматически предлагает уведомить пациента по SMS/WhatsApp без необходимости помнить об этом вручную.
4. **Интерактивная полоса текущего времени (Nowline):**
   - Плавное обновление положения красной полосы времени каждые 30 секунд с точным расчетом часового пояса клиники.
5. **Тепловая карта загрузки клиники в мини-календаре:**
   - Отображение цветных точек под датами месяца (зеленый = свободно, желтый = оптимально, красный = аншлаг) позволяет администратору мгновенно ориентироваться, куда направить звонящего пациента.

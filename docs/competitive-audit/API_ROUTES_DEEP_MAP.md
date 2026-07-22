# Полный Карта Бэкенд-Маршрутов API Dental CRM (Fastify 4+)

## 1. Пациенты, Лиды и Семейный баланс
- `GET /api/patients` — Получить список пациентов с фильтрацией (поиск по ФИО, телефону, статусу).
- `POST /api/patients` — Создать нового пациента.
- `GET /api/patients/:id` — Детальная карточка пациента.
- `PATCH /api/patients/:id` — Обновление данных пациента.
- `POST /api/patients/:id/archive` — Списание пациента в архив с указанием причины.
- `GET /api/leads` — Воронка лидов и первичных обращений.
- `POST /api/leads` — Создание нового лида (в т.ч. через вебхуки лендингов).
- `GET /api/waitlist` — Реестр листа ожидания приема.
- `POST /api/waitlist` — Добавление пациента в лист ожидания.
- `POST /api/finance-family/link` — Объединение пациентов в семейную группу.
- `GET /api/finance-family/:familyId/wallet` — Баланс общего семейного кошелька.

## 2. Расписание, Дневник смен и Онлайн-запись
- `GET /api/schedule/appointments` — Получить приемы для сетки расписания (фильтр по дате, врачу, креслу).
- `POST /api/schedule/appointments` — Создать запись на прием.
- `PATCH /api/schedule/appointments/:id` — Перенос, изменение статуса или отмена приема.
- `GET /api/diary/shifts` — График смен врачей и ассистентов.
- `POST /api/diary/shifts` — Сохранение смены сотрудника.
- `GET /api/public-booking/slots` — Публичные слоты для онлайн-записи (для сайтов-агрегаторов).

## 3. Приём (EHR), Одонтограмма и Голосовой ввод
- `GET /api/visits` — Журнал амбулаторных приемов.
- `POST /api/visits` — Открытие нового визита/приема.
- `GET /api/visits/:id` — Данные визита, протокол осмотра, наряд.
- `PATCH /api/visits/:id/draft/autosave` — Авто-сохранение черновика протокола приема.
- `POST /api/visits/:id/accept` — Официальное подписание визита врачом.
- `GET /api/odontogram/patient/:patientId` — Интерактивная одонтограмма пациента (32 зуба + молочная формула).
- `POST /api/odontogram/tooth-state` — Изменение статуса конкретного зуба (кариес, пломба, коронка, удален).
- `POST /api/speech/transcribe-chunk` — Распознавание речи врачебной диктовки через серверный шлюз STT.
- `GET /api/speech/status` — Мониторинг провайдеров распознавания речи (Yandex/Groq/OpenAI/Deepgram).

## 4. 3D DICOM MPR Viewer, Рентгенология & ИИ
- `GET /api/imaging/patient/:patientId` — Список КТ, ОПТГ и прицельных снимков пациента.
- `POST /api/imaging/upload` — Загрузка DICOM-файла или графического снимка.
- `GET /api/imaging/dicom-web/*` — DICOMWeb WADO-RS / QIDO-RS прокси для 3D MPRViewer (`ImagingView.tsx`).
- `POST /api/ai/analyze-study` — Запуск ИИ-анализа снимка на патологии (Diagnocat / Dente AI).
- `GET /api/xray/referrals` — Направления на КТ / Рентгенографию.

## 5. Документооборот, ИДС, Справки НДФЛ & ЕГИСЗ
- `GET /api/documents/patient/:patientId` — Список юридических документов пациента.
- `POST /api/documents/issue` — Генерация PDF-документа (Договор, ИДС, Акт, Смета).
- `POST /api/documents/ndfl/xml` — Формирование XML-справки налогового вычета по стандарту ФНС.
- `POST /api/egisz/export-cda` — Выгрузка структурированного электронного медицинского документа (СЭМД) в РЭМД ЕГИСЗ N3.Health.

## 6. Омниканальные Коммуникации (Telegram, WhatsApp, VK, АТС)
- `GET /api/communications/timeline/:patientId` — Хронологическая лента всех коммуникаций.
- `POST /api/communications/send` — Отправка сообщения пациенту.
- `POST /api/telegram/webhook` — Вебхук входящих сообщений Telegram-бота.
- `POST /api/whatsapp/webhook` — Вебхук WhatsApp Cloud API.
- `POST /api/vk/webhook` — Вебхук VK API.
- `POST /api/telephony/webhook` — Вебхук входящего/исходящего звонка АТС (UIS / Mango / Zadarma).

## 7. Финансы, Платежи, ККМ (54-ФЗ) & Расчет ЗП
- `GET /api/billing/ledger` — Финансовый журнал операций.
- `POST /api/billing/payment` — Проведение оплаты (наличные, карта, аванс, семейный кошелек).
- `POST /api/billing/fiscal-receipt` — Пробитие чека на онлайн-кассе 54-ФЗ с передачей тегов 1212/2108.
- `GET /api/payroll/calculate` — Расчет зарплаты и комиссии врачей за смену/месяц.

## 8. Склад, Стерилизация и Лаборатория
- `GET /api/inventory/items` — Опекунский остаток расходных материалов на складе.
- `POST /api/inventory/write-off` — Списание расходников на визит.
- `POST /api/sterilization/log` — Внесение партии автоклавирования в журнал стерилизации.
- `GET /api/lab/orders` — Реестр заказ-нарядов в зуботехнические лаборатории.

## 9. Умная Миграция Данных (Smart Imports)
- `POST /api/smart-imports/preview` — Предпросмотр структуры импортируемой базы конкурента (IDENT, DentalPRO, Инфоклиника).
- `POST /api/smart-imports/commit` — Выполнение фоновой миграции данных в PostgreSQL.

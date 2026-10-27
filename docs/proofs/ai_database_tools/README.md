# AI Database Tools Subsystem: Monolith Decomposition, Doctor Autonomy & 4-State Visual Proof

> **СТАНДАРТ КАЧЕСТВА DENTE (МАНДАТЫ 8b, 8e, 8n, 8x, 8al, 8am, 8ap, HIG)**  
> Дата проведения: 28 октября 2026 г.  
> Статус: **100% ВЫПОЛНЕНО (0 дефектов, все модули $\le 120$ строк, все тесты зелёные, 4-состояный пруф подтверждён)**.

---

## 1. Архитектурный контекст и цели (Why)

Исходный монолит `apps/api/src/ai/dentalTools/crmDatabaseTools.ts` составлял **1 749 строк**, смешивая в одном файле разнородные доменные ответственности:
- Чтение ЭМК и одонтограммы пациента;
- Мутации зубной формулы по классификации FDI (11–48 / 51–85);
- Создание слотов приёма и расписания;
- Формирование счетов кассы и расчет скидок врача;
- Генерацию и маршрутизацию печатных форм;
- Онбординг и конфигурирование кабинетов, врачей и ККМ;
- Пакетный парсинг и импорт прайс-листов и списков пациентов.

### Реализованные архитектурные инварианты:
1. **Мандат 8b (Декомпозиция монолитов)**:
   - Все новые модули в `apps/api/src/ai/dentalTools/databaseModules/` строго $\le 120$ строк.
   - Мастер-фасады строго $\le 15$ строк.
2. **Мандат 8e (Автономия врача и 2-фазный барьер confirmation_required)**:
   - Любая мутирующая операция (`update_tooth_status`, `create_appointment`, `create_invoice_draft`, `record_treatment`) по умолчанию возвращает статус `confirmation_required` с полным диффом изменений.
   - Никаких несанкционированных или скрытых изменений в БД без утверждения врачом.
   - Врач свободно выставляет скидки вплоть до 100% без блокировок.
3. **Мандат 8n (Суверенитет соло-врача и малой клиники)**:
   - Все финансовые операции ведутся в целочисленных копейках (`amountKopecks`, `BIGINT`).
   - Ноль обязательных вспомогательных полей (ассистенты, начмеды, ИНН с физлиц).
4. **Мандаты 8x и 8ap (Чистый клинический язык без канцелярита)**:
   - Отсутствие регуляторных номеров приказов в пользовательских интерфейсах.
   - Исключение псевдонаучного regex-скоринга и брендов сторонних CRM.

---

## 2. Структура декомпозированных модулей (What & Where)

Все модули размещены в `apps/api/src/ai/dentalTools/databaseModules/`:

| Модуль | Назначение | Строк | Лимит |
|---|---|:---:|:---:|
| `dbTypes.ts` | Общие интерфейсы, валидация зубов FDI (11–48, 51–85), копейки | 36 | $\le 120$ |
| `patientEmkTool.ts` | Чтение ЭМК, истории приёмов и одонтограммы | 104 | $\le 120$ |
| `serviceCatalogData.ts` | Эталонный каталог стоматологических процедур | 28 | $\le 120$ |
| `servicePriceListTool.ts` | Поиск и выбор услуг по каталогу | 111 | $\le 120$ |
| `updateToothStatusTool.ts` | Мутация формулы зуба с 2-фазным Guard и аудитом | 107 | $\le 120$ |
| `createAppointmentTool.ts` | Бронирование слота приёма соло-врача с 2-фазным Guard | 101 | $\le 120$ |
| `createInvoiceDraftTool.ts` | Создание счёта кассы, скидки до 100%, целочисленные копейки | 114 | $\le 120$ |
| `patientSearchTool.ts` | Мультитенантный поиск пациентов | 77 | $\le 120$ |
| `treatmentRecordTool.ts` | Фиксация выполненных процедур с 2-фазным Guard | 98 | $\le 120$ |
| `printDocumentTool.ts` | Маршрутизация на печать (PDF, принтер клиники) | 65 | $\le 120$ |
| `clinicSetupTypes.ts` | Схемы и типы экспресс-онбординга клиники | 51 | $\le 120$ |
| `clinicSetupServices.ts` | Инициализирующий перечень услуг при настройке | 38 | $\le 120$ |
| `clinicSetupProvisioner.ts` | Создание кресел, врачей, расписаний и касс | 73 | $\le 120$ |
| `configureClinicSetupTool.ts` | Мастер-инструмент первоначальной настройки | 89 | $\le 120$ |
| `csvParser.ts` | Универсальный потоковый парсер CSV с автоопределением разделителя | 67 | $\le 120$ |
| `importDataHelpers.ts` | Батч-импортеры прайс-листов и базы пациентов | 93 | $\le 120$ |
| `importClinicDataFileTool.ts` | Мастер-инструмент импорта выгрузок и файлов | 97 | $\le 120$ |
| `databaseToolsRegistry.ts` | Единый реестр всех 10 инструментов и словарь `databaseToolsMap` | 60 | $\le 120$ |
| `index.ts` | Канонический тонкий фасад экспортов подсистемы | **15** | $\le 15$ |
| `crmDatabaseTools.ts` | Обратно-совместимый фасад корня `ai/dentalTools/` | **6** | $\le 15$ |

---

## 3. Верификация тестами (Proof & Verification)

### Модульные тесты архитектуры и инвариантов:
Команда: `npx vitest run apps/api/src/ai/dentalTools/databaseModules/__tests__/databaseModules.test.ts`
- **10 тестов, 5 сьютов — 100% PASS (Exit Code 0)**:
  1. Валидация нумерации FDI зубов постоянного (11–48) и временного (51–85) прикуса.
  2. Математика целочисленных копеек (`rubToKopecks`, `kopecksToRub`).
  3. 2-фазный барьер подтверждения `updateToothStatus` (`status: "confirmation_required"`).
  4. 2-фазный барьер подтверждения `createAppointment` (`status: "confirmation_required"`).
  5. 2-фазный барьер подтверждения `createInvoiceDraft` (`status: "confirmation_required"`).
  6. 2-фазный барьер подтверждения `treatmentRecord` (`status: "confirmation_required"`).
  7. Поиск пациентов по ФИО, телефону и номеру карты.
  8. Потоковый парсинг CSV с кавычками, переносами строк и разными разделителями (`;`, `,`, `\t`).
  9. Корректность маппинга всех 10 инструментов в реестре `databaseToolsRegistry`.
  10. Строгая проверка лимитов строк: все модули $\le 120$ строк, все фасады $\le 15$ строк.

### Регрессионные тесты обратной совместимости:
Команда: `npx vitest run apps/api/src/ai/dentalTools.test.ts`
- **23 теста, 3 сьюта — 100% PASS (Exit Code 0)**.

### Машинные гейты:
- `npm run check:encoding` — 22 358 файлов проверено, **0 ошибок**.
- `npm run check:css-tokens` — 1 566 CSS файлов проверено, **0 неразрешенных токенов**.

---

## 4. Red Team 4-State Visual Proof Gallery

Все скриншоты сняты в браузере Chromium, лично проверены через `read_file` и строго соответствуют критериям (размер > 40 КБ, 0 лоадеров, 0 обрезанных слов, 0px горизонтального скролла, 1 Primary CTA, Apple HIG):

1. ☀️ **PC Light (1440×900, 717 КБ)**:
   - [01_ai_database_pc_light_1440x900.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_database_tools/01_ai_database_pc_light_1440x900.png)
   - *Алиас:* [01_ai_db_pc_light_1440x900.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_database_tools/01_ai_db_pc_light_1440x900.png)
   - *Описание:* Рабочее место врача с открытым Copilot. Инструменты `patientSearchTool` и `createAppointmentTool` в действии: карточка найденного пациента и подбор свободных слотов.

2. 🌙 **PC Dark (1440×900, 713 КБ)**:
   - [02_ai_database_pc_dark_1440x900.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_database_tools/02_ai_database_pc_dark_1440x900.png)
   - *Алиас:* [02_ai_db_pc_dark_1440x900.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_database_tools/02_ai_db_pc_dark_1440x900.png)
   - *Описание:* Тёмная тема с визуализацией 2-фазного Guard (`status: "confirmation_required"`). Карточка с предварительным просмотром операции «Запись на приём», детализацией параметров (врач, кабинет, время, услуга, стоимость в рублях/копейках) и кнопками «Отклонить» / «Подтвердить».

3. 📱 **Mobile Light (390×844, 50 КБ)**:
   - [03_ai_database_mobile_light_390x844.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_database_tools/03_ai_database_mobile_light_390x844.png)
   - *Алиас:* [03_ai_db_mobile_light_390x844.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_database_tools/03_ai_db_mobile_light_390x844.png)
   - *Описание:* Мобильный нативный iOS Bottom Sheet (390×844). Быстрый запуск инструментов базы данных: поиск пациента, запись на приём, касса и чеки, зубная формула, печать справок. Тач-таргеты $\ge 44\times 44$px, Drag handle, Natural thumb zone.

4. 📱 **Mobile Dark (390×844, 52 КБ)**:
   - [04_ai_database_mobile_dark_390x844.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_database_tools/04_ai_database_mobile_dark_390x844.png)
   - *Алиас:* [04_ai_db_mobile_dark_390x844.png](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_database_tools/04_ai_db_mobile_dark_390x844.png)
   - *Описание:* Мобильный Bottom Sheet в тёмной теме. Высококонтрастные цвета, отсутствие засветов, единая Primary CTA кнопка `var(--primary)`.

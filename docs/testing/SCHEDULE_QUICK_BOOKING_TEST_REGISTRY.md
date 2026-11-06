# 📅 SCHEDULE & 3-SECOND QUICK BOOKING: RED TEAM TEST REGISTRY

> 🏛️ **CANONICAL INQUISITION SSOT (MANDATES 8e, 8n, 8d/8zp, APPLE HIG):**  
> Реестр тестирования и инквизиции модуля расписания, быстрой записи у кресла (Chairside Quick Booking) и мобильного представления Agenda View клиники DENTE CRM.  
> Соответствует Конституции [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`.agents/MOBILE_DESIGN_APPLE_HIG.md`](file:///C:/Clinic_MVP/dental-crm/.agents/MOBILE_DESIGN_APPLE_HIG.md).

---

## 🧭 КЛЮЧЕВЫЕ АРХИТЕКТУРНЫЕ ИНВАРИАНТЫ

1. **Суверенитет соло-врача (Мандат 8n):**
   - Соло-врач (1–2 кресла) работает без ассистента. В селекторах быстрой записи ассистент скрыт по умолчанию (`isSoloClinic === true` или пустой ростер), поле строго опционально (`assistantUserId === null`).
2. **Автономия врача и запрет блокировок (Мандат 8e):**
   - Кнопка «Забронировать слот» / «Записать на приём» (`quick-drawer-save-btn`) **НИКОГДА** не блокируется (`disabled={false}`).
   - При отсутствии пациента — мягкий фокус на поле поиска с понятной подсказкой, без тупиков и без создания фиктивных мусорных пациентов.
3. **Идемпотентность транзакций (Мандаты 8d / 8zp):**
   - Каждое создание и изменение записи сопровождается клиентским `Idempotency-Key` (RFC 9562 UUIDv7) в заголовках HTTP-запроса и теле мутации (`idempotencyKey`, `clientMutationId`). Защита от дубликатов при двойном клике.
4. **Мобильная повестка дня Apple HIG (Мандаты 8b, 8al, 8aw):**
   - Экран $\le 768$px: суверенный 1-колоночный вертикальный таймлайн (Agenda View) с 0px горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
   - Сегментный переключатель `[ Сетка | Лента ]` и Apple iOS 7-дневная полоса `[ Сегодня | Завтра | + День ]` без срезания слов и наезда плашек.
   - Закрепленная плашка Floating Bottom Bar высотой 52px в нижней трети экрана (Natural Thumb Zone) с учетом `env(safe-area-inset-bottom)`.

---

## 🧪 СВОДНЫЙ РЕЕСТР ТЕСТОВЫХ СЬЮТОВ

| Файл сьюта | Тестов | Время | Статус | Проверяемый функционал |
| :--- | :---: | :---: | :---: | :--- |
| `apps/web/src/components/schedule/__tests__/redTeamSchedule3SecondBookingInquisition.test.tsx` | 7 | 26 мс | ✅ 100% PASS | 1-клик запись без ассистента, `disabled={false}`, UUIDv7 Idempotency-Key, защита от фиктивных пациентов, автосохранение черновика, переключение фильтров без сброса стейта, Apple HIG Segmented Controls. |
| `apps/web/src/components/schedule/__tests__/quickBookingSoloDoctor.test.tsx` | 14 | 24 мс | ✅ 100% PASS | Суверенитет соло-врача, дефолтные кабинеты, автовыбор дежурного врача. |
| `apps/web/src/components/schedule/__tests__/quickBookingAutonomyWave50.test.tsx` | 8 | 534 мс | ✅ 100% PASS | Автономия быстрой записи, мягкое разрешение конфликтов перекрытия слотов. |
| `apps/web/src/components/schedule/__tests__/scheduleQuickBookingAutonomyAndDutyDoctor.test.tsx` | 3 | 108 мс | ✅ 100% PASS | Автоподстановка врача смены, неблокирующие уведомления. |
| `apps/web/src/tests/scheduleMobileAgendaAppleHIG.test.ts` | 9 | 72 мс | ✅ 100% PASS | Apple HIG тач-мишени $\ge 44\times 44$px, Drag Handle, зубоспецифичные бейджи FDI, пассивная безопасность аллергий. |
| `apps/web/src/tests/scheduleRedTeamInquisition.test.ts` | 8 | 69 мс | ✅ 100% PASS | Анти-клиппинг, zero-overflow, устойчивость расписания при нуле кабинетов. |
| **ИТОГО** | **49** | **< 1 с** | **✅ 100% PASS** | **Полное покрытие ключевых путей бронирования и расписания** |

---

## 📸 4-СОСТОЯТЕЛЬНЫЙ ВИЗУАЛЬНЫЙ ПРУФ (RED TEAM 4-STATE VISUAL AUDIT)

Скриншоты сняты на живом стеке (Fastify API `http://127.0.0.1:4100` + Vite Web `http://127.0.0.1:5173`) и лично проинспектированы через `read_file` по 8 осям:

1. **☀️ PC Light (1440×900):**  
   - Файл: [`docs/proofs/schedule/01_schedule_grid_pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/schedule/01_schedule_grid_pc_light_1440x900.png) (131 КБ)  
   - Статус: **ИДЕАЛЬНО**. Ровно 1 Primary CTA («✓ Забронировать слот»), нулевой клиппинг на чипах кабинетов, контрастные статусы приёмов.
2. **🌙 PC Dark (1440×900):**  
   - Файл: [`docs/proofs/schedule/02_schedule_grid_pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/schedule/02_schedule_grid_pc_dark_1440x900.png) (125 КБ)  
   - Статус: **ИДЕАЛЬНО**. 100% темные токены без слепящих белых пятен, WCAG AAA контраст, читаемые карточки визитов.
3. **📱 Mobile Light (390×844):**  
   - Файл: [`docs/proofs/schedule/03_schedule_agenda_mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/schedule/03_schedule_agenda_mobile_light_390x844.png) (158 КБ)  
   - Статус: **ИДЕАЛЬНО**. Apple Drag Handle 36×5px, аккуратный переключатель `[ Сетка | Лента ]`, 0px горизонтального дрифта (`overflow-x: clip`), Floating Bottom Bar в зоне большого пальца.
4. **📱 Mobile Dark (390×844):**  
   - Файл: [`docs/proofs/schedule/04_schedule_agenda_mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/schedule/04_schedule_agenda_mobile_dark_390x844.png) (161 КБ)  
   - Статус: **ИДЕАЛЬНО**. Глубокий темный фон, четкие разделители карточек, полная адаптивность под экран iPhone 390×844.

---

## 🛠️ ВЫПОЛНЕННЫЕ МАШИННЫЕ ГЕЙТЫ (DOD)

1. `npm run check:encoding` ➔ Exit Code 0 (23 970 файлов проверено, без BOM).
2. `npm run check:stub-overrides` ➔ Exit Code 0 (перекрытий нет).
3. `npm run check:dynamic-imports` ➔ Exit Code 0 (529 динамических импортов проверено, 0 битых путей).
4. `npx vitest run apps/web/src/components/schedule/__tests__/redTeamSchedule3SecondBookingInquisition.test.tsx` ➔ Exit Code 0 (7 passed из 7, 26 мс).
5. 4-State Visual Proofs $\ge 40$ КБ в `docs/proofs/schedule/` лично открыты и проверены через `read_file`.

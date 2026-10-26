# Архитектурная спецификация: SanPiN & Sterilization Single Source of Truth (SSOT)

> **Статус**: ПРИНЯТО И ЗАФИКСИРОВАНО В ПРОДЕ  
> **Дата**: 26-27 октября 2026 г.  
> **Мандаты**: Mandate 8e (Doctor Autonomy), Mandate 8n (Solo-Doctor Sovereignty), Mandate 8am (Unified Design Code), Mandate 8al / Apple HIG.

---

## 1. Архитектурный контекст и выявленные дефекты

### 1.1 Рассогласование URL эндпоинтов (404 Error)
В модуле крафт-пакетов штрихкодов (`KraftPackageBarcodeModal.tsx`) вызов экспресс-фиксации автоклавирования направлялся на:
```http
POST /api/sanpin/sterilization/quick-norm
```
В то время как на бэкенде Fastify (`sterilizationRoutes.ts` и `sterilizationLegacyRoutes.ts`) маршрут был зарегистрирован как:
```http
POST /api/sanpin/sterilization/quick-norm-cycle
```
Это приводило к сетевой ошибке 404 при попытке оператора ЦСО или медсестры провести экспресс-автоклавирование партии пакетов.

### 1.2 Дублирование модальных окон автоклавирования
В системе существовали параллельные реализации модалок стерилизации:
- `apps/web/src/components/sanpin/autoclaveLog/SterilizationCycleModal.tsx`
- `apps/web/src/components/sanpin/autoclaveLog/SterilizationCycleDrawer.tsx`
- `apps/web/src/components/inventory/sterilizationCycle/SterilizationBatchCycleModal.tsx`

Это создавало рассинхронизацию логики: складской учет и санитарный журнал вели раздельные сущности циклов, нарушая принцип Single Source of Truth (SSOT).

### 1.3 Нарушения Мандата 8e (Заблокированные кнопки `disabled`)
В ряде компонентов санитарного режима кнопки были заблокированы (`disabled={isSubmitting}`, `disabled={isAutofilling}`), что противоречило верховному мандату автономии врача и персонала: медицинский персонал не должен ждать снятия блокировок интерфейса.

---

## 2. Архитектурное решение (SSOT Implementation)

### 2.1 Симметричные маршруты-алиасы в Fastify (`sterilizationRoutes.ts`)
В едином авторитетном файле маршрутов стерилизации Fastify зарегистрированы взаимозаменяемые псевдонимы (aliases):
- `POST /quick-norm` и `POST /quick-norm-cycle` — экспресс-автоклавирование по нормам СанПиН.
- `POST /` и `POST /cycle` — стандартная регистрация цикла автоклава.
- Дублирующие регистрации из `sterilizationLegacyRoutes.ts` удалены для исключения конфликтов роутера Fastify.

Контракт проверен модульным тестом:
`apps/api/src/tests/routes/sanpinSterilizationSsotAliases.test.ts`.

### 2.2 Унификация складского и санитарного интерфейса
Компонент `apps/web/src/components/inventory/sterilizationCycle/SterilizationBatchCycleModal.tsx` рефакторизован в тонкий фасад вокруг канонического `SterilizationCycleDrawer`:
- 1-клик утверждение пакетной стерилизации смены (134°C / 2.15 бар и 121°C / 1.15 бар).
- Автоматическое фоновое мягкое списание расходных материалов (крафт-пакеты, индикаторы ИнтеТЕСТ 4/5 класс, дезсредства) со склада с поддержкой овердрафта (Soft Negative Stock, Мандат 8n).
- Нулевое дублирование бизнес-логики: склад и СанПиН работают с общим реестром автоклавов и циклов.

### 2.3 Полная ликвидация `disabled` кнопок (Мандат 8e)
Все блокировки кнопок удалены в следующих компонентах:
1. `SanPinJournalBatchButtons.tsx`: кнопки пакетного утверждения смены доступны всегда; защита от повторного нажатия реализована через логический guard без атрибута `disabled`.
2. `SanPinJournalToolbarActions.tsx`: кнопка «Заполнить по нормам» и «Новый цикл» активны всегда.
3. `SanPinMobileCyclesCards.tsx`: мобильные карточки и Floating Action Bar свободны от блокировок.
4. `SanPinTableEmptyState.tsx`: быстрые действия в пустом состоянии всегда кликабельны.
5. `SanpinKraftPacketsTab.tsx` & `PsoMobileFloatingBar.tsx`: формы и плашки доступны для мгновенного ввода.
6. `GeneralCleaningModal.tsx`: протокол генеральной уборки сохраняется в 1 клик.
7. `SterilizationBatchCycleFooter.tsx`: модальное окно стерилизации не блокирует кнопки при сохранении.

---

## 3. Матрица визуального Red Team доказательства (4-State Proof)

Согласно Мандату 8ze, 8al и 8am проведено инструментальное тестирование и сняты реальные скриншоты в 4 состояниях (все файлы $\ge 127$ КБ):

| Состояние | Разрешение | Файл скриншота | Результат инспекции |
|---|---|---|---|
| ☀️ **PC Light** | 1440×900 | [`docs/proofs/sanpin/01_sanpin_autoclave_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sanpin/01_sanpin_autoclave_pc_light.png) | Ровно 1 Primary CTA «✓ Зафиксировать автоклавирование смены», чистая кнопка «+ Новый цикл», таблица циклов с индикаторами 5 класса ИнтеТЕСТ. |
| 🌙 **PC Dark** | 1440×900 | [`docs/proofs/sanpin/02_sanpin_autoclave_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sanpin/02_sanpin_autoclave_pc_dark.png) | Глубокий изумрудный темный фон, контрастность WCAG AAA, идеальная читаемость статусов и меток. |
| 📱 **Mobile Light** | 390×844 | [`docs/proofs/sanpin/03_sanpin_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sanpin/03_sanpin_mobile_light.png) | Сенсорные таргеты $\ge 44\times 44$px, зона большого пальца, 0px горизонтального скролла, сгруппированные карточки циклов. |
| 🌙 **Mobile Dark** | 390×844 | [`docs/proofs/sanpin/04_sanpin_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sanpin/04_sanpin_mobile_dark.png) | Нативная мобильная темная тема, четкое разделение блоков, отсутствие наложения на системные панели. |

---

## 4. Гейты верификации и автоматизированные тесты

Все машинные гейты пройдены со 100% результатом (Exit Code 0):
- **Тесты SanPiN фронтенда**: `npx vitest run apps/web/src/components/sanpin/` — 24 тест-сьюта, 258 тестов passed (100%).
- **Тесты алиасов стерилизации API**: `npx vitest run apps/api/src/tests/routes/sanpinSterilizationSsotAliases.test.ts` — passed (100%).
- **Кодировки UTF-8**: `npm run check:encoding` — 0 errors (21 637 файлов проверено).
- **CSS токены**: `npm run check:css-tokens` — 0 errors.
- **Лимиты строк CSS**: все 36 CSS файлов модуля SanPiN укладываются в лимит $\le 120$ строк (максимальный размер — 103 строки).

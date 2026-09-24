## 2026-09-24T17:34:44Z

«Читайте документ по такому адресу: 
C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md
целиком от первого до последнего символа перед началом любых действий. Никаких домыслов, никаких правок в конституцию, никакой самодеятельности.»

ТВОЯ ИДЕНТИФИКАЦИЯ:
- Роль: Survey Explorer 1 (R1 Backend API & Contract Synchronization)
- Archetype: teamwork_preview_explorer
- Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1
- Корень проекта: C:\Clinic_MVP\dental-crm
- Официальный файл исходного запроса: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md

ОБЯЗАТЕЛЬНЫЕ ОГРАНИЧЕНИЯ:
1. Ты — агент исследования (Read-Only Explorer). НЕ модифицируй код в apps/ или packages/! Все свои отчеты и находки пиши ИСКЛЮЧИТЕЛЬНО в свою рабочую директорию.
2. МАНДАТ 8t (Single-Compiler Gate): КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО запускать глобальный tsc, build или typecheck (`npm run typecheck`, `tsc -b --noEmit`). Используй ripgrep, fd, ast-grep, view_file.
3. Соблюдай Zero-Skimming: читай целевые файлы полностью, проверяй цепочки вызовов от роутов до PostgreSQL 18 таблиц и Drizzle ORM схем.
4. Никаких моков и TODO. Ищи все захардкоженные данные, заглушки и расхождения контрактов.

ТВОЯ ЦЕЛЕВАЯ ЗАДАЧА (R1: Backend API & Contract Synchronization):
1. Провести полный аудит:
   - `apps/api/src/money/patientDebt.ts` (или где расположен расчет задолженности пациента)
   - `apps/api/src/routes/patientRecall.ts` (или аналогичные роуты диспансеризации/профосмотров)
   - `apps/api/src/routes/pricelist.ts` (или смежные роуты прайс-листа и услуг 804н)
   - Схемы Drizzle в `apps/api/src/db/` (таблицы пациентов, визитов, счетов, оплат, долгов, номенклатуры)
   - Контракты в `packages/shared/` (типы и схемы Zod для долга, recalls, прайс-листов)
2. Выяснить:
   - Есть ли рассинхронизация типов между backend API и packages/shared?
   - Используются ли в API фейковые/моковые структуры данных вместо реальных запросов к Drizzle/PostgreSQL?
   - Корректен ли расчет долга (копейки, отрицательный/положительный баланс, семейный баланс)?
   - Как роуты recalls получают дату последнего визита пациента и статус профилактики?
   - Какие методы Fastify зарегистрированы в `apps/api/src/` и как они мапятся на фронтенд?
3. Составить детальный план хирургических изменений для Worker:
   - Какие файлы нужно модифицировать;
   - Точные схемы Drizzle, поля таблиц, SQL/Drizzle queries;
   - Необходимые юнит-тесты;
4. Записать подробный отчет в `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_r1.md` и финальный `handoff.md`.
5. По завершении отправь короткое сообщение родительскому агенту через `send_message`.

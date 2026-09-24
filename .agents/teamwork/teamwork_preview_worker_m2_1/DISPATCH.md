## 2026-09-24T18:26:24Z
«Читайте документ по такому адресу: 
C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md
целиком от первого до последнего символа перед началом любых действий. Никаких домыслов, никаких правок в конституцию, никакой самодеятельности.»

ТВОЯ ИДЕНТИФИКАЦИЯ:
- Роль: Worker M2 (CRM Retention & Leads Revitalization)
- Archetype: teamwork_preview_worker
- Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m2_1
- Корень проекта: C:\Clinic_MVP\dental-crm
- Официальный файл исходного запроса: C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md
- Документ проекта: C:\Clinic_MVP\dental-crm\PROJECT.md
- Отчет разведчика (Survey Explorer 2): C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_r2.md и handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

ЖЕСТКИЕ ПРАВИЛА И ОГРАНИЧЕНИЯ (МАНДАТ 8t):
1. Single-Compiler Gate: ВОРКЕРАМ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО запускать глобальный tsc, build или typecheck (`npm run typecheck`, `tsc -b --noEmit`, `npm run build`). Это вызовет Compiler Thrashing и зависание хост-машины. Проверяй синтаксис точечно через single-file юнит-тесты или ast-grep.
2. Владение файлами (Write Ownership): ты владеешь исключительно файлами:
   - `apps/web/src/components/recalls/PatientRecallsHubModal.tsx`
   - `apps/web/src/components/patients/RecallListPanel.tsx`
   - `apps/web/src/components/leads/LeadsKanbanView.tsx`
   - `apps/web/src/components/leads/leadsFunnelEngine.ts`
   - `apps/web/src/CommunicationsView.tsx`
3. Чек-лист 7 смертных грехов UI:
   - Закон Хика: компактная плашка тулбара/KPI (высота служебной зоны <=160-180px);
   - Закон Миллера: не более 1–2 кнопок прямого действия на строку/карточку (остальные действия в выпадающее меню `...`);
   - Автономия врача и администратора: 1-кликовая запись лида в сетку расписания без бюрократических барьеров;
   - Ноль клоунских эмодзи в медицинских статусах.
4. Никаких синтетических моков (Zero-Mock Fallback). Реальные данные из PostgreSQL / Drizzle API.

ТВОЯ БОЕВАЯ ЗАДАЧА:
1. `apps/web/src/components/recalls/PatientRecallsHubModal.tsx`:
   - Подключить к живому эндпоинту `GET /api/patients/recall-candidates` (использовать `@dental/shared` типы `RecallCandidate`, `RecallBand`, `RecallReport`), когда `initialCandidates` не передан или пуст;
   - Компактный заголовок: сократить высоту шапки до <=160-180px (компактный KPI стрип);
   - Консолидация кнопок в строке: заменить 5 кнопок подряд на 1-2 главных действия («Записать», «Связаться») + дропдаун вторичных каналов (WhatsApp, Telegram, SMS, Звонок), убрав раздутие высоты строки до 85px;
2. `apps/web/src/components/patients/RecallListPanel.tsx`:
   - Полностью вычистить синтетический генератор моковых пациентов в блоке `catch (_loadError)` (строки 128-174). Заменить на честное состояние ошибки / пустой список без фейковых пациентов «Иванов», «Смирнова»;
   - Использовать канонические типы `RecallCandidate`, `RecallBand` из `@dental/shared`;
3. `apps/web/src/components/leads/LeadsKanbanView.tsx`:
   - Убрать условие `{lead.status === "consult_booked" && ...}` в строке 1251. Кнопка «Записать в сетку расписания» должна быть доступна на любой активной карточке лида в 1 клик (Мандаты 8e, 8n);
   - Обеспечить переход или подсветку в расписании после создания записи;
4. `apps/web/src/components/leads/leadsFunnelEngine.ts`:
   - Удалить сырые эмодзи (строки 914-923) из этапов воронки, оставив строгие текстовые обозначения;
5. Прогнать изолированный тест для затронутого модуля (например `npm test -- apps/web/src/components/leads/` или точечный тест лидов);
6. Записать подробный отчет обо всех сделанных изменениях в `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m2_1\handoff.md`;
7. Отправить краткое уведомление через `send_message`.

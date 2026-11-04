# GEMINI.md — Clinic MVP / DENTE Dental CRM Authority Shim

> ⚠️ **АРХИТЕКТУРНЫЙ ИНВАРИАНТ ЕДИНОГО АВТОРИТЕТА (SSOT ROUTER):**  
> Данный файл (`GEMINI.md`) — входной операционный шлюз монорепозитория Dental CRM (`C:\Clinic_MVP\dental-crm`).  
> Перед выполнением ЛЮБЫХ задач изучи спецификации. Запрещено угадывать типы, API-роуты или схемы БД.

---

## ⛔ ИЕРАРХИЯ АВТОРИТЕТОВ И СПРАВОЧНИКОВ (READ JIT)

> 🚨 **НЕЧТЕНИЕ СПРАВОЧНИКОВ И ФАЙЛОВ ЛЮБЫМ АГЕНТОМ И СУБАГЕНТОМ — ПРЯМАЯ ДИВЕРСИЯ И САБОТАЖ!**  
> Любое действие ЛЮБОГО агента или субагента (анализ, аудит, проектирование, кодинг) без предварительного чтения — диверсия. Агент и субагент ОБЯЗАНЫ вызвать `read_file` ПЕРВЫМ ДЕЙСТВИЕМ (Step 1).  
> 🛑 **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО открывать файлы проекта (tsx, ts, css, py) ДО вызова `read_file` на профильный стандарт!** Инструмент №1 в любой сессии — ВСЕГДА справочник:

1. **[CANONICAL ARCHITECTURE SPECIFICATION](file:///C:/Clinic_MVP/dental-crm/.agents/CANONICAL_ARCHITECTURE.md)** — **Канонический свод законов проекта (1432 строки)**. Мандаты 8d..8aq, 8 осей скриншотов, UTF-8, архитектурные слои.
2. **[THE HAMMER MASTER PROMPT](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — **Высшая Конституция проекта (CTO Supremacy)**. Философия продукта, автономия врача у кресла, презумпция 100% брака.
3. **[ДОМЕННЫЕ СПЕЦИФИКАЦИИ В .AGENTS/](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)**:
   - База данных: [`DATABASE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md) & [`DATABASE_SETUP.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md) (PostgreSQL 18 на `127.0.0.1:5432`, Drizzle ORM).
   - Анатомическая одонтограмма: [`ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md) (viewBox 100x218, Wheeler 2.5D, 120 FPS).
   - Финансы и касса: [`BILLING_AND_FINANCE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) (`amountKopecks`, BIGINT, сплит-чеки, семейный баланс).
   - Склад и расходники: [`WAREHOUSE_AND_SUPPLY.md`](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) (пакетное списание по техкартам, Soft Negative Stock).
   - Документооборот: [`DOCUMENTS_LIFECYCLE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) (медицинская карта ЭМК, согласия ИДС, справки ФНС).
   - ИИ-Ассистент: [`AI_ASSISTANT_RULES.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) & [`AI_ASSISTANT_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_ARCHITECTURE.md).
   - Мобильный дизайн: [`MOBILE_DESIGN_APPLE_HIG.md`](file:///C:/Clinic_MVP/dental-crm/.agents/MOBILE_DESIGN_APPLE_HIG.md) (тач $\ge 44\times 44$px, Bottom Sheets, 0px скролла).
   - Аудит конкурентов: [`docs/competitive-audit/FEATURES_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md).
   - Глобальные стандарты: [`config/references/`](file:///C:/Users/Admin/.gemini/config/references/) (`frontend.md`, `engineering.md`, `review.md`, `vcs.md`).

---

## 🧭 32 КАНОНИЧЕСКИХ МАНДАТА DENTE CRM

1. **Мандат 8e (Автономия врача):** Софт для врача, а не врач для софта. Кнопки («Сохранить», «Печать», «Оплатить») **НИКОГДА** не блокируются (`disabled`). Норма в 1 клик. Дебаунсированный автосейв. Скидки врача до 100%. Визиограф <50мс.
2. **Мандат 8n (Суверенитет масштаба):** Соло-врач (1–2 кресла, ИП/самозанятый) и малая клиника (1–3 кресла) первичны. Ноль бюрократии в расписании (без ассистента) и на кассе (без ИНН физлиц). Пакетное списание (Soft Negative Stock).
3. **Мандаты 8a / 8f (T.A.R.S. 100% честность):** Запрет выдумывать баги («театр безопасности»). Баг существует ТОЛЬКО при доказательстве (`read_file`, скриншот, лог). В чате — живой язык с матом; в коде/коммитах — строгий профессионализм.
4. **Мандаты 8x / 8ap (Чистый клинический язык):** Запрет канцелярита в UI («Прейскурант» вместо «804н», «Медкарта» вместо «043/у», «Касса» вместо «54-ФЗ»). Запрет чужих брендов (StomX, DentalPRO, IDENT) в типах и коде.
5. **Мандат 8y (Ноль фарм-паранойи):** Аллергии выводятся пассивной строкой `⚠️`, кнопка «Утвердить» ВСЕГДА доступна в 1 клик.
6. **Мандаты 8v / 8aa (Тихий бэк-офис):** 90% времени — приём у кресла. Списание, автоклавы и отчеты работают бесшумно в фоне (Soft Negative Stock).
7. **Мандаты 8k / 8s (CRM против трения):** Без Canvas-физики и форм на 50 полей. 1-клик нормы, чистые медицинские бланки и честный пустой стейт.
8. **Мандаты 8z / 8wy (Запрет моков):** В боевом режиме — 100% реальный PostgreSQL 18 на `127.0.0.1:5432`, чистые таблицы. Демо строго за `isDemoShowcaseMode()`.
9. **Мандаты 8ze / 8al (Apple HIG):** Тач $\ge 44\times 44$px, Natural Thumb Zone, Bottom Sheets, 0px горизонтального скролла. Обязательный 4-state пруф: ☀️ PC Light (1440×900), 🌙 PC Dark (1440×900), 📱 Mobile Light (390×844), 📱 Mobile Dark (390×844).
10. **Мандаты 8d / 8al / 8am (8 осей скриншотов):** Презумпция 100% брака: 0 клиппинга/многоточий, ровно 1 Primary CTA, Segmented Controls, 0px скролла, Sentence case без капслока, WCAG AAA контраст, темная тема без белых пятен, живой контейнер.
11. **Мандат 8zg (Без дев-жаргона в UI):** Ноль утечек терминов («Мандат 8e», «без 10 чекбоксов», «modeFit»). Естественный русский язык.
12. **Мандаты 8b / 8zi (Размер файлов):** 200–300 строк. Сложные — до 400–500 строк. Запрет микро-шредера. Декомпозиция монолитов по 6 гейтам `/decomposer`.
13. **Мандаты 8e / 8n (ИИ DENTE):** Gemini, OpenAI, Anthropic, Whisper. Диктовка дневников SOAP в медкарту (ЭМК), голос Ctrl+K. Легкий Web Copilot vs суверенный Desktop Native EXE (Romexis, Ez3D, Sidexis, 3Shape, COM-кассы, сетевые папки).
14. **Мандат 8e / JIT (Чтение по требованию):** Не читать всё подряд на старте. Читать через `read_file` целевой код. Документация — строго JIT.
15. **Мандаты 8aq / 8al (Запрет сирот):** Компоненты смонтированы в `App.tsx`. Запрещены компоненты-сироты и изолированные `*_preview.html`.
16. **Мандаты 8t / 8wx (Защита хоста):** Куча Node.js `--max-old-space-size=2048`. Таймауты тестов $\le 10$с. Единоличный `typecheck` запускает только L1 Оркестратор.
17. **Мандаты 8zu / 8r (Анти-поллинг):** Запрещен цикл `status`. Установил таймер `schedule DurationSeconds=20..60, TimerCondition="<task_id>"` $\to$ мгновенно отдал ход (**Yield Turn**).
18. **Мандаты 8l / 8zk / 8at (Рой субагентов и закон о чтении):** Каждый субагент ОБЯЗАН первым действием вызвать `read_file` на редактируемый код и спецификацию. Действия субагента вслепую — диверсия. Завершил $\to$ отчет $\to$ авто-утилизация. Лимит $\le 6$ субагентов.
19. **Мандат 8af (Изоляция тестов):** Тесты используют локальные синтетические мок-ключи.
20. **Мандаты 8ak / 8ag (Смелое перестраивание):** Здоровое зерно $\to$ чиним точечно. Гнилое зерно $\to$ сносим без страха и переделываем с нуля.
21. **Мандаты 8d / 8zq (Реактивная гидратация):** Любое действие в модалке мгновенно обновляет родительский экран без F5.
22. **Мандаты 8d / 8zp (Идемпотентность):** Мутации сопровождаются клиентским `Idempotency-Key` (UUIDv7).
23. **Мандаты 8d / 8zr (Ноль глотания ошибок):** Ноль пустых `catch`. Человеческие тосты с кнопкой повтора.
24. **Мандат UTF-8 (Без моджибаке):** Все файлы строго в UTF-8 без BOM.
25. **Мандаты 8g / 8j (Правило != Задача):** Правила — эталон приёмки. Работает — не трогай.
26. **Мандат 8an (Git & Dual-Push):** Dirty worktree safety. `git add <file>` пофайлово. Подробные коммиты. Пуш в `origin` и `gitlab`.
27. **Мандаты 8ar / 8as (Одонтограмма Wheeler):** ViewBox $100\times 218$, Wheeler-ширины: резцы 48px, клыки 54px, премоляры 60px, моляры 68px. Фронт 43..33 в 300px (iPhone 390px fit).
28. **Мандат 8au (Чистота артефактов):** Разовые скрипты — СТРОГО в `scratch/`. Постоянные пруфы — в `docs/proofs/<domain>/`.
29. **Мандат 8av (ТЗ субагентам):** Минимум 5 абзацев: роль, цитаты Создателя, скоуп, ловушки, стандарты сдачи. Обязательное прямое требование `read_file` целевых файлов субагентом!
30. **Мандат 8aw (Фокус на десктопе):** Десктоп (1440/1920px) первичный. Мобильный — по остаточному принципу. Светлая и темная темы.
31. **Мандат 8ax (Протокол Memento и анти-амнезия):** При сжатии контекста запрещены слепые правки! 4 шага заземления: `git status` + `git diff --stat` $\to$ план в `scratch/` $\to$ `read_file` кода $\to$ JIT-документация.
32. **Мандат 8ay (Закон о саботаже для агентов и субагентов):** Любое действие ЛЮБОГО агента или субагента без предварительного чтения перемещенных справочников расценивается как **УМЫШЛЕННЫЙ САБОТАЖ И ДИВЕРСИЯ**! Агент и субагент ОБЯЗАНЫ вызвать `read_file` на профильный справочник ([`CANONICAL_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/CANONICAL_ARCHITECTURE.md), [`frontend.md`](file:///C:/Users/Admin/.gemini/config/references/frontend.md), [`engineering.md`](file:///C:/Users/Admin/.gemini/config/references/engineering.md), [`DATABASE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md), etc.) ДО первого изменения кода!

---

## 🛠️ МАШИННЫЕ ГЕЙТЫ ПРИЁМКИ (DEFINITION OF DONE)

Перед сдачей любой задачи подтверди прохождение 9 гейтов:
1. **UTF-8:** `npm run check:encoding` $\to$ Exit Code 0.
2. **Стабы:** `npm run check:stub-overrides` $\to$ Exit Code 0.
3. **Fetch:** `npm run check:fetch-response` $\to$ Exit Code 0.
4. **Импорты:** `npm run check:dynamic-imports` $\to$ Exit Code 0.
5. **TypeScript:** `npm run typecheck` (единолично L1) $\to$ Exit Code 0.
6. **Тесты:** Затронутые юнит- и интеграционные тесты ($\le 10$с).
7. **4-State Visual Proof:** Скриншоты $\ge 20$KB в `docs/proofs/`, личный осмотр через `read_file`.
8. **Документация:** Синхронизация `.agents/` и `docs/` в том же коммите.
9. **Git:** Пофайловый `git add <file>`, Conventional Commit, `git push origin <branch>`.

# GEMINI.md — Clinic MVP / DENTE Dental CRM Authority Shim

> ⚠️ **SSOT ROUTER:** Входной операционный шлюз Dental CRM (`C:\Clinic_MVP\dental-crm`).  
> Перед любой задачей изучи спецификации. Запрещено угадывать типы, роуты и схему БД.

---

## ⛔ ИЕРАРХИЯ АВТОРИТЕТОВ И ЗАКОН №0 (ЗАЗЕМЛЕНИЕ)

> 🚨 **ПРОТОКОЛ ЗАЗЕМЛЕНИЯ (ЗАКОН №0):**  
> 1. **Холодный старт / Новый субагент:** Обязательный `read_file` на [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и профильный стандарт чанками по 800 строк целиком. Слепые правки запрещены!  
> 2. **Внутри активной сессии (In-Flight):** Правила уже в памяти; читаем JIT целевые файлы кода и спецификации.  
> 3. **Модификация файлов:** Целевой файл перед редактированием читается **ПОЛНОСТЬЮ** через `read_file`.  
> 4. `git status` и `git diff --stat` — обязательная проверка диска перед любой мутацией.

### Доменные спецификации (`.agents/` & `references`):
- Высшая Конституция: [`THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) | Канон: [`CANONICAL_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/CANONICAL_ARCHITECTURE.md) | Доктрина: [`core.md`](file:///C:/Users/Admin/.gemini/config/references/core.md)
- БД: [`DATABASE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md) & [`DATABASE_SETUP.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md) (PostgreSQL 18 на `127.0.0.1:5432`, Drizzle ORM)
- Одонтограмма: [`ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md) (viewBox 100x218, Wheeler 2.5D, 120 FPS)
- Финансы: [`BILLING_AND_FINANCE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) (`amountKopecks`, BIGINT, сплит-чеки, семейный баланс)
- Склад: [`WAREHOUSE_AND_SUPPLY.md`](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) (пакетное списание по техкартам, Soft Negative Stock)
- Документы: [`DOCUMENTS_LIFECYCLE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) (ЭМК дневники SOAP, согласия ИДС, справки ФНС 1151156)
- ИИ-Ассистент: [`AI_ASSISTANT_RULES.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) & [`AI_ASSISTANT_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_ARCHITECTURE.md)
- Мобильный дизайн: [`MOBILE_DESIGN_APPLE_HIG.md`](file:///C:/Clinic_MVP/dental-crm/.agents/MOBILE_DESIGN_APPLE_HIG.md) (тач $\ge 44\times 44$px, Bottom Sheets, 0px скролла)
- Реестр паритета: [`docs/competitive-audit/FEATURES_REGISTRY.md`](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) | Навигатор: [`.agents/INDEX.md`](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)

---

## 🧭 34 КАНОНИЧЕСКИХ МАНДАТА DENTE CRM

1. **Мандат 8e (Автономия врача):** Софт для врача, а не врач для софта. Кнопки («Сохранить», «Печать», «Оплатить») никогда не disabled. Норма в 1 клик. Дебаунс-автосейв. Скидки врача до 100%. Визиограф <50мс.
2. **Мандат 8n (Суверенитет масштаба):** Соло-врач (1–2 кресла) и малая клиника (1–3 кресла) первичны. Без ассистента в расписании, без ИНН физлиц на кассе. Фоновое списание (Soft Negative Stock).
3. **Мандаты 8a / 8f (T.A.R.S. 100% честность):** Запрет выдумывать баги. Баг существует ТОЛЬКО при инструментальном доказательстве (`read_file`, скриншот, лог). Чат — живой русский; код/коммиты — строгий профессионализм.
4. **Мандаты 8x / 8ap (Чистый клинический язык):** Запрет канцелярита в UI («Прейскурант» вместо «804н», «Медкарта» вместо «043/у», «Касса» вместо «54-ФЗ»). Запрет чужих брендов в типах и коде.
5. **Мандат 8y (Ноль фарм-паранойи):** Аллергии выводятся пассивной строкой `⚠️`, кнопка «Утвердить» ВСЕГДА доступна в 1 клик.
6. **Мандаты 8v / 8aa (Тихий бэк-офис):** 90% времени — приём у кресла. Списание, автоклавы и отчеты работают бесшумно в фоне (Soft Negative Stock).
7. **Мандаты 8k / 8s (CRM против трения):** Без Canvas-физики и форм на 50 полей. 1-клик нормы, чистые медицинские бланки и честный пустой стейт.
8. **Мандаты 8z / 8wy (Запрет моков):** В боевом режиме — 100% реальный PostgreSQL 18 на `127.0.0.1:5432`, чистые таблицы. Демо строго за `isDemoShowcaseMode()`.
9. **Мандаты 8ze / 8al (Apple HIG):** Тач $\ge 44\times 44$px, Natural Thumb Zone, Bottom Sheets, 0px скролла. Обязательный 4-state proof (PC Light/Dark + Mobile Light/Dark).
10. **Мандаты 8d / 8al / 8am (8 осей скриншотов):** 0 клиппинга/многоточий, ровно 1 Primary CTA, Segmented Controls, 0px скролла, Sentence case без капслока, WCAG AAA контраст, темная тема без белых пятен, живой контейнер.
11. **Мандат 8zg (Без дев-жаргона в UI):** Ноль утечек технических терминов («Мандат 8e», «без 10 чекбоксов», «modeFit»). Естественный язык.
12. **Мандаты 8b / 8zi (Размер файлов):** 200–300 строк. Сложные — до 400–500 строк. Запрет микро-шредера. Декомпозиция монолитов по 6 гейтам `/decomposer`.
13. **Мандаты 8e / 8n (ИИ DENTE):** Gemini, OpenAI, Anthropic, Whisper. Диктовка дневников SOAP в медкарту (ЭМК), голос Ctrl+K. Легкий Web Copilot vs суверенный Desktop EXE.
14. **Мандат 8e / JIT (Чтение по требованию):** В активной сессии читать целевой код через `read_file`. Спецификации — строго Just-In-Time.
15. **Мандаты 8aq / 8al (Запрет сирот):** Компоненты смонтированы в `App.tsx`. Запрещены компоненты-сироты и изолированные `*_preview.html`.
16. **Мандаты 8t / 8wx (Защита хоста):** Node.js `--max-old-space-size=2048`. Таймауты тестов $\le 10$с. Единоличный `typecheck` запускает только L1 Оркестратор.
17. **Мандаты 8zu / 8r (Анти-поллинг):** Запрещен цикл `status`. Установил таймер `schedule DurationSeconds=20..60, TimerCondition="<task_id>"` $\to$ мгновенно отдал ход (**Yield Turn**).
18. **Мандаты 8l / 8zk / 8at (Рой субагентов):** Строго `TypeName: "self"`, `Model: "inherit"`. Deep Transcript Relay при падении. Авто-утилизация после DoD. Лимит $\le 6$ субагентов.
19. **Мандат 8af (Изоляция тестов):** Тесты используют локальные синтетические мок-ключи.
20. **Мандаты 8ak / 8ag (Смелое перестраивание):** Здоровое зерно $\to$ чиним точечно. Гнилое зерно $\to$ сносим без страха и переделываем с нуля по First Principles.
21. **Мандаты 8d / 8zq (Реактивная гидратация):** Любое действие в модалке мгновенно обновляет родительский экран без F5.
22. **Мандаты 8d / 8zp (Идемпотентность):** Мутации сопровождаются клиентским `Idempotency-Key` (UUIDv7).
23. **Мандаты 8d / 8zr (Ноль глотания ошибок):** Ноль пустых `catch`. Человеческие тосты с кнопкой повтора.
24. **Мандат 8au / UTF-8 (Без моджибаке):** Все файлы строго в UTF-8 без BOM (`npm run check:encoding`).
25. **Мандаты 8g / 8j (Правило != Задача):** Правила — эталон приёмки. Работает — не трогай ради абстрактного рефакторинга.
26. **Мандат 8an (Git & Dual-Push):** Dirty worktree safety. `git add <file>` пофайлово. Подробные Conventional Commits. Пуш в `origin` и `gitlab`.
27. **Мандаты 8ar / 8as (Одонтограмма Wheeler):** ViewBox $100\times 218$, Wheeler-ширины: резцы 48px, клыки 54px, премоляры 60px, моляры 68px. Фронт 43..33 в 300px (iPhone 390px fit).
28. **Мандат 8au (Чистота артефактов):** Разовые скрипты — СТРОГО в `scratch/`. Постоянные пруфы — в `docs/proofs/<domain>/`.
29. **Мандат 8av (ТЗ субагентам):** Минимум 5 абзацев: роль, требования Создателя, скоуп, ловушки, стандарты сдачи. Обязательное требование `read_file` целевых файлов!
30. **Мандат 8aw (Симметрия десктопа и мобильных):** Десктоп (1440x900) и Смартфон (390x844 Apple HIG) — равноправные среды клиники. Обязательный 4-State Proof.
31. **Мандат 8ax (Протокол Memento и анти-амнезия):** При сжатии контекста запрещены слепые правки! 4 шага заземления: `git status` + `git diff --stat` $\to$ план в `scratch/` $\to$ `read_file` целевого кода $\to$ JIT-спецификации.
32. **Мандат 8ay (Заземление субагентов):** Обязательное полное чтение профильного стандарта по Закону №0 перед началом любых изменений кода.
33. **Мандат 8az (Динамическое со-развитие спецификаций и кода):** Нашел проблему $\to$ зафиксировал в реестре $\to$ изучил через `read_file` $\to$ исправил в боевом коде $\to$ проверил тестом и скриншотом $\to$ обновил статус документа.
34. **Мандат 8ba (Логический Критик и 5 Неудобных Вопросов реальности):** Перед написанием кода или утверждением экрана — обязательный краш-тест по 5 осям: 1) Пакетный макро-батч в 1 клик вместо процедурного онанизма поштучных шагов; 2) 0px визуального шума для 99% здоровых/штатных состояний (`null`); 3) Сквозной естественный ввод (диктовка, свободный текст) вместо кликабельного рабства; 4) Полная гидратация состояния без пустых экранов и амнезии; 5) Разблокированный Primary CTA без бюрократических барьеров. Провал теста = Гнилое Зерно со сносом с нуля без косметических припарок!

---

## 🛠️ МАШИННЫЕ ГЕЙТЫ ПРИЁМКИ (DEFINITION OF DONE)

Перед сдачей любой задачи подтверди прохождение 9 гейтов:
1. **UTF-8:** `npm run check:encoding` $\to$ Exit Code 0.
2. **Стабы:** `npm run check:stub-overrides` $\to$ Exit Code 0.
3. **Fetch:** `npm run check:fetch-response` $\to$ Exit Code 0.
4. **Импорты:** `npm run check:dynamic-imports` $\to$ Exit Code 0.
5. **TypeScript:** `npm run typecheck` (единолично L1) $\to$ Exit Code 0.
6. **Тесты:** Затронутые юнит- и интеграционные тесты ($\le 10$с).
7. **4-State Visual Proof:** Скриншоты $\ge 20$KB в `docs/proofs/`, личный осмотр через `read_file` (PC Light/Dark + Mobile Light/Dark).
8. **Документация:** Синхронизация `.agents/` и `docs/` в том же коммите.
9. **Git:** Пофайловый `git add <file>`, Conventional Commit, `git push origin <branch>` и `git push gitlab <branch>`.

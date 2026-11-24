# GEMINI.md — Clinic MVP / DENTE Dental CRM Authority Shim

> ⚠️ SSOT ROUTER: Входной операционный шлюз Dental CRM (`C:\Clinic_MVP\dental-crm`). Перед задачей изучи спецификации. Запрещено угадывать типы, роуты и схему БД.

## ⛔ ИЕРАРХИЯ АВТОРИТЕТОВ И ЗАКОН №0 (ЗАЗЕМЛЕНИЕ)
1. Старт: Обязательный `read_file` на [THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и профильный стандарт чанками по 800 строк до конца.
2. In-Flight: читаем JIT целевой код. Перед модификацией файл читается ПОЛНОСТЬЮ ОТ 1 ДО ПОСЛЕДНЕЙ СТРОКИ через `read_file`. Запрещены слепые правки!
3. Перед мутацией: обязательная проверка `git status` и `git diff --stat`.
- Канон: [THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) | [CANONICAL_ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/CANONICAL_ARCHITECTURE.md) | [core.md](file:///C:/Users/Admin/.gemini/config/references/core.md)
- БД: [DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md) (PG18 127.0.0.1:5432, Drizzle) | Финансы: [BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) (`amountKopecks`, BIGINT, сплиты)
- Одонтограмма: [ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md) (Wheeler 2.5D, 120 FPS) | Склад: [WAREHOUSE_AND_SUPPLY.md](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) (Soft Stock)
- Документы: [DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) (SOAP, ИДС, 1151156) | Мобильные: [MOBILE_DESIGN_APPLE_HIG.md](file:///C:/Clinic_MVP/dental-crm/.agents/MOBILE_DESIGN_APPLE_HIG.md) (тач >=44px, Bottom Sheets)
- ИИ: [AI_ASSISTANT_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) | Паритет: [FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md) | Индекс: [INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)

## 🧭 46 КАНОНИЧЕСКИХ МАНДАТОВ DENTE CRM
1. 8e (Автономия врача): Кнопки («Сохранить», «Печать», «Оплатить») никогда не disabled. Норма в 1 клик. Дневник SOAP (Жалобы, Status Localis, МКБ-10, Лечение). Дебаунс-автосейв черновиков на лету. Скидки врача до 100% без блокировок. Сплит-оплаты (нал + карта + семейный депозит). Визиограф <50мс.
2. 8n (Суверенитет масштаба): Соло-врач (1–2 кресла) и малая клиника (1–3 кресла) первичны. Без ассистента в расписании, без ИНН физлиц на кассе. Soft Negative Stock.
3. 8a/8f (T.A.R.S. 100% честность): Запрет выдумывать баги. Доказательства строго инструментальные (`read_file`, скриншот, лог). Чат — русский; код — профи.
4. 8x/8ap (Клинический язык): Запрет канцелярита в UI («Прейскурант» вместо «804н», «Медкарта» вместо «043/у», «Касса» вместо «54-ФЗ»). Запрет чужих брендов.
5. 8y (Ноль фарм-паранойи): Аллергии строкой `⚠️`, кнопка «Утвердить» ВСЕГДА доступна в 1 клик.
6. 8v/8aa (Тихий бэк-офис и Soft Negative Stock): 90% времени — приём у кресла. Списание расходников тихо в фоне по технологическим картам процедур (BOM). При нехватке остаток уходит в мягкий овердрафт (`quantity < 0`), запрещены блокирующие алерты у кресла! Журналы автоклавирования и наряды медсестре — пакетно в бэк-офисе.
7. 8k/8s (CRM против трения): Без Canvas-физики и форм на 50 полей. 1-клик нормы, чистые медицинские бланки и честный пустой стейт.
8. 8z/8wy (Запрет моков): В боевом режиме — 100% реальный PG18 на 127.0.0.1:5432. Демо строго за `isDemoShowcaseMode()`.
9. 8ze/8al (Apple HIG): Тач >=44x44px, Natural Thumb Zone, Bottom Sheets, 0px скролла. Обязательный 4-state proof (PC Light/Dark + Mobile Light/Dark).
10. 8d/8al/8am (Геометрия кнопок, типографика и выравнивание):
    - Матрица кнопок (запрет карнавала высот): Desktop Standard `h-9 px-3.5 rounded-lg text-sm font-medium gap-2 inline-flex items-center justify-center shrink-0`; Compact `h-8 px-2.5 rounded-md text-xs font-medium gap-1.5`; Mobile Touch `min-h-[44px] h-11 px-4 rounded-xl text-base font-medium`; Mobile Sticky CTA `min-h-[52px] w-full rounded-xl text-base font-semibold shadow-md`. Иконки в кнопках: строго `w-4 h-4 shrink-0` (compact `w-3.5 h-3.5`), `currentColor`. Ноль разнобоя иконок (12px рядом с 20px запрещены)!
    - Иерархия кнопок (ровно 1 Primary на видимый экран): Primary CTA `bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm`; Secondary `bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]` (в Dark Mode `rgba(255,255,255,0.05)` с рамкой `var(--line)`, ноль синих рамок `#334155`); Ghost `bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]`; Destructive `text-[var(--danger)] hover:bg-[var(--danger-soft)] border border-[var(--danger-soft)]`.
    - Типографика и UPPERCASE BAN: Запрещен `uppercase` на кнопках, табах, чипах (строго Sentence case). H1 `text-xl font-semibold tracking-tight`, H2 `text-base font-semibold`, Body `text-sm`, Meta `text-xs text-[var(--ink-muted)]`. Деньги и числа: строго `font-mono tracking-tight font-medium text-right tabular-nums`.
    - Сетка модалок (Zero-Drift Layout): Шапка `h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0`, тело `p-6 overflow-y-auto space-y-4`, футер `h-16 px-6 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-end gap-3 shrink-0` (кнопка «Отмена» ВСЕГДА слева от Primary CTA).
    - Инпуты, бейджи и Apple Segmented: Инпуты зеркалят высоту кнопок (Desktop `h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)]`, Mobile `min-h-[44px] h-11 px-3.5 text-base rounded-xl`). Бейджи: `h-6 px-2 text-xs font-medium rounded-full inline-flex gap-1 shrink-0` (мягкие токены `var(--success-soft)`). Apple Segmented: контейнер `p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]`, активный таб `bg-[var(--paper)] text-[var(--ink)] shadow-xs rounded-lg font-medium`.
    - Скролл-дрифт, Zero-CLS и честный Empty State: Корневые контейнеры модалок строго `overflow-x: clip; max-width: 100vw;`. CLS = 0 (скелетоны `animate-pulse bg-[var(--paper-soft)]`). Empty State: блок `py-12 flex flex-col items-center text-center gap-2.5` с иконкой `w-10 h-10` и действием (ноль белых дыр).
11. 8zg (Без дев-жаргона): Ноль утечек терминов («modeFit»). Запрет «1 клик» на кнопках (пишем: «Физиологическая норма», «Интактные зубы», «Готовые комплексы»).
12. 8b/8zi (Размер файлов): 200–300 строк, сложные до 400–500 строк. Запрет микро-шредера. Декомпозиция монолитов по 6 гейтам `/decomposer`.
13. 8e/8n (ИИ DENTE): Gemini, OpenAI, Anthropic, Whisper. Диктовка SOAP в медкарту (ЭМК), голос Ctrl+K. Легкий Web Copilot vs Desktop EXE.
14. 8e/JIT (Чтение по требованию): В активной сессии читать целевой код через `read_file`. Спецификации — строго Just-In-Time.
15. 8aq/8al (Запрет сирот): Компоненты смонтированы в `App.tsx`. Запрещены компоненты-сироты и изолированные `*_preview.html`.
16. 8t/8wx (Защита хоста): Node.js `--max-old-space-size=2048`. Таймауты тестов <=10с. Единоличный `typecheck` запускает только L1 Оркестратор.
17. 8zu/8r (Анти-поллинг): Запрещен цикл `status`. Таймер `schedule DurationSeconds=20..60, TimerCondition="<task_id>"` -> отдал ход (Yield Turn).
18. 8l/8zk/8at (Рой субагентов): `TypeName: "self"`, `Model: "inherit"`. Deep Transcript Relay при падении. Лимит <=6 субагентов.
19. 8af (Изоляция тестов): Тесты используют локальные синтетические мок-ключи.
20. 8ak/8ag (Смелое перестраивание): Здоровое зерно -> чиним точечно. Гнилое зерно -> сносим без страха и переделываем с нуля по First Principles.
21. 8d/8zq (Реактивная гидратация и Zero-Leak Draft): Любое действие в модалке мгновенно обновляет родительский экран (React Query invalidation / store dispatch) без F5. При закрытии модалки (Cancel/Escape/Backdrop/Swipe) — ОБЯЗАТЕЛЬНЫЙ полный сброс локального стейта черновика (Draft Reset), предотвращающий утечку данных прошлого пациента следующему!
22. 8d/8zp (Идемпотентность транзакций): Все финансовые, складские и клинические мутации (POST/PUT/PATCH) обязаны сопровождаться клиентским заголовком `Idempotency-Key` (UUIDv7). Повторные клики и сетевые ретраи не создают дублей счетов, списаний или записей.
23. 8d/8zr (Ноль глотания ошибок): Ноль пустых `catch`. Человеческие тосты с кнопкой повтора.
24. 8au/UTF-8 (Без моджибаке): Все файлы строго в UTF-8 без BOM (`npm run check:encoding`).
25. 8g/8j (Правило != Задача): Правила — эталон приёмки. Работает — не трогай ради абстрактного рефакторинга.
26. 8an/BRANCH-BAN (Git — ТОЛЬКО MAIN): **Тотальный запрет веток** без явного приказа. Все коммиты строго в `main`. `git checkout -b` = САБОТАЖ. Пушить в `origin main` регулярно после каждого домена. Перед стартом: `git branch` → убедиться на `main`. `git add <file>` пофайлово. Conventional Commits. → полное: [`vcs.md §2 п.5`](file:///C:/Users/Admin/.gemini/config/references/vcs.md)
27. 8ar/8as (Анатомическая Одонтограмма Wheeler 2.5D и 120 FPS):
    - ViewBox 100x218, Wheeler-ширины: резцы 48px, клыки 54px, премоляры 60px, моляры 68px. Фронт 43..33 в 300px.
    - Анатомическая изоляция поверхностей MODBL: кариес на окклюзионной поверхности НИКОГДА не затирает пломбу на медиальной/дистальной.
    - Молочный прикус (51–85): честная детская анатомия (низкие коронки, физиологическая резорбция корней), переключение постоянный/сменный прикус в 1 клик.
    - Реактивный SVG: 120 FPS без Canvas-перегрузок и без полного ре-рендера челюсти при выделении одного зуба. Клик по патологии зуба сразу предлагает услугу в смету.
28. 8au (Чистота артефактов): Разовые скрипты — СТРОГО в `scratch/`. Постоянные пруфы — в `docs/proofs/<domain>/`.
29. 8av (ТЗ субагентам): Минимум 5 абзацев: роль, требования Создателя, скоуп, ловушки, стандарты сдачи. Обязательное чтение целевых файлов через `read_file`!
30. 8aw (Симметрия десктопа и мобильных): Десктоп (1440x900) и Смартфон (390x844 Apple HIG) — равноправные среды клиники. Обязательный 4-State Proof.
31. 8ax (Протокол Memento): При сжатии: `git status` + `git diff --stat` -> план в `scratch/` -> `read_file` целевого кода -> JIT-спецификации.
32. 8ay (Заземление субагентов): Обязательное полное чтение профильного стандарта по Закону №0 перед началом любых изменений кода.
33. 8az (Со-развитие спецификаций и кода): Нашел проблему -> зафиксировал в реестре -> изучил через `read_file` -> исправил в боевом коде -> проверил тестом и скриншотом -> обновил статус документа.
34. 8ba (5 Неудобных Вопросов реальности): Краш-тест: 1) Пакетные батчи в 1 клик; 2) 0px шума для 99% нормы (null); 3) Сквозной ввод (голос/текст); 4) Полная гидратация состояния; 5) Разблокированный Primary CTA. Провал = Гнилое Зерно со сносом с нуля!
35. 8be (Анти-Any, Анти-Undefined, exactOptionalPropertyTypes и Non-Null):
    - Тотальный запрет на `any` (`as any`, `: any`), двойные касты (`as unknown as`, `as any as`), слепые `as never` и non-null assertions (`!`).
    - *Инвариант exactOptionalPropertyTypes:* В `tsconfig.base.json` включен strict-режим `exactOptionalPropertyTypes: true`. Если свойство интерфейса или React-пропса может принимать явный `undefined`, оно ОБЯЗАНО объявляться как `prop?: Type | undefined;` (а не просто `prop?: Type;`, запрещающий передачу `{ prop: undefined }`). Запрещено глушить TS2379/TS2322 кастом к `any`!
    - Как фиксить: интерфейсы FastifyRequest, discriminated unions, `z.infer` и `safeParse`, безопасный доступ `arr[0]?.prop ?? fallback` или `if (!item) return`, guard-clauses `if (!user) throw/reply(401)` вместо `req.user!.id`. Запрет бестиповых аккумуляторов `const arr = [];` (`never[]`). Нулевой допуск к ошибкам TypeScript — `npm run typecheck` Exit Code 0 во ВСЕХ пакетах (`shared`, `api`, `web`)!
36. 8bk (Методология Разминирования, Двойной Счётчик и Ревизия Псевдофиксов):
    - Разминирование СТРОГО в боевом коде (`apps/web/src`, `apps/api/src`, `packages/shared/src`), а не в моках тестов.
    - Закон двойного счётчика: замер `npm run typecheck -w @dental/web` ДО и ПОСЛЕ сноса `any`. Рост или стагнация ошибок `tsc` при падении `any` = БРАК И САБОТАЖ. Запрещено оставлять сломанный контракт под снятым any!
    - Ревизия псевдофиксов: старые фиксы с брошенными ошибками `tsc` подлежат обязательной доработке до полного сокращения ошибок компилятора.
    - **Компилятор веб-пакета (без OOM):** канонически `npm run typecheck -w @dental/web` (`--max-old-space-size=8192`), точечно `npx tsc -p apps/web/tsconfig.json --noEmit 2>&1 | Select-String "путь"`. Запрет слепой зоны Vite: гейт сапёра — `tsc --noEmit` с 0 ошибок.
37. 8bf (Единый SSOT, Анти-Дубликат и Истребление Сирот): Строжайший запрет на параллельные реализации (строго 1 касса 54-ФЗ, 1 каталог терапии, 1 каталог имплантов, 1 модуль `money.ts`). Старая ветка НЕМЕДЛЕННО удаляется (`git rm`). Компоненты смонтированы в дереве импортов `App.tsx`.
38. 8bg (Синхронизация Схемы и DDL-миграций Postgres 18): Любое объявление `pgTable` в `apps/api/src/db/schema/` обязано иметь физическую DDL-миграцию в `apps/api/drizzle/`. Запрещены коммиты при падающем `npm run check:migration-drift`.
39. 8bh (Инварианты Хуков React 19 и Кнопок HIG):
    - React 19 Rules of Hooks: ноль условных хуков (`useX()` внутри `&&`, `||`, `??`, `if`). Запрещено ветвить вызовы хуков между десктопом и мобильными в одном теле компонента (`if (isMobile) useMobileHook()`). Платформенные ветвления изолируются СТРОГО через раздельные дочерние компоненты (`<DesktopView />` vs `<MobileView />`). `npm run check:react-hooks` Exit Code 0.
    - Дизайн-токены Мандата 8am: ноль хардкодных цветов кнопок (`bg-amber-100`, `#0d9488`), строго семантические токены (`var(--primary)`, `var(--paper)`, `var(--line)`), `npm run check:buttons` и `check:css-tokens` Exit Code 0.
40. 8bi (Запрет мусорного UI, кнопочных полигонов, свалок шорткодов): Ноль утечек ТЗ в лейблы. Запрет свалки клавиатурных шорткодов. 0px шума для 99% нормы. Запрет мёртвых стейтов с «0 ₽». Запрет дублирования соматики.
41. 8bj (Осознанная селекция сирот и защита клинического ядра): Симуляторы, вымышленные законы и советские формы — в утиль (`git rm`). Столпы клиники неприкосновенны (дозы анестезии, каналы Wheeler, молочный прикус, МКБ-10, сплит-чеки, 100% гарантии, баланс семьи, согласия ИДС, справки ФНС 1151156) — монтировать в боевой UI!
42. **8bl (Канон exactOptionalPropertyTypes: true):** В `tsconfig.base.json` включен strict-режим. Запрещено глушить `TS2379` кастом к `any`. Два канона: 1) если поле может сбрасываться — объявлять `prop?: T | undefined;`; 2) если контракт строгий — условный спред: `{ a: 1, ...(b !== undefined ? { b } : {}) }`.
43. 8bm (Копеечные DTO и Изоляция Конверта API):
    - Суффикс валюты обязателен: `amountKopecks`, `priceKopecks` в TS/Drizzle, `amount_kopecks BIGINT` в SQL. Ноль голых `price/amount` без суффикса.
    - Запрет расчетов рублей в UI (`/ 100` и `* 100`): форматирование строго через `@dental/shared/src/money.ts` (`formatKopecksToRub`, `rublesToKopecks`).
    - Безопасный конверт API: Fastify возвращает `{ success: true, data: T }`. Фронт обязан распаковывать через `const payload = json?.data ?? json;` (0 падений при смене мидлварей).
44. 8bn (Keyed Remount и Stale Draft Purge в Шторках):
    - Изоляция по ключу: модалки и шторки монтируются строго с ключом сущности: `<PatientStudioModal key={patientId} patientId={patientId} ... />`. Смена ID чисто перемонтирует дерево React.
    - Очистка черновика на `onClose`: `useDraftStore.getState().resetDraft()`. Ноль утечек данных прошлого пациента следующему!
45. 8bo (Сквозной Idempotency-Key и Неделимость ACID): Все мутации несут заголовок `Idempotency-Key` (UUIDv7). Мутации 2+ таблиц строго в `await db.transaction(async tx => ...)`. Запрещен глобальный `db` внутри транзакции!
46. 8bq (Санитарный Храповик, Кубик, Failure Manifestos и Трёхзвенная Цепь):
    - Звено А (Барьер нового говна): `npm run check:diff` (в прекоммите и в любое время `in-flight`) — ловит `as any`, `!`, `// @ts-ignore`, `catch {}`, `window.alert`, `/ 100`, моки в пропсах. Костыли блокируются намертво!
    - Звено Б (Истребление старого говна): `npm run check:ratchet` (лимиты any/float монотонно закручиваются вниз при улучшениях; статус честно отражает остаток долга), `npm run check:doors` (0 клонов модалок, 100% Zod дверей API), правило бойскаута при любой правке.
    - Звено В (Превентивная архитектурная мудрость): `npm run audit:dice` (Монте-Карло срез 175 точек), Failure Manifestos (глубокие наставления для агентов вместо красных крестиков), Zero-Trust аудит субагентов оркестратором.

## 🛠️ МАШИННЫЕ ГЕЙТЫ ПРИЁМКИ (DEFINITION OF DONE)
Перед сдачей любой задачи подтверди прохождение 15 гейтов (Exit Code 0):
1. **Дифф:** `check:diff` (0 костылей) | 2. **UTF-8:** `check:encoding` | 3. **Храповик & SSOT:** `check:ratchet` и `check:doors` | 4. **Кубик:** `audit:dice` | 5. **Стабы:** `check:stub-overrides`
6. **Fetch:** `check:fetch-response` | 7. **Импорты:** `check:dynamic-imports` | 8. **React 19:** `check:react-hooks` | 9. **Кнопки/CSS:** `check:buttons` и `check:css-tokens`
10. **Миграции:** `check:migration-drift` | 11. **TypeScript:** `typecheck` во ВСЕХ пакетах | 12. **Тесты:** затронутые тесты (<=10с)
13. 4-State Proof: скриншоты >=20KB в `docs/proofs/`, личный осмотр через `read_file` (PC/Mobile x Light/Dark)
14. **Docs:** синхронизация `.agents/` и `docs/` | 15. **Git:** пофайловый `git add <file>`, Conventional Commit, push в `origin` и `gitlab`.

# AGENTS.md — Clinic MVP / DENTE Dental CRM (.agents Router)

> 🏛️ **SSOT:** Все 41 мандат и DoD в [`GEMINI.md`](file:///C:/Clinic_MVP/dental-crm/GEMINI.md). Конституция: [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md). Навигация: [`.agents/INDEX.md`](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md).

## 🚨 ПРОТОКОЛ ЗАЗЕМЛЕНИЯ (ЗАКОН №0):
1. **Старт субагента:** Обязательный `read_file` на [THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и профильный стандарт чанками по 800 строк до конца.
2. **In-Flight:** читаем JIT целевой код. Перед модификацией файл читается **ПОЛНОСТЬЮ ОТ 1 ДО ПОСЛЕДНЕЙ СТРОКИ** через `read_file`. Запрещены слепые патчи!
3. Перед мутацией: проверка `git status` и `git diff --stat`.
4. **Со-развитие спецификаций и кода (Мандат 8az):** Проблема -> реестр -> `read_file` -> правка в коде -> тест/скриншот -> обновление статуса.
5. **Мандат 8bi/8am (Геометрия кнопок, типографика и выравнивание):**
   - Матрица кнопок: Desktop Standard `h-9 px-3.5 rounded-lg text-sm font-medium gap-2 items-center inline-flex`; Desktop Compact `h-8 px-2.5 rounded-md text-xs font-medium gap-1.5`; Mobile `min-h-[44px] h-11 px-4 rounded-xl text-base`; Mobile Sticky Bottom `min-h-[52px] w-full font-semibold`.
   - Иконки: строго `w-4 h-4 shrink-0` (standard/mobile) или `w-3.5 h-3.5 shrink-0` (compact), `currentColor`. Запрещен разнобой размеров иконок!
   - Ровно 1 Primary CTA: `bg-[var(--primary)] text-white`. Secondary: `border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]`.
   - Запрет капслока (UPPERCASE BAN): строго Sentence case без `uppercase` на кнопках, чипах и табах. Деньги строго `font-mono tracking-tight text-right tabular-nums`.
   - Сетка модалок: шапка `h-14 px-6`, тело `p-6 space-y-4`, футер `h-16 px-6 border-t` (кнопка «Отмена» ВСЕГДА слева от Primary CTA). Ноль мёртвых стейтов «0 ₽». Ноль утечек ТЗ в лейблы.
   - Инпуты и селекты зеркалят кнопки: Desktop `h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)]`, Mobile `min-h-[44px] h-11 px-3.5 text-base rounded-xl`. Ноль разнобоя высот!
   - Бейджи: строго `h-6 px-2 text-xs font-medium rounded-full inline-flex items-center gap-1 shrink-0` (семантические мягкие токены `var(--success-soft)`, `var(--warning-soft)`, `var(--danger-soft)`). Ноль кислотного неона! Apple Segmented Control: `p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]`.
   - 0px скролла и Empty State: корневые контейнеры строго `overflow-x: clip; max-width: 100vw;`. При отсутствии данных — блок `py-12 flex flex-col items-center text-center gap-2.5` с иконкой `w-10 h-10` и действием (ноль белых дыр!). CLS = 0 (скелетоны `animate-pulse`).
6. **Мандат 8bj (Селекция сирот и ядро):** Токсичный шлак (симуляторы, советский бэк-офис М-11, вымышленные законы) — в утиль (`git rm`). Столпы клиники неприкосновенны (дозы анестезии, каналы Wheeler, молочные зубы, МКБ-10, сплит-чеки, 100% гарантии, согласия ИДС, справки ФНС 1151156) — монтировать в боевой UI!
7. **Мандат 8bk (Разминирование, двойной счётчик и exactOptionalPropertyTypes):**
   - **Запрет показухи в тестах:** Разминирование ведётся ИСКЛЮЧИТЕЛЬНО в боевом коде (`web/src`, `api/src`, `shared/src`), а не в `*.test.tsx` / `*TestHelpers.ts`.
   - **Закон двойного счётчика:** При сносе `any` обязателен замер `npm run typecheck -w @dental/web` ДО и ПОСЛЕ. Рост или стагнация числа ошибок `tsc` при падении `any` = БРАК И САБОТАЖ. Запрещено оставлять сломанный контракт под снятым any!
   - **Инвариант exactOptionalPropertyTypes:** При `exactOptionalPropertyTypes: true` опциональные поля интерфейсов/пропсов, способные принимать `undefined`, объявляются как `prop?: Type | undefined;`. Запрещено глушить TS2379/TS2322 кастом `as any`!
   - **Ревизия старых псевдофиксов:** Все прошлые батчи демайнинга с брошенными ошибками `tsc` подлежат обязательной доработке до сокращения ошибок компилятора.
   - **Команда компилятора:** `npm run typecheck -w @dental/web` (содержит `--max-old-space-size=8192`). Точечная проверка: `npx tsc -p apps/web/tsconfig.json --noEmit 2>&1 | Select-String "путь/к/файлу"`.
   - Методика: замена `as any` и `as unknown as` на строгие Zod/TS контракты -> осознанные guard-clauses на `undefined` -> гейт `tsc --noEmit` обоих пакетов и тесты (Exit Code 0).
8. **Мандат 8bh/8zq (React 19 Hooks, Keyed Remount, Zero-Leak Draft):**
   - React 19: ноль условных хуков (`useX()` внутри `&&`, `||`, `if`). Платформенное ветвление изолируется через раздельные компоненты (`<DesktopView />` vs `<MobileView />`).
   - Keyed Remount: модалки монтируются с ключом `<PatientStudioModal key={patientId} ... />`.
   - Zero-Leak Draft: при закрытии модалок/шторок (Cancel/Escape/Swipe) гарантирован сброс локального черновика (`resetDraft()`), исключающий утечку данных чужого пациента.
9. **Мандат 8bm/8bo (Копеечные DTO, ACID Транзакции и Idempotency):**
   - Деньги: строго суффикс `Kopecks` (`amountKopecks: bigint` / `priceKopecks: integer`). Запрещены вычисления рублей в UI (`/ 100`). Форматирование через `money.ts`.
   - Конверт API: безопасный анпакер `const payload = json?.data ?? json;`.
   - Идемпотентность и ACID: мутации несут заголовок `Idempotency-Key` (UUIDv7). Мутации 2+ таблиц — строго внутри `await db.transaction(async tx => ...)`. Запрещен глобальный `db` внутри транзакции!
10. **Мандат 8ar/8as (Одонтограмма Wheeler 2.5D и MODBL):**
   - Изоляция поверхностей: кариес на окклюзии никогда не стирает медиальную пломбу.
   - Wheeler-пропорции (резцы 48px, клыки 54px, премоляры 60px, моляры 68px), молочные зубы 51–85 с анатомической резорбцией.
   - Реактивный SVG 120 FPS без Canvas-физики и без тяжелого ре-рендера всей челюсти.
11. **Мандат 8v/8e (Soft Negative Stock, Сплит-Касса и 100% Скидки):** Склад: тихое списание по BOM, при нехватке — мягкий овердрафт (`< 0`) без алертов у кресла. Касса: сплиты сходятся до копейки, скидки до 100% без паролей, 0 ИНН физлиц в чеке.
12. **Мандат 8bq (Храповик, Закон Замка и Кубик):** `npm run check:ratchet` (лимиты any/float), `npm run check:doors` (0 клонов модалок, 100% Zod-защита API), `npm run audit:dice` (Монте-Карло ревизия). Регрессия = бан коммита!

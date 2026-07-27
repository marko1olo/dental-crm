# C3-nav-rail-unlabelled — handoff

HEAD: e71445757cbd4ce11c4f38de16509754aa6f26a1 (мой коммит кода; ветка main движется —
второй автор и два агента флота коммитят параллельно, перечитывайте `git log`)

## Что было сломано (file:line — нумерация ДО правки)

1. `apps/web/src/workspaceShell.tsx:58-70` — `SidebarIcon` был цепочкой `if` с общим
   `return <Sparkles aria-hidden="true" />` в конце.
   - `:65` `analytics` -> `Sparkles` (явно)
   - `:68` `marketing` -> `Sparkles` (явно)
   - `:69` fallback -> `Sparkles`; у `shift` ветки не было вовсе, он падал сюда
   Порядок `appViews` (`:25`): shift(1) ... analytics(8) ... marketing(11). То есть на
   позициях 1, 8 и 11 бокового меню стоял один и тот же значок.
2. `apps/web/src/workspaceShell.tsx:72-83` — та же болезнь в `ActionIcon`: `:79`
   `analytics` -> `Sparkles`, `:82` fallback -> `Sparkles`, при этом ветки `marketing`
   не было вообще.
3. Рельса без подписей. **Причина в досье указана неверно** — см. раздел «Правка досье».
   Подписи в разметке были (`:140-143`, `.nav-copy` / `.nav-label`), их прячет CSS:
   - `apps/web/src/styles/dente-redesign.css:354` `[data-collapsed="true"] .nav-copy { display: none; }`
   - `apps/web/src/styles/dente-redesign.css:590` то же под `@media (max-width: 1140px)`
   Свернутость хранится в `localStorage` (`apps/web/src/App.tsx:945`, ключ
   `dente_sidebar_collapsed`), то есть один клик по кнопке сворачивания убирал подписи
   навсегда, на всех экранах и во всех темах.
4. `apps/web/src/workspaceShell.tsx:120` — `aria-label="Навигация"` висел на `<aside>`
   (ориентир «дополнительная информация»), а вложенный `<nav>` (`:125`) оставался
   безымянным ориентиром.

## Что изменено (только `apps/web/src/workspaceShell.tsx`)

- `:73-105` — два исчерпывающих `Record<AppView, LucideIcon>`: `sidebarIcons` и
  `actionIcons`. Пропущенный раздел теперь не компилируется, fallback'а нет.
  Новые значки и почему:
  | раздел | боковое меню | кнопка действия | почему |
  |---|---|---|---|
  | `shift` «Смена» | `LayoutDashboard` | `LayoutDashboard` | подсказка раздела — «что делать сейчас»: это сводная доска смены, а не календарь и не отчет |
  | `analytics` «Аналитика» | `BarChart3` | `TrendingUp` | «отчеты и воронки» — столбчатая диаграмма читается как отчет; в кнопке действия оставлен «глагольный» вариант, как уже сделано для schedule/visit/documents/finance |
  | `marketing` «Маркетинг/SEO» | `Megaphone` | `Megaphone` | «продвижение и отзывы» — рупор, стандартный значок продвижения в lucide |
  Словарь значков — только `lucide-react` (0.511.0), новый набор не заводился.
- `:107-115` — `SidebarIcon`/`ActionIcon` читают карты. `export function ActionIcon`
  сохранен дословно (этого требует smoke).
- `:150-176` — `navSlotClass` / `navCaptionClass`: раскладка пункта рельсы.
- `:189` — имя ориентира переехало на `<nav aria-label="Навигация">`, с `<aside>` снято.
  Двух подписей нет.
- `:203-210` — значок, `.nav-copy` и новая короткая подпись собраны в **одну обертку**,
  чтобы у `.nav-item` был единственный ребенок: заданный в CSS горизонтальный зазор
  `gap: 11px` тогда не участвует в раскладке и вертикальный ритм задается утилитами.
  Короткая подпись берется из того же `viewLabels` и показывается ровно там, где CSS
  прячет `.nav-copy`: при `collapsed` и через `max-[1140px]:`.

### Почему именно так, а не через CSS
`apps/web/src/styles/tailwind.css` импортирует утилиты в `@layer utilities` и прямо
пишет: объявления вне слоев приоритетнее любых слоев, поэтому рукописный CSS проекта
выигрывает у утилит везде, где что-то уже задавал. Все назначенные классы трогают
только те свойства, которых ни один селектор проекта у этих элементов не задает
(`display`, `flex-direction`, `width`, `gap` внутри новой обертки, `font-size`,
`line-height`, `text-align`, `overflow-wrap`). Ни один существующий стиль не
переопределяется.

### Соответствие стандартам
- Токены: цвет подписи **наследуется** от `.nav-item` (`--ink-2`, активный `--teal-dark`
  / `--teal`), поэтому light/dark/night работают без единого статичного цвета. Ни одного
  hex не добавлено. `styles/dente-redesign.css` **не тронут** — недостающего токена нет.
- Относительные единицы: `0.625rem`, `0.1875rem`, `0.6875rem`, `1.15`. Ни одного `px`.
- Русский текст: `break-words` + перенос по словам, `max-w-full`. Самая длинная подпись
  «Маркетинг/SEO» переносится на две строки, а не обрезается.
- i18n: новых строковых литералов в компоненте нет — подпись читается из `viewLabels`,
  который и есть существующий словарь. Долг i18n не увеличен.
- Teardown: ни одного слушателя, таймера, интервала или подписки не добавлено.

## ПРОВЕРЕНО

- **TYPECHECK VERIFIED** — `npm run typecheck -w @dental/web` -> `EXIT=0` (дважды: после
  правки компонента и после добавления теста). Файл теста входит в программу tsc:
  `apps/web/tsconfig.tsbuildinfo` -> `fileNames` содержит
  `./src/__tests__/workspaceshellnav.test.ts` (2069 файлов в программе).
- **UNIT VERIFIED** — `cd apps/web && node --import tsx --test src/__tests__/workspaceShellNav.test.ts`
  -> `tests 7 / pass 7 / fail 0`, EXIT=0.
- **UNIT VERIFIED (негативный контроль — тест действительно ловит регрессию)** — временно
  выставил `marketing: BarChart3` в `sidebarIcons`, тот же запуск дал
  `✖ gives every view its own sidebar glyph` и
  `actual: [ 'analytics and marketing both render ChartColumn' ]`, EXIT=1. Правка
  откачена, `git status --porcelain -- apps/web/src/workspaceShell.tsx` пуст.
- **UNIT VERIFIED (весь пакет web)** — `npm test -w @dental/web` -> `tests 365 / pass 365 /
  fail 0`, EXIT=0. Соседний `workspaceUiLabels.test.ts` не сломан.
- **SMOKE VERIFIED (не хуже базы)** — `node scripts/smoke-workspace-shell-source.mjs`
  ДО правки: EXIT=1, ровно две ошибки:
      - Sidebar view hints must collapse on mobile to protect bottom navigation
      - ScheduleView must not force smooth programmatic scrolling
  ПОСЛЕ правки: EXIT=1, `diff` вывода с базой — **IDENTICAL**. Третьей ошибки нет.
  Обе базовые ошибки — не мои файлы: первая про `apps/web/src/styles/main.css`, вторая
  про `apps/web/src/ScheduleView.tsx`.
- **Кодировка** — `node .agents/archon/packets/C3-nav-rail-unlabelled/encoding-check.cjs
  apps/web/src/workspaceShell.tsx` -> `bom: false`, `mojibake_lines: 0`, `crlf_count: 0`,
  `cyrillic_chars: 2337`.
- **Осмотр дефекта своими глазами** — открыл
  `.dente-redesign-shots/desktop_light_patients.png`. Рельса ~74px, 11 голых значков,
  на позициях 1/8/11 одинаковые искорки, словесная марка «DENTE» отсутствует,
  переключатель тем отсутствует. Это подпись свернутого состояния, а не «подписи не
  отрисовываются».

## НЕ ПРОВЕРЕНО

- **Как это выглядит на экране.** Скриншоты — прерогатива лида, я их не снимал и права
  claim'а UI VERIFIED не имею.
  Закрывающая команда (только лид): `node scripts/dente-redesign-shots.mjs`, затем
  открыть `.dente-redesign-shots/desktop_light_patients.png`,
  `desktop_light_shift_collapsed.png`, `desktop_dark_patients.png`,
  `desktop_night_patients.png` и посмотреть на пиксели.
- **Что рельса помещается по высоте при свернутом меню на низком окне.** Расчет:
  11px+19px+3px+11px ≈ 56px на пункт, 11 пунктов ≈ 620px, плюс шапка и подвал ≈ 730px —
  при 900px помещается, при 700px появится прокрутка страницы. Это расчет, не замер.
  Закрывающая команда (лид): снять `desktop_light_shift_collapsed.png` при 1440x760 —
  в `scripts/dente-redesign-shots.mjs:247` поменять `setViewport(1440, 900, false)`.
- **Поведение в диапазоне 841-1140px** (`@media max-width:1140px`, рельса 76px без
  `collapsed`). Классы `max-[1140px]:*` написаны, но ни один снимок этой ширины не
  существует. Закрывающая команда (лид): добавить в
  `scripts/dente-redesign-shots.mjs` проход `await setViewport(1000, 900, false)`.
- **Что Tailwind реально сгенерировал произвольные классы** `text-[0.625rem]`,
  `gap-[0.1875rem]`, `gap-[0.6875rem]`, `leading-[1.15]`, `max-[1140px]:*`.
  Источник `@source "../../src"` в `styles/tailwind.css` покрывает
  `apps/web/src`, но факт генерации я не смотрел. Закрывающая команда:
  `npm run build -w @dental/web` и затем
  `rg -o "max-\[1140px\]|text-\[0\.625rem\]" apps/web/dist/assets/*.css`.
- **Контраст подписи 10px** в трех темах. Цвет наследуется от `.nav-item`, то есть тот
  же, что у уже существующей `.nav-label`, но замера контраста я не делал.

## Коммит

`e71445757cbd4ce11c4f38de16509754aa6f26a1`
`[ARCHON] fix(навигация): свернутая рельса из 11 значков, три из них — одна искорка`
1 файл, +95 / -28, только `apps/web/src/workspaceShell.tsx`.
Второй коммит — тест и файлы пакета.

## Правка досье (`.agents/archon/VISUAL_VERDICT.md`)

1. **§3 и §5 п.4 неверно объясняют причину.** «`workspaceShell.tsx` already defines
   `viewLabels` and `viewHints` — the labels exist and are not being shown» — подписи
   отрисовывались всегда (`.nav-copy`), их прятал CSS свернутого состояния. Формулировку
   надо заменить на: «рельса на снимке свернута (`[data-collapsed="true"]`), и в этом
   режиме `dente-redesign.css:354` скрывает `.nav-copy`; состояние запоминается в
   localStorage, поэтому один клик делает навигацию безымянной навсегда».
2. **§3 «no visible tooltips» неточно** — `title` был на каждом пункте
   (`workspaceShell.tsx:134`). Он невидим на тач-устройствах и медленный, но он был.
3. **§0/A0: `desktop_light_shift_collapsed.png` бесполезен как доказательство существования
   свернутого режима** — он в клон-группе `2e0e8e9e…`, это оверлей ошибки Vite. Свернутый
   режим доказан кодом (`App.tsx:945`, `dente-redesign.css:352-359`), а не этим снимком.
   При этом на снимках `desktop_light_*` **весь** светлый прогон снят в свернутом виде,
   хотя скрипт жмет кнопку сворачивания только после светлого цикла
   (`scripts/dente-redesign-shots.mjs:254-258`). Значит `dente_sidebar_collapsed=true`
   пришло из localStorage профиля браузера и **снимок с именем `_collapsed` на самом деле
   развернутый**. Проверять при следующем прогоне.
4. **Идентичность git.** `git config user.name` = `marko1olo`. Коммиты флота и коммиты
   не-флотового автора **неотличимы по автору**. Единственный разделитель — префикс
   `[ARCHON] ` в теме. Инструкцию «второй автор коммитит под identity marko1olo» надо
   уточнить: это identity всего репозитория, а не отдельного человека.

## Долг (найдено, не чинил — вне claim'а)

1. `apps/web/src/styles/premium.css:254-283` — статичные hex в навигации:
   `#ccfbf1`, `#0d9488`, `#0f172a`, `#0f766e`, `#fff`, плюс `.nav-item.active` в темной
   теме. Прямое нарушение «TOKENS, NEVER STATIC HEX» в том самом компоненте, что чинил
   этот пакет. Не мой файл.
2. `apps/web/src/workspaceShell.tsx:100` — у «Настроек» значок `Database` (цилиндр БД).
   Тот же значок стоит на кнопке импорта/экспорта в топбаре (`:288`). Раздел «клиника,
   импорт и доступы» цилиндром БД не читается, и глиф дублируется в пределах одной шапки.
   **Не менял намеренно**: пакет требовал починить три искорки, `Database` уникален
   внутри рельсы, а замена значка без задания — это второе угадывание. Кандидат в
   следующий пакет: `Settings` для раздела, `Database` оставить импорту.
3. **ДИАГНОЗ ПОДТВЕРЖДЕН ЗАМЕРОМ.** Базово красная ассерция smoke «Sidebar view hints
   must collapse on mobile» (`scripts/smoke-workspace-shell-source.mjs:455-459`) ищет в
   `apps/web/src/styles/main.css` подстроку `".nav-copy small {" + LF + "    display: none;"`.
   Замер (read-only):
   ```
   crlf_total 16895        <- в файле 16895 строк и 16895 CRLF, то есть ВЕСЬ файл CRLF
   needs_LF_variant  false <- того, что ищет smoke, нет
   has_CRLF_variant  true  <- нужный блок В ФАЙЛЕ ЕСТЬ, но с \r\n
   occurrences_of_selector 3
   ```
   Стиль корректен; ложно-отрицательна **ассерция**, она не переживает CRLF. Именно
   попытку удовлетворить ее скриптом VISUAL_VERDICT §0 называет причиной литерального
   `\n`, записанного в стилевой файл и уронившего сборку всего CSS. Чинить надо smoke
   (сравнивать по нормализованным переводам строк), НЕ main.css. Файл вне моего claim'а.
   Команда воспроизведения:
   `node -e "const s=require('fs').readFileSync('apps/web/src/styles/main.css','utf8');const CR=String.fromCharCode(13),LF=String.fromCharCode(10);console.log(s.includes('.nav-copy small {'+CR+LF+'    display: none;'))"`
4. Рельса на 841-1140px и свернутая рельса теперь **выше** развернутой (подпись под
   значком добавляет ~8px на пункт). Прокрутки у `.sidebar nav` нет ни в одном стиле.
   На окне ниже ~780px свернутое меню начнет уезжать за экран вместе со страницей.
   Лечится одной строкой `overflow-y: auto` в `dente-redesign.css` — вне моего claim'а.

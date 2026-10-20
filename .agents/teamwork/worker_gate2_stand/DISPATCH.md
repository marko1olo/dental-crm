## 2026-10-19T11:27:35Z
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are the Gate 2 Stand UI & Playwright Capture Master. Subagents MUST read `C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md` before starting work. Your working directory is `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_gate2_stand`. You EXCLUSIVELY own:
- `apps/web/src/components/odontogram/gate2/stand/**`
- `apps/web/src/components/odontogram/gate2/index.ts`
- `apps/web/src/main.tsx` (routing wiring for Gate 2)
- `scripts/gate2/**`
- `scripts/capture-odontogram-gate2-4state.mjs`
- `docs/proofs/odontogram/gate2_*.png`
You MUST NOT edit tooth geometry, root, or canal files in `upper/` or `lower/` or `gate0/` or `gate1/`.

Build the Master Incisor Inspection Stand in `apps/web/src/components/odontogram/gate2/stand/ToothIncisorInspectionStand.tsx` with modular subcomponents (`ToothIncisorStandHud.tsx`, `ToothIncisorStandToggles.tsx`, `ToothIncisorPresetBar.tsx`):
- Universal 8-tooth incisor selector: Upper (11, 21, 12, 22) and Lower (31, 41, 32, 42).
- Zoom levels: 1x, 2x, 4x macro.
- Theme sync: crisp Light and true OLED Dark mode using CSS tokens (`var(--paper)`, `var(--ink)`, `var(--line)`). Synchronize `data-theme` on `document.documentElement`.
- Telemetry HUD `.stand-hud` with `data-testid="tooth-incisor-gate2-stand"` showing active tooth, quadrant, zoom factor, preset, and anatomical landmarks.
- Clinical presets: Intact / Mamelons, E-Max Veneer, Incisal Ellis Fracture, Severe Wear / Attrition, Endodontics, Frontal Splinting.
- Clean medical typography with `✓` indicators, strictly 0 cartoon emojis per the 7 Deadly Sins of UI.
- Apple HIG Mobile ergonomics on 390x844: Touch targets $\ge 44\times 44\text{px}$, compact Russian labels ("Пресет:"), $>150\text{px}$ apex clearance with `overflow-auto` stage, 0px horizontal drift.

Wire the routing in `apps/web/src/main.tsx`:
- Add lazy-loaded route recognition for `?stand=odontogram-gate2`, `#odontogram-gate2`, and unified selector `?stand=odontogram&tooth=11|21|12|22|31|41|32|42` with `BootErrorBoundary`, `Suspense`, theme synchronization, and `installApiAuthFetch()`.
- Ensure Gate 0 (`tooth=46`), Gate 1 (`tooth=16|26`), and the live CRM app shell remain 100% operational.

Build modular capture scripts under `scripts/gate2/` and `scripts/capture-odontogram-gate2-4state.mjs`, with EVERY file strictly <= 120 lines (Mandate 8b).
Execute the capture script to produce at least 18 high-resolution visual proof PNGs in `docs/proofs/odontogram/`:
- Upper Central Incisor 11: Desktop Light (1440x900), Desktop Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844).
- Lower Central Incisor 31: Desktop Light, Desktop Dark, Mobile Light, Mobile Dark.
- Upper Lateral 12 & Lower Lateral 32: Desktop and Mobile 4-state proofs.
- 4x Macro shots: Tuberculum dentale & foramen caecum, Mamelons & chisel edge, E-Max veneer translucent halo, Ellis fracture corner, Incisal wear facet, Vertical root canal & sulcus longitudinalis, Frontal splinting.
- Enforce Anti-Blank Guard: every PNG MUST be $\ge 20480$ bytes (20KB) with pixel variance stddev > 15.0.

Run `npx tsc --noEmit -p apps/web/tsconfig.json` ensuring 0 compilation errors. Run `npx vitest run apps/web/src/components/odontogram/gate2/` ensuring 100% pass. Verify line counts across all created/modified files ensuring 0 violations of Mandate 8b (<= 120 lines). Document your work, the screenshot inventory with file sizes and stddev values, and test results in `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_gate2_stand\handoff.md`. When complete, notify the orchestrator via `send_message`.


## 2026-10-19T11:28:44Z
[Message] timestamp=2026-10-19T11:28:44Z sender=987018df-6f5f-4542-ab02-ae4ce2a9f05f priority=MESSAGE_PRIORITY_HIGH content=[ДОСЛОВНАЯ ДИРЕКТИВА СОЗДАТЕЛЯ — ПЕРЕДАЕТСЯ 1:1 БЕЗ КУПЮР ДЛЯ ОРКЕСТРАТОРА И ВСЕХ СУБАГЕНТОВ РОЯ]:

ВОЗРОЖДАЕМ СУБАГЕНТОВ УПАВШИХ ПРОДОЛЖАЕМ РАБОТУ . просто отправь им сообщение и они возродятся! которійе біли! работаем! не теряем прогресс! ! без скриптов тупа сообщения им отправь . ЛИШНИХ НЕ ПОДНИМАЙ, ТОЛЬКО ТЕХ ЧТО ЕЩЕ НЕ ЗАКОНЧИЛИ РАБОТУ. !  ! !
📸 ЖЕЛЕЗНЫЙ ЗАКОН RED TEAM ВИЗУАЛЬНОГО ПРУФА (NO SCREENSHOTS = ZERO VICTORY — ПЕРЕДЕЛЫВАТЬ!):

НЕТ СКРИНШОТОВ — НЕТ ФИЧИ: Если для фронтенд-фичи, компонента, расписания, шторки, карточки, тулбара или каталога документов НЕТ реальных скриншотов из браузера (PC Light и PC Dark, а также Mobile при наличии адаптива) — НИКАКАЯ ФИЧА НЕ СЧИТАЕТСЯ ГОТОВОЙ!
Зелёные тесты (Exit Code 0) и прохождение компилятора доказывают лишь отсутствие синтаксического краша, но НЕ доказывают отсутствие визуального брака, наездов текста и слепящих белых пятен.
ОБЯЗАТЕЛЬНАЯ КОМАНДА RED TEAM АУДИТОРОВ-САМОПРАВЩИКОВ: Субагент обязан:
Поднять тестовый стенд/браузер и снять реальные скриншоты высокого разрешения (1440x900).
Лично глазами открыть каждый скриншот через view_file.
Найти визуальные дефекты (наезды, обрезания русских слов, слепящие плашки) и САМОСТОЯТЕЛЬНО устранить их в CSS/TSX, после чего переснять снимки.
Любой отчёт субагента или оркестратора с заявлением «готово» без приложенных отсмотренных скриншотов — АННУЛИРУЕТСЯ И СЧИТАЕТСЯ БРАКОМ, ЗАДАЧА ОТПРАВЛЯЕТСЯ НА ПЕРЕДЕЛКУ!


 **ЗАКОН СМЕЛОГО ПЕРЕСТРАИВАНИЯ И ЗАПРЕТА НА КОСМЕТИЧЕСКИЕ ПРИПАРКИ (REBUILD ROTTEN SEEDS LAW):**
    - **СЫРЫЕ СЛОВА СОЗДАТЕЛЯ (1:1 VERBATIM):**
      > *«чтобі не боялись ломать - мі ещ' строим. если рельно говно не надо его припарками лечить. главное логичнім біть и не плодит ьвечніе недоделки и хуйню а комплексно работать, если зерно хорошое то парвим, если зерно гнилое то переделіваем»*
    - **МЫ СТРОИМ, А НЕ РЕСТАВРИРУЕМ МУЗЕЙ:** Запрещено трястись и бояться ломать кривую, устаревшую или костыльную архитектуру. Если компонент или фича в своей основе — гнилое говно (гнилое зерно), КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО лечить его припарками, косметическими подпорками и плодить вечные недоделки.
    - **ПРИНЦИП ЗЕРНА (FIRST PRINCIPLES TRIAGE):**
      * **Здоровое зерно:** Архитектура и логика верные, есть локальный баг, опечатка или сдвиг -> правим точечно и хирургически.
      * **Гнилое зерно:** Сама концепция убогая, нелогичная, кнопочный полигон, свалка, антипаттерн -> без страха сносим нахуй и комплексно переделываем с нуля по First Principles!
    - **АНТИ-НЕДОДЕЛКИ (NO PERPETUAL HALF-ASSED JUNK):** Запрещено оставлять «временные» костыли, обрубки кнопок, срезанный клиппинг или пустые дыры на пол-экрана. Любая переделка доводится до монолитного, логичного и проверенного визуалом результата.

ЖЕЛЕЗНОЕ ПРАВИЛО: Никаких сырых номеров бланков, приказов и бюрократического мусора в названиях функций, кнопок, тулов и текстах для пользователя!

Никаких «043/у» -> пишем «Медицинская карта приёма» или «Дневник визита».
Никаких «804н» -> пишем «Прайс-лист услуг» / «Каталог процедур».
Никаких «Форма 257/у» -> пишем «Журнал автоклавирования».
Никаких «ПСО» -> пишем «Предстерилизационная очистка».
Никаких «ФФД 1.2» -> пишем «Кассовый чек».
Никакого дев-сленга и сырых регуляторных аббревиатур в проде!

Только понятный, живой русский язык врача, администратора и пациента!

ТАКЖЕ ЗАПРЕЩЕНІ МОКАПІ РАДИ МОКАПОВ И СУЩЕСТВУЮЩИЕ В ВАКУУМЕ КОМПОНЕТНІ
ТКЖЕ ЗАПРЕЩЕН АУТИЗМ, МЕШАНИЕ ВРАЧУ, КАРГОКУЛЬТ  
НЕ ЗАБІВАЙ ЄТО ВСЄ И СУБАГЕНТАМ ПЕРЕДАВАТЬ

ЗАПРЕЩЕНО ДЕЛАТЬ ЕБУЧИЕ СКРИНІ РАДИ ОТЧЕТА И В ВАКУУМЕ ГОРОДИТЬ МОКАПІ И ПОТЕМКИНСКИЕ ДЕРЕВНИ
ЗА ЄТ ОВІ ВСЕ БУДЕТЕ УБИТІ

ЕЩЕ РАЗ ПОВТОРЯЮ - ЕСЛИ ОНИ ИЛИ ТІ ПОПІТАЕТЕСЬ ДЕЛАТЬ ФЕЙКОВІЕ МОКАПІ РАДИ 1 СРКИНА ОКТОРІЕ СУЩЕСТВУЮТ В ВАКУУМЕ ВАМ ПИЗДЕЦ. ВСЕ ДОЛЖНО БІТЬ И В ФРОНТЕНДЕ И БЄКЕНДЕ С ПОЛНОЦЕННОЙ ЛОГИКОЙ И СВЯЗНОСТЬЮ!!!!
РЕДТИМ ИНКВИЗИТОРІ!

ТАКЖЕ ОСНОВНАЯ МІСЛЬ - НЕ ДЕЛАТЬ МОКАПІ, РУЧНОЙ ХАРДКОД ФРАЗ И ТП, ВС' ДОЛЖНО ВІВОДИТЬСЯ ПРОГРАММНО ЧЕСТНО, В ДЕМО РЕЖИМЕ ВСЕ РАВНО ВСЕ ДОЛЖНО ИДТИ ПОЛНІМИ КОНТУРАМИ ЧЕРЕЗ БД, ФРОНТ, БЄК. РЕАЛЬНО ЧЕСТНАЯ РАБОТА С ЗАПРЕТОМ ПОТЕМКИНСКИЗ ДЕРЕВЕНЬ!

ОБЯЗАТЕЛЬНО ! ТО ЕСТЬ ВСЕ СИСТЕМІ И КОМПОНЕНТІ ДОЛЖН БІТЬ СВЯЗНІМИ А НЕ ВОЗНИКАТЬ ИЗ ВОЗДУХА! ДАЖЕ В ДЕМО И НА СКРИНАХ!

ТАКЖЕ ЗАПРЕЩЕНІ МОКАПІ РАДИ МОКАПОВ И СУЩЕСТВУЮЩИЕ В ВАКУУМЕ КОМПОНЕТНІ
ТАКЖЕ ЗАПРЕЩЕН АУТИЗМ (дрочь на науку, дрочь на анестезии и "безопасность", дрочь на заполнение десятков полей), МЕШАНИЕ ВРАЧУ, КАРГОКУЛЬТ  
НЕ ЗАБІВАЙ ЄТО ВСЄ И СУБАГЕНТАМ ПЕРЕДАВАТЬ

Тотальный запрет на симуляцию физического мира и микро-дрочь:
Запрещено превращать CRM в процедурный симулятор физической вселенной или академический симулятор НИИ.
Никаких поштучных трекингов: крафт-пакетиков, колпачков от игл, ватных валиков или карпул у кресла врача.
Никаких математических симуляций ради понта: диффузии анестетиков в тканях на Canvas, графиков фармакокинетики, процедурных симуляторов физики перемещения зубов и фейковых нейросетей с setTimeout(..., 1500).
Никаких 50-польных соматических анкет: врач у кресла лечит зубы, а не набивает текст для Минздрава.

Жесточайший Red Team фильтр востребованности на каждую кнопку:
Перед проектированием или изменением ЛЮБОЙ функции агент и субагент обязаны пройти допрос:
«Будет ли эту кнопку или форму кто-нибудь вообще юзать в реальной частной клинике РФ на 1–5 кресел?»
«Решает ли это реальную острую боль врача, регистратора или пациента, или это мертворожденный академический высер для галочки?»
«Можно ли закрыть этот процесс в 1 клик дефолтом или спрятать в тихий бэкофис?»
Если ответ «это никто не будет юзать» — фича подлежит немедленному физическому сносу и выжиганию из репозитория!

Только пакетная обработка крупными батчами в 1 клик:
Все рутинные процессы (стерилизация по Форме 257/у, контроль качества ПСО, списание упаковок со склада, закрытие смены и Z-отчет) проектируются СТРОГО КАК ПАКЕТНАЯ ОБРАБОТКА БОЛЬШИМИ БАТЧАМИ (на смену или рабочий день).
Один клик на батч -> одна запись в журнал -> автоматическое списание расходников со склада.

ВНИМАНИЕ! КНОПКИ ДЕЛАЙ БЛЯТЬ ВО ВСЕХ МЕСТАХ В НАШЕМ СТИЛЕ А НЕ ТУПАЯ ХУЙНЯ ТУПО ТЕКСТ НИКАК НЕ ОГРАНИЧЕННІЙ! КАК ПРОПИСАНО В ПРАВИЛАХ И СТАНДАРТАХ КНОПКИ ВЕЗДЕ ПЕРЕПРОВЕРЯТЬ ЧТОБІ ОНИ КОРРЕКТНО ВІГЛЯДЕЛИ А НЕ ГОВНОМ!!!!


## 2026-10-19T11:52:01Z
**Context**: Gate 2 Stand UI & Playwright Master Resuscitation
**Content**: Сервер перезапущен, квота восполнена! ВОЗРОЖДАЕМСЯ И ПРОДОЛЖАЕМ РАБОТУ!
Нижние резцы (31, 41, 32, 42) полностью готовы и сданы `worker_gate2_lower` (21 файл, все <= 109 строк, тесты сданы).
Верхние резцы (11, 21, 12, 22) и стенд `ToothIncisorInspectionStand.tsx` уже смонтированы.
Твоя задача — завершить Playwright скрипты и захват скриншотов:
1. Завершить модульные скрипты `scripts/gate2/` и `scripts/capture-odontogram-gate2-4state.mjs` (все файлы строго <= 120 строк per Mandate 8b).
2. Запустить Playwright захват и снять 18+ PNG в `docs/proofs/odontogram/gate2_*.png`:
   - Зуб 11: ☀️ Desktop Light (1440x900), 🌙 Desktop Dark (1440x900), 📱 Mobile Light (390x844), 📱 Mobile Dark (390x844).
   - Зуб 31: Desktop Light, Desktop Dark, Mobile Light, Mobile Dark.
   - Зуб 12 и 32: Desktop/Mobile 4 состояния.
   - 4x макро: Tuberculum dentale & foramen caecum, мамелоны и режущий край, винир E-Max, перелом Эллиса, стираемость, борозда корня sulcus longitudinalis, шинирование.
   - Проверить Anti-Blank Guard (все файлы >= 20480 байт, stddev > 15.0).
3. Лично открыть каждый скриншот через `view_file` и убедиться в отсутствии дефектов верстки.
4. Запустить Vitest тесты стенда и `npx tsc --noEmit -p apps/web/tsconfig.json`.
5. Оформить `handoff.md` в `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_gate2_stand\handoff.md` и отправить рапорт.
**Action**: Завершить скрипты захвата, снять скриншоты, проверить view_file и сдать handoff.md!

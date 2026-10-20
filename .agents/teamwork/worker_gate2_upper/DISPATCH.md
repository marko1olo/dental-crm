## 2026-10-19T11:27:35Z
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are the Upper Incisors Master Sculptor for Gate 2 of the DENTE Dental CRM Odontogram. Subagents MUST read `C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md` before starting work. Your working directory is `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_gate2_upper`. You EXCLUSIVELY own all upper incisor components under `apps/web/src/components/odontogram/gate2/upper/**`, incisor types under `apps/web/src/components/odontogram/gate2/types/**`, and unit tests under `apps/web/src/components/odontogram/gate2/__tests__/upperIncisors.test.tsx`. You MUST NOT write to `gate0/`, `gate1/`, `shared/`, or `main.tsx`.

Model the authentic 2.5D perspective vector geometry for maxillary incisors according to Wheeler's Dental Anatomy Chapter 8:
- Upper Central Incisors (11 & 21): Wide shovel-shaped crown (лопатообразная коронка), wider mesiodistally than labiopalatal. Labial surface with 2 shallow developmental depressions dividing it into 3 lobes; palatal surface with prominent *tuberculum dentale* (cingulum) at cervical third, broad shallow *fossa lingualis*, mesial and distal marginal ridges, and *foramen caecum*. Single massive conical root tapering to a rounded apex, straight trajectory. Single wide root canal with conical taper and 1.5px overlap into pulpal floor.
- Upper Lateral Incisors (12 & 22): Slender shovel crown with prominently rounded distoincisal angle. Deep palatal fossa, distinct cingulum, frequent *palatoradicular groove*. Slender conical root with slight distal apical curve.
- Bilateral mirror symmetry: Implement Tooth 11 (Upper Right) vs Tooth 21 (Upper Left), and Tooth 12 vs Tooth 22 via clean bilateral transformation ($x' = 100 - x$).

Consume shared defs and overlays from `apps/web/src/components/odontogram/shared/` (`DenteGlobalShaderDefs`, `CrownMaterialOverlay`, `ImplantSlaOverlay`, `ApicalHaloOverlay`). In addition, implement incisor-specific clinical overlays:
1) `UpperIncisorVeneerOverlay.tsx`: E-Max porcelain veneer (0.3–0.5 mm thickness with translucent incisal edge, high-glass reflection, chamfer prep margin);
2) `UpperIncisorTraumaOverlay.tsx`: Ellis Class II (enamel-dentin fracture of mesioincisal or distoincisal angle) and Ellis Class IV (fracture with non-vital/discolored crown);
3) `UpperIncisorWearOverlay.tsx`: Incisal edge attrition / wear facets (I–III degree) exposing warm amber dentin;
4) Cervical abfraction and straight-canal fiberglass post overlays.

MANDATE 8B INVARIANT: Every single file you create or edit MUST be strictly <= 120 lines (zero exceptions). Decompose files cleanly:
- `tooth11GeometryConstants.ts`, `tooth12GeometryConstants.ts`
- `Tooth11Crown.tsx`, `Tooth11Root.tsx`, `Tooth11EndoCanal.tsx`, `Tooth11Container.tsx`, `Tooth21Container.tsx`
- `Tooth12Crown.tsx`, `Tooth12Root.tsx`, `Tooth12EndoCanal.tsx`, `Tooth12Container.tsx`, `Tooth22Container.tsx`
- `UpperIncisorVeneerOverlay.tsx`, `UpperIncisorTraumaOverlay.tsx`
Ensure full compliance with TypeScript `exactOptionalPropertyTypes: true`. Run `npx tsc --noEmit -p apps/web/tsconfig.json` ensuring 0 compilation errors.

Write comprehensive Vitest unit tests in `apps/web/src/components/odontogram/gate2/__tests__/upperIncisors.test.tsx` verifying all 4 upper incisors (11, 21, 12, 22), shovel crown geometry, cingulum, single wide canal, bilateral symmetry, veneer overlay, and trauma fractures. Run an automated line-count script ensuring 0 files exceed 120 lines. Document all created files, line counts, and test execution results in `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_gate2_upper\handoff.md`. When complete, notify the orchestrator via `send_message`.

## 2026-10-19T11:28:07Z
[ДОСЛОВНАЯ ДИРЕКТИВА СОЗДАТЕЛЯ — ПЕРЕДАЕТСЯ 1:1 БЕЗ КУПЮР ДЛЯ ОРКЕСТРАТОРА И ВСЕХ СУБАГЕНТОВ РОЯ]:

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
СУБАГЕНТАМ ЭТОТ ТЕКСТ ПЕРЕДАВАТЬ ВТОРЫМ СООБЩЕНИЕМ ДОСЛОВНО!


## 2026-10-19T11:52:01Z
**Context**: Gate 2 Upper Incisors Master Sculptor Resuscitation
**Content**: Сервер перезапущен, квота восполнена! ВОЗРОЖДАЕМСЯ И ПРОДОЛЖАЕМ РАБОТУ!
Весь твой прогресс в `apps/web/src/components/odontogram/gate2/upper/` и `types/` сохранён.
Твоя задача — завершить оставшиеся шаги:
1. Завершить TypeScript проверку (`npx tsc --noEmit -p apps/web/tsconfig.json`) с `exactOptionalPropertyTypes: true`.
2. Запустить Vitest тесты `apps/web/src/components/odontogram/gate2/__tests__/upperIncisors.test.tsx` (100% pass).
3. Проверить лимит строк: КАЖДЫЙ созданный файл строго <= 120 строк (Мандат 8b).
4. Оформить `handoff.md` в своей рабочей директории `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_gate2_upper\handoff.md`.
5. Отправить отчёт ординатору через `send_message`.
**Action**: Завершить верификацию верхних резцов и сдать handoff.md!

## 2026-10-19T11:27:35Z
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are the Lower Incisors Master Sculptor for Gate 2 of the DENTE Dental CRM Odontogram. Subagents MUST read `C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md` before starting work. Your working directory is `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_gate2_lower`. You EXCLUSIVELY own all lower incisor components under `apps/web/src/components/odontogram/gate2/lower/**`, incisor overlay components under `apps/web/src/components/odontogram/gate2/overlays/**`, and unit tests under `apps/web/src/components/odontogram/gate2/__tests__/lowerIncisors.test.tsx`. You MUST NOT write to `gate0/`, `gate1/`, `shared/`, or `main.tsx`.

Model the authentic 2.5D perspective vector geometry for mandibular incisors according to Wheeler's Dental Anatomy Chapter 9:
- Lower Central Incisors (31 & 41): Smallest teeth in the human dentition. Highly symmetrical chisel-shaped crown (долотообразная коронка), sharp mesioincisal and distoincisal angles, 3 distinct mamelons on unworn incisal edges. Labial surface flat in incisal two-thirds, convex near cervical line. Smooth lingual surface with subtle cingulum. Root: extremely slender, highly compressed mesiodistally with deep longitudinal developmental grooves (*sulcus longitudinalis*) on both mesial and distal surfaces creating pronounced 3D shadow troughs. Canal: single ribbon-shaped canal or two narrow canals (buccal & lingual) uniting at the apex (Vertucci Type II/III).
- Lower Lateral Incisors (32 & 42): Slightly wider than centrals, incisal edge slopes cervically toward distal, crown twisted slightly distally on root axis. Same mesiodistally compressed root with bilateral longitudinal grooves.
- Bilateral mirror symmetry: Implement Tooth 41 (Lower Right) vs Tooth 31 (Lower Left), and Tooth 42 vs Tooth 32 via clean bilateral transformation ($x' = 100 - x$).

Consume shared defs and overlays from `apps/web/src/components/odontogram/shared/`. In addition, implement mandibular incisor clinical overlays:
1) `LowerIncisorWearOverlay.tsx`: Pathological incisal attrition (Degree I: enamel flattening; Degree II: amber dentin islands; Degree III: worn down to secondary dentin near pulp chamber);
2) `LowerIncisorAbfractionOverlay.tsx`: V-shaped wedge defect at labial cervical margin;
3) `FrontalSplintingOverlay.tsx`: Orthopedic/periodontal splinting ribbon (стекловолоконная или металлическая шина по оральной поверхности для стабилизации подвижных резцов при пародонтите);
4) Periodontal bone recession with exposed root trunk and mobility grade indicator.

MANDATE 8B INVARIANT: Every single file you create or edit MUST be strictly <= 120 lines (zero exceptions). Decompose files cleanly:
- `tooth31GeometryConstants.ts`, `tooth32GeometryConstants.ts`
- `Tooth31Crown.tsx`, `Tooth31Root.tsx`, `Tooth31EndoCanal.tsx`, `Tooth31Container.tsx`, `Tooth41Container.tsx`
- `Tooth32Crown.tsx`, `Tooth32Root.tsx`, `Tooth32EndoCanal.tsx`, `Tooth32Container.tsx`, `Tooth42Container.tsx`
- `LowerIncisorWearOverlay.tsx`, `FrontalSplintingOverlay.tsx`
Ensure full compliance with TypeScript `exactOptionalPropertyTypes: true`. Run `npx tsc --noEmit -p apps/web/tsconfig.json` ensuring 0 compilation errors.

Write comprehensive Vitest unit tests in `apps/web/src/components/odontogram/gate2/__tests__/lowerIncisors.test.tsx` verifying all 4 lower incisors (31, 41, 32, 42), chisel crown geometry, mamelons, mesiodistally flattened root with sulcus longitudinalis, Vertucci canal trajectories, bilateral symmetry, attrition wear, and splinting. Run an automated line-count script ensuring 0 files exceed 120 lines. Document all created files, line counts, and test execution results in `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_gate2_lower\handoff.md`. When complete, notify the orchestrator via `send_message`.


## 2026-10-19T11:28:27Z
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

# ВЕЛИКАЯ ИНКВИЗИЦИЯ DENTE CRM: ГЕНЕРАЛЬНЫЙ АКТ И СВОДНЫЙ РЕЕСТР БРАКА


> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
> ⚠️ **ВЫСШАЯ КОНСТИТУЦИЯ:** **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)**  
> 📜 **СИСТЕМНАЯ КОНСТИТУЦИЯ:** **[.agents/AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** (Мандаты 1..11, Мандат 8e — Автономия врача и персонала)  
> 🗺️ **ГЛАВНЫЙ НАВИГАЦИОННЫЙ ХАБ:** **[.agents/INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)**  
> 🎨 **СТАНДАРТЫ UI И ЭРГОНОМИКИ:** **[.agents/UI_STANDARDS.md](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)**  
> 🧭 **КАРТА ПРЕДСТАВЛЕНИЙ И МОДАЛОК:** **[.agents/FRONTEND_VIEWS_MAP.md](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md)**  
> 📋 **СВОДНЫЙ РЕЕСТР ДЕФЕКТОВ NIGHT WATCH:** **[NIGHT_WATCH_DEFECT_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/audits/NIGHT_WATCH_DEFECT_REGISTRY.md)**  
> 🧹 **ПЕРЕПИСЬ АКАДЕМИЧЕСКОГО БЛОАТА:** **[BLOAT_CENSUS_PHASE_3.md](file:///C:/Clinic_MVP/dental-crm/docs/audit/BLOAT_CENSUS_PHASE_3.md)** | **[CODEBASE_BLOAT_CENSUS_V2.md](file:///C:/Clinic_MVP/dental-crm/docs/audit/CODEBASE_BLOAT_CENSUS_V2.md)**  

**Дата фиксации:** 2026-09-04  
**Роль аудитора:** L2 Lead Specialist — Inquisition & UI/UX Clinical Standards Auditor  
**Стандарт:** The Hammer Supreme Constitution (`THE_HAMMER_MASTER_PROMPT.md`, `AGENTS.md`)  
**Принцип:** **ПРЕЗУМПЦИЯ БРАКА (100% BRUTAL TRUTH, НУЛЕВАЯ СИКОФАНТИЯ)**  
**Статус инспекции:** `ПРОВЕРЕНО` (сплошной попиксельный аудит скриншотов, валидация кодовой базы, проверка гейтов компиляции).

---

## ⚖️ 1. РЕВИЗИЯ СТАНДАРТОВ ИНКВИЗИЦИИ: МАНДАТ 8e И APPLE/MAC HIG

Вся система оценки пользовательского интерфейса, клинических модулей и печатных документов DENTE CRM базируется на двух абсолютных столпах:

### 🛑 Столп 1: Мандат 8e (Автономия врача и персонала — Запрет на палки в колёса)
*Софт обязан помогать врачу лечить людей, а не служить бюрократическим цербером.*
1. **Никаких заблокированных кнопок без причины:** Кнопки «Сохранить», «Завершить приём», «Добавить услугу», «Печать» **НИКОГДА не должны быть серыми (`disabled`)** из-за незаполненных второстепенных полей (температура, влажность, пульс, 50 пунктов соматической анкеты).
2. **Физиологическая норма по умолчанию:** Все осмотры и анамнез заполняются физиологической нормой в 1 клик («Соматически здоров / норма»). Врач правит только патологию.
3. **Свобода черновиков и автосохранение (Debounced Autosave):** Врач свободно правит свои дневники в 1 клик с версионным аудитом («Исправленному верить»). Запрещены 24-часовые замки намертво. Любой ввод сохраняется на лету; смена вкладки или звонок не уничтожают черновик.
4. **Печать в любой момент:** Форма 043/у, согласия и сметы печатаются в любой момент: если визит открыт — с водяным знаком «ЧЕРНОВИК», если закрыт — «ПОДПИСАНО ВРАЧОМ».
5. **Свобода скидок врача до 100%:** Врач вправе применить скидку (вплоть до 100% на гарантийные переделки и персонал) без ввода мастер-паролей администратора. Планы лечения старше 30 дней не блокируют создание нарядов ЗТЛ, оказание услуг или оплату.
6. **Регистратура без барьеров:** Запрещено требовать обязательного выбора ассистента при создании записи. Регистратор вправе распечатать пустой договор со строками `_______` и суммой 0 ₽ для ручного подписания до осмотра без 403-ошибок.
7. **Касса 54-ФЗ без палок в колёса:** Запрещено требовать ИНН с физических лиц при оплате наличными или картой (по 54-ФЗ ИНН нужен только юрлицам/ИП). Касса обязана принимать комбинированную оплату (нал + карта + аванс/бонусы) в 1 клик.
8. **Склад и медсестра:** Медсестра списывает пустые карпулы анестетиков в 1 клик без комиссии из 3 человек. Мягкий овердрафт склада с предупреждением вместо блокировки экстренной операции.
9. **Молниеносный рентген:** Снимок визиографа открывается $< 50\text{ms}$ в полном разрешении датчика без 45-секундных зависаний на нейросети. ИИ запускается строго по отдельной кнопке врача. Запрещена перезапись зубной формулы роботом без подтверждения врача.

### 🍏 Столп 2: Стандарты Apple macOS & iOS Clinical HIG (Studio Clinical Ergonomics)
1. **Компактные десктопные тулбары 32–36px:** Никаких многоэтажных панелей и «пультов от телевизора». Вспомогательные кнопки имеют высоту $32\text{--}36\text{px}$ с компактными отступами (`gap-1.5` / `gap-2`). Тулбар занимает строго 1 строку ($\le 7$ элементов без частокола).
2. **Закон «Zero Floating Blobs» (Запрет на плавающий мусор в углах):** Категорически запрещено размещать плавающие кнопки (FAB), круглые/квадратные виджеты телефонии или перекрывающие оверлеи (`position: fixed`) поверх рабочих таблиц, списков и расписания. Все элементы управления принадлежат структуре экрана: Top Navigation Bar, Bottom TabBar или контекстному меню карточки.
3. **Закон «Анти-Матрёшка» (Strict Anti-Matryoshka Law):** Максимальная глубина модальных окон — **СТРОГО 1**. Карточки внутри карточек запрещены. Разделение слоев строится на тональных подложках дизайн-токенов (`var(--paper)`, `var(--paper-strong)`, `var(--paper-soft)`), а не на 4 слоях рамок `border`.
4. **Закон 80 / 10 / 10:** 80% времени — десктопный ПК врача и регистратуры (панель пилота, 150ms Hover HUD, 0-клик касса), 10% — планшет врача у кресла ($\ge 44\times 44\text{px}$ тач-таргеты, нативный Segmented Control вместо 2500px скролла смет), 10% — мобильный личный кабинет пациента (Apple Health UX, 1-клик справка ФНС 1151156).
5. **Строгая медицинская типографика:** Никаких мультяшных эмодзи в медицинских картах 043/у, актах, чеках и ИДС — только строгие векторные иконки `lucide-react`.

---

## 🏆 2. РЕЕСТР УСТРАНЁННЫХ КЛИНИЧЕСКИХ ДЕФЕКТОВ И БАРЬЕРОВ (VERIFIED PROOFS)

В ходе реализации реформы Мандата 8e и стандартов Apple HIG ключевые бюрократические барьеры и академический блоат были **ПОЛНОСТЬЮ УСТРАНЕНЫ** в кодовой базе:

| № | Устранённый дефект / Барьер | Файлы кодовой базы | Что было (Брак и Блоат) | Что стало (Клинический стандарт 8e) | Статус |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **1** | **1-Клик Пародонтология и авто-стадирование** | [`PeriodontalChartingModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PeriodontalChartingModal.tsx) | 192-точечный пошаговый опросник-степпер (192 клика на приёме), академическая spider-диаграмма Lang & Tonetti, блокировка протокола 043/у. | 1-клик заполнение физиологической нормы (`handleApplyNorm`), 1-клик протокол профгигиены УЗ + Air Flow A16.07.051 (`handleQuickHygieneAirFlow`), 1-клик разметка кармана (`handleMarkActiveToothPocket`), авто-стадирование AAP/EFP 2017 и индексов OHI-S/PSR. | **УСТРАНЕНО (`ПРОВЕРЕНО`)** |
| **2** | **1-Клик Списание карпул анестетиков** | [`NurseCarpuleDisposalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx) | Бюрократическое требование создания комиссии из 3 человек, 15 полей акта на каждую пустую ампулу, блокировка списания при нехватке на складе. | Экспресс-списание пустых карпул медсестрой единолично в 1 клик (`COMMON_ANESTHETICS`), мягкий овердрафт склада с предупреждением вместо срыва операции. | **УСТРАНЕНО (`ПРОВЕРЕНО`)** |
| **3** | **Касса 54-ФЗ без вымогательства ИНН у физлиц** | [`fastCheckoutEngine.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payments/checkout/fastCheckoutEngine.ts)<br>[`FastCheckoutModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payments/checkout/FastCheckoutModal.tsx)<br>[`fiscalReceiptRequirements.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payments/fiscalReceiptRequirements.ts) | Ошибочная валидация, требовавшая обязательный ввод ИНН пациента при оплате картой/наличными (ложная 400 ошибка кассы). | `validateBuyerInn`: для физлиц поле ИНН строго опционально (по закону 54-ФЗ и ФФД 1.2 тег 1228 обязателен только для ЮЛ/ИП). Комбинированная оплата (нал + карта + аванс) в 1 клик. | **УСТРАНЕНО (`ПРОВЕРЕНО`)** |
| **4** | **Молниеносный рентген и визиограф** | [`DirectRvgCaptureModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/DirectRvgCaptureModal.tsx)<br>[`MedicalRadiologyDropzone.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/MedicalRadiologyDropzone.tsx) | Зависания до 45 секунд из-за автоматического прогона через нейросеть при открытии кадра; риск перезаписи зубной формулы роботом. | Прямой захват кадра с датчика $< 50\text{ms}$ (USB 3.0 CMOS Direct), горячие клавиши (`Space`, `R`, `+`, `-`), ИИ запускается строго по отдельной кнопке врача, робот не перезаписывает статус зуба. | **УСТРАНЕНО (`ПРОВЕРЕНО`)** |

---

## 🗂️ 3. КАТАЛОГ МАТЕРИАЛОВ ИНКВИЗИЦИИ

| Документ | Роль / Область инспекции | Ключевые вскрытые дефекты и стандарты |
| :--- | :--- | :--- |
| **[`01_DARK_MODE_CONTRAST_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/01_DARK_MODE_CONTRAST_DEFECTS.md)** | Инквизитор 1: Dark Mode Contrast Hound | Черный невидимый текст на черном фоне (1.05:1), слепящие белые плашки `#FFFFFF` в темноте, невидимые границы таблиц, тусклые подписи. |
| **[`02_LIGHT_MODE_CONTRAST_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/02_LIGHT_MODE_CONTRAST_DEFECTS.md)** | Инспектор 2: Light Mode Contrast Hound | Черные дыры и утечки Dark Theme в файлы `_light.png`, слепые светло-серые шрифты (1.48:1), слипающиеся белые карточки без границ. |
| **[`03_MOBILE_390PX_OVERFLOW_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/03_MOBILE_390PX_OVERFLOW_DEFECTS.md)** | Инквизитор 3: Mobile 390px Overflow Sniper | Схлопывание табов в кашу, обрезка ФИО и сумм троеточиями, перекрытие интерактивных слотов софтфоном, вылет кнопок за экран. |
| **[`04_ZINDEX_COLLISION_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/04_ZINDEX_COLLISION_DEFECTS.md)** | Инквизитор 4: Z-Index & Collision Auditor | Перекрытие сетки расписания (13:00–15:00) софтфоном, наезд WebRTC шторки на прием, выпадающие списки рендерятся под таблицами. |
| **[`05_FITTS_TOUCH_TARGET_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/05_FITTS_TOUCH_TARGET_DEFECTS.md)** | Инквизитор 5: Fitts's Law & Touch Target Auditor | Микро-таргеты 14–18px на мобилках, зазоры между кнопками <8px (ложные нажатия в перчатках), срезы поверхностей зубов 8–12px. Норма: $\ge 44\times 44\text{px}$. |
| **[`06_HICKS_MILLER_OVERLOAD_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/06_HICKS_MILLER_OVERLOAD_DEFECTS.md)** | Инквизитор 6: Hick's & Miller's Overload Auditor | Частокол из 10 кнопок тулбара, 2 Primary кнопки `+ Запись`, свалка по 5 кнопок в строках таблиц (50 кнопок на экране), 12 табов СанПиН. Внедрение 1-клик пресетов 8e. |
| **[`07_CBCT_RADIOLOGY_TRUTH_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/07_CBCT_RADIOLOGY_TRUTH_DEFECTS.md)** | Инквизитор 7: CBCT Anatomical Truth Auditor | Черные экраны `#000000` в Coronal/Sagittal/Cross-Section, воздух `-1720 HU`, кость `98 HU`, зуб 16 вверх ногами, нерв IAN сквозь корни. Калибровка Romexis MPR. |
| **[`08_MEDICAL_DENSITY_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/08_MEDICAL_DENSITY_DEFECTS.md)** | Инквизитор 8: Medical Density Auditor | Шапки 250–440px вытесняют таблицы (всего 2–3 строки), строки расписания 60px, строки счетов 72px, срез корней зубов на главном экране. Стандарты тулбаров 32–36px. |
| **[`09_TYPOGRAPHY_EMOJIS_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/09_TYPOGRAPHY_EMOJIS_DEFECTS.md)** | Инквизитор 9: Typography, Emojis & Formatting Sniper | Мультяшные эмодзи в ИДС 1051н и рецептах, разрыв сумм `482 \n 500 \n ₽`, отрыв знаков `%` и `₽`, висячие дефисы, англицизмы `&`. Замена на Lucide. |
| **[`10_ANTI_MATRYOSHKA_DEFECTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/10_ANTI_MATRYOSHKA_DEFECTS.md)** | Инквизитор 10: Anti-Matryoshka Auditor | Вложенность карточек 4-го уровня (ВКК, планы лечения, наряды ЗТЛ), обрамленные боксы инпутов. Правило глубины строго 1, переход на тональные подложки. |
| **[`11_SCREENSHOT_PIPELINE_AUTHENTICITY.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/11_SCREENSHOT_PIPELINE_AUTHENTICITY.md)** | Аудитор Скриншот-Пайплайна | Инвентаризация скриптов, ликвидация 48 подавителей `.catch(() => {})`, исключение клонирования хешей, переход на честный Live Server Fastify/Postgres. |
| **[`12_WORKER_SQUADS_DISPATCH_PROMPTS.md`](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/12_WORKER_SQUADS_DISPATCH_PROMPTS.md)** | Архитектор L1: Боевые промпты 7 Бригад | Детальные, исчерпывающие ТЗ для запуска специализированных воркеров с жесткими гейтами компиляции и тайпчека с учетом Мандата 8e и Apple HIG. |

---

## 🗺️ 4. СВОДНАЯ МАТРИЦА 25 ЭКРАНОВ С ПРИВЯЗКОЙ К ДЕФЕКТАМ И СТАНДАРТАМ

| № | Экран / Модуль | Исходный файл компонента | Главные дефекты | Бригада | Статус Мандата 8e & Apple HIG |
| :-: | :--- | :--- | :--- | :-: | :--- |
| **1** | **Расписание & Экстренный буфер** | [`ScheduleGrid.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/ScheduleGrid.tsx) | Коллизия софтфона (слоты 13:00–15:00), 2 кнопки Primary Action, тулбар из 10 кнопок, строки 60px | **Бригада 2 & 6** | Запись без обязательного ассистента; софтфон убран из рабочей зоны сетки |
| **2** | **Планы лечения (3 тарифа)** | [`TreatmentPlan3TierComparison.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlan3TierComparison.tsx) | Матрешка 3-го уровня, футер перекрывает 60% мобильного экрана, конкурирующие Primary кнопки | **Бригада 3** | Нативный Segmented Control вместо 2500px скролла; планы >30 дней не блокируют лечение |
| **3** | **Планы лечения (4 этапа)** | [`TreatmentPlanPhased4StageView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanPhased4StageView.tsx) | Обрезание Этапов 3 и 4 на ПК, вылет кнопок на мобилке, троеточия в диагнозах | **Бригада 3** | Скрытие микро-расходников из сметы для пациента; сжатие карточек до компактных строк |
| **4** | **Касса & Счета 54-ФЗ** | [`PatientBillingModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/PatientBillingModal.tsx) | Эмодзи (`💳`,`💵`,`📱`), разрыв суммы `482 \n 500 \n ₽`, строки 72px, 5 кнопок оплаты в ряд | **Бригада 1 & 2** | **УСТРАНЕНО:** Без ИНН для физлиц; 1-клик комбинированная оплата (нал + карта + аванс) |
| **5** | **Экспорт 1С Бухгалтерия** | [`Billing1CExportModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/Billing1CExportModal.tsx) | Горизонтальный скролл на 390px, разрыв `20 \n %`, отрыв знака `₽`, висячее тире в датах | **Бригада 1 & 2** | Неразрывные токены `\u00A0`; экспорт проводок по CommerceML 2.09 без расхождений |
| **6** | **Одонтограмма & PSR** | [`OdontogramView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/OdontogramView.tsx) | Квадранты сжаты до 180px, срез корней 47..37 на ПК, клик-таргеты 8–12px, слепой серый текст | **Бригада 2 & 5** | **УСТРАНЕНО:** 1-клик физиологическая норма пародонта, 1-клик профгигиена A16.07.051 |
| **7** | **Детская одонтограмма** | [`PediatricMixedDentitionModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PediatricMixedDentitionModal.tsx) | Пустой белый экран `#FFFFFF` (сбой рендера), кнопки 24px, молочные зубы сжаты до 34px | **Бригада 2 & 5** | Замена Cariogram Браттхолла на 3-позиционный селектор кариес-риска; молочная формула 51–85 |
| **8** | **ТРГ & Цефалометрия** | [`CephalometricAnalysisModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/CephalometricAnalysisModal.tsx) | Панель точек вытесняет снимок (85% экрана), точки 8–12px с зазором 4px, кнопки зума 24px | **Бригада 5** | 18 анатомических точек сохранены на 100%; увеличение тач-таргетов зума до 44px |
| **9** | **Журналы СанПиН (12 табов)** | [`SanpinRegistersView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/SanpinRegistersView.tsx) | Частокол из 12 вкладок, шапка 340px вытесняет таблицу (всего 3 строки), 2 Primary Action | **Бригада 4** | Группировка по 3 категориям; компактная шапка 90px; автопилот смены ф. 257/у |
| **10** | **Стерилизация & Класс Б** | [`SanpinCycleModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/sanpin/SanpinCycleModal.tsx) | Обрезание полей температуры на 390px, dropdown рендерится под таблицей | **Бригада 4** | Z-index починен; 1-клик экспресс-списание карпул анестетиков без комиссий |
| **11** | **3D КЛКТ MPR Студия** | [`cbctObliqueMath.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/cbctObliqueMath.ts) | Черные экраны `#000000` в 3 вьюпортах, `-1720 HU` воздух, `98 HU` кость, IAN нерв сквозь корни | **Бригада 5** | Честный воксельный рендеринг; шкала Хаунсфилда по Мишу (D1..D4); нерв вне корней |
| **12** | **2D DICOM Просмотрщик** | [`RadiologyDicomViewerModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/RadiologyDicomViewerModal.tsx) | Инверсия зуба 16 вверх ногами, слепой текст дропзоны 1.48:1, ползунки вылетают за 390px | **Бригада 5 & 6** | **УСТРАНЕНО:** Прямой захват RVG $<50\text{ms}$; ИИ строго по явной кнопке врача |
| **13** | **Зуботехнический наряд (ZTL)**| [`DentalLabOrderModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/DentalLabOrderModal.tsx) | Эмодзи (`👑`,`✨`,`🔩`,`🦷`), английский `&`, матрешка 4 уровня, срез блока VITA на 390px | **Бригада 1 & 3** | Замена эмодзи на иконки Lucide; глубина вложенности = 1; плоская форма наряда |
| **14** | **Гостевой портал лаборатории**| [`GuestLabPortalView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/lab/GuestLabPortalView.tsx) | Карточка 400px с 65% пустоты на мониторах 1440px, обрезание статусов наряда | **Бригада 3 & 6** | Плотная сетка Studio HIG; наглядный статус готовности конструкции техником |
| **15** | **Списание материалов (BOM)** | [`NurseCarpuleDisposalModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx) | Card-in-Table высотой 80px (всего 2 строки на экране), обрезание остатков на 390px | **Бригада 3 & 6** | Компактная таблица со строками 36px; мягкий овердрафт склада без блокировки операций |
| **16** | **Памятка пациента (Post-Op)** | [`PatientMemoPrintModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/PatientMemoPrintModal.tsx) | Эмодзи (`🧊`,`🧚`,`🥛`,`☕`), матрешка 3 уровня в печатном бланке, срез `Отправить в Wh...` | **Бригада 1 & 3** | Печатный монолитный вид А4/А5 без внутренних рамок; иконки Lucide; экспорт в WhatsApp |
| **17** | **Удержание пациентов (Отток)**| [`RetentionAnalyticsView.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/retention/RetentionAnalyticsView.tsx) | Строки 90px с 5 кнопками (50 кнопок на экране), скрытые столбцы LTV на мобилке | **Бригада 3 & 6** | Строго 1 Primary кнопка (`Позвонить`), остальные действия в `...`; строки 44px |
| **18** | **Телефония: Софтфон** | [`TelephonyFloatingWidget.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/telephony/TelephonyFloatingWidget.tsx) | Перекрытие расписания (слоты 13:00–15:00), обрезание кнопок `* 0 #`, пустой стаб на ПК | **Бригада 2 & 6** | Полный запрет плавающего софтфона (Zero Floating Blobs); тихий режим на приёме врача |
| **19** | **Телефония: Входящий звонок** | [`IncomingCallPopupModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/telephony/IncomingCallPopupModal.tsx) | Эмодзи (`⚡`,`🗓️`), наезд шторки на кнопки приема, срез заголовка на 390px | **Бригада 1 & 2** | Верхний амбиент-баннер (Top Ambient Capsule); отсутствие модального оверлея |
| **20** | **Матрица прав (RBAC)** | [`AccessMatrixModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/AccessMatrixModal.tsx) | Шапка 440px (всего 2 строки прав), 8 табов ролей вылетают за 390px, чекбоксы 14x14px | **Бригада 2 & 6** | Сжатие шапки до 80px; тач-таргеты чекбоксов $\ge 44\times 44\text{px}$; 68 прав доступа |
| **21** | **Комиссии врачей** | [`StaffCommissionsModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/settings/StaffCommissionsModal.tsx) | Плашки уровней 22px, обрезка формул расчета на мобилке | **Бригада 6** | Контрастный текст $\ge 4.5:1$ в темной теме; чистый расчет Net Revenue Т-51 |
| **22** | **Хаб начмеда (ЕГИСЗ/РЭМД)** | [`EgiszRemdHubModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/egisz/EgiszRemdHubModal.tsx) | Плашки метрик 160px (таблица 2 строки), срез статусов `Зарег...`, `Ошиб...` на 390px | **Бригада 3 & 6** | Компактные бейджи; валидация схем CDA R3 Минздрава РФ с УКЭП КриптоПро |
| **23** | **Форма 043/у (Печать & ВКК)** | [`Form043PrintModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/emr/Form043PrintModal.tsx) | Схлопывание 5 вкладок в кашу на 390px, 4 уровня матрешки, разрыв заголовка на 5 строк | **Бригада 1 & 2** | Печать в любой момент («ЧЕРНОВИК» / «ПОДПИСАНО ВРАЧОМ»); монолитная вёрстка бланка |
| **24** | **Локальный оффлайн-сейф** | [`OfflineBackupVaultPanel.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/backup/OfflineBackupVaultPanel.tsx) | Обрыв `Резервное \n копирова...`, разрыв `AES- \n 256`, разрыв `SHA- \n 256`, кнопки 36px | **Бригада 1 & 6** | Неразрывные токены шифрования; кнопки 44px; прозрачный экспорт бэкапа SQLite/JSON |
| **25** | **Кокпит врача в смене** | [`DoctorShiftCockpitModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/doctor/DoctorShiftCockpitModal.tsx) | Нижняя плашка таймера перекрывает телефон и диагноз пациента, одонтограмма вытеснена | **Бригада 2** | Таймер интегрирован в верхний бар; зубная формула доминирует на $\ge 70\%$ холста |

---

## 🔬 5. МАШИННАЯ ВЕРИФИКАЦИЯ И РЕЗЮМЕ АУДИТА

- **Кодировка файлов:** Строгий UTF-8 без BOM (`npm run check:encoding` $\rightarrow$ Exit Code 0).
- **Дизайн-токены CSS:** Полное соответствие дизайн-системе (`npm run check:css-tokens` $\rightarrow$ Exit Code 0).
- **Тайпчек TypeScript:** Проверен по всем рабочим пространствам (`npm run typecheck` $\rightarrow$ Exit Code 0).
- **Статус разделов:**
  - `ПРОВЕРЕНО`: Стандарты инквизиции обновлены с учетом Мандата 8e и Apple/Mac HIG; 4 ключевых устраненных барьера (пародонтология, карпулы, касса 54-ФЗ без ИНН, визиограф) подтверждены строками исходного кода и unit-тестами; перекрестные ссылки на `.agents/INDEX.md`, `.agents/UI_STANDARDS.md`, `.agents/FRONTEND_VIEWS_MAP.md` внедрены.
  - `НЕ ПРОВЕРЕНО`: Регрессионное поведение на физических iPad с внешними Bluetooth-сканерами штрихкодов в условиях реальной операционной (требуется стендовый hardware-прогон).


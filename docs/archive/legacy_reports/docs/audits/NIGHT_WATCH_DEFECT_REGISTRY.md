# 📋 СВОДНЫЙ РЕЕСТР ДЕФЕКТОВ И ДОСЬЕ ИНКВИЗИЦИИ (NIGHT WATCH DEFECT REGISTRY)

> 📖 **НАВИГАЦИЯ ПО СТАНДАРТАМ И ИНДЕКСАМ:**
> - [Главный Индекс Документации (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)
> - [Высшая Конституция: THE HAMMER (.agents/THE_HAMMER_MASTER_PROMPT.md)](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)
> - [Стандарты UI, State и CSS (.agents/UI_STANDARDS.md)](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)
> - [Карта Представлений Фронтенда (.agents/FRONTEND_VIEWS_MAP.md)](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md)
> - [Сводный Реестр Инквизиции (00_INDEX.md)](file:///C:/Clinic_MVP/dental-crm/docs/inquisition/00_INDEX.md)
> - [Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)

**КОНСТИТУЦИЯ:** `C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md`  
**ПРИКАЗ ДЛЯ ВСЕХ ВЕРСТАЛЬЩИКОВ И РАЗРАБОТЧИКОВ:** Читать данный файл ЦЕЛИКОМ от первой до последней строки перед внесением любых изменений в код и стили. Любые исправления обязаны строго закрывать указанные строки и файлы с сохранением стандартов 80/10/10, законов Фиттса, Хика, Миллера, стандартов Apple HIG, Мандата 8e и презумпции брака.

---

## 🛑 КАТАЛОГ ДЕФЕКТОВ ДЛЯ ИСПРАВЛЕНИЯ

### РАЗДЕЛ 1: СЕНСОРНЫЕ ЗОНЫ И ЗАКОН ФИТТСА (INQUISITOR 1 — TOUCH TARGETS >= 44x44px)

| ID | Файл и строки | Суть дефекта | Требуемое исправление для верстальщика |
|---|---|---|---|
| **TT-1** | [`apps/web/src/components/doctor-portal/DoctorMobileShiftModal.tsx#L228`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/doctor-portal/DoctorMobileShiftModal.tsx#L228), [`L562`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/doctor-portal/DoctorMobileShiftModal.tsx#L562) | Кнопки закрытия мобильного окна смены имеют класс `w-7 h-7` ($28\times 28\text{px}$). | Задать `min-h-[44px] min-w-[44px] p-2 flex items-center justify-center`. |
| **TT-2** | [`apps/web/src/components/PatientPortal.tsx#L868`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/PatientPortal.tsx#L868), [`L918`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/PatientPortal.tsx#L918), [`L1003`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/PatientPortal.tsx#L1003) | Крестики закрытия модалок QR, НДФЛ и 54-ФЗ имеют размер $26\times 26\text{px}$ (`p-1` вокруг 18px иконки). | Заменить на `min-h-[44px] min-w-[44px] flex items-center justify-center p-2`. |
| **TT-3** | [`apps/web/src/components/PatientJourneyTimeline.tsx#L309`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/PatientJourneyTimeline.tsx#L309), [`apps/web/src/components/radiology/doseSheet/RadiationDoseSheetModal.tsx#L811`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/doseSheet/RadiationDoseSheetModal.tsx#L811) | Кнопки сброса поиска внутри инпутов имеют размер $22\text{--}28\text{px}$ (`p-1.5` / `p-1`). | Обернуть кнопку в абсолютный контейнер `h-full min-w-[44px] flex items-center justify-center`. |
| **TT-4** | [`apps/web/src/components/diagnostic/ToothContextDrawer.css#L126`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/diagnostic/ToothContextDrawer.css#L126), [`L587`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/diagnostic/ToothContextDrawer.css#L587), [`L1318-L1348`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/diagnostic/ToothContextDrawer.css#L1318-L1348) | `.dente-drawer-close-btn` ($32\text{px}$) пропущена в тач-медиазапросах; `.dente-row-del-btn` имеет `min-width: 28px` вместо 44px. | Добавить `.dente-drawer-close-btn` в 44px и задать `.dente-row-del-btn { min-width: 44px !important; min-height: 44px !important; }`. |
| **TT-5** | [`apps/web/src/styles/dente-redesign.css#L2699-L2700`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/dente-redesign.css#L2699-L2700), [`apps/web/src/styles/touch-targets.css#L212-L216`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/touch-targets.css#L212-L216) | Кнопка `.doc-nav-search-clear` ($28\times 28\text{px}$) не расширяется на тач-экранах. | Добавить `.doc-nav-search-clear` в блок `@media (pointer: coarse), (max-width: 700px)` с `min-height: 44px; min-width: 44px;`. |
| **TT-6** | [`apps/web/src/components/radiology/CbctLeftToolDock.tsx#L622`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/CbctLeftToolDock.tsx#L622), [`apps/web/src/components/radiology/CbctMprViewer.tsx#L2666`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/CbctMprViewer.tsx#L2666) | Кнопки закрытия меню срезов MIP и панели имплантации имеют размер $22\text{--}24\text{px}$ (`p-1`). | Увеличить область клика до `min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px]`. |
| **TT-7** | [`apps/web/src/components/booking/PublicOnlineBookingWidget.tsx#L1739`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/booking/PublicOnlineBookingWidget.tsx#L1739) | Кнопка копирования талона в финальном экране имеет размер $26\times 26\text{px}$ (`p-1`). | Задать `min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center`. |
| **TT-8** | [`apps/web/src/components/schedule/AppointmentCard.tsx#L744`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/AppointmentCard.tsx#L744) | Кнопка копирования текста SMS-напоминания имеет размер $21\times 21\text{px}$ (`p-1 text-xs`). | Задать `min-h-[32px] min-w-[32px]` на десктопе и `min-h-[44px] min-w-[44px]` на тач-устройствах. |

---

### РАЗДЕЛ 2: КОГНИТИВНАЯ ПЕРЕГРУЗКА И ЗАКОНЫ ХИКА/МИЛЛЕРА (INQUISITOR 4)

| ID | Файл и строки | Суть дефекта | Требуемое исправление для верстальщика |
|---|---|---|---|
| **CL-1** | [`apps/web/src/components/odontogram/OdontogramToolbar.tsx#L120-L470`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/OdontogramToolbar.tsx#L120-L470) | В одной горизонтальной полосе вывалены одновременно **22 кнопки** без группировки (Закон Хика $T = b \log_2(n+1)$). | Сжать тулбар: **1 Primary Action + 3 быстрых штампа (Кариес/Пульпит/Пломба) + компактное выпадающее меню `[⋮ Инструменты]`** (куда убираются Diagnocat, Восьмерки, Аудиодиктофон и Живой счет). |
| **CL-2** | [`apps/web/src/components/InventoryView.tsx#L1192-L1285`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/InventoryView.tsx#L1192-L1285) | В каждой строке таблицы номенклатуры рендерятся одновременно **4 кнопки прямого действия** (`Приход`, `Расход`, `Редактировать`, `Удалить`). | Оставить 1 главное действие (`Приход/Расход`), операции `Редактировать` и `Удалить` перенести в контекстное меню строки `[⋮]`. |
| **CL-3** | [`apps/web/src/components/LabOrdersPanel.tsx#L862-L930`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/LabOrdersPanel.tsx#L862-L930) | В подвале карточки зуботехнического наряда рендерятся **5 кнопок** (`Запланировать прием`, `Ссылка технику`, `Трекинг`, `Детали`, `Удалить`). | Оставить 1 доминирующую кнопку (`Запланировать прием`), остальные действия скрыть под кнопкой `[⋮]`. |
| **CL-4** | [`apps/web/src/components/treatment-plans/TreatmentPlanStageCard.tsx#L360-L415`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/treatment-plans/TreatmentPlanStageCard.tsx#L360-L415) | Сырой эмодзи `💳` внутри кнопки оформления рассрочки. | Заменить `💳` на векторную иконку Lucide `<CreditCard className="w-3.5 h-3.5" />`. |
| **CL-5** | [`apps/web/src/components/Header.tsx#L250-L310`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/Header.tsx#L250-L310) | В поповере смены 54-ФЗ при открытой смене одновременно подсвечиваются кнопки `Z-Отчет` и `Открыть смену`. | Дизъюнктивный рендеринг: при открытой смене показывать ТОЛЬКО кнопку закрытия (`Z-отчет`). |

---

### РАЗДЕЛ 3: ТЕНАНТНАЯ ИЗОЛЯЦИЯ RLS И БАЗА ДАННЫХ (INQUISITOR 7)

| ID | Суть задачи | Описание реализации |
|---|---|---|
| **RLS-1** | Создать и применить миграцию `0187_rls_phase26_and_sanpin_tables.sql` | Наложить `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` и `CREATE POLICY tenant_isolation` на 37 таблиц волны 0176/0181 (СанПиН, анестезия, электронные рецепты 1094н, дентальные импланты ISQ, лояльность, складские перемещения). |

---

### РАЗДЕЛ 4: ШКАЛА Z-INDEX И ИЗОЛЯЦИЯ СЛОЕВ (INQUISITOR 2 — УСТРАНЕНО И ЗАФИКСИРОВАНО)

| ID | Файл и строки | Суть дефекта | Статус |
|---|---|---|---|
| **ZX-1** | `apps/web/src/styles/shadow-analyst.css#L10`, `L46` | Дефект `z-index: 9999` вместо стандарта `99999` для плавающих системных алертов. | ИСПРАВЛЕНО (Унифицировано на `z-index: 99999`). |
| **ZX-2** | `apps/web/src/components/analytics/marketingRoi.css#L9`, `apps/web/src/components/anesthesia/anesthesia.css#L17`, `L1197` | Легаси-хардкоды `z-index: 9999/10000` в локальных стилях модалок. | ИСПРАВЛЕНО (Унифицировано на канонический `z-index: 1000`). |

---

### РАЗДЕЛ 5: РЕНТГЕНОЛОГИЯ TRUE DARKROOM (INQUISITOR 5 — УСТРАНЕНО И ЗАФИКСИРОВАНО)

| ID | Файл и строки | Статус |
|---|---|---|
| **DR-1** | [`MedicalRadiologyDropzone.tsx#L189-L247`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/MedicalRadiologyDropzone.tsx#L189-L247) | ИСПРАВЛЕНО (Устранены белые кнопки тестового снимка, фон зафиксирован на `bg-slate-800 text-slate-200 border-slate-700`). |
| **DR-2** | [`RadiologyViewerModal.tsx#L1495`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/RadiologyViewerModal.tsx#L1495), [`L1902-L1953`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/RadiologyViewerModal.tsx#L1902-L1953) | ИСПРАВЛЕНО (Бейджи линеек и HUD зафиксированы на `bg-slate-950/95 border-cyan-500 backdrop-blur-md`). |
| **DR-3** | [`HotFolderIntakeModal.tsx#L656-L661`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/HotFolderIntakeModal.tsx#L656-L661) | ИСПРАВЛЕНО (Устранены устаревшие хардкоды `text-[var(--ink,#fff)]`). |

---

### РАЗДЕЛ 6: АВТОНОМИЯ ВРАЧА И МАНДАТ 8e — РЕЕСТР УСТРАНЕННЫХ БЮРОКРАТИЧЕСКИХ БАРЬЕРОВ

| ID | Модуль | Исходный барьер | Решение по Мандату 8e | Файл и строки | Статус |
|---|---|---|---|---|---|
| **CLIN-1** | Пародонтология | 192-точечный последовательный шаговый опросник зондирования глубин (по 6 точек на 32 зуба), съедавший 600px высоты модалки и блокировавший закрытие визита. | Внедрена физиологическая норма в 1 клик («Интактный пародонт»), 1-клик протокол профессиональной гигиены A16.07.051 AirFlow и авто-вычисление стадии AAP 2017. | [`PeriodontalChartingModal.tsx#L400-L492`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PeriodontalChartingModal.tsx#L400-L492) | **ИСПРАВЛЕНО И ДОКАЗАНО** |
| **CLIN-2** | Склад & Сестринское дело | Бюрократический акт списания анестетиков на 12 полей с требованием комиссии из 3 человек для утилизации пустых карпул. | Медсестра списывает пустые карпулы анестетиков в 1 клик без комиссии из 3 человек. Быстрые бейджи `COMMON_ANESTHETICS` (Артикаин 1:100k, 1:200k, Септанест, Мепивакаин). Мягкий овердрафт склада с предупреждением вместо блокировки операции. | [`NurseCarpuleDisposalModal.tsx#L1-L120`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/warehouse/NurseCarpuleDisposalModal.tsx#L1-L120) | **ИСПРАВЛЕНО И ДОКАЗАНО** |
| **CLIN-3** | Касса 54-ФЗ | Блокировка пробития чека и вымогательство обязательного ИНН покупателя у физических лиц при оплате картой или наличными. | По 54-ФЗ (ФФД 1.2 тег 1228) ИНН покупателя требуется ТОЛЬКО для юридических лиц и ИП при безналичных расчетах. Физлица оплачивают в 1 клик без ввода ИНН. Поддержана комбинированная оплата (нал + карта + аванс/бонусы). | [`fastCheckoutEngine.ts#L180-L235`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payments/checkout/fastCheckoutEngine.ts#L180-L235), [`FastCheckoutModal.tsx`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/payments/checkout/FastCheckoutModal.tsx) | **ИСПРАВЛЕНО И ДОКАЗАНО** |
| **CLIN-4** | Радиовизиограф | Зависание интерфейса на 45 секунд из-за автоматического прогона каждого снимка через нейросеть с принудительной перезаписью зубной формулы. | Прямой захват снимка с USB-датчика $<50\text{ms}$ в 100% разрешении сенсора. Снимок по Spacebar. ИИ запускается строго по отдельной кнопке врача. Запрещена перезапись зубной формулы роботом без подтверждения врача. | [`DirectRvgCaptureModal.tsx#L306-L309`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/DirectRvgCaptureModal.tsx#L306-L309) | **ИСПРАВЛЕНО И ДОКАЗАНО** |
| **CLIN-5** | ЭМК визита | Кнопка «Сохранить дневник» блокировалась (`disabled`), если в редакторе открыт текст чужого приема (`noteTextOfAnotherVisit`). | Запрет на блокировку: кнопка всегда активна. При клике выдается ясный всплывающий тост с подсказкой, как переключиться на актуальный визит без потери данных. | [`VisitEmkTab.tsx#L198-L230`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/VisitEmkTab.tsx#L198-L230) | **ИСПРАВЛЕНО И ДОКАЗАНО** |
| **CLIN-6** | УКЭП подписание визита | Кнопка подтверждения подписания блокировалась серым (`disabled`), если криптопровайдер CryptoPro недоступен. | Запрет на disabled: кнопка активна, при клике врач получает прямое предупреждение и подтверждение фиксации с версионным аудитом без бюрократического паралича. | [`CryptoProSigner.tsx#L130-L155`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/CryptoProSigner.tsx#L130-L155) | **ИСПРАВЛЕНО И ДОКАЗАНО** |
| **CLIN-7** | Контроль ЭМК | Кнопка «Отправить на доработку» блокировалась (`disabled`), если поле причины не заполнено (`!reason.trim()`). | Запрет на disabled: клик вызывает дружелюбный предупреждающий тост с фокусом на поле ввода. | [`EmkControlBoard.tsx#L250-L280`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/EmkControlBoard.tsx#L250-L280) | **ИСПРАВЛЕНО И ДОКАЗАНО** |
| **CLIN-8** | Согласия пациента | Кнопка «Сохранить согласия» была серой (`disabled`) при `!dirty || !loaded`, создавая впечатление сломанного интерфейса. | Кнопка разблокирована. При клике без изменений выводится информационное уведомление о том, что все согласия актуальны и сохранены. | [`PatientCommunicationConsentsPanel.tsx#L130-L160`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patients/PatientCommunicationConsentsPanel.tsx#L130-L160) | **ИСПРАВЛЕНО И ДОКАЗАНО** |
| **CLIN-9** | Быстрая запись расписания | Всплывающий вложенный диалог подтверждения закрытия (Анти-Матрёшка глубина 2) с блокировкой выхода из панели. | Внедрено бесшовное автосохранение черновика (Мандат 8e autosave) и прямая кнопка «Сбросить» в футере. Глубина строго 1. | [`QuickBookingDrawer.tsx#L1365-L1390`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/schedule/QuickBookingDrawer.tsx#L1365-L1390) | **ИСПРАВЛЕНО И ДОКАЗАНО** |

---

## 🎯 ПРИКАЗ ПО ИСПОЛНЕНИЮ ДЛЯ ВЕРСТАЛЬЩИКОВ И РАЗРАБОТЧИКОВ

1. Брать задачи строго по ID (`TT-1` .. `TT-8`, `CL-1` .. `CL-5`, `RLS-1`, `ZX-1` .. `ZX-2`).
2. После каждого исправления прогонять обязательный стек машинных проверок:
   - `npm run check:encoding`
   - `npm run check:css-tokens`
   - `npm run typecheck -w @dental/web` (или `npm run typecheck -w @dental/api`)
3. Запрещено закрывать задачи «на глаз».

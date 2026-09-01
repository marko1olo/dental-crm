# 📋 СВОДНЫЙ РЕЕСТР ДЕФЕКТОВ И ДОСЬЕ ИНКВИЗИЦИИ (NIGHT WATCH DEFECT REGISTRY)

**КОНСТИТУЦИЯ:** `C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md`  
**ПРИКАЗ ДЛЯ ВСЕХ ВЕРСТАЛЬЩИКОВ И РАЗРАБОТЧИКОВ:** Читать данный файл ЦЕЛИКОМ от первой до последней строки перед внесением любых изменений в код и стили. Любые исправления обязаны строго закрывать указанные строки и файлы с сохранением стандартов 80/10/10, законов Фиттса, Хика, Миллера и презумпции брака.

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

### РАЗДЕЛ 4: ШКАЛА Z-INDEX И ИЗОЛЯЦИЯ СЛОЕВ (INQUISITOR 2)

| ID | Файл и строки | Суть дефекта | Требуемое исправление |
|---|---|---|---|
| **ZX-1** | `apps/web/src/styles/shadow-analyst.css#L10`, `L46` | Дефект `z-index: 9999` вместо стандарта `99999` для плавающих системных алертов. | Заменить на `z-index: 99999;` / `var(--z-toast)`. |
| **ZX-2** | `apps/web/src/styles/marketingRoi.css#L9`, `apps/web/src/styles/anesthesia.css#L17` | Легаси-хардкоды `z-index: 9999/10000` в локальных стилях модалок. | Унифицировать на `var(--z-modal-overlay)` (`z-index: 1000`). |

---

### РАЗДЕЛ 5: РЕНТГЕНОЛОГИЯ TRUE DARKROOM (INQUISITOR 5 — УСТРАНЕНО И ЗАФИКСИРОВАНО)

| ID | Файл и строки | Статус |
|---|---|---|
| **DR-1** | [`MedicalRadiologyDropzone.tsx#L189-L247`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/MedicalRadiologyDropzone.tsx#L189-L247) | ИСПРАВЛЕНО (Устранены белые кнопки тестового снимка, фон зафиксирован на `bg-slate-800 text-slate-200 border-slate-700`). |
| **DR-2** | [`RadiologyViewerModal.tsx#L1495`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/RadiologyViewerModal.tsx#L1495), [`L1902-L1953`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/RadiologyViewerModal.tsx#L1902-L1953) | ИСПРАВЛЕНО (Бейджи линеек и HUD зафиксированы на `bg-slate-950/95 border-cyan-500 backdrop-blur-md`). |
| **DR-3** | [`HotFolderIntakeModal.tsx#L656-L661`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/HotFolderIntakeModal.tsx#L656-L661) | ИСПРАВЛЕНО (Устранены устаревшие хардкоды `text-[var(--ink,#fff)]`). |

---

## 🎯 ПРИКАЗ ПО ИСПОЛНЕНИЮ ДЛЯ ВЕРСТАЛЬЩИКОВ И РАЗРАБОТЧИКОВ

1. Брать задачи строго по ID (`TT-1` .. `TT-8`, `CL-1` .. `CL-5`, `RLS-1`, `ZX-1` .. `ZX-2`).
2. После каждого исправления прогонять обязательный стек машинных проверок:
   - `npm run check:encoding`
   - `npm run check:css-tokens`
   - `npm run typecheck -w @dental/web` (или `npm run typecheck -w @dental/api`)
3. Запрещено закрывать задачи «на глаз».

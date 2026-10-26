# Архитектура и декомпозиция EMR: Медицинская карта приёма (MedicalRecord / Form043)

## 1. Клинический контекст и цели (Mandates 8e, 8n, 8x, HIG)
В соответствии с мандатами архитектуры DENTE CRM:
- **Мандат 8x (Живой человеческий клинический язык):** Отказ от советских канцелярских кодов («Форма 043/у») в пользовательском интерфейсе в пользу клинического наименования «Медицинская карта приёма» (`MedicalRecord`).
- **Мандат 8e (Автономия врача):** Кнопки печати, сохранения и заполнения физиологической нормы никогда не блокируются (`disabled={false}`). Поддерживается двойной статус-штамп: «ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)» при открытом приёме и «ПОДПИСАНО ВРАЧОМ» при закрытом/подписанном.
- **Мандат 8b (Микромодульность):** Ни один файл TS/TSX/CSS не превышает 120 строк. Фасады обратной совместимости строго $\le 15$ строк (фактически $\le 7$ строк).
- **Apple HIG (Сенсорная эргономика):** Мобильное представление выполнено как нативный Bottom Sheet на экранах $\le 768\text{px}$ с drag handle 36×5px, скруглением `rounded-t-[24px]`, сенсорными областями $\ge 44\times 44\text{px}$ и нулевым паразитным горизонтальным скроллом.

## 2. Структура декомпозированных модулей

### Компоненты интерфейса (`apps/web/src/components/emr/record/`)
- `MedicalRecordPrintModal.tsx` — основной модальный контейнер (116 строк).
- `RecordModalHeader.tsx` — адаптивная шапка с бейджами и быстрыми действиями (105 строк).
- `RecordModalBody.tsx` — переключение табов и печатный предпросмотр (59 строк).
- `RecordMoreMenu.tsx` — выпадающее меню экспорта (XML, JSON, текст) (58 строк).
- `RecordNavTabs.tsx` — горизонтальная навигационная панель (36 строк).
- `RecordCompletenessBar.tsx` — индикатор клинической полноты с кнопкой нормы (40 строк).
- `useMedicalRecordModal.ts` — стейт и реактивная синхронизация карты (83 строки).
- `useRecordExports.ts` — изолированные обработчики печати и экспорта (73 строки).
- `recordModalTypes.ts` — типизация пропсов модала (18 строк).

### Клинические секции-вкладки (`apps/web/src/components/emr/record/tabs/`)
- `RecordOdontogramTab.tsx` — зубная формула FDI 11–48 и индексы КПУ/CPITN/OHI-S (105 строк).
- `RecordPassportTab.tsx` — паспортные данные и реквизиты пациента (85 строк).
- `RecordAnamnesisTab.tsx` — анамнез жизни, заболевания и соматический статус (81 строка).
- `RecordDiariesTab.tsx` — дневники приёмов по стандарту SOAP (80 строк).
- `RecordEpicrisisTab.tsx` — эпикриз, исход лечения и диспансерная группа (54 строки).

### Генератор журнального печатного листа A4 (`apps/web/src/components/emr/record/html/`)
- `recordHtmlStyles.ts` — CSS-стили печатного листа с водяными знаками (76 строк).
- `recordHtmlFdiTable.ts` — сетка зубной формулы FDI (84 строки).
- `recordPassportHtml.ts` — паспортный блок и титульный лист (80 строк).
- `recordDiariesHtml.ts` — клинические дневники SOAP (82 строки).
- `recordEpicrisisHtml.ts` — блок исхода лечения и диспансеризации (75 строк).
- `recordHtmlGenerator.ts` — главный сборщик HTML-документа (67 строк).
- `recordOdontogramHtml.ts` — индексы КПУ и состояние полости рта (52 строки).
- `recordAnamnesisHtml.ts` — анамнез и соматика (39 строк).

### Пресеты нормы и схемы (`apps/web/src/components/emr/defaults/`)
- `recordDefaultSchema.ts` — дефолтная схема карты (108 строк).
- `recordRequisitesResolver.ts` — разрешение реквизитов клиники и врача (79 строк).
- `recordPhysiologicalNorm.ts` — клиническая физиологическая норма (59 строк).
- `recordDefaultTeeth.ts` — интактная зубная формула 32 зубов (37 строк).

### Движки экспорта и математика (`export/` и `math/`)
- `recordExportXml.ts` — экспорт CDA XML (95 строк).
- `recordExportJsonText.ts` — JSON и текстовый экспорт (74 строки).
- `recordMathIndices.ts` — расчет индексов КПУ и CPITN (112 строк).
- `recordMathValidation.ts` — валидация заполненности (70 строк).
- `recordMathFormatting.ts` — форматирование возраста и реквизитов (40 строк).
- `recordMathStamps.ts` — константы штампов (5 строк).

## 3. Визуальные доказательства (Red Team 4-State Proofs)
Все 4 состояния проверены инструментально и визуально проинспектированы через `read_file`:
- `docs/proofs/medical_record/01_medical_record_pc_light.png` (185.9 KB) — PC Light (1440×900)
- `docs/proofs/medical_record/02_medical_record_pc_dark.png` (181.5 KB) — PC Dark (1440×900)
- `docs/proofs/medical_record/03_medical_record_mobile_light.png` (299.9 KB) — Mobile Light (390×844)
- `docs/proofs/medical_record/04_medical_record_mobile_dark.png` (307.0 KB) — Mobile Dark (390×844)

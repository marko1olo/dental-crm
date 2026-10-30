# Red Team 4-State Visual Proof: Хирургический протокол, удаление зубов и имплантология

Доказательства соответствия Высшей Конституции THE HAMMER MASTER PROMPT, канонической конституции `.agents/AGENTS.md` (Мандаты 8b, 8e, 8n, 8x, 8ap, 8am, 8wy) и Apple HIG.

## Перечень 4-State скриншотов

| № | Файл | Разрешение | Тема | Описание клинического сценария |
|---|------|------------|------|--------------------------------|
| 1 | [`01_surgery_implant_passport_pc_light_1440x900.png`](01_surgery_implant_passport_pc_light_1440x900.png) | 1440×900 | ☀️ Светлая | Канонический паспорт & протокол имплантата: выбор зуба FDI #46, 4 экспресс-протокола (35 Н·см, ФДМ, Викрил 4-0), тулбар брендов (Osstem, Dentium, Straumann, Nobel Biocare, Ankylos, Astra Tech), торк 15–50 Н·см, пассивный бейдж ISQ 72, ровно 1 Primary CTA «✓ Зафиксировать протокол имплантации» (#0d9488 Teal). |
| 2 | [`02_surgery_implant_passport_pc_dark_1440x900.png`](02_surgery_implant_passport_pc_dark_1440x900.png) | 1440×900 | 🌙 Тёмная | Тёмная тема десктопа: глубокий фон slate-900/slate-950, бирюзовая подсветка активного бренда и кнопки фиксации, контрастный серый бейдж ISQ, абсолютный контраст без слепящих белых пятен. |
| 3 | [`03_surgery_implant_passport_mobile_light_390x844.png`](03_surgery_implant_passport_mobile_light_390x844.png) | 390×844 | ☀️ Светлая | Мобильный адаптив смартфона: Apple HIG нативный Bottom Sheet с Drag Handle 36×5px, тактильные плитки экспресс-протоколов, плавающий нижний тулбар в Natural Thumb Zone с кнопками «Печать» и «✓ Зафиксировать» $\ge 44$px. |
| 4 | [`04_surgery_implant_passport_mobile_dark_390x844.png`](04_surgery_implant_passport_mobile_dark_390x844.png) | 390×844 | 🌙 Тёмная | Тёмный мобильный Bottom Sheet: контрастные карточки протоколов, отсутствие слепящих белых пятен, комфортная работа хирурга в перчатках у кресла. |

## Ключевые архитектурные и клинические инварианты

1. **Мандат 8ap (Анти-враньё и ликвидация советского канцелярита):**
   - Физически удалены файлы с регуляторными номерами: `extraction804nServices.ts` и `sinusGbr804nServices.ts`.
   - Взамен используются семантические каталоги `extractionSurgicalServices.ts` и `sinusGbrSurgicalServices.ts`.
   - Из UI и типов искоренены упоминания советских приказов («804н»), заменены на чистые клинические понятия: «Прайс-лист услуг» / «Каталог процедур».

2. **Мандат 8e & 8n (Автономия врача и 1-клик протоколы у кресла):**
   - Кнопки («Сохранить», «Внести в карту», «Добавить в счет») **НИКОГДА** не блокируются (`disabled: false`).
   - 1-клик экспресс-протоколы добавлены прямо в панель визита `SoapExpressProtocolsBar.tsx`:
     * Простое удаление (`AUTOPILOT_EXTRACTION_SIMPLE`, K04.0 / K04.5)
     * Сложное удаление с альвеолотомией (`AUTOPILOT_EXTRACTION_COMPLEX_K011`, K01.1)
     * Установка дентального имплантата (`AUTOPILOT_IMPLANT_STANDARD_K081`, K08.1)
     * Синус-лифтинг и НКР (`AUTOPILOT_SINUS_GBR_K082`, K08.2)
   - Связка с кассой и счетом: сервис `soapExpressInvoiceBridge.ts` автоматически диспатчит событие `dente-add-services-to-invoice` и синхронизирует Zustand store без рутинного ручного ввода.

3. **Мандат 8b (Строгий лимит $\le 120$ строк на файл):**
   - Все хирургические монолиты декомпозированы на атомарные модули:
     * `VisitSurgeryExtractionBar.tsx` (115 строк) + `ExtractionComplexitySelector.tsx` (55 строк), `ExtractionHemostasisSelector.tsx` (67 строк), `useExtractionBarState.ts` (116 строк).
     * `VisitSurgeryImplantBar.tsx` (65 строк) + `ImplantSystemSelector.tsx` (84 строки), `ImplantParametersGrid.tsx` (98 строк).
     * `VisitSurgerySinusGbrBar.tsx` (87 строк) + `SinusGraftSelector.tsx` (54 строки), `SinusMembraneSelector.tsx` (62 строки), `useSinusGbrBarState.ts` (112 строк).
     * `extractionSimpleAndComplexNorms.ts` -> `extractionSimpleNorms.ts` (59 строк), `extractionComplexNorms.ts` (63 строки).
     * `SoapExpressProtocolsBar.tsx` (119 строк).

4. **Мандаты 8am & 8al (Apple HIG, сенсорный минимум и ровно 1 Primary CTA):**
   - Ровно одна Primary CTA кнопка бирюзового оттенка `#0d9488` на видимый экран.
   - Минимальный touch target $\ge 44\times 44$px для всех интерактивных элементов на мобильных устройствах.
   - 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).

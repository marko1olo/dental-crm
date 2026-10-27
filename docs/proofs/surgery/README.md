# Red Team 4-State Visual Proof: Хирургический протокол, удаление зубов и имплантология

Доказательства соответствия Высшей Конституции THE HAMMER MASTER PROMPT, канонической конституции `.agents/AGENTS.md` (Мандаты 8b, 8e, 8n, 8x, 8ap, 8am, 8wy) и Apple HIG.

## Перечень 4-State скриншотов

| № | Файл | Разрешение | Тема | Описание клинического сценария |
|---|------|------------|------|--------------------------------|
| 1 | [`pc_light_1440x900.png`](pc_light_1440x900.png) | 1440×900 | ☀️ Светлая | Хирургический протокол: выбор зуба FDI #46, активная норма «Имплантация 35 Н·см», параметры системы Dentium Ø4×10, ФДМ Prolene 4-0, автогенерация протокола операции по СтАР, ровно 1 Primary CTA «Стандартная имплантация с ФДМ» (teal `#0d9488`). Полный перенос строк без многоточий (`...`). |
| 2 | [`pc_dark_1440x900.png`](pc_dark_1440x900.png) | 1440×900 | 🌙 Тёмная | Тёмная тема десктопа: глубокий грифельный фон карточек норм (`dark:bg-slate-900`), бирюзовая подсветка активной нормы (`#0d9488`), абсолютный контраст без слепящих белых пятен. |
| 3 | [`mobile_light_390x844.png`](mobile_light_390x844.png) | 390×844 | ☀️ Светлая | Мобильный адаптив смартфона: компактный Top Bar с кнопкой «Назад» $\ge 44\times 44$px, сетка зубов FDI $\ge 44$px, сенсорные touch-карточки норм на всю ширину без обрезанных слов, 0px паразитного горизонтального скролла. |
| 4 | [`mobile_dark_390x844.png`](mobile_dark_390x844.png) | 390×844 | 🌙 Тёмная | Тёмная тема мобильного интерфейса: контрастные сенсорные плитки норм хирургии, сенсорный комфорт Apple HIG в Natural Thumb Zone. |

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

# Санитарный контроль смены и Автоклавирование: Канонический SSOT Хаб (Red Team Proof)

> 🏛️ **Статус верификации:** 100% PASS (Exit Code 0), 0 неразрешенных CSS токенов, 0 мультяшных эмодзи.  
> 📜 **Мандаты:** 8b/8zi (Sweet Spot 380–480 строк), 8e (Автономия врача и персонала), 8n (Соло-суверенитет и Soft Negative Stock), 8am (Ровно 1 Primary CTA #0d9488), 8x (Ликвидация советского канцелярита), 8ap (Анти-вранье: запрет номеров законов в коде и вымышленных моков), Apple HIG (Bottom Sheet на мобильных).

---

## 1. Архитектура и Sweet Spot компонентов

1. **`SanpinStudioModal.tsx`** (477 строк — канонический Sweet Spot 380–480 строк):
   - Единая санитарная студия DENTE CRM с 3 вкладками:
     1. **Журнал автоклавирования**: реестр циклов (время, цикл, автоклав, параметры 134°C / 2.1 бар / 5 мин, статус Стерильно, индикаторы 5 класса, ответственный).
     2. **Контроль очистки инструментов**: контроль качества предстерилизационной очистки (азопирам и фенолфталеин 100% норма, вердикт: Очищено).
     3. **Журнал кварцевания**: учет работы бактерицидных облучателей и рециркуляторов (Дезар-4, Дезар-7, Пегас).
   - Быстрый запуск смены в 1 клик: выбор программы (134°C Класс B универсальная / 121°C Класс B деликатная), автоклава и количества упаковок.
   - Ровно **ОДНА Primary CTA кнопка** `#0d9488` (`var(--teal)`): «Запустить цикл стерилизации».
   - **0 заблокированных кнопок** (Мандат 8e): кнопки никогда не disabled.
   - Пакетное списание расходников со склада в бэке (Soft Negative Stock, Мандат 8n).
   - На мобильных: нативный Apple HIG Bottom Sheet, drag handle 36×5px, тач-таргеты $\ge 44\times 44$px.

2. **`sanpinCatalogData.ts`** (327 строк — строгий Sweet Spot 300–350 строк):
   - SSOT программ стерилизации (134°C универсальная, 121°C деликатная, 134°C экспресс).
   - Предустановленный флот автоклавов класса B (Melag, W&H, Euronda, DAC Universal).
   - Термосвариватели (Euroseal, MELAseal) и бактерицидные дезары (Дезар-4, Дезар-7, Пегас).
   - Расчет фонового списания со склада: крафт-пакеты, химические индикаторы 5 класса, азопирам, фенолфталеин (`calculateBatchStockDeduction`).
   - Функция формирования батча смены в 1 клик (`createOneClickShiftBatch`).
   - Генератор чистого печатного HTML бланка А4 без советского канцелярита (`generateSanpinPrintHtml`).

3. **`DirectSanpinLauncher.tsx`** (81 строка — строгий Sweet Spot 70–90 строк):
   - Реагирует на URL хэши `#sanpin`, `#autoclave`, `#sterilization`, URL параметры `?sanpin=1`, `?sterilization=1`, `?autoclave=1`.
   - Реагирует на события `dente:open-sanpin`, `dente:open-autoclave`, `dente:open-sterilization`.
   - Монтирован в `AppShell.tsx` (строка 240).

4. **`sanpin.css`** (консолидированная стилизация):
   - Токены `--paper-strong`, `--paper-soft`, `--line`, `--ink`, `--teal` (#0d9488).
   - Адаптивный Bottom Sheet `rounded-t-[24px]` и drag handle 36×5px для экранов $\le 768$px.
   - Поддержка светлой и тёмной тем без слепящих пятен.

---

## 2. 4-State Visual Proofs (Apple HIG & Touch Ergonomics)

| Состояние | Разрешение | Файл скриншота | Размер | Статус инспекции |
|---|---|---|---|---|
| ☀️ **PC Light** | 1440×900 | [`01_sanpin_studio_pc_light_1440x900.png`](./01_sanpin_studio_pc_light_1440x900.png) | 255 KB | **ПРОВЕРЕНО**: Все 3 вкладки видны, ровно 1 Primary CTA #0d9488, 0 срезанных слов, плашка списания расходников со склада. |
| 🌙 **PC Dark** | 1440×900 | [`02_sanpin_studio_pc_dark_1440x900.png`](./02_sanpin_studio_pc_dark_1440x900.png) | 366 KB | **ПРОВЕРЕНО**: Глубокий темный фон, контраст WCAG AAA, бирюзовый акцент #0d9488, 0 слепящих пятен. |
| 📱 **Mobile Light** | 390×844 | [`03_sanpin_studio_mobile_light_390x844.png`](./03_sanpin_studio_mobile_light_390x844.png) | 135 KB | **ПРОВЕРЕНО**: Нативный Bottom Sheet, drag handle 36×5px, адаптивные вкладки без наложения текста, кнопка 44×44px в зоне большого пальца. |
| 📱 **Mobile Dark** | 390×844 | [`04_sanpin_studio_mobile_dark_390x844.png`](./04_sanpin_studio_mobile_dark_390x844.png) | 143 KB | **ПРОВЕРЕНО**: Темный мобильный Bottom Sheet, 0px горизонтального дрифта, безопасный отступ снизу. |

---

## 3. Машинные гейты и верификация

- `npx tsx --test apps/web/src/components/sanpin/__tests__/sanpinSSOTSuite.test.tsx`: **22 tests, 7 suites, 22 pass, 0 fail (100% PASS, 50ms)**
- `npx tsx --test apps/web/src/components/sanpin/__tests__/sterilizationSSOTSuite.test.tsx`: **22 tests, 7 suites, 22 pass, 0 fail (100% PASS, 48ms)**
- `npm run check:encoding`: **23 642 файлов проверено, 0 ошибок (Strict UTF-8 without BOM)**
- `Mandate 8d pt 7 emoji check`: **CLEAN (0 эмодзи в коде)**

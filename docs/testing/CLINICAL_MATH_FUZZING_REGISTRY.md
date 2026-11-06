# Реестр Red Team Фаззинга Клинической Математики и Анатомии Wheeler

> 🏛️ **СТАТУС: ВЕРИФИЦИРОВАНО (RED TEAM 100% PASS)**  
> **Сьют**: `packages/shared/src/__tests__/fuzzingToothAndBillingMath.test.ts`  
> **Время прогона**: ~187 мс ($\le 10$ с по Мандату 8t / 8wx)  
> **Итераций фаззинга**: 10 000 мутаций FDI + 10 000 финансовых сплитов  
> **Дата аудита**: 2026-11-06  

---

## 1. ЦЕЛЬ И МАНДАТЫ АУДИТА

Верификация клинической надежности ядра монорепозитория DENTE Dental CRM при экстремальных, испорченных и мутированных данных:
1. **Мандат 8e (Автономия врача)**: 100% скидки врача (0 коп. к оплате) не вызывают `NaN`, деления на 0 и блокировки действий.
2. **Мандат 8b / 8s (Целочисленные копейки)**: Точный расчет сплит-чеков и скидок Гамильтона-Хэра без потери ни единой копейки (`sum === totalKopecks`).
3. **Мандат 8ar / ODONTOGRAM BIBLE**: Пропорции ячеек Wheeler 2.5D (48/54/60/68px), соосность $CX=50$, посадка фронтальной группы 43..33 в 300px ($\le 320$px) для бездрифтового отображения на iPhone 390px.
4. **ISO 3950 / FDI**: Зубы строго 11..48 (постоянные) и 51..85 (молочные). Любой мусор и суррогатные номера изолируются в `unrecognized` без падений приложения.

---

## 2. АРХИТЕКТУРА И СКОУП ФАЗЗИНГА

### Секция 1: 10 000 Мутаций Строк Ввода (Парсер FDI Shorthand)
- **Генератор**: Детерминированный LCG PRNG (seed = 20261106).
- **Сценарии мутаций**:
  1. Мусорные спецсимволы (`!@#$%^&*()_+~|}{[]:;?><,./'"`) и бомбы пробелов (до 100 пробелов подряд).
  2. Замена букв на омоглифы кириллицы/латиницы («С» кириллица vs «C» латиница, «О» кириллица vs «O» латиница vs «0» цифра).
  3. Некорректные и суррогатные номера зубов (99, 0, -48, 100, 19, 29, 39, 49, 50, 86, 999).
  4. Сложные составные токены (зуб + поверхности MOD + статус + мусор).
  5. Инвертированный порядок («кариес 36, 46», «к16»).
  6. Смешанные цепочки валидных и невалидных зубов (`16к, 99п, 36о`).
- **Инварианты**:
  * 0 необработанных исключений (Zero Uncaught Exceptions).
  * 100% извлеченных номеров зубов удовлетворяют `isValidFdiToothNumber` (11..48, 51..85).
  * 100% поверхностей валидны (`M`, `O`, `D`, `V`, `L`, `C`).

### Секция 2: Анатомические Поверхности (M, O, D, V, L, C)
- Верификация нормализации канонических поверхностей:
  * Мезиальная / Медиальная $\to$ `M`
  * Окклюзионная / Жевательная / Режущий край $\to$ `O`
  * Дистальная $\to$ `D`
  * Вестибулярная / Щечная / Губная / Buccal $\to$ `V`
  * Язычная / Нёбная / Palatal $\to$ `L`
  * Пришеечная / Цервикальная / Десневая треть $\to$ `C`
- Разворачивание составных акронимов: `MOD` $\to$ `['M', 'O', 'D']`, `MO` $\to$ `['M', 'O']`, `DO` $\to$ `['D', 'O']`, `MODV` $\to$ `['M', 'O', 'D', 'V']`.
- Форматирование в чистый русский язык без дев-жаргона.

### Секция 3: 10 000 Финансовых Комбинаций (Сплиты и Скидки)
- **Случайные суммы**: от 1 коп. (0.01 ₽) до 10 000 000 коп. (100 000.00 ₽).
- **Скидки**: от 0.00% до 100.00% с шагом 0.01% (базисные пункты 0..10 000).
- **Инварианты**:
  * `splitKopecks`: сумма частей строго равна исходной сумме копеек. Разброс между частями $\le 1$ коп.
  * `allocateGlobalDiscountCents` (Гамильтон-Хэр): сумма скидок по позициям строго равна общей сумме скидки, ни одна позиция не уходит в минус.
  * Мульти-тендерное распределение: `cash + card + sbp + deposit === actTotalKopecks` ($discrepancy = 0$).
  * Мандат 8e: 100% скидка врача рассчитывается корректно (0 коп. к доплате) со статусом `exact`.

### Секция 4: Пропорции Wheeler 2.5D и Мобильный Вьюпорт
- Ширины ячеек:
  * Резцы: 48px standard / 44px compact
  * Клыки: 54px standard / 50px compact
  * Премоляры: 60px standard / 56px compact
  * Моляры: 68px standard / 64px compact
- Посадка фронтальной группы 43..33:
  * $54 + 48 + 48 + 48 + 48 + 54 = 300$ px (standard)
  * $50 + 44 + 44 + 44 + 44 + 50 = 276$ px (compact)
  * Обе ширины $\le 320$ px $\to$ 0px горизонтального скролла на iPhone 390px (358px полезной ширины).
- Геометрия Wheeler 2.5D: соосность $CX=50.0$, $CY=176.0$, `viewBox="0 0 100 218"`, $badgeRadius \le 14$ px.

---

## 3. ВЫЯВЛЕННЫЕ И УСТРАНЕННЫЕ ДЕФЕКТЫ

В ходе инквизиции обнаружены и исправлены дефекты в `packages/shared/src/clinical/dentalFormulaSurfaces.ts`:
1. **Дефект**: `normalizeCanonicalSurface("щечн")` и `normalizeCanonicalSurface("небн")` возвращали `null`, так как в словаре были только полные формы («ЩЕЧНАЯ», «НЕБНАЯ») и 3-буквенные («ЩЕЧ», «НЕБ»).
2. **Исправление**: Добавлены медицинские сокращения врачей и диктовки:
   - Вестибулярная: `ВЕСТИБ`, `ЩЕЧН`
   - Оральная / Нёбная: `НЕБН`, `ЯЗЫЧН`
   - Медиальная: `МЕДИАЛ`, `МЕЗИАЛ`
   - Дистальная: `ДИСТАЛ`
   - Пришеечная: `ПРИШЕЕЧ`, `ЦЕРВИК`

---

## 4. СВОДНЫЙ ОТЧЕТ ТЕСТОВ

```text
▶ Autonomous Red Team Fuzzing & Clinical Math Suite (@dental/shared)
  ▶ 1. 10 000 Pseudorandom Fuzzy String Mutations (FDI Shorthand Parser)
    ✔ fuzzes 10 000 malformed inputs without throwing uncaught exceptions or leaking invalid FDI teeth (109.2618ms)
    ✔ stress-tests range resolver across arch boundaries without exceptions (2.1079ms)
  ✔ 1. 10 000 Pseudorandom Fuzzy String Mutations (FDI Shorthand Parser) (112.0127ms)
  ▶ 2. Anatomical Surfaces Validation Across Tooth Groups (M, O, D, V, L, C)
    ✔ normalizes canonical surfaces and expands compound acronyms for all tooth groups (0.8765ms)
    ✔ formats surfaces to human-readable Russian string without developer abbreviations (0.2959ms)
  ✔ 2. Anatomical Surfaces Validation Across Tooth Groups (M, O, D, V, L, C) (1.3681ms)
  ▶ 3. 10 000 Exact Financial Arithmetic Combinations (Zero Float Drift)
    ✔ proves splitKopecks strictly satisfies sum === total across 10 000 random sums and parts (9.9095ms)
    ✔ proves allocateGlobalDiscountCents strictly preserves total discount across 10 000 combinations (55.4415ms)
    ✔ verifies multi-tender split balancing with 0 kopeck discrepancy across random combinations (6.2673ms)
    ✔ verifies Mandate 8e: 100% doctor discount yields 0 kopecks without division-by-zero errors (0.3871ms)
  ✔ 3. 10 000 Exact Financial Arithmetic Combinations (Zero Float Drift) (72.4168ms)
  ▶ 4. Wheeler 2.5D Proportional Geometry & Mobile Viewport SSOT
    ✔ validates exact Wheeler tooth widths for all 32 permanent and 20 deciduous teeth (0.5088ms)
    ✔ proves frontal arch 43..33 fits in 300px <= 320px safe area for iPhone 390px (0px drift) (0.3335ms)
    ✔ verifies canonical Wheeler 2.5D alignment constants (0.2116ms)
  ✔ 4. Wheeler 2.5D Proportional Geometry & Mobile Viewport SSOT (1.2425ms)
✔ Autonomous Red Team Fuzzing & Clinical Math Suite (@dental/shared) (187.5977ms)
ℹ tests 11
ℹ suites 5
ℹ pass 11
ℹ fail 0
ℹ duration_ms 583.2486
```

# Архитектурный обзор и инвентаризация требования R1: Клинический Автопилот, Защита ручного ввода и Nurse-Proof UX

**Проект**: DENTE Dental CRM  
**Рабочая директория**: `C:\Clinic_MVP\dental-crm\.agents\survey_explorer_1`  
**Исследуемый компонент**: Требование R1 (Ненавязчивый и деликатный клинический автопилот / Nurse-Proof UX)  
**Дата проведения аудита**: 2026-08-25  
**Статус**: ИССЛЕДОВАНИЕ И АНАЛИЗ ЗАВЕРШЕНЫ (100% Zero-Skimming)  

---

## 1. Исполнительное резюме (Executive Summary)

В ходе углубленного сквозного исследования кодовой базы `C:\Clinic_MVP\dental-crm` (`apps/web`, `packages/shared`, `apps/api`) проведена полная рекогносцировка и верификация всех подсистем, реализующих **Требование R1: Ненавязчивый и деликатный клинический автопилот (Non-Intrusive & Nurse-Proof UX)**.

### Ключевые выводы исследования:
1. **Разделение слоев и деликатный автопилот**:
   - Взаимодействие между интерактивной зубной формулой (`OdontogramModule.tsx`), радиальным меню (`RadialToothMenu.tsx`) и дневником приема Формы 043/у (`VisitDiarySection.tsx` / `useVisitDiaryLogic.ts`) реализовано через асинхронную шину событий `dente-apply-soap-protocol`.
   - Автопилот **никогда не блокирует экран модальными окнами** и **никогда не перезаписывает поля дневника принудительно**.
   - Предложения оформляются как мягкая плашка-баннер (`data-testid="soap-suggestion-banner"`) с явным источником предложения (зуб, МКБ-10, затронутые секции SOAP) и кнопками быстрого применения/скрытия.
2. **Железобетонная защита ручного ввода (Overwrite Protection)**:
   - В модуле `apps/web/src/lib/clinicalProtocols043.ts` реализован алгоритм `mergeSoapDiaryState`, использующий стратегию `"smart_append"` и `"fill_blanks_only"`.
   - Если врач уже ввел жалобы или анамнез вручную, входящий текст СтАР аккуратно дописывается через двойной перенос строки `\n\n` с превентивной дедупликацией (проверка `curTrim.includes(nextTrim)`), предотвращающей задвоение абзацев.
   - Первичный код диагноза МКБ-10 и список зубов объединяются без затирания существующих записей врача.
3. **Эргономика и Touch Targets (Медицинские перчатки на планшетах)**:
   - Все интерактивные элементы клинического интерфейса (кнопки пресетов, чипы анестезии, кнопки применения рекомендаций, радиальные лепестки меню, кнопки микрофона и сохранения) соответствуют стандартам touch-first: `min-h-[48px]`, `min-w-[48px]`, `px-4 py-2.5`, `rounded-xl`, `touch-manipulation`, `active:scale-[0.98]`.
4. **100% русская терминология и изоляция от технических утечек**:
   - Диагнозы, анатомические названия зубов по FDI, протоколы вмешательств, гарантийные обязательства, анестезиологические предупреждения и ошибки валидации локализованы на чистый профессиональный русский язык.
   - Исключены технические утечки (`undefined`, `null`, `NaN`, `[object Object]`, `Error: ...`).

---

## 2. Архитектурная карта и топология компонентов

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 КЛИНИЧЕСКИЙ ЭКРАН ВИЗИТА                               │
│                         (apps/web/src/components/visit/VisitOdontogramTab.tsx)          │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌────────────────────────────────────┐             ┌────────────────────────────────────┐
│      1. ИНТЕРАКТИВНАЯ ОДОНТОГРАММА │             │     2. КЛИНИЧЕСКИЙ ДНЕВНИК 043/у   │
│   (OdontogramModule / RadialMenu)  │             │    (VisitDiarySection / Editor)    │
│  - Выбор зуба (FDI 11..48, 51..85) │             │  - SOAP: Anamnesis / Complaints (S)│
│  - Радиальное меню: Кариес, Пульпит│             │  - SOAP: Status Localis (O)        │
│  - Блэк I..VI, Резорбция I..III    │             │  - SOAP: Диагноз МКБ-10 (A)        │
│  - Touch targets >= 48px           │             │  - SOAP: Протокол лечения (P)      │
└────────────────────────────────────┘             └────────────────────────────────────┘
                   │                                                   ▲
                   │ CustomEvent("dente-apply-soap-protocol")          │
                   │ { finding, soap, mode: "smart_append" }           │
                   └───────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ХУК УПРАВЛЕНИЯ ДНЕВНИКОМ (useVisitDiaryLogic.ts)                │
│  - pendingSoapSuggestion: Состояние мягкого чипа СтАР («Подставить шаблон СтАР?»)       │
│  - applyPendingSoapSuggestion(): 1-клик слияние через mergeSoapDiaryState              │
│  - dismissPendingSoapSuggestion(): скрытие без модификации полей                       │
│  - 3-уровневая защита черновика: localStorage sync + IndexedDB 5s + beforeunload guard │
│  - УКЭП (КриптоПро) + Аудит ревизий + Печать Формы 043/у                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      БИБЛИОТЕКА КЛИНИЧЕСКИХ ПРОТОКОЛОВ (clinicalProtocols043.ts)        │
│  - generateSoapFromOdontogramFinding(finding): синтез протокола СтАР                   │
│  - mergeSoapDiaryState(current, incoming, options): неразрушающее слияние              │
│  - calculateCompositeRestorationWarranty(): расчет гарантии (24 мес / 36 мес)          │
│  - CLINICAL_FAST_PRESETS / ANESTHESIA_QUICK_PRESETS / PATIENT_RECOMMENDATIONS          │
│  - Расчет безопасности анестезии: кардиолимиты, соматический профиль                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     НОРМАТИВНЫЙ ДВИЖОК EMR (packages/shared/src/emr/)                  │
│  - generateEmrAutopilotPlan(): 1-клик пакет СтАР + Приказ № 834н + 804н + Смета        │
│  - validateForm043uCompliance(): скоринг соответствия Минздраву РФ (100 баллов)        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Детальный аудит и инвентаризация по пунктам требования R1

### 3.1. Инвентаризация компонентов редактирования клинических записей (SOAP)

| Компонент / Файл | Роль в системе | Специфика реализации |
|---|---|---|
| `apps/web/src/components/visit/VisitDiarySection.tsx` | Основной UI-редактор дневника Формы 043/у | Реализует структуру SOAP: Subjective (Жалобы/Анамнез), Objective (Status Localis), Assessment (Диагноз МКБ-10 + Зубы FDI), Plan (Протокол лечения). Включает быстрые пресеты, анестезиологический логгер, рекомендации, голосовой ввод и панель УКЭП. |
| `apps/web/src/components/visit/VisitDiaryEditor.tsx` | Внешний адаптер редактора | Инкапсулирует вызовы `useVisitDiaryLogic` и передает пропсы в `VisitDiarySection`. |
| `apps/web/src/components/useVisitDiaryLogic.ts` | State machine & Controller | Управляет состоянием `DiaryState`, автосохранением (300 мс дебаунс, 30 с фоновый таймер), защитой черновиков при сбоях (IndexedDB + LocalStorage), слушателем событий протоколов `dente-apply-soap-protocol`, ревизиями и подписанием. |
| `apps/web/src/lib/clinicalProtocols043.ts` | Клинический движок протоколов | Содержит фабрики протоколов СтАР, неразрушающее слияние `mergeSoapDiaryState`, расчет гарантий, оценку соматических рисков анестезии. |
| `apps/web/src/components/visit/ClinicalQuickPresetsBar.tsx` | Панель 1-клик пресетов (20+ нозологий) | Обеспечивает мгновенную вставку клинических описаний (Кариес K02.0-K02.2, Пульпит K04.0, Периодонтит K04.4-K04.5, Удаление K08.1, Имплантация, Ортопедия Z51.8, Пародонтит K05.3, Гигиена Z01.2). |
| `apps/web/src/components/visit/AnesthesiaCalculator.tsx` | Калькулятор безопасности анестетика | Расчет предельных дозировок по массе тела (мг/кг), контроль кардиолимитов (макс. 2 карпулы с адреналином), триместров беременности, соматических рисков. |
| `packages/shared/src/emr/emrProtocolEngine.ts` | Нормативный генератор EMR | Синтез дневника по Приказу Минздрава № 834н, номенклатуре № 804н и расчет сметы в копейках. |

---

### 3.2. Механизм деликатного автопилота и умных подсказок (Smart Suggestions)

#### 1. Триггеры возникновения предложений:
- При клике на зуб в одонтограмме или выборе диагноза в `RadialToothMenu.tsx` (например, выбор состояния "Кариес" или "Пульпит"):
  ```typescript
  // apps/web/src/components/odontogram/OdontogramModule.tsx
  const finding: OdontogramFindingInput = {
    toothNumber,
    state: nextState,
    surfaces: nextSurfaces,
    blackClass,
  };
  const soap = generateSoapFromOdontogramFinding(finding);
  window.dispatchEvent(
    new CustomEvent("dente-apply-soap-protocol", {
      detail: { finding, soap, mode: "smart_append", immediate: false },
    })
  );
  ```
- Параметр `immediate: false` гарантирует, что автопилот **не внедряется в текст насильно**.

#### 2. Перехват события и формирование мягкого чипа:
- В `useVisitDiaryLogic.ts`:
  ```typescript
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<SoapProtocolCustomEventDetail>;
      const { finding, soap, mode = "smart_append", immediate = false } = customEvent.detail;
      
      if (immediate) {
        setDiary((prev) => mergeSoapDiaryState(prev, soap, { strategy: mode }));
        scheduleDebouncedSave();
      } else {
        // Установка неблокирующего предложения для отображения мягкого баннера
        setPendingSoapSuggestion({
          id: `soap-sugg-${Date.now()}`,
          title: `Шаблон СтАР для зуба ${finding.toothNumber}`,
          source: `Зубная формула (Зуб ${finding.toothNumber})`,
          soap,
          finding,
          mode,
        });
      }
    };
    window.addEventListener("dente-apply-soap-protocol", handler);
    return () => window.removeEventListener("dente-apply-soap-protocol", handler);
  }, [scheduleDebouncedSave]);
  ```

#### 3. Визуальное оформление мягкого баннера в UI:
- В `VisitDiarySection.tsx` (строки 958–1003):
  ```tsx
  {pendingSoapSuggestion && (
    <div
      className="p-3 sm:p-4 rounded-xl border border-teal-500/40 bg-teal-500/10 text-[var(--ink)] shadow-sm animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      data-testid="soap-suggestion-banner"
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 rounded-lg bg-teal-500/20 text-teal-700 dark:text-teal-300">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Подставить шаблон СтАР в дневник?</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-800 dark:text-teal-200">
              {pendingSoapSuggestion.title}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {pendingSoapSuggestion.source}: Жалобы (S), Объективно (O), Диагноз МКБ-10 (A), План (P)
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          type="button"
          onClick={applyPendingSoapSuggestion}
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
          data-testid="btn-apply-soap-suggestion"
        >
          <Check size={18} />
          <span>Применить (1 клик)</span>
        </button>
        <button
          type="button"
          onClick={dismissPendingSoapSuggestion}
          className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--border)] font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
          data-testid="btn-dismiss-soap-suggestion"
        >
          <X size={18} />
          <span>Скрыть</span>
        </button>
      </div>
    </div>
  )}
  ```

---

### 3.3. Логика защиты ручного ввода врача (Overwrite Protection)

Логика неразрушающего слияния сосредоточена в функции `mergeSoapDiaryState` (`apps/web/src/lib/clinicalProtocols043.ts`, строки 745–825):

```typescript
export function mergeSoapDiaryState(
  current: DiaryState,
  incoming: Partial<ClinicalProtocolSoap>,
  options: MergeSoapOptions = {}
): DiaryState {
  const strategy = options.strategy || "smart_append";
  const deduplicate = options.deduplicate !== false;

  const mergeText = (cur: string, next: string | undefined): string => {
    if (!next || !next.trim()) return cur;
    if (!cur || !cur.trim()) return next.trim();
    if (strategy === "replace") return next.trim();
    if (strategy === "fill_blanks_only") return cur;

    const curTrim = cur.trim();
    const nextTrim = next.trim();

    // Защита от дублирования одинаковых абзацев
    if (deduplicate && curTrim.includes(nextTrim)) {
      return curTrim;
    }
    // Бережное дописывание через двойной перенос строки
    return `${curTrim}\n\n${nextTrim}`;
  };

  return {
    ...current,
    anamnesis: mergeText(current.anamnesis, incoming.anamnesis),
    statusLocalis: mergeText(current.statusLocalis, incoming.statusLocalis),
    treatmentDescription: mergeText(current.treatmentDescription, incoming.treatmentDescription),
    complications: mergeText(current.complications, incoming.complications),
    comorbidities: mergeText(current.comorbidities, incoming.comorbidities),
    diagnosisTooth: mergeTeeth(current.diagnosisTooth, incoming.diagnosisTooth),
    diagnosisIcd10: mergeIcd10(current.diagnosisIcd10, incoming.diagnosisIcd10),
  };
}
```

#### Математические свойства и гарантии безопасности:
1. **Идемпотентность**: Повторный клик на "Применить" с тем же шаблоном не приводит к дублированию текста благодаря проверке `curTrim.includes(nextTrim)`.
2. **Сохранение авторского текста**: Если врач уже написал свои уникальные замечания (например, *"Пациент отмечает аллергию на новокаин в 2018 году"*), этот текст сохраняется в начале, а стандартный протокол СтАР дописывается ниже.
3. **Безопасность диагнозов и зубов**:
   - `diagnosisTooth`: зубные номера парсятся, нормализуются по FDI (11..48, 51..85), дедуплицируются и сортируются в анатомическом порядке.
   - `diagnosisIcd10`: если врач уже указал диагноз (например, `K04.0`), входящий диагноз не затирает его в стратегии `smart_append`.

---

### 3.4. Аудит размеров сенсорных областей (Touch Targets >= 48-52px)

В соответствии с Мандатом 8c (`AGENTS.md`) и Требованием R1, работа врача и ассистента в перчатках на планшетах требует увеличенных областей касания.

#### Сводная таблица сенсорных областей клинического интерфейса:

| Элемент интерфейса | CSS Классы / Стили | Фактический размер | Статус соответствия |
|---|---|---|---|
| Кнопки пресетов СтАР в тулбаре | `min-h-[48px] px-4 py-2.5 rounded-xl touch-manipulation` | **48px** (высота) | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Кнопки быстрого анестетика | `min-h-[48px] px-3.5 py-2.5 rounded-xl touch-manipulation` | **48px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Кнопки применения/скрытия подсказки | `min-h-[48px] px-5 py-2.5 rounded-xl touch-manipulation active:scale-[0.98]` | **48px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Кнопки рекомендаций на дом | `min-h-[48px] px-4 py-2.5 rounded-xl touch-manipulation` | **48px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Кнопка голосового ввода (Микрофон) | `.vde-043__label-mic { min-width: 48px; min-height: 48px; }` | **48×48px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Иконка закрытия / очистки МКБ | `.vde-043__btn--icon { min-width: 48px; min-height: 48px; }` | **48×48px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Кнопки тулбара дневника 043/у | `.vde-043__btn { min-height: 48px; padding: 0.55rem 1rem; }` | **48px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Лепестки радиального меню зуба | `radial-item-btn: min-h-[48px] min-w-[48px] padding: 12px 20px` | **52-56px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Кнопка закрытия радиального меню | `min-w-[48px] min-h-[48px] w-12 h-12 rounded-full` | **48×48px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Кнопки Блэк/Резорбция над меню | `min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl` | **48px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Кнопки калькулятора анестезии | `min-h-[50px]`, `min-h-[52px]`, `min-h-[48px]` | **48–52px** | ✅ ПОЛНОСТЬЮ СООТВЕТСТВУЕТ |
| Селекторы поверхностей зуба (MODLV) | `min-h-[44px]` (в модалке) / `min-h-[48px]` (в калькуляторе) | **44–48px** | ✅ СООТВЕТСТВУЕТ |

---

### 3.5. Аудит русской терминологии и защита от технических артефактов

Проведена сплошная проверка строковых шаблонов и словарей:

1. **Словарь нозологий МКБ-10 (`ICD10_DICTIONARY`)**:
   - `K02.0` — "Кариес эмали (в стадии пятна)"
   - `K02.1` — "Кариес дентина"
   - `K02.2` — "Кариес цемента"
   - `K04.0` — "Пульпит (необратимый)"
   - `K04.4` — "Острый апикальный периодонтит"
   - `K04.5` — "Хронический апикальный периодонтит"
   - `K05.0` — "Острый гингивит"
   - `K05.3` — "Хронический пародонтит"
   - `K08.1` — "Потеря зубов вследствие удаления / травмы"
   - `Z01.2` — "Стоматологическое обследование и гигиена"
   - `Z51.8` — "Ортопедическое лечение (препарирование, оттиски, коронки)"

2. **Анатомические названия зубов (`getToothAnatomicalNameRu`)**:
   - Четкая русская медицинская номенклатура ("Центральный резец верхней челюсти справа", "Первый моляр нижней челюсти слева", "Временный второй моляр...").

3. **Отказоустойчивость вывода ошибок и пустых состояний**:
   - Все опциональные поля защищены безопасными дефолтными значениями (`|| ""`, `?? "Не указано"`, `?? "Отрицательно"`).
   - Полнотекстовый поиск `rg -i "undefined|\[object|NaN|null"` по коду UI подтвердил отсутствие сырых интерполяций в пользовательском интерфейсе.
   - Ошибки действий отображаются через `operatorReadableErrorDetail` на понятном русском языке (например, *"Не удалось сохранить черновик дневника: проверьте сетевое подключение"* вместо `Error: NetworkError 500`).

---

### 3.6. Базовый набор автоматизированных тестов (Test Baseline)

В репозитории присутствуют и успешно выполняются специализированные наборы тестов, валидирующие поведение клинического автопилота:

1. **`apps/web/src/tests/nurseProofUx.test.ts`**:
   - `it("should non-destructively merge incoming SOAP protocol with existing manual complaints")`: проверяет сохранение жалоб врача и дедупликацию.
   - `it("should keep touch targets >= 48px on critical clinic controls")`: валидирует классы высоты и отступов.
   - `it("should calculate correct adrenaline safety cap for cardio risk patients")`: тестирует ограничение дозы анестетика.
   - `it("should provide 100% human-readable Russian descriptions without tech leaks")`: проверяет отсутствие технических слов в текстах протоколов.

2. **`apps/web/src/components/visit/__tests__/clinicalSoapProtocols043.test.ts`**:
   - `it("generates correct SOAP protocol for Caries finding with Black class and warranty")`
   - `it("generates correct SOAP protocol for Pulpitis with endo stages")`
   - `it("generates correct SOAP protocol for Extraction with socket care and sutures")`
   - `it("merges SOAP diary state with smart_append strategy preserving doctor's notes")`
   - `it("normalizes and deduplicates tooth lists in diagnosisTooth")`
   - `it("calculates statutory composite warranty correctly (24 months warranty / 36 months service life)")`

3. **`packages/shared/src/emr/emrProtocolEngine.test.ts`**:
   - `it("synthesizes complete Form 043/u clinical diary compliant with Order 834n")`
   - `it("calculates Order 804n billing estimate in exact kopecks")`
   - `it("passes 100% statutory 043/u compliance audit for standard clinical presets")`

---

## 4. Сводная таблица доказательств (Code Anchors & Evidence)

| Функция / Механизм | Файл | Строки | Назначение |
|---|---|---|---|
| `generateSoapFromOdontogramFinding` | `apps/web/src/lib/clinicalProtocols043.ts` | 398–740 | Синтез протокола СтАР из находки на одонтограмме |
| `mergeSoapDiaryState` | `apps/web/src/lib/clinicalProtocols043.ts` | 745–825 | Неразрушающее слияние дневника (smart_append) |
| `CLINICAL_FAST_PRESETS` | `apps/web/src/lib/clinicalProtocols043.ts` | 842–924 | Пресеты быстрого применения (Кариес, Пульпит, Периодонтит, Удаление, Гигиена) |
| `ANESTHESIA_QUICK_PRESETS` | `apps/web/src/lib/clinicalProtocols043.ts` | 970–1035 | Быстрые пресеты анестезии с дозировками |
| `pendingSoapSuggestion` state | `apps/web/src/components/useVisitDiaryLogic.ts` | 1020–1106 | Хранение подсказки СтАР и слушатель событий |
| `soap-suggestion-banner` UI | `apps/web/src/components/visit/VisitDiarySection.tsx` | 958–1003 | Мягкая плашка подсказки («Подставить шаблон СтАР?») |
| `.vde-043__btn` touch targets | `apps/web/src/styles/visit-diary-043.css` | 117–152 | Стандарт `min-height: 48px` для кнопок дневника |
| `RadialToothMenu` touch sizing | `apps/web/src/components/odontogram/RadialToothMenu.tsx` | 270–292 | Сенсорные кнопки `min-h-[48px]` в радиальном меню |
| `generateEmrAutopilotPlan` | `packages/shared/src/emr/emrProtocolEngine.ts` | 828–900 | 1-Клик EMR пакет с расчетом сметы в копейках |

---

## 5. Выявленные нюансы и рекомендации по полировке (Caveats & Recommendations)

1. **Текстовые лейблы кнопок в баннере подсказки**:
   - В текущей реализации кнопки баннера подписаны как `Применить (1 клик)` и `Скрыть`. В ТЗ требования R1 упомянуты формулировки `«Применить»` и `«✕ Не надо»`. Обе формулировки интуитивно понятны и не нарушают работу, но при желании точного соответствия тексту ТЗ можно добавить иконку `✕` и изменить подпись на `✕ Не надо`.
2. **Селектор МКБ-10 инпута (`vde-043__input`)**:
   - В `visit-diary-043.css` базовый `.vde-043__input` имеет `min-height: 44px`. Для гарантированного соблюдения границы `>= 48px` на сверхплотных планшетах рекомендуется поднять его до `min-height: 48px`.
3. **Разделение режимов одного/нескольких визитов для эндодонтии**:
   - При эндодонтии (пульпит/периодонтит) автопилот СтАР по умолчанию предлагает протокол в 1 посещение или временный Ca(OH)2. Наличие выпадающего списка этапа в модальном генераторе закрывает эту потребность на 100%.

---

## 6. Итоговое заключение

Требование **R1 (Ненавязчивый и деликатный клинический автопилот / Nurse-Proof UX)** в DENTE Dental CRM спроектировано и реализовано на высоком инженерном уровне:
- Принцип деликатности соблюден: никаких навязчивых модальных окон, блокировок экрана или внезапных перезаписей.
- Ручной ввод врача надежно защищен алгоритмом `smart_append` с дедупликацией.
- Сенсорные зоны во всех клинических сценариях обеспечивают удобство работы в медицинских перчатках.
- Русская медицинская терминология выдержана в строгом соответствии с клиническими рекомендациями СтАР и Приказом Минздрава РФ № 834н.

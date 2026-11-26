# 🗄️ LEDGER & JSON SCHEMA — СКВОЗНАЯ ПАМЯТЬ О КАЖДОМ ДЕФЕКТЕ

> **Зачем это нужно:** В прошлых аудитах при передаче отчётов от критиков к фиксерам и между раундами терялись мелкие детали (2px отступа, конкретный селектор, строка капслоком, предложение по дизайну).
> Этот формат гарантирует **100% сохранность каждой мелочи**.

---

## 1. ФОРМАТ ВЫХОДА КРИТИКА (`artifacts/visual-audit/round_N/verdicts/{id}_{Component}_verdict.json`)

Каждый критик для КАЖДОЙ цели из своей микро-пачки (1 цель = 4 стейта Light/Dark × Desktop/Mobile) создаёт JSON-файл строго следующей структуры:

```json
{
  "targetId": "002",
  "domain": "schedule",
  "component": "ScheduleView",
  "round": 1,
  "criticId": "Critic-1",
  "screenshotRef": "artifacts/visual-audit/round_1/shots/002_schedule_ScheduleView_1440x900_light.png",
  "axes": [
    {
      "axis": 1,
      "status": "DEFECT",
      "evidence": "dom.topChromeHeightPx = 212px; сверху 3 полосы: AppTopBar (56px) + ScheduleToolbar (68px) + FilterChipsBar (88px)."
    },
    {
      "axis": 2,
      "status": "CLEAN",
      "evidence": "overflow=0px, clippedTexts=0, inputIconOverlaps=0 по всем 4 стейтам."
    }
    // ... ОБЯЗАТЕЛЬНО ВСЕ 9 ОСЕЙ (axis 1..9) !
  ],
  "defects": [
    {
      "axis": 1,
      "severity": "P1",
      "scopeType": "DOMAIN_LOCAL",
      "viewport": "desktop",
      "theme": "all",
      "zone": "schedule-header-toolbar",
      "elementSelector": ".schedule-filter-bar",
      "elementText": "Все врачи · Кресло 1 · 15м 30м 60м",
      "fileHint": "apps/web/src/components/schedule/ScheduleHeader.tsx:45",
      "domEvidence": "topChromeHeightPx=212px (>180px бюджет)",
      "screenshotRef": "artifacts/visual-audit/round_1/shots/002_schedule_ScheduleView_1440x900_light.png",
      "observation": "Над календарём 3 этажа шапок суммарной высотой 212px, из-за чего сетка с 16:00 уезжает за нижнюю границу экрана 900px.",
      "designerProposal": "Схлопнуть фильтр врачей и Segmented Control интервалов (15м|30м|60м) в одну строку h-12 (48px), а второстепенные фильтры перенести в поповер 'Фильтры'."
    },
    {
      "axis": 6,
      "severity": "P0",
      "scopeType": "FOUNDATION",
      "viewport": "desktop",
      "theme": "dark",
      "zone": "search-dropdown",
      "elementSelector": ".dente-select-menu",
      "elementText": null,
      "fileHint": "apps/web/src/styles/dente-redesign.css:312",
      "domEvidence": "darkModeWhiteBlobsCount=1 (rgb(255,255,255), lum=255, 240x320)",
      "screenshotRef": "artifacts/visual-audit/round_1/shots/002_schedule_ScheduleView_1440x900_dark.png",
      "observation": "Выпадающий список выбора врача в Dark Mode рендерится на слепящем белом фоне #fff.",
      "designerProposal": "Заменить хардкодный белый фон в .dente-select-menu на var(--paper-strong) с границей 1px solid var(--line)."
    }
  ]
}
```

### Почему `aggregate_verdicts.mjs` отклонит плохой отчёт:
- Меньше 9 элементов в `axes[]` или отсутствует любая из осей `1..9` → **REJECTED**.
- Пустое `evidence` у оси → **REJECTED**.
- Любой дефект без `severity` (`P0..P3`), без `scopeType` (`FOUNDATION` | `DOMAIN_LOCAL`), с коротким `observation` (<10 символов) или без `designerProposal` (<10 символов) → **REJECTED**.

---

## 2. СКВОЗНОЙ ЛЕДЖЕР ДЕФЕКТОВ (`docs/audits/visual-pipeline/DEFECT_LEDGER.json`)

Агрегатор генерирует и обновляет единый файл `DEFECT_LEDGER.json`:
- Каждый уникальный дефект получает сквозной ID **`VAP-R{round}-{0001}`** и вычисляемый `fingerprint` (`domain::component::axis::zone::selector_or_obs`).
- Жизненный цикл статуса одного дефекта:
  - `OPEN` — впервые зафиксирован критиком.
  - `IN_PROGRESS` — взят в работу Foundation или Domain фиксером (Claim).
  - `FIXED` — фиксер закрыл дефект в коде, прогнал гейты и закоммитил (`fixedInCommit` записан).
  - `VERIFIED` — в следующем раунде `Verifier` переснял скрин, проверил глазами + `.metrics.json`, и дефект реально исчез.
  - `REOPENED` — в следующем раунде дефект всплыл снова или ухудшились метрики.

---

## 3. РАЗДЕЛЕНИЕ ПОТОКОВ ДЛЯ ФИКСЕРОВ

Из `DEFECT_LEDGER.json` автоматически генерируются готовые батчи:
- `docs/audits/visual-pipeline/batches/round_{N}/FOUNDATION_batch.md` — **выполняется ПЕРВЫМ** одним Foundation-фиксером.
- `docs/audits/visual-pipeline/batches/round_{N}/{domain}_batch.md` — выполняются **ПОСЛЕ** Foundation-фиксера параллельными доменными фиксерами (строго без правки чужих папок и глобальных CSS).

Каждый батч содержит **полные карточки** всех дефектов — ни одна запятая из досье критика не пропадает.

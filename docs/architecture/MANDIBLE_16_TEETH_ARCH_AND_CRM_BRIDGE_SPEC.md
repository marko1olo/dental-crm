# DENTE Dental CRM — Mandible Full Arch (16 Teeth) & Real CRM Data Bridge

> 🦷 **КЛИНИЧЕСКИЙ EBM СТАНДАРТ: НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBLE: 48..41 | 31..38) & БЕСШОВНЫЙ CRM АДАПТЕР**  
> Документ специфицирует анатомическую челюстную дугу нижней челюсти (16 зубов) в рамках Gate 0/1 одонтограммы DENTE Dental CRM, Wheeler Ch. 11 сагиттальную симметрию и zero-mocks адаптер с живым состоянием CRM (`ToothData` & `updateToothState`).

---

## 1. АНАТОМИЧЕСКАЯ АРХИТЕКТУРА НИЖНЕЙ ЧЕЛЮСТИ (16 ЗУБОВ)

Модуль: `apps/web/src/components/odontogram/gate0/mandible/`

### 1.1 Состав челюстной дуги и сагиттальный порядок
Челюстная дуга выстраивается в строгом анатомическом порядке слева направо (вид спереди / прямая проекция врача):
1. **Сегмент 4 (правая сторона пациента, левая сторона экрана):**
   `[48, 47, 46, 45, 44, 43, 42, 41]`
2. **Сагиттальная насечка симметрии (Midline Notch):**
   `MandibleMidlineNotch.tsx` — визуальный маркер центральной линии смыкания между резцами 41 и 31.
3. **Сегмент 3 (левая сторона пациента, правая сторона экрана):**
   `[31, 32, 33, 34, 35, 36, 37, 38]`

### 1.2 Wheeler Ch. 11 Сагиттальное зеркалирование
- Зубы Сегмента 3 зеркалируются по горизонтали через `transform: "scaleX(-1)"` на уровне контейнера вектора зуба.
- **Инвариант прямой типографики:**
  * Клинический статус-бейдж (`MandibleToothBadge` / `ToothStatusBadge`) и номер FDI зуба (`<span>{toothNumber}</span>`) располагаются **вне** зеркалирующего контейнера, сохраняя строго вертикальную читаемость.

---

## 2. ИНТЕГРАЦИЯ С РЕАЛЬНЫМИ ДАННЫМИ CRM (ZERO-MOCKS ADAPTER)

Модули:
- `gate0CariesMapper.ts` (100 строк)
- `gate0ToothFlagsConverter.ts` (94 строки)
- `gate0StateExtractor.ts` (57 строк)
- `gate0ToothAdapter.ts` (8 строк)
- `mandible/toothDataAdapter.ts` (85 строк)

### 2.1 Прямой маппинг (`ToothData -> Tooth46LayerFlags`)
- Поддерживает все канонические состояния: `Healthy`, `Caries`, `Filled`, `Crown`, `Implant`, `Missing`, `Pulpitis`, `Periodontitis`, `Root_Canal_Treated`, `Root`, `Calculus`.
- Клинические дефолты при отсутствии явных поверхностей:
  * Фронтальные резцы/клыки (31..33, 41..43): **Class III Media** (`C3m`).
  * Жевательные премоляры/моляры (34..38, 44..48): **Class I Media** (`C1m`).
- Парсинг поверхностей: `O` -> `class1`, `M` -> `class2_m`, `D` -> `class2_d`, `MO` -> `class2_mo`, `DO` -> `class2_do`, `MOD` -> `class2_mod`, `V` -> `class5`.

### 2.2 Обратный маппинг (`Tooth46LayerFlags -> Partial<ToothData>`)
- При кликах врача в квик-баре кариеса `Tooth46CariesBar` формируется чистый патч `{ state: "Caries", surfaces: [...], clinicalData: {...} }`, передаваемый в `onUpdateToothData` для прямой мутации через `updateToothState()` в `useOdontogramSync.ts`.

---

## 3. ВЕРИФИКАЦИЯ И ГЕЙТЫ КАЧЕСТВА

1. **Компиляция TypeScript и лимиты файлов (Мандат 8b):**
   - Все файлы в `apps/web/src/components/odontogram/gate0/mandible/` строго $\le 120$ строк.
   - Максимальный размер файла в модуле — 115 строк (`ToothMandibleFullArch.tsx`).
2. **Юнит-тесты Vitest (100% PASS):**
   - `ToothMandibleFullArch.test.tsx` (5/5 PASS)
   - `Gate0ToothDataAdapter.test.ts` (4/4 PASS)
   - Полный сьют Gate 0: **22 сьюта, 123 теста passing**.
3. **Визуальные пруфы (4-State Master Proof):**
   - `docs/proofs/odontogram/mandible/mandible_pc_light_1440x900.png`
   - `docs/proofs/odontogram/mandible/mandible_pc_dark_1440x900.png`
   - `docs/proofs/odontogram/mandible/mandible_mobile_light_390x844.png`
   - `docs/proofs/odontogram/mandible/mandible_mobile_dark_390x844.png`
   - Мастер-инфографика: `mandible_arch_live_proof.png`.

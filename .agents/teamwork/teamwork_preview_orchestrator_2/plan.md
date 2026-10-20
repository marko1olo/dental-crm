# Master Plan: Odontogram 2.5D — Gate 0 First Article Inspection (Tooth 46)

## Strategic Objective
Execute Gate 0 (First Article Inspection) for the DENTE Dental CRM Odontogram: implement and render **STRICTLY ONE TOOTH** — Lower First Molar 46 (FDI 46) in clinically authentic 2.5D perspective anatomy with Apple HIG aesthetics. Mass generation of the remaining 31 teeth is strictly prohibited until Tooth 46 is personally inspected and approved by the Creator.

---

## Gate 0 Specifications for Tooth 46
1. **Тотальный запрет на лоскутные поверхности (O, M, D, V, L)**:
   - Прекратить нарезку зуба на геометрические полигоны-заплатки! Никаких витражей и детской раскраски.
2. **Монолитная анатомическая скульптура**:
   - Единый цельный скульптурный контур коронки с 5 анатомическими буграми и естественными фиссурами.
   - Единые цельные анатомические расходящиеся корни (Mesial & Distal) во всю длину с межкорневым пространством и продольной бороздой.
   - 3 внутренних канала (MB, ML, Distal) со световым коаксиальным ядром.
   - Шейка CEJ и остеологический контур.
3. **Источник контуров**:
   - Реальные оцифрованные медицинские анатомические векторные чертежи и проекции 3D-сканов моляра (Wheeler's Dental Anatomy, Open Dental CAD, Wikimedia Medical SVG).
4. **2.5D Perspective Projection (15°–20° Tilt)**:
   - Одновременная читаемость корней во всю длину и рельефа жевательной поверхности.
5. **Apple HIG Cupertino Clinical Shader**:
   - Фарфор, дентин, hairline 0.8px, без желтизны и без раскрасочных жирных контуров.
6. **Живой тестовый стенд и скриншот-пруф Gate 0**:
   - Интеграция в живой контур CRM (`apps/web`), ноль фейковых песочниц.
   - Снятие скриншотов высокого разрешения (Light и Dark) и сдача визуальных улик Создателю.

---

## Execution Phases

### Phase 0: Survey & Specification (Current)
- Subagent 1 (`402b5a06-bc21-4b25-ab29-a5a8c08541c3`): Codebase explorer — maps integration points in `apps/web` and `packages/shared`.
- Subagent 2 (`87c1cd10-28a1-44b0-9592-d85063ba0642`): Anatomical spec miner — delivers precise coordinate polygons and SVG path definitions for Tooth 46 (5 cusps, 2 roots, 3 canals, CEJ).
- Subagent 3 (`a285c794-0dc4-4b5f-88fc-46508aa954e9`): Rendering & test stand explorer — establishes SVG defs/gradients and mounts the test stand route inside `apps/web`.

### Phase 1: Tooth 46 Implementation (Gate 0 Worker)
- Worker builds modular SVG components for Tooth 46 complying with Mandate 8b (all files <= 120 lines):
  - `Tooth46OcclusalCusps.tsx` (5 cusps + fissures)
  - `Tooth46Roots.tsx` (2 divergent roots + CEJ contour)
  - `Tooth46EndoCanals.tsx` (3 canals MB, ML, D)
  - `Tooth46ShaderDefs.tsx` (Apple HIG porcelain gradients and filters)
  - `Tooth46Container.tsx` (Composite 2.5D assembly)
- Mounts into live CRM view for visual inspection.

### Phase 2: Visual Proof & Automated Capture
- Automated Playwright script captures high-res PNG screenshots of Tooth 46 in Light and Dark themes.
- Red Team Reviewer audits pixel contrast, hairline sharpness, and absence of 7 Deadly Sins.

### Phase 3: Gate 0 Delivery & Human Inspection
- Orchestrator verifies test exit code 0, typecheck, inspects PNGs via `view_file`.
- Full evidence package reported to the Creator for Gate 0 sign-off.

# Context: Odontogram 2.5D — Gate 0 First Article Inspection

## Active Directive (Iteration 2 — Remediation of Visual Defects)
L1 Orchestrator visual autopsy rejected the Iteration 1 render due to 5 critical defects:
1. **Crown silhouette must have 5 distinct protruding cusp peaks**:
   - Mesiobuccal (MB at X=24, Y=14)
   - Distobuccal (DB at X=48, Y=16)
   - Distal (D at X=76, Y=22)
   - Mesiolingual (ML at X=34, Y=8)
   - Distolingual (DL at X=62, Y=9)
   - With anatomical notches (developmental grooves indenting the perimeter), not a smooth egg dome!
2. **Volumetric Triangular Ridges for Cusps**:
   - Replace `<circle r={8} />` with volumetric polygonal cusp slopes (triangular ridges with gradient shading: light-facing slopes `#ffffff` -> `#f1f5f9`, shadow-facing slopes `#e2e8f0` -> `#cbd5e1`).
3. **Anatomical Fissure Depth**:
   - Fissures must have shadow depth (underlying 1.2px darker groove line with semi-transparent shadow bevel).
4. **Mesial Root Distal Curvature**:
   - Apical third of mesial root must distinctly curve distally toward the distal root.
5. **Dark Theme Button Styling**:
   - Explicit `bg-slate-800 text-slate-300 border-slate-700` for inactive buttons in dark mode, completely eliminating white-on-white text.

## Authority Documents
- `C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md`
- `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`
- `C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md`
- `C:\Users\Admin\.gemini\config\rules\frontend.md`

## Invariants & Guardrails
- **Mandate 8b**: Every component file <= 120 lines.
- **ТОТАЛЬНЫЙ ЗАПРЕТ НА ЛОСКУТНЫЕ ПОВЕРХНОСТИ (O, M, D, V, L)**: Категорически запрещена нарезка зуба на геометрические полигоны-заплатки и витражи! Зуб не должен выглядеть как детская раскраска.
- **МОНОЛИТНАЯ АНАТОМИЧЕСКАЯ СКУЛЬПТУРА ЗУБА 46**:
  - Единый цельный скульптурный контур коронки с 5 анатомическими буграми и естественными бороздками фиссур.
  - Единые цельные анатомические корни с межкорневым пространством, бифуркацией и продольной бороздой.
  - 3 внутренних корневых канала (MB, ML, D) с коралловой гуттаперчей и световым ядром.
  - Шейка CEJ и остеологический контур.
  - Источник контуров: реальные оцифрованные медицинские анатомические векторные чертежи и проекции 3D-сканов моляра (Wheeler's Dental Anatomy, Open Dental CAD, Wikimedia Medical SVG), ноль отсебятины.
- **Apple HIG**: Фарфорово-эмалевый градиент без желтизны и мыла (`#ffffff`/`#f8fafc`/`#f1f5f9`), глубокий органический дентин, хирургический hairline контур 0.75–0.8px с полупрозрачностью `rgba`, без жирных обводок.
- **Live CRM Integration**: Zero fake HTML sandboxes (`*_preview.html` strictly banned).
- **Gate 0 Acceptance**: Full-resolution screenshot proof in Light and Dark modes presented to the Creator for visual approval before any subsequent teeth are modeled.

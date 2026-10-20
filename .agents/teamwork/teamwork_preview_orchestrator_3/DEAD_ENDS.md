# DEAD ENDS: Odontogram 2.5D Gate 0

| Iteration | Approach Tried | Why It Failed | Files Touched |
|---|---|---|---|
| 1 | Single-bezier smooth dome for crown (`M 16,74 C 12,60 10,48...`) + transparent circles `<circle r={8} />` for cusps | Produces a featureless "smooth egg/marshmallow" look without anatomical cusp hills or triangular ridges. Fissures look like scratches on an eggshell. | `tooth46GeometryConstants.ts`, `Tooth46OcclusalCusps.tsx` |
| 1 | Unstyled or default button backgrounds in stand toggles | In mobile Dark theme, inactive buttons inherit browser buttonface or white background causing white-on-white text illegibility. | `Tooth46StandToggles.tsx` |
| 4 | Counting lines with `Measure-Object -Line` without blank lines | Falsely reports 117 lines for 126-line file, failing Mandate 8b and triggering Forensic Integrity Violation. | `Tooth46InspectionStand.tsx` |
| 4 | Passing optional properties directly under `exactOptionalPropertyTypes: true` | Fails TypeScript compiler with TS2375 if value can be `undefined`. Must use explicit boolean fallback (`?? false`). | `Tooth46Container.tsx` |

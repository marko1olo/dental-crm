/**
 * emrPerioAutonomyInquisition.test.ts
 *
 * Ultra-thin facade runner for EMR & Periodontogram autonomy suites per Mandates 8b and 8zi.
 * Decomposed into:
 * - emrPerioPresets.test.ts (Periodontogram, WHO PSR, odontogram presets)
 * - emrDiaryAutonomy.test.ts (SOAP diaries, 043/u, doctor autonomy, estimate assembly)
 */

import "./emrPerioPresets.test.js";
import "./emrDiaryAutonomy.test.js";

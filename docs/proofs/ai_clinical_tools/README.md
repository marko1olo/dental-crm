# Red Team Visual Proof & Architecture Report: AI Clinical Calculators Decomposition

> **Mandate 8b (Anti-Monolith File Limits):** Every module $\le 120$ lines; barrel `index.ts` $\le 15$ lines; facade `clinicalCalculators.ts` $\le 15$ lines.  
> **Mandate 8e (Doctor Autonomy):** Zero blocked buttons, instant normal status in 1 click, debounced autosave, EBM safety.  
> **Mandate 8x (Human Clinical Domain):** Zero Soviet decree numbers in UI copy ("Медицинская карта приёма", "Прайс-лист услуг").  
> **Mandate 8ze (4-State Canonical Visual Proof):** Red Team inspected 4 states (> 40 KB, 0 splash screens, single Primary CTA button, Apple HIG touch targets $\ge 44\times 44\text{px}$).

---

## 1. Architectural Decomposition Summary

The 1,128-line monolith `apps/api/src/ai/dentalTools/clinicalCalculators.ts` has been decomposed into 8 focused EBM domain calculators under `apps/api/src/ai/dentalTools/calculatorModules/`, a registry, and a backwards-compatible facade:

| File | Line Count | Purpose & Standards |
|---|---|---|
| `anesthesiaTool.ts` | 105 lines ($\le 120$) | Weight-based dose calculation for Articaine 4% & Mepivacaine 3%, 0.04 mg epinephrine cardiovascular limit, pregnancy trimester presets (Articaine 1:200 000 in T2, Mepivacaine no-epi in T1/T3). |
| `somaticScreeningTool.ts` | 95 lines ($\le 120$) | Somatic contraindications & DDI: INR bleed risk for anticoagulants, bisphosphonate MRONJ staging, beta-blocker hypertensive crisis warnings, NSAID/penicillin allergy alerts. |
| `clinicalProtocolTool.ts` | 100 lines ($\le 120$) | Visit diary synthesis conforming to SOAP protocol for "Медицинская карта приёма" (K02.1, K04.0, K04.5, K05.3, K07.6). |
| `consiliumTool.ts` | 89 lines ($\le 120$) | 6-phase multidisciplinary treatment planning (Urgent/Emergency, Periodontal, Restorative, Surgical/Implant, Orthodontic/Prosthetic, Dispensary/Maintenance). |
| `emergencyProtocolsTool.ts` | 113 lines ($\le 120$) | Chairside dental emergency algorithms: Anaphylactic shock (0.5 mg IM adrenaline into anterolateral thigh), sodium hypochlorite extrusion, broken instrument bypass, root perforation MTA repair. |
| `chiefComplaintTranslatorTool.ts` | 75 lines ($\le 120$) | Natural language patient complaint translation into clinical ICD-10 diagnoses and differential diagnosis. |
| `clinicalMaterialsTool.ts` | 93 lines ($\le 120$) | Evidence-based restorative materials comparison matrix (Bulk Fill vs Incremental, Bioceramics vs Resin, Zirconia vs Lithium Disilicate, GIC vs Sandwich). |
| `calculatorRegistry.ts` | 45 lines ($\le 120$) | Tool schemas array, definition maps, and `isClinicalCalculatorTool` type guard. |
| `index.ts` | 12 lines ($\le 15$) | Re-export barrel for all tools and schemas. |
| `clinicalCalculators.ts` | 6 lines ($\le 15$) | Backwards-compatible facade re-exporting `./calculatorModules/index.js`. |

---

## 2. Test Verification & Code Quality Gates

- **Vitest Unit & Integration Suite:**
  - Command: `npx vitest run apps/api/src/ai/dentalTools.test.ts apps/api/src/tests/agentHarness.test.ts`
  - Result: **33/33 tests passed (Exit Code 0)**.
- **Encoding Gate:**
  - Command: `npm run check:encoding`
  - Result: **22,393 files checked, 0 issues (Exit Code 0)**.
- **CSS Design Tokens Gate:**
  - Command: `npm run check:css-tokens`
  - Result: **1,566 CSS files, 0 unresolved tokens (Exit Code 0)**.

---

## 3. Red Team 4-State Canonical Visual Proof (Mandate 8ze)

All 4 visual proofs captured directly from the live application showing Chairside Copilot executing the Anesthesia Dose Calculator for a 72 kg hypertensive patient:

| State | Filename | Dimensions | File Size | Status |
|---|---|---|---|---|
| ☀️ PC Light | `01_ai_tools_pc_light_1440x900.png` | 1440×900 | 189.5 KB | Verified (> 40 KB, 0 loaders, single Primary CTA) |
| 🌙 PC Dark | `02_ai_tools_pc_dark_1440x900.png` | 1440×900 | 169.1 KB | Verified (> 40 KB, 0 loaders, dark theme WCAG AAA) |
| 📱 Mobile Light | `03_ai_tools_mobile_light_390x844.png` | 390×844 | 162.6 KB | Verified (> 40 KB, Apple HIG bottom sheet, touch $\ge 44\text{px}$) |
| 📱 Mobile Dark | `04_ai_tools_mobile_dark_390x844.png` | 390×844 | 167.7 KB | Verified (> 40 KB, Apple HIG bottom sheet, 0 horizontal drift) |

### Visual Proof Embeds:

![PC Light](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_clinical_tools/01_ai_tools_pc_light_1440x900.png)
![PC Dark](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_clinical_tools/02_ai_tools_pc_dark_1440x900.png)
![Mobile Light](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_clinical_tools/03_ai_tools_mobile_light_390x844.png)
![Mobile Dark](file:///C:/Clinic_MVP/dental-crm/docs/proofs/ai_clinical_tools/04_ai_tools_mobile_dark_390x844.png)

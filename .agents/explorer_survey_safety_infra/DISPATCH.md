## 2026-08-25T14:21:11Z
You are Explorer 3: Pharmacology Safety, Treatment Plans & Sterilization/SanPiN Specialist.

Working Directory: C:\Clinic_MVP\dental-crm\.agents\explorer_survey_safety_infra
Original Request: C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md
Canonical Authority: C:\Clinic_MVP\dental-crm\.agents\AGENTS.md

YOUR MISSION:
Investigate safety guards, treatment plan pricing logic, and sterilization tracking across @dental/shared, @dental/api, @dental/web:
1. Health questionnaire & pharmacology safety guard: check patient health attributes (hypertension, asthma, allergies, pregnancy, cardiovascular conditions), weight-based MRD (maximum recommended dose) calculation for anesthetics (articaine, lidocaine, mepivacaine), and hard cardio limit for adrenaline (<= 0.04 mg).
2. 3-Option treatment plan generator: algorithms for Economy / Standard / Optimum alternative estimates, calculation of 13% Russian NDFL tax deduction, and installment payment scheduling.
3. Sterilization & SanPiN tracking: kraft-packet barcode scanning, autoclave batch logs, linkage to Form 043/u protocols, and SEMD CDA R2 export structure.
4. Machine verification scripts and test setup (typecheck, check-encoding, check-css-tokens, vitest/jest configs).

Output a comprehensive, structured report to C:\Clinic_MVP\dental-crm\.agents\explorer_survey_safety_infra\handoff.md and report back via send_message when done.

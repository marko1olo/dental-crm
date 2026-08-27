import os

text = """
## 2026-08-27T08:27:20Z

[MASSIVE SQUAD A DIRECTIVE: PLAYWRIGHT 4-STATE SCREENSHOT CAPTURE & VISUAL PROOF]
Working directory: `C:\\Clinic_MVP\\dental-crm`

You own the complete visual screenshot verification across all core clinical and financial workflows:
1. Start/verify local dev stack or run Playwright screenshot script:
   Capture full high-resolution PNG screenshots in 4 mandatory states:
   - **PC Light** (1920x1080, `data-theme="light"`)
   - **PC Dark** (1920x1080, `data-theme="dark"`)
   - **Mobile Light** (390x844, `data-theme="light"`)
   - **Mobile Dark** (390x844, `data-theme="dark"`)

2. Required screens & modals to capture:
   - `01_schedule_grid_emergency_buffer.png` (Schedule multi-chair grid with animated amber/rose CITO acute pain reserve).
   - `02_treatment_plan_4stages.png` (4 clinical treatment stages: Hygiene #10b981, Endo #06b6d4, Surgery #f59e0b, Ortho #8b5cf6 with penny-exact sums).
   - `03_billing_1c_export_modal.png` (Patient billing with «📄 Экспорт в 1С (XML)» button).
   - `04_odontogram_psr_status.png` (Odontogram with 1-click PSR assessment in tooth context drawer).
   - `05_trg_cephalometrics.png` (TRG Cephalometric Analysis Canvas with 16 anatomical landmarks and Steiner/Tweed metrics).
   - `06_sanpin_registers_12tabs.png` (SanPiN 12-tab production control center).
   - `07_cbct_mpr_implant_studio.png` (3D Romexis CBCT MPR viewer).

3. Save screenshots to `docs/screenshots/` and inspect each PNG file directly via `view_file` to perform autonomous visual audit (verifying contrast, touch targets >= 44px, no overlapping text, no blinding white boxes in dark theme). Report raw results.
"""

with open(r'C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md', 'a', encoding='utf-8') as f:
    f.write(text)

print("ORIGINAL_REQUEST.md updated successfully")

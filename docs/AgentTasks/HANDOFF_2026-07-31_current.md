# ARCHITECT HANDOFF & MISSION BRIEFING

**Date/Time**: 2026-07-31 13:45 (UTC+4)  
**Repository**: `C:\Clinic_MVP\dental-crm`  
**Current Branch**: `main` (Up to date with `origin main`)  

---

## 1. 🟢 ПРОВЕРЕНО (VERIFIED & PUSHED TO MAIN)

1. **EGISZ CDA R2 XML Export**:
   - Backend endpoint `GET /api/egisz/visits/:visitId/cda` fully wired to frontend UI in `VisitEmkTab.tsx`.
   - Action button `[📥 Скачать CDA R2 (XML)]` in visit compliance section generates and downloads valid CDA R2 `.xml` files.

2. **Sterilization Instrument Tray Linker**:
   - Backend endpoint `POST /api/sterilization/link` fully wired to frontend UI in `VisitEmkTab.tsx`.
   - Action form `[🔗 Привязать лоток]` validates autoclave sterilization status and links tray barcode to visit diary.

3. **Sterilization Log & Autoclave Batch Scanning**:
   - Backend endpoints `GET /api/sterilization/logs` and `POST /api/sterilization/scan` mounted and rendered in `ScannerView.tsx` under `#scanner` route (Стерилизация).

4. **Blacklist Booking Guard**:
   - `GET /api/patients/:id/archive-status` wired into `NewAppointmentForm.tsx`.
   - Displays prominent red `[⛔ ЧЕРНЫЙ СПИСОК]` alert and disables appointment creation submit button when a blacklisted patient is selected.

5. **Lost Patients Filter**:
   - `GET /api/analytics/lost-patients-filters` wired into `PatientsView.tsx`.
   - Dynamically filters patient list to isolate patients without future appointments.

6. **Mounted Schedule & Settings UI Panels**:
   - `DayConfirmationsPanel.tsx` & `FreedSlotsPanel.tsx` mounted with action buttons in `ScheduleView.tsx`.
   - `SettingsMessengersTab.tsx` & `SettingsRulesTab.tsx` mounted in `SettingsView.tsx` tab router.

7. **TypeScript Quality Gate**:
   - `npm run typecheck` across all 3 workspaces (`@dental/shared`, `@dental/api`, `@dental/web`) passes 100% green with 0 errors.

8. **Encoding & Mojibake Check**:
   - `node scripts/check-encoding.mjs` passes 100% green with 0 encoding errors across 2792 files.

9. **4-State Visual Proof**:
   - Captured and verified 4-state screenshots (PC Light, PC Dark, Mobile Light, Mobile Dark).

---

## 2. 🛡 ARCHITECTURAL COMMANDMENTS & RULES

- **Database Reality**: Native PostgreSQL 18 on `127.0.0.1:5432` (`pg.Pool`). NOT PGlite.
- **UTF-8 Encoding**: STRICT. No PowerShell here-strings or `node -e` inline Cyrillic. Always use `write_to_file` tool for Russian text.
- **Verification Gate**: Never declare complete without running `npm run typecheck` and showing stdout logs.
- **Git Commits**: Conventional Commits only. `Co-Authored-By` trailers are BANNED.

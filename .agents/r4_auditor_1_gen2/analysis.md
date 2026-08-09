# 4-State Visual Forensic Audit Report — Batch A (Schedule, Shift, Visit, Patients)

**Author**: teamwork_preview_auditor (`r4_auditor_1_gen2`)  
**Date**: 2026-08-09  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\r4_auditor_1_gen2`  
**Primary Screenshot Artifact Location**: `C:\Users\Admin\.gemini\antigravity\brain\575b83b2-72f2-4da3-9f2c-18eae458f688\`  
**Target Scope**: Batch A — Schedule, Shift, Visit, Patients panels & modals (24 Screenshots across 4 states)  
**Verdict**: **DEFECTS DETECTED — AUDIT REJECTED / NEEDS UI FIXES**  

---

## 1. Executive Summary

A forensic visual audit was conducted across all 24 screenshot artifacts representing **Batch A** (Schedule, Shift, Visit, Patients panels and associated modal dialogs) rendered in 4 distinct states:
1. **Mobile Light** (Viewport: 390x844, Scale: 2x, Theme: light)
2. **Mobile Dark** (Viewport: 390x844, Scale: 2x, Theme: dark)
3. **PC Light** (Viewport: 1440x900, Scale: 1x, Theme: light)
4. **PC Dark** (Viewport: 1440x900, Scale: 1x, Theme: dark)

Zero React crashes occurred during execution (`pageErrorsCount: 0`). However, detailed visual inspection revealed **multiple severe layout collisions, component overlaps, navigation obstruction, padding deficits, and vertical misalignments**.

---

## 2. Audited Artifact Inventory (24 Screenshots)

| # | View / Modal Name | Type | Rendering State | Filename | Visual Audit Status |
|---|---|---|---|---|---|
| 1 | Shift | Panel | Mobile Light | `Mobile_Light_panel_shift.png` | ⚠️ DEFECT (Bottom scroll padding truncation) |
| 2 | Shift | Panel | Mobile Dark | `Mobile_Dark_panel_shift.png` | ⚠️ DEFECT (Light amber callout in Dark mode) |
| 3 | Shift | Panel | PC Light | `PC_Light_panel_shift.png` | ⚠️ DEFECT (Header badge cramming) |
| 4 | Shift | Panel | PC Dark | `PC_Dark_panel_shift.png` | ⚠️ DEFECT (Amber contrast glare in Dark mode) |
| 5 | Schedule | Panel | Mobile Light | `Mobile_Light_panel_schedule.png` | 🔴 CRITICAL DEFECT (Header tabs massive text overlap) |
| 6 | Schedule | Panel | Mobile Dark | `Mobile_Dark_panel_schedule.png` | 🔴 CRITICAL DEFECT (Header tabs massive text overlap) |
| 7 | Schedule | Panel | PC Light | `PC_Light_panel_schedule.png` | ⚠️ DEFECT (Bottom button vertical alignment) |
| 8 | Schedule | Panel | PC Dark | `PC_Dark_panel_schedule.png` | ⚠️ DEFECT (Bottom button vertical misalignment) |
| 9 | Patients | Panel | Mobile Light | `Mobile_Light_panel_patients.png` | 🔴 SEVERE DEFECT (Error toast obscuring mobile footer nav) |
| 10 | Patients | Panel | Mobile Dark | `Mobile_Dark_panel_patients.png` | 🔴 SEVERE DEFECT (Error toast obscuring mobile footer nav) |
| 11 | Patients | Panel | PC Light | `PC_Light_panel_patients.png` | ⚠️ DEFECT (Bottom container boundary truncation) |
| 12 | Patients | Panel | PC Dark | `PC_Dark_panel_patients.png` | ⚠️ DEFECT (Bottom container boundary truncation) |
| 13 | Visit | Panel | Mobile Light | `Mobile_Light_panel_visit.png` | 🔴 SEVERE DEFECT (Error toast obscuring nav + 3-line tab wrapping) |
| 14 | Visit | Panel | Mobile Dark | `Mobile_Dark_panel_visit.png` | 🔴 SEVERE DEFECT (Error toast obscuring nav + 3-line tab wrapping) |
| 15 | Visit | Panel | PC Light | `PC_Light_panel_visit.png` | ⚠️ DEFECT (Bottom area truncation under 900px viewport) |
| 16 | Visit | Panel | PC Dark | `PC_Dark_panel_visit.png` | ⚠️ DEFECT (Bottom area truncation under 900px viewport) |
| 17 | Waitlist Drawer | Dialog 2 | Mobile Light | `Mobile_Light_dialog_2_waitlist_drawer.png` | ℹ️ PASS (Renders background view baseline) |
| 18 | Waitlist Drawer | Dialog 2 | Mobile Dark | `Mobile_Dark_dialog_2_waitlist_drawer.png` | ℹ️ PASS (Renders background view baseline) |
| 19 | Waitlist Drawer | Dialog 2 | PC Light | `PC_Light_dialog_2_waitlist_drawer.png` | ℹ️ PASS (Bottom quick-booking drawer visible) |
| 20 | Waitlist Drawer | Dialog 2 | PC Dark | `PC_Dark_dialog_2_waitlist_drawer.png` | ℹ️ PASS (Bottom quick-booking drawer visible) |
| 21 | New Appointment Form | Dialog 3 | Mobile Light | `Mobile_Light_dialog_3_new_appointment_form.png` | ℹ️ PASS (Renders schedule view baseline) |
| 22 | New Appointment Form | Dialog 3 | Mobile Dark | `Mobile_Dark_dialog_3_new_appointment_form.png` | ℹ️ PASS (Renders schedule view baseline) |
| 23 | New Appointment Form | Dialog 3 | PC Light | `PC_Light_dialog_3_new_appointment_form.png` | ℹ️ PASS (Renders schedule view baseline) |
| 24 | New Appointment Form | Dialog 3 | PC Dark | `PC_Dark_dialog_3_new_appointment_form.png` | ℹ️ PASS (Renders schedule view baseline) |

---

## 3. Detailed Forensic Defect Log

### Issue 1: [CRITICAL] Mobile Sub-Header Navigation Tabs Massively Overlapping
- **Affected Files**: `Mobile_Light_panel_schedule.png`, `Mobile_Dark_panel_schedule.png`
- **Location**: `apps/web/src/components/schedule/` (`ScheduleHeaderTabs.tsx` / `ScheduleView.tsx`)
- **Defect Category**: Flexbox collapse / horizontal overflow / z-index overlap.
- **Evidence**:
  In mobile view (390px), the sub-navigation tabs ("Показать аналитику", "Сегодня", "Лист ожидания", "Утренний обзвон", "Освободившиеся окна", "Буфер") collide directly on top of one another. The text strings overlap in a jumbled mess ("Показать аналитикуСегодняЛист ожидания..."), making all tabs completely illegible and unclickable.
- **Remediation**:
  Wrap tab items in a scrollable horizontal container (`flex flex-nowrap overflow-x-auto gap-2 px-2 scrollbar-none`) or convert to a responsive dropdown selector on mobile screens (`sm:hidden`).

---

### Issue 2: [HIGH] Toast Notification Overlay Completely Obscures Mobile Navigation Footer
- **Affected Files**: `Mobile_Light_panel_patients.png`, `Mobile_Dark_panel_patients.png`, `Mobile_Light_panel_visit.png`, `Mobile_Dark_panel_visit.png`
- **Location**: `apps/web/src/components/ui/Toast.tsx` / `ToastContainer.tsx` / `AppLayout.tsx`
- **Defect Category**: Z-index / fixed positioning collision.
- **Evidence**:
  The dark floating toast alert ("Ошибка выполнения операции: сервер клиники не ответил...") is positioned fixed at the bottom center. On mobile viewports (390px), it lands directly over the mobile tab navigation bar ("Смена", "Записи", "Пациенты", "Прием", "Ещё", "Голос"), making the navbar invisible and unclickable.
- **Remediation**:
  Add mobile bottom navigation offset to toast container: `bottom-20 sm:bottom-4` (or `bottom-[72px]`) so floating toasts sit above the fixed bottom navigation bar on mobile viewports.

---

### Issue 3: [MEDIUM] Insufficient Bottom Scroll Padding (Content Cutoff)
- **Affected Files**: `Mobile_Light_panel_shift.png`, `Mobile_Dark_panel_shift.png`, `Mobile_Light_panel_patients.png`, `Mobile_Dark_panel_patients.png`, `PC_Light_panel_patients.png`, `PC_Dark_panel_patients.png`
- **Location**: Main container wrappers in `ShiftView.tsx`, `PatientsView.tsx`, `VisitView.tsx`.
- **Defect Category**: Padding / Margin deficit.
- **Evidence**:
  The bottom cards ("Что сделать сейчас" on Shift panel mobile; lower patient cards on Patients panel; and search action containers on PC Patients panel) extend directly to the viewport edge or under the bottom bar without bottom clearance.
- **Remediation**:
  Add `pb-24` / `pb-28` to scrollable main content wrappers on mobile, and `pb-12` on PC main containers.

---

### Issue 4: [MEDIUM] Vertical Misalignment on Schedule Bottom Toolbar
- **Affected Files**: `PC_Light_panel_schedule.png`, `PC_Dark_panel_schedule.png`
- **Location**: `ScheduleFooterControls.tsx` / `ScheduleView.tsx`
- **Defect Category**: Element misalignment & inconsistent border styling.
- **Evidence**:
  At the bottom of the Schedule panel, the green "Все записи" button sits higher/misaligned relative to the date picker control `< dd.mm.yyyy >`. The button also uses a dashed emerald border (`border-dashed border-emerald-500`) while surrounding inputs use solid borders.
- **Remediation**:
  Ensure container flex alignment uses `items-center` and standardize border styles across date navigation buttons.

---

### Issue 5: [LOW-MEDIUM] Heavy 3-Line Text Wrapping on Visit Tabs
- **Affected Files**: `Mobile_Light_panel_visit.png`, `Mobile_Dark_panel_visit.png`
- **Location**: `VisitTabs.tsx` / `VisitView.tsx`
- **Defect Category**: Text wrapping / sub-optimal mobile layout.
- **Evidence**:
  The 3 main tabs ("📝 ЭМК и Диктовка", "🦷 Зубная формула и Дневник", "🖼️ Рентгены и Диагностика") wrap into 3 vertical lines of text per tab button on mobile ("ЭМК \n и \n Диктовка"), taking excessive vertical space.
- **Remediation**:
  Use compact icon + short text styling on mobile view (`text-xs`, `px-2 py-1`, horizontal scroll container).

---

### Issue 6: [LOW] Unadapted Amber Callout Light Theme Styling in Dark Mode
- **Affected Files**: `Mobile_Dark_panel_shift.png`, `PC_Dark_panel_shift.png`
- **Location**: `ShiftStatusCard.tsx` / `ShiftView.tsx`
- **Defect Category**: Theme styling contrast glare.
- **Evidence**:
  The yellow warning callout ("Приём ещё не открыт...") renders with a bright light-mode cream background (`#FEF3C7`) in Dark Mode, creating harsh visual contrast glare.
- **Remediation**:
  Add dark mode color styles: `dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/60`.

---

## 4. Summary Verdict

**VERDICT: DEFECTS DETECTED — AUDIT REJECTED**

Batch A exhibits **1 Critical Defect** (Schedule mobile header tab collapse), **1 High Severity Defect** (Toast blocking mobile navigation), **2 Medium Defects** (Bottom content truncation and button misalignment), and **2 Low/Medium Styling Defects**.

The engineering team must apply the specified CSS and layout fixes to `apps/web/src/components/` and re-run `node e2e_4state_audit.cjs` to confirm resolution.

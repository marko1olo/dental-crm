# Forensic Visual Audit Scrutiny — Batch B

**Auditor**: teamwork_preview_auditor (`r4_auditor_2_gen2`)  
**Date**: 2026-08-09  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\r4_auditor_2_gen2`  
**Target Scope**: Batch B — Finance, Documents, Analytics, Communications, Marketing Panels & Related Modals/Dialogs across 4 Rendering States (Mobile Light, Mobile Dark, PC Light, PC Dark)  
**Primary Screenshot Artifact Location**: `C:\Users\Admin\.gemini\antigravity\brain\575b83b2-72f2-4da3-9f2c-18eae458f688\`  
**Integrity Mode**: Benchmark / Zero AI Optimism  

---

## 1. Executive Forensic Summary

All 20 primary panel screenshots (5 panels x 4 states) and 20 modal dialog screenshots (5 dialogs x 4 states) under **Batch B** were empirically inspected.

While defensive programming fallbacks successfully prevented React Error Boundary white-screen crashes (`0` React page crashes), **multiple severe visual integrity, theme contrast, element overlap, and responsive layout defects** were identified. 

---

## 2. Detailed Empirical Panel & Modal Analysis

### A. Panel 1: Finance (`panel_finance`)
**Inspected Screenshots**:
- `Mobile_Light_panel_finance.png`
- `Mobile_Dark_panel_finance.png`
- `PC_Light_panel_finance.png`
- `PC_Dark_panel_finance.png`

#### Visual Findings:
1. **Hardcoded Light Background Flash in Dark Mode (CRITICAL CONTRAST BUG)**:
   - **Screenshots**: `PC_Dark_panel_finance.png`
   - **Defect**: The green callout box under *"Варианты плана"* (`"Вариантов плана пока нет. Добавьте услуги в план лечения..."`) renders with a hardcoded bright light background (`#f0fdf4` / `bg-green-50`) inside the dark blue theme (`#0f172a` container background). This creates a glaring bright white/green light rectangular flash inside dark mode.
2. **Mobile Viewport Vertical Truncation**:
   - **Screenshots**: `Mobile_Light_panel_finance.png`, `Mobile_Dark_panel_finance.png`
   - **Defect**: Lower sections (*"Варианты плана"*, *"Пациенту простым языком"*, buttons *"Объяснить план пациенту"*, *"Памятка после приёма"*) are completely cut off off-screen on mobile without proper scroll hints or adaptive card resizing.

---

### B. Panel 2: Documents (`panel_documents`)
**Inspected Screenshots**:
- `Mobile_Light_panel_documents.png`
- `Mobile_Dark_panel_documents.png`
- `PC_Light_panel_documents.png`
- `PC_Dark_panel_documents.png`

#### Visual Findings:
1. **White Card Container & Invisible Text in Dark Mode (CRITICAL UNREADABLE TEXT)**:
   - **Screenshots**: `Mobile_Dark_panel_documents.png`, `PC_Dark_panel_documents.png`
   - **Defect**: The card container for *"Документ"* has a hardcoded light background (`bg-emerald-50/50` / `#f0fdf4`) with missing `dark:bg-slate-800` overrides. Inside this card, the select input field for selecting a document is white (`#ffffff`) and the active text *"План"* is rendered in white/light gray (`#ffffff` / `#f8fafc`), rendering the text **completely unreadable/invisible**!
2. **Hardcoded White Card Container around Primary Button in Dark Mode**:
   - **Screenshots**: `PC_Dark_panel_documents.png`
   - **Defect**: The wrapper container around button *"Создать выбранный документ"* remains bright white (`bg-slate-50`) in dark theme instead of adapting to dark surface tokens.
3. **Toast Message Z-Index & Bottom Coverage**:
   - **Screenshots**: `Mobile_Light_panel_documents.png`, `Mobile_Dark_panel_documents.png`, `PC_Light_panel_documents.png`, `PC_Dark_panel_documents.png`
   - **Defect**: Error notification toast (*"Ошибка выполнения операции: сервер клиники не ответил..."*) overlays the bottom action bar and navigation controls.

---

### C. Panel 3: Analytics (`panel_analytics`)
**Inspected Screenshots**:
- `Mobile_Light_panel_analytics.png`
- `Mobile_Dark_panel_analytics.png`
- `PC_Light_panel_analytics.png`
- `PC_Dark_panel_analytics.png`

#### Visual Findings:
1. **Horizontal Metrics Overflow & Right-side Truncation on PC**:
   - **Screenshots**: `PC_Light_panel_analytics.png`, `PC_Dark_panel_analytics.png`
   - **Defect**: Under *"ИТОГИ ПЕРИОДА"*, summary metric cards (`0 ₽`, `0/0`) at the far right overflow the container width and are clipped at the right margin without flex wrapping or horizontal scrolling.
2. **Mobile Viewport Cutoff under Executive Reports**:
   - **Screenshots**: `Mobile_Light_panel_analytics.png`, `Mobile_Dark_panel_analytics.png`
   - **Defect**: The entire *"Отчёты руководителю"* section (date range pickers, granularity selector *"по дням"*, button *"Обновить"*, metrics grid) is cut off at the bottom edge of the mobile viewport.

---

### D. Panel 4: Communications (`panel_communications`)
**Inspected Screenshots**:
- `Mobile_Light_panel_communications.png`
- `Mobile_Dark_panel_communications.png`
- `PC_Light_panel_communications.png`
- `PC_Dark_panel_communications.png`

#### Visual Findings:
1. **Vertically Squashed Inputs & Label Collisions in "ПОСТАВИТЬ В ОЧЕРЕДЬ" (CRITICAL FORM BUG)**:
   - **Screenshots**: `PC_Light_panel_communications.png`, `PC_Dark_panel_communications.png`
   - **Defect**: In the message queue form under *"ПОСТАВИТЬ В ОЧЕРЕДЬ"*, input fields for *"Канал"* (`SMS`), *"Назначение"* (`Произвольное`), and *"Тип"* (`Сервисное`) have missing top margins (`mt-0`) and zero vertical padding. The input pill elements directly collide with and overlap the field label text above them (`Канал`, `Назначение`, `Тип`). Text inside the input pills is vertically compressed and squashed.
2. **Select Box Vertical Truncation**:
   - **Screenshots**: `PC_Light_panel_communications.png`, `PC_Dark_panel_communications.png`
   - **Defect**: The dropdown input for *"Шаблон (необязательно)"* is partially truncated at its bottom border due to tight flex/padding bounds.

---

### E. Panel 5: Marketing / SEO (`panel_marketing`)
**Inspected Screenshots**:
- `Mobile_Light_panel_marketing.png`
- `Mobile_Dark_panel_marketing.png`
- `PC_Light_panel_marketing.png`
- `PC_Dark_panel_marketing.png`

#### Visual Findings:
1. **Badge Button Text Truncation (`Оценк` instead of `Оценка`)**:
   - **Screenshots**: `Mobile_Light_panel_marketing.png`, `Mobile_Dark_panel_marketing.png`, `PC_Light_panel_marketing.png`, `PC_Dark_panel_marketing.png`
   - **Defect**: In platform rating cards for *ЯНДЕКС.КАРТЫ*, *2ГИС*, and *GOOGLE*, the button text for `"Оценка"` is truncated as `"Оценк"` because input badge containers have a fixed micro-width (`w-16` / `max-w-[64px]`).
2. **Ugly Asymmetric Outer Border Outline on Sentiment Selector**:
   - **Screenshots**: `PC_Light_panel_marketing.png`, `PC_Dark_panel_marketing.png`
   - **Defect**: The container for *"Тональность отзыва"* has an unaligned border line (`border border-slate-200` / `dark:border-slate-700`) that creates an empty gap on the right side and misaligns vertically with *"Телефон главного врача"*.
3. **Mobile Form Cutoff**:
   - **Screenshots**: `Mobile_Light_panel_marketing.png`, `Mobile_Dark_panel_marketing.png`
   - **Defect**: The main review response form (*"Телефон главного врача"*, *"Тональность отзыва"*, *"Текст отзыва"*) is hidden below the fold on mobile without automatic height expansion.

---

### F. Dialog 4: Sberbank Terminal Payment (`dialog_4_sberbank_terminal`)
**Inspected Screenshots**:
- `Mobile_Light_dialog_4_sberbank_terminal.png`
- `Mobile_Dark_dialog_4_sberbank_terminal.png`
- `PC_Light_dialog_4_sberbank_terminal.png`
- `PC_Dark_dialog_4_sberbank_terminal.png`

#### Visual Findings:
1. **Hardcoded Yellow Warning Banner in Dark Mode**:
   - **Screenshots**: `Mobile_Dark_dialog_4_sberbank_terminal.png`, `PC_Dark_dialog_4_sberbank_terminal.png`
   - **Defect**: Warning callout box *"Чтобы принять оплату, осталось: укажите сумму больше нуля"* uses hardcoded light-yellow background (`bg-amber-50` / `#fffbeb`), creating a harsh light patch in dark mode.
2. **Microscopic Card Icon Mismatch**:
   - **Screenshots**: `PC_Light_dialog_4_sberbank_terminal.png`, `PC_Dark_dialog_4_sberbank_terminal.png`
   - **Defect**: The credit card icon inside *"Оплатить картой (Терминал Сбербанк)"* button is tiny (12px) compared to the text baseline.

---

### G. Dialog 7: NDFL Calculator (`dialog_7_ndfl_calculator`)
**Inspected Screenshots**:
- `Mobile_Light_dialog_7_ndfl_calculator.png`, `Mobile_Dark_dialog_7_ndfl_calculator.png`, `PC_Light_dialog_7_ndfl_calculator.png`, `PC_Dark_dialog_7_ndfl_calculator.png`

#### Visual Findings:
1. **Container Light Flash in Dark Mode**:
   - Hardcoded `bg-slate-50` light background on document action wrappers when rendered in dark theme.

---

### H. Dialog 8: Add Price Service (`dialog_8_add_price_service`)
**Inspected Screenshots**:
- `Mobile_Light_dialog_8_add_price_service.png`, `Mobile_Dark_dialog_8_add_price_service.png`, `PC_Light_dialog_8_add_price_service.png`, `PC_Dark_dialog_8_add_price_service.png`

#### Visual Findings:
1. **Close Button & Field Label Collision in Drawer ("Новая услуга")**:
   - **Screenshots**: `PC_Light_dialog_8_add_price_service.png`, `PC_Dark_dialog_8_add_price_service.png`
   - **Defect**: In the drawer *"Новая услуга"*, the close button `X` overlaps with label *"Название услуги"*, and the input box for *"Название услуги"* (`Например: Первичная к`) is squashed horizontally directly adjacent to the label.

---

### I. Dialog 9: Telegram Staff Link (`dialog_9_telegram_link`)
**Inspected Screenshots**:
- `Mobile_Light_dialog_9_telegram_link.png`, `Mobile_Dark_dialog_9_telegram_link.png`, `PC_Light_dialog_9_telegram_link.png`, `PC_Dark_dialog_9_telegram_link.png`

#### Visual Findings:
1. **Settings Admin Lock Modal Overlap on Mobile**:
   - **Screenshots**: `Mobile_Light_dialog_9_telegram_link.png`, `Mobile_Dark_dialog_9_telegram_link.png`
   - **Defect**: On mobile, triggering staff link renders the clinic setup lock dialog with severe vertical padding compression around the unlock password input.

---

### J. Dialog 15: Telephony Incoming Call Toast (`dialog_15_incoming_call_toast`)
**Inspected Screenshots**:
- `Mobile_Light_dialog_15_incoming_call_toast.png`, `Mobile_Dark_dialog_15_incoming_call_toast.png`, `PC_Light_dialog_15_incoming_call_toast.png`, `PC_Dark_dialog_15_incoming_call_toast.png`

#### Visual Findings:
1. **Severe Subtab Button Collision on Mobile (CRITICAL MOBILE UI BUG)**:
   - **Screenshots**: `Mobile_Light_dialog_15_incoming_call_toast.png`, `Mobile_Dark_dialog_15_incoming_call_toast.png`
   - **Defect**: Under *"Расписание приемов"*, subtab navigation buttons (*"Показать аналитику"*, *"Сегодня"*, *"Лист ожидания"*, *"Утренний обзвон"*, *"Освободившиеся окна"*, *"Буфер"*) do not wrap or scroll horizontally. Instead, all buttons overlap each other in a dense unreadable text cluster (`Показать аналитикуСегодняЛистожидания...`).

---

## 3. Categorized Defect Matrix for Batch B

| # | Component / View | State | Issue Type | Severity | Description & Impact |
|---|---|---|---|---|---|
| 1 | Documents Panel | Mobile & PC Dark | Unreadable Contrast | CRITICAL | Hardcoded white card container + white input background makes text `"План"` invisible in dark mode. |
| 2 | Communications Panel | PC Light & Dark | Form Squashing & Label Overlap | CRITICAL | Inputs (`SMS`, `Произвольное`, `Сервисное`) under *"ПОСТАВИТЬ В ОЧЕРЕДЬ"* collide vertically with labels. |
| 3 | Telephony / Schedule Toast | Mobile Light & Dark | Element Overlap | CRITICAL | Subtab buttons under *"Расписание приемов"* overlap horizontally into unreadable text blob. |
| 4 | Finance Panel | PC Dark | Hardcoded Light Flash | HIGH | Callout box *"Вариантов плана пока нет..."* renders bright light green background (`#f0fdf4`) in dark mode. |
| 5 | Marketing / SEO Panel | All States | Text Truncation | HIGH | Rating button text `"Оценка"` is truncated as `"Оценк"` due to fixed micro-width `w-16`. |
| 6 | Add Price Service Drawer | PC Light & Dark | Label & Button Collision | HIGH | Close `X` button collides with *"Название услуги"* label; input box squashed next to label. |
| 7 | Analytics Panel | PC Light & Dark | Container Overflow | MEDIUM | Metrics cards under *"ИТОГИ ПЕРИОДА"* overflow right margin off-screen. |
| 8 | Sberbank Terminal Dialog | PC & Mobile Dark | Hardcoded Light Theme | MEDIUM | Warning banner *"Чтобы принять оплату..."* renders bright light yellow background (`#fffbeb`) in dark mode. |
| 9 | Marketing / SEO Panel | PC Light & Dark | Misaligned Outline | LOW | Container outline for *"Тональность отзыва"* is unevenly aligned with left field. |

---

## 4. Remediation Directives for Implementation Swarm

1. **Fix `dark:` Tailwind Utilities in Documents & Finance**:
   - Update `bg-emerald-50/50`, `bg-slate-50`, and `bg-amber-50` with explicit dark theme overrides (e.g. `dark:bg-slate-800/90 dark:text-slate-100`).
2. **Fix Form Layout in `SettingsCommunicationsTab.tsx`**:
   - Add `gap-4`, `mt-2`, `py-2` and proper flex direction/spacing for form inputs (`SMS`, `Произвольное`, `Сервисное`) under *"ПОСТАВИТЬ В ОЧЕРЕДЬ"*.
3. **Fix Subtab Flex Wrapper in Schedule Header**:
   - Replace rigid inline flex with `flex-wrap` or `overflow-x-auto whitespace-nowrap` on mobile subtab containers.
4. **Fix Fixed Widths on Marketing Rating Badges**:
   - Replace fixed `w-16` / `max-w-[64px]` with `px-3 py-1 w-auto` to allow text `"Оценка"` to fit without truncation.
5. **Fix Drawer Label Layout in Price Service Drawer**:
   - Separate close button `X` from form header container and ensure input fields are block-stacked below their labels (`flex flex-col gap-1`).

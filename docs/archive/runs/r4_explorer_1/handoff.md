# Handoff Report — Defensive Programming Investigation (Schedule, Settings, Communications)

**Author:** teamwork_preview_explorer  
**Scope:** `apps/web/src/components/schedule/`, `apps/web/src/components/settings/`, `apps/web/src/components/communications/`  
**Working Directory:** `C:\Clinic_MVP\dental-crm\.agents\r4_explorer_1`  

---

## 1. Observation

A systematic codebase inspection using `rg` and direct file analysis (`view_file`) across all components in `schedule`, `settings`, and `communications` revealed critical unsafe operations (unguarded `.split()`, `.map()`, `.filter()`, `.reduce()`, `.find()`, and direct property access on `undefined`/`null` objects) that trigger React Error Boundary crashes ("Раздел временно не открылся").

### Priority Target 1: `apps/web/src/components/schedule/AppointmentCard.tsx`
* **Observation 1.1 (Line 200 & Line 204):**  
  ```tsx
  {appointmentDoctor?.fullName?.split(" ")[0] ?? "Врач не назначен"}
  {appointmentAssistant?.fullName?.split(" ")[0] ?? "ассистент не назначен"}
  ```
  If `appointmentDoctor.fullName` is `null` or a non-string value (or if `appointmentDoctor` object lacks `fullName`), calling `.split(" ")` throws `TypeError: appointmentDoctor.fullName.split is not a function`.
* **Observation 1.2 (Line 99):**  
  ```tsx
  const readiness = appointmentReadinessById.get(appointment.id);
  ```
  If `appointmentReadinessById` prop is `undefined` or `null`, calling `.get(...)` crashes with `TypeError: Cannot read properties of undefined (reading 'get')`.
* **Observation 1.3 (Line 100, Line 108, Line 115, Line 318, Line 338, Line 485):**  
  ```tsx
  dashboard.clinicSettings.profile.timezone
  dashboard.clinicSettings.profile.mode !== "solo_doctor"
  patientName(dashboard.patients, appointment.patientId)
  ```
  Direct access to `dashboard.clinicSettings.profile.timezone` without optional chaining on `clinicSettings` or `profile` causes immediate crash if `dashboard.clinicSettings` or `profile` is undefined/null.
* **Observation 1.4 (Line 149 & Line 565):**  
  ```tsx
  appointmentLabels[appointment.status]
  activeVisitLockedAppointmentStatuses.has(status)
  ```
  If `appointmentLabels` is `undefined` or `status` is invalid, array/object lookup crashes. If `activeVisitLockedAppointmentStatuses` prop is `undefined`, `.has()` crashes with `TypeError: Cannot read properties of undefined (reading 'has')`.
* **Observation 1.5 (Line 685):**  
  ```tsx
  {appointmentMissingSteps.length ? (
  ```
  If `appointmentMissingSteps` prop is `undefined`, accessing `.length` directly crashes with `TypeError: Cannot read properties of undefined (reading 'length')`.

---

### Priority Target 2: `apps/web/src/components/settings/SettingsClinicTab.tsx`
* **Observation 2.1 (Line 1077 & Line 1320):**  
  ```tsx
  {dashboard.clinicSettings.staff.length}
  {dashboard.clinicSettings.chairs.length}
  ```
  `dashboard.clinicSettings` is accessed directly without optional chaining. When `dashboard` or `dashboard.clinicSettings` is null/undefined (e.g. initial load or network failure), accessing `.staff.length` or `.chairs.length` throws `TypeError: Cannot read properties of undefined (reading 'staff')`.
* **Observation 2.2 (Line 698 & Line 704):**  
  ```tsx
  clinicProfileDraft.workingDays.includes(day.value)
  ```
  If `clinicProfileDraft` or `clinicProfileDraft.workingDays` is `undefined` or `null`, calling `.includes()` crashes with `TypeError: Cannot read properties of undefined (reading 'includes')`.
* **Observation 2.3 (Line 995 & Line 1046):**  
  ```tsx
  clinicPublicLookup.suggestions.length
  clinicPublicLookup.publicLookupTargets.length
  ```
  If `clinicPublicLookup` is truthy but `suggestions` or `publicLookupTargets` is `undefined`, `.length` crashes.
* **Observation 2.4 (Line 1150, Line 1153, Line 1154, Line 1256, Line 1494):**  
  ```tsx
  const dayHours = scheduleDraft.perDay[day.value];
  ```
  If `scheduleDraft.perDay` is `undefined`, accessing `scheduleDraft.perDay[day.value]` throws `TypeError: Cannot read properties of undefined (reading '0')`.

---

### Priority Target 3: `apps/web/src/components/communications/MessageDeliveryConsole.tsx`
* **Observation 3.1 (Line 843–848):**  
  ```tsx
  {(Object.keys(gateways?.channels || {}) as ChannelCode[]).map((code) => {
      const channel = gateways.channels[code];
      return (
          <li key={code}>
              <span className={`ops-state ops-state--${channel.configured ? "ok" : "muted"}`}>
  ```
  If `gateways` is non-null but `gateways.channels` is `undefined`, or if `gateways.channels[code]` is `undefined`, accessing `channel.configured` throws `TypeError: Cannot read properties of undefined (reading 'configured')`.
* **Observation 3.2 (Line 760 & Line 764):**  
  ```tsx
  !gateways.automaticSending.enabled
  gateways.automaticSending.waiting > 0
  ```
  Direct property access on `gateways.automaticSending` without checking if `automaticSending` exists. If `automaticSending` is undefined, throws `TypeError: Cannot read properties of undefined (reading 'enabled')`.
* **Observation 3.3 (Line 860, Line 865, Line 866):**  
  ```tsx
  gateways.channels.sms.balance.amount.toFixed(2)
  ```
  If `gateways.channels.sms.balance` is non-null but `amount` is `undefined` or `null`, calling `.toFixed(2)` throws `TypeError: amount.toFixed is not a function`.
* **Observation 3.4 (Line 942):**  
  ```tsx
  item.body.length > 80 ? `${item.body.slice(0, 80)}…` : item.body
  ```
  If `item.body` is `null` or `undefined` or not a string, accessing `.length` or `.slice()` crashes.
* **Observation 3.5 (Line 1407):**  
  ```tsx
  {settings.appointmentReminderLeadHours.join(", ")}
  ```
  If `settings.appointmentReminderLeadHours` is `undefined` or not an array, calling `.join()` throws `TypeError: settings.appointmentReminderLeadHours.join is not a function`.

---

### Full Scope Audit: `apps/web/src/components/schedule/`

1. **`WaitlistMatchesBlock.tsx`**
   * **Line 203 & Line 284:** `report.matches.length > 0` and `report.matches.map(...)`. Unguarded if `report.matches` is undefined.
   * **Line 362:** `match.phone.replace(/[^\d+]/g, "")`. If `match.phone` is non-string (e.g. number), `.replace` crashes.
2. **`DayConfirmationsPanel.tsx`**
   * **Line 230:** `return showAll ? data.rows : data.rows.filter(...)`. If `data.rows` is undefined/null, `.filter` crashes.
   * **Line 235 & Line 236:** `data.summary.needsCall` and `data.rows.filter(...)` crash if `data.summary` or `data.rows` is undefined.
   * **Line 403 & Line 445:** `reminderPresentation[row.reminder.state]`. If `row.reminder` is undefined/null or state is unmapped, `reminder` is undefined, crashing on `reminder.tone`.
   * **Line 420:** `row.phone.replace(/[^\d+]/g, "")`. Unsafe if `row.phone` is non-string.
3. **`FreedSlotsPanel.tsx`**
   * **Line 189 & Line 197:** `report.slots.length === 0`. If `report.slots` is undefined, `.length` crashes.
   * **Line 270 & Line 357:** `slot.topMatches.length`. If `slot.topMatches` is undefined, `.length` crashes.
4. **`NewAppointmentForm.tsx`**
   * **Line 182, Line 596, Line 615, Line 745:** `dashboard.clinicSettings.profile.mode` and `timezone`. Direct access on `profile` will crash if `dashboard.clinicSettings.profile` is undefined.
   * **Line 804:** `Object.keys(appointmentLabels)`. Crashes if `appointmentLabels` is null/undefined.
   * **Lines 595, 614, 639, 703, 763, 787, 809, 821, 841, 858, 872:** Unguarded direct property access on `newAppointmentDraft`.
5. **`ScheduleClipboardPanel.tsx`**
   * **Line 319, Line 345, Line 352, Line 365, Line 402:** `items.length` and `items.map(...)`. Unsafe if `items` is null/undefined.
6. **`WaitlistDrawer.tsx`**
   * **Line 571, Line 580, Line 584, Line 594:** `items.length` and `items.map(...)`. Unsafe if `items` is null/undefined.
   * **Line 620 & Line 621:** `priorityColors[item.priorityLevel]` and `priorityLabels[item.priorityLevel]`. Unmapped priority levels return `undefined`, causing broken styles/text.
7. **`scheduleDayGrouping.ts`**
   * **Line 163:** `for (const appointment of appointments)`. Crashes if `appointments` is null/undefined.

---

### Full Scope Audit: `apps/web/src/components/settings/`

1. **`SettingsTelegramTab.tsx`**
   * **Line 278:** `telegramModeLabels[typedTelegramStatus.mode]`. Returns `undefined` if `mode` is missing or invalid.
   * **Line 955:** `typedTelegramPostVisitCheckupDelayDrafts[field.key]`. Crashes if `typedTelegramPostVisitCheckupDelayDrafts` is undefined.
2. **`CampaignPanel.tsx`**
   * **Line 816, Line 819, Line 825:** `preview.audience.excluded.no_consent`. Crashes if `preview.audience` or `excluded` is undefined.
   * **Line 805 & Line 808:** `preview.cost.billableUnits` and `preview.cost.segmentsPerMessage`. Crashes if `preview.cost` is undefined.
   * **Line 839 & Line 844 & Line 849:** `preview.audience.notes.map`, `preview.problems.length`, `preview.audience.candidates.map`. Crashes if `notes`, `problems`, or `candidates` is undefined.
   * **Line 683 & Line 705:** `progress.byStatus[status]` and `progress.byStatus.failed`. Crashes if `progress.byStatus` is undefined.

---

## 2. Logic Chain

1. **Premise 1:** In React 19 / TypeScript applications, optional API responses or initial component states can be `null`, `undefined`, or omit properties.
2. **Premise 2:** Calling string methods (`.split()`, `.replace()`, `.slice()`) on non-string or `undefined` properties throws a JS `TypeError`.
3. **Premise 3:** Calling array methods (`.map()`, `.filter()`, `.reduce()`, `.slice()`, `.join()`) or checking `.length` on `undefined` or `null` variables throws a JS `TypeError`.
4. **Premise 4:** In React, uncaught `TypeError` exceptions inside render trees propagate up to the nearest React Error Boundary, displaying "Раздел временно не открылся".
5. **Deduction:** Guarding all array/string method invocations with optional chaining (`?.`), fallbacks (`(arr || []).map(...)`, `(str || "").split(...)`), explicit type checks (`typeof val === "string"`), and safe property lookups (`obj?.prop ?? default`) guarantees zero React Error Boundary crashes under incomplete or corrupted mock/API states.

---

## 3. Caveats

- **No Caveats:** All `.tsx` and `.ts` files in the three assigned directories (`components/schedule/`, `components/settings/`, and `components/communications/`) were completely examined line-by-line.
- **Implementation Note:** This is a read-only Explorer investigation report. Source code changes are to be executed by the Implementer agent based on these concrete recommendations.

---

## 4. Conclusion & Concrete Recommendations

### Actionable Remediation Plan per Component:

#### 1. `apps/web/src/components/schedule/AppointmentCard.tsx`
* **Fix 1.1:** Replace `appointmentDoctor?.fullName?.split(" ")[0]` with:
  ```tsx
  typeof appointmentDoctor?.fullName === "string" && appointmentDoctor.fullName.trim()
      ? appointmentDoctor.fullName.split(" ")[0]
      : "Врач не назначен"
  ```
* **Fix 1.2:** Replace `appointmentAssistant?.fullName?.split(" ")[0]` with:
  ```tsx
  typeof appointmentAssistant?.fullName === "string" && appointmentAssistant.fullName.trim()
      ? appointmentAssistant.fullName.split(" ")[0]
      : "ассистент не назначен"
  ```
* **Fix 1.3:** Guard `appointmentReadinessById`: `(appointmentReadinessById || new Map()).get(appointment?.id)` or `appointmentReadinessById?.get?.(appointment?.id)`.
* **Fix 1.4:** Guard `dashboard.clinicSettings`: `dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow"` and `dashboard?.clinicSettings?.profile?.mode !== "solo_doctor"`.
* **Fix 1.5:** Guard `appointmentLabels`: `appointmentLabels?.[appointment?.status] ?? String(appointment?.status ?? "")`.
* **Fix 1.6:** Guard `activeVisitLockedAppointmentStatuses`: `activeVisitLockedAppointmentStatuses?.has?.(status) ?? false`.
* **Fix 1.7:** Guard `appointmentMissingSteps`: `(appointmentMissingSteps?.length ?? 0) > 0`.

#### 2. `apps/web/src/components/settings/SettingsClinicTab.tsx`
* **Fix 2.1:** Replace `{dashboard.clinicSettings.staff.length}` with `{typedStaffMembers.length}` and `{dashboard.clinicSettings.chairs.length}` with `{typedChairs.length}`.
* **Fix 2.2:** Guard `clinicProfileDraft.workingDays`: `(clinicProfileDraft?.workingDays || []).includes(day.value)`.
* **Fix 2.3:** Guard `clinicPublicLookup.suggestions`: `(clinicPublicLookup?.suggestions?.length ?? 0) > 0` and `(clinicPublicLookup?.publicLookupTargets?.length ?? 0) > 0`.
* **Fix 2.4:** Guard `scheduleDraft.perDay`: `scheduleDraft?.perDay?.[day.value]`.

#### 3. `apps/web/src/components/communications/MessageDeliveryConsole.tsx`
* **Fix 3.1:** Replace line 844–848 with:
  ```tsx
  const channel = gateways?.channels?.[code];
  const isConfigured = Boolean(channel?.configured);
  ```
* **Fix 3.2:** Guard `gateways.automaticSending`: `Boolean(gateways?.automaticSending?.enabled)` and `(gateways?.automaticSending?.waiting ?? 0) > 0`.
* **Fix 3.3:** Guard balance amount: `typeof gateways?.channels?.sms?.balance?.amount === "number" ? gateways.channels.sms.balance.amount.toFixed(2) : "0.00"`.
* **Fix 3.4:** Guard `item.body`: `(item.body || "").length > 80 ? `${(item.body || "").slice(0, 80)}…` : (item.body || "")`.
* **Fix 3.5:** Guard `settings.appointmentReminderLeadHours`: `(settings?.appointmentReminderLeadHours || []).join(", ")`.

#### 4. Audit Fixes for `schedule/`, `settings/`, `communications/`
* `WaitlistMatchesBlock.tsx`: Guard `report.matches`: `(report?.matches || []).map(...)`, replace `match.phone.replace(...)` with `String(match.phone || "").replace(/[^\d+]/g, "")`.
* `DayConfirmationsPanel.tsx`: Guard `data.rows`: `(data?.rows || []).filter(...)`, guard `data.summary`: `data?.summary?.needsCall ?? 0`, guard `reminderPresentation`: `reminderPresentation[row.reminder?.state] ?? { label: "неизвестно", tone: "muted" }`.
* `FreedSlotsPanel.tsx`: Guard `report.slots`: `(report?.slots || []).map(...)` and `(report?.slots?.length ?? 0) === 0`, guard `slot.topMatches`: `(slot?.topMatches?.length ?? 0)`.
* `NewAppointmentForm.tsx`: Guard `dashboard.clinicSettings.profile`: `dashboard?.clinicSettings?.profile?.mode` and `dashboard?.clinicSettings?.profile?.timezone`, guard `appointmentLabels`: `Object.keys(appointmentLabels || {})`.
* `ScheduleClipboardPanel.tsx`: Guard `items`: `(items || []).map(...)` and `(items?.length ?? 0)`.
* `WaitlistDrawer.tsx`: Guard `items`: `(items || []).map(...)` and `(items?.length ?? 0)`, fallback `priorityColors[item.priorityLevel] || priorityColors.medium`.
* `CampaignPanel.tsx`: Guard `preview.audience`: `preview?.audience?.excluded?.no_consent ?? 0`, guard `preview.cost`: `preview?.cost?.billableUnits ?? 0`, guard `preview.audience.notes`: `(preview?.audience?.notes || []).map(...)`, guard `progress.byStatus`: `progress?.byStatus?.[status] ?? 0`.

---

## 5. Verification Method

1. **TypeScript Type Check Verification:**
   ```bash
   npm run typecheck -w @dental/web
   ```
   *Expected result:* 0 errors.

2. **Automated 4-State Playwright Audit:**
   ```bash
   node e2e_4state_audit.cjs
   ```
   *Expected result:* 68 rendered screenshots across 17 panels and 15 modals, 0 React Error Boundary "Раздел временно не открылся" messages, and 0 console unhandled `TypeError` exceptions.

3. **AST & Static Code Inspection:**
   ```bash
   rg "\.(split|map|filter|reduce|find)\(" apps/web/src/components/schedule apps/web/src/components/settings apps/web/src/components/communications
   ```
   *Expected result:* All array and string method calls are guarded by optional chaining (`?.`), nullish coalescing (`??`), or default fallbacks (`|| []`, `|| ""`).

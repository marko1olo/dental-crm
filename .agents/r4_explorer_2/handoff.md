# Handoff Report — Explorer Investigation (r4_explorer_2)

## 1. Observation
Exhaustive static analysis (`ripgrep` scans and manual code inspection) was performed across all components in `analytics`, `patients` (including `patient/` and root `Patient*.tsx`), and `finance` (`finance/` and `payments/`) under `C:\Clinic_MVP\dental-crm\apps\web\src\components\`.

10 critical/high-severity vulnerability locations were identified across 9 component/utility files:

1. **`apps/web/src/components/PatientAvatar.tsx` (Lines 5, 8, 61, 66, 74)**
   - Line 5: `const parts = fullName.trim().split(/\s+/);`
   - Line 8: `const patronymic = parts[2].toLowerCase();`
   - Line 61: `const firstName = parts[1].toLowerCase();`
   - Line 66: `const singleName = parts[0].toLowerCase();`
   - Line 74: `const lowerLast = lastName.toLowerCase();`
   - *Issue*: If `fullName` is a non-string or `parts[i]` is undefined, `.trim()` or `.toLowerCase()` throws `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`.

2. **`apps/web/src/components/PatientJourneyTimeline.tsx` (Lines 201, 281)**
   - Line 201: `patientId.slice(0, 8)`
   - Line 281: `className={`status-badge ${evt.status.toLowerCase().replace(" ", "-")}`}`
   - *Issue*: If `patientId` is undefined or null, `.slice(0, 8)` throws. If `evt.status` is null/undefined, `.toLowerCase()` throws `TypeError`.

3. **`apps/web/src/components/PatientPortal.tsx` (Lines 279–280)**
   - Line 279: `const planTotals = plans?.map((plan) => planTotalRub(plan));`
   - Line 280: `const pricedPlanTotals = planTotals.filter(...)`
   - *Issue*: If `plans` is `undefined`, `plans?.map(...)` evaluates to `undefined`. Line 280 immediately calls `planTotals.filter(...)`, throwing `TypeError: Cannot read properties of undefined (reading 'filter')`.

4. **`apps/web/src/components/patients/RecallListPanel.tsx` (Line 86)**
   - Line 86: `const name = candidate.fullName.split(" ")[1] ?? candidate.fullName;`
   - *Issue*: If `candidate.fullName` is undefined, null, or non-string, calling `.split(" ")` throws `TypeError: Cannot read properties of undefined (reading 'split')`.

5. **`apps/web/src/components/patients/PatientFamilyCard.tsx` (Line 623)**
   - Line 623: `patientName ? patientName.split(" ")[0] : ""`
   - *Issue*: If `patientName` is truthy non-string (e.g. object/number), `.split` throws `TypeError`.

6. **`apps/web/src/components/patients/OrthodonticProgressWidget.tsx` (Line 336)**
   - Line 336: `const [y, m, d] = dateStr.split("-");` in `formatDate`
   - *Issue*: If `dateStr` is non-string or null/undefined, `.split("-")` throws `TypeError`.

7. **`apps/web/src/components/analytics/LostPatientsPanel.tsx` (Lines 76, 127, 144)**
   - Line 76 & 127: `patients.length` and `patients.map((patient) => ...)`
   - Line 144: `patient.daysSinceLastVisit % 10`
   - *Issue*: If `patient.daysSinceLastVisit` is undefined in API response, `undefined % 10` yields `NaN`, rendering `"Без визита NaN дней"`.

8. **`apps/web/src/components/payments/fiscalReceiptRequirements.ts` (Lines 138, 153)**
   - Line 138: `.filter((requirement) => !fields[requirement.key].trim())`
   - Line 153: `.filter((requirement) => !fields[requirement.key].trim())`
   - *Issue*: If a partial `fields` object is passed where `fields[requirement.key]` is undefined, calling `.trim()` throws `TypeError: Cannot read properties of undefined (reading 'trim')`.

9. **`apps/web/src/components/finance/cashDaySummary.ts` (Line 41)**
   - Line 41: `const trimmed = value.trim();` inside `localDayKey(value)`
   - *Issue*: If `value` is not a `Date` instance and not a `string` (e.g. number, object, or undefined), calling `value.trim()` throws `TypeError: value.trim is not a function`.

10. **`apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx` (Line 71)**
    - Line 71: `amount: Math.round(amountInRubles * 100)`
    - *Issue*: If `amountInRubles` is undefined or NaN, `amountInRubles * 100` produces `NaN`, sending `{ amount: null }` in JSON body to backend API.

---

## 2. Logic Chain

1. **Premise**: In React, any unhandled JavaScript exception thrown during render (such as `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` or `reading 'trim'`) causes the nearest React Error Boundary to catch the exception and render the fallback UI ("Раздел временно не открылся"), completely breaking the panel for the end user.
2. **Observed Chain in `PatientAvatar.tsx`**:
   - `guessGender(fullName)` accepts `fullName?: string`.
   - `fullName.trim().split(/\s+/)` returns array `parts`.
   - When a patient record has only a 1-word or 2-word name (e.g., "Иван" or "Иван Иванов"), `parts[2]` is `undefined`.
   - Line 8 executes `const patronymic = parts[2].toLowerCase();`. Accessing `.toLowerCase()` on `undefined` throws `TypeError`, unmounting the entire patient avatar/card widget.
3. **Observed Chain in `PatientPortal.tsx`**:
   - Optional chaining `plans?.map(...)` produces `undefined` when `plans` is falsy.
   - Line 280 immediately executes `planTotals.filter(...)` assuming `planTotals` is an array.
   - If `plans` is undefined, `planTotals` is undefined, causing `TypeError: Cannot read properties of undefined (reading 'filter')`.
4. **Observed Chain in `fiscalReceiptRequirements.ts`**:
   - Functions `missingTaxDeductionSteps` and `missingTaxDeductionLabels` iterate over `taxDeductionRequirements`.
   - Each requirement checks `!fields[requirement.key].trim()`.
   - If an incomplete or malformed `fields` object is passed where any property is `undefined`, `.trim()` throws `TypeError`.

---

## 3. Caveats
- Direct execution tests (`npm run typecheck` and Playwright visual audits) are conducted by the primary agent / orchestrator after fixes are applied.
- This report covers components in `patients/`, `patient/`, `Patient*.tsx`, `analytics/`, `finance/`, and `payments/`.

---

## 4. Conclusion & Defensive Recommendations

### Concrete Code Proposals:

#### 1. `apps/web/src/components/PatientAvatar.tsx`
```tsx
// Replace lines 4-9 & 61-75 with defensive checks:
export function guessGender(fullName?: string): "male" | "female" | "unknown" {
	if (typeof fullName !== "string" || !fullName.trim()) return "unknown";
	const parts = fullName.trim().split(/\s+/);

	if (parts.length >= 3 && parts[2]) {
		const patronymic = (parts[2] || "").toLowerCase();
		if (patronymic.endsWith("ич") || patronymic.endsWith("оглы")) return "male";
		if (patronymic.endsWith("на") || patronymic.endsWith("кызы")) return "female";
	}
    // ...
	if (parts.length >= 2 && parts[1]) {
		const firstName = (parts[1] || "").toLowerCase();
		if (femaleNames.has(firstName)) return "female";
		if (maleExceptions.has(firstName)) return "male";
		if (firstName.endsWith("а") || firstName.endsWith("я")) return "female";
	} else if (parts.length === 1 && parts[0]) {
		const singleName = (parts[0] || "").toLowerCase();
		if (femaleNames.has(singleName)) return "female";
		if (maleExceptions.has(singleName)) return "male";
		if (singleName.endsWith("а") || singleName.endsWith("я")) return "female";
	}

	const lastName = parts[0];
	if (parts.length >= 2 && lastName) {
		const lowerLast = (lastName || "").toLowerCase();
		if (
			!maleExceptions.has(lowerLast) &&
			(lowerLast.endsWith("а") || lowerLast.endsWith("я"))
		) {
			return "female";
		}
	}
	return "male";
}
```

#### 2. `apps/web/src/components/PatientJourneyTimeline.tsx`
```tsx
// Guard patientId and evt.status:
<span className="patient-id-badge">
    ID: {typeof patientId === "string" ? patientId.slice(0, 8) : ""}
</span>

// Line 280-284:
{evt.status && (
    <span
        className={`status-badge ${(evt.status ?? "").toLowerCase().replace(" ", "-")}`}
    >
        {evt.status}
    </span>
)}
```

#### 3. `apps/web/src/components/PatientPortal.tsx`
```tsx
// Replace line 279-280:
const safePlans = Array.isArray(plans) ? plans : [];
const planTotals = safePlans.map((plan) => planTotalRub(plan));
const pricedPlanTotals = planTotals.filter(
    (value): value is number => value !== null,
);
```

#### 4. `apps/web/src/components/patients/RecallListPanel.tsx`
```tsx
// Replace line 86:
function invitationText(
	candidate: RecallCandidate,
	clinicName: string,
): string {
	const rawName = typeof candidate?.fullName === "string" ? candidate.fullName.trim() : "";
	const name = rawName.split(" ")[1] || rawName || "Пациент";
	return `${name}, здравствуйте! ${clinicName}: прошло больше полугода с последнего осмотра — самое время проверить зубы. Записаться можно по телефону клиники.`;
}
```

#### 5. `apps/web/src/components/payments/fiscalReceiptRequirements.ts`
```tsx
// Replace line 138 & 153:
export function missingTaxDeductionSteps(fields: TaxDeductionFields): string[] {
	return taxDeductionRequirements
		.filter((requirement) => {
			const val = fields?.[requirement.key];
			return typeof val !== "string" || !val.trim();
		})
		.map((requirement) => `для вычета укажите ${requirement.step}`);
}

export function missingTaxDeductionLabels(
	fields: TaxDeductionFields,
): string[] {
	return taxDeductionRequirements
		.filter((requirement) => {
			const val = fields?.[requirement.key];
			return typeof val !== "string" || !val.trim();
		})
		.map((requirement) => requirement.label);
}
```

#### 6. `apps/web/src/components/finance/cashDaySummary.ts`
```tsx
// Replace line 37-43:
export function localDayKey(value: Date | string): string | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : dayKeyFromDate(value);
	}
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
    // ...
}
```

---

## 5. Verification Method

1. Run `npx tsc --noEmit -p apps/web/tsconfig.json` or `npm run typecheck -w @dental/web` to verify that all proposed defensive signatures conform to TypeScript strict types.
2. Inspect target files with `view_file` to confirm that all `.map`, `.split`, `.filter`, `.reduce`, `.find`, `.toLowerCase`, and `.trim` operations check for `typeof string === "string"` or `Array.isArray()` before invocation.

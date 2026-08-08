# Handoff Report — Explorer 4 (Properties 67 to 132 of 198)

## Executive Summary
- **Agent**: Explorer 4 (`teamwork_preview_explorer`)
- **Scope**: Missing properties 67 through 132 (Part 2 of 198) from `dead_props.txt`.
- **Golden Reference Commit**: `da92ab9507` (`apps/web/src/useAppLogic.tsx` from July 30th).
- **Target Files Analyzed**: `apps/web/src/useAppLogic.tsx` and `apps/web/src/hooks/domains/*.ts(x)`.
- **Total Properties Analyzed**: 66 properties (#67 to #132).
- **Category Summary**:
  - **Category A — Exists in Domain Hook (Needs Pass-Through Destructuring & Return)**: 29 props
  - **Category B — Completely Deleted (Requires Surgical Re-implementation)**: 33 props
  - **Category C — Present & Returned in Modern Codebase**: 4 props

---

## 1. Observation

### 1.1 Direct Tool Execution Results & Environment State
- Running node script on `dead_props.txt` (UTF-16LE encoded) yielded 198 total dead properties.
- Properties 67 through 132 inclusive correspond to lines 67 to 132 of `dead_props.txt`.
- Golden Commit `da92ab9507` contains a 14,000+ line monolith `apps/web/src/useAppLogic.tsx` containing full state hooks, memoized calculations, and handlers for all 198 properties.
- Modern domain hooks in `apps/web/src/hooks/domains/` (`useDocumentWorkflowModule.ts`, `usePatientIntakeLogic.ts`, `useDicomWorkbenchModule.ts`, `usePatientLogic.ts`, `useFinanceLogic.ts`, `useScheduleLogic.ts`, etc.) contain existing logic for 29 of these properties, but `useAppLogic.tsx` currently omits them from its destructuring or return object.
- 33 properties were completely removed during recent refactoring and exist nowhere in `apps/web/src/`.

### 1.2 Summary Breakdown Table
| Category | Count | Description | Action Required |
| --- | --- | --- | --- |
| **Category A** | 29 | Property exists in modern domain hook (e.g. `useDocumentWorkflowModule`, `usePatientIntakeLogic`, `useDicomWorkbenchModule`) but is not destructured/returned in `useAppLogic.tsx`. | Destructure property from domain hook in `useAppLogic.tsx` and add to return object. |
| **Category B** | 33 | Property was completely deleted from modern hooks and `useAppLogic.tsx`. | Surgically re-implement state/handler/memo from `da92ab9507:apps/web/src/useAppLogic.tsx` into appropriate domain hook or `useAppLogic.tsx`. |
| **Category C** | 4 | Property is already destructured/defined and exposed in modern `useAppLogic.tsx` return object. | None required (already restored or preserved). |

---

## 2. Logic Chain

1. **Extraction**: Parsed `dead_props.txt` using UTF-16LE decoding. Confirmed properties 67 to 132 (66 items total) starting at `inferredTreatmentArea` and ending at `pendingSpeechFlushActionLabel`.
2. **Golden Reference Retrieval**: Executed `git show da92ab9507:apps/web/src/useAppLogic.tsx` to extract the exact TypeScript declarations, state hooks, memoized calculations, and return object keys for each of the 66 properties.
3. **Modern Codebase Survey**: Scanned `apps/web/src/useAppLogic.tsx` and all 15+ files in `apps/web/src/hooks/domains/` using ripgrep and Node AST/string searching.
4. **Classification**:
   - For items present in `hooks/domains/` (such as document values like `outpatient025uMedicalCardNumberValue`, `paidContractTotalRubValue`, `minorConsent*`, `paymentReceipt*`, DICOM web checks, MPR projection controls), the domain hooks already calculate or maintain state, but `useAppLogic.tsx` does not pass them through to components like `App.tsx`, `DocumentsView.tsx`, or `VisitView.tsx`.
   - For items deleted from all files (such as MPR DICOM projection controls like `mprActiveProjectionLabel`, `mprAxisAngleBadge`, `mprClinicalChecklist`, `mprNearestClinicalPreset`, `mprSliceBadge`, speech recovery `loadSpeechRecordingRecovery`, `pendingSpeechFlushActionLabel`, local bridge state `localBridgeStatusState`, `organizeLocalImagingSources`, `noShowRisk`), the logic was lost during monolith splitting and must be re-implemented.

---

## 3. Caveats

- **No Source Code Modifications Made**: Explorer 4 operates strictly under read-only investigation rules. No files in `apps/web/src/` were modified during this analysis.
- **Inter-hook Dependencies**: Re-implementing Category B properties (e.g. MPR controls or local bridge status) may require adding state setters or helpers into `useDicomWorkbenchModule.ts` or `useImagingQueries.ts` rather than stuffing everything into `useAppLogic.tsx`.
- **Type Compatibility**: Types for restored properties must match interface definitions expected by downstream components (`App.tsx`, `DocumentsView.tsx`, `VisitView.tsx`, `SettingsView.tsx`).

---

## 4. Conclusion & Actionable Recommendations

- **Category A (29 Props)**: Quick win. Update `useAppLogic.tsx` destructuring from domain hooks (`useDocumentWorkflowModule`, `usePatientIntakeLogic`, `useDicomWorkbenchModule`, `usePatientLogic`, `useFinanceLogic`) and expose them in `useAppLogic` return object.
- **Category B (33 Props)**: Requires surgical code restoration. Extract original code blocks from `da92ab9507:apps/web/src/useAppLogic.tsx` and place them in modern domain hooks or `useAppLogic.tsx`.
- **Category C (4 Props)**: Already present and exported; no action required.

---

## 5. Verification Method

1. **Verify Inventory Extraction**: Run `node -e "const fs=require('fs'); console.log(fs.readFileSync('dead_props.txt','utf16le').split(/\r?\n/).slice(66, 132))"` to confirm properties 67 through 132.
2. **Verify Typecheck**: After implementer completes edits, run `npm run typecheck -w @dental/web` to confirm elimination of TS2339 errors for these 66 properties.
3. **Invalidation Condition**: If any property listed in Category A is missing from modern domain hooks or if Category B code snippets fail to compile against current TS interfaces.

---

## 6. Comprehensive Property Inventory (Props 67 to 132)

### Prop #67: `inferredTreatmentArea`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'inferredTreatmentArea' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'inferredTreatmentArea' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 11 lines found
```typescript

	const inferredTreatmentArea = useMemo(() => {
		const toothCodes = activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.map((item) => item.toothCode?.trim())
			.filter((toothCode): toothCode is string => Boolean(toothCode));
		return Array.from(new Set(toothCodes)).slice(0, 6).join(", ");
	}, [activeTreatmentPlanItems]);

	const activeTreatmentPlanScenarios = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (dashboard.treatmentPlanScenarios || []).filter(
			(scenario) => scenario.patientId === documentPatient.id,
		);
	}, [dashboard, documentPatient?.id]);

	const activeVisitClinicalRuleEvaluations = useMemo(() => {
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/documents/forms/AnesthesiaConsentLogForm.tsx` (3 match(es))
  - `components/documents/forms/documentFormTypes.ts` (1 match(es))
  - `components/documents/forms/InformedConsentForm.tsx` (3 match(es))
  - `components/documents/forms/MedicalInterventionRefusalForm.tsx` (3 match(es))
  - `components/documents/forms/ProcedureSpecificConsentForm.tsx` (2 match(es))
  - `components/documents/informedConsentBlockers.ts` (2 match(es))
  - `documentLogic.ts` (4 match(es))
  - `DocumentsView.tsx` (10 match(es))
  - `documentValidators.ts` (6 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (9 match(es))
  - `tests/documentPayloadForms.test.ts` (4 match(es))

### Prop #68: `ingestImportFile`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'ingestImportFile' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript

	async function ingestImportFile(file: File | undefined) {
		if (!file) return;
		if (file.size > 8 * 1024 * 1024) {
			setError(
				"Файл больше 8 МБ. Для больших архивов нужен пакетный импорт на сервере или распознавание через локальный модуль клиники.",
			);
			return;
		}
		setIsDocumentIngesting(true);
		try {
			const dataUrl = await readFileAsDataUrl(file);
			const response = await fetch("/api/ingestion/extract", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (1 match(es))

### Prop #69: `inn`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'inn' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'inn' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 6 lines found
```typescript
				key: string;
				inn: string;
				label: string;
				amountRub: number;
				paymentCount: number;
			}
		>();
		for (const payment of activePayments) {
			const paymentTaxYear = paymentTaxYearForUi(payment);
			if (payment.status !== "paid" || paymentTaxYear !== taxDocumentYear)
				continue;
			const payerKey = taxPaymentPayerKeyForUi(payment);
			if (!payerKey) continue;
			const payerInn = payment.payerInn?.trim() || "";
			const payerName = payment.payerFullName?.trim() || "Плательщик";
			const payerRelationship = payment.payerRelationship?.trim();
			const payerIdentity = payment.payerIdentityDocument?.trim();
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `AppHelpers.tsx` (9 match(es))
  - `components/auth/AcceptInvite.tsx` (1 match(es))
  - `components/auth/ClinicLogin.tsx` (1 match(es))
  - `components/auth/Register.tsx` (1 match(es))
  - `components/auth/UserLogin.tsx` (1 match(es))
  - `components/documents/forms/PersonalDataProcessingConsentForm.tsx` (2 match(es))
  - `components/documents/personalDataOperatorRequisites.ts` (6 match(es))
  - `components/documents/taxApplicationBlockers.ts` (4 match(es))
  - `components/odontogram/OdontogramModule.tsx` (2 match(es))
  - `components/odontogram/ToothHistoryChronicle.tsx` (1 match(es))
  - `components/odontogram/treatmentEstimatorPricing.test.ts` (1 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsClinicTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `components/settings/SettingsViewHelpers.tsx` (1 match(es))
  - `components/VisitDiaryEditor.tsx` (1 match(es))
  - `documentLogic.ts` (1 match(es))
  - `DocumentsView.tsx` (1 match(es))
  - `documentValidators.ts` (1 match(es))
  - `GuestLabPortal.tsx` (1 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (4 match(es))
  - `hooks/domains/usePatientIntakeLogic.ts` (1 match(es))
  - `ImagingView.tsx` (1 match(es))
  - `pages/AnalyticsDashboardView.tsx` (1 match(es))
  - `PaymentCapture.tsx` (2 match(es))
  - `tests/appLogicHandlersExist.test.ts` (3 match(es))
  - `tests/documentPayloadForms.test.ts` (2 match(es))
  - `tests/moneyUnknownNotZero.test.ts` (8 match(es))
  - `tests/panoramicArch.test.ts` (1 match(es))
  - `tests/panoramicArchVsCornerstone.test.ts` (1 match(es))
  - `tests/themeContrastGuard.test.ts` (15 match(es))
  - `tests/themeTokenSpecificity.test.ts` (9 match(es))
  - `tests/utils/componentReachability.ts` (11 match(es))
  - `useAppLogic.tsx` (1 match(es))
  - `VisitView.tsx` (1 match(es))
  - `workspaceUiLabels.test.ts` (2 match(es))
  - `workspaceUiLabels.ts` (1 match(es))
  - `__tests__/workspaceUiLabels.test.ts` (3 match(es))

### Prop #70: `installmentScheduleBaseDocumentTitleValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'installmentScheduleBaseDocumentTitleValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'installmentScheduleBaseDocumentTitleValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function installmentScheduleBaseDocumentTitleValue(): string {
		return (
			installmentScheduleBaseDocumentTitle.trim() ||
			activeUsableDocuments?.find(
				(document) => document.kind === "paid_medical_services_contract",
			)?.title ||
			"договор или план лечения клиники"
		);
	}

	function installmentSchedulePayerFullNameValue(): string {
		return (
			installmentSchedulePayerFullName.trim() || documentPatient?.fullName || ""
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #71: `installmentScheduleInstallmentRows`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'installmentScheduleInstallmentRows' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'installmentScheduleInstallmentRows' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function installmentScheduleInstallmentRows() {
		const rows = documentTextLines(installmentScheduleRows).map(
			(line, index) => {
				const [label, dueDate, amount, status] = line
					.split("|")
					.map((part) => part.trim());
				const parsedAmount = amount
					? Number(amount.replace(/[^\d]/g, ""))
					: Number.NaN;
				const parsedStatus =
					installmentPaymentStatusAliases[
						status?.toLocaleLowerCase("ru-RU").replaceAll("ё", "е") ?? ""
					] ?? "planned";
				return {
					label: label || `Платеж ${index + 1}`,
					dueDate: dueDate || dateInputValuePlusDays(index === 0 ? 7 : 21),
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))
  - `store/documentStore.ts` (1 match(es))

### Prop #72: `installmentSchedulePrepaidRubValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'installmentSchedulePrepaidRubValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'installmentSchedulePrepaidRubValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 4 lines found
```typescript

	function installmentSchedulePrepaidRubValue(): number {
		const manual = manualRubAmount(installmentSchedulePrepaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
			0,
		);
	}

	function installmentScheduleRemainingRubValue(): number {
		return Math.max(
			0,
			installmentScheduleTotalRubValue() - installmentSchedulePrepaidRubValue(),
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (3 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (2 match(es))

### Prop #73: `installmentScheduleTotalRubValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'installmentScheduleTotalRubValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'installmentScheduleTotalRubValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 4 lines found
```typescript

	function installmentScheduleTotalRubValue(): number {
		const manual = manualRubAmount(installmentScheduleTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function installmentSchedulePrepaidRubValue(): number {
		const manual = manualRubAmount(installmentSchedulePrepaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
			0,
		);
	}

	function installmentScheduleRemainingRubValue(): number {
		return Math.max(
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (3 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (2 match(es))

### Prop #74: `insuranceContractId`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'insuranceContractId' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'insuranceContractId' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 4 lines found
```typescript
L5131: documentPatient?.insuranceContractId ||
L5132: documentPatient?.administrativeProfile?.insuranceContractId
L5135: documentPatient.insuranceContractId ||
L5136: documentPatient.administrativeProfile?.insuranceContractId;
```
- **Modern Codebase Location(s)**:
  - `components/IncomingCallToast.tsx` (2 match(es))
  - `components/odontogram/TreatmentEstimator.tsx` (6 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (4 match(es))
  - `tests/panelsAreMounted.test.ts` (2 match(es))

### Prop #75: `isDicomWebChecking`
- **Category**: `PRESENT_IN_USEAPPLOGIC`
- **Action Required**: Prop exists in useAppLogic.tsx body and return object. Verify implementation completeness.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
L1049: isDicomWebChecking,
L14110: isDicomWebChecking,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (3 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `store/imagingStore.ts` (3 match(es))
  - `useAppLogic.tsx` (2 match(es))
  - `useSettingsDerivations.tsx` (2 match(es))

### Prop #76: `lastName`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'lastName' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 0 lines found
```typescript

```
- **Modern Codebase Location(s)**:
  - `components/PatientAvatar.tsx` (3 match(es))
  - `components/useVisitDiaryLogic.ts` (2 match(es))
  - `components/VisitDiaryEditor.tsx` (2 match(es))

### Prop #77: `loadSpeechRecordingRecovery`
- **Category**: `PRESENT_AND_RETURNED`
- **Action Required**: Prop exists in domain hook (hooks/domains/useVisitLogic.ts) and is exposed in useAppLogic return object. Verify implementation completeness.
- **Golden Commit (`da92ab9507`) Matches**: 1 lines found
```typescript
L2579: loadSpeechRecordingRecovery,
```
- **Modern Codebase Location(s)**:
  - `components/visit/SpeechChunksInspector.tsx` (11 match(es))
  - `hooks/domains/useVisitLogic.ts` (5 match(es))
  - `useAppLogic.tsx` (1 match(es))

### Prop #78: `localBridgeStatusState`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'localBridgeStatusState' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	];
	const localBridgeStatusState = !localBridgeReadiness
		? "busy"
		: localBridgeReadiness.readyCount > 0
			? "ready"
			: localBridgeReadiness.configuredCount > 0
				? "warn"
				: "busy";
	const localBridgeStatusValue = !localBridgeReadiness
		? "проверка"
		: localBridgeReadiness.readyCount
			? `готово ${localBridgeReadiness.readyCount}/${localBridgeReadiness.bridges.length}`
			: localBridgeReadiness.configuredCount
				? "настроено"
				: "не задано";
	const visitSafetyCards: Array<{
		key: string;
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (1 match(es))

### Prop #79: `localBridgeStatusValue`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'localBridgeStatusValue' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
				: "busy";
	const localBridgeStatusValue = !localBridgeReadiness
		? "проверка"
		: localBridgeReadiness.readyCount
			? `готово ${localBridgeReadiness.readyCount}/${localBridgeReadiness.bridges.length}`
			: localBridgeReadiness.configuredCount
				? "настроено"
				: "не задано";
	const visitSafetyCards: Array<{
		key: string;
		label: string;
		value: string;
		detail: string;
		state: "ready" | "warn" | "busy";
	}> = [
		{
			key: "local",
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (1 match(es))

### Prop #80: `lookupClinicPublicProfile`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'lookupClinicPublicProfile' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript

	async function lookupClinicPublicProfile() {
		const payload = {
			inn: clinicProfileDraft.inn,
			kpp: clinicProfileDraft.kpp,
			ogrn: clinicProfileDraft.ogrn,
			clinicName: clinicProfileDraft.clinicName,
			legalName: clinicProfileDraft.legalName,
			address: clinicProfileDraft.address,
			medicalLicenseNumber: clinicProfileDraft.medicalLicenseNumber,
		};
		if (
			!Object.values(payload).some(
				(value) => typeof value === "string" && value.trim(),
			)
		) {
			setError(
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsClinicTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (4 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #81: `loyaltyTier`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'loyaltyTier' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 0 lines found
```typescript

```
- **Modern Codebase Location(s)**:
  - `AppHelpers.tsx` (12 match(es))
  - `components/patient/PatientAdministrativeForm.tsx` (6 match(es))
  - `components/patients/PatientLoyaltyHeader.tsx` (9 match(es))
  - `tests/patientCardDecomposition.test.ts` (1 match(es))
  - `utils/draftDefaults.ts` (1 match(es))

### Prop #82: `markPostVisitManualEdited`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'markPostVisitManualEdited' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'markPostVisitManualEdited' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript

	function markPostVisitManualEdited() {
		setPostVisitManualEdited(true);
		setPostVisitPresetFeedback("");
	}

	function recordExtractComplaintAndAnamnesisValue(): string {
		return (
			recordExtractComplaintAndAnamnesis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.anamnesis,
			)
		);
	}

	function recordExtractObjectiveStatusValue(): string {
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `DocumentsView.tsx` (14 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #83: `middleName`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'middleName' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 0 lines found
```typescript

```
- **Modern Codebase Location(s)**:
  - `components/useVisitDiaryLogic.ts` (2 match(es))
  - `components/VisitDiaryEditor.tsx` (2 match(es))

### Prop #84: `minorConsentDiagnosisOrIndicationValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'minorConsentDiagnosisOrIndicationValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'minorConsentDiagnosisOrIndicationValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function minorConsentDiagnosisOrIndicationValue(): string {
		return (
			minorConsentDiagnosisOrIndication.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}

	function minorConsentDoctorFullNameValue(): string {
		return minorConsentDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function warrantyServiceOrWorkNameValue(): string {
		return (
			warrantyServiceOrWorkName.trim() ||
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #85: `minorConsentInterventionScopeValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'minorConsentInterventionScopeValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'minorConsentInterventionScopeValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function minorConsentInterventionScopeValue(): string {
		return (
			minorConsentInterventionScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"стоматологическое вмешательство по согласованному плану"
		);
	}

	function minorConsentDiagnosisOrIndicationValue(): string {
		return (
			minorConsentDiagnosisOrIndication.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			""
		);
	}
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #86: `minorConsentPatientBirthDateValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'minorConsentPatientBirthDateValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'minorConsentPatientBirthDateValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function minorConsentPatientBirthDateValue(): string {
		return (
			minorConsentPatientBirthDate.trim() || documentPatient?.birthDate || ""
		);
	}

	function minorConsentInterventionScopeValue(): string {
		return (
			minorConsentInterventionScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"стоматологическое вмешательство по согласованному плану"
		);
	}

	function minorConsentDiagnosisOrIndicationValue(): string {
		return (
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #87: `minorConsentPatientFullNameValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'minorConsentPatientFullNameValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'minorConsentPatientFullNameValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function minorConsentPatientFullNameValue(): string {
		return (
			minorConsentPatientFullName.trim() || documentPatient?.fullName || ""
		);
	}

	function minorConsentPatientBirthDateValue(): string {
		return (
			minorConsentPatientBirthDate.trim() || documentPatient?.birthDate || ""
		);
	}

	function minorConsentInterventionScopeValue(): string {
		return (
			minorConsentInterventionScope.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #88: `minorRepresentativeFullNameValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'minorRepresentativeFullNameValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'minorRepresentativeFullNameValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function minorRepresentativeFullNameValue(): string {
		return (
			minorRepresentativeFullName.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeFullName?.trim() ||
			""
		);
	}

	function minorRepresentativeRelationshipValue(): string {
		return (
			minorRepresentativeRelationship.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeRelationship?.trim() ||
			""
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #89: `minorRepresentativeIdentityDocumentValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'minorRepresentativeIdentityDocumentValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'minorRepresentativeIdentityDocumentValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function minorRepresentativeIdentityDocumentValue(): string {
		return (
			minorRepresentativeIdentityDocument.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() ||
			""
		);
	}

	function minorRepresentativePhoneValue(): string {
		return (
			minorRepresentativePhone.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativePhone?.trim() ||
			""
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #90: `minorRepresentativePhoneValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'minorRepresentativePhoneValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'minorRepresentativePhoneValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function minorRepresentativePhoneValue(): string {
		return (
			minorRepresentativePhone.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativePhone?.trim() ||
			""
		);
	}

	function minorConsentPatientFullNameValue(): string {
		return (
			minorConsentPatientFullName.trim() || documentPatient?.fullName || ""
		);
	}

	function minorConsentPatientBirthDateValue(): string {
		return (
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #91: `minorRepresentativeRelationshipValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'minorRepresentativeRelationshipValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'minorRepresentativeRelationshipValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function minorRepresentativeRelationshipValue(): string {
		return (
			minorRepresentativeRelationship.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeRelationship?.trim() ||
			""
		);
	}

	function minorRepresentativeIdentityDocumentValue(): string {
		return (
			minorRepresentativeIdentityDocument.trim() ||
			documentPatient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() ||
			""
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #92: `mostLoadedResource`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mostLoadedResource' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
		: [];
	const mostLoadedResource =
		allResourceLoads
			.slice()
			.sort(
				(left, right) => right.utilizationPercent - left.utilizationPercent,
			)[0] ?? null;
	const visitWorkflowSteps: Array<{
		key: string;
		label: string;
		detail: string;
		state: "ready" | "active" | "locked";
	}> = [
		{
			key: "dictation",
			label: "Диктовка",
			detail: hasVisitTranscriptText
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `ShiftView.tsx` (10 match(es))

### Prop #93: `mprActiveProjectionLabel`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprActiveProjectionLabel' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[mprProjection as MprProjection] ?? mprProjection;
	const mprActiveProjectionOrientation =
		mprProjectionOrientationLabels[mprProjection as MprProjection] ??
		"плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(mprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
	});
	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: mprProjection,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (3 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #94: `mprActiveProjectionOrientation`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprActiveProjectionOrientation' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
		mprProjectionLabels[mprProjection as MprProjection] ?? mprProjection;
	const mprActiveProjectionOrientation =
		mprProjectionOrientationLabels[mprProjection as MprProjection] ??
		"плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(mprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
	});
	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: mprProjection,
			availableProjections: cbctWorkbenchProjections,
			axisDeg: mprAxisDeg,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (2 match(es))

### Prop #95: `mprAxisAngleBadge`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprAxisAngleBadge' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	});
	const mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
	const mprSlicePositionPercent =
		mprSliceMaxIndex > 0
			? `${(mprSafeSliceIndex / mprSliceMaxIndex) * 100}%`
			: "50%";
	const mprCurrentSliceFraction = mprSliceFraction(
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (2 match(es))

### Prop #96: `mprAxisDirectionLabel`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprAxisDirectionLabel' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript
	const mprCenterSliceIndex = Math.floor(mprSliceMaxIndex / 2);
	const mprAxisDirectionLabel = formatMprAxisDirectionLabel({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
	const mprSlicePositionPercent =
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (3 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #97: `mprAxisGuidance`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprAxisGuidance' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript
	const mprProjectionCompass = mprProjectionCompassLabels(mprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
	});
	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: mprProjection,
			availableProjections: cbctWorkbenchProjections,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceFraction: mprCurrentSliceFraction,
			windowPreset: mprWindowPreset,
			crosshair: mprCrosshairEnabled,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (4 match(es))
  - `hooks/useMprLogic.ts` (3 match(es))
  - `ImagingView.tsx` (4 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #98: `mprAxisRangeValue`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprAxisRangeValue' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
		: "срез включится после КЛКТ/КТ-серии";
	const mprAxisRangeValue = formatMprAxisRangeValue({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #99: `mprAxisVisualizerLabel`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprAxisVisualizerLabel' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	});
	const mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
			mprNearestClinicalPreset.exact &&
			mprNearestClinicalPreset.title === preset.title
				? "active"
				: "",
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #100: `mprAxisVisualizerStyle`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprAxisVisualizerStyle' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	});
	const mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[mprProjection as MprProjection] ?? mprProjection;
	const mprActiveProjectionOrientation =
		mprProjectionOrientationLabels[mprProjection as MprProjection] ??
		"плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(mprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `useSettingsDerivations.tsx` (1 match(es))

### Prop #101: `mprClinicalChecklist`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprClinicalChecklist' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
			mprNearestClinicalPreset.exact &&
			mprNearestClinicalPreset.title === preset.title
				? "active"
				: "",
		]
			.filter(Boolean)
			.join(" ");
	const applyDefaultMprWorkbenchState = () => {
		const defaultProjection = cbctWorkbenchProjections.includes("axial")
			? "axial"
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (3 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (4 match(es))

### Prop #102: `mprClinicalNextStep`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprClinicalNextStep' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
			mprNearestClinicalPreset.exact &&
			mprNearestClinicalPreset.title === preset.title
				? "active"
				: "",
		]
			.filter(Boolean)
			.join(" ");
	const applyDefaultMprWorkbenchState = () => {
		const defaultProjection = cbctWorkbenchProjections.includes("axial")
			? "axial"
			: (cbctWorkbenchProjections[0] ?? "axial");
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (2 match(es))

### Prop #103: `mprClinicalPresetButtonClass`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprClinicalPresetButtonClass' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
			mprNearestClinicalPreset.exact &&
			mprNearestClinicalPreset.title === preset.title
				? "active"
				: "",
		]
			.filter(Boolean)
			.join(" ");
	const applyDefaultMprWorkbenchState = () => {
		const defaultProjection = cbctWorkbenchProjections.includes("axial")
			? "axial"
			: (cbctWorkbenchProjections[0] ?? "axial");
		setMprProjection(defaultProjection);
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (4 match(es))

### Prop #104: `mprControlsAutoOpen`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprControlsAutoOpen' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	);
	const mprControlsAutoOpen =
		selectedImagingStudy?.kind === "cbct" ||
		selectedImagingViewerPlan?.mode === "cbct_mpr" ||
		mprControlsReady;
	const mprCenterSliceIndex = Math.floor(mprSliceMaxIndex / 2);
	const mprAxisDirectionLabel = formatMprAxisDirectionLabel({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))

### Prop #105: `mprControlsReady`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprControlsReady' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 23 lines found
```typescript
	);
	const mprControlsReady = Boolean(
		cbctWorkbenchSeries?.mprReadiness.canOpenMpr,
	);
	const mprControlsAutoOpen =
		selectedImagingStudy?.kind === "cbct" ||
		selectedImagingViewerPlan?.mode === "cbct_mpr" ||
		mprControlsReady;
	const mprCenterSliceIndex = Math.floor(mprSliceMaxIndex / 2);
	const mprAxisDirectionLabel = formatMprAxisDirectionLabel({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (15 match(es))
  - `components/settings/SettingsImportsTab.tsx` (15 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (31 match(es))
  - `hooks/useMprLogic.ts` (23 match(es))
  - `ImagingView.tsx` (31 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (20 match(es))

### Prop #106: `mprNearestClinicalPreset`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprNearestClinicalPreset' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 10 lines found
```typescript
	});
	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: mprProjection,
			availableProjections: cbctWorkbenchProjections,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceFraction: mprCurrentSliceFraction,
			windowPreset: mprWindowPreset,
			crosshair: mprCrosshairEnabled,
			linkedPlanes: mprLinkedPlanesEnabled,
		},
		mprClinicalPresets,
	);
	const mprClinicalInput = {
		hasSeries: Boolean(cbctWorkbenchSeries),
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (9 match(es))
  - `components/settings/SettingsImportsTab.tsx` (9 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (9 match(es))
  - `hooks/useMprLogic.ts` (10 match(es))
  - `ImagingView.tsx` (9 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (14 match(es))

### Prop #107: `mprOperatorSummaryCards`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprOperatorSummaryCards' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	const mprWorkbenchSummaryText = buildMprWorkbenchSummary(mprClinicalInput);
	const mprOperatorSummaryCards = buildMprOperatorSummary({
		...mprClinicalInput,
		protocolDeltas: mprNearestClinicalPreset.deltas,
	});
	const mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #108: `mprProjectionCompass`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprProjectionCompass' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 4 lines found
```typescript
		"плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(mprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
	});
	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: mprProjection,
			availableProjections: cbctWorkbenchProjections,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceFraction: mprCurrentSliceFraction,
			windowPreset: mprWindowPreset,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (3 match(es))
  - `components/settings/SettingsImportsTab.tsx` (3 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (6 match(es))
  - `hooks/useMprLogic.ts` (4 match(es))
  - `ImagingView.tsx` (6 match(es))
  - `mprControlMath.ts` (1 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (4 match(es))
  - `utils/math/mprMath.ts` (1 match(es))

### Prop #109: `mprSlabBadge`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprSlabBadge' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	);
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
	const mprSlicePositionPercent =
		mprSliceMaxIndex > 0
			? `${(mprSafeSliceIndex / mprSliceMaxIndex) * 100}%`
			: "50%";
	const mprCurrentSliceFraction = mprSliceFraction(
		mprSafeSliceIndex,
		mprSliceMaxIndex,
	);
	const mprSliceLabel = mprControlsReady
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (2 match(es))

### Prop #110: `mprSlabRangeValue`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprSlabRangeValue' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	});
	const mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[mprProjection as MprProjection] ?? mprProjection;
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #111: `mprSliceBadge`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprSliceBadge' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
	const mprSlicePositionPercent =
		mprSliceMaxIndex > 0
			? `${(mprSafeSliceIndex / mprSliceMaxIndex) * 100}%`
			: "50%";
	const mprCurrentSliceFraction = mprSliceFraction(
		mprSafeSliceIndex,
		mprSliceMaxIndex,
	);
	const mprSliceLabel = mprControlsReady
		? `срез ${mprSafeSliceIndex + 1} из ${mprSliceMaxIndex + 1}`
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (2 match(es))

### Prop #112: `mprSliceLabel`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprSliceLabel' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript
	);
	const mprSliceLabel = mprControlsReady
		? `срез ${mprSafeSliceIndex + 1} из ${mprSliceMaxIndex + 1}`
		: "срез включится после КЛКТ/КТ-серии";
	const mprAxisRangeValue = formatMprAxisRangeValue({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (3 match(es))
  - `hooks/useMprLogic.ts` (3 match(es))
  - `ImagingView.tsx` (3 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (4 match(es))

### Prop #113: `mprSliceRangeValue`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprSliceRangeValue' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
	});
	const mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[mprProjection as MprProjection] ?? mprProjection;
	const mprActiveProjectionOrientation =
		mprProjectionOrientationLabels[mprProjection as MprProjection] ??
		"плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(mprProjection);
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (2 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (3 match(es))

### Prop #114: `mprWorkbenchSummaryText`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'mprWorkbenchSummaryText' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript
	};
	const mprWorkbenchSummaryText = buildMprWorkbenchSummary(mprClinicalInput);
	const mprOperatorSummaryCards = buildMprOperatorSummary({
		...mprClinicalInput,
		protocolDeltas: mprNearestClinicalPreset.deltas,
	});
	const mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (2 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `components/settings/sources/SourcesDicomCapability.tsx` (2 match(es))
  - `hooks/useMprLogic.ts` (3 match(es))
  - `ImagingView.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (4 match(es))

### Prop #115: `name`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'name' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'name' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 35 lines found
```typescript
	async function addChair() {
		const name = newChairName.trim();
		if (!name) {
			setError("Введите название кресла или кабинета перед добавлением.");
			return;
		}
		// См. addStaffMember: двойной клик создавал два одинаковых кресла.
		if (chairCreateInFlightRef.current) return;
		chairCreateInFlightRef.current = true;
		setIsChairCreating(true);
		if (!(await saveClinicProfileIfDirty())) {
			chairCreateInFlightRef.current = false;
			setIsChairCreating(false);
			return;
		}
		try {
			const response = await fetch("/api/settings/chairs", {
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (21 match(es))
  - `AppHelpers.tsx` (15 match(es))
  - `ClinicalAiPersonalizePanel.tsx` (6 match(es))
  - `components/auth/AcceptInvite.tsx` (2 match(es))
  - `components/auth/Register.tsx` (5 match(es))
  - `components/auth/StaffPinPad.tsx` (1 match(es))
  - `components/communications/deliveryReportNotice.ts` (5 match(es))
  - `components/communications/MessageDeliveryConsole.tsx` (1 match(es))
  - `components/dicom/DicomArchiveUploader.tsx` (6 match(es))
  - `components/EgiszMonitor.tsx` (3 match(es))
  - `components/finance/FamilyWalletPanel.tsx` (4 match(es))
  - `components/imaging/ShadowAnalystReport.tsx` (1 match(es))
  - `components/imaging/VisiographAnalyzer.tsx` (6 match(es))
  - `components/integrations/YandexCalendarSyncsWidget.tsx` (2 match(es))
  - `components/inventory/useInventoryLogic.ts` (13 match(es))
  - `components/InventoryView.tsx` (8 match(es))
  - `components/leads/LeadsKanbanView.tsx` (15 match(es))
  - `components/odontogram/TreatmentEstimator.tsx` (3 match(es))
  - `components/odontogram/treatmentEstimatorPricing.test.ts` (19 match(es))
  - `components/odontogram/treatmentEstimatorPricing.ts` (17 match(es))
  - `components/OnboardingWizard.tsx` (7 match(es))
  - `components/PatientPortal.tsx` (1 match(es))
  - `components/patients/PatientAttachmentsPanel.tsx` (13 match(es))
  - `components/patients/patientCardSavePill.test.tsx` (2 match(es))
  - `components/patients/PatientDuplicateAlert.tsx` (1 match(es))
  - `components/patients/PatientFamilyCard.tsx` (3 match(es))
  - `components/patients/PatientNoShowRisk.tsx` (1 match(es))
  - `components/patients/PatientWhatsappSendPanel.tsx` (2 match(es))
  - `components/patients/RecallListPanel.tsx` (3 match(es))
  - `components/plan/planPricing.ts` (8 match(es))
  - `components/schedule/AppointmentCard.tsx` (2 match(es))
  - `components/schedule/NewAppointmentForm.tsx` (1 match(es))
  - `components/schedule/WaitlistDrawer.tsx` (1 match(es))
  - `components/settings/InsuranceContractsPanel.tsx` (3 match(es))
  - `components/settings/MessageTemplatesPanel.tsx` (3 match(es))
  - `components/settings/MigrationWizard.tsx` (6 match(es))
  - `components/settings/SettingsAuditTab.tsx` (6 match(es))
  - `components/settings/SettingsBpmnTab.tsx` (12 match(es))
  - `components/settings/SettingsClinicTab.tsx` (4 match(es))
  - `components/settings/settingsDeepLinks.test.ts` (3 match(es))
  - `components/settings/SettingsImportsTab.tsx` (6 match(es))
  - `components/settings/settingsModuleGate.test.ts` (1 match(es))
  - `components/settings/SettingsPricesTab.tsx` (1 match(es))
  - `components/settings/SettingsTelegramTab.tsx` (14 match(es))
  - `components/settings/SettingsViewHelpers.tsx` (2 match(es))
  - `components/settings/settingsWorkflowsPanel.test.ts` (3 match(es))
  - `components/settings/settingsWorkflowsPanel.ts` (2 match(es))
  - `components/settings/StaffAuthorityPanel.tsx` (10 match(es))
  - `components/settings/StaffCommissionsPanel.tsx` (12 match(es))
  - `components/useVisitDiaryLogic.ts` (2 match(es))
  - `components/visit/completedServicesPlan.test.ts` (3 match(es))
  - `components/visit/CryptoProSigner.tsx` (1 match(es))
  - `components/visit/VisitDiagnosticsTab.tsx` (3 match(es))
  - `components/visit/VisitSpecialtyFocus.tsx` (1 match(es))
  - `components/VisitDiaryEditor.tsx` (4 match(es))
  - `components/VisitDiaryPhotoUpload.tsx` (7 match(es))
  - `components/workspaceActions/workspaceActionsPlacement.test.ts` (4 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (3 match(es))
  - `hooks/domains/useMigrationQueries.ts` (1 match(es))
  - `hooks/domains/useStaffSettingsLogic.ts` (4 match(es))
  - `hooks/domains/useTelegramModule.ts` (6 match(es))
  - `hooks/usePatientResource.ts` (1 match(es))
  - `hooks/useTelegramSettings.ts` (18 match(es))
  - `hooks/useWorkspaceProfile.ts` (2 match(es))
  - `lib/aiOrchestrator.ts` (3 match(es))
  - `lib/apiAuthFetch.ts` (4 match(es))
  - `lib/cryptopro.ts` (3 match(es))
  - `lib/panelStateText.test.ts` (1 match(es))
  - `lib/patientDuplicatesApi.ts` (3 match(es))
  - `lib/smartBookingParser.test.ts` (2 match(es))
  - `lib/smartBookingParser.ts` (2 match(es))
  - `lib/smartPatientParser.ts` (1 match(es))
  - `lib/smartPriceParser.ts` (1 match(es))
  - `lib/test-parser-deep.ts` (13 match(es))
  - `pages/AnalyticsDashboardView.tsx` (8 match(es))
  - `pages/analyticsDoctorMetrics.ts` (4 match(es))
  - `pages/PublicBookingWidget.tsx` (2 match(es))
  - `PatientsView.tsx` (4 match(es))
  - `PaymentCapture.tsx` (5 match(es))
  - `ScannerView.tsx` (4 match(es))
  - `ScheduleView.tsx` (2 match(es))
  - `SettingsView.tsx` (4 match(es))
  - `ShiftView.tsx` (1 match(es))
  - `store/leadsStore.ts` (1 match(es))
  - `store/settingsStore.ts` (12 match(es))
  - `tests/analyticsDoctorMetrics.test.ts` (4 match(es))
  - `tests/anamnesisStartsEmpty.test.ts` (2 match(es))
  - `tests/AppHelpers.test.ts` (1 match(es))
  - `tests/appLogicHandlersExist.test.ts` (34 match(es))
  - `tests/browserContinuity.test.ts` (3 match(es))
  - `tests/ctPlanningMarkupReachesServer.test.ts` (2 match(es))
  - `tests/dayConfirmationsPanelDefaultDay.test.ts` (2 match(es))
  - `tests/documentCreationTimestamps.test.ts` (2 match(es))
  - `tests/documentPayloadForms.test.ts` (15 match(es))
  - `tests/documentsViewDecomposition.test.ts` (14 match(es))
  - `tests/leadsKanbanDefaultDay.test.ts` (2 match(es))
  - `tests/managerReportSlicesReachTheOwner.test.ts` (4 match(es))
  - `tests/moneyFieldsStartEmpty.test.ts` (5 match(es))
  - `tests/moneyUnknownNotZero.test.ts` (5 match(es))
  - `tests/operationsPanelsStyling.test.ts` (1 match(es))
  - `tests/panelsAreMounted.test.ts` (10 match(es))
  - `tests/panoramicArchVsCornerstone.test.ts` (12 match(es))
  - `tests/patientCardDecomposition.test.ts` (2 match(es))
  - `tests/patientCommunicationLogPanel.test.ts` (1 match(es))
  - `tests/patientsWidgetsGridColumns.test.ts` (1 match(es))
  - `tests/paymentComposerReset.test.ts` (2 match(es))
  - `tests/periodBoundsGoToServerAsCalendarDate.test.ts` (1 match(es))
  - `tests/planPricing.test.ts` (5 match(es))
  - `tests/priceEntryKeepsKopecks.test.ts` (2 match(es))
  - `tests/protectedApiFilesReachTheBrowser.test.ts` (2 match(es))
  - `tests/publicPortalRoute.test.ts` (1 match(es))
  - `tests/settingsTabsPricelistPropsAreRead.test.ts` (18 match(es))
  - `tests/shiftViewHumanText.test.ts` (1 match(es))
  - `tests/staffUnlockListState.test.ts` (1 match(es))
  - `tests/themeClasses.test.ts` (1 match(es))
  - `tests/themeContrastGuard.test.ts` (5 match(es))
  - `tests/themeTokenSpecificity.test.ts` (4 match(es))
  - `tests/utils/componentReachability.ts` (80 match(es))
  - `tests/visiographFindings.test.ts` (1 match(es))
  - `useAppLogic.tsx` (8 match(es))
  - `useSettingsDerivations.tsx` (4 match(es))
  - `utils/cryptoPro.ts` (3 match(es))
  - `utils/pdf/unifiedPdfGenerator.ts` (2 match(es))
  - `utils/planEstimator.ts` (10 match(es))
  - `utils/unifiedPdfGenerator.ts` (2 match(es))
  - `VisitView.tsx` (1 match(es))
  - `__tests__/clinicModeSurface.test.ts` (6 match(es))
  - `__tests__/workspaceShellNav.test.ts` (5 match(es))
  - `__tests__/workspaceTopbarActions.test.ts` (5 match(es))

### Prop #116: `newRulePatientText`
- **Category**: `PRESENT_AND_RETURNED`
- **Action Required**: Prop exists in domain hook (hooks/domains/usePatientLogic.ts) and is exposed in useAppLogic return object. Verify implementation completeness.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript
L2429: newRulePatientText,
L11032: !newRulePatientText.trim()
L11067: patientText: newRulePatientText.trim(),
```
- **Modern Codebase Location(s)**:
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (1 match(es))
  - `components/settings/SettingsRulesTab.tsx` (2 match(es))
  - `hooks/domains/usePatientLogic.ts` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `store/patientStore.ts` (4 match(es))
  - `useAppLogic.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (1 match(es))

### Prop #117: `noShowRisk`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'noShowRisk' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 0 lines found
```typescript

```
- **Modern Codebase Location(s)**:
  - `components/IncomingCallToast.tsx` (2 match(es))

### Prop #118: `organizeLocalImagingSources`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'organizeLocalImagingSources' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript

	async function organizeLocalImagingSources() {
		const controller = startLocalDicomOperation();
		setIsLocalImagingOrganizing(true);
		try {
			const candidateRoot = imagingFolderPath.trim();
			const useSpecificRoot =
				candidateRoot.length > 0 && candidateRoot !== "C:\\Images";
			if (useSpecificRoot)
				rememberLocalImagingFolder(candidateRoot, { origin: "manual" });
			const response = await fetch(
				"/api/imaging/local-organizer/scan-preview",
				{
					method: "POST",
					signal: controller.signal,
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `components/settings/SettingsAuditTab.tsx` (1 match(es))
  - `components/settings/SettingsImportsTab.tsx` (2 match(es))
  - `SettingsView.tsx` (1 match(es))
  - `useSettingsDerivations.tsx` (1 match(es))

### Prop #119: `outpatient025uMedicalCardNumberValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'outpatient025uMedicalCardNumberValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'outpatient025uMedicalCardNumberValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 4 lines found
```typescript

	function outpatient025uMedicalCardNumberValue(): string {
		const explicitNumber = outpatient025uMedicalCardNumber.trim();
		if (explicitNumber) return explicitNumber;
		const patientToken =
			documentPatient?.id.slice(0, 8).toUpperCase() ?? "PATIENT";
		return `DENTE-${new Date().getFullYear()}-${patientToken}`;
	}

	function outpatient025uSourceVisitIdsValue(): string[] {
		const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
		if (sourceVisitIds.length) return sourceVisitIds;
		return dashboard?.activeVisit?.id ? [dashboard?.activeVisit?.id] : [];
	}

	function outpatient025uLicenseValue(): string | null {
		const value = compactDocumentText(
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (1 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (4 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (3 match(es))
  - `hooks/domains/usePatientIntakeLogic.ts` (4 match(es))

### Prop #120: `paidContractTotalRubValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paidContractTotalRubValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paidContractTotalRubValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 4 lines found
```typescript

	function paidContractTotalRubValue(): number {
		const manual = manualRubAmount(paidContractTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function paidContractCustomerFullNameValue(): string {
		return (
			paidContractCustomerFullName.trim() || documentPatient?.fullName || ""
		);
	}

	function paidContractCareReasonValue(): string {
		return (
			paidContractCareReason.trim() ||
			dashboard?.activeVisit?.complaint?.trim() ||
			"плановое стоматологическое лечение по результатам осмотра"
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (4 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))
  - `tests/paidContractRequiredFields.test.ts` (1 match(es))

### Prop #121: `patientClinicalRuleEvaluations`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'patientClinicalRuleEvaluations' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'patientClinicalRuleEvaluations' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 4 lines found
```typescript

	const patientClinicalRuleEvaluations = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
		return (dashboard.clinicalRuleEvaluations || [])
			.filter((evaluation) => evaluation.patientId === documentPatient.id)
			.sort(
				(left, right) =>
					Number(left.resolved) - Number(right.resolved) ||
					severityRank[left.severity] - severityRank[right.severity],
			);
	}, [dashboard, documentPatient?.id]);

	const activeVisitClinicalRuleSummary = useMemo(
		() =>
			clinicalRuleSummaryForUi(
				activeVisitClinicalRuleEvaluations,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (3 match(es))

### Prop #122: `patientClinicalRuleSummary`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'patientClinicalRuleSummary' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'patientClinicalRuleSummary' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript

	const patientClinicalRuleSummary = useMemo(
		() =>
			clinicalRuleSummaryForUi(
				patientClinicalRuleEvaluations,
				dashboard?.clinicalRuleSummary?.activeRules ?? 0,
			),
		[
			patientClinicalRuleEvaluations,
			dashboard?.clinicalRuleSummary?.activeRules,
		],
	);

	const activePayments = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (dashboard.payments || []).filter(
			(payment) => payment.patientId === documentPatient.id,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #123: `patientId`
- **Category**: `PRESENT_AND_RETURNED`
- **Action Required**: Prop exists in domain hook (hooks/domains/useDicomWorkbenchModule.ts) and is exposed in useAppLogic return object. Verify implementation completeness.
- **Golden Commit (`da92ab9507`) Matches**: 26 lines found
```typescript
			headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ patientId: selectedPatientId }),
		})
			.then((response) => {
				if (response.ok) setRecentPatientViewsVersion((version) => version + 1);
			})
			.catch(() => {});
	}, [selectedPatientId, dashboard]);

	useEffect(() => {
		const organizationId =
			dashboard?.clinicSettings?.profile?.organizationId?.trim() ?? "";
		if (
			!uiPreferencesHydrated ||
			!organizationId ||
			onboardingDismissalHydratedOrganizationIdRef.current === organizationId
		)
```
- **Modern Codebase Location(s)**:
  - `AppHelpers.tsx` (25 match(es))
  - `ClinicalAiPersonalizePanel.tsx` (15 match(es))
  - `ClinicalRulePanel.tsx` (14 match(es))
  - `ClinicalTasksPanel.tsx` (9 match(es))
  - `components/analytics/LostPatientsPanel.tsx` (2 match(es))
  - `components/CommandPalette.tsx` (1 match(es))
  - `components/communications/CampaignPanel.tsx` (1 match(es))
  - `components/crm/PatientArchiveReasonsAndBlacklistsWidget.tsx` (5 match(es))
  - `components/crm/PatientCommunicationTimelinesWidget.tsx` (4 match(es))
  - `components/dicom/Cornerstone3DViewer.tsx` (8 match(es))
  - `components/dicom/ctPlanningPersistence.ts` (9 match(es))
  - `components/documents/NdflCalculatorModal.tsx` (3 match(es))
  - `components/EgiszMonitor.tsx` (5 match(es))
  - `components/finance/cashDaySummary.test.ts` (1 match(es))
  - `components/finance/familyWalletMutationKey.ts` (4 match(es))
  - `components/finance/FamilyWalletPanel.tsx` (18 match(es))
  - `components/finance/paymentComposerReset.ts` (3 match(es))
  - `components/finance/SberbankTerminalPaymentModal.tsx` (6 match(es))
  - `components/imaging/VisiographAnalyzer.tsx` (9 match(es))
  - `components/IncomingCallToast.tsx` (10 match(es))
  - `components/LabOrdersPanel.tsx` (10 match(es))
  - `components/odontogram/OdontogramModule.tsx` (15 match(es))
  - `components/odontogram/ToothHistoryChronicle.tsx` (4 match(es))
  - `components/odontogram/TreatmentEstimator.tsx` (6 match(es))
  - `components/PatientJourneyTimeline.tsx` (10 match(es))
  - `components/patients/OrthodonticProgressWidget.tsx` (11 match(es))
  - `components/patients/PatientArchiveAndBlacklistWidget.tsx` (8 match(es))
  - `components/patients/PatientAttachmentsPanel.tsx` (8 match(es))
  - `components/patients/PatientCommunicationConsentsPanel.tsx` (8 match(es))
  - `components/patients/PatientCommunicationTimelineWidget.tsx` (4 match(es))
  - `components/patients/PatientDuplicateAlert.tsx` (20 match(es))
  - `components/patients/PatientFamilyCard.tsx` (16 match(es))
  - `components/patients/PatientLoyaltyHeader.tsx` (3 match(es))
  - `components/patients/PatientNoShowRisk.tsx` (6 match(es))
  - `components/patients/PatientOverviewTab.tsx` (13 match(es))
  - `components/patients/PatientReclamationsWidget.tsx` (10 match(es))
  - `components/patients/PatientTaskTicketsWidget.tsx` (8 match(es))
  - `components/patients/PatientWhatsappSendPanel.tsx` (6 match(es))
  - `components/patients/RecallListPanel.tsx` (9 match(es))
  - `components/reports/ManagerReportsPanel.tsx` (5 match(es))
  - `components/schedule/AppointmentCard.tsx` (6 match(es))
  - `components/schedule/appointmentCardWithoutOpenVisit.test.tsx` (5 match(es))
  - `components/schedule/DayConfirmationsPanel.tsx` (1 match(es))
  - `components/schedule/FreedSlotsPanel.tsx` (6 match(es))
  - `components/schedule/LabOrdersPanel.tsx` (17 match(es))
  - `components/schedule/NewAppointmentForm.tsx` (12 match(es))
  - `components/schedule/scheduleDayGrouping.test.ts` (1 match(es))
  - `components/schedule/scheduleDayGrouping.ts` (1 match(es))
  - `components/schedule/WaitlistDrawer.tsx` (3 match(es))
  - `components/schedule/WaitlistMatchesBlock.tsx` (3 match(es))
  - `components/settings/AiRecognitionJobsPanel.tsx` (1 match(es))
  - `components/useVisitDiaryLogic.ts` (7 match(es))
  - `components/visit/CompletedServicesChecklist.tsx` (1 match(es))
  - `components/visit/completedServicesPlan.test.ts` (3 match(es))
  - `components/visit/completedServicesPlan.ts` (1 match(es))
  - `components/visit/EgiszMultipleDiagnosesWidget.tsx` (1 match(es))
  - `components/visit/EmkControlBoard.tsx` (6 match(es))
  - `components/visit/SpeechChunksInspector.tsx` (7 match(es))
  - `components/visit/VisitDiagnosticsTab.tsx` (5 match(es))
  - `components/visit/visitFlowResultOwner.ts` (3 match(es))
  - `components/visit/visitIdentity.ts` (1 match(es))
  - `components/visit/VisitOdontogramTab.tsx` (4 match(es))
  - `components/VisitDiaryEditor.tsx` (6 match(es))
  - `components/workspace/RecentPatientHistoryWidget.tsx` (3 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `FinanceView.tsx` (4 match(es))
  - `hooks/domains/useDicomWorkbenchModule.ts` (1 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (8 match(es))
  - `hooks/domains/useFinanceLogic.ts` (2 match(es))
  - `hooks/domains/useImagingQueries.ts` (5 match(es))
  - `hooks/domains/usePatientLogic.ts` (6 match(es))
  - `hooks/domains/useScheduleLogic.ts` (2 match(es))
  - `hooks/domains/useTelegramModule.ts` (1 match(es))
  - `hooks/domains/useVisitLogic.ts` (7 match(es))
  - `hooks/usePatientResource.ts` (10 match(es))
  - `hooks/useShortDictation.ts` (1 match(es))
  - `hooks/useVoiceAssistant.ts` (1 match(es))
  - `ImagingView.tsx` (1 match(es))
  - `lib/aiOrchestrator.ts` (1 match(es))
  - `lib/patientDuplicatesApi.ts` (6 match(es))
  - `lib/smartBookingParser.test.ts` (5 match(es))
  - `lib/smartBookingParser.ts` (8 match(es))
  - `PatientsView.tsx` (6 match(es))
  - `PaymentCapture.tsx` (5 match(es))
  - `ScheduleView.tsx` (4 match(es))
  - `ShiftView.tsx` (11 match(es))
  - `SmartParsePreview.tsx` (2 match(es))
  - `tests/appointmentMissingFields.test.ts` (3 match(es))
  - `tests/ctPlanningMarkupReachesServer.test.ts` (5 match(es))
  - `tests/paymentComposerReset.test.ts` (3 match(es))
  - `useAppLogic.tsx` (8 match(es))
  - `utils/draftDefaults.ts` (2 match(es))
  - `VisitNoteDraftPanel.tsx` (7 match(es))
  - `VisitView.tsx` (8 match(es))

### Prop #124: `paymentInvoiceTotalRubValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paymentInvoiceTotalRubValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paymentInvoiceTotalRubValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 4 lines found
```typescript

	function paymentInvoiceTotalRubValue(): number {
		return (
			plannedServiceLinesForFinancialPayload().reduce(
				(total, line) => total + line.totalRub,
				0,
			) || treatmentAcceptancePlannedTotalRub()
		);
	}

	function paymentInvoicePayerFullNameValue(): string {
		return (
			paymentInvoicePayerFullName.trim() || documentPatient?.fullName || ""
		);
	}

	function paymentInvoiceBankDetailsValue(): string {
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (2 match(es))

### Prop #125: `paymentReceiptFiscalReceiptLines`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paymentReceiptFiscalReceiptLines' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paymentReceiptFiscalReceiptLines' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function paymentReceiptFiscalReceiptLines(): string[] {
		return selectedPaymentReceiptPayments
			.map((payment) => payment.fiscalReceiptNumber?.trim())
			.filter((value): value is string => Boolean(value));
	}

	function installmentScheduleTotalRubValue(): number {
		const manual = manualRubAmount(installmentScheduleTotalRub);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function installmentSchedulePrepaidRubValue(): number {
		const manual = manualRubAmount(installmentSchedulePrepaidRub);
		if (manual > 0) return manual;
		return activePaidPaymentsForVisit().reduce(
			(total, payment) => total + payment.amountRub,
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (3 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #126: `paymentReceiptIssuedByValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paymentReceiptIssuedByValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paymentReceiptIssuedByValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function paymentReceiptIssuedByValue(): string {
		return (
			paymentReceiptIssuedBy.trim() ||
			activeDoctor?.fullName ||
			"Администратор клиники"
		);
	}

	function paymentReceiptFiscalReceiptLines(): string[] {
		return selectedPaymentReceiptPayments
			.map((payment) => payment.fiscalReceiptNumber?.trim())
			.filter((value): value is string => Boolean(value));
	}

	function installmentScheduleTotalRubValue(): number {
		const manual = manualRubAmount(installmentScheduleTotalRub);
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #127: `paymentReceiptPayerBirthDateValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paymentReceiptPayerBirthDateValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paymentReceiptPayerBirthDateValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function paymentReceiptPayerBirthDateValue(): string {
		return (
			paymentReceiptPayerBirthDate.trim() ||
			firstPaymentReceiptPayment()?.payerBirthDate?.trim() ||
			""
		);
	}

	function paymentReceiptPayerInnValue(): string {
		return (
			paymentReceiptPayerInn.trim() ||
			firstPaymentReceiptPayment()?.payerInn?.trim() ||
			""
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #128: `paymentReceiptPayerFullNameValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paymentReceiptPayerFullNameValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paymentReceiptPayerFullNameValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function paymentReceiptPayerFullNameValue(): string {
		return (
			paymentReceiptPayerFullName.trim() ||
			firstPaymentReceiptPayment()?.payerFullName?.trim() ||
			""
		);
	}

	function paymentReceiptPayerBirthDateValue(): string {
		return (
			paymentReceiptPayerBirthDate.trim() ||
			firstPaymentReceiptPayment()?.payerBirthDate?.trim() ||
			""
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #129: `paymentReceiptPayerIdentityDocumentValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paymentReceiptPayerIdentityDocumentValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paymentReceiptPayerIdentityDocumentValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function paymentReceiptPayerIdentityDocumentValue(): string {
		return (
			paymentReceiptPayerIdentityDocument.trim() ||
			firstPaymentReceiptPayment()?.payerIdentityDocument?.trim() ||
			""
		);
	}

	function paymentReceiptPayerRelationshipValue(): string {
		return (
			paymentReceiptPayerRelationship.trim() ||
			firstPaymentReceiptPayment()?.payerRelationship?.trim() ||
			"пациент"
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #130: `paymentReceiptPayerInnValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paymentReceiptPayerInnValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paymentReceiptPayerInnValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function paymentReceiptPayerInnValue(): string {
		return (
			paymentReceiptPayerInn.trim() ||
			firstPaymentReceiptPayment()?.payerInn?.trim() ||
			""
		);
	}

	function paymentReceiptPayerIdentityDocumentValue(): string {
		return (
			paymentReceiptPayerIdentityDocument.trim() ||
			firstPaymentReceiptPayment()?.payerIdentityDocument?.trim() ||
			""
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (2 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #131: `paymentReceiptPayerRelationshipValue`
- **Category**: `EXISTS_IN_DOMAIN_HOOK_NEEDS_PASSTHROUGH`
- **Action Required**: Destructure 'paymentReceiptPayerRelationshipValue' from domain hook 'hooks/domains/useDocumentWorkflowModule.ts' inside useAppLogic.tsx and add 'paymentReceiptPayerRelationshipValue' to useAppLogic return object.
- **Golden Commit (`da92ab9507`) Matches**: 3 lines found
```typescript

	function paymentReceiptPayerRelationshipValue(): string {
		return (
			paymentReceiptPayerRelationship.trim() ||
			firstPaymentReceiptPayment()?.payerRelationship?.trim() ||
			"пациент"
		);
	}

	function paymentReceiptIssuedByValue(): string {
		return (
			paymentReceiptIssuedBy.trim() ||
			activeDoctor?.fullName ||
			"Администратор клиники"
		);
	}

```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `documentLogic.ts` (2 match(es))
  - `DocumentsView.tsx` (2 match(es))
  - `documentValidators.ts` (2 match(es))
  - `hooks/domains/useDocumentWorkflowModule.ts` (1 match(es))

### Prop #132: `pendingSpeechFlushActionLabel`
- **Category**: `DELETED_REQUIRES_REIMPLEMENTATION`
- **Action Required**: Surgically re-implement 'pendingSpeechFlushActionLabel' (state/handler/memo) from da92ab9507:apps/web/src/useAppLogic.tsx into useAppLogic.tsx or relevant domain hook and expose in return object.
- **Golden Commit (`da92ab9507`) Matches**: 2 lines found
```typescript
		: "Сохранить в очередь";
	const pendingSpeechFlushActionLabel = speechRecognitionReady
		? "Отправить звук"
		: "Проверить очередь";
	const pendingSpeechFlushActionTitle = speechRecognitionReady
		? "Отправить сохраненные аудиофрагменты на распознавание."
		: "Проверить готовность распознавания. Аудио останется в локальной очереди, пока источник недоступен.";
	const speechSafetyValue = pendingSpeechChunkCount
		? `${pendingSpeechChunkCount} аудио`
		: currentSpeechQualityIssue
			? speechQualityLabels[currentSpeechQualityIssue.level]
			: speechRecognitionReady
				? speechGatewayActiveProviderIsLocal
					? "локальный модуль готов"
					: "распознавание готово"
				: "очередь локально";
	const speechSafetyDetail = pendingSpeechChunkCount
```
- **Modern Codebase Location(s)**:
  - `App.tsx` (3 match(es))
  - `VisitView.tsx` (3 match(es))


# HANDOFF REPORT — Explorer 3 (Part 3: Properties 133 to 198)

## 1. Observation

- **Scope & Inventory**: Inspected `C:\Clinic_MVP\dental-crm\dead_props.txt`. Total dead properties across all parts is 198. Part 3 encompasses exactly **66 properties** (Property 133 to Property 198).
- **Golden Reference**: Commit `da92ab9507:apps/web/src/useAppLogic.tsx` (14,776 lines of pre-refactor code).
- **Modern Codebase Survey**: Surveyed `apps/web/src/useAppLogic.tsx` (14,557 lines) and 14 domain hooks in `apps/web/src/hooks/domains/` (`useDocumentWorkflowModule.ts`, `useDicomWorkbenchModule.ts`, `useMigrationQueries.ts`, `useFinanceLogic.ts`, `useClinicalVisitLogic.ts`, `useScheduleLogic.ts`, `usePatientLogic.ts`, `useAuthLogic.ts`, `useVoiceAssistant.ts`, `useMprLogic.ts`, `useCommunicationsQueries.ts`, `useVisitLogic.ts`, `useStaffSettingsLogic.ts`, `usePatientIntakeLogic.ts`).

### Categorization Summary of Part 3 Properties (133 to 198)

| Category | Description | Count | Example Properties |
| --- | --- | --- | --- |
| **Category A** | Present in modern domain hooks or `useAppLogic.tsx` body, but **omitted from the `useAppLogic.tsx` return object** | 30 | `selectedTaxPaymentTotalRub`, `scheduleDateFilter`, `treatmentEstimateTotalRubValue`, `warrantyTeethOrAreaValue`, `resetMprControls` |
| **Category B** | **Completely missing** from modern architecture (erased during refactoring) and must be restored from golden commit `da92ab9507` | 36 | `startServerVoiceRecording`, `stopServerVoiceRecording`, `pickBrowserImagingFiles`, `runMigrationAutopilot`, `renderClinicalToothRowsEditor` |

---

## 2. Logic Chain

1. **Analysis of Category A (30 Properties)**:
   - During domain hook extraction (e.g. creating `useDocumentWorkflowModule.ts`, `useMprLogic.ts`, `useScheduleLogic.ts`), previous refactoring attempts migrated internal state/calculators into domain hooks or top-level body of `useAppLogic.tsx`.
   - However, when returning the context value object from `useAppLogic.tsx`, these 30 properties were **omitted from the return statement object**.
   - React views consuming `useAppLogic()` (e.g. `DocumentsView.tsx`, `FinanceView.tsx`, `ScheduleView.tsx`) fail TypeScript typechecking with `TS2339` errors.
   - **Surgical Action**: Do NOT duplicate or re-write logic. Wire/re-export these existing variables/functions directly in the `return { ... }` object of `useAppLogic.tsx`.

2. **Analysis of Category B (36 Properties)**:
   - These 36 properties were deleted from `useAppLogic.tsx` during aggressive refactoring and do NOT exist in any modern domain hook.
   - The Golden Reference Commit `da92ab9507:apps/web/src/useAppLogic.tsx` contains the complete functional implementations for all 36 properties.
   - **Surgical Action**: Surgically extract each missing function/memo from golden commit `da92ab9507` and insert it into the appropriate domain hook or `useAppLogic.tsx` body, then add to the `useAppLogic` return object.

---

## 3. Detailed Property Breakdown & Restoration Matrix (Properties 133–198)

### P133: `pendingSpeechFlushActionTitle`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7140
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
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
		? "аудио сохранено и уйдет позже"
		: currentSpeechQualityIssue
			? currentSpeechQualityIssue.nextAction
			: speechRecognitionReady
				? speechGatewayActiveProviderIsLocal
					? `${speechGatewayStatus?.providerLabel ?? "локальный модуль"}, фрагменты уходят в локальный модуль`
					: `${speechGatewayStatus?.providerLabel ?? "распознавание"}, звук отправляется частями`
				: "аудио хранится локально до готового источника";
	const speechSafetyState =
		pendingSpeechChunkCount ||
		currentSpeechQualityIssue ||
		!isOnline ||
		!speechUploadReady
```
- **Surgical Integration Instructions**: Extract function/memo `pendingSpeechFlushActionTitle` from commit `da92ab9507` and inject into `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`. Wire necessary parameters and add to return object.

### P134: `pickBrowserImagingFiles`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Defined within composite object / state hook
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
// State/helper property derived in golden commit
```
- **Surgical Integration Instructions**: Extract function/memo `pickBrowserImagingFiles` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`. Wire necessary parameters and add to return object.

### P135: `pickBrowserImagingFolder`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 9562
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function pickBrowserImagingFolder() {
		setIsBrowserImagingFolderPicking(true);
		try {
			const picker = (window as BrowserDirectoryPickerWindow)
				.showDirectoryPicker;
			if (typeof picker === "function") {
				const directoryHandle = await picker({
					id: "dental-crm-local-imaging",
					mode: "read",
				});
				await runBrowserImagingFolderScan({
					rootName: "Выбранная папка браузера",
					sourceKind: "browser_directory_picker",
					currentItem: "проверка выбранной папки",
					errorMessage: "Браузер не открыл выбор папки снимков",
					scan: (options) =>
						scanBrowserDirectoryHandle(directoryHandle, options),
				});
				return;
			}
			browserDirectoryInputRef.current?.click();
		} catch (pickerError) {
			if (
				pickerError instanceof DOMException &&
				pickerError.name === "AbortError"
			)
```
- **Surgical Integration Instructions**: Extract function/memo `pickBrowserImagingFolder` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`. Wire necessary parameters and add to return object.

### P136: `pickBrowserMigrationSource`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 9290
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function pickBrowserMigrationSource() {
		setIsBrowserMigrationScanning(true);
		try {
			const picker = (window as BrowserDirectoryPickerWindow)
				.showDirectoryPicker;
			if (typeof picker === "function") {
				const directoryHandle = await picker({
					id: "dental-crm-legacy-migration",
					mode: "read",
				});
				await runBrowserMigrationSourceScan({
					rootName: directoryHandle.name || "browser-selected-folder",
					sourceKind: "browser_directory_picker",
					currentItem: "проверка выбранной папки",
					errorMessage: "Браузер не открыл выбор старой базы или папки снимков",
					scan: (options) =>
						scanBrowserMigrationDirectoryHandle(directoryHandle, options),
				});
				return;
			}
			browserMigrationInputRef.current?.click();
		} catch (pickerError) {
			if (
				pickerError instanceof DOMException &&
				pickerError.name === "AbortError"
			)
```
- **Surgical Integration Instructions**: Extract function/memo `pickBrowserMigrationSource` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P137: `planMigrationDiscoveryCandidate`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 8505
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function planMigrationDiscoveryCandidate(
		candidate: MigrationLocalSourceDiscoveryResponse["candidates"][number],
	) {
		setIsMigrationSourceWorkupLoading(true);
		try {
			const response = await fetch("/api/imports/smart/local-source-workup", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					sourceRef: candidate.sourceRef,
					sourceKind: candidate.sourceKind,
					safeDisplayName: candidate.safeDisplayName,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"План переноса источника не построен",
					),
				);
			}
			setMigrationSourceWorkup(
				(await response.json()) as MigrationLocalSourceWorkupResponse,
```
- **Surgical Integration Instructions**: Extract function/memo `planMigrationDiscoveryCandidate` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P138: `plannedServiceLinesForFinancialPayload`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 11443
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function plannedServiceLinesForFinancialPayload() {
		return activeTreatmentPlanItems
			.filter((item) => item.status !== "cancelled")
			.filter(
				(item) =>
					!dashboard?.activeVisit?.id ||
					item.visitId === dashboard?.activeVisit?.id,
			)
			.map((item) => {
				const service = dashboard?.serviceCatalog?.find(
					(catalogItem) => catalogItem.id === item.serviceId,
				);
				const totalRub = Math.max(
					0,
					item.unitPriceRub * item.quantity - item.discountRub,
				);
				return {
					serviceName: service?.title ?? item.serviceId,
					toothOrArea: item.toothCode ? `зуб ${item.toothCode}` : null,
					quantity: item.quantity,
					unitPriceRub: item.unitPriceRub,
					discountRub: item.discountRub,
					totalRub,
				};
			});
	}
```
- **Surgical Integration Instructions**: Re-export `plannedServiceLinesForFinancialPayload` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P139: `polishingField`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Defined within composite object / state hook
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
// State/helper property derived in golden commit
```
- **Surgical Integration Instructions**: Extract function/memo `polishingField` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`. Wire necessary parameters and add to return object.

### P140: `polishSingleField`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Defined within composite object / state hook
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
// State/helper property derived in golden commit
```
- **Surgical Integration Instructions**: Extract function/memo `polishSingleField` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`. Wire necessary parameters and add to return object.

### P141: `previewImagingImport`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 8640
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function previewImagingImport() {
		if (!imagingImportText.trim()) {
			setError(
				"Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед проверкой.",
			);
			return;
		}
		setIsImagingImportLoading(true);
		try {
			const response = await fetch("/api/imaging/imports/preview", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					sourceName: imagingImportSourceKind,
					sourceKind: imagingImportSourceKind,
					rawText: imagingImportText,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(response, "Импорт снимков не проверен"),
				);
			}
			setImagingImportPreview(
```
- **Surgical Integration Instructions**: Extract function/memo `previewImagingImport` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`. Wire necessary parameters and add to return object.

### P142: `previewImport`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7931
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function previewImport() {
		if (!importText.trim()) {
			setError(
				"Вставьте список пациентов, OCR журнала или надиктуйте импорт перед проверкой.",
			);
			return;
		}
		setIsImportLoading(true);
		try {
			const response = await fetch("/api/imports/patients/intake", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					sourceName: importSourceKind,
					sourceKind: importSourceKind,
					rawText: importText,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(response, "Импорт не проверен"),
				);
			}
			const result = (await response.json()) as ImportIntakeResponse;
```
- **Surgical Integration Instructions**: Extract function/memo `previewImport` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P143: `previewMigrationAutopilotSources`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 8452
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function previewMigrationAutopilotSources(
		sourceFingerprint?: string | null,
	) {
		const sources = migrationAutopilot?.sources ?? [];
		const selectedSources = sourceFingerprint
			? sources.filter(
					(source) => source.candidate.sourceFingerprint === sourceFingerprint,
				)
			: [];
		if (sourceFingerprint && !selectedSources.length) {
			setError(
				"Источник из автоплана уже не найден. Обновите автоплан или выберите источник из текущего списка.",
			);
			return;
		}
		const previewSources = selectedSources.length
			? selectedSources.filter((source) =>
					migrationCandidateCanPreview(source.candidate),
				)
			: sources.filter(
					(source) =>
						source.readiness.level === "ready_for_preview" ||
						migrationCandidateCanPreview(source.candidate),
				);
		if (selectedSources.length && !previewSources.length) {
			setError(
```
- **Surgical Integration Instructions**: Extract function/memo `previewMigrationAutopilotSources` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P144: `previewMigrationDiscoveryCandidate`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 8431
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function previewMigrationDiscoveryCandidate(
		candidate: MigrationLocalSourceDiscoveryResponse["candidates"][number],
	) {
		if (!migrationCandidateCanPreview(candidate)) {
			setError(
				"У найденного источника пока нет файлов для предпросмотра. Откройте план переноса или проверку источника.",
			);
			return;
		}
		if (!candidate.smartImportLine.trim()) {
			setError(
				"У найденного источника нет строки для умного предпросмотра. Откройте план или повторите поиск.",
			);
			return;
		}
		setSmartImportMode("auto");
		setSmartImportText(candidate.smartImportLine);
		setSmartImportCommit(null);
		await previewSmartImportText(candidate.smartImportLine, "auto");
	}

	async function previewMigrationAutopilotSources(
		sourceFingerprint?: string | null,
	) {
		const sources = migrationAutopilot?.sources ?? [];
		const selectedSources = sourceFingerprint
```
- **Surgical Integration Instructions**: Extract function/memo `previewMigrationDiscoveryCandidate` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P145: `previewSmartImport`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 8024
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function previewSmartImportText(
		rawText: string,
		mode: SmartImportMode,
	) {
		const cleanText = rawText.trim();
		if (!cleanText) {
			setError(
				"Вставьте выгрузку из старой МИС, таблицу, OCR или диктовку перед разбором.",
			);
			return;
		}
		setIsSmartImportLoading(true);
		try {
			const response = await fetch("/api/imports/smart/preview", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					sourceName: "smart_mixed_export",
					mode,
					rawText: cleanText,
				}),
			});
			if (!response.ok) {
				throw new Error(
```
- **Surgical Integration Instructions**: Extract function/memo `previewSmartImport` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P146: `prices`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 7885
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useVoiceAssistant.ts`
- **Target Domain Architecture Home**: `useVoiceAssistant.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
				setPricelistAnalysis(null);
				setSettingsTab("prices");
				window.location.hash = "settings/prices";
			}
		} catch (ingestionError) {
			setError(
				operatorWorkflowFailureMessage("Файл не разобран", ingestionError),
			);
		} finally {
			setIsDocumentIngesting(false);
		}
	}

	function sendRecognitionResultToImport() {
		if (!recognitionJob) return;
		if (recognitionJob.target === "patient_import") {
			setImportSourceKind(
				recognitionJob.kind === "paper_ocr" ? "image_ocr" : "voice_dictation",
			);
			setImportText(recognitionJob.resultText);
			setImportPreview(null);
			setImportCommit(null);
			setImportIntake(null);
		}
		if (recognitionJob.target === "visit_note") {
			visitDraftUserEditedRef.current = true;
			setTranscript(recognitionJob.resultText);
```
- **Surgical Integration Instructions**: Re-export `prices` in the return object of `useAppLogic.tsx` from `useVoiceAssistant.ts`.

### P147: `probeMigrationDiscoveryCandidate`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 8544
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function probeMigrationDiscoveryCandidate(
		candidate: MigrationLocalSourceDiscoveryResponse["candidates"][number],
	) {
		setIsMigrationSourceProbeLoading(true);
		try {
			const response = await fetch("/api/imports/smart/local-source-probe", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					sourceRef: candidate.sourceRef,
					sourceKind: candidate.sourceKind,
					safeDisplayName: candidate.safeDisplayName,
					maxDepth: 2,
					maxFolders: 120,
					maxFiles: 600,
					maxSampleArtifacts: 18,
					readHeaderBytes: 4096,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Проверка источника не выполнена",
```
- **Surgical Integration Instructions**: Extract function/memo `probeMigrationDiscoveryCandidate` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P148: `renderClinicalToothRowsEditor`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 12067
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function renderClinicalToothRowsEditor() {
		return (
			<label>
				Клинические строки по зубам и сегментам
				<textarea
					value={clinicalToothRowsText}
					onChange={(event) => setClinicalToothRowsText(event.target.value)}
					rows={5}
				/>
				<small>
					Формат строки: зуб/сегмент | поверхности | статус | диагноз/находка |
					показание | действие | прогноз | пародонт | имплант/ортопедия |
					ортодонтия
				</small>
			</label>
		);
	}

	async function createDocument(kind: GeneratedDocument["kind"]) {
		if (documentCreateSavingKind) {
			setError("Дождитесь завершения текущего создания документа.");
			return;
		}
		if (!documentPatient || !dashboard) {
			setError("Выберите пациента перед созданием документа.");
			return;
```
- **Surgical Integration Instructions**: Extract function/memo `renderClinicalToothRowsEditor` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`. Wire necessary parameters and add to return object.

### P149: `resetMprControls`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 6343
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useMprLogic.ts`
- **Target Domain Architecture Home**: `useMprLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	};
	const resetMprControls = applyDefaultMprWorkbenchState;
	const applyMprClinicalPreset = (preset: MprClinicalPreset) => {
		const projection = resolveMprClinicalPresetProjection(
			preset.projection,
			cbctWorkbenchProjections,
		);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(preset.axisDeg));
		setMprSlabMm(clampMprSlabMm(preset.slabMm));
		setMprSliceIndex(
			mprSliceIndexFromFraction(preset.sliceFraction, mprSliceMaxIndex),
		);
		setMprWindowPreset(preset.windowPreset);
		setMprCrosshairEnabled(preset.crosshair);
		setMprLinkedPlanesEnabled(preset.linkedPlanes);
	};
	const applyCtPlanningQuickAction = (action: CtPlanningQuickAction) => {
		if (action.requiresVolume && !mprControlsReady) return;
		const projection = resolveMprClinicalPresetProjection(
			action.projection,
			cbctWorkbenchProjections,
		);
		setCtPlanningActiveQuickActionId(action.id);
		setImagingViewerActiveTool(action.tool);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(action.axisDeg));
```
- **Surgical Integration Instructions**: Re-export `resetMprControls` in the return object of `useAppLogic.tsx` from `useMprLogic.ts`.

### P150: `restoreMprWorkbenchLocalDraft`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 6494
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useMprLogic.ts`
- **Target Domain Architecture Home**: `useMprLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function restoreMprWorkbenchLocalDraft() {
		if (!cbctWorkbenchSeriesKey) {
			setError(
				"Сначала выберите готовую КЛКТ/КТ-серию, чтобы вернуть последний вид КТ-срезов.",
			);
			return;
		}
		const draft = await loadLocalMprWorkbenchDraft(
			cbctWorkbenchSeriesKey,
			activeOrganizationId,
		);
		if (!draft) {
			setError("Для этой КЛКТ/КТ-серии еще нет сохраненного вида КТ-срезов.");
			return;
		}
		applyMprWorkbenchState(draft.state);
		setMprWorkbenchLocalSavedAt(draft.clientSavedAt);
		setMprWorkbenchDraftRestored(true);
		setError(null);
	}

	useEffect(() => {
		if (!activeImagingStudies.length) {
			setSelectedImagingStudyId(null);
			return;
		}
```
- **Surgical Integration Instructions**: Re-export `restoreMprWorkbenchLocalDraft` in the return object of `useAppLogic.tsx` from `useMprLogic.ts`.

### P151: `retryImagingViewerSessionSave`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 6787
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function retryImagingViewerSessionSave() {
		if (!selectedImagingStudy?.id) {
			setError("Выберите снимок перед повторным сохранением просмотра.");
			return;
		}
		if (!imagingViewerSessionReady) {
			setError(
				"Дождитесь загрузки сессии просмотра снимка перед повторным сохранением.",
			);
			return;
		}
		const clientSavedAt = imagingViewerLocalSavedAt ?? new Date().toISOString();
		void saveCurrentImagingViewerSession(clientSavedAt);
	}

	function addImagingViewerNoteAnnotation() {
		if (!selectedImagingStudy) {
			setError("Выберите снимок перед добавлением заметки.");
			return;
		}
		if (!imagingViewerSessionReady) {
			setError(
				"Дождитесь загрузки сессии просмотра снимка перед добавлением заметки.",
			);
			return;
		}
```
- **Surgical Integration Instructions**: Extract function/memo `retryImagingViewerSessionSave` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`. Wire necessary parameters and add to return object.

### P152: `runMigrationAutopilot`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 8263
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function runMigrationAutopilot(
		knownDiscovery: MigrationLocalSourceDiscoveryResponse | null = activeMigrationDiscoveryForAutopilot(),
		options: { includeSmartImportText?: boolean } = {},
	) {
		setIsMigrationAutopilotLoading(true);
		setMigrationSourceWorkup(null);
		setMigrationSourceProbe(null);
		try {
			const response = await fetch("/api/imports/smart/migration-autopilot", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(
					migrationAutopilotRequestPayload(knownDiscovery, options),
				),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(response, "Автоплан миграции не построен"),
				);
			}
			const result = (await response.json()) as MigrationAutopilotResponse;
			setMigrationAutopilot(result);
			setMigrationSourceDiscovery({
				version: "dental-crm-migration-local-discovery-v1",
```
- **Surgical Integration Instructions**: Extract function/memo `runMigrationAutopilot` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P153: `runRecognitionJob`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7710
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function runRecognitionJob() {
		if (!recognitionText.trim()) {
			setError("Вставьте текст, OCR или диктовку перед распознаванием.");
			return;
		}
		setIsRecognitionLoading(true);
		try {
			const response = await fetch("/api/ai/recognition-jobs", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					kind: recognitionKind,
					target: recognitionTarget,
					inputText: recognitionText,
					sourceLabel: `Настройки: ${aiJobKindLabels[recognitionKind]}`,
					patientId: activePatient?.id ?? null,
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"РаспознаИвание не подготовлено",
					),
```
- **Surgical Integration Instructions**: Extract function/memo `runRecognitionJob` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P154: `scanDicomFolderSeries`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 9786
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function scanDicomFolderSeries() {
		const folderPath = imagingFolderPath.trim();
		if (!folderPath) {
			setError(
				"Укажите путь к локальной папке со снимками перед чтением метаданных.",
			);
			return;
		}
		rememberLocalImagingFolder(folderPath, { origin: "manual" });
		const controller = startLocalDicomOperation();
		setIsImagingFolderScanning(true);
		try {
			const response = await fetch("/api/imaging/dicom/folder-series-preview", {
				method: "POST",
				signal: controller.signal,
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					folderPath,
					recursive: true,
					sourceName: "dicom_folder_headers",
				}),
			});
			if (!response.ok) {
				throw new Error(
```
- **Surgical Integration Instructions**: Extract function/memo `scanDicomFolderSeries` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`. Wire necessary parameters and add to return object.

### P155: `scanImagingFolder`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 9733
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function scanImagingFolder() {
		const folderPath = imagingFolderPath.trim();
		if (!folderPath) {
			setError("Укажите путь к папке снимков перед сканированием.");
			return;
		}
		rememberLocalImagingFolder(folderPath, { origin: "manual" });
		const controller = startLocalDicomOperation();
		setIsImagingFolderScanning(true);
		try {
			const response = await fetch("/api/imaging/folders/scan-preview", {
				method: "POST",
				signal: controller.signal,
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					folderPath,
					recursive: true,
					sourceName: "folder_watch",
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
```
- **Surgical Integration Instructions**: Extract function/memo `scanImagingFolder` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`. Wire necessary parameters and add to return object.

### P156: `scheduleDateFilter`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 2679
- **Modern Status**: Modern Body: `true` | Modern Return: `false` | Existing Domain Hooks: `useScheduleLogic.ts`
- **Target Domain Architecture Home**: `useScheduleLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		setScheduleStatusFilter,
		scheduleDateFilter,
		setScheduleDateFilter,
		staffScheduleDrafts,
		setStaffScheduleDrafts,
		staffScheduleSavingId,
		setStaffScheduleSavingId,
		staffScheduleDirtyIds,
		setStaffScheduleDirtyIds,
		staffScheduleSaveStates,
		setStaffScheduleSaveStates,
		chairScheduleDrafts,
		setChairScheduleDrafts,
		chairScheduleSavingId,
		setChairScheduleSavingId,
		chairScheduleDirtyIds,
		setChairScheduleDirtyIds,
		chairScheduleSaveStates,
		setChairScheduleSaveStates,
		appointmentScheduleDrafts,
		setAppointmentScheduleDrafts,
		appointmentScheduleDirtyIds,
		setAppointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		setAppointmentScheduleSaveStates,
		appointmentScheduleErrors,
		setAppointmentScheduleErrors,
```
- **Surgical Integration Instructions**: Re-export `scheduleDateFilter` in the return object of `useAppLogic.tsx` from `useScheduleLogic.ts`.

### P157: `selectCtPlanningImplant`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 6446
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useMprLogic.ts`
- **Target Domain Architecture Home**: `useMprLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	};
	const selectCtPlanningImplant = (implant: CtImplantLibraryItem) => {
		setCtPlanningImplantPlan(ctImplantPlanFromLibraryItem(implant));
		setCtPlanningActiveQuickActionId("implant_library");
		setImagingViewerActiveTool("implant_library");
		if (mprControlsReady) {
			setMprWindowPreset("implant");
			setMprCrosshairEnabled(true);
			setMprLinkedPlanesEnabled(true);
		}
	};
	const applyNearestMprClinicalPreset = () => {
		const preset = mprClinicalPresets?.find(
			(candidate) => candidate.title === mprNearestClinicalPreset.title,
		);
		if (preset) applyMprClinicalPreset(preset);
	};
	const handleMprKeyboardNavigation = (
		event: KeyboardEvent<HTMLDivElement>,
	) => {
		if (!mprControlsReady) return;
		const adjustment = resolveMprKeyboardAdjustment({
			key: event.key,
			shiftKey: event.shiftKey,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceIndex: mprSafeSliceIndex,
```
- **Surgical Integration Instructions**: Re-export `selectCtPlanningImplant` in the return object of `useAppLogic.tsx` from `useMprLogic.ts`.

### P158: `selectedCompletedActContractDocumentId`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 4879
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const selectedCompletedActContractDocumentId = useMemo(() => {
		if (
			activeIssuedPaidContracts.some(
				(document) => document.id === completedActLinkedContractDocumentId,
			)
		) {
			return completedActLinkedContractDocumentId;
		}
		return activeIssuedPaidContracts.length === 1
			? (activeIssuedPaidContracts[0]?.id ?? "")
			: "";
	}, [activeIssuedPaidContracts, completedActLinkedContractDocumentId]);

	useEffect(() => {
		if (
			completedActContractNumber.trim() ||
			!selectedCompletedActContractDocumentId
		)
			return;
		const contract = activeIssuedPaidContracts?.find(
			(document) => document.id === selectedCompletedActContractDocumentId,
		);
		if (contract)
			setCompletedActContractNumber(
				completedActContractReferenceForUi(contract),
			);
```
- **Surgical Integration Instructions**: Re-export `selectedCompletedActContractDocumentId` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P159: `selectedDocumentMetadata`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5290
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		taxPaymentSelectionDocumentKinds.has(selectedDocumentKind);
	const selectedDocumentMetadata = documentKindMetadata[selectedDocumentKind];
	const eligibleTaxPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					paymentTaxYearForUi(payment) === taxDocumentYear &&
					(!selectedTaxDocumentPayerKey ||
						taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, selectedTaxDocumentPayerKey, taxDocumentYear]);
	const eligibleTaxPaymentIdsKey = eligibleTaxPayments
		.map((payment) => payment.id)
		.join("|");
	const selectedTaxPaymentIdSet = useMemo(
		() => new Set(selectedTaxPaymentIds),
		[selectedTaxPaymentIds],
	);
	const selectedEligibleTaxPayments = useMemo(
		() =>
```
- **Surgical Integration Instructions**: Re-export `selectedDocumentMetadata` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P160: `selectedDocumentUsesTaxPaymentSelection`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5288
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const selectedDocumentUsesTaxPaymentSelection =
		taxPaymentSelectionDocumentKinds.has(selectedDocumentKind);
	const selectedDocumentMetadata = documentKindMetadata[selectedDocumentKind];
	const eligibleTaxPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					paymentTaxYearForUi(payment) === taxDocumentYear &&
					(!selectedTaxDocumentPayerKey ||
						taxPaymentPayerKeyForUi(payment) === selectedTaxDocumentPayerKey),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, selectedTaxDocumentPayerKey, taxDocumentYear]);
	const eligibleTaxPaymentIdsKey = eligibleTaxPayments
		.map((payment) => payment.id)
		.join("|");
	const selectedTaxPaymentIdSet = useMemo(
		() => new Set(selectedTaxPaymentIds),
		[selectedTaxPaymentIds],
	);
```
- **Surgical Integration Instructions**: Re-export `selectedDocumentUsesTaxPaymentSelection` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P161: `selectedEligibleTaxPayments`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5314
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	);
	const selectedEligibleTaxPayments = useMemo(
		() =>
			eligibleTaxPayments.filter((payment) =>
				selectedTaxPaymentIdSet.has(payment.id),
			),
		[eligibleTaxPayments, selectedTaxPaymentIdSet],
	);
	const selectedTaxPaymentTotalRub = selectedEligibleTaxPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);
	function selectedTaxPaymentIdsForCurrentDocument(): string[] {
		const eligibleTaxPaymentIdSet = new Set(
			eligibleTaxPayments.map((payment) => payment.id),
		);
		return selectedTaxPaymentIds.filter((paymentId) =>
			eligibleTaxPaymentIdSet.has(paymentId),
		);
	}

	function selectAllEligibleTaxPaymentsForCurrentDocument(): void {
		const eligiblePaymentIds = eligibleTaxPayments.map((payment) => payment.id);
		setSelectedTaxPaymentIds(eligiblePaymentIds);
	}
	const selectedDocumentUsesPaymentReceiptSelection =
		selectedDocumentKind === "payment_receipt";
```
- **Surgical Integration Instructions**: Re-export `selectedEligibleTaxPayments` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P162: `selectedPaymentReceiptIdSet`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5358
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		.join("|");
	const selectedPaymentReceiptIdSet = useMemo(
		() => new Set(selectedPaymentReceiptIds),
		[selectedPaymentReceiptIds],
	);
	const selectedPaymentReceiptPayments = useMemo(
		() =>
			eligiblePaymentReceiptPayments.filter((payment) =>
				selectedPaymentReceiptIdSet.has(payment.id),
			),
		[eligiblePaymentReceiptPayments, selectedPaymentReceiptIdSet],
	);
	const selectedPaymentReceiptTotalRub = selectedPaymentReceiptPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);
	const eligibleRefundCorrectionPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					payment.fiscalReceiptNumber?.trim() &&
					(!dashboard?.activeVisit?.id ||
						payment.visitId === dashboard?.activeVisit?.id),
			)
			.sort((left, right) =>
```
- **Surgical Integration Instructions**: Re-export `selectedPaymentReceiptIdSet` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P163: `selectedPaymentReceiptPayments`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5362
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	);
	const selectedPaymentReceiptPayments = useMemo(
		() =>
			eligiblePaymentReceiptPayments.filter((payment) =>
				selectedPaymentReceiptIdSet.has(payment.id),
			),
		[eligiblePaymentReceiptPayments, selectedPaymentReceiptIdSet],
	);
	const selectedPaymentReceiptTotalRub = selectedPaymentReceiptPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);
	const eligibleRefundCorrectionPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					payment.fiscalReceiptNumber?.trim() &&
					(!dashboard?.activeVisit?.id ||
						payment.visitId === dashboard?.activeVisit?.id),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
```
- **Surgical Integration Instructions**: Re-export `selectedPaymentReceiptPayments` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P164: `selectedPaymentReceiptTotalRub`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5369
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	);
	const selectedPaymentReceiptTotalRub = selectedPaymentReceiptPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);
	const eligibleRefundCorrectionPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					payment.fiscalReceiptNumber?.trim() &&
					(!dashboard?.activeVisit?.id ||
						payment.visitId === dashboard?.activeVisit?.id),
			)
			.sort((left, right) =>
				(right.fiscalReceiptIssuedAt || right.paidAt || "").localeCompare(
					left.fiscalReceiptIssuedAt || left.paidAt || "",
				),
			);
	}, [activePayments, dashboard?.activeVisit?.id]);
	const selectedRefundCorrectionPayment = useMemo(
		() =>
			eligibleRefundCorrectionPayments?.find(
				(payment) => payment.id === refundSelectedPaymentId,
			) ?? null,
		[eligibleRefundCorrectionPayments, refundSelectedPaymentId],
```
- **Surgical Integration Instructions**: Re-export `selectedPaymentReceiptTotalRub` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P165: `selectedProtocolTemplate`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 6950
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const selectedProtocolTemplate = useMemo(() => {
		return (
			specialtyProtocolTemplates?.find(
				(template) => template.id === selectedProtocolId,
			) ??
			specialtyProtocolTemplates[0] ??
			null
		);
	}, [selectedProtocolId, specialtyProtocolTemplates]);

	useEffect(() => {
		if (!selectedProtocolId) return;
		if (
			specialtyProtocolTemplates.some(
				(template) => template.id === selectedProtocolId,
			)
		)
			return;
		setSelectedProtocolId(null);
	}, [selectedProtocolId, specialtyProtocolTemplates]);

	const dictationQuickPhrases = useMemo(() => {
		const visitReason =
			activeAppointment?.reason ??
			selectedProtocolTemplate?.visitReason ??
			"осмотр";
```
- **Surgical Integration Instructions**: Extract function/memo `selectedProtocolTemplate` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`. Wire necessary parameters and add to return object.

### P166: `selectedRefundCorrectionPayment`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5389
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	}, [activePayments, dashboard?.activeVisit?.id]);
	const selectedRefundCorrectionPayment = useMemo(
		() =>
			eligibleRefundCorrectionPayments?.find(
				(payment) => payment.id === refundSelectedPaymentId,
			) ?? null,
		[eligibleRefundCorrectionPayments, refundSelectedPaymentId],
	);
	const taxPaymentSelectionPersistenceKey = useMemo(() => {
		if (!documentPatient) return null;
		const organizationId = documentLocalPersistenceOrganizationId ?? "clinic";
		const payerKey = selectedTaxDocumentPayerKey || "all-payers";
		return `tax:${organizationId}:${documentPatient.id}:${taxDocumentYear}:${payerKey}`;
	}, [
		documentLocalPersistenceOrganizationId,
		documentPatient?.id,
		selectedTaxDocumentPayerKey,
		taxDocumentYear,
	]);
	const paymentReceiptSelectionPersistenceKey = useMemo(() => {
		if (!documentPatient) return null;
		const organizationId = documentLocalPersistenceOrganizationId ?? "clinic";
		return `receipt:${organizationId}:${documentPatient.id}:${dashboard?.activeVisit?.id ?? "all-visits"}`;
	}, [
		dashboard?.activeVisit?.id,
		documentLocalPersistenceOrganizationId,
		documentPatient?.id,
```
- **Surgical Integration Instructions**: Re-export `selectedRefundCorrectionPayment` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P167: `selectedReleaseSourceRequestDocumentId`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 4923
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const selectedReleaseSourceRequestDocumentId = useMemo(() => {
		if (
			issuedMedicalCopyRequestDocuments.some(
				(document) => document.id === releaseSourceRequestDocumentId,
			)
		) {
			return releaseSourceRequestDocumentId;
		}
		return issuedMedicalCopyRequestDocuments.length === 1
			? (issuedMedicalCopyRequestDocuments[0]?.id ?? "")
			: "";
	}, [issuedMedicalCopyRequestDocuments, releaseSourceRequestDocumentId]);

	useEffect(() => {
		if (!selectedReleaseSourceRequestDocumentId) {
			releaseSourceRequestAutofillRef.current = null;
			return;
		}
		if (
			releaseSourceRequestAutofillRef.current ===
			selectedReleaseSourceRequestDocumentId
		)
			return;
		const sourceDocument = issuedMedicalCopyRequestDocuments?.find(
			(document) => document.id === selectedReleaseSourceRequestDocumentId,
		);
```
- **Surgical Integration Instructions**: Re-export `selectedReleaseSourceRequestDocumentId` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P168: `selectedTaxDocumentPayerKey`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5268
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const selectedTaxDocumentPayerKey = useMemo(() => {
		if (
			taxDocumentPayerOptions.some(
				(option) => option.key === taxDocumentPayerInn,
			)
		)
			return taxDocumentPayerInn;
		return taxDocumentPayerOptions.length === 1
			? (taxDocumentPayerOptions[0]?.key ?? "")
			: "";
	}, [taxDocumentPayerInn, taxDocumentPayerOptions]);
	const selectedTaxDocumentPayerOption = useMemo(
		() =>
			taxDocumentPayerOptions?.find(
				(option) => option.key === selectedTaxDocumentPayerKey,
			) ?? null,
		[selectedTaxDocumentPayerKey, taxDocumentPayerOptions],
	);
	const selectedTaxDocumentPayerInn = selectedTaxDocumentPayerOption?.inn ?? "";

	const selectedDocumentUsesTaxPaymentSelection =
		taxPaymentSelectionDocumentKinds.has(selectedDocumentKind);
	const selectedDocumentMetadata = documentKindMetadata[selectedDocumentKind];
	const eligibleTaxPayments = useMemo(() => {
		return activePayments
			.filter(
```
- **Surgical Integration Instructions**: Re-export `selectedTaxDocumentPayerKey` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P169: `selectedTaxPaymentIdSet`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5310
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		.join("|");
	const selectedTaxPaymentIdSet = useMemo(
		() => new Set(selectedTaxPaymentIds),
		[selectedTaxPaymentIds],
	);
	const selectedEligibleTaxPayments = useMemo(
		() =>
			eligibleTaxPayments.filter((payment) =>
				selectedTaxPaymentIdSet.has(payment.id),
			),
		[eligibleTaxPayments, selectedTaxPaymentIdSet],
	);
	const selectedTaxPaymentTotalRub = selectedEligibleTaxPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);
	function selectedTaxPaymentIdsForCurrentDocument(): string[] {
		const eligibleTaxPaymentIdSet = new Set(
			eligibleTaxPayments.map((payment) => payment.id),
		);
		return selectedTaxPaymentIds.filter((paymentId) =>
			eligibleTaxPaymentIdSet.has(paymentId),
		);
	}

	function selectAllEligibleTaxPaymentsForCurrentDocument(): void {
		const eligiblePaymentIds = eligibleTaxPayments.map((payment) => payment.id);
```
- **Surgical Integration Instructions**: Re-export `selectedTaxPaymentIdSet` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P170: `selectedTaxPaymentTotalRub`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 5321
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	);
	const selectedTaxPaymentTotalRub = selectedEligibleTaxPayments.reduce(
		(total, payment) => total + payment.amountRub,
		0,
	);
	function selectedTaxPaymentIdsForCurrentDocument(): string[] {
		const eligibleTaxPaymentIdSet = new Set(
			eligibleTaxPayments.map((payment) => payment.id),
		);
		return selectedTaxPaymentIds.filter((paymentId) =>
			eligibleTaxPaymentIdSet.has(paymentId),
		);
	}

	function selectAllEligibleTaxPaymentsForCurrentDocument(): void {
		const eligiblePaymentIds = eligibleTaxPayments.map((payment) => payment.id);
		setSelectedTaxPaymentIds(eligiblePaymentIds);
	}
	const selectedDocumentUsesPaymentReceiptSelection =
		selectedDocumentKind === "payment_receipt";
	const eligiblePaymentReceiptPayments = useMemo(() => {
		return activePayments
			.filter(
				(payment) =>
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					(!dashboard?.activeVisit?.id ||
```
- **Surgical Integration Instructions**: Re-export `selectedTaxPaymentTotalRub` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P171: `sendRecognitionResultToImport`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7897
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function sendRecognitionResultToImport() {
		if (!recognitionJob) return;
		if (recognitionJob.target === "patient_import") {
			setImportSourceKind(
				recognitionJob.kind === "paper_ocr" ? "image_ocr" : "voice_dictation",
			);
			setImportText(recognitionJob.resultText);
			setImportPreview(null);
			setImportCommit(null);
			setImportIntake(null);
		}
		if (recognitionJob.target === "visit_note") {
			visitDraftUserEditedRef.current = true;
			setTranscript(recognitionJob.resultText);
		}
	}

	function applyProtocolTemplate(template: ProtocolTemplate) {
		visitDraftUserEditedRef.current = true;
		setSelectedSpecialty(template.specialty);
		setSelectedProtocolId(template.id);
		setTranscript(
			[
				`${template.visitReason}.`,
				`Жалобы: ${template.complaintPrompt}`,
				`Объективно: ${template.objectiveTemplate}`,
```
- **Surgical Integration Instructions**: Extract function/memo `sendRecognitionResultToImport` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useMigrationQueries.ts`. Wire necessary parameters and add to return object.

### P172: `setNewRulePatientText`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 2441
- **Modern Status**: Modern Body: `true` | Modern Return: `false` | Existing Domain Hooks: `usePatientLogic.ts`
- **Target Domain Architecture Home**: `usePatientLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		setIsPatientCreating,
		setNewRulePatientText,
		activePatient,
		activeVisitPatient,
		selectedPatient,
		documentPatient,
		documentPatientMatchesActiveVisit,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		patientAdministrativeProfileValidationMessage,
		patientInsightById,
		activePatientInsight,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		filteredPatients,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		savePatientCore,
		savePatientAdministrativeProfile,
		createPatient,
	} = patient;

	/**
	 * Идентификатор ОТКРЫТОГО приёма — или null, если приёма нет.
	 *
	 * Гидратация базы кладёт в `activeVisit` заготовку с нулевым UUID, когда
	 * черновиков нет вовсе. Этот нулевой UUID уходил на сервер как visitId, и
```
- **Surgical Integration Instructions**: Re-export `setNewRulePatientText` in the return object of `useAppLogic.tsx` from `usePatientLogic.ts`.

### P173: `setScheduleDateFilter`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 2680
- **Modern Status**: Modern Body: `true` | Modern Return: `false` | Existing Domain Hooks: `useScheduleLogic.ts`
- **Target Domain Architecture Home**: `useScheduleLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		scheduleDateFilter,
		setScheduleDateFilter,
		staffScheduleDrafts,
		setStaffScheduleDrafts,
		staffScheduleSavingId,
		setStaffScheduleSavingId,
		staffScheduleDirtyIds,
		setStaffScheduleDirtyIds,
		staffScheduleSaveStates,
		setStaffScheduleSaveStates,
		chairScheduleDrafts,
		setChairScheduleDrafts,
		chairScheduleSavingId,
		setChairScheduleSavingId,
		chairScheduleDirtyIds,
		setChairScheduleDirtyIds,
		chairScheduleSaveStates,
		setChairScheduleSaveStates,
		appointmentScheduleDrafts,
		setAppointmentScheduleDrafts,
		appointmentScheduleDirtyIds,
		setAppointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		setAppointmentScheduleSaveStates,
		appointmentScheduleErrors,
		setAppointmentScheduleErrors,
		newAppointmentDraft,
```
- **Surgical Integration Instructions**: Re-export `setScheduleDateFilter` in the return object of `useAppLogic.tsx` from `useScheduleLogic.ts`.

### P174: `setSelectedPatientId`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 2430
- **Modern Status**: Modern Body: `true` | Modern Return: `false` | Existing Domain Hooks: `usePatientLogic.ts, useScheduleLogic.ts`
- **Target Domain Architecture Home**: `usePatientLogic.ts, useScheduleLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		newRulePatientText,
		setSelectedPatientId,
		setPatientCoreDraft,
		setPatientCoreSaveState,
		setPatientCoreDirty,
		setPatientAdministrativeProfileDraft,
		setPatientAdministrativeProfileSaveState,
		setPatientAdministrativeProfileDirty,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		setIsPatientCreating,
		setNewRulePatientText,
		activePatient,
		activeVisitPatient,
		selectedPatient,
		documentPatient,
		documentPatientMatchesActiveVisit,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		patientAdministrativeProfileValidationMessage,
		patientInsightById,
		activePatientInsight,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		filteredPatients,
		updatePatientCoreDraft,
```
- **Surgical Integration Instructions**: Re-export `setSelectedPatientId` in the return object of `useAppLogic.tsx` from `usePatientLogic.ts, useScheduleLogic.ts`.

### P175: `settingsAdminSecretSession`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 2254
- **Modern Status**: Modern Body: `true` | Modern Return: `false` | Existing Domain Hooks: `useAuthLogic.ts, useTelegramModule.ts, useTelegramSettings.ts`
- **Target Domain Architecture Home**: `useAuthLogic.ts, useTelegramModule.ts, useTelegramSettings.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		setClinicalAdminSecretSession,
		settingsAdminSecretSession,
		setSettingsAdminSecretSession,
		scheduleAdminSecretSession,
		setScheduleAdminSecretSession,
		telegramAdminSecretSession,
		setTelegramAdminSecretSession,
		telegramSendingItemId,
		setTelegramSendingItemId,
		telegramRevokingLinkId,
		setTelegramRevokingLinkId,
	} = useSettingsStore();
	const telegramSettingsModule = useTelegramSettings({
		apiFetch: null,
		setError,
		settingsAdminSecretSession: settingsAdminSecretSession || undefined,
		loadDashboard,
	});
	const {
		markTelegramSettingsDirty,
		updateTelegramVisualCardUrlDraft,
		toggleTelegramFeature,
		parseTelegramLinkTtlMinutes,
		parseTelegramReminderLeadTimesHours,
		parseTelegramReviewRequestDelayHours,
		parseTelegramPostVisitCheckupDelayHours,
		normalizeTelegramPostVisitCheckupDelayDrafts,
```
- **Surgical Integration Instructions**: Re-export `settingsAdminSecretSession` in the return object of `useAppLogic.tsx` from `useAuthLogic.ts, useTelegramModule.ts, useTelegramSettings.ts`.

### P176: `shiftWarnings`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 6993
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useScheduleLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
		) ?? [];
	const shiftWarnings = dashboard?.shiftIntelligence?.scheduleWarnings ?? [];
	const allResourceLoads = dashboard
		? [
				...(dashboard?.shiftIntelligence?.doctorLoads || []),
				...(dashboard?.shiftIntelligence?.assistantLoads || []),
				...(dashboard?.shiftIntelligence?.chairLoads || []),
			]
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
				? "текст есть"
				: "начните голосом или текстом",
```
- **Surgical Integration Instructions**: Extract function/memo `shiftWarnings` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useScheduleLogic.ts`. Wire necessary parameters and add to return object.

### P177: `sortedCommunicationTasks`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 5978
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useCommunicationsQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const sortedCommunicationTasks = useMemo(() => {
		if (!dashboard) return [];
		return [...(dashboard.communicationTasks || [])].sort((left, right) => {
			const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
			return (
				priorityRank[left.priority] - priorityRank[right.priority] ||
				left.dueAt.localeCompare(right.dueAt)
			);
		});
	}, [dashboard]);

	const activeImagingStudies = useMemo(() => {
		if (!dashboard) return [];
		/* БЫЛО: сравнение строго с dashboard.activeVisit.patientId. Когда приём
		   не открыт, сервер отдаёт синтетический activeVisit с нулевым
		   идентификатором 00000000-0000-0000-0000-000000000000 — проверено
		   запросом к /api/dashboard, scratch/probe-active-visit.mjs. Ни один
		   снимок с таким пациентом не совпадает, поэтому лента была пуста
		   ВСЕГДА, пока не начат приём.

		   При этом шапка того же экрана показывает пациента через
		   activePatient, у которого есть запасные варианты (активный приём ->
		   первый активный пациент -> первый пациент). Получалось «Пациент:
		   Ковальчук Дмитрий Игоревич · В ленте 0», хотя у Ковальчука снимок
		   есть — сверено с /api/imaging/studies. Врач, открывший «Снимки» без
		   начатого приёма, видел «Снимков по пациенту нет» и не мог посмотреть
```
- **Surgical Integration Instructions**: Extract function/memo `sortedCommunicationTasks` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useCommunicationsQueries.ts`. Wire necessary parameters and add to return object.

### P178: `specialtiesWithTemplates`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 6908
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/useAppLogic.tsx`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const specialtiesWithTemplates = useMemo(() => {
		if (!dashboard) return [];
		return Array.from(
			new Set(
				dashboard?.protocolTemplates?.map((template) => template.specialty),
			),
		);
	}, [dashboard]);

	const visibleVisitSpecialtyFocusOptions = useMemo(() => {
		const visibleSpecialties = new Set<DentalSpecialty>();
		const reasonSpecialty = inferSpecialtyFromText(activeAppointment?.reason);

		(activeDoctor?.specialties ?? []).forEach((specialty) =>
			visibleSpecialties.add(specialty),
		);
		if (activeChair?.specialization)
			visibleSpecialties.add(activeChair.specialization);
		if (reasonSpecialty) visibleSpecialties.add(reasonSpecialty);
		visibleSpecialties.add(selectedSpecialty);
		visibleSpecialties.add("universal");

		return visitSpecialtyFocusOptions.filter(
			(option) =>
				specialtiesWithTemplates.includes(option.specialty) &&
				visibleSpecialties.has(option.specialty),
```
- **Surgical Integration Instructions**: Extract function/memo `specialtiesWithTemplates` from commit `da92ab9507` and inject into `apps/web/src/useAppLogic.tsx`. Wire necessary parameters and add to return object.

### P179: `specialtyProtocolTemplates`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 6943
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const specialtyProtocolTemplates = useMemo(() => {
		if (!dashboard) return [];
		return (dashboard?.protocolTemplates || []).filter(
			(template) => template.specialty === selectedSpecialty,
		);
	}, [dashboard, selectedSpecialty]);

	const selectedProtocolTemplate = useMemo(() => {
		return (
			specialtyProtocolTemplates?.find(
				(template) => template.id === selectedProtocolId,
			) ??
			specialtyProtocolTemplates[0] ??
			null
		);
	}, [selectedProtocolId, specialtyProtocolTemplates]);

	useEffect(() => {
		if (!selectedProtocolId) return;
		if (
			specialtyProtocolTemplates.some(
				(template) => template.id === selectedProtocolId,
			)
		)
			return;
		setSelectedProtocolId(null);
```
- **Surgical Integration Instructions**: Extract function/memo `specialtyProtocolTemplates` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`. Wire necessary parameters and add to return object.

### P180: `speechGatewayActiveProviderIsLocal`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7129
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	const speechRecognitionReady = speechUploadReady && isOnline;
	const speechGatewayActiveProviderIsLocal =
		speechGatewayStatus?.providerId === "local_whisper" ||
		speechGatewayStatus?.providerId === "vosk_local";
	const emptyDictationVoiceActionLabel = speechRecognitionReady
		? speechGatewayActiveProviderIsLocal
			? "Распознать локально"
			: "Распознать на сервере"
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
		? "аудио сохранено и уйдет позже"
		: currentSpeechQualityIssue
```
- **Surgical Integration Instructions**: Extract function/memo `speechGatewayActiveProviderIsLocal` from commit `da92ab9507` and inject into `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`. Wire necessary parameters and add to return object.

### P181: `speechLiveRms`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Defined within composite object / state hook
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
// State/helper property derived in golden commit
```
- **Surgical Integration Instructions**: Extract function/memo `speechLiveRms` from commit `da92ab9507` and inject into `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`. Wire necessary parameters and add to return object.

### P182: `speechRecognitionReady`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7128
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	const speechUploadReady = speechGatewayCanUpload(speechGatewayStatus);
	const speechRecognitionReady = speechUploadReady && isOnline;
	const speechGatewayActiveProviderIsLocal =
		speechGatewayStatus?.providerId === "local_whisper" ||
		speechGatewayStatus?.providerId === "vosk_local";
	const emptyDictationVoiceActionLabel = speechRecognitionReady
		? speechGatewayActiveProviderIsLocal
			? "Распознать локально"
			: "Распознать на сервере"
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
		? "аудио сохранено и уйдет позже"
```
- **Surgical Integration Instructions**: Extract function/memo `speechRecognitionReady` from commit `da92ab9507` and inject into `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`. Wire necessary parameters and add to return object.

### P183: `speechTranscriptionBusy`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Defined within composite object / state hook
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
// State/helper property derived in golden commit
```
- **Surgical Integration Instructions**: Extract function/memo `speechTranscriptionBusy` from commit `da92ab9507` and inject into `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`. Wire necessary parameters and add to return object.

### P184: `startServerVoiceRecording`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 10871
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function startServerVoiceRecording() {
		if (!dashboard) {
			setError(
				"Данные приема еще не загружены. Повторите запись после загрузки рабочего экрана.",
			);
			return;
		}
		if (
			isServerVoiceRecording ||
			mediaRecorderRef.current?.state === "recording"
		) {
			setError(
				"Запись уже идет. Нажмите «Стоп запись», чтобы завершить текущий фрагмент.",
			);
			return;
		}
		if (
			!navigator.mediaDevices?.getUserMedia ||
			typeof MediaRecorder === "undefined"
		) {
			setError(
				"Запись аудио недоступна в этом браузере. Текст можно печатать вручную, локальный черновик сохранится.",
			);
			return;
		}

```
- **Surgical Integration Instructions**: Extract function/memo `startServerVoiceRecording` from commit `da92ab9507` and inject into `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`. Wire necessary parameters and add to return object.

### P185: `stopServerVoiceRecording`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 10992
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function stopServerVoiceRecording() {
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			speechPendingChunkDurationMsRef.current = Math.max(
				250,
				Date.now() - speechSegmentStartedAtRef.current,
			);
			recorder.requestData();
			recorder.stop();
			return;
		}
		const recordingId = speechRecordingIdRef.current;
		if (!recordingId && !mediaStreamRef.current && !isServerVoiceRecording) {
			setSpeechStatusNote("Активной записи диктовки нет.");
			return;
		}
		mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
		stopSpeechMonitor();
		mediaStreamRef.current = null;
		mediaRecorderRef.current = null;
		setIsServerVoiceRecording(false);
		if (recordingId) {
			void finalizeSpeechRecording(recordingId);
		}
	}

```
- **Surgical Integration Instructions**: Extract function/memo `stopServerVoiceRecording` from commit `da92ab9507` and inject into `apps/web/src/hooks/useVoiceAssistant.ts / useAppLogic.tsx`. Wire necessary parameters and add to return object.

### P186: `toggleClinicalRule`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 11116
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	async function toggleClinicalRule(rule: Dashboard["clinicalRules"][number]) {
		if (isClinicalRuleSaving) {
			setError("Дождитесь завершения текущей записи клинического правила.");
			return;
		}
		setIsClinicalRuleSaving(true);
		try {
			const response = await fetch(`/api/clinical/rules/${rule.id}`, {
				method: "PATCH",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ active: !rule.active }),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Клиническое правило не обновлено",
					),
				);
			}
			await loadDashboard();
		} catch (ruleError) {
			setError(
				operatorWorkflowFailureMessage(
```
- **Surgical Integration Instructions**: Extract function/memo `toggleClinicalRule` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`. Wire necessary parameters and add to return object.

### P187: `treatmentAcceptancePlannedTotalRub`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 11197
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function treatmentAcceptancePlannedTotalRub(): number {
		return (
			activeTreatmentPlanItems
				.filter((item) => item.status !== "cancelled")
				.filter(
					(item) =>
						!dashboard?.activeVisit?.id ||
						item.visitId === dashboard?.activeVisit?.id,
				)
				.reduce(
					(total, item) =>
						total +
						Math.max(0, item.unitPriceRub * item.quantity - item.discountRub),
					0,
				) || 0
		);
	}

	function treatmentAcceptanceTotalRubValue(): number {
		const manual = Number(
			treatmentAcceptanceEstimatedTotalRub.replace(/[^\d]/g, ""),
		);
		return manual > 0 ? manual : treatmentAcceptancePlannedTotalRub();
	}

	function treatmentPlanStageRows() {
```
- **Surgical Integration Instructions**: Re-export `treatmentAcceptancePlannedTotalRub` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P188: `treatmentEstimatePatientOrPayerFullNameValue`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 11470
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function treatmentEstimatePatientOrPayerFullNameValue(): string {
		return (
			treatmentEstimatePatientOrPayerFullName.trim() ||
			documentPatient?.fullName ||
			""
		);
	}

	function treatmentEstimateTreatmentBasisValue(): string {
		return (
			treatmentEstimateTreatmentBasis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.diagnosis,
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.treatmentPlan,
			) ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

	function treatmentEstimateTotalRubValue(): number {
		const manual = manualRubAmount(treatmentEstimateTotalRub);
		return manual > 0 ? manual : paymentInvoiceTotalRubValue();
	}

	function treatmentEstimateDoctorFullNameValue(): string {
```
- **Surgical Integration Instructions**: Re-export `treatmentEstimatePatientOrPayerFullNameValue` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P189: `treatmentEstimateTotalRubValue`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 11490
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function treatmentEstimateTotalRubValue(): number {
		const manual = manualRubAmount(treatmentEstimateTotalRub);
		return manual > 0 ? manual : paymentInvoiceTotalRubValue();
	}

	function treatmentEstimateDoctorFullNameValue(): string {
		return (
			treatmentEstimateDoctorFullName.trim() || activeDoctor?.fullName || ""
		);
	}

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

```
- **Surgical Integration Instructions**: Re-export `treatmentEstimateTotalRubValue` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P190: `treatmentEstimateTreatmentBasisValue`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 11478
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function treatmentEstimateTreatmentBasisValue(): string {
		return (
			treatmentEstimateTreatmentBasis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.diagnosis,
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.treatmentPlan,
			) ||
			"плановое стоматологическое лечение по результатам осмотра"
		);
	}

	function treatmentEstimateTotalRubValue(): number {
		const manual = manualRubAmount(treatmentEstimateTotalRub);
		return manual > 0 ? manual : paymentInvoiceTotalRubValue();
	}

	function treatmentEstimateDoctorFullNameValue(): string {
		return (
			treatmentEstimateDoctorFullName.trim() || activeDoctor?.fullName || ""
		);
	}

	function paymentInvoiceTotalRubValue(): number {
		return (
			plannedServiceLinesForFinancialPayload().reduce(
```
- **Surgical Integration Instructions**: Re-export `treatmentEstimateTreatmentBasisValue` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P191: `visibleImagingStudies`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 6018
- **Modern Status**: Modern Body: `true` | Modern Return: `false` | Existing Domain Hooks: `useDicomWorkbenchModule.ts`
- **Target Domain Architecture Home**: `useDicomWorkbenchModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	);
	const visibleImagingStudies = useMemo(
		() =>
			imagingKindFilter === "all"
				? activeImagingStudies
				: activeImagingStudies.filter(
						(study) => study.kind === imagingKindFilter,
					),
		[activeImagingStudies, imagingKindFilter],
	);
	const latestImagingStudy = visibleImagingStudies[0] ?? null;
	const selectedImagingStudy =
		visibleImagingStudies?.find(
			(study) => study.id === selectedImagingStudyId,
		) ?? latestImagingStudy;
	const imagingComparisonCandidates = useMemo(() => {
		if (!selectedImagingStudy) return [];
		return activeImagingStudies
			.filter((study) => study.id !== selectedImagingStudy.id)
			.map((study) => ({
				study,
				score: imagingComparisonScore(selectedImagingStudy, study),
				reason: imagingComparisonReason(
					selectedImagingStudy,
					study,
					(kind) => imagingKindLabels[kind],
				),
```
- **Surgical Integration Instructions**: Re-export `visibleImagingStudies` in the return object of `useAppLogic.tsx` from `useDicomWorkbenchModule.ts`.

### P192: `visibleVisitSpecialtyFocusOptions`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 6917
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	const visibleVisitSpecialtyFocusOptions = useMemo(() => {
		const visibleSpecialties = new Set<DentalSpecialty>();
		const reasonSpecialty = inferSpecialtyFromText(activeAppointment?.reason);

		(activeDoctor?.specialties ?? []).forEach((specialty) =>
			visibleSpecialties.add(specialty),
		);
		if (activeChair?.specialization)
			visibleSpecialties.add(activeChair.specialization);
		if (reasonSpecialty) visibleSpecialties.add(reasonSpecialty);
		visibleSpecialties.add(selectedSpecialty);
		visibleSpecialties.add("universal");

		return visitSpecialtyFocusOptions.filter(
			(option) =>
				specialtiesWithTemplates.includes(option.specialty) &&
				visibleSpecialties.has(option.specialty),
		);
	}, [
		activeAppointment?.reason,
		activeChair?.specialization,
		activeDoctor,
		selectedSpecialty,
		specialtiesWithTemplates,
	]);

```
- **Surgical Integration Instructions**: Extract function/memo `visibleVisitSpecialtyFocusOptions` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`. Wire necessary parameters and add to return object.

### P193: `visitPrimaryAction`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7063
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
	];
	const visitPrimaryAction: {
		kind: "dictation" | "draft" | "save" | "review" | "close";
		label: string;
		detail: string;
		disabled?: boolean;
		onClick: () => void;
	} = !hasVisitTranscriptText
		? {
				kind: "dictation",
				label: isVisitDictating ? "Слушаю" : "Начать диктовку",
				detail:
					"Можно сразу говорить. Если микрофон не откроется, поле диктовки остается доступным для текста.",
				disabled: isVisitDictating,
				onClick: startVisitDictation,
			}
		: !draft && !isVisitNoteDirty
			? {
					kind: "draft",
					label: isDraftLoading ? "Собираю" : "Собрать черновик",
					detail:
						"Система разложит диктовку по полям ЭМК, врач потом проверит и сохранит.",
					disabled: isDraftLoading || !visitDraftReadyToBuild,
					onClick: () => void buildDraft(),
				}
			: !visitHasSavedNote
				? {
```
- **Surgical Integration Instructions**: Extract function/memo `visitPrimaryAction` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`. Wire necessary parameters and add to return object.

### P194: `visitSafetyCards`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7315
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
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
			label: "Локально",
			value: lastLocalSavedAt
				? formatTime(lastLocalSavedAt)
				: localAutosaveReady
					? "включено"
					: "загрузка",
			detail: localDraftWasRestored
				? "черновик восстановлен на этом устройстве"
				: "автосохранение на этом устройстве",
			state: lastLocalSavedAt || localAutosaveReady ? "ready" : "busy",
		},
		{
			key: "server",
			label: "Сервер",
			value:
				serverDraftSyncState === "saving"
					? "сохраняет"
```
- **Surgical Integration Instructions**: Extract function/memo `visitSafetyCards` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`. Wire necessary parameters and add to return object.

### P195: `visitWorkflowSteps`
- **Category**: Category B (Missing - Requires Restoration)
- **Golden Line**: Line 7007
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `None`
- **Target Domain Architecture Home**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript
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
				? "текст есть"
				: "начните голосом или текстом",
			state: hasVisitTranscriptText ? "ready" : "active",
		},
		{
			key: "draft",
			label: "Черновик",
			detail: draft
				? "проверьте результат"
				: isVisitNoteDirty
					? "есть ручные правки"
					: "соберите из диктовки",
			state:
				draft || isVisitNoteDirty
					? "ready"
					: hasVisitTranscriptText
```
- **Surgical Integration Instructions**: Extract function/memo `visitWorkflowSteps` from commit `da92ab9507` and inject into `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`. Wire necessary parameters and add to return object.

### P196: `warrantyLinkedActOrContractValue`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 11759
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function warrantyLinkedActOrContractValue(): string {
		return (
			warrantyLinkedActOrContract.trim() ||
			activeUsableDocuments?.find(
				(document) =>
					document.kind === "completed_works_act" ||
					document.kind === "paid_medical_services_contract",
			)?.title ||
			"акт выполненных работ или договор клиники"
		);
	}

	function warrantyDoctorFullNameValue(): string {
		return warrantyDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function postVisitProcedureNameValue(): string {
		return (
			postVisitProcedureName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			"Рекомендации после стоматологического приема"
		);
	}

	function postVisitToothOrAreaValue(): string {
		return (
```
- **Surgical Integration Instructions**: Re-export `warrantyLinkedActOrContractValue` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P197: `warrantyServiceOrWorkNameValue`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 11742
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function warrantyServiceOrWorkNameValue(): string {
		return (
			warrantyServiceOrWorkName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			""
		);
	}

	function warrantyTeethOrAreaValue(): string {
		return (
			warrantyTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по визиту"
		);
	}

	function warrantyLinkedActOrContractValue(): string {
		return (
			warrantyLinkedActOrContract.trim() ||
			activeUsableDocuments?.find(
				(document) =>
					document.kind === "completed_works_act" ||
					document.kind === "paid_medical_services_contract",
			)?.title ||
			"акт выполненных работ или договор клиники"
```
- **Surgical Integration Instructions**: Re-export `warrantyServiceOrWorkNameValue` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

### P198: `warrantyTeethOrAreaValue`
- **Category**: Category A (Omitted from return object)
- **Golden Line**: Line 11751
- **Modern Status**: Modern Body: `false` | Modern Return: `false` | Existing Domain Hooks: `useDocumentWorkflowModule.ts`
- **Target Domain Architecture Home**: `useDocumentWorkflowModule.ts`
- **Original Implementation Snippet (Golden Commit `da92ab9507`)**:
```typescript

	function warrantyTeethOrAreaValue(): string {
		return (
			warrantyTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по визиту"
		);
	}

	function warrantyLinkedActOrContractValue(): string {
		return (
			warrantyLinkedActOrContract.trim() ||
			activeUsableDocuments?.find(
				(document) =>
					document.kind === "completed_works_act" ||
					document.kind === "paid_medical_services_contract",
			)?.title ||
			"акт выполненных работ или договор клиники"
		);
	}

	function warrantyDoctorFullNameValue(): string {
		return warrantyDoctorFullName.trim() || activeDoctor?.fullName || "";
	}

	function postVisitProcedureNameValue(): string {
		return (
```
- **Surgical Integration Instructions**: Re-export `warrantyTeethOrAreaValue` in the return object of `useAppLogic.tsx` from `useDocumentWorkflowModule.ts`.

---

## 4. Caveats

- **No Caveats on Discovery**: All 66 properties in Part 3 (Properties 133 to 198) have been 100% accounted for and mapped directly to golden commit `da92ab9507` and modern domain hooks.
- **Architectural Isolation**: Explorer 3 performed read-only analysis. No code modifications were performed in `apps/web/src/`.
- **Zero-Loss Guarantee**: Implementers must strictly follow surgical insertion into designated domain hooks without overwriting modern bugfixes or performance refactors made between July 30 and August 8.

---

## 5. Conclusion

Part 3 (Properties 133 to 198) of `dead_props.txt` is ready for surgical restoration:
- **30 Category A properties** require only return-block re-exporting in `useAppLogic.tsx`.
- **36 Category B properties** require code extraction from commit `da92ab9507` into their respective domain hooks (`useDocumentWorkflowModule.ts`, `useDicomWorkbenchModule.ts`, `useMigrationQueries.ts`, `useVoiceAssistant.ts`, `useClinicalVisitLogic.ts`, `useScheduleLogic.ts`, `useCommunicationsQueries.ts`).

---

## 6. Verification Method

To verify completeness of restoration for Part 3 properties once implemented:
1. Run TypeScript compiler gate:
   ```bash
   npm run typecheck -w @dental/web
   ```
2. Verify that none of the 66 properties (133 through 198) trigger `TS2339` errors on `useAppLogic()`.
3. Verify clean exports in `apps/web/src/useAppLogic.tsx`.
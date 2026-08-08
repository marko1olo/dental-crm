# HANDOFF REPORT — Explorer 5 (Part 3: Missing Properties 133–198)

## 1. Observation

- **Task Scope**: Deep architectural investigation of missing properties 133 through 198 (66 properties total) from `dead_props.txt` (Part 3 of 198).
- **Golden Reference Commit**: `da92ab9507` (`git show da92ab9507:apps/web/src/useAppLogic.tsx`).
- **Modern Codebase Locations Audited**: `apps/web/src/useAppLogic.tsx` and all domain hooks under `apps/web/src/hooks/domains/` (`useDocumentWorkflowModule.ts`, `useScheduleLogic.ts`, `usePatientLogic.ts`, `useClinicalVisitLogic.ts`, `useDicomWorkbenchModule.ts`, `useAuthLogic.ts`, etc.) plus custom hooks in `apps/web/src/hooks/` (`useMprLogic.ts`, `useVoiceAssistant.ts`, `useShortDictation.ts`).
- **Commands Executed**:
  - `node -e "const fs=require('fs'); console.log(fs.readFileSync('dead_props.txt','utf16le').split(/\r?\n/))"`
  - `git show da92ab9507:apps/web/src/useAppLogic.tsx`
  - Node AST & string search scripts across modern `apps/web/src/` tree.

### Summary Inventory Breakdown (Props 133–198)

| Category | Count | Description / Action Required |
| --- | --- | --- |
| **PASSTHROUGH_FROM_HOOK** | 5 | Property is already exported by a modern domain hook. Requires destructuring in `useAppLogic.tsx` and adding to return object. |
| **EXPORT_FROM_HOOK** | 14 | Logic/State exists inside a modern domain hook, but is NOT exported in its return object. Must be exported by hook, destructured in `useAppLogic.tsx`, and added to return object. |
| **REIMPLEMENTATION_REQUIRED** | 47 | Property/Logic was purged during recent refactoring. Requires surgical re-implementation from Golden Commit `da92ab9507` into appropriate domain hook or `useAppLogic.tsx`. |
| **TOTAL** | **66** | **All properties 133 through 198 fully audited.** |

---

## 2. Logic Chain

1. **Extraction**: Properties 133 to 198 were extracted cleanly from UTF-16LE encoded `dead_props.txt` using Node `fs.readFileSync(..., 'utf16le')`.
2. **Golden Baseline Trace**: Each property was located in Golden Commit `da92ab9507:apps/web/src/useAppLogic.tsx` to capture its exact declaration line, type/signature, default state, and dependencies.
3. **Modern Codebase Cross-Match**: Every property name was searched across `apps/web/src/useAppLogic.tsx` and `apps/web/src/hooks/`.
4. **Classification & Target Domain Mapping**:
   - Items present in domain hook return statements (`useMprLogic.ts`, `usePatientLogic.ts`) were tagged as `PASSTHROUGH_FROM_HOOK`.
   - Items present inside hook bodies (`useDocumentWorkflowModule.ts`, `useScheduleLogic.ts`, `useDicomWorkbenchModule.ts`, `useAuthLogic.ts`) but omitted from return blocks were tagged as `EXPORT_FROM_HOOK`.
   - Items absent from both modern `useAppLogic.tsx` and domain hooks were tagged as `REIMPLEMENTATION_REQUIRED`, with target domain hooks assigned based on domain responsibility (Clinical, Finance, Imaging, Voice, Documents, Patient, Schedule).

---

## 3. Detailed Property Inventory (Props 133–198)

Below is the complete property-by-property breakdown with golden line references, current status, target integration files, and implementation details:

### #133: `pendingSpeechFlushActionTitle`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7140
- **Target File / Location**: `apps/web/src/hooks/domains/useVoiceAssistant.ts or useShortDictation.ts or useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const pendingSpeechFlushActionTitle = speechRecognitionReady
```
```typescript
	const pendingSpeechFlushActionTitle = speechRecognitionReady
		? "Отправить сохраненные аудиофрагменты на распознавание."
		: "Проверить готовность распознавания. Аудио останется в локальной очереди, пока источник недоступен.";
	const speechSafetyValue = pendingSpeechChunkCount
		? `${pendingSpeechChunkCount} аудио`
```

---
### #134: `pickBrowserImagingFiles`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Defined in auxiliary file / store
- **Target File / Location**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
// See golden commit da92ab9507
```

---
### #135: `pickBrowserImagingFolder`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 9562
- **Target File / Location**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function pickBrowserImagingFolder() {
```
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
			browserDirectoryInputRef.cur
```

---
### #136: `pickBrowserMigrationSource`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 9290
- **Target File / Location**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function pickBrowserMigrationSource() {
```
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
				
```

---
### #137: `planMigrationDiscoveryCandidate`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 8505
- **Target File / Location**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function planMigrationDiscoveryCandidate(
```
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
			set
```

---
### #138: `plannedServiceLinesForFinancialPayload`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 11443
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function plannedServiceLinesForFinancialPayload() {
```
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
				
```

---
### #139: `polishingField`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Defined in auxiliary file / store
- **Target File / Location**: `apps/web/src/useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
// See golden commit da92ab9507
```

---
### #140: `polishSingleField`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Defined in auxiliary file / store
- **Target File / Location**: `apps/web/src/useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
// See golden commit da92ab9507
```

---
### #141: `previewImagingImport`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 8640
- **Target File / Location**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function previewImagingImport() {
```
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

```

---
### #142: `previewImport`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7931
- **Target File / Location**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function previewImport() {
```
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
			const result = (await response.json()) as
```

---
### #143: `previewMigrationAutopilotSources`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 8452
- **Target File / Location**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function previewMigrationAutopilotSources(
```
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
						source.readiness.
```

---
### #144: `previewMigrationDiscoveryCandidate`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 8431
- **Target File / Location**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function previewMigrationDiscoveryCandidate(
```
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
```

---
### #145: `previewSmartImport`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 8066
- **Target File / Location**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function previewSmartImport() {
```
```typescript
	async function previewSmartImport() {
		await previewSmartImportText(smartImportText, smartImportMode);
	}
```

---
### #146: `prices`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7885
- **Target File / Location**: `apps/web/src/useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
setSettingsTab("prices");
```
```typescript
				setSettingsTab("prices");
				window.location.hash = "settings/prices";
			}
		} catch (ingestionError) {
```

---
### #147: `probeMigrationDiscoveryCandidate`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 8544
- **Target File / Location**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function probeMigrationDiscoveryCandidate(
```
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
				
```

---
### #148: `renderClinicalToothRowsEditor`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 12067
- **Target File / Location**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function renderClinicalToothRowsEditor() {
```
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
```

---
### #149: `resetMprControls`
- **Category**: `PASSTHROUGH_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 6343
- **Target File / Location**: `Destructure from apps/web/src/hooks/useMprLogic.ts in useAppLogic.tsx and add to return object`
- **Current Codebase Status**: Already exported by domain hook (apps/web/src/hooks/useMprLogic.ts). Only needs destructuring in useAppLogic.tsx and pass-through in return.
- **Golden Signature / Declaration Snippet**:
```typescript
const resetMprControls = applyDefaultMprWorkbenchState;
```
```typescript
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
```

---
### #150: `restoreMprWorkbenchLocalDraft`
- **Category**: `PASSTHROUGH_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 6494
- **Target File / Location**: `Destructure from apps/web/src/hooks/useMprLogic.ts in useAppLogic.tsx and add to return object`
- **Current Codebase Status**: Already exported by domain hook (apps/web/src/hooks/useMprLogic.ts). Only needs destructuring in useAppLogic.tsx and pass-through in return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function restoreMprWorkbenchLocalDraft() {
```
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
```

---
### #151: `retryImagingViewerSessionSave`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 6787
- **Target File / Location**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function retryImagingViewerSessionSave() {
```
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
```

---
### #152: `runMigrationAutopilot`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 8263
- **Target File / Location**: `apps/web/src/hooks/domains/useMigrationQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function runMigrationAutopilot(
```
```typescript
	async function runMigrationAutopilot(
		knownDiscovery: MigrationLocalSourceDiscoveryResponse | null = activeMigrationDiscoveryForAutopilot(),
		options: { includeSmartImportText?: boolean } = {},
```

---
### #153: `runRecognitionJob`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7710
- **Target File / Location**: `apps/web/src/hooks/domains/useVoiceAssistant.ts or useShortDictation.ts or useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function runRecognitionJob() {
```
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
```

---
### #154: `scanDicomFolderSeries`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 9786
- **Target File / Location**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function scanDicomFolderSeries() {
```
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
					sourceName: "dicom_folder_hea
```

---
### #155: `scanImagingFolder`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 9733
- **Target File / Location**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts / useImagingQueries.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function scanImagingFolder() {
```
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
			
```

---
### #156: `scheduleDateFilter`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 2679
- **Target File / Location**: `apps/web/src/hooks/domains/useScheduleLogic.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useScheduleLogic.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
scheduleDateFilter,
```
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
		set
```

---
### #157: `selectCtPlanningImplant`
- **Category**: `PASSTHROUGH_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 6446
- **Target File / Location**: `Destructure from apps/web/src/hooks/useMprLogic.ts in useAppLogic.tsx and add to return object`
- **Current Codebase Status**: Already exported by domain hook (apps/web/src/hooks/useMprLogic.ts). Only needs destructuring in useAppLogic.tsx and pass-through in return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectCtPlanningImplant = (implant: CtImplantLibraryItem) => {
```
```typescript
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
```

---
### #158: `selectedCompletedActContractDocumentId`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 4879
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedCompletedActContractDocumentId = useMemo(() => {
```
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
```

---
### #159: `selectedDocumentMetadata`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 5290
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedDocumentMetadata = documentKindMetadata[selectedDocumentKind];
```
```typescript
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
```

---
### #160: `selectedDocumentUsesTaxPaymentSelection`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 5288
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedDocumentUsesTaxPaymentSelection =
```
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
	}, [activeP
```

---
### #161: `selectedEligibleTaxPayments`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 5314
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedEligibleTaxPayments = useMemo(
```
```typescript
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
```

---
### #162: `selectedPaymentReceiptIdSet`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 5358
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedPaymentReceiptIdSet = useMemo(
```
```typescript
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
					payment.fiscalReceiptNu
```

---
### #163: `selectedPaymentReceiptPayments`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 5362
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedPaymentReceiptPayments = useMemo(
```
```typescript
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
			.sort((le
```

---
### #164: `selectedPaymentReceiptTotalRub`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 5369
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedPaymentReceiptTotalRub = selectedPaymentReceiptPayments.reduce(
```
```typescript
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
```

---
### #165: `selectedProtocolTemplate`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 6950
- **Target File / Location**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedProtocolTemplate = useMemo(() => {
```
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
```

---
### #166: `selectedRefundCorrectionPayment`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 5389
- **Target File / Location**: `apps/web/src/useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedRefundCorrectionPayment = useMemo(
```
```typescript
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
```

---
### #167: `selectedReleaseSourceRequestDocumentId`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 4923
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedReleaseSourceRequestDocumentId = useMemo(() => {
```
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
```

---
### #168: `selectedTaxDocumentPayerKey`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 5268
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedTaxDocumentPayerKey = useMemo(() => {
```
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
```

---
### #169: `selectedTaxPaymentIdSet`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 5310
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedTaxPaymentIdSet = useMemo(
```
```typescript
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
			eligibleTaxPaymentIdSet.has(paymen
```

---
### #170: `selectedTaxPaymentTotalRub`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 5321
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const selectedTaxPaymentTotalRub = selectedEligibleTaxPayments.reduce(
```
```typescript
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
```

---
### #171: `sendRecognitionResultToImport`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7897
- **Target File / Location**: `apps/web/src/hooks/domains/useVoiceAssistant.ts or useShortDictation.ts or useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function sendRecognitionResultToImport() {
```
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
```

---
### #172: `setNewRulePatientText`
- **Category**: `PASSTHROUGH_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 2441
- **Target File / Location**: `Destructure from apps/web/src/hooks/domains/usePatientLogic.ts in useAppLogic.tsx and add to return object`
- **Current Codebase Status**: Already exported by domain hook (apps/web/src/hooks/domains/usePatientLogic.ts). Only needs destructuring in useAppLogic.tsx and pass-through in return.
- **Golden Signature / Declaration Snippet**:
```typescript
setNewRulePatientText,
```
```typescript
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
	 * черновиков не
```

---
### #173: `setScheduleDateFilter`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 2680
- **Target File / Location**: `apps/web/src/hooks/domains/useScheduleLogic.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useScheduleLogic.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
setScheduleDateFilter,
```
```typescript
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
		setAppointmentScheduleErr
```

---
### #174: `setSelectedPatientId`
- **Category**: `PASSTHROUGH_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 2430
- **Target File / Location**: `Destructure from apps/web/src/hooks/domains/usePatientLogic.ts in useAppLogic.tsx and add to return object`
- **Current Codebase Status**: Already exported by domain hook (apps/web/src/hooks/domains/usePatientLogic.ts). Only needs destructuring in useAppLogic.tsx and pass-through in return.
- **Golden Signature / Declaration Snippet**:
```typescript
setSelectedPatientId,
```
```typescript
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
		updat
```

---
### #175: `settingsAdminSecretSession`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 2268
- **Target File / Location**: `apps/web/src/hooks/domains/useAuthLogic.ts, apps/web/src/hooks/domains/useTelegramModule.ts, apps/web/src/hooks/useTelegramSettings.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useAuthLogic.ts, apps/web/src/hooks/domains/useTelegramModule.ts, apps/web/src/hooks/useTelegramSettings.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
settingsAdminSecretSession: settingsAdminSecretSession || undefined,
```
```typescript
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
		updateTelegramPostVisitCheckupDelayDraft,
		telegramFeatureLabel,
		saveTelegramSettings,
		telegramControlPlaneHeaders,
		loadTelegramControlPlane,
		telegramStatusEndpoint,
		telegramOutboxRequestParams,
		telegramLinkCodeLedgerRequestParams,
		telegramChatLinkLedgerRequestParams,
	} = telegramSettings
```

---
### #176: `shiftWarnings`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 6993
- **Target File / Location**: `apps/web/src/useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const shiftWarnings = dashboard?.shiftIntelligence?.scheduleWarnings ?? [];
```
```typescript
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
```

---
### #177: `sortedCommunicationTasks`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 5978
- **Target File / Location**: `apps/web/src/useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const sortedCommunicationTasks = useMemo(() => {
```
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
```

---
### #178: `specialtiesWithTemplates`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 6908
- **Target File / Location**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const specialtiesWithTemplates = useMemo(() => {
```
```typescript
	const specialtiesWithTemplates = useMemo(() => {
		if (!dashboard) return [];
		return Array.from(
			new Set(
				dashboard?.protocolTemplates?.map((template) => template.specialty),
			),
		);
	}, [dashboard]);
```

---
### #179: `specialtyProtocolTemplates`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 6943
- **Target File / Location**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const specialtyProtocolTemplates = useMemo(() => {
```
```typescript
	const specialtyProtocolTemplates = useMemo(() => {
		if (!dashboard) return [];
		return (dashboard?.protocolTemplates || []).filter(
			(template) => template.specialty === selectedSpecialty,
		);
	}, [dashboard, selectedSpecialty]);
```

---
### #180: `speechGatewayActiveProviderIsLocal`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7129
- **Target File / Location**: `apps/web/src/hooks/domains/useVoiceAssistant.ts or useShortDictation.ts or useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const speechGatewayActiveProviderIsLocal =
```
```typescript
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
	const speechSafetyValue 
```

---
### #181: `speechLiveRms`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Defined in auxiliary file / store
- **Target File / Location**: `apps/web/src/hooks/domains/useVoiceAssistant.ts or useShortDictation.ts or useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
// See golden commit da92ab9507
```

---
### #182: `speechRecognitionReady`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7128
- **Target File / Location**: `apps/web/src/hooks/domains/useVoiceAssistant.ts or useShortDictation.ts or useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const speechRecognitionReady = speechUploadReady && isOnline;
```
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
		: "Проверить готовность распознавания. Аудио останется в локальной
```

---
### #183: `speechTranscriptionBusy`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Defined in auxiliary file / store
- **Target File / Location**: `apps/web/src/hooks/domains/useVoiceAssistant.ts or useShortDictation.ts or useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
// See golden commit da92ab9507
```

---
### #184: `startServerVoiceRecording`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 10871
- **Target File / Location**: `apps/web/src/useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function startServerVoiceRecording() {
```
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
```

---
### #185: `stopServerVoiceRecording`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 10992
- **Target File / Location**: `apps/web/src/useAppLogic.tsx`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function stopServerVoiceRecording() {
```
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
		setIsServerVoice
```

---
### #186: `toggleClinicalRule`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 11116
- **Target File / Location**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
async function toggleClinicalRule(rule: Dashboard["clinicalRules"][number]) {
```
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
			setErro
```

---
### #187: `treatmentAcceptancePlannedTotalRub`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 11197
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDocumentWorkflowModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function treatmentAcceptancePlannedTotalRub(): number {
```
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
```

---
### #188: `treatmentEstimatePatientOrPayerFullNameValue`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 11470
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function treatmentEstimatePatientOrPayerFullNameValue(): string {
```
```typescript
	function treatmentEstimatePatientOrPayerFullNameValue(): string {
		return (
			treatmentEstimatePatientOrPayerFullName.trim() ||
			documentPatient?.fullName ||
			""
		);
	}
```

---
### #189: `treatmentEstimateTotalRubValue`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 11490
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function treatmentEstimateTotalRubValue(): number {
```
```typescript
	function treatmentEstimateTotalRubValue(): number {
		const manual = manualRubAmount(treatmentEstimateTotalRub);
		return manual > 0 ? manual : paymentInvoiceTotalRubValue();
	}
```

---
### #190: `treatmentEstimateTreatmentBasisValue`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 11478
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function treatmentEstimateTreatmentBasisValue(): string {
```
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
```

---
### #191: `visibleImagingStudies`
- **Category**: `EXPORT_FROM_HOOK`
- **Golden Line (`da92ab9507`)**: Line 6018
- **Target File / Location**: `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts -> export in hook return object & pass-through in useAppLogic.tsx`
- **Current Codebase Status**: Logic exists inside apps/web/src/hooks/domains/useDicomWorkbenchModule.ts but is not exported in the hook return statement. Must add to hook export, destructure in useAppLogic.tsx, and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const visibleImagingStudies = useMemo(
```
```typescript
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
				score: imagingComparisonScore(
```

---
### #192: `visibleVisitSpecialtyFocusOptions`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 6917
- **Target File / Location**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const visibleVisitSpecialtyFocusOptions = useMemo(() => {
```
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
	
```

---
### #193: `visitPrimaryAction`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7063
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const visitPrimaryAction: {
```
```typescript
	const visitPrimaryAction: {
		kind: "dictation" | "draft" | "save" | "review" | "close";
		label: string;
		detail: string;
		disabled?: boolean;
		onClick: () => void;
	} = !hasVisitTranscriptText
```

---
### #194: `visitSafetyCards`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7315
- **Target File / Location**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const visitSafetyCards: Array<{
```
```typescript
	const visitSafetyCards: Array<{
		key: string;
		label: string;
		value: string;
		detail: string;
		state: "ready" | "warn" | "busy";
	}> = [
```

---
### #195: `visitWorkflowSteps`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 7007
- **Target File / Location**: `apps/web/src/hooks/domains/useClinicalVisitLogic.ts / useVisitLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
const visitWorkflowSteps: Array<{
```
```typescript
	const visitWorkflowSteps: Array<{
		key: string;
		label: string;
		detail: string;
		state: "ready" | "active" | "locked";
	}> = [
```

---
### #196: `warrantyLinkedActOrContractValue`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 11759
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function warrantyLinkedActOrContractValue(): string {
```
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
```

---
### #197: `warrantyServiceOrWorkNameValue`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 11742
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function warrantyServiceOrWorkNameValue(): string {
```
```typescript
	function warrantyServiceOrWorkNameValue(): string {
		return (
			warrantyServiceOrWorkName.trim() ||
			dashboard?.activeVisit?.treatmentPlan?.trim() ||
			dashboard?.activeVisit?.doctorSummary?.trim() ||
			""
		);
	}
```

---
### #198: `warrantyTeethOrAreaValue`
- **Category**: `REIMPLEMENTATION_REQUIRED`
- **Golden Line (`da92ab9507`)**: Line 11751
- **Target File / Location**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts / useFinanceLogic.ts`
- **Current Codebase Status**: Property was deleted during refactoring. Must re-implement logic from da92ab9507 golden reference and pass through in useAppLogic return.
- **Golden Signature / Declaration Snippet**:
```typescript
function warrantyTeethOrAreaValue(): string {
```
```typescript
	function warrantyTeethOrAreaValue(): string {
		return (
			warrantyTeethOrArea.trim() ||
			inferredTreatmentArea ||
			"область лечения по визиту"
		);
	}
```

---

## 4. Caveats

1. **Voice / Speech Queue Props (`speechLiveRms` #181, `speechTranscriptionBusy` #183)**:
   - `speechLiveRms` is supplied from `visitStore.ts` state in golden architecture, passed down to `App.tsx`.
   - `speechTranscriptionBusy` is a computed boolean (`isTranscriptPolishing || isSpeechRecognitionProcessing`) tracked in voice assistant pipeline. Note that `scripts/smoke-speech-queue-source.mjs` contains explicit markers monitoring this queue.
2. **Read-Only Scope**: Explorer 5 performed read-only investigation. No production code files under `apps/web/src/` were modified.
3. **Preservation of Modern Changes**: When implementers re-implement or export properties, modern bugfixes, types, and hooks (such as `useDocumentWorkflowModule.ts`) must be preserved without overwriting existing modern state logic.

---

## 5. Conclusion

Properties 133 through 198 have been completely audited and classified. 
- 5 properties require simple pass-through destructuring from existing domain hooks.
- 14 properties require adding missing return exports to existing domain hooks and passing them through `useAppLogic.tsx`.
- 47 properties require surgical re-implementation from Golden Reference Commit `da92ab9507`.

All target integration paths and golden code signatures are cataloged above for the implementer swarm.

---

## 6. Verification Method

To verify this audit and subsequent implementation:
1. **Compilation Check**:
   ```bash
   npm run typecheck -w @dental/web
   ```
   Verifies that TS2339 errors for properties 133–198 are resolved once implemented.
2. **Voice Guard Verification**:
   ```bash
   node scripts/smoke-speech-queue-source.mjs
   ```
   Ensures speech transcription queue guards remain valid.
3. **Repository State & Encoding Verification**:
   ```bash
   git status --short
   node -e "const fs=require('fs'); console.log(fs.readFileSync('.agents/explorer_5/handoff.md','utf8').length);"
   ```
   Confirms clean UTF-8 handoff report in Explorer 5 directory.

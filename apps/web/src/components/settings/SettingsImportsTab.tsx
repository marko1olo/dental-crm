import React from "react";
import type {
	DicomSeriesPreviewResponse,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImportSourceKind,
} from "@dental/shared";
import {
	MigrationAutopilotSection,
	MigrationDicomViewerSection,
	MigrationDiscoverySection,
	MigrationImagingDiscoverySection,
	MigrationImagingOrganizerSection,
	MigrationKickstartPanel,
	MigrationPreviewSection,
	MigrationProbeSection,
	MigrationWorkupSection,
	useSettingsImportsLogic,
	type MigrationAutopilotSectionProps,
	type MigrationDicomViewerSectionProps,
	type MigrationDiscoverySectionProps,
	type MigrationImagingDiscoverySectionProps,
	type MigrationImagingOrganizerSectionProps,
	type MigrationKickstartPanelProps,
	type MigrationPreviewSectionProps,
	type MigrationProbeSectionProps,
	type MigrationWorkupSectionProps,
	type UseSettingsImportsLogicParams,
} from "./imports";

export * from "./imports";

type SettingsImportsCombinedProps = UseSettingsImportsLogicParams &
	MigrationKickstartPanelProps &
	MigrationAutopilotSectionProps &
	MigrationDiscoverySectionProps &
	MigrationWorkupSectionProps &
	MigrationProbeSectionProps &
	MigrationImagingDiscoverySectionProps &
	MigrationImagingOrganizerSectionProps &
	Omit<MigrationDicomViewerSectionProps, "dicomSeriesPreview"> &
	MigrationPreviewSectionProps;

export type SettingsImportsTabProps = Partial<SettingsImportsCombinedProps> & {
	readonly [key: string]: unknown;
};

const EMPTY_STRING_MAP: Record<string, string> = {};
const EMPTY_SOURCE_LABELS: Record<string, { title?: string; detail?: string }> = {};
const NOOP = () => {};
const NOOP_STR = (_v: string) => "";
const DEFAULT_IMAGING_SOURCE_KIND: ImagingSourceKind = "manual_upload";
const DEFAULT_IMPORT_SOURCE_KIND: ImportSourceKind = "csv_text";
const DEFAULT_DOCUMENT_INGESTION_TARGET: DocumentIngestionTarget = "patients";

function isDicomSeriesPreviewResponse(
	value: UseSettingsImportsLogicParams["dicomSeriesPreview"] | undefined,
): value is DicomSeriesPreviewResponse {
	return (
		typeof value === "object" &&
		value !== null &&
		"sourceKind" in value &&
		typeof value.sourceKind === "string" &&
		"sourceName" in value &&
		typeof value.sourceName === "string" &&
		"totalRows" in value &&
		typeof value.totalRows === "number" &&
		"blockedSeries" in value &&
		typeof value.blockedSeries === "number"
	);
}

export function SettingsImportsTab(props: SettingsImportsTabProps) {
	const fallbackInputRef = React.useRef<HTMLInputElement>(null);
	const {
		addMigrationDiscoveryCandidateToSmartImport = NOOP,
		browserDirectoryInputRef = fallbackInputRef,
		browserDirectoryPickerAvailable = false,
		browserImagingFileInputAccept = "",
		browserImagingFilesInputRef = fallbackInputRef,
		browserImagingScanProgress = null,
		browserMigrationInputRef = fallbackInputRef,
		browserMigrationScanProgress = null,
		browserPickedImagingFolder = null,
		cancelBrowserImagingFolderScan = NOOP,
		cancelBrowserMigrationScan = NOOP,
		cancelLocalDicomOperation = NOOP,
		clearBrowserPickedImagingFolderPreview = NOOP,
		clearLocalImagingFolderRecovery = NOOP,
		clinicProfileSaveState = "idle",
		clinicPublicLookup = null,
		commitImagingImport = NOOP,
		commitImport = NOOP,
		commitSmartImport = NOOP,
		dicomFirstFrameImageStyle = EMPTY_STRING_MAP,
		dicomFirstFrameStatusLabels = EMPTY_STRING_MAP,
		dicomFolderWorkupPathLabels = EMPTY_STRING_MAP,
		dicomLabel = (_map, key, fallback) => (key != null ? String(key) : fallback),
		dicomSeriesPreview = null,
		dicomSeriesViewerLabels = EMPTY_STRING_MAP,
		dicomTextureStrategyLabels = EMPTY_STRING_MAP,
		discoverDicomFolders = NOOP,
		discoverMigrationSources = NOOP,
		documentDetectedKindLabel = NOOP_STR,
		documentIngestionQualityLabels = EMPTY_STRING_MAP,
		documentIngestionTarget = DEFAULT_DOCUMENT_INGESTION_TARGET,
		downloadMigrationHandoffReport = NOOP,
		downloadSmartImportSafeHandoffReport = NOOP,
		formatByteSize = (b) => `${b} B`,
		formatDateTime = (d) => (d ? String(d) : ""),
		handleBrowserDirectoryInputChange = NOOP,
		handleBrowserMigrationInputChange = NOOP,
		imagingFolderPath = "",
		imagingImportCommit = null,
		imagingImportSourceKind = DEFAULT_IMAGING_SOURCE_KIND,
		imagingImportText = "",
		imagingKindLabels = EMPTY_STRING_MAP,
		imagingSourceDetails = EMPTY_STRING_MAP,
		imagingSourceLabels = EMPTY_STRING_MAP,
		importCommit = null,
		importSourceKind = DEFAULT_IMPORT_SOURCE_KIND,
		importSourceLabels = EMPTY_SOURCE_LABELS,
		importText = "",
		ingestImportFile = NOOP,
		ingestionTargetLabels = EMPTY_STRING_MAP,
		isBrowserImagingFolderPicking = false,
		isBrowserMigrationScanning = false,
		isClinicPublicLookupLoading = false,
		isDicomFirstFramePreviewing = false,
		isDicomFolderWorkupPlanning = false,
		isDicomLocalDiscovering = false,
		isDicomSeriesPreviewLoading = false,
		isDicomWorkbenchBuilding = false,
		isDocumentIngesting = false,
		isImagingImportCommitting = false,
		isImagingImportLoading = false,
		isImportCommitting = false,
		isImportLoading = false,
		isLocalDicomOperationActive = false,
		isLocalImagingOrganizing = false,
		isMigrationAutopilotLoading = false,
		isMigrationSourceDiscovering = false,
		isMigrationSourceProbeLoading = false,
		isMigrationSourceWorkupLoading = false,
		isSmartImportCommitting = false,
		isSmartImportLoading = false,
		isSmartReportLoading = false,
		isSmartSafeReportLoading = false,
		localImagingFolderDraft = null,
		localImagingModelRoleLabels = EMPTY_STRING_MAP,
		localImagingOrganizerActionLabels = EMPTY_STRING_MAP,
		lookupClinicPublicProfile = NOOP,
		mprLoadStrategyLabels = EMPTY_STRING_MAP,
		mprResourceTierLabels = EMPTY_STRING_MAP,
		organizeLocalImagingSources = NOOP,
		pickBrowserImagingFiles = NOOP,
		pickBrowserImagingFolder = NOOP,
		pickBrowserMigrationSource = NOOP,
		planMigrationDiscoveryCandidate = NOOP,
		prepareDicomWorkbenchFromFolder = NOOP,
		previewDicomFirstFrame = NOOP,
		previewDicomFirstFrameSlice = NOOP,
		previewDicomSeries = NOOP,
		previewImagingImport = NOOP,
		previewImport = NOOP,
		previewMigrationAutopilotSources = NOOP,
		previewMigrationDiscoveryCandidate = NOOP,
		probeMigrationDiscoveryCandidate = NOOP,
		rememberLocalImagingFolder = NOOP,
		runMigrationAutopilot = NOOP,
		saveClinicProfileFromDraft = NOOP,
		setDicomFirstFramePreview = NOOP,
		setDicomFirstFrameViewerState = NOOP,
		setDicomFolderSeriesScan = NOOP,
		setDicomFolderWorkupPlan = NOOP,
		setDicomSeriesPreview = NOOP,
		setDicomLocalFolderDiscovery = NOOP,
		setDocumentIngestionTarget = NOOP,
		setImagingFolderPath = NOOP,
		setImagingFolderScan = NOOP,
		setImagingImportCommit = NOOP,
		setImagingImportPreview = NOOP,
		setImagingImportSourceKind = NOOP,
		setImagingImportText = NOOP,
		setImportCommit = NOOP,
		setImportIntake = NOOP,
		setImportPreview = NOOP,
		setImportSourceKind = NOOP,
		setImportText = NOOP,
		setLocalImagingOrganizer = NOOP,
		settingsTab = "",
		smartImportCommit = null,
		stageLocalImagingFolderRecovery = NOOP,
	} = props;

	const logic = useSettingsImportsLogic(props);

	return (
		<div className="settings-content" id="settings-tabpanel-imports">
			<MigrationKickstartPanel
				migrationAutopilot={logic.typedMigrationAutopilot}
				migrationProgressItems={logic.migrationProgressItems}
				migrationSourceDiscovery={logic.typedMigrationSourceDiscovery}
				typedBrowserMigrationDiscovery={logic.typedBrowserMigrationDiscovery}
				browserDirectoryPickerAvailable={browserDirectoryPickerAvailable}
				browserMigrationScanProgress={browserMigrationScanProgress}
				browserMigrationInputRef={browserMigrationInputRef}
				isMigrationSourceDiscovering={isMigrationSourceDiscovering}
				isMigrationAutopilotLoading={isMigrationAutopilotLoading}
				isBrowserMigrationScanning={isBrowserMigrationScanning}
				isClinicPublicLookupLoading={isClinicPublicLookupLoading}
				isSmartSafeReportLoading={isSmartSafeReportLoading}
				isSmartReportLoading={isSmartReportLoading}
				migrationHandoffReportReady={logic.migrationHandoffReportReady}
				discoverMigrationSources={discoverMigrationSources}
				pickBrowserMigrationSource={pickBrowserMigrationSource}
				cancelBrowserMigrationScan={cancelBrowserMigrationScan}
				runMigrationAutopilot={runMigrationAutopilot}
				lookupClinicPublicProfile={lookupClinicPublicProfile}
				handleBrowserMigrationInputChange={handleBrowserMigrationInputChange}
				downloadSmartImportSafeHandoffReport={downloadSmartImportSafeHandoffReport}
				downloadMigrationHandoffReport={downloadMigrationHandoffReport}
				focusSmartImportWorkbench={logic.focusSmartImportWorkbench}
			/>

			<MigrationAutopilotSection
				migrationAutopilot={logic.typedMigrationAutopilot}
				typedMigrationAutopilotSources={logic.typedMigrationAutopilotSources}
				typedMigrationAutopilotClinicLookup={logic.typedMigrationAutopilotClinicLookup}
				typedMigrationAutopilotSteps={logic.typedMigrationAutopilotSteps}
				typedMigrationOperatorLanes={logic.typedMigrationOperatorLanes}
				typedMigrationHandoffChecklist={logic.typedMigrationHandoffChecklist}
				migrationDryRunSummary={logic.migrationDryRunSummary}
				migrationTriageItems={logic.migrationTriageItems}
				migrationOperatorScriptSteps={logic.migrationOperatorScriptSteps}
				migrationPrimaryOperatorStep={logic.migrationPrimaryOperatorStep}
				migrationPrimaryOperatorCandidate={logic.migrationPrimaryOperatorCandidate}
				migrationCandidatePreviewReady={logic.migrationCandidatePreviewReady}
				migrationCandidatePreviewHint={logic.migrationCandidatePreviewHint}
				smartImportInputReady={logic.smartImportInputReady}
				isMigrationAutopilotLoading={isMigrationAutopilotLoading}
				isMigrationSourceDiscovering={isMigrationSourceDiscovering}
				isBrowserMigrationScanning={isBrowserMigrationScanning}
				isMigrationSourceWorkupLoading={isMigrationSourceWorkupLoading}
				isMigrationSourceProbeLoading={isMigrationSourceProbeLoading}
				isClinicPublicLookupLoading={isClinicPublicLookupLoading}
				isSmartImportLoading={isSmartImportLoading}
				clinicProfileSaveState={clinicProfileSaveState}
				clinicProfileSaveButtonText={logic.clinicProfileSaveButtonText}
				runMigrationAutopilot={runMigrationAutopilot}
				discoverMigrationSources={discoverMigrationSources}
				pickBrowserMigrationSource={pickBrowserMigrationSource}
				lookupClinicPublicProfile={lookupClinicPublicProfile}
				planMigrationDiscoveryCandidate={planMigrationDiscoveryCandidate}
				probeMigrationDiscoveryCandidate={probeMigrationDiscoveryCandidate}
				addMigrationDiscoveryCandidateToSmartImport={addMigrationDiscoveryCandidateToSmartImport}
				previewMigrationDiscoveryCandidate={previewMigrationDiscoveryCandidate}
				previewMigrationAutopilotSources={previewMigrationAutopilotSources}
				saveClinicProfileFromDraft={saveClinicProfileFromDraft}
				applyClinicLookupSuggestion={logic.applyClinicLookupSuggestion}
				clinicLookupSuggestionFieldEntries={logic.clinicLookupSuggestionFieldEntries}
				clinicLookupSuggestionApplySummary={logic.clinicLookupSuggestionApplySummary}
			/>

			<MigrationDiscoverySection
				typedMigrationSourceDiscovery={logic.typedMigrationSourceDiscovery}
				typedMigrationDiscoveryCandidates={logic.typedMigrationDiscoveryCandidates}
				migrationAutopilot={logic.typedMigrationAutopilot}
				isMigrationSourceWorkupLoading={isMigrationSourceWorkupLoading}
				isMigrationSourceProbeLoading={isMigrationSourceProbeLoading}
				isSmartImportLoading={isSmartImportLoading}
				isBrowserMigrationScanning={isBrowserMigrationScanning}
				isMigrationAutopilotLoading={isMigrationAutopilotLoading}
				isClinicPublicLookupLoading={isClinicPublicLookupLoading}
				formatDateTime={formatDateTime}
				migrationCandidatePreviewReady={logic.migrationCandidatePreviewReady}
				migrationCandidatePreviewHint={logic.migrationCandidatePreviewHint}
				planMigrationDiscoveryCandidate={planMigrationDiscoveryCandidate}
				probeMigrationDiscoveryCandidate={probeMigrationDiscoveryCandidate}
				addMigrationDiscoveryCandidateToSmartImport={addMigrationDiscoveryCandidateToSmartImport}
				previewMigrationDiscoveryCandidate={previewMigrationDiscoveryCandidate}
				pickBrowserMigrationSource={pickBrowserMigrationSource}
				focusSmartImportWorkbench={logic.focusSmartImportWorkbench}
				lookupClinicPublicProfile={lookupClinicPublicProfile}
			/>

			<MigrationWorkupSection
				typedMigrationSourceWorkup={logic.typedMigrationSourceWorkup}
				typedMigrationWorkupReadinessIssues={logic.typedMigrationWorkupReadinessIssues}
			/>

			<MigrationProbeSection
				typedMigrationSourceProbe={logic.typedMigrationSourceProbe}
				typedMigrationProbeReadinessIssues={logic.typedMigrationProbeReadinessIssues}
				clinicPublicLookup={clinicPublicLookup}
				typedClinicPublicLookupSuggestions={logic.typedClinicPublicLookupSuggestions}
				typedClinicPublicLookupTargets={logic.typedClinicPublicLookupTargets}
				typedSmartImportPreview={logic.typedSmartImportPreview}
				smartImportCommit={smartImportCommit}
				smartImportInputReady={logic.smartImportInputReady}
				isSmartImportCommitting={isSmartImportCommitting}
				clinicProfileSaveState={clinicProfileSaveState}
				clinicProfileSaveButtonText={logic.clinicProfileSaveButtonText}
				formatByteSize={formatByteSize}
				applyClinicLookupSuggestion={logic.applyClinicLookupSuggestion}
				clinicLookupSuggestionFieldEntries={logic.clinicLookupSuggestionFieldEntries}
				clinicLookupSuggestionApplySummary={logic.clinicLookupSuggestionApplySummary}
				saveClinicProfileFromDraft={saveClinicProfileFromDraft}
				commitSmartImport={commitSmartImport}
			/>

			<MigrationImagingDiscoverySection
				settingsTab={settingsTab}
				typedImagingSourceChoices={logic.typedImagingSourceChoices}
				imagingImportSourceKind={imagingImportSourceKind}
				imagingSourceLabels={imagingSourceLabels}
				imagingSourceDetails={imagingSourceDetails}
				imagingFolderPath={imagingFolderPath}
				localImagingFolderDraft={localImagingFolderDraft}
				browserDirectoryPickerAvailable={browserDirectoryPickerAvailable}
				browserImagingFileInputAccept={browserImagingFileInputAccept}
				browserImagingScanProgress={browserImagingScanProgress}
				isBrowserImagingFolderPicking={isBrowserImagingFolderPicking}
				isLocalDicomOperationActive={isLocalDicomOperationActive}
				isDicomLocalDiscovering={isDicomLocalDiscovering}
				isLocalImagingOrganizing={isLocalImagingOrganizing}
				isDicomFirstFramePreviewing={isDicomFirstFramePreviewing}
				isDicomFolderWorkupPlanning={isDicomFolderWorkupPlanning}
				isDicomWorkbenchBuilding={isDicomWorkbenchBuilding}
				browserPickedImagingFolder={browserPickedImagingFolder}
				typedDicomLocalFolderDiscovery={logic.typedDicomLocalFolderDiscovery}
				browserDirectoryInputRef={browserDirectoryInputRef}
				browserImagingFilesInputRef={browserImagingFilesInputRef}
				setImagingImportSourceKind={setImagingImportSourceKind}
				setImagingImportPreview={setImagingImportPreview}
				setImagingImportCommit={setImagingImportCommit}
				setImagingFolderPath={setImagingFolderPath}
				stageLocalImagingFolderRecovery={stageLocalImagingFolderRecovery}
				rememberLocalImagingFolder={rememberLocalImagingFolder}
				clearLocalImagingFolderRecovery={clearLocalImagingFolderRecovery}
				setImagingFolderScan={setImagingFolderScan}
				setDicomFolderSeriesScan={setDicomFolderSeriesScan}
				setDicomFolderWorkupPlan={setDicomFolderWorkupPlan}
				setDicomFirstFramePreview={setDicomFirstFramePreview}
				setDicomLocalFolderDiscovery={setDicomLocalFolderDiscovery}
				setLocalImagingOrganizer={setLocalImagingOrganizer}
				handleBrowserDirectoryInputChange={handleBrowserDirectoryInputChange}
				pickBrowserImagingFolder={pickBrowserImagingFolder}
				pickBrowserImagingFiles={pickBrowserImagingFiles}
				cancelBrowserImagingFolderScan={cancelBrowserImagingFolderScan}
				cancelLocalDicomOperation={cancelLocalDicomOperation}
				discoverDicomFolders={discoverDicomFolders}
				organizeLocalImagingSources={organizeLocalImagingSources}
				previewDicomFirstFrame={previewDicomFirstFrame}
				prepareDicomWorkbenchFromFolder={prepareDicomWorkbenchFromFolder}
				clearBrowserPickedImagingFolderPreview={clearBrowserPickedImagingFolderPreview}
			/>

			<MigrationImagingOrganizerSection
				typedLocalImagingOrganizer={logic.typedLocalImagingOrganizer}
				typedImagingFolderScan={logic.typedImagingFolderScan}
				typedDicomFolderSeriesScan={logic.typedDicomFolderSeriesScan}
				typedDicomFolderWorkupPlan={logic.typedDicomFolderWorkupPlan}
				localImagingOrganizerActionLabels={localImagingOrganizerActionLabels}
				localImagingModelRoleLabels={localImagingModelRoleLabels}
				dicomFolderWorkupPathLabels={dicomFolderWorkupPathLabels}
				dicomTextureStrategyLabels={dicomTextureStrategyLabels}
				dicomLabel={dicomLabel}
				isDicomFolderWorkupPlanning={isDicomFolderWorkupPlanning}
				isDicomWorkbenchBuilding={isDicomWorkbenchBuilding}
				isDicomFirstFramePreviewing={isDicomFirstFramePreviewing}
				rememberLocalImagingFolder={rememberLocalImagingFolder}
				setDicomFolderSeriesScan={setDicomFolderSeriesScan}
				setDicomFolderWorkupPlan={setDicomFolderWorkupPlan}
				setDicomFirstFramePreview={setDicomFirstFramePreview}
				setImagingFolderScan={setImagingFolderScan}
				setDicomLocalFolderDiscovery={setDicomLocalFolderDiscovery}
				prepareDicomWorkbenchFromFolder={prepareDicomWorkbenchFromFolder}
				previewDicomFirstFrame={previewDicomFirstFrame}
			/>

			<MigrationDicomViewerSection
				dicomFirstFramePreview={logic.typedDicomFirstFramePreview}
				typedDicomFirstFramePreview={logic.typedDicomFirstFramePreview}
				typedDicomFirstFrameViewerState={logic.typedDicomFirstFrameViewerState}
				typedDefaultDicomFirstFrameViewerState={logic.typedDefaultDicomFirstFrameViewerState}
				dicomFirstFrameStatusLabels={dicomFirstFrameStatusLabels}
				dicomFirstFrameSelectableCount={logic.dicomFirstFrameSelectableCount}
				dicomFirstFrameCurrentIndex={logic.dicomFirstFrameCurrentIndex ?? 0}
				dicomFirstFrameSliceMaxIndex={logic.dicomFirstFrameSliceMaxIndex}
				dicomFirstFrameLandmarkSlices={logic.dicomFirstFrameLandmarkSlices}
				dicomFirstFrameCanSelectPrevious={logic.dicomFirstFrameCanSelectPrevious}
				dicomFirstFrameCanSelectNext={logic.dicomFirstFrameCanSelectNext}
				isDicomFirstFramePreviewing={isDicomFirstFramePreviewing}
				dicomFirstFrameImageStyle={dicomFirstFrameImageStyle}
				imagingImportText={imagingImportText}
				imagingImportInputReady={logic.imagingImportInputReady}
				isDicomSeriesPreviewLoading={isDicomSeriesPreviewLoading}
				isImagingImportLoading={isImagingImportLoading}
				isImagingImportCommitting={isImagingImportCommitting}
				dicomSeriesPreview={
					isDicomSeriesPreviewResponse(dicomSeriesPreview)
						? dicomSeriesPreview
						: null
				}
				typedDicomSeriesPreviewSeries={logic.typedDicomSeriesPreviewSeries}
				imagingKindLabels={imagingKindLabels}
				dicomSeriesViewerLabels={dicomSeriesViewerLabels}
				mprLoadStrategyLabels={mprLoadStrategyLabels}
				mprResourceTierLabels={mprResourceTierLabels}
				typedImagingImportPreview={logic.typedImagingImportPreview}
				imagingImportCommit={imagingImportCommit}
				updateDicomFirstFrameViewerState={logic.updateDicomFirstFrameViewerState}
				updateDicomFirstFrameViewerNumber={logic.updateDicomFirstFrameViewerNumber}
				setDicomFirstFrameViewerState={setDicomFirstFrameViewerState}
				previewDicomFirstFrameSlice={previewDicomFirstFrameSlice}
				setImagingImportSourceKind={setImagingImportSourceKind}
				setImagingImportText={setImagingImportText}
				setImagingImportPreview={setImagingImportPreview}
				setImagingImportCommit={setImagingImportCommit}
				setDicomSeriesPreview={setDicomSeriesPreview}
				setDicomFolderSeriesScan={setDicomFolderSeriesScan}
				setDicomFolderWorkupPlan={setDicomFolderWorkupPlan}
				previewDicomSeries={previewDicomSeries}
				previewImagingImport={previewImagingImport}
				commitImagingImport={commitImagingImport}
			/>

			<MigrationPreviewSection
				settingsTab={settingsTab}
				typedImportSourceKinds={logic.typedImportSourceKinds}
				importSourceKind={importSourceKind}
				importSourceLabels={importSourceLabels}
				typedDocumentIngestionTargets={logic.typedDocumentIngestionTargets}
				documentIngestionTarget={documentIngestionTarget}
				ingestionTargetLabels={ingestionTargetLabels}
				isDocumentIngesting={isDocumentIngesting}
				typedDocumentIngestion={logic.typedDocumentIngestion}
				documentDetectedKindLabel={documentDetectedKindLabel}
				documentIngestionQualityLabels={documentIngestionQualityLabels}
				importText={importText}
				patientImportInputReady={logic.patientImportInputReady}
				isImportLoading={isImportLoading}
				isImportCommitting={isImportCommitting}
				typedImportIntake={logic.typedImportIntake}
				typedImportPreview={logic.typedImportPreview}
				importCommit={importCommit}
				setImportSourceKind={setImportSourceKind}
				setImportPreview={setImportPreview}
				setImportCommit={setImportCommit}
				setImportIntake={setImportIntake}
				setDocumentIngestionTarget={setDocumentIngestionTarget}
				ingestImportFile={ingestImportFile}
				setImportText={setImportText}
				previewImport={previewImport}
				commitImport={commitImport}
			/>
		</div>
	);
}

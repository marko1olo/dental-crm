import type {
	ClinicPublicLookupResponse,
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomSeriesPreviewGroup,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	ImagingFolderScanResponse,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImportIntakeResponse,
	ImportPreviewResponse,
	ImportSourceKind,
	LocalImagingOrganizerResponse,
	MigrationAutopilotHandoffChecklistItem,
	MigrationAutopilotOperatorScriptStep,
	MigrationAutopilotPacketLane,
	MigrationAutopilotResponse,
	MigrationAutopilotSource,
	MigrationAutopilotStep,
	MigrationLocalSourceDiscoveryCandidate,
	MigrationLocalSourceDiscoveryResponse,
	MigrationLocalSourceProbeResponse,
	MigrationLocalSourceWorkupResponse,
	MigrationReadinessItem,
	SmartImportPreviewResponse,
} from "@dental/shared";
import { clinicPublicLookupFieldLabels, migrationTriageStatusPriority } from "./constants";
import type { DicomFirstFrameViewerState, InputChangeEvent } from "./types";

export interface UseSettingsImportsLogicParams {
	smartImportText?: string;
	imagingImportText?: string;
	importText?: string;
	browserMigrationDiscovery?: any;
	smartImportPreview?: any;
	imagingSourceChoices?: any;
	imagingImportPreview?: any;
	importSourceKinds?: any;
	documentIngestionTargets?: any;
	documentIngestion?: any;
	importIntake?: any;
	importPreview?: any;
	clinicProfileDraft?: any;
	clinicProfileSaveState?: string;
	updateClinicProfileDraft?: (key: string, value: string) => void;
	migrationAutopilot?: any;
	migrationSourceDiscovery?: any;
	migrationSourceWorkup?: any;
	migrationSourceProbe?: any;
	clinicPublicLookup?: any;
	dicomFirstFramePreview?: any;
	dicomFirstFrameViewerState?: any;
	defaultDicomFirstFrameViewerState?: any;
	setDicomFirstFrameViewerState?: any;
	dicomSeriesPreview?: any;
	dicomLocalFolderDiscovery?: any;
	localImagingOrganizer?: any;
	imagingFolderScan?: any;
	dicomFolderSeriesScan?: any;
	dicomFolderWorkupPlan?: any;
	isMigrationSourceDiscovering?: boolean;
	isBrowserMigrationScanning?: boolean;
	isMigrationAutopilotLoading?: boolean;
	isMigrationSourceWorkupLoading?: boolean;
	isSmartImportLoading?: boolean;
	isClinicPublicLookupLoading?: boolean;
	isDicomFirstFramePreviewing?: boolean;
	setSmartImportMode?: (mode: string) => void;
}

export function useSettingsImportsLogic(params: UseSettingsImportsLogicParams) {
	const {
		smartImportText,
		imagingImportText,
		importText,
		browserMigrationDiscovery,
		smartImportPreview,
		imagingSourceChoices,
		imagingImportPreview,
		importSourceKinds,
		documentIngestionTargets,
		documentIngestion,
		importIntake,
		importPreview,
		clinicProfileDraft,
		clinicProfileSaveState,
		updateClinicProfileDraft,
		migrationAutopilot,
		migrationSourceDiscovery,
		migrationSourceWorkup,
		migrationSourceProbe,
		clinicPublicLookup,
		dicomFirstFramePreview,
		dicomFirstFrameViewerState,
		defaultDicomFirstFrameViewerState,
		setDicomFirstFrameViewerState,
		dicomSeriesPreview,
		dicomLocalFolderDiscovery,
		localImagingOrganizer,
		imagingFolderScan,
		dicomFolderSeriesScan,
		dicomFolderWorkupPlan,
		isMigrationSourceDiscovering,
		isBrowserMigrationScanning,
		isMigrationAutopilotLoading,
		isMigrationSourceWorkupLoading,
		isSmartImportLoading,
		isClinicPublicLookupLoading,
		isDicomFirstFramePreviewing,
		setSmartImportMode,
	} = params;

	const smartImportInputReady = (smartImportText || "").trim().length > 0;
	const imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const patientImportInputReady = (importText || "").trim().length > 0;

	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;
	const typedImagingSourceChoices =
		(imagingSourceChoices ?? []) as ImagingSourceKind[];
	const typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const typedImportSourceKinds =
		(importSourceKinds ?? []) as ImportSourceKind[];
	const typedDocumentIngestionTargets =
		(documentIngestionTargets ?? []) as DocumentIngestionTarget[];
	const typedDocumentIngestion =
		documentIngestion as DocumentIngestionResponse | null;
	const typedImportIntake = importIntake as ImportIntakeResponse | null;
	const typedImportPreview = importPreview as ImportPreviewResponse | null;

	const clinicLookupSuggestionFieldEntries = (
		fields: Record<string, unknown>,
	) =>
		Object.entries(fields).filter(([key, value]) => {
			if (!Object.hasOwn(clinicPublicLookupFieldLabels, key)) return false;
			if (value === null || typeof value === "undefined") return false;
			return String(value).trim().length > 0;
		});

	const clinicLookupSuggestionApplySummary = (
		fields: Record<string, unknown>,
	) => {
		const entries = clinicLookupSuggestionFieldEntries(fields);
		if (!entries.length) return "Нет применимых полей для профиля.";

		const currentProfile = (clinicProfileDraft ?? {}) as Record<string, unknown>;
		let emptyCount = 0;
		let replaceCount = 0;
		let unchangedCount = 0;
		entries.forEach(([key, value]) => {
			const currentValue = String(currentProfile[key] ?? "").trim();
			const suggestedValue = String(value).trim();
			if (!currentValue) emptyCount += 1;
			else if (currentValue === suggestedValue) unchangedCount += 1;
			else replaceCount += 1;
		});
		return `Будет подставлено полей: ${entries.length}. Новых: ${emptyCount}. Заменит текущих: ${replaceCount}. Совпадает: ${unchangedCount}.`;
	};

	const applyClinicLookupSuggestion = (fields: Record<string, unknown>) => {
		if (!updateClinicProfileDraft) return;
		clinicLookupSuggestionFieldEntries(fields).forEach(([key, value]) => {
			updateClinicProfileDraft(key, String(value).trim());
		});
	};

	const clinicProfileSaveButtonText =
		clinicProfileSaveState === "saving"
			? "Сохраняю профиль"
			: clinicProfileSaveState === "saved"
				? "Профиль сохранен"
				: "Сохранить профиль";

	const typedMigrationAutopilot =
		migrationAutopilot as MigrationAutopilotResponse | null;
	const typedMigrationSourceDiscovery =
		migrationSourceDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedMigrationSourceWorkup =
		migrationSourceWorkup as MigrationLocalSourceWorkupResponse | null;
	const typedMigrationSourceProbe =
		migrationSourceProbe as MigrationLocalSourceProbeResponse | null;
	const typedClinicPublicLookup =
		clinicPublicLookup as ClinicPublicLookupResponse | null;
	const typedDicomFirstFramePreview =
		dicomFirstFramePreview as DicomFirstFramePreviewResponse | null;
	const typedDicomFirstFrameViewerState =
		dicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const typedDefaultDicomFirstFrameViewerState =
		defaultDicomFirstFrameViewerState as DicomFirstFrameViewerState;

	const dicomFirstFrameSelectableCount =
		typedDicomFirstFramePreview?.selectableFileCount ?? 0;
	const dicomFirstFrameCurrentIndex =
		typedDicomFirstFramePreview?.sourceFileIndex ?? null;
	const dicomFirstFrameSliceMaxIndex = Math.max(
		0,
		dicomFirstFrameSelectableCount - 1,
	);
	const dicomFirstFrameLandmarkSlices =
		dicomFirstFrameSelectableCount > 3
			? [
					{
						label: "25%",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.25),
					},
					{
						label: "Центр",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.5),
					},
					{
						label: "75%",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.75),
					},
				].filter(
					(item, index, items) =>
						items.findIndex(
							(candidate) => candidate.targetIndex === item.targetIndex,
						) === index,
				)
			: [];

	const dicomFirstFrameCanSelectPrevious =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameCurrentIndex > 0 &&
		!isDicomFirstFramePreviewing;
	const dicomFirstFrameCanSelectNext =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameSelectableCount > 0 &&
		dicomFirstFrameCurrentIndex < dicomFirstFrameSelectableCount - 1 &&
		!isDicomFirstFramePreviewing;

	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		[]) as DicomSeriesPreviewGroup[];
	const typedDicomLocalFolderDiscovery =
		dicomLocalFolderDiscovery as DicomLocalFolderDiscoveryResponse | null;
	const typedLocalImagingOrganizer =
		localImagingOrganizer as LocalImagingOrganizerResponse | null;
	const typedImagingFolderScan =
		imagingFolderScan as ImagingFolderScanResponse | null;
	const typedDicomFolderSeriesScan =
		dicomFolderSeriesScan as DicomFolderSeriesPreviewResponse | null;
	const typedDicomFolderWorkupPlan =
		dicomFolderWorkupPlan as DicomFolderWorkupPlanResponse | null;

	const updateDicomFirstFrameViewerState = (
		updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState,
	) => {
		if (setDicomFirstFrameViewerState) {
			setDicomFirstFrameViewerState((state: DicomFirstFrameViewerState) =>
				updater(state),
			);
		}
	};

	const updateDicomFirstFrameViewerNumber = (
		key: "brightness" | "contrast",
		event: InputChangeEvent,
	) => {
		const value = Number(event.target.value);
		updateDicomFirstFrameViewerState((state) => ({ ...state, [key]: value }));
	};

	const typedMigrationAutopilotSources = (typedMigrationAutopilot?.sources ??
		[]) as MigrationAutopilotSource[];
	const typedMigrationAutopilotClinicLookup =
		typedMigrationAutopilot?.clinicLookup ?? null;
	const typedMigrationAutopilotSteps = (typedMigrationAutopilot?.steps ??
		[]) as MigrationAutopilotStep[];
	const typedMigrationOperatorLanes = (typedMigrationAutopilot?.operatorPacket
		?.lanes ?? []) as MigrationAutopilotPacketLane[];
	const typedMigrationHandoffChecklist = (typedMigrationAutopilot
		?.operatorPacket?.handoffChecklist ??
		[]) as MigrationAutopilotHandoffChecklistItem[];
	const migrationDryRunSummary =
		typedMigrationAutopilot?.operatorPacket?.dryRun ?? null;

	const migrationTriageItems = [...typedMigrationHandoffChecklist]
		.filter((item) => item.blocking || item.status !== "ready_for_preview")
		.sort((left, right) => {
			if (left.blocking !== right.blocking) return left.blocking ? -1 : 1;
			const statusDelta =
				(migrationTriageStatusPriority[left.status] ?? 9) -
				(migrationTriageStatusPriority[right.status] ?? 9);
			if (statusDelta !== 0) return statusDelta;
			return left.title.localeCompare(right.title, "ru");
		})
		.slice(0, 4);

	const typedMigrationDiscoveryCandidates =
		(typedMigrationSourceDiscovery?.candidates ??
			[]) as MigrationLocalSourceDiscoveryCandidate[];
	const typedMigrationWorkupReadinessIssues = typedMigrationSourceWorkup
		? ([
				...typedMigrationSourceWorkup.readiness.blockers,
				...typedMigrationSourceWorkup.readiness.warnings,
			] as MigrationReadinessItem[])
		: [];
	const typedMigrationProbeReadinessIssues = typedMigrationSourceProbe
		? ([
				...typedMigrationSourceProbe.readiness.blockers,
				...typedMigrationSourceProbe.readiness.warnings,
			] as MigrationReadinessItem[])
		: [];
	const typedClinicPublicLookupSuggestions =
		typedClinicPublicLookup?.suggestions ?? [];
	const typedClinicPublicLookupTargets =
		typedClinicPublicLookup?.publicLookupTargets ?? [];
	const migrationOperatorScriptSteps =
		typedMigrationAutopilot?.operatorPacket?.operatorScript?.steps ?? [];
	const migrationPrimaryOperatorStep =
		migrationOperatorScriptSteps.find(
			(step) =>
				step.blocking &&
				step.action !== "doctor_review" &&
				step.action !== "manual",
		) ??
		migrationOperatorScriptSteps.find(
			(step) => step.action !== "doctor_review" && step.action !== "manual",
		) ??
		migrationOperatorScriptSteps[0] ??
		null;

	const migrationPrimaryOperatorCandidate =
		migrationPrimaryOperatorStep?.sourceFingerprint && typedMigrationAutopilot
			? (typedMigrationAutopilotSources.find(
					(source) =>
						source.candidate.sourceFingerprint ===
						migrationPrimaryOperatorStep.sourceFingerprint,
				)?.candidate ?? null)
			: null;

	const migrationCandidatePreviewReady = (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => {
		const materialCount =
			(candidate.matchedFiles ?? 0) +
			(candidate.databaseFiles ?? 0) +
			(candidate.dumpFiles ?? 0) +
			(candidate.tableFiles ?? 0) +
			(candidate.archiveFiles ?? 0) +
			(candidate.dicomLikeFiles ?? 0) +
			(candidate.imageFiles ?? 0);
		return (
			materialCount > 0 ||
			(candidate.sourceRef ?? "").startsWith("browser-local:") ||
			(candidate.sourceRef ?? "").startsWith("smart-preview:")
		);
	};

	const migrationCandidatePreviewHint = (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) =>
		migrationCandidatePreviewReady(candidate)
			? "Предпросмотр построит черновой разбор найденного источника."
			: "Сначала откройте план или проверку источника: у этой подсказки пока нет файлов для предпросмотра.";

	const migrationPreviewableSourceCount =
		typedMigrationAutopilotSources.filter((source) =>
			migrationCandidatePreviewReady(source.candidate),
		).length +
		typedMigrationDiscoveryCandidates.filter(migrationCandidatePreviewReady)
			.length +
		(typedBrowserMigrationDiscovery?.candidates.filter(
			migrationCandidatePreviewReady,
		).length ?? 0);

	const migrationPreAutopilotSourceCount =
		typedMigrationDiscoveryCandidates.length +
		(typedBrowserMigrationDiscovery?.candidates.length ?? 0) +
		(typedSmartImportPreview?.legacySources.length ?? 0);

	const migrationKnownSourceCount =
		typedMigrationAutopilotSources.length || migrationPreAutopilotSourceCount;

	const migrationHandoffReportReady = Boolean(
		typedMigrationAutopilot ||
			typedMigrationSourceDiscovery ||
			typedBrowserMigrationDiscovery ||
			typedSmartImportPreview,
	);

	const migrationPreviewReadyRows = typedSmartImportPreview
		? typedSmartImportPreview.patientPreview.readyRows +
			typedSmartImportPreview.imagingPreview.readyRows
		: 0;

	const migrationClinicLookupFieldCount = typedClinicPublicLookup
		? Object.keys(
				typedClinicPublicLookup.suggestions[0]?.fields ?? {},
			).length
		: 0;

	const migrationSmartClinicFieldCount = typedSmartImportPreview?.clinicSuggestion
		? Object.keys(
				typedSmartImportPreview.clinicSuggestion.fields ?? {},
			).length
		: 0;

	const migrationClinicFieldsFound = Math.max(
		migrationClinicLookupFieldCount,
		migrationSmartClinicFieldCount,
	);

	const migrationProgressItems = [
		{
			id: "source",
			title: "Источник",
			status:
				migrationKnownSourceCount > 0
					? "ready"
					: isMigrationSourceDiscovering || isBrowserMigrationScanning
						? "active"
						: "pending_review",
			detail:
				migrationKnownSourceCount > 0
					? `Найдено ${migrationKnownSourceCount}`
					: isMigrationSourceDiscovering || isBrowserMigrationScanning
						? "Идет поиск"
						: "Нажмите поиск или выберите папку",
		},
		{
			id: "plan",
			title: "План",
			status:
				typedMigrationAutopilot || typedMigrationSourceWorkup
					? "ready"
					: isMigrationAutopilotLoading || isMigrationSourceWorkupLoading
						? "active"
						: "pending_review",
			detail: typedMigrationAutopilot
				? `${Math.round((typedMigrationAutopilot.operatorPacket?.score ?? 0) * 100)}% готовности`
				: typedMigrationSourceWorkup
					? "План источника открыт"
					: isMigrationAutopilotLoading || isMigrationSourceWorkupLoading
						? "Строю маршрут"
						: "После источника",
		},
		{
			id: "preview",
			title: "Предпросмотр",
			status: typedSmartImportPreview
				? "ready"
				: isSmartImportLoading
					? "active"
					: smartImportInputReady || migrationPreviewableSourceCount > 0
						? "pending_review"
						: "locked",
			detail: typedSmartImportPreview
				? `${migrationPreviewReadyRows} готово к записи`
				: isSmartImportLoading
					? "Разбираю строки"
					: smartImportInputReady
						? "Откройте разбор"
						: migrationPreviewableSourceCount > 0
							? `Источников ${migrationPreviewableSourceCount}`
							: migrationAutopilot
								? "Сначала план или проверка источника"
								: "Нужен источник или текст",
		},
		{
			id: "clinic",
			title: "Реквизиты",
			status:
				migrationClinicFieldsFound > 0
					? "ready"
					: isClinicPublicLookupLoading
						? "active"
						: "pending_review",
			detail:
				migrationClinicFieldsFound > 0
					? `Полей ${migrationClinicFieldsFound}`
					: isClinicPublicLookupLoading
						? "Ищу профиль"
						: "Можно добрать отдельно",
		},
	];

	const focusSmartImportWorkbench = () => {
		if (setSmartImportMode) {
			setSmartImportMode("auto");
		}
		if (typeof window === "undefined") return;
		window.setTimeout(() => {
			const textarea = document.querySelector<HTMLTextAreaElement>(
				'textarea[aria-label="Смешанная выгрузка для умного разбора"]',
			);
			if (textarea) {
				textarea.focus();
				textarea.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		}, 100);
	};

	return {
		smartImportInputReady,
		imagingImportInputReady,
		patientImportInputReady,
		typedBrowserMigrationDiscovery,
		typedSmartImportPreview,
		typedImagingSourceChoices,
		typedImagingImportPreview,
		typedImportSourceKinds,
		typedDocumentIngestionTargets,
		typedDocumentIngestion,
		typedImportIntake,
		typedImportPreview,
		clinicLookupSuggestionFieldEntries,
		clinicLookupSuggestionApplySummary,
		applyClinicLookupSuggestion,
		clinicProfileSaveButtonText,
		typedMigrationAutopilot,
		typedMigrationSourceDiscovery,
		typedMigrationSourceWorkup,
		typedMigrationSourceProbe,
		typedClinicPublicLookup,
		typedDicomFirstFramePreview,
		typedDicomFirstFrameViewerState,
		typedDefaultDicomFirstFrameViewerState,
		dicomFirstFrameSelectableCount,
		dicomFirstFrameCurrentIndex,
		dicomFirstFrameSliceMaxIndex,
		dicomFirstFrameLandmarkSlices,
		dicomFirstFrameCanSelectPrevious,
		dicomFirstFrameCanSelectNext,
		typedDicomSeriesPreviewSeries,
		typedDicomLocalFolderDiscovery,
		typedLocalImagingOrganizer,
		typedImagingFolderScan,
		typedDicomFolderSeriesScan,
		typedDicomFolderWorkupPlan,
		updateDicomFirstFrameViewerState,
		updateDicomFirstFrameViewerNumber,
		typedMigrationAutopilotSources,
		typedMigrationAutopilotClinicLookup,
		typedMigrationAutopilotSteps,
		typedMigrationOperatorLanes,
		typedMigrationHandoffChecklist,
		migrationDryRunSummary,
		migrationTriageItems,
		typedMigrationDiscoveryCandidates,
		typedMigrationWorkupReadinessIssues,
		typedMigrationProbeReadinessIssues,
		typedClinicPublicLookupSuggestions,
		typedClinicPublicLookupTargets,
		migrationOperatorScriptSteps,
		migrationPrimaryOperatorStep,
		migrationPrimaryOperatorCandidate,
		migrationCandidatePreviewReady,
		migrationCandidatePreviewHint,
		migrationHandoffReportReady,
		migrationProgressItems,
		focusSmartImportWorkbench,
	};
}

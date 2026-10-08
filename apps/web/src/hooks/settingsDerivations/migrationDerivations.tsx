import type {
	AuditEvent,
	ClinicPublicLookupResponse,
	Dashboard,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	ImportBatch,
	ImportIntakeResponse,
	ImportPreviewResponse,
	ImportSourceKind,
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
import {
	ClipboardCheck,
	Database,
	FileCheck2,
	RefreshCw,
	ScanSearch,
	Search,
	UploadCloud,
	UserCheck,
} from "lucide-react";
import {
	clinicPublicLookupFieldLabels,
	humanizeMigrationText,
	migrationOperatorSourceBoundActions,
	migrationTriageStatusPriority,
} from "../../components/settings/SettingsViewHelpers";
import { motionSafeScrollIntoView } from "../../motionPreference";
import type { MigrationOperatorActionScope } from "./types";

export interface MigrationDerivationsParams {
	dashboard?: Dashboard | null;
	smartImportText?: string;
	clinicProfileDraft?: unknown;
	migrationAutopilot?: unknown;
	migrationSourceDiscovery?: unknown;
	browserMigrationDiscovery?: unknown;
	migrationSourceWorkup?: unknown;
	migrationSourceProbe?: unknown;
	clinicPublicLookup?: unknown;
	smartImportPreview?: unknown;
	importSourceLabels?: Record<string, string>;
	ingestionTargetLabels?: Record<string, string>;
	documentIngestion?: unknown;
	importIntake?: unknown;
	importPreview?: unknown;
	updateClinicProfileDraft: (key: string, value: string) => void;
	setSmartImportMode: (mode: string) => void;
	runMigrationAutopilot: (
		discovery?: unknown,
		options?: { includeSmartImportText?: boolean },
	) => Promise<unknown> | void;
	discoverMigrationSources: () => Promise<unknown> | void;
	pickBrowserMigrationSource: () => Promise<unknown> | void;
	planMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	probeMigrationDiscoveryCandidate: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	addMigrationDiscoveryCandidateToSmartImport: (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) => void;
	lookupClinicPublicProfile: () => Promise<unknown> | void;
	previewMigrationAutopilotSources: (fingerprint?: string) => Promise<unknown> | void;
	isMigrationSourceDiscovering?: boolean;
	isBrowserMigrationScanning?: boolean;
	isMigrationAutopilotLoading?: boolean;
	isMigrationSourceWorkupLoading?: boolean;
	isMigrationSourceProbeLoading?: boolean;
	isSmartImportLoading?: boolean;
	isClinicPublicLookupLoading?: boolean;
}

export function deriveMigrationSettings(params: MigrationDerivationsParams) {
	const {
		dashboard,
		smartImportText,
		clinicProfileDraft,
		migrationAutopilot,
		migrationSourceDiscovery,
		browserMigrationDiscovery,
		migrationSourceWorkup,
		migrationSourceProbe,
		clinicPublicLookup,
		smartImportPreview,
		importSourceLabels,
		ingestionTargetLabels,
		documentIngestion,
		importIntake,
		importPreview,
		updateClinicProfileDraft,
		setSmartImportMode,
		runMigrationAutopilot,
		discoverMigrationSources,
		pickBrowserMigrationSource,
		planMigrationDiscoveryCandidate,
		probeMigrationDiscoveryCandidate,
		addMigrationDiscoveryCandidateToSmartImport,
		lookupClinicPublicProfile,
		previewMigrationAutopilotSources,
		isMigrationSourceDiscovering,
		isBrowserMigrationScanning,
		isMigrationAutopilotLoading,
		isMigrationSourceWorkupLoading,
		isMigrationSourceProbeLoading,
		isSmartImportLoading,
		isClinicPublicLookupLoading,
	} = params;

	const smartImportInputReady = (smartImportText || "").trim().length > 0;
	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;

	const _typedImportBatches = (dashboard?.importBatches ?? []) as ImportBatch[];
	const _typedAuditEvents = (dashboard?.auditEvents ?? []) as AuditEvent[];
	const _typedImportSourceKinds = Object.keys(
		importSourceLabels ?? {},
	) as ImportSourceKind[];
	const _typedDocumentIngestionTargets = Object.keys(
		ingestionTargetLabels ?? {},
	) as DocumentIngestionTarget[];
	const _typedDocumentIngestion =
		documentIngestion as DocumentIngestionResponse | null;
	const _typedImportIntake = importIntake as ImportIntakeResponse | null;
	const _typedImportPreview = importPreview as ImportPreviewResponse | null;

	const migrationHandoffReportGuidanceId = "migration-handoff-report-guidance";

	const clinicLookupSuggestionFieldEntries = (
		fields: Record<string, unknown>,
	) =>
		Object.entries(fields || {}).filter(([key, value]) => {
			if (!Object.hasOwn(clinicPublicLookupFieldLabels || {}, key))
				return false;
			if (value === null || typeof value === "undefined") return false;
			return String(value).trim().length > 0;
		});

	const clinicLookupSuggestionApplySummary = (
		fields: Record<string, unknown>,
	) => {
		const entries = clinicLookupSuggestionFieldEntries(fields);
		if (!entries.length) return "Нет применимых полей для профиля.";

		const currentProfile = clinicProfileDraft as Record<string, unknown>;
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
		clinicLookupSuggestionFieldEntries(fields).forEach(([key, value]) => {
			updateClinicProfileDraft(key, String(value).trim());
		});
	};

	const typedMigrationAutopilot =
		migrationAutopilot as MigrationAutopilotResponse | null;
	const typedMigrationSourceDiscovery =
		migrationSourceDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const activeMigrationDiscoveryForSettingsAutopilot =
		typedMigrationSourceDiscovery ?? typedBrowserMigrationDiscovery ?? null;
	const typedMigrationSourceWorkup =
		migrationSourceWorkup as MigrationLocalSourceWorkupResponse | null;
	const typedMigrationSourceProbe =
		migrationSourceProbe as MigrationLocalSourceProbeResponse | null;
	const typedClinicPublicLookup =
		clinicPublicLookup as ClinicPublicLookupResponse | null;

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
			candidate.matchedFiles +
			candidate.databaseFiles +
			candidate.dumpFiles +
			candidate.tableFiles +
			candidate.archiveFiles +
			candidate.dicomLikeFiles +
			candidate.imageFiles;
		return (
			materialCount > 0 ||
			candidate.sourceRef.startsWith("browser-local:") ||
			candidate.sourceRef.startsWith("smart-preview:")
		);
	};

	const migrationCandidatePreviewHint = (
		candidate: MigrationLocalSourceDiscoveryCandidate,
	) =>
		migrationCandidatePreviewReady(candidate)
			? "Предпросмотр построит черновой разбор найденного источника."
			: "Сначала откройте план или проверку источника: у этой подсказки пока нет файлов для предпросмотра.";

	const migrationPreviewableSourceCount =
		(typedMigrationAutopilotSources ?? []).filter((source) =>
			migrationCandidatePreviewReady(source?.candidate),
		).length +
		(typedMigrationDiscoveryCandidates ?? []).filter(
			migrationCandidatePreviewReady,
		).length +
		(typedBrowserMigrationDiscovery?.candidates?.filter(
			migrationCandidatePreviewReady,
		).length ?? 0);

	const migrationPreAutopilotSourceCount =
		(typedMigrationDiscoveryCandidates ?? []).length +
		(typedBrowserMigrationDiscovery?.candidates?.length ?? 0) +
		(typedSmartImportPreview?.legacySources?.length ?? 0);

	const migrationKnownSourceCount =
		(typedMigrationAutopilotSources ?? []).length ||
		migrationPreAutopilotSourceCount;

	const migrationHandoffReportReady = Boolean(
		typedMigrationAutopilot ||
			typedMigrationSourceDiscovery ||
			typedBrowserMigrationDiscovery ||
			smartImportInputReady,
	);

	const migrationPreviewReadyRows = typedSmartImportPreview
		? (typedSmartImportPreview?.patientPreview?.readyRows ?? 0) +
			(typedSmartImportPreview?.imagingPreview?.readyRows ?? 0)
		: 0;

	const migrationClinicLookupFieldCount = (
		typedClinicPublicLookupSuggestions ?? []
	).reduce(
		(bestCount, suggestion) =>
			Math.max(
				bestCount,
				clinicLookupSuggestionFieldEntries(suggestion?.fields).length,
			),
		0,
	);

	const migrationSmartClinicFieldCount =
		typedSmartImportPreview?.clinicSuggestion
			? clinicLookupSuggestionFieldEntries(
					typedSmartImportPreview.clinicSuggestion.fields,
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
		setSmartImportMode("auto");
		if (typeof window === "undefined") return;
		window.setTimeout(() => {
			const textarea = document.querySelector<HTMLTextAreaElement>(
				'textarea[aria-label="Смешанная выгрузка для умного разбора"]',
			);
			motionSafeScrollIntoView(textarea, { block: "center" });
			textarea?.focus({ preventScroll: true });
		}, 0);
	};

	const renderMigrationOperatorStepActions = (
		step: MigrationAutopilotOperatorScriptStep,
		scriptCandidate: MigrationLocalSourceDiscoveryCandidate | null | undefined,
		testScope: MigrationOperatorActionScope,
	) => {
		const primaryButtonTestId =
			testScope === "primary" ? "migration-primary-action-button" : undefined;
		const scriptTestId = (value: string) =>
			testScope === "script" ? value : primaryButtonTestId;
		const actionButtonClass =
			testScope === "primary" ? "primary-button" : "text-button";
		const operatorStepNeedsCandidate = Boolean(
			step.sourceFingerprint &&
				migrationOperatorSourceBoundActions.includes(step.action) &&
				!scriptCandidate,
		);
		const operatorStepPreviewReady =
			step.action !== "build_preview" ||
			(scriptCandidate
				? migrationCandidatePreviewReady(scriptCandidate)
				: typedMigrationAutopilotSources.some((source) =>
						migrationCandidatePreviewReady(source.candidate),
					));

		return (
			<div className="migration-source-card-actions">
				{operatorStepNeedsCandidate ? (
					<>
						<button
							className="text-button"
							type="button"
							onClick={() =>
								void runMigrationAutopilot(undefined, {
									includeSmartImportText: smartImportInputReady,
								})
							}
							disabled={isMigrationAutopilotLoading}
							data-testid={scriptTestId("operator-script-refresh-plan")}
						>
							<RefreshCw aria-hidden="true" /> Обновить план
						</button>
						<small className="migration-action-hint">
							Источник уже не в текущем автоплане
						</small>
					</>
				) : null}
				{step.action === "discover_sources" ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => void discoverMigrationSources()}
						disabled={
							isMigrationSourceDiscovering || isMigrationAutopilotLoading
						}
						data-testid={scriptTestId("operator-script-discover-sources")}
					>
						<ScanSearch aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "pick_source" ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => void pickBrowserMigrationSource()}
						disabled={isBrowserMigrationScanning || isMigrationAutopilotLoading}
						data-testid={scriptTestId("operator-script-pick-source")}
					>
						<Database aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "open_plan" && scriptCandidate ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => planMigrationDiscoveryCandidate(scriptCandidate)}
						disabled={isMigrationSourceWorkupLoading}
						data-testid={primaryButtonTestId}
					>
						<ClipboardCheck aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "open_probe" && scriptCandidate ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => probeMigrationDiscoveryCandidate(scriptCandidate)}
						disabled={isMigrationSourceProbeLoading}
						data-testid={primaryButtonTestId}
					>
						<ScanSearch aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "add_to_parser" && scriptCandidate ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() =>
							addMigrationDiscoveryCandidateToSmartImport(scriptCandidate)
						}
						data-testid={primaryButtonTestId}
					>
						<UploadCloud aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "run_clinic_lookup" ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => void lookupClinicPublicProfile()}
						disabled={isClinicPublicLookupLoading}
						data-testid={primaryButtonTestId}
					>
						<Search aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "prepare_export" && scriptCandidate ? (
					<button
						className={actionButtonClass}
						type="button"
						onClick={() => planMigrationDiscoveryCandidate(scriptCandidate)}
						disabled={isMigrationSourceWorkupLoading}
						data-testid={primaryButtonTestId}
					>
						<FileCheck2 aria-hidden="true" /> {step.buttonLabel}
					</button>
				) : null}
				{step.action === "build_preview" && !operatorStepNeedsCandidate ? (
					<>
						<button
							className={actionButtonClass}
							type="button"
							onClick={() =>
								void previewMigrationAutopilotSources(step.sourceFingerprint)
							}
							disabled={isSmartImportLoading || !operatorStepPreviewReady}
							data-testid={scriptTestId("operator-script-build-preview")}
						>
							<FileCheck2 aria-hidden="true" /> {step.buttonLabel}
						</button>
						{!operatorStepPreviewReady ? (
							<small className="migration-action-hint">
								Сначала откройте план или проверку источника: у этой подсказки
								пока нет файлов для предпросмотра.
							</small>
						) : null}
					</>
				) : null}
				{step.action === "manual" || step.action === "doctor_review" ? (
					<span>
						<UserCheck aria-hidden="true" /> {step.buttonLabel}
					</span>
				) : null}
			</div>
		);
	};

	const renderMigrationTechnicalNotes = (
		title: string,
		items: string[],
		testId?: string,
	) => {
		const visibleItems = (items ?? []).filter(Boolean).slice(0, 8);
		if (!visibleItems.length) return null;

		return (
			<details className="migration-technical-boundary" data-testid={testId}>
				<summary>{title}</summary>
				<div>
					{visibleItems.map((item) => (
						<small key={item}>{humanizeMigrationText(item)}</small>
					))}
				</div>
			</details>
		);
	};

	return {
		smartImportInputReady,
		typedBrowserMigrationDiscovery,
		typedSmartImportPreview,
		_typedImportBatches,
		_typedAuditEvents,
		_typedImportSourceKinds,
		_typedDocumentIngestionTargets,
		_typedDocumentIngestion,
		_typedImportIntake,
		_typedImportPreview,
		migrationHandoffReportGuidanceId,
		clinicLookupSuggestionFieldEntries,
		clinicLookupSuggestionApplySummary,
		applyClinicLookupSuggestion,
		typedMigrationAutopilot,
		typedMigrationSourceDiscovery,
		activeMigrationDiscoveryForSettingsAutopilot,
		typedMigrationSourceWorkup,
		typedMigrationSourceProbe,
		typedClinicPublicLookup,
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
		migrationPreviewableSourceCount,
		migrationPreAutopilotSourceCount,
		migrationKnownSourceCount,
		migrationHandoffReportReady,
		migrationPreviewReadyRows,
		migrationClinicLookupFieldCount,
		migrationSmartClinicFieldCount,
		migrationClinicFieldsFound,
		migrationProgressItems,
		focusSmartImportWorkbench,
		renderMigrationOperatorStepActions,
		renderMigrationTechnicalNotes,
	};
}

import type {
	MigrationAutopilotHandoffChecklistItem,
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
import { migrationTriageStatusPriority } from "../constants";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { DEMO_SHOWCASE_MIGRATION_AUTOPILOT } from "../migrationAutopilotDemo";

export interface UseMigrationAutopilotLogicParams {
	migrationAutopilot?: any;
	migrationSourceDiscovery?: any;
	migrationSourceWorkup?: any;
	migrationSourceProbe?: any;
	browserMigrationDiscovery?: any;
	smartImportPreview?: any;
	isMigrationSourceDiscovering?: boolean;
	isBrowserMigrationScanning?: boolean;
	isMigrationAutopilotLoading?: boolean;
	isMigrationSourceWorkupLoading?: boolean;
	isSmartImportLoading?: boolean;
	isClinicPublicLookupLoading?: boolean;
	smartImportInputReady?: boolean;
	migrationClinicFieldsFound?: number;
}

export function useMigrationAutopilotLogic(params: UseMigrationAutopilotLogicParams) {
	const {
		migrationAutopilot,
		migrationSourceDiscovery,
		migrationSourceWorkup,
		migrationSourceProbe,
		browserMigrationDiscovery,
		smartImportPreview,
		isMigrationSourceDiscovering,
		isBrowserMigrationScanning,
		isMigrationAutopilotLoading,
		isMigrationSourceWorkupLoading,
		isSmartImportLoading,
		isClinicPublicLookupLoading,
		smartImportInputReady = false,
		migrationClinicFieldsFound = 0,
	} = params;

	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;

	const typedMigrationAutopilot =
		(migrationAutopilot as MigrationAutopilotResponse | null) ??
		(isDemoShowcaseMode() ? DEMO_SHOWCASE_MIGRATION_AUTOPILOT : null);
	const typedMigrationSourceDiscovery =
		migrationSourceDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedMigrationSourceWorkup =
		migrationSourceWorkup as MigrationLocalSourceWorkupResponse | null;
	const typedMigrationSourceProbe =
		migrationSourceProbe as MigrationLocalSourceProbeResponse | null;

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

	return {
		typedMigrationAutopilot,
		typedMigrationSourceDiscovery,
		typedMigrationSourceWorkup,
		typedMigrationSourceProbe,
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
		migrationProgressItems,
	};
}

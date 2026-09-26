import { createHash } from "node:crypto";
/**
 * Migration Autopilot orchestrator and operator packet generation.
 */
import type {
  MigrationAutopilotRequest,
  MigrationAutopilotResponse,
  MigrationAutopilotSource,
  MigrationAutopilotOperatorPacket,
  MigrationLocalSourceDiscoveryCandidate,
  ClinicPublicLookupRequest,
  ClinicPublicLookupResponse,
  SmartImportLegacySource,
  SmartImportClinicProfileSuggestion,
  MigrationLocalSourceProbeResponse
} from "@dental/shared";
import { uniqueStrings, legacySourceTitles } from "./smartImportsUtils.js";
import { safeLegacySourceEvidence } from "./smartImportsLegacyPlans.js";
import { migrationFingerprint, safeMigrationDiscoveryRoots } from "./smartImportsRoots.js";
import { migrationSourceKindIsDatabase } from "./smartImportsReadiness.js";
import { migrationAutopilotResponseSchema } from "@dental/shared";
import { resolveMigrationSourceRoute } from "./smartImportsRoots.js";
import { discoverLocalMigrationSources } from "./smartImportsDiscovery.js";
import { buildMigrationLocalSourceWorkup } from "./smartImportsWorkup.js";
import { buildMigrationLocalSourceProbe } from "./smartImportsProbe.js";
import { buildClinicPublicLookup } from "./smartImportsClinicLookup.js";
import {
  migrationAutopilotPriority,
  migrationAutopilotScore,
  migrationAutopilotRiskFlags,
  migrationAutopilotReadiness,
  migrationAutopilotBridgeKit,
  migrationAutopilotRecommendedAction,
  migrationAutopilotSteps,
  buildMigrationHandoffChecklist,
  buildMigrationOperatorScript,
  migrationPacketStatusFromSources,
  migrationPacketLaneStatusFromSubset,
  migrationPacketScore,
  migrationAutopilotOwner
} from "./smartImportsOperatorScript.js";
import { buildSmartImportPreview } from "./smartImportsPipeline.js";

export function migrationSourceCanStartDryRunPreview(
	source: MigrationAutopilotSource,
) {
	const candidate = source.candidate;
	const tableLikeSource = [
		"csv_export",
		"spreadsheet_export",
		"archive_export",
	].includes(candidate.sourceKind);
	const mediaManifestSource = [
		"dicom_folder",
		"pacs_dicom",
		"xray_image_archive",
	].includes(candidate.sourceKind);
	const hasReadableMaterial =
		candidate.tableFiles +
			candidate.archiveFiles +
			candidate.dicomLikeFiles +
			candidate.imageFiles +
			candidate.matchedFiles >
		0;
	return (
		source.readiness.level === "ready_for_preview" ||
		source.bridgeKit.status === "ready" ||
		tableLikeSource ||
		(mediaManifestSource && hasReadableMaterial) ||
		/^smart-preview:[a-f0-9]{8,12}$/i.test(candidate.sourceRef)
	);
}

export function buildMigrationDryRunSummary(input: {
	sources: MigrationAutopilotSource[];
	totals: MigrationAutopilotOperatorPacket["totals"];
	operatorScript: MigrationAutopilotOperatorPacket["operatorScript"];
}): MigrationAutopilotOperatorPacket["dryRun"] {
	const previewableSources = input.sources.filter(
		migrationSourceCanStartDryRunPreview,
	).length;
	const adminBlockedSources = input.sources.filter(
		(source) =>
			source.owner === "administrator" &&
			(source.readiness.blockers.length > 0 ||
				["blocked", "needs_bridge", "needs_export"].includes(
					source.readiness.level,
				) ||
				source.bridgeKit.status !== "ready"),
	).length;
	const doctorReviewRequiredSources = input.sources.filter((source) => {
		const parserTargets = new Set(source.bridgeKit.parserTargets);
		return (
			parserTargets.has("patients") ||
			parserTargets.has("imaging") ||
			parserTargets.has("dicom_series") ||
			source.riskFlags.includes("review_patient_media_matching")
		);
	}).length;
	const primaryStep =
		input.operatorScript.steps.find(
			(step) =>
				step.blocking && step.owner !== "doctor" && step.action !== "manual",
		) ??
		input.operatorScript.steps.find(
			(step) => step.owner !== "doctor" && step.action !== "manual",
		) ??
		input.operatorScript.steps[0] ??
		null;
	const estimatedClinicDowntimeMinutes = input.sources.length
		? Math.min(
				60,
				(input.totals.blocked > 0 ? 20 : 0) +
					(input.totals.needsExport > 0 ? 15 : 0) +
					(input.totals.needsBridge > 0 ? 10 : 0) +
					(previewableSources ? 0 : input.totals.databaseSources > 0 ? 10 : 0),
			)
		: 0;
	const fastestRoute = !input.sources.length
		? "Запустить поиск на ПК или выбрать корень старой системы; после находки CRM построит план."
		: previewableSources > 0
			? `Сразу открыть предпросмотр по ${previewableSources} источникам; параллельно закрыть ${adminBlockedSources} действий администратора.`
			: input.totals.needsExport > 0
				? "Сначала штатная выгрузка или резервная копия из старой системы, затем предпросмотр без массовой записи."
				: input.totals.needsBridge > 0
					? "Сначала локальное подключение или копия старой базы, затем предпросмотр."
					: "Открыть план верхнего источника и перевести его в предпросмотр.";
	return {
		previewableSources,
		adminBlockedSources,
		doctorReviewRequiredSources,
		estimatedOperatorMinutes: input.operatorScript.totalEstimatedMinutes,
		estimatedClinicDowntimeMinutes,
		fastestRoute,
		nextBestAction: primaryStep
			? `${primaryStep.buttonLabel}: ${primaryStep.title}`
			: "Запустить автопоиск или выбрать папку старой системы.",
	};
}

export function buildMigrationOperatorPacket(input: {
	sources: MigrationAutopilotSource[];
	clinicLookup: ClinicPublicLookupResponse | null;
	probedCount: number;
}): MigrationAutopilotOperatorPacket {
	const sources = input.sources;
	const databaseSources = sources.filter(
		(source) =>
			source.candidate.databaseFiles > 0 ||
			source.candidate.dumpFiles > 0 ||
			[
				"firebird_database",
				"access_database",
				"sqlite_database",
				"sql_dump",
				"mis_database",
			].includes(source.candidate.sourceKind),
	);
	const mediaSources = sources.filter(
		(source) =>
			source.candidate.dicomLikeFiles > 0 ||
			source.candidate.imageFiles > 0 ||
			[
				"dicom_folder",
				"pacs_dicom",
				"vendor_imaging_system",
				"xray_image_archive",
			].includes(source.candidate.sourceKind),
	);
	const tableSources = sources.filter(
		(source) =>
			source.candidate.tableFiles > 0 ||
			["csv_export", "spreadsheet_export", "archive_export"].includes(
				source.candidate.sourceKind,
			),
	);
	const workstationSources = sources.filter((source) =>
		/^workstation-(?:profile|signal):[a-f0-9]{8,12}$/i.test(
			source.candidate.sourceRef,
		),
	);
	const browserManifestSources = sources.filter((source) =>
		/^browser-local:[a-f0-9]{8,12}$/i.test(source.candidate.sourceRef),
	);
	const smartPreviewSources = sources.filter((source) =>
		/^smart-preview:[a-f0-9]{8,12}$/i.test(source.candidate.sourceRef),
	);
	const smartPreviewDatabaseSources = smartPreviewSources.filter((source) =>
		databaseSources.includes(source),
	);
	const smartPreviewTableSources = smartPreviewSources.filter((source) =>
		tableSources.includes(source),
	);
	const smartPreviewMediaSources = smartPreviewSources.filter((source) =>
		mediaSources.includes(source),
	);
	const smartPreviewStructuredSources =
		smartPreviewDatabaseSources.length + smartPreviewTableSources.length;
	const parserTargets = new Set(
		sources.flatMap((source) => source.bridgeKit.parserTargets),
	);
	const totals = {
		sources: sources.length,
		probed: input.probedCount,
		readyForPreview: sources.filter(
			(source) => source.readiness.level === "ready_for_preview",
		).length,
		needsBridge: sources.filter(
			(source) => source.readiness.level === "needs_bridge",
		).length,
		needsExport: sources.filter(
			(source) => source.readiness.level === "needs_export",
		).length,
		manualReview: sources.filter(
			(source) => source.readiness.level === "manual_review",
		).length,
		blocked: sources.filter((source) => source.readiness.level === "blocked")
			.length,
		databaseSources: databaseSources.length,
		mediaSources: mediaSources.length,
		tableSources: tableSources.length,
		workstationHints: workstationSources.length,
		browserManifests: browserManifestSources.length,
		smartPreviewSources: smartPreviewSources.length,
		publicLookupTargets: input.clinicLookup?.publicLookupTargets.length ?? 0,
		clinicSuggestions: input.clinicLookup?.suggestions.length ?? 0,
	};
	const overallStatus = migrationPacketStatusFromSources(sources);
	const lanes: MigrationAutopilotOperatorPacket["lanes"] = [
		{
			id: "clinic-requisites",
			title: "Реквизиты клиники",
			owner: "administrator",
			status: input.clinicLookup
				? input.clinicLookup.suggestions.length
					? "ready_for_preview"
					: input.clinicLookup.publicLookupTargets.length
						? "needs_admin"
						: "manual_review"
				: "manual_review",
			score: input.clinicLookup
				? input.clinicLookup.suggestions.length
					? 0.85
					: input.clinicLookup.publicLookupTargets.length
						? 0.48
						: 0.18
				: 0,
			detail: input.clinicLookup
				? `Безопасный запрос: ${input.clinicLookup.safeQuery || "нет"}; ссылок ${input.clinicLookup.publicLookupTargets.length}; подсказок сервиса ${input.clinicLookup.suggestions.length}.`
				: "Публичный поиск реквизитов не запускался: нужен ИНН, ОГРН, название, адрес или номер лицензии клиники.",
			nextAction:
				input.clinicLookup?.nextAction ??
				"Заполнить хотя бы название/ИНН клиники и запустить автоплан или кнопку реквизитов.",
		},
		{
			id: "legacy-sources",
			title: "Старые базы и выгрузки",
			owner: "administrator",
			status: migrationPacketLaneStatusFromSubset(
				databaseSources.length ? databaseSources : tableSources,
				sources.length ? "manual_review" : "empty",
			),
			score:
				databaseSources.length || tableSources.length
					? Number(
							(
								(databaseSources.length + tableSources.length) /
								Math.max(1, sources.length)
							).toFixed(2),
						)
					: 0,
			detail: `Базы и резервные копии ${databaseSources.length}; таблицы/архивы ${tableSources.length}; из текста/OCR ${smartPreviewStructuredSources}; браузерные списки ${browserManifestSources.length}.`,
			nextAction: databaseSources.length
				? smartPreviewDatabaseSources.length
					? "По текстовым подсказкам подтвердить реальный файл, резервную копию или выгрузку старой базы, затем строить черновой предпросмотр."
					: "Работать только с копией или резервной копией старой базы только для чтения, затем строить черновой предпросмотр."
				: tableSources.length
					? smartPreviewTableSources.length
						? "По текстовым подсказкам подтвердить реальную таблицу, архив или выгрузку и прогнать предпросмотр без записи в базу."
						: "Открыть план по таблицам/архивам и прогнать предпросмотр без записи в базу."
					: smartPreviewStructuredSources
						? "Открыть план по найденным в тексте источникам и подтвердить фактический файл, папку, выгрузку или локальный модуль."
						: "Подключить диск/сетевую папку старой МИС или выбрать папку через браузерный список.",
		},
		{
			id: "imaging",
			title: "КТ, рентген и фото",
			owner: "assistant",
			status: migrationPacketLaneStatusFromSubset(
				mediaSources,
				sources.length ? "manual_review" : "empty",
			),
			score: mediaSources.length
				? Number((mediaSources.length / Math.max(1, sources.length)).toFixed(2))
				: 0,
			detail: `Источников снимков ${mediaSources.length}; из текста/OCR ${smartPreviewMediaSources.length}; системных следов ${workstationSources.length}; КТ/RVG требуют список файлов и сверку пациента.`,
			nextAction: mediaSources.length
				? smartPreviewMediaSources.length
					? "По текстовой подсказке подтвердить реальную RVG/КЛКТ папку или штатную выгрузку снимков, затем предпросмотр метаданных и сверку совпадений."
					: "Для программ снимков сначала сделать штатную выгрузку снимков, затем предпросмотр метаданных и ручную сверку совпадений."
				: "Найти RVG/OPG/КЛКТ папку или след установленной программы снимков.",
		},
		{
			id: "bridge-export",
			title: "Пакет выгрузки и локального разбора",
			owner: "administrator",
			status: overallStatus,
			score: migrationPacketScore(sources, input.clinicLookup),
			detail: `Готово ${totals.readyForPreview}; нужен локальный модуль ${totals.needsBridge}; нужна выгрузка ${totals.needsExport}; ручной разбор ${totals.manualReview}; блокеры ${totals.blocked}.`,
			nextAction:
				sources[0]?.bridgeKit.nextAction ??
				"Сначала найти источник миграции, затем открыть план или проверку.",
		},
		{
			id: "doctor-control",
			title: "Контроль врачом",
			owner: "doctor",
			status: sources.length ? "needs_admin" : "empty",
			score: sources.length ? 0.35 : 0,
			detail:
				"Врач не ищет файлы и не настраивает локальный модуль: он проверяет контрольную выборку карт и спорные привязки снимков.",
			nextAction:
				"После чернового предпросмотра дать врачу 10-20 карт для проверки диагнозов, визитов, оплат, документов и снимков.",
		},
	];
	const firstActions = uniqueStrings(
		[
			sources.length
				? sources[0]?.recommendedAction
				: "Подключить внешний диск, сетевую папку или выбрать папку старой МИС/снимков через кнопку Папка/диск.",
			input.clinicLookup?.suggestions.length
				? "Сверить подсказки реквизитов с ФНС/документами клиники перед сохранением."
				: input.clinicLookup?.publicLookupTargets.length
					? "Открыть публичные ссылки по клинике; пациентские данные туда не вводить."
					: "Заполнить ИНН/ОГРН/название клиники для публичного поиска реквизитов.",
			smartPreviewSources.length
				? `Из текста/OCR найдено ${smartPreviewSources.length} источн.: подтвердить фактический файл, папку, выгрузку или локальный модуль вместо ручного поиска формата.`
				: null,
			sources[0]?.bridgeKit.adminActions[0]?.detail,
			mediaSources.length
				? "Для КЛКТ/рентгена сначала собрать список КТ/RVG, затем подтверждать пациента в CRM."
				: null,
			databaseSources.length
				? "Старую базу читать только с копии или резервной копии; прямая запись из старой системы запрещена."
				: null,
			"Массовую запись делать только после чернового предпросмотра и контрольной выборки врача.",
		].filter((item): item is string => Boolean(item?.trim())),
	).slice(0, 6);
	const operatorScript = buildMigrationOperatorScript({
		sources,
		clinicLookup: input.clinicLookup,
	});
	const dryRun = buildMigrationDryRunSummary({
		sources,
		totals,
		operatorScript,
	});

	return {
		overallStatus,
		score: migrationPacketScore(sources, input.clinicLookup),
		dataClasses: {
			clinicRequisites: Boolean(
				input.clinicLookup?.safeQuery ||
					input.clinicLookup?.suggestions.length ||
					input.clinicLookup?.publicLookupTargets.length,
			),
			oldDatabases: databaseSources.length > 0,
			imaging: mediaSources.length > 0,
			documents: parserTargets.has("documents"),
			serviceCatalog: parserTargets.has("service_catalog"),
			payments: parserTargets.has("payments"),
			workstationHints: workstationSources.length > 0,
			browserManifests: browserManifestSources.length > 0,
			smartPreviewSources: smartPreviewSources.length > 0,
		},
		totals,
		dryRun,
		lanes,
		handoffChecklist: buildMigrationHandoffChecklist({
			sources,
			clinicLookup: input.clinicLookup,
		}),
		firstActions,
		operatorScript,
		onlineLookupPolicy: {
			allowed: [
				"ИНН",
				"ОГРН",
				"КПП",
				"название клиники",
				"юридическое название",
				"адрес клиники",
				"номер лицензии",
			],
			forbidden: [
				"ФИО пациента",
				"телефон пациента",
				"дата рождения",
				"диагноз",
				"КТ/рентген",
				"локальный путь",
				"имя файла",
				"старая база данных",
			],
			safeQuery: input.clinicLookup?.safeQuery || null,
			providerStatus: input.clinicLookup?.providerStatus ?? null,
		},
	};
}

export function uniqueByMigrationCandidateKey(
	candidates: MigrationLocalSourceDiscoveryCandidate[],
	keyOf: (candidate: MigrationLocalSourceDiscoveryCandidate) => string,
) {
	const unique = new Map<string, MigrationLocalSourceDiscoveryCandidate>();
	for (const candidate of candidates) {
		const key = keyOf(candidate);
		if (!unique.has(key)) unique.set(key, candidate);
	}
	return Array.from(unique.values());
}

export function migrationSmartPreviewSourceRef(
	source: SmartImportLegacySource,
	index: number,
) {
	const safeExistingRef =
		source.sourceRef &&
		/^(?:browser-local|smart-preview|workstation-profile|workstation-signal|migration-source):[a-f0-9]{8,12}$/i.test(
			source.sourceRef,
		)
			? source.sourceRef
			: null;
	if (safeExistingRef) return safeExistingRef;
	const seed = JSON.stringify({
		index,
		kind: source.kind,
		title: source.title,
		alias: source.safeSourceAlias,
		evidence: safeLegacySourceEvidence(source),
		route: source.recommendedRoute,
	});
	return `smart-preview:${createHash("sha1").update(seed).digest("hex").slice(0, 10).toUpperCase()}`;
}

export function migrationCandidateFromSmartLegacySource(
	source: SmartImportLegacySource,
	index: number,
): MigrationLocalSourceDiscoveryCandidate {
	const sourceRef = migrationSmartPreviewSourceRef(source, index);
	const sourceFingerprint = migrationFingerprint(sourceRef).toUpperCase();
	const evidence = safeLegacySourceEvidence(source);
	const isDatabase =
		migrationSourceKindIsDatabase(source.kind) && source.kind !== "sql_dump";
	const isDump = source.kind === "sql_dump";
	const isTable =
		source.kind === "spreadsheet_export" || source.kind === "csv_export";
	const isArchive = source.kind === "archive_export";
	const isDicom =
		source.kind === "dicom_folder" ||
		source.kind === "pacs_dicom" ||
		source.kind === "vendor_imaging_system";
	const isImage = source.kind === "xray_image_archive";
	return {
		sourceRef,
		safeDisplayName:
			source.safeSourceAlias ?? `${source.title} #${sourceFingerprint}`,
		sourceKind: source.kind,
		sourceLabel: "Строка предпросмотра",
		sourceFingerprint,
		depth: 0,
		confidence: source.confidence,
		matchedFiles: 1,
		databaseFiles: isDatabase ? 1 : 0,
		dumpFiles: isDump ? 1 : 0,
		tableFiles: isTable ? 1 : 0,
		archiveFiles: isArchive ? 1 : 0,
		dicomLikeFiles: isDicom ? 1 : 0,
		imageFiles: isImage ? 1 : 0,
		hasDicomDir:
			source.kind === "dicom_folder" ||
			evidence.some((item) => /dicomdir/i.test(item)),
		latestModifiedAt: null,
		reasons: uniqueStrings([
			"источник найден во вставленном тексте/Excel/OCR",
			...evidence,
		]).slice(0, 6),
		warnings: [
			"Для переноса нужен фактический файл, папка, выгрузка или локальный модуль; текстовая строка используется как подсказка маршрута.",
		],
		smartImportLine: `${legacySourceTitles[source.kind]} ${sourceRef}`,
	};
}

export function clinicLookupInputFromSmartImport(
	suggestion: SmartImportClinicProfileSuggestion | null,
): ClinicPublicLookupRequest | null {
	const fields = suggestion?.fields;
	if (!fields) return null;
	const clinicText = (value: string | null | undefined) =>
		value?.trim() || undefined;
	const payload: ClinicPublicLookupRequest = {
		inn: clinicText(fields.inn),
		kpp: clinicText(fields.kpp),
		ogrn: clinicText(fields.ogrn),
		clinicName: clinicText(fields.clinicName),
		legalName: clinicText(fields.legalName),
		address: clinicText(fields.address),
		medicalLicenseNumber: clinicText(fields.medicalLicenseNumber),
	};
	return [
		payload.inn,
		payload.ogrn,
		payload.clinicName,
		payload.legalName,
		payload.address,
		payload.medicalLicenseNumber,
	].some((item) => item?.trim())
		? payload
		: null;
}

export async function buildMigrationAutopilot(
	orgId: string,
	input: MigrationAutopilotRequest,
) {
	const warnings = new Set<string>();
	const privacyWarnings = new Set<string>([
		"Автопилот сканирует только локальные источники и ограниченные заголовки; старые базы, снимки и локальные пути не отправляются в публичный поиск.",
		"Онлайн-поиск разрешен только для реквизитов клиники: ИНН, ОГРН, КПП, название, адрес, лицензия.",
	]);
	const smartImportPreview = input.smartImport
		? await buildSmartImportPreview(orgId, input.smartImport)
		: null;
	const smartImportKnownSources = (smartImportPreview?.legacySources ?? [])
		.slice(0, 24)
		.map(migrationCandidateFromSmartLegacySource);
	const explicitKnownSources = [
		...(input.knownSources ?? []),
		...smartImportKnownSources,
	];
	const discovery = await discoverLocalMigrationSources({
		rootPaths: input.rootPaths,
		maxDepth: input.maxDepth,
		maxFolders: input.maxFolders,
		maxFilesPerFolder: input.maxFilesPerFolder,
		maxCandidates: input.maxCandidates,
		includeWorkstationSignals: input.includeWorkstationSignals,
		maxWorkstationSignals: input.maxWorkstationSignals,
	});
	discovery.warnings.forEach((warning) => {
		warnings.add(warning);
	});
	if (input.knownSources?.length) {
		warnings.add(
			"Автопилот добавил браузерный список из явно выбранной папки/файлов; полный локальный путь и содержимое файлов в публичные сервисы не уходят.",
		);
	}
	if (smartImportKnownSources.length) {
		warnings.add(
			"Автопилот добавил источники из текста/Excel/OCR как кандидаты предпросмотра: администратор видит маршрут, но не обязан вручную вспоминать формат старой системы.",
		);
	}

	const candidateKey = (candidate: MigrationLocalSourceDiscoveryCandidate) =>
		`${candidate.sourceRef.toLowerCase()}|${candidate.sourceKind}`;
	const knownCandidateKeys = new Set(
		explicitKnownSources.map((candidate) => candidateKey(candidate)),
	);
	const candidatesBySource = new Map<
		string,
		MigrationLocalSourceDiscoveryCandidate
	>();
	for (const candidate of [...explicitKnownSources, ...discovery.candidates]) {
		const key = candidateKey(candidate);
		const existing = candidatesBySource.get(key);
		if (
			!existing ||
			candidate.confidence > existing.confidence ||
			candidate.matchedFiles > existing.matchedFiles
		) {
			candidatesBySource.set(key, candidate);
		}
	}
	const sortedCandidates = Array.from(candidatesBySource.values()).sort(
		(left, right) =>
			right.confidence - left.confidence ||
			right.matchedFiles - left.matchedFiles ||
			right.databaseFiles +
				right.dumpFiles +
				right.dicomLikeFiles +
				right.imageFiles -
				(left.databaseFiles +
					left.dumpFiles +
					left.dicomLikeFiles +
					left.imageFiles),
	);
	const candidates = uniqueByMigrationCandidateKey(
		[
			...sortedCandidates.filter((candidate) =>
				knownCandidateKeys.has(candidateKey(candidate)),
			),
			...sortedCandidates,
		],
		candidateKey,
	).slice(0, input.maxCandidates);

	const probedCandidates = uniqueByMigrationCandidateKey(
		[
			...candidates.filter((candidate) =>
				knownCandidateKeys.has(candidateKey(candidate)),
			),
			...candidates,
		],
		candidateKey,
	).slice(0, Math.min(input.maxProbeCandidates, candidates.length));
	const sources: MigrationAutopilotSource[] = await Promise.all(
		probedCandidates.map(async (candidate) => {
			let probe: MigrationLocalSourceProbeResponse | null = null;
			try {
				probe = await buildMigrationLocalSourceProbe({
					sourceRef: candidate.sourceRef,
					sourceKind: candidate.sourceKind,
					safeDisplayName: candidate.safeDisplayName,
					maxDepth: Math.min(2, input.maxDepth),
					maxFolders: 100,
					maxFiles: 600,
					maxSampleArtifacts: 10,
					readHeaderBytes: 4096,
				});
				probe.warnings.forEach((warning) => {
					warnings.add(warning);
				});
				probe.privacyWarnings.forEach((warning) => {
					privacyWarnings.add(warning);
				});
			} catch (err) {
				console.error("[Dente] context:", err);
				warnings.add(
					`Источник ${candidate.safeDisplayName} найден, но быстрая проверка не завершилась. Откройте план источника или выберите папку вручную.`,
				);
			}
			const score = migrationAutopilotScore(candidate, probe);
			const readiness = migrationAutopilotReadiness(candidate, probe);
			return {
				candidate,
				probe,
				score,
				priority: migrationAutopilotPriority(score),
				owner: migrationAutopilotOwner(candidate, probe),
				readiness,
				bridgeKit: migrationAutopilotBridgeKit(candidate, probe, readiness),
				recommendedAction: migrationAutopilotRecommendedAction(
					candidate,
					probe,
				),
				riskFlags: migrationAutopilotRiskFlags(candidate, probe),
			};
		}),
	);

	for (const candidate of candidates.slice(probedCandidates.length)) {
		const score = migrationAutopilotScore(candidate, null);
		const readiness = migrationAutopilotReadiness(candidate, null);
		sources.push({
			candidate,
			probe: null,
			score,
			priority: migrationAutopilotPriority(score),
			owner: migrationAutopilotOwner(candidate, null),
			readiness,
			bridgeKit: migrationAutopilotBridgeKit(candidate, null, readiness),
			recommendedAction: migrationAutopilotRecommendedAction(candidate, null),
			riskFlags: migrationAutopilotRiskFlags(candidate, null),
		});
	}

	let clinicLookup: Awaited<ReturnType<typeof buildClinicPublicLookup>> | null =
		null;
	const clinicLookupInput =
		input.clinic ??
		clinicLookupInputFromSmartImport(
			smartImportPreview?.clinicSuggestion ?? null,
		);
	if (clinicLookupInput) {
		clinicLookup = await buildClinicPublicLookup(clinicLookupInput);
		clinicLookup.warnings.forEach((warning) => {
			warnings.add(warning);
		});
	}

	const sortedSources = sources.sort(
		(left, right) =>
			right.score - left.score ||
			right.candidate.confidence - left.candidate.confidence ||
			right.candidate.matchedFiles - left.candidate.matchedFiles,
	);
	const steps = migrationAutopilotSteps({
		sources: sortedSources,
		clinicLookup,
		candidateCount: candidates.length,
	});
	const probedCount = sortedSources.filter((source) => source.probe).length;
	const operatorPacket = buildMigrationOperatorPacket({
		sources: sortedSources,
		clinicLookup,
		probedCount,
	});
	const roots = safeMigrationDiscoveryRoots([
		...discovery.roots,
		...explicitKnownSources.map((candidate) => candidate.sourceRef),
	]);
	const scannedFolders =
		discovery.scannedFolders + (input.knownScannedFolders ?? 0);

	return migrationAutopilotResponseSchema.parse({
		version: "dental-crm-migration-autopilot-v1",
		generatedAt: new Date().toISOString(),
		discovery: {
			roots,
			scannedFolders,
			candidateCount: candidates.length,
			probedCount,
		},
		sources: sortedSources,
		clinicLookup,
		operatorPacket,
		steps,
		warnings: Array.from(warnings),
		privacyWarnings: Array.from(privacyWarnings),
		nextAction: sortedSources.length
			? "Начать с источников critical/high: открыть план, затем проверку, затем черновой предпросмотр. Массовая запись только после контрольной выборки."
			: "Подключить внешний диск, сетевую папку или выбрать корневую папку старой программы вручную; автоплан не нашел пригодный источник.",
	});
}


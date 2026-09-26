/**
 * Autopilot operator scripts, checklist builder, and prioritization.
 */
import type {
  MigrationAutopilotSource,
  MigrationAutopilotStep,
  MigrationAutopilotOperatorScript,
  MigrationBridgeKit,
  MigrationBridgeKitAction,
  MigrationLocalSourceDiscoveryCandidate,
  MigrationLocalSourceProbeResponse,
  MigrationReadiness,
  MigrationAutopilotOperatorPacket,
  ClinicPublicLookupResponse
} from "@dental/shared";
import { legacySourcePlaybook } from "./smartImportsLegacyPlans.js";
import { buildMigrationReadiness, migrationWorkupHandoffs } from "./smartImportsReadiness.js";
import { buildMigrationBridgeKit } from "./smartImportsWorkup.js";
import { buildClinicPublicLookup } from "./smartImportsClinicLookup.js";
import { resolveMigrationSourceRoute } from "./smartImportsRoots.js";
import { migrationSafeAlias } from "./smartImportsRoots.js";

export function migrationAutopilotPriority(
	score: number,
): MigrationAutopilotSource["priority"] {
	if (score >= 0.82) return "critical";
	if (score >= 0.64) return "high";
	if (score >= 0.38) return "normal";
	return "low";
}

export function migrationAutopilotOwner(
	candidate: MigrationLocalSourceDiscoveryCandidate,
	probe: MigrationLocalSourceProbeResponse | null,
): MigrationAutopilotSource["owner"] {
	if (probe?.adapters.some((adapter) => adapter.status === "blocked"))
		return "administrator";
	if (
		candidate.databaseFiles > 0 ||
		candidate.dumpFiles > 0 ||
		[
			"firebird_database",
			"access_database",
			"sqlite_database",
			"sql_dump",
			"mis_database",
		].includes(candidate.sourceKind)
	) {
		return "administrator";
	}
	if (
		candidate.dicomLikeFiles > 0 ||
		candidate.imageFiles > 0 ||
		[
			"dicom_folder",
			"vendor_imaging_system",
			"xray_image_archive",
			"pacs_dicom",
		].includes(candidate.sourceKind)
	) {
		return "assistant";
	}
	return "system";
}

export function migrationAutopilotScore(
	candidate: MigrationLocalSourceDiscoveryCandidate,
	probe: MigrationLocalSourceProbeResponse | null,
) {
	const probeCount =
		(probe?.counts.databases ?? 0) +
		(probe?.counts.dumps ?? 0) +
		(probe?.counts.tables ?? 0) +
		(probe?.counts.archives ?? 0) +
		(probe?.counts.dicom ?? 0) +
		(probe?.counts.images ?? 0) +
		(probe?.counts.models ?? 0);
	const adapterConfidence = probe?.adapters[0]?.confidence ?? 0;
	const inventoryBoost = Math.min(
		0.22,
		Math.log10(candidate.matchedFiles + probeCount + 1) * 0.08,
	);
	const sourceKindBoost = [
		"firebird_database",
		"access_database",
		"sqlite_database",
		"sql_dump",
		"mis_database",
		"dicom_folder",
		"vendor_imaging_system",
	].includes(candidate.sourceKind)
		? 0.12
		: candidate.sourceKind === "xray_image_archive"
			? 0.08
			: 0.04;
	const probeBoost = probe ? 0.08 : 0;
	const blockedPenalty = probe?.sourceExists === false ? 0.28 : 0;
	const score =
		candidate.confidence * 0.52 +
		adapterConfidence * 0.24 +
		inventoryBoost +
		sourceKindBoost +
		probeBoost -
		blockedPenalty;
	return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

export function migrationAutopilotRiskFlags(
	candidate: MigrationLocalSourceDiscoveryCandidate,
	probe: MigrationLocalSourceProbeResponse | null,
) {
	const flags = new Set<string>();
	if (!probe) flags.add("probe_not_completed");
	if (probe?.sourceExists === false) flags.add("source_unavailable");
	if (
		probe?.adapters.some((adapter) => adapter.status === "needs_local_bridge")
	)
		flags.add("needs_local_bridge");
	if (probe?.adapters.some((adapter) => adapter.status === "needs_export"))
		flags.add("needs_vendor_export_or_backup");
	if (probe?.adapters.some((adapter) => adapter.status === "manual"))
		flags.add("manual_mapping_required");
	if (
		candidate.dicomLikeFiles > 0 ||
		candidate.imageFiles > 0 ||
		[
			"dicom_folder",
			"vendor_imaging_system",
			"xray_image_archive",
			"pacs_dicom",
		].includes(candidate.sourceKind)
	) {
		flags.add("review_patient_media_matching");
	}
	if (
		candidate.databaseFiles > 0 ||
		candidate.dumpFiles > 0 ||
		[
			"firebird_database",
			"access_database",
			"sqlite_database",
			"sql_dump",
			"mis_database",
		].includes(candidate.sourceKind)
	) {
		flags.add("work_on_database_copy_only");
	}
	if (candidate.archiveFiles > 0)
		flags.add("archive_must_be_unpacked_in_staging");
	return Array.from(flags);
}

export function migrationAutopilotReadiness(
	candidate: MigrationLocalSourceDiscoveryCandidate,
	probe: MigrationLocalSourceProbeResponse | null,
): MigrationReadiness {
	if (probe) return probe.readiness;
	const playbook = legacySourcePlaybook(candidate.sourceKind);
	const sourceRef = candidate.sourceRef;
	const isBrowserManifest = /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef);
	const isSmartPreviewSource = /^smart-preview:[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
	const isWorkstationProfile = /^workstation-profile:[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
	return buildMigrationReadiness({
		sourceKind: candidate.sourceKind,
		sourceExists: true,
		sourceLabel: candidate.sourceLabel,
		sourceIsDirectory: candidate.sourceLabel.includes("Папка"),
		automationLevel: playbook.automationLevel,
		requiredArtifacts: playbook.requiredArtifacts,
		handoffs: migrationWorkupHandoffs(candidate.sourceKind),
		counts: {
			databases: candidate.databaseFiles,
			dumps: candidate.dumpFiles,
			tables: candidate.tableFiles,
			archives: candidate.archiveFiles,
			dicom: candidate.dicomLikeFiles,
			images: candidate.imageFiles,
			models: 0,
			unknown: Math.max(
				0,
				candidate.matchedFiles -
					candidate.databaseFiles -
					candidate.dumpFiles -
					candidate.tableFiles -
					candidate.archiveFiles -
					candidate.dicomLikeFiles -
					candidate.imageFiles,
			),
		},
		scannedFiles: candidate.matchedFiles,
		isBrowserManifest,
		isSmartPreviewSource,
		isWorkstationProfile:
			isWorkstationProfile ||
			/^workstation-signal:[a-f0-9]{8,12}$/i.test(sourceRef),
		isUrl: /^https?:\/\//i.test(sourceRef),
		nextAction: playbook.nextAction,
	});
}

export function migrationAutopilotBridgeKit(
	candidate: MigrationLocalSourceDiscoveryCandidate,
	probe: MigrationLocalSourceProbeResponse | null,
	readiness: MigrationReadiness,
): MigrationBridgeKit {
	if (probe) return probe.bridgeKit;
	const sourceRef = candidate.sourceRef;
	return buildMigrationBridgeKit({
		sourceKind: candidate.sourceKind,
		sourceLabel: candidate.sourceLabel,
		sourceExists: true,
		safeDisplayName: candidate.safeDisplayName,
		readiness,
		handoffs: migrationWorkupHandoffs(candidate.sourceKind),
		isBrowserManifest: /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef),
		isSmartPreviewSource: /^smart-preview:[a-f0-9]{8,12}$/i.test(sourceRef),
		isWorkstationProfile:
			/^workstation-profile:[a-f0-9]{8,12}$/i.test(sourceRef) ||
			/^workstation-signal:[a-f0-9]{8,12}$/i.test(sourceRef),
		isUrl: /^https?:\/\//i.test(sourceRef),
	});
}

export function migrationAutopilotRecommendedAction(
	candidate: MigrationLocalSourceDiscoveryCandidate,
	probe: MigrationLocalSourceProbeResponse | null,
) {
	const bestAdapter = probe?.adapters[0];
	if (bestAdapter?.nextAction) return bestAdapter.nextAction;
	if (
		candidate.databaseFiles > 0 ||
		candidate.dumpFiles > 0 ||
		[
			"firebird_database",
			"access_database",
			"sqlite_database",
			"sql_dump",
			"mis_database",
		].includes(candidate.sourceKind)
	) {
		return "Сделать копию или резервную копию старой базы и прогнать локальный черновой разбор; прямая запись из старой базы запрещена.";
	}
	if (
		candidate.dicomLikeFiles > 0 ||
		candidate.hasDicomDir ||
		["dicom_folder", "vendor_imaging_system", "pacs_dicom"].includes(
			candidate.sourceKind,
		)
	) {
		return "Передать источник в проверку снимков: сначала метаданные исследования/серии, затем ручная сверка пациента перед привязкой снимков.";
	}
	if (
		candidate.imageFiles > 0 ||
		candidate.sourceKind === "xray_image_archive"
	) {
		return "Собрать список RVG/ОПТГ/фото и показать предпросмотр неподтвержденных совпадений пациенту/администратору.";
	}
	if (
		candidate.tableFiles > 0 ||
		candidate.archiveFiles > 0 ||
		["csv_export", "spreadsheet_export", "archive_export"].includes(
			candidate.sourceKind,
		)
	) {
		return "Извлечь таблицы/архив в черновой текст и отправить в умный предпросмотр без записи в базу.";
	}
	return "Оставить как низкоприоритетный источник и попросить администратора выбрать конкретный файл/папку.";
}

export function migrationAutopilotSteps(input: {
	sources: MigrationAutopilotSource[];
	clinicLookup: Awaited<ReturnType<typeof buildClinicPublicLookup>> | null;
	candidateCount: number;
}): MigrationAutopilotStep[] {
	const hasDb = input.sources.some((source) =>
		source.riskFlags.includes("work_on_database_copy_only"),
	);
	const hasMedia = input.sources.some((source) =>
		source.riskFlags.includes("review_patient_media_matching"),
	);
	const steps: MigrationAutopilotStep[] = [
		{
			order: 1,
			owner: "administrator",
			title: "Подтвердить найденные источники",
			detail: input.candidateCount
				? "Открыть верхние кандидаты по alias/ID, подключить недоступные диски или сетевые папки и исключить случайные архивы."
				: "Указать корневую папку старой МИС, внешний диск или сетевую шару; без источника миграция не стартует.",
			blocking: true,
		},
	];
	if (hasDb) {
		steps.push({
			order: steps.length + 1,
			owner: "administrator",
			title: "Снять копию старой базы только для чтения",
			detail:
				"Работать только с резервной копией или снимком состояния. Старую рабочую МИС не блокировать и не писать в нее из Dental CRM.",
			blocking: true,
		});
	}
	if (input.clinicLookup) {
		steps.push({
			order: steps.length + 1,
			owner: "administrator",
			title: "Сверить публичные реквизиты клиники",
			detail:
				"Использовать ИНН/ОГРН/лицензию из публичных реестров только для профиля клиники; пациентские данные туда не уходят.",
			blocking: false,
		});
	}
	if (hasMedia) {
		steps.push({
			order: steps.length + 1,
			owner: "assistant",
			title: "Собрать список снимков",
			detail:
				"КТ/RVG/ОПТГ сначала проходят предпросмотр метаданных; спорные совпадения пациента остаются неподтвержденными.",
			blocking: false,
		});
	}
	steps.push(
		{
			order: steps.length + 1,
			owner: "system",
			title: "Построить черновой предпросмотр",
			detail:
				"Нормализовать пациентов, визиты, оплаты, документы, услуги и ссылки на медиа в предпросмотр без массовой записи.",
			blocking: true,
		},
		{
			order: steps.length + 2,
			owner: "doctor",
			title: "Проверить контрольную выборку",
			detail:
				"Врач сверяет 10-20 карт: диагнозы, визиты, оплаты, снимки и документы. Массовая запись только после этой проверки.",
			blocking: true,
		},
	);
	return steps.map((step, index) => ({ ...step, order: index + 1 }));
}

export type MigrationAutopilotPacketStatus =
	MigrationAutopilotOperatorPacket["overallStatus"];

export function migrationPacketStatusFromSources(
	sources: MigrationAutopilotSource[],
): MigrationAutopilotPacketStatus {
	if (!sources.length) return "empty";
	if (sources.some((source) => source.readiness.level === "blocked"))
		return "blocked";
	if (sources.some((source) => source.readiness.level === "needs_bridge"))
		return "needs_bridge";
	if (sources.some((source) => source.readiness.level === "needs_export"))
		return "needs_export";
	if (sources.some((source) => source.readiness.level === "manual_review"))
		return "manual_review";
	if (sources.some((source) => source.readiness.level === "ready_for_preview"))
		return "ready_for_preview";
	return "needs_admin";
}

export function migrationPacketLaneStatusFromSubset(
	sources: MigrationAutopilotSource[],
	fallback: MigrationAutopilotPacketStatus,
): MigrationAutopilotPacketStatus {
	return sources.length ? migrationPacketStatusFromSources(sources) : fallback;
}

export function migrationPacketScore(
	sources: MigrationAutopilotSource[],
	clinicLookup: ClinicPublicLookupResponse | null,
) {
	const sourceScore = sources.length
		? sources.reduce((sum, source) => sum + source.readiness.score, 0) /
			sources.length
		: 0;
	const clinicScore = clinicLookup
		? clinicLookup.suggestions.length
			? 0.85
			: clinicLookup.publicLookupTargets.length
				? 0.48
				: 0.18
		: 0;
	const score =
		sources.length && clinicLookup
			? sourceScore * 0.78 + clinicScore * 0.22
			: sources.length
				? sourceScore
				: clinicScore;
	return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

export function migrationPacketStatusFromBridgeStatus(
	status: MigrationBridgeKit["status"],
	readiness: MigrationReadiness,
): MigrationAutopilotPacketStatus {
	if (readiness.level === "blocked" || status === "blocked") return "blocked";
	if (status === "needs_export") return "needs_export";
	if (status === "needs_admin") return "needs_bridge";
	if (status === "manual") return "manual_review";
	if (status === "ready") return "ready_for_preview";
	return readiness.level;
}

export function migrationHandoffPhaseForBridge(
	kind: MigrationBridgeKit["kind"],
): MigrationAutopilotOperatorPacket["handoffChecklist"][number]["phase"] {
	if (kind === "local_db_bridge" || kind === "network_share_bridge")
		return "source_access";
	if (
		kind === "dicom_export" ||
		kind === "image_manifest" ||
		kind === "browser_manifest_bridge" ||
		kind === "manual_manifest" ||
		kind === "file_upload"
	) {
		return "export_or_bridge";
	}
	return "staging_preview";
}

export function buildMigrationHandoffChecklist(input: {
	sources: MigrationAutopilotSource[];
	clinicLookup: ClinicPublicLookupResponse | null;
}): MigrationAutopilotOperatorPacket["handoffChecklist"] {
	const items: MigrationAutopilotOperatorPacket["handoffChecklist"] = [];
	const addItem = (
		item: MigrationAutopilotOperatorPacket["handoffChecklist"][number],
	) => {
		const key = `${item.phase}:${item.owner}:${item.sourceFingerprint ?? "clinic"}:${item.title}`;
		if (
			items.some(
				(existing) =>
					`${existing.phase}:${existing.owner}:${existing.sourceFingerprint ?? "clinic"}:${existing.title}` ===
					key,
			)
		)
			return;
		items.push(item);
	};

	addItem({
		id: "clinic-public-requisites",
		phase: "clinic_requisites",
		owner: "administrator",
		status: input.clinicLookup
			? input.clinicLookup.suggestions.length
				? "ready_for_preview"
				: input.clinicLookup.publicLookupTargets.length
					? "needs_admin"
					: "manual_review"
			: "manual_review",
		title: "Сверить реквизиты клиники",
		detail: input.clinicLookup
			? `Безопасный запрос ${input.clinicLookup.safeQuery || "не построен"}; публичных ссылок ${input.clinicLookup.publicLookupTargets.length}; подсказок сервиса ${input.clinicLookup.suggestions.length}.`
			: "Заполнить ИНН, ОГРН, название, адрес или номер лицензии, затем повторить поиск реквизитов.",
		requiredArtifact: "ИНН/ОГРН/КПП/название/адрес/лицензия клиники",
		sourceFingerprint: null,
		sourceKind: null,
		privacy:
			"Только публичные реквизиты клиники; пациенты, телефоны пациентов, снимки, диагнозы и старые базы запрещены.",
		doneWhen:
			"Профиль клиники заполнен и реквизиты сверены с ФНС/лицензией/документами клиники.",
		blocking: false,
	});

	for (const source of input.sources.slice(0, 6)) {
		const sourceId = source.candidate.sourceFingerprint.toUpperCase();
		const status = migrationPacketStatusFromBridgeStatus(
			source.bridgeKit.status,
			source.readiness,
		);
		const phase = migrationHandoffPhaseForBridge(source.bridgeKit.kind);
		for (const action of source.bridgeKit.adminActions.slice(0, 2)) {
			addItem({
				id: `${phase}:${source.candidate.sourceFingerprint}:${action.id}`,
				phase,
				owner: action.owner,
				status,
				title: `${action.title} · ${source.candidate.sourceKind} #${sourceId}`,
				detail: action.detail,
				requiredArtifact: source.bridgeKit.outputManifest.format,
				sourceFingerprint: source.candidate.sourceFingerprint,
				sourceKind: source.candidate.sourceKind,
				privacy: action.safety || source.bridgeKit.privacyBoundary,
				doneWhen: action.doneWhen,
				blocking:
					source.readiness.blockers.length > 0 ||
					source.bridgeKit.status !== "ready",
			});
		}
		const doctorAction = source.bridgeKit.doctorActions[0];
		if (doctorAction) {
			addItem({
				id: `doctor:${source.candidate.sourceFingerprint}:${doctorAction.id}`,
				phase: "doctor_control",
				owner: doctorAction.owner,
				status:
					source.readiness.level === "ready_for_preview"
						? "needs_admin"
						: status,
				title: `${doctorAction.title} · ${source.candidate.sourceKind} #${sourceId}`,
				detail: doctorAction.detail,
				requiredArtifact:
					"контрольная выборка 10-20 карт после чернового предпросмотра",
				sourceFingerprint: source.candidate.sourceFingerprint,
				sourceKind: source.candidate.sourceKind,
				privacy:
					doctorAction.safety ||
					"Врач видит только черновой предпросмотр внутри CRM; публичные сервисы не получают пациентов или снимки.",
				doneWhen: doctorAction.doneWhen,
				blocking: true,
			});
		}
	}

	addItem({
		id: "system-staging-preview",
		phase: "staging_preview",
		owner: "system",
		status: input.sources.length
			? migrationPacketStatusFromSources(input.sources)
			: "empty",
		title: "Построить черновой предпросмотр",
		detail: input.sources.length
			? "После выгрузки или локального разбора CRM строит предпросмотр пациентов, визитов, оплат, документов, услуг и ссылок на снимки без массовой записи."
			: "Сначала нужен хотя бы один источник миграции: старая база, выгрузка, папка КТ/RVG, браузерный список или след установленной программы.",
		requiredArtifact:
			"черновой список из локального разбора, выгрузки или проверки",
		sourceFingerprint: null,
		sourceKind: null,
		privacy:
			"Предпросмотр остается внутри CRM; массовая запись и публичный поиск не получают сырые данные старой системы.",
		doneWhen:
			"Предпросмотр построен, счетчики строк/снимков/документов понятны, ошибки вынесены в проверку.",
		blocking: true,
	});

	return items.slice(0, 14);
}

export function buildMigrationOperatorScript(input: {
	sources: MigrationAutopilotSource[];
	clinicLookup: ClinicPublicLookupResponse | null;
}): MigrationAutopilotOperatorPacket["operatorScript"] {
	const sources = input.sources;
	const steps: MigrationAutopilotOperatorPacket["operatorScript"]["steps"] = [];
	const addStep = (
		step: MigrationAutopilotOperatorPacket["operatorScript"]["steps"][number],
	) => {
		if (steps.some((existing) => existing.id === step.id)) return;
		steps.push(step);
	};
	const topSource = sources[0] ?? null;
	const smartPreviewSources = sources.filter((source) =>
		/^smart-preview:[a-f0-9]{8,12}$/i.test(source.candidate.sourceRef),
	);
	const topSourceIsSmartPreview = Boolean(
		topSource &&
			/^smart-preview:[a-f0-9]{8,12}$/i.test(topSource.candidate.sourceRef),
	);
	const topDatabaseSource =
		sources.find((source) =>
			[
				"firebird_database",
				"access_database",
				"sqlite_database",
				"sql_dump",
				"mis_database",
			].includes(source.candidate.sourceKind),
		) ?? null;
	const topMediaSource =
		sources.find((source) =>
			[
				"dicom_folder",
				"pacs_dicom",
				"vendor_imaging_system",
				"xray_image_archive",
			].includes(source.candidate.sourceKind),
		) ?? null;
	const topTableSource =
		sources.find((source) =>
			["csv_export", "spreadsheet_export", "archive_export"].includes(
				source.candidate.sourceKind,
			),
		) ?? null;
	const previewSource =
		sources.find((source) => source.readiness.level === "ready_for_preview") ??
		topTableSource ??
		topDatabaseSource ??
		topMediaSource ??
		topSource;

	if (!sources.length) {
		addStep({
			id: "admin-discover-sources",
			owner: "administrator",
			title: "Запустите автопоиск старых баз и снимков на этом ПК",
			buttonLabel: "Найти на ПК + план",
			detail:
				"CRM проверит типовые папки старых МИС, следы установленных программ, диски и сетевые корни в пределах лимитов сканирования, затем сразу соберет автоплан по найденным кандидатам.",
			action: "discover_sources",
			sourceFingerprint: null,
			sourceKind: null,
			estimatedMinutes: 3,
			blocking: true,
		});
		addStep({
			id: "admin-pick-source",
			owner: "administrator",
			title:
				"Если автопоиск не помог, выберите папку старой программы или диск",
			buttonLabel: "Папка/диск",
			detail:
				"Выберите корень диска, папку старой МИС, КТ/RVG-архив или сетевую папку. CRM сама построит список и кандидатов.",
			action: "pick_source",
			sourceFingerprint: null,
			sourceKind: null,
			estimatedMinutes: 5,
			blocking: true,
		});
	}

	if (topSource) {
		addStep({
			id: `admin-open-plan-${topSource.candidate.sourceFingerprint}`,
			owner: "administrator",
			title: "Откройте план по самому вероятному источнику",
			buttonLabel: "План переноса",
			detail: `${topSource.candidate.safeDisplayName}: ${topSource.recommendedAction}`,
			action: "open_plan",
			sourceFingerprint: topSource.candidate.sourceFingerprint,
			sourceKind: topSource.candidate.sourceKind,
			estimatedMinutes: 2,
			blocking: true,
		});
		addStep({
			id: `admin-run-probe-${topSource.candidate.sourceFingerprint}`,
			owner: "administrator",
			title: "Проверьте источник перед переносом",
			buttonLabel: topSourceIsSmartPreview
				? "Подтвердить источник"
				: "Проверить источник",
			detail: topSourceIsSmartPreview
				? "CRM проверит распознанный тип из текста/OCR и покажет, какой реальный файл, папка, выгрузка или локальный модуль нужен дальше."
				: "CRM посчитает типы файлов, заголовки и подходящий маршрут, чтобы администратор не выбирал перенос вручную.",
			action: "open_probe",
			sourceFingerprint: topSource.candidate.sourceFingerprint,
			sourceKind: topSource.candidate.sourceKind,
			estimatedMinutes: topSource.candidate.matchedFiles > 500 ? 8 : 3,
			blocking: true,
		});
	}

	if (topDatabaseSource) {
		addStep({
			id: `admin-db-export-${topDatabaseSource.candidate.sourceFingerprint}`,
			owner: "administrator",
			title: "Подготовьте копию старой базы или штатный экспорт",
			buttonLabel: "Подготовить выгрузку",
			detail: `${topDatabaseSource.candidate.safeDisplayName}: нужна копия базы или штатная выгрузка, затем предпросмотр пациентов, визитов, оплат и услуг.`,
			action: "prepare_export",
			sourceFingerprint: topDatabaseSource.candidate.sourceFingerprint,
			sourceKind: topDatabaseSource.candidate.sourceKind,
			estimatedMinutes: 25,
			blocking: true,
		});
	} else if (topTableSource) {
		addStep({
			id: `admin-table-parser-${topTableSource.candidate.sourceFingerprint}`,
			owner: "administrator",
			title: "Разберите таблицу или архив",
			buttonLabel: "Разобрать таблицу",
			detail: `${topTableSource.candidate.safeDisplayName}: таблицу проще сразу открыть в предпросмотре, затем исправить спорные строки.`,
			action: "add_to_parser",
			sourceFingerprint: topTableSource.candidate.sourceFingerprint,
			sourceKind: topTableSource.candidate.sourceKind,
			estimatedMinutes: 5,
			blocking: false,
		});
	}

	if (topMediaSource) {
		addStep({
			id: `assistant-media-export-${topMediaSource.candidate.sourceFingerprint}`,
			owner: "assistant",
			title: "Подготовьте список снимков или штатную выгрузку",
			buttonLabel: "Подготовить снимки",
			detail: `${topMediaSource.candidate.safeDisplayName}: сначала список исследований/файлов, затем сверка пациента и только потом привязка в карту.`,
			action: "prepare_export",
			sourceFingerprint: topMediaSource.candidate.sourceFingerprint,
			sourceKind: topMediaSource.candidate.sourceKind,
			estimatedMinutes: 20,
			blocking: false,
		});
	}

	addStep({
		id: "admin-clinic-requisites",
		owner: "administrator",
		title: input.clinicLookup
			? "Сверьте реквизиты клиники"
			: "Заполните ИНН или название клиники",
		buttonLabel: input.clinicLookup ? "Сверить" : "Реквизиты",
		detail: input.clinicLookup
			? input.clinicLookup.nextAction
			: "Это нужно для документов, договоров, налоговых справок и публичного профиля клиники; пациентские данные здесь не нужны.",
		action: "run_clinic_lookup",
		sourceFingerprint: null,
		sourceKind: null,
		estimatedMinutes: input.clinicLookup?.suggestions.length ? 3 : 7,
		blocking: false,
	});

	if (sources.length) {
		addStep({
			id: `system-build-preview-${previewSource?.candidate.sourceFingerprint ?? "all"}`,
			owner: "system",
			title: "Постройте предпросмотр перед записью",
			buttonLabel: "Предпросмотр",
			detail: previewSource
				? `${previewSource.candidate.safeDisplayName}: CRM соберет предпросмотр из найденных источников, чтобы сразу увидеть маршрут переноса.`
				: "После выгрузки или подключения CRM должна показать счетчики пациентов, визитов, оплат, документов и снимков до массовой записи.",
			action: "build_preview",
			sourceFingerprint: previewSource?.candidate.sourceFingerprint ?? null,
			sourceKind: previewSource?.candidate.sourceKind ?? null,
			estimatedMinutes: 5,
			blocking: true,
		});

		addStep({
			id: "doctor-control-sample",
			owner: "doctor",
			title: "Врач проверяет только контрольные карты",
			buttonLabel: "Проверка",
			detail:
				"Не заставляйте врача искать папки. Его задача: открыть 10-20 перенесенных карт и подтвердить, что визиты, диагнозы, оплаты, документы и снимки попали верно.",
			action: "doctor_review",
			sourceFingerprint: null,
			sourceKind: null,
			estimatedMinutes: 20,
			blocking: true,
		});
	}

	const visibleSteps = steps.slice(0, 7);
	return {
		title: "Что делать сейчас",
		headline: sources.length
			? smartPreviewSources.length
				? `Текст/OCR подсказал ${smartPreviewSources.length} источн.: откройте план, подтвердите реальный файл/папку/выгрузку, затем предпросмотр.`
				: `Начните с ${topSource?.candidate.safeDisplayName ?? "верхнего источника"}: план, проверка, затем выгрузка/предпросмотр.`
			: "Выберите папку или диск старой системы, дальше CRM сама соберет кандидатов.",
		totalEstimatedMinutes: visibleSteps.reduce(
			(sum, step) => sum + step.estimatedMinutes,
			0,
		),
		steps: visibleSteps,
	};
}


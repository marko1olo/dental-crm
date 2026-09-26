/**
 * Migration readiness evaluation and technical check builders.
 */
import type {
  MigrationLocalSourceDiscoveryCandidate,
  MigrationLocalSourceWorkupRequest,
  MigrationReadiness,
  MigrationReadinessItem,
  MigrationBridgeKitAction,
  MigrationBridgeKit,
  SmartImportLegacySource,
  MigrationProbeAdapter
} from "@dental/shared";
import { emptyMigrationProbeCounts } from "./smartImportsProbe.js";
import { migrationVendorGuidanceCatalog } from "./smartImportsConstants.js";
import { resolveMigrationSourceRoute } from "./smartImportsRoots.js";

export const legacySourceTitles: Record<string, string> = {
  mis_database: "База данных МИС",
  mis_backup: "Резервная копия МИС",
  mis_export: "Табличная выгрузка",
  mis_archive: "Архив данных",
  imaging_study: "КТ / Снимки",
  imaging_archive: "Архив снимков",
  unknown_legacy_source: "Неизвестный источник"
};

export function migrationWorkupExtractableEntities(
	kind: SmartImportLegacySource["kind"],
) {
	if (kind === "dicom_folder" || kind === "pacs_dicom")
		return ["imaging", "dicom_series"] as const;
	if (kind === "vendor_imaging_system")
		return ["imaging", "dicom_series", "patients"] as const;
	if (kind === "xray_image_archive") return ["imaging", "patients"] as const;
	if (kind === "csv_export" || kind === "spreadsheet_export") {
		return [
			"clinic_profile",
			"patients",
			"appointments",
			"visits",
			"payments",
			"service_catalog",
			"documents",
			"imaging",
		] as const;
	}
	if (kind === "archive_export")
		return [
			"patients",
			"visits",
			"payments",
			"documents",
			"imaging",
			"unknown",
		] as const;
	if (kind === "network_share")
		return ["patients", "documents", "imaging", "unknown"] as const;
	if (
		kind === "firebird_database" ||
		kind === "access_database" ||
		kind === "sqlite_database" ||
		kind === "sql_dump" ||
		kind === "mis_database"
	) {
		return [
			"clinic_profile",
			"patients",
			"appointments",
			"visits",
			"payments",
			"documents",
			"imaging",
			"service_catalog",
		] as const;
	}
	return ["unknown"] as const;
}

export function migrationWorkupHandoffs(kind: SmartImportLegacySource["kind"]) {
	const privacy =
		"Передавать только локальный путь или список в CRM; публичные карты и поиск не получают пациентов, файлы старой базы или снимки.";
	if (
		kind === "dicom_folder" ||
		kind === "pacs_dicom" ||
		kind === "vendor_imaging_system"
	) {
		return [
			{
				title: "Проверка метаданных снимков",
				method: "POST" as const,
				endpoint: "/api/imaging/dicom/folder-workup-plan",
				payloadHint:
					"папка, режим обхода и сведения рабочей станции; тяжелые данные остаются локально до выбора серии",
				privacy,
			},
			{
				title: "Предпросмотр списка снимков",
				method: "POST" as const,
				endpoint: "/api/imaging/imports/preview",
				payloadHint: "строки метаданных после чтения заголовков снимков",
				privacy,
			},
		];
	}
	if (kind === "xray_image_archive") {
		return [
			{
				title: "Предпросмотр списка папки",
				method: "POST" as const,
				endpoint: "/api/imaging/folders/scan-preview",
				payloadHint:
					"папка и название источника; оригиналы снимков остаются на месте",
				privacy,
			},
			{
				title: "Предпросмотр импорта снимков",
				method: "POST" as const,
				endpoint: "/api/imaging/imports/preview",
				payloadHint:
					"собранный список снимков с подсказками пациента, даты и типа",
				privacy,
			},
		];
	}
	if (
		kind === "csv_export" ||
		kind === "spreadsheet_export" ||
		kind === "archive_export"
	) {
		return [
			{
				title: "Разбор документов и таблиц",
				method: "POST" as const,
				endpoint: "/api/ingestion/extract",
				payloadHint:
					"файл или извлеченный текст, затем маршрут в импорт, пациентов, снимки или прайс",
				privacy,
			},
			{
				title: "Предпросмотр импорта",
				method: "POST" as const,
				endpoint: "/api/imports/smart/preview",
				payloadHint: "нормализованный текст или список из извлеченных таблиц",
				privacy,
			},
		];
	}
	return [
		{
			title: "Локальный черновой разбор только для чтения",
			method: "POST" as const,
			endpoint: "/api/imports/smart/preview",
			payloadHint:
				"табличный список из локального модуля базы; браузер не разбирает базу напрямую",
			privacy,
		},
	];
}

export function migrationWorkupSteps(
	kind: SmartImportLegacySource["kind"],
	sourceExists: boolean,
) {
	const firstStatus = sourceExists ? ("ready" as const) : ("manual" as const);
	if (
		kind === "dicom_folder" ||
		kind === "pacs_dicom" ||
		kind === "vendor_imaging_system"
	) {
		return [
			{
				id: "metadata_scan",
				title: "Снять список исследований",
				status: firstStatus,
				detail:
					"Прочитать список снимков и сгруппировать исследования/серии без загрузки тяжелых данных.",
				actionLabel: "Метаданные снимков",
			},
			{
				id: "patient_match",
				title: "Сопоставить пациентов",
				status: "manual" as const,
				detail:
					"Сверить ФИО/телефон/дату вручную, потому что имя пациента в старых снимках часто грязное или пустое.",
				actionLabel: "Сверить совпадения",
			},
			{
				id: "viewer_workup",
				title: "Подготовить КЛКТ/КТ-срезы",
				status: "needs_bridge" as const,
				detail:
					"Для КЛКТ подготовить список серий для просмотра; исходные файлы остаются в локальной папке или в старом просмотрщике.",
				actionLabel: "План КЛКТ",
			},
		];
	}
	if (kind === "xray_image_archive") {
		return [
			{
				id: "manifest",
				title: "Собрать список снимков",
				status: firstStatus,
				detail:
					"Найти RVG/ОПТГ/TRG/фото и извлечь дату/тип/пациента из имени файла или соседней таблицы.",
				actionLabel: "Сканировать папку",
			},
			{
				id: "review_unmatched",
				title: "Проверить неподтвержденные снимки",
				status: "manual" as const,
				detail:
					"Не привязывать снимки с сомнительным совпадением автоматически.",
				actionLabel: "Открыть предпросмотр",
			},
		];
	}
	if (
		kind === "csv_export" ||
		kind === "spreadsheet_export" ||
		kind === "archive_export"
	) {
		return [
			{
				id: "extract",
				title: "Извлечь таблицы и текст",
				status: firstStatus,
				detail:
					"Разобрать файл/архив в черновой текст, не записывая строки в базу.",
				actionLabel: "Извлечь",
			},
			{
				id: "smart_preview",
				title: "Показать предпросмотр",
				status: "ready" as const,
				detail:
					"Разделить пациентов, снимки, реквизиты клиники и мусорные строки.",
				actionLabel: "Умный предпросмотр",
			},
		];
	}
	return [
		{
			id: "copy_snapshot",
			title: "Снять копию старой базы",
			status: sourceExists ? ("ready" as const) : ("manual" as const),
			detail:
				"Работать с копией или резервной копией, не с живой базой старой МИС.",
			actionLabel: "Копия базы",
		},
		{
			id: "local_bridge",
			title: "Прогнать локальный черновой разбор",
			status: "needs_bridge" as const,
			detail:
				"Извлечь таблицы пациентов, визитов, оплат и ссылок на снимки в табличный список для предпросмотра.",
			actionLabel: "Локальный разбор",
		},
		{
			id: "control_sample",
			title: "Сверить 10 контрольных карт",
			status: "manual" as const,
			detail:
				"До массовой записи сравнить старую и новую карту по пациентам, визитам, оплатам и снимкам.",
			actionLabel: "Контроль",
		},
	];
}

export function migrationSourceKindIsDatabase(kind: SmartImportLegacySource["kind"]) {
	return (
		kind === "firebird_database" ||
		kind === "access_database" ||
		kind === "sqlite_database" ||
		kind === "sql_dump" ||
		kind === "mis_database"
	);
}

export function migrationSourceKindIsImaging(kind: SmartImportLegacySource["kind"]) {
	return (
		kind === "dicom_folder" ||
		kind === "pacs_dicom" ||
		kind === "vendor_imaging_system" ||
		kind === "xray_image_archive"
	);
}

export function migrationSourceKindIsTableLike(kind: SmartImportLegacySource["kind"]) {
	return (
		kind === "csv_export" ||
		kind === "spreadsheet_export" ||
		kind === "archive_export"
	);
}

export function migrationReadinessItem(
	input: MigrationReadinessItem,
): MigrationReadinessItem {
	return input;
}

export function buildMigrationReadiness(input: {
	sourceKind: SmartImportLegacySource["kind"];
	sourceExists: boolean;
	sourceLabel: string;
	sourceIsDirectory?: boolean;
	automationLevel?: SmartImportLegacySource["automationLevel"];
	requiredArtifacts?: string[];
	adapters?: MigrationProbeAdapter[];
	handoffs?: ReturnType<typeof migrationWorkupHandoffs>;
	counts?: ReturnType<typeof emptyMigrationProbeCounts>;
	scannedFiles?: number;
	isBrowserManifest?: boolean;
	isSmartPreviewSource?: boolean;
	isWorkstationProfile?: boolean;
	isUrl?: boolean;
	nextAction?: string;
}): MigrationReadiness {
	const blockers: MigrationReadinessItem[] = [];
	const warnings: MigrationReadinessItem[] = [];
	const ready: MigrationReadinessItem[] = [];
	const adapters = input.adapters ?? [];
	const counts = input.counts;
	const inventoryCount = counts
		? counts.databases +
			counts.dumps +
			counts.tables +
			counts.archives +
			counts.dicom +
			counts.images +
			counts.models +
			counts.unknown
		: 0;
	const hasBuiltInAdapter = adapters.some(
		(adapter) => adapter.status === "built_in",
	);
	const hasNeedsBridgeAdapter = adapters.some(
		(adapter) => adapter.status === "needs_local_bridge",
	);
	const hasNeedsExportAdapter = adapters.some(
		(adapter) => adapter.status === "needs_export",
	);
	const hasManualAdapter = adapters.some(
		(adapter) => adapter.status === "manual",
	);
	const hasBlockedAdapter = adapters.some(
		(adapter) => adapter.status === "blocked",
	);
	const hasPreviewHandoff = (input.handoffs ?? []).some((handoff) =>
		/preview|workup|extract|scan/i.test(`${handoff.title} ${handoff.endpoint}`),
	);

	if (!input.sourceExists || hasBlockedAdapter) {
		blockers.push(
			migrationReadinessItem({
				id: "source_available",
				title: "Источник недоступен",
				status: "blocked",
				owner: "administrator",
				detail:
					"CRM видит только краткое описание источника. Пока диск, сетевая папка, резервная копия или выгрузка не подключены, предпросмотр строить нельзя.",
				nextAction:
					"Подключить носитель, открыть сетевую папку только для чтения или выбрать фактическую папку данных либо резервной копии и повторить проверку.",
			}),
		);
	} else if (input.isWorkstationProfile) {
		blockers.push(
			migrationReadinessItem({
				id: "profile_is_not_data",
				title: "Найден только след старой программы",
				status: "blocked",
				owner: "administrator",
				detail:
					"Ярлык или папка программы доказывает наличие старой системы, но не дает таблицы, выгрузку снимков или резервную копию.",
				nextAction:
					input.nextAction ??
					"Открыть старую программу, сделать штатную выгрузку или выбрать ее папку данных.",
			}),
		);
	} else if (input.isSmartPreviewSource) {
		warnings.push(
			migrationReadinessItem({
				id: "smart_preview_needs_real_source",
				title: "Источник найден в тексте",
				status: "warning",
				owner: "administrator",
				detail:
					"CRM распознала старую базу, КТ/снимки или выгрузку во вставленном тексте. Для реального переноса нужно выбрать фактический файл, папку, выгрузку или локальный модуль.",
				nextAction:
					input.nextAction ??
					"Открыть план, затем выбрать фактический источник или подготовить штатную выгрузку либо резервную копию.",
			}),
		);
	} else if (input.isBrowserManifest) {
		warnings.push(
			migrationReadinessItem({
				id: "browser_manifest_boundary",
				title: "Список выбран в браузере",
				status: "warning",
				owner: "administrator",
				detail:
					"Сервер не хранит полный локальный путь и не сможет сам перечитать файлы после перезапуска.",
				nextAction:
					"Для чернового разбора держать выбор папки активным, повторить выбор или подключить локальный модуль.",
			}),
		);
	} else {
		ready.push(
			migrationReadinessItem({
				id: "source_available",
				title: "Источник выбран",
				status: "ready",
				owner: "system",
				detail: input.sourceIsDirectory
					? "Есть доступная папка-источник."
					: `${input.sourceLabel} доступен для ограниченной проверки и чернового разбора.`,
				nextAction:
					"Использовать только предпросмотр до подтверждения контрольной выборки.",
			}),
		);
	}

	if (migrationSourceKindIsDatabase(input.sourceKind)) {
		blockers.push(
			migrationReadinessItem({
				id: hasNeedsExportAdapter
					? "database_export_required"
					: "database_bridge_required",
				title: hasNeedsExportAdapter
					? "Нужна штатная выгрузка или резервная копия"
					: "Нужен локальный черновой разбор",
				status: "blocked",
				owner: "administrator",
				detail:
					"Базу старой МИС нельзя переносить напрямую. Нужна отдельная копия или резервная копия, затем нормализованный табличный список для предпросмотра.",
				nextAction: hasNeedsExportAdapter
					? "Снять штатную выгрузку или резервную копию старой системы и прогнать ее через локальный модуль."
					: "Прогнать локальный модуль только для чтения на копии базы и открыть предпросмотр импорта.",
			}),
		);
	} else if (
		input.sourceKind === "vendor_imaging_system" &&
		!hasBuiltInAdapter
	) {
		blockers.push(
			migrationReadinessItem({
				id: "vendor_export_required",
				title: "Нужна выгрузка снимков",
				status: "blocked",
				owner: "administrator",
				detail:
					"Для программы снимков нужна штатная выгрузка, папка хранения или список исследований. След программы сам по себе не переносит снимки.",
				nextAction:
					input.nextAction ??
					"Сделать выгрузку снимков в старой программе и повторить проверку.",
			}),
		);
	} else if (input.automationLevel === "needs_file_upload") {
		blockers.push(
			migrationReadinessItem({
				id: "file_upload_required",
				title: "Нужен файл выгрузки",
				status: "blocked",
				owner: "administrator",
				detail:
					"Архив/выгрузка должна быть выбрана явно и разобрана в черновик, не поверх рабочей базы.",
				nextAction:
					"Выбрать файл выгрузки или распаковать архив в отдельную папку только для чтения.",
			}),
		);
	} else if (
		hasNeedsBridgeAdapter ||
		input.automationLevel === "needs_local_bridge"
	) {
		warnings.push(
			migrationReadinessItem({
				id: "local_module_needed_before_commit",
				title: "Нужен локальный модуль перед записью",
				status: "warning",
				owner: "administrator",
				detail:
					"Предпросмотр можно готовить только через список или черновой маршрут; массовая запись из исходных файлов запрещена.",
				nextAction:
					adapters.find((adapter) => adapter.status === "needs_local_bridge")
						?.nextAction ?? "Построить черновой список и открыть предпросмотр.",
			}),
		);
	} else if (hasManualAdapter || input.automationLevel === "manual_review") {
		warnings.push(
			migrationReadinessItem({
				id: "manual_mapping_required",
				title: "Нужна ручная идентификация формата",
				status: "warning",
				owner: "administrator",
				detail:
					"Формат источника не распознан достаточно надежно для автоматического маршрута.",
				nextAction:
					"Выбрать конкретный файл/папку или дать пример выгрузки без лишних персональных данных.",
			}),
		);
	} else if (
		hasBuiltInAdapter ||
		hasPreviewHandoff ||
		migrationSourceKindIsTableLike(input.sourceKind) ||
		migrationSourceKindIsImaging(input.sourceKind)
	) {
		ready.push(
			migrationReadinessItem({
				id: "preview_route_ready",
				title: "Есть путь к предпросмотру",
				status: "ready",
				owner: "system",
				detail:
					"Источник можно вести в предпросмотр метаданных/таблиц без немедленной записи в базу CRM.",
				nextAction:
					adapters[0]?.nextAction ??
					input.nextAction ??
					"Открыть предпросмотр и проверить первые строки/исследования.",
			}),
		);
	}

	if (inventoryCount > 0 || (input.scannedFiles ?? 0) > 0) {
		ready.push(
			migrationReadinessItem({
				id: "bounded_inventory_done",
				title: "Инвентаризация выполнена",
				status: "ready",
				owner: "system",
				detail: `Проверка увидела ${inventoryCount || input.scannedFiles || 0} артефактов без раскрытия сырых путей в UI.`,
				nextAction:
					"Использовать краткое имя и образцы артефактов для выбора маршрута чернового разбора.",
			}),
		);
	} else if (
		input.sourceExists &&
		!input.isWorkstationProfile &&
		!input.isSmartPreviewSource &&
		!input.isUrl
	) {
		warnings.push(
			migrationReadinessItem({
				id: "inventory_not_confirmed",
				title: "Состав источника еще не подтвержден",
				status: "warning",
				owner: "administrator",
				detail:
					"План построен по типу источника; для уверенности нужна проверка или явный список файлов.",
				nextAction:
					"Запустить проверку только для чтения с лимитами по папкам и файлам.",
			}),
		);
	}

	warnings.push(
		migrationReadinessItem({
			id: "doctor_control_sample",
			title: "Нужна контрольная выборка врача",
			status: "warning",
			owner: "doctor",
			detail:
				"Перед массовой записью врач сверяет 10-20 карт: ФИО, даты, визиты, оплаты, документы и снимки.",
			nextAction:
				"После предпросмотра открыть контрольную выборку и запретить массовую запись до подтверждения.",
		}),
	);
	ready.push(
		migrationReadinessItem({
			id: "public_lookup_scope",
			title: "Онлайн-поиск ограничен реквизитами",
			status: "ready",
			owner: "system",
			detail:
				"Онлайн-поиск работает только с ИНН/ОГРН/КПП/названием/адресом/лицензией клиники, без пациентов и файлов.",
			nextAction:
				"Не отправлять пациентские строки, снимки, базы и локальные пути в онлайн-поиск реквизитов.",
		}),
	);

	const uniqueById = (items: MigrationReadinessItem[]) =>
		Array.from(new Map(items.map((item) => [item.id, item])).values());
	const finalBlockers = uniqueById(blockers);
	const finalWarnings = uniqueById(warnings);
	const finalReady = uniqueById(ready);
	const score = Number(
		Math.max(
			0,
			Math.min(
				1,
				0.92 -
					finalBlockers.length * 0.22 -
					finalWarnings.length * 0.06 +
					Math.min(0.08, finalReady.length * 0.02),
			),
		).toFixed(2),
	);
	const level: MigrationReadiness["level"] =
		!input.sourceExists || hasBlockedAdapter
			? "blocked"
			: finalBlockers.some(
						(item) =>
							item.id.includes("export") ||
							item.id.includes("profile") ||
							item.id.includes("file_upload"),
					)
				? "needs_export"
				: finalBlockers.length ||
						hasNeedsBridgeAdapter ||
						input.automationLevel === "needs_local_bridge" ||
						input.isBrowserManifest ||
						input.isSmartPreviewSource
					? "needs_bridge"
					: hasManualAdapter || input.automationLevel === "manual_review"
						? "manual_review"
						: "ready_for_preview";
	return {
		level,
		score,
		blockers: finalBlockers,
		warnings: finalWarnings,
		ready: finalReady,
		nextAction:
			finalBlockers[0]?.nextAction ??
			finalWarnings[0]?.nextAction ??
			finalReady[0]?.nextAction ??
			input.nextAction ??
			"Открыть черновой предпросмотр.",
	};
}


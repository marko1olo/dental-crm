/**
 * Local source workup and bridge kit execution plans.
 */
import path from "node:path";
import { stat } from "node:fs/promises";
import { statSync } from "node:fs";
import type {
  MigrationLocalSourceWorkupRequest,
  MigrationLocalSourceWorkupResponse,
  MigrationLocalSourceDiscoveryCandidate,
  MigrationBridgeKitAction,
  MigrationBridgeKit,
  SmartImportLegacySource,
  MigrationReadiness,
  MigrationProbeAdapter,
  MigrationProbeArtifactKind
} from "@dental/shared";
import { uniqueStrings } from "./smartImportsUtils.js";
import { detectLegacySourceKind, legacySourcePlaybook } from "./smartImportsLegacyPlans.js";
import { migrationLocalSourceWorkupResponseSchema } from "@dental/shared";
import {
  resolveMigrationSourceRoute,
  migrationSafeAlias,
  migrationVendorGuidanceMatches,
  isMigrationPublicSourceToken,
  registerMigrationSourceRoute,
  migrationFingerprint
} from "./smartImportsRoots.js";
import {
  legacySourceTitles,
  migrationSourceKindIsDatabase,
  migrationSourceKindIsImaging,
  migrationSourceKindIsTableLike,
  migrationWorkupExtractableEntities,
  migrationWorkupSteps,
  migrationWorkupHandoffs,
  buildMigrationReadiness
} from "./smartImportsReadiness.js";

export function migrationBridgeAction(
	input: MigrationBridgeKitAction,
): MigrationBridgeKitAction {
	return input;
}

export function migrationBridgeOutputManifest(
	kind: SmartImportLegacySource["kind"],
	endpoint: string,
): MigrationBridgeKit["outputManifest"] {
	if (migrationSourceKindIsImaging(kind)) {
		return {
			format: "список метаданных снимков",
			endpoint,
			requiredColumns: [
				"source_id",
				"modality",
				"study_date_or_file_date",
				"safe_artifact_id",
			],
			optionalColumns: [
				"patient_hint",
				"tooth",
				"study_uid",
				"series_uid",
				"file_alias",
				"notes",
			],
			forbiddenFields: [
				"raw_pixel_blob",
				"public_url_with_patient_name",
				"unsanitized_local_path",
				"public_lookup_query",
			],
		};
	}
	if (migrationSourceKindIsDatabase(kind)) {
		return {
			format: "табличный список чернового импорта",
			endpoint,
			requiredColumns: [
				"legacy_patient_id",
				"patient_name",
				"source_table",
				"source_row_hash",
			],
			optionalColumns: [
				"phone",
				"birth_date",
				"visit_date",
				"service_code",
				"payment_amount",
				"media_alias",
			],
			forbiddenFields: [
				"live_db_connection_string",
				"db_password",
				"raw_database_file",
				"public_lookup_query",
			],
		};
	}
	if (migrationSourceKindIsTableLike(kind)) {
		return {
			format: "загруженная таблица или черновой текст",
			endpoint,
			requiredColumns: ["row_number", "raw_text_or_cells", "source_alias"],
			optionalColumns: [
				"patient_name",
				"phone",
				"birth_date",
				"visit_date",
				"amount",
				"document_hint",
			],
			forbiddenFields: [
				"unreviewed_commit_flag",
				"public_lookup_query",
				"raw_archive_path",
			],
		};
	}
	return {
		format: "ручной список для предпросмотра",
		endpoint,
		requiredColumns: ["source_alias", "raw_text_or_note", "operator_label"],
		optionalColumns: ["patient_hint", "date_hint", "artifact_type", "comment"],
		forbiddenFields: [
			"direct_commit",
			"public_lookup_query",
			"secret_or_password",
		],
	};
}

export function buildMigrationBridgeKit(input: {
	sourceKind: SmartImportLegacySource["kind"];
	sourceLabel: string;
	sourceExists: boolean;
	safeDisplayName: string;
	readiness: MigrationReadiness;
	adapters?: MigrationProbeAdapter[];
	handoffs?: ReturnType<typeof migrationWorkupHandoffs>;
	isBrowserManifest?: boolean;
	isSmartPreviewSource?: boolean;
	isWorkstationProfile?: boolean;
	isUrl?: boolean;
}): MigrationBridgeKit {
	const handoffEndpoint =
		input.handoffs?.[0]?.endpoint ?? "/api/imports/smart/preview";
	const commonPrivacy =
		"Пациенты, телефоны, снимки, файлы базы, пароли и сырые локальные пути остаются в локальном черновике. Публичный поиск получает только реквизиты клиники.";
	const doctorControl = migrationBridgeAction({
		id: "doctor_control_sample",
		owner: "doctor",
		title: "Сверить контрольные карты",
		detail:
			"После предпросмотра открыть 10-20 карт и проверить ФИО, даты, визиты, оплаты, документы и снимки до массовой записи.",
		safety: "Без подтверждения врача массовая запись остается запрещенной.",
		doneWhen:
			"Контрольная выборка отмечена как совпавшая или спорные строки отправлены на ручной разбор.",
	});
	const publicScope = migrationBridgeAction({
		id: "public_lookup_scope",
		owner: "system",
		title: "Не смешивать поиск реквизитов и пациентов",
		detail:
			"Онлайн-поиск и карты используются только для ИНН, ОГРН, КПП, названия, адреса и лицензии клиники.",
		safety:
			"Пациентские строки и локальные источники не попадают в онлайн-поиск.",
		doneWhen:
			"Все онлайн-запросы построены только из полей реквизитов клиники.",
	});
	const baseStatus: MigrationBridgeKit["status"] =
		input.readiness.level === "blocked"
			? "blocked"
			: input.readiness.level === "needs_export"
				? "needs_export"
				: input.readiness.level === "needs_bridge"
					? "needs_admin"
					: input.readiness.level === "manual_review"
						? "manual"
						: "ready";

	if (input.isBrowserManifest) {
		return {
			kind: "browser_manifest_bridge",
			title: "Выбранная в браузере папка",
			status: "needs_admin",
			requiredTools: [
				"Повторный выбор папки/файлов в браузере",
				"Локальный модуль для долговременного чернового разбора",
				"Предпросмотр импорта",
			],
			parserTargets: Array.from(
				migrationWorkupExtractableEntities(input.sourceKind),
			),
			adminActions: [
				migrationBridgeAction({
					id: "keep_browser_handle",
					owner: "administrator",
					title: "Сохранить доступ к выбранной папке",
					detail:
						"Браузерный список содержит счетчики и номер источника, но не дает серверу долговременно читать файлы.",
					safety:
						"CRM не сохраняет сырые пути и содержимое файлов без явного выбора.",
					doneWhen:
						"Админ повторно выбрал папку или поднял локальный модуль для чернового разбора.",
				}),
			],
			doctorActions: [doctorControl],
			outputManifest: migrationBridgeOutputManifest(
				input.sourceKind,
				handoffEndpoint,
			),
			privacyBoundary: commonPrivacy,
			nextAction:
				"Повторить выбор источника или подключить локальный модуль, затем открыть предпросмотр.",
		};
	}

	if (input.isSmartPreviewSource) {
		return {
			kind: "manual_manifest",
			title: "Источник миграции из текста",
			status: "needs_admin",
			requiredTools: [
				"Фактический файл, папка или выгрузка",
				"Локальный модуль для старой базы или снимков",
				"Предпросмотр импорта",
			],
			parserTargets: Array.from(
				migrationWorkupExtractableEntities(input.sourceKind),
			),
			adminActions: [
				migrationBridgeAction({
					id: "attach_real_source",
					owner: "administrator",
					title: "Подтвердить реальный источник",
					detail:
						"Текстовая вставка уже подсказала тип источника. Теперь нужно выбрать сам файл, папку, штатную выгрузку или локальный модуль только для чтения, чтобы не искать формат вручную.",
					safety:
						"План использует внутренний номер; фактические файлы остаются в локальном черновом разборе до предпросмотра.",
					doneWhen:
						"Источник выбран явно или подготовлена выгрузка либо резервная копия, после чего открыт предпросмотр.",
				}),
			],
			doctorActions: [doctorControl],
			outputManifest: migrationBridgeOutputManifest(
				input.sourceKind,
				handoffEndpoint,
			),
			privacyBoundary: commonPrivacy,
			nextAction:
				"Подтвердить фактический файл, папку или выгрузку для найденного в тексте источника и открыть предпросмотр.",
		};
	}

	if (migrationSourceKindIsDatabase(input.sourceKind)) {
		const toolByKind: Record<string, string> = {
			firebird_database:
				"Штатная выгрузка или локальный разбор копии серверной базы",
			access_database:
				"Табличная выгрузка или локальный разбор копии настольной базы",
			sqlite_database: "Локальный разбор копии базы программы",
			sql_dump: "Восстановление копии в черновой список, не в рабочую CRM",
			mis_database: "Штатная выгрузка или локальный разбор копии старой МИС",
		};
		return {
			kind: "local_db_bridge",
			title: `${legacySourceTitles[input.sourceKind]}: локальный разбор`,
			status: input.isWorkstationProfile ? "needs_export" : baseStatus,
			requiredTools: [
				toolByKind[input.sourceKind] ??
					"Локальный разбор базы только для чтения",
				"Копия или резервная копия старой базы",
				"Табличный черновик для предпросмотра",
				"Предпросмотр импорта",
			],
			parserTargets: Array.from(
				migrationWorkupExtractableEntities(input.sourceKind),
			),
			adminActions: [
				migrationBridgeAction({
					id: "offline_copy",
					owner: "administrator",
					title: "Снять копию или резервную копию",
					detail:
						"Работать с копией старой базы или штатной резервной копией/выгрузкой, не с живой рабочей базой клиники.",
					safety:
						"Локальный модуль не пишет в старую МИС и не хранит пароль в отчете.",
					doneWhen:
						"Есть копия или резервная копия и внутренний номер источника; подключение к живой базе не используется.",
				}),
				migrationBridgeAction({
					id: "emit_staging_manifest",
					owner: "system",
					title: "Собрать черновой список",
					detail:
						"Извлечь пациентов, визиты, оплаты, документы, услуги и номера снимков в нормализованный табличный черновик.",
					safety:
						"Запись запрещена до предпросмотра; исходные файлы базы не отправляются в публичные сервисы.",
					doneWhen:
						"Список содержит контроль строки и контрольные итоги по таблицам.",
				}),
			],
			doctorActions: [doctorControl],
			outputManifest: migrationBridgeOutputManifest(
				input.sourceKind,
				"/api/imports/smart/preview",
			),
			privacyBoundary: commonPrivacy,
			nextAction: input.isWorkstationProfile
				? "Найти реальную папку данных или резервную копию старой МИС, затем прогнать локальный разбор базы."
				: "Снять копию/резервную копию и прогнать локальный разбор базы в предпросмотр импорта.",
		};
	}

	if (
		input.sourceKind === "vendor_imaging_system" ||
		input.sourceKind === "dicom_folder" ||
		input.sourceKind === "pacs_dicom"
	) {
		return {
			kind: "dicom_export",
			title: `${legacySourceTitles[input.sourceKind]}: выгрузка снимков`,
			status: input.isWorkstationProfile ? "needs_export" : baseStatus,
			requiredTools: [
				"Штатная выгрузка снимков",
				"Проверка папки снимков",
				"Предпросмотр исследования/серии",
				"Ручная сверка пациента",
			],
			parserTargets: Array.from(
				migrationWorkupExtractableEntities(input.sourceKind),
			),
			adminActions: [
				migrationBridgeAction({
					id: "export_dicomdir",
					owner: "administrator",
					title: "Получить папку исследования или выгрузку снимков",
					detail:
						"Открыть старую программу снимков и сделать штатную выгрузку, либо выбрать папку хранения только для чтения.",
					safety:
						"Тяжелые данные снимков не копируются в CRM до явного выбора исследования.",
					doneWhen:
						"Есть папка исследования/выгрузка, метаданные исследования/серии читаются в проверке.",
				}),
				migrationBridgeAction({
					id: "metadata_workup",
					owner: "system",
					title: "Построить список метаданных",
					detail:
						"Сгруппировать внутренние коды исследования/серии, тип снимка, даты и подсказки пациента без публикации путей и без публичного поиска.",
					safety:
						"Пациентские совпадения остаются неподтвержденными до ручной проверки.",
					doneWhen:
						"В предпросмотре видны серии, тип снимка и внутренние номера файлов.",
				}),
			],
			doctorActions: [doctorControl],
			outputManifest: migrationBridgeOutputManifest(
				input.sourceKind,
				handoffEndpoint,
			),
			privacyBoundary: commonPrivacy,
			nextAction: input.readiness.nextAction,
		};
	}

	if (input.sourceKind === "xray_image_archive") {
		return {
			kind: "image_manifest",
			title: "RVG/ОПТГ/фото: список снимков",
			status: baseStatus,
			requiredTools: [
				"Сканирование папки только для чтения",
				"Сборка списка снимков",
				"Предпросмотр импорта снимков",
			],
			parserTargets: Array.from(
				migrationWorkupExtractableEntities(input.sourceKind),
			),
			adminActions: [
				migrationBridgeAction({
					id: "scan_images",
					owner: "assistant",
					title: "Собрать список снимков",
					detail:
						"Сканировать папку только для чтения и извлечь дату, тип снимка и подсказки пациента из имени файла или соседних таблиц.",
					safety:
						"Не переименовывать оригиналы и не привязывать сомнительные совпадения автоматически.",
					doneWhen:
						"Предпросмотр показывает внутренние номера и список неподтвержденных привязок.",
				}),
			],
			doctorActions: [doctorControl],
			outputManifest: migrationBridgeOutputManifest(
				input.sourceKind,
				handoffEndpoint,
			),
			privacyBoundary: commonPrivacy,
			nextAction:
				"Собрать список снимков и открыть предпросмотр спорных совпадений.",
		};
	}

	if (input.sourceKind === "network_share") {
		return {
			kind: "network_share_bridge",
			title: "Сетевая папка только для чтения",
			status: baseStatus,
			requiredTools: [
				"Доступ SMB/UNC только для чтения",
				"Ограниченное сканирование папки",
				"Черновой список",
			],
			parserTargets: Array.from(
				migrationWorkupExtractableEntities(input.sourceKind),
			),
			adminActions: [
				migrationBridgeAction({
					id: "mount_read_only_share",
					owner: "administrator",
					title: "Подключить сетевую папку только на чтение",
					detail:
						"Дать CRM или локальному модулю доступ к конкретной сетевой папке, не ко всему серверу.",
					safety:
						"Сканирование ограничено лимитами folders/files и не пишет в сетевой источник.",
					doneWhen:
						"Проверка видит ограниченный инвентарь и примеры внутренних номеров файлов.",
				}),
			],
			doctorActions: [doctorControl],
			outputManifest: migrationBridgeOutputManifest(
				input.sourceKind,
				handoffEndpoint,
			),
			privacyBoundary: commonPrivacy,
			nextAction:
				"Подключить UNC/SMB путь только для чтения и запустить проверку.",
		};
	}

	if (migrationSourceKindIsTableLike(input.sourceKind)) {
		return {
			kind: "file_upload",
			title: "Табличная выгрузка: разбор",
			status: baseStatus,
			requiredTools: [
				"Разбор документов/таблиц",
				"Предпросмотр импорта",
				"Отчет диагностики",
			],
			parserTargets: Array.from(
				migrationWorkupExtractableEntities(input.sourceKind),
			),
			adminActions: [
				migrationBridgeAction({
					id: "extract_table",
					owner: "administrator",
					title: "Извлечь таблицы в черновик",
					detail:
						"Загрузить файл/архив или вставить первые строки, затем разделить пациентов, оплаты, услуги, документы и мусор.",
					safety:
						"Запись возможна только после предпросмотра; реквизиты клиники ищутся отдельно от строк пациентов.",
					doneWhen:
						"Предпросмотр показывает классификацию строк и готовые/спорные записи.",
				}),
			],
			doctorActions: [doctorControl],
			outputManifest: migrationBridgeOutputManifest(
				input.sourceKind,
				handoffEndpoint,
			),
			privacyBoundary: commonPrivacy,
			nextAction:
				"Открыть разбор документов и предпросмотр для табличной выгрузки.",
		};
	}

	return {
		kind: "manual_manifest",
		title: "Ручной пакет миграции",
		status: "manual",
		requiredTools: [
			"Ручной список для предпросмотра",
			"Предпросмотр импорта",
			"Контрольная выборка",
		],
		parserTargets: Array.from(
			migrationWorkupExtractableEntities(input.sourceKind),
		),
		adminActions: [
			migrationBridgeAction({
				id: "identify_format",
				owner: "administrator",
				title: "Опознать формат источника",
				detail:
					"Выбрать конкретный файл, папку или выгрузку вместо общего описания старой системы.",
				safety:
					"Не импортировать вслепую и не отправлять пациентские примеры в онлайн-поиск реквизитов.",
				doneWhen:
					"Источник переведен в один из явных маршрутов: база, таблица, папка снимков или архив.",
			}),
		],
		doctorActions: [doctorControl, publicScope],
		outputManifest: migrationBridgeOutputManifest(
			input.sourceKind,
			"/api/imports/smart/preview",
		),
		privacyBoundary: commonPrivacy,
		nextAction: "Уточнить формат источника и повторить план/проверку.",
	};
}

export function buildMigrationLocalSourceWorkup(
	input: MigrationLocalSourceWorkupRequest,
) {
	const routeRef = resolveMigrationSourceRoute(input.sourceRef);
	const sourceRef = routeRef.sourceRef;
	const isUrl = /^https?:\/\//i.test(sourceRef);
	const isBrowserManifest = /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef);
	const isSmartPreviewSource = /^smart-preview:[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
	const isWorkstationProfile = /^workstation-profile:[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
	const isWorkstationSignal = /^workstation-signal:[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
	const isWorkstationTrace = isWorkstationProfile || isWorkstationSignal;
	const isBrowserLikeManifest = isBrowserManifest || isSmartPreviewSource;
	const normalizedSourceRef =
		isUrl ||
		sourceRef.startsWith("\\\\") ||
		isBrowserLikeManifest ||
		isWorkstationTrace ||
		routeRef.routeExpired
			? sourceRef
			: path.resolve(sourceRef);
	const inferredKind =
		input.sourceKind ??
		routeRef.route?.sourceKind ??
		detectLegacySourceKind(normalizedSourceRef, normalizedSourceRef);
	const playbook = legacySourcePlaybook(inferredKind);
	const safeDisplayName =
		input.safeDisplayName?.trim() ||
		routeRef.route?.safeDisplayName ||
		migrationSafeAlias(inferredKind, normalizedSourceRef);
	const vendorGuidance = migrationVendorGuidanceMatches(
		`${safeDisplayName} ${routeRef.routeExpired ? "" : normalizedSourceRef}`,
	).slice(0, 2);
	let sourceExists =
		!routeRef.routeExpired &&
		(isUrl || isBrowserLikeManifest || isWorkstationTrace);
	let sourceIsDirectory = false;
	let fileExtension: string | null =
		isUrl || isBrowserLikeManifest || isWorkstationTrace
			? null
			: path.extname(normalizedSourceRef).toLowerCase() || null;
	const warnings: string[] = [];

	if (routeRef.routeExpired) {
		warnings.push(
			"Внутренний номер источника устарел или был создан в другой серверной сессии: повторите автопоиск или выбор папки, чтобы получить новый номер.",
		);
		fileExtension = null;
	} else if (routeRef.routeToken) {
		warnings.push(
			"Источник передан через внутренний номер: сырой локальный путь не возвращается в браузер и отчеты.",
		);
	}

	if (isBrowserManifest) {
		warnings.push(
			"Источник пришел как браузерный список: полный локальный путь серверу недоступен. Для реального чернового разбора нужен локальный модуль, повторный выбор папки или ручной путь администратора.",
		);
	} else if (isSmartPreviewSource) {
		warnings.push(
			"Источник пришел из текста/Excel/OCR: CRM уже поняла тип, но для чернового разбора нужен фактический файл, папка, выгрузка или локальный модуль.",
		);
	} else if (isWorkstationProfile) {
		warnings.push(
			"Источник пришел как след установленной системы: это подсказка с рабочей станции, а не сама база. Для миграции нужен локальный модуль только для чтения, штатная выгрузка, резервная копия или выбор папки данных.",
		);
	} else if (isWorkstationSignal) {
		warnings.push(
			"Источник пришел как системный след рабочей станции: процесс, служба или настроенный сигнал распознан, но это не база и не папка снимков. Нужна выгрузка, резервная копия, папка данных или локальный модуль только для чтения.",
		);
	} else if (!routeRef.routeExpired && !isUrl) {
		try {
			const stat = statSync(normalizedSourceRef);
			sourceExists = true;
			sourceIsDirectory = stat.isDirectory();
			if (sourceIsDirectory) fileExtension = null;
		} catch (err) {
			console.error("[Dente] context:", err);
			sourceExists = false;
			warnings.push(
				"Источник недоступен с этого компьютера сейчас; план построен по названию/расширению.",
			);
		}
	}

	const sourceLabel = isUrl
		? "Сетевой адрес"
		: isBrowserManifest
			? "Браузерный список"
			: isSmartPreviewSource
				? "Строка предпросмотра"
				: isWorkstationProfile
					? "След установленной системы"
					: isWorkstationSignal
						? "Системный след рабочей станции"
						: sourceIsDirectory
							? "Локальная папка"
							: sourceExists
								? "Локальный файл"
								: "Путь или источник";
	const smartImportLineSourceRef =
		routeRef.routeToken ??
		(isMigrationPublicSourceToken(normalizedSourceRef)
			? normalizedSourceRef
			: registerMigrationSourceRoute(
					normalizedSourceRef,
					inferredKind,
					safeDisplayName,
				));
	const smartImportLine = `${legacySourceTitles[inferredKind]} ${smartImportLineSourceRef}`;
	const requiredArtifacts = uniqueStrings([
		...playbook.requiredArtifacts,
		...vendorGuidance.flatMap((guidance) => guidance.requiredArtifacts),
	]);
	const recommendedRoute = uniqueStrings([
		playbook.recommendedRoute,
		...vendorGuidance.map((guidance) => guidance.recommendedRoute),
	]).join(" ");
	const nextAction = vendorGuidance[0]?.nextAction ?? playbook.nextAction;
	const handoffs = migrationWorkupHandoffs(inferredKind);
	const steps = migrationWorkupSteps(inferredKind, sourceExists);
	const readiness = buildMigrationReadiness({
		sourceKind: inferredKind,
		sourceExists,
		sourceLabel,
		sourceIsDirectory,
		automationLevel: playbook.automationLevel,
		requiredArtifacts,
		handoffs,
		isBrowserManifest: isBrowserLikeManifest,
		isSmartPreviewSource,
		isWorkstationProfile: isWorkstationTrace,
		isUrl,
		nextAction,
	});
	const bridgeKit = buildMigrationBridgeKit({
		sourceKind: inferredKind,
		sourceLabel,
		sourceExists,
		safeDisplayName,
		readiness,
		handoffs,
		isBrowserManifest,
		isSmartPreviewSource,
		isWorkstationProfile: isWorkstationTrace,
		isUrl,
	});
	if (vendorGuidance.length) {
		warnings.push(
			`Профиль ${vendorGuidance.map((guidance) => guidance.label).join(" / ")} распознан: добавлены подсказки по штатной выгрузке, папке данных и локальному модулю.`,
		);
	}

	return migrationLocalSourceWorkupResponseSchema.parse({
		version: "dental-crm-migration-source-workup-v1",
		generatedAt: new Date().toISOString(),
		safeDisplayName,
		sourceKind: inferredKind,
		sourceFingerprint: migrationFingerprint(normalizedSourceRef),
		sourceLabel,
		sourceExists,
		sourceIsDirectory,
		fileExtension,
		automationLevel: playbook.automationLevel,
		extractableEntities: migrationWorkupExtractableEntities(inferredKind),
		requiredArtifacts,
		recommendedRoute,
		readiness,
		bridgeKit,
		handoffs,
		steps,
		warnings,
		privacyWarnings: [
			playbook.privacy,
			"Публичный поиск клиники получает только ИНН/ОГРН/название/адрес/лицензию, а не пациентские строки и не пути к базе или снимкам.",
		],
		smartImportLine,
		nextAction,
	});
}


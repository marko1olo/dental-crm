import type { DicomRenderCachePlanResponse, MprProjection, StaffRole } from "@dental/shared";
import type { MigrationAutopilotOperatorScriptAction, MigrationLocalSourceDiscoveryCandidate, MigrationLocalSourceHandoff } from "../../AppHelpers";
import type { DicomSeriesPreviewGroup } from "../imaging/VisiographAnalyzer";
import type { LocalBridgeReadinessResponse } from "./LegacyMigrationStudio";
import { workspaceViewLabels } from "../../settingsStaticData";

export const viewLabels = workspaceViewLabels as Record<string, string>;
export const staffCreationRoles: StaffRole[] = [
	"doctor",
	"administrator",
	"assistant",
	"manager",
];
export const clinicalRuleOwnerRoles: StaffRole[] = [
	"doctor",
	"assistant",
	"administrator",
	"manager",
	"owner",
];
export const migrationOperatorSourceBoundActions: MigrationAutopilotOperatorScriptAction[] =
	[
		"open_plan",
		"open_probe",
		"add_to_parser",
		"prepare_export",
		"build_preview",
	];
export const clinicPublicLookupFieldLabels: Record<string, string> = {
	clinicName: "Название",
	legalName: "Юрлицо",
	inn: "ИНН",
	kpp: "КПП",
	ogrn: "ОГРН",
	address: "Адрес",
	phone: "Телефон",
	email: "Email",
	website: "Сайт",
	medicalLicenseNumber: "Лицензия",
	medicalLicenseIssuedAt: "Дата лицензии",
	medicalLicenseIssuer: "Кем выдана",
	bankDetails: "Банк",
};
export const clinicPublicLookupBoundaryText =
	"Публичный поиск получает только реквизиты клиники: ИНН, ОГРН, КПП, название, адрес или лицензию. Пациентов, снимки, базы и локальные пути сюда не отправлять.";
export const migrationReadinessLevelLabels: Record<string, string> = {
	ready_for_preview: "можно делать предпросмотр",
	needs_bridge: "нужно подключение",
	needs_export: "нужна выгрузка",
	manual_review: "ручной разбор",
	blocked: "нужно действие",
};
export const migrationBridgeKitKindLabels: Record<string, string> = {
	none: "нет",
	file_upload: "файл/таблица",
	local_db_bridge: "подключение к копии базы",
	dicom_export: "выгрузка КТ/снимков",
	image_manifest: "список снимков",
	network_share_bridge: "сетевая папка",
	browser_manifest_bridge: "выбранная папка/диск",
	manual_manifest: "ручной список",
};
export const migrationBridgeKitStatusLabels: Record<string, string> = {
	ready: "готово",
	needs_admin: "нужен администратор",
	needs_export: "нужна выгрузка",
	manual: "ручная проверка",
	blocked: "стоп",
};
export const migrationLegacySourceKindLabels: Record<string, string> = {
	mis_database: "база старой МИС",
	firebird_database: "старая серверная база программы",
	access_database: "старая настольная база",
	sqlite_database: "локальная база программы",
	sql_dump: "резервная копия старой базы",
	spreadsheet_export: "Табличная выгрузка",
	csv_export: "табличная выгрузка",
	archive_export: "архив выгрузки",
	pacs_dicom: "архив снимков",
	dicom_folder: "папка КЛКТ/КТ",
	xray_image_archive: "архив снимков",
	vendor_imaging_system: "программа снимков",
	network_share: "сетевая папка",
	unknown_legacy_source: "неизвестный источник",
};
export const migrationAutomationLevelLabels: Record<string, string> = {
	ready_for_preview: "готово к предпросмотру",
	needs_file_upload: "нужен файл выгрузки",
	needs_local_bridge: "нужно подключение",
	manual_review: "ручной разбор",
};
export const smartImportMigrationPlanStatusLabels: Record<string, string> = {
	ready: "готово",
	review: "проверить",
	manual: "ручной разбор",
	blocked: "стоп",
};
export const smartImportLineKindLabels: Record<string, string> = {
	patient: "Пациент",
	imaging: "Снимок",
	clinic: "Клиника",
	legacy_source: "Источник",
	ignored: "Пропуск",
};
export const migrationWorkupStepStatusLabels: Record<string, string> = {
	ready: "готово",
	needs_bridge: "нужно подключение",
	manual: "ручной шаг",
	blocked: "стоп",
};
export const importRowStatusLabels: Record<string, string> = {
	ready: "готово",
	warning: "проверить",
	blocked: "исправить",
};
export const clinicPublicLookupProviderStatusLabels: Record<string, string> = {
	ready: "профиль найден",
	not_configured: "онлайн-поиск не настроен",
	error: "онлайн-поиск не ответил",
	skipped_no_safe_query: "нужны реквизиты",
};
export const clinicPublicLookupSuggestionSourceLabels: Record<string, string> = {
	dadata: "Сервис реквизитов",
	manual_public_targets: "Из введенных реквизитов",
};
export const migrationEntityLabels: Record<string, string> = {
	clinic_profile: "реквизиты клиники",
	patients: "пациенты",
	appointments: "записи",
	visits: "приемы",
	payments: "оплаты",
	documents: "документы",
	service_catalog: "прайс и услуги",
	imaging: "снимки",
	dicom_series: "серии КЛКТ/КТ",
	unknown: "неизвестно",
};
export const migrationPriorityLabels: Record<string, string> = {
	critical: "сначала",
	high: "важно",
	normal: "обычно",
	low: "потом",
};
export const migrationOwnerLabels: Record<string, string> = {
	administrator: "администратор",
	doctor: "врач",
	assistant: "ассистент",
	system: "CRM",
};
export const migrationHandoffPhaseLabels: Record<string, string> = {
	clinic_requisites: "реквизиты",
	source_access: "доступ к источнику",
	export_or_bridge: "выгрузка",
	staging_preview: "предпросмотр",
	doctor_control: "проверка врачом",
};
export const migrationOperatorPacketStatusLabels: Record<string, string> = {
	ready_for_preview: "можно делать предпросмотр",
	needs_admin: "нужен администратор",
	needs_bridge: "нужно подключение",
	needs_export: "нужна выгрузка",
	manual_review: "ручной разбор",
	blocked: "нужно действие",
	empty: "нет источников",
};
export const migrationTriageStatusPriority: Record<string, number> = {
	blocked: 0,
	needs_bridge: 1,
	needs_export: 2,
	needs_admin: 3,
	manual_review: 4,
	empty: 5,
	ready_for_preview: 6,
};
export const migrationAdapterStatusLabels: Record<string, string> = {
	built_in: "готовый способ",
	ready: "готово",
	needs_admin: "нужен администратор",
	needs_local_bridge: "нужно локальное подключение",
	needs_export: "нужна выгрузка",
	manual: "ручная проверка",
	blocked: "стоп",
};
export const dicomRenderCachePriorityLabels: Record<
	DicomRenderCachePlanResponse["tasks"][number]["priority"],
	string
> = {
	blocking: "обязательно",
	interactive: "для плавного просмотра",
	prefetch: "подготовить заранее",
	background: "фоном",
	deferred: "позже",
};
export const localImagingModelWorkbenchTargetLabels: Record<string, string> = {
	metadata_only: "только метаданные",
	external_model_viewer: "внешний 3D-просмотр",
	local_bridge: "локальный 3D-модуль",
};
export const migrationManifestColumnLabels: Record<string, string> = {
	source_id: "номер источника",
	source_alias: "номер источника",
	safe_source_alias: "номер источника",
	safe_artifact_id: "номер файла",
	legacy_patient_id: "старый номер пациента",
	patient_name: "ФИО пациента",
	patient_hint: "подсказка по пациенту",
	birth_date: "дата рождения",
	phone: "телефон",
	source_table: "таблица старой базы",
	source_row_hash: "контроль строки",
	row_number: "номер строки",
	raw_text_or_cells: "текст или ячейки",
	raw_text_or_note: "текст или заметка",
	operator_label: "метка оператора",
	modality: "тип снимка",
	study_date_or_file_date: "дата исследования или файла",
	tooth: "зуб",
	study_uid: "номер исследования",
	series_uid: "номер серии",
	file_alias: "номер файла",
	notes: "заметки",
	visit_date: "дата визита",
	service_code: "код услуги",
	payment_amount: "сумма оплаты",
	media_alias: "номер медиа",
	amount: "сумма",
	document_hint: "подсказка по документу",
	date_hint: "подсказка по дате",
	artifact_type: "тип файла",
	comment: "комментарий",
};
export const migrationArtifactKindLabels: Record<string, string> = {
	database: "база данных",
	dump: "резервная копия",
	table: "таблица",
	archive: "архив",
	dicom: "серии снимков",
	image: "снимок",
	model: "3D-модель",
	document: "документ",
	unknown: "неизвестный файл",
};
export const migrationHumanTextReplacements: Array<[RegExp, string]> = [
	[/\bBrowser-local manifest bridge\b/gi, "выбранная папка/диск"],
	[/\bBrowser manifest\b/gi, "браузерный список"],
	[/\bRead-only local bridge staging\b/gi, "локальная проверка копии базы"],
	[/\bRead-only network share bridge\b/gi, "проверка сетевой папки"],
	[/\bLegacy DB staging bridge\b/gi, "проверка копии старой базы"],
	[/\bManual staging manifest\b/gi, "ручной список для проверки"],
	[/\bText-derived migration source kit\b/gi, "набор переноса из текста"],
	[/\blocal DB bridge\b/gi, "локальное подключение к копии базы"],
	[/\blocal bridge\b/gi, "локальный модуль"],
	[/\bDB bridge\b/gi, "подключение к копии базы"],
	[/\bmigration bridge\b/gi, "перенос через локальную проверку"],
	[/\bstaging bridge\b/gi, "черновой разбор"],
	[/\bbridge kit\b/gi, "набор для переноса"],
	[/\bexport kit\b/gi, "набор для выгрузки"],
	[/\bmanifest kit\b/gi, "набор списка файлов"],
	[/\bimport kit\b/gi, "набор для импорта"],
	[/\bDICOMweb\b/gi, "архив снимков"],
	[/\bQIDO\b/gi, "поиск серий"],
	[/\bWADO\b/gi, "получение серии"],
	[/\bSTOW\b/gi, "загрузка снимков"],
	[/\bOHIF\b/gi, "внешний просмотр"],
	[/\bDICOM metadata workup\b/gi, "проверка метаданных снимков"],
	[/\bDICOM\/CBCT workup\b/gi, "проверка КЛКТ/КТ"],
	[/\bDICOM folder workup\b/gi, "проверка папки снимков"],
	[/\bStudyInstanceUID\/SeriesInstanceUID\b/gi, "коды исследования/серии"],
	[/\bStudy\/Series UID\b/gi, "коды исследования/серии"],
	[/\bStudyInstanceUIDs?\b/gi, "код исследования"],
	[/\bSeriesInstanceUIDs?\b/gi, "код серии"],
	[/\bSOPInstanceUIDs?\b/gi, "код снимка"],
	[/\bUID исследования\/серии\b/gi, "коды исследования/серии"],
	[/\bUID серии\b/gi, "код серии"],
	[
		/\bDICOMDIR\/Study\/Series headers or PACS endpoint\b/gi,
		"служебный каталог снимков, заголовки исследования/серии или архив снимков",
	],
	[
		/\bDICOM series manifest \+ viewer\/workbench plan\b/gi,
		"список серий снимков и план открытия просмотрщика",
	],
	[/\bFolder manifest preview\b/gi, "предпросмотр списка файлов"],
	[/\bImaging manifest preview\b/gi, "предпросмотр списка снимков"],
	[/\bImaging import preview\b/gi, "предпросмотр импорта снимков"],
	[/\bTable\/document extractor\b/gi, "разбор таблиц и документов"],
	[/\bDocument\/table extractor\b/gi, "разбор документов и таблиц"],
	[/\bSmart import preview\b/gi, "предпросмотр умного импорта"],
	[/\bStudy\/Series metadata preview\b/gi, "предпросмотр серий исследований"],
	[/\bmetadata-only manifest\b/gi, "список метаданных"],
	[/\bmetadata manifest\b/gi, "список метаданных"],
	[/\bmetadata CSV\/JSON manifest\b/gi, "табличный список метаданных"],
	[/\bstaging CSV\/JSON manifest\b/gi, "табличный файл для проверки"],
	[/\bCSV\/JSON staging manifest\b/gi, "табличный файл для проверки"],
	[/\bCSV diagnostic report\b/gi, "табличный отчет проверки"],
	[/\bmanual CSV\/JSON manifest\b/gi, "ручной список для проверки"],
	[
		/\bpatients\/visits\/payments\/documents\/media CSV manifest\b/gi,
		"табличный список пациентов, визитов, оплат, документов и снимков",
	],
	[
		/\bnormalized text\/table rows -> smart import preview\b/gi,
		"нормальные строки текста/таблицы -> предпросмотр умного импорта",
	],
	[/\bRead-only SMB\/UNC credentials\b/gi, "доступ к SMB/UNC только на чтение"],
	[/\bBounded folder scan\b/gi, "ограниченное сканирование папки"],
	[/\bStaging manifest\b/gi, "файл для проверки"],
	[/\bstaging manifest\b/gi, "файл для проверки"],
	[/\bmanifest builder\b/gi, "сборщик списка"],
	[/\bmanifest\b/gi, "список"],
	[/\bpreview\b/gi, "предпросмотр"],
	[/\bstaging\b/gi, "черновая проверка"],
	[/\bread-only\b/gi, "только чтение"],
	[/\bRead-only\b/g, "только чтение"],
	[/\boffline DB copy\/backup\b/gi, "копия или резервная копия базы"],
	[/\boffline backup\/copy\b/gi, "резервная копия"],
	[/\boffline copy\/backup\b/gi, "резервная копия"],
	[/\bbackup\/copy\b/gi, "резервная копия"],
	[/\bbackup\b/gi, "резервная копия"],
	[/\bcopy\b/gi, "копия"],
	[/\bexport\b/gi, "выгрузка"],
	[/\bcommit\b/gi, "запись"],
	[/\bpublic lookup\b/gi, "поиск реквизитов"],
	[/\bclinic lookup\b/gi, "поиск реквизитов клиники"],
	[/\bpatient matching\b/gi, "сверка пациентов"],
	[/\bpatient hints\b/gi, "подсказки по пациенту"],
	[/\bdata folder\b/gi, "папка с данными"],
	[/\bviewer\/workbench plan\b/gi, "план открытия просмотрщика"],
	[/\bviewer\b/gi, "просмотрщик"],
	[/\bworkbench\b/gi, "рабочий набор"],
	[/\badapter-plan\b/gi, "план разбора"],
	[/\badapter\b/gi, "способ разбора"],
	[/\bsource fingerprint\b/gi, "номер источника"],
	[/\bfingerprint\b/gi, "номер"],
	[/\bsafe alias(?:es)?\b/gi, "внутренние номера"],
	[/\bsafe route-token\b/gi, "внутренний номер маршрута"],
	[/\bsafe token\b/gi, "внутренний номер"],
	[/\braw local path\b/gi, "локальный путь"],
	[/\balias(?:es)?\b/gi, "номера"],
	[/\bpublic query\b/gi, "запрос онлайн-поиска"],
	[/\bpayload\b/gi, "данные запроса"],
	[/\bendpoint\b/gi, "сетевой адрес"],
	[/\blive_db_connection_string\b/gi, "подключение к живой базе"],
	[/\barchive_container\b/gi, "архив"],
	[/\bimage_input\b/gi, "изображение"],
	[/\bpdf_input\b/gi, "PDF"],
	[/\blegacy_database_input\b/gi, "старая база"],
	[/\blegacy_dump_input\b/gi, "резервная копия старой базы"],
	[/\bscanned_pdf_possible\b/gi, "PDF может быть сканом"],
	[/\btable_like\b/gi, "похоже на таблицу"],
	[/\brussian_text\b/gi, "русский текст"],
	[/\bphone_like\b/gi, "похож на телефон"],
	[/\bdate_like\b/gi, "похоже на дату"],
	[/\bprice_like\b/gi, "похоже на цену"],
	[/\bimaging_like\b/gi, "похоже на снимки"],
	[/\bdental_service_like\b/gi, "похоже на услуги"],
	[/\bdocument_like\b/gi, "похоже на документ"],
	[/\bfile_reference_like\b/gi, "есть ссылки на файлы"],
	[/\bmigration_source_like\b/gi, "похоже на источник миграции"],
	[
		/\blegacy_source_staging_manifest_only\b/gi,
		"старая база добавлена как проверочный список",
	],
	[/\s+#[A-F0-9]{8,12}\b/g, ""],
	[/\bimage_requires_ocr_or_vision\b/gi, "изображению нужно распознавание"],
	[/\bpdf_text_not_extracted_may_be_scanned\b/gi, "PDF может быть сканом"],
	[
		/\bzip_no_supported_entries\b/gi,
		"в архиве не найдено поддерживаемых файлов",
	],
	[/\bno_text_extracted\b/gi, "текст не извлечен"],
	[/\bextracted_text_truncated\b/gi, "текст сокращен до лимита"],
	[
		/\bunknown_format_decoded_as_text\b/gi,
		"неизвестный формат прочитан как текст",
	],
	[/\bsource_row_hash\b/gi, "контроль строки"],
	[/\bpublic_lookup_query\b/gi, "запрос онлайн-поиска"],
	[/\braw_pixel_blob\b/gi, "исходные данные снимка"],
	[/\bpublic_url_with_patient_name\b/gi, "публичная ссылка с именем пациента"],
	[/\bunsanitized_local_path\b/gi, "сырой локальный путь"],
	[/\braw_database_file\b/gi, "сырой файл старой базы"],
	[/\bdb_password\b/gi, "пароль старой базы"],
	[/\bsecret_or_password\b/gi, "секрет или пароль"],
	[/\bdirect_commit\b/gi, "запись без предпросмотра"],
	[/\bunreviewed_commit_flag\b/gi, "запись без проверки"],
	[/\braw_archive_path\b/gi, "сырой путь к архиву"],
	[/\bprovider\b/gi, "источник"],
	[/\bCBCT\b/g, "КЛКТ"],
	[/STT-мост/gi, "модуль распознавания"],
	[/локальный мост/gi, "локальный модуль"],
	[/локального моста/gi, "локального модуля"],
	[/локальном мосте/gi, "локальном модуле"],
	[/мост Whisper/gi, "модуль Whisper"],
	[/мост Vosk/gi, "модуль Vosk"],
	[/\bDB\b/g, "база"],
	[/\bdump\b/gi, "резервная копия"],
];
export const humanizeMigrationText = (value: unknown) => {
	const rawValue = String(value ?? "").trim();
	if (!rawValue) return "";
	const directLabel =
		migrationManifestColumnLabels[rawValue] ??
		migrationArtifactKindLabels[rawValue];
	if (directLabel) return directLabel;

	return migrationHumanTextReplacements
		.reduce(
			(text, [pattern, replacement]) => text.replace(pattern, replacement),
			rawValue,
		)
		.replace(/_/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};
export const integrationInputLabels: Record<string, string> = {
	CSV: "табличный файл",
	TSV: "таблица с разделителями",
	Excel: "таблица Excel",
	"CSV оплат": "таблица оплат",
	"CSV список": "табличный список",
	"Excel услуг": "таблица услуг",
	"SQL export через промежуточный CSV": "выгрузка базы через таблицу",
	"zip экспорт": "архив выгрузки",
	"документы HTML/PDF": "документы из старой системы",
	"скан PDF": "скан документа",
	JPG: "снимки JPG",
	PNG: "снимки PNG",
	TIFF: "снимки TIFF",
	BMP: "снимки BMP",
};
export const humanizeIntegrationInput = (value: string) =>
	integrationInputLabels[value] ?? humanizeMigrationText(value);
export const localBridgeEndpointSummary = (
	bridge: LocalBridgeReadinessResponse["bridges"][number],
) => {
	if (bridge.urlRedacted) return bridge.urlRedacted;
	if (bridge.setupSettingsCount)
		return `серверных настроек: ${bridge.setupSettingsCount}`;
	return "адрес локального модуля не задан";
};
export const humanizeMigrationList = (
	items: unknown[] | undefined,
	limit = items?.length ?? 0,
) =>
	(items ?? [])
		.slice(0, limit)
		.map(humanizeMigrationText)
		.filter(Boolean)
		.join(" · ");
export const humanizeMigrationColumns = (
	items: unknown[] | undefined,
	limit = items?.length ?? 0,
) =>
	(items ?? [])
		.slice(0, limit)
		.map(
			(item) =>
				clinicPublicLookupFieldLabels[String(item)] ??
				migrationManifestColumnLabels[String(item)] ??
				humanizeMigrationText(item),
		)
		.filter(Boolean)
		.join(" · ");
export const clinicPublicLookupWarningText = (warning: string) => {
	const text = humanizeMigrationText(warning);
	const duplicateValue = text.match(
		/^Строка\s+(\d+):\s+найдено еще одно значение для ([^;]+);\s*оставлено первое\.?$/i,
	);
	if (duplicateValue) {
		const lineNumber = duplicateValue[1] ?? "?";
		const fieldKey = duplicateValue[2]?.trim() ?? "";
		const fieldLabel =
			clinicPublicLookupFieldLabels[fieldKey] ??
			humanizeMigrationText(fieldKey);
		return `Строка ${lineNumber}: найдено другое значение для поля "${fieldLabel}"; оставлено первое, проверьте вручную.`;
	}
	return text
		.replace(/\bDadata\b/gi, "сервис реквизитов")
		.replace(/\bmanual public targets\b/gi, "ручная сверка")
		.replace(/ответ\s+\d{3}/i, "ошибку связи")
		.replace(/не подставлены автоматически/i, "не подставлены сейчас");
};
export const migrationSourceKindLabel = (sourceKind: string) =>
	migrationLegacySourceKindLabels[sourceKind] ??
	humanizeMigrationText(sourceKind);
export const migrationSourceDisplayName = (
	candidate: Pick<
		MigrationLocalSourceDiscoveryCandidate,
		"safeDisplayName" | "sourceKind"
	>,
	ordinal?: number,
) => {
	const cleanName = humanizeMigrationText(candidate.safeDisplayName)
		.replace(/\s+#[A-F0-9]{8,12}\b/g, "")
		.trim();
	const baseName = cleanName || migrationSourceKindLabel(candidate.sourceKind);
	return typeof ordinal === "number" ? `${baseName} ${ordinal + 1}` : baseName;
};
export const migrationHandoffEndpointLabels: Record<string, string> = {
	"/api/imaging/dicom/folder-workup-plan": "проверка КТ-серий",
	"/api/imaging/imports/preview": "предпросмотр списка снимков",
	"/api/imaging/folders/scan-preview": "сканирование папки снимков",
	"/api/ingestion/extract": "разбор файла или таблицы",
	"/api/imports/smart/preview": "предпросмотр переноса",
};
export const migrationHandoffRouteLabel = (handoff: MigrationLocalSourceHandoff) => {
	const actionLabel =
		handoff.method === "GET" ? "открыть проверку" : "передать на проверку";
	return `${actionLabel}: ${migrationHandoffEndpointLabels[handoff.endpoint] ?? "предпросмотр в CRM"}`;
};
export const shortDicomSeriesCode = (value: string | null | undefined) => {
	if (!value) return "код серии не указан";
	const trimmed = value.trim();
	return `код серии ${trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed}`;
};
export const dicomSeriesDisplayText = (series: DicomSeriesPreviewGroup) =>
	series.seriesDescription ??
	series.studyDescription ??
	shortDicomSeriesCode(series.seriesInstanceUid);
export const dicomSeriesWarningText = (warnings: string[]) =>
	warnings.length
		? warnings.slice(0, 3).map(humanizeMigrationText).join(", ")
		: "готово к просмотру";
export const importWarningListText = (
	warnings: string[],
	fallback: string,
	limit = 4,
) => {
	if (!warnings.length) return fallback;
	const text = warnings
		.slice(0, limit)
		.map(humanizeMigrationText)
		.filter(Boolean)
		.join(", ");
	return text || fallback;
};
export const patientImportRowWarningText = (
	warnings: string[],
	notes: string | null | undefined,
) =>
	importWarningListText(
		warnings,
		notes ? humanizeMigrationText(notes) : "готово к импорту",
	);
export const imagingImportReadyText = (filePath: string | null | undefined) => {
	const trimmed = filePath?.trim();
	if (!trimmed) return "готово к привязке";
	const virtualPath = trimmed.split("::").pop() ?? trimmed;
	const safeName =
		virtualPath.split(/[\\/]/).filter(Boolean).pop() ?? virtualPath;
	return `готово к привязке: ${humanizeMigrationText(safeName)}`;
};
export const imagingImportRowWarningText = (
	warnings: string[],
	filePath: string | null | undefined,
) => importWarningListText(warnings, imagingImportReadyText(filePath));
export const aiRecognitionWarningLabels: Record<string, string> = {
	"OCR/диктовка не пишет в базу напрямую: сначала preview, дубли и ручное подтверждение.":
		"Черновик не попадет в базу без предпросмотра, проверки дублей и ручного подтверждения.",
	"Телефон не найден уверенно, строка должна попасть в предупреждения импорта.":
		"Телефон распознан неуверенно: проверьте строку в мастере импорта.",
	"AI не ставит диагноз по снимку и не заменяет врача.":
		"Описание снимка остается черновиком: диагноз подтверждает только врач.",
	"Для КЛКТ/КТ-серий нужен просмотрщик и метаданные, а не только текстовое описание.":
		"Для КЛКТ/КТ-серии нужен клинический просмотр и данные серии, не только текст.",
	"Юридические документы требуют шаблона клиники и проверки перед выдачей пациенту.":
		"Документ можно выдавать только после проверки по шаблону клиники.",
	"Диктовка врача остается черновиком до подтверждения.":
		"Диктовка остается черновиком до подтверждения врачом.",
	"Диагноз и план лечения нельзя подписывать автоматически.":
		"Диагноз и план лечения подписывает врач вручную.",
};
export const aiRecognitionWarningText = (warning: string) =>
	aiRecognitionWarningLabels[warning] ?? humanizeMigrationText(warning);
export const dicomFirstFrameFileFormatLabel = (
	transferSyntaxUid: string | null | undefined,
) => {
	if (!transferSyntaxUid) return "формат файла не указан";
	if (transferSyntaxUid.includes(".1.2.4.")) return "формат файла: сжатый";
	if (
		transferSyntaxUid === "1.2.840.10008.1.2" ||
		transferSyntaxUid === "1.2.840.10008.1.2.1" ||
		transferSyntaxUid === "1.2.840.10008.1.2.2"
	) {
		return "формат файла: стандартный";
	}
	return "формат файла: проверен";
};
export const dicomFirstFrameImageTypeLabel = (
	photometricInterpretation: string | null | undefined,
) => {
	const normalized = photometricInterpretation?.trim().toUpperCase();
	if (!normalized) return "тип изображения не указан";
	if (normalized.startsWith("MONOCHROME")) return "серый снимок";
	if (
		normalized === "RGB" ||
		normalized === "YBR_FULL" ||
		normalized === "YBR_FULL_422"
	)
		return "цветной снимок";
	return "тип изображения: особый";
};


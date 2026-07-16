import type {
	AiRecognitionJob,
	AuditEvent,
	Chair,
	ClinicalRule,
	ClinicalRuleAction,
	ClinicalRuleSeverity,
	ClinicMode,
	ClinicPublicLookupResponse,
	Dashboard,
	DentalModelWorkbenchManifest,
	DentalPricelistAnalysisResponse,
	DenteTelegramBotStatus,
	DenteTelegramChatLinkPublic,
	DenteTelegramFeature,
	DenteTelegramLinkCodePublic,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramVisualCardKey,
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomMprTool,
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewGroup,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	ImagingFolderScanResponse,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImagingViewerImplantPlan,
	ImagingViewerTool,
	ImportBatch,
	ImportIntakeResponse,
	ImportPreviewResponse,
	ImportSourceKind,
	IntegrationPreset,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
	LocalImagingOrganizerResponse,
	MigrationAutopilotHandoffChecklistItem,
	MigrationAutopilotOperatorScriptAction,
	MigrationAutopilotOperatorScriptStep,
	MigrationAutopilotPacketLane,
	MigrationAutopilotResponse,
	MigrationAutopilotSource,
	MigrationAutopilotStep,
	MigrationLocalSourceDiscoveryCandidate,
	MigrationLocalSourceDiscoveryResponse,
	MigrationLocalSourceHandoff,
	MigrationLocalSourceProbeResponse,
	MigrationLocalSourceWorkupResponse,
	MigrationReadinessItem,
	ProtocolTemplate,
	RoleQueue,
	ServiceCatalogItem,
	ServiceCategory,
	SmartImportPreviewResponse,
	SpeechProvider,
	SpeechRecordingRecoveryList,
	StaffMember,
	StaffRole,
	WeekdayIndex,
} from "@dental/shared";
import {
	CheckCircle2,
	ClipboardCheck,
	Database,
	FileCheck2,
	FileText,
	Image as ImageIcon,
	RefreshCw,
	ScanSearch,
	Search,
	UploadCloud,
	UserCheck,
} from "lucide-react";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";
import { SmartMicrophoneButton } from "../../components/SmartMicrophoneButton";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type {
	CtImplantLibraryItem,
	CtPlanningQuickAction,
} from "../../ctPlanningTools";
import {
	type MprClinicalPreset,
	type MprProjection,
	mprClinicalPresets,
	mprProjectionOrientationLabels,
} from "../../imagingUiLabels";
import { motionSafeScrollIntoView } from "../../motionPreference";
import {
	buildMprClinicalChecklist,
	buildMprOperatorSummary,
	buildMprWorkbenchSummary,
	findNearestMprClinicalPreset,
	mprClinicalNextAction,
	resolveMprClinicalPresetProjection,
} from "../../mprClinicalStatus";
import {
	buildMprAxisGuidance,
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
	formatMprAxisAngleBadge,
	formatMprAxisDirectionLabel,
	formatMprAxisRangeValue,
	formatMprAxisVisualizerLabel,
	formatMprSlabBadge,
	formatMprSlabRangeValue,
	formatMprSliceBadge,
	formatMprSliceRangeValue,
	mprProjectionCompassLabels,
	mprSliceFraction,
	mprSliceIndexFromFraction,
	resolveMprKeyboardAdjustment,
} from "../../mprControlMath";
import type {
	ImagingConnectorCard,
	ImagingViewerCapability,
	RecognitionPreset,
} from "../../settingsStaticData";
import { useSettingsStore } from "../../store/settingsStore";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";

type MprAxisVisualizerStyle = CSSProperties & {
	"--mpr-axis-deg": string;
	"--mpr-slab-width": string;
	"--mpr-slice-position": string;
};
type TelegramPostVisitCheckupDelayKey =
	keyof DenteTelegramPostVisitCheckupDelayHoursByTopic;
type TelegramPostVisitCheckupDelayField = {
	key: TelegramPostVisitCheckupDelayKey;
	label: string;
	help: string;
};
type TelegramVisualCardField = {
	key: DenteTelegramVisualCardKey;
	label: string;
	placeholder: string;
	help: string;
};
type TelegramFeaturePlan = {
	enabledFeatures: DenteTelegramFeature[];
	patientSafeActions: string[];
	blockedByDefault: string[];
};
type DashboardClinicSettings = Dashboard["clinicSettings"];
type WorkspaceProfile = DashboardClinicSettings["workspaceProfiles"][number];
type RoleAccessPolicy = DashboardClinicSettings["roleAccessPolicies"][number];
type WeekdayOption = { value: WeekdayIndex; label: string };
type TelegramInlineButton = { text: string; target: string; kind: string };
type TelegramInlineButtonRow = TelegramInlineButton[];
type StringTokenGroup = { title: string; items: string[] };

function _formatBrowserImagingScanElapsed(
	elapsedMs: number | null | undefined,
): string {
	const safeMs =
		typeof elapsedMs === "number" && Number.isFinite(elapsedMs)
			? Math.max(0, Math.round(elapsedMs))
			: 0;
	if (safeMs < 1000) return `${safeMs} ms`;
	const totalSeconds = Math.floor(safeMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes <= 0) return `${seconds} s`;
	return `${minutes} m ${String(seconds).padStart(2, "0")} s`;
}
type BrowserContinuityCheck = { label: string; value: string; detail: string };
type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};
type PersistenceIntegrityReport = {
	ok: boolean;
	checkedAt: string;
	stateFileHash: string | null;
	checksumVerified: boolean | null;
	stateCounts: Record<string, number>;
	backups: PersistenceBackupCheck[];
	warnings: string[];
	nextAction: string;
};
type DicomFirstFrameViewerState = {
	rotationDeg: number;
	flipHorizontal: boolean;
	inverted: boolean;
	brightness: number;
	contrast: number;
	zoom: number;
};
type SettingsTabId =
	| "clinic"
	| "access"
	| "telegram"
	| "messengers"
	| "protocols"
	| "rules"
	| "prices"
	| "sources"
	| "ai"
	| "imports"
	| "audit";
type SettingsTab = { id: SettingsTabId; title: string };
type CbctWorkbenchPlane = { key: MprProjection; title: string; detail: string };
type MigrationOperatorActionScope = "primary" | "script";
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

type SettingsViewProps = Record<string, any>;
const _viewLabels = workspaceViewLabels as Record<string, string>;
const _staffCreationRoles: StaffRole[] = [
	"doctor",
	"administrator",
	"assistant",
	"manager",
];
const _clinicalRuleOwnerRoles: StaffRole[] = [
	"doctor",
	"assistant",
	"administrator",
	"manager",
	"owner",
];
const migrationOperatorSourceBoundActions: MigrationAutopilotOperatorScriptAction[] =
	[
		"open_plan",
		"open_probe",
		"add_to_parser",
		"prepare_export",
		"build_preview",
	];
const clinicPublicLookupFieldLabels: Record<string, string> = {
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
const _clinicPublicLookupBoundaryText =
	"Публичный поиск получает только реквизиты клиники: ИНН, ОГРН, КПП, название, адрес или лицензию. Пациентов, снимки, базы и локальные пути сюда не отправлять.";
const _migrationReadinessLevelLabels: Record<string, string> = {
	ready_for_preview: "можно делать предпросмотр",
	needs_bridge: "нужно подключение",
	needs_export: "нужна выгрузка",
	manual_review: "ручной разбор",
	blocked: "нужно действие",
};
const _migrationBridgeKitKindLabels: Record<string, string> = {
	none: "нет",
	file_upload: "файл/таблица",
	local_db_bridge: "подключение к копии базы",
	dicom_export: "выгрузка КТ/снимков",
	image_manifest: "список снимков",
	network_share_bridge: "сетевая папка",
	browser_manifest_bridge: "выбранная папка/диск",
	manual_manifest: "ручной список",
};
const _migrationBridgeKitStatusLabels: Record<string, string> = {
	ready: "готово",
	needs_admin: "нужен администратор",
	needs_export: "нужна выгрузка",
	manual: "ручная проверка",
	blocked: "стоп",
};
const migrationLegacySourceKindLabels: Record<string, string> = {
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
const _migrationAutomationLevelLabels: Record<string, string> = {
	ready_for_preview: "готово к предпросмотру",
	needs_file_upload: "нужен файл выгрузки",
	needs_local_bridge: "нужно подключение",
	manual_review: "ручной разбор",
};
const _smartImportMigrationPlanStatusLabels: Record<string, string> = {
	ready: "готово",
	review: "проверить",
	manual: "ручной разбор",
	blocked: "стоп",
};
const _smartImportLineKindLabels: Record<string, string> = {
	patient: "Пациент",
	imaging: "Снимок",
	clinic: "Клиника",
	legacy_source: "Источник",
	ignored: "Пропуск",
};
const _migrationWorkupStepStatusLabels: Record<string, string> = {
	ready: "готово",
	needs_bridge: "нужно подключение",
	manual: "ручной шаг",
	blocked: "стоп",
};
const importRowStatusLabels: Record<string, string> = {
	ready: "готово",
	warning: "проверить",
	blocked: "исправить",
};
const _clinicPublicLookupProviderStatusLabels: Record<string, string> = {
	ready: "профиль найден",
	not_configured: "онлайн-поиск не настроен",
	error: "онлайн-поиск не ответил",
	skipped_no_safe_query: "нужны реквизиты",
};
const _clinicPublicLookupSuggestionSourceLabels: Record<string, string> = {
	dadata: "Сервис реквизитов",
	manual_public_targets: "Из введенных реквизитов",
};
const _migrationEntityLabels: Record<string, string> = {
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
const _migrationPriorityLabels: Record<string, string> = {
	critical: "сначала",
	high: "важно",
	normal: "обычно",
	low: "потом",
};
const _migrationOwnerLabels: Record<string, string> = {
	administrator: "администратор",
	doctor: "врач",
	assistant: "ассистент",
	system: "CRM",
};
const _migrationHandoffPhaseLabels: Record<string, string> = {
	clinic_requisites: "реквизиты",
	source_access: "доступ к источнику",
	export_or_bridge: "выгрузка",
	staging_preview: "предпросмотр",
	doctor_control: "проверка врачом",
};
const _migrationOperatorPacketStatusLabels: Record<string, string> = {
	ready_for_preview: "можно делать предпросмотр",
	needs_admin: "нужен администратор",
	needs_bridge: "нужно подключение",
	needs_export: "нужна выгрузка",
	manual_review: "ручной разбор",
	blocked: "нужно действие",
	empty: "нет источников",
};
const migrationTriageStatusPriority: Record<string, number> = {
	blocked: 0,
	needs_bridge: 1,
	needs_export: 2,
	needs_admin: 3,
	manual_review: 4,
	empty: 5,
	ready_for_preview: 6,
};
const _migrationAdapterStatusLabels: Record<string, string> = {
	built_in: "готовый способ",
	ready: "готово",
	needs_admin: "нужен администратор",
	needs_local_bridge: "нужно локальное подключение",
	needs_export: "нужна выгрузка",
	manual: "ручная проверка",
	blocked: "стоп",
};
const _dicomRenderCachePriorityLabels: Record<
	DicomRenderCachePlanResponse["tasks"][number]["priority"],
	string
> = {
	blocking: "обязательно",
	interactive: "для плавного просмотра",
	prefetch: "подготовить заранее",
	background: "фоном",
	deferred: "позже",
};
const _localImagingModelWorkbenchTargetLabels: Record<string, string> = {
	metadata_only: "только метаданные",
	external_model_viewer: "внешний 3D-просмотр",
	local_bridge: "локальный 3D-модуль",
};
const migrationManifestColumnLabels: Record<string, string> = {
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
const migrationArtifactKindLabels: Record<string, string> = {
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
const migrationHumanTextReplacements: Array<[RegExp, string]> = [
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
const humanizeMigrationText = (value: unknown) => {
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
const integrationInputLabels: Record<string, string> = {
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
const _humanizeIntegrationInput = (value: string) =>
	integrationInputLabels[value] ?? humanizeMigrationText(value);
const _localBridgeEndpointSummary = (
	bridge: LocalBridgeReadinessResponse["bridges"][number],
) => {
	if (bridge.urlRedacted) return bridge.urlRedacted;
	if (bridge.setupSettingsCount)
		return `серверных настроек: ${bridge.setupSettingsCount}`;
	return "адрес локального модуля не задан";
};
const _humanizeMigrationList = (
	items: unknown[] | undefined,
	limit = items?.length ?? 0,
) =>
	(items ?? [])
		.slice(0, limit)
		.map(humanizeMigrationText)
		.filter(Boolean)
		.join(" · ");
const _humanizeMigrationColumns = (
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
const _clinicPublicLookupWarningText = (warning: string) => {
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
const migrationSourceKindLabel = (sourceKind: string) =>
	migrationLegacySourceKindLabels[sourceKind] ??
	humanizeMigrationText(sourceKind);
const _migrationSourceDisplayName = (
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
const migrationHandoffEndpointLabels: Record<string, string> = {
	"/api/imaging/dicom/folder-workup-plan": "проверка КТ-серий",
	"/api/imaging/imports/preview": "предпросмотр списка снимков",
	"/api/imaging/folders/scan-preview": "сканирование папки снимков",
	"/api/ingestion/extract": "разбор файла или таблицы",
	"/api/imports/smart/preview": "предпросмотр переноса",
};
const _migrationHandoffRouteLabel = (handoff: MigrationLocalSourceHandoff) => {
	const actionLabel =
		handoff.method === "GET" ? "открыть проверку" : "передать на проверку";
	return `${actionLabel}: ${migrationHandoffEndpointLabels[handoff.endpoint] ?? "предпросмотр в CRM"}`;
};
const shortDicomSeriesCode = (value: string | null | undefined) => {
	if (!value) return "код серии не указан";
	const trimmed = value.trim();
	return `код серии ${trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed}`;
};
const _dicomSeriesDisplayText = (series: DicomSeriesPreviewGroup) =>
	series.seriesDescription ??
	series.studyDescription ??
	shortDicomSeriesCode(series.seriesInstanceUid);
const _dicomSeriesWarningText = (warnings: string[]) =>
	warnings.length
		? warnings.slice(0, 3).map(humanizeMigrationText).join(", ")
		: "готово к просмотру";
const importWarningListText = (
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
const patientImportRowWarningText = (
	warnings: string[],
	notes: string | null | undefined,
) =>
	importWarningListText(
		warnings,
		notes ? humanizeMigrationText(notes) : "готово к импорту",
	);
const imagingImportReadyText = (filePath: string | null | undefined) => {
	const trimmed = filePath?.trim();
	if (!trimmed) return "готово к привязке";
	const virtualPath = trimmed.split("::").pop() ?? trimmed;
	const safeName =
		virtualPath.split(/[\\/]/).filter(Boolean).pop() ?? virtualPath;
	return `готово к привязке: ${humanizeMigrationText(safeName)}`;
};
const _imagingImportRowWarningText = (
	warnings: string[],
	filePath: string | null | undefined,
) => importWarningListText(warnings, imagingImportReadyText(filePath));
const aiRecognitionWarningLabels: Record<string, string> = {
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
const _aiRecognitionWarningText = (warning: string) =>
	aiRecognitionWarningLabels[warning] ?? humanizeMigrationText(warning);
const _dicomFirstFrameFileFormatLabel = (
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
const _dicomFirstFrameImageTypeLabel = (
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

export function LegacyMigrationStudio() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		activePatient,
		activeSettingsTabButtonRef,
		activeSpeechProviderHealth,
		activeWorkspaceProfile,
		addChair,
		addStaffMember,
		analyzePricelist,
		applyProtocolTemplate,
		attachPricelistImage,
		browserCanRequestPersistentStorage,
		browserContinuity,
		browserContinuityChecks,
		browserContinuityState,
		browserContinuityValue,
		browserDirectoryInputRef,
		browserDirectoryPickerAvailable,
		browserImagingFileInputAccept,
		browserImagingFilesInputRef,
		browserImagingScanProgress,
		browserMigrationDiscovery,
		browserMigrationScanProgress,
		browserMigrationInputRef,
		browserPickedImagingFolder,
		buildDicomFolderWorkupPlan,
		buildDicomRenderCachePlan,
		buildDicomViewerLaunchManifest,
		buildDicomViewerToolStateBundle,
		buildDicomViewerWorkbenchManifest,
		cancelLocalDicomOperation,
		cbctWorkbenchPlanes,
		cbctWorkbenchProjections,
		cbctWorkbenchSeries,
		cbctWorkbenchTools,
		chairScheduleDirtyIds,
		chairScheduleDrafts,
		chairScheduleSaveStates,
		chairScheduleSavingId,
		changeClinicMode,
		checkDicomWebConnector,
		checkDicomWorkstationReadiness,
		chooseRecognitionPreset,
		clinicPublicLookup,
		cancelBrowserImagingFolderScan,
		cancelBrowserMigrationScan,
		clearBrowserPickedImagingFolderPreview,
		clearDicomWorkbenchRecovery,
		clearLocalImagingFolderRecovery,
		clearPricelistImage,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		clinicModeLabels,
		clinicProfileDraft,
		clinicProfileSaveState,
		commitImagingImport,
		commitImport,
		commitSmartImport,
		copyTelegramTextToClipboard,
		createClinicalRuleFromSettings,
		createTelegramLinkCode,
		dashboard,
		defaultDicomFirstFrameViewerState,
		dentalMaterialKindLabels,
		dentalRestorationTypeLabels,
		dicomFirstFrameImageStyle,
		dicomFirstFramePreview,
		dicomFirstFrameStatusLabels,
		dicomFirstFrameViewerState,
		dicomFolderSeriesScan,
		dicomFolderWorkupPathLabels,
		dicomFolderWorkupPlan,
		dicomDiagnosticPixelPolicyLabels,
		dicomExecutionLaneLabels,
		dicomGpuClassLabels,
		dicomLabel,
		dicomLocalFolderDiscovery,
		dicomQualityModeLabels,
		dicomReadinessCheckLabels,
		dicomRenderMemoryBudgetClassLabels,
		dicomRenderCachePlan,
		dicomRuntimeTierLabels,
		dicomSeriesPreview,
		dicomSeriesViewerLabels,
		dicomTextureStrategyLabels,
		dicomViewerLaunchManifest,
		dicomViewerLaunchModeLabels,
		dicomViewerToolStateBundle,
		dicomViewerWorkbenchManifest,
		dicomWebCheck,
		dicomWebEndpointUrl,
		dicomWebStatusLabels,
		dicomWorkbenchLocalSavedAt,
		dicomWorkbenchServerBundle,
		dicomWorkbenchSourceIsRedacted,
		dicomWorkstationReadiness,
		discoverDicomFolders,
		discoverMigrationSources,
		documentDetectedKindLabel,
		documentIngestion,
		documentIngestionQualityLabels,
		documentIngestionTarget,
		documentLabels,
		downloadDicomViewerToolStateBundle,
		downloadDicomWorkbenchManifest,
		downloadMigrationHandoffReport,
		downloadPersistenceExport,
		downloadSmartImportSafeHandoffReport,
		downloadSmartImportReport,
		downloadTelegramQrSvg,
		filteredTelegramOutboxItems,
		formatByteSize,
		formatDateTime,
		formatMegabytes,
		formatTime,
		handleBrowserDirectoryInputChange,
		handleBrowserMigrationInputChange,
		hiddenTelegramOutboxItemCount,
		imagingConnectorCards,
		imagingFolderPath,
		imagingFolderScan,
		imagingImportCommit,
		imagingImportPreview,
		imagingImportSourceKind,
		imagingImportText,
		imagingKindLabels,
		ctPlanningImplantPlan,
		ctPlanningActiveQuickActionId,
		imagingViewerActiveTool,
		imagingSourceChoices,
		imagingSourceDetails,
		imagingSourceLabels,
		imagingViewerCapabilities,
		importCommit,
		importIntake,
		importPreview,
		importSourceKind,
		importSourceLabels,
		importText,
		ingestImportFile,
		ingestionTargetLabels,
		integrationCapabilityLabels,
		integrationCategoryLabels,
		integrationStatusLabels,
		isBrowserImagingFolderPicking,
		isBrowserMigrationScanning,
		isClinicPublicLookupLoading,
		isClinicalRuleSaving,
		isDicomFirstFramePreviewing,
		isDicomFolderWorkupPlanning,
		isDicomLocalDiscovering,
		isDicomManifestBuilding,
		isDicomRenderCachePlanning,
		isDicomSeriesPreviewLoading,
		isDicomToolStateBuilding,
		isDicomWebChecking,
		isDicomWorkbenchBuilding,
		isDicomWorkbenchReconnecting,
		isDicomWorkbenchServerSaving,
		isDicomWorkstationChecking,
		isDocumentIngesting,
		isImagingFolderScanning,
		isLocalDicomOperationActive,
		isImagingImportCommitting,
		isImagingImportLoading,
		isImportCommitting,
		isImportDictating,
		isImportLoading,
		isLocalImagingOrganizing,
		isMigrationAutopilotLoading,
		isMigrationHandoffReportLoading,
		isMigrationSourceDiscovering,
		isMigrationSourceProbeLoading,
		isMigrationSourceWorkupLoading,
		isPersistenceExporting,
		isPricelistAnalyzing,
		isRecognitionLoading,
		isSmartImportCommitting,
		isSmartImportLoading,
		isSmartReportLoading,
		isSmartSafeReportLoading,
		isTelegramChatLinksLoadingMore,
		isTelegramLinkCodesLoadingMore,
		isTelegramLinkCreating,
		isTelegramLoading,
		isTelegramOutboxItemDueForUi,
		isTelegramOutboxLoadingMore,
		isTelegramSendingDue,
		isTelegramSettingsSaving,
		latestDicomWorkbenchServerBundle,
		legalMissingFields,
		legalReadinessPercent,
		loadLocalBridgeUsePlans,
		loadMoreTelegramChatLinks,
		loadMoreTelegramLinkCodes,
		loadMoreTelegramOutbox,
		loadPersistenceHealth,
		loadPersistenceIntegrity,
		loadTelegramControlPlane,
		localBridgeReadiness,
		localBridgeStatusLabels,
		localBridgeStatusState,
		localBridgeStatusValue,
		localBridgeUsePathLabels,
		localBridgeUsePlans,
		localImagingFolderDraft,
		localImagingModelRoleLabels,
		localImagingOrganizer,
		localImagingOrganizerActionLabels,
		lookupClinicPublicProfile,
		lockTelegramAdminSession,
		markTelegramSettingsDirty,
		migrationAutopilot,
		migrationSourceDiscovery,
		migrationSourceProbe,
		migrationSourceWorkup,
		mprAxisDeg,
		mprCacheModeLabels,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		mprLoadStrategyLabels,
		mprProjection,
		mprProjectionLabels,
		mprResourceTierLabels,
		mprSliceIndex,
		mprSlabMm,
		mprToolLabels,
		mprWorkbenchDraftRestored,
		mprWorkbenchLocalSavedAt,
		mprWindowPreset,
		mprWindowPresetLabels,
		newChairHasMicroscope,
		newChairHasSurgeryKit,
		newChairHasXraySensor,
		newChairName,
		newRuleAction,
		newRuleBlockedServiceId,
		newRuleCategory,
		newRuleCompletedServiceId,
		newRuleOwnerRole,
		newRulePatientText,
		newRuleRequiredServiceId,
		newRuleSeverity,
		newRuleSpecialty,
		newRuleTitle,
		newRuleTriggerServiceId,
		newRuleWarningText,
		newStaffName,
		newStaffRole,
		newStaffSpecialty,
		normalizedClinicalRuleAction,
		normalizedClinicalRuleSeverity,
		normalizedDentalSpecialty,
		normalizedServiceCategory,
		normalizedStaffRole,
		normalizedTelegramBotMode,
		normalizedTelegramLinkSubjectType,
		normalizedTelegramOutboxStatusFilter,
		normalizedTelegramOutboxTemplateFilter,
		normalizedTelegramPrivacyMode,
		normalizeUiLanguageInput,
		ohifBaseUrl,
		organizeLocalImagingSources,
		persistenceHealth,
		persistenceIntegrity,
		pickBrowserImagingFolder,
		pickBrowserImagingFiles,
		pickBrowserMigrationSource,
		policyAuditEventLabels,
		prepareDicomWorkbenchFromFolder,
		previewDicomFirstFrame,
		previewDicomFirstFrameSlice,
		previewDicomSeries,
		planMigrationDiscoveryCandidate,
		previewMigrationDiscoveryCandidate,
		previewMigrationAutopilotSources,
		probeMigrationDiscoveryCandidate,
		previewImagingImport,
		previewImport,
		previewSmartImport,
		previewTelegramTemplate,
		pricelistAnalysis,
		pricelistImageBase64,
		pricelistImageName,
		pricelistImageNote,
		pricelistItemMaterialText,
		pricelistMaterialSummaryText,
		pricelistWarningsText,
		pricelistParserModeLabels,
		pricelistRecognitionBrandGroups,
		pricelistRecognitionServiceGroups,
		pricelistSourceKind,
		pricelistSourceKindLabels,
		pricelistText,
		recognitionJob,
		recognitionKind,
		recognitionPresets,
		recognitionTarget,
		recognitionTargetLabels,
		recognitionText,
		reconnectDicomWorkbenchFromCurrentFolder,
		refreshBrowserContinuity,
		refreshSpeechRuntime,
		addMigrationDiscoveryCandidateToSmartImport,
		rememberLocalImagingFolder,
		reopenOnboarding,
		requestBrowserStoragePersistence,
		restoreDicomWorkbenchServerBundle,
		restoreMprWorkbenchLocalDraft,
		revokeTelegramChatLink,
		runMigrationAutopilot,
		runRecognitionJob,
		saveChairSchedule,
		saveClinicProfileFromDraft,
		saveDicomWorkbenchBundleToServer,
		saveStaffSchedule,
		saveTelegramSettings,
		scanDicomFolderSeries,
		scanImagingFolder,
		selectedUiLanguageOption,
		sendDueTelegramOutbox,
		sendRecognitionResultToImport,
		sendTelegramOutboxItem,
		serviceCategoryLabels,
		serviceTitle,
		setDicomFirstFramePreview,
		setDicomFirstFrameViewerState,
		setDicomFolderSeriesScan,
		setDicomFolderWorkupPlan,
		setDicomLocalFolderDiscovery,
		setDicomRenderCachePlan,
		setDicomSeriesPreview,
		setDicomViewerLaunchManifest,
		setDicomViewerToolStateBundle,
		setDicomViewerWorkbenchManifest,
		setDicomWebCheck,
		setDicomWebEndpointUrl,
		setDicomWorkbenchLocalSavedAt,
		setDicomWorkstationReadiness,
		setDocumentIngestionTarget,
		setImagingFolderPath,
		setImagingFolderScan,
		setImagingImportCommit,
		setImagingImportPreview,
		setImagingImportSourceKind,
		setImagingImportText,
		selectCtPlanningImplant,
		setImagingViewerActiveTool,
		setCtPlanningActiveQuickActionId,
		setImportCommit,
		setImportIntake,
		setImportPreview,
		setImportSourceKind,
		setImportText,
		setLocalImagingOrganizer,
		setMprAxisDeg,
		setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled,
		setMprProjection,
		setMprSliceIndex,
		setMprSlabMm,
		setMprWindowPreset,
		setNewChairHasMicroscope,
		setNewChairHasSurgeryKit,
		setNewChairHasXraySensor,
		setNewChairName,
		setNewRuleAction,
		setNewRuleBlockedServiceId,
		setNewRuleCategory,
		setNewRuleCompletedServiceId,
		setNewRuleOwnerRole,
		setNewRulePatientText,
		setNewRuleRequiredServiceId,
		setNewRuleSeverity,
		setNewRuleSpecialty,
		setNewRuleTitle,
		setNewRuleTriggerServiceId,
		setNewRuleWarningText,
		setNewStaffName,
		setNewStaffRole,
		setNewStaffSpecialty,
		setOhifBaseUrl,
		setPricelistAnalysis,
		setPricelistSourceKind,
		setPricelistText,
		setRecognitionJob,
		setRecognitionText,
		setSettingsTab,
		setSmartImportCommit,
		setSmartImportMode,
		setSmartImportPreview,
		setSmartImportText,
		settingsTab,
		settingsTabs,
		setUiLanguage,
		setUsePricelistAi,
		smartImportCommit,
		smartImportMode,
		smartImportModeLabels,
		smartImportPreview,
		smartImportText,
		specialtyLabels,
		speechGatewayCanUpload,
		speechGatewayHealthReport,
		speechGatewayStatus,
		speechProviderConnectorLabels,
		speechProviderHealthById,
		speechProviderHealthLabels,
		speechProviderModeLabels,
		speechProviderRuntimeById,
		speechProviderSelectionLabels,
		speechProviderStatusLabels,
		speechRecordingPathLabels,
		speechRecordingRecovery,
		speechRecordingStrategy,
		speechRecoveryStateLabels,
		staffRoleLabels,
		staffScheduleDirtyIds,
		staffScheduleDraftFromWorkingHours,
		staffScheduleDrafts,
		staffScheduleSaveStates,
		staffScheduleSavingId,
		stageLocalImagingFolderRecovery,
		startImportDictation,
		telegramAdminSecretDraft,
		telegramAdminSecretSession,
		telegramAllowVoiceIntakeDraft,
		telegramBotConfigId,
		telegramBotUsernameDraft,
		telegramChatLinkLedger,
		telegramChatLinks,
		telegramClassificationLabels,
		telegramDeliveryStatusLabels,
		telegramEnabledFeaturesDraft,
		telegramFeatureHelp,
		telegramFeatureLabel,
		telegramFeatureOptions,
		telegramFeaturePlan,
		telegramHumanMessage,
		telegramInlineButtonKindLabels,
		telegramInlineButtonRowsFromReplyMarkup,
		telegramLinkActionState,
		telegramLinkCode,
		telegramLinkCodeLedger,
		telegramLinkCodes,
		telegramLinkCodeStatusLabels,
		telegramLinkStaffId,
		telegramLinkStaffOptions,
		telegramLinkSubjectType,
		telegramMapsUrlDraft,
		telegramModeDraft,
		telegramModeHints,
		telegramModeLabels,
		telegramOutbox,
		telegramOutboxStatusFilter,
		telegramOutboxStatusFilterLabels,
		telegramOutboxStatusFilterOptions,
		telegramOutboxTemplateFilter,
		telegramOutboxTemplateFilterLabels,
		telegramOutboxTemplateFilterOptions,
		telegramOwnBotUsernameDraft,
		telegramPatientPortalBaseUrlDraft,
		telegramPostVisitCheckupDelayDrafts,
		telegramPostVisitCheckupDelayFields,
		telegramPreview,
		telegramPrivacyModeDraft,
		telegramPrivacyModeHints,
		telegramPrivacyModeLabels,
		telegramQrSvgToDataUrl,
		telegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		telegramReviewUrlDraft,
		telegramRevokingLinkId,
		telegramSendingItemId,
		telegramSettingsDirty,
		telegramSettingsSaveError,
		telegramSettingsSaveState,
		telegramStaffEscalationChannelDraft,
		telegramStatus,
		telegramSubjectName,
		telegramTemplateLabels,
		telegramTokenTtlDraft,
		telegramVisualCardFields,
		telegramVisualCardUrlDrafts,
		telegramWebhookBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		toggleChairWorkingDay,
		toggleClinicalRule,
		toggleClinicWorkingDay,
		toggleStaffWorkingDay,
		toggleTelegramFeature,
		uiLanguage,
		uiLanguageOptions,
		setTelegramAdminSecretDraft: propsSetTelegramAdminSecretDraft,
		unlockTelegramAdminSession,
		updateChairScheduleDay,
		updateChairScheduleDraft,
		updateClinicProfileDraft,
		updateStaffScheduleDay,
		updateStaffScheduleDraft,
		updateTelegramPostVisitCheckupDelayDraft,
		updateTelegramVisualCardUrlDraft,
		usePricelistAi,
		visibleTelegramOutboxItems,
		weekdayOptions,
		workspaceScopeLabels,
	} = mergedProps;
	const {
		clinicMode,
		setClinicMode,
		setTelegramOutbox,
		setTelegramOutboxStatusFilter,
		setTelegramOutboxTemplateFilter,
		setTelegramLinkSubjectType,
		setTelegramLinkStaffId,
		setTelegramLinkCode,
		setTelegramLinkActionState,
		setTelegramModeDraft,
		setTelegramBotUsernameDraft,
		setTelegramOwnBotUsernameDraft,
		setTelegramBotConfigId,
		setTelegramWebhookBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		setTelegramReviewUrlDraft,
		setTelegramMapsUrlDraft,
		setTelegramEnabledFeaturesDraft,
		setTelegramTokenTtlDraft,
		setTelegramReminderLeadTimesDraft,
		setTelegramReviewRequestDelayDraft,
		setTelegramAllowVoiceIntakeDraft,
		setTelegramStaffEscalationChannelDraft,
		setTelegramPrivacyModeDraft,
		setTelegramAdminSecretDraft,
	} = useSettingsStore();

	const _recognitionInputReady = (recognitionText || "").trim().length > 0;
	const smartImportInputReady = (smartImportText || "").trim().length > 0;
	const _imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const patientImportInputReady = (importText || "").trim().length > 0;
	const _localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;
	const _newStaffReadyToCreate = (newStaffName || "").trim().length > 0;
	const _newChairReadyToCreate = (newChairName || "").trim().length > 0;
	const _adminSecretReady = (telegramAdminSecretDraft || "").trim().length > 0;
	const _adminSecretScopeWarning =
		settingsTab === "telegram"
			? "Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные, если для них включены отдельные секреты."
			: "Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные, если для них включены отдельные секреты.";
	const _typedClinicModes = Object.keys(clinicModeLabels) as ClinicMode[];
	const _typedModeHints = dashboard.clinicSettings.modeHints as string[];
	const _typedRoleQueues = dashboard.shiftIntelligence
		.roleQueues as RoleQueue[];
	const _typedStaffMembers = dashboard.clinicSettings.staff as StaffMember[];
	const _typedChairs = dashboard.clinicSettings.chairs as Chair[];
	const _typedWeekdayOptions = weekdayOptions as WeekdayOption[];
	const _typedUiLanguageOptions = uiLanguageOptions as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const _typedTelegramLinkStaffOptions =
		telegramLinkStaffOptions as StaffMember[];
	const _typedProtocolTemplates =
		dashboard.protocolTemplates as ProtocolTemplate[];
	const _typedImagingConnectorCards =
		imagingConnectorCards as ImagingConnectorCard[];
	const _typedImagingViewerCapabilities =
		imagingViewerCapabilities as ImagingViewerCapability[];
	const _typedCtPlanningImplantPlan =
		ctPlanningImplantPlan as ImagingViewerImplantPlan | null;
	const _typedCtPlanningActiveQuickActionId =
		typeof ctPlanningActiveQuickActionId === "string"
			? ctPlanningActiveQuickActionId
			: null;
	const _typedImagingViewerActiveTool =
		imagingViewerActiveTool as ImagingViewerTool;
	const _typedIntegrationPresets = dashboard.clinicSettings
		.integrationPresets as IntegrationPreset[];
	const _typedSpeechProviders = dashboard.speechProviders as SpeechProvider[];
	const _typedRecognitionPresets = recognitionPresets as RecognitionPreset[];
	const _typedRecognitionJob = recognitionJob as AiRecognitionJob | null;
	const _typedSpeechRecordingRecovery =
		speechRecordingRecovery as SpeechRecordingRecoveryList | null;
	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;
	const _typedImagingSourceChoices =
		imagingSourceChoices as ImagingSourceKind[];
	const _typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const _typedBrowserContinuityChecks =
		browserContinuityChecks as BrowserContinuityCheck[];
	const _typedLocalBridgeReadiness =
		localBridgeReadiness as LocalBridgeReadinessResponse | null;
	const _typedLocalBridgeUsePlans =
		localBridgeUsePlans as LocalBridgeUsePlansResponse | null;
	const _typedPersistenceIntegrity =
		persistenceIntegrity as PersistenceIntegrityReport | null;
	const _typedImportBatches = dashboard.importBatches as ImportBatch[];
	const _typedAuditEvents = dashboard.auditEvents as AuditEvent[];
	const typedImportSourceKinds = Object.keys(
		importSourceLabels,
	) as ImportSourceKind[];
	const typedDocumentIngestionTargets = Object.keys(
		ingestionTargetLabels,
	) as DocumentIngestionTarget[];
	const typedDocumentIngestion =
		documentIngestion as DocumentIngestionResponse | null;
	const typedImportIntake = importIntake as ImportIntakeResponse | null;
	const typedImportPreview = importPreview as ImportPreviewResponse | null;
	const _typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const _typedWorkspaceProfiles = dashboard.clinicSettings
		.workspaceProfiles as WorkspaceProfile[];
	const _typedRoleAccessPolicies = dashboard.clinicSettings
		.roleAccessPolicies as RoleAccessPolicy[];
	const _typedTelegramChatLinks =
		(telegramChatLinks as DenteTelegramChatLinkPublic[]) ?? [];
	const _typedTelegramLinkCodes =
		(telegramLinkCodes as DenteTelegramLinkCodePublic[]) ?? [];
	const _typedTelegramPreview =
		telegramPreview as DenteTelegramMessagePreview | null;
	const typedTelegramOutbox =
		telegramOutbox as DenteTelegramOutboxResponse | null;
	const typedVisibleTelegramOutboxItems =
		visibleTelegramOutboxItems as DenteTelegramOutboxItem[];
	const _telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: hiddenTelegramOutboxItemCount;
	const _typedTelegramStatus = telegramStatus as DenteTelegramBotStatus | null;
	const _typedTelegramOutboxStatusFilterOptions =
		telegramOutboxStatusFilterOptions as string[];
	const _typedTelegramOutboxTemplateFilterOptions =
		telegramOutboxTemplateFilterOptions as string[];
	const _typedTelegramInlineButtonKindLabels =
		telegramInlineButtonKindLabels as Record<string, string>;
	const _typedTelegramFeaturePlan =
		telegramFeaturePlan as TelegramFeaturePlan | null;
	const _typedTelegramEnabledFeaturesDraft =
		telegramEnabledFeaturesDraft as DenteTelegramFeature[];
	const _typedTelegramFeatureOptions =
		telegramFeatureOptions as DenteTelegramFeature[];
	const _typedTelegramFeatureHelp = telegramFeatureHelp as Record<
		DenteTelegramFeature,
		string
	>;
	const _typedTelegramPostVisitCheckupDelayFields =
		telegramPostVisitCheckupDelayFields as TelegramPostVisitCheckupDelayField[];
	const _typedTelegramPostVisitCheckupDelayDrafts =
		telegramPostVisitCheckupDelayDrafts as Record<
			TelegramPostVisitCheckupDelayKey,
			string
		>;
	const _typedTelegramVisualCardFields =
		telegramVisualCardFields as TelegramVisualCardField[];
	const _getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) =>
		telegramInlineButtonRowsFromReplyMarkup(
			replyMarkup,
		) as TelegramInlineButtonRow[];
	const _typedPricelistAnalysis =
		pricelistAnalysis as DentalPricelistAnalysisResponse | null;
	const _typedPricelistRecognitionServiceGroups =
		pricelistRecognitionServiceGroups as StringTokenGroup[];
	const _typedPricelistRecognitionBrandGroups =
		pricelistRecognitionBrandGroups as StringTokenGroup[];
	const _telegramPreviewPatientGuidanceId = "telegram-preview-patient-guidance";
	const _telegramPreviewStaffGuidanceId = "telegram-preview-staff-guidance";
	const _telegramPreviewLoadingGuidanceId = "telegram-preview-loading-guidance";
	const _telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const _dicomWorkbenchSeriesGuidanceId = "dicom-workbench-series-guidance";
	const _dicomWorkstationGuidanceId = "dicom-workstation-guidance";
	const _dicomArchiveAddressGuidanceId = "dicom-archive-address-guidance";
	const _localDicomFolderGuidanceId = "local-dicom-folder-guidance";
	const _migrationHandoffReportGuidanceId = "migration-handoff-report-guidance";
	const _dicomArchiveAddressReady =
		(dicomWebEndpointUrl || "").trim().length > 0;
	const _telegramOutboxBulkSendGuidance = isTelegramLoading
		? "Дождитесь загрузки очереди Telegram."
		: isTelegramSendingDue || telegramSendingItemId
			? "Дождитесь завершения текущей отправки Telegram."
			: !telegramOutbox?.dueCount
				? "Сейчас нет сообщений, готовых к отправке."
				: "";
	const clinicLookupSuggestionFieldEntries = (
		fields: Record<string, unknown>,
	) =>
		Object.entries(fields).filter(([key, value]) => {
			if (!Object.hasOwn(clinicPublicLookupFieldLabels, key)) return false;
			if (value === null || typeof value === "undefined") return false;
			return String(value).trim().length > 0;
		});
	const _clinicLookupSuggestionApplySummary = (
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
	const _applyClinicLookupSuggestion = (fields: Record<string, unknown>) => {
		clinicLookupSuggestionFieldEntries(fields).forEach(([key, value]) => {
			updateClinicProfileDraft(key, String(value).trim());
		});
	};
	const _clinicProfileSaveButtonText =
		clinicProfileSaveState === "saving"
			? "Сохраняю профиль"
			: clinicProfileSaveState === "saved"
				? "Профиль сохранен"
				: "Сохранить профиль";
	const typedMigrationAutopilot =
		migrationAutopilot as MigrationAutopilotResponse | null;
	const typedMigrationSourceDiscovery =
		migrationSourceDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const _activeMigrationDiscoveryForSettingsAutopilot =
		typedMigrationSourceDiscovery ?? typedBrowserMigrationDiscovery ?? null;
	const typedMigrationSourceWorkup =
		migrationSourceWorkup as MigrationLocalSourceWorkupResponse | null;
	const typedMigrationSourceProbe =
		migrationSourceProbe as MigrationLocalSourceProbeResponse | null;
	const typedClinicPublicLookup =
		clinicPublicLookup as ClinicPublicLookupResponse | null;
	const typedDicomFirstFramePreview =
		dicomFirstFramePreview as DicomFirstFramePreviewResponse | null;
	const _typedDicomFirstFrameViewerState =
		dicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const _typedDefaultDicomFirstFrameViewerState =
		defaultDicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const dicomFirstFrameSelectableCount =
		typedDicomFirstFramePreview?.selectableFileCount ?? 0;
	const dicomFirstFrameCurrentIndex =
		typedDicomFirstFramePreview?.sourceFileIndex ?? null;
	const dicomFirstFrameSliceMaxIndex = Math.max(
		0,
		dicomFirstFrameSelectableCount - 1,
	);
	const _dicomFirstFrameLandmarkSlices =
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
	const _dicomFirstFrameCanSelectPrevious =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameCurrentIndex > 0 &&
		!isDicomFirstFramePreviewing;
	const _dicomFirstFrameCanSelectNext =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameSelectableCount > 0 &&
		dicomFirstFrameCurrentIndex < dicomFirstFrameSelectableCount - 1 &&
		!isDicomFirstFramePreviewing;
	const _typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		[]) as DicomSeriesPreviewGroup[];
	const _typedDicomSeriesPreviewParserNotes =
		(dicomSeriesPreview?.parserNotes ?? []) as string[];
	const typedCbctWorkbenchSeries =
		cbctWorkbenchSeries as DicomSeriesPreviewGroup | null;
	const typedDicomViewerWorkbenchManifest =
		dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomWorkstationReadiness =
		dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const _typedDicomRenderCachePlan =
		dicomRenderCachePlan as DicomRenderCachePlanResponse | null;
	const _typedDicomViewerToolStateBundle =
		dicomViewerToolStateBundle as DicomViewerToolStateBundleResponse | null;
	const _typedDicomLocalFolderDiscovery =
		dicomLocalFolderDiscovery as DicomLocalFolderDiscoveryResponse | null;
	const typedLocalImagingOrganizer =
		localImagingOrganizer as LocalImagingOrganizerResponse | null;
	const _activeDentalModelWorkbenchManifest: DentalModelWorkbenchManifest | null =
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) =>
				localImagingFolderDraft?.folderFingerprint &&
				caseItem.folderFingerprint.toUpperCase() ===
					String(localImagingFolderDraft.folderFingerprint).toUpperCase() &&
				caseItem.modelWorkbenchManifest.totalModels > 0,
		)?.modelWorkbenchManifest ??
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) => caseItem.modelWorkbenchManifest.ctSurfaceModels > 0,
		)?.modelWorkbenchManifest ??
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) => caseItem.modelWorkbenchManifest.totalModels > 0,
		)?.modelWorkbenchManifest ??
		null;
	const _typedImagingFolderScan =
		imagingFolderScan as ImagingFolderScanResponse | null;
	const _typedDicomFolderSeriesScan =
		dicomFolderSeriesScan as DicomFolderSeriesPreviewResponse | null;
	const _typedDicomFolderWorkupPlan =
		dicomFolderWorkupPlan as DicomFolderWorkupPlanResponse | null;
	const _typedCbctWorkbenchTools = (
		typedCbctWorkbenchSeries?.mprReadiness.tools.length
			? cbctWorkbenchTools
			: ["window_level", "pan", "zoom", "external_open"]
	) as DicomMprTool[];
	const _typedCbctMprBlockers =
		typedCbctWorkbenchSeries?.mprReadiness.blockers ?? [];
	const _typedCbctMprWarnings =
		typedCbctWorkbenchSeries?.mprReadiness.warnings ?? [];
	const _typedCbctResourceSafetyCaps =
		typedCbctWorkbenchSeries?.mprReadiness.resourcePolicy.safetyCaps ?? [];
	const mprControlsReady = Boolean(
		typedCbctWorkbenchSeries?.mprReadiness.canOpenMpr,
	);
	const mprSliceMaxIndex = Math.max(
		0,
		(typedCbctWorkbenchSeries?.fileCount ?? 1) - 1,
	);
	const mprCenterSliceIndex = Math.floor(mprSliceMaxIndex / 2);
	const typedCbctWorkbenchProjections =
		cbctWorkbenchProjections as MprProjection[];
	const mprSafeSliceIndex = clampMprSliceIndex(mprSliceIndex, mprSliceMaxIndex);
	const updateDicomFirstFrameViewerState = (
		updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState,
	) =>
		setDicomFirstFrameViewerState((state: DicomFirstFrameViewerState) =>
			updater(state),
		);
	const _updateDicomFirstFrameViewerNumber = (
		key: "brightness" | "contrast",
		event: InputChangeEvent,
	) => {
		const value = Number(event.target.value);
		updateDicomFirstFrameViewerState((state) => ({ ...state, [key]: value }));
	};
	const typedMprProjection = mprProjection as MprProjection;
	const mprAxisDirectionLabel = formatMprAxisDirectionLabel({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const _mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const _mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const _mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
	const mprSlicePositionPercent =
		mprSliceMaxIndex > 0
			? `${(mprSafeSliceIndex / mprSliceMaxIndex) * 100}%`
			: "50%";
	const mprCurrentSliceFraction = mprSliceFraction(
		mprSafeSliceIndex,
		mprSliceMaxIndex,
	);
	const mprSliceLabel = mprControlsReady
		? `срез ${mprSafeSliceIndex + 1} из ${mprSliceMaxIndex + 1}`
		: "срез включится после КЛКТ/КТ-серии";
	const _mprAxisRangeValue = formatMprAxisRangeValue({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const _mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const _mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const _mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[typedMprProjection] ?? typedMprProjection;
	const _mprActiveProjectionOrientation =
		mprProjectionOrientationLabels[typedMprProjection] ?? "плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(typedMprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
	});
	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: typedMprProjection,
			availableProjections: typedCbctWorkbenchProjections,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceFraction: mprCurrentSliceFraction,
			windowPreset: mprWindowPreset,
			crosshair: mprCrosshairEnabled,
			linkedPlanes: mprLinkedPlanesEnabled,
		},
		mprClinicalPresets,
	);
	const mprClinicalInput = {
		hasSeries: Boolean(typedCbctWorkbenchSeries),
		canOpenMpr: mprControlsReady,
		hasWorkbenchManifest: Boolean(typedDicomViewerWorkbenchManifest),
		hasWorkstationReadiness: Boolean(typedDicomWorkstationReadiness),
		protocolExact: mprNearestClinicalPreset.exact,
		protocolCanApply: mprNearestClinicalPreset.deltas.length > 0,
		protocolLabel: mprNearestClinicalPreset.label,
		projectionLabel: mprActiveProjectionLabel,
		axisLabel: mprAxisDirectionLabel,
		slabMm: mprSlabMm,
		sliceLabel: mprSliceLabel,
		windowLabel: mprWindowPresetLabels[mprWindowPreset] ?? mprWindowPreset,
		crosshair: mprCrosshairEnabled,
		linkedPlanes: mprLinkedPlanesEnabled,
	};
	const mprWorkbenchSummaryText = buildMprWorkbenchSummary(mprClinicalInput);
	const _mprOperatorSummaryCards = buildMprOperatorSummary({
		...mprClinicalInput,
		protocolDeltas: mprNearestClinicalPreset.deltas,
	});
	const _mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const _mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const _mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
			mprNearestClinicalPreset.exact &&
			mprNearestClinicalPreset.title === preset.title
				? "active"
				: "",
		]
			.filter(Boolean)
			.join(" ");
	const _resetMprControls = () => {
		const defaultProjection =
			typedCbctWorkbenchSeries?.mprReadiness.projections.includes("axial")
				? "axial"
				: (typedCbctWorkbenchSeries?.mprReadiness.projections[0] ?? "axial");
		setMprProjection(defaultProjection);
		setMprAxisDeg(0);
		setMprSlabMm(1);
		setMprSliceIndex(mprCenterSliceIndex);
		setMprWindowPreset("bone");
		setMprCrosshairEnabled(true);
		setMprLinkedPlanesEnabled(true);
	};
	const applyMprClinicalPreset = (preset: MprClinicalPreset) => {
		const projection = resolveMprClinicalPresetProjection(
			preset.projection,
			typedCbctWorkbenchProjections,
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
	const _applyCtPlanningQuickAction = (action: CtPlanningQuickAction) => {
		if (action.requiresVolume && !mprControlsReady) return;
		const projection = resolveMprClinicalPresetProjection(
			action.projection,
			typedCbctWorkbenchProjections,
		);
		setCtPlanningActiveQuickActionId?.(action.id);
		setImagingViewerActiveTool(action.tool);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(action.axisDeg));
		setMprSlabMm(clampMprSlabMm(action.slabMm));
		setMprSliceIndex(
			mprSliceIndexFromFraction(action.sliceFraction, mprSliceMaxIndex),
		);
		setMprWindowPreset(action.windowPreset);
		setMprCrosshairEnabled(true);
		setMprLinkedPlanesEnabled(true);
	};
	const _selectCtPlanningImplantFromSettings = (
		implant: CtImplantLibraryItem,
	) => {
		setCtPlanningActiveQuickActionId?.("implant_library");
		selectCtPlanningImplant(implant);
	};
	const _applyNearestMprClinicalPreset = () => {
		const preset = mprClinicalPresets.find(
			(candidate) => candidate.title === mprNearestClinicalPreset.title,
		);
		if (preset) applyMprClinicalPreset(preset);
	};
	const _handleMprKeyboardNavigation = (
		event: KeyboardEvent<HTMLDivElement>,
	) => {
		if (!mprControlsReady) return;
		const adjustment = resolveMprKeyboardAdjustment({
			key: event.key,
			shiftKey: event.shiftKey,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceIndex: mprSafeSliceIndex,
			maxIndex: mprSliceMaxIndex,
		});
		if (!adjustment) return;
		event.preventDefault();
		if (adjustment.kind === "axis") setMprAxisDeg(adjustment.value);
		if (adjustment.kind === "slab") setMprSlabMm(adjustment.value);
		if (adjustment.kind === "slice") setMprSliceIndex(adjustment.value);
	};
	const typedMigrationAutopilotSources = (typedMigrationAutopilot?.sources ??
		[]) as MigrationAutopilotSource[];
	const _typedMigrationAutopilotClinicLookup =
		typedMigrationAutopilot?.clinicLookup ?? null;
	const _typedMigrationAutopilotSteps = (typedMigrationAutopilot?.steps ??
		[]) as MigrationAutopilotStep[];
	const _typedMigrationOperatorLanes = (typedMigrationAutopilot?.operatorPacket
		.lanes ?? []) as MigrationAutopilotPacketLane[];
	const typedMigrationHandoffChecklist = (typedMigrationAutopilot
		?.operatorPacket.handoffChecklist ??
		[]) as MigrationAutopilotHandoffChecklistItem[];
	const _migrationDryRunSummary =
		typedMigrationAutopilot?.operatorPacket.dryRun ?? null;
	const _migrationTriageItems = [...typedMigrationHandoffChecklist]
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
	const _typedMigrationWorkupReadinessIssues = typedMigrationSourceWorkup
		? ([
				...typedMigrationSourceWorkup.readiness.blockers,
				...typedMigrationSourceWorkup.readiness.warnings,
			] as MigrationReadinessItem[])
		: [];
	const _typedMigrationProbeReadinessIssues = typedMigrationSourceProbe
		? ([
				...typedMigrationSourceProbe.readiness.blockers,
				...typedMigrationSourceProbe.readiness.warnings,
			] as MigrationReadinessItem[])
		: [];
	const typedClinicPublicLookupSuggestions =
		typedClinicPublicLookup?.suggestions ?? [];
	const _typedClinicPublicLookupTargets =
		typedClinicPublicLookup?.publicLookupTargets ?? [];
	const migrationOperatorScriptSteps =
		typedMigrationAutopilot?.operatorPacket.operatorScript.steps ?? [];
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
	const _migrationPrimaryOperatorCandidate =
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
	const _migrationCandidatePreviewHint = (
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
	const _migrationHandoffReportReady = Boolean(
		typedMigrationAutopilot ||
			typedMigrationSourceDiscovery ||
			typedBrowserMigrationDiscovery ||
			smartImportInputReady,
	);
	const migrationPreviewReadyRows = typedSmartImportPreview
		? typedSmartImportPreview.patientPreview.readyRows +
			typedSmartImportPreview.imagingPreview.readyRows
		: 0;
	const migrationClinicLookupFieldCount =
		typedClinicPublicLookupSuggestions.reduce(
			(bestCount, suggestion) =>
				Math.max(
					bestCount,
					clinicLookupSuggestionFieldEntries(suggestion.fields).length,
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
	const _migrationProgressItems = [
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
				? `${Math.round(typedMigrationAutopilot.operatorPacket.score * 100)}% готовности`
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
	const _focusSmartImportWorkbench = () => {
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
	const _renderMigrationOperatorStepActions = (
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
	const _renderMigrationTechnicalNotes = (
		title: string,
		items: string[],
		testId?: string,
	) => {
		const visibleItems = items.filter(Boolean).slice(0, 8);
		if (!visibleItems.length) return null;

		return (
			<details className="migration-technical-boundary" data-testid={testId}>
				<summary>{title}</summary>
				<div>
					{visibleItems.map((item, index) => (
						<small key={`${index}:${item}`}>
							{humanizeMigrationText(item)}
						</small>
					))}
				</div>
			</details>
		);
	};
	const typedClinicalRuleActionLabels = clinicalRuleActionLabels as Record<
		ClinicalRuleAction,
		string
	>;
	const _typedClinicalRuleActions = Object.keys(
		typedClinicalRuleActionLabels,
	) as ClinicalRuleAction[];
	const typedClinicalRuleSeverityLabels = clinicalRuleSeverityLabels as Record<
		ClinicalRuleSeverity,
		string
	>;
	const _typedClinicalRuleSeverities = Object.keys(
		typedClinicalRuleSeverityLabels,
	) as ClinicalRuleSeverity[];
	const _typedClinicalRules = dashboard.clinicalRules as ClinicalRule[];
	const _typedServiceCatalog = dashboard.serviceCatalog as ServiceCatalogItem[];
	const typedServiceCategoryLabels = serviceCategoryLabels as Record<
		ServiceCategory,
		string
	>;
	const _typedServiceCategories = Object.keys(
		typedServiceCategoryLabels,
	) as ServiceCategory[];
	const typedSettingsTabs = settingsTabs as SettingsTab[];
	const settingsTabButtonId = (tabId: SettingsTabId) => `settings-tab-${tabId}`;
	const settingsTabPanelId = (tabId: SettingsTabId) =>
		`settings-panel-${tabId}`;
	const _activeSettingsTabPanelId = settingsTabPanelId(settingsTab);
	const selectSettingsTab = (tabId: SettingsTabId) => {
		setSettingsTab(tabId);
		window.location.hash = `settings/${tabId}`;
	};
	const handleSettingsTabKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		tabId: SettingsTabId,
	) => {
		const currentIndex = typedSettingsTabs.findIndex((tab) => tab.id === tabId);
		if (currentIndex < 0) return;
		const lastIndex = typedSettingsTabs.length - 1;
		const nextIndex =
			event.key === "ArrowRight" || event.key === "ArrowDown"
				? currentIndex === lastIndex
					? 0
					: currentIndex + 1
				: event.key === "ArrowLeft" || event.key === "ArrowUp"
					? currentIndex === 0
						? lastIndex
						: currentIndex - 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? lastIndex
							: null;
		if (nextIndex === null) return;
		const nextTab = typedSettingsTabs[nextIndex];
		if (!nextTab) return;
		const nextTabButtonId = settingsTabButtonId(nextTab.id);
		event.preventDefault();
		selectSettingsTab(nextTab.id);
		window.setTimeout(
			() => document.getElementById(nextTabButtonId)?.focus(),
			0,
		);
	};
	const _renderTabButton = (tab: SettingsTab) => {
		const tabSelected = settingsTab === tab.id;
		return (
			<button
				aria-controls={settingsTabPanelId(tab.id)}
				aria-pressed={tabSelected}
				aria-selected={tabSelected}
				className={tabSelected ? "active" : ""}
				id={settingsTabButtonId(tab.id)}
				key={tab.id}
				onClick={() => selectSettingsTab(tab.id)}
				onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
					handleSettingsTabKeyDown(event, tab.id)
				}
				ref={tabSelected ? activeSettingsTabButtonRef : undefined}
				role="tab"
				tabIndex={tabSelected ? 0 : -1}
				type="button"
			>
				{tab.title}
			</button>
		);
	};

	return (
		<section
			className="import-studio"
			aria-label="Миграция из старой программы"
		>
			<div className="import-copy">
				<Database aria-hidden="true" />
				<div>
					<p className="eyebrow">Мастер переноса</p>
					<h2>Любой источник сначала проходит предпросмотр</h2>
					<p>
						Здесь живут таблицы, Excel, экспорт старых МИС, OCR с фото бумажного
						журнала, диктовка и свободный текст. В базу ничего не пишется без
						подтверждения.
					</p>
				</div>
			</div>

			<div className="import-source-grid" aria-label="Источник импорта">
				{typedImportSourceKinds.map((kind) => (
					<button
						className={`source-card ${importSourceKind === kind ? "active" : ""}`}
						type="button"
						key={kind}
						aria-pressed={importSourceKind === kind}
						onClick={() => {
							setImportSourceKind(kind);
							setImportPreview(null);
							setImportCommit(null);
						}}
					>
						<strong>{importSourceLabels[kind].title}</strong>
						<span>{importSourceLabels[kind].detail}</span>
					</button>
				))}
			</div>

			<div
				className="document-ingestion-panel"
				aria-label="Извлечение текста из файла"
			>
				<div className="document-ingestion-head">
					<FileText aria-hidden="true" />
					<div>
						<strong>Архивы, PDF, Office-файлы, таблицы и текст</strong>
						<span>
							Сначала извлечь текст и таблицы, потом отправить в предпросмотр.
							Без прямой записи в базу.
						</span>
					</div>
				</div>
				<div
					className="document-ingestion-targets"
					aria-label="Куда отправить извлеченный текст"
				>
					{typedDocumentIngestionTargets.map((target) => (
						<button
							className={documentIngestionTarget === target ? "active" : ""}
							key={target}
							type="button"
							aria-pressed={documentIngestionTarget === target}
							onClick={() => setDocumentIngestionTarget(target)}
						>
							{ingestionTargetLabels[target]}
						</button>
					))}
				</div>
				<label className="document-file-upload">
					<UploadCloud aria-hidden="true" />
					<span>{isDocumentIngesting ? "Разбираю файл" : "Выбрать файл"}</span>
					<small>
						До 8 МБ. Архивы и Office-файлы разбираются встроенным извлекателем;
						PDF без OCR работает в ограниченном режиме.
					</small>
					<input
						accept=".txt,.csv,.tsv,.json,.xml,.html,.htm,.rtf,.zip,.pdf,.doc,.xls,.ppt,.docx,.xlsx,.xlsm,.xlsb,.pptx,.odt,.ods,.odp,image/jpeg,image/png,image/webp"
						type="file"
						onChange={(event: InputChangeEvent) =>
							void ingestImportFile(event.currentTarget.files?.[0])
						}
					/>
				</label>
				{typedDocumentIngestion ? (
					<div className="document-ingestion-result">
						<div className="document-ingestion-stats">
							<span>
								{documentDetectedKindLabel(typedDocumentIngestion.detectedKind)}
							</span>
							<span>{typedDocumentIngestion.rowCount} строк</span>
							<span>{typedDocumentIngestion.tableCount} таблиц</span>
							<span>
								{Math.round(typedDocumentIngestion.byteSize / 1024)} КБ
							</span>
							<span>{typedDocumentIngestion.extractedFiles.length} файлов</span>
						</div>
						<div
							className={`document-quality quality-${typedDocumentIngestion.quality.extractionQuality}`}
						>
							<div>
								<strong>
									{
										documentIngestionQualityLabels[
											typedDocumentIngestion.quality.extractionQuality
										]
									}
								</strong>
								<span>
									{Math.round(typedDocumentIngestion.quality.confidence * 100)}%
									·{" "}
									{
										ingestionTargetLabels[
											typedDocumentIngestion.quality.suggestedTarget
										]
									}
								</span>
							</div>
							<p>{typedDocumentIngestion.quality.nextAction}</p>
							{typedDocumentIngestion.quality.signals.length ? (
								<div className="document-signal-row">
									{typedDocumentIngestion.quality.signals
										.slice(0, 10)
										.map((signal) => (
											<span key={signal}>{humanizeMigrationText(signal)}</span>
										))}
								</div>
							) : null}
						</div>
						{typedDocumentIngestion.extractedFiles.length ? (
							<div
								className="document-extracted-files"
								aria-label="Извлеченные файлы архива"
							>
								{typedDocumentIngestion.extractedFiles
									.slice(0, 8)
									.map((file) => (
										<span key={`${file.fileName}-${file.detectedKind}`}>
											{documentDetectedKindLabel(file.detectedKind)} ·{" "}
											{file.rowCount} строк · {file.fileName}
										</span>
									))}
							</div>
						) : null}
						<p>{typedDocumentIngestion.textPreview || "Текст не извлечен"}</p>
						<div className="recognition-notes">
							{typedDocumentIngestion.routes.slice(0, 4).map((route) => (
								<span key={route.target}>
									{ingestionTargetLabels[route.target]}:{" "}
									{route.enabled ? "готово" : "пропустить"} · {route.reason}
								</span>
							))}
							{typedDocumentIngestion.warnings.map((warning) => (
								<span key={warning}>{humanizeMigrationText(warning)}</span>
							))}
						</div>
					</div>
				) : null}
			</div>

			<div className="import-workbench">
				<textarea
					aria-label="Данные для проверки импорта"
					value={importText}
					onChange={(event: TextInputChangeEvent) => {
						setImportText(event.target.value);
						setImportPreview(null);
						setImportCommit(null);
						setImportIntake(null);
					}}
				/>
				<div className="import-tool-row">
					<SmartMicrophoneButton
						context="general"
						className="microphone-import-btn"
						onResult={(text) => {
							setImportText((current: string) =>
								current ? `${current}\n${text}` : text,
							);
						}}
					/>
					<button
						className="secondary-button"
						type="button"
						onClick={() => {
							setImportSourceKind("image_ocr");
							setImportText(
								"Фото журнала -> OCR текст:\nИванов Иван Иванович +7 900 111-22-33 01.01.1980 первичный прием\nПетров Петр Петрович 8 927 333-44-55 12.02.1975 нужен вычет",
							);
							setImportPreview(null);
							setImportCommit(null);
							setImportIntake(null);
						}}
					>
						<ImageIcon aria-hidden="true" /> Фото журнала
					</button>
					<button
						className="primary-button"
						type="button"
						onClick={previewImport}
						disabled={isImportLoading || !patientImportInputReady}
						aria-busy={isImportLoading || undefined}
					>
						<UploadCloud aria-hidden="true" />{" "}
						{isImportLoading ? "Проверяю" : "Проверить"}
					</button>
				</div>
				{!patientImportInputReady ? (
					<p className="import-empty-guidance" role="status" aria-live="polite">
						Вставьте список пациентов, OCR журнала или надиктуйте импорт перед
						проверкой.
					</p>
				) : null}
			</div>

			{typedImportIntake ? (
				<div className="recognition-notes">
					{typedImportIntake.recognitionNotes.map((note) => (
						<span key={note}>{note}</span>
					))}
				</div>
			) : null}

			{typedImportPreview ? (
				<div className="import-preview">
					<div className="import-stats">
						<span>{typedImportPreview.totalRows} строк</span>
						<span>{typedImportPreview.readyRows} готово</span>
						<span>{typedImportPreview.warningRows} предупреждения</span>
						<span>{typedImportPreview.blockedRows} к исправлению</span>
					</div>
					<div className="import-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={commitImport}
							disabled={
								isImportCommitting ||
								!patientImportInputReady ||
								typedImportPreview.readyRows === 0
							}
							aria-busy={isImportCommitting || undefined}
						>
							<CheckCircle2 aria-hidden="true" />{" "}
							{isImportCommitting ? "Записываю" : "Импортировать готовые"}
						</button>
						{importCommit ? (
							<span>
								Записано: {importCommit.importedCount}. Пропущено:{" "}
								{importCommit.skippedCount}.
							</span>
						) : (
							<span>В базу попадут только строки без предупреждений.</span>
						)}
					</div>
					<div className="import-rows">
						{typedImportPreview.rows.map((row) => (
							<article
								className={`import-row import-${row.status}`}
								key={row.rowNumber}
							>
								<strong>{row.fullName ?? `Строка ${row.rowNumber}`}</strong>
								<span>{importRowStatusLabels[row.status] ?? row.status}</span>
								<span>{row.phone ?? "нет телефона"}</span>
								<span>{row.birthDate ?? "нет даты"}</span>
								<p>{patientImportRowWarningText(row.warnings, row.notes)}</p>
							</article>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}

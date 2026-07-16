import { useAppLogicContext } from "../../contexts/AppLogicContext";
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
	DentalMaterialKind,
	DentalModelWorkbenchManifest,
	DentalPricelistAnalysisResponse,
	DentalRestorationType,
	DentalSpecialty,
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
	MigrationLocalSourceWorkupStep,
	MigrationProbeAdapter,
	MigrationProbeArtifact,
	MigrationReadinessItem,
	PricelistSourceKind,
	ProtocolTemplate,
	RoleQueue,
	ServiceCatalogItem,
	ServiceCategory,
	SmartImportMode,
	SmartImportPreviewResponse,
	SpeechProvider,
	SpeechRecordingRecoveryList,
	StaffMember,
	StaffRole,
	WeekdayIndex,
} from "@dental/shared";
import {
	Bot,
	CalendarDays,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CircleStop,
	ClipboardCheck,
	Copy,
	CreditCard,
	Database,
	Download,
	ExternalLink,
	FileCheck2,
	FileText,
	FlipHorizontal,
	Gauge,
	History,
	Image as ImageIcon,
	Layers3,
	Mic,
	Plus,
	ReceiptText,
	RefreshCw,
	RotateCcw,
	RotateCw,
	ScanSearch,
	Search,
	Send,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	UploadCloud,
	UserCheck,
	Users,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";
import { SmartMicrophoneButton } from "../../components/SmartMicrophoneButton";
import { SettingsAccessTab } from "../../components/settings/SettingsAccessTab";
import { SettingsClinicTab } from "../../components/settings/SettingsClinicTab";
import {
	type CtImplantLibraryItem,
	type CtPlanningQuickAction,
	CtPlanningToolsPanel,
} from "../../ctPlanningTools";
import {
	type MprClinicalPreset,
	type MprProjection,
	type MprWindowPreset,
	mprAxisPresetDeg,
	mprClinicalPresets,
	mprProjectionOrientationLabels,
	mprSeriesRequiredProjectionLabel,
	mprSlabPresetMm,
	mprUnavailableProjectionLabel,
} from "../../imagingUiLabels";
import { motionSafeScrollIntoView } from "../../motionPreference";
import {
	buildMprClinicalChecklist,
	buildMprOperatorSummary,
	buildMprWorkbenchSummary,
	describeMprClinicalPresetProjectionFallback,
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
	formatSignedMprStep,
	mprAxisBounds,
	mprAxisNudgeDeg,
	mprProjectionCompassLabels,
	mprSlabBounds,
	mprSlabNudgeMm,
	mprSliceFraction,
	mprSliceIndexFromFraction,
	mprSliceNudgeSteps,
	mprSlicePresetFractions,
	resolveMprKeyboardAdjustment,
} from "../../mprControlMath";
import { PriceDictationBar } from "../../PriceDictationBar";
import type {
	ImagingConnectorCard,
	ImagingViewerCapability,
	RecognitionPreset,
} from "../../settingsStaticData";
import { useSettingsStore } from "../../store/settingsStore";
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

function formatBrowserImagingScanElapsed(
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
const viewLabels = workspaceViewLabels as Record<string, string>;
const staffCreationRoles: StaffRole[] = [
	"doctor",
	"administrator",
	"assistant",
	"manager",
];
const clinicalRuleOwnerRoles: StaffRole[] = [
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
const clinicPublicLookupBoundaryText =
	"Публичный поиск получает только реквизиты клиники: ИНН, ОГРН, КПП, название, адрес или лицензию. Пациентов, снимки, базы и локальные пути сюда не отправлять.";
const migrationReadinessLevelLabels: Record<string, string> = {
	ready_for_preview: "можно делать предпросмотр",
	needs_bridge: "нужно подключение",
	needs_export: "нужна выгрузка",
	manual_review: "ручной разбор",
	blocked: "нужно действие",
};
const migrationBridgeKitKindLabels: Record<string, string> = {
	none: "нет",
	file_upload: "файл/таблица",
	local_db_bridge: "подключение к копии базы",
	dicom_export: "выгрузка КТ/снимков",
	image_manifest: "список снимков",
	network_share_bridge: "сетевая папка",
	browser_manifest_bridge: "выбранная папка/диск",
	manual_manifest: "ручной список",
};
const migrationBridgeKitStatusLabels: Record<string, string> = {
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
const migrationAutomationLevelLabels: Record<string, string> = {
	ready_for_preview: "готово к предпросмотру",
	needs_file_upload: "нужен файл выгрузки",
	needs_local_bridge: "нужно подключение",
	manual_review: "ручной разбор",
};
const smartImportMigrationPlanStatusLabels: Record<string, string> = {
	ready: "готово",
	review: "проверить",
	manual: "ручной разбор",
	blocked: "стоп",
};
const smartImportLineKindLabels: Record<string, string> = {
	patient: "Пациент",
	imaging: "Снимок",
	clinic: "Клиника",
	legacy_source: "Источник",
	ignored: "Пропуск",
};
const migrationWorkupStepStatusLabels: Record<string, string> = {
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
const clinicPublicLookupProviderStatusLabels: Record<string, string> = {
	ready: "профиль найден",
	not_configured: "онлайн-поиск не настроен",
	error: "онлайн-поиск не ответил",
	skipped_no_safe_query: "нужны реквизиты",
};
const clinicPublicLookupSuggestionSourceLabels: Record<string, string> = {
	dadata: "Сервис реквизитов",
	manual_public_targets: "Из введенных реквизитов",
};
const migrationEntityLabels: Record<string, string> = {
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
const migrationPriorityLabels: Record<string, string> = {
	critical: "сначала",
	high: "важно",
	normal: "обычно",
	low: "потом",
};
const migrationOwnerLabels: Record<string, string> = {
	administrator: "администратор",
	doctor: "врач",
	assistant: "ассистент",
	system: "CRM",
};
const migrationHandoffPhaseLabels: Record<string, string> = {
	clinic_requisites: "реквизиты",
	source_access: "доступ к источнику",
	export_or_bridge: "выгрузка",
	staging_preview: "предпросмотр",
	doctor_control: "проверка врачом",
};
const migrationOperatorPacketStatusLabels: Record<string, string> = {
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
const migrationAdapterStatusLabels: Record<string, string> = {
	built_in: "готовый способ",
	ready: "готово",
	needs_admin: "нужен администратор",
	needs_local_bridge: "нужно локальное подключение",
	needs_export: "нужна выгрузка",
	manual: "ручная проверка",
	blocked: "стоп",
};
const dicomRenderCachePriorityLabels: Record<
	DicomRenderCachePlanResponse["tasks"][number]["priority"],
	string
> = {
	blocking: "обязательно",
	interactive: "для плавного просмотра",
	prefetch: "подготовить заранее",
	background: "фоном",
	deferred: "позже",
};
const localImagingModelWorkbenchTargetLabels: Record<string, string> = {
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
const humanizeIntegrationInput = (value: string) =>
	integrationInputLabels[value] ?? humanizeMigrationText(value);
const localBridgeEndpointSummary = (
	bridge: LocalBridgeReadinessResponse["bridges"][number],
) => {
	if (bridge.urlRedacted) return bridge.urlRedacted;
	if (bridge.setupSettingsCount)
		return `серверных настроек: ${bridge.setupSettingsCount}`;
	return "адрес локального модуля не задан";
};
const humanizeMigrationList = (
	items: unknown[] | undefined,
	limit = items?.length ?? 0,
) =>
	(items ?? [])
		.slice(0, limit)
		.map(humanizeMigrationText)
		.filter(Boolean)
		.join(" · ");
const humanizeMigrationColumns = (
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
const clinicPublicLookupWarningText = (warning: string) => {
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
const migrationSourceDisplayName = (
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
const migrationHandoffRouteLabel = (handoff: MigrationLocalSourceHandoff) => {
	const actionLabel =
		handoff.method === "GET" ? "открыть проверку" : "передать на проверку";
	return `${actionLabel}: ${migrationHandoffEndpointLabels[handoff.endpoint] ?? "предпросмотр в CRM"}`;
};
const shortDicomSeriesCode = (value: string | null | undefined) => {
	if (!value) return "код серии не указан";
	const trimmed = value.trim();
	return `код серии ${trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed}`;
};
const dicomSeriesDisplayText = (series: DicomSeriesPreviewGroup) =>
	series.seriesDescription ??
	series.studyDescription ??
	shortDicomSeriesCode(series.seriesInstanceUid);
const dicomSeriesWarningText = (warnings: string[]) =>
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
const imagingImportRowWarningText = (
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
const aiRecognitionWarningText = (warning: string) =>
	aiRecognitionWarningLabels[warning] ?? humanizeMigrationText(warning);
const dicomFirstFrameFileFormatLabel = (
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
const dicomFirstFrameImageTypeLabel = (
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

export function SettingsImportsTab() {
	const props = useAppLogicContext();
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
	} = props;
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

	const recognitionInputReady = (recognitionText || "").trim().length > 0;
	const smartImportInputReady = (smartImportText || "").trim().length > 0;
	const imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const patientImportInputReady = (importText || "").trim().length > 0;
	const localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;
	const newStaffReadyToCreate = (newStaffName || "").trim().length > 0;
	const newChairReadyToCreate = (newChairName || "").trim().length > 0;
	const adminSecretReady = (telegramAdminSecretDraft || "").trim().length > 0;
	const adminSecretScopeWarning =
		settingsTab === "telegram"
			? "Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные, если для них включены отдельные секреты."
			: "Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные, если для них включены отдельные секреты.";
	const typedClinicModes = Object.keys(clinicModeLabels) as ClinicMode[];
	const typedModeHints = dashboard.clinicSettings.modeHints as string[];
	const typedRoleQueues = dashboard.shiftIntelligence.roleQueues as RoleQueue[];
	const typedStaffMembers = dashboard.clinicSettings.staff as StaffMember[];
	const typedChairs = dashboard.clinicSettings.chairs as Chair[];
	const typedWeekdayOptions = weekdayOptions as WeekdayOption[];
	const typedUiLanguageOptions = uiLanguageOptions as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const typedTelegramLinkStaffOptions =
		telegramLinkStaffOptions as StaffMember[];
	const typedProtocolTemplates =
		dashboard.protocolTemplates as ProtocolTemplate[];
	const typedImagingConnectorCards =
		imagingConnectorCards as ImagingConnectorCard[];
	const typedImagingViewerCapabilities =
		imagingViewerCapabilities as ImagingViewerCapability[];
	const typedCtPlanningImplantPlan =
		ctPlanningImplantPlan as ImagingViewerImplantPlan | null;
	const typedCtPlanningActiveQuickActionId =
		typeof ctPlanningActiveQuickActionId === "string"
			? ctPlanningActiveQuickActionId
			: null;
	const typedImagingViewerActiveTool =
		imagingViewerActiveTool as ImagingViewerTool;
	const typedIntegrationPresets = dashboard.clinicSettings
		.integrationPresets as IntegrationPreset[];
	const typedSpeechProviders = dashboard.speechProviders as SpeechProvider[];
	const typedRecognitionPresets = recognitionPresets as RecognitionPreset[];
	const typedRecognitionJob = recognitionJob as AiRecognitionJob | null;
	const typedSpeechRecordingRecovery =
		speechRecordingRecovery as SpeechRecordingRecoveryList | null;
	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;
	const typedImagingSourceChoices = imagingSourceChoices as ImagingSourceKind[];
	const typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const typedBrowserContinuityChecks =
		browserContinuityChecks as BrowserContinuityCheck[];
	const typedLocalBridgeReadiness =
		localBridgeReadiness as LocalBridgeReadinessResponse | null;
	const typedLocalBridgeUsePlans =
		localBridgeUsePlans as LocalBridgeUsePlansResponse | null;
	const typedPersistenceIntegrity =
		persistenceIntegrity as PersistenceIntegrityReport | null;
	const typedImportBatches = dashboard.importBatches as ImportBatch[];
	const typedAuditEvents = dashboard.auditEvents as AuditEvent[];
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
	const typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const typedWorkspaceProfiles = dashboard.clinicSettings
		.workspaceProfiles as WorkspaceProfile[];
	const typedRoleAccessPolicies = dashboard.clinicSettings
		.roleAccessPolicies as RoleAccessPolicy[];
	const typedTelegramChatLinks =
		(telegramChatLinks as DenteTelegramChatLinkPublic[]) ?? [];
	const typedTelegramLinkCodes =
		(telegramLinkCodes as DenteTelegramLinkCodePublic[]) ?? [];
	const typedTelegramPreview =
		telegramPreview as DenteTelegramMessagePreview | null;
	const typedTelegramOutbox =
		telegramOutbox as DenteTelegramOutboxResponse | null;
	const typedVisibleTelegramOutboxItems =
		visibleTelegramOutboxItems as DenteTelegramOutboxItem[];
	const telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: hiddenTelegramOutboxItemCount;
	const typedTelegramStatus = telegramStatus as DenteTelegramBotStatus | null;
	const typedTelegramOutboxStatusFilterOptions =
		telegramOutboxStatusFilterOptions as string[];
	const typedTelegramOutboxTemplateFilterOptions =
		telegramOutboxTemplateFilterOptions as string[];
	const typedTelegramInlineButtonKindLabels =
		telegramInlineButtonKindLabels as Record<string, string>;
	const typedTelegramFeaturePlan =
		telegramFeaturePlan as TelegramFeaturePlan | null;
	const typedTelegramEnabledFeaturesDraft =
		telegramEnabledFeaturesDraft as DenteTelegramFeature[];
	const typedTelegramFeatureOptions =
		telegramFeatureOptions as DenteTelegramFeature[];
	const typedTelegramFeatureHelp = telegramFeatureHelp as Record<
		DenteTelegramFeature,
		string
	>;
	const typedTelegramPostVisitCheckupDelayFields =
		telegramPostVisitCheckupDelayFields as TelegramPostVisitCheckupDelayField[];
	const typedTelegramPostVisitCheckupDelayDrafts =
		telegramPostVisitCheckupDelayDrafts as Record<
			TelegramPostVisitCheckupDelayKey,
			string
		>;
	const typedTelegramVisualCardFields =
		telegramVisualCardFields as TelegramVisualCardField[];
	const getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) =>
		telegramInlineButtonRowsFromReplyMarkup(
			replyMarkup,
		) as TelegramInlineButtonRow[];
	const typedPricelistAnalysis =
		pricelistAnalysis as DentalPricelistAnalysisResponse | null;
	const typedPricelistRecognitionServiceGroups =
		pricelistRecognitionServiceGroups as StringTokenGroup[];
	const typedPricelistRecognitionBrandGroups =
		pricelistRecognitionBrandGroups as StringTokenGroup[];
	const telegramPreviewPatientGuidanceId = "telegram-preview-patient-guidance";
	const telegramPreviewStaffGuidanceId = "telegram-preview-staff-guidance";
	const telegramPreviewLoadingGuidanceId = "telegram-preview-loading-guidance";
	const telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const dicomWorkbenchSeriesGuidanceId = "dicom-workbench-series-guidance";
	const dicomWorkstationGuidanceId = "dicom-workstation-guidance";
	const dicomArchiveAddressGuidanceId = "dicom-archive-address-guidance";
	const localDicomFolderGuidanceId = "local-dicom-folder-guidance";
	const migrationHandoffReportGuidanceId = "migration-handoff-report-guidance";
	const dicomArchiveAddressReady =
		(dicomWebEndpointUrl || "").trim().length > 0;
	const telegramOutboxBulkSendGuidance = isTelegramLoading
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
	const activeMigrationDiscoveryForSettingsAutopilot =
		typedMigrationSourceDiscovery ?? typedBrowserMigrationDiscovery ?? null;
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
	const typedDicomSeriesPreviewParserNotes = (dicomSeriesPreview?.parserNotes ??
		[]) as string[];
	const typedCbctWorkbenchSeries =
		cbctWorkbenchSeries as DicomSeriesPreviewGroup | null;
	const typedDicomViewerWorkbenchManifest =
		dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomWorkstationReadiness =
		dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const typedDicomRenderCachePlan =
		dicomRenderCachePlan as DicomRenderCachePlanResponse | null;
	const typedDicomViewerToolStateBundle =
		dicomViewerToolStateBundle as DicomViewerToolStateBundleResponse | null;
	const typedDicomLocalFolderDiscovery =
		dicomLocalFolderDiscovery as DicomLocalFolderDiscoveryResponse | null;
	const typedLocalImagingOrganizer =
		localImagingOrganizer as LocalImagingOrganizerResponse | null;
	const activeDentalModelWorkbenchManifest: DentalModelWorkbenchManifest | null =
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
	const typedImagingFolderScan =
		imagingFolderScan as ImagingFolderScanResponse | null;
	const typedDicomFolderSeriesScan =
		dicomFolderSeriesScan as DicomFolderSeriesPreviewResponse | null;
	const typedDicomFolderWorkupPlan =
		dicomFolderWorkupPlan as DicomFolderWorkupPlanResponse | null;
	const typedCbctWorkbenchTools = (
		typedCbctWorkbenchSeries?.mprReadiness.tools.length
			? cbctWorkbenchTools
			: ["window_level", "pan", "zoom", "external_open"]
	) as DicomMprTool[];
	const typedCbctMprBlockers =
		typedCbctWorkbenchSeries?.mprReadiness.blockers ?? [];
	const typedCbctMprWarnings =
		typedCbctWorkbenchSeries?.mprReadiness.warnings ?? [];
	const typedCbctResourceSafetyCaps =
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
	const updateDicomFirstFrameViewerNumber = (
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
	const mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
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
	const mprAxisRangeValue = formatMprAxisRangeValue({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[typedMprProjection] ?? typedMprProjection;
	const mprActiveProjectionOrientation =
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
	const mprOperatorSummaryCards = buildMprOperatorSummary({
		...mprClinicalInput,
		protocolDeltas: mprNearestClinicalPreset.deltas,
	});
	const mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
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
	const resetMprControls = () => {
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
	const applyCtPlanningQuickAction = (action: CtPlanningQuickAction) => {
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
	const selectCtPlanningImplantFromSettings = (
		implant: CtImplantLibraryItem,
	) => {
		setCtPlanningActiveQuickActionId?.("implant_library");
		selectCtPlanningImplant(implant);
	};
	const applyNearestMprClinicalPreset = () => {
		const preset = mprClinicalPresets.find(
			(candidate) => candidate.title === mprNearestClinicalPreset.title,
		);
		if (preset) applyMprClinicalPreset(preset);
	};
	const handleMprKeyboardNavigation = (
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
	const typedMigrationAutopilotClinicLookup =
		typedMigrationAutopilot?.clinicLookup ?? null;
	const typedMigrationAutopilotSteps = (typedMigrationAutopilot?.steps ??
		[]) as MigrationAutopilotStep[];
	const typedMigrationOperatorLanes = (typedMigrationAutopilot?.operatorPacket
		.lanes ?? []) as MigrationAutopilotPacketLane[];
	const typedMigrationHandoffChecklist = (typedMigrationAutopilot
		?.operatorPacket.handoffChecklist ??
		[]) as MigrationAutopilotHandoffChecklistItem[];
	const migrationDryRunSummary =
		typedMigrationAutopilot?.operatorPacket.dryRun ?? null;
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
	const typedClinicalRuleActions = Object.keys(
		typedClinicalRuleActionLabels,
	) as ClinicalRuleAction[];
	const typedClinicalRuleSeverityLabels = clinicalRuleSeverityLabels as Record<
		ClinicalRuleSeverity,
		string
	>;
	const typedClinicalRuleSeverities = Object.keys(
		typedClinicalRuleSeverityLabels,
	) as ClinicalRuleSeverity[];
	const typedClinicalRules = dashboard.clinicalRules as ClinicalRule[];
	const typedServiceCatalog = dashboard.serviceCatalog as ServiceCatalogItem[];
	const typedServiceCategoryLabels = serviceCategoryLabels as Record<
		ServiceCategory,
		string
	>;
	const typedServiceCategories = Object.keys(
		typedServiceCategoryLabels,
	) as ServiceCategory[];
	const typedSettingsTabs = settingsTabs as SettingsTab[];
	const settingsTabButtonId = (tabId: SettingsTabId) => `settings-tab-${tabId}`;
	const settingsTabPanelId = (tabId: SettingsTabId) =>
		`settings-panel-${tabId}`;
	const activeSettingsTabPanelId = settingsTabPanelId(settingsTab);
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
	const renderTabButton = (tab: SettingsTab) => {
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
		<>
			{settingsTab === "imports" ? (
				<section
					className="import-studio smart-import-studio"
					aria-label="Умный разбор смешанной выгрузки"
				>
					<div className="import-copy">
						<Sparkles aria-hidden="true" />
						<div>
							<p className="eyebrow">Умный разбор</p>
							<h2>Один вход для пациентов, снимков и мусорных строк</h2>
							<p>
								Вставь смешанную выгрузку из старой МИС, RVG-папки, Excel, OCR
								или диктовки. CRM сама разделит строки, покажет уверенность
								разбора и отправит каждую часть в единый предпросмотр.
							</p>
						</div>
					</div>

					<div
						className="import-source-grid smart-mode-grid"
						aria-label="Режим умного разбора"
					>
						{(Object.keys(smartImportModeLabels) as SmartImportMode[]).map(
							(mode) => (
								<button
									className={`source-card ${smartImportMode === mode ? "active" : ""}`}
									type="button"
									key={mode}
									aria-pressed={smartImportMode === mode}
									onClick={() => {
										setSmartImportMode(mode);
										setSmartImportPreview(null);
										setSmartImportCommit(null);
									}}
								>
									<strong>{smartImportModeLabels[mode].title}</strong>
									<span>{smartImportModeLabels[mode].detail}</span>
								</button>
							),
						)}
					</div>

					<div
						className="migration-kickstart-panel"
						data-testid="migration-kickstart-panel"
						aria-label="Быстрый перенос старой базы"
					>
						<div>
							<strong>Быстрый перенос без ручного поиска</strong>
							<span>
								{migrationAutopilot
									? `План готов: источников ${migrationAutopilot.sources.length}, следующий шаг уже показан ниже.`
									: "Выберите самый простой вход: поиск на ПК, папка старой программы, вставленная выгрузка или реквизиты клиники."}
							</span>
						</div>
						<div
							className="migration-progress-strip"
							data-testid="migration-progress-strip"
							aria-label="Готовность переноса"
						>
							{migrationProgressItems.map((item) => (
								<article
									className={`migration-progress-step status-${item.status}`}
									key={item.id}
								>
									<strong>{item.title}</strong>
									<span>{item.detail}</span>
								</article>
							))}
						</div>
						<div className="migration-kickstart-grid">
							<article>
								<strong>Старая программа на этом ПК</strong>
								<span>
									{migrationSourceDiscovery
										? `Найдено ${migrationSourceDiscovery.candidates.length}, папок проверено ${migrationSourceDiscovery.scannedFolders}.`
										: "CRM сам ищет старые базы, выгрузки, снимки и следы стоматологических программ."}
								</span>
								<button
									className="primary-button"
									type="button"
									onClick={() => void discoverMigrationSources()}
									disabled={
										isMigrationSourceDiscovering || isMigrationAutopilotLoading
									}
									data-testid="discover-migration-sources"
								>
									<ScanSearch aria-hidden="true" />{" "}
									{isMigrationSourceDiscovering
										? "Ищу источники"
										: isMigrationAutopilotLoading
											? "Строю план"
											: "Найти на ПК + план"}
								</button>
							</article>
							<article>
								<strong>Папка, диск или архив</strong>
								<span>
									{typedBrowserMigrationDiscovery
										? `Выбрано ${typedBrowserMigrationDiscovery.candidates.length} источников, файлов ${typedBrowserMigrationDiscovery.candidates.reduce((sum, candidate) => sum + candidate.matchedFiles, 0)}.`
										: browserDirectoryPickerAvailable
											? "Админ выбирает папку старой МИС, диск выгрузки, КТ/снимки или архив снимков."
											: "Если браузер не дает выбрать папку, можно выбрать файлы старой МИС и снимков."}
								</span>
								<button
									className="primary-button"
									type="button"
									onClick={() => void pickBrowserMigrationSource()}
									disabled={
										isBrowserMigrationScanning || isMigrationAutopilotLoading
									}
									data-testid="pick-browser-migration-source"
								>
									<Database aria-hidden="true" />{" "}
									{isBrowserMigrationScanning
										? "Сканирую папку"
										: isMigrationAutopilotLoading
											? "Строю план"
											: "Папка/диск + план"}
								</button>
								{isBrowserMigrationScanning && browserMigrationScanProgress ? (
									<button
										className="secondary-button browser-scan-stop-button"
										type="button"
										data-testid="browser-cancel-migration-source-scan"
										onClick={cancelBrowserMigrationScan}
									>
										<CircleStop aria-hidden="true" /> Остановить
									</button>
								) : null}
							</article>
							<article>
								<strong>Текст, Excel, OCR, диктовка</strong>
								<span>
									{smartImportInputReady
										? "Можно построить план по вставленной выгрузке или сразу открыть предпросмотр строк."
										: "Сначала вставьте экспорт, таблицу, OCR или текст из старой программы в поле ниже."}
								</span>
								<div className="migration-source-card-actions">
									<button
										className="primary-button"
										type="button"
										onClick={() =>
											void runMigrationAutopilot(
												activeMigrationDiscoveryForSettingsAutopilot,
												{ includeSmartImportText: smartImportInputReady },
											)
										}
										disabled={isMigrationAutopilotLoading}
										data-testid="run-migration-autopilot"
									>
										<Sparkles aria-hidden="true" />{" "}
										{isMigrationAutopilotLoading
											? "Строю автоплан"
											: "Автоплан"}
									</button>
									<button
										className="secondary-button"
										type="button"
										onClick={previewSmartImport}
										disabled={isSmartImportLoading || !smartImportInputReady}
										aria-busy={isSmartImportLoading || undefined}
									>
										<UploadCloud aria-hidden="true" />{" "}
										{isSmartImportLoading ? "Разбираю" : "Разобрать"}
									</button>
								</div>
							</article>
							<article>
								<strong>Реквизиты клиники</strong>
								<span>
									Поиск по ИНН, названию, адресу и лицензии помогает заполнить
									профиль клиники без ручного копания.
								</span>
								<button
									className="secondary-button"
									type="button"
									onClick={() => void lookupClinicPublicProfile()}
									disabled={isClinicPublicLookupLoading}
									data-testid="lookup-clinic-public-profile"
								>
									<Search aria-hidden="true" />{" "}
									{isClinicPublicLookupLoading
										? "Ищу реквизиты"
										: "Найти реквизиты"}
								</button>
							</article>
						</div>
					</div>

					<div className="import-workbench">
						<textarea
							aria-label="Смешанная выгрузка для умного разбора"
							value={smartImportText}
							onChange={(event: TextInputChangeEvent) => {
								setSmartImportText(event.target.value);
								setSmartImportPreview(null);
								setSmartImportCommit(null);
							}}
						/>
						<div className="import-tool-row">
							<input
								ref={browserMigrationInputRef}
								data-testid="browser-migration-folder-input"
								type="file"
								multiple
								hidden
								tabIndex={-1}
								onChange={(event: InputChangeEvent) =>
									void handleBrowserMigrationInputChange(
										event.currentTarget.files,
									)
								}
							/>
							<button
								className="secondary-button"
								type="button"
								onClick={() => {
									setSmartImportMode("auto");
									setSmartImportText(
										"Старая МИС: резервная копия старой серверной базы C:\\Legacy\\clinic_2024.fdb\nАрхив выгрузки D:\\Migration\\patients_payments.xlsx\nDental clinic Smile Center INN 1234567890 Address: Samara, Lenina 1\nНовый Пациент Снимков +7 927 444-55-66 12.02.1991 перенос из старой МИС\nНовый Пациент Снимков +7 927 444-55-66 RVG 36 12.05.2026 C:\\Images\\new_patient_36.dcm\nИванова Марина Сергеевна +7 927 111-22-33 ОПТГ 10.05.2026 C:\\Images\\ivanova_opg.png\nслужебная строка без полезных данных",
									);
									setSmartImportPreview(null);
									setSmartImportCommit(null);
								}}
							>
								<Sparkles aria-hidden="true" /> Смешанный пример
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={downloadSmartImportReport}
								disabled={isSmartReportLoading || !smartImportInputReady}
								aria-busy={isSmartReportLoading || undefined}
							>
								<FileText aria-hidden="true" />{" "}
								{isSmartReportLoading ? "Готовлю отчет" : "Отчет проверки"}
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={downloadSmartImportSafeHandoffReport}
								disabled={isSmartSafeReportLoading || !smartImportInputReady}
								aria-busy={isSmartSafeReportLoading || undefined}
								data-testid="download-smart-safe-handoff-report"
								title="Табличный отчет для администратора, врача и специалиста переноса без ФИО, телефонов, дат рождения, локальных путей и имен файлов"
							>
								<ShieldCheck aria-hidden="true" />{" "}
								{isSmartSafeReportLoading ? "Готовлю отчет" : "Отчет переноса"}
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void downloadMigrationHandoffReport()}
								disabled={
									isMigrationHandoffReportLoading ||
									isMigrationAutopilotLoading ||
									!migrationHandoffReportReady
								}
								data-testid="download-migration-handoff-report"
								aria-busy={
									isMigrationHandoffReportLoading ||
									isMigrationAutopilotLoading ||
									undefined
								}
								aria-describedby={
									!migrationHandoffReportReady
										? migrationHandoffReportGuidanceId
										: undefined
								}
							>
								<FileText aria-hidden="true" />{" "}
								{isMigrationHandoffReportLoading
									? "Готовлю план"
									: isMigrationAutopilotLoading
										? "Жду автоплан"
										: migrationHandoffReportReady
											? "План переноса"
											: "Сначала автоплан"}
							</button>
							<button
								className="primary-button"
								type="button"
								onClick={previewSmartImport}
								disabled={isSmartImportLoading || !smartImportInputReady}
								aria-busy={isSmartImportLoading || undefined}
							>
								<UploadCloud aria-hidden="true" />{" "}
								{isSmartImportLoading ? "Разбираю" : "Разобрать"}
							</button>
						</div>
						{!smartImportInputReady ? (
							<p
								className="import-empty-guidance"
								role="status"
								aria-live="polite"
							>
								Вставьте выгрузку из старой МИС, таблицу, OCR или диктовку перед
								разбором.
							</p>
						) : null}
						{!migrationHandoffReportReady ? (
							<p
								className="import-empty-guidance"
								id={migrationHandoffReportGuidanceId}
								role="status"
								aria-live="polite"
							>
								Чтобы скачать план переноса, сначала запустите автоплан, найдите
								источники на ПК, выберите папку/диск или вставьте выгрузку.
							</p>
						) : null}
					</div>

					{browserMigrationScanProgress ? (
						<div
							className={`browser-imaging-scan-progress browser-migration-scan-progress ${browserMigrationScanProgress.phase}`}
							data-testid="browser-migration-scan-progress"
							role="status"
							aria-live="polite"
						>
							<div className="browser-picked-folder-head">
								<div>
									<strong>
										{browserMigrationScanProgress.phase === "cancelled"
											? "Поиск старой системы остановлен"
											: browserMigrationScanProgress.phase === "done"
												? "Источник проверен"
												: "Браузер проверяет старую МИС"}
									</strong>
									<span>
										{browserMigrationScanProgress.currentItem ??
											"Интерфейс остается доступным: проверка идет короткими порциями и без загрузки содержимого файлов."}
									</span>
								</div>
								{browserMigrationScanProgress.phase === "scanning" ? (
									<button
										className="text-button"
										type="button"
										data-testid="browser-cancel-migration-source-scan-inline"
										onClick={cancelBrowserMigrationScan}
									>
										Остановить
									</button>
								) : null}
							</div>
							<div className="browser-picked-folder-stats">
								<span>
									файлов: {browserMigrationScanProgress.scannedFiles}/
									{browserMigrationScanProgress.fileLimit}
								</span>
								<span>
									папок: {browserMigrationScanProgress.scannedFolders}/
									{browserMigrationScanProgress.folderLimit}
								</span>
								<span>
									старых баз: {browserMigrationScanProgress.databaseFiles}
								</span>
								<span>копий: {browserMigrationScanProgress.dumpFiles}</span>
								<span>таблиц: {browserMigrationScanProgress.tableFiles}</span>
								<span>
									КТ/снимков: {browserMigrationScanProgress.dicomLikeFiles}
								</span>
								<span>
									архивов: {browserMigrationScanProgress.archiveFiles}
								</span>
								<span>
									{formatByteSize(browserMigrationScanProgress.totalBytes)}
								</span>
								<span>
									сигнатур: до {browserMigrationScanProgress.magicReadLimit}
								</span>
								<span>
									шагов: {browserMigrationScanProgress.processedUnits}
								</span>
								<span>
									время:{" "}
									{formatBrowserImagingScanElapsed(
										browserMigrationScanProgress.elapsedMs,
									)}
								</span>
							</div>
							<small>
								Начато {formatTime(browserMigrationScanProgress.startedAt)} ·
								обновлено {formatTime(browserMigrationScanProgress.updatedAt)}
							</small>
						</div>
					) : null}

					{typedBrowserMigrationDiscovery ? (
						<div
							className="dicom-discovery-result browser-migration-manifest-result"
							data-testid="browser-migration-manifest-result"
							aria-label="Выбранная папка старых баз, выгрузок и снимков"
						>
							<div className="dicom-discovery-head">
								<strong>
									Выбранная папка: источников{" "}
									{typedBrowserMigrationDiscovery.candidates.length} · файлов{" "}
									{typedBrowserMigrationDiscovery.candidates.reduce(
										(sum, candidate) => sum + candidate.matchedFiles,
										0,
									)}{" "}
									· папок {typedBrowserMigrationDiscovery.scannedFolders}
								</strong>
								<span>
									{migrationAutopilot
										? "Автоплан по выбранной папке уже построен ниже."
										: humanizeMigrationText(
												typedBrowserMigrationDiscovery.nextAction,
											)}
								</span>
								<span>
									Сканирование выполнено после явного выбора папки/файлов.
									Полный путь и содержимое файлов не сохраняются в CRM.
								</span>
							</div>
							<div className="migration-source-artifact-list">
								{typedBrowserMigrationDiscovery.candidates
									.slice(0, 6)
									.map((candidate, index) => (
										<span key={candidate.sourceFingerprint}>
											{migrationSourceDisplayName(candidate, index)} ·{" "}
											{migrationSourceKindLabel(candidate.sourceKind)} ·{" "}
											{Math.round(candidate.confidence * 100)}%
										</span>
									))}
							</div>
							{!typedBrowserMigrationDiscovery.candidates.length ? (
								<div
									className="migration-empty-recovery"
									data-testid="browser-migration-empty-recovery"
									role="status"
									aria-live="polite"
								>
									<strong>
										В выбранной папке не видно старой базы или снимков
									</strong>
									<span>
										Обычно помогает выбрать корень выше: весь диск, папку старой
										программы, папку снимков, архив выгрузки или сетевой
										экспорт.
									</span>
									<div className="migration-source-card-actions">
										<button
											className="secondary-button"
											type="button"
											onClick={() => void pickBrowserMigrationSource()}
											disabled={
												isBrowserMigrationScanning ||
												isMigrationAutopilotLoading
											}
										>
											<Database aria-hidden="true" /> Выбрать другую папку
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={() => void discoverMigrationSources()}
											disabled={
												isMigrationSourceDiscovering ||
												isMigrationAutopilotLoading
											}
										>
											<ScanSearch aria-hidden="true" /> Найти на ПК
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={focusSmartImportWorkbench}
										>
											<FileText aria-hidden="true" /> Вставить выгрузку
										</button>
									</div>
								</div>
							) : null}
							{typedBrowserMigrationDiscovery.warnings
								.slice(0, 4)
								.map((warning) => (
									<small key={warning}>{humanizeMigrationText(warning)}</small>
								))}
						</div>
					) : null}

					{migrationAutopilot ? (
						<div
							className="dicom-discovery-result migration-autopilot-result"
							data-testid="migration-autopilot-result"
							aria-label="Автоплан миграции старых баз, снимков и реквизитов клиники"
						>
							<div className="dicom-discovery-head">
								<strong>
									Автоплан миграции: источников{" "}
									{migrationAutopilot.discovery.candidateCount} · проб{" "}
									{migrationAutopilot.discovery.probedCount} · папок{" "}
									{migrationAutopilot.discovery.scannedFolders}
								</strong>
								<span>
									{humanizeMigrationText(migrationAutopilot.nextAction)}
								</span>
								<span>
									Дальше работайте сверху вниз: блок «Сейчас», карточки
									источников, затем предпросмотр.
								</span>
							</div>
							{migrationAutopilot.operatorPacket ? (
								<div
									className="migration-autopilot-operator-packet"
									data-testid="migration-autopilot-operator-packet"
								>
									<div className="migration-operator-score">
										<strong>
											Пакет миграции:{" "}
											{migrationOperatorPacketStatusLabels[
												migrationAutopilot.operatorPacket.overallStatus
											] ?? migrationAutopilot.operatorPacket.overallStatus}{" "}
											·{" "}
											{Math.round(
												migrationAutopilot.operatorPacket.score * 100,
											)}
											%
										</strong>
										<span>
											базы{" "}
											{migrationAutopilot.operatorPacket.totals.databaseSources}{" "}
											· снимки{" "}
											{migrationAutopilot.operatorPacket.totals.mediaSources} ·
											таблицы{" "}
											{migrationAutopilot.operatorPacket.totals.tableSources} ·
											из текста{" "}
											{
												migrationAutopilot.operatorPacket.totals
													.smartPreviewSources
											}{" "}
											· системные следы{" "}
											{
												migrationAutopilot.operatorPacket.totals
													.workstationHints
											}{" "}
											· публичные ссылки{" "}
											{
												migrationAutopilot.operatorPacket.totals
													.publicLookupTargets
											}
										</span>
									</div>
									{migrationDryRunSummary ? (
										<div
											className="migration-dry-run-summary"
											data-testid="migration-dry-run-summary"
											aria-label="Быстрый прогон миграции"
										>
											<div>
												<strong>Быстрый прогон</strong>
												<span>
													предпросмотр{" "}
													{migrationDryRunSummary.previewableSources} ·
													администратор{" "}
													{migrationDryRunSummary.adminBlockedSources} · врач{" "}
													{migrationDryRunSummary.doctorReviewRequiredSources}
												</span>
											</div>
											<small>
												Оператор ~
												{migrationDryRunSummary.estimatedOperatorMinutes} мин ·
												простой клиники ~
												{migrationDryRunSummary.estimatedClinicDowntimeMinutes}{" "}
												мин
											</small>
											<p>
												{humanizeMigrationText(
													migrationDryRunSummary.fastestRoute,
												)}
											</p>
											<p>
												{humanizeMigrationText(
													migrationDryRunSummary.nextBestAction,
												)}
											</p>
										</div>
									) : null}
									{migrationPrimaryOperatorStep ? (
										<div
											className="migration-primary-action"
											data-testid="migration-autopilot-primary-action"
											aria-label="Главное действие миграции сейчас"
										>
											<div>
												<strong>
													Сейчас: {migrationPrimaryOperatorStep.title}
												</strong>
												<span>
													{migrationOwnerLabels[
														migrationPrimaryOperatorStep.owner
													] ??
														humanizeMigrationText(
															migrationPrimaryOperatorStep.owner,
														)}{" "}
													· {migrationPrimaryOperatorStep.estimatedMinutes} мин
													·{" "}
													{migrationPrimaryOperatorStep.blocking
														? "сначала это"
														: "можно параллельно"}
												</span>
												<small>
													{humanizeMigrationText(
														migrationPrimaryOperatorStep.detail,
													)}
												</small>
											</div>
											{renderMigrationOperatorStepActions(
												migrationPrimaryOperatorStep,
												migrationPrimaryOperatorCandidate,
												"primary",
											)}
										</div>
									) : null}
									{migrationTriageItems.length ? (
										<div
											className="migration-triage-queue"
											data-testid="migration-triage-queue"
											aria-label="Короткая очередь миграции для администратора"
										>
											<div className="migration-triage-head">
												<strong>Очередь действий</strong>
												<span>
													Сначала стопоры, затем задачи, которые можно
													подготовить параллельно.
												</span>
											</div>
											<div className="migration-triage-grid">
												{migrationTriageItems.map((item) => (
													<div
														className={`migration-triage-item status-${item.status}`}
														key={item.id}
													>
														<strong>{item.title}</strong>
														<span>
															{migrationOwnerLabels[item.owner] ??
																humanizeMigrationText(item.owner)}{" "}
															·{" "}
															{migrationHandoffPhaseLabels[item.phase] ??
																humanizeMigrationText(item.phase)}{" "}
															·{" "}
															{migrationOperatorPacketStatusLabels[
																item.status
															] ?? humanizeMigrationText(item.status)}{" "}
															· {item.blocking ? "сначала это" : "параллельно"}
														</span>
														<small>{humanizeMigrationText(item.detail)}</small>
														<small>
															Что нужно:{" "}
															{humanizeMigrationText(item.requiredArtifact)}
														</small>
														<small>
															Готово, когда:{" "}
															{humanizeMigrationText(item.doneWhen)}
														</small>
													</div>
												))}
											</div>
										</div>
									) : null}
									{migrationAutopilot.operatorPacket.operatorScript ? (
										<div
											className="migration-autopilot-script"
											data-testid="migration-autopilot-operator-script"
											aria-label="Что делать сейчас для миграции"
										>
											<div className="dicom-discovery-head">
												<strong>
													{
														migrationAutopilot.operatorPacket.operatorScript
															.title
													}{" "}
													· ~
													{
														migrationAutopilot.operatorPacket.operatorScript
															.totalEstimatedMinutes
													}{" "}
													мин
												</strong>
												<span>
													{
														migrationAutopilot.operatorPacket.operatorScript
															.headline
													}
												</span>
											</div>
											<div className="migration-autopilot-summary">
												{migrationOperatorScriptSteps
													.slice(0, 7)
													.map((step) => {
														const scriptCandidate = step.sourceFingerprint
															? typedMigrationAutopilotSources.find(
																	(source) =>
																		source.candidate.sourceFingerprint ===
																		step.sourceFingerprint,
																)?.candidate
															: null;
														return (
															<article key={step.id}>
																<strong>{step.title}</strong>
																<span>
																	{migrationOwnerLabels[step.owner] ??
																		humanizeMigrationText(step.owner)}{" "}
																	· {step.estimatedMinutes} мин ·{" "}
																	{step.blocking
																		? "обязательно"
																		: "параллельно"}
																</span>
																<small>
																	{humanizeMigrationText(step.detail)}
																</small>
																{renderMigrationOperatorStepActions(
																	step,
																	scriptCandidate,
																	"script",
																)}
															</article>
														);
													})}
											</div>
										</div>
									) : null}
									<div className="migration-autopilot-summary">
										{typedMigrationOperatorLanes.slice(0, 5).map((lane) => (
											<article key={lane.id}>
												<strong>{lane.title}</strong>
												<span>
													{migrationOwnerLabels[lane.owner] ??
														humanizeMigrationText(lane.owner)}{" "}
													·{" "}
													{migrationOperatorPacketStatusLabels[lane.status] ??
														humanizeMigrationText(lane.status)}{" "}
													· {Math.round(lane.score * 100)}%
												</span>
												<small>{humanizeMigrationText(lane.detail)}</small>
												<small>{humanizeMigrationText(lane.nextAction)}</small>
											</article>
										))}
									</div>
									<div
										className="migration-source-artifact-list"
										aria-label="Первые действия миграции"
									>
										{migrationAutopilot.operatorPacket.firstActions
											.slice(0, 6)
											.map((action: string) => (
												<span key={action}>
													{humanizeMigrationText(action)}
												</span>
											))}
									</div>
									<div
										className="migration-autopilot-summary"
										data-testid="migration-autopilot-handoff-checklist"
										aria-label="Чеклист передачи миграции"
									>
										{typedMigrationHandoffChecklist.slice(0, 6).map((item) => (
											<article key={item.id}>
												<strong>{item.title}</strong>
												<span>
													{migrationOwnerLabels[item.owner] ??
														humanizeMigrationText(item.owner)}{" "}
													·{" "}
													{migrationHandoffPhaseLabels[item.phase] ??
														humanizeMigrationText(item.phase)}{" "}
													·{" "}
													{migrationOperatorPacketStatusLabels[item.status] ??
														humanizeMigrationText(item.status)}
												</span>
												<small>{humanizeMigrationText(item.detail)}</small>
												<small>
													Нужно: {humanizeMigrationText(item.requiredArtifact)}
												</small>
												<small>{humanizeMigrationText(item.doneWhen)}</small>
											</article>
										))}
									</div>
									{renderMigrationTechnicalNotes(
										"Границы онлайн-поиска",
										[
											`Онлайн-поиск: ${humanizeMigrationColumns(migrationAutopilot.operatorPacket.onlineLookupPolicy.allowed) || "нет доступных публичных полей"}`,
											`Не отправлять в онлайн-поиск: ${humanizeMigrationColumns(migrationAutopilot.operatorPacket.onlineLookupPolicy.forbidden, 6)}`,
										],
										"migration-autopilot-technical-boundary",
									)}
								</div>
							) : null}
							<div className="migration-autopilot-summary">
								{typedMigrationAutopilotSteps.slice(0, 6).map((step) => (
									<article key={`${step.order}:${step.title}`}>
										<strong>
											{step.order}. {step.title}
										</strong>
										<span>
											{migrationOwnerLabels[step.owner] ??
												humanizeMigrationText(step.owner)}{" "}
											· {step.blocking ? "обязательно" : "можно параллельно"}
										</span>
										<small>{humanizeMigrationText(step.detail)}</small>
									</article>
								))}
							</div>
							{typedMigrationAutopilotSources.length ? (
								<div className="dicom-discovery-grid">
									{typedMigrationAutopilotSources
										.slice(0, 6)
										.map((source, index) => {
											const sourceDisplayName = migrationSourceDisplayName(
												source.candidate,
												index,
											);
											return (
												<article key={source.candidate.sourceFingerprint}>
													<strong>{sourceDisplayName}</strong>
													<span>
														{migrationPriorityLabels[source.priority] ??
															humanizeMigrationText(source.priority)}{" "}
														·{" "}
														{migrationOwnerLabels[source.owner] ??
															humanizeMigrationText(source.owner)}{" "}
														· {Math.round(source.score * 100)}%
													</span>
													{source.readiness ? (
														<small>
															Готовность:{" "}
															{migrationReadinessLevelLabels[
																source.readiness.level
															] ??
																humanizeMigrationText(
																	source.readiness.level,
																)}{" "}
															· {Math.round(source.readiness.score * 100)}% ·
															блокеров {source.readiness.blockers.length}
														</small>
													) : null}
													{source.bridgeKit ? (
														<small>
															Маршрут:{" "}
															{migrationBridgeKitKindLabels[
																source.bridgeKit.kind
															] ??
																humanizeMigrationText(
																	source.bridgeKit.kind,
																)}{" "}
															·{" "}
															{migrationBridgeKitStatusLabels[
																source.bridgeKit.status
															] ??
																humanizeMigrationText(
																	source.bridgeKit.status,
																)}{" "}
															·{" "}
															{humanizeMigrationList(
																source.bridgeKit.requiredTools,
																2,
															)}
														</small>
													) : null}
													<small>
														{migrationSourceKindLabel(
															source.candidate.sourceKind,
														)}{" "}
														· источник {index + 1} · файлов{" "}
														{source.candidate.matchedFiles}
													</small>
													{source.probe ? (
														<small>
															Проверено: базы {source.probe.counts.databases} ·
															КТ/серий {source.probe.counts.dicom} · снимков{" "}
															{source.probe.counts.images} · таблиц{" "}
															{source.probe.counts.tables}
														</small>
													) : (
														<small>Источник еще не проверяли детально.</small>
													)}
													<span>
														{humanizeMigrationText(source.recommendedAction)}
													</span>
													{source.riskFlags.slice(0, 4).map((flag: string) => (
														<small key={flag}>
															{humanizeMigrationText(flag)}
														</small>
													))}
													{source.readiness?.blockers
														.slice(0, 2)
														.map((item) => (
															<small key={item.id}>
																{migrationOwnerLabels[item.owner] ??
																	humanizeMigrationText(item.owner)}
																: {humanizeMigrationText(item.title)} ·{" "}
																{humanizeMigrationText(item.nextAction)}
															</small>
														))}
													{source.probe?.adapters.slice(0, 2).map((adapter) => (
														<small key={adapter.id}>
															{humanizeMigrationText(adapter.title)}:{" "}
															{migrationAdapterStatusLabels[adapter.status] ??
																humanizeMigrationText(adapter.status)}{" "}
															· {Math.round(adapter.confidence * 100)}%
														</small>
													))}
													<div className="migration-source-card-actions">
														<button
															className="text-button"
															type="button"
															onClick={() =>
																planMigrationDiscoveryCandidate(
																	source.candidate,
																)
															}
															disabled={isMigrationSourceWorkupLoading}
															aria-label={`Открыть план переноса: ${sourceDisplayName}`}
														>
															<ClipboardCheck aria-hidden="true" /> План
															переноса
														</button>
														<button
															className="text-button"
															type="button"
															onClick={() =>
																probeMigrationDiscoveryCandidate(
																	source.candidate,
																)
															}
															disabled={isMigrationSourceProbeLoading}
															aria-label={`Проверить источник: ${sourceDisplayName}`}
														>
															<ScanSearch aria-hidden="true" /> Проверить
															источник
														</button>
														<button
															className="text-button"
															type="button"
															onClick={() =>
																addMigrationDiscoveryCandidateToSmartImport(
																	source.candidate,
																)
															}
															aria-label={`Отправить источник в разбор: ${sourceDisplayName}`}
														>
															<UploadCloud aria-hidden="true" /> Отправить в
															разбор
														</button>
														<button
															className="text-button"
															type="button"
															onClick={() =>
																void previewMigrationDiscoveryCandidate(
																	source.candidate,
																)
															}
															disabled={
																isSmartImportLoading ||
																!migrationCandidatePreviewReady(
																	source.candidate,
																)
															}
															title={migrationCandidatePreviewHint(
																source.candidate,
															)}
															aria-label={`Построить предпросмотр: ${sourceDisplayName}`}
														>
															<FileCheck2 aria-hidden="true" /> Предпросмотр
														</button>
														{!migrationCandidatePreviewReady(
															source.candidate,
														) ? (
															<small className="migration-action-hint">
																{migrationCandidatePreviewHint(
																	source.candidate,
																)}
															</small>
														) : null}
													</div>
												</article>
											);
										})}
								</div>
							) : null}
							{typedMigrationAutopilotClinicLookup ? (
								<div className="migration-autopilot-clinic">
									<strong>
										Реквизиты клиники:{" "}
										{clinicPublicLookupProviderStatusLabels[
											typedMigrationAutopilotClinicLookup.providerStatus
										] ??
											humanizeMigrationText(
												typedMigrationAutopilotClinicLookup.providerStatus,
											)}{" "}
										·{" "}
										{typedMigrationAutopilotClinicLookup.safeQuery ||
											"без запроса"}
									</strong>
									<span>
										{humanizeMigrationText(
											typedMigrationAutopilotClinicLookup.nextAction,
										)}
									</span>
									<small className="clinic-public-boundary">
										{clinicPublicLookupBoundaryText}
									</small>
									<div className="clinic-public-targets">
										{typedMigrationAutopilotClinicLookup.publicLookupTargets
											.slice(0, 4)
											.map((target) => (
												<a
													className="secondary-button"
													href={target.url}
													key={`${target.kind}:${target.title}`}
													target="_blank"
													rel="noreferrer noopener"
													aria-label={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
													title={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
												>
													<ExternalLink aria-hidden="true" /> {target.title}
												</a>
											))}
									</div>
									{typedMigrationAutopilotClinicLookup.suggestions.length ? (
										<div
											className="clinic-public-suggestions"
											data-testid="migration-autopilot-clinic-suggestions"
										>
											{typedMigrationAutopilotClinicLookup.suggestions
												.slice(0, 3)
												.map((suggestion) => (
													<article
														key={`${suggestion.source}:${suggestion.confidence}:${suggestion.fields.inn ?? suggestion.fields.clinicName ?? "clinic"}`}
													>
														<strong>
															{suggestion.fields.legalName ??
																suggestion.fields.clinicName ??
																"Подсказка реквизитов"}
														</strong>
														<span>
															{clinicPublicLookupSuggestionSourceLabels[
																suggestion.source
															] ??
																humanizeMigrationText(suggestion.source)}{" "}
															· {Math.round(suggestion.confidence * 100)}%
														</span>
														<small>
															{clinicLookupSuggestionFieldEntries(
																suggestion.fields,
															)
																.map(
																	([key, value]) =>
																		`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
																)
																.slice(0, 5)
																.join(" · ") || "Нет применимых полей"}
														</small>
														<small className="clinic-public-apply-summary">
															{clinicLookupSuggestionApplySummary(
																suggestion.fields,
															)}
														</small>
														<button
															className="text-button"
															type="button"
															disabled={
																!clinicLookupSuggestionFieldEntries(
																	suggestion.fields,
																).length
															}
															onClick={() =>
																applyClinicLookupSuggestion(suggestion.fields)
															}
															data-testid="apply-migration-autopilot-clinic-profile"
														>
															Подставить в профиль
														</button>
													</article>
												))}
										</div>
									) : null}
									{typedMigrationAutopilotClinicLookup.warnings
										.slice(0, 3)
										.map((warning: string) => (
											<small key={warning}>
												{clinicPublicLookupWarningText(warning)}
											</small>
										))}
									<div className="clinic-public-save-row">
										<span>
											Подстановка меняет черновик. Для документов и оплат
											сохраните профиль клиники.
										</span>
										<button
											className="secondary-button"
											type="button"
											onClick={() => void saveClinicProfileFromDraft()}
											disabled={clinicProfileSaveState === "saving"}
											data-testid="save-migration-autopilot-clinic-profile"
										>
											<ShieldCheck aria-hidden="true" />{" "}
											{clinicProfileSaveButtonText}
										</button>
									</div>
								</div>
							) : null}
							{migrationAutopilot.warnings
								.slice(0, 4)
								.map((warning: string) => (
									<small key={warning}>{humanizeMigrationText(warning)}</small>
								))}
							{renderMigrationTechnicalNotes(
								"Технические границы автоплана",
								migrationAutopilot.privacyWarnings,
								"migration-autopilot-privacy-notes",
							)}
						</div>
					) : null}

					{typedMigrationSourceDiscovery ? (
						<div
							className="dicom-discovery-result migration-source-discovery-result"
							data-testid="migration-source-discovery-result"
							aria-label="Автопоиск старых баз, выгрузок и снимков"
						>
							<div className="dicom-discovery-head">
								<strong>
									Найдено источников: {typedMigrationDiscoveryCandidates.length}{" "}
									· просканировано папок:{" "}
									{typedMigrationSourceDiscovery.scannedFolders}
								</strong>
								<span>
									{migrationAutopilot
										? "Автоплан уже построен выше. Начните с блока «Сейчас» или откройте карточку источника."
										: humanizeMigrationText(
												typedMigrationSourceDiscovery.nextAction,
											)}
								</span>
								<span>
									Карточки ниже уже готовы к плану переноса, проверке источника,
									предпросмотру или разбору.
								</span>
							</div>
							<div className="dicom-discovery-grid">
								{typedMigrationDiscoveryCandidates
									.slice(0, 9)
									.map((candidate, index) => {
										const candidateDisplayName = migrationSourceDisplayName(
											candidate,
											index,
										);
										return (
											<article key={candidate.sourceFingerprint}>
												<strong>{candidateDisplayName}</strong>
												<span>
													{humanizeMigrationText(candidate.sourceLabel)} ·{" "}
													{migrationSourceKindLabel(candidate.sourceKind)} ·
													источник {index + 1}
												</span>
												<small>
													{Math.round(candidate.confidence * 100)}% · файлов{" "}
													{candidate.matchedFiles} · базы{" "}
													{candidate.databaseFiles} · КТ/серии{" "}
													{candidate.dicomLikeFiles} · изображений{" "}
													{candidate.imageFiles}
												</small>
												{candidate.latestModifiedAt ? (
													<small>
														Последнее изменение:{" "}
														{formatDateTime(candidate.latestModifiedAt)}
													</small>
												) : null}
												{candidate.reasons.slice(0, 3).map((reason: string) => (
													<span key={reason}>
														{humanizeMigrationText(reason)}
													</span>
												))}
												{candidate.warnings
													.slice(0, 2)
													.map((warning: string) => (
														<small key={warning}>
															{humanizeMigrationText(warning)}
														</small>
													))}
												<div className="migration-source-card-actions">
													<button
														className="text-button"
														type="button"
														onClick={() =>
															planMigrationDiscoveryCandidate(candidate)
														}
														disabled={isMigrationSourceWorkupLoading}
														aria-label={`Открыть план переноса: ${candidateDisplayName}`}
													>
														<ClipboardCheck aria-hidden="true" /> План переноса
													</button>
													<button
														className="text-button"
														type="button"
														onClick={() =>
															probeMigrationDiscoveryCandidate(candidate)
														}
														disabled={isMigrationSourceProbeLoading}
														aria-label={`Проверить источник: ${candidateDisplayName}`}
													>
														<ScanSearch aria-hidden="true" /> Проверить источник
													</button>
													<button
														className="text-button"
														type="button"
														onClick={() =>
															addMigrationDiscoveryCandidateToSmartImport(
																candidate,
															)
														}
														aria-label={`Отправить источник в разбор: ${candidateDisplayName}`}
													>
														<UploadCloud aria-hidden="true" /> Отправить в
														разбор
													</button>
													<button
														className="text-button"
														type="button"
														onClick={() =>
															void previewMigrationDiscoveryCandidate(candidate)
														}
														disabled={
															isSmartImportLoading ||
															!migrationCandidatePreviewReady(candidate)
														}
														title={migrationCandidatePreviewHint(candidate)}
														aria-label={`Построить предпросмотр: ${candidateDisplayName}`}
													>
														<FileCheck2 aria-hidden="true" /> Предпросмотр
													</button>
													{!migrationCandidatePreviewReady(candidate) ? (
														<small className="migration-action-hint">
															{migrationCandidatePreviewHint(candidate)}
														</small>
													) : null}
												</div>
											</article>
										);
									})}
							</div>
							{!typedMigrationDiscoveryCandidates.length ? (
								<div
									className="migration-empty-recovery"
									data-testid="pc-migration-empty-recovery"
									role="status"
									aria-live="polite"
								>
									<strong>
										Автопоиск не нашел старую МИС в пределах лимитов
									</strong>
									<span>
										Дальше не нужен айтишник: выберите папку/диск вручную,
										вставьте пару строк выгрузки или заполните реквизиты клиники
										для документов.
									</span>
									<div className="migration-source-card-actions">
										<button
											className="secondary-button"
											type="button"
											onClick={() => void pickBrowserMigrationSource()}
											disabled={
												isBrowserMigrationScanning ||
												isMigrationAutopilotLoading
											}
										>
											<Database aria-hidden="true" /> Папка/диск
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={focusSmartImportWorkbench}
										>
											<FileText aria-hidden="true" /> Вставить текст
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={() => void lookupClinicPublicProfile()}
											disabled={isClinicPublicLookupLoading}
										>
											<Search aria-hidden="true" /> Реквизиты
										</button>
									</div>
								</div>
							) : null}
							{typedMigrationSourceDiscovery.warnings
								.slice(0, 4)
								.map((warning) => (
									<small key={warning}>{humanizeMigrationText(warning)}</small>
								))}
						</div>
					) : null}

					{typedMigrationSourceWorkup ? (
						<div
							className="dicom-discovery-result migration-source-workup-result"
							data-testid="migration-source-workup-result"
							aria-label="План миграции найденного источника"
						>
							<div className="dicom-discovery-head">
								<strong>
									План переноса:{" "}
									{migrationSourceDisplayName(typedMigrationSourceWorkup)} ·{" "}
									{migrationSourceKindLabel(
										typedMigrationSourceWorkup.sourceKind,
									)}
								</strong>
								<span>
									{humanizeMigrationText(
										typedMigrationSourceWorkup.sourceLabel,
									)}{" "}
									·{" "}
									{typedMigrationSourceWorkup.sourceExists
										? "источник доступен"
										: "источник сейчас не доступен"}{" "}
									·{" "}
									{migrationAutomationLevelLabels[
										typedMigrationSourceWorkup.automationLevel
									] ??
										humanizeMigrationText(
											typedMigrationSourceWorkup.automationLevel,
										)}
								</span>
								<span>
									{humanizeMigrationText(typedMigrationSourceWorkup.nextAction)}
								</span>
								<span>
									{humanizeMigrationText(
										typedMigrationSourceWorkup.recommendedRoute,
									)}
								</span>
							</div>
							<div
								className="migration-source-workup-lanes"
								aria-label="Готовность источника к миграции"
							>
								<article>
									<strong>
										Готовность:{" "}
										{migrationReadinessLevelLabels[
											typedMigrationSourceWorkup.readiness.level
										] ??
											humanizeMigrationText(
												typedMigrationSourceWorkup.readiness.level,
											)}{" "}
										·{" "}
										{Math.round(
											typedMigrationSourceWorkup.readiness.score * 100,
										)}
										%
									</strong>
									<p>
										{humanizeMigrationText(
											typedMigrationSourceWorkup.readiness.nextAction,
										)}
									</p>
									<small>
										Блокеры{" "}
										{typedMigrationSourceWorkup.readiness.blockers.length} ·
										предупреждения{" "}
										{typedMigrationSourceWorkup.readiness.warnings.length} ·
										готово {typedMigrationSourceWorkup.readiness.ready.length}
									</small>
								</article>
								<article>
									<strong>Что мешает</strong>
									{typedMigrationWorkupReadinessIssues
										.slice(0, 3)
										.map((item) => (
											<span key={item.id}>
												{migrationOwnerLabels[item.owner] ??
													humanizeMigrationText(item.owner)}
												: {humanizeMigrationText(item.title)}
											</span>
										))}
								</article>
							</div>
							<div
								className="migration-source-workup-lanes"
								aria-label="План подключения источника миграции"
							>
								<article>
									<strong>
										Маршрут:{" "}
										{migrationBridgeKitKindLabels[
											typedMigrationSourceWorkup.bridgeKit.kind
										] ??
											humanizeMigrationText(
												typedMigrationSourceWorkup.bridgeKit.kind,
											)}{" "}
										·{" "}
										{migrationBridgeKitStatusLabels[
											typedMigrationSourceWorkup.bridgeKit.status
										] ??
											humanizeMigrationText(
												typedMigrationSourceWorkup.bridgeKit.status,
											)}
									</strong>
									<p>
										{humanizeMigrationText(
											typedMigrationSourceWorkup.bridgeKit.nextAction,
										)}
									</p>
									<small>
										{humanizeMigrationList(
											typedMigrationSourceWorkup.bridgeKit.requiredTools,
											4,
										)}
									</small>
								</article>
								<article>
									<strong>Файл для проверки</strong>
									<span>
										{humanizeMigrationText(
											typedMigrationSourceWorkup.bridgeKit.outputManifest
												.format,
										)}
									</span>
									<small>
										{humanizeMigrationColumns(
											typedMigrationSourceWorkup.bridgeKit.outputManifest
												.requiredColumns,
											5,
										)}
									</small>
								</article>
							</div>
							<div className="migration-source-workup-lanes">
								<article>
									<strong>Что можно вытянуть</strong>
									<p>
										{typedMigrationSourceWorkup.extractableEntities
											.map(
												(entity) =>
													migrationEntityLabels[entity] ??
													humanizeMigrationText(entity),
											)
											.join(" · ")}
									</p>
									<small>
										{humanizeMigrationList(
											typedMigrationSourceWorkup.requiredArtifacts,
										)}
									</small>
								</article>
								<article>
									<strong>Передача в CRM</strong>
									{typedMigrationSourceWorkup.handoffs
										.slice(0, 3)
										.map((handoff) => (
											<span key={`${handoff.method}:${handoff.endpoint}`}>
												{humanizeMigrationText(handoff.title)} ·{" "}
												{migrationHandoffRouteLabel(handoff)}
											</span>
										))}
								</article>
							</div>
							<div className="dicom-discovery-grid">
								{typedMigrationSourceWorkup.steps.map((step) => (
									<article key={step.id}>
										<strong>{step.title}</strong>
										<span>
											{migrationWorkupStepStatusLabels[step.status] ??
												humanizeMigrationText(step.status)}{" "}
											· {humanizeMigrationText(step.actionLabel)}
										</span>
										<small>{humanizeMigrationText(step.detail)}</small>
									</article>
								))}
							</div>
							{typedMigrationSourceWorkup.warnings
								.slice(0, 4)
								.map((warning) => (
									<small key={warning}>{humanizeMigrationText(warning)}</small>
								))}
							{renderMigrationTechnicalNotes(
								"Технические границы плана",
								typedMigrationSourceWorkup.privacyWarnings,
								"migration-source-workup-privacy-notes",
							)}
						</div>
					) : null}

					{typedMigrationSourceProbe ? (
						<div
							className="dicom-discovery-result migration-source-probe-result"
							data-testid="migration-source-probe-result"
							aria-label="Проверка найденного источника миграции без записи"
						>
							<div className="dicom-discovery-head">
								<strong>
									Проверка источника:{" "}
									{migrationSourceDisplayName(typedMigrationSourceProbe)} ·{" "}
									{migrationSourceKindLabel(
										typedMigrationSourceProbe.sourceKind,
									)}
								</strong>
								<span>
									{humanizeMigrationText(typedMigrationSourceProbe.sourceLabel)}{" "}
									· папок {typedMigrationSourceProbe.scannedFolders} · файлов{" "}
									{typedMigrationSourceProbe.scannedFiles}
								</span>
								<span>
									{humanizeMigrationText(typedMigrationSourceProbe.nextAction)}
								</span>
								<span>
									{humanizeMigrationText(
										typedMigrationSourceProbe.recommendedRoute,
									)}
								</span>
							</div>
							<div
								className="migration-source-workup-lanes"
								aria-label="Готовность пробы источника к миграции"
							>
								<article>
									<strong>
										Готовность:{" "}
										{migrationReadinessLevelLabels[
											typedMigrationSourceProbe.readiness.level
										] ??
											humanizeMigrationText(
												typedMigrationSourceProbe.readiness.level,
											)}{" "}
										·{" "}
										{Math.round(
											typedMigrationSourceProbe.readiness.score * 100,
										)}
										%
									</strong>
									<p>
										{humanizeMigrationText(
											typedMigrationSourceProbe.readiness.nextAction,
										)}
									</p>
									<small>
										Блокеры{" "}
										{typedMigrationSourceProbe.readiness.blockers.length} ·
										предупреждения{" "}
										{typedMigrationSourceProbe.readiness.warnings.length} ·
										готово {typedMigrationSourceProbe.readiness.ready.length}
									</small>
								</article>
								<article>
									<strong>Что мешает</strong>
									{typedMigrationProbeReadinessIssues
										.slice(0, 3)
										.map((item) => (
											<span key={item.id}>
												{migrationOwnerLabels[item.owner] ??
													humanizeMigrationText(item.owner)}
												: {humanizeMigrationText(item.title)}
											</span>
										))}
								</article>
							</div>
							<div
								className="migration-source-workup-lanes"
								aria-label="План проверки источника миграции"
							>
								<article>
									<strong>
										Маршрут:{" "}
										{migrationBridgeKitKindLabels[
											typedMigrationSourceProbe.bridgeKit.kind
										] ??
											humanizeMigrationText(
												typedMigrationSourceProbe.bridgeKit.kind,
											)}{" "}
										·{" "}
										{migrationBridgeKitStatusLabels[
											typedMigrationSourceProbe.bridgeKit.status
										] ??
											humanizeMigrationText(
												typedMigrationSourceProbe.bridgeKit.status,
											)}
									</strong>
									<p>
										{humanizeMigrationText(
											typedMigrationSourceProbe.bridgeKit.nextAction,
										)}
									</p>
									<small>
										{humanizeMigrationList(
											typedMigrationSourceProbe.bridgeKit.requiredTools,
											4,
										)}
									</small>
								</article>
								<article>
									<strong>Запрещено наружу</strong>
									<span>
										{humanizeMigrationColumns(
											typedMigrationSourceProbe.bridgeKit.outputManifest
												.forbiddenFields,
											4,
										)}
									</span>
									<small>
										{humanizeMigrationText(
											typedMigrationSourceProbe.bridgeKit.privacyBoundary,
										)}
									</small>
								</article>
							</div>
							<div className="migration-source-workup-lanes">
								<article>
									<strong>Инвентарь</strong>
									<p>
										базы {typedMigrationSourceProbe.counts.databases} ·
										резервные копии {typedMigrationSourceProbe.counts.dumps} ·
										таблицы {typedMigrationSourceProbe.counts.tables} · архивы{" "}
										{typedMigrationSourceProbe.counts.archives} · КТ/серии{" "}
										{typedMigrationSourceProbe.counts.dicom} · снимки{" "}
										{typedMigrationSourceProbe.counts.images} · 3D{" "}
										{typedMigrationSourceProbe.counts.models}
									</p>
									<small>
										{typedMigrationSourceProbe.detectedVendors.length
											? humanizeMigrationList(
													typedMigrationSourceProbe.detectedVendors,
												)
											: "Программа не распознана"}
									</small>
								</article>
								<article>
									<strong>Сигнатуры</strong>
									<p>
										{humanizeMigrationList(
											typedMigrationSourceProbe.formatSignals,
											8,
										) || "Только имя/расширение, без читаемой сигнатуры"}
									</p>
									<small>
										Пути и похожие на ФИО имена файлов скрыты во внутренние
										номера.
									</small>
								</article>
							</div>
							<div className="dicom-discovery-grid">
								{typedMigrationSourceProbe.adapters
									.slice(0, 4)
									.map((adapter) => (
										<article key={adapter.id}>
											<strong>{humanizeMigrationText(adapter.title)}</strong>
											<span>
												{migrationAdapterStatusLabels[adapter.status] ??
													humanizeMigrationText(adapter.status)}{" "}
												· {Math.round(adapter.confidence * 100)}%
											</span>
											<small>{humanizeMigrationText(adapter.input)}</small>
											<small>{humanizeMigrationText(adapter.output)}</small>
											<span>{humanizeMigrationText(adapter.nextAction)}</span>
										</article>
									))}
							</div>
							{typedMigrationSourceProbe.artifactSamples.length ? (
								<div
									className="migration-source-artifact-list"
									aria-label="Безопасные примеры найденных артефактов"
								>
									{typedMigrationSourceProbe.artifactSamples
										.slice(0, 8)
										.map((artifact) => (
											<span key={artifact.id}>
												{artifact.safeName} ·{" "}
												{humanizeMigrationText(artifact.kind)}
												{artifact.byteSize !== null
													? ` · ${formatByteSize(artifact.byteSize)}`
													: ""}
											</span>
										))}
								</div>
							) : null}
							{typedMigrationSourceProbe.warnings.slice(0, 4).map((warning) => (
								<small key={warning}>{humanizeMigrationText(warning)}</small>
							))}
							{renderMigrationTechnicalNotes(
								"Технические границы пробы",
								typedMigrationSourceProbe.privacyWarnings,
								"migration-source-probe-privacy-notes",
							)}
						</div>
					) : null}

					{clinicPublicLookup && settingsTab === "imports" ? (
						<div
							className="clinic-public-lookup-result smart-clinic-public-lookup"
							aria-label="Публичные источники для профиля клиники"
						>
							<div className="dicom-discovery-head">
								<strong>
									Реквизиты клиники:{" "}
									{clinicPublicLookupProviderStatusLabels[
										clinicPublicLookup.providerStatus
									] ??
										humanizeMigrationText(
											clinicPublicLookup.providerStatus,
										)}{" "}
									· {clinicPublicLookup.safeQuery || "без запроса"}
								</strong>
								<span>
									{humanizeMigrationText(clinicPublicLookup.nextAction)}
								</span>
							</div>
							<small className="clinic-public-boundary">
								{clinicPublicLookupBoundaryText}
							</small>
							{clinicPublicLookup.suggestions.length ? (
								<div className="clinic-public-suggestions">
									{typedClinicPublicLookupSuggestions
										.slice(0, 3)
										.map((suggestion, index) => (
											<article key={`${suggestion.source}-${index}`}>
												<strong>
													{clinicPublicLookupSuggestionSourceLabels[
														suggestion.source
													] ?? humanizeMigrationText(suggestion.source)}{" "}
													· {Math.round(suggestion.confidence * 100)}%
												</strong>
												<p>
													{clinicLookupSuggestionFieldEntries(suggestion.fields)
														.map(
															([key, value]) =>
																`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
														)
														.join(" · ")}
												</p>
												<small className="clinic-public-apply-summary">
													{clinicLookupSuggestionApplySummary(
														suggestion.fields,
													)}
												</small>
												<button
													className="text-button"
													type="button"
													disabled={
														!clinicLookupSuggestionFieldEntries(
															suggestion.fields,
														).length
													}
													onClick={() =>
														applyClinicLookupSuggestion(suggestion.fields)
													}
												>
													Подставить в профиль
												</button>
											</article>
										))}
								</div>
							) : null}
							<div className="clinic-public-targets">
								{typedClinicPublicLookupTargets.map((target) => (
									<a
										className="secondary-button"
										href={target.url}
										key={`${target.kind}:${target.title}`}
										target="_blank"
										rel="noreferrer noopener"
										aria-label={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
										title={`Открыть публичный источник реквизитов в новой вкладке: ${target.title}`}
									>
										<ExternalLink aria-hidden="true" /> {target.title}
									</a>
								))}
							</div>
							{clinicPublicLookup.warnings
								.slice(0, 3)
								.map((warning: string) => (
									<small key={warning}>
										{clinicPublicLookupWarningText(warning)}
									</small>
								))}
							<div className="clinic-public-save-row">
								<button
									className="secondary-button"
									type="button"
									data-testid="save-imports-clinic-profile"
									disabled={clinicProfileSaveState === "saving"}
									aria-busy={clinicProfileSaveState === "saving" || undefined}
									onClick={() => void saveClinicProfileFromDraft()}
								>
									<ShieldCheck aria-hidden="true" />{" "}
									{clinicProfileSaveButtonText}
								</button>
								<small>
									После подстановки сохраните профиль, иначе реквизиты не
									попадут в документы и платежные формы.
								</small>
							</div>
						</div>
					) : null}

					{typedSmartImportPreview ? (
						<div className="import-preview">
							<div className="import-stats">
								<span>{typedSmartImportPreview.totalLines} строк</span>
								<span>
									{typedSmartImportPreview.patientPreview.totalRows} пациентов
								</span>
								<span>
									{typedSmartImportPreview.imagingPreview.totalRows} снимков
								</span>
								<span>
									{typedSmartImportPreview.clinicSuggestion
										? Object.keys(
												typedSmartImportPreview.clinicSuggestion.fields,
											).length
										: 0}{" "}
									реквизитов
								</span>
								<span>
									{typedSmartImportPreview.legacySources.length} источников
								</span>
								<span>
									{
										typedSmartImportPreview.lineClassifications.filter(
											(row) => row.kind === "ignored",
										).length
									}{" "}
									пропущено
								</span>
							</div>
							<div className="import-actions">
								<button
									className="secondary-button"
									type="button"
									onClick={commitSmartImport}
									disabled={
										isSmartImportCommitting ||
										!smartImportInputReady ||
										(typedSmartImportPreview.patientPreview.readyRows === 0 &&
											typedSmartImportPreview.imagingPreview.readyRows === 0)
									}
									aria-busy={isSmartImportCommitting || undefined}
								>
									<CheckCircle2 aria-hidden="true" />{" "}
									{isSmartImportCommitting ? "Записываю" : "Записать готовые"}
								</button>
								{smartImportCommit ? (
									<span>
										Пациенты:{" "}
										{smartImportCommit.patientCommit?.importedCount ?? 0}.
										Снимки:{" "}
										{smartImportCommit.imagingCommit?.importedCount ?? 0}.
									</span>
								) : (
									<span>
										Применение сначала создаст новых пациентов, затем заново
										привяжет готовые снимки. Реквизиты клиники только
										подсказываются.
									</span>
								)}
							</div>
							{typedSmartImportPreview.migrationPlan ? (
								<div className="import-rows">
									{typedSmartImportPreview.migrationPlan.steps.map((step) => (
										<article
											className={`import-row import-${step.status === "blocked" ? "blocked" : step.status === "ready" ? "ready" : "warning"}`}
											key={step.id}
										>
											<strong>{step.title}</strong>
											<span>
												{smartImportMigrationPlanStatusLabels[step.status] ??
													humanizeMigrationText(step.status)}
											</span>
											<span>{step.detail}</span>
											<p>{humanizeMigrationText(step.nextAction)}</p>
										</article>
									))}
								</div>
							) : null}
							{typedSmartImportPreview.legacySources.length ? (
								<div className="import-rows">
									{typedSmartImportPreview.legacySources.map(
										(source, index) => (
											<article
												className={`import-row import-${source.automationLevel === "ready_for_preview" ? "ready" : source.automationLevel === "manual_review" ? "blocked" : "warning"}`}
												key={`${source.kind}:${source.sourceRef ?? index}`}
											>
												<strong>
													{source.title} · {Math.round(source.confidence * 100)}
													%
												</strong>
												<span>
													{migrationSourceKindLabel(source.kind)} ·{" "}
													{migrationAutomationLevelLabels[
														source.automationLevel
													] ?? humanizeMigrationText(source.automationLevel)}
												</span>
												{source.safeSourceAlias ? (
													<span>{source.safeSourceAlias}</span>
												) : null}
												<p>{humanizeMigrationText(source.recommendedRoute)}</p>
												<p>
													Нужно:{" "}
													{humanizeMigrationList(source.requiredArtifacts)}
												</p>
												{renderMigrationTechnicalNotes(
													"Технические границы источника",
													[source.privacy],
													"smart-import-legacy-source-privacy-notes",
												)}
											</article>
										),
									)}
								</div>
							) : null}
							{typedSmartImportPreview.clinicSuggestion ? (
								<div className="import-rows">
									<article className="import-row import-warning">
										<strong>
											Профиль клиники ·{" "}
											{Math.round(
												typedSmartImportPreview.clinicSuggestion.confidence *
													100,
											)}
											%
										</strong>
										<span>
											Строки:{" "}
											{typedSmartImportPreview.clinicSuggestion.sourceLineNumbers.join(
												", ",
											)}
										</span>
										<p>
											{clinicLookupSuggestionFieldEntries(
												typedSmartImportPreview.clinicSuggestion.fields,
											)
												.map(
													([key, value]) =>
														`${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value).trim()}`,
												)
												.join(" · ")}
										</p>
										<small className="clinic-public-apply-summary">
											{clinicLookupSuggestionApplySummary(
												typedSmartImportPreview.clinicSuggestion.fields,
											)}
										</small>
										{typedSmartImportPreview.clinicSuggestion.warnings
											.slice(0, 2)
											.map((warning: string) => (
												<small key={warning}>
													{clinicPublicLookupWarningText(warning)}
												</small>
											))}
										<button
											className="text-button"
											type="button"
											data-testid="apply-smart-import-clinic-profile"
											disabled={
												!clinicLookupSuggestionFieldEntries(
													typedSmartImportPreview.clinicSuggestion.fields,
												).length
											}
											onClick={() =>
												applyClinicLookupSuggestion(
													typedSmartImportPreview.clinicSuggestion?.fields ??
														{},
												)
											}
										>
											Подставить в профиль
										</button>
										<div className="clinic-public-save-row">
											<button
												className="secondary-button"
												type="button"
												data-testid="save-smart-import-clinic-profile"
												disabled={clinicProfileSaveState === "saving"}
												aria-busy={
													clinicProfileSaveState === "saving" || undefined
												}
												onClick={() => void saveClinicProfileFromDraft()}
											>
												<ShieldCheck aria-hidden="true" />{" "}
												{clinicProfileSaveButtonText}
											</button>
											<small>
												Подстановка меняет черновик. Для документов и оплат
												сохраните профиль клиники.
											</small>
										</div>
									</article>
									{typedSmartImportPreview.publicLookupTargets.map((target) => (
										<article
											className="import-row import-warning"
											key={`${target.kind}:${target.url}`}
										>
											<strong>{target.title}</strong>
											<span>{target.privacy}</span>
											<p>{humanizeMigrationText(target.nextAction)}</p>
											<a
												className="text-button"
												href={target.url}
												target="_blank"
												rel="noreferrer noopener"
												aria-label={`Открыть публичный источник в новой вкладке: ${target.title}`}
												title={`Открыть публичный источник в новой вкладке: ${target.title}`}
											>
												<ExternalLink aria-hidden="true" /> Открыть
											</a>
										</article>
									))}
								</div>
							) : null}
							<div className="import-rows">
								{typedSmartImportPreview.lineClassifications.map((row) => (
									<article
										className={`import-row import-${row.kind === "ignored" ? "warning" : "ready"}`}
										key={row.lineNumber}
									>
										<strong>
											{smartImportLineKindLabels[row.kind] ?? row.kind} ·{" "}
											{Math.round(row.confidence * 100)}%
										</strong>
										<span>Строка {row.lineNumber}</span>
										<span>{row.reason}</span>
										<p>{row.text}</p>
									</article>
								))}
							</div>
						</div>
					) : null}
				</section>
			) : null}

			{["imports", "sources"].includes(settingsTab) ? (
				<section
					className="import-studio imaging-import-studio"
					aria-label="Импорт снимков из внешних систем"
				>
					<div className="import-copy">
						<ImageIcon aria-hidden="true" />
						<div>
							<p className="eyebrow">Снимки и КТ</p>
							<h2>Снимки сначала проходят предпросмотр</h2>
							<p>
								Для RVG, ОПТГ, ТРГ, КТ, архивов снимков и папок обмена: вставь
								экспорт, таблицу, список файлов или текст из старой программы.
								Система сопоставит пациента, тип снимка, зуб, дату и путь к
								файлу до записи в карту.
							</p>
						</div>
					</div>

					<div
						className="import-source-grid imaging-source-grid"
						aria-label="Источник снимков"
					>
						{typedImagingSourceChoices.map((kind) => (
							<button
								className={`source-card ${imagingImportSourceKind === kind ? "active" : ""}`}
								type="button"
								key={kind}
								aria-pressed={imagingImportSourceKind === kind}
								onClick={() => {
									setImagingImportSourceKind(kind);
									setImagingImportPreview(null);
									setImagingImportCommit(null);
								}}
							>
								<strong>{imagingSourceLabels[kind]}</strong>
								<span>{imagingSourceDetails[kind]}</span>
							</button>
						))}
					</div>

					<div className="import-workbench">
						<div className="folder-scan-row">
							<label>
								Папка обмена на сервере
								<input
									data-testid="imaging-folder-path-input"
									value={imagingFolderPath}
									onChange={(event: TextInputChangeEvent) => {
										const nextFolderPath = event.target.value;
										setImagingFolderPath(nextFolderPath);
										if (
											nextFolderPath.trim() !==
											localImagingFolderDraft?.folderPath
										) {
											stageLocalImagingFolderRecovery(nextFolderPath, {
												origin: "manual",
											});
										}
										setImagingFolderScan(null);
										setDicomFolderSeriesScan(null);
										setDicomFolderWorkupPlan(null);
										setDicomFirstFramePreview(null);
										setDicomLocalFolderDiscovery(null);
										setLocalImagingOrganizer(null);
									}}
									onBlur={(event: TextInputChangeEvent) => {
										rememberLocalImagingFolder(event.target.value, {
											origin: "manual",
										});
									}}
									placeholder="C:\Images или D:\OPG"
								/>
							</label>
							<input
								ref={browserDirectoryInputRef}
								data-testid="browser-local-imaging-folder-input"
								type="file"
								multiple
								className="visually-hidden"
								onChange={(event: InputChangeEvent) =>
									void handleBrowserDirectoryInputChange(event.target.files)
								}
							/>
							<input
								ref={browserImagingFilesInputRef}
								data-testid="browser-local-imaging-files-input"
								type="file"
								multiple
								className="visually-hidden"
								accept={browserImagingFileInputAccept}
								onChange={(event: InputChangeEvent) =>
									void handleBrowserDirectoryInputChange(event.target.files)
								}
							/>
							<button
								className="secondary-button"
								type="button"
								data-testid="browser-pick-local-imaging-folder"
								onClick={() => void pickBrowserImagingFolder()}
								disabled={isBrowserImagingFolderPicking}
								title={
									browserDirectoryPickerAvailable
										? "Выбрать локальную папку КТ или снимков в браузере"
										: "Использовать запасной выбор файлов браузера для локальных снимков"
								}
							>
								<UploadCloud aria-hidden="true" />{" "}
								{isBrowserImagingFolderPicking ? "Сканирую" : "Папка КТ"}
							</button>
							<button
								className="secondary-button"
								type="button"
								data-testid="browser-pick-local-imaging-files"
								onClick={pickBrowserImagingFiles}
								disabled={isBrowserImagingFolderPicking}
								title="Выбрать отдельные DICOM, RVG, JPG/PNG/TIFF, ZIP/RAR/7z или 3D-файлы"
							>
								<FileText aria-hidden="true" /> Файлы
							</button>
							{isBrowserImagingFolderPicking && browserImagingScanProgress ? (
								<button
									className="secondary-button browser-scan-stop-button"
									type="button"
									data-testid="browser-cancel-local-imaging-folder-scan"
									onClick={cancelBrowserImagingFolderScan}
								>
									<CircleStop aria-hidden="true" /> Остановить
								</button>
							) : null}
							{isLocalDicomOperationActive ? (
								<button
									className="secondary-button browser-scan-stop-button"
									type="button"
									data-testid="cancel-local-dicom-operation"
									onClick={cancelLocalDicomOperation}
								>
									<CircleStop aria-hidden="true" /> Остановить КТ
								</button>
							) : null}
							<button
								className="secondary-button"
								type="button"
								onClick={scanImagingFolder}
								aria-describedby={
									!localImagingFolderReady
										? localDicomFolderGuidanceId
										: undefined
								}
								disabled={isImagingFolderScanning || !localImagingFolderReady}
							>
								<Search aria-hidden="true" />{" "}
								{isImagingFolderScanning ? "Сканирую" : "Сканировать папку"}
							</button>
							<button
								className="secondary-button"
								type="button"
								data-testid="find-local-dicom-folders"
								onClick={() => void discoverDicomFolders()}
								disabled={isDicomLocalDiscovering}
							>
								<ScanSearch aria-hidden="true" />{" "}
								{isDicomLocalDiscovering ? "Ищу" : "Найти снимки"}
							</button>
							<button
								className="secondary-button"
								type="button"
								data-testid="organize-local-imaging-sources"
								onClick={() => void organizeLocalImagingSources()}
								disabled={isLocalImagingOrganizing}
							>
								<Database aria-hidden="true" />{" "}
								{isLocalImagingOrganizing ? "Организую" : "Организовать КТ/3D"}
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={scanDicomFolderSeries}
								aria-describedby={
									!localImagingFolderReady
										? localDicomFolderGuidanceId
										: undefined
								}
								disabled={isImagingFolderScanning || !localImagingFolderReady}
							>
								<Layers3 aria-hidden="true" />{" "}
								{isImagingFolderScanning
									? "Читаю снимки"
									: "Метаданные снимков"}
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void buildDicomFolderWorkupPlan()}
								aria-describedby={
									!localImagingFolderReady
										? localDicomFolderGuidanceId
										: undefined
								}
								disabled={
									isDicomFolderWorkupPlanning || !localImagingFolderReady
								}
							>
								<Gauge aria-hidden="true" />{" "}
								{isDicomFolderWorkupPlanning ? "Готовлю" : "План КТ"}
							</button>
							<button
								className="secondary-button"
								type="button"
								data-testid="preview-dicom-first-frame"
								onClick={() => void previewDicomFirstFrame()}
								aria-describedby={
									!localImagingFolderReady
										? localDicomFolderGuidanceId
										: undefined
								}
								disabled={
									isDicomFirstFramePreviewing || !localImagingFolderReady
								}
							>
								<ImageIcon aria-hidden="true" />{" "}
								{isDicomFirstFramePreviewing ? "Открываю" : "Первый срез"}
							</button>
						</div>
						{!localImagingFolderReady ? (
							<p
								className="dicom-action-guidance local-dicom-guidance"
								id={localDicomFolderGuidanceId}
								role="status"
								aria-live="polite"
							>
								Укажите путь к локальной папке со снимками или выберите КТ через
								браузер, чтобы открыть первый срез.
							</p>
						) : null}
						{browserImagingScanProgress ? (
							<div
								className={`browser-imaging-scan-progress ${browserImagingScanProgress.phase}`}
								data-testid="browser-imaging-scan-progress"
								role="status"
								aria-live="polite"
							>
								<div className="browser-picked-folder-head">
									<div>
										<strong>
											{browserImagingScanProgress.phase === "cancelled"
												? "Сканирование остановлено"
												: browserImagingScanProgress.phase === "done"
													? "Папка проверена"
													: "Браузер проверяет КТ/3D"}
										</strong>
										<span>
											{browserImagingScanProgress.currentItem ??
												"Интерфейс остается доступным: обработка идет короткими порциями."}
										</span>
									</div>
									{browserImagingScanProgress.phase === "scanning" ? (
										<button
											className="text-button"
											type="button"
											data-testid="browser-cancel-local-imaging-folder-scan-inline"
											onClick={cancelBrowserImagingFolderScan}
										>
											Остановить
										</button>
									) : null}
								</div>
								<div className="browser-picked-folder-stats">
									<span>
										файлов: {browserImagingScanProgress.scannedFiles}/
										{browserImagingScanProgress.fileLimit}
									</span>
									<span>
										папок: {browserImagingScanProgress.scannedFolders}/
										{browserImagingScanProgress.folderLimit}
									</span>
									<span>
										похоже на снимки:{" "}
										{browserImagingScanProgress.dicomLikeFiles}
									</span>
									<span>
										3D-моделей: {browserImagingScanProgress.modelFiles}
									</span>
									<span>
										архивов: {browserImagingScanProgress.archiveFiles}
									</span>
									<span>
										{formatByteSize(browserImagingScanProgress.totalBytes)}
									</span>
									<span>
										сигнатур: до {browserImagingScanProgress.magicReadLimit}
									</span>
									<span>
										шагов: {browserImagingScanProgress.processedUnits}
									</span>
									<span>
										время:{" "}
										{formatBrowserImagingScanElapsed(
											browserImagingScanProgress.elapsedMs,
										)}
									</span>
								</div>
								<small>
									Начато {formatTime(browserImagingScanProgress.startedAt)} ·
									обновлено {formatTime(browserImagingScanProgress.updatedAt)}
								</small>
							</div>
						) : null}
						{localImagingFolderDraft ? (
							<div
								className="local-imaging-folder-recovery"
								data-testid="local-imaging-folder-recovery"
							>
								<div>
									<strong>{localImagingFolderDraft.safeDisplayName}</strong>
									<span>
										папка восстановлена:{" "}
										{humanizeMigrationText(localImagingFolderDraft.sourceLabel)}{" "}
										· сохранено {formatTime(localImagingFolderDraft.savedAt)}
									</span>
								</div>
								<button
									className="text-button"
									type="button"
									onClick={clearLocalImagingFolderRecovery}
								>
									Очистить
								</button>
							</div>
						) : null}
						{browserPickedImagingFolder ? (
							<div
								className="browser-picked-folder-result"
								data-testid="browser-picked-imaging-folder-result"
								aria-label="Предпросмотр локальной папки снимков браузера"
							>
								<div className="browser-picked-folder-head">
									<div>
										<strong>
											{browserPickedImagingFolder.safeDisplayName}
										</strong>
										<span>
											{humanizeMigrationText(
												browserPickedImagingFolder.sourceLabel,
											)}{" "}
											· метка папки{" "}
											{browserPickedImagingFolder.folderFingerprint} ·{" "}
											{formatTime(browserPickedImagingFolder.createdAt)}
										</span>
									</div>
									<button
										className="text-button"
										type="button"
										onClick={clearBrowserPickedImagingFolderPreview}
									>
										Очистить
									</button>
								</div>
								<div className="browser-picked-folder-stats">
									<span>файлов: {browserPickedImagingFolder.scannedFiles}</span>
									<span>
										папок: {browserPickedImagingFolder.scannedFolders}
									</span>
									<span>
										похоже на снимки:{" "}
										{browserPickedImagingFolder.dicomLikeFiles}
									</span>
									<span>
										архивов: {browserPickedImagingFolder.archiveFiles}
									</span>
									<span>
										3D-моделей: {browserPickedImagingFolder.modelFiles}
									</span>
									<span>
										{formatByteSize(browserPickedImagingFolder.totalBytes)}
									</span>
								</div>
								<p>
									{humanizeMigrationText(browserPickedImagingFolder.nextAction)}
								</p>
								{(browserPickedImagingFolder.warnings as string[])
									.slice(0, 3)
									.map((warning) => (
										<small key={warning}>
											{humanizeMigrationText(warning)}
										</small>
									))}
							</div>
						) : null}
						{typedDicomLocalFolderDiscovery ? (
							<div
								className="dicom-discovery-result"
								data-testid="local-dicom-discovery-result"
								aria-label="Поиск локальной папки снимков"
							>
								<div className="dicom-discovery-head">
									<strong>
										Найдено кандидатов:{" "}
										{typedDicomLocalFolderDiscovery.candidates.length} /
										просканировано папок:{" "}
										{typedDicomLocalFolderDiscovery.scannedFolders}
									</strong>
									<span>
										{humanizeMigrationText(
											typedDicomLocalFolderDiscovery.nextAction,
										)}
									</span>
								</div>
								<div className="dicom-discovery-grid">
									{typedDicomLocalFolderDiscovery.candidates
										.slice(0, 6)
										.map((candidate) => (
											<article key={candidate.folderPath}>
												<strong>{candidate.safeDisplayName}</strong>
												<span>
													{humanizeMigrationText(candidate.sourceLabel)} · метка
													папки {candidate.folderFingerprint.toUpperCase()} ·
													вложенность {candidate.depth}
												</span>
												<span>
													Путь к папке и имена, похожие на данные пациента,
													скрыты до выбора
												</span>
												<small>
													{Math.round(candidate.confidence * 100)}% / снимков{" "}
													{candidate.dicomLikeFiles} / архивов{" "}
													{candidate.archivesFound}
												</small>
												<button
													className="text-button"
													type="button"
													onClick={() => {
														rememberLocalImagingFolder(candidate.folderPath, {
															safeDisplayName: candidate.safeDisplayName,
															sourceLabel: candidate.sourceLabel,
															sourceKind: candidate.sourceKind,
															folderFingerprint: candidate.folderFingerprint,
															origin: "discovery",
														});
														setDicomFolderSeriesScan(null);
														setDicomFolderWorkupPlan(null);
														setDicomFirstFramePreview(null);
														setImagingFolderScan(null);
														setLocalImagingOrganizer(null);
													}}
												>
													Выбрать папку
												</button>
												<button
													className="text-button"
													type="button"
													data-testid="prepare-dicom-discovery-workbench"
													disabled={
														isDicomFolderWorkupPlanning ||
														isDicomWorkbenchBuilding
													}
													onClick={() =>
														void prepareDicomWorkbenchFromFolder(
															candidate.folderPath,
															"dicom_discovery_quick_workbench",
															{
																safeDisplayName: candidate.safeDisplayName,
																sourceLabel: candidate.sourceLabel,
																sourceKind: candidate.sourceKind,
																folderFingerprint: candidate.folderFingerprint,
																origin: "discovery",
															},
														)
													}
												>
													Подготовить КТ
												</button>
												<button
													className="text-button"
													type="button"
													data-testid="preview-dicom-discovery-first-frame"
													disabled={isDicomFirstFramePreviewing}
													onClick={() => {
														rememberLocalImagingFolder(candidate.folderPath, {
															safeDisplayName: candidate.safeDisplayName,
															sourceLabel: candidate.sourceLabel,
															sourceKind: candidate.sourceKind,
															folderFingerprint: candidate.folderFingerprint,
															origin: "discovery",
														});
														void previewDicomFirstFrame(candidate.folderPath, {
															safeDisplayName: candidate.safeDisplayName,
															sourceLabel: candidate.sourceLabel,
															sourceKind: candidate.sourceKind,
															folderFingerprint: candidate.folderFingerprint,
															origin: "discovery",
														});
													}}
												>
													Первый срез
												</button>
											</article>
										))}
								</div>
								{typedDicomLocalFolderDiscovery.warnings
									.slice(0, 4)
									.map((warning) => (
										<small key={warning}>
											{humanizeMigrationText(warning)}
										</small>
									))}
							</div>
						) : null}
						{typedLocalImagingOrganizer ? (
							<div
								className="local-imaging-organizer-result"
								data-testid="local-imaging-organizer-result"
								aria-label="Органайзер локальных снимков"
							>
								<div className="dicom-discovery-head">
									<strong>
										Органайзер: кейсов {typedLocalImagingOrganizer.cases.length}{" "}
										/ просканировано папок{" "}
										{typedLocalImagingOrganizer.scannedFolders}
									</strong>
									<span>
										{humanizeMigrationText(
											typedLocalImagingOrganizer.nextAction,
										)}
									</span>
								</div>
								<div className="local-imaging-case-grid">
									{typedLocalImagingOrganizer.cases
										.slice(0, 6)
										.map((caseItem) => (
											<article
												className={`local-imaging-case local-action-${caseItem.recommendedAction}`}
												key={caseItem.id}
											>
												<div>
													<strong>{caseItem.safeDisplayName}</strong>
													<span>
														{humanizeMigrationText(caseItem.sourceLabel)} ·
														метка папки{" "}
														{caseItem.folderFingerprint.toUpperCase()}
													</span>
													<span>
														Путь к папке и имена, похожие на данные пациента,
														скрыты до выбора
													</span>
												</div>
												<div className="local-imaging-case-metrics">
													<span>
														{Math.round(caseItem.combinedConfidence * 100)}%
													</span>
													<span>{caseItem.dicomLikeFiles} снимков</span>
													<span>{caseItem.modelFiles} 3D</span>
													<span>архивов: {caseItem.archiveFiles}</span>
												</div>
												<small>
													{
														localImagingOrganizerActionLabels[
															caseItem.recommendedAction
														]
													}
												</small>
												{caseItem.modelCandidates.length ? (
													<div className="local-imaging-model-list">
														{caseItem.modelCandidates
															.slice(0, 3)
															.map((model) => (
																<span key={`${caseItem.id}-${model.filePath}`}>
																	{model.format.toUpperCase()} ·{" "}
																	{localImagingModelRoleLabels[model.role] ??
																		model.role}{" "}
																	· {Math.round(model.confidence * 100)}%
																</span>
															))}
													</div>
												) : null}
												{caseItem.modelWorkbenchManifest.totalModels > 0 ? (
													<div className="local-imaging-model-workbench">
														<strong>
															{localImagingModelWorkbenchTargetLabels[
																caseItem.modelWorkbenchManifest
																	.recommendedTarget
															] ??
																caseItem.modelWorkbenchManifest
																	.recommendedTarget}{" "}
															· КТ-поверхностей{" "}
															{caseItem.modelWorkbenchManifest.ctSurfaceModels}{" "}
															· до{" "}
															{caseItem.modelWorkbenchManifest.largestModelMb}{" "}
															МБ
														</strong>
														{caseItem.modelWorkbenchManifest.items
															.slice(0, 3)
															.map((item) => (
																<span
																	key={`${caseItem.id}-workbench-${item.fileName}`}
																>
																	{localImagingModelRoleLabels[item.role] ??
																		item.role}
																	:{" "}
																	{localImagingModelWorkbenchTargetLabels[
																		item.loadTarget
																	] ?? item.loadTarget}{" "}
																	· {item.sizeMb} МБ
																</span>
															))}
														<small>
															{caseItem.modelWorkbenchManifest.nextAction}
														</small>
													</div>
												) : null}
												<button
													className="text-button"
													type="button"
													onClick={() => {
														rememberLocalImagingFolder(caseItem.folderPath, {
															safeDisplayName: caseItem.safeDisplayName,
															sourceLabel: caseItem.sourceLabel,
															sourceKind: caseItem.sourceKind,
															folderFingerprint: caseItem.folderFingerprint,
															origin: "organizer",
														});
														setDicomFolderSeriesScan(null);
														setDicomFolderWorkupPlan(null);
														setDicomFirstFramePreview(null);
														setImagingFolderScan(null);
														setDicomLocalFolderDiscovery(null);
													}}
												>
													Выбрать папку
												</button>
												{caseItem.recommendedAction !== "review_3d_models" ? (
													<button
														className="text-button"
														type="button"
														data-testid="prepare-local-dicom-workbench"
														disabled={
															isDicomFolderWorkupPlanning ||
															isDicomWorkbenchBuilding
														}
														onClick={() =>
															void prepareDicomWorkbenchFromFolder(
																caseItem.folderPath,
																"local_organizer_quick_workbench",
																{
																	safeDisplayName: caseItem.safeDisplayName,
																	sourceLabel: caseItem.sourceLabel,
																	sourceKind: caseItem.sourceKind,
																	folderFingerprint: caseItem.folderFingerprint,
																	origin: "organizer",
																},
															)
														}
													>
														Подготовить КТ
													</button>
												) : null}
												{caseItem.dicomLikeFiles > 0 ? (
													<button
														className="text-button"
														type="button"
														data-testid="preview-local-dicom-first-frame"
														disabled={isDicomFirstFramePreviewing}
														onClick={() => {
															rememberLocalImagingFolder(caseItem.folderPath, {
																safeDisplayName: caseItem.safeDisplayName,
																sourceLabel: caseItem.sourceLabel,
																sourceKind: caseItem.sourceKind,
																folderFingerprint: caseItem.folderFingerprint,
																origin: "organizer",
															});
															void previewDicomFirstFrame(caseItem.folderPath, {
																safeDisplayName: caseItem.safeDisplayName,
																sourceLabel: caseItem.sourceLabel,
																sourceKind: caseItem.sourceKind,
																folderFingerprint: caseItem.folderFingerprint,
																origin: "organizer",
															});
														}}
													>
														Первый срез
													</button>
												) : null}
											</article>
										))}
								</div>
								{typedLocalImagingOrganizer.warnings
									.slice(0, 4)
									.map((warning) => (
										<small key={warning}>
											{humanizeMigrationText(warning)}
										</small>
									))}
							</div>
						) : null}
						{typedImagingFolderScan ? (
							<div className="recognition-notes">
								<span>
									Найдено файлов: {typedImagingFolderScan.filesFound}. В
									предпросмотре: {typedImagingFolderScan.preview.totalRows}.
								</span>
								{typedImagingFolderScan.warnings.map((warning) => (
									<span key={warning}>{humanizeMigrationText(warning)}</span>
								))}
							</div>
						) : null}
						{typedDicomFolderSeriesScan ? (
							<div className="recognition-notes">
								<span>
									Метаданные снимков: файлов{" "}
									{typedDicomFolderSeriesScan.filesFound}, прочитано{" "}
									{typedDicomFolderSeriesScan.filesParsed}, строк метаданных{" "}
									{typedDicomFolderSeriesScan.metadataRows}, серий{" "}
									{typedDicomFolderSeriesScan.preview.totalSeries}.
								</span>
								{typedDicomFolderSeriesScan.warnings
									.slice(0, 5)
									.map((warning) => (
										<span key={warning}>{humanizeMigrationText(warning)}</span>
									))}
							</div>
						) : null}
						{typedDicomFolderWorkupPlan ? (
							<div
								className="dicom-folder-workup-result"
								aria-label="План разбора папки снимков"
							>
								<div className="dicom-folder-workup-head">
									<strong>
										План: серий {typedDicomFolderWorkupPlan.selectedSeriesCount}{" "}
										/ файлов {typedDicomFolderWorkupPlan.folder.filesParsed}
									</strong>
									<span>
										{humanizeMigrationText(
											typedDicomFolderWorkupPlan.nextAction,
										)}
									</span>
								</div>
								<div className="dicom-folder-workup-plans">
									{typedDicomFolderWorkupPlan.plans.slice(0, 4).map((plan) => (
										<article
											className={`workup-${plan.recommendedPath}`}
											key={plan.series.id}
										>
											<strong>
												{dicomFolderWorkupPathLabels[plan.recommendedPath]}
											</strong>
											<span>
												{plan.series.modality ?? "тип не указан"} / файлов{" "}
												{plan.series.fileCount} / готовность{" "}
												{plan.readiness.readinessScore}%
											</span>
											<small>
												{dicomLabel(
													dicomTextureStrategyLabels,
													plan.renderCachePlan.textureStrategy,
													"план загрузки",
												)}{" "}
												/ первый показ {plan.renderCachePlan.firstPaintBudgetMs}{" "}
												мс / память {plan.renderCachePlan.gpuMemoryBudgetMb} МБ
											</small>
											<small>{humanizeMigrationText(plan.nextAction)}</small>
										</article>
									))}
								</div>
								{typedDicomFolderWorkupPlan.warnings
									.slice(0, 4)
									.map((warning) => (
										<small key={warning}>
											{humanizeMigrationText(warning)}
										</small>
									))}
							</div>
						) : null}
						{dicomFirstFramePreview ? (
							<div
								className={`dicom-first-frame-preview preview-${dicomFirstFramePreview.status}`}
								data-testid="dicom-first-frame-preview-result"
								aria-label="Предпросмотр первого среза снимков"
							>
								<div className="dicom-first-frame-head">
									<div>
										<strong>
											Первый срез: только ориентация, не диагностика:{" "}
											{dicomFirstFrameStatusLabels[
												dicomFirstFramePreview.status
											] ?? dicomFirstFramePreview.status}
										</strong>
										<span>
											{dicomFirstFramePreview.sourceWidth &&
											dicomFirstFramePreview.sourceHeight
												? `${dicomFirstFramePreview.sourceWidth}x${dicomFirstFramePreview.sourceHeight}`
												: "Нет кадра снимка"}{" "}
											/{" "}
											{dicomFirstFrameFileFormatLabel(
												dicomFirstFramePreview.transferSyntaxUid,
											)}
										</span>
									</div>
									<small>{dicomFirstFramePreview.nextAction}</small>
								</div>
								{dicomFirstFramePreview.imageDataUrl ? (
									<>
										<div
											className="dicom-first-frame-tools"
											aria-label="Инструменты предпросмотра первого среза"
										>
											<button
												className="viewer-tool-button"
												type="button"
												title="Повернуть влево"
												aria-label="Повернуть первый срез влево"
												onClick={() =>
													updateDicomFirstFrameViewerState((state) => ({
														...state,
														rotationDeg: state.rotationDeg - 90,
													}))
												}
											>
												<RotateCcw aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Повернуть вправо"
												aria-label="Повернуть первый срез вправо"
												onClick={() =>
													updateDicomFirstFrameViewerState((state) => ({
														...state,
														rotationDeg: state.rotationDeg + 90,
													}))
												}
											>
												<RotateCw aria-hidden="true" />
											</button>
											<button
												className={`viewer-tool-button ${typedDicomFirstFrameViewerState.flipHorizontal ? "active" : ""}`}
												type="button"
												title="Отразить"
												aria-label="Отразить первый срез"
												aria-pressed={
													typedDicomFirstFrameViewerState.flipHorizontal
												}
												onClick={() =>
													updateDicomFirstFrameViewerState((state) => ({
														...state,
														flipHorizontal: !state.flipHorizontal,
													}))
												}
											>
												<FlipHorizontal aria-hidden="true" />
											</button>
											<button
												className={`viewer-tool-button ${typedDicomFirstFrameViewerState.inverted ? "active" : ""}`}
												type="button"
												title="Инвертировать"
												aria-label="Инвертировать первый срез"
												aria-pressed={typedDicomFirstFrameViewerState.inverted}
												onClick={() =>
													updateDicomFirstFrameViewerState((state) => ({
														...state,
														inverted: !state.inverted,
													}))
												}
											>
												+/-
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Уменьшить"
												aria-label="Уменьшить первый срез"
												onClick={() =>
													updateDicomFirstFrameViewerState((state) => ({
														...state,
														zoom: Math.max(0.7, state.zoom - 0.1),
													}))
												}
											>
												<ZoomOut aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Увеличить"
												aria-label="Увеличить первый срез"
												onClick={() =>
													updateDicomFirstFrameViewerState((state) => ({
														...state,
														zoom: Math.min(2.2, state.zoom + 0.1),
													}))
												}
											>
												<ZoomIn aria-hidden="true" />
											</button>
											<button
												className="viewer-tool-button"
												type="button"
												title="Сбросить"
												aria-label="Сбросить инструменты первого среза"
												onClick={() =>
													setDicomFirstFrameViewerState(
														typedDefaultDicomFirstFrameViewerState,
													)
												}
											>
												<RefreshCw aria-hidden="true" />
											</button>
										</div>
										{dicomFirstFrameSelectableCount > 1 &&
										typeof dicomFirstFrameCurrentIndex === "number" ? (
											<div
												className="dicom-first-frame-slice-controls"
												data-testid="dicom-first-frame-slice-controls"
											>
												<button
													className="viewer-tool-button"
													type="button"
													title="Предыдущий срез"
													aria-label="Показать предыдущий срез снимков"
													disabled={!dicomFirstFrameCanSelectPrevious}
													onClick={() =>
														previewDicomFirstFrameSlice(
															dicomFirstFrameCurrentIndex - 1,
														)
													}
												>
													<ChevronLeft aria-hidden="true" />
												</button>
												<label>
													<span>
														Срез {dicomFirstFrameCurrentIndex + 1} /{" "}
														{dicomFirstFrameSelectableCount}
													</span>
													<input
														aria-label="Выбрать срез снимков"
														type="range"
														min="0"
														max={dicomFirstFrameSliceMaxIndex}
														step="1"
														value={dicomFirstFrameCurrentIndex}
														disabled={isDicomFirstFramePreviewing}
														onChange={(event: InputChangeEvent) =>
															previewDicomFirstFrameSlice(
																Number(event.target.value),
															)
														}
													/>
												</label>
												<button
													className="viewer-tool-button"
													type="button"
													title="Следующий срез"
													aria-label="Показать следующий срез снимков"
													disabled={!dicomFirstFrameCanSelectNext}
													onClick={() =>
														previewDicomFirstFrameSlice(
															dicomFirstFrameCurrentIndex + 1,
														)
													}
												>
													<ChevronRight aria-hidden="true" />
												</button>
												{dicomFirstFrameLandmarkSlices.length ? (
													<div
														className="dicom-first-frame-slice-presets"
														data-testid="dicom-first-frame-slice-presets"
														aria-label="Быстрые срезы снимков"
													>
														{dicomFirstFrameLandmarkSlices.map(
															({ label, targetIndex }) => (
																<button
																	className={
																		dicomFirstFrameCurrentIndex === targetIndex
																			? "active"
																			: ""
																	}
																	type="button"
																	key={`${label}-${targetIndex}`}
																	title={`Показать ${label}: срез ${targetIndex + 1}`}
																	aria-label={`Показать опорный срез снимков ${label}: ${targetIndex + 1} из ${dicomFirstFrameSelectableCount}`}
																	disabled={
																		isDicomFirstFramePreviewing ||
																		dicomFirstFrameCurrentIndex === targetIndex
																	}
																	onClick={() =>
																		previewDicomFirstFrameSlice(targetIndex)
																	}
																>
																	{label}
																	<small>{targetIndex + 1}</small>
																</button>
															),
														)}
													</div>
												) : null}
											</div>
										) : null}
										<div className="dicom-first-frame-sliders">
											<label>
												Яркость
												<input
													min="0.65"
													max="1.6"
													step="0.05"
													type="range"
													value={typedDicomFirstFrameViewerState.brightness}
													onChange={(event) =>
														updateDicomFirstFrameViewerNumber(
															"brightness",
															event,
														)
													}
												/>
											</label>
											<label>
												Контраст
												<input
													min="0.75"
													max="1.8"
													step="0.05"
													type="range"
													value={typedDicomFirstFrameViewerState.contrast}
													onChange={(event) =>
														updateDicomFirstFrameViewerNumber("contrast", event)
													}
												/>
											</label>
										</div>
										<div className="dicom-first-frame-image-wrap">
											<img
												src={dicomFirstFramePreview.imageDataUrl}
												alt="Предпросмотр ориентации первого среза снимков"
												decoding="async"
												style={dicomFirstFrameImageStyle}
											/>
										</div>
									</>
								) : null}
								<div className="dicom-first-frame-facts">
									<span>
										{dicomFirstFrameImageTypeLabel(
											dicomFirstFramePreview.photometricInterpretation,
										)}
									</span>
									<span>
										{dicomFirstFramePreview.bitsAllocated
											? `глубина ${dicomFirstFramePreview.bitsAllocated} бит`
											: "глубина не указана"}
									</span>
									<span>
										исходная яркость: центр{" "}
										{Math.round(dicomFirstFramePreview.windowCenter ?? 0)} /
										диапазон{" "}
										{Math.round(dicomFirstFramePreview.windowWidth ?? 0)}
									</span>
									{typeof dicomFirstFrameCurrentIndex === "number" &&
									dicomFirstFrameSelectableCount > 0 ? (
										<span>
											срез {dicomFirstFrameCurrentIndex + 1}/
											{dicomFirstFrameSelectableCount}
										</span>
									) : null}
									<span>не сохранено</span>
									<span>только инструменты предпросмотра</span>
								</div>
								{typedDicomFirstFramePreview?.warnings
									.slice(0, 4)
									.map((warning: string) => (
										<small key={warning}>{warning}</small>
									))}
							</div>
						) : null}
						<textarea
							aria-label="Данные импорта снимков"
							value={imagingImportText}
							onChange={(event: TextInputChangeEvent) => {
								setImagingImportText(event.target.value);
								setImagingImportPreview(null);
								setImagingImportCommit(null);
								setDicomSeriesPreview(null);
								setDicomFolderSeriesScan(null);
								setDicomFolderWorkupPlan(null);
							}}
						/>
						<div className="import-tool-row">
							<button
								className="secondary-button"
								type="button"
								onClick={() => {
									setImagingImportSourceKind("dicom_file");
									setImagingImportText(
										"Пациент;Телефон;Модальность;КодИсследования;КодСерии;НомерСреза;ОписаниеСерии;Дата;Путь\nИванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;1;КТ нижней челюсти;12.05.2026;D:\\\\KLKT\\\\ivanova_2026_05_12\\\\IMG0001.dcm\nИванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;2;КТ нижней челюсти;12.05.2026;D:\\\\KLKT\\\\ivanova_2026_05_12\\\\IMG0002.dcm\nИванова Марина Сергеевна;+7 927 111-22-33;ТРГ;1.2.643.5.1.20260510.7;1.2.643.5.1.20260510.7.1;1;боковая ТРГ;10.05.2026;D:\\\\CEPH\\\\ivanova_ceph.ima\nПетров Алексей Николаевич;+7 927 555-19-40;ОПТГ;1.2.643.5.1.20260510.9;1.2.643.5.1.20260510.9.1;1;панорамный снимок;10.05.2026;D:\\\\OPG\\\\petrov_opg.png",
									);
									setImagingImportPreview(null);
									setImagingImportCommit(null);
									setDicomSeriesPreview(null);
									setDicomFolderSeriesScan(null);
									setDicomFolderWorkupPlan(null);
								}}
							>
								<FileCheck2 aria-hidden="true" /> Пример КТ/ОПТГ/ТРГ
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={() => void previewDicomSeries()}
								disabled={
									isDicomSeriesPreviewLoading || !imagingImportInputReady
								}
							>
								<Layers3 aria-hidden="true" />{" "}
								{isDicomSeriesPreviewLoading ? "Группирую" : "Проверить серии"}
							</button>
							<button
								className="primary-button"
								type="button"
								onClick={previewImagingImport}
								disabled={isImagingImportLoading || !imagingImportInputReady}
								aria-busy={isImagingImportLoading || undefined}
							>
								<UploadCloud aria-hidden="true" />{" "}
								{isImagingImportLoading ? "Проверяю" : "Проверить снимки"}
							</button>
						</div>
						{!imagingImportInputReady ? (
							<p
								className="import-empty-guidance"
								role="status"
								aria-live="polite"
							>
								Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ
								перед проверкой.
							</p>
						) : null}
					</div>

					{dicomSeriesPreview ? (
						<div className="dicom-series-result">
							<div className="dicom-series-stats">
								<span>{dicomSeriesPreview.totalRows} файлов</span>
								<span>{dicomSeriesPreview.totalSeries} серий</span>
								<span>{dicomSeriesPreview.readySeries} готово</span>
								<span>{dicomSeriesPreview.warningSeries} предупреждения</span>
								<span>{dicomSeriesPreview.blockedSeries} нужно действие</span>
							</div>
							<div className="dicom-series-list">
								{typedDicomSeriesPreviewSeries.slice(0, 6).map((series) => (
									<article
										className={`dicom-series-row dicom-series-${series.status}`}
										key={series.id}
									>
										<div>
											<strong>{series.patientName ?? "Пациент ?"}</strong>
											<span>
												{series.kind
													? imagingKindLabels[series.kind]
													: "тип не указан"}{" "}
												· {series.modality ?? "модальность не указана"} ·{" "}
												{series.fileCount} файлов
											</span>
										</div>
										<div>
											<span>
												{importRowStatusLabels[series.status] ?? series.status}{" "}
												· {dicomSeriesViewerLabels[series.recommendedViewer]}
											</span>
											<small>
												{series.mprReadiness.recommendedLayout} ·{" "}
												{series.mprReadiness.canOpenMpr
													? "предпросмотр КТ-срезов готов"
													: series.mprReadiness.nextAction}
											</small>
											<small className="dicom-series-resource">
												{
													mprLoadStrategyLabels[
														series.mprReadiness.resourcePolicy.loadStrategy
													]
												}{" "}
												/ {series.mprReadiness.resourcePolicy.estimatedMemoryMb}{" "}
												МБ /{" "}
												{
													mprResourceTierLabels[
														series.mprReadiness.resourcePolicy.requiredTier
													]
												}
											</small>
											<small>{dicomSeriesDisplayText(series)}</small>
										</div>
										<p>{dicomSeriesWarningText(series.warnings)}</p>
									</article>
								))}
							</div>
						</div>
					) : null}

					{typedImagingImportPreview ? (
						<div className="import-preview">
							<div className="import-stats">
								<span>{typedImagingImportPreview.totalRows} строк</span>
								<span>{typedImagingImportPreview.readyRows} готово</span>
								<span>
									{typedImagingImportPreview.warningRows} предупреждения
								</span>
								<span>
									{typedImagingImportPreview.blockedRows} к исправлению
								</span>
							</div>
							<div className="import-actions">
								<button
									className="secondary-button"
									type="button"
									onClick={commitImagingImport}
									disabled={
										isImagingImportCommitting ||
										!imagingImportInputReady ||
										typedImagingImportPreview.readyRows === 0
									}
									aria-busy={isImagingImportCommitting || undefined}
								>
									<CheckCircle2 aria-hidden="true" />{" "}
									{isImagingImportCommitting
										? "Записываю"
										: "Привязать готовые"}
								</button>
								{imagingImportCommit ? (
									<span>
										Привязано: {imagingImportCommit.importedCount}. Пропущено:{" "}
										{imagingImportCommit.skippedCount}.
									</span>
								) : (
									<span>
										В карту попадут только строки с найденным пациентом, типом
										снимка и путем к файлу.
									</span>
								)}
							</div>
							<div className="import-rows">
								{typedImagingImportPreview.rows.map((row) => (
									<article
										className={`import-row import-${row.status}`}
										key={row.rowNumber}
									>
										<strong>
											{row.patientName ?? `Строка ${row.rowNumber}`}
										</strong>
										<span>
											{importRowStatusLabels[row.status] ?? row.status}
										</span>
										<span>
											{row.kind ? imagingKindLabels[row.kind] : "тип не найден"}
										</span>
										<span>
											{row.toothCode ?? row.region ?? "область не найдена"}
										</span>
										<p>
											{imagingImportRowWarningText(row.warnings, row.filePath)}
										</p>
									</article>
								))}
							</div>
						</div>
					) : null}
				</section>
			) : null}
			{settingsTab === "imports" ? (
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
								Здесь живут таблицы, Excel, экспорт старых МИС, OCR с фото
								бумажного журнала, диктовка и свободный текст. В базу ничего не
								пишется без подтверждения.
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
									Сначала извлечь текст и таблицы, потом отправить в
									предпросмотр. Без прямой записи в базу.
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
							<span>
								{isDocumentIngesting ? "Разбираю файл" : "Выбрать файл"}
							</span>
							<small>
								До 8 МБ. Архивы и Office-файлы разбираются встроенным
								извлекателем; PDF без OCR работает в ограниченном режиме.
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
										{documentDetectedKindLabel(
											typedDocumentIngestion.detectedKind,
										)}
									</span>
									<span>{typedDocumentIngestion.rowCount} строк</span>
									<span>{typedDocumentIngestion.tableCount} таблиц</span>
									<span>
										{Math.round(typedDocumentIngestion.byteSize / 1024)} КБ
									</span>
									<span>
										{typedDocumentIngestion.extractedFiles.length} файлов
									</span>
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
											{Math.round(
												typedDocumentIngestion.quality.confidence * 100,
											)}
											% ·{" "}
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
													<span key={signal}>
														{humanizeMigrationText(signal)}
													</span>
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
								<p>
									{typedDocumentIngestion.textPreview || "Текст не извлечен"}
								</p>
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
							<p
								className="import-empty-guidance"
								role="status"
								aria-live="polite"
							>
								Вставьте список пациентов, OCR журнала или надиктуйте импорт
								перед проверкой.
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
										<span>
											{importRowStatusLabels[row.status] ?? row.status}
										</span>
										<span>{row.phone ?? "нет телефона"}</span>
										<span>{row.birthDate ?? "нет даты"}</span>
										<p>
											{patientImportRowWarningText(row.warnings, row.notes)}
										</p>
									</article>
								))}
							</div>
						</div>
					) : null}
				</section>
			) : null}
		</>
	);
}

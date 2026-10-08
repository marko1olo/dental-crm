import type {
	DicomViewerWorkbenchManifestResponse,
	ImagingSourceKind,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerSessionState,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import type { CSSProperties } from "react";
import type { MprProjection, MprWindowPreset } from "../imagingUiLabels";

export const imagingSourceLabels: Record<ImagingSourceKind, string> = {
	manual_upload: "Файл",
	dicom_file: "КТ/серия",
	dicomweb: "Архив снимков",
	pacs: "Архив снимков",
	twain_wia: "TWAIN/WIA",
	sensor_bridge: "Датчик",
	folder_watch: "Папка",
	hot_folder: "Hot Folder",
	dicom_worklist: "DICOM Worklist",
};

export const defaultDicomFirstFrameViewerState: ImagingViewerState = {
	rotationDeg: 0,
	flipHorizontal: false,
	inverted: false,
	brightness: 1,
	contrast: 1,
	zoom: 1,
	panX: 0,
	panY: 0,
	projection: "axial",
	preset: "bone",
};

export const defaultImagingViewerState: ImagingViewerState = {
	rotationDeg: 0,
	flipHorizontal: false,
	inverted: false,
	brightness: 1,
	contrast: 1.08,
	zoom: 1,
	panX: 0,
	panY: 0,
	projection: "axial",
	preset: "bone",
};

export type ImagingViewerState = {
	rotationDeg: number;
	flipHorizontal: boolean;
	inverted: boolean;
	brightness: number;
	contrast: number;
	zoom: number;
	panX: number;
	panY: number;
	projection: MprProjection;
	preset: MprWindowPreset;
};

export type ImagingViewerPlan = {
	label: string;
	mode: "two_d" | "ceph" | "cbct_mpr" | "photo";
	primaryTools: string[];
	presets: string[];
	nextAction: string;
	warnings: string[];
};

export type CbctWorkbenchPlane = {
	key: MprProjection;
	title: string;
	detail: string;
};

export type MprAxisVisualizerStyle = CSSProperties & {
	"--mpr-axis-deg": string;
	"--mpr-slab-width": string;
	"--mpr-slice-position": string;
};

export type ImagingViewerLocalDraft = {
	state: ImagingViewerSessionState;
	annotations: ImagingViewerAnnotation[];
	clientSavedAt: string;
	serverSavedAt: string | null;
};

export type ImagingViewerSaveState =
	| "idle"
	| "local"
	| "saving"
	| "saved"
	| "queued"
	| "error";

export type DicomWorkbenchLocalDraft = {
	manifest: DicomViewerWorkbenchManifestResponse;
	clientSavedAt: string;
	seriesKey: string;
};

export type DicomWorkbenchIndexedDbDraft = DicomWorkbenchLocalDraft & {
	storageKey: string;
	organizationId: string | null;
};

export type MprWorkbenchState = {
	projection: MprProjection;
	axisDeg: number;
	slabMm: number;
	sliceIndex: number;
	windowPreset: MprWindowPreset;
	crosshair: boolean;
	linkedPlanes: boolean;
};

export type MprWorkbenchLocalDraft = {
	version: 1;
	seriesKey: string;
	state: MprWorkbenchState;
	clientSavedAt: string;
};

export type MprWorkbenchIndexedDbDraft = MprWorkbenchLocalDraft & {
	storageKey: string;
	organizationId: string | null;
};

export type LocalImagingFolderDraft = {
	version: 1;
	folderPath: string;
	safeDisplayName: string;
	sourceLabel: string;
	sourceKind: string;
	folderFingerprint: string | null;
	origin: "manual" | "discovery" | "organizer" | "workbench";
	savedAt: string;
};

export type DicomFirstFramePreviewMetadata = Partial<
	Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
>;

export type DicomFirstFramePreviewRequestContext = {
	folderPath: string;
	metadata: DicomFirstFramePreviewMetadata;
};

export type DicomFirstFramePreviewOptions = {
	preferredFileIndex?: number;
	resetViewer?: boolean;
};

export type BrowserFileSystemFileHandle = {
	kind: "file";
	name: string;
	getFile: () => Promise<File>;
};

export type BrowserFileSystemDirectoryHandle = {
	kind: "directory";
	name: string;
	entries: () => AsyncIterable<[string, BrowserFileSystemHandle]>;
};

export type BrowserFileSystemHandle =
	| BrowserFileSystemFileHandle
	| BrowserFileSystemDirectoryHandle;

export type BrowserDirectoryPickerWindow = Window & {
	showDirectoryPicker?: (options?: {
		id?: string;
		mode?: "read" | "readwrite";
		startIn?: string;
	}) => Promise<BrowserFileSystemDirectoryHandle>;
};

export type DentalDesktopRuntimeWindow = BrowserDirectoryPickerWindow & {
	dentalCrmDesktop?: { dicomBridge?: unknown; localFileBridge?: unknown };
	__DENTAL_CRM_DESKTOP__?: unknown;
	__TAURI__?: unknown;
	electronAPI?: unknown;
};

export type BrowserPickedImagingFolderPreview = {
	version: 1;
	safeDisplayName: string;
	sourceLabel: string;
	sourceKind: "browser_directory_picker" | "browser_file_input";
	folderFingerprint: string;
	rootName: string;
	scannedFiles: number;
	scannedFolders: number;
	dicomLikeFiles: number;
	archiveFiles: number;
	modelFiles: number;
	imageFiles: number;
	totalBytes: number;
	createdAt: string;
	nextAction: string;
	warnings: string[];
};

export type BrowserPickedImagingScanStats = {
	rootName: string;
	sourceKind: BrowserPickedImagingFolderPreview["sourceKind"];
	scannedFiles: number;
	scannedFolders: number;
	dicomLikeFiles: number;
	archiveFiles: number;
	modelFiles: number;
	imageFiles: number;
	totalBytes: number;
	warnings: string[];
};

export type BrowserImagingScanPhase = "scanning" | "done" | "cancelled";

export type BrowserImagingScanProgress = BrowserPickedImagingScanStats & {
	phase: BrowserImagingScanPhase;
	currentItem: string | null;
	startedAt: string;
	updatedAt: string;
	elapsedMs: number;
	processedUnits: number;
	fileLimit: number;
	folderLimit: number;
	magicReadLimit: number;
};

export type BrowserImagingScanOptions = {
	signal?: AbortSignal;
	startedAt: string;
	onProgress?: (progress: BrowserImagingScanProgress) => void;
};

export type LocalDicomOperationOptions = {
	signal?: AbortSignal;
};

export type BrowserImagingScanRuntime = {
	startedAt: string;
	startedAtMs: number;
	processedUnits: number;
	lastYieldAtMs: number;
	lastProgressAtMs: number;
};

export const imagingViewerLocalStoragePrefix = "dental-crm:imaging-viewer:";

export const dicomWorkbenchLocalStorageKey = "dental-crm:dicom-workbench:last";

export const mprWorkbenchLocalStoragePrefix = "dental-crm:ct-mpr-workbench:";

export const localImagingFolderStorageKey =
	"dental-crm:local-imaging-folder:last";

export const browserPickedImagingFolderStorageKey =
	"dental-crm:browser-picked-imaging-folder:last";

export const browserImagingScanFileLimit = 900;

export const browserImagingScanFolderLimit = 260;

export const browserImagingScanDirectoryEntryLimit = 1600;

export const browserImagingScanMagicReadLimit = 180;

export const browserImagingScanYieldEveryUnits = 24;

export const browserImagingScanYieldEveryMs = 20;

export const browserImagingScanProgressEveryUnits = 12;

export const browserImagingScanProgressEveryMs = 96;

export const dicomDownloadRedactionWarning =
	"Скачанный пакет скрывает локальные пути снимков; перед загрузкой пикселей переподключите папку или устройство на рабочей станции.";

export const imagingViewerPlans: Record<ImagingStudyKind, ImagingViewerPlan> = {
	periapical: {
		label: "RVG / прицельный",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "rotate", "zoom", "measure"],
		presets: ["endo", "caries", "implant"],
		nextAction: "Смотреть локально; ИИ-описание только как черновик.",
		warnings: [
			"Не заменяет диагноз врача.",
			"Измерения требуют калибровки датчика.",
		],
	},
	bitewing: {
		label: "Интерпроксимальный снимок",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "zoom", "compare"],
		presets: ["caries", "bone"],
		nextAction: "Смотреть локально; удобно для кариеса и контактов.",
		warnings: ["Сравнение серий требует одинаковой проекции."],
	},
	opg: {
		label: "ОПТГ / панорама",
		mode: "two_d",
		primaryTools: ["window/level", "invert", "rotate", "zoom", "measure"],
		presets: ["bone", "teeth", "implant"],
		nextAction:
			"2D-просмотрщик достаточен для обзора; КТ открывать отдельным рабочим местом срезов.",
		warnings: ["Панорама имеет искажения; линейные измерения проверять по КТ."],
	},
	ceph: {
		label: "ТРГ / цефалометрия",
		mode: "ceph",
		primaryTools: ["window/level", "rotate", "zoom", "landmarks"],
		presets: ["soft", "bone", "airway"],
		nextAction:
			"Для ортодонтии нужен отдельный цефалометрический анализ с точками и углами.",
		warnings: ["Точки/углы не должны автозаполняться без проверки врача."],
	},
	cbct: {
		label: "КЛКТ / КТ",
		mode: "cbct_mpr",
		primaryTools: ["MPR", "axial", "coronal", "sagittal", "panoramic curve"],
		presets: ["bone", "implant", "endo"],
		nextAction:
			"Открывать в просмотре КЛКТ/КТ-срезов; здесь только быстрый предпросмотр.",
		warnings: [
			"Нельзя диагностировать КЛКТ по одной плоской картинке.",
			"Нужны срезы серии, предварительная подготовка и полноценный просмотрщик КТ.",
		],
	},
	photo: {
		label: "Фото",
		mode: "photo",
		primaryTools: ["zoom", "rotate", "brightness", "contrast"],
		presets: ["clinical", "shade", "before/after"],
		nextAction:
			"Фото можно использовать для коммуникации и черновиков документов.",
		warnings: ["Цвет зависит от света и камеры."],
	},
	other: {
		label: "Другое изображение",
		mode: "two_d",
		primaryTools: ["zoom", "rotate", "brightness", "contrast"],
		presets: ["neutral"],
		nextAction:
			"Проверить источник и привязку к пациенту перед использованием.",
		warnings: ["Неизвестный тип требует ручной проверки."],
	},
};

export const imagingSourceChoices: ImagingSourceKind[] = [
	"folder_watch",
	"sensor_bridge",
	"dicom_file",
	"dicomweb",
	"pacs",
	"twain_wia",
	"manual_upload",
];

export const dicomFirstFrameStatusLabels: Record<string, string> = {
	ready: "готово",
	unsupported: "не поддерживается",
	not_found: "не найдено",
};

export const dicomWorkbenchDraftStoreName = "dicomWorkbenchDrafts";

export const mprWorkbenchDraftStoreName = "mprWorkbenchDrafts";

export const xrayPriorityOptions: readonly XrayCbctReferralPriority[] = [
	"routine",
	"urgent",
];

export const xrayStudyTypeOptions: Array<{
	value: XrayCbctReferralStudyType;
	label: string;
}> = [
	{ value: "rvg", label: "RVG / прицельный" },
	{ value: "opg", label: "ОПТГ" },
	{ value: "cbct", label: "КЛКТ / КТ" },
	{ value: "trg", label: "ТРГ" },
	{ value: "tmj", label: "ВНЧС" },
	{ value: "sinus", label: "Пазуха" },
	{ value: "photo_protocol", label: "Фотопротокол" },
	{ value: "other", label: "Другое" },
];

export const xrayPregnancyStatusOptions: Array<{
	value: XrayCbctReferralPregnancyStatus;
	label: string;
}> = [
	{ value: "not_applicable", label: "Не применимо" },
	{ value: "denied", label: "Со слов пациента нет" },
	{ value: "possible", label: "Возможна" },
	{ value: "confirmed", label: "Подтверждена" },
	{ value: "unknown", label: "Не уточнено" },
];

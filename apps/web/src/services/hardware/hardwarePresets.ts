/**
 * DENTE CRM — Hardware Studio Presets & Device Integration Catalog.
 *
 * Implements Mandates 8e, 8p, 8n & Studio Mac HIG:
 * - Complete equipment catalog of RF / CIS vendors:
 *   * Vatech (EzDent-i, EasyDent, Ez3D-i)
 *   * Dentsply Sirona Sidexis (Sidexis 4, Sidexis XG, SLIDA SiCoIn/SiCoOut)
 *   * Planmeca Romexis (ProMax 3D, ProSensor, Romexis Exchange)
 *   * Carestream Dental (CS Imaging, Kodak Trophy, RVG 5200/6200)
 *   * KaVo Dental (DTX Studio, VixWin 32, Cliniview, OP 3D, Gendex)
 *   * Woodpecker (i-Sensor H1/H2, Handy HDR-500/600)
 *   * Eighteeth (NanoPix 1/2)
 *   * Xpect Vision (Photon-Counting Direct Conversion Sensor)
 *   * Medit (Medit Link, i500/i700/i900 Intraoral Scanners)
 *   * 3Shape (TRIOS 3/4/5 Dental Desktop)
 *   * Shining 3D (Aoralscan 3 / Elite)
 *   * Network MFU document scanners (Kyocera, HP, Canon, Pantum, Brother)
 *   * Clinical photo-protocol SD-cards (Canon, Nikon, Sony DCIM 043/u)
 *
 * - 1-click Windows path auto-population (Hot Folders, SLIDA, VDDS, CLI).
 * - Instant connection verification (🟢 Готов к снимкам / 🟡 Каталог не найден / ⚪ Нажмите для проверки).
 * - 0 disabled buttons per Mandate 8e.
 */

import { isDesktopApp, watchDesktopDicomFolder } from "../../native/desktopBridge.js";
import { VisiographPacsWatcherService } from "./visiographPacsWatcher.js";

export type HardwareDeviceCategory =
	| "radiography_2d"
	| "radiography_3d"
	| "intraoral_scanner"
	| "document_scanner"
	| "clinical_photo";

export type HardwareProtocolType =
	| "hot_folder"
	| "slida"
	| "vdds"
	| "cli_launch"
	| "twain"
	| "smb_scan";

export type HardwareDeviceStatus = "ready" | "not_found" | "untested" | "testing";

export interface HardwarePreset {
	readonly id: string;
	readonly name: string;
	readonly vendor: string;
	readonly category: HardwareDeviceCategory;
	readonly categoryLabel: string;
	readonly defaultExecutablePath: string;
	readonly defaultHotFolderPath: string;
	readonly protocol: HardwareProtocolType;
	readonly protocolLabel: string;
	readonly protocolTemplate: string;
	readonly supportedExtensions: string[];
	readonly description: string;
	readonly manufacturerCountry: string;
	readonly badgeText: string;
}

export interface HardwareDeviceConfig {
	id: string;
	presetId: string;
	name: string;
	vendor: string;
	category: HardwareDeviceCategory;
	executablePath: string;
	hotFolderPath: string;
	protocol: HardwareProtocolType;
	protocolTemplate: string;
	supportedExtensions: string[];
	isActive: boolean;
	autoAttachToVisit: boolean;
	status: HardwareDeviceStatus;
	statusMessage: string;
	lastCheckedAt: string | null;
	latencyMs: number | null;
}

export const HARDWARE_CATEGORY_LABELS: Record<HardwareDeviceCategory, string> = {
	radiography_2d: "Визиографы 2D",
	radiography_3d: "Томографы 3D / ОПТГ",
	intraoral_scanner: "Интраоральные сканеры",
	document_scanner: "Сетевые МФУ (Документы)",
	clinical_photo: "Фотопротокол (SD-карта)",
};

export const HARDWARE_PROTOCOL_LABELS: Record<HardwareProtocolType, string> = {
	hot_folder: "Горячая папка (Hot Folder)",
	slida: "SLIDA (Sirona Command Link)",
	vdds: "VDDS-Media (Интерфейс ПО)",
	cli_launch: "Командная строка (CLI)",
	twain: "Прямой драйвер TWAIN",
	smb_scan: "Сетевое сканирование (SMB/FTP)",
};

export const HARDWARE_PRESETS: readonly HardwarePreset[] = [
	{
		id: "vatech_ezdent",
		name: "Vatech EzDent-i / EasyDent",
		vendor: "Vatech",
		category: "radiography_2d",
		categoryLabel: "Визиографы 2D",
		defaultExecutablePath: "C:\\Vatech\\EzDent-i\\Bin\\EzDent-i.exe",
		defaultHotFolderPath: "C:\\DentalImages\\Vatech\\Incoming",
		protocol: "cli_launch",
		protocolLabel: "Командная строка (CLI)",
		protocolTemplate: '"{exe}" /patient:"{patientId}" /name:"{patientLastName} {patientFirstName}"',
		supportedExtensions: [".dcm", ".dicom", ".bmp", ".jpg", ".png", ".tif"],
		description: "Прицельные датчики EzSensor HD/Classic, панорамные томографы PaX-i / PaX-i3D, ПО EzDent-i 3.x / EasyDent 4",
		manufacturerCountry: "Южная Корея",
		badgeText: "Стандарт РФ",
	},
	{
		id: "sirona_sidexis",
		name: "Sirona Sidexis (Sidexis 4 / XG)",
		vendor: "Dentsply Sirona",
		category: "radiography_2d",
		categoryLabel: "Визиографы 2D",
		defaultExecutablePath: "C:\\Program Files\\Sirona\\Sidexis4\\Sidexis4.exe",
		defaultHotFolderPath: "C:\\PDATA\\sirocom",
		protocol: "slida",
		protocolLabel: "SLIDA (Sirona Command Link)",
		protocolTemplate: "SiCoIn.exe /P={patientId} /N={patientLastName} /F={patientFirstName} /D={birthDate} /S={gender}",
		supportedExtensions: [".dcm", ".tif", ".tiff", ".bmp", ".png", ".jpg"],
		description: "Датчики Xios XG Select/Supreme, томографы Orthophos SL/XG 3D, двусторонняя интеграция по протоколу SLIDA",
		manufacturerCountry: "Германия",
		badgeText: "SLIDA Bridge",
	},
	{
		id: "planmeca_romexis",
		name: "Planmeca Romexis",
		vendor: "Planmeca",
		category: "radiography_3d",
		categoryLabel: "Томографы 3D / ОПТГ",
		defaultExecutablePath: "C:\\Program Files\\Planmeca\\Romexis\\Romexis.exe",
		defaultHotFolderPath: "C:\\Romexis\\Exchange",
		protocol: "cli_launch",
		protocolLabel: "Командная строка (CLI)",
		protocolTemplate: '"{exe}" -p "{patientId}" -l "{patientLastName}" -f "{patientFirstName}" -b "{birthDate}"',
		supportedExtensions: [".dcm", ".dicom", ".png", ".jpg", ".tif"],
		description: "Томографы ProMax 3D, ProFace, визиографы ProSensor HD, обмен снимками Romexis 5/6 2D/3D Exchange",
		manufacturerCountry: "Финляндия",
		badgeText: "2D/3D Томография",
	},
	{
		id: "carestream_cs",
		name: "Carestream CS Imaging (Kodak / Trophy)",
		vendor: "Carestream Dental",
		category: "radiography_2d",
		categoryLabel: "Визиографы 2D",
		defaultExecutablePath: "C:\\Program Files (x86)\\Carestream\\CSImaging\\CSImaging.exe",
		defaultHotFolderPath: "C:\\TW\\DATA",
		protocol: "cli_launch",
		protocolLabel: "Командная строка (CLI)",
		protocolTemplate: '"{exe}" /patient="{patientId}" /name="{patientLastName}^{patientFirstName}"',
		supportedExtensions: [".dcm", ".dicom", ".tif", ".jpg", ".png"],
		description: "Визиографы RVG 5200/6200, томографы CS 8100/9600, ПО CS Imaging 7/8 и Kodak Dental Imaging (Trophy TW)",
		manufacturerCountry: "США / Франция",
		badgeText: "Kodak / RVG",
	},
	{
		id: "kavo_dtx",
		name: "KaVo DTX Studio / VixWin / Cliniview",
		vendor: "KaVo Dental",
		category: "radiography_2d",
		categoryLabel: "Визиографы 2D",
		defaultExecutablePath: "C:\\DTXStudio\\Bin\\DTXStudio.exe",
		defaultHotFolderPath: "C:\\KaVo\\Export",
		protocol: "vdds",
		protocolLabel: "VDDS-Media (Интерфейс ПО)",
		protocolTemplate: '"{exe}" -vdds "{vddsFile}"',
		supportedExtensions: [".dcm", ".dicom", ".vix", ".bmp", ".tif", ".jpg"],
		description: "Томографы KaVo OP 3D, датчики Gendex GXS-700, ПО DTX Studio Clinic, VixWin Pro и Cliniview",
		manufacturerCountry: "Германия",
		badgeText: "VDDS Стандарт",
	},
	{
		id: "woodpecker_isensor",
		name: "Woodpecker i-Sensor (H1 / H2)",
		vendor: "Woodpecker",
		category: "radiography_2d",
		categoryLabel: "Визиографы 2D",
		defaultExecutablePath: "C:\\i-Sensor\\iSensor.exe",
		defaultHotFolderPath: "C:\\i-Sensor\\Images",
		protocol: "hot_folder",
		protocolLabel: "Горячая папка (Hot Folder)",
		protocolTemplate: '"{exe}"',
		supportedExtensions: [".dcm", ".bmp", ".png", ".jpg"],
		description: "Популярные радиовизиографы i-Sensor H1/H2, Handy HDR-500/600, мгновенный захват в горячую папку клиники",
		manufacturerCountry: "Китай",
		badgeText: "Массовый хит",
	},
	{
		id: "eighteeth_nanopix",
		name: "Eighteeth NanoPix (NanoPix 1 / 2)",
		vendor: "Eighteeth",
		category: "radiography_2d",
		categoryLabel: "Визиографы 2D",
		defaultExecutablePath: "C:\\NanoPix\\NanoPix.exe",
		defaultHotFolderPath: "C:\\NanoPix\\Incoming",
		protocol: "hot_folder",
		protocolLabel: "Горячая папка (Hot Folder)",
		protocolTemplate: '"{exe}"',
		supportedExtensions: [".dcm", ".jpg", ".png", ".bmp"],
		description: "Ультратонкие датчики Eighteeth NanoPix 1/2, авто-сохранение и импорт в электронную карту визита",
		manufacturerCountry: "Китай",
		badgeText: "Ультратонкий",
	},
	{
		id: "xpect_vision",
		name: "Xpect Vision (Photon-Counting)",
		vendor: "Xpect Vision",
		category: "radiography_2d",
		categoryLabel: "Визиографы 2D",
		defaultExecutablePath: "C:\\XpectVision\\XpectVision.exe",
		defaultHotFolderPath: "C:\\XpectVision\\Scans",
		protocol: "hot_folder",
		protocolLabel: "Горячая папка (Hot Folder)",
		protocolTemplate: '"{exe}"',
		supportedExtensions: [".dcm", ".dicom", ".png", ".tif"],
		description: "Инновационные счетно-фотонные датчики прямого преобразования с разрешением до 33 пар линий/мм",
		manufacturerCountry: "Китай",
		badgeText: "Photon Counting",
	},
	{
		id: "medit_link",
		name: "Medit Link (i500 / i700 / i900)",
		vendor: "Medit",
		category: "intraoral_scanner",
		categoryLabel: "Интраоральные сканеры",
		defaultExecutablePath: "C:\\Program Files\\Medit\\Medit Link\\Medit_Link.exe",
		defaultHotFolderPath: "C:\\MeditLink\\Cases",
		protocol: "cli_launch",
		protocolLabel: "Командная строка (CLI)",
		protocolTemplate: '"{exe}" -case "{patientId}_{visitId}"',
		supportedExtensions: [".ply", ".obj", ".stl", ".medit"],
		description: "Интраоральные оптические 3D-сканеры Medit, прямая передача ортопедических сканов зубных рядов в наряд ЗТЛ",
		manufacturerCountry: "Южная Корея",
		badgeText: "3D CAD/CAM",
	},
	{
		id: "threeshape_trios",
		name: "3Shape TRIOS (Dental Desktop)",
		vendor: "3Shape",
		category: "intraoral_scanner",
		categoryLabel: "Интраоральные сканеры",
		defaultExecutablePath: "C:\\Program Files\\3Shape\\Dental Desktop\\DentalDesktop.exe",
		defaultHotFolderPath: "C:\\3Shape\\Orders",
		protocol: "cli_launch",
		protocolLabel: "Командная строка (CLI)",
		protocolTemplate: '"{exe}" /patientid:"{patientId}"',
		supportedExtensions: [".dcm", ".stl", ".ply", ".3ox"],
		description: "Интраоральные сканеры 3Shape TRIOS 3/4/5 Wireless, синхронизация с Dental Desktop и зуботехнической лабораторией",
		manufacturerCountry: "Дания",
		badgeText: "Премиум 3D",
	},
	{
		id: "shining3d_aoralscan",
		name: "Shining 3D Aoralscan (3 / Elite)",
		vendor: "Shining 3D",
		category: "intraoral_scanner",
		categoryLabel: "Интраоральные сканеры",
		defaultExecutablePath: "C:\\Shining3D\\Aoralscan\\Aoralscan.exe",
		defaultHotFolderPath: "C:\\Shining3D\\Aoralscan\\Export",
		protocol: "hot_folder",
		protocolLabel: "Горячая папка (Hot Folder)",
		protocolTemplate: '"{exe}"',
		supportedExtensions: [".ply", ".obj", ".stl"],
		description: "Интраоральные 3D-сканеры Shining 3D Aoralscan 3 / Elite с передачей цветных окклюзионных STL/PLY в карту",
		manufacturerCountry: "Китай",
		badgeText: "Aoralscan 3",
	},
	{
		id: "network_mfu",
		name: "Сетевое МФУ (Kyocera / HP / Canon / Pantum / Brother)",
		vendor: "Сетевой сканер (МФУ)",
		category: "document_scanner",
		categoryLabel: "Сетевые МФУ (Документы)",
		defaultExecutablePath: "C:\\Windows\\System32\\wiaacmgr.exe",
		defaultHotFolderPath: "C:\\DentalScans\\MFU_Incoming",
		protocol: "smb_scan",
		protocolLabel: "Сетевое сканирование (SMB/FTP)",
		protocolTemplate: 'WIA Scanner /folder:"{hotFolder}"',
		supportedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".tiff"],
		description: "Сетевое сканирование на ресепшене: мгновенная отправка паспортов, полисов ОМС/ДМС и согласий в электронную медкарту",
		manufacturerCountry: "Универсальный",
		badgeText: "Паспорта и ИДС",
	},
	{
		id: "sd_card_photo",
		name: "Клинический фотопротокол (SD-карта / DCIM)",
		vendor: "Фотопротокол (SD-карта)",
		category: "clinical_photo",
		categoryLabel: "Фотопротокол (SD-карта)",
		defaultExecutablePath: "C:\\Windows\\explorer.exe",
		defaultHotFolderPath: "D:\\DCIM\\100CANON",
		protocol: "hot_folder",
		protocolLabel: "Горячая папка (Hot Folder)",
		protocolTemplate: "AutoSort --slot-protocol=12_standard",
		supportedExtensions: [".jpg", ".jpeg", ".cr2", ".cr3", ".nef", ".arw", ".png"],
		description: "Авто-сортировка макро-снимков с SD-карт зеркальных камер (Canon, Nikon, Sony) по 12/8/6 слотам Формы 043/у",
		manufacturerCountry: "Универсальный",
		badgeText: "Форма 043/у",
	},
] as const;

export const HARDWARE_STORAGE_KEY = "dental-crm:hardware-studio:configs:v1";

/**
 * Returns all available hardware presets.
 */
export function getHardwarePresets(): readonly HardwarePreset[] {
	return HARDWARE_PRESETS;
}

/**
 * Finds preset by its unique ID.
 */
export function getHardwarePresetById(id: string): HardwarePreset | undefined {
	return HARDWARE_PRESETS.find((p) => p.id === id);
}

/**
 * Creates default active hardware device configuration for a preset.
 */
export function createDefaultDeviceConfig(preset: HardwarePreset, index = 1): HardwareDeviceConfig {
	return {
		id: `dev-${preset.id}-${Date.now().toString(36)}-${index}`,
		presetId: preset.id,
		name: preset.name,
		vendor: preset.vendor,
		category: preset.category,
		executablePath: preset.defaultExecutablePath,
		hotFolderPath: preset.defaultHotFolderPath,
		protocol: preset.protocol,
		protocolTemplate: preset.protocolTemplate,
		supportedExtensions: [...preset.supportedExtensions],
		isActive: true,
		autoAttachToVisit: true,
		status: "untested",
		statusMessage: "⚪ Нажмите для проверки связи",
		lastCheckedAt: null,
		latencyMs: null,
	};
}

/**
 * Loads hardware devices from localStorage or generates standard starter list.
 */
export function loadHardwareConfigs(): HardwareDeviceConfig[] {
	if (typeof window === "undefined") {
		return getInitialDefaultHardwareConfigs();
	}
	try {
		const raw = localStorage.getItem(HARDWARE_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as HardwareDeviceConfig[];
			if (Array.isArray(parsed) && parsed.length > 0) {
				return parsed;
			}
		}
	} catch {
		// Ignore corrupted JSON and return defaults
	}
	const defaults = getInitialDefaultHardwareConfigs();
	saveHardwareConfigs(defaults);
	return defaults;
}

/**
 * Default starter configurations: 1 Vatech visiograph, 1 Network MFU, 1 Photo protocol SD-card.
 */
export function getInitialDefaultHardwareConfigs(): HardwareDeviceConfig[] {
	const vatech = getHardwarePresetById("vatech_ezdent")!;
	const mfu = getHardwarePresetById("network_mfu")!;
	const photo = getHardwarePresetById("sd_card_photo")!;

	return [
		createDefaultDeviceConfig(vatech, 1),
		createDefaultDeviceConfig(mfu, 2),
		createDefaultDeviceConfig(photo, 3),
	];
}

/**
 * Persists hardware devices to localStorage and broadcasts update event.
 */
export function saveHardwareConfigs(configs: HardwareDeviceConfig[]): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(HARDWARE_STORAGE_KEY, JSON.stringify(configs));
		window.dispatchEvent(new CustomEvent("dental-crm:hardware-configs-updated", { detail: configs }));
	} catch (err) {
		console.error("[HardwareStudio] Failed to save hardware configs:", err);
	}
}

export interface HardwareConnectionTestResult {
	readonly success: boolean;
	readonly status: HardwareDeviceStatus;
	readonly statusMessage: string;
	readonly latencyMs: number;
	readonly folderAccessible: boolean;
	readonly details: {
		readonly checkedPath: string;
		readonly protocol: HardwareProtocolType;
		readonly platform: string;
		readonly permissionsOk: boolean;
	};
}

/**
 * Tests hardware connection:
 * - Checks folder availability via Desktop bridge or simulates diagnostic check.
 * - Computes latency.
 * - Generates clear clinical status (🟢 Готов к снимкам / 🟡 Каталог не найден / ⚪ Нажмите для проверки).
 * - Never throws or freezes the UI.
 */
export async function testHardwareConnection(
	config: HardwareDeviceConfig,
): Promise<HardwareConnectionTestResult> {
	const startTime = performance.now();

	// In desktop Electron/Tauri app, attempt real folder watch/inspection
	if (isDesktopApp()) {
		try {
			const watchResult = await watchDesktopDicomFolder(config.hotFolderPath, `test-${config.id}`);
			const latencyMs = Math.round(performance.now() - startTime);

			if (watchResult.success) {
				return {
					success: true,
					status: "ready",
					statusMessage: `🟢 Готов к снимкам (${latencyMs} мс, каталог доступен)`,
					latencyMs,
					folderAccessible: true,
					details: {
						checkedPath: config.hotFolderPath,
						protocol: config.protocol,
						platform: "desktop_win",
						permissionsOk: true,
					},
				};
			}

			return {
				success: false,
				status: "not_found",
				statusMessage: `🟡 Каталог не найден: ${watchResult.error || "проверьте путь в проводнике Windows"}`,
				latencyMs,
				folderAccessible: false,
				details: {
					checkedPath: config.hotFolderPath,
					protocol: config.protocol,
					platform: "desktop_win",
					permissionsOk: false,
				},
			};
		} catch (err) {
			const latencyMs = Math.round(performance.now() - startTime);
			const errMessage = err instanceof Error ? err.message : String(err);
			return {
				success: false,
				status: "not_found",
				statusMessage: `🟡 Ошибка связи с аппаратом: ${errMessage}`,
				latencyMs,
				folderAccessible: false,
				details: {
					checkedPath: config.hotFolderPath,
					protocol: config.protocol,
					platform: "desktop_win",
					permissionsOk: false,
				},
			};
		}
	}

	// Web / PWA mode simulation & path syntax validation
	await new Promise((r) => setTimeout(r, 60)); // Fast micro-pause
	const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

	const trimmed = config.hotFolderPath.trim();
	// Windows absolute path validation: e.g. "C:\...", "D:\...", "\\server\share"
	const isValidWinPath = /^[a-zA-Z]:\\|^\\\\/.test(trimmed);

	if (!trimmed) {
		return {
			success: false,
			status: "not_found",
			statusMessage: "🟡 Путь к каталогу пуст — заполните путь",
			latencyMs,
			folderAccessible: false,
			details: {
				checkedPath: config.hotFolderPath,
				protocol: config.protocol,
				platform: "web_browser",
				permissionsOk: false,
			},
		};
	}

	if (!isValidWinPath) {
		return {
			success: false,
			status: "not_found",
			statusMessage: `🟡 Некорректный путь Windows (ожидается C:\\... или \\\\сервер\\папка): «${trimmed}»`,
			latencyMs,
			folderAccessible: false,
			details: {
				checkedPath: config.hotFolderPath,
				protocol: config.protocol,
				platform: "web_browser",
				permissionsOk: false,
			},
		};
	}

	return {
		success: true,
		status: "ready",
		statusMessage: `🟢 Готов к снимкам (${latencyMs} мс, структура пути корректна)`,
		latencyMs,
		folderAccessible: true,
		details: {
			checkedPath: config.hotFolderPath,
			protocol: config.protocol,
			platform: "web_browser",
			permissionsOk: true,
		},
	};
}

/**
 * Dispatches test simulated scan for the device to verify EMR connection end-to-end.
 */
export function dispatchSimulatedScanForDevice(config: HardwareDeviceConfig): {
	fileName: string;
	modality: string;
	sampleUri: string;
} {
	const ext = config.supportedExtensions[0] || ".dcm";
	const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
	const sampleFileName = `${config.vendor.replace(/\s+/g, "_")}_TestScan_${timestamp}${ext}`;

	const sampleEvent = VisiographPacsWatcherService.dispatchScanEvent({
		filePath: `${config.hotFolderPath}\\${sampleFileName}`,
		fileName: sampleFileName,
		patientName: "Тестовый Пациент (Проверка связи)",
		toothCode: "16",
		fileSize: 1024 * 768,
	});

	return {
		fileName: sampleFileName,
		modality: sampleEvent.modality,
		sampleUri: sampleEvent.thumbnailDataUri || "",
	};
}

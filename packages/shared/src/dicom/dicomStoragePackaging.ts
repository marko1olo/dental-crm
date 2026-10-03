/**
 * dicomStoragePackaging.ts — Кроссплатформенная файловая архитектура, системные папки (Windows/macOS/Linux),
 * именование исследований, сортировка срезов и генерация ярлыков прямого запуска DENTE.
 */

export interface DicomStorageResolutionOptions {
	platform?: string | undefined;
	env?: Record<string, string | undefined> | undefined;
	homedir?: string | undefined;
	isWritable?: ((dirPath: string) => boolean) | undefined;
	fallbackDir?: string | undefined;
}

export type DicomStorageSource =
	| "env"
	| "windows_programdata"
	| "windows_localappdata"
	| "windows_userprofile"
	| "macos_user_library"
	| "macos_system_library"
	| "linux_xdg"
	| "fallback_dev";

export interface DicomStorageResolutionResult {
	storageDir: string;
	source: DicomStorageSource;
	platform: string;
	isSystemPath: boolean;
}

/**
 * Определение системного каталога для хранения DICOM-исследований.
 *
 * Приоритеты:
 * 1. process.env.DENTAL_DICOM_STORAGE_DIR (если задан)
 * 2. Windows: %PROGRAMDATA%\DenteDental\DICOM\ (если доступен на запись) -> %LOCALAPPDATA%\DenteDental\DICOM\ -> %USERPROFILE%\DenteDental\DICOM\
 * 3. macOS: ~/Library/Application Support/DenteDental/DICOM/ -> /Library/Application Support/DenteDental/DICOM/
 * 4. Linux: ~/.local/share/dentedental/dicom/ ($XDG_DATA_HOME/dentedental/dicom/)
 * 5. Фоллбэк: .data/dicom_cache/ (для dev-режима без прав)
 */
export function resolveSystemDicomStorageDir(
	options?: DicomStorageResolutionOptions,
): DicomStorageResolutionResult {
	const env = options?.env ?? (typeof process !== "undefined" ? process.env : {});
	const platform = options?.platform ?? (typeof process !== "undefined" ? process.platform : "win32");
	const home = options?.homedir ?? env.USERPROFILE ?? env.HOME ?? "";
	const isWritable = options?.isWritable ?? (() => true);
	const fallback = options?.fallbackDir ?? ".data/dicom_cache";

	// 1. Приоритет №1: явная переменная окружения
	const customDir = env.DENTAL_DICOM_STORAGE_DIR?.trim();
	if (customDir) {
		return {
			storageDir: normalizeStoragePath(customDir, platform),
			source: "env",
			platform,
			isSystemPath: true,
		};
	}

	// 2. Windows: %PROGRAMDATA% -> %LOCALAPPDATA% -> %USERPROFILE%
	if (platform === "win32") {
		const programData = env.ProgramData || env.PROGRAMDATA || "C:\\ProgramData";
		const primaryCandidate = `${programData}\\DenteDental\\DICOM`;

		if (isWritable(primaryCandidate)) {
			return {
				storageDir: normalizeStoragePath(primaryCandidate, platform),
				source: "windows_programdata",
				platform,
				isSystemPath: true,
			};
		}

		const localAppData = env.LOCALAPPDATA || (home ? `${home}\\AppData\\Local` : "");
		if (localAppData && isWritable(`${localAppData}\\DenteDental\\DICOM`)) {
			return {
				storageDir: normalizeStoragePath(`${localAppData}\\DenteDental\\DICOM`, platform),
				source: "windows_localappdata",
				platform,
				isSystemPath: true,
			};
		}

		if (home) {
			const userCandidate = `${home}\\DenteDental\\DICOM`;
			if (isWritable(userCandidate)) {
				return {
					storageDir: normalizeStoragePath(userCandidate, platform),
					source: "windows_userprofile",
					platform,
					isSystemPath: true,
				};
			}
		}

		return {
			storageDir: normalizeStoragePath(fallback, platform),
			source: "fallback_dev",
			platform,
			isSystemPath: false,
		};
	}

	// 3. macOS (darwin): ~/Library/Application Support/DenteDental/DICOM/
	if (platform === "darwin") {
		if (home) {
			const macUserCandidate = `${home}/Library/Application Support/DenteDental/DICOM`;
			if (isWritable(macUserCandidate)) {
				return {
					storageDir: normalizeStoragePath(macUserCandidate, platform),
					source: "macos_user_library",
					platform,
					isSystemPath: true,
				};
			}
		}

		const macSysCandidate = "/Library/Application Support/DenteDental/DICOM";
		if (isWritable(macSysCandidate)) {
			return {
				storageDir: normalizeStoragePath(macSysCandidate, platform),
				source: "macos_system_library",
				platform,
				isSystemPath: true,
			};
		}

		return {
			storageDir: normalizeStoragePath(fallback, platform),
			source: "fallback_dev",
			platform,
			isSystemPath: false,
		};
	}

	// 4. Linux & others: ~/.local/share/dentedental/dicom/
	const xdgData = env.XDG_DATA_HOME || (home ? `${home}/.local/share` : "");
	if (xdgData) {
		const linuxCandidate = `${xdgData}/dentedental/dicom`;
		if (isWritable(linuxCandidate)) {
			return {
				storageDir: normalizeStoragePath(linuxCandidate, platform),
				source: "linux_xdg",
				platform,
				isSystemPath: true,
			};
		}
	}

	// 5. Fallback
	return {
		storageDir: normalizeStoragePath(fallback, platform),
		source: "fallback_dev",
		platform,
		isSystemPath: false,
	};
}

/**
 * Нормализация слешей в зависимости от платформы
 */
export function normalizeStoragePath(rawPath: string, platform?: string): string {
	const plat = platform ?? (typeof process !== "undefined" ? process.platform : "win32");
	if (plat === "win32") {
		return rawPath.replace(/\//g, "\\");
	}
	return rawPath.replace(/\\/g, "/");
}

export interface BuildStudyFolderNameParams {
	studyDate?: string | null | undefined;
	patientName?: string | null | undefined;
	modality?: string | null | undefined;
	sliceCount?: number | null | undefined;
	studyInstanceUid: string;
}

/**
 * Очистка сегмента имени файла/папки от недопустимых символов ФС
 * (Windows, macOS, Linux).
 * Запрещены: / \ : * ? " < > | а также спецсимволы 0x00-0x1F, пробелы и точки на конце.
 */
export function sanitizePathSegment(segment: string, fallback = "item"): string {
	if (!segment || typeof segment !== "string") {
		return fallback;
	}

	// 1. Заменяем недопустимые символы на подчеркивание
	let cleaned = segment.replace(/[/\\:*?"<>|\x00-\x1f]/g, "_");

	// 2. Схлопываем множественные подчеркивания и пробелы
	cleaned = cleaned.replace(/[\t\r\n]+/g, " ");
	cleaned = cleaned.replace(/_+/g, "_");

	// 3. Убираем пробелы и точки на краях (критично для Windows NTFS!)
	cleaned = cleaned.trim().replace(/^[._]+/, "").replace(/[._]+$/, "");

	return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Форматирование модальности DICOM в понятный врачу русский термин
 */
export function formatDicomModalityRussian(modality?: string | null, sliceCount?: number | null): string {
	const raw = (modality || "").trim().toUpperCase();
	const slices = sliceCount ?? 1;

	if (raw === "CT" || raw === "CBCT") {
		return "КЛКТ";
	}
	if (raw === "DX" || raw === "IO" || raw === "CR" || raw === "INTRAORAL" || raw === "PERIAPICAL") {
		return "РВГ";
	}
	if (raw === "PX" || raw === "PANORAMIC" || raw === "OPG") {
		return "ОПТГ";
	}
	if (raw === "CEPH" || raw === "CEPHALOMETRIC" || raw === "TRG") {
		return "ТРГ";
	}
	if (raw === "MR" || raw === "MRI") {
		return "МРТ";
	}
	if (raw === "US" || raw === "ULTRASOUND") {
		return "УЗИ";
	}
	if (raw === "SC" || raw === "SECONDARY_CAPTURE") {
		return "Снимок";
	}

	// Если много срезов и модальность неизвестна — считаем КЛКТ
	if (slices > 10) {
		return "КЛКТ";
	}
	return raw || "Снимок";
}

/**
 * Преобразование даты в формат ГГГГ-ММ-ДД
 */
export function formatDicomDateIso(rawDate?: string | null): string {
	if (!rawDate) {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}

	const trimmed = rawDate.trim();
	// Случай DICOM DA: YYYYMMDD (например, 20261003)
	if (/^\d{8}$/.test(trimmed)) {
		const y = trimmed.slice(0, 4);
		const m = trimmed.slice(4, 6);
		const d = trimmed.slice(6, 8);
		return `${y}-${m}-${d}`;
	}

	// Случай ISO YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
		return trimmed.slice(0, 10);
	}

	// Попытка спарсить стандартный Date
	const parsed = new Date(trimmed);
	if (!Number.isNaN(parsed.getTime())) {
		const y = parsed.getFullYear();
		const m = String(parsed.getMonth() + 1).padStart(2, "0");
		const d = String(parsed.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}

	return "2026-01-01";
}

/**
 * Преобразование ФИО пациента (DICOM PN: Zakharov^Ivan^Petrovich или Иванов Иван) в красивую строку Фамилия_Имя
 */
export function formatPatientNameForFolder(rawName?: string | null): string {
	if (!rawName) return "Пациент";

	let trimmed = rawName.trim();
	// Если формат DICOM с кареткой: Last^First^Middle
	if (trimmed.includes("^")) {
		const parts = trimmed.split("^").map((p) => p.trim()).filter(Boolean);
		if (parts.length >= 2) {
			trimmed = `${parts[0]}_${parts[1]}`;
		} else if (parts.length === 1) {
			trimmed = parts[0]!;
		}
	} else {
		// Обычные пробелы: Иванов Иван -> Иванов_Иван
		trimmed = trimmed.replace(/\s+/g, "_");
	}

	return sanitizePathSegment(trimmed, "Пациент");
}

/**
 * Получение короткого хеша/идентификатора из StudyInstanceUID
 */
export function extractShortStudyUid(studyInstanceUid: string): string {
	if (!studyInstanceUid) return "00000000";
	const clean = studyInstanceUid.replace(/[^a-zA-Z0-9]/g, "");
	if (clean.length <= 8) return clean || "00000000";
	// Берем последние 8 символов UID
	return clean.slice(-8).toLowerCase();
}

/**
 * Построение красивого и понятного врачу имени папки исследования:
 * Шаблон: ГГГГ-ММ-ДД_Фамилия_Имя_[Модальность]_[Количество_срезов]_[Короткий_UID]
 * Пример: 2026-10-03_Захаров_Иван_КЛКТ_312ср_a1b2c3d4
 */
export function buildStudyStorageFolderName(params: BuildStudyFolderNameParams): string {
	const dateStr = formatDicomDateIso(params.studyDate);
	const nameStr = formatPatientNameForFolder(params.patientName);
	const modalityStr = formatDicomModalityRussian(params.modality, params.sliceCount);
	const sliceCount = Math.max(1, params.sliceCount ?? 1);
	const slicesStr = `${sliceCount}ср`;
	const shortUid = extractShortStudyUid(params.studyInstanceUid);

	const rawFolderName = `${dateStr}_${nameStr}_${modalityStr}_${slicesStr}_${shortUid}`;
	return sanitizePathSegment(rawFolderName, `study_${shortUid}`);
}

export interface ShortcutOptions {
	studyInstanceUid: string;
	baseUrl?: string | undefined;
	iconPath?: string | undefined;
	openCbct?: boolean | undefined;
	tabHash?: string | undefined;
}

/**
 * Генерация ярлыка Windows Internet Shortcut (.url)
 * Поддерживает открытие в веб-версии и локальный протокол dente://
 */
export function generateWindowsUrlShortcut(options: ShortcutOptions): string {
	const baseUrl = (options.baseUrl || "http://127.0.0.1:5173").replace(/\/+$/, "");
	const studyUid = encodeURIComponent(options.studyInstanceUid);
	const cbctParam = options.openCbct !== false ? "&cbct=1" : "";
	const tab = options.tabHash || "radiology";
	const fullUrl = `${baseUrl}/?studyId=${studyUid}${cbctParam}#${tab}`;
	const iconFile = options.iconPath || "C:\\Clinic_MVP\\dental-crm\\apps\\web\\public\\favicon.ico";

	return [
		"[InternetShortcut]",
		`URL=${fullUrl}`,
		"IconIndex=0",
		`IconFile=${iconFile}`,
		"Comment=Открыть исследование в DENTE Dental CRM",
		`DenteProtocolUrl=dente://radiology/study/${studyUid}`,
		"",
	].join("\r\n");
}

/**
 * Генерация ярлыка Apple WebLoc (.webloc) для macOS Finder (XML Plist)
 */
export function generateMacWeblocShortcut(options: ShortcutOptions): string {
	const baseUrl = (options.baseUrl || "http://127.0.0.1:5173").replace(/\/+$/, "");
	const studyUid = encodeURIComponent(options.studyInstanceUid);
	const cbctParam = options.openCbct !== false ? "&cbct=1" : "";
	const tab = options.tabHash || "radiology";
	const fullUrl = `${baseUrl}/?studyId=${studyUid}${cbctParam}#${tab}`;
	const xmlEscapedUrl = fullUrl.replace(/&/g, "&amp;");

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
		'<plist version="1.0">',
		"<dict>",
		"\t<key>URL</key>",
		`\t<string>${xmlEscapedUrl}</string>`,
		"</dict>",
		"</plist>",
		"",
	].join("\n");
}

/**
 * Генерация исполняемого bash-скрипта запуска (.command) для macOS
 * Позволяет открыть исследование в дефолтном браузере дабл-кликом в Finder
 */
export function generateMacCommandShortcut(options: ShortcutOptions): string {
	const baseUrl = (options.baseUrl || "http://127.0.0.1:5173").replace(/\/+$/, "");
	const studyUid = encodeURIComponent(options.studyInstanceUid);
	const cbctParam = options.openCbct !== false ? "&cbct=1" : "";
	const tab = options.tabHash || "radiology";
	const fullUrl = `${baseUrl}/?studyId=${studyUid}${cbctParam}#${tab}`;

	return [
		"#!/usr/bin/env bash",
		"# DENTE Dental CRM — 1-Click Study Launcher for macOS",
		`open "${fullUrl}"`,
		"",
	].join("\n");
}

export interface DicomStudyManifestParams {
	studyInstanceUid: string;
	seriesInstanceUid?: string | null | undefined;
	sopInstanceUid?: string | null | undefined;
	patientFullName?: string | null | undefined;
	patientChartNumber?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	studyDate?: string | null | undefined;
	studyTime?: string | null | undefined;
	modality?: string | null | undefined;
	modalityKind?: string | null | undefined;
	sliceCount: number;
	packageLayout: "single_multiframe" | "series_slices";
	dimensions?: string | null | undefined;
	voxelSpacing?: string | null | undefined;
	sliceThickness?: number | null | undefined;
	kvp?: number | null | undefined;
	ma?: number | null | undefined;
	exposureTimeMs?: number | null | undefined;
	doseAreaProductDap?: string | null | undefined;
	effectiveDoseMsv?: number | null | undefined;
	manufacturer?: string | null | undefined;
	manufacturerModelName?: string | null | undefined;
	fileSizeBytes?: number | undefined;
	baseUrl?: string | undefined;
}

export interface DicomStudyManifest {
	version: "1.0";
	studyInstanceUid: string;
	seriesInstanceUid: string | null;
	sopInstanceUid: string | null;
	patientFullName: string | null;
	patientId: string | null;
	patientBirthDate: string | null;
	studyDate: string | null;
	studyTime: string | null;
	modality: string;
	modalityRussian: string;
	modalityKind: string;
	sliceCount: number;
	packageLayout: "single_multiframe" | "series_slices";
	dimensions: string | null;
	voxelSpacing: string | null;
	sliceThicknessMm: number | null;
	radiationDose: {
		kvp: number | null;
		ma: number | null;
		exposureTimeMs: number | null;
		doseAreaProductDap: string | null;
		effectiveDoseMsv: number | null;
	};
	hardware: {
		manufacturer: string | null;
		modelName: string | null;
	};
	launchers: {
		webUrl: string;
		desktopProtocolUrl: string;
		windowsShortcut: string;
		macShortcut: string;
		macCommand: string;
	};
	files: {
		manifest: string;
		primaryFileOrDirectory: string;
		slicesCount: number;
	};
	generatedAt: string;
}

/**
 * Создание структурированного манифеста исследования study_manifest.json
 */
export function buildStudyManifest(params: DicomStudyManifestParams): DicomStudyManifest {
	const baseUrl = (params.baseUrl || "http://127.0.0.1:5173").replace(/\/+$/, "");
	const studyUid = params.studyInstanceUid;
	const encodedUid = encodeURIComponent(studyUid);
	const webUrl = `${baseUrl}/?studyId=${encodedUid}&cbct=1#radiology`;
	const desktopProtocolUrl = `dente://radiology/study/${encodedUid}`;

	const primaryFileOrDirectory =
		params.packageLayout === "single_multiframe" ? "volume_multiframe.dcm" : "slices/";

	return {
		version: "1.0",
		studyInstanceUid: studyUid,
		seriesInstanceUid: params.seriesInstanceUid ?? null,
		sopInstanceUid: params.sopInstanceUid ?? null,
		patientFullName: params.patientFullName ?? null,
		patientId: params.patientChartNumber ?? null,
		patientBirthDate: params.patientBirthDate ?? null,
		studyDate: params.studyDate ? formatDicomDateIso(params.studyDate) : null,
		studyTime: params.studyTime ?? null,
		modality: (params.modality || "CT").toUpperCase(),
		modalityRussian: formatDicomModalityRussian(params.modality, params.sliceCount),
		modalityKind: params.modalityKind || "ct",
		sliceCount: params.sliceCount,
		packageLayout: params.packageLayout,
		dimensions: params.dimensions ?? null,
		voxelSpacing: params.voxelSpacing ?? null,
		sliceThicknessMm: params.sliceThickness ?? null,
		radiationDose: {
			kvp: params.kvp ?? null,
			ma: params.ma ?? null,
			exposureTimeMs: params.exposureTimeMs ?? null,
			doseAreaProductDap: params.doseAreaProductDap ?? null,
			effectiveDoseMsv: params.effectiveDoseMsv ?? null,
		},
		hardware: {
			manufacturer: params.manufacturer ?? null,
			modelName: params.manufacturerModelName ?? null,
		},
		launchers: {
			webUrl,
			desktopProtocolUrl,
			windowsShortcut: "Открыть в DENTE.url",
			macShortcut: "Открыть в DENTE.webloc",
			macCommand: "Открыть_в_DENTE.command",
		},
		files: {
			manifest: "study_manifest.json",
			primaryFileOrDirectory,
			slicesCount: params.sliceCount,
		},
		generatedAt: new Date().toISOString(),
	};
}

/**
 * Сериализация манифеста в красивый форматированный JSON UTF-8
 */
export function formatStudyManifestJson(manifest: DicomStudyManifest): string {
	return JSON.stringify(manifest, null, 2);
}

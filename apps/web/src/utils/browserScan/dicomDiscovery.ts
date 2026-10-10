import type { DicomWorkstationClientFacts } from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { logger } from "../logger";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../localStorageHelpers";
import type {
	BrowserDirectoryPickerWindow,
	BrowserPickedImagingFolderPreview,
	BrowserPickedImagingScanStats,
	DentalDesktopRuntimeWindow,
} from "./types.js";
import { browserPickedImagingFolderStorageKey } from "./types.js";

export function classifyBrowserImagingFileName(
	fileName: string,
	buffer?: Uint8Array | ArrayBuffer,
): "dicom" | "archive" | "model" | "image" | "other" {
	const lowerName = fileName.toLowerCase();
	const baseName = lowerName.includes("/") || lowerName.includes("\\")
		? lowerName.slice(Math.max(lowerName.lastIndexOf("/"), lowerName.lastIndexOf("\\")) + 1)
		: lowerName;
	const extension = baseName.includes(".")
		? baseName.slice(baseName.lastIndexOf(".") + 1)
		: "";

	if (["dcm", "dicom", "ima"].includes(extension) || baseName === "dicomdir")
		return "dicom";

	// KaVo OP300 / Instrumentarium / Soredex extensionless CBCT slices (e.g. I0000001 - I0000999 or slice_001)
	if (/^i[0-9]{4,}$/i.test(baseName) || /^(?:slice|ct|cbct)[_\-]?[0-9]+$/i.test(baseName)) {
		return "dicom";
	}

	// Binary check: valid DICOM Part 10 preamble with "DICM" magic at offset 128..131
	if (buffer) {
		const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
		if (bytes.length >= 132) {
			if (
				bytes[128] === 0x44 && // 'D'
				bytes[129] === 0x49 && // 'I'
				bytes[130] === 0x43 && // 'C'
				bytes[131] === 0x4d // 'M'
			) {
				return "dicom";
			}
		}
	}

	if (["zip", "7z", "rar"].includes(extension)) return "archive";
	if (["stl", "obj", "ply", "glb", "gltf", "3mf"].includes(extension))
		return "model";
	if (["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"].includes(extension))
		return "image";
	return "other";
}

export async function browserFileHasDicomMagic(file: File): Promise<boolean> {
	if (file.size < 132) return false;
	try {
		const bytes = new Uint8Array(await file.slice(128, 132).arrayBuffer());
		return (
			bytes[0] === 0x44 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x43 &&
			bytes[3] === 0x4d
		);
	} catch {
		return false;
	}
}

export function localImagingFolderFingerprint(folderPath: string): string {
	let hash = 2166136261;
	for (let index = 0; index < folderPath.length; index += 1) {
		hash ^= folderPath.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function browserPickedFolderFingerprint(input: string): string {
	return localImagingFolderFingerprint(input || "browser-local-imaging-folder");
}

export function saveBrowserPickedImagingFolderPreview(
	preview: BrowserPickedImagingFolderPreview,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageSetItem(
			organizationScopedLocalStorageKey(
				browserPickedImagingFolderStorageKey,
				organizationId,
			),
			JSON.stringify(preview),
		);
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to save browser picked imaging folder preview", error);
		// Browser-picked folder summaries are best-effort and contain no raw local path.
	}
}

export function loadBrowserPickedImagingFolderPreview(
	organizationId: string | null | undefined = null,
): BrowserPickedImagingFolderPreview | null {
	if (typeof window === "undefined") return null;
	try {
		const localKey = organizationScopedLocalStorageKey(
			browserPickedImagingFolderStorageKey,
			organizationId,
		);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(browserPickedImagingFolderStorageKey)
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as BrowserPickedImagingFolderPreview;
		if (parsed?.version !== 1 || !parsed.folderFingerprint || !parsed.createdAt)
			return null;
		if (!localSavedAtFresh(parsed.createdAt, localConvenienceRetentionMs)) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(browserPickedImagingFolderStorageKey);
			return null;
		}
		return parsed;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error(
			"Failed to remove browser picked imaging folder preview",
			error,
		);
		return null;
	}
}

export function removeBrowserPickedImagingFolderPreview(
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(
			organizationScopedLocalStorageKey(
				browserPickedImagingFolderStorageKey,
				organizationId,
			),
		);
		if (organizationId)
			safeLocalStorageRemoveItem(browserPickedImagingFolderStorageKey);
	} catch {
		// ignore unavailable storage
	}
}

export function buildBrowserPickedImagingFolderPreview(
	stats: BrowserPickedImagingScanStats,
): BrowserPickedImagingFolderPreview {
	const fingerprint = browserPickedFolderFingerprint(
		[
			stats.rootName,
			stats.scannedFiles,
			stats.scannedFolders,
			stats.dicomLikeFiles,
			stats.archiveFiles,
			stats.modelFiles,
			stats.imageFiles,
			stats.totalBytes,
		].join(":"),
	);
	const hasDicom = stats.dicomLikeFiles > 0;
	const hasModels = stats.modelFiles > 0;
	const nextAction = hasDicom
		? "Найдены файлы КТ/снимков. Для тяжелой КТ откройте эту же папку в локальном модуле клиники или в полноценном просмотрщике КТ."
		: hasModels
			? "Найдены стоматологические 3D-модели. До подключения просмотрщика 3D-моделей держим это как метаданные органайзера."
			: "В ограниченном браузерном сканировании файлы снимков не найдены.";
	return {
		version: 1,
		safeDisplayName: `${hasDicom ? "Браузерная КТ-папка" : "Браузерная папка снимков"} #${fingerprint}`,
		sourceLabel:
			stats.sourceKind === "browser_directory_picker"
				? "Выбор папки браузером"
				: "Выбор файлов браузером",
		sourceKind: stats.sourceKind,
		folderFingerprint: fingerprint,
		rootName: stats.rootName || "Выбранная папка",
		scannedFiles: stats.scannedFiles,
		scannedFolders: stats.scannedFolders,
		dicomLikeFiles: stats.dicomLikeFiles,
		archiveFiles: stats.archiveFiles,
		modelFiles: stats.modelFiles,
		imageFiles: stats.imageFiles,
		totalBytes: stats.totalBytes,
		createdAt: new Date().toISOString(),
		nextAction,
		warnings: stats.warnings,
	};
}

export function hasDentalDesktopShellBridge(): boolean {
	if (typeof window === "undefined") return false;
	const runtimeWindow = window as DentalDesktopRuntimeWindow;
	return Boolean(
		runtimeWindow.dentalCrmDesktop?.dicomBridge ||
			runtimeWindow.dentalCrmDesktop?.localFileBridge ||
			runtimeWindow.__DENTAL_CRM_DESKTOP__ ||
			runtimeWindow.__TAURI__ ||
			runtimeWindow.electronAPI,
	);
}

export function detectDicomRuntimeSurfaceHint(): DicomWorkstationClientFacts["runtimeSurfaceHint"] {
	if (typeof navigator === "undefined") return "unknown";
	if (hasDentalDesktopShellBridge()) return "desktop_app";
	const text =
		`${navigator.platform || ""} ${navigator.userAgent || ""}`.toLowerCase();
	if (/ipad|tablet/.test(text)) return "tablet_web";
	if (/android|iphone|ipod|mobile|phone/.test(text)) return "mobile_web";
	if (/win|mac|linux|x11|desktop/.test(text)) return "desktop_web";
	return "unknown";
}

export async function collectDicomWorkstationClientFacts(): Promise<DicomWorkstationClientFacts> {
	let webgl2Supported = false;
	let webglVendor: string | null = null;
	let webglRenderer: string | null = null;
	let maxTextureSize: number | null = null;
	let max3dTextureSize: number | null = null;
	let maxRenderbufferSize: number | null = null;
	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl2");
		webgl2Supported = Boolean(gl);
		if (gl) {
			maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || null;
			max3dTextureSize =
				Number(gl.getParameter(gl.MAX_3D_TEXTURE_SIZE)) || null;
			maxRenderbufferSize =
				Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || null;
			const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as {
				UNMASKED_VENDOR_WEBGL: number;
				UNMASKED_RENDERER_WEBGL: number;
			} | null;
			if (debugInfo) {
				webglVendor =
					String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "").slice(
						0,
						180,
					) || null;
				webglRenderer =
					String(
						gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "",
					).slice(0, 240) || null;
			}
		}
	} catch {
		webgl2Supported = false;
	}

	const navigatorWithMemory = navigator as Navigator & {
		deviceMemory?: number;
	};
	let storageQuotaMb: number | null = null;
	let storageUsageMb: number | null = null;
	try {
		const estimate = await navigator.storage?.estimate?.();
		storageQuotaMb = estimate?.quota
			? Math.floor(estimate.quota / 1024 / 1024)
			: null;
		storageUsageMb = estimate?.usage
			? Math.floor(estimate.usage / 1024 / 1024)
			: null;
	} catch {
		storageQuotaMb = null;
		storageUsageMb = null;
	}

	const directoryPickerSupported =
		typeof window !== "undefined" &&
		typeof (window as BrowserDirectoryPickerWindow).showDirectoryPicker ===
			"function";
	const desktopShellBridgeSupported = hasDentalDesktopShellBridge();

	return {
		deviceMemoryGb: navigatorWithMemory.deviceMemory ?? null,
		hardwareConcurrency: navigator.hardwareConcurrency || null,
		webgl2Supported,
		webglVendor,
		webglRenderer,
		maxTextureSize,
		max3dTextureSize,
		maxRenderbufferSize,
		devicePixelRatio: window.devicePixelRatio || null,
		offscreenCanvasSupported: typeof OffscreenCanvas !== "undefined",
		webWorkerSupported: typeof Worker !== "undefined",
		indexedDbSupported: typeof indexedDB !== "undefined",
		storageQuotaMb,
		storageUsageMb,
		online: navigator.onLine,
		runtimeSurfaceHint: detectDicomRuntimeSurfaceHint(),
		desktopShellBridgeSupported,
		directoryPickerSupported,
		directoryHandlePersistence: directoryPickerSupported
			? "session_only"
			: "unsupported",
		userAgent: navigator.userAgent.slice(0, 300),
		platform: navigator.platform || null,
	};
}

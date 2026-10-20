/**
 * visiographHotFolderEngine.ts — Autonomous Hot Folder Watcher & 1-Click Tooth Linker Engine.
 *
 * Implements Mandates 8e (Doctor Autonomy, zero sensor lock-in), 8s (Canonical Authority).
 * Features:
 * - Vendor hot folder routing (Vatech, Carestream, Dexis, Planmeca, KaVo, Sirona, etc.)
 * - File System Access API directory watcher with capability detection
 * - Background simulated & hardware dropped file event listeners
 * - Anti-spam queue debouncing with badge counter (+N новых)
 * - 1-Click instant attachment to EMR Form 043/у protocol via `dente:attach-photo-to-visit`
 * - Direct RVG capture viewer launcher via `dente:open-direct-rvg`
 *
 * Conforms to monorepo anti-monolith limit (<500 lines).
 */

import { routeIncomingHotFolder } from "../components/radiology/sensorGateway/hotFolderRouting";
import {
	detectRadiologySensorBrand,
	extractTeethFromRadiologyFilename,
} from "../components/radiology/directRvgFileValidation";
import type {
	VisiographDetectedScan,
	HotFolderWatcherConfig,
	HotFolderScanSimulatedDetail,
	SensorFileDroppedDetail,
	VisiographScanListener,
} from "./visiographHotFolderTypes";

export * from "./visiographHotFolderTypes";

export function formatScanFileSize(bytes: number): string {
	if (!bytes || bytes <= 0) return "0 Б";
	if (bytes < 1024) return `${bytes} Б`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function isFileSystemAccessSupported(): boolean {
	return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export const DEFAULT_HOT_FOLDER_EXTENSIONS: readonly string[] = [
	".dcm",
	".dicom",
	".tif",
	".tiff",
	".png",
	".jpg",
	".jpeg",
	".bmp",
];

export const SENSOR_BRAND_NAMES: Record<string, string> = {
	vatech: "Vatech EzSensor HD",
	carestream: "Carestream / Kodak RVG 5200 / 6200",
	kavo: "KaVo Gendex GXS-700",
	fona: "FONA CDRelite / Schick",
	woodpecker: "Woodpecker i-Sensor H1 / H2",
	planmeca: "Planmeca ProSensor HD",
	sirona: "Dentsply Sirona XIOS XG Supreme",
	dexis: "Dexis Titanium / Platinum",
	acteon: "Acteon / Sopro Sopix2 / PSPIX",
	handy: "Handy HDR-500 / HDR-600",
	myray: "MyRay Zen-X",
	owandy: "Owandy Opteo / One",
	eighteeth: "Eighteeth NanoPix 1 / 2",
	xpect_vision: "Xpect Vision Photon-Counting",
	duerr: "Dürr Dental VistaRay",
	generic: "Универсальный радиовизиограф",
};

export class VisiographHotFolderEngine {
	private static instance: VisiographHotFolderEngine | null = null;

	private config: Required<HotFolderWatcherConfig>;
	private listeners = new Set<VisiographScanListener>();
	private scanQueue: VisiographDetectedScan[] = [];
	private currentActiveScan: VisiographDetectedScan | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private activeDirectoryHandle: FileSystemDirectoryHandle | null = null;
	private seenFiles = new Set<string>();
	private isDestroyed = false;

	// Event listener references for safe unbinding
	private handleSimulatedEventBound = (e: Event) => this.handleSimulatedEvent(e);
	private handleFileDroppedEventBound = (e: Event) => this.handleFileDroppedEvent(e);

	public constructor(config?: HotFolderWatcherConfig) {
		this.config = {
			pollIntervalMs: config?.pollIntervalMs ?? 2500,
			debounceWindowMs: config?.debounceWindowMs ?? 350,
			allowedExtensions: config?.allowedExtensions ?? DEFAULT_HOT_FOLDER_EXTENSIONS,
			defaultBrand: config?.defaultBrand ?? "vatech",
		};

		if (typeof window !== "undefined") {
			window.addEventListener("dente:hotfolder-scan-simulated", this.handleSimulatedEventBound);
			window.addEventListener("dente:sensor-file-dropped", this.handleFileDroppedEventBound);
		}
	}

	public static getInstance(config?: HotFolderWatcherConfig): VisiographHotFolderEngine {
		if (!VisiographHotFolderEngine.instance || VisiographHotFolderEngine.instance.isDestroyed) {
			VisiographHotFolderEngine.instance = new VisiographHotFolderEngine(config);
		}
		return VisiographHotFolderEngine.instance;
	}

	public subscribe(listener: VisiographScanListener): () => void {
		this.listeners.add(listener);
		if (this.currentActiveScan) {
			const queuedAfter = Math.max(0, this.scanQueue.length - 1);
			listener(this.currentActiveScan, queuedAfter);
		}
		return () => {
			this.listeners.delete(listener);
		};
	}

	public getCurrentScan(): VisiographDetectedScan | null {
		return this.currentActiveScan;
	}

	public getQueue(): readonly VisiographDetectedScan[] {
		return this.scanQueue;
	}

	public getQueuedCount(): number {
		if (!this.currentActiveScan) return 0;
		return Math.max(0, this.scanQueue.length - 1);
	}

	public dismissCurrentScan(): void {
		if (this.scanQueue.length > 0) {
			this.scanQueue.shift();
		}
		if (this.scanQueue.length > 0) {
			this.currentActiveScan = this.scanQueue[0] || null;
		} else {
			this.currentActiveScan = null;
		}
		this.notifyListeners();
	}

	public clearQueue(): void {
		this.scanQueue = [];
		this.currentActiveScan = null;
		this.notifyListeners();
	}

	public attachScanToVisit(scan: VisiographDetectedScan, toothNumber?: string): void {
		if (typeof window === "undefined") return;

		const targetTooth = toothNumber || scan.detectedTooth || "16";
		const imageUrl = scan.thumbnailUrl || "/radiology/sample_rvg_tooth16.jpg";
		const scanName = `Рентген RVG: зуб ${targetTooth} (${scan.brandName})`;

		// Native event intercepted in useVisitDiagnosticsTab.ts
		window.dispatchEvent(
			new CustomEvent("dente:attach-photo-to-visit", {
				detail: {
					url: imageUrl,
					name: scanName,
					toothNumber: targetTooth,
					photoType: "xray",
				},
			}),
		);

		this.dismissCurrentScan();
	}

	public openScanInDirectViewer(scan: VisiographDetectedScan, toothNumber?: string): void {
		if (typeof window === "undefined") return;

		const targetTooth = toothNumber || scan.detectedTooth || "16";
		const imageUrl = scan.thumbnailUrl || "/radiology/sample_rvg_tooth16.jpg";

		// Direct event to launch DirectRvgCaptureModal with preloaded image
		window.dispatchEvent(
			new CustomEvent("dente:open-direct-rvg", {
				detail: {
					imageUrl,
					tooth: targetTooth,
					brandName: scan.brandName,
					fileName: scan.fileName,
				},
			}),
		);

		this.dismissCurrentScan();
	}

	public ingestScan(scan: VisiographDetectedScan): void {
		this.scanQueue.push(scan);

		if (!this.currentActiveScan) {
			this.currentActiveScan = scan;
		}

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			if (!this.currentActiveScan || !this.scanQueue.includes(this.currentActiveScan)) {
				this.currentActiveScan = this.scanQueue[0] || null;
			}
			this.notifyListeners();
		}, this.config.debounceWindowMs);
	}

	public simulateIncomingScan(detail: HotFolderScanSimulatedDetail): VisiographDetectedScan {
		const fullPath = detail.folderPath ? `${detail.folderPath}\\${detail.fileName}` : detail.fileName;
		const route = routeIncomingHotFolder(fullPath);
		const resolvedBrand = detail.brand || route.brand;
		const brandName = SENSOR_BRAND_NAMES[resolvedBrand] || detectRadiologySensorBrand(fullPath);
		const extracted = extractTeethFromRadiologyFilename(detail.fileName);
		const detectedTooth = detail.tooth || (extracted.length > 0 ? extracted[0] : undefined);
		const fileSize = detail.fileSize || 1845200;
		const extMatch = detail.fileName.match(/\.[^.]+$/);
		const fileType = extMatch ? extMatch[0].toLowerCase() : ".dcm";

		const scan: VisiographDetectedScan = {
			id: `rvg-scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			fileName: detail.fileName,
			fileSize,
			formattedSize: formatScanFileSize(fileSize),
			fileType,
			brand: resolvedBrand,
			brandName,
			modelId: detail.modelId || route.defaultModelId,
			modelName: brandName,
			folderPath: detail.folderPath || route.matchedFolder,
			detectedAtIso: new Date().toISOString(),
			thumbnailUrl: detail.imageUrl || "/radiology/sample_rvg_tooth16.jpg",
			detectedTooth,
			confidence: route.confidence,
		};

		this.ingestScan(scan);
		return scan;
	}

	public async handleDroppedFile(file: File, folderPath?: string, tooth?: string): Promise<VisiographDetectedScan> {
		const pathOrName = folderPath ? `${folderPath}\\${file.name}` : file.name;
		const route = routeIncomingHotFolder(pathOrName);
		const brandName = SENSOR_BRAND_NAMES[route.brand] || detectRadiologySensorBrand(pathOrName);
		const extracted = extractTeethFromRadiologyFilename(file.name);
		const detectedTooth = tooth || (extracted.length > 0 ? extracted[0] : undefined);
		const extMatch = file.name.match(/\.[^.]+$/);
		const fileType = extMatch ? extMatch[0].toLowerCase() : ".dcm";

		let thumbnailUrl: string | undefined;
		if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
			try {
				if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
					thumbnailUrl = URL.createObjectURL(file);
				}
			} catch {
				thumbnailUrl = "/radiology/sample_rvg_tooth16.jpg";
			}
		} else {
			thumbnailUrl = "/radiology/sample_rvg_tooth16.jpg";
		}

		const scan: VisiographDetectedScan = {
			id: `rvg-dropped-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			fileName: file.name,
			fileSize: file.size,
			formattedSize: formatScanFileSize(file.size),
			fileType,
			brand: route.brand,
			brandName,
			modelId: route.defaultModelId,
			modelName: brandName,
			folderPath: folderPath || route.matchedFolder,
			detectedAtIso: new Date().toISOString(),
			thumbnailUrl,
			file,
			detectedTooth,
			confidence: route.confidence,
		};

		this.ingestScan(scan);
		return scan;
	}

	public async startDirectoryWatcher(handle: FileSystemDirectoryHandle): Promise<void> {
		this.stopDirectoryWatcher();
		this.activeDirectoryHandle = handle;

		// Initial scan to populate seenFiles so we don't spam old files
		await this.scanDirectoryHandle(handle, true);

		this.pollTimer = setInterval(() => {
			void this.scanDirectoryHandle(handle, false);
		}, this.config.pollIntervalMs);
	}

	public stopDirectoryWatcher(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
		this.activeDirectoryHandle = null;
	}

	private async scanDirectoryHandle(handle: FileSystemDirectoryHandle, isInitialPrime: boolean): Promise<void> {
		try {
			// biome-ignore lint/suspicious/noExplicitAny: FileSystemDirectoryHandle async iterable
			const entries = (handle as any).values();
			for await (const entry of entries) {
				if (entry.kind === "file") {
					const fileName = entry.name as string;
					const lower = fileName.toLowerCase();
					const isAllowed = this.config.allowedExtensions.some((ext) => lower.endsWith(ext));
					if (!isAllowed) continue;

					const fileHandle = entry as FileSystemFileHandle;
					const file = await fileHandle.getFile();
					const fileKey = `${fileName}:${file.size}:${file.lastModified}`;

					if (this.seenFiles.has(fileKey)) {
						continue;
					}

					this.seenFiles.add(fileKey);

					if (!isInitialPrime) {
						await this.handleDroppedFile(file, `C:\\${handle.name}`);
					}
				}
			}
		} catch {
			// Quiet fault tolerance: permission revoked or directory disconnected
		}
	}

	private handleSimulatedEvent(e: Event): void {
		const custom = e as CustomEvent<HotFolderScanSimulatedDetail>;
		if (custom.detail?.fileName) {
			this.simulateIncomingScan(custom.detail);
		}
	}

	private handleFileDroppedEvent(e: Event): void {
		const custom = e as CustomEvent<SensorFileDroppedDetail>;
		if (custom.detail?.file) {
			void this.handleDroppedFile(custom.detail.file, custom.detail.folderPath, custom.detail.tooth);
		}
	}

	private notifyListeners(): void {
		const count = this.getQueuedCount();
		for (const listener of this.listeners) {
			try {
				// biome-ignore lint/suspicious/noExplicitAny: safe caller
				listener(this.currentActiveScan as any, count);
			} catch {
				// Prevent listener crash from breaking loop
			}
		}
	}

	public destroy(): void {
		this.isDestroyed = true;
		this.stopDirectoryWatcher();
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (typeof window !== "undefined") {
			window.removeEventListener("dente:hotfolder-scan-simulated", this.handleSimulatedEventBound);
			window.removeEventListener("dente:sensor-file-dropped", this.handleFileDroppedEventBound);
		}
		this.listeners.clear();
		this.scanQueue = [];
		this.currentActiveScan = null;
		VisiographHotFolderEngine.instance = null;
	}
}

export function getVisiographHotFolderEngine(): VisiographHotFolderEngine {
	return VisiographHotFolderEngine.getInstance();
}

/**
 * apps/web/src/services/storage/chairsideMemoryShield.ts
 *
 * DENTE CRM — Chairside Monoblock RAM & VRAM Shield (12-Hour Shift Protection).
 * Standards: Mandate 8e (Doctor Autonomy), 8p, 8n (Solo Doctor & Low-Spec 4GB Monoblock).
 *
 * Invariants:
 * 1. Immediate VRAM release on tab/patient switch (canvas.width = 1, height = 1 + WEBGL_lose_context).
 * 2. Strict LRU cache eviction for RVG buffers & URL.revokeObjectURL().
 * 3. DOM containment (contain: strict; content-visibility: auto;) on background workspaces.
 * 4. Zero memory thrashing across continuous 8-12 hour dental chairside duty.
 * 5. Strict line ceiling < 500 lines.
 */

import { isLowSpecDevice } from "../../utils/lowSpecHdd/hardwareDetector.js";

export interface MemoryShieldConfig {
	maxRvgCacheItems: number;
	maxRvgCacheBytes: number;
	autoPurgeOnVisibilityHidden: boolean;
	enabled: boolean;
}

export interface CachedRvgImage {
	studyId: string;
	blobOrBuffer?: Blob | ArrayBuffer | Uint8Array | undefined;
	objectUrl?: string | undefined;
	byteSize: number;
	width?: number | undefined;
	height?: number | undefined;
	createdAt: number;
	lastAccessedAt: number;
}

export interface MemoryShieldMetrics {
	registeredCanvasCount: number;
	registeredContainerCount: number;
	rvgCacheItemCount: number;
	rvgCacheSizeBytes: number;
	maxRvgCacheBytes: number;
	totalVramPurges: number;
	lastPurgeAt: number | null;
	isLowSpec: boolean;
	isShieldActive: boolean;
}

interface RegisteredCanvasRecord {
	id: string;
	canvas: HTMLCanvasElement;
	ownerModule: string;
	isWebGL: boolean;
	originalWidth: number;
	originalHeight: number;
}

interface RegisteredContainerRecord {
	id: string;
	element: HTMLElement;
	ownerModule: string;
	isHibernated: boolean;
}


const DEFAULT_LOW_SPEC_CONFIG: MemoryShieldConfig = {
	maxRvgCacheItems: 8,
	maxRvgCacheBytes: 20 * 1024 * 1024,
	autoPurgeOnVisibilityHidden: true,
	enabled: true,
};

const DEFAULT_STANDARD_CONFIG: MemoryShieldConfig = {
	maxRvgCacheItems: 24,
	maxRvgCacheBytes: 80 * 1024 * 1024,
	autoPurgeOnVisibilityHidden: true,
	enabled: true,
};

class ChairsideMemoryShieldService {
	private config: MemoryShieldConfig;
	private canvasRegistry = new Map<string, RegisteredCanvasRecord>();
	private containerRegistry = new Map<string, RegisteredContainerRecord>();
	private rvgCache = new Map<string, CachedRvgImage>();
	private rvgCurrentBytes = 0;
	private totalVramPurges = 0;
	private lastPurgeAt: number | null = null;
	private isInitialized = false;
	private listeners = new Set<(metrics: MemoryShieldMetrics) => void>();
	private boundVisibilityListener: (() => void) | null = null;

	constructor() {
		const isLow = typeof window !== "undefined" && isLowSpecDevice();
		this.config = isLow ? { ...DEFAULT_LOW_SPEC_CONFIG } : { ...DEFAULT_STANDARD_CONFIG };
	}

	public initialize(): void {
		if (this.isInitialized || typeof window === "undefined" || typeof document === "undefined") return;
		this.isInitialized = true;
		const isLow = isLowSpecDevice();
		this.config = isLow ? { ...DEFAULT_LOW_SPEC_CONFIG } : { ...DEFAULT_STANDARD_CONFIG };

		this.boundVisibilityListener = () => {
			if (document.visibilityState === "hidden") {
				if (this.config.autoPurgeOnVisibilityHidden) {
					this.hibernateAllContainers();
					if (isLowSpecDevice()) this.purgeAllCanvases();
				}
			} else if (document.visibilityState === "visible") {
				this.wakeAllContainers();
			}
			this.notifyMetricsChange();
		};

		document.addEventListener("visibilitychange", this.boundVisibilityListener);
		this.notifyMetricsChange();
	}

	public destroy(): void {
		if (typeof document !== "undefined" && this.boundVisibilityListener) {
			document.removeEventListener("visibilitychange", this.boundVisibilityListener);
			this.boundVisibilityListener = null;
		}
		this.clearRvgCache();
		this.canvasRegistry.clear();
		this.containerRegistry.clear();
		this.listeners.clear();
		this.isInitialized = false;
		const isLow = typeof window !== "undefined" && isLowSpecDevice();
		this.config = isLow ? { ...DEFAULT_LOW_SPEC_CONFIG } : { ...DEFAULT_STANDARD_CONFIG };
	}


	public configure(newConfig: Partial<MemoryShieldConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.enforceRvgCacheLimits();
		this.notifyMetricsChange();
	}

	public getConfig(): Readonly<MemoryShieldConfig> {
		return { ...this.config };
	}

	// ─── 1. CANVAS VRAM REGISTRATION & PURGING ──────────────────────────────
	public registerCanvas(
		id: string,
		canvas: HTMLCanvasElement,
		metadata?: { ownerModule?: string; isWebGL?: boolean },
	): void {
		if (!canvas) return;
		this.canvasRegistry.set(id, {
			id,
			canvas,
			ownerModule: metadata?.ownerModule || "general",
			isWebGL: metadata?.isWebGL ?? false,
			originalWidth: canvas.width || 300,
			originalHeight: canvas.height || 150,
		});
		this.notifyMetricsChange();
	}

	public unregisterCanvas(id: string): void {
		this.canvasRegistry.delete(id);
		this.notifyMetricsChange();
	}

	public purgeCanvasVram(canvas: HTMLCanvasElement): boolean {
		if (!canvas) return false;
		try {
			const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") ||
				(canvas as unknown as { _gl?: WebGLRenderingContext })._gl;
			if (gl && typeof (gl as WebGLRenderingContext).getExtension === "function") {
				try {
					const loseExt = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
					loseExt?.loseContext?.();
				} catch { /* ignore extension errors */ }
			}
			try {
				const ctx2d = canvas.getContext("2d");
				ctx2d?.clearRect(0, 0, Math.max(canvas.width, 1), Math.max(canvas.height, 1));
			} catch { /* ignore context conflict */ }

			canvas.width = 1;
			canvas.height = 1;
			this.totalVramPurges++;
			this.lastPurgeAt = Date.now();
			return true;
		} catch {
			return false;
		}
	}

	public purgeAllCanvases(filterOwnerModule?: string): number {
		let purged = 0;
		for (const [id, record] of Array.from(this.canvasRegistry.entries())) {
			if (filterOwnerModule && record.ownerModule !== filterOwnerModule) continue;
			if (this.purgeCanvasVram(record.canvas)) purged++;
		}
		this.notifyMetricsChange();
		return purged;
	}

	// ─── 2. DOM WORKSPACE CONTAINMENT & HIBERNATION ─────────────────────────
	public registerHeavyContainer(
		id: string,
		element: HTMLElement,
		metadata?: { ownerModule?: string },
	): void {
		if (!element) return;
		this.containerRegistry.set(id, {
			id,
			element,
			ownerModule: metadata?.ownerModule || "workspace",
			isHibernated: false,
		});
		this.notifyMetricsChange();
	}

	public unregisterHeavyContainer(id: string): void {
		const record = this.containerRegistry.get(id);
		if (record) {
			this.applyContainerHibernation(record.element, false);
			this.containerRegistry.delete(id);
			this.notifyMetricsChange();
		}
	}

	public hibernateContainer(id: string): boolean {
		const record = this.containerRegistry.get(id);
		if (!record) return false;
		record.isHibernated = true;
		this.applyContainerHibernation(record.element, true);
		return true;
	}

	public wakeContainer(id: string): boolean {
		const record = this.containerRegistry.get(id);
		if (!record) return false;
		record.isHibernated = false;
		this.applyContainerHibernation(record.element, false);
		return true;
	}

	public hibernateAllContainers(): void {
		for (const record of Array.from(this.containerRegistry.values())) {
			record.isHibernated = true;
			this.applyContainerHibernation(record.element, true);
		}
	}

	public wakeAllContainers(): void {
		for (const record of Array.from(this.containerRegistry.values())) {
			record.isHibernated = false;
			this.applyContainerHibernation(record.element, false);
		}
	}

	public onPatientSwitched(activeModuleId?: string): void {
		this.purgeAllCanvases();
		for (const record of Array.from(this.containerRegistry.values())) {
			const shouldHibernate = Boolean(activeModuleId && record.ownerModule !== activeModuleId);
			record.isHibernated = shouldHibernate;
			this.applyContainerHibernation(record.element, shouldHibernate);
		}
		this.enforceRvgCacheLimits();
		this.notifyMetricsChange();
	}


	private applyContainerHibernation(el: HTMLElement, hibernate: boolean): void {
		if (hibernate) {
			el.classList.add("dente-vram-shield-inactive");
			el.setAttribute("data-vram-shield-state", "inactive");
		} else {
			el.classList.remove("dente-vram-shield-inactive");
			el.setAttribute("data-vram-shield-state", "active");
		}
	}

	// ─── 3. LRU RVG / X-RAY CACHE (HEAP RELEASE) ───────────────────────────
	public cacheRvgImage(
		studyId: string,
		image: {
			blob?: Blob;
			buffer?: ArrayBuffer | Uint8Array;
			objectUrl?: string;
			byteSize?: number;
			width?: number;
			height?: number;
		},
	): void {
		if (!studyId) return;
		if (this.rvgCache.has(studyId)) this.evictRvgItem(studyId);

		const byteSize = image.byteSize ?? this.estimateByteSize(image);
		const entry: CachedRvgImage = {
			studyId,
			blobOrBuffer: image.blob || image.buffer,
			objectUrl: image.objectUrl,
			byteSize,
			width: image.width,
			height: image.height,
			createdAt: Date.now(),
			lastAccessedAt: Date.now(),
		};

		this.rvgCache.set(studyId, entry);
		this.rvgCurrentBytes += byteSize;
		this.enforceRvgCacheLimits();
		this.notifyMetricsChange();
	}

	public getRvgImage(studyId: string): CachedRvgImage | null {
		const item = this.rvgCache.get(studyId);
		if (!item) return null;
		this.rvgCache.delete(studyId);
		item.lastAccessedAt = Date.now();
		this.rvgCache.set(studyId, item);
		return item;
	}

	public hasRvgImage(studyId: string): boolean {
		return this.rvgCache.has(studyId);
	}

	public clearRvgCache(): void {
		for (const studyId of Array.from(this.rvgCache.keys())) {
			this.evictRvgItem(studyId);
		}
		this.rvgCurrentBytes = 0;
		this.notifyMetricsChange();
	}

	private evictRvgItem(studyId: string): void {
		const item = this.rvgCache.get(studyId);
		if (!item) return;
		if (item.objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
			try {
				URL.revokeObjectURL(item.objectUrl);
			} catch { /* ignore */ }
		}
		item.blobOrBuffer = undefined;
		item.objectUrl = undefined;
		this.rvgCurrentBytes = Math.max(0, this.rvgCurrentBytes - item.byteSize);
		this.rvgCache.delete(studyId);
	}

	private enforceRvgCacheLimits(): void {
		while (this.rvgCache.size > this.config.maxRvgCacheItems) {
			const oldestKey = this.rvgCache.keys().next().value;
			if (!oldestKey) break;
			this.evictRvgItem(oldestKey);
		}
		while (this.rvgCurrentBytes > this.config.maxRvgCacheBytes && this.rvgCache.size > 0) {
			const oldestKey = this.rvgCache.keys().next().value;
			if (!oldestKey) break;
			this.evictRvgItem(oldestKey);
		}
	}

	private estimateByteSize(image: {
		blob?: Blob;
		buffer?: ArrayBuffer | Uint8Array;
		width?: number;
		height?: number;
	}): number {
		if (image.blob) return image.blob.size;
		if (image.buffer) return image.buffer.byteLength;
		if (image.width && image.height) return image.width * image.height * 4;
		return 1024 * 1024;
	}

	// ─── 4. TELEMETRY, AUDIT & MANUAL EMERGENCY FLUSH ────────────────────────
	public purgeAllVramAndCache(): {
		freedCanvases: number;
		freedRvgItems: number;
		freedBytes: number;
	} {
		const prevBytes = this.rvgCurrentBytes;
		const prevRvgCount = this.rvgCache.size;
		const freedCanvases = this.purgeAllCanvases();
		this.clearRvgCache();

		this.totalVramPurges++;
		this.lastPurgeAt = Date.now();
		this.notifyMetricsChange();

		return {
			freedCanvases,
			freedRvgItems: prevRvgCount,
			freedBytes: prevBytes,
		};
	}

	public getMetrics(): MemoryShieldMetrics {
		return {
			registeredCanvasCount: this.canvasRegistry.size,
			registeredContainerCount: this.containerRegistry.size,
			rvgCacheItemCount: this.rvgCache.size,
			rvgCacheSizeBytes: this.rvgCurrentBytes,
			maxRvgCacheBytes: this.config.maxRvgCacheBytes,
			totalVramPurges: this.totalVramPurges,
			lastPurgeAt: this.lastPurgeAt,
			isLowSpec: typeof window !== "undefined" ? isLowSpecDevice() : false,
			isShieldActive: this.config.enabled,
		};
	}

	public subscribe(listener: (metrics: MemoryShieldMetrics) => void): () => void {
		this.listeners.add(listener);
		listener(this.getMetrics());
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notifyMetricsChange(): void {
		if (this.listeners.size === 0) return;
		const metrics = this.getMetrics();
		for (const listener of this.listeners) {
			try {
				listener(metrics);
			} catch { /* ignore */ }
		}
	}
}

export const chairsideMemoryShield = new ChairsideMemoryShieldService();

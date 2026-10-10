/**
 * DENTE CRM — CBCT 3D / WebGL2 Render Lifecycle & VRAM Hibernation Manager
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i, Cybermed OnDemand3D
 *
 * Responsibilities:
 * 1. Tab visibility hibernation (0% GPU/RAF load when document.visibilityState === 'hidden').
 * 2. WebGL2 Context Loss interception (e.preventDefault()) and graceful tier downclocking.
 * 3. Texture allocation tracking and leak-free VRAM disposal upon unmount or study switch.
 */

import { CBCT_HIBERNATION_POLL_INTERVAL_MS } from "./types.js";
import { calculateTextureVramMb } from "./resolutionScaler.js";

export type CbctLifecycleState = "active" | "hibernating" | "context_lost" | "disposed";

export interface CbctVramTextureRecord {
	readonly id: string;
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly bytesPerVoxel: number;
	readonly sizeMb: number;
	readonly allocatedAtMs: number;
}

export type CbctLifecycleListener = (state: CbctLifecycleState) => void;

/**
 * Checks whether visibilityState mandates hibernation.
 */
export function shouldHibernateOnVisibility(visibilityState: string): boolean {
	return visibilityState === "hidden";
}

/**
 * High-performance lifecycle & VRAM allocation controller for CBCT WebGL2 viewports.
 */
export class CbctRenderLifecycleManager {
	private state: CbctLifecycleState = "active";
	private readonly textures = new Map<string, CbctVramTextureRecord>();
	private readonly listeners = new Set<CbctLifecycleListener>();
	private previousActiveState: "active" | "hibernating" = "active";

	constructor(initialState: CbctLifecycleState = "active") {
		this.state = initialState;
		if (initialState === "active" || initialState === "hibernating") {
			this.previousActiveState = initialState;
		}
	}

	public getState(): CbctLifecycleState {
		return this.state;
	}

	public isHibernating(): boolean {
		return this.state === "hibernating";
	}

	public isActive(): boolean {
		return this.state === "active";
	}

	public isContextLost(): boolean {
		return this.state === "context_lost";
	}

	public isDisposed(): boolean {
		return this.state === "disposed";
	}

	/**
	 * Updates tab visibility state. If tab becomes hidden, switches to hibernation (0% GPU load).
	 * If tab becomes visible, resumes active state.
	 */
	public setTabVisibility(visibilityState: "visible" | "hidden" | string): void {
		if (this.state === "disposed" || this.state === "context_lost") {
			return;
		}

		if (shouldHibernateOnVisibility(visibilityState)) {
			this.transitionTo("hibernating");
		} else {
			this.transitionTo("active");
		}
	}

	/**
	 * Handles WebGL context loss event: prevents browser default drop, enters context_lost state.
	 */
	public handleContextLost(event?: { preventDefault?: () => void }): void {
		if (this.state === "disposed") return;
		if (event?.preventDefault) {
			event.preventDefault();
		}
		this.transitionTo("context_lost");
	}

	/**
	 * Handles WebGL context restored event: returns to previous active state.
	 */
	public handleContextRestored(): void {
		if (this.state === "disposed") return;
		this.transitionTo(this.previousActiveState);
	}

	/**
	 * Registers a newly allocated 3D volume texture to monitor VRAM budget.
	 */
	public trackTextureAllocation(
		id: string,
		width: number,
		height: number,
		depth: number,
		bytesPerVoxel = 2,
	): CbctVramTextureRecord {
		const sizeMb = calculateTextureVramMb(width, height, depth, bytesPerVoxel);
		const record: CbctVramTextureRecord = {
			id,
			width,
			height,
			depth,
			bytesPerVoxel,
			sizeMb,
			allocatedAtMs: Date.now(),
		};
		this.textures.set(id, record);
		return record;
	}

	/**
	 * Releases tracking for a disposed texture.
	 */
	public releaseTextureAllocation(id: string): boolean {
		return this.textures.delete(id);
	}

	/**
	 * Releases tracking for all textures.
	 */
	public releaseAllTextures(): void {
		this.textures.clear();
	}

	/**
	 * Returns sum of all tracked texture footprints in MB.
	 */
	public getTotalAllocatedVramMb(): number {
		let total = 0;
		for (const record of this.textures.values()) {
			total += record.sizeMb;
		}
		return Number(total.toFixed(2));
	}

	/**
	 * Returns number of tracked textures currently in VRAM.
	 */
	public getAllocatedTextureCount(): number {
		return this.textures.size;
	}

	/**
	 * Subscribes to lifecycle state changes.
	 */
	public subscribe(listener: CbctLifecycleListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Complete disposal of the lifecycle manager and release of all resource references.
	 */
	public dispose(): void {
		if (this.state === "disposed") return;
		this.releaseAllTextures();
		this.transitionTo("disposed");
		this.listeners.clear();
	}

	/**
	 * Returns recommended polling interval for hibernation telemetry in ms.
	 */
	public getHibernationPollIntervalMs(): number {
		return CBCT_HIBERNATION_POLL_INTERVAL_MS;
	}

	private transitionTo(newState: CbctLifecycleState): void {
		if (this.state === newState) return;
		if (this.state === "active" || this.state === "hibernating") {
			this.previousActiveState = this.state;
		}
		this.state = newState;
		for (const listener of this.listeners) {
			try {
				listener(newState);
			} catch {
				// Prevent subscriber error from breaking lifecycle transition
			}
		}
	}
}

/**
 * Factory helper for creating a CbctRenderLifecycleManager instance.
 */
export function createCbctLifecycleManager(options?: {
	initialState?: CbctLifecycleState;
	onStateChange?: CbctLifecycleListener;
}): CbctRenderLifecycleManager {
	const manager = new CbctRenderLifecycleManager(options?.initialState ?? "active");
	if (options?.onStateChange) {
		manager.subscribe(options.onStateChange);
	}
	return manager;
}

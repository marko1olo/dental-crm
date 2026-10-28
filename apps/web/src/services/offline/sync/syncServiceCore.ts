import { logger } from "../../../utils/logger";
import { executeDrainOutbox } from "./syncDrainQueue";
import { SyncNetworkWatcher } from "./syncNetworkWatcher";
import type { SyncBatchDrainOptions, SyncBatchDrainResult, SyncEventListener } from "../types";

export class OfflineSyncService {
	private static instance: OfflineSyncService | null = null;
	private isDraining = false;
	private listeners = new Set<SyncEventListener>();
	private watcher = new SyncNetworkWatcher();

	constructor() {
		this.watcher.initLifecycle(() => this.drainOutbox().then(() => {}), () => this.isDraining);
	}

	public static getInstance(): OfflineSyncService {
		if (!OfflineSyncService.instance) OfflineSyncService.instance = new OfflineSyncService();
		return OfflineSyncService.instance;
	}

	public startAutoSyncHeartbeat(intervalMs = 15000): void {
		this.watcher.startHeartbeat(intervalMs, () => this.drainOutbox().then(() => {}), () => this.isDraining);
	}

	public stopAutoSyncHeartbeat(): void { this.watcher.stopHeartbeat(); }

	public initBrowserLifecycleListeners(): () => void {
		return this.watcher.initLifecycle(() => this.drainOutbox().then(() => {}), () => this.isDraining);
	}

	public cleanupBrowserLifecycleListeners(): void { this.watcher.cleanup(); }
	public async isBatterySaverActive(): Promise<boolean> { return this.watcher.isBatterySaver(); }

	public subscribe(listener: SyncEventListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private emit(type: "progress" | "complete" | "conflict" | "error" | "slow_drain", data: unknown): void {
		for (const l of this.listeners) {
			try { l({ type, data }); } catch (err) { logger.error("[OfflineSyncService] Listener error", err); }
		}
	}

	public isDrainActive(): boolean { return this.isDraining; }

	public async drainOutbox(options: SyncBatchDrainOptions = {}): Promise<SyncBatchDrainResult> {
		if (this.isDraining) {
			logger.warn("[OfflineSyncService] Drain is already in progress, skipping concurrent trigger");
			return { processedCount: 0, appliedCount: 0, duplicateCount: 0, mergedCount: 0, rejectedCount: 0, failedCount: 0, conflicts: [], errors: [] };
		}
		this.isDraining = true;
		try {
			return await executeDrainOutbox(options, (t, d) => this.emit(t, d));
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			logger.error("[OfflineSyncService] Critical drain error", err);
			this.emit("error", { error: errorMsg });
			return { processedCount: 0, appliedCount: 0, duplicateCount: 0, mergedCount: 0, rejectedCount: 0, failedCount: 0, conflicts: [], errors: [] };
		} finally {
			this.isDraining = false;
		}
	}
}

export const offlineSyncService = OfflineSyncService.getInstance();

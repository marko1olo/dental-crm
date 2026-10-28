import { logger } from "../../../utils/logger";
import { getPendingOfflineMutations } from "./syncStorageBridge";
import { flushOfflinePatientBookings } from "../../../pwa/patientOfflineStorage";

export class SyncNetworkWatcher {
	private autoDrainIntervalId: ReturnType<typeof setInterval> | null = null;
	private isListening = false;
	private cleanupFn: (() => void) | null = null;

	public startHeartbeat(intervalMs: number, onDrain: () => Promise<void>, isDraining: () => boolean): void {
		if (typeof window === "undefined" || this.autoDrainIntervalId) return;
		this.autoDrainIntervalId = setInterval(() => {
			if (typeof navigator !== "undefined" && navigator.onLine === false) return;
			if (typeof document !== "undefined" && document.hidden) return;
			if (isDraining()) return;
			void (async () => {
				try {
					const pending = await getPendingOfflineMutations();
					if (pending.length > 0 && !isDraining()) {
						logger.info(`[OfflineSyncService] Heartbeat auto-draining ${pending.length} pending mutations`);
						await onDrain();
					}
				} catch {}
			})();
		}, intervalMs);
	}

	public stopHeartbeat(): void {
		if (this.autoDrainIntervalId) {
			clearInterval(this.autoDrainIntervalId);
			this.autoDrainIntervalId = null;
		}
	}

	public initLifecycle(onDrain: () => Promise<void>, isDraining: () => boolean): () => void {
		if (this.isListening || typeof window === "undefined") return () => {};
		this.isListening = true;

		const trigger = () => {
			if (typeof navigator !== "undefined" && navigator.onLine === false) return;
			if (isDraining()) return;
			void (async () => {
				try {
					const pending = await getPendingOfflineMutations();
					if (pending.length > 0 && !isDraining()) {
						logger.info(`[OfflineSyncService] Auto-draining ${pending.length} pending mutations on restore`);
						await onDrain();
					}
					try { await flushOfflinePatientBookings(); } catch (err) { logger.warn("[OfflineSyncService] PWA flush err", err); }
				} catch (err) { logger.warn("[OfflineSyncService] Auto-drain on visibility restore failed", err); }
			})();
		};

		const onVis = () => { if (typeof document !== "undefined" && document.visibilityState === "visible") trigger(); };
		if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
			document.addEventListener("visibilitychange", onVis);
		}
		if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
			window.addEventListener("focus", trigger);
			window.addEventListener("online", trigger);
			window.addEventListener("dente:network-online", trigger);
		}
		this.startHeartbeat(15000, onDrain, isDraining);

		this.cleanupFn = () => {
			this.isListening = false;
			this.stopHeartbeat();
			if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
				document.removeEventListener("visibilitychange", onVis);
			}
			if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
				window.removeEventListener("focus", trigger);
				window.removeEventListener("online", trigger);
				window.removeEventListener("dente:network-online", trigger);
			}
		};
		return this.cleanupFn;
	}

	public cleanup(): void {
		if (this.cleanupFn) { this.cleanupFn(); this.cleanupFn = null; }
	}

	public async isBatterySaver(): Promise<boolean> {
		if (typeof navigator === "undefined" || typeof (navigator as unknown as { getBattery?: () => Promise<unknown> }).getBattery !== "function") return false;
		try {
			const b = await (navigator as unknown as { getBattery: () => Promise<{ level?: number; charging?: boolean }> }).getBattery();
			return !b?.charging && (b?.level ?? 1.0) <= 0.15;
		} catch { return false; }
	}
}

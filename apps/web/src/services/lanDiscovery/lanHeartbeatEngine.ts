import { logger } from "../../utils/logger";
import { HEARTBEAT_INTERVAL_IDLE_MS, type DiscoveredLanServer, type LanHeartbeatState } from "./types";
import { cachedDiscoveredServer } from "./lanStorageState";
import { discoverLocalClinicServer } from "./lanProbeCore";
import { getBatteryState, initBatteryListener } from "./lanBatteryListener";
import { initVisibilityObserver, isDocumentCurrentlyHidden } from "./lanVisibilityListener";
import { computeAdaptiveHeartbeatInterval, initNetworkConnectivityListeners } from "./lanNetworkListeners";

export class LanDiscoveryHeartbeatManager {
	private static instance: LanDiscoveryHeartbeatManager | null = null;
	private timerId: ReturnType<typeof setTimeout> | null = null;
	private isRunning = false;
	private currentIntervalMs = HEARTBEAT_INTERVAL_IDLE_MS;
	private isCloudReachable = true;
	private isLowBatteryDischarging = false;
	private isDocumentHidden = isDocumentCurrentlyHidden();
	private listeners = new Set<(server: DiscoveredLanServer | null) => void>();
	private netCleanup: (() => void) | null = null;
	private visibilityCleanup: (() => void) | null = null;
	private batteryCleanup: (() => void) | null = null;

	public static getInstance(): LanDiscoveryHeartbeatManager {
		if (!LanDiscoveryHeartbeatManager.instance) LanDiscoveryHeartbeatManager.instance = new LanDiscoveryHeartbeatManager();
		return LanDiscoveryHeartbeatManager.instance;
	}

	public start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.netCleanup = initNetworkConnectivityListeners({
			onOnline: () => { this.setCloudReachable(true); this.scheduleNextTick(0); },
			onOffline: () => { this.setCloudReachable(false); },
		});
		this.visibilityCleanup = initVisibilityObserver({ onVisibilityChange: (h) => this.setDocumentHidden(h) });
		void this.initBattery();
		this.scheduleNextTick(0);
	}

	public stop(): void {
		this.isRunning = false;
		if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
		if (this.netCleanup) { this.netCleanup(); this.netCleanup = null; }
		if (this.visibilityCleanup) { this.visibilityCleanup(); this.visibilityCleanup = null; }
		if (this.batteryCleanup) { try { this.batteryCleanup(); } catch {} this.batteryCleanup = null; }
	}

	public setDocumentHidden(hidden: boolean): void {
		const was = this.isDocumentHidden;
		this.isDocumentHidden = hidden;
		this.recalculateInterval();
		if (was && !hidden && this.isRunning) this.scheduleNextTick(0);
		else if (!was && hidden && this.isCloudReachable && this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
	}

	public isHidden(): boolean { return this.isDocumentHidden; }
	public setCloudReachable(reachable: boolean): void {
		this.isCloudReachable = reachable;
		this.recalculateInterval();
		if (!reachable && this.isRunning) this.scheduleNextTick(0);
	}

	public setLowBatteryState(isLow: boolean): void {
		this.isLowBatteryDischarging = isLow;
		this.recalculateInterval();
	}

	public async checkBatteryStatus(): Promise<boolean> {
		const state = await getBatteryState();
		this.setLowBatteryState(state.isLowBatteryDischarging);
		return this.isLowBatteryDischarging;
	}

	private recalculateInterval(): void {
		this.setInterval(computeAdaptiveHeartbeatInterval({
			isDocumentHidden: this.isDocumentHidden,
			isCloudReachable: this.isCloudReachable,
			isLowBatteryDischarging: this.isLowBatteryDischarging,
		}));
	}

	public setInterval(intervalMs: number): void {
		this.currentIntervalMs = intervalMs;
		if (this.isRunning && this.timerId) { clearTimeout(this.timerId); this.scheduleNextTick(this.currentIntervalMs); }
	}

	public getInterval(): number { return this.currentIntervalMs; }
	public getState(): LanHeartbeatState & { isLowBatteryDischarging: boolean; isDocumentHidden: boolean } {
		return {
			isRunning: this.isRunning, currentIntervalMs: this.currentIntervalMs, lastDiscoveredServer: cachedDiscoveredServer,
			isCloudReachable: this.isCloudReachable, isLowBatteryDischarging: this.isLowBatteryDischarging, isDocumentHidden: this.isDocumentHidden,
		};
	}

	public onServerChanged(listener: (server: DiscoveredLanServer | null) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private async initBattery(): Promise<void> {
		this.batteryCleanup = await initBatteryListener(() => void this.checkBatteryStatus());
		await this.checkBatteryStatus();
	}

	private scheduleNextTick(delayMs: number): void {
		if (!this.isRunning) return;
		if (this.timerId) clearTimeout(this.timerId);
		this.timerId = setTimeout(async () => {
			try {
				if (this.isDocumentHidden && this.isCloudReachable) return;
				const prevServerId = cachedDiscoveredServer?.serverId;
				const server = await discoverLocalClinicServer({ forceRefresh: true });
				if (server?.serverId !== prevServerId) {
					for (const l of this.listeners) {
						try { l(server); } catch (err) { logger.error("[LanDiscovery] Listener error", err); }
					}
				}
			} catch (err) {
				logger.debug("[LanDiscovery] Heartbeat tick failed", err);
			} finally {
				if (this.isRunning && !(this.isDocumentHidden && this.isCloudReachable)) this.scheduleNextTick(this.currentIntervalMs);
			}
		}, delayMs);
	}
}

export const lanHeartbeatManager = LanDiscoveryHeartbeatManager.getInstance();

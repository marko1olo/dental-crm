export interface DiscoveredLanServer {
	serverName: string;
	serverId: string;
	baseUrl: string;
	apiPort: number;
	hostname: string;
	lanAddresses: string[];
	version: string;
	status: "online" | "degraded";
	latencyMs: number;
	discoveredAt: string;
}

export interface LanDiscoveryOptions {
	timeoutMs?: number;
	additionalCandidates?: string[];
	forceRefresh?: boolean;
}

export interface BatteryState {
	isSupported: boolean;
	level: number;
	charging: boolean;
	isLowBatteryDischarging: boolean;
}

export interface LanHeartbeatState {
	isRunning: boolean;
	currentIntervalMs: number;
	lastDiscoveredServer: DiscoveredLanServer | null;
	isCloudReachable: boolean;
	isDocumentHidden?: boolean;
}

export const DEFAULT_LAN_BEACON_PORT = 4101;
export const DEFAULT_LAN_PROBE_TIMEOUT_MS = 300;

export const HEARTBEAT_INTERVAL_ACTIVE_MS = 4000;
export const HEARTBEAT_INTERVAL_IDLE_MS = 45000;
export const HEARTBEAT_INTERVAL_LOW_BATTERY_MS = 120000;
export const HEARTBEAT_INTERVAL_HIDDEN_MS = 180000;
export const LOW_BATTERY_THRESHOLD = 0.15;

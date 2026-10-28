import { logger } from "../../utils/logger";
import {
	HEARTBEAT_INTERVAL_ACTIVE_MS,
	HEARTBEAT_INTERVAL_HIDDEN_MS,
	HEARTBEAT_INTERVAL_IDLE_MS,
	HEARTBEAT_INTERVAL_LOW_BATTERY_MS,
} from "./types";

export interface NetworkListenerHandlers {
	onOnline: () => void;
	onOffline: () => void;
}

export function initNetworkConnectivityListeners(handlers: NetworkListenerHandlers): (() => void) | null {
	if (typeof window === "undefined") return null;

	const online = () => {
		logger.info("[LanDiscovery] Network online event received — restoring idle/battery heartbeat");
		handlers.onOnline();
	};

	const offline = () => {
		logger.info("[LanDiscovery] Network offline event received — activating fast LAN discovery");
		handlers.onOffline();
	};

	window.addEventListener("online", online);
	window.addEventListener("offline", offline);

	return () => {
		window.removeEventListener("online", online);
		window.removeEventListener("offline", offline);
	};
}

export function computeAdaptiveHeartbeatInterval(params: {
	isDocumentHidden: boolean;
	isCloudReachable: boolean;
	isLowBatteryDischarging: boolean;
}): number {
	if (params.isDocumentHidden) {
		return params.isCloudReachable ? HEARTBEAT_INTERVAL_HIDDEN_MS : Math.max(30000, HEARTBEAT_INTERVAL_ACTIVE_MS * 7);
	}
	if (!params.isCloudReachable) return HEARTBEAT_INTERVAL_ACTIVE_MS;
	if (params.isLowBatteryDischarging) return HEARTBEAT_INTERVAL_LOW_BATTERY_MS;
	return HEARTBEAT_INTERVAL_IDLE_MS;
}

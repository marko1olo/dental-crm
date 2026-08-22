/**
 * DENTE CRM — Hook for Network Connectivity & RTT Monitoring
 */

import { useCallback, useEffect } from "react";
import { useOfflineStore } from "../store/offlineStore";
import {
	createNetworkMonitor,
	determineNetworkConnectivity,
	type PingOptions,
} from "../utils/networkConnectivity";

export interface UseNetworkConnectivityOptions extends PingOptions {
	intervalMs?: number | undefined;
	enabled?: boolean | undefined;
}

export function useNetworkConnectivity(
	options: UseNetworkConnectivityOptions = {},
) {
	const { intervalMs = 25000, enabled = true, pingUrl, timeoutMs } = options;

	const networkState = useOfflineStore((state) => state.networkState);
	const setNetworkState = useOfflineStore((state) => state.setNetworkState);

	useEffect(() => {
		if (!enabled) return;

		const unsubscribe = createNetworkMonitor(
			(state) => {
				setNetworkState(state);
			},
			intervalMs,
			{ pingUrl, timeoutMs },
		);

		return () => {
			unsubscribe();
		};
	}, [enabled, intervalMs, pingUrl, timeoutMs, setNetworkState]);

	const pingNow = useCallback(async () => {
		const state = await determineNetworkConnectivity({ pingUrl, timeoutMs });
		setNetworkState(state);
		return state;
	}, [pingUrl, timeoutMs, setNetworkState]);

	return {
		networkState,
		mode: networkState.mode,
		label: networkState.label,
		badgeClass: networkState.badgeClass,
		rttMs: networkState.rttMs,
		isOnline: networkState.isOnline,
		isLan: networkState.isLan,
		pingNow,
	};
}

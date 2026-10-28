import { isLocalOrLanHostname } from "../../utils/networkConnectivity";
import { safeLocalStorageGetItem } from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { STORAGE_KEY_LAN_SERVER, cachedDiscoveredServer } from "./lanStorageState";

export function generateSubnetIpCandidates(
	baseSubnets: string[] = ["192.168.1", "192.168.0", "192.168.31", "192.168.100", "10.0.0"],
	ports: number[] = [3000, 4100, 4101],
): string[] {
	const priorityHostSuffixes = [1, 100, 200, 150, 250, 2, 10, 50, 88, 101, 155, 222];
	const candidates: string[] = [];

	for (const subnet of baseSubnets) {
		for (const suffix of priorityHostSuffixes) {
			for (const port of ports) {
				candidates.push(`http://${subnet}.${suffix}:${port}`);
			}
		}
	}
	return candidates;
}

export function getLanDiscoveryCandidates(additional: string[] = []): string[] {
	const candidates = new Set<string>();
	const standardPorts = [4100, 3000, 4101, 8080];
	const localHosts = ["dente-server.local", "clinic.local", "127.0.0.1", "localhost"];

	for (const host of localHosts) {
		for (const port of standardPorts) {
			candidates.add(`http://${host}:${port}`);
		}
	}

	const cached = safeLocalStorageGetItem(STORAGE_KEY_LAN_SERVER);
	if (cached) {
		try {
			candidates.add(new URL(cached).origin);
		} catch (err: unknown) {
			logger.warn("[LanDiscovery] Failed to parse cached LAN server URL:", err);
		}
	}

	if (typeof window !== "undefined" && window.location) {
		const currentHost = window.location.hostname;
		if (isLocalOrLanHostname(currentHost) && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
			for (const port of standardPorts) {
				candidates.add(`http://${currentHost}:${port}`);
			}
			if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(currentHost)) {
				const parts = currentHost.split(".");
				const currentSubnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
				for (const url of generateSubnetIpCandidates([currentSubnet])) {
					candidates.add(url);
				}
			}
		}
	}

	for (const url of generateSubnetIpCandidates()) {
		candidates.add(url);
	}

	for (const url of additional) {
		if (url) {
			try {
				const parsed = new URL(url.startsWith("http") ? url : `http://${url}`);
				candidates.add(parsed.origin);
			} catch (err: unknown) {
				logger.warn("[LanDiscovery] Failed to parse additional candidate URL:", err);
			}
		}
	}

	return Array.from(candidates);
}

export function getPriorityLanDiscoveryCandidates(additional: string[] = []): string[] {
	const priority = new Set<string>();

	if (cachedDiscoveredServer?.baseUrl) {
		priority.add(cachedDiscoveredServer.baseUrl);
	}

	const cached = safeLocalStorageGetItem(STORAGE_KEY_LAN_SERVER);
	if (cached) {
		try {
			priority.add(new URL(cached).origin);
		} catch {
			// ignore invalid URL
		}
	}

	for (const url of additional) {
		if (url) {
			try {
				const parsed = new URL(url.startsWith("http") ? url : `http://${url}`);
				priority.add(parsed.origin);
			} catch {
				// ignore invalid URL
			}
		}
	}

	priority.add("http://127.0.0.1:4100");
	priority.add("http://localhost:4100");
	priority.add("http://dente-server.local:4100");
	priority.add("http://clinic.local:4100");

	if (typeof window !== "undefined" && window.location) {
		const currentHost = window.location.hostname;
		if (isLocalOrLanHostname(currentHost) && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
			priority.add(`http://${currentHost}:4100`);
		}
	}

	return Array.from(priority);
}

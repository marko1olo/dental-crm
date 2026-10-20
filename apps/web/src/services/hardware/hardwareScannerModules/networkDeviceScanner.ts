/**
 * networkDeviceScanner.ts — Local clinic subnet scanner for networked hardware:
 * Planmeca / Vatech CBCT tomographs (DICOM port 104/11112), RAW thermal printers (port 9100),
 * and LAN fiscal registers (54-FZ ATOL / Shtrikh-M).
 */

import type {
	DeviceScanOptions,
	HardwareDevice,
	HardwareDeviceKind,
} from "./types.js";

export interface NetworkEndpointDescriptor {
	port: number;
	kind: HardwareDeviceKind;
	name: string;
	protocol: string;
}

export const KNOWN_CLINIC_NETWORK_PORTS: NetworkEndpointDescriptor[] = [
	{
		port: 104,
		kind: "visiograph_sensor",
		name: "Конусно-лучевой томограф / Визиограф (DICOM C-ECHO)",
		protocol: "dicom",
	},
	{
		port: 11112,
		kind: "visiograph_sensor",
		name: "Сетевой PACS DICOM сервер снимков клиники",
		protocol: "dicom_pacs",
	},
	{
		port: 9100,
		kind: "thermal_printer",
		name: "Сетевой принтер чеков и этикеток ЦСО (RAW / JetDirect)",
		protocol: "esc_pos_raw",
	},
	{
		port: 5555,
		kind: "fiscal_kkt",
		name: "Сетевой фискальный регистратор АТОЛ LAN (54-ФЗ)",
		protocol: "atol_tcp",
	},
	{
		port: 4001,
		kind: "fiscal_kkt",
		name: "Сетевой фискальный регистратор Штрих-М LAN (54-ФЗ)",
		protocol: "shtrih_tcp",
	},
];

export function detectNetworkDeviceKind(port: number): HardwareDeviceKind {
	const found = KNOWN_CLINIC_NETWORK_PORTS.find((p) => p.port === port);
	return found?.kind ?? "unknown";
}

/**
 * Pings an HTTP/TCP endpoint in the local clinic network with a short timeout.
 * In browser environment, uses fetch with AbortSignal to detect reachable hosts.
 */
export async function pingDeviceEndpoint(
	host: string,
	port: number,
	timeoutMs = 600,
): Promise<boolean> {
	if (typeof window === "undefined" || typeof fetch === "undefined") {
		return false;
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		// Attempt lightweight connection test (mode: no-cors prevents CORS blocking from throwing on alive hosts)
		await fetch(`http://${host}:${port}`, {
			method: "HEAD",
			mode: "no-cors",
			signal: controller.signal,
		});
		return true;
	} catch (err: unknown) {
		const isAbort = (err as { name?: string })?.name === "AbortError";
		// If timeout reached without reply -> host offline.
		// If refused or reset (TypeError) -> host may still be alive on network but closed HTTP
		if (isAbort) {
			return false;
		}
		// In Chromium, connection refusal on localhost/LAN usually yields a fast TypeError within 50ms
		return false;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Scans a list of target IP addresses or standard gateway LAN addresses for active clinic equipment.
 */
export async function scanLocalNetworkDevices(
	options: DeviceScanOptions = {},
): Promise<HardwareDevice[]> {
	const timeoutMs = options.timeoutMs ?? 500;
	const candidateHosts = options.ipRange && options.ipRange.length > 0
		? options.ipRange
		: ["127.0.0.1", "192.168.1.150", "192.168.1.200"];

	const targetPorts = options.portList && options.portList.length > 0
		? options.portList
		: [104, 9100, 5555];

	const discovered: HardwareDevice[] = [];

	for (const host of candidateHosts) {
		for (const port of targetPorts) {
			const isOnline = await pingDeviceEndpoint(host, port, timeoutMs);
			if (isOnline) {
				const descriptor = KNOWN_CLINIC_NETWORK_PORTS.find((p) => p.port === port);
				const name = descriptor?.name ?? `Сетевое устройство ${host}:${port}`;
				const kind = descriptor?.kind ?? "unknown";

				discovered.push({
					id: `net-${host.replace(/\./g, "-")}-${port}`,
					name: `${name} [${host}]`,
					kind,
					portKind: "lan_network",
					status: "connected",
					address: `${host}:${port}`,
					lastSeenTimestamp: Date.now(),
					details: {
						host,
						port,
						protocol: descriptor?.protocol ?? "unknown",
					},
				});
			}
		}
	}

	return discovered;
}

/**
 * DENTE CRM — Multi-Subnet Scanner & Network Interface Ingestion Engine
 *
 * Provides enterprise-grade network ingestion across complex clinic topologies:
 * 1. Multi-Homed Network Interface Ingestion:
 *    - Ingests all active IPv4 adapters on the workstation (dual-NIC, mixed Wi-Fi + Ethernet, multi-subnet)
 *    - Mathematical bitwise subnet calculation: network address, broadcast address, CIDR prefix, host range
 * 2. Hardened Virtual Adapter Blacklist:
 *    - Strictly filters out Docker, WSL, Hyper-V, VirtualBox, VMware, Tailscale, ZeroTier,
 *      WireGuard, TAP, OpenVPN, Radmin, Hamachi, Apple AWDL/LLW/utun, and Bluetooth
 *    - Rejects loopbacks (127.0.0.0/8) and link-local / APIPA (169.254.0.0/16)
 * 3. True Physical Clinic Subnet Identification:
 *    - Accurately classifies RFC 1918 private IPv4 subnets (192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12)
 *    - Ranks and prioritizes wired Ethernet > Wi-Fi > standard clinic subnets (192.168.0.x, 192.168.1.x)
 * 4. Subnet Broadcast & Fast Parallel Probe Range Generation:
 *    - Calculates exact subnet-directed broadcast addresses (e.g. 192.168.1.255, 10.0.0.255)
 *      to ensure UDP beacons traverse multi-NIC boundaries where 255.255.255.255 fails
 *    - Generates bounded probe candidate IP lists for fast parallel HTTP sweep (ports 4100-4105)
 */

import * as os from "node:os";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Types & Domain Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export type NetworkAdapterType = "ethernet" | "wifi" | "virtual" | "loopback" | "unknown";

export interface RawNetworkInterfaceEntry {
	readonly address: string;
	readonly netmask: string;
	readonly mac: string;
	readonly family: string;
	readonly internal: boolean;
	readonly cidr?: string | null;
}

export interface ClinicNetworkInterface {
	readonly name: string;
	readonly address: string;
	readonly netmask: string;
	readonly mac: string;
	readonly family: "IPv4" | "IPv6";
	readonly internal: boolean;
	readonly cidrPrefix: number;
	readonly networkAddress: string;
	readonly broadcastAddress: string;
	readonly cidr: string;
	readonly adapterType: NetworkAdapterType;
	readonly isPhysical: boolean;
	readonly isClinicSubnet: boolean;
	readonly score: number;
	readonly filterReason: string;
}

export interface ClinicSubnetDescriptor {
	readonly networkAddress: string;
	readonly broadcastAddress: string;
	readonly netmask: string;
	readonly cidrPrefix: number;
	readonly cidr: string;
	readonly interfaceName: string;
	readonly localIp: string;
	readonly mac: string;
	readonly adapterType: NetworkAdapterType;
	readonly totalHosts: number;
	readonly usableHosts: number;
	readonly firstUsableHost: string;
	readonly lastUsableHost: string;
	readonly probeIps: string[];
	readonly score: number;
}

export interface ProbeTargetEndpoint {
	readonly ip: string;
	readonly port: number;
	readonly url: string;
}

export interface MultiSubnetScanResult {
	readonly scannedAt: string;
	readonly allInterfaces: ClinicNetworkInterface[];
	readonly physicalInterfaces: ClinicNetworkInterface[];
	readonly excludedInterfaces: ClinicNetworkInterface[];
	readonly clinicSubnets: ClinicSubnetDescriptor[];
	readonly primarySubnet: ClinicSubnetDescriptor | null;
	readonly primaryIp: string;
	readonly broadcastAddresses: string[];
	readonly allProbeTargets: ProbeTargetEndpoint[];
}

export interface MultiSubnetScanOptions {
	/** Custom or mocked interfaces for headless testing or platform injection */
	readonly interfaces?: Record<string, RawNetworkInterfaceEntry[]> | undefined;
	/** Target TCP ports for HTTP mesh probes (default: [4100, 4101, 4102, 4103, 4104, 4105]) */
	readonly targetPorts?: readonly number[] | undefined;
	/** Maximum probe hosts generated per subnet slice to guarantee fast sweep (default: 254) */
	readonly maxProbeHostsPerSubnet?: number | undefined;
	/** Whether to include public or non-RFC1918 subnets (default: false for security) */
	readonly includePublic?: boolean | undefined;
	/** Additional custom regex patterns to treat as virtual adapters */
	readonly customVirtualPatterns?: readonly RegExp[] | undefined;
	/** Known hardware port types (e.g. from macOS networksetup) */
	readonly hardwarePorts?: ReadonlyMap<string, "ethernet" | "wifi"> | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Virtual Adapter & VPN Blacklist Regex Patterns
// ─────────────────────────────────────────────────────────────────────────────

export const VIRTUAL_ADAPTER_BLACKLIST: readonly RegExp[] = [
	/vethernet/i,
	/wsl/i,
	/hyper-v/i,
	/virtualbox/i,
	/vbox/i,
	/docker/i,
	/tap[-_]?/i,
	/tun[-_]?/i,
	/zerotier/i,
	/tailscale/i,
	/wireguard/i,
	/^wg\d*$/i,
	/^awg\d*$/i,
	/radmin/i,
	/awg/i,
	/hamachi/i,
	/openvpn/i,
	/nordlynx/i,
	/vmware/i,
	/vmnet/i,
	/loopback/i,
	/bluetooth/i,
	/p2p/i,
	/awdl/i,
	/llw/i,
	/multipass/i,
	/container/i,
	/bridge/i,
	/virbr/i,
	/dummy/i,
	/^lo\d*$/i,
	/^utun/i,
	/^gif\d*$/i,
	/^stf\d*$/i,
	/^anpi\d*$/i,
	/^ap\d*$/i,
	/^br[-_0-9a-z]+/i,
	/^veth[0-9a-f]+$/i,
	/^ppp\d*$/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. Mathematical Bitwise IPv4 & Subnet Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a dotted-quad IPv4 string to an unsigned 32-bit integer.
 */
export function ipv4ToUint32(ip: string): number {
	const parts = ip.trim().split(".").map((part) => Number.parseInt(part, 10));
	if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
		throw new Error(`Invalid IPv4 address: "${ip}"`);
	}
	const [p0, p1, p2, p3] = parts as [number, number, number, number];
	return (((p0 << 24) | (p1 << 16) | (p2 << 8) | p3) >>> 0);
}

/**
 * Converts an unsigned 32-bit integer to a dotted-quad IPv4 string.
 */
export function uint32ToIpv4(uint32: number): string {
	const safe = uint32 >>> 0;
	return [
		(safe >>> 24) & 255,
		(safe >>> 16) & 255,
		(safe >>> 8) & 255,
		safe & 255,
	].join(".");
}

/**
 * Calculates the CIDR prefix length (0-32) from a dotted-quad netmask.
 */
export function netmaskToCidrPrefix(netmask: string): number {
	try {
		const maskNum = ipv4ToUint32(netmask);
		let prefix = 0;
		for (let i = 31; i >= 0; i--) {
			if ((maskNum & (1 << i)) !== 0) {
				prefix++;
			} else {
				break;
			}
		}
		return prefix;
	} catch {
		return 24; // Fallback to standard /24 if invalid
	}
}

/**
 * Converts a CIDR prefix length (0-32) to a dotted-quad netmask.
 */
export function cidrPrefixToNetmask(prefix: number): string {
	const clamped = Math.max(0, Math.min(32, Math.floor(prefix)));
	if (clamped === 0) return "0.0.0.0";
	const mask = (0xffffffff << (32 - clamped)) >>> 0;
	return uint32ToIpv4(mask);
}

/**
 * Computes exact mathematical subnet details for an IPv4 address and netmask.
 */
export function calculateSubnetDetails(ip: string, netmask: string): {
	networkAddress: string;
	broadcastAddress: string;
	cidrPrefix: number;
	cidr: string;
	totalHosts: number;
	usableHosts: number;
	firstUsableHost: string;
	lastUsableHost: string;
} {
	const ipUint = ipv4ToUint32(ip);
	const cidrPrefix = netmaskToCidrPrefix(netmask);
	const maskUint = (cidrPrefix === 0 ? 0 : (0xffffffff << (32 - cidrPrefix))) >>> 0;

	const networkUint = (ipUint & maskUint) >>> 0;
	const invertedMask = (~maskUint) >>> 0;
	const broadcastUint = (networkUint | invertedMask) >>> 0;

	const totalHosts = 2 ** (32 - cidrPrefix);
	const usableHosts = cidrPrefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2);

	let firstUsableHost = uint32ToIpv4(networkUint);
	let lastUsableHost = uint32ToIpv4(broadcastUint);

	if (cidrPrefix < 31) {
		firstUsableHost = uint32ToIpv4(networkUint + 1);
		lastUsableHost = uint32ToIpv4(broadcastUint - 1);
	}

	return {
		networkAddress: uint32ToIpv4(networkUint),
		broadcastAddress: uint32ToIpv4(broadcastUint),
		cidrPrefix,
		cidr: `${uint32ToIpv4(networkUint)}/${cidrPrefix}`,
		totalHosts,
		usableHosts,
		firstUsableHost,
		lastUsableHost,
	};
}

/**
 * Checks whether an IPv4 address belongs to a specified subnet.
 */
export function isIpv4InSubnet(ip: string, networkAddress: string, cidrPrefix: number): boolean {
	try {
		const ipUint = ipv4ToUint32(ip);
		const netUint = ipv4ToUint32(networkAddress);
		const maskUint = (cidrPrefix === 0 ? 0 : (0xffffffff << (32 - cidrPrefix))) >>> 0;
		return (ipUint & maskUint) === (netUint & maskUint);
	} catch {
		return false;
	}
}

/**
 * Validates whether an IPv4 address belongs to RFC 1918 private subnets:
 * - 192.168.0.0/16
 * - 10.0.0.0/8
 * - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
 */
export function isRfc1918PrivateIpv4(ip: string): boolean {
	try {
		const parts = ip.trim().split(".").map(Number);
		if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
			return false;
		}
		const [p0, p1] = parts as [number, number, number, number];

		// Exclude loopback (127.x.x.x) and unassigned 0.0.0.0
		if (p0 === 127 || p0 === 0) return false;
		// Exclude APIPA / link-local (169.254.x.x)
		if (p0 === 169 && p1 === 254) return false;
		// Exclude Carrier Grade NAT (100.64.0.0/10)
		if (p0 === 100 && p1 >= 64 && p1 <= 127) return false;
		// Exclude Radmin (26.x.x.x) & Hamachi (25.x.x.x)
		if (p0 === 26 || p0 === 25) return false;

		// Class A: 10.0.0.0/8
		if (p0 === 10) return true;
		// Class B: 172.16.0.0/12
		if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
		// Class C: 192.168.0.0/16
		if (p0 === 192 && p1 === 168) return true;

		return false;
	} catch {
		return false;
	}
}

/**
 * Checks if an interface name matches known virtual/VPN adapter patterns.
 */
export function isVirtualAdapterName(name: string, customPatterns?: readonly RegExp[]): boolean {
	const trimmed = name.trim();
	if (VIRTUAL_ADAPTER_BLACKLIST.some((pattern) => pattern.test(trimmed))) {
		return true;
	}
	if (customPatterns && customPatterns.some((pattern) => pattern.test(trimmed))) {
		return true;
	}
	return false;
}

/**
 * Generates an optimized, fast list of candidate probe IPs for a clinic subnet.
 *
 * For /24 or smaller: sweeps all usable host IPs.
 * For larger subnets (/16, /8): extracts the local /24 slice surrounding `localIp`
 * and standard clinic gateway IPs (.1, .254) to complete scans in <500ms without probing millions of addresses.
 */
export function generateSubnetProbeIps(params: {
	networkAddress: string;
	cidrPrefix: number;
	localIp?: string | undefined;
	maxHosts?: number | undefined;
}): string[] {
	const { networkAddress, cidrPrefix, localIp } = params;
	const maxHosts = Math.max(1, params.maxHosts ?? 254);
	const results: string[] = [];
	const seen = new Set<string>();

	try {
		const netUint = ipv4ToUint32(networkAddress);
		const totalHosts = 2 ** (32 - cidrPrefix);

		if (cidrPrefix >= 24 && totalHosts <= 256) {
			// Standard /24 through /30 subnet: sweep all usable host IPs
			const startUint = netUint + 1;
			const endUint = netUint + totalHosts - 2;

			// If localIp provided, prioritize immediate neighbors (+-15 around local host) and gateway (.1)
			if (localIp) {
				try {
					const localUint = ipv4ToUint32(localIp);
					const gatewayIp = uint32ToIpv4(startUint);
					results.push(gatewayIp);
					seen.add(gatewayIp);

					for (let offset = -15; offset <= 15; offset++) {
						const candidateUint = localUint + offset;
						if (candidateUint >= startUint && candidateUint <= endUint && candidateUint !== localUint) {
							const ipStr = uint32ToIpv4(candidateUint);
							if (!seen.has(ipStr)) {
								results.push(ipStr);
								seen.add(ipStr);
							}
						}
					}
				} catch {
					// Fall through to sequential sweep
				}
			}

			// Fill remaining hosts up to maxHosts
			for (let u = startUint; u <= endUint; u++) {
				const ipStr = uint32ToIpv4(u);
				if (!seen.has(ipStr) && ipStr !== localIp) {
					results.push(ipStr);
					seen.add(ipStr);
					if (results.length >= maxHosts) break;
				}
			}
		} else {
			// Large subnet (/8 to /23, e.g. 10.0.0.0/8 or 172.16.0.0/12):
			// Heuristic: probe the local /24 slice of the workstation's actual IP
			if (localIp) {
				const parts = localIp.split(".");
				if (parts.length === 4) {
					const slicePrefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
					// 1. Gateway
					const gw = `${slicePrefix}.1`;
					results.push(gw);
					seen.add(gw);

					// 2. High server address (.254)
					const highServer = `${slicePrefix}.254`;
					results.push(highServer);
					seen.add(highServer);

					// 3. Sequential local slice (.2 through .253)
					for (let hostNum = 2; hostNum <= 253; hostNum++) {
						const candidate = `${slicePrefix}.${hostNum}`;
						if (!seen.has(candidate) && candidate !== localIp) {
							results.push(candidate);
							seen.add(candidate);
							if (results.length >= maxHosts) break;
						}
					}
				}
			} else {
				// No localIp given, sweep first maxHosts from start of subnet
				const startUint = netUint + 1;
				for (let i = 0; i < maxHosts; i++) {
					const ipStr = uint32ToIpv4(startUint + i);
					results.push(ipStr);
				}
			}
		}
	} catch {
		// Return whatever was collected
	}

	return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Interface Evaluation & Scoring Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines hardware adapter type (ethernet, wifi, virtual, loopback).
 */
export function classifyAdapterType(name: string, options?: {
	isInternal?: boolean | undefined;
	mac?: string | undefined;
	hardwarePorts?: ReadonlyMap<string, "ethernet" | "wifi"> | undefined;
}): NetworkAdapterType {
	if (options?.isInternal) return "loopback";

	const trimmed = name.trim();
	if (isVirtualAdapterName(trimmed)) return "virtual";

	// Check explicit hardware ports map (e.g. from macOS networksetup)
	if (options?.hardwarePorts?.has(trimmed)) {
		const hwType = options.hardwarePorts.get(trimmed);
		if (hwType) return hwType;
	}

	// Regex heuristics based on standard OS interface naming conventions
	if (/wi-fi|wireless|wlan|airport|wl\w+/i.test(trimmed)) {
		return "wifi";
	}
	if (/ethernet|lan|eth\d*|en\d+/i.test(trimmed)) {
		// On macOS en0 is often Wi-Fi on MacBooks, but without hardware map we classify as ethernet or check generic
		return "ethernet";
	}

	return "unknown";
}

/**
 * Evaluates an individual network interface, computes its fitness score,
 * and determines whether it represents a valid physical clinic subnet.
 */
export function evaluateClinicInterface(
	name: string,
	raw: RawNetworkInterfaceEntry,
	options?: MultiSubnetScanOptions,
): ClinicNetworkInterface {
	const address = raw.address?.trim() || "";
	const netmask = raw.netmask?.trim() || "255.255.255.0";
	const mac = raw.mac?.trim() || "";
	const family = (raw.family === "IPv4" || (raw.family as unknown) === 4) ? "IPv4" : "IPv6";
	const internal = Boolean(raw.internal);

	// 1. Loopback checks
	if (internal || address === "127.0.0.1" || address.startsWith("127.")) {
		return {
			name,
			address,
			netmask,
			mac,
			family,
			internal: true,
			cidrPrefix: 8,
			networkAddress: "127.0.0.0",
			broadcastAddress: "127.255.255.255",
			cidr: "127.0.0.0/8",
			adapterType: "loopback",
			isPhysical: false,
			isClinicSubnet: false,
			score: -1000,
			filterReason: "Loopback interface (127.0.0.0/8)",
		};
	}

	// 2. IPv6 checks
	if (family !== "IPv4") {
		return {
			name,
			address,
			netmask,
			mac,
			family,
			internal,
			cidrPrefix: 128,
			networkAddress: address,
			broadcastAddress: address,
			cidr: `${address}/128`,
			adapterType: "unknown",
			isPhysical: false,
			isClinicSubnet: false,
			score: -1000,
			filterReason: "IPv6 interface (only IPv4 supported for LAN mesh)",
		};
	}

	// 3. Inactive / unassigned / APIPA link-local checks
	if (!address || address === "0.0.0.0") {
		return {
			name,
			address: address || "0.0.0.0",
			netmask,
			mac,
			family,
			internal,
			cidrPrefix: 0,
			networkAddress: "0.0.0.0",
			broadcastAddress: "0.0.0.0",
			cidr: "0.0.0.0/0",
			adapterType: "unknown",
			isPhysical: false,
			isClinicSubnet: false,
			score: -1000,
			filterReason: "Unassigned IP address (0.0.0.0)",
		};
	}

	if (address.startsWith("169.254.")) {
		return {
			name,
			address,
			netmask,
			mac,
			family,
			internal,
			cidrPrefix: 16,
			networkAddress: "169.254.0.0",
			broadcastAddress: "169.254.255.255",
			cidr: "169.254.0.0/16",
			adapterType: "unknown",
			isPhysical: false,
			isClinicSubnet: false,
			score: -500,
			filterReason: "Link-local APIPA address (DHCP unassigned or failed)",
		};
	}

	// 4. Virtual adapter name blacklist check
	if (isVirtualAdapterName(name, options?.customVirtualPatterns)) {
		return {
			name,
			address,
			netmask,
			mac,
			family,
			internal,
			cidrPrefix: netmaskToCidrPrefix(netmask),
			networkAddress: address,
			broadcastAddress: address,
			cidr: `${address}/${netmaskToCidrPrefix(netmask)}`,
			adapterType: "virtual",
			isPhysical: false,
			isClinicSubnet: false,
			score: -800,
			filterReason: `Matched virtual adapter blacklist name: "${name}"`,
		};
	}

	// 5. Zero MAC address check (common for software virtual adapters)
	if (!mac || mac === "00:00:00:00:00:00") {
		return {
			name,
			address,
			netmask,
			mac,
			family,
			internal,
			cidrPrefix: netmaskToCidrPrefix(netmask),
			networkAddress: address,
			broadcastAddress: address,
			cidr: `${address}/${netmaskToCidrPrefix(netmask)}`,
			adapterType: "virtual",
			isPhysical: false,
			isClinicSubnet: false,
			score: -600,
			filterReason: "Zero MAC address (virtual / pseudo interface)",
		};
	}

	// 6. Compute mathematical subnet details
	let subnetDetails;
	try {
		subnetDetails = calculateSubnetDetails(address, netmask);
	} catch {
		subnetDetails = {
			networkAddress: address,
			broadcastAddress: address,
			cidrPrefix: 24,
			cidr: `${address}/24`,
			totalHosts: 256,
			usableHosts: 254,
			firstUsableHost: address,
			lastUsableHost: address,
		};
	}

	// 7. Check private RFC 1918 range
	const isPrivate = isRfc1918PrivateIpv4(address);
	const isClinicSubnet = isPrivate || Boolean(options?.includePublic);

	// 8. Classify physical adapter type & compute score
	const adapterType = classifyAdapterType(name, {
		isInternal: internal,
		mac,
		...(options?.hardwarePorts ? { hardwarePorts: options.hardwarePorts } : {}),
	});

	let score = 0;
	if (adapterType === "ethernet") {
		score += 150; // Wired Ethernet is the gold standard for clinical stability
	} else if (adapterType === "wifi") {
		score += 100; // Wi-Fi is standard for doctor tablets
	} else {
		score += 50;
	}

	if (isPrivate) {
		score += 50;
		// Bonus for typical small-clinic Class C setups (192.168.0.x, 192.168.1.x)
		if (address.startsWith("192.168.0.") || address.startsWith("192.168.1.")) {
			score += 30;
		} else if (address.startsWith("192.168.")) {
			score += 20;
		} else if (address.startsWith("10.")) {
			score += 15;
		}
	} else if (!options?.includePublic) {
		score -= 300;
	}

	return {
		name,
		address,
		netmask,
		mac,
		family,
		internal,
		cidrPrefix: subnetDetails.cidrPrefix,
		networkAddress: subnetDetails.networkAddress,
		broadcastAddress: subnetDetails.broadcastAddress,
		cidr: subnetDetails.cidr,
		adapterType,
		isPhysical: true,
		isClinicSubnet,
		score,
		filterReason: isClinicSubnet ? "Active physical clinic network interface" : "Public IPv4 address (excluded by default)",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Multi-Subnet Scanner Class & Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export class MultiSubnetScanner {
	private readonly options: MultiSubnetScanOptions;

	constructor(options: MultiSubnetScanOptions = {}) {
		this.options = options;
	}

	/**
	 * Ingests all network interfaces, extracts physical clinic subnets, computes
	 * broadcast addresses across all NICs, and generates parallel probe targets.
	 */
	scan(): MultiSubnetScanResult {
		const rawMap: Record<string, RawNetworkInterfaceEntry[]> =
			this.options.interfaces ??
			(typeof os !== "undefined" && typeof os.networkInterfaces === "function"
				? (os.networkInterfaces() as Record<string, RawNetworkInterfaceEntry[]>)
				: {});

		const allInterfaces: ClinicNetworkInterface[] = [];
		const physicalInterfaces: ClinicNetworkInterface[] = [];
		const excludedInterfaces: ClinicNetworkInterface[] = [];
		const clinicSubnets: ClinicSubnetDescriptor[] = [];
		const seenSubnets = new Set<string>();

		for (const [ifaceName, entries] of Object.entries(rawMap)) {
			if (!Array.isArray(entries)) continue;

			for (const entry of entries) {
				const evaluated = evaluateClinicInterface(ifaceName, entry, this.options);
				allInterfaces.push(evaluated);

				if (evaluated.isPhysical && evaluated.isClinicSubnet && evaluated.score > 0) {
					physicalInterfaces.push(evaluated);

					// Avoid duplicate subnets if multiple IPs reside on the same network
					if (!seenSubnets.has(evaluated.cidr)) {
						seenSubnets.add(evaluated.cidr);

						const subnetDetails = calculateSubnetDetails(evaluated.address, evaluated.netmask);
						const probeIps = generateSubnetProbeIps({
							networkAddress: subnetDetails.networkAddress,
							cidrPrefix: subnetDetails.cidrPrefix,
							localIp: evaluated.address,
							maxHosts: this.options.maxProbeHostsPerSubnet ?? 254,
						});

						clinicSubnets.push({
							networkAddress: subnetDetails.networkAddress,
							broadcastAddress: subnetDetails.broadcastAddress,
							netmask: evaluated.netmask,
							cidrPrefix: subnetDetails.cidrPrefix,
							cidr: subnetDetails.cidr,
							interfaceName: evaluated.name,
							localIp: evaluated.address,
							mac: evaluated.mac,
							adapterType: evaluated.adapterType,
							totalHosts: subnetDetails.totalHosts,
							usableHosts: subnetDetails.usableHosts,
							firstUsableHost: subnetDetails.firstUsableHost,
							lastUsableHost: subnetDetails.lastUsableHost,
							probeIps,
							score: evaluated.score,
						});
					}
				} else {
					excludedInterfaces.push(evaluated);
				}
			}
		}

		// Sort clinic subnets by score descending (Ethernet > Wi-Fi > standard clinic IPs)
		clinicSubnets.sort((a, b) => b.score - a.score);
		physicalInterfaces.sort((a, b) => b.score - a.score);

		const primarySubnet = clinicSubnets[0] ?? null;
		const primaryIp = primarySubnet?.localIp ?? "127.0.0.1";

		// Collect unique broadcast addresses (255.255.255.255 + individual subnet broadcasts)
		const broadcastSet = new Set<string>(["255.255.255.255"]);
		for (const subnet of clinicSubnets) {
			if (subnet.broadcastAddress && subnet.broadcastAddress !== "255.255.255.255") {
				broadcastSet.add(subnet.broadcastAddress);
			}
		}
		const broadcastAddresses = Array.from(broadcastSet);

		// Generate parallel HTTP probe target endpoints across ports
		const targetPorts = this.options.targetPorts ?? [4100, 4101, 4102, 4103, 4104, 4105];
		const allProbeTargets: ProbeTargetEndpoint[] = [];
		const seenTargets = new Set<string>();

		for (const subnet of clinicSubnets) {
			for (const ip of subnet.probeIps) {
				for (const port of targetPorts) {
					// Skip self-probing primary IP on default port
					if (ip === primaryIp && port === 4100) continue;

					const key = `${ip}:${port}`;
					if (!seenTargets.has(key)) {
						seenTargets.add(key);
						allProbeTargets.push({
							ip,
							port,
							url: `http://${ip}:${port}/api/network/lan-mesh/handshake`,
						});
					}
				}
			}
		}

		return {
			scannedAt: new Date().toISOString(),
			allInterfaces,
			physicalInterfaces,
			excludedInterfaces,
			clinicSubnets,
			primarySubnet,
			primaryIp,
			broadcastAddresses,
			allProbeTargets,
		};
	}
}

/**
 * Convenience helper function to scan clinic subnets and interfaces in one call.
 */
export function scanClinicSubnets(options?: MultiSubnetScanOptions): MultiSubnetScanResult {
	const scanner = new MultiSubnetScanner(options);
	return scanner.scan();
}

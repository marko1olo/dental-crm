import { calculateSubnetDetails, isRfc1918PrivateIpv4, netmaskToCidrPrefix } from "./bitwiseSubnetMath.js";
import type {
	ClinicNetworkInterface,
	MultiSubnetScanOptions,
	NetworkAdapterType,
	RawNetworkInterfaceEntry,
} from "./subnetTypes.js";

export const VIRTUAL_ADAPTER_BLACKLIST: readonly RegExp[] = [
	/vethernet/i, /wsl/i, /hyper-v/i, /virtualbox/i, /vbox/i, /docker/i,
	/tap[-_]?/i, /tun[-_]?/i, /zerotier/i, /tailscale/i, /wireguard/i,
	/^wg\d*$/i, /^awg\d*$/i, /radmin/i, /awg/i, /hamachi/i, /openvpn/i,
	/nordlynx/i, /vmware/i, /vmnet/i, /loopback/i, /bluetooth/i, /p2p/i,
	/awdl/i, /llw/i, /multipass/i, /container/i, /bridge/i, /virbr/i,
	/dummy/i, /^lo\d*$/i, /^utun/i, /^gif\d*$/i, /^stf\d*$/i,
	/^anpi\d*$/i, /^ap\d*$/i, /^br[-_0-9a-z]+/i, /^veth[0-9a-f]+$/i, /^ppp\d*$/i,
];

export function isVirtualAdapterName(name: string, customPatterns?: readonly RegExp[]): boolean {
	const trimmed = name.trim();
	if (VIRTUAL_ADAPTER_BLACKLIST.some((pattern) => pattern.test(trimmed))) return true;
	return Boolean(customPatterns?.some((pattern) => pattern.test(trimmed)));
}

export function classifyAdapterType(name: string, options?: {
	readonly isInternal?: boolean | undefined;
	readonly mac?: string | undefined;
	readonly hardwarePorts?: ReadonlyMap<string, "ethernet" | "wifi"> | undefined;
}): NetworkAdapterType {
	if (options?.isInternal) return "loopback";
	const trimmed = name.trim();
	if (isVirtualAdapterName(trimmed)) return "virtual";
	if (options?.hardwarePorts?.has(trimmed)) {
		const hwType = options.hardwarePorts.get(trimmed);
		if (hwType) return hwType;
	}
	if (/wi-fi|wireless|wlan|airport|wl\w+/i.test(trimmed)) return "wifi";
	if (/ethernet|lan|eth\d*|en\d+/i.test(trimmed)) return "ethernet";
	return "unknown";
}

function makeInterface(
	name: string, address: string, netmask: string, mac: string,
	family: "IPv4" | "IPv6", internal: boolean, cidrPrefix: number,
	networkAddress: string, broadcastAddress: string, cidr: string,
	adapterType: NetworkAdapterType, isPhysical: boolean, isClinicSubnet: boolean,
	score: number, filterReason: string,
): ClinicNetworkInterface {
	return { name, address, netmask, mac, family, internal, cidrPrefix, networkAddress, broadcastAddress, cidr, adapterType, isPhysical, isClinicSubnet, score, filterReason };
}

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

	if (internal || address === "127.0.0.1" || address.startsWith("127.")) {
		return makeInterface(name, address, netmask, mac, family, true, 8, "127.0.0.0", "127.255.255.255", "127.0.0.0/8", "loopback", false, false, -1000, "Loopback interface (127.0.0.0/8)");
	}
	if (family !== "IPv4") {
		return makeInterface(name, address, netmask, mac, family, internal, 128, address, address, `${address}/128`, "unknown", false, false, -1000, "IPv6 interface (only IPv4 supported for LAN mesh)");
	}
	if (!address || address === "0.0.0.0") {
		return makeInterface(name, address || "0.0.0.0", netmask, mac, family, internal, 0, "0.0.0.0", "0.0.0.0", "0.0.0.0/0", "unknown", false, false, -1000, "Unassigned IP address (0.0.0.0)");
	}
	if (address.startsWith("169.254.")) {
		return makeInterface(name, address, netmask, mac, family, internal, 16, "169.254.0.0", "169.254.255.255", "169.254.0.0/16", "unknown", false, false, -500, "Link-local APIPA address (DHCP unassigned or failed)");
	}
	const cidr = netmaskToCidrPrefix(netmask);
	if (isVirtualAdapterName(name, options?.customVirtualPatterns)) {
		return makeInterface(name, address, netmask, mac, family, internal, cidr, address, address, `${address}/${cidr}`, "virtual", false, false, -800, `Matched virtual adapter blacklist name: "${name}"`);
	}
	if (!mac || mac === "00:00:00:00:00:00") {
		return makeInterface(name, address, netmask, mac, family, internal, cidr, address, address, `${address}/${cidr}`, "virtual", false, false, -600, "Zero MAC address (virtual / pseudo interface)");
	}

	const sub = calculateSubnetDetails(address, netmask);
	const isPrivate = isRfc1918PrivateIpv4(address);
	const isClinicSubnet = isPrivate || Boolean(options?.includePublic);
	const adapterType = classifyAdapterType(name, { isInternal: internal, mac, ...(options?.hardwarePorts ? { hardwarePorts: options.hardwarePorts } : {}) });

	let score = adapterType === "ethernet" ? 150 : adapterType === "wifi" ? 100 : 50;
	if (isPrivate) {
		score += 50;
		if (address.startsWith("192.168.0.") || address.startsWith("192.168.1.")) score += 30;
		else if (address.startsWith("192.168.")) score += 20;
		else if (address.startsWith("10.")) score += 15;
	} else if (!options?.includePublic) {
		score -= 300;
	}

	return makeInterface(name, address, netmask, mac, family, internal, sub.cidrPrefix, sub.networkAddress, sub.broadcastAddress, sub.cidr, adapterType, true, isClinicSubnet, score, isClinicSubnet ? "Active physical clinic network interface" : "Public IPv4 address (excluded by default)");
}

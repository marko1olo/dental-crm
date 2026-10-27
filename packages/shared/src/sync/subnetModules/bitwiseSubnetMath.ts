import type { SubnetCalculationResult } from "./subnetTypes.js";

export function ipv4ToUint32(ip: string): number {
	const parts = ip.trim().split(".").map((part) => Number.parseInt(part, 10));
	if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
		throw new Error(`Invalid IPv4 address: "${ip}"`);
	}
	const [p0, p1, p2, p3] = parts as [number, number, number, number];
	return (((p0 << 24) | (p1 << 16) | (p2 << 8) | p3) >>> 0);
}

export function uint32ToIpv4(uint32: number): string {
	const safe = uint32 >>> 0;
	return [
		(safe >>> 24) & 255,
		(safe >>> 16) & 255,
		(safe >>> 8) & 255,
		safe & 255,
	].join(".");
}

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
		return 24;
	}
}

export const netmaskToCidr = netmaskToCidrPrefix;

export function cidrPrefixToNetmask(prefix: number): string {
	const clamped = Math.max(0, Math.min(32, Math.floor(prefix)));
	if (clamped === 0) return "0.0.0.0";
	const mask = (0xffffffff << (32 - clamped)) >>> 0;
	return uint32ToIpv4(mask);
}

export function calculateSubnetDetails(ip: string, netmask: string): SubnetCalculationResult {
	const ipUint = ipv4ToUint32(ip);
	const cidrPrefix = netmaskToCidrPrefix(netmask);
	const maskUint = (cidrPrefix === 0 ? 0 : (0xffffffff << (32 - cidrPrefix))) >>> 0;
	const networkUint = (ipUint & maskUint) >>> 0;
	const broadcastUint = (networkUint | ((~maskUint) >>> 0)) >>> 0;
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

export const isIpInSubnet = isIpv4InSubnet;

export function isRfc1918PrivateIpv4(ip: string): boolean {
	try {
		const parts = ip.trim().split(".").map(Number);
		if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
			return false;
		}
		const [p0, p1] = parts as [number, number, number, number];
		if (p0 === 127 || p0 === 0) return false;
		if (p0 === 169 && p1 === 254) return false;
		if (p0 === 100 && p1 >= 64 && p1 <= 127) return false;
		if (p0 === 26 || p0 === 25) return false;
		if (p0 === 10) return true;
		if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
		return p0 === 192 && p1 === 168;
	} catch {
		return false;
	}
}

export const isPrivateRfc1918Ip = isRfc1918PrivateIpv4;

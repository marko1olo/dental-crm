import { ipv4ToUint32, uint32ToIpv4 } from "./bitwiseSubnetMath.js";
import type { ProbeRangeOptions } from "./subnetTypes.js";

export function generateSubnetProbeIps(params: ProbeRangeOptions): string[] {
	const { networkAddress, cidrPrefix, localIp } = params;
	const maxHosts = Math.max(1, params.maxHosts ?? 254);
	const results: string[] = [];
	const seen = new Set<string>();

	try {
		const netUint = ipv4ToUint32(networkAddress);
		const totalHosts = 2 ** (32 - cidrPrefix);

		if (cidrPrefix >= 24 && totalHosts <= 256) {
			const startUint = netUint + 1;
			const endUint = netUint + totalHosts - 2;

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

			for (let u = startUint; u <= endUint; u++) {
				const ipStr = uint32ToIpv4(u);
				if (!seen.has(ipStr) && ipStr !== localIp) {
					results.push(ipStr);
					seen.add(ipStr);
					if (results.length >= maxHosts) break;
				}
			}
		} else if (localIp) {
			const parts = localIp.split(".");
			if (parts.length === 4) {
				const slicePrefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
				const gw = `${slicePrefix}.1`;
				results.push(gw);
				seen.add(gw);

				const highServer = `${slicePrefix}.254`;
				results.push(highServer);
				seen.add(highServer);

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
			const startUint = netUint + 1;
			for (let i = 0; i < maxHosts; i++) {
				results.push(uint32ToIpv4(startUint + i));
			}
		}
	} catch {
		// Return whatever was collected
	}

	return results;
}

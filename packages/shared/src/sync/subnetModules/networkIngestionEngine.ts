import * as os from "node:os";
import { calculateSubnetDetails } from "./bitwiseSubnetMath.js";
import { generateSubnetProbeIps } from "./probeRangeGenerator.js";
import type {
	ClinicNetworkInterface,
	ClinicSubnetDescriptor,
	MultiSubnetScanOptions,
	MultiSubnetScanResult,
	ProbeTargetEndpoint,
	RawNetworkInterfaceEntry,
} from "./subnetTypes.js";
import { evaluateClinicInterface } from "./virtualAdapterFilter.js";

export class MultiSubnetScanner {
	private readonly options: MultiSubnetScanOptions;

	constructor(options: MultiSubnetScanOptions = {}) {
		this.options = options;
	}

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
					if (!seenSubnets.has(evaluated.cidr)) {
						seenSubnets.add(evaluated.cidr);
						const sub = calculateSubnetDetails(evaluated.address, evaluated.netmask);
						const probeIps = generateSubnetProbeIps({
							networkAddress: sub.networkAddress,
							cidrPrefix: sub.cidrPrefix,
							localIp: evaluated.address,
							maxHosts: this.options.maxProbeHostsPerSubnet ?? 254,
						});
						clinicSubnets.push({
							networkAddress: sub.networkAddress,
							broadcastAddress: sub.broadcastAddress,
							netmask: evaluated.netmask,
							cidrPrefix: sub.cidrPrefix,
							cidr: sub.cidr,
							interfaceName: evaluated.name,
							localIp: evaluated.address,
							mac: evaluated.mac,
							adapterType: evaluated.adapterType,
							totalHosts: sub.totalHosts,
							usableHosts: sub.usableHosts,
							firstUsableHost: sub.firstUsableHost,
							lastUsableHost: sub.lastUsableHost,
							probeIps,
							score: evaluated.score,
						});
					}
				} else {
					excludedInterfaces.push(evaluated);
				}
			}
		}

		clinicSubnets.sort((a, b) => b.score - a.score);
		physicalInterfaces.sort((a, b) => b.score - a.score);
		const primarySubnet = clinicSubnets[0] ?? null;
		const primaryIp = primarySubnet?.localIp ?? "127.0.0.1";

		const broadcastSet = new Set<string>(["255.255.255.255"]);
		for (const s of clinicSubnets) {
			if (s.broadcastAddress && s.broadcastAddress !== "255.255.255.255") broadcastSet.add(s.broadcastAddress);
		}

		const targetPorts = this.options.targetPorts ?? [4100, 4101, 4102, 4103, 4104, 4105];
		const allProbeTargets: ProbeTargetEndpoint[] = [];
		const seenTargets = new Set<string>();

		for (const subnet of clinicSubnets) {
			for (const ip of subnet.probeIps) {
				for (const port of targetPorts) {
					if (ip === primaryIp && port === 4100) continue;
					const key = `${ip}:${port}`;
					if (!seenTargets.has(key)) {
						seenTargets.add(key);
						allProbeTargets.push({ ip, port, url: `http://${ip}:${port}/api/network/lan-mesh/handshake` });
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
			broadcastAddresses: Array.from(broadcastSet),
			allProbeTargets,
		};
	}
}

export function scanClinicSubnets(options?: MultiSubnetScanOptions): MultiSubnetScanResult {
	return new MultiSubnetScanner(options).scan();
}

export const ingestMultiHomedInterfaces = scanClinicSubnets;

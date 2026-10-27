export type NetworkAdapterType = "ethernet" | "wifi" | "virtual" | "loopback" | "unknown";

export interface RawNetworkInterfaceEntry {
	readonly address: string;
	readonly netmask: string;
	readonly mac: string;
	readonly family: string;
	readonly internal: boolean;
	readonly cidr?: string | null;
}

export interface SubnetCalculationResult {
	readonly networkAddress: string;
	readonly broadcastAddress: string;
	readonly cidrPrefix: number;
	readonly cidr: string;
	readonly totalHosts: number;
	readonly usableHosts: number;
	readonly firstUsableHost: string;
	readonly lastUsableHost: string;
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

export type ScannedClinicSubnet = ClinicSubnetDescriptor;

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

export interface ProbeRangeOptions {
	readonly networkAddress: string;
	readonly cidrPrefix: number;
	readonly localIp?: string | undefined;
	readonly maxHosts?: number | undefined;
}

export interface MultiSubnetScanOptions {
	readonly interfaces?: Record<string, RawNetworkInterfaceEntry[]> | undefined;
	readonly targetPorts?: readonly number[] | undefined;
	readonly maxProbeHostsPerSubnet?: number | undefined;
	readonly includePublic?: boolean | undefined;
	readonly customVirtualPatterns?: readonly RegExp[] | undefined;
	readonly hardwarePorts?: ReadonlyMap<string, "ethernet" | "wifi"> | undefined;
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	MultiSubnetScanner,
	calculateSubnetDetails,
	classifyAdapterType,
	evaluateClinicInterface,
	generateSubnetProbeIps,
	ipv4ToUint32,
	isIpv4InSubnet,
	isRfc1918PrivateIpv4,
	isVirtualAdapterName,
	netmaskToCidrPrefix,
	scanClinicSubnets,
	uint32ToIpv4,
} from "../multiSubnetScanner.js";

describe("MultiSubnetScanner: Mathematical Bitwise Utilities", () => {
	it("converts IPv4 addresses to uint32 and back losslessly", () => {
		const testIps = [
			"0.0.0.0",
			"127.0.0.1",
			"192.168.1.1",
			"10.0.0.254",
			"172.16.31.100",
			"255.255.255.255",
		];

		for (const ip of testIps) {
			const u32 = ipv4ToUint32(ip);
			const back = uint32ToIpv4(u32);
			assert.equal(back, ip, `Failed roundtrip for ${ip}`);
		}
	});

	it("rejects invalid IPv4 addresses", () => {
		assert.throws(() => ipv4ToUint32("192.168.1"), /Invalid IPv4 address/);
		assert.throws(() => ipv4ToUint32("256.0.0.1"), /Invalid IPv4 address/);
		assert.throws(() => ipv4ToUint32("192.168.1.-1"), /Invalid IPv4 address/);
		assert.throws(() => ipv4ToUint32("abc.def.ghi.jkl"), /Invalid IPv4 address/);
	});

	it("calculates CIDR prefix from dotted-quad netmask accurately", () => {
		assert.equal(netmaskToCidrPrefix("255.255.255.255"), 32);
		assert.equal(netmaskToCidrPrefix("255.255.255.252"), 30);
		assert.equal(netmaskToCidrPrefix("255.255.255.240"), 28);
		assert.equal(netmaskToCidrPrefix("255.255.255.0"), 24);
		assert.equal(netmaskToCidrPrefix("255.255.240.0"), 20);
		assert.equal(netmaskToCidrPrefix("255.255.0.0"), 16);
		assert.equal(netmaskToCidrPrefix("255.0.0.0"), 8);
		assert.equal(netmaskToCidrPrefix("0.0.0.0"), 0);
	});

	it("calculates subnet network, broadcast, host ranges and total hosts", () => {
		// Standard /24 clinic network
		const sub24 = calculateSubnetDetails("192.168.1.105", "255.255.255.0");
		assert.equal(sub24.networkAddress, "192.168.1.0");
		assert.equal(sub24.broadcastAddress, "192.168.1.255");
		assert.equal(sub24.cidrPrefix, 24);
		assert.equal(sub24.cidr, "192.168.1.0/24");
		assert.equal(sub24.totalHosts, 256);
		assert.equal(sub24.usableHosts, 254);
		assert.equal(sub24.firstUsableHost, "192.168.1.1");
		assert.equal(sub24.lastUsableHost, "192.168.1.254");

		// Large /16 network
		const sub16 = calculateSubnetDetails("172.16.50.25", "255.255.0.0");
		assert.equal(sub16.networkAddress, "172.16.0.0");
		assert.equal(sub16.broadcastAddress, "172.16.255.255");
		assert.equal(sub16.cidrPrefix, 16);
		assert.equal(sub16.cidr, "172.16.0.0/16");
		assert.equal(sub16.totalHosts, 65536);
		assert.equal(sub16.usableHosts, 65534);

		// Compact /29 network (8 total hosts, 6 usable)
		const sub29 = calculateSubnetDetails("10.0.0.14", "255.255.255.248");
		assert.equal(sub29.networkAddress, "10.0.0.8");
		assert.equal(sub29.broadcastAddress, "10.0.0.15");
		assert.equal(sub29.cidrPrefix, 29);
		assert.equal(sub29.totalHosts, 8);
		assert.equal(sub29.usableHosts, 6);
		assert.equal(sub29.firstUsableHost, "10.0.0.9");
		assert.equal(sub29.lastUsableHost, "10.0.0.14");
	});

	it("verifies whether an IP belongs to a subnet", () => {
		assert.equal(isIpv4InSubnet("192.168.1.50", "192.168.1.0", 24), true);
		assert.equal(isIpv4InSubnet("192.168.2.50", "192.168.1.0", 24), false);
		assert.equal(isIpv4InSubnet("10.25.100.1", "10.0.0.0", 8), true);
		assert.equal(isIpv4InSubnet("11.0.0.1", "10.0.0.0", 8), false);
	});

	it("identifies RFC 1918 private subnets and rejects public / link-local IPs", () => {
		// Private Class A, B, C
		assert.equal(isRfc1918PrivateIpv4("192.168.0.1"), true);
		assert.equal(isRfc1918PrivateIpv4("192.168.100.254"), true);
		assert.equal(isRfc1918PrivateIpv4("10.0.0.1"), true);
		assert.equal(isRfc1918PrivateIpv4("10.200.5.1"), true);
		assert.equal(isRfc1918PrivateIpv4("172.16.0.1"), true);
		assert.equal(isRfc1918PrivateIpv4("172.31.255.254"), true);

		// Rejections: loopback, APIPA, public, CGNAT, Radmin
		assert.equal(isRfc1918PrivateIpv4("127.0.0.1"), false);
		assert.equal(isRfc1918PrivateIpv4("169.254.10.5"), false);
		assert.equal(isRfc1918PrivateIpv4("100.64.0.1"), false); // Tailscale CGNAT
		assert.equal(isRfc1918PrivateIpv4("8.8.8.8"), false);
		assert.equal(isRfc1918PrivateIpv4("1.1.1.1"), false);
		assert.equal(isRfc1918PrivateIpv4("26.131.232.129"), false); // Radmin VPN
		assert.equal(isRfc1918PrivateIpv4("172.32.0.1"), false); // Out of Class B range
	});
});

describe("MultiSubnetScanner: Virtual Adapter Filtering & Classification", () => {
	it("detects virtual adapters, tunnels, and container bridges", () => {
		const virtualNames = [
			"vEthernet (WSL)",
			"vEthernet (Default Switch)",
			"docker0",
			"br-1a2b3c4d5e",
			"veth987abc",
			"VirtualBox Host-Only Ethernet Adapter",
			"vboxnet0",
			"VMware Network Adapter VMnet1",
			"Tailscale",
			"tailscale0",
			"ZeroTier One [zt0]",
			"WireGuard",
			"wg0",
			"TAP-Windows Adapter V9",
			"Radmin VPN",
			"Hamachi",
			"nordlynx",
			"utun0",
			"utun3",
			"awdl0",
			"llw0",
			"bridge0",
			"Bluetooth Network Connection",
		];

		for (const name of virtualNames) {
			assert.equal(isVirtualAdapterName(name), true, `Failed to detect virtual adapter: ${name}`);
		}
	});

	it("identifies physical network interface names", () => {
		const physicalNames = [
			"Ethernet",
			"Ethernet 2",
			"Local Area Connection",
			"eth0",
			"eth1",
			"en0",
			"en1",
			"Wi-Fi",
			"Беспроводная сеть",
			"Wireless Network Connection",
			"wlan0",
		];

		for (const name of physicalNames) {
			assert.equal(isVirtualAdapterName(name), false, `False positive for physical adapter: ${name}`);
		}
	});

	it("classifies adapter hardware types", () => {
		assert.equal(classifyAdapterType("Ethernet"), "ethernet");
		assert.equal(classifyAdapterType("eth0"), "ethernet");
		assert.equal(classifyAdapterType("Wi-Fi"), "wifi");
		assert.equal(classifyAdapterType("wlan0"), "wifi");
		assert.equal(classifyAdapterType("vEthernet (WSL)"), "virtual");
		assert.equal(classifyAdapterType("Loopback", { isInternal: true }), "loopback");
	});

	it("evaluates and scores physical interfaces over virtual adapters", () => {
		const ethPhysical = evaluateClinicInterface("Ethernet", {
			address: "192.168.1.10",
			netmask: "255.255.255.0",
			mac: "00:1a:2b:3c:4d:5e",
			family: "IPv4",
			internal: false,
		});
		assert.equal(ethPhysical.isPhysical, true);
		assert.equal(ethPhysical.isClinicSubnet, true);
		assert.ok(ethPhysical.score > 150);

		const wifiPhysical = evaluateClinicInterface("Wi-Fi", {
			address: "192.168.2.15",
			netmask: "255.255.255.0",
			mac: "aa:bb:cc:dd:ee:ff",
			family: "IPv4",
			internal: false,
		});
		assert.equal(wifiPhysical.isPhysical, true);
		assert.equal(wifiPhysical.isClinicSubnet, true);
		assert.ok(wifiPhysical.score > 100);

		// Virtual adapter gets negative score
		const wslVirtual = evaluateClinicInterface("vEthernet (WSL)", {
			address: "172.28.16.1",
			netmask: "255.255.240.0",
			mac: "00:15:5d:12:34:56",
			family: "IPv4",
			internal: false,
		});
		assert.equal(wslVirtual.isPhysical, false);
		assert.equal(wslVirtual.isClinicSubnet, false);
		assert.ok(wslVirtual.score < 0);

		// Zero MAC adapter gets filtered
		const zeroMac = evaluateClinicInterface("Pseudo Adapter", {
			address: "192.168.1.200",
			netmask: "255.255.255.0",
			mac: "00:00:00:00:00:00",
			family: "IPv4",
			internal: false,
		});
		assert.equal(zeroMac.isPhysical, false);
		assert.ok(zeroMac.score < 0);
	});
});

describe("MultiSubnetScanner: Subnet Probe Range Generation", () => {
	it("generates complete host probes for /24 clinic network", () => {
		// When localIp is provided, it excludes local workstation IP (254 usable - 1 self = 253 candidate peers)
		const probesWithLocal = generateSubnetProbeIps({
			networkAddress: "192.168.1.0",
			cidrPrefix: 24,
			localIp: "192.168.1.50",
			maxHosts: 254,
		});

		assert.equal(probesWithLocal.length, 253);
		// Local IP itself is excluded from probe targets
		assert.equal(probesWithLocal.includes("192.168.1.50"), false);
		// Gateway is included
		assert.equal(probesWithLocal.includes("192.168.1.1"), true);
		// Last usable host is included
		assert.equal(probesWithLocal.includes("192.168.1.254"), true);
		// Network (.0) and broadcast (.255) are excluded
		assert.equal(probesWithLocal.includes("192.168.1.0"), false);
		assert.equal(probesWithLocal.includes("192.168.1.255"), false);

		// When localIp is not provided, sweeps all 254 usable hosts
		const probesAll = generateSubnetProbeIps({
			networkAddress: "192.168.1.0",
			cidrPrefix: 24,
			maxHosts: 254,
		});
		assert.equal(probesAll.length, 254);
	});

	it("bounds probes intelligently for large /16 or /8 networks without sweeping millions", () => {
		const probes = generateSubnetProbeIps({
			networkAddress: "10.0.0.0",
			cidrPrefix: 8,
			localIp: "10.50.3.45",
			maxHosts: 254,
		});

		assert.ok(probes.length <= 254);
		// Verifies it targeted the local /24 slice (10.50.3.x)
		assert.equal(probes.includes("10.50.3.1"), true);
		assert.equal(probes.includes("10.50.3.254"), true);
		assert.equal(probes.includes("10.50.3.45"), false); // Excludes self
	});
});

describe("MultiSubnetScanner: Multi-Homed Network Ingestion Engine", () => {
	it("ingests dual-NIC multi-homed clinic workstation, computes broadcasts, and ranks primary IP", () => {
		const mockedInterfaces = {
			"Ethernet": [
				{
					address: "192.168.1.10",
					netmask: "255.255.255.0",
					mac: "00:1a:2b:3c:4d:5e",
					family: "IPv4",
					internal: false,
				},
			],
			"Wi-Fi": [
				{
					address: "192.168.2.25",
					netmask: "255.255.255.0",
					mac: "aa:bb:cc:dd:ee:ff",
					family: "IPv4",
					internal: false,
				},
			],
			"vEthernet (WSL)": [
				{
					address: "172.28.16.1",
					netmask: "255.255.240.0",
					mac: "00:15:5d:00:11:22",
					family: "IPv4",
					internal: false,
				},
			],
			"docker0": [
				{
					address: "172.17.0.1",
					netmask: "255.255.0.0",
					mac: "02:42:1a:2b:3c:4d",
					family: "IPv4",
					internal: false,
				},
			],
			"Loopback Pseudo-Interface 1": [
				{
					address: "127.0.0.1",
					netmask: "255.0.0.0",
					mac: "00:00:00:00:00:00",
					family: "IPv4",
					internal: true,
				},
			],
		};

		const scanner = new MultiSubnetScanner({
			interfaces: mockedInterfaces,
			targetPorts: [4100, 4101],
		});

		const result = scanner.scan();

		// Total interfaces: 5
		assert.equal(result.allInterfaces.length, 5);
		// Physical interfaces: 2 (Ethernet and Wi-Fi)
		assert.equal(result.physicalInterfaces.length, 2);
		// Excluded interfaces: 3 (WSL, Docker, Loopback)
		assert.equal(result.excludedInterfaces.length, 3);

		// Clinic subnets: 2 (192.168.1.0/24 and 192.168.2.0/24)
		assert.equal(result.clinicSubnets.length, 2);

		// Primary subnet should be Wired Ethernet (highest score)
		assert.ok(result.primarySubnet);
		assert.equal(result.primarySubnet.interfaceName, "Ethernet");
		assert.equal(result.primarySubnet.networkAddress, "192.168.1.0");
		assert.equal(result.primaryIp, "192.168.1.10");

		// Broadcast addresses must include both subnets plus global broadcast
		assert.ok(result.broadcastAddresses.includes("255.255.255.255"));
		assert.ok(result.broadcastAddresses.includes("192.168.1.255"));
		assert.ok(result.broadcastAddresses.includes("192.168.2.255"));

		// Probe targets: should generate endpoints for both subnets
		assert.ok(result.allProbeTargets.length > 0);
		const hasSubnet1Probe = result.allProbeTargets.some((t) => t.ip === "192.168.1.1");
		const hasSubnet2Probe = result.allProbeTargets.some((t) => t.ip === "192.168.2.1");
		assert.equal(hasSubnet1Probe, true);
		assert.equal(hasSubnet2Probe, true);
	});

	it("scanClinicSubnets() convenience helper executes reliably", () => {
		const result = scanClinicSubnets();
		assert.ok(result.scannedAt);
		assert.ok(Array.isArray(result.allInterfaces));
		assert.ok(Array.isArray(result.broadcastAddresses));
		assert.ok(result.broadcastAddresses.includes("255.255.255.255"));
	});
});

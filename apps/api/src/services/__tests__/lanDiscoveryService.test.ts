/**
 * DENTE Dental CRM — Cross-Platform LAN Discovery & Network Hardening Unit Tests
 *
 * Validates network interface topology mapping, priority scoring, and virtual adapter blacklisting:
 * 1. macOS interface mapping: en0 (Ethernet/Wi-Fi), en1, awdl0, llw0, utun2, bridge0, gif0, stf0, anpi0, ap0
 * 2. Windows interface mapping: vEthernet (WSL), Ethernet 2, Wi-Fi, VirtualBox, TAP-Windows
 * 3. Linux interface mapping: eth0, wlan0, docker0, virbr0, br0
 * 4. Inactive adapter rejection: filters unassigned IP and link-local APIPA (169.254.x.x)
 * 5. Winner selection accuracy and absolute exclusion of virtual/VPN IPs
 */

import assert from "node:assert/strict";
import type * as os from "node:os";
import { describe, it } from "node:test";
import {
	evaluateInterfaceCandidate,
	getLocalLanAddresses,
	getPrimaryLanIp,
	getRankedLanInterfaces,
	isPrivateIpv4,
	isVirtualAdapterName,
} from "../lanDiscoveryService.js";

describe("Cross-Platform LAN Discovery & Network Hardening Invariants", () => {
	// =========================================================================
	// 1. MACOS INTERFACE BLACKLIST & SERVICE INTERFACES
	// =========================================================================
	it("1. Accurately blacklists all macOS-specific virtual and service interfaces", () => {
		const macosVirtuals = [
			"awdl0", // Apple Wireless Direct Link (AirDrop / AirPlay)
			"awdl1",
			"llw0", // Low Latency WLAN
			"utun0", // User-space VPN tunnels
			"utun1",
			"utun2",
			"bridge0", // Thunderbolt bridge
			"bridge100",
			"gif0", // Generic tunnel
			"stf0", // 6to4 tunnel
			"anpi0", // Apple Network Processing Interface
			"anpi1",
			"ap0", // Apple Wi-Fi Access Point mode
			"ap1",
		];

		for (const name of macosVirtuals) {
			assert.strictEqual(
				isVirtualAdapterName(name),
				true,
				`macOS interface '${name}' must be recognized as virtual and blacklisted`,
			);
		}

		// Real macOS physical interfaces must NOT be blacklisted
		assert.strictEqual(isVirtualAdapterName("en0"), false, "en0 must NOT be blacklisted");
		assert.strictEqual(isVirtualAdapterName("en1"), false, "en1 must NOT be blacklisted");
		assert.strictEqual(isVirtualAdapterName("en2"), false, "en2 must NOT be blacklisted");
	});

	// =========================================================================
	// 2. WINDOWS & LINUX VIRTUAL ADAPTER BLACKLIST
	// =========================================================================
	it("2. Accurately blacklists Windows and Linux virtual adapters and containers", () => {
		const virtualAdapters = [
			// Windows
			"vEthernet (WSL)",
			"vEthernet (Default Switch)",
			"VirtualBox Host-Only Ethernet Adapter",
			"TAP-Windows Adapter V9",
			"tailscale0",
			"wireguard0",
			"Radmin VPN",
			"ZeroTier One",
			// Linux
			"docker0",
			"virbr0",
			"br0",
			"veth4a2b1c",
			"lo",
		];

		for (const name of virtualAdapters) {
			assert.strictEqual(
				isVirtualAdapterName(name),
				true,
				`Adapter '${name}' must be recognized as virtual and blacklisted`,
			);
		}

		// Real physical interfaces on Windows & Linux
		const physicalAdapters = [
			"Ethernet 2",
			"Wi-Fi",
			"Беспроводная сеть",
			"Подключение по локальной сети",
			"eth0",
			"eth1",
			"wlan0",
		];

		for (const name of physicalAdapters) {
			assert.strictEqual(
				isVirtualAdapterName(name),
				false,
				`Physical adapter '${name}' must NOT be blacklisted`,
			);
		}
	});

	// =========================================================================
	// 3. RFC 1918 PRIVATE IP VALIDATION & LINK-LOCAL / LOOPBACK REJECTION
	// =========================================================================
	it("3. Accepts RFC 1918 private subnets and strictly rejects link-local, loopback, CGNAT, and public IPs", () => {
		// Valid RFC 1918
		assert.strictEqual(isPrivateIpv4("192.168.1.50"), true);
		assert.strictEqual(isPrivateIpv4("192.168.0.1"), true);
		assert.strictEqual(isPrivateIpv4("10.0.0.1"), true);
		assert.strictEqual(isPrivateIpv4("10.200.1.25"), true);
		assert.strictEqual(isPrivateIpv4("172.16.0.1"), true);
		assert.strictEqual(isPrivateIpv4("172.31.255.254"), true);

		// Invalid / Inactive / Non-RFC1918
		assert.strictEqual(isPrivateIpv4("127.0.0.1"), false, "Loopback must be rejected");
		assert.strictEqual(isPrivateIpv4("0.0.0.0"), false, "0.0.0.0 must be rejected");
		assert.strictEqual(isPrivateIpv4("169.254.1.1"), false, "APIPA link-local must be rejected");
		assert.strictEqual(isPrivateIpv4("169.254.120.45"), false, "APIPA link-local must be rejected");
		assert.strictEqual(isPrivateIpv4("100.64.0.1"), false, "CGNAT must be rejected");
		assert.strictEqual(isPrivateIpv4("8.8.8.8"), false, "Public IP must be rejected");
		assert.strictEqual(isPrivateIpv4("26.131.232.129"), false, "Radmin IP must be rejected");
	});

	// =========================================================================
	// 4. MACOS SMART INTERFACE SCORING: en0 / en1 WIRED ETHERNET VS WI-FI
	// =========================================================================
	it("4. Evaluates macOS en0/en1 interfaces with smart priority (+130 for wired Ethernet, +100 for Wi-Fi)", () => {
		// macOS Wired Ethernet en0 (192.168.1.50, /24)
		const macEthernetIface: os.NetworkInterfaceInfo = {
			address: "192.168.1.50",
			netmask: "255.255.255.0",
			family: "IPv4",
			mac: "f4:d4:88:5a:2b:11",
			internal: false,
			cidr: "192.168.1.50/24",
		};

		const macEthernet = evaluateInterfaceCandidate("en0", macEthernetIface, {
			isEthernet: true,
			isWifi: false,
			platform: "darwin",
		});

		assert.strictEqual(macEthernet.isVirtual, false);
		assert.strictEqual(macEthernet.isEthernet, true);
		assert.strictEqual(macEthernet.isWifi, false);
		// +130 (macOS Ethernet) + 30 (192.168) + 10 (/24) = 170
		assert.strictEqual(macEthernet.score, 170);
		assert.ok(macEthernet.reason.includes("macOS physical Ethernet en0 (+130)"));

		// macOS Wi-Fi en1 (192.168.1.51, /24)
		const macWifiIface: os.NetworkInterfaceInfo = {
			address: "192.168.1.51",
			netmask: "255.255.255.0",
			family: "IPv4",
			mac: "f4:d4:88:5a:2b:12",
			internal: false,
			cidr: "192.168.1.51/24",
		};

		const macWifi = evaluateInterfaceCandidate("en1", macWifiIface, {
			isEthernet: false,
			isWifi: true,
			platform: "darwin",
		});

		assert.strictEqual(macWifi.isVirtual, false);
		assert.strictEqual(macWifi.isWifi, true);
		assert.strictEqual(macWifi.isEthernet, false);
		// +100 (macOS Wi-Fi) + 30 (192.168) + 10 (/24) = 140
		assert.strictEqual(macWifi.score, 140);
		assert.ok(macWifi.reason.includes("macOS physical Wi-Fi en1 (+100)"));

		// macOS Wired Ethernet strictly outranks Wi-Fi for clinic server reliability
		assert.ok(
			macEthernet.score > macWifi.score,
			`macOS Ethernet score (${macEthernet.score}) must exceed Wi-Fi score (${macWifi.score})`,
		);
	});

	// =========================================================================
	// 5. MACOS TOPOLOGY WINNER SELECTION & ZERO VIRTUAL IPS
	// =========================================================================
	it("5. Selects correct winner on macOS topology with en0, en1, awdl0, utun2, bridge0", () => {
		const macTopology: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
			en0: [
				{
					address: "192.168.1.50",
					netmask: "255.255.255.0",
					family: "IPv4",
					mac: "f4:d4:88:5a:2b:11",
					internal: false,
					cidr: "192.168.1.50/24",
				},
			],
			en1: [
				{
					address: "192.168.1.51",
					netmask: "255.255.255.0",
					family: "IPv4",
					mac: "f4:d4:88:5a:2b:12",
					internal: false,
					cidr: "192.168.1.51/24",
				},
			],
			awdl0: [
				{
					address: "169.254.10.20",
					netmask: "255.255.0.0",
					family: "IPv4",
					mac: "fe:d4:88:5a:2b:13",
					internal: false,
					cidr: "169.254.10.20/16",
				},
			],
			utun2: [
				{
					address: "10.8.0.5",
					netmask: "255.255.255.255",
					family: "IPv4",
					mac: "00:00:00:00:00:00",
					internal: false,
					cidr: "10.8.0.5/32",
				},
			],
			bridge0: [
				{
					address: "192.168.2.1",
					netmask: "255.255.255.0",
					family: "IPv4",
					mac: "82:d4:88:5a:2b:14",
					internal: false,
					cidr: "192.168.2.1/24",
				},
			],
		};

		const ranked = getRankedLanInterfaces(macTopology, {
			hardwarePorts: new Map([
				["en0", "ethernet"],
				["en1", "wifi"],
			]),
			platform: "darwin",
		});

		// awdl0, utun2, bridge0 must be marked virtual
		const virtualCandidates = ranked.filter((c) =>
			["awdl0", "utun2", "bridge0"].includes(c.name),
		);
		for (const v of virtualCandidates) {
			assert.strictEqual(v.isVirtual, true, `Interface '${v.name}' must be marked virtual`);
			assert.ok(v.score < 0, `Interface '${v.name}' score must be negative`);
		}

		// Valid addresses must only contain en0 and en1
		const validIps = getLocalLanAddresses(macTopology, {
			hardwarePorts: new Map([
				["en0", "ethernet"],
				["en1", "wifi"],
			]),
			platform: "darwin",
		});

		assert.deepStrictEqual(validIps, ["192.168.1.50", "192.168.1.51"]);
		assert.strictEqual(
			getPrimaryLanIp(macTopology, {
				hardwarePorts: new Map([
					["en0", "ethernet"],
					["en1", "wifi"],
				]),
				platform: "darwin",
			}),
			"192.168.1.50",
			"Primary IP must be the wired Ethernet en0",
		);
	});

	// =========================================================================
	// 6. WINDOWS TOPOLOGY WINNER SELECTION & ZERO VIRTUAL IPS
	// =========================================================================
	it("6. Selects correct winner on Windows topology with vEthernet, Ethernet 2, Wi-Fi", () => {
		const windowsTopology: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
			"Ethernet 2": [
				{
					address: "192.168.1.100",
					netmask: "255.255.255.0",
					family: "IPv4",
					mac: "88:d8:2e:a7:e1:aa",
					internal: false,
					cidr: "192.168.1.100/24",
				},
			],
			"Wi-Fi": [
				{
					address: "192.168.1.105",
					netmask: "255.255.255.0",
					family: "IPv4",
					mac: "88:d8:2e:a7:e1:bb",
					internal: false,
					cidr: "192.168.1.105/24",
				},
			],
			"vEthernet (WSL)": [
				{
					address: "172.25.16.1",
					netmask: "255.255.240.0",
					family: "IPv4",
					mac: "00:15:5d:20:10:01",
					internal: false,
					cidr: "172.25.16.1/20",
				},
			],
			"VirtualBox Host-Only Ethernet Adapter": [
				{
					address: "192.168.56.1",
					netmask: "255.255.255.0",
					family: "IPv4",
					mac: "0a:00:27:00:00:00",
					internal: false,
					cidr: "192.168.56.1/24",
				},
			],
		};

		const ranked = getRankedLanInterfaces(windowsTopology, { platform: "win32" });

		// Ethernet 2 score: 120 + 30 + 10 = 160
		const eth = ranked.find((c) => c.name === "Ethernet 2");
		assert.ok(eth);
		assert.strictEqual(eth.score, 160);
		assert.strictEqual(eth.isVirtual, false);

		// Wi-Fi score: 90 + 30 + 10 = 130
		const wifi = ranked.find((c) => c.name === "Wi-Fi");
		assert.ok(wifi);
		assert.strictEqual(wifi.score, 130);
		assert.strictEqual(wifi.isVirtual, false);

		// Virtual adapters must have negative scores and isVirtual=true
		const wsl = ranked.find((c) => c.name === "vEthernet (WSL)");
		assert.ok(wsl);
		assert.strictEqual(wsl.isVirtual, true);
		assert.ok(wsl.score < 0);

		const vbox = ranked.find((c) => c.name === "VirtualBox Host-Only Ethernet Adapter");
		assert.ok(vbox);
		assert.strictEqual(vbox.isVirtual, true);
		assert.ok(vbox.score < 0);

		// Winner must be Ethernet 2 (192.168.1.100)
		const primaryIp = getPrimaryLanIp(windowsTopology, { platform: "win32" });
		assert.strictEqual(primaryIp, "192.168.1.100");

		// All virtual IPs strictly excluded from valid LAN addresses
		const addresses = getLocalLanAddresses(windowsTopology, { platform: "win32" });
		assert.deepStrictEqual(addresses, ["192.168.1.100", "192.168.1.105"]);
		assert.ok(!addresses.includes("172.25.16.1"));
		assert.ok(!addresses.includes("192.168.56.1"));
	});

	// =========================================================================
	// 7. LINUX TOPOLOGY WINNER SELECTION & ZERO VIRTUAL IPS
	// =========================================================================
	it("7. Selects correct winner on Linux topology with eth0 and docker0", () => {
		const linuxTopology: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
			eth0: [
				{
					address: "192.168.0.50",
					netmask: "255.255.255.0",
					family: "IPv4",
					mac: "52:54:00:12:34:56",
					internal: false,
					cidr: "192.168.0.50/24",
				},
			],
			docker0: [
				{
					address: "172.17.0.1",
					netmask: "255.255.0.0",
					family: "IPv4",
					mac: "02:42:1a:2b:3c:4d",
					internal: false,
					cidr: "172.17.0.1/16",
				},
			],
			virbr0: [
				{
					address: "192.168.122.1",
					netmask: "255.255.255.0",
					family: "IPv4",
					mac: "52:54:00:aa:bb:cc",
					internal: false,
					cidr: "192.168.122.1/24",
				},
			],
		};

		const ranked = getRankedLanInterfaces(linuxTopology, { platform: "linux" });
		const eth0 = ranked.find((c) => c.name === "eth0");
		assert.ok(eth0);
		assert.strictEqual(eth0.isVirtual, false);
		assert.strictEqual(eth0.score, 160); // 120 + 30 + 10

		const docker0 = ranked.find((c) => c.name === "docker0");
		assert.ok(docker0);
		assert.strictEqual(docker0.isVirtual, true);
		assert.ok(docker0.score < 0);

		const virbr0 = ranked.find((c) => c.name === "virbr0");
		assert.ok(virbr0);
		assert.strictEqual(virbr0.isVirtual, true);
		assert.ok(virbr0.score < 0);

		const primary = getPrimaryLanIp(linuxTopology, { platform: "linux" });
		assert.strictEqual(primary, "192.168.0.50");

		const validIps = getLocalLanAddresses(linuxTopology, { platform: "linux" });
		assert.deepStrictEqual(validIps, ["192.168.0.50"]);
	});

	// =========================================================================
	// 8. INACTIVE ADAPTER REJECTION (UNASSIGNED IP & APIPA 169.254.X.X)
	// =========================================================================
	it("8. Strictly ignores inactive adapters without assigned IP or with link-local 169.254.x.x", () => {
		// Inactive without IP
		const unassignedIface: os.NetworkInterfaceInfo = {
			address: "",
			netmask: "0.0.0.0",
			family: "IPv4",
			mac: "88:d8:2e:a7:e1:99",
			internal: false,
			cidr: null,
		};
		const unassigned = evaluateInterfaceCandidate("en0", unassignedIface);
		assert.strictEqual(unassigned.isVirtual, true);
		assert.strictEqual(unassigned.score, -1000);
		assert.ok(unassigned.reason.includes("Inactive adapter"));

		// 0.0.0.0 address
		const zeroIface: os.NetworkInterfaceInfo = {
			address: "0.0.0.0",
			netmask: "0.0.0.0",
			family: "IPv4",
			mac: "88:d8:2e:a7:e1:98",
			internal: false,
			cidr: null,
		};
		const zero = evaluateInterfaceCandidate("Ethernet", zeroIface);
		assert.strictEqual(zero.isVirtual, true);
		assert.strictEqual(zero.score, -1000);

		// Link-local / APIPA 169.254.x.x (DHCP failure)
		const apipaIface: os.NetworkInterfaceInfo = {
			address: "169.254.45.120",
			netmask: "255.255.0.0",
			family: "IPv4",
			mac: "88:d8:2e:a7:e1:97",
			internal: false,
			cidr: "169.254.45.120/16",
		};
		const apipa = evaluateInterfaceCandidate("en1", apipaIface);
		assert.strictEqual(apipa.isVirtual, true);
		assert.strictEqual(apipa.score, -400);
		assert.ok(apipa.reason.includes("Link-local / APIPA"));

		// Verify these do NOT appear in valid LAN addresses
		const testTopology: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
			inactive1: [unassignedIface],
			inactive2: [zeroIface],
			apipa: [apipaIface],
		};
		const addresses = getLocalLanAddresses(testTopology);
		assert.deepStrictEqual(
			addresses,
			["127.0.0.1"],
			"Must fallback to 127.0.0.1 when only inactive/link-local adapters exist",
		);
	});
});

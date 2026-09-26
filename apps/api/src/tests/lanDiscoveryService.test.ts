import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateInterfaceCandidate,
	getLocalLanAddresses,
	getPrimaryLanIp,
	getRankedLanInterfaces,
	isPrivateIpv4,
	isVirtualAdapterName,
} from "../services/lanDiscoveryService.js";

describe("lanDiscoveryService Virtual Adapter Blacklist & Reliability Invariants", () => {
	it("1. isVirtualAdapterName accurately blacklists WSL, Hyper-V, Docker, TAP, Tailscale, WireGuard", () => {
		const blacklisted = [
			"vEthernet (WSL)",
			"vEthernet (Default Switch)",
			"VirtualBox Host-Only Ethernet Adapter",
			"docker0",
			"tailscale0",
			"TAP-Windows Adapter V9",
			"hades-awg-5",
			"wireguard0",
			"Radmin VPN",
			"ZeroTier One",
			"utun0",
			"vmnet1",
			"hamachi0",
		];

		for (const name of blacklisted) {
			assert.strictEqual(
				isVirtualAdapterName(name),
				true,
				`Adapter '${name}' should be recognized as virtual and blacklisted`,
			);
		}

		const realPhysical = [
			"Wi-Fi",
			"Беспроводная сеть 2",
			"Ethernet",
			"Подключение по локальной сети",
			"eth0",
			"en0",
			"wlan0",
		];

		for (const name of realPhysical) {
			assert.strictEqual(
				isVirtualAdapterName(name),
				false,
				`Adapter '${name}' must NOT be blacklisted`,
			);
		}
	});

	it("2. isPrivateIpv4 accepts only RFC 1918 private ranges and rejects APIPA, loopback and public IPs", () => {
		// Valid RFC 1918
		assert.strictEqual(isPrivateIpv4("192.168.1.103"), true);
		assert.strictEqual(isPrivateIpv4("10.0.0.1"), true);
		assert.strictEqual(isPrivateIpv4("172.16.0.5"), true);
		assert.strictEqual(isPrivateIpv4("172.31.255.254"), true);

		// Invalid / public / link-local / CGNAT
		assert.strictEqual(isPrivateIpv4("127.0.0.1"), false, "Loopback must be rejected");
		assert.strictEqual(isPrivateIpv4("169.254.1.1"), false, "APIPA link-local must be rejected");
		assert.strictEqual(isPrivateIpv4("100.64.0.1"), false, "CGNAT must be rejected");
		assert.strictEqual(isPrivateIpv4("26.131.232.129"), false, "Radmin public IP must be rejected");
		assert.strictEqual(isPrivateIpv4("8.8.8.8"), false, "Public DNS must be rejected");
	});

	it("3. evaluateInterfaceCandidate assigns negative score and isVirtual=true to virtual adapters", () => {
		const virtualIface = {
			address: "172.28.16.1",
			netmask: "255.255.240.0",
			family: "IPv4" as const,
			mac: "00:15:5d:20:10:01",
			internal: false,
			cidr: "172.28.16.1/20",
		};
		const evaluated = evaluateInterfaceCandidate("vEthernet (WSL)", virtualIface);
		assert.strictEqual(evaluated.isVirtual, true);
		assert.ok(evaluated.score < 0);
		assert.ok(evaluated.reason.includes("virtual"));
	});

	it("4. evaluateInterfaceCandidate prioritizes physical Wi-Fi over Ethernet and penalizes zero-MAC tunnels", () => {
		const wifiIface = {
			address: "192.168.1.103",
			netmask: "255.255.255.0",
			family: "IPv4" as const,
			mac: "88:d8:2e:a7:e1:4e",
			internal: false,
			cidr: "192.168.1.103/24",
		};
		const wifiCandidate = evaluateInterfaceCandidate("Беспроводная сеть 2", wifiIface);
		assert.strictEqual(wifiCandidate.isVirtual, false);
		assert.strictEqual(wifiCandidate.isWifi, true);
		assert.ok(wifiCandidate.score >= 140);

		const tunnelIface = {
			address: "10.88.0.5",
			netmask: "255.255.255.255",
			family: "IPv4" as const,
			mac: "00:00:00:00:00:00",
			internal: false,
			cidr: "10.88.0.5/32",
		};
		const tunnelCandidate = evaluateInterfaceCandidate("hades-awg-5", tunnelIface);
		assert.strictEqual(tunnelCandidate.isVirtual, true);
		assert.ok(tunnelCandidate.score < 0);
	});

	it("5. getLocalLanAddresses returns prioritized physical IPs on this machine", () => {
		const addresses = getLocalLanAddresses();
		assert.ok(addresses.length > 0);
		// Verified on host: 192.168.1.103 is chosen, and 26.131.232.129 (Radmin) / 10.88.0.5 (AWG) are excluded!
		if (addresses[0] !== "127.0.0.1") {
			assert.strictEqual(addresses[0], "192.168.1.103");
			assert.ok(!addresses.includes("26.131.232.129"));
			assert.ok(!addresses.includes("10.88.0.5"));
		}
	});
});

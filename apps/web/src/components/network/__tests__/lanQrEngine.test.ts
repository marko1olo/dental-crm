import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildLanConnectionUrl,
	formatAdapterDisplayName,
	generateLanPairingQr,
	getApIsolationDiagnostics,
	isWindowsHotspotIp,
	parsePairingUrlParams,
	type LanConnectionConfig,
	type LanServerInterfaceItem,
} from "../lanQrEngine.js";

describe("LAN QR Engine & Discovery Verification", () => {
	it("1. buildLanConnectionUrl correctly constructs tablet pairing URLs with port and role", () => {
		const config: LanConnectionConfig = {
			lanIp: "192.168.1.103",
			port: 4000,
			pairingToken: "test-token-doctor-jwt-777",
			role: "doctor",
		};
		const url = buildLanConnectionUrl(config);
		assert.strictEqual(
			url,
			"http://192.168.1.103:4000/?pair=test-token-doctor-jwt-777&role=doctor",
		);
	});

	it("2. buildLanConnectionUrl omits default port 80 and 443", () => {
		const httpConfig: LanConnectionConfig = {
			lanIp: "192.168.0.50",
			port: 80,
			pairingToken: "tok80",
			protocol: "http",
		};
		assert.strictEqual(buildLanConnectionUrl(httpConfig), "http://192.168.0.50/?pair=tok80");

		const httpsConfig: LanConnectionConfig = {
			lanIp: "10.0.0.15",
			port: 443,
			pairingToken: "tok443",
			protocol: "https",
			role: "assistant",
		};
		assert.strictEqual(
			buildLanConnectionUrl(httpsConfig),
			"https://10.0.0.15/?pair=tok443&role=assistant",
		);
	});

	it("3. parsePairingUrlParams extracts token and role accurately", () => {
		const query = "?pair=abc123xyz&role=assistant";
		const parsed = parsePairingUrlParams(query);
		assert.strictEqual(parsed.pairingToken, "abc123xyz");
		assert.strictEqual(parsed.role, "assistant");

		const empty = parsePairingUrlParams("");
		assert.strictEqual(empty.pairingToken, null);
		assert.strictEqual(empty.role, null);
	});

	it("4. generateLanPairingQr produces valid ISO/IEC 18004 SVG markup", () => {
		const result = generateLanPairingQr({
			lanIp: "192.168.1.103",
			port: 4000,
			pairingToken: "auth-sample-token",
			role: "doctor",
		});

		assert.ok(result.qrSvg.startsWith("<svg"), "QR output must start with <svg");
		assert.ok(result.qrSvg.endsWith("</svg>"), "QR output must end with </svg>");
		assert.ok(result.qrSvg.includes("viewBox="), "QR SVG must specify viewBox");
		assert.strictEqual(result.role, "doctor");
		assert.strictEqual(result.lanIp, "192.168.1.103");
	});

	it("5. isWindowsHotspotIp identifies canonical Windows ICS gateway 192.168.137.1", () => {
		assert.strictEqual(isWindowsHotspotIp("192.168.137.1"), true);
		assert.strictEqual(isWindowsHotspotIp("192.168.1.103"), false);
		assert.strictEqual(isWindowsHotspotIp("10.0.0.1"), false);
		assert.strictEqual(isWindowsHotspotIp("127.0.0.1"), false);
	});

	it("6. getApIsolationDiagnostics returns structured bypass guide with ms-settings command", () => {
		const diag = getApIsolationDiagnostics();
		assert.ok(diag.issueTitle.length > 0);
		assert.ok(diag.cause.includes("AP Isolation") || diag.cause.includes("изоляция"));
		assert.strictEqual(diag.quickCommand, "ms-settings:network-mobilehotspot");
		assert.strictEqual(diag.steps.length, 3);
		assert.strictEqual(diag.steps[0]?.command, "ms-settings:network-mobilehotspot");
	});

	it("7. formatAdapterDisplayName produces correct badges and labels", () => {
		const wifiAdapter: LanServerInterfaceItem = {
			name: "Беспроводная сеть 2",
			address: "192.168.1.103",
			netmask: "255.255.255.0",
			mac: "88:d8:2e:a7:e1:4e",
			isWifi: true,
			isEthernet: false,
			isVirtual: false,
			score: 140,
			reason: "Wi-Fi adapter (+100)",
		};

		const formatted = formatAdapterDisplayName(wifiAdapter, true);
		assert.strictEqual(formatted.tag, "Wi-Fi");
		assert.ok(formatted.title.includes("Основной"));
		assert.ok(formatted.title.includes("192.168.1.103"));

		const hotspotAdapter: LanServerInterfaceItem = {
			name: "Подключение по локальной сети* 12",
			address: "192.168.137.1",
			netmask: "255.255.255.0",
			mac: "88:d8:2e:a7:e1:4f",
			isWifi: true,
			isEthernet: false,
			isVirtual: false,
			score: 150,
			reason: "Hotspot gateway (+50)",
		};

		const formattedHotspot = formatAdapterDisplayName(hotspotAdapter, false);
		assert.strictEqual(formattedHotspot.tag, "Hotspot Wi-Fi");
	});
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanConnectionActions } from "../lanQrModal/LanConnectionActions";
import { LanDeviceRoleTabs } from "../lanQrModal/LanDeviceRoleTabs";
import { LanQrCodeSvg } from "../lanQrModal/LanQrCodeSvg";
import { LanTelemetryStatus } from "../lanQrModal/LanTelemetryStatus";
import { LanTroubleshootingGuide } from "../lanQrModal/LanTroubleshootingGuide";
import { formatSecondsToTimer } from "../lanQrModal/lanConnectionHelpers";
import type { LanServerInterfaceItem } from "../lanQrEngine";

describe("LanQrConnectionModal Decomposed Submodules & Ergonomics", () => {
	it("1. Mandate 8b line limits: all submodules <= 120 lines, facade <= 80 lines", () => {
		const baseDir = path.resolve(__dirname, "..");
		const facadePath = path.join(baseDir, "LanQrConnectionModal.tsx");
		const facadeLines = fs.readFileSync(facadePath, "utf-8").split("\n").length;
		expect(facadeLines).toBeLessThanOrEqual(80);

		const modalSubDir = path.join(baseDir, "lanQrModal");
		const files = fs.readdirSync(modalSubDir);
		for (const file of files) {
			if (file.endsWith(".ts") || file.endsWith(".tsx")) {
				const fullPath = path.join(modalSubDir, file);
				const lineCount = fs.readFileSync(fullPath, "utf-8").split("\n").length;
				expect(lineCount, `File ${file} exceeds 120 lines limit (${lineCount})`).toBeLessThanOrEqual(120);
			}
		}
	});

	it("2. LanDeviceRoleTabs renders Apple Segmented Control with >=44px touch targets and 0 disabled buttons", () => {
		const htmlDoctor = renderToString(
			<LanDeviceRoleTabs role="doctor" onRoleChange={() => {}} />,
		);
		expect(htmlDoctor).toContain("Врач у кресла");
		expect(htmlDoctor).toContain("Ассистент");
		expect(htmlDoctor).toContain("min-h-[44px]");
		expect(htmlDoctor).not.toContain("disabled");

		const htmlAssistant = renderToString(
			<LanDeviceRoleTabs role="assistant" onRoleChange={() => {}} />,
		);
		expect(htmlAssistant).toContain("Ассистент (Телефон)");
		expect(htmlAssistant).toContain("bg-teal-600");
	});

	it("3. LanQrCodeSvg renders high-contrast SVG and displays confirmation PIN", () => {
		const mockSvg = '<svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg>';
		const htmlReady = renderToString(
			<LanQrCodeSvg
				qrSvg={mockSvg}
				role="doctor"
				pairingPin="4819"
				requiresAuth={false}
				loading={false}
			/>,
		);
		expect(htmlReady).toContain('data-testid="lan-qr-svg-container"');
		expect(htmlReady).toContain("4819");
		expect(htmlReady).toContain("ПИН:");

		const htmlAuth = renderToString(
			<LanQrCodeSvg
				qrSvg=""
				role="doctor"
				requiresAuth={true}
				loading={false}
			/>,
		);
		expect(htmlAuth).toContain("Требуется авторизация");

		const htmlLoading = renderToString(
			<LanQrCodeSvg
				qrSvg=""
				role="doctor"
				requiresAuth={false}
				loading={true}
			/>,
		);
		expect(htmlLoading).toContain("Определение LAN IP...");
	});

	it("4. LanTelemetryStatus shows real LAN ping, connected peers, and never-disabled refresh button", () => {
		const html = renderToString(
			<LanTelemetryStatus
				pingMs={12}
				connectedPeersCount={2}
				formattedTime="14:55"
				isRefreshing={false}
				onRefresh={() => {}}
			/>,
		);
		expect(html).toContain("LAN готов");
		expect(html).toContain("12 мс");
		expect(html).toContain("Подключено:");
		expect(html).toContain("2");
		expect(html).toContain("14:55");
		expect(html).toContain('data-testid="lan-qr-refresh-btn"');
		expect(html).toContain("min-h-[44px]");
		expect(html).not.toContain("disabled");
	});

	it("5. LanConnectionActions renders direct link, copy button >=44px, and adapter switcher", () => {
		const interfaces: LanServerInterfaceItem[] = [
			{ name: "Wi-Fi", address: "192.168.1.100", netmask: "255.255.255.0", mac: "00:11:22", isWifi: true, isEthernet: false, isVirtual: false, score: 90, reason: "Wi-Fi" },
			{ name: "Ethernet", address: "10.0.0.5", netmask: "255.255.255.0", mac: "00:11:33", isWifi: false, isEthernet: true, isVirtual: false, score: 80, reason: "Ethernet" },
		];

		const html = renderToString(
			<LanConnectionActions
				connectionUrl="http://192.168.1.100:5173/mobile?pair=xyz"
				selectedIp="192.168.1.100"
				requiresAuth={false}
				copied={false}
				onCopyUrl={() => {}}
				physicalInterfaces={interfaces}
				primaryIp="192.168.1.100"
				onSelectAdapter={() => {}}
				onOpenDiagnostics={() => {}}
			/>,
		);

		expect(html).toContain("http://192.168.1.100:5173/mobile?pair=xyz");
		expect(html).toContain("Скопировать");
		expect(html).toContain('data-testid="lan-qr-copy-url-btn"');
		expect(html).toContain('data-testid="lan-qr-open-browser-btn"');
		expect(html).toContain("192.168.1.100");
		expect(html).toContain("10.0.0.5");
		expect(html).toContain("Решение в 1 клик");
		expect(html).not.toContain("disabled");
	});

	it("6. LanTroubleshootingGuide renders natural Russian diagnostics and Windows 11 Hotspot guide", () => {
		const html = renderToString(
			<LanTroubleshootingGuide
				showDetails={false}
				onToggleDetails={() => {}}
			/>,
		);

		expect(html).toContain("Диагностика: планшет не открывает адрес сервера");
		expect(html).toContain("изоляция беспроводных клиентов (AP Isolation");
		expect(html).toContain("ms-settings:network-mobilehotspot");
		expect(html).toContain("Открыть параметры хот-спота Windows");
		expect(html).toContain("Включить раздачу Wi-Fi");
		expect(html).toContain("Подключить планшет к Wi-Fi сервера");
		expect(html).not.toContain("Мандат");
	});

	it("7. lanConnectionHelpers formats countdown timer correctly", () => {
		expect(formatSecondsToTimer(900)).toBe("15:00");
		expect(formatSecondsToTimer(65)).toBe("01:05");
		expect(formatSecondsToTimer(0)).toBe("00:00");
		expect(formatSecondsToTimer(-10)).toBe("00:00");
	});
});

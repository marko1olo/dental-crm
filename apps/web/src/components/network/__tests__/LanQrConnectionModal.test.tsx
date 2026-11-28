import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanQrConnectionModal } from "../LanQrConnectionModal";
import { LanConnectionActions } from "../lanQrModal/LanConnectionActions";
import { LanClientJoinWizard } from "../lanQrModal/LanClientJoinWizard";
import { LanDeviceRoleTabs } from "../lanQrModal/LanDeviceRoleTabs";
import { LanQrCodeSvg } from "../lanQrModal/LanQrCodeSvg";
import { LanTelemetryStatus } from "../lanQrModal/LanTelemetryStatus";
import { LanTroubleshootingGuide } from "../lanQrModal/LanTroubleshootingGuide";
import { LanWizardModeTabs } from "../lanQrModal/LanWizardModeTabs";
import { formatSecondsToTimer } from "../lanQrModal/lanConnectionHelpers";
import type { LanServerInterfaceItem } from "../lanQrEngine";

describe("LanQrConnectionModal Decomposed Submodules & Ergonomics (6G Live SUT)", () => {
	it("1. LanQrConnectionModal returns empty markup when closed and formatSecondsToTimer handles long durations", () => {
		const closedHtml = renderToStaticMarkup(
			<LanQrConnectionModal isOpen={false} onClose={() => {}} />,
		);
		expect(closedHtml).toBe("");
		expect(formatSecondsToTimer(3661)).toBe("61:01");

		const emptyActionsHtml = renderToStaticMarkup(
			<LanConnectionActions
				connectionUrl=""
				selectedIp={null}
				requiresAuth={true}
				copied={false}
				onCopyUrl={() => {}}
				physicalInterfaces={[]}
				primaryIp={undefined}
				onSelectAdapter={() => {}}
				onOpenDiagnostics={() => {}}
			/>,
		);
		expect(emptyActionsHtml).toContain("Решение проблемы");
		expect(emptyActionsHtml).not.toContain('disabled=""');
	});

	it("2. LanDeviceRoleTabs renders Apple Segmented Control with >=44px touch targets and 0 disabled buttons", () => {
		const htmlDoctor = renderToStaticMarkup(
			<LanDeviceRoleTabs role="doctor" onRoleChange={() => {}} />,
		);
		expect(htmlDoctor).toContain("Врач у кресла");
		expect(htmlDoctor).toContain("Ассистент");
		expect(htmlDoctor).toContain("min-h-[44px]");
		expect(htmlDoctor).not.toContain("disabled");

		const htmlAssistant = renderToStaticMarkup(
			<LanDeviceRoleTabs role="assistant" onRoleChange={() => {}} />,
		);
		expect(htmlAssistant).toContain("Ассистент (Телефон)");
		expect(htmlAssistant).toContain("bg-[var(--paper)]");
	});

	it("3. LanQrCodeSvg renders high-contrast SVG and displays confirmation PIN", () => {
		const mockSvg = '<svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg>';
		const htmlReady = renderToStaticMarkup(
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

		const htmlAuth = renderToStaticMarkup(
			<LanQrCodeSvg
				qrSvg=""
				role="doctor"
				requiresAuth={true}
				loading={false}
			/>,
		);
		expect(htmlAuth).toContain("Требуется авторизация");

		const htmlLoading = renderToStaticMarkup(
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
		const html = renderToStaticMarkup(
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

		const html = renderToStaticMarkup(
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
		expect(html).toContain("Решение проблемы");
		expect(html).not.toContain("disabled");
	});

	it("6. LanTroubleshootingGuide renders natural Russian diagnostics and Windows 11 Hotspot guide", () => {
		const html = renderToStaticMarkup(
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

	it("8. 2-Mode Pairing Wizard renders Host/Client mode switch and unlocked Client Join CTA", () => {
		const modeHtml = renderToStaticMarkup(
			<LanWizardModeTabs mode="client" onChange={() => {}} />,
		);
		expect(modeHtml).toContain("Главный ПК клиники");
		expect(modeHtml).toContain("Подключиться к клинике");
		expect(modeHtml).toContain("min-h-[44px]");

		const clientHtml = renderToStaticMarkup(
			<LanClientJoinWizard initialOrigin="http://192.168.1.50:4100" />,
		);
		expect(clientHtml).toContain("6-значный PIN с главного ПК");
		expect(clientHtml).toContain("Подключить устройство");
		expect(clientHtml).toContain("bg-[var(--primary)]");
		expect(clientHtml).not.toContain("disabled");
	});
});

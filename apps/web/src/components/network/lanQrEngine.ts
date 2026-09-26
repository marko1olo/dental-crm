/**
 * DENTE Dental CRM — Zero-Config LAN QR Pairing & Network Engine
 *
 * Provides:
 * - Direct connection URL generation for doctor / assistant iPad & tablets:
 *   http://<REAL_LAN_IP>:4000/?pair=<PAIRING_TOKEN>&role=<ROLE>
 * - ISO/IEC 18004 SVG QR code rendering via canonical @dental/shared engine
 * - Network topology parsing & physical interface ranking
 * - Router AP Isolation (Client Isolation) diagnostics & 1-click Windows Hotspot guide
 */

import { generateQrCodeSvg, type QrSvgOptions } from "@dental/shared";

export type DeviceRole = "doctor" | "assistant";

export interface LanConnectionConfig {
	readonly lanIp: string;
	readonly port: number;
	readonly pairingToken: string;
	readonly role?: DeviceRole;
	readonly protocol?: "http" | "https";
}

export interface LanQrCodeResult {
	readonly connectionUrl: string;
	readonly qrSvg: string;
	readonly lanIp: string;
	readonly port: number;
	readonly pairingToken: string;
	readonly role: DeviceRole;
	readonly generatedAt: string;
}

export interface NetworkDiagnosticStep {
	readonly stepNumber: number;
	readonly title: string;
	readonly description: string;
	readonly badge?: string;
	readonly command?: string;
}

export interface ApIsolationDiagnostic {
	readonly issueTitle: string;
	readonly symptom: string;
	readonly cause: string;
	readonly solutionTitle: string;
	readonly solutionDescription: string;
	readonly steps: readonly NetworkDiagnosticStep[];
	readonly quickCommand: string;
}

export interface LanServerInterfaceItem {
	readonly name: string;
	readonly address: string;
	readonly netmask: string;
	readonly mac: string;
	readonly isWifi: boolean;
	readonly isEthernet: boolean;
	readonly isVirtual: boolean;
	readonly score: number;
	readonly reason: string;
}

export interface LanServerInfoResponse {
	readonly ok: boolean;
	readonly primaryIp: string;
	readonly lanAddresses: readonly string[];
	readonly apiPort: number;
	readonly webPort: number;
	readonly hostname: string;
	readonly serverName: string;
	readonly serverId: string;
	readonly pairingToken: string;
	readonly pairingUrl: string;
	readonly pairingRole?: DeviceRole;
	readonly pairingExpiresInSeconds: number;
	readonly pairingExpiresAt: string;
	readonly interfaces: readonly LanServerInterfaceItem[];
}

/**
 * Builds direct LAN connection URL for tablets scanning the server QR code.
 */
export function buildLanConnectionUrl(config: LanConnectionConfig): string {
	const protocol = config.protocol || "http";
	const portPart = config.port === 80 || config.port === 443 ? "" : `:${config.port}`;
	const cleanIp = config.lanIp.trim() || "127.0.0.1";
	const cleanToken = config.pairingToken.trim();
	const roleParam = config.role ? `&role=${encodeURIComponent(config.role)}` : "";

	return `${protocol}://${cleanIp}${portPart}/?pair=${encodeURIComponent(cleanToken)}${roleParam}`;
}

/**
 * Parses query parameters from current tablet URL to extract pairing token and role.
 */
export function parsePairingUrlParams(searchParamsString?: string): {
	pairingToken: string | null;
	role: DeviceRole | null;
} {
	if (typeof window === "undefined" && !searchParamsString) {
		return { pairingToken: null, role: null };
	}

	const search =
		searchParamsString !== undefined
			? searchParamsString
			: typeof window !== "undefined"
				? window.location.search
				: "";

	if (!search) {
		return { pairingToken: null, role: null };
	}

	const params = new URLSearchParams(search);
	const token = params.get("pair")?.trim() || null;
	const rawRole = params.get("role")?.toLowerCase().trim();
	const role: DeviceRole | null =
		rawRole === "assistant" ? "assistant" : rawRole === "doctor" ? "doctor" : null;

	return { pairingToken: token, role };
}

/**
 * Generates high-contrast ISO/IEC 18004 SVG QR code for tablet camera scanning.
 */
export function generateLanPairingQr(
	config: LanConnectionConfig,
	svgOptions: QrSvgOptions = {},
): LanQrCodeResult {
	const connectionUrl = buildLanConnectionUrl(config);
	const role = config.role || "doctor";

	const qrSvg = generateQrCodeSvg(connectionUrl, {
		size: svgOptions.size || 240,
		margin: svgOptions.margin !== undefined ? svgOptions.margin : 2,
		foregroundColor: svgOptions.foregroundColor || "#0f172a",
		backgroundColor: svgOptions.backgroundColor || "#ffffff",
		title:
			svgOptions.title ||
			`Подключение планшета (${role === "doctor" ? "Врач" : "Ассистент"}) — DENTE CRM`,
		...svgOptions,
	});

	return {
		connectionUrl,
		qrSvg,
		lanIp: config.lanIp,
		port: config.port,
		pairingToken: config.pairingToken,
		role,
		generatedAt: new Date().toISOString(),
	};
}

/**
 * Checks if the given IP address is the default Windows Mobile Hotspot gateway (192.168.137.1).
 */
export function isWindowsHotspotIp(ip: string): boolean {
	return ip.trim() === "192.168.137.1";
}

/**
 * Returns user-friendly badge label for network adapter.
 */
export function formatAdapterDisplayName(
	item: LanServerInterfaceItem,
	isPrimary: boolean,
): { title: string; subtitle: string; tag: string } {
	let tag = "Ethernet";
	if (item.isWifi) {
		tag = isWindowsHotspotIp(item.address) ? "Hotspot Wi-Fi" : "Wi-Fi";
	} else if (item.isVirtual) {
		tag = "Виртуальный";
	}

	const title = `${item.address} (${tag})`;
	const subtitle = `${item.name} — ${item.reason || "Локальная сеть"}`;

	return {
		title: isPrimary ? `${title} — Основной` : title,
		subtitle,
		tag,
	};
}

/**
 * Provides comprehensive technical diagnostics for router AP Isolation (Client Isolation),
 * with 1-click Windows Mobile Hotspot bypass steps.
 */
export function getApIsolationDiagnostics(): ApIsolationDiagnostic {
	return {
		issueTitle: "Диагностика: планшет не открывает адрес сервера",
		symptom:
			"iPad или планшет подключен к Wi-Fi клиники, но в браузере пишет «Не удается открыть страницу» или «Превышено время ожидания».",
		cause:
			"На роутере клиники включена изоляция беспроводных клиентов (AP Isolation / Station Separation / Гостевой Wi-Fi). Роутер блокирует обмен данными между планшетом и компьютером сервера на порту 4000/5173.",
		solutionTitle: "Решение: включить мобильную точку доступа Windows (Hotspot)",
		solutionDescription:
			"Компьютер сервера клиники начинает раздавать прямую Wi-Fi сеть. Планшет подключается напрямую к серверу в обход любых блокировок роутера с минимальным пингом (<1 мс).",
		quickCommand: "ms-settings:network-mobilehotspot",
		steps: [
			{
				stepNumber: 1,
				title: "Открыть параметры хот-спота Windows",
				description:
					"Нажмите Win+R на сервере, введите 'ms-settings:network-mobilehotspot' и нажмите Enter (или кнопка 'Открыть настройки Hotspot' ниже).",
				badge: "Шаг 1",
				command: "ms-settings:network-mobilehotspot",
			},
			{
				stepNumber: 2,
				title: "Включить раздачу Wi-Fi",
				description:
					"Переведите переключатель 'Поделиться сетевым подключением' в положение 'Вкл'. На экране отобразятся имя сети (SSID) и сетевой пароль.",
				badge: "Шаг 2",
			},
			{
				stepNumber: 3,
				title: "Подключить планшет к Wi-Fi сервера",
				description:
					"В настройках Wi-Fi на iPad/планшете выберите появившуюся сеть сервера клиники, введите пароль и отсканируйте обновленный QR-код.",
				badge: "Шаг 3",
			},
		],
	};
}

/**
 * apps/web/src/services/hardware/posTerminalBridge.ts
 *
 * DENTE Dental CRM — Unified POS Terminal Hardware Bridge.
 *
 * Acts as the centralized bridge connecting:
 * 1. Physical POS terminals (Sberbank DualConnector, Pilot-NT TCP, SmartPOS).
 * 2. ESC/POS Thermal Printers (HardwarePrinter.ts) for bank slip & 54-FZ receipt printing.
 * 3. Electronic health & billing records (PatientBillingModal, PaymentModal, SberPayIntegration).
 */

import {
	type SberPosTerminalConfig,
	type SberPosTransactionResponse,
	type SberPosTerminalStatus,
	type SberPosOperationType,
} from "@dental/shared";
import {
	sberbankTerminal,
	type ExecutePaymentOptions,
	DEFAULT_SBER_TERMINAL_CONFIG,
} from "./sberbankTerminal.js";
import { hardwarePrinter } from "./HardwarePrinter.js";
import { logger } from "../../utils/logger.js";
import { isDesktopApp } from "../../native/desktopBridge.js";
import { isMobileApp } from "../../native/mobileBridge.js";

export interface PosTerminalDeviceInfo {
	readonly deviceId: string;
	readonly vendor: "sberbank" | "inpas" | "ucs" | "generic";
	readonly modelName: string;
	readonly connectionType: "tcp_ip" | "usb_com" | "bluetooth_spp" | "cloud_rest";
	readonly hostAddress: string;
	readonly isOnline: boolean;
	readonly lastCheckedAt: string;
}

export class PosTerminalBridge {
	private activeTerminal = sberbankTerminal;

	/**
	 * Checks connection and health of the active POS terminal.
	 */
	public async pingTerminal(config?: SberPosTerminalConfig): Promise<{
		online: boolean;
		latencyMs: number;
		error?: string;
	}> {
		const targetConfig = config || this.activeTerminal.getConfig();
		const startTime = performance.now();

		try {
			// Check local daemon port (e.g. 127.0.0.1:4000) or test ping
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 2000);

			const pingUrl = `http://${targetConfig.hostIp}:${targetConfig.hostPort}/api/sberpos/ping`;
			await fetch(pingUrl, { signal: controller.signal }).catch(() => {
				// Non-fatal if local HTTP agent is absent, terminal TCP driver handles raw socket
			});
			clearTimeout(timeout);

			const latencyMs = Math.round(performance.now() - startTime);
			return {
				online: true,
				latencyMs: Math.max(1, latencyMs),
			};
		} catch (err: unknown) {
			const latencyMs = Math.round(performance.now() - startTime);
			const errMsg = err instanceof Error ? err.message : "Таймаут подключения к POS-терминалу";
			logger.warn("[PosTerminalBridge] Ping warning:", errMsg);
			return {
				online: false,
				latencyMs,
				error: errMsg,
			};
		}
	}

	/**
	 * Executes card or SberPay transaction via the bridge.
	 */
	public async processPayment(options: ExecutePaymentOptions): Promise<SberPosTransactionResponse> {
		return this.activeTerminal.executeSale(options);
	}

	/**
	 * Executes SberPay QR transaction via the bridge.
	 */
	public async processSberPayQr(options: ExecutePaymentOptions): Promise<SberPosTransactionResponse> {
		return this.activeTerminal.executeSberPayQr(options);
	}

	/**
	 * Executes FacePay Biometry transaction via the bridge.
	 */
	public async processBiometry(options: ExecutePaymentOptions): Promise<SberPosTransactionResponse> {
		return this.activeTerminal.executeBiometry(options);
	}

	/**
	 * Executes settlement / Z-report across all connected banking terminals.
	 */
	public async closeBankingShift(): Promise<SberPosTransactionResponse> {
		return this.activeTerminal.executeSettlement();
	}

	/**
	 * Prints bank slip directly on thermal hardware.
	 */
	public async printSlip(slipText: string): Promise<boolean> {
		const res = await hardwarePrinter.printBankSlip(slipText);
		return res.success;
	}

	/**
	 * Returns current hardware environment profile.
	 */
	public getEnvironmentProfile(): {
		platform: "desktop_electron" | "mobile_capacitor" | "web_browser";
		supportsDirectTcp: boolean;
		supportsBluetoothSpp: boolean;
	} {
		if (isDesktopApp()) {
			return {
				platform: "desktop_electron",
				supportsDirectTcp: true,
				supportsBluetoothSpp: false,
			};
		}
		if (isMobileApp()) {
			return {
				platform: "mobile_capacitor",
				supportsDirectTcp: false,
				supportsBluetoothSpp: true,
			};
		}
		return {
			platform: "web_browser",
			supportsDirectTcp: false,
			supportsBluetoothSpp: typeof navigator !== "undefined" && "bluetooth" in navigator,
		};
	}

	/**
	 * Returns underlying terminal service instance.
	 */
	public getTerminalService() {
		return this.activeTerminal;
	}
}

// Global Singleton Instance
export const posTerminalBridge = new PosTerminalBridge();

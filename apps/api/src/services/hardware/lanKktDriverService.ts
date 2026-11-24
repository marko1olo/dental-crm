/**
 * lanKktDriverService.ts — Facade preserving LanKktDriverService API.
 * Delegates framing, device status, printing, and shift operations to ./kktModules/.
 */

import { type Ffd12ReceiptPayload } from "../kkt/FiscalReceiptFactory.js";
import type {
	KktDeviceStatus,
	KktLanConfig,
	KktPrintResult,
	KktShiftParams,
	KktShiftResult,
} from "./types.js";
import {
	checkKktDeviceStatus,
	closeKktShift,
	DEFAULT_ATOL_PORT,
	DEFAULT_SHTRIKH_PORT,
	DEFAULT_TIMEOUT_MS,
	formatAtolJsonTask,
	formatAtolShiftTask,
	formatShtrikhMCommandPacket,
	formatShtrikhShiftPacket,
	getDefaultKktConfig,
	mapAtolErrorCode,
	mapShtrikhErrorCode,
	openKktShift,
	pingKktSocket,
	printKktFiscalReceipt,
	printKktXReport,
	sendShtrikhCommand,
} from "./kktModules/index.js";

export class LanKktDriverService {
	public static readonly DEFAULT_ATOL_PORT = DEFAULT_ATOL_PORT;
	public static readonly DEFAULT_SHTRIKH_PORT = DEFAULT_SHTRIKH_PORT;
	public static readonly DEFAULT_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;

	public static getDefaultConfig(): KktLanConfig {
		return getDefaultKktConfig();
	}

	public static async pingSocket(
		host: string,
		port: number,
		timeoutMs = 2000,
	): Promise<{ reachable: boolean; latencyMs: number; error?: string }> {
		return pingKktSocket(host, port, timeoutMs);
	}

	public static async checkDeviceStatus(config?: Partial<KktLanConfig>): Promise<KktDeviceStatus> {
		return checkKktDeviceStatus(config);
	}

	public static formatAtolJsonTask(receipt: Ffd12ReceiptPayload): Record<string, unknown> {
		return formatAtolJsonTask(receipt);
	}

	public static formatAtolShiftTask(
		type: "openShift" | "closeShift" | "reportX",
		operator?: { name?: string | undefined; vatin?: string | undefined },
	): Record<string, unknown> {
		return formatAtolShiftTask(type, operator);
	}

	public static mapAtolErrorCode(code: number): string {
		return mapAtolErrorCode(code);
	}

	public static mapShtrikhErrorCode(code: number): string {
		return mapShtrikhErrorCode(code);
	}

	public static formatShtrikhMCommandPacket(
		commandCode: number,
		dataBuffer: Buffer = Buffer.alloc(0),
		password = 30,
	): Buffer {
		return formatShtrikhMCommandPacket(commandCode, dataBuffer, password);
	}

	public static formatShtrikhShiftPacket(
		type: "openShift" | "closeShift" | "reportX",
		password = 30,
	): Buffer {
		return formatShtrikhShiftPacket(type, password);
	}

	public static async sendShtrikhCommand(
		host: string,
		port: number,
		packet: Buffer,
		timeoutMs = 3000,
	): Promise<{ success: boolean; data?: Buffer; errorCode?: number; errorMessage?: string }> {
		return sendShtrikhCommand(host, port, packet, timeoutMs);
	}

	public static async printFiscalReceipt(
		receipt: Ffd12ReceiptPayload,
		config?: Partial<KktLanConfig>,
	): Promise<KktPrintResult> {
		return printKktFiscalReceipt(receipt, config);
	}

	public static async openShift(
		params?: KktShiftParams,
		config?: Partial<KktLanConfig>,
	): Promise<KktShiftResult> {
		return openKktShift(params, config);
	}

	public static async closeShift(
		params?: KktShiftParams,
		config?: Partial<KktLanConfig>,
	): Promise<KktShiftResult> {
		return closeKktShift(params, config);
	}

	public static async printZReport(
		params?: KktShiftParams,
		config?: Partial<KktLanConfig>,
	): Promise<KktShiftResult> {
		return closeKktShift(params, config);
	}

	public static async printXReport(
		params?: KktShiftParams,
		config?: Partial<KktLanConfig>,
	): Promise<KktShiftResult> {
		return printKktXReport(params, config);
	}
}

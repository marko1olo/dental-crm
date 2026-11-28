/**
 * kktModules/kktProtocolFraming.ts — Shared LAN Socket, ATOL JSON Sync & Shtrikh-M Binary Framing.
 */

import * as net from "node:net";
import { kopecksToRubles } from "@dental/shared";
import { type Ffd12ReceiptPayload } from "../../kkt/FiscalReceiptFactory.js";
import type { KktLanConfig, KktModelType } from "../types.js";

export const DEFAULT_ATOL_PORT = 16732;
export const DEFAULT_SHTRIKH_PORT = 4001;
export const DEFAULT_TIMEOUT_MS = 3000;

export function getDefaultKktConfig(
	overrides?: Partial<KktLanConfig> | undefined,
): KktLanConfig {
	const host = overrides?.host || process.env.KKT_LAN_HOST || "192.168.1.150";
	const portStr = process.env.KKT_LAN_PORT;
	const modelStr = (
		overrides?.model ||
		process.env.KKT_MODEL ||
		"atol_web_server"
	).toLowerCase();
	const timeoutMsStr = process.env.KKT_TIMEOUT_MS;

	const model: KktModelType =
		modelStr === "shtrikh_m_tcp"
			? "shtrikh_m_tcp"
			: modelStr === "atol_json_tcp"
				? "atol_json_tcp"
				: modelStr === "emulator"
					? "emulator"
					: "atol_web_server";

	const port =
		overrides?.port ??
		(portStr
			? Number.parseInt(portStr, 10) ||
				(model === "shtrikh_m_tcp" ? DEFAULT_SHTRIKH_PORT : DEFAULT_ATOL_PORT)
			: model === "shtrikh_m_tcp"
				? DEFAULT_SHTRIKH_PORT
				: DEFAULT_ATOL_PORT);

	const timeoutMs =
		overrides?.timeoutMs ??
		(timeoutMsStr
			? Number.parseInt(timeoutMsStr, 10) || DEFAULT_TIMEOUT_MS
			: DEFAULT_TIMEOUT_MS);

	return { host, port, model, timeoutMs };
}

export function getKktModelDisplayName(model: KktModelType): string {
	return model === "shtrikh_m_tcp" ? "ШТРИХ-М-01Ф (LAN)" : "АТОЛ 27Ф (LAN)";
}

export async function pingKktSocket(
	host: string,
	port: number,
	timeoutMs = 2000,
): Promise<{ reachable: boolean; latencyMs: number; error?: string }> {
	const start = Date.now();
	return new Promise((resolve) => {
		const socket = new net.Socket();
		let hasResolved = false;

		const onDone = (reachable: boolean, err?: Error) => {
			if (hasResolved) return;
			hasResolved = true;
			const latencyMs = Date.now() - start;
			socket.destroy();
			resolve({
				reachable,
				latencyMs,
				...(err ? { error: err.message } : {}),
			});
		};

		socket.setTimeout(timeoutMs);
		socket.once("connect", () => onDone(true));
		socket.once("timeout", () =>
			onDone(false, new Error(`Connection to ${host}:${port} timed out after ${timeoutMs}ms`)),
		);
		socket.once("error", (err) => onDone(false, err));

		try {
			socket.connect(port, host);
		} catch (err: unknown) {
			onDone(false, err instanceof Error ? err : new Error(String(err)));
		}
	});
}

export function mapAtolErrorCode(code: number): string {
	switch (code) {
		case 0:
			return "Ошибок нет (OK)";
		case 1:
			return "Нет связи с фискальным регистратором (порт недоступен)";
		case 2:
			return "Закончилась чековая лента (Out of Paper)";
		case 3:
			return "Открыта крышка фискального регистратора";
		case 4:
			return "Смена превысила 24 часа (требуется снятие Z-отчета)";
		case 5:
			return "Ошибка фискального накопителя (ФН)";
		case 6:
			return "Неверный пароль кассира/администратора";
		case 7:
			return "Недопустимый режим налогообложения";
		default:
			return `Ошибка АТОЛ (код 0x${code.toString(16)})`;
	}
}

export function mapShtrikhErrorCode(code: number): string {
	switch (code) {
		case 0x00:
			return "Ошибок нет (OK)";
		case 0x01:
			return "Выдача данных: нет данных";
		case 0x02:
			return "Команда не поддерживается в данном режиме";
		case 0x03:
			return "Ошибка контрольной ленты или датчика бумаги";
		case 0x04:
			return "Отсутствует бумага (Out of Paper)";
		case 0x05:
			return "Снята крышка принтера";
		case 0x08:
			return "Исчерпан ресурс фискального накопителя";
		case 0x4a:
			return "Ошибка контрольной суммы XOR пакета";
		default:
			return `Ошибка ШТРИХ-М (код 0x${code.toString(16)})`;
	}
}

export function formatAtolJsonTask(receipt: Ffd12ReceiptPayload): Record<string, unknown> {
	return {
		type: receipt.tag1054_operationType === 2 ? "sellReturn" : "sell",
		taxationType: receipt.tag1055_taxationSystem === 1 ? "osn" : "usnIncome",
		operator: {
			name: receipt.tag1021_cashierName,
			vatin: receipt.tag1203_cashierInn || undefined,
		},
		clientInfo: {
			emailOrPhone: receipt.tag1008_customerContact,
		},
		payments: [
			...(receipt.payments.cashKopecks > 0
				? [{ type: "cash", sum: kopecksToRubles(receipt.payments.cashKopecks) }]
				: []),
			...(receipt.payments.electronicCardKopecks > 0 || receipt.payments.sbpKopecks > 0
				? [
						{
							type: "electronically",
							sum: kopecksToRubles(
								receipt.payments.electronicCardKopecks + receipt.payments.sbpKopecks,
							),
						},
					]
				: []),
			...(receipt.payments.prepaidKopecks > 0
				? [{ type: "prepaid", sum: kopecksToRubles(receipt.payments.prepaidKopecks) }]
				: []),
		],
		items: receipt.items.map((item) => ({
			type: "position",
			name: item.tag1030_subjectName,
			price: kopecksToRubles(item.priceKopecks),
			quantity: item.quantity,
			amount: kopecksToRubles(item.amountKopecks),
			paymentMethod:
				item.tag1214_paymentMethod === 1
					? "fullPrepayment"
					: item.tag1214_paymentMethod === 3
						? "advance"
						: "fullPayment",
			paymentObject:
				item.tag1212_paymentSubject === 32
					? "marked"
					: item.tag1212_paymentSubject === 1
						? "commodity"
						: "service",
			vat: {
				type:
					item.tag1199_vatRate === 6
						? "none"
						: item.tag1199_vatRate === 1
							? "vat20"
							: "none",
			},
			measurementUnit: item.tag2108_quantityMeasure === 0 ? "piece" : "piece",
			...(item.tag2000_markingPayload
				? {
						imcParams: {
							imcType: "auto",
							imc: item.tag2000_markingPayload.tag1163_markingCode,
							itemEstimatedStatus: "itemPiece",
						},
					}
				: {}),
		})),
		total: kopecksToRubles(receipt.totalKopecks),
	};
}

export function formatAtolShiftTask(
	type: "openShift" | "closeShift" | "reportX",
	operator?: { name?: string | undefined; vatin?: string | undefined },
): Record<string, unknown> {
	return {
		type,
		operator: {
			name: operator?.name || "Кассир",
			...(operator?.vatin ? { vatin: operator.vatin } : {}),
		},
	};
}

export type AtolSyncOutcome =
	| { ok: true; firstResult: Record<string, unknown>; rawData: Record<string, unknown> }
	| { ok: false; errorCode: string; errorMessage: string };

export async function dispatchAtolSyncTask(
	cfg: KktLanConfig,
	task: Record<string, unknown>,
	contextLabel: string,
	defaultTimeoutMs = 5000,
): Promise<AtolSyncOutcome> {
	const controller = new AbortController();
	const timeoutTimer = setTimeout(() => controller.abort(), cfg.timeoutMs || defaultTimeoutMs);

	try {
		const resp = await fetch(`http://${cfg.host}:${cfg.port}/operations/sync`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(task),
			signal: controller.signal,
		});

		if (!resp.ok) {
			return {
				ok: false,
				errorCode: `ATOL_HTTP_${resp.status}`,
				errorMessage: `Ошибка связи с Web-сервером АТОЛ ${contextLabel}: HTTP ${resp.status}`,
			};
		}

		const parsedRaw: unknown = await resp.json();
		const isRecord = (value: unknown): value is Record<string, unknown> =>
			Boolean(value) && typeof value === "object" && !Array.isArray(value);
		const rawData: Record<string, unknown> = isRecord(parsedRaw) ? parsedRaw : {};
		const rawResults = Array.isArray(rawData.results)
			? rawData.results.filter(
					(entry): entry is Record<string, unknown> =>
						Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
				)
			: [rawData];
		const firstResult = rawResults[0] ?? {};
		const errorCode = typeof firstResult.errorCode === "number" ? firstResult.errorCode : 0;

		if (errorCode !== 0) {
			return {
				ok: false,
				errorCode: `ATOL_ERR_${errorCode}`,
				errorMessage: mapAtolErrorCode(errorCode),
			};
		}

		return { ok: true, firstResult, rawData };
	} finally {
		clearTimeout(timeoutTimer);
	}
}

export function formatShtrikhMCommandPacket(
	commandCode: number,
	dataBuffer: Buffer = Buffer.alloc(0),
	password = 30,
): Buffer {
	const passwordBuf = Buffer.alloc(4);
	passwordBuf.writeUInt32LE(password, 0);

	const length = 1 + 4 + dataBuffer.length;
	const header = Buffer.from([0x02, length, commandCode]);
	const payload = Buffer.concat([header, passwordBuf, dataBuffer]);

	let crc = 0;
	for (let i = 1; i < payload.length; i++) {
		crc ^= payload[i] ?? 0;
	}
	return Buffer.concat([payload, Buffer.from([crc])]);
}

export function formatShtrikhShiftPacket(
	type: "openShift" | "closeShift" | "reportX",
	password = 30,
): Buffer {
	const commandCode =
		type === "openShift" ? 0xe0 : type === "closeShift" ? 0x21 : 0x20;
	return formatShtrikhMCommandPacket(commandCode, Buffer.alloc(0), password);
}

export async function sendShtrikhCommand(
	host: string,
	port: number,
	packet: Buffer,
	timeoutMs = 3000,
): Promise<{ success: boolean; data?: Buffer; errorCode?: number; errorMessage?: string }> {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		let hasResolved = false;
		let response = Buffer.alloc(0);

		const onDone = (res: {
			success: boolean;
			data?: Buffer;
			errorCode?: number;
			errorMessage?: string;
		}) => {
			if (hasResolved) return;
			hasResolved = true;
			socket.destroy();
			resolve(res);
		};

		socket.setTimeout(timeoutMs);
		socket.once("connect", () => {
			socket.write(packet);
		});
		socket.on("data", (chunk) => {
			const chunkBuf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			response = Buffer.concat([response, chunkBuf]);
			if (response.length >= 4) {
				const length = response[1] ?? 0;
				if (response.length >= length + 2) {
					const errorCode = response[3] ?? 0;
					if (errorCode !== 0) {
						onDone({
							success: false,
							errorCode,
							errorMessage: mapShtrikhErrorCode(errorCode),
							data: response,
						});
					} else {
						onDone({ success: true, errorCode: 0, data: response });
					}
				}
			}
		});
		socket.once("timeout", () => {
			onDone({
				success: false,
				errorMessage: `Таймаут обмена командами с ШТРИХ-М (${host}:${port})`,
			});
		});
		socket.once("error", (err) => {
			onDone({
				success: false,
				errorMessage: `Ошибка сокета ШТРИХ-М: ${err.message}`,
			});
		});

		try {
			socket.connect(port, host);
		} catch (err: unknown) {
			onDone({
				success: false,
				errorMessage: err instanceof Error ? err.message : String(err),
			});
		}
	});
}

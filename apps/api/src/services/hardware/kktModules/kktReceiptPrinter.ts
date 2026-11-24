/**
 * kktModules/kktReceiptPrinter.ts — Direct LAN Fiscal Receipt Printing (ATOL / Shtrikh-M / Emulator).
 */

import { kopecksToRubles } from "@dental/shared";
import { Fiscal54FzService } from "../../billing/fiscal54fzService.js";
import { FiscalReceiptFactory, type Ffd12ReceiptPayload } from "../../kkt/FiscalReceiptFactory.js";
import type { KktLanConfig, KktPrintResult } from "../types.js";
import {
	dispatchAtolSyncTask,
	formatAtolJsonTask,
	formatShtrikhMCommandPacket,
	getDefaultKktConfig,
	sendShtrikhCommand,
} from "./kktProtocolFraming.js";
import { checkKktDeviceStatus } from "./kktStatusChecker.js";

function encodeUIntLE40(value: number): Buffer {
	const buf = Buffer.alloc(5);
	const bounded = Math.max(0, Math.round(value));
	buf.writeUIntLE(Math.min(bounded, 0xffffffffff), 0, 5);
	return buf;
}

async function printViaShtrikhMTcp(
	receipt: Ffd12ReceiptPayload,
	cfg: KktLanConfig,
	fallbackFn: string | undefined,
	now: Date,
): Promise<KktPrintResult> {
	// 1. Open receipt (0x8D): 0 = sell, 2 = sellReturn
	const docType = receipt.tag1054_operationType === 2 ? 2 : 0;
	const openPacket = formatShtrikhMCommandPacket(0x8d, Buffer.from([docType]), 30);
	const openRes = await sendShtrikhCommand(cfg.host, cfg.port, openPacket, cfg.timeoutMs);
	if (!openRes.success) {
		return {
			success: false,
			status: "hardware_offline",
			fnSerial: fallbackFn,
			receiptIssuedAt: now.toISOString(),
			errorCode: openRes.errorCode ? `SHTRIKH_ERR_${openRes.errorCode}` : "SHTRIKH_OPEN_CHECK_ERR",
			errorMessage: openRes.errorMessage || "Ошибка открытия чека на ШТРИХ-М",
		};
	}

	// 2. Register line positions (0x80 sell / 0x82 sellReturn)
	const lineCmd = docType === 2 ? 0x82 : 0x80;
	for (const item of receipt.items) {
		const qtyBuf = encodeUIntLE40(Math.round(item.quantity * 1000));
		const priceBuf = encodeUIntLE40(item.priceKopecks);
		const nameBuf = Buffer.from(item.tag1030_subjectName.slice(0, 40), "utf8");
		const paddedName = Buffer.alloc(40, 0x20);
		nameBuf.copy(paddedName, 0, 0, Math.min(40, nameBuf.length));
		const itemPayload = Buffer.concat([
			qtyBuf,
			priceBuf,
			Buffer.from([1, 0, 0, 0, 0]),
			paddedName,
		]);
		const itemPacket = formatShtrikhMCommandPacket(lineCmd, itemPayload, 30);
		const itemRes = await sendShtrikhCommand(cfg.host, cfg.port, itemPacket, cfg.timeoutMs);
		if (!itemRes.success) {
			return {
				success: false,
				status: "hardware_offline",
				fnSerial: fallbackFn,
				receiptIssuedAt: now.toISOString(),
				errorCode: itemRes.errorCode ? `SHTRIKH_ERR_${itemRes.errorCode}` : "SHTRIKH_POSITION_ERR",
				errorMessage: itemRes.errorMessage || "Ошибка регистрации позиции на ШТРИХ-М",
			};
		}
	}

	// 3. Close receipt (0x85) with cash + electronic + advance totals
	const closePayload = Buffer.concat([
		encodeUIntLE40(receipt.payments.cashKopecks),
		encodeUIntLE40(receipt.payments.electronicCardKopecks + receipt.payments.sbpKopecks),
		encodeUIntLE40(receipt.payments.prepaidKopecks),
		encodeUIntLE40(0),
	]);
	const closePacket = formatShtrikhMCommandPacket(0x85, closePayload, 30);
	const closeRes = await sendShtrikhCommand(cfg.host, cfg.port, closePacket, cfg.timeoutMs);

	if (!closeRes.success) {
		return {
			success: false,
			status: "hardware_offline",
			fnSerial: fallbackFn,
			receiptIssuedAt: now.toISOString(),
			errorCode: closeRes.errorCode ? `SHTRIKH_ERR_${closeRes.errorCode}` : "SHTRIKH_CLOSE_CHECK_ERR",
			errorMessage: closeRes.errorMessage || "Ошибка закрытия чека на ШТРИХ-М",
		};
	}

	// Extract FD/FPD from Shtrikh response frame if returned by firmware; never fabricate FD/FPD
	const dataBuf = closeRes.data;
	const fiscalDocNumber =
		dataBuf && dataBuf.length >= 10
			? String(dataBuf.readUInt32LE(5))
			: undefined;
	const fiscalSign =
		dataBuf && dataBuf.length >= 14
			? String(dataBuf.readUInt32LE(9))
			: undefined;
	const fnSerial = fallbackFn;

	if (!fiscalDocNumber || !fiscalSign || !fnSerial) {
		return {
			success: false,
			status: "hardware_offline",
			fnSerial,
			receiptIssuedAt: now.toISOString(),
			errorCode: "SHTRIKH_NO_FISCAL_PARAMS",
			errorMessage:
				"ШТРИХ-М не вернул фискальные параметры (ФД / ФПД) из ФН. Чек сохранён в очереди.",
		};
	}

	const opType = receipt.tag1054_operationType === 2 ? "income_return" : "income";
	return {
		success: true,
		status: "printed",
		fnSerial,
		fiscalDocumentNumber: fiscalDocNumber,
		fiscalSign,
		ofdVerificationUrl: FiscalReceiptFactory.buildOfdUrl({
			fn: fnSerial,
			fd: fiscalDocNumber,
			fpd: fiscalSign,
			amountKopecks: receipt.totalKopecks,
			operationType: opType,
		}),
		qrString: Fiscal54FzService.generate54FzQrString({
			issuedAt: now,
			totalRub: kopecksToRubles(receipt.totalKopecks),
			fnSerial,
			fiscalDocNumber,
			fiscalSign,
			operationType: receipt.tag1054_operationType,
		}),
		receiptIssuedAt: now.toISOString(),
	};
}

export async function printKktFiscalReceipt(
	receipt: Ffd12ReceiptPayload,
	config?: Partial<KktLanConfig>,
): Promise<KktPrintResult> {
	const cfg = { ...getDefaultKktConfig(), ...config };
	const now = new Date();

	// 100% warranty / 0 kopeck bypass (Mandate 8e)
	if (receipt.totalKopecks <= 0) {
		return {
			success: true,
			status: "printed",
			fnSerial: "0000000000000000",
			fiscalDocumentNumber: "0",
			fiscalSign: "0000000000",
			ofdVerificationUrl: "",
			receiptIssuedAt: now.toISOString(),
		};
	}

	const status = await checkKktDeviceStatus(cfg);
	const fallbackFn = status.fnSerial || process.env.KKT_FN_SERIAL || undefined;

	if (!status.online || !status.paperOk) {
		return {
			success: false,
			status: "hardware_offline",
			fnSerial: fallbackFn,
			receiptIssuedAt: now.toISOString(),
			errorCode: !status.online ? "KKT_OFFLINE" : "OUT_OF_PAPER",
			errorMessage:
				status.error ||
				(!status.online ? "ККТ недоступна в локальной сети" : "Закончилась кассовая лента"),
		};
	}

	try {
		if (cfg.model === "atol_web_server" || cfg.model === "atol_json_tcp") {
			const syncOutcome = await dispatchAtolSyncTask(
				cfg,
				formatAtolJsonTask(receipt),
				"при печати чека",
			);
			if (!syncOutcome.ok) {
				return {
					success: false,
					status: "hardware_offline",
					fnSerial: fallbackFn,
					receiptIssuedAt: now.toISOString(),
					errorCode: syncOutcome.errorCode,
					errorMessage: syncOutcome.errorMessage,
				};
			}

			const fiscalParams =
				(syncOutcome.firstResult.fiscalParams as Record<string, unknown> | undefined) || {};
			const fiscalDocNumber =
				fiscalParams.fiscalDocumentNumber !== undefined
					? String(fiscalParams.fiscalDocumentNumber)
					: undefined;
			const fiscalSign =
				fiscalParams.fiscalDocumentSign !== undefined
					? String(fiscalParams.fiscalDocumentSign)
					: undefined;
			const fnSerial = (fiscalParams.fnNumber as string | undefined) || fallbackFn;

			if (!fiscalDocNumber || !fiscalSign || !fnSerial) {
				return {
					success: false,
					status: "hardware_offline",
					fnSerial,
					receiptIssuedAt: now.toISOString(),
					errorCode: "KKT_NO_FISCAL_PARAMS",
					errorMessage:
						"ККТ не вернула фискальный номер или фискальный признак (ФД / ФПД) из ФН.",
				};
			}

			const ofdUrl = FiscalReceiptFactory.buildOfdUrl({
				fn: fnSerial,
				fd: fiscalDocNumber,
				fpd: fiscalSign,
				amountKopecks: receipt.totalKopecks,
				operationType: receipt.tag1054_operationType === 2 ? "income_return" : "income",
			});
			const qrString = Fiscal54FzService.generate54FzQrString({
				issuedAt: now,
				totalRub: kopecksToRubles(receipt.totalKopecks),
				fnSerial,
				fiscalDocNumber,
				fiscalSign,
				operationType: receipt.tag1054_operationType,
			});

			return {
				success: true,
				status: "printed",
				fnSerial,
				fiscalDocumentNumber: fiscalDocNumber,
				fiscalSign,
				ofdVerificationUrl: ofdUrl,
				qrString,
				receiptIssuedAt: now.toISOString(),
			};
		}

		if (cfg.model === "shtrikh_m_tcp") {
			return await printViaShtrikhMTcp(receipt, cfg, fallbackFn, now);
		}

		if (cfg.model === "emulator") {
			const fnSerial = fallbackFn || "9960440302145896";
			const fiscalDocNumber = "1001";
			const fiscalSign = "1234567890";
			return {
				success: true,
				status: "printed",
				fnSerial,
				fiscalDocumentNumber: fiscalDocNumber,
				fiscalSign,
				ofdVerificationUrl: FiscalReceiptFactory.buildOfdUrl({
					fn: fnSerial,
					fd: fiscalDocNumber,
					fpd: fiscalSign,
					amountKopecks: receipt.totalKopecks,
					operationType: receipt.tag1054_operationType === 2 ? "income_return" : "income",
				}),
				qrString: Fiscal54FzService.generate54FzQrString({
					issuedAt: now,
					totalRub: kopecksToRubles(receipt.totalKopecks),
					fnSerial,
					fiscalDocNumber,
					fiscalSign,
					operationType: receipt.tag1054_operationType,
				}),
				receiptIssuedAt: now.toISOString(),
			};
		}

		return {
			success: false,
			status: "hardware_offline",
			fnSerial: fallbackFn,
			receiptIssuedAt: now.toISOString(),
			errorCode: "UNSUPPORTED_KKT_MODEL",
			errorMessage: `Модель ККТ '${cfg.model}' не поддерживает синхронную печать без драйвера.`,
		};
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return {
			success: false,
			status: "hardware_offline",
			fnSerial: fallbackFn,
			receiptIssuedAt: now.toISOString(),
			errorCode: "KKT_COMMUNICATION_ERROR",
			errorMessage: `Сбой взаимодействия с ККТ: ${errMsg}`,
		};
	}
}

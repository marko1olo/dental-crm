/**
 * kktModules/kktShiftOperations.ts — Hardware Shift Opening, Z-Report Closure & Mid-Shift X-Report.
 */

import { Fiscal54FzService } from "../../billing/fiscal54fzService.js";
import type { KktLanConfig, KktShiftParams, KktShiftResult } from "../types.js";
import {
	dispatchAtolSyncTask,
	formatAtolShiftTask,
	formatShtrikhShiftPacket,
	getDefaultKktConfig,
	sendShtrikhCommand,
} from "./kktProtocolFraming.js";
import { checkKktDeviceStatus } from "./kktStatusChecker.js";

async function executeShiftAction(
	action: "openShift" | "closeShift" | "reportX",
	params?: KktShiftParams,
	config?: Partial<KktLanConfig>,
): Promise<KktShiftResult> {
	const cfg = { ...getDefaultKktConfig(), ...config };
	const now = new Date();
	const actionLabels = {
		openShift: {
			offline: "ККТ недоступна в локальной сети при открытии смены",
			noPaper: "Закончилась кассовая лента при открытии смены",
			ctx: "при открытии смены",
			errCode: "KKT_OPEN_SHIFT_ERROR",
			shtrikhErr: "SHTRIKH_OPEN_SHIFT_ERROR",
			successStatus: "opened" as const,
		},
		closeShift: {
			offline: "ККТ недоступна в локальной сети при закрытии смены (Z-отчет)",
			noPaper: "Закончилась кассовая лента при снятии Z-отчета",
			ctx: "при закрытии смены",
			errCode: "KKT_CLOSE_SHIFT_ERROR",
			shtrikhErr: "SHTRIKH_Z_REPORT_ERROR",
			successStatus: "closed" as const,
		},
		reportX: {
			offline: "ККТ недоступна в локальной сети при снятии X-отчета",
			noPaper: "Закончилась кассовая лента при снятии X-отчета",
			ctx: "при печати X-отчета",
			errCode: "KKT_X_REPORT_ERROR",
			shtrikhErr: "SHTRIKH_X_REPORT_ERROR",
			successStatus: "printed" as const,
		},
	};
	const labels = actionLabels[action];

	const status = await checkKktDeviceStatus(cfg);
	const fallbackFn = status.fnSerial || process.env.KKT_FN_SERIAL || undefined;

	if (!status.online || !status.paperOk) {
		return {
			success: false,
			status: "hardware_offline",
			fnSerial: fallbackFn,
			issuedAt: now.toISOString(),
			errorCode: !status.online ? "KKT_OFFLINE" : "OUT_OF_PAPER",
			errorMessage: status.error || (!status.online ? labels.offline : labels.noPaper),
		};
	}

	try {
		if (cfg.model === "atol_web_server" || cfg.model === "atol_json_tcp") {
			const atolTask = formatAtolShiftTask(action, {
				name: params?.cashierName,
				vatin: params?.cashierInn,
			});
			const syncRes = await dispatchAtolSyncTask(cfg, atolTask, labels.ctx);
			if (!syncRes.ok) {
				return {
					success: false,
					status: "hardware_offline",
					fnSerial: fallbackFn,
					issuedAt: now.toISOString(),
					errorCode: syncRes.errorCode,
					errorMessage: syncRes.errorMessage,
				};
			}

			const fiscalParams =
				(syncRes.firstResult.fiscalParams as Record<string, unknown> | undefined) || {};
			const shiftNumber =
				fiscalParams.shiftNumber !== undefined
					? Number(fiscalParams.shiftNumber)
					: params?.shiftNumber ?? 1;
			const fiscalDocNumber =
				fiscalParams.fiscalDocumentNumber !== undefined
					? String(fiscalParams.fiscalDocumentNumber)
					: undefined;
			const fiscalSign =
				fiscalParams.fiscalDocumentSign !== undefined
					? String(fiscalParams.fiscalDocumentSign)
					: undefined;
			const fnSerial = (fiscalParams.fnNumber as string | undefined) || fallbackFn;

			let qrString: string | undefined;
			if (action === "closeShift" && fnSerial && fiscalDocNumber && fiscalSign) {
				qrString = Fiscal54FzService.generate54FzQrString({
					issuedAt: now,
					totalRub: 0,
					fnSerial,
					fiscalDocNumber,
					fiscalSign,
					operationType: 1,
				});
			}

			return {
				success: true,
				status: labels.successStatus,
				shiftNumber,
				fiscalDocumentNumber: fiscalDocNumber,
				fiscalSign,
				fnSerial,
				qrString,
				issuedAt: now.toISOString(),
			};
		}

		if (cfg.model === "shtrikh_m_tcp") {
			const packet = formatShtrikhShiftPacket(action, 30);
			const cmdRes = await sendShtrikhCommand(cfg.host, cfg.port, packet, cfg.timeoutMs);
			if (!cmdRes.success) {
				return {
					success: false,
					status: "hardware_offline",
					fnSerial: fallbackFn,
					issuedAt: now.toISOString(),
					errorCode: cmdRes.errorCode ? `SHTRIKH_ERR_${cmdRes.errorCode}` : labels.shtrikhErr,
					errorMessage:
						cmdRes.errorMessage ||
						`Ошибка выполнения операции ${action} на ШТРИХ-М (${cfg.host}:${cfg.port})`,
				};
			}

			return {
				success: true,
				status: labels.successStatus,
				shiftNumber: params?.shiftNumber ?? 1,
				fnSerial: fallbackFn,
				issuedAt: now.toISOString(),
			};
		}

		if (cfg.model === "emulator") {
			const fnSerial = fallbackFn || "9960440302145896";
			const shiftNumber = params?.shiftNumber ?? 1;
			if (action === "reportX") {
				return {
					success: true,
					status: "printed",
					shiftNumber,
					fnSerial,
					issuedAt: now.toISOString(),
				};
			}
			const isClose = action === "closeShift";
			const fiscalDocNumber = String((isClose ? 2000 : 1000) + shiftNumber);
			const fiscalSign = String(
				1000000000 + ((shiftNumber * (isClose ? 7654321 : 1234567)) % 900000000),
			);
			const qrString = isClose
				? Fiscal54FzService.generate54FzQrString({
						issuedAt: now,
						totalRub: 0,
						fnSerial,
						fiscalDocNumber,
						fiscalSign,
						operationType: 1,
					})
				: undefined;

			return {
				success: true,
				status: labels.successStatus,
				shiftNumber,
				fiscalDocumentNumber: fiscalDocNumber,
				fiscalSign,
				fnSerial,
				qrString,
				issuedAt: now.toISOString(),
			};
		}

		return {
			success: false,
			status: "hardware_offline",
			fnSerial: fallbackFn,
			issuedAt: now.toISOString(),
			errorCode: "UNSUPPORTED_KKT_MODEL",
			errorMessage: `Модель ККТ '${cfg.model}' не поддерживает операцию ${action}.`,
		};
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return {
			success: false,
			status: "hardware_offline",
			fnSerial: fallbackFn,
			issuedAt: now.toISOString(),
			errorCode: labels.errCode,
			errorMessage: `Сбой взаимодействия с ККТ ${labels.ctx}: ${errMsg}`,
		};
	}
}

export async function openKktShift(
	params?: KktShiftParams,
	config?: Partial<KktLanConfig>,
): Promise<KktShiftResult> {
	return executeShiftAction("openShift", params, config);
}

export async function closeKktShift(
	params?: KktShiftParams,
	config?: Partial<KktLanConfig>,
): Promise<KktShiftResult> {
	return executeShiftAction("closeShift", params, config);
}

export async function printKktXReport(
	params?: KktShiftParams,
	config?: Partial<KktLanConfig>,
): Promise<KktShiftResult> {
	return executeShiftAction("reportX", params, config);
}

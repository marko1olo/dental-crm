/**
 * @file mcpFiscalHandlers.ts
 * @description Обработчики вызовов фискальных регистраторов Атол и Штрих-М 54-ФЗ.
 */

import { canonicalTenderTypeSchema } from "@dental/shared";

export function handleAtolCall(toolName: string, args: Record<string, unknown>) {
	if (toolName === "get_kkt_status") {
		return {
			success: true,
			data: {
				model: "ATOL 25F / 30F USB",
				online: true,
				shiftOpen: true,
				shiftNumber: 42,
				paperPresent: true,
				fnFiscalized: true,
				fnDaysRemaining: 215,
				ofdBufferEmpty: true,
				deviceDateTime: new Date().toISOString(),
			},
		};
	}
	if (toolName === "open_shift") {
		return {
			success: true,
			data: {
				shiftNumber: 43,
				openedAt: new Date().toISOString(),
				cashier: (args.cashierName as string) || "Главный врач",
				message: "Смена успешно открыта на фискальном регистраторе Атол.",
			},
		};
	}
	if (toolName === "print_receipt") {
		const totalKopecks = Number(args.totalKopecks ?? 0);
		if (!Number.isFinite(totalKopecks) || totalKopecks < 0 || !Number.isInteger(totalKopecks)) {
			return {
				success: false,
				error: "Ошибка валидации 54-ФЗ: totalKopecks должен быть целым неотрицательным числом копеек (Mandate 8i).",
			};
		}
		const paymentType = String(args.paymentType || "cash");
		const tenderValidation = canonicalTenderTypeSchema.safeParse(paymentType);
		if (!tenderValidation.success) {
			return {
				success: false,
				error: `Ошибка валидации 54-ФЗ: недопустимый способ расчета '${paymentType}'. Разрешены: cash, card, sbp, deposit, family_wallet, credit и др.`,
			};
		}
		return {
			success: true,
			data: {
				fiscalDocumentNumber: 1045,
				fiscalSign: "3892019482",
				totalKopecks,
				paymentType,
				printedAt: new Date().toISOString(),
				message: "Чек успешно фискализирован и передан в ОФД.",
			},
		};
	}
	if (toolName === "close_z_report") {
		return {
			success: true,
			data: {
				shiftNumber: 43,
				closedAt: new Date().toISOString(),
				zReportNumber: 43,
				message: "Смена успешно закрыта с гашением (Z-отчет сформирован).",
			},
		};
	}
	return null;
}

export function handleShtrihCall(toolName: string, args: Record<string, unknown>) {
	if (toolName === "get_device_metrics") {
		return { success: true, data: { model: "ШТРИХ-ON-LINE", voltageVolts: 24.1, paperOk: true, firmware: "C.1 2026" } };
	}
	if (toolName === "fiscal_sale") {
		const totalRub = Number(args.totalRub ?? 0);
		if (!Number.isFinite(totalRub) || totalRub < 0) {
			return { success: false, error: "Ошибка валидации Штрих-М: totalRub должен быть неотрицательным числом." };
		}
		return { success: true, data: { fiscalReceiptNum: 204, totalRub, status: "printed" } };
	}
	return null;
}

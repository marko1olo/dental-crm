/**
 * @file mcpFiscalHandlers.ts
 * @description Обработчики вызовов фискальных регистраторов Атол и Штрих-М 54-ФЗ.
 */

import { canonicalTenderTypeSchema } from "@dental/shared";
import { LanKktDriverService } from "../../../services/hardware/lanKktDriverService.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";

export async function handleAtolCall(
	toolName: string,
	args: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string; status?: string } | null> {
	if (toolName === "get_kkt_status") {
		const status = await LanKktDriverService.checkDeviceStatus();
		if (!status.online) {
			return {
				success: false,
				status: "DEVICE_NOT_CONNECTED",
				error: status.error || "Фискальный регистратор АТОЛ недоступен в локальной сети (DEVICE_NOT_CONNECTED).",
			};
		}
		return {
			success: true,
			data: {
				model: status.modelName,
				online: status.online,
				shiftOpen: true,
				paperPresent: status.paperOk,
				fnFiscalized: status.fnFiscalized,
				fnSerial: status.fnSerial,
				kktSerialNumber: status.kktSerialNumber,
				latencyMs: status.latencyMs,
				deviceDateTime: new Date().toISOString(),
			},
		};
	}

	if (toolName === "open_shift") {
		const cashierName = (args.cashierName as string) || "Главный врач";
		const cashierInn = (args.cashierInn as string) || undefined;
		const shiftResult = await LanKktDriverService.openShift({
			cashierName,
			cashierInn,
		});
		if (!shiftResult.success) {
			return {
				success: false,
				status: "DEVICE_NOT_CONNECTED",
				error: shiftResult.errorMessage || "Сбой открытия смены на ККТ (DEVICE_NOT_CONNECTED).",
			};
		}
		return {
			success: true,
			data: {
				shiftNumber: shiftResult.shiftNumber,
				openedAt: shiftResult.issuedAt,
				cashier: cashierName,
				fiscalDocumentNumber: shiftResult.fiscalDocumentNumber,
				fiscalSign: shiftResult.fiscalSign,
				fnSerial: shiftResult.fnSerial,
				message: `Смена №${shiftResult.shiftNumber} успешно открыта на фискальном регистраторе Атол.`,
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

		const rawItems = Array.isArray(args.items) ? args.items : [];
		const fallbackPatientId =
			typeof args.patientId === "string" && args.patientId.trim()
				? args.patientId.trim()
				: "00000000-0000-7000-8000-000000000001";
		const payload = FiscalReceiptFactory.buildFfd12Receipt({
			operationType: "income",
			taxationSystem: "usn_income",
			patientId: fallbackPatientId,
			payerType: "physical_person",
			addendumConfirmed: true,
			cashierFullName: (args.cashierName as string) || "Кассир",
			cashierInn: (args.cashierInn as string) || undefined,
			customerContact: (args.customerContact as string) || "+79990000000",
			totalKopecks,
			cashKopecks: paymentType === "cash" ? totalKopecks : 0,
			electronicCardKopecks: paymentType === "card" ? totalKopecks : 0,
			sbpKopecks: paymentType === "sbp" ? totalKopecks : 0,
			prepaidKopecks:
				paymentType === "deposit" || paymentType === "prepaid" ? totalKopecks : 0,
			items:
				rawItems.length > 0
					? rawItems.map((item: any) => ({
							name: String(item.name || "Стоматологические услуги"),
							priceKopecks: Number.isInteger(item.priceKopecks)
								? item.priceKopecks
								: Math.round(Number(item.priceRub || 0) * 100),
							quantity: Number(item.quantity || 1),
							amountKopecks: Number.isInteger(item.amountKopecks)
								? item.amountKopecks
								: Math.round(
										Number(item.priceRub || 0) * 100 * Number(item.quantity || 1),
									),
							method: "full_payment",
							subject: "service",
							vatRate: "vat_none",
						}))
					: [
							{
								name: "Стоматологические услуги",
								priceKopecks: totalKopecks,
								quantity: 1,
								amountKopecks: totalKopecks,
								method: "full_payment",
								subject: "service",
								vatRate: "vat_none",
							},
						],
		});

		const printResult = await LanKktDriverService.printFiscalReceipt(payload);

		if (!printResult.success) {
			return {
				success: false,
				status: "DEVICE_NOT_CONNECTED",
				error:
					printResult.errorMessage ||
					"Ошибка печати чека: ККТ недоступна (DEVICE_NOT_CONNECTED).",
			};
		}

		return {
			success: true,
			data: {
				fiscalDocumentNumber: printResult.fiscalDocumentNumber,
				fiscalSign: printResult.fiscalSign,
				totalKopecks,
				paymentType,
				fnSerial: printResult.fnSerial,
				ofdVerificationUrl: printResult.ofdVerificationUrl,
				printedAt: printResult.receiptIssuedAt,
				message: "Чек успешно фискализирован и передан в ОФД.",
			},
		};
	}

	if (toolName === "close_z_report") {
		const shiftResult = await LanKktDriverService.closeShift({
			cashierName: (args.cashierName as string) || "Главный врач",
		});
		if (!shiftResult.success) {
			return {
				success: false,
				status: "DEVICE_NOT_CONNECTED",
				error: shiftResult.errorMessage || "Сбой закрытия смены (DEVICE_NOT_CONNECTED).",
			};
		}
		return {
			success: true,
			data: {
				shiftNumber: shiftResult.shiftNumber,
				closedAt: shiftResult.issuedAt,
				zReportNumber: shiftResult.fiscalDocumentNumber || shiftResult.shiftNumber,
				fiscalSign: shiftResult.fiscalSign,
				fnSerial: shiftResult.fnSerial,
				message: "Смена успешно закрыта с гашением (Z-отчет сформирован).",
			},
		};
	}

	return null;
}

export async function handleShtrihCall(
	toolName: string,
	args: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string; status?: string } | null> {
	if (toolName === "get_device_metrics") {
		const status = await LanKktDriverService.checkDeviceStatus({ model: "shtrikh_m_tcp" });
		if (!status.online) {
			return {
				success: false,
				status: "DEVICE_NOT_CONNECTED",
				error: status.error || "Устройство ШТРИХ-М недоступно (DEVICE_NOT_CONNECTED).",
			};
		}
		return {
			success: true,
			data: {
				model: status.modelName,
				online: status.online,
				paperOk: status.paperOk,
				fnFiscalized: status.fnFiscalized,
				fnSerial: status.fnSerial,
				lastCheckAt: status.lastCheckAt,
			},
		};
	}

	if (toolName === "fiscal_sale") {
		const totalRub = Number(args.totalRub ?? 0);
		if (!Number.isFinite(totalRub) || totalRub < 0) {
			return {
				success: false,
				error: "Ошибка валидации Штрих-М: totalRub должен быть неотрицательным числом.",
			};
		}
		const totalKopecks = Math.round(totalRub * 100);
		const fallbackPatientId =
			typeof args.patientId === "string" && args.patientId.trim()
				? args.patientId.trim()
				: "00000000-0000-7000-8000-000000000001";
		const shtrikhPayload = FiscalReceiptFactory.buildFfd12Receipt({
			operationType: "income",
			taxationSystem: "usn_income",
			patientId: fallbackPatientId,
			payerType: "physical_person",
			addendumConfirmed: true,
			cashierFullName: (args.cashierName as string) || "Кассир",
			customerContact: "+79990000000",
			totalKopecks,
			cashKopecks: totalKopecks,
			items: [
				{
					name: "Стоматологические услуги",
					priceKopecks: totalKopecks,
					quantity: 1,
					amountKopecks: totalKopecks,
					method: "full_payment",
					subject: "service",
					vatRate: "vat_none",
				},
			],
		});
		const printResult = await LanKktDriverService.printFiscalReceipt(
			shtrikhPayload,
			{ model: "shtrikh_m_tcp" },
		);

		if (!printResult.success) {
			return {
				success: false,
				status: "DEVICE_NOT_CONNECTED",
				error:
					printResult.errorMessage ||
					"Устройство ШТРИХ-М недоступно (DEVICE_NOT_CONNECTED).",
			};
		}

		return {
			success: true,
			data: {
				fiscalReceiptNum: printResult.fiscalDocumentNumber,
				fiscalSign: printResult.fiscalSign,
				totalRub,
				status: "printed",
			},
		};
	}

	return null;
}

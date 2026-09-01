/**
 * @dental/shared/fiscal — Sberbank POS Terminal & SberPay Direct Types & Contracts.
 *
 * Protocols:
 * 1. DualConnector (COM / TCP / HTTP bridge for Sberbank smart terminals)
 * 2. Pilot-NT (TCP 127.0.0.1:4000 / COM port direct protocol)
 * 3. Arcus-D / TTK (Integrated banking POS terminal)
 * 4. SmartPOS (Sber SmartPOS Android / TCP / REST interface)
 * 5. SberPay QR & FacePay Biometry direct APIs
 */

import { z } from "zod";

export const sberPosProtocolSchema = z.enum([
	"pilot_nt",
	"arcus_d",
	"dual_connector",
	"smartpos",
	"sberpay_direct_api",
]);
export type SberPosProtocolType = z.infer<typeof sberPosProtocolSchema>;

export const sberPosOperationSchema = z.enum([
	"sale",
	"refund",
	"void",
	"sberpay_qr",
	"biometry_facepay",
	"settlement",
	"test_ping",
	"reprint_slip",
	"summary_report",
	"reconciliation_rrn",
]);
export type SberPosOperationType = z.infer<typeof sberPosOperationSchema>;

export const sberPosTerminalStatusSchema = z.enum([
	"ready",
	"connecting",
	"card_wait",
	"processing_card",
	"pin_entry",
	"biometry_scan",
	"qr_displayed",
	"authorizing",
	"success",
	"card_declined",
	"pin_timeout",
	"communication_error",
	"user_cancelled",
	"reversal_required",
]);
export type SberPosTerminalStatus = z.infer<typeof sberPosTerminalStatusSchema>;

export const sberPosHardwareModelSchema = z.enum([
	"pax_d230",
	"verifone_vx520",
	"ingenico_move5000",
	"sber_smartpos",
]);
export type SberPosHardwareModel = z.infer<typeof sberPosHardwareModelSchema>;

export interface SberPosTerminalConfig {
	readonly terminalId: string;
	readonly merchantId: string;
	readonly hostIp: string;
	readonly hostPort: number;
	readonly protocol: SberPosProtocolType;
	readonly hardwareModel: SberPosHardwareModel;
	readonly timeoutMs: number;
	readonly retryCount: number;
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicInn: string;
}

export interface SberPosTransactionRequest {
	readonly operation: SberPosOperationType;
	readonly amountKop: number;
	readonly orderId: string;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly departmentId?: number | undefined;
	readonly originalRrn?: string | undefined;
	readonly originalAuthCode?: string | undefined;
	readonly originalDate?: string | undefined;
	readonly currencyCode?: string | undefined; // Default "643" (RUB)
}

export interface SberSettlementTotals {
	readonly batchNumber: number;
	readonly dateTime: string;
	readonly saleCount: number;
	readonly saleTotalKop: number;
	readonly refundCount: number;
	readonly refundTotalKop: number;
	readonly voidCount: number;
	readonly voidTotalKop: number;
	readonly sberpayQrCount: number;
	readonly sberpayQrTotalKop: number;
	readonly biometryCount: number;
	readonly biometryTotalKop: number;
	readonly netTotalKop: number;
}

export interface SberPosTransactionResponse {
	readonly success: boolean;
	readonly responseCode: string; // "00", "01", "05", "51", "54", "55", "58", "99", "4100", etc.
	readonly responseMessageRu: string;
	readonly terminalId: string;
	readonly merchantId: string;
	readonly rrn: string; // 12 digits
	readonly authCode: string; // 6 chars
	readonly cardHash: string; // Masked PAN e.g. "2200********4819"
	readonly cardIssuer: string; // "МИР", "SberPay", "Visa", "MasterCard", "UnionPay"
	readonly aid: string; // Application Identifier e.g. "A0000006581010"
	readonly tvr: string; // Terminal Verification Results e.g. "0000008000"
	readonly amountKop: number;
	readonly transactionDateTime: string;
	readonly operationType: SberPosOperationType;
	readonly customerSlip: string;
	readonly merchantSlip: string;
	readonly qrPayload?: string | undefined;
	readonly settlementTotals?: SberSettlementTotals | undefined;
}

export interface SberPosErrorCodeInfo {
	readonly code: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly isRetryable: boolean;
}

export const SBER_POS_ERROR_CODES: Record<string, SberPosErrorCodeInfo> = {
	"00": {
		code: "00",
		titleRu: "Одобрено",
		descriptionRu: "Транзакция успешно проведена и подтверждена банком-эквайером",
		isRetryable: false,
	},
	"01": {
		code: "01",
		titleRu: "Обратитесь в банк",
		descriptionRu: "Требуется голосовая авторизация или обращение держателя карты в банк-эмитент",
		isRetryable: false,
	},
	"05": {
		code: "05",
		titleRu: "Отказ эмитента",
		descriptionRu: "Банк-эмитент отклонил операцию без объяснения причин",
		isRetryable: false,
	},
	"12": {
		code: "12",
		titleRu: "Недопустимая транзакция",
		descriptionRu: "Операция данного типа не поддерживается типом карты или договором эквайринга",
		isRetryable: false,
	},
	"13": {
		code: "13",
		titleRu: "Неверная сумма",
		descriptionRu: "Сумма транзакции меньше 1 копейки или превышает лимит терминала",
		isRetryable: false,
	},
	"14": {
		code: "14",
		titleRu: "Неверный номер карты",
		descriptionRu: "Контрольная сумма номера карты (алгоритм Луна) некорректна",
		isRetryable: false,
	},
	"51": {
		code: "51",
		titleRu: "Недостаточно средств",
		descriptionRu: "На счете карты недостаточно денежных средств для оплаты услуги",
		isRetryable: true,
	},
	"54": {
		code: "54",
		titleRu: "Истек срок действия карты",
		descriptionRu: "Срок действия карты завершен. Воспользуйтесь другой картой или SberPay QR",
		isRetryable: false,
	},
	"55": {
		code: "55",
		titleRu: "Неверный ПИН-код",
		descriptionRu: "Введен некорректный ПИН-код. Повторите попытку внимательно",
		isRetryable: true,
	},
	"58": {
		code: "58",
		titleRu: "Транзакция запрещена",
		descriptionRu: "Эмитент запретил выполнение безналичных операций в медицинской категории (MCC 8021)",
		isRetryable: false,
	},
	"75": {
		code: "75",
		titleRu: "Превышены попытки ввода ПИН",
		descriptionRu: "Карта временно заблокирована из-за 3 неверных попыток ввода ПИН-кода",
		isRetryable: false,
	},
	"99": {
		code: "99",
		titleRu: "Таймаут ввода ПИН / Отмена клиентом",
		descriptionRu: "Клиент нажал кнопку отмены на пин-паде или истекло время ожидания",
		isRetryable: true,
	},
	"4100": {
		code: "4100",
		titleRu: "Ошибка связи с хостом Сбера",
		descriptionRu: "Нет связи с процессинговым сервером Сбербанка (таймаут TCP сокета)",
		isRetryable: true,
	},
	"4101": {
		code: "4101",
		titleRu: "Терминал занят",
		descriptionRu: "Терминал выполняет другую операцию или не завершил печать чека",
		isRetryable: true,
	},
	"4102": {
		code: "4102",
		titleRu: "Нет бумаги в принтере",
		descriptionRu: "В рулоне термопринтера терминала закончилась кассовая лента",
		isRetryable: true,
	},
};

/**
 * Ensures strict positive integer amount in kopecks (zero float imprecision)
 */
export function kopecksToSberAmount(kopecks: number): number {
	const rounded = Math.round(kopecks);
	if (!Number.isFinite(rounded) || rounded <= 0) {
		throw new Error(`Сумма для терминала Сбербанк должна быть положительным целым числом в копейках. Получено: ${kopecks}`);
	}
	return rounded;
}

/**
 * Maps Pilot-NT / DualConnector numeric command codes
 */
export function getPilotNtCommandCode(operation: SberPosOperationType): number {
	switch (operation) {
		case "sale":
			return 1;
		case "refund":
			return 3;
		case "void":
			return 4;
		case "settlement":
			return 7;
		case "sberpay_qr":
			return 11;
		case "biometry_facepay":
			return 13;
		case "test_ping":
			return 2;
		case "reprint_slip":
			return 5;
		case "summary_report":
			return 8;
		case "reconciliation_rrn":
			return 9;
		default:
			return 1;
	}
}

/**
 * Builds standard Pilot-NT payload command line/string:
 * Format: CMD,AMOUNT_KOP,RRN,AUTH_CODE,CURRENCY,ORDER_ID,TID,MID
 */
export function buildPilotNtCommandPacket(
	config: SberPosTerminalConfig,
	req: SberPosTransactionRequest,
): string {
	const cmd = getPilotNtCommandCode(req.operation);
	const amtKop = req.amountKop > 0 ? kopecksToSberAmount(req.amountKop) : 0;
	const rrn = req.originalRrn || "";
	const auth = req.originalAuthCode || "";
	const currency = req.currencyCode || "643";
	const orderId = req.orderId || "";

	return [cmd, amtKop, rrn, auth, currency, orderId, config.terminalId, config.merchantId].join(",");
}

/**
 * Builds DualConnector JSON command structure
 */
export function buildDualConnectorCommand(
	config: SberPosTerminalConfig,
	req: SberPosTransactionRequest,
): Record<string, unknown> {
	return {
		action: req.operation,
		amount: req.amountKop > 0 ? kopecksToSberAmount(req.amountKop) : 0,
		currency: req.currencyCode || "643",
		terminalId: config.terminalId,
		merchantId: config.merchantId,
		orderId: req.orderId,
		rrn: req.originalRrn || undefined,
		authCode: req.originalAuthCode || undefined,
		department: req.departmentId || 1,
	};
}

/**
 * Builds SmartPOS REST / WebSocket payload
 */
export function buildSmartPosPacket(
	config: SberPosTerminalConfig,
	req: SberPosTransactionRequest,
): Record<string, unknown> {
	return {
		protocolVersion: "2.1",
		deviceModel: config.hardwareModel,
		terminalId: config.terminalId,
		merchantId: config.merchantId,
		transaction: {
			type: req.operation,
			amountKopecks: req.amountKop > 0 ? kopecksToSberAmount(req.amountKop) : 0,
			orderId: req.orderId,
			rrn: req.originalRrn || null,
			authCode: req.originalAuthCode || null,
			patientName: req.patientName || null,
		},
	};
}

/**
 * Detects Card Payment System & Issuer from Masked PAN or AID
 */
export function detectCardSystem(panMasked: string, aid: string): string {
	if (
		panMasked.startsWith("2200") ||
		panMasked.startsWith("2201") ||
		panMasked.startsWith("2202") ||
		panMasked.startsWith("2203") ||
		panMasked.startsWith("2204") ||
		aid.includes("A000000658")
	) {
		return "МИР";
	}
	if (panMasked.startsWith("4") || aid.includes("A000000003")) {
		return "Visa";
	}
	if (panMasked.startsWith("5") || aid.includes("A000000004")) {
		return "MasterCard";
	}
	if (panMasked.startsWith("62") || aid.includes("A000000333")) {
		return "UnionPay";
	}
	if (aid.includes("SBERPAY") || panMasked.includes("SBER")) {
		return "SberPay";
	}
	return "Банковская карта";
}

/**
 * Formats a clean, standard monospace Sberbank POS transaction slip (ESC/POS compatible)
 */
export function formatSberBankSlip(
	config: SberPosTerminalConfig,
	data: {
		isCustomerCopy: boolean;
		operation: SberPosOperationType;
		amountKop: number;
		rrn: string;
		authCode: string;
		cardHash: string;
		cardIssuer: string;
		aid: string;
		tvr: string;
		dateTime: string;
		responseCode: string;
		orderId: string;
	},
): string {
	const amountRub = (data.amountKop / 100).toFixed(2);
	const copyTitle = data.isCustomerCopy ? "ЧЕК КЛИЕНТА" : "ЧЕК ТЕРМИНАЛА (КОПИЯ ДЛЯ БУХГАЛТЕРИИ)";

	let opTitle = "ОПЛАТА УСЛУГ (БЕЗНАЛИЧНЫЙ РАСЧЕТ)";
	if (data.operation === "refund") opTitle = "ВОЗВРАТ ПРИХОДА (БЕЗНАЛИЧНЫЙ)";
	if (data.operation === "void") opTitle = "ОТМЕНА ОПЕРАЦИИ (ДО СВЕРКИ)";
	if (data.operation === "sberpay_qr") opTitle = "ОПЛАТА SBERPAY QR (СБП/ПЛАТИ QR)";
	if (data.operation === "biometry_facepay") opTitle = "ОПЛАТА УЛЫБКОЙ (FACEPAY БИОМЕТРИЯ)";

	const statusStr = data.responseCode === "00" ? "ОДОБРЕНО / SUCCESS" : `ОТКАЗ / DECLINED (КОД: ${data.responseCode})`;

	return [
		"========================================",
		`         ${config.clinicName}`,
		`    ${config.clinicAddress}`,
		`          ИНН: ${config.clinicInn}`,
		"----------------------------------------",
		`ТЕРМИНАЛ (TID): ${config.terminalId}`,
		`МЕРЧАНТ  (MID): ${config.merchantId}`,
		`ДАТА/ВРЕМЯ:     ${data.dateTime}`,
		`ЗАКАЗ №:        ${data.orderId}`,
		"----------------------------------------",
		`ОПЕРАЦИЯ:       ${opTitle}`,
		`ПЛАТ. СИСТЕМА:  ${data.cardIssuer}`,
		`КАРТА / СЧЕТ:   ${data.cardHash}`,
		`СУММА:          ${amountRub} РУБ.`,
		`КОМИССИЯ:       0.00 РУБ.`,
		`ИТОГО К ОПЛАТЕ: ${amountRub} РУБ.`,
		"----------------------------------------",
		`КОД АВТОР. (AUTH): ${data.authCode}`,
		`НОМЕР RRN:         ${data.rrn}`,
		`EMV AID:           ${data.aid}`,
		`EMV TVR:           ${data.tvr}`,
		"----------------------------------------",
		`СТАТУС: [ ${statusStr} ]`,
		data.isCustomerCopy
			? "ПОДПИСЬ НЕ ТРЕБУЕТСЯ (ВВЕДЕН ПИН / КРИПТОГРАММА)"
			: "ПОДПИСЬ КАССИРА: _______________________",
		"",
		`               ${copyTitle}`,
		"         СПАСИБО, ЧТО ВЫБРАЛИ НАС!",
		"========================================",
	].join("\n");
}

/**
 * Formats a standard Sberbank Settlement (Z-Report / Сверка итогов) slip
 */
export function formatSberSettlementSlip(
	config: SberPosTerminalConfig,
	totals: SberSettlementTotals,
): string {
	const netRub = (totals.netTotalKop / 100).toFixed(2);
	const saleRub = (totals.saleTotalKop / 100).toFixed(2);
	const refundRub = (totals.refundTotalKop / 100).toFixed(2);
	const qrRub = (totals.sberpayQrTotalKop / 100).toFixed(2);
	const biometryRub = (totals.biometryTotalKop / 100).toFixed(2);

	return [
		"========================================",
		`         ${config.clinicName}`,
		`    ${config.clinicAddress}`,
		`          ИНН: ${config.clinicInn}`,
		"----------------------------------------",
		"        СВЕРКА ИТОГОВ (Z-ОТЧЕТ)",
		"    ЗАКРЫТИЕ БАНКОВСКОЙ СМЕНЫ ЭКВАЙРИНГА",
		"----------------------------------------",
		`ТЕРМИНАЛ (TID): ${config.terminalId}`,
		`МЕРЧАНТ  (MID): ${config.merchantId}`,
		`СМЕНА (BATCH):  №${totals.batchNumber.toString().padStart(4, "0")}`,
		`ДАТА/ВРЕМЯ:     ${totals.dateTime}`,
		"----------------------------------------",
		`ОПЛАТЫ (SALE):         ${totals.saleCount.toString().padStart(4, " ")} | ${saleRub.padStart(12, " ")} Р`,
		`  - В Т.Ч. SBERPAY QR: ${totals.sberpayQrCount.toString().padStart(4, " ")} | ${qrRub.padStart(12, " ")} Р`,
		`  - В Т.Ч. БИОМЕТРИЯ:  ${totals.biometryCount.toString().padStart(4, " ")} | ${biometryRub.padStart(12, " ")} Р`,
		`ВОЗВРАТЫ (REFUND):     ${totals.refundCount.toString().padStart(4, " ")} | ${refundRub.padStart(12, " ")} Р`,
		`ОТМЕНЫ (VOID):         ${totals.voidCount.toString().padStart(4, " ")} | ${(totals.voidTotalKop / 100).toFixed(2).padStart(12, " ")} Р`,
		"----------------------------------------",
		`ИТОГО В БАНК (NET):               ${netRub} Р`,
		"----------------------------------------",
		"РЕЗУЛЬТАТ: [ СМЕНА УСПЕШНО ЗАКРЫТА ]",
		"ИТОГИ СОВПАЛИ С ПРОЦЕССИНГОМ ПАО СБЕРБАНК",
		"========================================",
	].join("\n");
}

/**
 * Validates whether an RRN is exactly 12 alphanumeric/digits
 */
export function isValidRrn(rrn: string): boolean {
	return /^[0-9A-Z]{12}$/i.test(rrn.trim());
}

/**
 * Validates whether an AuthCode is exactly 6 alphanumeric chars
 */
export function isValidAuthCode(authCode: string): boolean {
	return /^[0-9A-Z]{6}$/i.test(authCode.trim());
}

/**
 * Generates dynamic SberPay / SBP QR URI payload for payment
 */
export function generateSberPayQrPayload(
	orderId: string,
	amountKop: number,
	merchantId: string,
): string {
	const amountRub = (kopecksToSberAmount(amountKop) / 100).toFixed(2);
	return `https://qr.sberbank.ru/sbp/pay?tid=${merchantId}&order=${orderId}&sum=${amountRub}&cur=RUB&mcc=8021`;
}

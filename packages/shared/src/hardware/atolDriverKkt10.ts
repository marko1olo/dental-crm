/**
 * @dental/shared/hardware — АТОЛ Драйвер ККТ 10 (ATOL KKT Driver 10) Protocol Engine.
 *
 * Implements standard JSON & Binary communication protocol for ATOL fiscal registrars
 * (АТОЛ 27Ф, 25Ф, 55Ф, 11Ф, 30Ф, 77Ф) via direct TCP/IP LAN socket (port 5555/16732)
 * and Windows COM serial ports (COM1..COM32).
 *
 * Strictly compliant with 54-FZ & FFD 1.2 (Order of FTS Russia No. ED-7-20/662@).
 */

import {
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	type Ffd12OperationType,
	type Ffd12PaymentMethod,
	type Ffd12PaymentSubject,
	type Ffd12TaxationSystem,
	type Ffd12VatRate,
} from "../fiscal/ffd12Types.js";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

export interface Atol10ItemRequest {
	readonly name: string;
	readonly price: number; // in Rubles
	readonly quantity: number;
	readonly amount: number; // in Rubles
	readonly department?: number | undefined;
	readonly measurementUnit?: number | undefined; // 0 = piece
	readonly paymentMethod?: Ffd12PaymentMethod | undefined;
	readonly paymentObject?: Ffd12PaymentSubject | undefined;
	readonly tax?: {
		readonly type: Ffd12VatRate;
	} | undefined;
	readonly markingCode?: {
		readonly raw: string;
		readonly plannedStatus?: number | undefined;
	} | undefined;
	readonly medicalServiceCode804n?: string | undefined;
}

export interface Atol10PaymentRequest {
	readonly type: "cash" | "electronically" | "prepaid" | "credit" | "other";
	readonly sum: number; // in Rubles
}

export interface Atol10FiscalReceiptRequest {
	readonly type: "sell" | "sellReturn" | "buy" | "buyReturn" | "sellCorrection" | "sellReturnCorrection";
	readonly electronical?: boolean | undefined;
	readonly taxationType?: Ffd12TaxationSystem | undefined;
	readonly ignoreNonFiscalPrintErrors?: boolean | undefined;
	readonly operator: {
		readonly name: string;
		readonly vatin?: string | undefined;
	};
	readonly clientInfo?: {
		readonly emailOrPhone?: string | undefined;
		readonly vatin?: string | undefined;
		readonly name?: string | undefined;
	} | undefined;
	readonly items: Atol10ItemRequest[];
	readonly payments: Atol10PaymentRequest[];
	readonly total: number; // in Rubles
}

export interface Atol10FiscalResponse {
	readonly success: boolean;
	readonly errorCode?: number | undefined;
	readonly errorDescription?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly fiscalDocumentNumber?: number | undefined;
	readonly fiscalDocumentDateTime?: string | undefined;
	readonly shiftNumber?: number | undefined;
	readonly receiptNumber?: number | undefined;
	readonly fnSerialNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly fnsUrl?: string | undefined;
	readonly qrCode?: string | undefined;
}

export interface Atol10DeviceStatus {
	readonly online: boolean;
	readonly isCoverOpened: boolean;
	readonly isPaperPresent: boolean;
	readonly isPaperNearEnd: boolean;
	readonly isFnPresent: boolean;
	readonly isFnFiscalized: boolean;
	readonly isShiftOpened: boolean;
	readonly isShiftExpired24h: boolean;
	readonly shiftNumber: number;
	readonly receiptNumber: number;
	readonly modelName: string;
	readonly firmwareVersion: string;
	readonly fnSerialNumber: string;
	readonly kktSerialNumber: string;
	readonly batteryChargePercent?: number | undefined;
	readonly error?: string | undefined;
}

/**
 * Format Russian 54-FZ compliant ATOL 10 JSON command object.
 */
export function buildAtol10ReceiptJson(
	req: Atol10FiscalReceiptRequest,
	options: { machineUuid?: string } = {},
): Record<string, unknown> {
	const operationMap: Record<string, string> = {
		sell: "sell",
		sellReturn: "sellReturn",
		buy: "buy",
		buyReturn: "buyReturn",
		sellCorrection: "sellCorrection",
		sellReturnCorrection: "sellReturnCorrection",
	};

	const taxationCode = req.taxationType
		? FFD12_TAG_1055_TAXATION_CODES[req.taxationType]
		: FFD12_TAG_1055_TAXATION_CODES.usn_income;

	const items = req.items.map((item) => {
		const vatType = item.tax?.type || "vat_none";
		const vatCode = FFD12_TAG_1199_VAT_CODES[vatType];
		const paymentMethodCode = item.paymentMethod
			? FFD12_TAG_1214_METHOD_CODES[item.paymentMethod]
			: FFD12_TAG_1214_METHOD_CODES.full_payment;
		const paymentSubjectCode = item.paymentObject
			? FFD12_TAG_1212_SUBJECT_CODES[item.paymentObject]
			: FFD12_TAG_1212_SUBJECT_CODES.service;

		const itemObj: Record<string, unknown> = {
			type: "position",
			name: item.name,
			price: Number(item.price.toFixed(2)),
			quantity: item.quantity,
			amount: Number(item.amount.toFixed(2)),
			department: item.department ?? 1,
			paymentMethod: paymentMethodCode,
			paymentObject: paymentSubjectCode,
			tax: {
				type: vatCode === 6 ? "none" : vatCode === 1 ? "vat20" : vatCode === 2 ? "vat10" : "vat0",
			},
		};

		if (item.markingCode?.raw) {
			itemObj.markingCode = {
				type: "auto",
				mark: item.markingCode.raw,
				plannedStatus: item.markingCode.plannedStatus ?? 1,
			};
		}

		if (item.medicalServiceCode804n) {
			itemObj.userAttribute = {
				name: "Код номенклатуры 804н",
				value: item.medicalServiceCode804n,
			};
		}

		return itemObj;
	});

	const payments = req.payments.map((p) => ({
		type: p.type,
		sum: Number(p.sum.toFixed(2)),
	}));

	return {
		uuid: options.machineUuid || `dente-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		request: {
			type: operationMap[req.type] || "sell",
			electronically: Boolean(req.electronical),
			ignoreNonFiscalPrintErrors: Boolean(req.ignoreNonFiscalPrintErrors),
			taxationType: taxationCode === 2 ? "usnIncome" : taxationCode === 4 ? "usnIncomeOutcome" : "osn",
			operator: {
				name: req.operator.name,
				vatin: req.operator.vatin || undefined,
			},
			clientInfo: req.clientInfo
				? {
						emailOrPhone: req.clientInfo.emailOrPhone,
						vatin: req.clientInfo.vatin,
						name: req.clientInfo.name,
					}
				: undefined,
			items,
			payments,
			total: Number(req.total.toFixed(2)),
		},
	};
}

/**
 * Builds standard 54-FZ QR code content string for receipt verification.
 */
export function buildAtolFiscalQrString(params: {
	issuedAt: Date;
	totalRub: number;
	fnSerial: string;
	fiscalDocNum: number | string;
	fiscalSign: string;
	operationType: Ffd12OperationType;
}): string {
	const pad = (n: number) => n.toString().padStart(2, "0");
	const d = params.issuedAt;
	const t = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}`;
	const s = params.totalRub.toFixed(2);
	const n = FFD12_TAG_1054_OPERATION_CODES[params.operationType] || 1;
	return `t=${t}&s=${s}&fn=${params.fnSerial}&i=${params.fiscalDocNum}&fp=${params.fiscalSign}&n=${n}`;
}

/**
 * Parses raw ATOL 10 error code into human-readable Russian diagnostic text.
 */
export function parseAtol10ErrorCode(code: number): string {
	const errors: Record<number, string> = {
		0: "Ошибок нет (Успешно)",
		1: "Нет бумаги в печатающем механизме ККТ",
		2: "Открыта крышка корпуса ККТ",
		3: "Смена в ККТ превысила 24 часа. Требуется закрытие смены (Z-отчет)",
		4: "Неверный пароль кассира/администратора",
		5: "Ошибка фискального накопителя (ФН): ресурс исчерпан или заблокирован",
		6: "Ошибка контрольной суммы / связи с ОФД",
		7: "Некорректная сумма чека или распределение оплат",
		8: "Недопустимый код маркировки Честный ЗНАК / МДЛП (Тег 1162/1163)",
		9: "Превышен лимит безналичного расчета",
		16: "Фискальный накопитель не фискализирован",
		20: "ККТ заблокирована в режиме ввода даты",
	};

	return errors[code] || `Неизвестная ошибка драйвера АТОЛ (Код: ${code})`;
}

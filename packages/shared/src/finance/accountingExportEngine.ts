/**
 * DENTE Dental CRM — 1C:Enterprise Client-Bank Exchange & Acquiring Reconciliation Engine.
 *
 * Wave 130 — Accounting Export & 1C Bank Reconciliation (DentalPin Reverse-Engineering).
 *
 * Standards & Regulations:
 * 1. Стандарт обмена данными «1С:Предприятие — Клиент-Банк» версия 1.03 (секции 1CClientBankExchange,
 *    СекцияРасчСчет, СекцияДокумент=Платежное поручение / Банковский ордер / Платежное требование).
 * 2. Реестр операций торгового эквайринга РФ (ПАО Сбербанк, АО ТБанк, Банк ВТБ, АО Альфа-Банк).
 * 3. Строгая копеечная арифметика комиссий без погрешностей IEEE-754 (Zero Float Drift).
 * 4. Федеральный закон от 06.12.2011 № 402-ФЗ «О бухгалтерском учете».
 * 5. Мандат 8d п. 7 — Абсолютный запрет на эмодзи в официальных бухгалтерских бланках.
 * 6. Ограничение файла: строго < 800 строк чистого TypeScript-кода.
 */

import { z } from "zod";
import { kopecksToRub } from "../fiscal/kopecksArithmetic.js";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════

export const CLIENT_BANK_EXCHANGE_VERSION = "1.03" as const;
export const CLIENT_BANK_ENCODING = "Windows" as const;
export const DEFAULT_SENDER_PROGRAM = "DENTE Dental CRM" as const;
export const DEFAULT_RECIPIENT_PROGRAM = "1С:Предприятие" as const;
export const DEFAULT_PAYMENT_KIND = "электронно" as const;
export const DEFAULT_PAYMENT_TYPE_CODE = "01" as const; // Платежное поручение
export const DEFAULT_PAYMENT_PRIORITY = 5 as const;

export const ACQUIRING_PROVIDERS = ["sberbank", "tbank", "vtb", "alfabank", "other"] as const;
export type AcquiringProvider = (typeof ACQUIRING_PROVIDERS)[number];

export const ACQUIRING_PROVIDER_NAMES_RU: Record<AcquiringProvider, string> = {
	sberbank: "ПАО Сбербанк",
	tbank: "АО «ТБанк»",
	vtb: "Банк ВТБ (ПАО)",
	alfabank: "АО «Альфа-Банк»",
	other: "Коммерческий банк",
};

export const BANK_STATEMENT_DOCUMENT_TYPES = [
	"Платежное поручение",
	"Платежное требование",
	"Банковский ордер",
	"Мемориальный ордер",
	"Инкассовое поручение",
] as const;
export type BankStatementDocumentType = (typeof BANK_STATEMENT_DOCUMENT_TYPES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS: 1C CLIENT-BANK FORMAT 1.03
// ═══════════════════════════════════════════════════════════════════════════

export const bankStatementOperationTypeSchema = z.enum(["receipt", "expense"]);
export type BankStatementOperationType = z.infer<typeof bankStatementOperationTypeSchema>;

export const bankStatementOrderSchema = z.object({
	id: z.string().min(1),
	documentType: z.string().default("Платежное поручение"),
	number: z.string().min(1).max(50),
	date: z.string().min(8),
	amountKopecks: z.number().int().positive(),
	operationType: bankStatementOperationTypeSchema,
	payerAccount: z.string().min(20).max(25),
	payerName: z.string().min(1).max(500),
	payerInn: z.string().max(12).optional().nullable(),
	payerKpp: z.string().max(9).optional().nullable(),
	payerBankBik: z.string().min(9).max(9),
	payerBankName: z.string().min(1).max(255),
	payerBankCorrAccount: z.string().max(25).optional().nullable(),
	recipientAccount: z.string().min(20).max(25),
	recipientName: z.string().min(1).max(500),
	recipientInn: z.string().max(12).optional().nullable(),
	recipientKpp: z.string().max(9).optional().nullable(),
	recipientBankBik: z.string().min(9).max(9),
	recipientBankName: z.string().min(1).max(255),
	recipientBankCorrAccount: z.string().max(25).optional().nullable(),
	paymentPurpose: z.string().min(1).max(1000),
	paymentKind: z.string().default(DEFAULT_PAYMENT_KIND),
	paymentTypeCode: z.string().default(DEFAULT_PAYMENT_TYPE_CODE),
	priority: z.number().int().min(1).max(6).default(DEFAULT_PAYMENT_PRIORITY),
	vatRate: z.string().default("Без НДС"),
	vatAmountKopecks: z.number().int().nonnegative().default(0),
});
export type BankStatementOrder = z.infer<typeof bankStatementOrderSchema>;

export const bankStatementRegistrySchema = z.object({
	registryId: z.string().min(1),
	accountNumber: z.string().min(20).max(25),
	bankBik: z.string().min(9).max(9),
	bankName: z.string().min(1).max(255),
	bankCorrAccount: z.string().max(25).optional().nullable(),
	clinicName: z.string().min(1).max(255),
	clinicInn: z.string().min(10).max(12),
	clinicKpp: z.string().max(9).optional().nullable(),
	dateFrom: z.string().min(8),
	dateTo: z.string().min(8),
	createdAt: z.string().optional(),
	senderProgram: z.string().default(DEFAULT_SENDER_PROGRAM),
	recipientProgram: z.string().default(DEFAULT_RECIPIENT_PROGRAM),
	openingBalanceKopecks: z.number().int().nonnegative().default(0),
	orders: z.array(bankStatementOrderSchema),
	totalReceivedKopecks: z.number().int().nonnegative().optional(),
	totalDeductedKopecks: z.number().int().nonnegative().optional(),
	closingBalanceKopecks: z.number().int().nonnegative().optional(),
});
export type BankStatementRegistry = z.infer<typeof bankStatementRegistrySchema>;

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS: ACQUIRING & RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════════

export const paymentEntrySchema = z.object({
	id: z.string().min(1),
	date: z.string().min(8),
	amountKopecks: z.number().int().positive(),
	rrn: z.string().optional().nullable(),
	authCode: z.string().optional().nullable(),
	terminalId: z.string().optional().nullable(),
	cardLast4: z.string().optional().nullable(),
	paymentMethod: z.enum(["card", "sbp", "qr"]).default("card"),
	acquirerName: z.enum(ACQUIRING_PROVIDERS).default("sberbank"),
	expectedFeeRatePercent: z.number().min(0).max(100).optional().nullable(),
	expectedFeeKopecks: z.number().int().nonnegative().optional().nullable(),
	patientName: z.string().optional().nullable(),
	receiptNumber: z.string().optional().nullable(),
});
export type PaymentEntry = z.infer<typeof paymentEntrySchema>;

export const acquirerStatementItemSchema = z.object({
	id: z.string().min(1),
	date: z.string().min(8),
	terminalId: z.string().optional().nullable(),
	rrn: z.string().optional().nullable(),
	authCode: z.string().optional().nullable(),
	cardMask: z.string().optional().nullable(),
	paymentSystem: z.string().optional().nullable(),
	grossAmountKopecks: z.number().int().positive(),
	feeKopecks: z.number().int().nonnegative(),
	netAmountKopecks: z.number().int().positive(),
	feeRatePercent: z.number().min(0).max(100).optional().nullable(),
});
export type AcquirerStatementItem = z.infer<typeof acquirerStatementItemSchema>;

export const matchedTransactionRecordSchema = z.object({
	systemPaymentId: z.string(),
	acquirerStatementId: z.string(),
	rrn: z.string().optional().nullable(),
	authCode: z.string().optional().nullable(),
	terminalId: z.string().optional().nullable(),
	date: z.string(),
	grossAmountKopecks: z.number().int(),
	actualFeeKopecks: z.number().int(),
	expectedFeeKopecks: z.number().int(),
	feeDiscrepancyKopecks: z.number().int(),
	netAmountKopecks: z.number().int(),
	hasFeeDiscrepancy: z.boolean(),
	cardMaskOrLast4: z.string().optional().nullable(),
});
export type MatchedTransactionRecord = z.infer<typeof matchedTransactionRecordSchema>;

export const reconciliationSummarySchema = z.object({
	systemCount: z.number().int().nonnegative(),
	systemTotalKopecks: z.number().int().nonnegative(),
	acquirerCount: z.number().int().nonnegative(),
	acquirerGrossKopecks: z.number().int().nonnegative(),
	acquirerFeeKopecks: z.number().int().nonnegative(),
	acquirerNetKopecks: z.number().int().nonnegative(),
	matchedCount: z.number().int().nonnegative(),
	matchedGrossKopecks: z.number().int().nonnegative(),
	feeDiscrepancyCount: z.number().int().nonnegative(),
	feeDiscrepancyKopecks: z.number().int(),
	missingInBankCount: z.number().int().nonnegative(),
	missingInBankKopecks: z.number().int().nonnegative(),
	missingInCrmCount: z.number().int().nonnegative(),
	missingInCrmKopecks: z.number().int().nonnegative(),
});
export type ReconciliationSummary = z.infer<typeof reconciliationSummarySchema>;

export const acquirerReconciliationSchema = z.object({
	reconciliationId: z.string().min(1),
	reconciliationDate: z.string(),
	periodFrom: z.string(),
	periodTo: z.string(),
	acquirerName: z.string(),
	status: z.enum(["balanced", "discrepancies_found"]),
	summary: reconciliationSummarySchema,
	matchedRecords: z.array(matchedTransactionRecordSchema),
	missingInBankRecords: z.array(paymentEntrySchema),
	missingInCrmRecords: z.array(acquirerStatementItemSchema),
});
export type ReconciliationResult = z.infer<typeof acquirerReconciliationSchema>;

export const reconciliationOptionsSchema = z.object({
	reconciliationId: z.string().optional(),
	reconciliationDate: z.string().optional(),
	periodFrom: z.string().optional(),
	periodTo: z.string().optional(),
	acquirerName: z.string().optional(),
	defaultFeeRatePercent: z.number().min(0).max(100).optional(),
});
export type ReconciliationOptions = z.infer<typeof reconciliationOptionsSchema>;

export const clinicRequisiteInfoSchema = z.object({
	name: z.string().min(1),
	inn: z.string().min(10).max(12),
	kpp: z.string().max(9).optional().nullable(),
	bankAccount: z.string().max(25).optional().nullable(),
	bankName: z.string().max(255).optional().nullable(),
	bankBik: z.string().max(9).optional().nullable(),
});
export type ClinicRequisiteInfo = z.infer<typeof clinicRequisiteInfoSchema>;

export const reconciliationProtocolOptionsSchema = z.object({
	protocolNumber: z.string().optional(),
	chiefAccountant: z.string().optional(),
	cashier: z.string().optional(),
	notes: z.string().optional(),
});
export type ReconciliationProtocolOptions = z.infer<typeof reconciliationProtocolOptionsSchema>;

export const exportPreviewSchema = z.object({
	invoiceCount: z.number().int().nonnegative(),
	paymentCount: z.number().int().nonnegative(),
	totalBaseKopecks: z.number().int().nonnegative(),
	totalVatKopecks: z.number().int().nonnegative(),
	totalAmountKopecks: z.number().int().nonnegative(),
	sampleOrders: z.array(z.record(z.unknown())).optional(),
});
export type ExportPreview = z.infer<typeof exportPreviewSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export function formatAmount1C(kopecks: number): string {
	return kopecksToRub(Math.round(kopecks)).toFixed(2);
}

export function formatRublesRu(kopecks: number): string {
	const rubPart = Math.floor(Math.abs(kopecks) / 100);
	const kopPart = Math.abs(kopecks) % 100;
	const formattedRub = rubPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	const sign = kopecks < 0 ? "-" : "";
	return `${sign}${formattedRub},${kopPart.toString().padStart(2, "0")} руб.`;
}

export function format1CDate(dateInput: string | Date): string {
	if (dateInput instanceof Date) {
		const d = dateInput.getDate().toString().padStart(2, "0");
		const m = (dateInput.getMonth() + 1).toString().padStart(2, "0");
		return `${d}.${m}.${dateInput.getFullYear()}`;
	}
	const clean = dateInput.trim();
	if (/^\d{2}\.\d{2}\.\d{4}$/.test(clean)) return clean;
	if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
		const [year, month, day] = clean.slice(0, 10).split("-");
		return `${day}.${month}.${year}`;
	}
	return clean;
}

export function format1CTime(timeInput?: string | Date): string {
	if (timeInput instanceof Date) {
		const h = timeInput.getHours().toString().padStart(2, "0");
		const m = timeInput.getMinutes().toString().padStart(2, "0");
		const s = timeInput.getSeconds().toString().padStart(2, "0");
		return `${h}:${m}:${s}`;
	}
	if (typeof timeInput === "string" && /^\d{2}:\d{2}:\d{2}$/.test(timeInput)) return timeInput;
	return "12:00:00";
}

// ═══════════════════════════════════════════════════════════════════════════
// 1C CLIENT-BANK EXPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export function generate1CBankStatement(registry: BankStatementRegistry): string {
	const parsed = bankStatementRegistrySchema.parse(registry);
	let totalRec = 0;
	let totalDed = 0;
	for (const order of parsed.orders) {
		if (order.operationType === "receipt") totalRec += order.amountKopecks;
		else totalDed += order.amountKopecks;
	}

	const recKop = parsed.totalReceivedKopecks ?? totalRec;
	const dedKop = parsed.totalDeductedKopecks ?? totalDed;
	const closingBalance = parsed.closingBalanceKopecks ?? (parsed.openingBalanceKopecks + recKop - dedKop);
	const now = new Date();
	const createDate = parsed.createdAt ? format1CDate(parsed.createdAt) : format1CDate(now);
	const createTime = parsed.createdAt ? format1CTime(parsed.createdAt) : format1CTime(now);
	const dateFrom = format1CDate(parsed.dateFrom);
	const dateTo = format1CDate(parsed.dateTo);

	const lines: string[] = [
		"1CClientBankExchange",
		`ВерсияФормата=${CLIENT_BANK_EXCHANGE_VERSION}`,
		`Кодировка=${CLIENT_BANK_ENCODING}`,
		`Отправитель=${parsed.senderProgram || DEFAULT_SENDER_PROGRAM}`,
		`Получатель=${parsed.recipientProgram || DEFAULT_RECIPIENT_PROGRAM}`,
		`ДатаСоздания=${createDate}`,
		`ВремяСоздания=${createTime}`,
		`ДатаНачала=${dateFrom}`,
		`ДатаКонца=${dateTo}`,
		`РасчСчет=${parsed.accountNumber}`,
		"СекцияРасчСчет",
		`ДатаНачала=${dateFrom}`,
		`ДатаКонца=${dateTo}`,
		`НачальныйОстаток=${formatAmount1C(parsed.openingBalanceKopecks)}`,
		`РасчСчет=${parsed.accountNumber}`,
		`ВсегоПоступило=${formatAmount1C(recKop)}`,
		`ВсегоСписано=${formatAmount1C(dedKop)}`,
		`КонечныйОстаток=${formatAmount1C(closingBalance)}`,
		"КонецРасчСчет",
	];

	for (const o of parsed.orders) {
		lines.push(
			`СекцияДокумент=${o.documentType || "Платежное поручение"}`,
			`Номер=${o.number}`,
			`Дата=${format1CDate(o.date)}`,
			`Сумма=${formatAmount1C(o.amountKopecks)}`,
			`ПлательщикСчет=${o.payerAccount}`,
			`Плательщик=${o.payerName}`,
			`ПлательщикИНН=${o.payerInn || ""}`,
			`ПлательщикКПП=${o.payerKpp || ""}`,
			`Плательщик1=${o.payerName}`,
			`ПлательщикРасчСчет=${o.payerAccount}`,
			`ПлательщикБанк1=${o.payerBankName}`,
			`ПлательщикБИК=${o.payerBankBik}`,
			`ПлательщикКорсчет=${o.payerBankCorrAccount || ""}`,
			`ПолучательСчет=${o.recipientAccount}`,
			`Получатель=${o.recipientName}`,
			`ПолучательИНН=${o.recipientInn || ""}`,
			`ПолучательКПП=${o.recipientKpp || ""}`,
			`Получатель1=${o.recipientName}`,
			`ПолучательРасчСчет=${o.recipientAccount}`,
			`ПолучательБанк1=${o.recipientBankName}`,
			`ПолучательБИК=${o.recipientBankBik}`,
			`ПолучательКорсчет=${o.recipientBankCorrAccount || ""}`,
			`ВидПлатежа=${o.paymentKind || DEFAULT_PAYMENT_KIND}`,
			`ВидОплаты=${o.paymentTypeCode || DEFAULT_PAYMENT_TYPE_CODE}`,
			`Очередность=${o.priority ?? DEFAULT_PAYMENT_PRIORITY}`,
			`НазначениеПлатежа=${o.paymentPurpose}`,
			"КонецДокумента",
		);
	}
	lines.push("КонецФайла");
	return lines.join("\r\n");
}

export function parse1CBankStatement(rawText: string): BankStatementRegistry {
	const rawLines = rawText.split(/\r?\n/);
	const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);
	if (lines.length === 0 || lines[0] !== "1CClientBankExchange") {
		throw new Error("Невалидный файл выгрузки 1С: отсутствует заголовок 1CClientBankExchange.");
	}

	const headerMap: Record<string, string> = {};
	let idx = 1;
	while (idx < lines.length) {
		const line = lines[idx];
		if (!line) {
			idx++;
			continue;
		}
		if (line.startsWith("СекцияРасчСчет") || line.startsWith("СекцияДокумент")) {
			break;
		}
		const [k, ...vParts] = line.split("=");
		if (k && vParts.length > 0) headerMap[k.trim()] = vParts.join("=").trim();
		idx++;
	}

	let openingBalanceKopecks = 0;
	let totalReceivedKopecks = 0;
	let totalDeductedKopecks = 0;
	let closingBalanceKopecks = 0;
	let sectionAccount = headerMap["РасчСчет"] || "";

	if (idx < lines.length && lines[idx]?.startsWith("СекцияРасчСчет")) {
		idx++;
		while (idx < lines.length) {
			const line = lines[idx];
			if (!line || line === "КонецРасчСчет") break;
			const [k, ...vParts] = line.split("=");
			const key = k?.trim();
			const val = vParts.join("=").trim();
			if (key === "РасчСчет") sectionAccount = val;
			if (key === "НачальныйОстаток") openingBalanceKopecks = Math.round(parseFloat(val || "0") * 100);
			if (key === "ВсегоПоступило") totalReceivedKopecks = Math.round(parseFloat(val || "0") * 100);
			if (key === "ВсегоСписано") totalDeductedKopecks = Math.round(parseFloat(val || "0") * 100);
			if (key === "КонечныйОстаток") closingBalanceKopecks = Math.round(parseFloat(val || "0") * 100);
			idx++;
		}
		if (idx < lines.length && lines[idx] === "КонецРасчСчет") idx++;
	}

	const orders: BankStatementOrder[] = [];
	while (idx < lines.length) {
		const line = lines[idx];
		if (line?.startsWith("СекцияДокумент")) {
			const docType = line.split("=")[1]?.trim() || "Платежное поручение";
			idx++;
			const docMap: Record<string, string> = {};
			while (idx < lines.length) {
				const docLine = lines[idx];
				if (!docLine || docLine === "КонецДокумента") break;
				const [k, ...vParts] = docLine.split("=");
				if (k && vParts.length > 0) docMap[k.trim()] = vParts.join("=").trim();
				idx++;
			}
			if (idx < lines.length && lines[idx] === "КонецДокумента") idx++;

			const amountKopecks = Math.round(parseFloat(docMap["Сумма"] || "0") * 100);
			const recipientAcc = docMap["ПолучательРасчСчет"] || docMap["ПолучательСчет"] || "";
			const payerAcc = docMap["ПлательщикРасчСчет"] || docMap["ПлательщикСчет"] || "";
			const opType: BankStatementOperationType = recipientAcc === sectionAccount ? "receipt" : "expense";

			orders.push({
				id: `order-${orders.length + 1}-${docMap["Номер"] || "0"}`,
				documentType: docType,
				number: docMap["Номер"] || String(orders.length + 1),
				date: docMap["Дата"] || headerMap["ДатаСоздания"] || "01.01.2026",
				amountKopecks,
				operationType: opType,
				payerAccount: payerAcc,
				payerName: docMap["Плательщик"] || docMap["Плательщик1"] || "",
				payerInn: docMap["ПлательщикИНН"] || null,
				payerKpp: docMap["ПлательщикКПП"] || null,
				payerBankBik: docMap["ПлательщикБИК"] || "044525225",
				payerBankName: docMap["ПлательщикБанк1"] || "",
				payerBankCorrAccount: docMap["ПлательщикКорсчет"] || null,
				recipientAccount: recipientAcc,
				recipientName: docMap["Получатель"] || docMap["Получатель1"] || "",
				recipientInn: docMap["ПолучательИНН"] || null,
				recipientKpp: docMap["ПолучательКПП"] || null,
				recipientBankBik: docMap["ПолучательБИК"] || "044525225",
				recipientBankName: docMap["ПолучательБанк1"] || "",
				recipientBankCorrAccount: docMap["ПолучательКорсчет"] || null,
				paymentPurpose: docMap["НазначениеПлатежа"] || "Оплата медицинских услуг",
				paymentKind: docMap["ВидПлатежа"] || DEFAULT_PAYMENT_KIND,
				paymentTypeCode: docMap["ВидОплаты"] || DEFAULT_PAYMENT_TYPE_CODE,
				priority: parseInt(docMap["Очередность"] || "5", 10) || 5,
				vatRate: docMap["СтавкаНДС"] || "Без НДС",
				vatAmountKopecks: 0,
			});
		} else {
			idx++;
		}
	}

	return bankStatementRegistrySchema.parse({
		registryId: `parsed-registry-${Date.now()}`,
		accountNumber: sectionAccount || "40702810000000000000",
		bankBik: orders[0]?.recipientBankBik || orders[0]?.payerBankBik || "044525225",
		bankName: orders[0]?.recipientBankName || orders[0]?.payerBankName || "БАНК",
		bankCorrAccount: null,
		clinicName: headerMap["Отправитель"] || "Клиника",
		clinicInn: "7707083893",
		clinicKpp: null,
		dateFrom: headerMap["ДатаНачала"] || "01.01.2026",
		dateTo: headerMap["ДатаКонца"] || "31.12.2026",
		createdAt: headerMap["ДатаСоздания"] || "01.01.2026",
		senderProgram: headerMap["Отправитель"] || DEFAULT_SENDER_PROGRAM,
		recipientProgram: headerMap["Получатель"] || DEFAULT_RECIPIENT_PROGRAM,
		openingBalanceKopecks,
		orders,
		totalReceivedKopecks,
		totalDeductedKopecks,
		closingBalanceKopecks,
	});
}

// ═══════════════════════════════════════════════════════════════════════════
// ACQUIRING RECONCILIATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export function reconcileAcquiringTransactions(
	systemPayments: PaymentEntry[],
	acquirerStatements: AcquirerStatementItem[],
	options?: ReconciliationOptions,
): ReconciliationResult {
	const validPayments = systemPayments.map((p) => paymentEntrySchema.parse(p));
	const validStatements = acquirerStatements.map((s) => acquirerStatementItemSchema.parse(s));

	const usedStatementIds = new Set<string>();
	const matchedRecords: MatchedTransactionRecord[] = [];
	const missingInBankRecords: PaymentEntry[] = [];

	const statementsByRrn = new Map<string, AcquirerStatementItem>();
	const statementsByAuthCode = new Map<string, AcquirerStatementItem>();

	for (const st of validStatements) {
		if (st.rrn?.trim()) statementsByRrn.set(st.rrn.trim(), st);
		if (st.authCode?.trim()) statementsByAuthCode.set(st.authCode.trim(), st);
	}

	for (const payment of validPayments) {
		let match: AcquirerStatementItem | undefined;

		if (payment.rrn?.trim()) {
			const cand = statementsByRrn.get(payment.rrn.trim());
			if (cand && !usedStatementIds.has(cand.id)) match = cand;
		}
		if (!match && payment.authCode?.trim()) {
			const cand = statementsByAuthCode.get(payment.authCode.trim());
			if (cand && !usedStatementIds.has(cand.id)) match = cand;
		}
		if (!match) {
			const payDateStr = format1CDate(payment.date);
			for (const st of validStatements) {
				if (usedStatementIds.has(st.id) || st.grossAmountKopecks !== payment.amountKopecks) continue;
				if (format1CDate(st.date) === payDateStr) {
					if (!payment.terminalId || !st.terminalId || payment.terminalId === st.terminalId) {
						match = st;
						break;
					}
				}
			}
		}

		if (match) {
			usedStatementIds.add(match.id);
			let expFee = 0;
			if (payment.expectedFeeKopecks != null) {
				expFee = payment.expectedFeeKopecks;
			} else if (payment.expectedFeeRatePercent != null) {
				expFee = Math.round((payment.amountKopecks * payment.expectedFeeRatePercent) / 100);
			} else if (options?.defaultFeeRatePercent != null) {
				expFee = Math.round((payment.amountKopecks * options.defaultFeeRatePercent) / 100);
			} else if (match.feeRatePercent != null) {
				expFee = Math.round((payment.amountKopecks * match.feeRatePercent) / 100);
			} else {
				expFee = match.feeKopecks;
			}

			const feeDiff = match.feeKopecks - expFee;
			matchedRecords.push({
				systemPaymentId: payment.id,
				acquirerStatementId: match.id,
				rrn: match.rrn || payment.rrn || null,
				authCode: match.authCode || payment.authCode || null,
				terminalId: match.terminalId || payment.terminalId || null,
				date: match.date,
				grossAmountKopecks: match.grossAmountKopecks,
				actualFeeKopecks: match.feeKopecks,
				expectedFeeKopecks: expFee,
				feeDiscrepancyKopecks: feeDiff,
				netAmountKopecks: match.netAmountKopecks,
				hasFeeDiscrepancy: feeDiff !== 0,
				cardMaskOrLast4: match.cardMask || payment.cardLast4 || null,
			});
		} else {
			missingInBankRecords.push(payment);
		}
	}

	const missingInCrmRecords = validStatements.filter((st) => !usedStatementIds.has(st.id));
	const systemTotalKopecks = validPayments.reduce((s, p) => s + p.amountKopecks, 0);
	const acquirerGrossKopecks = validStatements.reduce((s, st) => s + st.grossAmountKopecks, 0);
	const acquirerFeeKopecks = validStatements.reduce((s, st) => s + st.feeKopecks, 0);
	const acquirerNetKopecks = validStatements.reduce((s, st) => s + st.netAmountKopecks, 0);
	const matchedGrossKopecks = matchedRecords.reduce((s, m) => s + m.grossAmountKopecks, 0);
	const feeDiscrepancies = matchedRecords.filter((m) => m.hasFeeDiscrepancy);
	const feeDiscrepancyKopecks = feeDiscrepancies.reduce((s, m) => s + m.feeDiscrepancyKopecks, 0);
	const missingInBankKopecks = missingInBankRecords.reduce((s, p) => s + p.amountKopecks, 0);
	const missingInCrmKopecks = missingInCrmRecords.reduce((s, st) => s + st.grossAmountKopecks, 0);

	const isBalanced = feeDiscrepancies.length === 0 && missingInBankRecords.length === 0 && missingInCrmRecords.length === 0;
	const now = new Date();
	const firstPayment = validPayments[0];
	const lastPayment = validPayments[validPayments.length - 1];
	const recDate = options?.reconciliationDate || format1CDate(now);
	const pFrom = options?.periodFrom || (firstPayment ? format1CDate(firstPayment.date) : format1CDate(now));
	const pTo = options?.periodTo || (lastPayment ? format1CDate(lastPayment.date) : format1CDate(now));
	const acqName = options?.acquirerName || (firstPayment?.acquirerName ? ACQUIRING_PROVIDER_NAMES_RU[firstPayment.acquirerName] : "ПАО Сбербанк");

	return acquirerReconciliationSchema.parse({
		reconciliationId: options?.reconciliationId || `recon-${Date.now()}`,
		reconciliationDate: recDate,
		periodFrom: pFrom,
		periodTo: pTo,
		acquirerName: acqName,
		status: isBalanced ? "balanced" : "discrepancies_found",
		summary: {
			systemCount: validPayments.length,
			systemTotalKopecks,
			acquirerCount: validStatements.length,
			acquirerGrossKopecks,
			acquirerFeeKopecks,
			acquirerNetKopecks,
			matchedCount: matchedRecords.length,
			matchedGrossKopecks,
			feeDiscrepancyCount: feeDiscrepancies.length,
			feeDiscrepancyKopecks,
			missingInBankCount: missingInBankRecords.length,
			missingInBankKopecks,
			missingInCrmCount: missingInCrmRecords.length,
			missingInCrmKopecks,
		},
		matchedRecords,
		missingInBankRecords,
		missingInCrmRecords,
	});
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUTORY RECONCILIATION PROTOCOL A4 (STRICT ZERO EMOJIS)
// ═══════════════════════════════════════════════════════════════════════════

export function formatReconciliationProtocolA4(
	result: ReconciliationResult,
	clinic: ClinicRequisiteInfo,
	options?: ReconciliationProtocolOptions,
): string {
	const clinicParsed = clinicRequisiteInfoSchema.parse(clinic);
	const protocolNo = options?.protocolNumber || `СВ-${result.reconciliationId.slice(-8)}`;
	const chiefAccountant = options?.chiefAccountant || "Смирнова Е.А.";
	const cashier = options?.cashier || "Барабаш С.В.";
	const sum = result.summary;
	const statusLabel = result.status === "balanced" ? "[СВЕРЕНО: БЕЗ РАСХОЖДЕНИЙ]" : "[ВНИМАНИЕ: ОБНАРУЖЕНЫ РАСХОЖДЕНИЯ]";

	const lines: string[] = [
		"════════════════════════════════════════════════════════════════════════════════",
		"             ПРОТОКОЛ СВЕРКИ ОПЕРАЦИЙ ЭКВАЙРИНГА И КАССОВОЙ ВЫРУЧКИ             ",
		`                    № ${protocolNo} от ${result.reconciliationDate}                     `,
		"════════════════════════════════════════════════════════════════════════════════",
		"",
		`Организация:        ${clinicParsed.name}`,
		`ИНН / КПП:          ${clinicParsed.inn}${clinicParsed.kpp ? ` / ${clinicParsed.kpp}` : ""}`,
		clinicParsed.bankAccount
			? `Расчетный счет:     ${clinicParsed.bankAccount} в ${clinicParsed.bankName || "Банке"}${clinicParsed.bankBik ? ` (БИК ${clinicParsed.bankBik})` : ""}`
			: "",
		`Банк-эквайер:       ${result.acquirerName}`,
		`Период сверки:      с ${result.periodFrom} по ${result.periodTo}`,
		`Статус протокола:   ${statusLabel}`,
		"",
		"────────────────────────────────────────────────────────────────────────────────",
		"1. СВОДНЫЕ ПОКАЗАТЕЛИ СВЕРКИ ОПЕРАЦИЙ",
		"────────────────────────────────────────────────────────────────────────────────",
		"Показатель                                      Количество        Сумма (руб.)  ",
		"────────────────────────────────────────────────────────────────────────────────",
		`Операции по данным учетной системы (CRM):       ${sum.systemCount.toString().padEnd(14)}  ${formatRublesRu(sum.systemTotalKopecks).padStart(16)}`,
		`Операции по выписке банка-эквайера:             ${sum.acquirerCount.toString().padEnd(14)}  ${formatRublesRu(sum.acquirerGrossKopecks).padStart(16)}`,
		`Удержанная комиссия эквайера:                   -               ${formatRublesRu(sum.acquirerFeeKopecks).padStart(16)}`,
		`Сумма к зачислению на р/счет (нетто):           -               ${formatRublesRu(sum.acquirerNetKopecks).padStart(16)}`,
		`Сверено без расхождений:                        ${sum.matchedCount.toString().padEnd(14)}  ${formatRublesRu(sum.matchedGrossKopecks).padStart(16)}`,
		`Расхождения по сумме комиссии:                  ${sum.feeDiscrepancyCount.toString().padEnd(14)}  ${formatRublesRu(sum.feeDiscrepancyKopecks).padStart(16)}`,
		`Не обнаружено в выписке банка (недопоступление):${sum.missingInBankCount.toString().padEnd(14)}  ${formatRublesRu(sum.missingInBankKopecks).padStart(16)}`,
		`Не обнаружено в CRM (неучтенные операции):      ${sum.missingInCrmCount.toString().padEnd(14)}  ${formatRublesRu(sum.missingInCrmKopecks).padStart(16)}`,
		"────────────────────────────────────────────────────────────────────────────────",
	].filter((l) => l.length > 0);

	const feeDiscrepancies = result.matchedRecords.filter((r) => r.hasFeeDiscrepancy);
	if (feeDiscrepancies.length > 0) {
		lines.push(
			"",
			"2. ДЕТАЛИЗАЦИЯ РАСХОЖДЕНИЙ ПО КОМИССИИ ЭКВАЙРИНГА",
			"────────────────────────────────────────────────────────────────────────────────",
			"RRN            Дата       Сумма брутто    Ожид. ком.    Факт. ком.    Разница   ",
			"────────────────────────────────────────────────────────────────────────────────",
		);
		for (const item of feeDiscrepancies) {
			const rrn = (item.rrn || item.systemPaymentId).padEnd(14).slice(0, 14);
			const dt = format1CDate(item.date).padEnd(10);
			const gross = formatRublesRu(item.grossAmountKopecks).padStart(14);
			const expFee = formatRublesRu(item.expectedFeeKopecks).padStart(12);
			const actFee = formatRublesRu(item.actualFeeKopecks).padStart(12);
			const diff = formatRublesRu(item.feeDiscrepancyKopecks).padStart(12);
			lines.push(`${rrn} ${dt} ${gross}  ${expFee}  ${actFee}  ${diff}`);
		}
		lines.push("────────────────────────────────────────────────────────────────────────────────");
	}

	if (result.missingInBankRecords.length > 0) {
		lines.push(
			"",
			"3. ПЛАТЕЖИ, НЕ ПОДТВЕРЖДЕННЫЕ В ВЫПИСКЕ БАНКА (РИСК НЕДОПОСТУПЛЕНИЯ СРЕДСТВ)",
			"────────────────────────────────────────────────────────────────────────────────",
			"ID платежа     RRN            Дата       Пациент             Сумма      ",
			"────────────────────────────────────────────────────────────────────────────────",
		);
		for (const p of result.missingInBankRecords) {
			const id = p.id.padEnd(14).slice(0, 14);
			const rrn = (p.rrn || "-").padEnd(14).slice(0, 14);
			const dt = format1CDate(p.date).padEnd(10);
			const pat = (p.patientName || "Пациент").padEnd(19).slice(0, 19);
			const amt = formatRublesRu(p.amountKopecks).padStart(12);
			lines.push(`${id} ${rrn} ${dt} ${pat} ${amt}`);
		}
		lines.push("────────────────────────────────────────────────────────────────────────────────");
	}

	if (result.missingInCrmRecords.length > 0) {
		lines.push(
			"",
			"4. ОПЕРАЦИИ БАНКА, ОТСУТСТВУЮЩИЕ В УЧЕТНОЙ СИСТЕМЕ CRM (НЕУЧТЕННАЯ ВЫРУЧКА)",
			"────────────────────────────────────────────────────────────────────────────────",
			"ID транзакции  RRN            Дата       Терминал    Карта       Сумма брутто   ",
			"────────────────────────────────────────────────────────────────────────────────",
		);
		for (const s of result.missingInCrmRecords) {
			const id = s.id.padEnd(14).slice(0, 14);
			const rrn = (s.rrn || "-").padEnd(14).slice(0, 14);
			const dt = format1CDate(s.date).padEnd(10);
			const term = (s.terminalId || "-").padEnd(11).slice(0, 11);
			const card = (s.cardMask || "-").padEnd(11).slice(0, 11);
			const amt = formatRublesRu(s.grossAmountKopecks).padStart(14);
			lines.push(`${id} ${rrn} ${dt} ${term} ${card} ${amt}`);
		}
		lines.push("────────────────────────────────────────────────────────────────────────────────");
	}

	lines.push(
		"",
		"ЗАКЛЮЧЕНИЕ:",
		result.status === "balanced"
			? "Настоящим подтверждается полное совпадение данных учетной системы CRM и банковской выписки. Расхождений по выручке и тарифам комиссии не выявлено."
			: "Обнаружены расхождения между данными учетной системы CRM и банковской выпиской. Требуется финансовое расследование и составление претензии в банк-эквайер.",
		"",
		"Настоящий протокол составлен в соответствии с требованиями Федерального закона",
		"от 06.12.2011 № 402-ФЗ «О бухгалтерском учете» и регламентом кассовой дисциплины.",
		"",
		"ПОДПИСИ ОТВЕТСТВЕННЫХ ЛИЦ:",
		"",
		`Главный бухгалтер:                  ____________________ / ${chiefAccountant} /`,
		"",
		`Ответственный за кассу:             ____________________ / ${cashier} /`,
		"",
		`Дата формирования протокола:        ${result.reconciliationDate}`,
		"════════════════════════════════════════════════════════════════════════════════",
	);

	return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// DENTALPIN PREVIEW ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

export function buildAccountingExportPreview(registry: BankStatementRegistry): ExportPreview {
	const parsed = bankStatementRegistrySchema.parse(registry);
	let invoiceCount = 0;
	let paymentCount = 0;
	let totalAmountKopecks = 0;
	let totalVatKopecks = 0;

	for (const order of parsed.orders) {
		paymentCount++;
		totalAmountKopecks += order.amountKopecks;
		totalVatKopecks += order.vatAmountKopecks ?? 0;
		if (order.operationType === "receipt") {
			invoiceCount++;
		}
	}

	const totalBaseKopecks = Math.max(0, totalAmountKopecks - totalVatKopecks);
	const sampleOrders = parsed.orders.slice(0, 5).map((o) => ({
		number: o.number,
		date: o.date,
		amountRub: formatAmount1C(o.amountKopecks),
		purpose: o.paymentPurpose,
		payer: o.payerName,
		recipient: o.recipientName,
	}));

	return exportPreviewSchema.parse({
		invoiceCount,
		paymentCount,
		totalBaseKopecks,
		totalVatKopecks,
		totalAmountKopecks,
		sampleOrders,
	});
}

/**
 * export1CXmlFormatter.ts — 1C:Enterprise Client-Bank Format 1.03 & EnterpriseData XML Generator.
 * Wave 130 & Mandate 8b (<= 120 lines).
 */

import { kopecksToRub } from "../../fiscal/kopecksArithmetic.js";
import {
	bankStatementRegistrySchema, type BankStatementRegistry, CLIENT_BANK_ENCODING,
	CLIENT_BANK_EXCHANGE_VERSION, DEFAULT_PAYMENT_KIND, DEFAULT_PAYMENT_PRIORITY,
	DEFAULT_PAYMENT_TYPE_CODE, DEFAULT_RECIPIENT_PROGRAM, DEFAULT_SENDER_PROGRAM,
} from "./exportTypes.js";

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

export function generate1CBankStatement(registry: BankStatementRegistry): string {
	const parsed = bankStatementRegistrySchema.parse(registry);
	let totalRec = 0, totalDed = 0;
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
		`ДатаСоздания=${createDate}`, `ВремяСоздания=${createTime}`,
		`ДатаНачала=${dateFrom}`, `ДатаКонца=${dateTo}`,
		`РасчСчет=${parsed.accountNumber}`,
		"СекцияРасчСчет",
		`ДатаНачала=${dateFrom}`, `ДатаКонца=${dateTo}`,
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
			`Номер=${o.number}`, `Дата=${format1CDate(o.date)}`, `Сумма=${formatAmount1C(o.amountKopecks)}`,
			`ПлательщикСчет=${o.payerAccount}`, `Плательщик=${o.payerName}`,
			`ПлательщикИНН=${o.payerInn || ""}`, `ПлательщикКПП=${o.payerKpp || ""}`,
			`Плательщик1=${o.payerName}`, `ПлательщикРасчСчет=${o.payerAccount}`,
			`ПлательщикБанк1=${o.payerBankName}`, `ПлательщикБИК=${o.payerBankBik}`,
			`ПлательщикКорсчет=${o.payerBankCorrAccount || ""}`,
			`ПолучательСчет=${o.recipientAccount}`, `Получатель=${o.recipientName}`,
			`ПолучательИНН=${o.recipientInn || ""}`, `ПолучательКПП=${o.recipientKpp || ""}`,
			`Получатель1=${o.recipientName}`, `ПолучательРасчСчет=${o.recipientAccount}`,
			`ПолучательБанк1=${o.recipientBankName}`, `ПолучательБИК=${o.recipientBankBik}`,
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

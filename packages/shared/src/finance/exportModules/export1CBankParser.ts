/**
 * export1CBankParser.ts — 1C:Enterprise Client-Bank Exchange Format 1.03 Text Parser.
 * Wave 130 & Mandate 8b (<= 120 lines).
 */

import { rublesToKopecks } from "../../money.js";
import {
	type BankStatementOrder,
	type BankStatementRegistry,
	bankStatementRegistrySchema,
	type BankStatementOperationType,
	DEFAULT_PAYMENT_KIND,
	DEFAULT_PAYMENT_TYPE_CODE,
	DEFAULT_RECIPIENT_PROGRAM,
	DEFAULT_SENDER_PROGRAM,
} from "./exportTypes.js";

function parseRubStringToKopecks(val: string | undefined): number {
	if (!val) return 0;
	const parsed = Number.parseFloat(val.replace(/\s+/g, "").replace(",", "."));
	return Number.isFinite(parsed) ? rublesToKopecks(parsed) : 0;
}

export function parse1CBankStatement(
	rawText: string,
	clinicInfo?: {
		readonly clinicName?: string | undefined;
		readonly clinicInn?: string | undefined;
		readonly clinicKpp?: string | null | undefined;
	},
): BankStatementRegistry {
	const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
	if (rawLines.length === 0 || rawLines[0] !== "1CClientBankExchange") {
		throw new Error("Невалидный файл выгрузки 1С: отсутствует заголовок 1CClientBankExchange.");
	}

	const headerMap: Record<string, string> = {};
	let idx = 1;
	while (idx < rawLines.length) {
		const line = rawLines[idx];
		if (line === undefined || line.startsWith("СекцияРасчСчет") || line.startsWith("СекцияДокумент")) break;
		const [k, ...vParts] = line.split("=");
		if (k && vParts.length > 0) headerMap[k.trim()] = vParts.join("=").trim();
		idx++;
	}

	let openingBalanceKopecks = 0;
	let totalReceivedKopecks = 0;
	let totalDeductedKopecks = 0;
	let closingBalanceKopecks = 0;
	let sectionAccount = headerMap["РасчСчет"] || "";

	if (idx < rawLines.length && rawLines[idx]?.startsWith("СекцияРасчСчет")) {
		idx++;
		while (idx < rawLines.length) {
			const line = rawLines[idx];
			if (line === undefined) break;
			if (line === "КонецРасчСчет") {
				idx++;
				break;
			}
			const [k, ...vParts] = line.split("=");
			const key = k?.trim();
			const val = vParts.join("=").trim();
			if (key === "РасчСчет") sectionAccount = val;
			if (key === "НачальныйОстаток") openingBalanceKopecks = parseRubStringToKopecks(val);
			if (key === "ВсегоПоступило") totalReceivedKopecks = parseRubStringToKopecks(val);
			if (key === "ВсегоСписано") totalDeductedKopecks = parseRubStringToKopecks(val);
			if (key === "КонечныйОстаток") closingBalanceKopecks = parseRubStringToKopecks(val);
			idx++;
		}
	}

	const orders: BankStatementOrder[] = [];
	while (idx < rawLines.length) {
		const line = rawLines[idx];
		if (line === undefined) break;
		if (line.startsWith("СекцияДокумент")) {
			const docType = line.split("=")[1]?.trim() || "Платежное поручение";
			idx++;
			const docMap: Record<string, string> = {};
			while (idx < rawLines.length) {
				const docLine = rawLines[idx];
				if (docLine === undefined) break;
				if (docLine === "КонецДокумента") {
					idx++;
					break;
				}
				const [k, ...vParts] = docLine.split("=");
				if (k && vParts.length > 0) docMap[k.trim()] = vParts.join("=").trim();
				idx++;
			}

			const amountKopecks = parseRubStringToKopecks(docMap["Сумма"]);
			const recipientAcc = docMap["ПолучательРасчСчет"] || docMap["ПолучательСчет"] || "";
			const payerAcc = docMap["ПлательщикРасчСчет"] || docMap["ПлательщикСчет"] || "";
			const opType: BankStatementOperationType = recipientAcc === sectionAccount && sectionAccount !== "" ? "receipt" : "expense";

			orders.push({
				id: `order-${orders.length + 1}-${docMap["Номер"] || "0"}`,
				documentType: docType,
				number: docMap["Номер"] || String(orders.length + 1),
				date: docMap["Дата"] || headerMap["ДатаСоздания"] || "",
				amountKopecks,
				operationType: opType,
				payerAccount: payerAcc,
				payerName: docMap["Плательщик"] || docMap["Плательщик1"] || "",
				payerInn: docMap["ПлательщикИНН"] || null,
				payerKpp: docMap["ПлательщикКПП"] || null,
				payerBankBik: docMap["ПлательщикБИК"] || "",
				payerBankName: docMap["ПлательщикБанк1"] || "",
				payerBankCorrAccount: docMap["ПлательщикКорсчет"] || null,
				recipientAccount: recipientAcc,
				recipientName: docMap["Получатель"] || docMap["Получатель1"] || "",
				recipientInn: docMap["ПолучательИНН"] || null,
				recipientKpp: docMap["ПолучательКПП"] || null,
				recipientBankBik: docMap["ПолучательБИК"] || "",
				recipientBankName: docMap["ПолучательБанк1"] || "",
				recipientBankCorrAccount: docMap["ПолучательКорсчет"] || null,
				paymentPurpose: docMap["НазначениеПлатежа"] || "",
				paymentKind: docMap["ВидПлатежа"] || DEFAULT_PAYMENT_KIND,
				paymentTypeCode: docMap["ВидОплаты"] || DEFAULT_PAYMENT_TYPE_CODE,
				priority: Number.parseInt(docMap["Очередность"] || "5", 10) || 5,
				vatRate: docMap["СтавкаНДС"] || "Без НДС",
				vatAmountKopecks: 0,
			});
		} else {
			idx++;
		}
	}

	return bankStatementRegistrySchema.parse({
		registryId: `parsed-registry-${Date.now()}`,
		accountNumber: sectionAccount,
		bankBik: orders[0]?.recipientBankBik || orders[0]?.payerBankBik || "",
		bankName: orders[0]?.recipientBankName || orders[0]?.payerBankName || "",
		bankCorrAccount: null,
		clinicName: clinicInfo?.clinicName || headerMap["Отправитель"] || "",
		clinicInn: clinicInfo?.clinicInn || "",
		clinicKpp: clinicInfo?.clinicKpp ?? null,
		dateFrom: headerMap["ДатаНачала"] || "",
		dateTo: headerMap["ДатаКонца"] || "",
		createdAt: headerMap["ДатаСоздания"] || undefined,
		senderProgram: headerMap["Отправитель"] || DEFAULT_SENDER_PROGRAM,
		recipientProgram: headerMap["Получатель"] || DEFAULT_RECIPIENT_PROGRAM,
		openingBalanceKopecks,
		orders,
		totalReceivedKopecks,
		totalDeductedKopecks,
		closingBalanceKopecks,
	});
}

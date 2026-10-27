/**
 * export1CBankParser.ts — 1C:Enterprise Client-Bank Exchange Format 1.03 Text Parser.
 * Wave 130 & Mandate 8b (<= 120 lines).
 */

import {
	type BankStatementOrder, type BankStatementRegistry, bankStatementRegistrySchema,
	type BankStatementOperationType, DEFAULT_PAYMENT_KIND, DEFAULT_PAYMENT_TYPE_CODE,
	DEFAULT_RECIPIENT_PROGRAM, DEFAULT_SENDER_PROGRAM,
} from "./exportTypes.js";

export function parse1CBankStatement(rawText: string): BankStatementRegistry {
	const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
	if (rawLines.length === 0 || rawLines[0] !== "1CClientBankExchange") {
		throw new Error("Невалидный файл выгрузки 1С: отсутствует заголовок 1CClientBankExchange.");
	}

	const headerMap: Record<string, string> = {};
	let idx = 1;
	while (idx < rawLines.length) {
		const line = rawLines[idx]!;
		if (line.startsWith("СекцияРасчСчет") || line.startsWith("СекцияДокумент")) break;
		const [k, ...vParts] = line.split("=");
		if (k && vParts.length > 0) headerMap[k.trim()] = vParts.join("=").trim();
		idx++;
	}

	let openingBalanceKopecks = 0, totalReceivedKopecks = 0, totalDeductedKopecks = 0, closingBalanceKopecks = 0;
	let sectionAccount = headerMap["РасчСчет"] || "";

	if (idx < rawLines.length && rawLines[idx]?.startsWith("СекцияРасчСчет")) {
		idx++;
		while (idx < rawLines.length) {
			const line = rawLines[idx]!;
			if (line === "КонецРасчСчет") { idx++; break; }
			const [k, ...vParts] = line.split("=");
			const key = k?.trim(), val = vParts.join("=").trim();
			if (key === "РасчСчет") sectionAccount = val;
			if (key === "НачальныйОстаток") openingBalanceKopecks = Math.round(parseFloat(val || "0") * 100);
			if (key === "ВсегоПоступило") totalReceivedKopecks = Math.round(parseFloat(val || "0") * 100);
			if (key === "ВсегоСписано") totalDeductedKopecks = Math.round(parseFloat(val || "0") * 100);
			if (key === "КонечныйОстаток") closingBalanceKopecks = Math.round(parseFloat(val || "0") * 100);
			idx++;
		}
	}

	const orders: BankStatementOrder[] = [];
	while (idx < rawLines.length) {
		const line = rawLines[idx]!;
		if (line.startsWith("СекцияДокумент")) {
			const docType = line.split("=")[1]?.trim() || "Платежное поручение";
			idx++;
			const docMap: Record<string, string> = {};
			while (idx < rawLines.length) {
				const docLine = rawLines[idx]!;
				if (docLine === "КонецДокумента") { idx++; break; }
				const [k, ...vParts] = docLine.split("=");
				if (k && vParts.length > 0) docMap[k.trim()] = vParts.join("=").trim();
				idx++;
			}

			const amountKopecks = Math.round(parseFloat(docMap["Сумма"] || "0") * 100);
			const recipientAcc = docMap["ПолучательРасчСчет"] || docMap["ПолучательСчет"] || "";
			const payerAcc = docMap["ПлательщикРасчСчет"] || docMap["ПлательщикСчет"] || "";
			const opType: BankStatementOperationType = recipientAcc === sectionAccount ? "receipt" : "expense";

			orders.push({
				id: `order-${orders.length + 1}-${docMap["Номер"] || "0"}`,
				documentType: docType,
				number: docMap["Номер"] || String(orders.length + 1),
				date: docMap["Дата"] || headerMap["ДатаСоздания"] || "01.01.2026",
				amountKopecks, operationType: opType,
				payerAccount: payerAcc, payerName: docMap["Плательщик"] || docMap["Плательщик1"] || "",
				payerInn: docMap["ПлательщикИНН"] || null, payerKpp: docMap["ПлательщикКПП"] || null,
				payerBankBik: docMap["ПлательщикБИК"] || "044525225", payerBankName: docMap["ПлательщикБанк1"] || "",
				payerBankCorrAccount: docMap["ПлательщикКорсчет"] || null,
				recipientAccount: recipientAcc, recipientName: docMap["Получатель"] || docMap["Получатель1"] || "",
				recipientInn: docMap["ПолучательИНН"] || null, recipientKpp: docMap["ПолучательКПП"] || null,
				recipientBankBik: docMap["ПолучательБИК"] || "044525225", recipientBankName: docMap["ПолучательБанк1"] || "",
				recipientBankCorrAccount: docMap["ПолучательКорсчет"] || null,
				paymentPurpose: docMap["НазначениеПлатежа"] || "Оплата медицинских услуг",
				paymentKind: docMap["ВидПлатежа"] || DEFAULT_PAYMENT_KIND,
				paymentTypeCode: docMap["ВидОплаты"] || DEFAULT_PAYMENT_TYPE_CODE,
				priority: parseInt(docMap["Очередность"] || "5", 10) || 5,
				vatRate: docMap["СтавкаНДС"] || "Без НДС", vatAmountKopecks: 0,
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
		bankCorrAccount: null, clinicName: headerMap["Отправитель"] || "Клиника", clinicInn: "7707083893", clinicKpp: null,
		dateFrom: headerMap["ДатаНачала"] || "01.01.2026", dateTo: headerMap["ДатаКонца"] || "31.12.2026",
		createdAt: headerMap["ДатаСоздания"] || "01.01.2026", senderProgram: headerMap["Отправитель"] || DEFAULT_SENDER_PROGRAM,
		recipientProgram: headerMap["Получатель"] || DEFAULT_RECIPIENT_PROGRAM,
		openingBalanceKopecks, orders, totalReceivedKopecks, totalDeductedKopecks, closingBalanceKopecks,
	});
}

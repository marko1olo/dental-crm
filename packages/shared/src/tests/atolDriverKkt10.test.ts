import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildAtol10ReceiptJson,
	buildAtolFiscalQrString,
	parseAtol10ErrorCode,
	type Atol10FiscalReceiptRequest,
} from "../hardware/atolDriverKkt10.js";

describe("ATOL KKT Driver 10 & 54-FZ Protocol Engine (atolDriverKkt10.test.ts)", () => {
	const sampleReceiptRequest: Atol10FiscalReceiptRequest = {
		type: "sell",
		electronical: false,
		taxationType: "usn_income",
		operator: {
			name: "Кассир / Администратор Петрова А.В.",
			vatin: "770123456789",
		},
		clientInfo: {
			name: "Иванов Иван Иванович",
			emailOrPhone: "+79991234567",
		},
		items: [
			{
				name: "Прием (осмотр, консультация) врача-стоматолога первичный",
				price: 1500.0,
				quantity: 1,
				amount: 1500.0,
				department: 1,
				paymentMethod: "full_payment",
				paymentObject: "service",
				tax: { type: "vat_none" },
				medicalServiceCode804n: "B01.065.001",
			},
			{
				name: "Ультракаин Д-С форте 1.7 мл (маркированный)",
				price: 650.0,
				quantity: 1,
				amount: 650.0,
				department: 1,
				paymentMethod: "full_payment",
				paymentObject: "excisable_goods_with_marking",
				tax: { type: "vat_10" },
				markingCode: {
					raw: "0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
					plannedStatus: 1,
				},
			},
		],
		payments: [
			{
				type: "electronically",
				sum: 2150.0,
			},
		],
		total: 2150.0,
	};

	it("1. Generates valid ATOL 10 JSON command object without Math.random()", () => {
		const json1 = buildAtol10ReceiptJson(sampleReceiptRequest);
		const json2 = buildAtol10ReceiptJson(sampleReceiptRequest);

		assert.ok(typeof json1.uuid === "string");
		assert.ok(typeof json2.uuid === "string");
		assert.notEqual(json1.uuid, json2.uuid);
		assert.match(json1.uuid as string, /^dente-\d+-[a-z0-9]{6}$/);
		assert.match(json2.uuid as string, /^dente-\d+-[a-z0-9]{6}$/);

		// Respects explicit machineUuid override
		const overridden = buildAtol10ReceiptJson(sampleReceiptRequest, {
			machineUuid: "pos-terminal-kabinet-3-custom-uuid",
		});
		assert.equal(overridden.uuid, "pos-terminal-kabinet-3-custom-uuid");
	});

	it("2. Correctly formats 54-FZ receipt items, 804n codes, and DataMatrix marking", () => {
		const json = buildAtol10ReceiptJson(sampleReceiptRequest);
		const req = json.request as Record<string, unknown>;

		assert.equal(req.type, "sell");
		assert.equal(req.electronically, false);
		assert.equal(req.taxationType, "usnIncome");
		assert.equal(req.total, 2150);

		const items = req.items as Array<Record<string, unknown>>;
		assert.equal(items.length, 2);

		// Service item with 804n code
		const serviceItem = items[0]!;
		assert.equal(serviceItem.type, "position");
		assert.equal(serviceItem.name, "Прием (осмотр, консультация) врача-стоматолога первичный");
		assert.equal(serviceItem.price, 1500);
		assert.equal(serviceItem.amount, 1500);
		assert.deepEqual(serviceItem.userAttribute, {
			name: "Код номенклатуры 804н",
			value: "B01.065.001",
		});

		// Marked drug item with DataMatrix tag
		const markedItem = items[1]!;
		assert.equal(markedItem.name, "Ультракаин Д-С форте 1.7 мл (маркированный)");
		assert.deepEqual(markedItem.markingCode, {
			type: "auto",
			mark: "0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234",
			plannedStatus: 1,
		});
	});

	it("3. Builds standard FTS 54-FZ QR code string", () => {
		const qr = buildAtolFiscalQrString({
			issuedAt: new Date("2026-09-15T14:35:00.000Z"),
			totalRub: 2150.0,
			fnSerial: "9999078900012345",
			fiscalDocNum: 1042,
			fiscalSign: "3892019482",
			operationType: "income",
		});

		assert.ok(qr.includes("s=2150.00"));
		assert.ok(qr.includes("fn=9999078900012345"));
		assert.ok(qr.includes("i=1042"));
		assert.ok(qr.includes("fp=3892019482"));
		assert.ok(qr.includes("n=1")); // FFD 1.2 Tag 1054 operation code for income
	});

	it("4. Translates ATOL 10 error codes to human-readable Russian diagnostics", () => {
		assert.equal(parseAtol10ErrorCode(0), "Ошибок нет (Успешно)");
		assert.equal(parseAtol10ErrorCode(1), "Нет бумаги в печатающем механизме ККТ");
		assert.equal(parseAtol10ErrorCode(2), "Открыта крышка корпуса ККТ");
		assert.equal(
			parseAtol10ErrorCode(3),
			"Смена в ККТ превысила 24 часа. Требуется закрытие смены (Z-отчет)",
		);
		assert.equal(
			parseAtol10ErrorCode(8),
			"Недопустимый код маркировки Честный ЗНАК / МДЛП (Тег 1162/1163)",
		);
		assert.equal(
			parseAtol10ErrorCode(999),
			"Неизвестная ошибка драйвера АТОЛ (Код: 999)",
		);
	});
});

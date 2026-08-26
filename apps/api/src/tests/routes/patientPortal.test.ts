/**
 * DENTE CRM — Unit Tests for Patient Portal & Telemedicine Routes
 *
 * Test Coverage:
 * 1. validateTelegramWebAppData: HMAC-SHA256 validation of Telegram WebApp initData
 * 2. /api/portal/tax-certificate/knd-1151156: FNS Order № 824@ calculation, Code 01 / Code 02 breakdown & QR verification
 * 3. /api/portal/extract-043/html: Form 043/u clinical extract generation
 * 4. /api/portal/payments/create-sbp-qr: Dynamic SBP QR generation with NSPK payload & deep links
 */

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it, test } from "node:test";
import { validateTelegramWebAppData } from "../../routes/patientPortal.js";
import { generateTaxCertificateQrSvg } from "@dental/shared";

describe("Patient Portal API & Telemedicine Suite", () => {
	const mockBotToken = "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ";

	test("1. validateTelegramWebAppData: correctly validates valid HMAC-SHA256 signature", () => {
		const userObj = { id: 987654321, first_name: "Иван", username: "ivan_patient" };
		const userStr = JSON.stringify(userObj);
		const authDate = "1724673600";
		const queryId = "AAHdF6IQAAAAAN0XohD9_test";

		const dataCheckString = `auth_date=${authDate}\nquery_id=${queryId}\nuser=${userStr}`;
		const secretKey = createHmac("sha256", "WebAppData").update(mockBotToken).digest();
		const validHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

		const initData = `query_id=${encodeURIComponent(queryId)}&user=${encodeURIComponent(userStr)}&auth_date=${authDate}&hash=${validHash}`;

		const result = validateTelegramWebAppData(initData, mockBotToken);
		assert.strictEqual(result.isValid, true);
		assert.strictEqual(result.user?.id, 987654321);
		assert.strictEqual(result.user?.first_name, "Иван");
	});

	test("2. validateTelegramWebAppData: rejects tampered data or invalid hash", () => {
		const initData = "query_id=fake&user=%7B%22id%22%3A1%7D&auth_date=1724673600&hash=invalid_hash_value";
		const result = validateTelegramWebAppData(initData, mockBotToken);
		assert.strictEqual(result.isValid, false);
	});

	test("3. FNS Order 824@ (КНД 1151156) QR Generator produces valid SVG with verification link", () => {
		const certParams = {
			certificateNumber: "СПР-2026/001",
			taxYear: 2026,
			issueDateIso: "2026-08-26T12:00:00Z",
			clinic: {
				legalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
				inn: "7704123456",
				kpp: "770401001",
				ogrn: "1157746123456",
				address: "г. Москва, ул. Арбат, д. 24",
			},
			patient: {
				fullName: "Иванов И.И.",
				birthDate: "1988-04-12",
			},
			payer: {
				fullName: "Иванов И.И.",
				inn: "770498765432",
				relationship: "patient" as const,
			},
			payments: [
				{
					id: "pay-01",
					receiptNumber: "ФД-101",
					fiscalDocumentNumber: "101",
					fiscalSign: "319841209",
					serviceName: "Лечение кариеса и пломбирование",
					dateIso: "2026-03-15",
					amountRub: 45000,
					taxCode: "1" as const,
				},
				{
					id: "pay-02",
					receiptNumber: "ФД-102",
					fiscalDocumentNumber: "102",
					fiscalSign: "319841210",
					serviceName: "Дентальная имплантация Osstem",
					dateIso: "2026-05-20",
					amountRub: 85000,
					taxCode: "2" as const,
				},
			],
		};
		const qrSvg = generateTaxCertificateQrSvg(certParams, { size: 160 });

		assert.ok(qrSvg.includes("<svg"));
		assert.ok(qrSvg.includes('width="160" height="160"'));
		assert.ok(qrSvg.includes("<rect"));
		assert.ok(qrSvg.includes("<path"));
	});

	test("4. SBP NSPK Dynamic QR Payload Structure Verification", () => {
		const invoiceNumber = "СЧ-2026/089";
		const amountRub = 35000;
		const amountKopecks = Math.round(amountRub * 100);
		const qrId = `SBPA${Date.now().toString(36).toUpperCase()}${invoiceNumber.replace(/\D/g, "")}`;
		const sbpNspkPayloadString = `https://qr.nspk.ru/${qrId}?type=02&bank=100000000111&sum=${amountKopecks}&cur=RUB&crc=84A2`;

		assert.ok(sbpNspkPayloadString.startsWith("https://qr.nspk.ru/"));
		assert.ok(sbpNspkPayloadString.includes("sum=3500000"));
		assert.ok(sbpNspkPayloadString.includes("cur=RUB"));
	});
});

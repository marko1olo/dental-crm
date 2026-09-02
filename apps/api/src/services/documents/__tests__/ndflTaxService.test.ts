import assert from "node:assert";
import { describe, test } from "node:test";
import { NdflTaxService } from "../ndflTaxService.js";
import { type FnsTaxPayload } from "@dental/shared";

describe("FNS NDFL Tax Service & Anti-Anomaly Controls Suite (Feature #33 & #5)", () => {
	const testPayload: FnsTaxPayload = {
		documentNumber: "СПР-2026/100",
		documentDate: "2026-04-01",
		taxYear: 2025,
		taxInspectionCode: "7701",
		certificateKind: "1",
		correctionNumber: 0,
		softwareVersion: "DENTE Dental CRM 2.0",
		clinic: {
			inn: "7701234560",
			kpp: "770101001",
			ogrn: "1027700132195",
			name: "ООО СТОМАТОЛОГИЯ ДЕНТЕ",
			directorName: "Смирнов Алексей Владимирович",
			directorSnils: "11223344595",
			license: {
				number: "ЛО41-01137-77/00368421",
				date: "2021-04-12",
				issuer: "Департамент здравоохранения города Москвы",
			},
		},
		payer: {
			fullName: {
				family: "Кузнецов",
				given: "Дмитрий",
				patronymic: "Сергеевич",
			},
			inn: "770212345681",
			snils: "11223344595",
			birthDate: "1980-03-15",
			identityDocument: {
				docTypeCode: "21",
				seriesAndNumber: "4509 987654",
				issueDate: "2010-05-20",
			},
		},
		patient: {
			patientKinshipCode: "1",
		},
		receipts: [
			{
				id: "rec-1",
				receiptNumber: "ЧЕК-101",
				fiscalDocumentNumber: "501",
				receiptDate: "2025-02-10",
				serviceName: "Терапевтическое лечение кариеса",
				deductionCode: "1",
				amountRub: 60000,
			},
			{
				id: "rec-2",
				receiptNumber: "ЧЕК-102",
				fiscalDocumentNumber: "502",
				receiptDate: "2025-05-15",
				serviceName: "Ортодонтическое лечение элайнерами",
				deductionCode: "1",
				amountRub: 140000,
			},
			{
				id: "rec-3",
				receiptNumber: "ЧЕК-103",
				fiscalDocumentNumber: "503",
				receiptDate: "2025-08-20",
				serviceName: "Дентальная имплантация Astra Tech и синус-лифтинг",
				deductionCode: "2",
				amountRub: 250000,
			},
		],
		expenses: {
			code1AmountRub: 200000,
			code2AmountRub: 250000,
		},
		signatory: {
			signatoryRole: "1",
			fullName: {
				family: "Смирнов",
				given: "Алексей",
				patronymic: "Владимирович",
			},
			snils: "11223344595",
		},
	};

	test("1.1 NdflTaxService.generateXml produces compliant XML for FNS EDO", () => {
		const result = NdflTaxService.generateXml(testPayload);
		assert.strictEqual(result.isValidForSubmission, true);
		assert.strictEqual(result.code1Rub, 200000);
		assert.strictEqual(result.code2Rub, 250000);
		assert.strictEqual(result.totalRub, 450000);

		// Code 01 capped at 150 000 ₽ -> 13% = 19 500 ₽
		// Code 02 uncapped at 250 000 ₽ -> 13% = 32 500 ₽
		// Total refund = 52 000 ₽
		assert.strictEqual(result.estimatedTaxRefundRub, 52000);
		assert.ok(result.xmlContent.includes("NO_MEDOPL_7701234560770101001_7701_"));
		assert.ok(result.xmlContent.includes("<СведРасхУсл КодУслуг=\"1\" СумОпл=\"200000.00\"/>"));
		assert.ok(result.xmlContent.includes("<СведРасхУсл КодУслуг=\"2\" СумОпл=\"250000.00\"/>"));
	});
});

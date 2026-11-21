import { describe, it, expect } from "vitest";
import { buildTaxCertificateDocumentData } from "../taxCertificateEngine";

describe("Domain 13 Red Team Proof Suite (Frontend)", () => {
	it("DEF-1: buildTaxCertificateDocumentData preserves exact 50 kopecks without integer truncation", () => {
		const docData = buildTaxCertificateDocumentData({
			documentNumber: "TEST-01",
			issueDateIso: "2024-05-15T12:00:00.000Z",
			taxYear: 2024,
			clinicName: "Клиника ДЕНТЕ",
			clinicInn: "7701234567",
			clinicOgrn: "1234567890123",
			clinicLicense: "ЛО-77-01-000000",
			clinicAddress: "г. Москва, ул. Примерная, д. 1",
			doctorFullName: "Смирнов А.В.",
			patient: {
				fullName: "Иванов Иван Иванович",
				birthDate: "1990-01-01",
				passport: "4510 123456",
			},
			receiptsCount: 1,
			totalAmountKopecks: 125050, // 1 250 руб 50 коп
			code01Kopecks: 125050,
			code02Kopecks: 0,
		});

		// Раньше из-за Number(code01KopecksBi / 100n) копейки отбрасывались до 1250
		expect(docData.aggregation.code01Rub).toBe(1250.5);
		expect(docData.aggregation.totalNetRub).toBe(1250.5);
		expect(docData.aggregation.eligibleCode01Rub).toBe(1250.5);
		// 13% от 1250.50 = 162.565 руб -> (125050 * 13) / 100 = 16256 копеек -> 162.56 руб
		expect(docData.aggregation.estimatedRefund13Rub).toBe(162.56);
	});
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFnsKnd1151156Xml,
	formatFnsDate,
	generateFnsFileNameAndId,
} from "../../services/fns/fnsKnd1151156Builder.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";
import type { GeneratedDocument, Patient, Payment, ClinicProfile } from "@dental/shared";

describe("FNS 13% NDFL Tax Exporter (КНД 1151156 Format 5.01 / Приказ ЕА-7-11/824@)", () => {
	it("1.1 Formats date strings to DD.MM.YYYY format", () => {
		assert.equal(formatFnsDate("2026-08-19"), "19.08.2026");
		assert.equal(formatFnsDate("19.08.2026"), "19.08.2026");
		assert.equal(formatFnsDate("20260819"), "19.08.2026");
	});

	it("1.2 Generates valid file name and file ID per FNS schema requirements", () => {
		const result = generateFnsFileNameAndId(
			"7701",
			"7701234567",
			"770101001",
			"19.08.2026",
			"a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
		);

		assert.ok(result.fileName.startsWith("UT_SVOPLMEDUSL_7701_7701_7701234567770101001_20260819_"));
		assert.ok(result.fileName.endsWith(".xml"));
		assert.equal(result.uuid, "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d");
	});

	it("1.3 Generates compliant XML with Code 01 and Code 02 expense splitting", () => {
		const payload = {
			taxInspectionCode: "7701",
			documentNumber: "105",
			documentDate: "2026-08-19",
			taxYear: "2025",
			certificateKind: "1" as const,
			clinic: {
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1157746123456",
				name: "ООО СТОМАТОЛОГИЯ ДЕНТЕ",
				license: {
					number: "ЛО-77-01-012345",
					date: "2020-05-15",
				},
			},
			payer: {
				inn: "770112345678",
				snils: "123-456-789 01",
				birthDate: "1985-06-15",
				fullName: {
					family: "Иванов",
					given: "Иван",
					patronymic: "Иванович",
				},
				identityDocument: {
					docTypeCode: "21",
					seriesAndNumber: "4510 123456",
					issueDate: "2005-07-20",
				},
			},
			patient: {
				patientKinshipCode: "1" as const, // Self
			},
			expenses: {
				code1AmountRub: 15400.5,
				code2AmountRub: 85000.0,
			},
			signatory: {
				signatoryRole: "1" as const, // Head
				fullName: {
					family: "Петров",
					given: "Петр",
					patronymic: "Сергеевич",
				},
			},
		};

		const { xmlContent, fileName } = buildFnsKnd1151156Xml(payload, "test-uuid-1");

		assert.ok(xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xmlContent.includes('КНД="1184043"'));
		assert.ok(xmlContent.includes('ВерсФорм="5.01"'));
		assert.ok(xmlContent.includes('ГодУсл="2025"'));
		assert.ok(xmlContent.includes('ИННЮЛ="7701234567"'));
		assert.ok(xmlContent.includes('КодУслуг="1" СумОпл="15400.50"'));
		assert.ok(xmlContent.includes('КодУслуг="2" СумОпл="85000.00"'));
		assert.ok(xmlContent.includes('<СвПациент ПризнПац="1"/>'));
		assert.ok(fileName.endsWith(".xml"));
	});

	it("1.4 Handles family member kinship codes (e.g. child 4, spouse 2) with full patient block", () => {
		const payload = {
			taxInspectionCode: "7701",
			documentNumber: "106",
			documentDate: "2026-08-19",
			taxYear: "2025",
			certificateKind: "1" as const,
			clinic: {
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1157746123456",
				name: "ООО ДЕНТЕ",
			},
			payer: {
				inn: "770112345678",
				birthDate: "1980-01-10",
				fullName: {
					family: "Иванов",
					given: "Иван",
				},
			},
			patient: {
				patientKinshipCode: "4" as const, // Child
				birthDate: "2015-09-20",
				fullName: {
					family: "Иванова",
					given: "Мария",
					patronymic: "Ивановна",
				},
				identityDocument: {
					docTypeCode: "03", // Birth certificate
					seriesAndNumber: "II-МЮ 123456",
					issueDate: "2015-10-01",
				},
			},
			expenses: {
				code1AmountRub: 12000.0,
			},
			signatory: {
				signatoryRole: "1" as const,
				fullName: {
					family: "Петров",
					given: "Петр",
				},
			},
		};

		const { xmlContent } = buildFnsKnd1151156Xml(payload, "test-uuid-2");

		assert.ok(xmlContent.includes('<СвПациент ПризнПац="4" ДатаРожд="20.09.2015">'));
		assert.ok(xmlContent.includes('<ФИО Фамилия="Иванова" Имя="Мария" Отчество="Ивановна"/>'));
		assert.ok(xmlContent.includes('<УдЛичнФЛ КодВидДок="03"'));
	});

	it("1.5 Validates kopeck integer arithmetic without floating point degradation", () => {
		const doc: GeneratedDocument = {
			id: "doc-1",
			organizationId: "org-1",
			patientId: "pat-1",
			kind: "tax_deduction_certificate",
			title: "Справка об оплате медицинских услуг",
			status: "issued",
			issuedAt: "2026-08-19T10:00:00.000Z",
			taxYear: 2025,
			totalAmountRub: 1110.99,
			createdAt: "2026-08-19T10:00:00.000Z",
			updatedAt: "2026-08-19T10:00:00.000Z",
		};

		const patient: Patient = {
			id: "pat-1",
			organizationId: "org-1",
			fullName: "Иванов Иван Иванович",
			birthDate: "1990-05-10",
			phone: "+79991112233",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		};

		const payments: Payment[] = [
			{
				id: "pay-1",
				organizationId: "org-1",
				patientId: "pat-1",
				amountRub: 555.5,
				paidAt: "2025-06-10T12:00:00.000Z",
				payerFullName: "Иванов Иван Иванович",
				payerInn: "770112345678",
				payerBirthDate: "1990-05-10",
				payerRelationship: "self",
				taxDeductionCode: "1",
				status: "paid",
				method: "card",
				createdAt: "2025-06-10T12:00:00.000Z",
			},
			{
				id: "pay-2",
				organizationId: "org-1",
				patientId: "pat-1",
				amountRub: 555.49,
				paidAt: "2025-07-15T12:00:00.000Z",
				payerFullName: "Иванов Иван Иванович",
				payerInn: "770112345678",
				payerBirthDate: "1990-05-10",
				payerRelationship: "self",
				taxDeductionCode: "1",
				status: "paid",
				method: "card",
				createdAt: "2025-07-15T12:00:00.000Z",
			},
		];

		const clinicProfile: ClinicProfile = {
			clinicName: "ООО ДЕНТЕ",
			legalName: "ООО Стоматология ДЕНТЕ",
			inn: "7701234567",
			kpp: "770101001",
			ogrn: "1157746123456",
			signatoryName: "Петров Петр Сергеевич",
			signatoryRole: "Генеральный директор",
		};

		const res = buildKnd1151156Xml(doc, patient, {
			clinicProfile,
			payments,
			taxOfficeCode: "7701",
		});

		assert.equal(res.ok, true);
		if (res.ok) {
			// Exact sum: 555.50 + 555.49 = 1110.99
			assert.ok(res.xml.includes('СуммаКод1="1110.99"'));
		}
	});
});

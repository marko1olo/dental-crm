import assert from "node:assert";
import { describe, test } from "node:test";
import {
	canonicalizeCdaXml,
	detachedSignatureSchema,
	egiszRemdPackageSchema,
	generateDentalCdaXml,
} from "../services/cda/index.js";

describe("generateDentalCdaXml", () => {
	const baseParams = {
		patientId: "p-123",
		patientName: { first: "Иван", last: "Иванов", middle: "Иванович" },
		patientSnils: "123-456-789 00",
		patientBirthDate: "1990-01-01T00:00:00.000Z",
		patientGender: "male" as const,
		clinicOid: "1.2.643.5.1.13.13.12.2.123",
		clinicOgrn: "1027700132195",
		clinicInn: "7701234567",
		clinicName: "ООО Ромашка",
		doctorName: { first: "Петр", last: "Петров", middle: "Петрович" },
		doctorSnils: "987-654-321 00",
		doctorPosition: "Стоматолог-терапевт",
		doctorPositionCode: "18",
		icd10Code: "K02.1",
		diagnosisText: "Кариес дентина",
		anamnesis: "Жалобы на боль от сладкого",
		treatmentDescription: "Лечение кариеса",
		visitDate: new Date("2023-10-25T10:00:00.000Z"),
		documentId: "doc-123",
	};

	test("generates valid XML with full parameters and correct XSD tag order", () => {
		const result = generateDentalCdaXml(baseParams);
		assert.ok(result.success, result.success ? "" : String(result.error));
		const xml = result.xml;

		assert.ok(xml.includes(`<?xml version="1.0" encoding="UTF-8"?>`));
		assert.ok(xml.includes(`<ClinicalDocument xmlns="urn:hl7-org:v3"`));
		assert.ok(xml.includes(`extension="doc-123"`));
		assert.ok(xml.includes(`<family>Иванов</family>`));
		assert.ok(xml.includes(`<given>Иван</given>`));
		assert.ok(xml.includes(`<given>Иванович</given>`));
		assert.ok(xml.includes(`extension="123-456-789 00"`));
		assert.ok(xml.includes(`value="19900101"`)); // Birth date YYYYMMDD
		assert.ok(xml.includes(`code="1"`)); // male gender code

		assert.ok(xml.includes(`<family>Петров</family>`));
		assert.ok(xml.includes(`<given>Петр</given>`));
		assert.ok(xml.includes(`<given>Петрович</given>`));
		assert.ok(xml.includes(`extension="987-654-321 00"`));

		// Doctor NSI 1.2.643.5.1.13.13.11.1002 position code 18 for therapist
		assert.ok(xml.includes(`code="18"`));
		assert.ok(xml.includes(`codeSystem="1.2.643.5.1.13.13.11.1002"`));
		assert.ok(xml.includes(`displayName="Стоматолог-терапевт"`));

		// Clinic MO IDs: FRMO, OGRN, INN
		assert.ok(xml.includes(`<name>ООО Ромашка</name>`));
		assert.ok(
			xml.includes(
				`root="1.2.643.5.1.13.13.12.2" extension="1.2.643.5.1.13.13.12.2.123"`,
			),
		);
		assert.ok(
			xml.includes(`root="1.2.643.100.1" extension="1027700132195"`),
		);
		assert.ok(xml.includes(`root="1.2.643.100.4" extension="7701234567"`));

		// Observation with statusCode="completed"
		assert.ok(xml.includes(`<statusCode code="completed"/>`));
		const obsMatch = xml.match(/<observation[^>]*>([\s\S]*?)<\/observation>/);
		assert.ok(obsMatch, "observation block must exist");
		const obsContent = obsMatch[1] ?? "";
		const codeIdx = obsContent.indexOf("<code");
		const statusIdx = obsContent.indexOf("<statusCode");
		const valueIdx = obsContent.indexOf("<value");
		assert.ok(codeIdx !== -1 && statusIdx !== -1 && valueIdx !== -1);
		assert.ok(
			codeIdx < statusIdx && statusIdx < valueIdx,
			"observation: <code> -> <statusCode> -> <value>",
		);

		// Organization tag order in representedCustodianOrganization: <id> -> <name> -> <telecom> -> <addr>
		const custOrgMatch = xml.match(
			/<representedCustodianOrganization>([\s\S]*?)<\/representedCustodianOrganization>/,
		);
		assert.ok(custOrgMatch, "representedCustodianOrganization must exist");
		const custContent = custOrgMatch[1] ?? "";
		const orgIdPos = custContent.indexOf("<id");
		const orgNamePos = custContent.indexOf("<name>");
		const orgTelecomPos = custContent.indexOf("<telecom");
		const orgAddrPos = custContent.indexOf("<addr");
		assert.ok(
			orgIdPos !== -1 &&
				orgNamePos !== -1 &&
				orgTelecomPos !== -1 &&
				orgAddrPos !== -1,
		);
		assert.ok(
			orgIdPos < orgNamePos &&
				orgNamePos < orgTelecomPos &&
				orgTelecomPos < orgAddrPos,
			"POCD_MT000040.Organization strictly: <id> -> <name> -> <telecom> -> <addr>",
		);

		assert.ok(xml.includes(`Кариес дентина (МКБ-10: K02.1)`));
		assert.ok(xml.includes(`Жалобы на боль от сладкого`));
		assert.ok(xml.includes(`Лечение кариеса`));
	});

	test("handles OGRNIP 15-digit root 1.2.643.100.5", () => {
		const result = generateDentalCdaXml({
			...baseParams,
			clinicOgrn: "304770000123456",
		});
		assert.ok(result.success);
		assert.ok(
			result.xml.includes(
				`root="1.2.643.100.5" extension="304770000123456"`,
			),
		);
	});

	test("handles missing optional parameters correctly", () => {
		const {
			clinicOid: _clinicOid,
			clinicOgrn: _clinicOgrn,
			clinicInn: _clinicInn,
			doctorSnils: _doctorSnils,
			anamnesis: _anamnesis,
			treatmentDescription: _treatmentDescription,
			...withoutOptionalParams
		} = baseParams;

		const params = {
			...withoutOptionalParams,
			patientName: { first: "Анна", last: "Смирнова" },
			doctorName: { first: "Елена", last: "Соколова" },
			patientBirthDate: null,
			patientGender: "female" as const,
		};

		const result = generateDentalCdaXml(params);
		assert.ok(result.success, result.success ? "" : String(result.error));
		const xml = result.xml;

		assert.ok(xml.includes(`<family>Смирнова</family>`));
		assert.ok(xml.includes(`<given>Анна</given>`));
		assert.ok(!xml.includes(`<given>undefined</given>`));

		assert.ok(xml.includes(`<family>Соколова</family>`));
		assert.ok(xml.includes(`<given>Елена</given>`));

		assert.ok(!xml.includes(`value="19000101"`));
		assert.ok(xml.includes(`<birthTime nullFlavor="UNK"/>`));
		assert.ok(xml.includes(`code="2"`));

		assert.ok(
			xml.includes(`root="1.2.643.5.1.13.13.12.2" extension="doc-123"`),
		);
		assert.ok(!xml.includes(`extension="undefined"`));

		assert.ok(!xml.includes(`Без особенностей`));
		assert.ok(!xml.includes(`Осмотр и консультация`));
	});

	test("handles 'other' or null gender code", () => {
		let result = generateDentalCdaXml({
			...baseParams,
			patientGender: "other",
		});
		assert.ok(result.success, result.success ? "" : String(result.error));
		let xml = result.xml;
		assert.ok(xml.includes(`<administrativeGenderCode nullFlavor="UNK"/>`));
		assert.ok(!xml.includes(`code="0"`));

		result = generateDentalCdaXml({ ...baseParams, patientGender: null });
		assert.ok(result.success, result.success ? "" : String(result.error));
		xml = result.xml;
		assert.ok(xml.includes(`<administrativeGenderCode nullFlavor="UNK"/>`));
		assert.ok(!xml.includes(`code="0"`));
	});

	test("DEFECT #72: documentTime (lockedAt) sets ClinicalDocument and author effectiveTime with timezone", () => {
		const lockedAt = new Date("2023-09-01T14:22:33.000Z");
		const result = generateDentalCdaXml({
			...baseParams,
			documentTime: lockedAt,
			visitDate: new Date("2023-09-01T10:00:00.000Z"),
		});
		assert.ok(result.success, result.success ? "" : String(result.error));
		const xml = result.xml;

		// Must match YYYYMMDDHHMMSS+ZZZZ format
		assert.match(xml, /<effectiveTime value="\d{14}[+-]\d{4}"\/>/);
		assert.match(xml, /<time value="\d{14}[+-]\d{4}"\/>/);
	});

	test("signature module: canonicalizeCdaXml and Zod schemas", () => {
		const rawXml = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>\r\n  <ClinicalDocument>\r\n    <id root="1.2.3"/>   \r\n  </ClinicalDocument>\r\n\r\n`;
		const canonical = canonicalizeCdaXml(rawXml);
		assert.ok(!canonical.startsWith("\uFEFF"), "BOM must be stripped");
		assert.ok(!canonical.includes("\r"), "CR must be normalized to LF");
		assert.ok(
			canonical.endsWith("</ClinicalDocument>"),
			"trailing whitespace/blank lines stripped",
		);

		const signatureItem = detachedSignatureSchema.safeParse({
			signatureBase64: "MIIE...base64",
			certificateSerialNumber: "01D8A2...",
			certificateSubject: "Иванов И. И.",
			signedAt: "2026-08-13T10:00:00.000Z",
		});
		assert.ok(signatureItem.success);

		const pkg = egiszRemdPackageSchema.safeParse({
			documentId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
			documentVersion: 1,
			xmlCanonicalPayload: "<ClinicalDocument/>",
			doctorSignature: {
				signatureBase64: "MIIE...base64",
				certificateSerialNumber: "01D8A2...",
				certificateSubject: "Иванов И. И.",
				signedAt: "2026-08-13T10:00:00.000Z",
			},
			metadata: {
				patientSnils: "12345678901",
				clinicOid: "1.2.643.5.1.13.13.12.2.123",
			},
		});
		assert.ok(pkg.success);
	});
});

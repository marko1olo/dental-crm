import assert from "node:assert";
import { describe, test } from "node:test";
import { generateDentalCdaXml } from "../services/egiszCdaGenerator.js";

describe("generateDentalCdaXml", () => {
	const baseParams = {
		patientId: "p-123",
		patientName: { first: "Иван", last: "Иванов", middle: "Иванович" },
		patientSnils: "123-456-789 00",
		patientBirthDate: "1990-01-01T00:00:00.000Z",
		patientGender: "male" as const,
		clinicOid: "1.2.643.5.1.13.13.12.2.123",
		clinicName: "ООО Ромашка",
		doctorName: { first: "Петр", last: "Петров", middle: "Петрович" },
		doctorSnils: "987-654-321 00",
		doctorPosition: "Стоматолог-терапевт",
		icd10Code: "K02.1",
		diagnosisText: "Кариес дентина",
		anamnesis: "Жалобы на боль от сладкого",
		treatmentDescription: "Лечение кариеса",
		visitDate: new Date("2023-10-25T10:00:00.000Z"),
		documentId: "doc-123",
	};

	test("generates valid XML with full parameters", () => {
		const xml = generateDentalCdaXml(baseParams);

		assert.ok(xml.includes(`<?xml version="1.0" encoding="UTF-8"?>`));
		assert.ok(xml.includes(`<ClinicalDocument xmlns="urn:hl7-org:v3"`));
		assert.ok(xml.includes(`extension="doc-123"`));
		assert.ok(xml.includes(`<family>Иванов</family>`));
		assert.ok(xml.includes(`<given>Иван</given>`));
		assert.ok(xml.includes(`<given>Иванович</given>`));
		assert.ok(xml.includes(`extension="123-456-789 00"`));
		assert.ok(xml.includes(`value="19900101"`));
		assert.ok(xml.includes(`code="1"`)); // male gender code

		assert.ok(xml.includes(`<family>Петров</family>`));
		assert.ok(xml.includes(`<given>Петр</given>`));
		assert.ok(xml.includes(`<given>Петрович</given>`));
		assert.ok(xml.includes(`extension="987-654-321 00"`));

		assert.ok(xml.includes(`<name>ООО Ромашка</name>`));
		assert.ok(xml.includes(`extension="1.2.643.5.1.13.13.12.2.123"`));

		assert.ok(xml.includes(`Кариес дентина (МКБ-10: K02.1)`));
		assert.ok(xml.includes(`Жалобы на боль от сладкого`));
		assert.ok(xml.includes(`Лечение кариеса`));
	});

	test("handles missing optional parameters correctly", () => {
		/*
		 * Отсутствие необязательного параметра выражается его ОТСУТСТВИЕМ, а не
		 * значением undefined: при exactOptionalPropertyTypes объявление
		 * `clinicOid?: string` явное undefined не принимает. Для генератора это
		 * ровно то же самое — все четыре поля он читает через `||` и тернарник
		 * (services/egiszCdaGenerator.ts: строки 46, 71, 113, 123), поэтому
		 * пропущенный ключ и undefined дают один и тот же XML.
		 */
		const {
			clinicOid: _clinicOid, // Should fallback to default
			doctorSnils: _doctorSnils, // Should omit id
			anamnesis: _anamnesis, // Should fallback to "Без особенностей"
			treatmentDescription: _treatmentDescription, // Should fallback to "Осмотр и консультация"
			...withoutOptionalParams
		} = baseParams;

		const params = {
			...withoutOptionalParams,
			patientName: { first: "Анна", last: "Смирнова" }, // No middle name
			doctorName: { first: "Елена", last: "Соколова" }, // No middle name
			patientBirthDate: null, // No birth date
			patientGender: "female" as const, // Female gender code
		};

		const xml = generateDentalCdaXml(params);

		assert.ok(xml.includes(`<family>Смирнова</family>`));
		assert.ok(xml.includes(`<given>Анна</given>`));
		assert.ok(!xml.includes(`<given>undefined</given>`));

		assert.ok(xml.includes(`<family>Соколова</family>`));
		assert.ok(xml.includes(`<given>Елена</given>`));

		assert.ok(xml.includes(`value="19000101"`)); // Fallback birth date
		assert.ok(xml.includes(`code="2"`)); // Female gender code

		assert.ok(xml.includes(`root="1.2.643.5.1.13.13.12.2" extension="doc-123"`)); // Default clinic OID
		assert.ok(!xml.includes(`extension="undefined"`)); // Missing doctorSnils should not render the whole tag

		assert.ok(xml.includes(`Без особенностей`)); // Fallback anamnesis
		assert.ok(xml.includes(`Осмотр и консультация`)); // Fallback treatment description
	});

	test("handles 'other' or null gender code", () => {
		let xml = generateDentalCdaXml({ ...baseParams, patientGender: "other" });
		assert.ok(xml.includes(`code="0"`));

		xml = generateDentalCdaXml({ ...baseParams, patientGender: null });
		assert.ok(xml.includes(`code="0"`));
	});
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	Dental4WindowsXmlParser,
	IdentJsonParser,
	InfodentCsvParser,
	SmartImportEngine,
} from "./index.js";

describe("Legacy MIS Import Parsers and SmartImportEngine", () => {
	describe("Dental4WindowsXmlParser", () => {
		it("detects D4W XML structure", () => {
			const sample = `<?xml version="1.0" encoding="utf-8"?><Patients><Patient><ID>101</ID><LastName>Иванов</LastName><FirstName>Иван</FirstName></Patient></Patients>`;
			assert.equal(Dental4WindowsXmlParser.isD4wXml(sample), true);
			assert.equal(Dental4WindowsXmlParser.isD4wXml("random text"), false);
		});

		it("parses D4W patient records with kopeck precision", () => {
			const xml = `<?xml version="1.0" encoding="windows-1251"?>
			<Dental4WindowsExport>
				<Patients>
					<Patient>
						<ID>D4W-001</ID>
						<CardNumber>К-421</CardNumber>
						<LastName>Петров</LastName>
						<FirstName>Петр</FirstName>
						<MiddleName>Петрович</MiddleName>
						<DOB>1985-05-15</DOB>
						<Phone>+7 (999) 111-22-33</Phone>
						<Balance>1500.50</Balance>
					</Patient>
				</Patients>
			</Dental4WindowsExport>`;

			const result = Dental4WindowsXmlParser.parse(xml);
			assert.equal(result.patients.length, 1);
			const p = result.patients[0];
			assert.equal(p.externalId, "D4W-001");
			assert.equal(p.fullName, "Петров Петр Петрович");
			assert.equal(p.birthDate, "1985-05-15");
			assert.equal(p.phone, "+79991112233");
			assert.equal(p.balanceKopecks, 150050);
		});
	});

	describe("IdentJsonParser", () => {
		it("detects IDENT JSON format", () => {
			const sample = JSON.stringify({
				system: "IDENT",
				patients: [{ id: "1", name: "Сидоров С.С." }],
			});
			assert.equal(IdentJsonParser.isIdentJson(sample), true);
			assert.equal(IdentJsonParser.isIdentJson("<xml></xml>"), false);
		});

		it("parses IDENT patient records and invoices", () => {
			const json = JSON.stringify({
				format: "IDENT_JSON",
				patients: [
					{
						id: "id-42",
						cardNumber: "007",
						name: "Смирнова Анна Ивановна",
						birthDate: "1992-10-20",
						phone: "+7 900 123-45-67",
						gender: "female",
						balance: 5000,
					},
				],
				invoices: [
					{
						id: "inv-1",
						patientId: "id-42",
						date: "2026-09-01",
						total: 3500,
						paid: 3500,
						status: "paid",
					},
				],
			});

			const result = IdentJsonParser.parse(json);
			assert.equal(result.patients.length, 1);
			assert.equal(result.patients[0].fullName, "Смирнова Анна Ивановна");
			assert.equal(result.patients[0].gender, "female");
			assert.equal(result.invoices.length, 1);
			assert.equal(result.invoices[0].amountKopecks, 350000);
		});
	});

	describe("InfodentCsvParser", () => {
		it("detects entity kind by column headers", () => {
			const headers = ["Код", "Карта", "ФИО", "Дата рождения", "Телефон"];
			const kind = InfodentCsvParser.detectEntityKind(headers);
			assert.equal(kind, "patient");
		});

		it("parses Infodent CSV patient records", () => {
			const csv = "Код;Карта;ФИО;Дата рождения;Телефон\nINF-1;404;Васильев Василий Васильевич;1975-03-10;89219876543";
			const result = InfodentCsvParser.parse(csv);
			assert.equal(result.patients.length, 1);
			assert.equal(result.patients[0].fullName, "Васильев Василий Васильевич");
			assert.equal(result.patients[0].phone, "+79219876543");
		});
	});

	describe("SmartImportEngine auto-detection", () => {
		it("correctly identifies D4W XML input and produces canonical patients", () => {
			const sample = `<?xml version="1.0"?><Dental4WindowsExport><Patients><Patient><ID>1</ID><LastName>Тестов</LastName><FirstName>Тест</FirstName></Patient></Patients></Dental4WindowsExport>`;
			const detected = SmartImportEngine.detectAndParse(sample);
			assert.equal(detected.format, "d4w_xml");
			assert.equal(detected.patients.length, 1);
			assert.equal(detected.patients[0].fullName, "Тестов Тест");
		});

		it("correctly identifies IDENT JSON input and produces canonical patients", () => {
			const sample = JSON.stringify({
				format: "IDENT_JSON",
				patients: [{ id: "p1", name: "Тестовый Пациент", phone: "89001234567" }],
			});
			const detected = SmartImportEngine.detectAndParse(sample);
			assert.equal(detected.format, "ident_json");
			assert.equal(detected.patients.length, 1);
			assert.equal(detected.patients[0].fullName, "Тестовый Пациент");
		});
	});
});

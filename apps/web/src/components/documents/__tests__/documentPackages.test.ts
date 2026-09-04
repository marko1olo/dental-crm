import assert from "node:assert";
import { describe, test } from "node:test";
import { type DocumentKind, type GeneratedDocument } from "@dental/shared";
import { SURGICAL_STATUTORY_ITEMS } from "../SurgicalPackageModal";
import { generatePrimaryIntakePackageHtml } from "../primaryIntakePackagePrintEngine";
import { generateSurgicalPackageHtml } from "../surgicalPackagePrintEngine";
import { generateClinicalPackageHtml } from "../clinicalPackagePrintEngine";

describe("Document Packages and 1-Click Intake Scenarios", () => {
	test("Surgical package contains all 6 statutory medical documents", () => {
		assert.strictEqual(SURGICAL_STATUTORY_ITEMS.length, 6);
		const kinds = SURGICAL_STATUTORY_ITEMS.map((item) => item.kind);
		assert.ok(kinds.includes("procedure_specific_consent_packet"));
		assert.ok(kinds.includes("anesthesia_consent_log"));
		assert.ok(kinds.includes("dental_medical_card_043u"));
		assert.ok(kinds.includes("xray_cbct_referral"));
		assert.ok(kinds.includes("prescription_medication_order"));
		assert.ok(kinds.includes("post_visit_recommendations"));
	});

	test("1-click batch calculation detects missing documents correctly", () => {
		const existingDocs: Partial<GeneratedDocument>[] = [
			{ id: "doc-1", kind: "dental_medical_card_043u", status: "issued" },
			{ id: "doc-2", kind: "anesthesia_consent_log", status: "draft" },
		];

		const existingKinds = new Set(existingDocs.map((d) => d.kind));
		const missing = SURGICAL_STATUTORY_ITEMS.filter((item) => !existingKinds.has(item.kind)).map(
			(item) => item.kind,
		);

		assert.strictEqual(missing.length, 4);
		assert.ok(missing.includes("procedure_specific_consent_packet"));
		assert.ok(missing.includes("xray_cbct_referral"));
		assert.ok(missing.includes("prescription_medication_order"));
		assert.ok(missing.includes("post_visit_recommendations"));
		assert.ok(!missing.includes("dental_medical_card_043u"));
		assert.ok(!missing.includes("anesthesia_consent_log"));
	});

	test("Fully completed surgical package reports 0 missing items", () => {
		const allKinds: DocumentKind[] = [
			"procedure_specific_consent_packet",
			"anesthesia_consent_log",
			"dental_medical_card_043u",
			"xray_cbct_referral",
			"prescription_medication_order",
			"post_visit_recommendations",
		];
		const existingDocs: Partial<GeneratedDocument>[] = allKinds.map((kind, idx) => ({
			id: `doc-${idx}`,
			kind,
			status: "issued",
		}));

		const existingKinds = new Set(existingDocs.map((d) => d.kind));
		const missing = SURGICAL_STATUTORY_ITEMS.filter((item) => !existingKinds.has(item.kind));
		assert.strictEqual(missing.length, 0);
	});

	test("Primary Intake Package: 1-click HTML generator creates all 4 statutory sheets with page breaks", () => {
		const html = generatePrimaryIntakePackageHtml({
			patient: {
				fullName: "Смирнов Алексей Владимирович",
				birthDate: "1990-05-14",
				phone: "+7 (999) 111-22-33",
			},
			clinic: {
				clinicName: "ООО «ДЕНТЕ»",
				inn: "7701234567",
			},
			doctorFullName: "Доктор Зубов А.И.",
			intakeNormApplied: true,
		});

		assert.ok(html.includes("ДОГОВОР № ДЕНТЕ-"), "Must contain Paid Services Contract 736");
		assert.ok(html.includes("ПП РФ от 11.05.2023 № 736"), "Must cite statutory ref 736");
		assert.ok(html.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"), "Must contain Informed Consent 1051n");
		assert.ok(html.includes("Приказ МЗ РФ от 12.11.2021 № 1051н"), "Must cite Order 1051n");
		assert.ok(html.includes("СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ"), "Must contain 152-FZ consent");
		assert.ok(html.includes("АНКЕТА О СОСТОЯНИИ ЗДОРОВЬЯ ПАЦИЕНТА"), "Must contain health questionnaire 043/u");
		assert.ok(html.includes("page-break-after: always"), "Must include page-breaks between all 4 documents");
		assert.ok(html.includes("Смирнов Алексей Владимирович"), "Must include patient name");
		assert.ok(html.includes("Доктор Зубов А.И."), "Must include doctor name");
	});

	test("Primary Intake Package: handles blank patient data with clean underlines for hand signing (Mandate 8e)", () => {
		const html = generatePrimaryIntakePackageHtml({
			patient: null, // Complete blank for reception walk-in
			clinic: null,
			intakeNormApplied: true,
		});

		assert.ok(html.includes("________________________________________"), "Outputs underlines for missing full name");
		assert.ok(html.includes("серия ______ № ________"), "Outputs underlines for missing passport");
		assert.ok(html.includes("____________________"), "Outputs underlines for missing SNILS without 403 or error");
		assert.ok(!html.includes("undefined"), "Must not contain undefined in rendered text");
	});

	test("Surgical Package: 1-click HTML generator creates all 3 statutory sheets with page breaks (Mandate 8e/8k)", () => {
		const html = generateSurgicalPackageHtml({
			patient: {
				fullName: "Кузнецов Дмитрий Сергеевич",
				birthDate: "1985-11-20",
				phone: "+7 (916) 555-44-33",
			},
			clinic: {
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: "7707083893",
			},
			doctorFullName: "Хирург-имплантолог Ковалев И.С.",
			operationDetails: {
				operationType: "Дентальная имплантация системы Dentium",
				toothNumber: 36,
				anestheticName: "Ультракаин Д-С форте 1:100 000",
			},
		});

		assert.ok(html.includes("Информированное добровольное согласие на хирургическое"), "Must contain surgical informed consent");
		assert.ok(html.includes("ФЗ № 323-ФЗ ст. 20"), "Must cite Federal Law 323-FZ");
		assert.ok(html.includes("Информированное согласие и протокол на проведение местной и проводниковой анестезии"), "Must contain anesthesia consent");
		assert.ok(html.includes("Приказ МЗ РФ № 1051н"), "Must cite Order 1051n");
		assert.ok(html.includes("Памятка пациента после хирургического стоматологического вмешательства"), "Must contain post-op memo");
		assert.ok(html.includes("Закон РФ № 2300-1"), "Must cite Consumer Protection Law 2300-1");
		assert.ok(html.includes("page-break-after: always"), "Must include page-breaks between sheets");
		assert.ok(html.includes("Кузнецов Дмитрий Сергеевич"), "Must render patient name");
		assert.ok(html.includes("Хирург-имплантолог Ковалев И.С."), "Must render doctor name");
		assert.ok(html.includes("Дентальная имплантация системы Dentium"), "Must render operation details");
		assert.ok(!html.includes("undefined"), "Must not contain undefined in rendered text");
	});

	test("Surgical Package: handles blank patient data with clean underlines without throwing (Mandate 8e)", () => {
		const html = generateSurgicalPackageHtml({
			patient: null,
			clinic: null,
			doctorFullName: null,
		});

		assert.ok(html.includes("________________________________________"), "Outputs underlines for missing full name");
		assert.ok(html.includes("серия ______ № ________"), "Outputs underlines for missing passport");
		assert.ok(!html.includes("undefined"), "Must not contain undefined in rendered text");
	});

	test("Clinical Package: 1-click HTML generator creates all 3 statutory sheets with page breaks (Mandate 8e/8k)", () => {
		const html = generateClinicalPackageHtml({
			patient: {
				fullName: "Иванова Ольга Петровна",
				birthDate: "1994-08-12",
				phone: "+7 (926) 333-22-11",
			},
			clinic: {
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: "7707083893",
			},
			doctorFullName: "Терапевт Соколова Е.А.",
			treatmentDetails: {
				treatmentType: "Лечение глубокого кариеса и эстетическая реставрация",
				toothNumbers: "16, 15",
				diagnosisIcd10: "K02.1 Кариес дентина",
				anestheticName: "Убистезин форте 1:100 000",
			},
		});

		assert.ok(html.includes("Информированное добровольное согласие на терапевтическое стоматологическое лечение"), "Must contain therapeutic informed consent");
		assert.ok(html.includes("ФЗ № 323-ФЗ ст. 20"), "Must cite Federal Law 323-FZ");
		assert.ok(html.includes("1051н"), "Must cite Order 1051n");
		assert.ok(html.includes("Информированное согласие и протокол на проведение местной и проводниковой анестезии"), "Must contain anesthesia consent");
		assert.ok(html.includes("Памятка пациента после терапевтического стоматологического лечения зубов и пломбирования"), "Must contain post-treatment memo");
		assert.ok(html.includes("Закон РФ № 2300-1"), "Must cite Consumer Protection Law 2300-1");
		assert.ok(html.includes("page-break-after: always"), "Must include page-breaks between sheets");
		assert.ok(html.includes("Иванова Ольга Петровна"), "Must render patient name");
		assert.ok(html.includes("Терапевт Соколова Е.А."), "Must render doctor name");
		assert.ok(html.includes("K02.1 Кариес дентина"), "Must render diagnosis");
		assert.ok(!html.includes("undefined"), "Must not contain undefined in rendered text");
	});

	test("Clinical Package: handles blank patient data with clean underlines without throwing (Mandate 8e)", () => {
		const html = generateClinicalPackageHtml({
			patient: null,
			clinic: null,
			doctorFullName: null,
		});

		assert.ok(html.includes("________________________________________"), "Outputs underlines for missing full name");
		assert.ok(html.includes("серия ______ № ________"), "Outputs underlines for missing passport");
		assert.ok(!html.includes("undefined"), "Must not contain undefined in rendered text");
	});
});

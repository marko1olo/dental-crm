import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type AppLogicContextType,
	AppLogicProvider,
} from "../../../contexts/AppLogicContext";
import { EgiszCdaExportModal } from "../EgiszCdaExportModal";
import {
	EGISZ_SEMD_DOC_TYPES,
	EGISZ_STANDARD_OIDS,
	buildCdaXml,
	canonicalizeXml,
	validateCdaSemanticRules,
} from "../egiszCdaValidator";

const mockAppLogic = {
	auth: {
		denteClinicalReadHeaders: () => ({ Authorization: "Bearer test-read" }),
		denteClinicalMutationHeaders: () => ({ Authorization: "Bearer test-mutation" }),
	},
	dashboard: {
		organization: {
			name: "ООО «Стоматология ДЕНТЕ»",
			ogrn: "1027700132195",
			inn: "7701234567",
		},
		activePatient: {
			fullName: "Иванов Иван Иванович",
		},
	},
} as unknown as AppLogicContextType;

function renderModal(props: Parameters<typeof EgiszCdaExportModal>[0]) {
	return renderToStaticMarkup(
		createElement(
			AppLogicProvider,
			{
				value: mockAppLogic,
				children: createElement(EgiszCdaExportModal, props),
			},
		),
	);
}

describe("EgiszCdaExportModal Component & EGISZ CDA R2 Flow", () => {
	const defaultProps = {
		isOpen: true,
		onClose: () => {},
		visitId: "d072e59d-648b-4bf4-bb37-7ef9cf5b99a1",
		patientId: "a183f982-1234-4567-890a-bcdef0123456",
		patientName: { last: "Иванов", first: "Иван", middle: "Иванович" },
		patientSnils: "112-233-445 95",
		patientBirthDate: "1985-05-12",
		patientGender: "male" as const,
		patientPolisOms: "1234567890123456",
		patientAddress: "г. Москва, ул. Ленина, д. 10, кв. 5",
		patientPhone: "+7 (999) 111-22-33",
		clinicName: "ООО «Стоматология ДЕНТЕ»",
		clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
		clinicOgrn: "1027700132195",
		clinicInn: "7701234567",
		clinicAddress: "г. Москва, ул. Арбат, д. 25",
		clinicPhone: "+7 (495) 123-45-67",
		doctorName: { last: "Смирнова", first: "Елена", middle: "Владимировна" },
		doctorSnils: "112-233-445 95",
		doctorPosition: "Врач-стоматолог-терапевт",
		doctorPositionCode: "18",
		doctorPhone: "+7 (999) 555-44-33",
		diagnosisText: "Кариес дентина",
		icd10Code: "K02.1",
		diagnosisTooth: "16",
		anamnesis: "Жалобы на кратковременные боли от сладкого в области 16 зуба.",
		objectiveStatus: "Зуб 16: глубокая кариозная полость на окклюзионной поверхности.",
		treatmentDescription: "Препарирование, медикаментозная обработка, пломбирование Estelite.",
		toothStates: { 16: "Caries", 15: "Filled", 14: "Healthy" },
		toothSurfaces: { 16: ["O", "D"], 15: ["O"] },
	};

	it("does not render modal when isOpen is false", () => {
		const html = renderModal({
			...defaultProps,
			isOpen: false,
		});
		assert.equal(html, "", "Renders nothing when isOpen is false");
	});

	it("renders modal with header, MoH badge, and Document Types 302 and 303 when isOpen is true", () => {
		const html = renderModal(defaultProps);

		assert.ok(
			html.includes("СЭМД ЕГИСЗ CDA R2"),
			"Contains main title with CDA R2",
		);
		assert.ok(
			html.includes("Минздрав РФ"),
			"Contains Ministry of Health badge",
		);
		assert.ok(
			html.includes("data-testid=\"doc-type-btn-302\""),
			"Contains Document Code 302 button",
		);
		assert.ok(
			html.includes("data-testid=\"doc-type-btn-303\""),
			"Contains Document Code 303 button",
		);
		assert.ok(
			html.includes("Консультация"),
			"Contains label for Code 302 (Консультация)",
		);
		assert.ok(
			html.includes("Вмешательство"),
			"Contains label for Code 303 (Вмешательство)",
		);
	});

	it("renders XML CDA Preview with syntax highlighting and all 7 collapsible sections", () => {
		const html = renderModal(defaultProps);

		// Section 1: Header
		assert.ok(
			html.includes("Заголовок CDA (Header &amp; Template ID)"),
			"Contains Section 1: Header",
		);
		assert.ok(
			html.includes("realmCode"),
			"Renders realmCode tag",
		);

		// Section 2: OID OGRN/FRMO
		assert.ok(
			html.includes("Медицинская организация (OID OGRN/FRMO &amp; Custodian)"),
			"Contains Section 2: OID OGRN/FRMO",
		);
		assert.ok(
			html.includes("1.2.643.5.1.13.13.12.2"),
			"Renders FRMO OID root in MO section",
		);

		// Section 3: Doctor SNILS/FRMR
		assert.ok(
			html.includes("Врач-автор документа (Doctor SNILS/FRMR &amp; Position)"),
			"Contains Section 3: Doctor SNILS/FRMR",
		);
		assert.ok(
			html.includes("assignedAuthor"),
			"Renders assignedAuthor in doctor section",
		);

		// Section 4: Patient SNILS/Polis OMS
		assert.ok(
			html.includes("Пациент (Patient SNILS/Polis OMS/DMS &amp; Demographics)"),
			"Contains Section 4: Patient SNILS/Polis OMS",
		);
		assert.ok(
			html.includes("patientRole"),
			"Renders patientRole in patient section",
		);

		// Section 5: Diagnosis ICD-10
		assert.ok(
			html.includes("Диагноз МКБ-10 и локализация зуба (Diagnosis)"),
			"Contains Section 5: Diagnosis ICD-10",
		);
		assert.ok(
			html.includes("K02.1"),
			"Renders ICD-10 code K02.1 in diagnosis section",
		);

		// Section 6: Dental formula
		assert.ok(
			html.includes("Зубная формула и одонтограмма (Dental Formula Block)"),
			"Contains Section 6: Dental formula block",
		);

		// Section 7: Performed procedures according to V001
		assert.ok(
			html.includes("Оказанные медицинские услуги (Номенклатура V001 &amp; LOINC 47519-4)"),
			"Contains Section 7: Performed procedures",
		);
		assert.ok(
			html.includes("A16.07.002"),
			"Renders Nomenklatura code A16.07.002 in procedures section",
		);
	});

	it("renders 1-click action buttons: Export XML CDA and Submit to REMD EGISZ", () => {
		const html = renderModal(defaultProps);

		assert.ok(
			html.includes("data-testid=\"btn-export-cda-xml\""),
			"Contains 1-click 'Экспорт XML CDA' button",
		);
		assert.ok(
			html.includes("data-testid=\"btn-submit-egisz-remd\""),
			"Contains 1-click 'Отправить в РЭМД ЕГИСЗ' button",
		);
		assert.ok(
			html.includes("Отправить в РЭМД ЕГИСЗ (Шлюз Минздрава)"),
			"Contains text for REMD submission",
		);
	});
});

describe("egiszCdaValidator Semantic Rules & Generator Engine", () => {
	const validData = {
		docTypeCode: "302" as const,
		visitId: "d072e59d-648b-4bf4-bb37-7ef9cf5b99a1",
		patientId: "a183f982-1234-4567-890a-bcdef0123456",
		patientFullName: "Иванов Иван Иванович",
		patientSnils: "112-233-445 95",
		patientBirthDate: "1985-05-12",
		patientGender: "male" as const,
		clinicName: "Стоматология ДЕНТЕ",
		clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
		clinicOgrn: "1027700132195",
		clinicInn: "7701234567",
		doctorFullName: "Смирнова Елена Владимировна",
		doctorSnils: "112-233-445 95",
		doctorPosition: "Врач-стоматолог-терапевт",
		doctorPositionCode: "18",
		icd10Code: "K02.1",
		diagnosisText: "Кариес дентина",
		diagnosisTooth: "16",
		toothStates: { 16: "Caries" },
		toothSurfaces: { 16: ["O"] },
	};

	it("builds valid HL7 CDA R2 XML matching Code 302 and Code 303 specifications", () => {
		const xml302 = buildCdaXml(validData);
		assert.ok(xml302.includes('<realmCode code="RU"/>'), "Contains realmCode RU");
		assert.ok(xml302.includes('<templateId root="1.2.643.5.1.13.13.11.1527"/>'), "Contains templateId OID");
		assert.ok(xml302.includes("Протокол консультации стоматолога"), "Contains title for 302");
		assert.ok(xml302.includes("code=\"K02.1\""), "Contains ICD-10 code in CD value");
		assert.ok(xml302.includes("targetSiteCode code=\"16\""), "Contains tooth 16 targetSiteCode");

		const xml303 = buildCdaXml({ ...validData, docTypeCode: "303" });
		assert.ok(xml303.includes("Протокол стоматологического лечения/вмешательства"), "Contains title for 303");
	});

	it("canonicalizeXml trims trailing whitespace and normalizes CRLF to LF", () => {
		const raw = "  <ClinicalDocument>\r\n\t<test/>\r\n</ClinicalDocument>  ";
		const canon = canonicalizeXml(raw);
		assert.ok(!canon.includes("\r\n"), "CRLF converted to LF");
		assert.equal(canon.startsWith("<ClinicalDocument>"), true, "Leading whitespace trimmed");
		assert.equal(canon.endsWith("</ClinicalDocument>"), true, "Trailing whitespace trimmed");
	});

	it("validates semantic checklist with passed rules on valid data", () => {
		const xml = buildCdaXml(validData);
		const report = validateCdaSemanticRules(validData, xml, true, false);

		assert.equal(report.isValid, true, "Validation report isValid should be true");
		assert.equal(report.failedCount, 0, "Zero failed rules");
		assert.ok(report.passedCount >= 10, "At least 10 rules passed");
		assert.equal(report.scorePercent, 100, "Score is 100%");

		const rootRule = report.rules.find((r) => r.id === "RULE_ROOT_REALM");
		assert.equal(rootRule?.status, "passed", "RULE_ROOT_REALM passed");

		const icdRule = report.rules.find((r) => r.id === "RULE_ICD10_DIAGNOSIS");
		assert.equal(icdRule?.status, "passed", "RULE_ICD10_DIAGNOSIS passed");

		const docSnilsRule = report.rules.find((r) => r.id === "RULE_DOCTOR_SNILS_FRMR");
		assert.equal(docSnilsRule?.status, "passed", "RULE_DOCTOR_SNILS_FRMR passed");
	});

	it("detects failed semantic rules when required fields are missing or invalid", () => {
		const invalidData = {
			...validData,
			clinicOid: "",
			patientBirthDate: "",
			patientGender: "other",
			icd10Code: "INVALID_CODE",
		};
		const xml = buildCdaXml(invalidData);
		const report = validateCdaSemanticRules(invalidData, xml, false, false);

		assert.equal(report.isValid, false, "Validation report isValid should be false");
		assert.ok(report.failedCount > 0, "Has failed rules");

		const clinicRule = report.rules.find((r) => r.id === "RULE_CLINIC_FRMO");
		assert.equal(clinicRule?.status, "failed", "RULE_CLINIC_FRMO should fail on empty clinicOid");

		const icdRule = report.rules.find((r) => r.id === "RULE_ICD10_DIAGNOSIS");
		assert.equal(icdRule?.status, "failed", "RULE_ICD10_DIAGNOSIS should fail on invalid code");
	});
});

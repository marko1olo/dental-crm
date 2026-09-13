import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	EGISZ_SEMD_DOC_TYPES,
	EGISZ_STANDARD_OIDS,
	buildCdaXml,
	canonicalizeXml,
	validateCdaSemanticRules,
} from "../egiszCdaValidator";

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

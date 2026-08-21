import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildCdaXml,
	canonicalizeXml,
	type CdaExportData,
	EGISZ_SEMD_DOC_TYPES,
	validateCdaSemanticRules,
} from "../components/egisz/egiszCdaValidator";

describe("EGISZ SEMD CDA Semantic Validation & Visit Status Sync", () => {
	const validPatient = {
		patientId: "p-1001",
		patientFullName: "Иванова Ольга Сергеевна",
		patientSnils: "112-233-445 95", // Valid checksum
		patientBirthDate: "1990-05-15",
		patientGender: "female",
		patientPolisOms: "1234567890123456",
		patientAddress: "г. Москва, Ленинский проспект, д. 10",
	};

	const validDoctor = {
		doctorFullName: "Смирнов Алексей Павлович",
		doctorSnils: "112-233-445 95", // Valid checksum (sum = 95)
		doctorPosition: "Врач-стоматолог-терапевт",
		doctorPositionCode: "15",
	};

	const validClinic = {
		clinicName: 'ООО "ДЕНТЕ Клиника"',
		clinicOid: "1.2.643.5.1.13.13.12.2.77.9999",
		clinicOgrn: "1027700132195",
		clinicInn: "7701234567",
		clinicAddress: "г. Москва, ул. Арбат, д. 20",
	};

	const validClinical = {
		docTypeCode: "302" as const,
		visitId: "v-8800",
		diagnosisText: "Кариес дентина",
		icd10Code: "K02.1",
		diagnosisTooth: "16",
		anamnesis: "Жалобы на кратковременные боли от сладкого и холодного в зубе 16.",
		objectiveStatus: "Глубокая кариозная полость на жевательной поверхности 16 зуба, зондирование болезненно по эмалево-дентинной границе.",
		treatmentDescription: "Анестезия Ubistesin 1.7 мл, препарирование, медобработка хлоргексидином 2%, травление, адгезив Single Bond, пломба Filtek Z250, шлифовка, полировка.",
		instrumentTrayBarcode: "TRAY-2026-042",
		toothStates: { 16: "Caries" },
		toothSurfaces: { 16: ["O", "M"] },
	};

	it("1. Full valid visit data should pass 100% of EGISZ CDA semantic rules with UKEP signature", () => {
		const exportData: CdaExportData = {
			...validPatient,
			...validDoctor,
			...validClinic,
			...validClinical,
		};

		const xml = buildCdaXml(exportData);
		assert.ok(xml.includes("<ClinicalDocument"));
		assert.ok(xml.includes('<realmCode code="RU"/>'));
		assert.ok(xml.includes(EGISZ_SEMD_DOC_TYPES["302"].templateRoot));
		assert.ok(xml.includes('code="K02.1"'));
		assert.ok(xml.includes("TRAY-2026-042"));

		const report = validateCdaSemanticRules(exportData, xml, true, true);
		assert.equal(report.isValid, true);
		assert.equal(report.failedCount, 0);
		assert.ok(report.scorePercent >= 90);
	});

	it("2. Doctor SNILS validation: missing or invalid checksum should strictly FAIL", () => {
		// Test invalid checksum
		const invalidDoctorSnilsData: CdaExportData = {
			...validPatient,
			...validDoctor,
			doctorSnils: "111-222-333 99", // Invalid checksum
			...validClinic,
			...validClinical,
		};

		const xml1 = buildCdaXml(invalidDoctorSnilsData);
		const report1 = validateCdaSemanticRules(invalidDoctorSnilsData, xml1, false);
		const doctorRule1 = report1.rules.find((r) => r.id === "RULE_DOCTOR_SNILS_FRMR");
		assert.ok(doctorRule1);
		assert.equal(doctorRule1.status, "failed");
		assert.equal(report1.isValid, false);

		// Test missing doctor SNILS
		const missingDoctorSnilsData: CdaExportData = {
			...validPatient,
			...validDoctor,
			doctorSnils: undefined,
			...validClinic,
			...validClinical,
		};

		const xml2 = buildCdaXml(missingDoctorSnilsData);
		const report2 = validateCdaSemanticRules(missingDoctorSnilsData, xml2, false);
		const doctorRule2 = report2.rules.find((r) => r.id === "RULE_DOCTOR_SNILS_FRMR");
		assert.ok(doctorRule2);
		assert.equal(doctorRule2.status, "failed");
		assert.equal(report2.isValid, false);
	});

	it("3. ICD-10 validation: missing or malformed diagnosis code should strictly FAIL", () => {
		const invalidIcdData: CdaExportData = {
			...validPatient,
			...validDoctor,
			...validClinic,
			...validClinical,
			icd10Code: "INVALID_CODE",
		};

		const xml = buildCdaXml(invalidIcdData);
		const report = validateCdaSemanticRules(invalidIcdData, xml, true);
		const icdRule = report.rules.find((r) => r.id === "RULE_ICD10_DIAGNOSIS");
		assert.ok(icdRule);
		assert.equal(icdRule.status, "failed");
		assert.equal(report.isValid, false);
	});

	it("4. Patient identity: invalid SNILS without OMS Polis should FAIL", () => {
		const invalidPatientData: CdaExportData = {
			...validPatient,
			patientSnils: "000-000-000 00", // Identical digits = invalid
			patientPolisOms: undefined,
			...validDoctor,
			...validClinic,
			...validClinical,
		};

		const xml = buildCdaXml(invalidPatientData);
		const report = validateCdaSemanticRules(invalidPatientData, xml, true);
		const patRule = report.rules.find((r) => r.id === "RULE_PATIENT_IDENTITY");
		assert.ok(patRule);
		assert.equal(patRule.status, "failed");
		assert.equal(report.isValid, false);
	});

	it("5. UKEP signature rule: un-signed document should report warning and require signature", () => {
		const exportData: CdaExportData = {
			...validPatient,
			...validDoctor,
			...validClinic,
			...validClinical,
		};

		const xml = buildCdaXml(exportData);
		const report = validateCdaSemanticRules(exportData, xml, false);
		const signatureRule = report.rules.find((r) => r.id === "RULE_UKEP_SIGNATURE");
		assert.ok(signatureRule);
		assert.equal(signatureRule.status, "warning");
		assert.ok(signatureRule.message.includes("УКЭП врача еще не наложена"));
	});

	it("6. Canonicalize XML correctly normalizes CRLF and whitespace", () => {
		const rawXml = "\r\n  <ClinicalDocument>\r\n    <test>1</test>\r\n  </ClinicalDocument>  \r\n";
		const canonical = canonicalizeXml(rawXml);
		assert.ok(!canonical.includes("\r"));
		assert.equal(canonical.startsWith("<ClinicalDocument>"), true);
	});
});

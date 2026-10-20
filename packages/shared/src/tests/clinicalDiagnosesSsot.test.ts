import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	CLINICAL_DIAGNOSES_SSOT,
	getAllOutpatientDentalDiagnoses,
	getClinicalDiagnosisByIcd10,
	getClinicalDiagnosisById,
	getClinicalDiagnosesByCategory,
	getClinicalDiagnosesByToothState,
	searchClinicalDiagnoses,
	isOutpatientDentalDiagnosis,
	getStandardSoapProtocolForDiagnosis,
	toDiagnosisOption,
	CARIES_INITIAL_K020,
	CARIES_DENTIN_K021,
	CARIES_CEMENTUM_K022,
	CARIES_ARRESTED_K023,
	CARIES_OTHER_K028,
	CARIES_UNSPECIFIED_K029,
	PULPITIS_ACUTE_K040,
	PULPITIS_CHRONIC_K0403,
	PERIODONTITIS_ACUTE_K044,
	PERIODONTITIS_CHRONIC_K045,
	GINGIVITIS_ACUTE_K050,
	GINGIVITIS_CHRONIC_K051,
	PERIODONTITIS_CHRONIC_K053,
	STOMATITIS_APHTHOUS_K120,
	STOMATITIS_CATARRHAL_K121,
	WEDGE_DEFECT_K031,
	HYPERESTHESIA_K038,
	EDENTULISM_PARTIAL_K081,
	type ClinicalDiagnosisCategory,
} from "../clinical/clinicalDiagnosesSsot.js";

describe("Clinical Diagnoses & Protocols SSOT (Mandates 8e, 8i, 8k)", () => {
	test("CLINICAL_DIAGNOSES_SSOT contains all canonical outpatient dental diagnoses", () => {
		assert.equal(CLINICAL_DIAGNOSES_SSOT.length, 18, "Must contain exactly 18 canonical diagnoses");
		assert.equal(getAllOutpatientDentalDiagnoses().length, 18);
	});

	test("Zero duplicate IDs and zero duplicate ICD-10 codes in registry", () => {
		const idSet = new Set<string>();
		const icdSet = new Set<string>();

		for (const diag of CLINICAL_DIAGNOSES_SSOT) {
			assert.ok(!idSet.has(diag.id), `Duplicate diagnosis ID detected: ${diag.id}`);
			idSet.add(diag.id);

			const upperIcd = diag.icd10.toUpperCase();
			assert.ok(!icdSet.has(upperIcd), `Duplicate ICD-10 code detected: ${diag.icd10}`);
			icdSet.add(upperIcd);
		}
	});

	test("All diagnoses have valid Russian titles and clinical category", () => {
		const validCategories: ClinicalDiagnosisCategory[] = [
			"caries",
			"pulpitis",
			"periodontitis",
			"periodontal_disease",
			"mucosa_stomatitis",
			"non_carious",
			"edentulism",
		];

		for (const diag of CLINICAL_DIAGNOSES_SSOT) {
			assert.ok(diag.title.length > 5, `Title too short for ${diag.id}: ${diag.title}`);
			assert.ok(diag.shortTitle.length > 3, `Short title too short for ${diag.id}`);
			assert.ok(
				validCategories.includes(diag.category),
				`Invalid category ${diag.category} for ${diag.id}`,
			);
			assert.ok(diag.clinicalNotes.length > 10, `Clinical notes missing for ${diag.id}`);
		}
	});

	test("Every diagnosis has complete SOAP template protocol", () => {
		for (const diag of CLINICAL_DIAGNOSES_SSOT) {
			const soap = diag.soapTemplate;
			assert.ok(soap, `SOAP template missing for ${diag.id}`);
			assert.ok(soap.complaints.length > 5, `SOAP complaints missing for ${diag.id}`);
			assert.ok(soap.anamnesis.length > 5, `SOAP anamnesis missing for ${diag.id}`);
			assert.ok(soap.objective.length > 5, `SOAP objective missing for ${diag.id}`);
			assert.ok(soap.diagnosisText.includes(diag.icd10), `SOAP diagnosis must include code for ${diag.id}`);
			assert.ok(soap.treatmentPlan.length > 5, `SOAP treatmentPlan missing for ${diag.id}`);
			assert.ok(soap.recommendations.length > 5, `SOAP recommendations missing for ${diag.id}`);
		}
	});

	test("Recommended services conform to 804n nomenclature and integer kopecks invariant (Mandate 8b)", () => {
		for (const diag of CLINICAL_DIAGNOSES_SSOT) {
			assert.ok(diag.recommendedServices.length > 0, `Diagnosis ${diag.id} must have recommended services`);

			for (const svc of diag.recommendedServices) {
				assert.ok(svc.id, "Service must have an id");
				assert.ok(
					/^[A-B]\d{2}\.\d{2}\.\d{3}(\.\d{3})?$/.test(svc.code804n) || svc.code804n.startsWith("A") || svc.code804n.startsWith("B"),
					`Service ${svc.id} in ${diag.id} must have valid 804n code: ${svc.code804n}`,
				);
				assert.ok(Number.isInteger(svc.defaultPriceKopecks), `Kopecks must be integer in ${svc.id}`);
				assert.equal(
					svc.defaultPriceKopecks,
					Math.round(svc.defaultPriceRub * 100),
					`Kopecks must match RUB * 100 for ${svc.id}`,
				);
				assert.ok(svc.title.length > 3, "Service title must be valid");
				assert.ok(typeof svc.requiredByDefault === "boolean", "requiredByDefault must be boolean");
			}
		}
	});

	test("Lookup functions work accurately and case-insensitively", () => {
		// getClinicalDiagnosisByIcd10
		assert.equal(getClinicalDiagnosisByIcd10("K02.1")?.id, CARIES_DENTIN_K021.id);
		assert.equal(getClinicalDiagnosisByIcd10("k02.1")?.id, CARIES_DENTIN_K021.id);
		assert.equal(getClinicalDiagnosisByIcd10(" K04.0 ")?.id, PULPITIS_ACUTE_K040.id);
		assert.equal(getClinicalDiagnosisByIcd10("k04.5")?.id, PERIODONTITIS_CHRONIC_K045.id);
		assert.equal(getClinicalDiagnosisByIcd10("K08.1")?.id, EDENTULISM_PARTIAL_K081.id);
		assert.equal(getClinicalDiagnosisByIcd10("INVALID_CODE"), undefined);
		assert.equal(getClinicalDiagnosisByIcd10(""), undefined);

		// getClinicalDiagnosisById
		assert.equal(getClinicalDiagnosisById("diag_caries_dentin_k021")?.icd10, "K02.1");
		assert.equal(getClinicalDiagnosisById("diag_wedge_defect_k031")?.icd10, "K03.1");
		assert.equal(getClinicalDiagnosisById("non_existent"), undefined);

		// getClinicalDiagnosesByCategory
		const cariesList = getClinicalDiagnosesByCategory("caries");
		assert.equal(cariesList.length, 6, "Must find exactly 6 caries diagnoses");
		assert.ok(cariesList.every((d) => d.category === "caries"));

		const pulpitisList = getClinicalDiagnosesByCategory("pulpitis");
		assert.equal(pulpitisList.length, 2);

		const perioDiseaseList = getClinicalDiagnosesByCategory("periodontal_disease");
		assert.equal(perioDiseaseList.length, 3);

		// getClinicalDiagnosesByToothState
		const cariesStateList = getClinicalDiagnosesByToothState("Caries");
		assert.ok(cariesStateList.length >= 4);
		assert.ok(cariesStateList.every((d) => d.toothState === "Caries"));

		const missingStateList = getClinicalDiagnosesByToothState("Missing");
		assert.equal(missingStateList.length, 1);
		assert.equal(missingStateList[0]?.icd10, "K08.1");
	});

	test("searchClinicalDiagnoses filters accurately", () => {
		const searchK02 = searchClinicalDiagnoses("K02");
		assert.equal(searchK02.length, 6);

		const searchPulpa = searchClinicalDiagnoses("пульпит");
		assert.equal(searchPulpa.length, 2);

		const searchCaries = searchClinicalDiagnoses("кариес");
		assert.ok(searchCaries.length >= 6);

		const searchEmpty = searchClinicalDiagnoses("");
		assert.equal(searchEmpty.length, 18);
	});

	test("Eradicates academic in-patient bloat (oncology, hospital fractures, tuberculosis)", () => {
		// Valid outpatient codes
		assert.equal(isOutpatientDentalDiagnosis("K02.0"), true);
		assert.equal(isOutpatientDentalDiagnosis("K02.1"), true);
		assert.equal(isOutpatientDentalDiagnosis("K04.0"), true);
		assert.equal(isOutpatientDentalDiagnosis("K04.5"), true);
		assert.equal(isOutpatientDentalDiagnosis("K05.3"), true);
		assert.equal(isOutpatientDentalDiagnosis("K12.0"), true);
		assert.equal(isOutpatientDentalDiagnosis("K03.1"), true);
		assert.equal(isOutpatientDentalDiagnosis("K08.1"), true);

		// Academic in-patient bloat MUST be false
		assert.equal(isOutpatientDentalDiagnosis("C00"), false, "No oral cancer C00 in outpatient CRM");
		assert.equal(isOutpatientDentalDiagnosis("C02.9"), false, "No tongue oncology C02.9 in outpatient CRM");
		assert.equal(isOutpatientDentalDiagnosis("S02.4"), false, "No hospital maxillo-facial fracture S02.4");
		assert.equal(isOutpatientDentalDiagnosis("S02.6"), false, "No mandibular fracture S02.6 in chairside CRM");
		assert.equal(isOutpatientDentalDiagnosis("A18.0"), false, "No bone tuberculosis A18.0");
		assert.equal(isOutpatientDentalDiagnosis("Z01.2"), false, "Z01.2 is a screening reason, not a pathology");
		assert.equal(isOutpatientDentalDiagnosis(""), false);
	});

	test("SOAP helper protocol retrieval", () => {
		const soap = getStandardSoapProtocolForDiagnosis("K02.1");
		assert.ok(soap !== null);
		assert.ok(soap?.diagnosisText.includes("K02.1 Кариес дентина"));

		assert.equal(getStandardSoapProtocolForDiagnosis("NON_EXISTENT"), null);
	});

	test("toDiagnosisOption provides UI friendly representation", () => {
		const opt = toDiagnosisOption(CARIES_DENTIN_K021);
		assert.equal(opt.value, "K02.1");
		assert.equal(opt.code, "K02.1");
		assert.equal(opt.category, "caries");
		assert.ok(opt.label.includes("K02.1"));
		assert.ok(opt.label.includes("Кариес дентина"));
	});
});

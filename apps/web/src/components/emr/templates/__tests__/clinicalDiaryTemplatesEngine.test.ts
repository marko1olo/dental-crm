import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
	CLINICAL_CATEGORY_LABELS,
	getToothAnatomicalDescription,
	synthesize1ClickSoapDiary,
	formatStatutoryUnifiedSoapText,
	filterClinicalTemplates,
	getCore1ClickTemplates,
	getClinicalTemplateById,
	PHYSIOLOGICAL_NORM_PRESET,
} from "../clinicalDiaryTemplatesEngine";

describe("clinicalDiaryTemplatesEngine — 1. Core Catalog & 1-Click Presets", () => {
	it("contains all 7 core statutory 1-Click clinical protocols", () => {
		const coreList = getCore1ClickTemplates();
		assert.equal(coreList.length, 7);

		const coreIds = coreList.map((t) => t.id);
		assert.ok(coreIds.includes("caries_medium_k02_1"), "Must include Caries K02.1");
		assert.ok(coreIds.includes("pulpitis_acute_k04_0"), "Must include Pulpitis K04.0");
		assert.ok(coreIds.includes("periodontitis_chronic_k04_5"), "Must include Periodontitis K04.5");
		assert.ok(coreIds.includes("crown_prep_emax_k08_1"), "Must include Crown Prep E.max");
		assert.ok(coreIds.includes("implant_placement_k08_1"), "Must include Implant Placement");
		assert.ok(coreIds.includes("tooth_extraction_k08_1"), "Must include Tooth Extraction");
		assert.ok(coreIds.includes("hygiene_airflow_k05_3"), "Must include Hygiene Air-Flow");
	});

	it("has valid ICD-10 codes, categories, and 804n services for every template in catalog", () => {
		assert.ok(CLINICAL_1CLICK_TEMPLATES_CATALOG.length >= 10);
		for (const tmpl of CLINICAL_1CLICK_TEMPLATES_CATALOG) {
			assert.ok(tmpl.id.length > 0, `Template ID must not be empty`);
			assert.ok(tmpl.title.length > 0, `Template title must not be empty`);
			assert.ok(tmpl.icd10Code.length > 0, `ICD-10 code must not be empty for ${tmpl.id}`);
			assert.ok(tmpl.category in CLINICAL_CATEGORY_LABELS, `Category ${tmpl.category} must be valid`);
			assert.ok(tmpl.defaultSubjectiveComplaints.length > 0, `Subjective must not be empty for ${tmpl.id}`);
			assert.ok(tmpl.defaultProcedureProtocol.length > 0, `Procedure must not be empty for ${tmpl.id}`);
			assert.ok(tmpl.order804nServices.length > 0, `804n services must not be empty for ${tmpl.id}`);

			for (const svc of tmpl.order804nServices) {
				assert.match(svc.code, /^[A-Z]\d{2}\.\d{2}/, `804n code ${svc.code} must match standard format`);
				assert.ok(svc.nameRu.length > 0, `804n service name must not be empty`);
			}
		}
	});

	it("every 804n service item in catalog and norm preset has exact priceKopecks (integer > 0)", () => {
		for (const tmpl of [...CLINICAL_1CLICK_TEMPLATES_CATALOG, PHYSIOLOGICAL_NORM_PRESET]) {
			for (const svc of tmpl.order804nServices) {
				assert.ok(
					typeof svc.priceKopecks === "number" &&
						Number.isInteger(svc.priceKopecks) &&
						svc.priceKopecks > 0,
					`Service ${svc.code} in template ${tmpl.id} must have exact positive integer priceKopecks`,
				);
			}
		}
	});
});

describe("clinicalDiaryTemplatesEngine — 2. Tooth Anatomical Russian Naming", () => {
	it("formats Russian anatomical descriptions for permanent teeth", () => {
		assert.equal(getToothAnatomicalDescription(16), "зуба 16 (верхний правый первый моляр)");
		assert.equal(getToothAnatomicalDescription(21), "зуба 21 (верхний левый центральный резец)");
		assert.equal(getToothAnatomicalDescription(36), "зуба 36 (нижний левый первый моляр)");
		assert.equal(getToothAnatomicalDescription(48), "зуба 48 (нижний правый третий моляр (зуб мудрости))");
	});

	it("formats Russian anatomical descriptions for primary teeth", () => {
		assert.equal(getToothAnatomicalDescription(55), "зуба 55 (верхний правый временный второй моляр)");
		assert.equal(getToothAnatomicalDescription(71), "зуба 71 (нижний левый временный центральный резец)");
	});

	it("handles string numbers, null, and non-standard tooth numbers safely", () => {
		assert.equal(getToothAnatomicalDescription("16"), "зуба 16 (верхний правый первый моляр)");
		assert.equal(getToothAnatomicalDescription(null), "зуба");
		assert.equal(getToothAnatomicalDescription(undefined), "зуба");
		assert.equal(getToothAnatomicalDescription("99"), "зуба № 99");
	});
});

describe("clinicalDiaryTemplatesEngine — 3. 1-Click Synthesis of Core Protocols", () => {
	it("synthesizes Caries K02.1 protocol with tooth interpolation and 804n services", () => {
		const res = synthesize1ClickSoapDiary("caries_medium_k02_1", {
			toothNumber: 16,
			doctorFullName: "Волкова Екатерина Сергеевна",
			doctorSpecialty: "Врач-стоматолог-терапевт",
		});

		assert.equal(res.templateId, "caries_medium_k02_1");
		assert.equal(res.icd10Code, "K02.1");
		assert.equal(res.toothNumber, 16);
		assert.match(res.assessmentDiagnosisText, /K02.1.*зуба 16/);
		assert.match(res.objectiveStatusLocalis, /зуба 16 \(верхний правый первый моляр\)/);
		assert.match(res.procedureProtocol, /коффердам/i);
		assert.match(res.procedureProtocol, /селективное протравливание.*37% H3PO4/i);
		assert.match(res.procedureProtocol, /OptiBond|Prime&Bond/i);
		assert.match(res.procedureProtocol, /Filtek Ultimate.*оттенок A2/i);
		assert.match(res.procedureProtocol, /Sof-Lex.*Enhance.*Prisma Gloss/i);
		assert.equal(res.totalEstimatedKopecks, 480000); // 350000 + 80000 + 50000

		// Unified text checks
		assert.match(res.unifiedSoapText, /ЖАЛОБЫ \(S\):/);
		assert.match(res.unifiedSoapText, /АНАМНЕЗ ЗАБОЛЕВАНИЯ \(S\):/);
		assert.match(res.unifiedSoapText, /ОБЪЕКТИВНЫЙ СТАТУС \/ STATUS LOCALIS \(O\):/);
		assert.match(res.unifiedSoapText, /КЛИНИЧЕСКИЙ ДИАГНОЗ ПО МКБ-10 \(A\):/);
		assert.match(res.unifiedSoapText, /ПРОТОКОЛ ЛЕЧЕНИЯ \(P\):/);
		assert.match(res.unifiedSoapText, /ОКАЗАННЫЕ УСЛУГИ \(НОМЕНКЛАТУРА 804н\):/);
		assert.match(res.unifiedSoapText, /A16\.07\.002\.001.*3\s500\s₽/);
		assert.match(res.unifiedSoapText, /A16\.07\.031.*800\s₽/);
		assert.match(res.unifiedSoapText, /Врач: Волкова Екатерина Сергеевна/);
	});

	it("synthesizes Pulpitis K04.0 protocol with endodontic instrumentation and obturation", () => {
		const res = synthesize1ClickSoapDiary("pulpitis_acute_k04_0", {
			toothNumber: 26,
			doctorFullName: "Смирнов Алексей Павлович",
		});

		assert.equal(res.icd10Code, "K04.0");
		assert.equal(res.toothNumber, 26);
		assert.match(res.subjectiveComplaints, /ночное время/);
		assert.match(res.objectiveStatusLocalis, /пульпа кровоточит/);
		assert.match(res.procedureProtocol, /WaveOne Gold|ProTaper Gold/i);
		assert.match(res.procedureProtocol, /NaOCl.*ультразвук/i);
		assert.match(res.procedureProtocol, /17% EDTA/i);
		assert.match(res.procedureProtocol, /непрерывн.*волн/i);
		assert.match(res.procedureProtocol, /AH Plus/i);
		assert.match(res.procedureProtocol, /РВГ-контроль|RVG/i);
		assert.ok(typeof res.totalEstimatedKopecks === "number" && res.totalEstimatedKopecks > 0);
		assert.ok(res.order804nServices.some((s) => s.code.startsWith("A16.07.030")));
		assert.ok(res.order804nServices.some((s) => s.code.startsWith("A16.07.008")));
	});

	it("synthesizes Periodontitis K04.5 protocol with temporary calcium hydroxide medication", () => {
		const res = synthesize1ClickSoapDiary("periodontitis_chronic_k04_5", {
			toothNumber: 36,
		});

		assert.equal(res.icd10Code, "K04.5");
		assert.match(res.assessmentDiagnosisText, /Хронический апикальный периодонтит/);
		assert.match(res.procedureProtocol, /Кальсепт|Metapex/i);
		assert.match(res.procedureProtocol, /герметич.*повязк/i);
		assert.match(res.homeCareRecommendations, /Нимесил/);
		assert.ok(typeof res.totalEstimatedKopecks === "number" && res.totalEstimatedKopecks > 0);
		assert.ok(res.order804nServices.some((s) => s.code === "A16.07.091"));
	});

	it("synthesizes Crown Prep E.max protocol with retraction and impressions", () => {
		const res = synthesize1ClickSoapDiary("crown_prep_emax_k08_1", {
			toothNumber: 14,
		});

		assert.equal(res.icd10Code, "K08.1");
		assert.match(res.procedureProtocol, /IPS e\.max/);
		assert.match(res.procedureProtocol, /Chamfer/);
		assert.match(res.procedureProtocol, /Protemp|Luxatemp/);
		assert.ok(res.order804nServices.some((s) => s.code === "A16.07.004"));
		assert.ok(res.order804nServices.some((s) => s.code === "A02.07.010"));
	});

	it("synthesizes Implant Placement surgery protocol with torque and bone cooling", () => {
		const res = synthesize1ClickSoapDiary("implant_placement_k08_1", {
			toothNumber: 46,
		});

		assert.equal(res.icd10Code, "K08.1");
		assert.match(res.procedureProtocol, /Внутрикостная дентальная имплантация|торк/i);
		assert.match(res.procedureProtocol, /0\.9% NaCl/);
		assert.match(res.homeCareRecommendations, /Амоксиклав/);
		assert.ok(res.order804nServices.some((s) => s.code === "A16.07.054"));
	});

	it("synthesizes Tooth Extraction surgery protocol with socket curettage and hemostasis", () => {
		const res = synthesize1ClickSoapDiary("tooth_extraction_k08_1", {
			toothNumber: 48,
		});

		assert.equal(res.icd10Code, "K08.1");
		assert.match(res.procedureProtocol, /Синдесмотомия/);
		assert.match(res.procedureProtocol, /ложк.*Люкаса/i);
		assert.match(res.procedureProtocol, /Альвостим/);
		assert.ok(res.order804nServices.some((s) => s.code === "A16.07.001"));
	});

	it("synthesizes Complex Tooth Extraction K01.1 protocol with flap, sectioning, and sutures", () => {
		const res = synthesize1ClickSoapDiary("tooth_extraction_complex_k01_1", {
			toothNumber: 38,
		});

		assert.equal(res.icd10Code, "K01.1");
		assert.match(res.assessmentDiagnosisText, /K01\.1/);
		assert.match(res.procedureProtocol, /слизисто-надкостничн.*лоскут/i);
		assert.match(res.procedureProtocol, /сепарация|разъединение|фрагмент/i);
		assert.match(res.procedureProtocol, /Альвостим с йодоформом/i);
		assert.match(res.procedureProtocol, /шв.*Викрил/i);
		assert.ok(typeof res.totalEstimatedKopecks === "number" && res.totalEstimatedKopecks > 0);
		assert.ok(res.order804nServices.some((s) => s.code === "A16.07.001.002"));
	});

	it("synthesizes Hygiene Air-Flow protocol with ultrasonic scaling and remineralization", () => {
		const res = synthesize1ClickSoapDiary("hygiene_airflow_k05_3");

		assert.equal(res.icd10Code, "K05.3");
		assert.match(res.procedureProtocol, /Piezon Master/);
		assert.match(res.procedureProtocol, /Air-Flow Plus|глицин/);
		assert.match(res.procedureProtocol, /Cleanic/);
		assert.match(res.procedureProtocol, /Clinpro White Varnish/);
		assert.match(res.homeCareRecommendations, /Белая диета/);
		assert.ok(typeof res.totalEstimatedKopecks === "number" && res.totalEstimatedKopecks > 0);
		assert.ok(res.order804nServices.some((s) => s.code === "A16.07.051"));
	});

	it("synthesizes 1-Click Physiological Norm Z01.2 according to Mandate 8e", () => {
		const res = synthesize1ClickSoapDiary("somatic_healthy_norm");

		assert.equal(res.icd10Code, "Z01.2");
		assert.match(res.assessmentDiagnosisText, /Z01\.2/);
		assert.match(res.objectiveStatusLocalis, /Врач правит только патологию/);
		assert.equal(res.order804nServices[0]?.code, "B01.065.001");
		assert.equal(res.order804nServices[0]?.priceKopecks, 150000);
		assert.equal(res.totalEstimatedKopecks, 150000);
	});
});

describe("clinicalDiaryTemplatesEngine — 4. Custom Overrides & Extended Cases", () => {
	it("allows custom anesthesia and custom materials override", () => {
		const res = synthesize1ClickSoapDiary("caries_medium_k02_1", {
			toothNumber: 24,
			customAnesthesia: "Инфильтрационная анестезия Sol. Ultracaini DS Forte — 1.7 мл",
			customMaterials: ["Коффердам Sanctuary", "Адгезив Single Bond Universal", "Композит Gradia Direct"],
		});

		assert.equal(res.anesthesiaDetails, "Инфильтрационная анестезия Sol. Ultracaini DS Forte — 1.7 мл");
		assert.equal(res.appliedMaterials, "Коффердам Sanctuary, Адгезив Single Bond Universal, Композит Gradia Direct");
		assert.match(res.unifiedSoapText, /Ultracaini DS Forte/);
		assert.match(res.unifiedSoapText, /Gradia Direct/);
	});

	it("includes custom doctor notes in synthesized text", () => {
		const res = synthesize1ClickSoapDiary("caries_medium_k02_1", {
			toothNumber: 15,
			customNotes: "Пациент предупрежден о риске депульпирования при обострении болей.",
		});

		assert.match(res.unifiedSoapText, /Пациент предупрежден о риске депульпирования/);
	});

	it("safely falls back to default template when unrecognized ID is provided", () => {
		const res = synthesize1ClickSoapDiary("non_existent_protocol_key");
		assert.equal(res.templateId, "caries_medium_k02_1");
		assert.equal(res.icd10Code, "K02.1");
	});
});

describe("clinicalDiaryTemplatesEngine — 5. Search and Filtering", () => {
	it("filters templates by keyword query with Russian e/ё normalization", () => {
		const cariesRes = filterClinicalTemplates("кариес");
		assert.ok(cariesRes.length >= 2);
		assert.ok(cariesRes.some((t) => t.id === "caries_medium_k02_1"));

		const pulpitisRes = filterClinicalTemplates("пульпит");
		assert.ok(pulpitisRes.some((t) => t.id === "pulpitis_acute_k04_0"));

		const implantRes = filterClinicalTemplates("имплант");
		assert.ok(implantRes.some((t) => t.id === "implant_placement_k08_1"));
	});

	it("filters templates by category", () => {
		const therapyList = filterClinicalTemplates(null, "therapy");
		assert.ok(therapyList.length >= 2);
		assert.ok(therapyList.every((t) => t.category === "therapy"));

		const surgeryList = filterClinicalTemplates(null, "surgery");
		assert.ok(surgeryList.length >= 2);
		assert.ok(surgeryList.every((t) => t.category === "surgery"));

		const endoList = filterClinicalTemplates(null, "endodontics");
		assert.ok(endoList.length >= 2);
		assert.ok(endoList.every((t) => t.category === "endodontics"));
	});

	it("looks up templates by ID and ICD-10 code using getClinicalTemplateById", () => {
		const t1 = getClinicalTemplateById("caries_medium_k02_1");
		assert.ok(t1);
		assert.equal(t1?.icd10Code, "K02.1");

		const t2 = getClinicalTemplateById("K04.0");
		assert.ok(t2);
		assert.equal(t2?.id, "pulpitis_acute_k04_0");

		const t3 = getClinicalTemplateById("unknown_code");
		assert.equal(t3, undefined);
	});
});

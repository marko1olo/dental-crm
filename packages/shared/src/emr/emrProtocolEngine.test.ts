import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isValidFdiToothNumber,
	deduceBlackClassFromSurfaces,
	getClinicalProtocolTemplate,
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
	synthesizeProtocolFromOrder804nService,
	enrichDiaryFrom804nServices,
	formatStatutorySoapSummary,
} from "./emrProtocolEngine.js";
import {
	STATUTORY_EMR_PROTOCOL_CATALOG,
	statutoryAnestheticDrugLabels,
	anestheticDrugLabels,
	blackCavityClassLabels,
} from "./emrProtocolPresets.js";

describe("Shared EMR Protocol Engine — FDI & Cavity Morphology", () => {
	it("validates FDI 2-digit tooth numbers for permanent and primary dentition", () => {
		// Permanent quadrants 1-4, teeth 1-8
		assert.equal(isValidFdiToothNumber(11), true);
		assert.equal(isValidFdiToothNumber(16), true);
		assert.equal(isValidFdiToothNumber(28), true);
		assert.equal(isValidFdiToothNumber(37), true);
		assert.equal(isValidFdiToothNumber(48), true);

		// Primary quadrants 5-8, teeth 1-5
		assert.equal(isValidFdiToothNumber(51), true);
		assert.equal(isValidFdiToothNumber(65), true);
		assert.equal(isValidFdiToothNumber(73), true);
		assert.equal(isValidFdiToothNumber(85), true);

		// Invalid numbers
		assert.equal(isValidFdiToothNumber(19), false);
		assert.equal(isValidFdiToothNumber(56), false);
		assert.equal(isValidFdiToothNumber(91), false);
		assert.equal(isValidFdiToothNumber(0), false);
		assert.equal(isValidFdiToothNumber(null), false);
		assert.equal(isValidFdiToothNumber("invalid"), false);
	});

	it("deduces Black cavity classifications accurately from tooth surfaces and anatomy", () => {
		// Posterior: occlusal = class I
		assert.equal(deduceBlackClassFromSurfaces(16, ["occlusal"]), "class_I");
		// Posterior: mesial/distal = class II
		assert.equal(deduceBlackClassFromSurfaces(26, ["mesial", "occlusal"]), "class_II");
		assert.equal(deduceBlackClassFromSurfaces(36, ["distal"]), "class_II");
		// Posterior: vestibular/oral = class V
		assert.equal(deduceBlackClassFromSurfaces(47, ["vestibular"]), "class_V");
		assert.equal(deduceBlackClassFromSurfaces(47, ["oral"]), "class_V");

		// Anterior (11-13, 21-23, 31-33, 41-43)
		assert.equal(deduceBlackClassFromSurfaces(11, ["mesial"]), "class_III");
		assert.equal(deduceBlackClassFromSurfaces(21, ["distal", "occlusal"]), "class_IV");
		assert.equal(deduceBlackClassFromSurfaces(12, ["vestibular"]), "class_V");
		assert.equal(deduceBlackClassFromSurfaces(11, ["oral"]), "class_I");
	});

	it("verifies statutory drug and cavity class labels mapping", () => {
		assert.ok(Object.keys(statutoryAnestheticDrugLabels).length >= 4);
		assert.ok(statutoryAnestheticDrugLabels.septanest_1_100000.name.includes("Септанест"));
		assert.ok(anestheticDrugLabels.septanest_1_100000.activeSubstance.includes("Артикаин"));
		assert.equal(blackCavityClassLabels.class_I, "Класс I по Блэку (фиссуры, естественные ямки жевательных зубов)");
		assert.equal(blackCavityClassLabels.class_II, "Класс II по Блэку (апроксимальные/контактные поверхности моляров и премоляров)");
	});
});

describe("Shared EMR Protocol Engine — SOAP Diary Synthesis", () => {
	it("synthesizes complete clinical SOAP diary for Caries of Dentine (K02.1)", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 16,
			icd10Code: "K02.1",
			surfaces: ["occlusal", "distal"],
			doctorFullName: "Волкова Екатерина Сергеевна",
			doctorSpecialty: "Врач-стоматолог-терапевт",
		});

		assert.ok(diary.id.startsWith("diary-"));
		assert.equal(diary.toothNumber, "16");
		assert.equal(diary.assessmentIcd10Code, "K02.1");
		assert.ok(diary.subjectiveComplaints.includes("Жалобы в области зуба 16"));
		assert.ok(diary.objectiveStatusLocalis.includes("зуба 16"));
		assert.ok(diary.procedureProtocol.includes("Местная"));
		assert.ok(diary.procedureProtocol.includes("коффердам"));
		assert.ok(diary.procedureProtocol.includes("Адгезивный"));
		assert.match(diary.procedureProtocol, /37%/);
		assert.match(diary.procedureProtocol, /OptiBond/i);
		assert.match(diary.procedureProtocol, /Filtek|Estelite/i);
		assert.ok(diary.appliedMaterials!.includes("Septanest"));
		assert.equal(diary.percussionVertical, "negative");
		assert.equal(diary.thermalTestResponse, "transient_pain");
	});

	it("synthesizes therapy protocol for K02.1 (single occlusal surface)", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 16,
			icd10Code: "K02.1",
			surfaces: ["occlusal"],
			doctorFullName: "Волкова Е.С.",
		});

		assert.strictEqual(diary.toothNumber, "16");
		assert.strictEqual(diary.assessmentIcd10Code, "K02.1");
		assert.match(diary.procedureProtocol, /коффердам/i);
		assert.match(diary.procedureProtocol, /37%/);
		assert.match(diary.procedureProtocol, /OptiBond/i);
		assert.match(diary.procedureProtocol, /Filtek|Estelite/i);
	});

	it("synthesizes endodontic SOAP diary with rubber dam and apex locator for Pulpitis (K04.0)", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 26,
			icd10Code: "K04.0",
			rootCanalsCount: 3,
			doctorFullName: "Волкова Е.С.",
			isMultiVisitEndo: true,
			endoVisitStage: "access_instrumentation_temporary_calcium",
		});

		assert.equal(diary.assessmentIcd10Code, "K04.0");
		assert.ok(diary.procedureProtocol.includes("коффердам"));
		assert.ok(diary.procedureProtocol.includes("апекслокатор"));
		assert.ok(diary.procedureProtocol.includes("NaOCl"));
		assert.ok(diary.procedureProtocol.includes("гидроксидом кальция"));
	});

	it("synthesizes endodontic protocol for K04.0 with apex locator and warm vertical condensation", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 36,
			icd10Code: "K04.0",
			rootCanalsCount: 3,
			doctorFullName: "Смирнов А.В.",
		});

		assert.strictEqual(diary.toothNumber, "36");
		assert.strictEqual(diary.assessmentIcd10Code, "K04.0");
		assert.match(diary.procedureProtocol, /апекслокатор/i);
		assert.match(diary.procedureProtocol, /RVG/i);
		assert.match(diary.procedureProtocol, /WaveOne|ProTaper/i);
		assert.match(diary.procedureProtocol, /3% NaOCl/i);
		assert.match(diary.procedureProtocol, /AH Plus/i);
	});

	it("synthesizes surgical extraction protocol for K08.1", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 48,
			icd10Code: "K08.1",
			doctorFullName: "Ковалев Д.И.",
		});

		assert.strictEqual(diary.toothNumber, "48");
		assert.strictEqual(diary.assessmentIcd10Code, "K08.1");
		assert.match(diary.procedureProtocol, /синдесмотомия/i);
		assert.match(diary.procedureProtocol, /кюретаж/i);
		assert.match(diary.procedureProtocol, /Альвостим|Spongostan/i);
		assert.match(diary.procedureProtocol, /Викрил 4-0|Vicryl/i);
	});

	it("synthesizes multi-tooth diaries from FDI odontogram", () => {
		const teeth = [
			{ toothNumber: 16, statusCode: "caries_media", surfaces: ["occlusal"] as const },
			{ toothNumber: 24, statusCode: "pulpitis_acute", surfaces: ["occlusal", "distal"] as const, rootCanalsCount: 2 },
			{ toothNumber: 36, statusCode: "healthy", surfaces: [] as const },
			{ toothNumber: 48, statusCode: "extracted_absent", surfaces: [] as const },
		];

		const diaries = synthesizeDiariesFromOdontogram(teeth as any, {
			fullName: "Кузнецов Д.И.",
			specialty: "Стоматолог общей практики",
		});

		// Healthy and extracted teeth must be skipped
		assert.equal(diaries.length, 2);
		assert.equal(diaries[0]?.toothNumber, "16");
		assert.equal(diaries[0]?.assessmentIcd10Code, "K02.1");
		assert.equal(diaries[1]?.toothNumber, "24");
		assert.equal(diaries[1]?.assessmentIcd10Code, "K04.0");
	});
});

describe("Shared EMR Protocol Engine — Order 834n & 203n Compliance Validation", () => {
	it("evaluates a compliant medical card with high compliance score (>= 90%)", () => {
		const validCard = {
			formNumber: "043/у",
			passport: {
				patientFullName: "Иванов Иван Иванович",
				medicalCardNumber: "043-у/2026-01",
				patientBirthDate: "1988-04-12",
				patientIdentityDocument: "Паспорт РФ 45 12 № 123456",
			},
			anamnesis: {
				allergologicalHistory: "Аллергических реакций на анестетики не выявлено.",
				chiefComplaint: "Кратковременные боли от холодного в зубе 16.",
			},
			dentalStatus: {
				odontogramTeeth: [{ toothNumber: 16, statusCode: "caries_media" }],
			},
			visitDiaries: [
				{
					subjectiveComplaints: "Жалобы на боли от температурных раздражителей.",
					objectiveStatusLocalis: "Кариозная полость средней глубины на окклюзионной поверхности 16.",
					assessmentIcd10Code: "K02.1",
					assessmentDiagnosisText: "Кариес дентина зуба 16",
					procedureProtocol: "Анестезия Убистезин 1.7 мл, коффердам, препарирование, адгезив, пломба композит, шлифовка.",
					doctorFullName: "Волкова Е.С.",
				},
			],
		};

		const report = validateForm043uCompliance(validCard);
		assert.equal(report.isCompliant, true);
		assert.ok(report.complianceScore >= 90);
		assert.equal(report.criticalDefectsCount, 0);
		assert.equal(report.missingMandatoryBlocks.length, 0);
	});

	it("flags critical defects when allergological history and patient identity are missing", () => {
		const defectiveCard = {
			formNumber: "043/у",
			passport: {
				patientFullName: "И", // Less than 3 chars
				medicalCardNumber: "", // Missing
				patientBirthDate: "", // Missing
			},
			anamnesis: {
				allergologicalHistory: "", // Missing critical
				chiefComplaint: "",
			},
			visitDiaries: [],
		};

		const report = validateForm043uCompliance(defectiveCard);
		assert.equal(report.isCompliant, false);
		assert.ok(report.criticalDefectsCount >= 4);
		assert.ok(report.missingMandatoryBlocks.includes("Паспортная часть: ФИО пациента"));
		assert.ok(report.missingMandatoryBlocks.includes("Паспортная часть: Номер медицинской карты"));
		assert.ok(report.missingMandatoryBlocks.includes("Анамнез: Аллергологический статус"));
		assert.ok(report.missingMandatoryBlocks.includes("Дневник приёма (Форма 043/у)"));
	});

	it("detects lack of rubber dam and RVG in endodontic procedures", () => {
		const endoDiaryWithoutRubberDam = {
			subjectiveComplaints: "Острые ночные боли в зубе 26.",
			objectiveStatusLocalis: "Глубокая кариозная полость, вскрытая точка, резкая болезненность при зондировании.",
			assessmentIcd10Code: "K04.0",
			assessmentDiagnosisText: "Острый очаговый пульпит зуба 26",
			procedureProtocol: "Проведено раскрытие полости зуба, экстирпация пульпы, расширение каналов, пломбирование пастой.", // Missing rubber dam and RVG
			doctorFullName: "Кузнецов Д.И.",
		};

		const report = validateForm043uCompliance(endoDiaryWithoutRubberDam);
		assert.equal(report.semanticChecks.rubberDamCompliant, false);
		assert.equal(report.semanticChecks.rvgControlDocumented, false);
		assert.ok(report.issues.some((i) => i.blockKey === "isolation"));
		assert.ok(report.issues.some((i) => i.blockKey === "radiology"));
	});

	it("validates compliance with 100% score for synthesized valid diary", () => {
		const validDiary = synthesizeClinicalDiary({
			toothNumber: 16,
			icd10Code: "K02.1",
			doctorFullName: "Волкова Е.С.",
		});

		const report = validateForm043uCompliance(validDiary);
		assert.strictEqual(report.isCompliant, true);
		assert.strictEqual(report.complianceScore, 100);
	});
});

describe("Shared EMR Protocol Engine — Order 804n Statutory Services & Summary Formatting", () => {
	it("verifies Order 804n service code mappings for all statutory protocol templates", () => {
		const protocolKeys = Object.keys(STATUTORY_EMR_PROTOCOL_CATALOG);
		assert.ok(protocolKeys.length >= 5);

		for (const key of protocolKeys) {
			const template = STATUTORY_EMR_PROTOCOL_CATALOG[key]!;
			assert.ok(template.order804nServices, `Template ${key} must have order804nServices defined`);
			assert.ok(template.order804nServices.length > 0, `Template ${key} must map to at least 1 Order 804n service code`);

			for (const s of template.order804nServices) {
				assert.match(s.code, /^A\d{2}\.\d{2}\.\d{3}(\.\d{3})?$/, `Service code ${s.code} in ${key} must follow Order 804n format`);
				assert.ok(s.nameRu.length > 5, `Service name in ${key} must not be empty`);
			}
		}

		// Caries: must map to A16.07.002
		const caries = STATUTORY_EMR_PROTOCOL_CATALOG["K02.1"]!;
		assert.ok(caries.order804nServices.some((s) => s.code.startsWith("A16.07.002")));

		// Pulpitis: must map to A16.07.030 (root canal prep) and A16.07.008 (obturation)
		const pulpitis = STATUTORY_EMR_PROTOCOL_CATALOG["K04.0"]!;
		assert.ok(pulpitis.order804nServices.some((s) => s.code.startsWith("A16.07.030")));
		assert.ok(pulpitis.order804nServices.some((s) => s.code.startsWith("A16.07.008")));

		// Extraction: must map to A16.07.001
		const extraction = STATUTORY_EMR_PROTOCOL_CATALOG["K08.1"]!;
		assert.ok(extraction.order804nServices.some((s) => s.code.startsWith("A16.07.001")));
	});

	it("synthesizes structured clinical protocol from Order 804n service code", () => {
		const cariesDef = synthesizeProtocolFromOrder804nService("A16.07.002.001");
		assert.strictEqual(cariesDef.primaryIcd10, "K02.1");
		assert.match(cariesDef.protocolStepRu, /коффердам/i);
		assert.match(cariesDef.protocolStepRu, /37%/);
		assert.match(cariesDef.protocolStepRu, /OptiBond/i);
		assert.match(cariesDef.protocolStepRu, /Filtek|Estelite/i);

		const endoPrepDef = synthesizeProtocolFromOrder804nService("A16.07.030.001");
		assert.strictEqual(endoPrepDef.primaryIcd10, "K04.0");
		assert.match(endoPrepDef.protocolStepRu, /апекслокатор/i);
		assert.match(endoPrepDef.protocolStepRu, /WaveOne|ProTaper/i);
		assert.match(endoPrepDef.protocolStepRu, /NaOCl/);

		const endoObtDef = synthesizeProtocolFromOrder804nService("A16.07.008.001");
		assert.strictEqual(endoObtDef.primaryIcd10, "K04.0");
		assert.match(endoObtDef.protocolStepRu, /AH Plus/i);
		assert.match(endoObtDef.protocolStepRu, /гуттаперч/i);

		const extractionDef = synthesizeProtocolFromOrder804nService("A16.07.001.001");
		assert.strictEqual(extractionDef.primaryIcd10, "K08.1");
		assert.match(extractionDef.protocolStepRu, /синдесмотомия/i);
		assert.match(extractionDef.protocolStepRu, /кюретаж/i);

		const perioDef = synthesizeProtocolFromOrder804nService("A16.07.051");
		assert.strictEqual(perioDef.primaryIcd10, "K05.0");
		assert.match(perioDef.protocolStepRu, /Air-Flow/i);
		assert.match(perioDef.protocolStepRu, /Clinpro/i);
	});

	it("100% preserves existing doctor text when enriching diary with 804n services (Non-Destructive)", () => {
		const doctorAuthoredDiary = {
			entryDate: "2026-08-25",
			toothNumber: "16",
			subjectiveComplaints: "Пациент жалуется на ноющие боли после сладкого, пломба выпала 2 дня назад. Аллергия на пенициллин!",
			objectiveStatusLocalis: "Зуб 16: глубокая полость на окклюзионной и дистальной поверхности, десна интактна.",
			procedureProtocol: "Проведена инфильтрационная анестезия Septanest 1.7 мл.",
			assessmentDiagnosisText: "Кариес дентина (K02.1)",
			assessmentIcd10Code: "K02.1",
		};

		const enriched = enrichDiaryFrom804nServices(
			doctorAuthoredDiary,
			["A16.07.002.002", "A16.07.031"],
			{ toothNumber: "16", doctorFullName: "Петров П.П." },
		);

		// Complaints must NOT be overwritten!
		assert.strictEqual(enriched.subjectiveComplaints, doctorAuthoredDiary.subjectiveComplaints);
		assert.match(enriched.subjectiveComplaints, /Аллергия на пенициллин/);

		// Status Localis must NOT be overwritten!
		assert.strictEqual(enriched.objectiveStatusLocalis, doctorAuthoredDiary.objectiveStatusLocalis);

		// Protocol must contain initial anesthesia AND enriched composite/preparation steps
		assert.match(enriched.procedureProtocol, /Septanest/);
		assert.match(enriched.procedureProtocol, /матриц/i);
		assert.match(enriched.procedureProtocol, /коффердам/i);
		assert.match(enriched.procedureProtocol, /Garrison/i);

		// Materials should be merged
		assert.ok(enriched.appliedMaterials);
		assert.match(enriched.appliedMaterials!, /Garrison/);
	});

	it("formats statutory SOAP diary into readable preview text (Order № 834n)", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 21,
			icd10Code: "K02.1",
			surfaces: ["vestibular"],
			doctorFullName: "Петров П.П.",
			doctorSpecialty: "Врач-стоматолог-терапевт",
		});

		const formatted = formatStatutorySoapSummary(diary);
		assert.match(formatted, /ДНЕВНИК ПРИЁМА ФОРМЫ 043\/у/);
		assert.match(formatted, /\[Зуб 21\]/);
		assert.match(formatted, /S \(ЖАЛОБЫ\):/);
		assert.match(formatted, /O \(STATUS LOCALIS\):/);
		assert.match(formatted, /A \(ДИАГНОЗ МКБ-10\):/);
		assert.match(formatted, /P \(ПРОТОКОЛ ВМЕШАТЕЛЬСТВА\):/);
		assert.match(formatted, /Петров П\.П\./);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isValidFdiToothNumber,
	deduceBlackClassFromSurfaces,
	getClinicalProtocolTemplate,
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
} from "./emrProtocolEngine.js";
import {
	STATUTORY_EMR_PROTOCOL_CATALOG,
	statutoryAnestheticDrugLabels,
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
		assert.ok(diary.appliedMaterials!.includes("Septanest"));
		assert.equal(diary.percussionVertical, "negative");
		assert.equal(diary.thermalTestResponse, "transient_pain");
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
		assert.ok(report.missingMandatoryBlocks.includes("Дневник приёма (SOAP)"));
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
});

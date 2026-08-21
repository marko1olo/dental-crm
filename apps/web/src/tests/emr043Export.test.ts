import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateDmftIndex,
	calculateCpitnIndex,
	calculateOhiSScore,
	formatPatientAge,
	validateForm043uCompleteness,
	generatePrintableHtml043,
	generate043XmlCda,
	generate043JsonExport,
	generate043PlainText,
	escapeHtml,
	escapeXml,
} from "../components/emr/emr043Math";
import type { MedicalCardForm043uData } from "../components/emr/emr043Types";
import type { FdiToothRecord } from "@dental/shared";

const MOCK_CARD_DATA: MedicalCardForm043uData = {
	formNumber: "043/у",
	formOrderName: "Приказ Минздрава России от 15.12.2014 № 834н",
	clinic: {
		clinicName: "Клиника ДЕНТЕ",
		clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicAddress: "г. Москва, ул. Усачёва, д. 29",
		clinicPhone: "+7 (495) 789-20-20",
		clinicOgrn: "1237700456789",
		clinicInn: "7704812345",
		clinicKpp: "770401001",
		licenseNumber: "ЛО-77-01-021456",
		licenseDate: "15.03.2023",
		licenseIssuer: "Департамент здравоохранения города Москвы",
		chiefDoctorFullName: "Прохоров К.И.",
	},
	passport: {
		medicalCardNumber: "СТ-2026-0843",
		cardOpenedDate: "2026-08-20",
		patientFullName: "Смирнов Алексей Владимирович",
		patientBirthDate: "1990-05-15",
		patientSex: "male",
		patientPhone: "+7 (916) 555-43-21",
		patientEmail: "smirnov@example.com",
		patientAddressRegistration: "г. Москва, пр-кт Вернадского, д. 44, кв. 112",
		patientAddressResidence: "г. Москва, пр-кт Вернадского, д. 44, кв. 112",
		patientIdentityDocument: "Паспорт гражданина РФ 45 12 № 890123, выдан ОВД Хамовники 25.06.2010",
		patientSnils: "142-890-432 78",
		patientInsurancePolicy: "7756123490871234",
		patientInsuranceCompany: "АО «СОГАЗ-Мед»",
		patientPrivilegeCategory: "Нет льгот",
		primaryDiagnosisText: "К02.1 Кариес дентина (средний кариес) зуба 1.6",
		primaryDiagnosisIcd10: "K02.1",
		attendingDoctorFullName: "Волкова Екатерина Сергеевна",
		attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
		attendingDoctorSnils: "128-456-789 01",
	},
	anamnesis: {
		chiefComplaint: "Кратковременные боли от холодного и сладкого в области зуба 1.6.",
		historyOfPresentIllness: "Появились 2 месяца назад. Ранее не лечился.",
		medicalHistoryVitae: "Хронические соматические заболевания отрицает. ВИЧ, гепатиты отрицает.",
		allergologicalHistory: "Аллергологический анамнез не отягощен. Анестетики переносит хорошо.",
		concomitantSomaticDiseases: "Практически здоров.",
		currentSystemicMedications: "Постоянно препараты не принимает.",
		pregnancyLactationStatus: "Не применимо.",
		pastDentalInterventions: "Ранее лечил кариес в 2024 г., без осложнений.",
		occupationalHazardsAndHabits: "Не курит.",
	},
	dentalStatus: {
		odontogramTeeth: [
			{ toothNumber: 18, statusCode: "extracted_absent", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 17, statusCode: "filled_satisfactory", surfaces: ["occlusal"], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 16, statusCode: "caries_media", surfaces: ["occlusal", "mesial"], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 15, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
		],
		dmftIndex: {
			decayed: 1,
			filled: 1,
			missing: 1,
			totalDmft: 3,
			decayedSurfaces: 2,
			filledSurfaces: 1,
			totalDmfs: 3,
			deciduousDecayed: 0,
			deciduousFilled: 0,
			deciduousExtracted: 0,
			totalDft: 0,
			intensityLevel: "low",
		},
		cpitnIndex: {
			sextant18_14: "1_bleeding",
			sextant13_23: "0_healthy",
			sextant24_28: "0_healthy",
			sextant48_44: "2_calculus",
			sextant43_33: "1_bleeding",
			sextant34_38: "0_healthy",
			treatmentNeedCategory: "2_scaling_root_planing",
		},
		hygieneIndexOhiS: {
			debrisScore: 0.6,
			calculusScore: 0.4,
			totalScore: 1.0,
			ratingText: "OHI-S = 1.0 (Удовлетворительный уровень гигиены)",
		},
		biteType: "orthognathic",
		biteDescription: "Прикус ортогнатический, смыкание по I классу Энгля.",
		oralMucosaStatus: {
			color: "pale_pink_normal",
			moisture: "normal",
			pathologicalElements: null,
			gingivalPapillae: "normal_pointed",
			bleedingPBI: "grade_0",
			tongueStatus: "Язык чистый, влажный",
			regionalLymphNodes: "Лимфоузлы не увеличены, безболезненны",
			tmjFunction: "Открывание рта свободное",
		},
		xrayFindingsDescription: "Дефект твердых тканей окклюзионно-медиальной поверхности зуба 1.6 в пределах дентина.",
		xrayRadiationDoseMsv: 0.004,
	},
	generalTreatmentPlan: "1. Профгигиена. 2. Лечение кариеса зуба 1.6 композитом. 3. Осмотр через 6 мес.",
	visitDiaries: [
		{
			id: "vd-001",
			entryDate: "2026-08-20",
			entryTime: "11:30",
			toothNumber: "16",
			subjectiveComplaints: "Жалобы на кратковременные боли от холодного.",
			objectiveStatusLocalis: "Кариозная полость на жевательной поверхности зуба 1.6, зондирование болезненно по ЭДГ.",
			percussionVertical: "negative",
			percussionHorizontal: "negative",
			probingTenderness: "along_enamel_dentin_border",
			thermalTestResponse: "transient_pain",
			eodMicroamperes: 4,
			probingPocketDepthMm: 2,
			assessmentDiagnosisText: "K02.1 Кариес дентина зуба 1.6",
			assessmentIcd10Code: "K02.1",
			procedureProtocol: "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл. Препарирование, адгезив, пломба Ceram.x Spectra ST A2.",
			anesthesiaDetails: "Sol. Ubistesini 4% 1.7 мл",
			appliedMaterials: "Ceram.x Spectra ST",
			homeCareRecommendations: "Гигиена полости рта.",
			nextVisitDate: "2027-02-20",
			doctorFullName: "Волкова Екатерина Сергеевна",
			doctorSpecialty: "Врач-стоматолог-терапевт",
			digitalSignatureHash: "a4f891b8d234e6c7901ef5b89a03b51e7845cd1209384756abcdef1234567890",
			isSignedWithUkep: true,
		},
	],
	epicrisis: {
		treatmentSummary: "Проведено лечение кариеса дентина зуба 1.6. Жалобы купированы.",
		treatmentOutcome: "complete_cure",
		treatmentOutcomeLabel: "Полное выздоровление",
		dispensaryGroup: "D_I_healthy",
		dispensaryGroupLabel: "Д-I (Здоров)",
		plannedRecallIntervalMonths: 6,
		preventivePlanRecommendations: "Профгигиена 2 раза в год.",
		dateCompleted: "2026-08-20",
		headOfDepartmentFullName: "Прохоров К.И.",
		attendingDoctorFullName: "Волкова Е.С.",
	},
};

describe("EMR 043/u Math and Clinical Indices", () => {
	it("calculates DMFT index accurately for permanent dentition", () => {
		const teeth: FdiToothRecord[] = [
			{ toothNumber: 18, statusCode: "extracted_absent", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 17, statusCode: "filled_satisfactory", surfaces: ["occlusal", "mesial"], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 16, statusCode: "caries_media", surfaces: ["occlusal", "distal"], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 15, statusCode: "pulpitis_acute", surfaces: ["occlusal"], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 14, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
		];

		const res = calculateDmftIndex(teeth);
		assert.equal(res.decayed, 2, "Caries and pulpitis count as decayed");
		assert.equal(res.filled, 1, "Filled satisfactory counts as filled");
		assert.equal(res.missing, 1, "Extracted absent counts as missing");
		assert.equal(res.totalDmft, 4, "Total DMFT is sum of K + P + U");
		assert.equal(res.decayedSurfaces, 3, "Decayed surfaces count sum");
		assert.equal(res.filledSurfaces, 2, "Filled surfaces count sum");
		assert.equal(res.intensityLevel, "medium", "DMFT 4 is medium intensity");
	});

	it("evaluates WHO intensity levels correctly across score boundaries", () => {
		const lowTeeth: FdiToothRecord[] = [
			{ toothNumber: 11, statusCode: "caries_media", surfaces: ["occlusal"], mobility: "none", furcationInvolvement: "none" },
		];
		assert.equal(calculateDmftIndex(lowTeeth).intensityLevel, "very_low");

		const highTeeth: FdiToothRecord[] = Array.from({ length: 7 }, (_, i) => ({
			toothNumber: 11 + i,
			statusCode: "caries_media",
			surfaces: ["occlusal"],
			mobility: "none",
			furcationInvolvement: "none",
		}));
		assert.equal(calculateDmftIndex(highTeeth).intensityLevel, "high");

		const veryHighTeeth: FdiToothRecord[] = Array.from({ length: 10 }, (_, i) => ({
			toothNumber: 11 + i,
			statusCode: "caries_media",
			surfaces: ["occlusal"],
			mobility: "none",
			furcationInvolvement: "none",
		}));
		assert.equal(calculateDmftIndex(veryHighTeeth).intensityLevel, "very_high");
	});

	it("calculates deciduous tooth dft index for pediatric dentition", () => {
		const teeth: FdiToothRecord[] = [
			{ toothNumber: 55, statusCode: "caries_media", surfaces: ["occlusal"], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 54, statusCode: "filled_satisfactory", surfaces: ["occlusal"], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 53, statusCode: "extracted_absent", surfaces: [], mobility: "none", furcationInvolvement: "none" },
		];

		const res = calculateDmftIndex(teeth);
		assert.equal(res.deciduousDecayed, 1);
		assert.equal(res.deciduousFilled, 1);
		assert.equal(res.deciduousExtracted, 1);
		assert.equal(res.totalDft, 3);
	});

	it("calculates CPITN index and derives correct treatment need categories", () => {
		const healthy = calculateCpitnIndex({ sextant18_14: "0_healthy", sextant13_23: "0_healthy" });
		assert.equal(healthy.maxCode, 0);
		assert.equal(healthy.treatmentNeedCategory, "0_none");

		const bleeding = calculateCpitnIndex({ sextant18_14: "1_bleeding", sextant13_23: "0_healthy" });
		assert.equal(bleeding.maxCode, 1);
		assert.equal(bleeding.treatmentNeedCategory, "1_hygiene_instructions");

		const calculus = calculateCpitnIndex({ sextant18_14: "2_calculus", sextant13_23: "1_bleeding" });
		assert.equal(calculus.maxCode, 2);
		assert.equal(calculus.treatmentNeedCategory, "2_scaling_root_planing");

		const pocket4_5 = calculateCpitnIndex({ sextant18_14: "3_pocket_4_5mm", sextant13_23: "2_calculus" });
		assert.equal(pocket4_5.maxCode, 3);
		assert.equal(pocket4_5.treatmentNeedCategory, "2_scaling_root_planing");

		const severe = calculateCpitnIndex({ sextant18_14: "4_pocket_6mm_plus", sextant13_23: "0_healthy" });
		assert.equal(severe.maxCode, 4);
		assert.equal(severe.treatmentNeedCategory, "3_complex_periodontal");
	});

	it("calculates OHI-S hygiene index with correct ratings", () => {
		const good = calculateOhiSScore([0.3, 0.3], [0.1, 0.2]);
		assert.equal(good.clinicalEvaluation, "good");
		assert.ok(good.totalScore <= 0.6);

		const satisfactory = calculateOhiSScore([0.6, 0.8], [0.3, 0.3]);
		assert.equal(satisfactory.clinicalEvaluation, "satisfactory");

		const poor = calculateOhiSScore([1.8, 1.9], [1.2, 1.4]);
		assert.equal(poor.clinicalEvaluation, "poor");
	});

	it("formats patient age correctly with Russian pluralization", () => {
		assert.equal(formatPatientAge("2005-08-20", "2026-08-20"), "21 год");
		assert.equal(formatPatientAge("2004-08-20", "2026-08-20"), "22 года");
		assert.equal(formatPatientAge("2002-08-20", "2026-08-20"), "24 года");
		assert.equal(formatPatientAge("2001-08-20", "2026-08-20"), "25 лет");
		assert.equal(formatPatientAge("2015-08-20", "2026-08-20"), "11 лет");
		assert.equal(formatPatientAge("2012-08-20", "2026-08-20"), "14 лет");
	});
});

describe("Form 043/u Completeness Validation", () => {
	it("validates 100% complete form successfully", () => {
		const res = validateForm043uCompleteness(MOCK_CARD_DATA);
		assert.equal(res.isComplete, true);
		assert.ok(res.completenessScore >= 90);
		assert.equal(res.missingFields.length, 0);
	});

	it("detects missing required fields and marks isComplete as false", () => {
		const incompleteData: MedicalCardForm043uData = {
			...MOCK_CARD_DATA,
			passport: {
				...MOCK_CARD_DATA.passport,
				patientFullName: "",
				medicalCardNumber: "",
			},
			visitDiaries: [],
		};

		const res = validateForm043uCompleteness(incompleteData);
		assert.equal(res.isComplete, false);
		assert.ok(res.completenessScore < 90);
		assert.ok(res.missingFields.some((f) => f.fieldKey === "patientFullName"));
		assert.ok(res.missingFields.some((f) => f.fieldKey === "medicalCardNumber"));
		assert.ok(res.missingFields.some((f) => f.fieldKey === "visitDiaries"));
	});
});

describe("Form 043/u Document Generators", () => {
	it("generates magazine-grade printable HTML conforming to Order 834n", () => {
		const html = generatePrintableHtml043(MOCK_CARD_DATA);
		assert.ok(html.includes("ФОРМА № 043/у"), "Contains Form 043/u badge");
		assert.ok(html.includes("Приказ Минздрава России от 15.12.2014 № 834н"), "References Order 834n");
		assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"), "Contains clinic legal name");
		assert.ok(html.includes("Смирнов Алексей Владимирович"), "Contains patient name");
		assert.ok(html.includes("K02.1"), "Contains ICD-10 code");
		assert.ok(html.includes("Индекс КПУ(з)"), "Contains DMFT index");
		assert.ok(html.includes("Ceram.x Spectra ST"), "Contains protocol materials");
		assert.ok(html.includes("@media print"), "Contains print media styles");
		assert.ok(html.includes("✓ ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ"), "Contains UKEP stamp");
	});

	it("generates valid HL7 CDA R2 XML for EGISZ", () => {
		const xml = generate043XmlCda(MOCK_CARD_DATA);
		assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"), "Has XML header");
		assert.ok(xml.includes("<ClinicalDocument"), "Has ClinicalDocument root");
		assert.ok(xml.includes("<templateId root=\"1.2.643.5.1.13.100.1.1.834.43\"/>"), "Has 834n templateId");
		assert.ok(xml.includes("<recordTarget>"), "Has recordTarget");
		assert.ok(xml.includes("Смирнов"), "Contains patient family name");
		assert.ok(xml.includes("142-890-432 78"), "Contains SNILS");
		assert.ok(xml.includes("<code code=\"PASSPORT\""), "Contains PASSPORT section");
		assert.ok(xml.includes("<code code=\"DENTAL_STATUS\""), "Contains DENTAL_STATUS section");
		assert.ok(xml.includes("<code code=\"VISIT_DIARIES\""), "Contains VISIT_DIARIES section");
		assert.ok(xml.includes("<code code=\"EPICRISIS\""), "Contains EPICRISIS section");
	});

	it("generates structured JSON export and parses back without loss", () => {
		const jsonStr = generate043JsonExport(MOCK_CARD_DATA);
		const parsed = JSON.parse(jsonStr);
		assert.equal(parsed.formNumber, "043/у");
		assert.equal(parsed.exportSchemaVersion, "1.0.0");
		assert.equal(parsed.passport.medicalCardNumber, "СТ-2026-0843");
		assert.equal(parsed.visitDiaries.length, 1);
	});

	it("generates structured plain text transcript for clipboard copy", () => {
		const text = generate043PlainText(MOCK_CARD_DATA);
		assert.ok(text.includes("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/у)"));
		assert.ok(text.includes("1. ПАСПОРТНАЯ ЧАСТЬ"));
		assert.ok(text.includes("2. АНАМНЕЗ ЖИЗНИ И ЗАБОЛЕВАНИЯ"));
		assert.ok(text.includes("3. СТОМАТОЛОГИЧЕСКИЙ СТАТУС"));
		assert.ok(text.includes("4. ДНЕВНИКИ ПОСЕЩЕНИЙ (SOAP)"));
		assert.ok(text.includes("5. ЭПИКРИЗ И ДИСПАНСЕРИЗАЦИЯ"));
	});

	it("escapes HTML and XML special characters safely", () => {
		assert.equal(escapeHtml("<script>alert('XSS')&\"test\"</script>"), "&lt;script&gt;alert(&#039;XSS&#039;)&amp;&quot;test&quot;&lt;/script&gt;");
		assert.equal(escapeXml("<tag attr=\"val\" & 'x'>"), "&lt;tag attr=&quot;val&quot; &amp; &apos;x&apos;&gt;");
	});
});

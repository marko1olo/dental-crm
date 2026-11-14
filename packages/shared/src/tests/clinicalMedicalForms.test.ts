import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateDmftFromOdontogram,
	calculateTonnIndex,
	calculatePontIndex,
	calculateBoltonIndex,
	calculateAnnualRadiationDose,
	renderForm043uHtml,
	renderForm043_1uHtml,
	renderForm003vuHtml,
	renderRadiationDoseSheetHtml,
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
	type FullForm043uPayload,
	type OrthodonticCard043_1uPayload,
	type MedicalCardExtract003vuPayload,
	type RadiationDoseSheetPayload,
	type RadiationExposureEntry,
} from "../index.js";

test("Form 043/u: DMFT / КПУ calculation from FDI odontogram", () => {
	const odontogram = {
		18: { toothNumber: 18, condition: "X" as const },
		17: { toothNumber: 17, condition: "F" as const },
		16: { toothNumber: 16, condition: "C" as const },
		15: { toothNumber: 15, condition: "H" as const },
		26: { toothNumber: 26, condition: "C" as const },
		36: { toothNumber: 36, condition: "F" as const },
		46: { toothNumber: 46, condition: "R" as const }, // Root counted as missing/extracted
		48: { toothNumber: 48, condition: "X" as const },
	};

	const dmft = calculateDmftFromOdontogram(odontogram);

	assert.equal(dmft.decayed, 2, "Decayed teeth (16, 26)");
	assert.equal(dmft.filled, 2, "Filled teeth (17, 36)");
	assert.equal(dmft.missing, 3, "Missing teeth (18, 46 root, 48)");
	assert.equal(dmft.dmftTotal, 7, "Total DMFT = 2 + 2 + 3 = 7");
	assert.equal(dmft.intensityLevel, "high", "DMFT 7 is high intensity (5-8)");
	assert.equal(dmft.intensityLevelLabel, "Высокий (5–8)");
});

test("Form 043-1/u: Orthodontic model indices (Tonn, Pont, Bolton)", () => {
	// Tonn Index: SI (upper 4 incisors) / Si (lower 4 incisors) = 31.0 / 23.3 = 1.33 (Norm)
	const tonnNormal = calculateTonnIndex(31.0, 23.3);
	assert.equal(Number(tonnNormal.ratio.toFixed(2)), 1.33);
	assert.equal(tonnNormal.discrepancyType, "normal");

	const tonnMacro = calculateTonnIndex(34.0, 22.0);
	assert.equal(tonnMacro.discrepancyType, "upper_macrodontia");

	// Pont Index: PW = SI * 100 / 80; MW = SI * 100 / 64
	// For SI = 32.0: expected PW = 40.0, expected MW = 50.0
	const pont = calculatePontIndex(32.0, 36.0, 48.0);
	assert.equal(pont.premolars.expectedWidthMm, 40.0);
	assert.equal(pont.premolars.actualWidthMm, 36.0);
	assert.equal(pont.premolars.discrepancyMm, -4.0, "Narrowing by 4mm");
	assert.equal(pont.premolars.status, "narrowed");

	assert.equal(pont.molars.expectedWidthMm, 50.0);
	assert.equal(pont.molars.actualWidthMm, 48.0);
	assert.equal(pont.molars.discrepancyMm, -2.0, "Narrowing by 2mm");
	assert.equal(pont.molars.status, "narrowed");

	// Bolton Index: Anterior 6 ratio = (sum lower 6 / sum upper 6) * 100 = (40 / 52) * 100 = 76.92%
	const bolton = calculateBoltonIndex(52.0, 40.0, 100.0, 91.3);
	assert.equal(bolton.anteriorRatioPercent > 76.0 && bolton.anteriorRatioPercent < 78.0, true);
	assert.equal(bolton.overallRatioPercent, 91.3);
	assert.equal(bolton.overallDiscrepancyMm, 0.0);
});

test("Radiation Dose Sheet: SanPiN 2.6.1.1192-03 cumulative dose calculation & thresholds", () => {
	const exposures: RadiationExposureEntry[] = [
		{
			id: "00000000-0000-0000-0000-000000000001",
			studyDate: "2026-01-15",
			studyType: "intraoral_radiovisiography",
			anatomicalArea: "Зуб 1.6",
			apparatusModel: "Planmeca ProX",
			tubeVoltageKv: 66,
			tubeCurrentMa: 7,
			exposureTimeSeconds: 0.08,
			effectiveDoseMsv: 0.003,
			effectiveDoseMicrosieverts: 3.0,
			radiologistFullName: "Смирнова Е.В.",
		},
		{
			id: "00000000-0000-0000-0000-000000000002",
			studyDate: "2026-03-20",
			studyType: "optg_digital_panoramic",
			anatomicalArea: "Зубные ряды",
			apparatusModel: "Planmeca ProMax",
			tubeVoltageKv: 70,
			tubeCurrentMa: 10,
			exposureTimeSeconds: 12.0,
			effectiveDoseMsv: 0.015,
			effectiveDoseMicrosieverts: 15.0,
			radiologistFullName: "Смирнова Е.В.",
		},
		{
			id: "00000000-0000-0000-0000-000000000003",
			studyDate: "2026-06-10",
			studyType: "cbct_jaw_8x8",
			anatomicalArea: "Обе челюсти",
			apparatusModel: "Planmeca ProMax 3D",
			tubeVoltageKv: 90,
			tubeCurrentMa: 12,
			exposureTimeSeconds: 14.0,
			effectiveDoseMsv: 0.045,
			effectiveDoseMicrosieverts: 45.0,
			radiologistFullName: "Смирнова Е.В.",
		},
	];

	const assessment = calculateAnnualRadiationDose(exposures, 2026);

	assert.equal(Number(assessment.totalDoseYearMsv.toFixed(3)), 0.063);
	assert.equal(Number(assessment.totalDoseYearMicrosieverts.toFixed(1)), 63.0);
	assert.equal(assessment.safetyZone, "green_optimal");
	assert.equal(assessment.studiesCount, 3);

	// Heavy exposure test
	const heavyExposures: RadiationExposureEntry[] = [
		{
			id: "00000000-0000-0000-0000-000000000004",
			studyDate: "2026-02-01",
			studyType: "cbct_full_maxillofacial_15x15",
			anatomicalArea: "ЧЛО и ВНЧС",
			apparatusModel: "Planmeca ProMax 3D",
			tubeVoltageKv: 96,
			tubeCurrentMa: 14,
			exposureTimeSeconds: 20.0,
			effectiveDoseMsv: 0.85,
			effectiveDoseMicrosieverts: 850.0,
			radiologistFullName: "Смирнова Е.В.",
		},
		{
			id: "00000000-0000-0000-0000-000000000005",
			studyDate: "2026-05-01",
			studyType: "cbct_full_maxillofacial_15x15",
			anatomicalArea: "ЧЛО и ВНЧС",
			apparatusModel: "Planmeca ProMax 3D",
			tubeVoltageKv: 96,
			tubeCurrentMa: 14,
			exposureTimeSeconds: 20.0,
			effectiveDoseMsv: 0.85,
			effectiveDoseMicrosieverts: 850.0,
			radiologistFullName: "Смирнова Е.В.",
		},
	];
	const heavyAssessment = calculateAnnualRadiationDose(heavyExposures, 2026);
	assert.equal(heavyAssessment.totalDoseYearMsv, 1.7);
	assert.equal(heavyAssessment.safetyZone, "red_warning");
});

test("Clinical HTML Renderers: Generates print-ready HTML for all 6 forms", () => {
	// 1. Form 043/u
	const form043uPayload: FullForm043uPayload = {
		formNumber: "043/у",
		clinicLegalName: 'ООО "ДЕНТЕ КЛИНИК"',
		clinicAddress: "г. Москва, ул. Ленина, д. 10",
		clinicOgrn: "1234567890123",
		medicalCardNumber: "СТ-2026/043",
		cardOpenedDate: "2026-08-19",
		patientFullName: "Соколов Дмитрий Сергеевич",
		patientBirthDate: "1985-05-12",
		patientSex: "male",
		patientAddressRegistration: "г. Москва, пр-т Мира, д. 5",
		patientPhone: "+7 (999) 111-22-33",
		attendingDoctorFullName: "Смирнов А.П.",
		attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
		chiefComplaint: "Периодическая ноющая боль в области зуба 4.6 от температурных раздражителей.",
		historyOfPresentIllness: "Боли появились около недели назад, усилились 2 дня назад.",
		allergologicalHistory: "Аллергические реакции отрицает.",
		concomitantDiseases: "Хронических заболеваний не отмечает.",
		currentMedications: "Препаратов не принимает.",
		pregnancyLactationStatus: "Нет",
		pastDentalInterventions: "Ранее лечился по поводу кареиса.",
		odontogramTeeth: [],
		initialOdontogramTeeth: [],
		sanitizedOdontogramTeeth: [],
		dmftIndex: {
			decayed: 1,
			filled: 1,
			missing: 0,
			totalDmft: 2,
			decayedSurfaces: 1,
			filledSurfaces: 1,
			totalDmfs: 2,
			deciduousDecayed: 0,
			deciduousFilled: 0,
			deciduousExtracted: 0,
			totalDft: 0,
			intensityLevel: "low",
		},
		cpitnIndex: {
			sextant18_14: "0_healthy",
			sextant13_23: "0_healthy",
			sextant24_28: "0_healthy",
			sextant48_44: "1_bleeding",
			sextant43_33: "0_healthy",
			sextant34_38: "0_healthy",
			treatmentNeedCategory: "1_hygiene_instructions",
		},
		hygieneIndexOhiS: "OHI-S = 0.6 (хороший уровень)",
		biteType: "orthognathic",
		biteDescription: "Прикус ортогнатический",
		oralMucosaStatus: {
			color: "pale_pink_normal",
			moisture: "normal",
			gingivalPapillae: "normal_pointed",
			bleedingPBI: "grade_0",
			tongueStatus: "Язык чистый, влажный",
			regionalLymphNodes: "Лимфоузлы не увеличены",
			tmjFunction: "Движения в суставе безболезненные",
		},
		generalTreatmentPlan: "1. Санация кариозных полостей. 2. Обучение гигиене.",
		xrayFindingsDescription: "Прицельная радиовизиография 4.6: кариозная полость в пределах дентина.",
		soapDiaries: [
			{
				entryDate: "2026-08-19",
				doctorFullName: "Смирнов А.П.",
				subjectiveComplaints: "Жалобы на кратковременные боли от холодного.",
				objectiveStatusLocalis: "Зуб 4.6: кариозная полость в пределах дентина.",
				percussionVertical: "negative",
				percussionHorizontal: "negative",
				probingTenderness: "along_enamel_dentin_border",
				thermalTestResponse: "transient_pain",
				eodMicroamperes: 6,
				assessmentDiagnosisText: "K02.1 Кариес дентина зуба 4.6",
				assessmentIcd10Code: "K02.1",
				procedureProtocol: "Препарирование кариозной полости, пломбирование Filtek Ultimate.",
				anesthesiaDetails: "Ubistesin 1.7 мл",
				appliedMaterials: "OptiBond FL, Filtek Ultimate",
				homeCareRecommendations: "Осмотр через 6 месяцев.",
				nextVisitDate: "2027-02-19",
			},
		],
	};

	const html043u = renderForm043uHtml(form043uPayload);
	assert.equal(html043u.includes("ФОРМА № 043/у"), true);
	assert.equal(html043u.includes("Соколов Дмитрий Сергеевич"), true);

	// 2. Form 043-1/u
	const form043_1uPayload: OrthodonticCard043_1uPayload = {
		formNumber: "043-1/у",
		clinicLegalName: 'ООО "ОРТО ДЕНТЕ"',
		medicalCardNumber: "ОРТО-102",
		cardOpenedDate: "2026-08-19",
		patientFullName: "Кузнецова Анна Михайловна",
		patientBirthDate: "2010-03-24",
		patientSex: "female",
		orthodontistFullName: "Лебедева Елена Викторовна",
		orthodonticDiagnosis: "II класс 1 подкласс по Энглю, скученность резцов",
		icd10DiagnosisCode: "K07.2",
		angleMolarClassRight: "class_2_sub_1",
		angleMolarClassLeft: "class_2_sub_1",
		angleCanineClassRight: "class_2",
		angleCanineClassLeft: "class_2",
		anthropometry: {
			facialType: "mesoprosopic",
			profileType: "convex",
			facialSymmetry: "symmetric",
			chinDeviationMm: 0,
			nasolabialAngleDegrees: 98,
			mentolabialSulcus: "normal",
			lipCompetenceAtRest: "competent_closed",
			incisalDisplayAtSmileMm: 3,
			gummySmileMm: 0,
			photoProtocolCompleted: true,
		},
		cephalometry: {
			snaAngle: 83.5,
			snbAngle: 79.0,
			anbAngle: 4.5,
			witsAppraisalMm: 0,
			fmaAngle: 25,
			snGoGnAngle: 32,
			upperIncisorToNaAngle: 22,
			upperIncisorToNaMm: 4,
			lowerIncisorToNbAngle: 25,
			lowerIncisorToNbMm: 4,
			interincisalAngle: 130,
			growthPattern: "normodivergent",
			skeletalClass: "class_2_sub_1",
		},
		tonnIndexNotes: "Индекс Тона SI/Si = 1.33 — норма.",
		pontIndexNotes: "Индекс Пона: сужение премоляров на 4 мм.",
		boltonIndexNotes: "Индекс Болтона: переднее 76.9%, общее 91.3%.",
		korkhausIndexNotes: "Индекс Коркхауза: норма.",
		appliancePlan: {
			applianceType: "ceramic_braces_aesthetic",
			alignerStepsCount: 0,
			estimatedDurationMonths: 20,
			extractionPlan: "non_extraction",
			treatmentStages: ["Нивелирование", "Юстировка", "Ретенция"],
			retentionProtocol: "Несъемные ретейнеры на обе челюсти",
		},
	};

	const html043_1u = renderForm043_1uHtml(form043_1uPayload);
	assert.equal(html043_1u.includes("043-1/у"), true);
	assert.equal(html043_1u.includes("Кузнецова Анна Михайловна"), true);

	// 3. Form 003-V/u
	const form003vuPayload: MedicalCardExtract003vuPayload = {
		formNumber: "003-В/у",
		clinicLegalName: 'ООО "ДЕНТЕ"',
		extractRegistrationNumber: "ВЫП-2026/0884",
		medicalCardNumber: "СТ-884",
		extractIssueDate: "2026-08-19",
		extractDestinationInstitution: "По месту требования",
		patientFullName: "Ковалев Игорь Николаевич",
		patientBirthDate: "1978-11-04",
		patientSex: "male",
		attendingDoctorFullName: "Иванов И.И.",
		attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
		headOfDepartmentFullName: "Петров П.П.",
		treatmentPeriodStartDate: "2026-07-01",
		treatmentPeriodEndDate: "2026-08-19",
		primaryDiagnosisIcd10: "K04.0",
		primaryDiagnosisText: "K04.0 Пульпит зуба 3.6, K02.1 Кариес дентина зуба 3.7",
		briefAnamnesisAndClinicalCourse: "Обратился с жалобами на боли в области зуба 3.6.",
		diagnosticStudiesSummary: "Прицельная визиография 3.6, 3.7",
		treatmentStagesTimeline: [],
		conditionAtDischarge: "Жалоб нет, функция восстановлена",
		followUpRecommendations: "Контрольный осмотр через 6 месяцев",
		warrantyConditions: "Гарантия 12 месяцев",
	};

	const html003vu = renderForm003vuHtml(form003vuPayload);
	assert.equal(html003vu.includes("043/у"), true);
	assert.equal(html003vu.includes("Ковалев Игорь Николаевич"), true);

	// 6. Radiation Dose Sheet
	const doseSheetPayload: RadiationDoseSheetPayload = {
		formNumber: "Лист дозовых нагрузок",
		clinicLegalName: 'ООО "ДЕНТЕ"',
		medicalCardNumber: "СТ-884",
		patientFullName: "Ковалев Игорь Николаевич",
		patientBirthDate: "1978-11-04",
		patientSex: "male",
		reportingYear: 2026,
		exposureEntries: [
			{
				id: "00000000-0000-0000-0000-000000000001",
				studyDate: "2026-07-01",
				studyType: "intraoral_radiovisiography",
				anatomicalArea: "Зуб 36",
				apparatusModel: "Planmeca ProX",
				tubeVoltageKv: 66,
				tubeCurrentMa: 7,
				exposureTimeSeconds: 0.08,
				effectiveDoseMsv: 0.003,
				effectiveDoseMicrosieverts: 3.0,
				radiologistFullName: "Смирнова Е.В.",
			},
		],
		annualSummary: {
			totalDoseYearMsv: 0.003,
			totalDoseYearMicrosieverts: 3.0,
			safetyZone: "green_optimal",
			safetyZoneLabel: "Зеленая зона (< 0.5 мЗв/год) — Оптимальный безопасный уровень.",
			safetyRecommendation: "Накопленная дозовая нагрузка в пределах нормы.",
		},
		responsibleOfficerFullName: "Врач-рентгенолог Смирнова Е.В.",
	};

	const htmlDose = renderRadiationDoseSheetHtml(doseSheetPayload);
	assert.equal(htmlDose.includes("ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК"), true);
	assert.equal(htmlDose.includes("СанПиН 2.6.1.1192-03"), true);
});

test("Form 003-В/у Redesign: Formal medical extract with angular clinic stamp, ICD-10 chronologic stages, recommendations, Chief Physician signature and seal", () => {
	const payload: MedicalCardExtract003vuPayload = {
		formNumber: "003-В/у",
		clinicLegalName: 'ООО "СТОМАТОЛОГИЧЕСКИЙ ЦЕНТР ДЕНТЕ"',
		clinicAddress: "г. Москва, Кутузовский пр-т, д. 24",
		clinicOgrn: "1157746123456",
		clinicInn: "7704123456",
		clinicLicenseNumber: "ЛО-77-01-020584",
		clinicLicenseDate: "15.03.2021",
		clinicLicenseIssuer: "Департамент здравоохранения города Москвы",
		extractRegistrationNumber: "ВЫП-2026/0890",
		extractIssueDate: "2026-08-19",
		extractDestinationInstitution: "В страховую компанию АО «СОГАЗ»",
		medicalCardNumber: "СТ-2026/0442",
		patientFullName: "Алексеев Роман Борисович",
		patientBirthDate: "1982-07-14",
		patientSex: "male",
		patientAddress: "г. Москва, ул. Большая Дорогомиловская, д. 5",
		patientPhone: "+7 (916) 777-88-99",
		treatmentPeriodStartDate: "2026-08-01",
		treatmentPeriodEndDate: "2026-08-19",
		primaryDiagnosisIcd10: "K04.0",
		primaryDiagnosisText: "Пульпит зуба 4.6 необратимый",
		concomitantDiagnosisIcd10: "K02.1",
		concomitantDiagnosisText: "Кариес дентина зуба 4.7",
		briefAnamnesisAndClinicalCourse: "Обратился с жалобами на интенсивные ночные самопроизвольные боли в области нижней челюсти справа.",
		diagnosticStudiesSummary: "Прицельная радиовизиография зубов 4.6, 4.7: полость зуба 4.6 сообщается с кариозной полостью, 3 канала визуализируются, деструкции кости нет.",
		treatmentStagesTimeline: [
			{
				treatmentDate: "2026-08-01",
				toothOrAnatomicalArea: "Зуб 4.6",
				diagnosisIcd10: "K04.0",
				diagnosisText: "Острый пульпит",
				performedIntervention: "Проводниковая анестезия Sol. Ubistesini 4% 1.7 мл. Вскрытие полости зуба, экстирпация пульпы из 3 каналов, механическая обработка ProTaper Gold, временная обтурация гидроксидом кальция Calcicur.",
				anesthesiaUsed: "Ubistesin 1.7 мл",
				attendingDoctorFullName: "Смирнов А.П.",
			},
			{
				treatmentDate: "2026-08-10",
				toothOrAnatomicalArea: "Зуб 4.6",
				diagnosisIcd10: "K04.0",
				diagnosisText: "Пульпит (этап пломбирования)",
				performedIntervention: "Постоянное пломбирование 3 корневых каналов методом латеральной компакции гуттаперчи с силером AH-Plus. Рентген-контроль: обтурация до верхушек.",
				anesthesiaUsed: "Без анестезии",
				attendingDoctorFullName: "Смирнов А.П.",
			},
			{
				treatmentDate: "2026-08-19",
				toothOrAnatomicalArea: "Зубы 4.6, 4.7",
				diagnosisIcd10: "K02.1",
				diagnosisText: "Кариес дентина 4.7, реставрация 4.6",
				performedIntervention: "Эстетико-функциональная реставрация зуба 4.6 нанокомпозитом Estelite Asteria. Препарирование и пломбирование зуба 4.7 композитом Filtek Ultimate.",
				anesthesiaUsed: "Инфильтрационная 1.7 мл",
				attendingDoctorFullName: "Смирнов А.П.",
			},
		],
		conditionAtDischarge: "Лечение завершено в полном объеме. Жалоб нет. Анатомическая форма и жевательная функция восстановлены. Перкуссия 4.6 и 4.7 безболезненна, слизистая бледно-розовая.",
		followUpRecommendations: "1. Контрольный осмотр через 6 месяцев с прицельным снимком 4.6.\n2. Профессиональная гигиена 2 раза в год.",
		warrantyConditions: "Гарантия на реставрации — 12 месяцев при соблюдении графика контрольных осмотров.",
		attendingDoctorFullName: "Смирнов Алексей Павлович",
		attendingDoctorSpecialty: "Врач-стоматолог-терапевт высшей категории",
		headOfDepartmentFullName: "Профессор Воронов В.М.",
	};

	const html = renderForm003vuHtml(payload);

	// Angular stamp
	assert.ok(html.includes("stamp-angular"), "Must include angular clinic stamp");
	assert.ok(html.includes("ЛО-77-01-020584"), "Must include medical license number");
	assert.ok(html.includes("ВЫП-2026/0890"), "Must include registration extract number");
	assert.ok(html.includes("В страховую компанию АО «СОГАЗ»"), "Must include destination institution");

	// Patient & Diagnoses
	assert.ok(html.includes("Алексеев Роман Борисович"), "Must include patient name");
	assert.ok(html.includes("K04.0"), "Must include primary ICD-10 code");
	assert.ok(html.includes("K02.1"), "Must include concomitant ICD-10 code");

	// Chronology table
	assert.ok(html.includes("Хронология проведенного стоматологического лечения"), "Must include chronological stages header");
	assert.ok(html.includes("Зуб 4.6"), "Must render stage for tooth 4.6");
	assert.ok(html.includes("ProTaper Gold"), "Must detail materials used");
	assert.ok(html.includes("AH-Plus"), "Must detail endodontic sealer");

	// Discharge & Signatures
	assert.ok(html.includes("Лечение завершено в полном объеме"), "Must render condition at discharge");
	assert.ok(html.includes("Профессор Воронов В.М."), "Must include Chief Physician name");
	assert.ok(html.includes("stamp-seal"), "Must render clinic seal (M.P.)");
});

test("Radiation Dose Sheet Redesign: SanPiN 2.6.1.1192-03 progress gauge, 1.0 mSv annual limit safety threshold, X-ray equipment log, and modality breakdown", () => {
	const payload: RadiationDoseSheetPayload = {
		formNumber: "Лист дозовых нагрузок",
		clinicLegalName: 'ООО "ДЕНТЕ РЕНТГЕН-ЦЕНТР"',
		clinicAddress: "г. Москва, Ломоносовский пр-т, д. 29",
		clinicOgrn: "1167746987654",
		clinicLicenseNumber: "ЛО-77-01-098765",
		patientFullName: "Николаев Дмитрий Игоревич",
		patientBirthDate: "1992-04-18",
		patientSex: "male",
		medicalCardNumber: "СТ-2026/0998",
		reportingYear: 2026,
		exposureEntries: [
			{
				id: "00000000-0000-0000-0000-000000000010",
				studyDate: "2026-02-10",
				studyType: "intraoral_radiovisiography",
				anatomicalArea: "Зуб 1.6",
				apparatusModel: "Planmeca ProX (Финляндия)",
				tubeVoltageKv: 66,
				tubeCurrentMa: 7,
				exposureTimeSeconds: 0.08,
				effectiveDoseMsv: 0.003,
				effectiveDoseMicrosieverts: 3.0,
				radiologistFullName: "Смирнова Е.В.",
				notes: "Прицельный снимок до лечения",
			},
			{
				id: "00000000-0000-0000-0000-000000000011",
				studyDate: "2026-05-15",
				studyType: "optg_digital_panoramic",
				anatomicalArea: "Зубные ряды обеих челюстей",
				apparatusModel: "Vatech PaX-i 2D (Южная Корея)",
				tubeVoltageKv: 72,
				tubeCurrentMa: 10,
				exposureTimeSeconds: 10.4,
				effectiveDoseMsv: 0.018,
				effectiveDoseMicrosieverts: 18.0,
				radiologistFullName: "Смирнова Е.В.",
				notes: "Панорамная томография перед ортодонтией",
			},
			{
				id: "00000000-0000-0000-0000-000000000012",
				studyDate: "2026-08-10",
				studyType: "cbct_jaw_8x8",
				anatomicalArea: "Нижняя челюсть (сегмент 4.4-4.8)",
				apparatusModel: "Planmeca ProMax 3D Classic (Финляндия)",
				tubeVoltageKv: 90,
				tubeCurrentMa: 12,
				exposureTimeSeconds: 12.0,
				effectiveDoseMsv: 0.055,
				effectiveDoseMicrosieverts: 55.0,
				radiologistFullName: "Смирнова Е.В.",
				notes: "КЛКТ перед установкой имплантата 4.6",
			},
		],
		annualSummary: {
			totalDoseYearMsv: 0.076,
			totalDoseYearMicrosieverts: 76.0,
			safetyZone: "green_optimal",
			safetyZoneLabel: "Зеленая зона (< 0.5 мЗв/год) — Оптимальный безопасный уровень.",
			safetyRecommendation: "Накопленная доза составляет 7.6% от допустимого годового предела СанПиН 2.6.1.1192-03.",
		},
		responsibleOfficerFullName: "Д-р Смирнов А.П. (Ответственный за РБ)",
	};

	const html = renderRadiationDoseSheetHtml(payload);

	// SanPiN Header
	assert.ok(html.includes("САНПИН 2.6.1.1192-03"), "Must cite SanPiN 2.6.1.1192-03");
	assert.ok(html.includes("НРБ-99/2009 (СанПиН 2.6.1.2523-09)"), "Must cite NRB-99/2009");
	assert.ok(html.includes("Николаев Дмитрий Игоревич"), "Must render patient name");
	assert.ok(html.includes("2026 г."), "Must render reporting year");

	// Gauge Progress Bar & Thresholds
	assert.ok(html.includes("dose-gauge-track"), "Must include progress gauge track");
	assert.ok(html.includes("0.0760 мЗв"), "Must display cumulative dose (0.0760 mSv)");
	assert.ok(html.includes("1.0000 мЗв"), "Must display SanPiN 1.0 mSv limit");
	assert.ok(html.includes("7.6%"), "Must calculate 7.6% threshold utilization");
	assert.ok(html.includes("ЗЕЛЕНАЯ ЗОНА"), "Must indicate Green Zone safety status");

	// X-ray equipment log table
	assert.ok(html.includes("Planmeca ProX"), "Must render Planmeca equipment");
	assert.ok(html.includes("Vatech PaX-i"), "Must render Vatech equipment");
	assert.ok(html.includes("Planmeca ProMax 3D"), "Must render CBCT apparatus");
	assert.ok(html.includes("66 кВ / 7 мА / 0.08 с"), "Must render exposure parameters");

	// Modality breakdown & ALARA principle
	assert.ok(html.includes("Структура исследований по модальностям"), "Must contain modality breakdown table");
	assert.ok(html.includes("ALARA"), "Must cite ALARA principle");
	assert.ok(html.includes("Д-р Смирнов А.П."), "Must render Radiation Safety Officer signature line");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateDmftFromOdontogram,
	calculateTonnIndex,
	calculatePontIndex,
	calculateBoltonIndex,
	calculateDaily037uTotals,
	calculateAnnualRadiationDose,
	OFFICIAL_UET_STANDARDS_804N,
	renderForm043uHtml,
	renderForm043_1uHtml,
	renderForm037uHtml,
	renderForm039uHtml,
	renderForm003vuHtml,
	renderRadiationDoseSheetHtml,
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
	type FullForm043uPayload,
	type OrthodonticCard043_1uPayload,
	type DailyDentistDiary037uPayload,
	type SummaryDentistStatement039uPayload,
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

test("Form 037/u-88: Daily dentist work ledger totals and UET aggregation", () => {
	const records = [
		{
			entryNumber: 1,
			patientFullName: "Пациент А",
			birthYear: 1990,
			isRuralResident: false,
			isChildUnder18: false,
			visitPurpose: "treatment" as const,
			diagnosisIcd10: "K02.1",
			treatedTeethNumbers: [16],
			proceduresPerformed: "Пломбирование фотокомпозитом",
			anesthesiaCount: 1,
			fillingsCompositeCount: 1,
			fillingsCementCount: 0,
			endodonticsCanalsCount: 0,
			extractionsSimpleCount: 0,
			extractionsComplicatedCount: 0,
			isSanated: true,
			uetEarned: {
				therapeuticUet: 2.5,
				surgicalUet: 0,
				orthopedicUet: 0,
				orthodonticUet: 0,
				childrenUet: 0,
				totalUet: 2.5,
			},
		},
		{
			entryNumber: 2,
			patientFullName: "Пациент Б",
			birthYear: 1985,
			isRuralResident: true,
			isChildUnder18: false,
			visitPurpose: "treatment" as const,
			diagnosisIcd10: "K04.0",
			treatedTeethNumbers: [24],
			proceduresPerformed: "Экстирпация пульпы, пломбирование 2 каналов",
			anesthesiaCount: 1,
			fillingsCompositeCount: 1,
			fillingsCementCount: 0,
			endodonticsCanalsCount: 2,
			extractionsSimpleCount: 0,
			extractionsComplicatedCount: 0,
			isSanated: false,
			uetEarned: {
				therapeuticUet: 4.2,
				surgicalUet: 0,
				orthopedicUet: 0,
				orthodonticUet: 0,
				childrenUet: 0,
				totalUet: 4.2,
			},
		},
		{
			entryNumber: 3,
			patientFullName: "Пациент В",
			birthYear: 2015,
			isRuralResident: false,
			isChildUnder18: true,
			visitPurpose: "preventive" as const,
			diagnosisIcd10: "Z01.2",
			treatedTeethNumbers: [],
			proceduresPerformed: "Проф. осмотр, урок гигиены",
			anesthesiaCount: 0,
			fillingsCompositeCount: 0,
			fillingsCementCount: 0,
			endodonticsCanalsCount: 0,
			extractionsSimpleCount: 0,
			extractionsComplicatedCount: 0,
			isSanated: true,
			uetEarned: {
				therapeuticUet: 0,
				surgicalUet: 0,
				orthopedicUet: 0,
				orthodonticUet: 0,
				childrenUet: 1.0,
				totalUet: 1.0,
			},
		},
	];

	const totals = calculateDaily037uTotals(records);

	assert.equal(totals.totalPatientsSeen, 3);
	assert.equal(totals.adultsCount, 2);
	assert.equal(totals.childrenUnder18Count, 1);
	assert.equal(totals.ruralResidentsCount, 1);
	assert.equal(totals.sanatedPatientsCount, 2);
	assert.equal(totals.totalFillingsPlaced, 2);
	assert.equal(totals.uetTotals.therapeuticUet, 6.7);
	assert.equal(totals.uetTotals.childrenUet, 1.0);
	assert.equal(totals.uetTotals.totalUet, 7.7);
});

test("Form 039/u-88: Ministry of Health Order 804n UET catalog standards", () => {
	assert.equal(OFFICIAL_UET_STANDARDS_804N.length >= 8, true);
	const initialExam = OFFICIAL_UET_STANDARDS_804N.find((s) => s.code === "A01.07.001" || s.code === "B01.065.001");
	assert.equal(initialExam?.uetValue, 0.5);

	const filling = OFFICIAL_UET_STANDARDS_804N.find((s) => s.code === "A16.07.002.001");
	assert.equal(filling?.uetValue, 1.0);
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

	// 3. Form 037/u
	const form037uPayload: DailyDentistDiary037uPayload = {
		formNumber: "037/у-88",
		clinicLegalName: 'ООО "ДЕНТЕ"',
		clinicDepartment: "Терапевтическое отделение",
		doctorFullName: "Иванов И.И.",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		shiftDate: "2026-08-19",
		shiftNumber: "shift_1_morning",
		shiftWorkingHours: "08:00 - 14:36",
		patientRecords: [],
		summaryTotals: {
			totalPatientsCount: 5,
			totalAdultsCount: 4,
			totalChildrenUnder14Count: 1,
			totalAdolescents15_17Count: 0,
			totalPrimaryVisitsCount: 2,
			totalRepeatVisitsCount: 3,
			totalSanatedCount: 3,
			totalUetAccumulated: 11.5,
			shiftStandardQuotaUet: 21.0,
			planExecutionPercentage: 54.8,
		},
	};

	const html037u = renderForm037uHtml(form037uPayload);
	assert.equal(html037u.includes("037/у-88"), true);

	// 4. Form 039/u
	const form039uPayload: SummaryDentistStatement039uPayload = {
		formNumber: "039/у-88",
		clinicLegalName: 'ООО "ДЕНТЕ"',
		clinicDepartment: "Терапевтическое отделение",
		reportingPeriodMonthYear: "08.2026",
		doctorFullName: "Иванов И.И.",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		workingDaysCount: 22,
		workingHoursCount: 143,
		consolidatedMetrics: {
			visitsTotal: 110,
			visitsAdults: 90,
			visitsChildrenUnder14: 20,
			visitsAdolescents15_17: 0,
			visitsPrimary: 55,
			visitsRepeat: 55,
			visitsPreventativeExam: 15,
			sanatedTotal: 38,
			sanatedAdults: 30,
			sanatedChildren: 8,
			fillingsCariesTotal: 40,
			fillingsCompositePhotopolymer: 35,
			fillingsGlassIonomer: 5,
			pulpitisTreatedTotal: 15,
			periodontitisTreatedTotal: 5,
			canalsFilledTotal: 35,
			hygieneProceduresTotal: 25,
			extractionsSimple: 5,
			extractionsComplex: 0,
			extractionsImpactedWisdom: 0,
			outpatientOperationsCount: 2,
			implantsInstalledCount: 0,
			crownsDeliveredCount: 0,
			bridgesDeliveredCount: 0,
			removableDenturesCount: 0,
			orthodonticAdjustmentsCount: 0,
			anesthesiaInfiltrationCount: 40,
			anesthesiaConductionCount: 30,
			radiographsCount: 50,
		},
		uetBreakdown: {
			totalUetAccumulated: 280.0,
			periodStandardQuotaUet: 266.0,
			planExecutionPercentage: 105.0,
			uetTherapy: 210.0,
			uetEndodontics: 45.0,
			uetSurgery: 0,
			uetHygieneAndPerio: 25.0,
			uetProsthetics: 0,
			uetOrthodontics: 0,
			uetAnesthesiaAndDiagnostics: 0,
		},
	};

	const html039u = renderForm039uHtml(form039uPayload);
	assert.equal(html039u.includes("039/у-88"), true);

	// 5. Form 003-V/u
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
	assert.equal(html003vu.includes("003-В/у"), true);
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

test("Form 037/u-88 Redesign: Landscape A4 layout, 23-column register table, Black classes I-V, canals, surgery, hygiene, UET, and shift totals", () => {
	const payload: DailyDentistDiary037uPayload = {
		formNumber: "037/у-88",
		clinicLegalName: 'ООО "ДЕНТЕ КЛИНИК ПРЕМИУМ"',
		clinicDepartment: "Терапевтическое отделение № 1",
		doctorFullName: "Смирнов Алексей Павлович",
		doctorSpecialty: "Врач-стоматолог-терапевт высшей категории",
		shiftDate: "2026-08-19",
		shiftNumber: "shift_1_morning",
		shiftWorkingHours: "08:00 - 14:36 (6.6 ч)",
		patientRecords: [
			{
				sequenceNumber: 1,
				patientFullName: "Иванов Иван Иванович",
				patientAge: 35,
				patientCategory: "adult",
				medicalCardNumber: "СТ-2026/0123",
				patientAddress: "г. Москва, ул. Арбат, д. 12",
				isPrimaryVisit: true,
				isSanatedInVisit: false,
				diagnosisIcd10: "K02.1",
				diagnosisText: "Кариес дентина зуба 1.6 (I класс по Блэку)",
				performedProceduresSummary: "Препарирование кариозной полости зуба 1.6, изоляция коффердам, пломба нанокомпозитом Filtek Ultimate.",
				uetCaries: 2.0,
				uetPulpitisPeriodontitis: 0,
				uetSurgeryExtractions: 0,
				uetHygienePeriodontology: 0,
				uetProstheticsOrthodontics: 0,
				uetAnesthesia: 0.5,
				totalUetForVisit: 2.5,
			},
			{
				sequenceNumber: 2,
				patientFullName: "Петрова Анна Сергеевна",
				patientAge: 28,
				patientCategory: "adult",
				medicalCardNumber: "СТ-2026/0124",
				patientAddress: "Московская обл., с. Успенское",
				isPrimaryVisit: false,
				isSanatedInVisit: true,
				diagnosisIcd10: "K04.0",
				diagnosisText: "Острый очаговый пульпит зуба 2.4 (2 канала)",
				performedProceduresSummary: "Экстирпация пульпы, медикаментозная и инструментальная обработка 2 каналов ProTaper, обтурация гуттаперчей, пломба SDR + Ceram.x Spectra.",
				uetCaries: 0,
				uetPulpitisPeriodontitis: 4.2,
				uetSurgeryExtractions: 0,
				uetHygienePeriodontology: 0,
				uetProstheticsOrthodontics: 0,
				uetAnesthesia: 0.5,
				totalUetForVisit: 4.7,
			},
			{
				sequenceNumber: 3,
				patientFullName: "Сидоров Михаил Андреевич",
				patientAge: 12,
				patientCategory: "child_under_14",
				medicalCardNumber: "СТ-2026/0125",
				patientAddress: "г. Москва, пр-т Вернадского, д. 88",
				isPrimaryVisit: true,
				isSanatedInVisit: true,
				diagnosisIcd10: "Z01.2",
				diagnosisText: "Профилактический осмотр полости рта",
				performedProceduresSummary: "Проф. гигиена полости рта (Air-Flow + полировка), покрытие фторлаком, обучение гигиене.",
				uetCaries: 0,
				uetPulpitisPeriodontitis: 0,
				uetSurgeryExtractions: 0,
				uetHygienePeriodontology: 2.0,
				uetProstheticsOrthodontics: 0,
				uetAnesthesia: 0,
				totalUetForVisit: 2.0,
			},
		],
		summaryTotals: {
			totalPatientsCount: 3,
			totalAdultsCount: 2,
			totalChildrenUnder14Count: 1,
			totalAdolescents15_17Count: 0,
			totalPrimaryVisitsCount: 2,
			totalRepeatVisitsCount: 1,
			totalSanatedCount: 2,
			totalUetAccumulated: 9.2,
			shiftStandardQuotaUet: 21.0,
			planExecutionPercentage: 43.8,
		},
		notesAndObservations: "Смена прошла в штатном режиме. Все пациенты приняты по предварительной записи.",
	};

	const html = renderForm037uHtml(payload);

	// Landscape verification
	assert.ok(html.includes("size: A4 landscape"), "Must contain A4 landscape @page directive");
	assert.ok(html.includes("doc-container-landscape"), "Must use landscape container");

	// Header and requisites
	assert.ok(html.includes("ФОРМА № 037/у-88"), "Must specify official Form 037/u-88");
	assert.ok(html.includes("Утверждена Минздравом СССР 25.01.1988 № 50"), "Must cite Minzdrav USSR approval");
	assert.ok(html.includes("Смирнов Алексей Павлович"), "Must include doctor name");
	assert.ok(html.includes("2026-08-19"), "Must include shift date");

	// 23-column register table
	assert.ok(html.includes("Пломбы по Блэку"), "Must include Black classes table header");
	assert.ok(html.includes("Эндодонтия (каналы)"), "Must include Endodontics canals columns");
	assert.ok(html.includes("ИТОГО ЗА СМЕНУ:"), "Must include daily totals summary row");

	// Individual patient entries
	assert.ok(html.includes("Иванов Иван Иванович"), "Must render patient 1");
	assert.ok(html.includes("Петрова Анна Сергеевна"), "Must render patient 2");
	assert.ok(html.includes("Сидоров Михаил Андреевич"), "Must render patient 3");
	assert.ok(html.includes("K02.1"), "Must render ICD-10 diagnosis K02.1");
	assert.ok(html.includes("K04.0"), "Must render ICD-10 diagnosis K04.0");

	// Totals & KPI cards
	assert.ok(html.includes("9.20"), "Must render calculated total UET (9.20)");
	assert.ok(html.includes("21.0 УЕТ"), "Must render shift standard quota (21.0 UET)");
	assert.ok(html.includes("43.8%"), "Must render plan execution percentage");

	// Signatures and UKEP
	assert.ok(html.includes("Врач-стоматолог"), "Must have doctor signature area");
	assert.ok(html.includes("Медицинский регистратор / Статистик"), "Must have registrar signature");

	const stamped = injectVisualSignatureStampIntoHtml(
		html,
		renderDigitalSignatureStampHtml({
			certificateSerialNumber: "00E4A28B123456",
			certificateSubject: "Смирнов Алексей Павлович",
			validFrom: "2026-01-01",
			validTo: "2027-01-01",
			signatureType: "ukep",
		}),
	);
	assert.ok(stamped.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"), "Must apply UKEP electronic signature stamp via GOST R 7.0.97-2016");
	assert.ok(stamped.includes("00E4A28B123456"));
});

test("Form 039-2/у-88 Redesign: Monthly summary matrix with 31 calendar days, category aggregates, and specialty UET breakdown", () => {
	const payload: SummaryDentistStatement039uPayload = {
		formNumber: "039/у-88",
		clinicLegalName: 'ООО "ДЕНТЕ КЛИНИК"',
		clinicDepartment: "Стоматологическое отделение",
		reportingPeriodMonthYear: "Август 2026 г.",
		doctorFullName: "Смирнов Алексей Павлович",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		workingDaysCount: 21,
		workingHoursCount: 138.6,
		consolidatedMetrics: {
			visitsTotal: 126,
			visitsAdults: 100,
			visitsChildrenUnder14: 26,
			visitsAdolescents15_17: 0,
			visitsPrimary: 63,
			visitsRepeat: 63,
			visitsPreventativeExam: 18,
			sanatedTotal: 45,
			sanatedAdults: 36,
			sanatedChildren: 9,
			fillingsCariesTotal: 52,
			fillingsCompositePhotopolymer: 48,
			fillingsGlassIonomer: 4,
			pulpitisTreatedTotal: 18,
			periodontitisTreatedTotal: 6,
			canalsFilledTotal: 42,
			hygieneProceduresTotal: 30,
			extractionsSimple: 8,
			extractionsComplex: 2,
			extractionsImpactedWisdom: 0,
			outpatientOperationsCount: 3,
			implantsInstalledCount: 0,
			crownsDeliveredCount: 0,
			bridgesDeliveredCount: 0,
			removableDenturesCount: 0,
			orthodonticAdjustmentsCount: 0,
			anesthesiaInfiltrationCount: 50,
			anesthesiaConductionCount: 35,
			radiographsCount: 60,
		},
		uetBreakdown: {
			totalUetAccumulated: 462.5,
			periodStandardQuotaUet: 441.0,
			planExecutionPercentage: 104.9,
			uetTherapy: 280.0,
			uetEndodontics: 110.5,
			uetSurgery: 22.0,
			uetHygieneAndPerio: 50.0,
			uetProsthetics: 0,
			uetOrthodontics: 0,
			uetAnesthesiaAndDiagnostics: 0,
		},
		chiefDoctorNotes: "План за август 2026 перевыполнен на 4.9%. Замечаний по качеству лечения нет.",
	};

	const html = renderForm039uHtml(payload);

	// Header and requisites
	assert.ok(html.includes("ФОРМА № 039/у-88"), "Must specify Form 039/у-88");
	assert.ok(html.includes("СВОДНАЯ ВЕДОМОСТЬ УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА"), "Must have main title");
	assert.ok(html.includes("Август 2026 г."), "Must display reporting period");
	assert.ok(html.includes("138.6"), "Must display working hours");

	// Category aggregates
	assert.ok(html.includes("126"), "Must display 126 visits");
	assert.ok(html.includes("45"), "Must display 45 sanated patients");
	assert.ok(html.includes("52"), "Must display 52 fillings");

	// Specialty UET breakdown
	assert.ok(html.includes("280.0 УЕТ"), "Must render therapy UET (280.0)");
	assert.ok(html.includes("110.5 УЕТ"), "Must render endodontics UET (110.5)");
	assert.ok(html.includes("462.50 УЕТ"), "Must render total UET (462.50)");
	assert.ok(html.includes("441.0 УЕТ"), "Must render period quota (441.0)");
	assert.ok(html.includes("104.9%"), "Must render execution percentage (104.9%)");

	// 31-day calendar matrix
	assert.ok(html.includes("Числа месяца 1–31"), "Must contain 31-day calendar matrix section");
	assert.ok(html.includes("ИТОГО"), "Must contain Month Total summary row");

	// Chief Doctor notes & signatures
	assert.ok(html.includes("План за август 2026 перевыполнен"), "Must include chief doctor notes");
	assert.ok(html.includes("Главный врач"), "Must have chief doctor signature line");
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

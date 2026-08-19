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
		pastDentalInterventions: "Ранее лечился по поводу кариеса.",
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
			treatmentNeedCategory: "1_oral_hygiene_instruction",
		},
		hygieneIndexOhiS: "OHI-S = 0.6 (хороший уровень)",
		biteType: "orthognathic",
		biteDescription: "Прикус ортогнатический",
		oralMucosaStatus: {
			color: "pale_pink",
			moisture: "normal_salivation",
			pathologyPresence: false,
			description: "Слизистая без патологии",
		},
		gumStatus: {
			inflammation: "absent_healthy",
			bleedingOnProbing: false,
			periodontalPocketsMaxDepthMm: 2,
			gumRecessionPresent: false,
			attachedGingivaWidthMm: 4,
		},
		soapDiaries: [
			{
				entryDate: "2026-08-19",
				doctorFullName: "Смирнов А.П.",
				preliminaryDiagnosisIcd10: "K02.1",
				preliminaryDiagnosisText: "Кариес дентина зуба 4.6",
				concomitantDiagnosisText: null,
				subjectiveComplaints: "Жалобы на кратковременные боли от холодного.",
				objectiveStatusLocalis: "Зуб 4.6: кариозная полость в пределах дентина.",
				percussionVertical: "negative",
				percussionHorizontal: "negative",
				palpationMucosa: "negative",
				eodMicroamperes: 6,
				probingGingivalPocketMm: 2,
				performedInterventionsDescription: "Препарирование, пломбирование Filtek Ultimate.",
				administeredAnestheticsDescription: "Ubistesin 1.7 мл",
				appliedMedicationsMaterials: "OptiBond FL, Filtek Ultimate",
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
		attendingDoctorFullName: "Лебедева Елена Викторовна",
		facialAnthropometry: {
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
		cephalometryTrg: {
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
		tonnIndex: calculateTonnIndex(32.0, 24.0),
		pontIndex: calculatePontIndex(32.0, 36.0, 46.0),
		boltonIndex: calculateBoltonIndex(52.0, 40.0, 100.0, 91.3),
		orthodonticDiagnosisDescription: "II класс 1 подкласс по Энглю, скученность резцов",
		applianceType: "fixed_braces_ceramic",
		applianceName: "Damon Clear",
		plannedDurationMonths: 20,
	};

	const html043_1u = renderForm043_1uHtml(form043_1uPayload);
	assert.equal(html043_1u.includes("ФОРМА № 043-1/у"), true);
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
	assert.equal(html037u.includes("ФОРМА № 037/у-88"), true);

	// 4. Form 039/u
	const form039uPayload: SummaryDentistStatement039uPayload = {
		formNumber: "039/у-88",
		clinicLegalName: 'ООО "ДЕНТЕ"',
		clinicDepartment: "Терапевтическое отделение",
		reportingMonth: 8,
		reportingYear: 2026,
		doctorFullName: "Иванов И.И.",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		workDaysActual: 22,
		workHoursActual: 143,
		adultVisitsPrimary: 45,
		adultVisitsRepeat: 45,
		childVisitsPrimary: 10,
		childVisitsRepeat: 10,
		sanatedTotal: 38,
		cariousTeethFilledCount: 40,
		pulpitisPeriodontitisTreatedCount: 20,
		permanentTeethExtractedCount: 5,
		deciduousTeethExtractedCount: 0,
		anesthesiaConductiveCount: 30,
		anesthesiaInfiltrationCount: 40,
		radiologyStudiesCount: 50,
		preventiveExaminationsCount: 15,
		hygieneCleaningsCount: 25,
		uetSummary: {
			totalUetAccumulated: 280.0,
			planExecutionPercentage: 105.0,
			uetTherapy: 210.0,
			uetEndodontics: 45.0,
			uetSurgery: 0,
			uetHygieneAndPerio: 25.0,
			uetProsthetics: 0,
			uetOrthodontics: 0,
			uetAnesthesiaAndDiagnostics: 0,
			periodStandardQuotaUet: 266.0,
		},
	};

	const html039u = renderForm039uHtml(form039uPayload);
	assert.equal(html039u.includes("ФОРМА № 039/у-88"), true);

	// 5. Form 003-V/u
	const form003vuPayload: MedicalCardExtract003vuPayload = {
		formNumber: "003-В/у",
		clinicLegalName: 'ООО "ДЕНТЕ"',
		medicalCardNumber: "СТ-884",
		extractIssueDate: "2026-08-19",
		patientFullName: "Ковалев Игорь Николаевич",
		patientBirthDate: "1978-11-04",
		patientSex: "male",
		attendingDoctorFullName: "Иванов И.И.",
		treatmentStartDate: "2026-07-01",
		treatmentEndDate: "2026-08-19",
		clinicalDiagnosisIcd10: "K04.0",
		clinicalDiagnosisDetailed: "K04.0 Пульпит зуба 3.6, K02.1 Кариес дентина зуба 3.7",
		treatmentInterventionsSummary: "Эндодонтическое лечение зуба 3.6, пломбирование 3.7",
		treatmentOutcomesSummary: "Жалоб нет, функция восстановлена",
		followUpRecommendations: "Контрольный осмотр через 6 месяцев",
		extractIssuedTo: "По месту требования",
	};

	const html003vu = renderForm003vuHtml(form003vuPayload);
	assert.equal(html003vu.includes("ФОРМА № 003-В/у"), true);
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
		cumulativeDoseMsv: 0.003,
		cumulativeDoseMicrosieverts: 3.0,
		sanpinAnnualLimitMsv: 1.0,
		safetyZone: "green_optimal",
		safetyZoneLabel: "Оптимальная безопасная зона",
	};

	const htmlDose = renderRadiationDoseSheetHtml(doseSheetPayload);
	assert.equal(htmlDose.includes("ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК"), true);
	assert.equal(htmlDose.includes("СанПиН 2.6.1.1192-03"), true);
});

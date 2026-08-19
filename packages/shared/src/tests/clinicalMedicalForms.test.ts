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
	STANDARD_DENTAL_RADIATION_DOSES,
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
	const initialExam = OFFICIAL_UET_STANDARDS_804N.find((s) => s.code === "A01.07.001");
	assert.equal(initialExam?.uetDoctor, 0.5);

	const filling = OFFICIAL_UET_STANDARDS_804N.find((s) => s.code === "A16.07.002.001");
	assert.equal(filling?.uetDoctor, 1.5);
});

test("Radiation Dose Sheet: SanPiN 2.6.1.1192-03 cumulative dose calculation & thresholds", () => {
	const exposures = [
		{
			studyDate: "2026-01-15",
			studyType: "radiovisiography_periapical" as const,
			effectiveDoseMsv: 0.003,
			effectiveDoseMicrosv: 3.0,
		},
		{
			studyDate: "2026-03-20",
			studyType: "optg_panoramic_digital" as const,
			effectiveDoseMsv: 0.015,
			effectiveDoseMicrosv: 15.0,
		},
		{
			studyDate: "2026-06-10",
			studyType: "cbct_maxilla_mandible_8x8" as const,
			effectiveDoseMsv: 0.045,
			effectiveDoseMicrosv: 45.0,
		},
	];

	const assessment = calculateAnnualRadiationDose(exposures, 2026);

	assert.equal(Number(assessment.totalDoseMsv.toFixed(3)), 0.063);
	assert.equal(Number(assessment.totalDoseMicrosv.toFixed(1)), 63.0);
	assert.equal(assessment.riskCategory, "safe");
	assert.equal(assessment.sanpinLimitMsv, 1.0);
	assert.equal(assessment.percentageOfSanpinLimit < 10.0, true);
	assert.equal(assessment.hasExceededLimit, false);

	// Heavy exposure test exceeding 1.0 mSv
	const heavyExposures = [
		{
			studyDate: "2026-02-01",
			studyType: "cbct_craniofacial_15x15" as const,
			effectiveDoseMsv: 0.85,
			effectiveDoseMicrosv: 850.0,
		},
		{
			studyDate: "2026-05-01",
			studyType: "cbct_craniofacial_15x15" as const,
			effectiveDoseMsv: 0.85,
			effectiveDoseMicrosv: 850.0,
		},
	];
	const heavyAssessment = calculateAnnualRadiationDose(heavyExposures, 2026);
	assert.equal(heavyAssessment.totalDoseMsv, 1.7);
	assert.equal(heavyAssessment.riskCategory, "moderate");
	assert.equal(heavyAssessment.hasExceededLimit, true);
});

test("Clinical HTML Renderers: Generates print-ready HTML for all 6 forms", () => {
	// 1. Form 043/u
	const form043uPayload: FullForm043uPayload = {
		organization: {
			fullName: 'ООО "ДЕНТЕ КЛИНИК"',
			ogrn: "1234567890123",
			address: "г. Москва, ул. Ленина, д. 10",
		},
		patient: {
			fullName: "Соколов Дмитрий Сергеевич",
			birthDate: "1985-05-12",
			gender: "male",
			address: "г. Москва, пр-т Мира, д. 5",
			phone: "+7 (999) 111-22-33",
			medicalCardNumber: "СТ-2026/043",
			cardOpenedAt: "2026-08-19",
		},
		anamnesisAndHealth: {
			mainComplaints: "Периодическая ноющая боль в области зуба 4.6 от температурных раздражителей.",
			anamnesisMorbi: "Боли появились около недели назад, усилились 2 дня назад.",
			anamnesisVitae: "Хронических заболеваний не отмечает.",
			allergicHistory: "Аллергические реакции отрицает.",
		},
		objectiveExamination: {
			extraoralBite: "Ортогнатический прикус",
			oralMucosa: {
				color: "pale_pink",
				moisture: "normal",
				pathologyDescription: "Слизистая оболочка полости рта без патологических элементов.",
			},
			periodontalPMA: 0,
			periodontalIndexCPI: "0",
			hygieneIndexOHIS: 0.6,
		},
		dentalFormula: {
			formulaDate: "2026-08-19",
			odontogram: {
				46: {
					toothNumber: 46,
					condition: "C",
					surfaces: { occlusal: "C", distal: "C" },
				},
				36: {
					toothNumber: 36,
					condition: "F",
					surfaces: { occlusal: "F" },
				},
			},
			calculatedDmft: {
				decayed: 1,
				filled: 1,
				missing: 0,
				dmftTotal: 2,
				intensityLevel: "low",
				intensityLevelLabel: "Низкий (1.6–3.4)",
			},
		},
		periodontalStatus: {
			cpitnSextants: {
				upperRight: 0,
				upperAnterior: 0,
				upperLeft: 0,
				lowerRight: 1,
				lowerAnterior: 0,
				lowerLeft: 0,
			},
			treatmentNeeds: {
				needOralHygieneInstruction: true,
				needProfessionalScaling: false,
				needComplexPeriodontalSurgery: false,
			},
		},
		xrayFindings: [
			{
				studyDate: "2026-08-19",
				studyType: "Прицельная визиография 46",
				radiologicalDescription: "Глубокая кариозная полость на дистально-окклюзионной поверхности 46, сообщение с полостью зуба не визуализируется, периодонтальная щель не расширена.",
			},
		],
		soapDiaries: [
			{
				visitDate: "2026-08-19",
				doctorFullName: "Смирнов А.П.",
				doctorSpecialty: "Врач-стоматолог-терапевт",
				diagnosisDetailed: "K02.1 Кариес дентина зуба 4.6",
				subjectiveComplaint: "Жалобы на кратковременные боли от холодного.",
				objectiveStatus: "Зуб 4.6: кариозная полость в пределах средних слоев дентина, зондирование болезненно по эмалево-дентинной границе, перкуссия безболезненна, ЭОД = 6 мкА.",
				assessmentDiagnosis: "K02.1 Кариес дентина",
				planAndTreatment: "Анестезия Ubistesin 1.7 мл, препарирование, медикаментозная обработка 2% хлоргексидином, бондинг OptiBond FL, пломбирование Filtek Ultimate A3/A3B, полировка Enhance/PoGo.",
				nextVisitPlan: "Контрольный осмотр через 6 месяцев.",
			},
		],
	};

	const html043u = renderForm043uHtml(form043uPayload);
	assert.equal(html043u.includes("ФОРМА № 043/у"), true);
	assert.equal(html043u.includes("Соколов Дмитрий Сергеевич"), true);
	assert.equal(html043u.includes("K02.1 Кариес дентина"), true);
	assert.equal(html043u.includes("КПУ(з): 2"), true);

	// 2. Form 043-1/u
	const form043_1uPayload: OrthodonticCard043_1uPayload = {
		organization: {
			fullName: 'ООО "ОРТО ДЕНТЕ"',
			address: "г. Москва, ул. Тверская, д. 12",
		},
		patient: {
			fullName: "Кузнецова Анна Михайловна",
			birthDate: "2010-03-24",
			gender: "female",
			medicalCardNumber: "ОРТО-102",
			phone: "+7 (916) 222-33-44",
		},
		facialAnthropometry: {
			morphologicalType: "mesofacial",
			profileType: "convex",
			facialSymmetry: "symmetric",
			nasolabialAngleDegrees: 98,
			lipCompetence: "competent",
		},
		cephalometryTrg: {
			trgDate: "2026-08-10",
			snaAngle: 83.5,
			snbAngle: 79.0,
			anbAngle: 4.5,
			skeletalClass: "class_2",
			conclusion: "II Скелетный класс, ретрогнатия нижней челюсти.",
		},
		modelAnalysisIndices: {
			tonnIndex: calculateTonnIndex(32.0, 24.0),
			pontIndex: calculatePontIndex(32.0, 36.0, 46.0),
		},
		treatmentPlan: {
			planDate: "2026-08-19",
			applianceType: "fixed_braces_ceramic",
			applianceName: "Керамическая самолигирующая брекет-система Damon Clear",
			plannedDurationMonths: 20,
			retentionPlan: "Несъемные ретейнеры на обе челюсти + ночные каппы",
		},
		treatingOrthodontist: {
			fullName: "Лебедева Елена Викторовна",
		},
	};

	const html043_1u = renderForm043_1uHtml(form043_1uPayload);
	assert.equal(html043_1u.includes("ФОРМА № 043-1/у"), true);
	assert.equal(html043_1u.includes("Кузнецова Анна Михайловна"), true);
	assert.equal(html043_1u.includes("Damon Clear"), true);

	// 3. Form 037/u
	const form037uPayload: DailyDentistDiary037uPayload = {
		organization: { fullName: 'ООО "ДЕНТЕ"' },
		workDate: "2026-08-19",
		doctor: { fullName: "Иванов И.И." },
		patientRecords: [],
		dailyTotals: {
			totalPatientsSeen: 5,
			adultsCount: 4,
			childrenUnder18Count: 1,
			ruralResidentsCount: 0,
			primaryVisitsCount: 2,
			repeatVisitsCount: 3,
			preventiveVisitsCount: 1,
			sanatedPatientsCount: 3,
			totalFillingsPlaced: 4,
			totalTeethExtracted: 1,
			totalEndodonticCanals: 3,
			uetTotals: {
				therapeuticUet: 8.5,
				surgicalUet: 2.0,
				orthopedicUet: 0,
				orthodonticUet: 0,
				childrenUet: 1.0,
				totalUet: 11.5,
			},
		},
	};

	const html037u = renderForm037uHtml(form037uPayload);
	assert.equal(html037u.includes("ФОРМА № 037/у-88"), true);
	assert.equal(html037u.includes("11.50"), true);

	// 4. Form 039/u
	const form039uPayload: SummaryDentistStatement039uPayload = {
		organization: { fullName: 'ООО "ДЕНТЕ"' },
		periodLabel: "Август 2026",
		periodStartDate: "2026-08-01",
		periodEndDate: "2026-08-31",
		actualWorkDaysCount: 22,
		actualShiftHoursCount: 143,
		reportingDoctor: { fullName: "Иванов И.И." },
		visits: {
			totalVisits: 110,
			adultVisits: 90,
			childVisits: 20,
			ruralVisits: 5,
			primaryVisits: 45,
			sanatedTotal: 38,
		},
		uetBreakdown: {
			therapeuticUet: 210.0,
			surgicalUet: 45.0,
			orthopedicUet: 0,
			orthodonticUet: 0,
			childrenUet: 25.0,
			totalUetEarned: 280.0,
		},
	};

	const html039u = renderForm039uHtml(form039uPayload);
	assert.equal(html039u.includes("ФОРМА № 039/у-88"), true);
	assert.equal(html039u.includes("280.00"), true);

	// 5. Form 003-V/u
	const form003vuPayload: MedicalCardExtract003vuPayload = {
		organization: { fullName: 'ООО "ДЕНТЕ"' },
		patient: {
			fullName: "Ковалев Игорь Николаевич",
			birthDate: "1978-11-04",
			gender: "male",
			address: "г. Москва, ул. Академика Королева, д. 4",
			medicalCardNumber: "СТ-884",
		},
		extractIssueDate: "2026-08-19",
		treatmentPeriodStart: "2026-07-01",
		treatmentPeriodEnd: "2026-08-19",
		diagnosisOnAdmission: "K04.0 Острый очаговый пульпит 3.6",
		clinicalDiagnosisDetailed: "K04.0 Пульпит зуба 3.6, K02.1 Кариес дентина зуба 3.7",
		treatmentStages: [
			{
				stageDate: "2026-07-01",
				toothNumber: 36,
				diagnosis: "K04.0 Пульпит",
				interventionSummary: "Эндодонтическое лечение 3 каналов",
			},
		],
		conditionAtDischarge: "Жалоб нет, функция восстановлена, герметичность реставраций удовлетворительная.",
		followUpRecommendations: "Контрольный осмотр через 6 месяцев.",
		issuedToRecipient: "По месту требования",
		attendingDoctorFullName: "Иванов И.И.",
	};

	const html003vu = renderForm003vuHtml(form003vuPayload);
	assert.equal(html003vu.includes("ФОРМА № 003-В/у"), true);
	assert.equal(html003vu.includes("Ковалев Игорь Николаевич"), true);

	// 6. Radiation Dose Sheet
	const doseSheetPayload: RadiationDoseSheetPayload = {
		organization: { fullName: 'ООО "ДЕНТЕ"' },
		patient: {
			fullName: "Ковалев Игорь Николаевич",
			birthDate: "1978-11-04",
			medicalCardNumber: "СТ-884",
		},
		exposureRecords: [
			{
				studyDate: "2026-07-01",
				studyType: "radiovisiography_periapical",
				anatomicalArea: "Зуб 36",
				effectiveDoseMsv: 0.003,
				effectiveDoseMicrosv: 3.0,
			},
		],
		summaryAnnualDose: {
			currentYear: 2026,
			totalEffectiveDoseMsv: 0.003,
			totalEffectiveDoseMicrosv: 3.0,
			sanpinAnnualLimitMsv: 1.0,
			percentageOfLimit: 0.3,
			safetyAssessment: "safe",
			interpretationText: "Дозовая нагрузка в пределах естественного радиационного фона (безопасно).",
		},
	};

	const htmlDose = renderRadiationDoseSheetHtml(doseSheetPayload);
	assert.equal(htmlDose.includes("ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК"), true);
	assert.equal(htmlDose.includes("СанПиН 2.6.1.1192-03"), true);
	assert.equal(htmlDose.includes("0.0030 мЗв"), true);
});

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	calculateAirDecontaminationDuration,
	calculateDisinfectantSolutionMath,
	calculateLampOperatingHours,
	calculateNextGeneralCleaningDate,
	calculatePsoSampleRequirements,
	calculateRequiredConcentrateForVolume,
	evaluateLampFleetHealth,
	evaluatePsoTrialResult,
	exportBactericidalJournalToCsv,
	exportDisinfectantJournalToCsv,
	exportGeneralCleaningJournalToCsv,
	exportPsoJournalToCsv,
	generateBactericidalJournalPrintHtml,
	generateDisinfectantJournalPrintHtml,
	generateGeneralCleaningJournalPrintHtml,
	generatePsoJournalPrintHtml,
	generatePsoRecordId,
	generateSanpinConsolidatedInspectionHtml,
	exportSanpinConsolidatedArchiveToCsv,
	generateTemperatureHumidityJournalPrintHtml,
	exportTemperatureHumidityJournalToCsv,
	numberToRussianWords,
	formatRussianSheetsCount,
	validateCleaningScheduleCompliance,
	type BactericidalEquipmentRecord,
	type BactericidalSessionRecord,
	type DisinfectantJournalRecord,
	type GeneralCleaningJournalRecord,
	type PsoJournalRecord,
} from "../components/sanpin/journals/sanpinJournalsEngine.js";
import {
	DENTAL_INSTRUMENT_CATEGORIES,
	DISINFECTANTS_REGULATORY_REGISTRY,
	GENERAL_CLEANING_PRESETS,
	ROOM_SANITARY_CATEGORIES,
	SANPIN_DETERGENTS_CATALOG,
	SANPIN_PSO_CHEMICAL_TESTS,
	UV_RECIRCULATOR_MODELS,
} from "../components/sanpin/journals/sanpinJournalsPresets.js";
import { SanpinJournalsModal } from "../components/sanpin/journals/SanpinJournalsModal.js";

describe("SanPiN 3.3686-21 Disinfection & Sterilization Journal Studio Suite", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. STATUTORY PRESETS & REGISTERS INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Statutory Presets & Chemical Tests Integrity", () => {
		it("verifies chemical tests catalog (Azopyram, Phenolphthalein, Sudan III, Complex)", () => {
			assert.equal(SANPIN_PSO_CHEMICAL_TESTS.length, 4);

			const azopyram = SANPIN_PSO_CHEMICAL_TESTS.find((t) => t.id === "azopyram");
			assert.ok(azopyram);
			assert.equal(azopyram?.shortNameRu, "Азопирам");
			assert.ok(azopyram?.targetPollutantRu.includes("Гемоглобин"));
			assert.ok(azopyram?.reagentCompositionRu.includes("3% перекись водорода"));
			assert.equal(azopyram?.observationTimeSeconds, 60);

			const phenol = SANPIN_PSO_CHEMICAL_TESTS.find((t) => t.id === "phenolphthalein");
			assert.ok(phenol);
			assert.equal(phenol?.shortNameRu, "Фенолфталеин");
			assert.ok(phenol?.targetPollutantRu.includes("щелочных"));
			assert.equal(phenol?.observationTimeSeconds, 30);

			const sudan = SANPIN_PSO_CHEMICAL_TESTS.find((t) => t.id === "sudan_iii");
			assert.ok(sudan);
			assert.equal(sudan?.shortNameRu, "Судан III");
			assert.ok(sudan?.targetPollutantRu.includes("Масляные"));
		});

		it("verifies dental instrument categories and default batch sizes", () => {
			assert.ok(DENTAL_INSTRUMENT_CATEGORIES.length >= 6);

			const therapeutic = DENTAL_INSTRUMENT_CATEGORIES.find((c) => c.id === "therapeutic_kit");
			assert.ok(therapeutic);
			assert.equal(therapeutic?.defaultBatchSize, 100);
			assert.ok(therapeutic?.typicalItemsRu.some((i) => i.includes("зеркала")));

			const surgical = DENTAL_INSTRUMENT_CATEGORIES.find((c) => c.id === "surgical_kit");
			assert.ok(surgical);
			assert.equal(surgical?.defaultBatchSize, 40);
			assert.ok(surgical?.typicalItemsRu.some((i) => i.includes("Щипцы")));

			const rotary = DENTAL_INSTRUMENT_CATEGORIES.find((c) => c.id === "rotary_burs_kit");
			assert.ok(rotary);
			assert.equal(rotary?.defaultBatchSize, 120);
		});

		it("verifies approved detergents catalog parameters", () => {
			assert.ok(SANPIN_DETERGENTS_CATALOG.length >= 5);

			const biolot = SANPIN_DETERGENTS_CATALOG.find((d) => d.id === "biolot");
			assert.ok(biolot);
			assert.equal(biolot?.recommendedPsoConcentrationPercent, 0.5);
			assert.equal(biolot?.isEnzymatic, true);
			assert.equal(biolot?.requiresPhenolphthaleinCheck, true);

			const alaminol = SANPIN_DETERGENTS_CATALOG.find((d) => d.id === "alaminol");
			assert.ok(alaminol);
			assert.equal(alaminol?.recommendedPsoConcentrationPercent, 1.5);
		});

		it("verifies bactericidal recirculators and sanitary categories", () => {
			assert.ok(UV_RECIRCULATOR_MODELS.length >= 4);

			const dezar4 = UV_RECIRCULATOR_MODELS.find((m) => m.id === "dezar_4");
			assert.ok(dezar4);
			assert.equal(dezar4?.deviceType, "recirculator_closed");
			assert.equal(dezar4?.allowedInPresenceOfPeople, true);
			assert.equal(dezar4?.standardLampLifetimeHours, 8000);
			assert.equal(dezar4?.productivityM3PerHour, 100);

			const obn150 = UV_RECIRCULATOR_MODELS.find((m) => m.id === "obn_150_open");
			assert.ok(obn150);
			assert.equal(obn150?.deviceType, "irradiator_open");
			assert.equal(obn150?.allowedInPresenceOfPeople, false);

			assert.equal(ROOM_SANITARY_CATEGORIES.length, 4);
			const cat1 = ROOM_SANITARY_CATEGORIES.find((c) => c.categoryCode === "I");
			assert.equal(cat1?.targetBactericidalEfficiencyPercent, 99.9);
		});

		it("verifies statutory general cleaning presets (7-day rule for clinical rooms)", () => {
			assert.equal(GENERAL_CLEANING_PRESETS.length, 5);

			const surgical = GENERAL_CLEANING_PRESETS.find((p) => p.roomType === "surgical");
			assert.ok(surgical);
			assert.equal(surgical?.statutoryFrequencyDays, 7);
			assert.equal(surgical?.standardExposureMinutes, 60);
			assert.equal(surgical?.standardUvIrradiationMinutes, 120);

			const therapeutic = GENERAL_CLEANING_PRESETS.find((p) => p.roomType === "therapeutic");
			assert.ok(therapeutic);
			assert.equal(therapeutic?.statutoryFrequencyDays, 7);
			assert.equal(therapeutic?.standardUvIrradiationMinutes, 60);

			const utility = GENERAL_CLEANING_PRESETS.find((p) => p.roomType === "utility");
			assert.ok(utility);
			assert.equal(utility?.statutoryFrequencyDays, 30);
		});

		it("verifies disinfectant stock registry catalog", () => {
			assert.ok(DISINFECTANTS_REGULATORY_REGISTRY.length >= 5);
			const alaminol5l = DISINFECTANTS_REGULATORY_REGISTRY.find((d) => d.id === "alaminol_5l");
			assert.ok(alaminol5l);
			assert.equal(alaminol5l?.monthlyMinStockRequired, 15.0);
			assert.ok(alaminol5l?.applicationScopesRu.includes("instruments_pso"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. PSO SAMPLING & AZOPYRAM EVALUATION MATH
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. PSO Sampling & Azopyram Math Engine", () => {
		it("calculates 1% sample requirements with minimums 3 and 5", () => {
			// 1. Обычная партия (терапия) - 100 шт -> 1% = 1 шт, но минимум 3 шт
			const req1 = calculatePsoSampleRequirements(100, false);
			assert.equal(req1.minSampleCount, 3);

			// 2. Большая партия - 500 шт -> 1% = 5 шт
			const req2 = calculatePsoSampleRequirements(500, false);
			assert.equal(req2.minSampleCount, 5);

			// 3. Очень большая партия - 850 шт -> 1% = 9 шт (ceil(8.5))
			const req3 = calculatePsoSampleRequirements(850, false);
			assert.equal(req3.minSampleCount, 9);

			// 4. Критический хирургический набор - минимум 5 шт
			const reqSurg = calculatePsoSampleRequirements(40, true);
			assert.equal(reqSurg.minSampleCount, 5);
		});

		it("approves batch when all samples are negative and sample count is sufficient", () => {
			const res = evaluatePsoTrialResult({
				batchCount: 150,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
			});

			assert.equal(res.isBatchApproved, true);
			assert.equal(res.samplingSatisfied, true);
			assert.equal(res.rejectionReason, null);
			assert.ok(res.complianceNoteRu.includes("допущена к автоклавированию"));
		});

		it("rejects batch when sample count is less than 1% requirement", () => {
			// Партия 600 шт требует 6 проб, но проверено только 3
			const res = evaluatePsoTrialResult({
				batchCount: 600,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
			});

			assert.equal(res.isBatchApproved, false);
			assert.equal(res.samplingSatisfied, false);
			assert.equal(res.minSampleRequired, 6);
			assert.ok(res.rejectionReason?.includes("Недостаточный объем выборки"));
		});

		it("rejects batch when Azopyram trial is positive (blood detected)", () => {
			const res = evaluatePsoTrialResult({
				batchCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: false, // ПОЛОЖИТЕЛЬНАЯ (КРОВЬ)
				isPhenolphthaleinNegative: true,
			});

			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("Положительная азопирамовая проба"));
			assert.ok(res.rejectionReason?.includes("скрытая кровь"));
		});

		it("rejects batch when Phenolphthalein trial is positive (alkaline detergent detected)", () => {
			const res = evaluatePsoTrialResult({
				batchCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: false, // ПОЛОЖИТЕЛЬНАЯ (ЩЕЛОЧЬ)
			});

			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("Положительная фенолфталеиновая проба"));
			assert.ok(res.rejectionReason?.includes("дистиллированной водой"));
		});

		it("rejects batch when Sudan III trial is positive (oil / grease detected)", () => {
			const res = evaluatePsoTrialResult({
				batchCount: 50,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: false, // ПОЛОЖИТЕЛЬНАЯ (МАСЛО)
			});

			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("Суданом III"));
			assert.ok(res.rejectionReason?.includes("обезжиривание"));
		});

		it("generates unique PSO record ID with valid prefix and date", () => {
			const id = generatePsoRecordId("2026-08-22", 142);
			assert.equal(id, "PSO-20260822-0142");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. BACTERICIDAL LAMP HOURS & FLEET HEALTH ENGINE
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Bactericidal Lamp Operating Hours & Fleet Engine", () => {
		it("calculates session hours and accumulates total accurately", () => {
			// Сеанс 180 минут = 3.0 часа, начальная наработка 1200 ч -> итого 1203 ч
			const res = calculateLampOperatingHours(1200, 180, 8000);
			assert.equal(res.sessionHours, 3.0);
			assert.equal(res.cumulativeHoursAfterSession, 1203.0);
			assert.equal(res.remainingHours, 6797.0);
			assert.equal(res.lampStatus, "normal");
			assert.equal(res.isCritical, false);
			assert.equal(res.warningMessage, null);
		});

		it("triggers 90% warning when lamp approaches lifespan limit", () => {
			// Наработка 7250 ч из 8000 ч (7250 / 8000 = 90.6%)
			const res = calculateLampOperatingHours(7200, 50, 8000);
			assert.equal(res.cumulativeHoursAfterSession, 7200.83);
			assert.equal(res.lampStatus, "warning_replace_soon");
			assert.equal(res.isCritical, false);
			assert.ok(res.warningMessage?.includes("Запланируйте закупку и замену"));
		});

		it("triggers 100% critical expiration when lamp lifespan is reached or exceeded", () => {
			// Наработка 8010 ч из 8000 ч
			const res = calculateLampOperatingHours(8000, 10, 8000);
			assert.equal(res.cumulativeHoursAfterSession, 8000.17);
			assert.equal(res.remainingHours, 0);
			assert.equal(res.remainingPercent, 0);
			assert.equal(res.lampStatus, "expired_replace_now");
			assert.equal(res.isCritical, true);
			assert.ok(res.warningMessage?.includes("РЕСУРС ЛАМП ПОЛНОСТЬЮ ИСЧЕРПАН"));
			assert.ok(res.warningMessage?.includes("Эксплуатация облучателя запрещена"));
		});

		it("calculates air decontamination duration according to R 3.5.1904-04", () => {
			// Объем 50 м3, производительность 100 м3/ч, эффективность 99% (Кратность K = 4.6)
			// T = (4.6 * 50 / 100) * 60 = 138 минут
			const air = calculateAirDecontaminationDuration(50, 100, 99);
			assert.equal(air.airExchangesCount, 4.6);
			assert.equal(air.requiredDurationMinutes, 138);
			assert.equal(air.recommendedDurationMinutes, 150); // округление до 15 мин
			assert.ok(air.formulaExplanationRu.includes("138 мин"));
		});

		it("audits entire fleet health correctly", () => {
			const fleet = [
				{ id: "1", deviceBrand: "Дезар-4", roomName: "Терапия 1", totalOperatingHours: 1200, maxLampHours: 8000 },
				{ id: "2", deviceBrand: "Дезар-7", roomName: "Хирургия", totalOperatingHours: 7400, maxLampHours: 8000 },
				{ id: "3", deviceBrand: "ОБН-150", roomName: "Отходы", totalOperatingHours: 8100, maxLampHours: 8000 },
			];

			const summary = evaluateLampFleetHealth(fleet);
			assert.equal(summary.totalEquipments, 3);
			assert.equal(summary.normalCount, 1);
			assert.equal(summary.warningCount, 1);
			assert.equal(summary.expiredCount, 1);
			assert.equal(summary.overallHealthStatus, "critical_violation");
			assert.ok(summary.summaryMessageRu.includes("КРИТИЧЕСКОЕ НАРУШЕНИЕ"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. GENERAL CLEANING SCHEDULE & COMPLIANCE ENGINE
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. General Cleaning Schedule & Compliance Engine", () => {
		it("calculates next general cleaning date exactly after 7 days", () => {
			const nextDate = calculateNextGeneralCleaningDate("2026-08-01", "surgical");
			assert.equal(nextDate, "2026-08-08");

			const nextTherapeutic = calculateNextGeneralCleaningDate("2026-08-15", "therapeutic");
			assert.equal(nextTherapeutic, "2026-08-22");

			const nextUtility = calculateNextGeneralCleaningDate("2026-08-01", "utility");
			assert.equal(nextUtility, "2026-08-31");
		});

		it("validates cleaning schedule compliance: on schedule, early, and overdue", () => {
			// 1. Строго по графику
			const checkOnSched = validateCleaningScheduleCompliance("2026-08-22", "2026-08-22T09:00:00Z");
			assert.equal(checkOnSched.isCompliant, true);
			assert.equal(checkOnSched.status, "on_schedule");

			// 2. Досрочно
			const checkEarly = validateCleaningScheduleCompliance("2026-08-22", "2026-08-21T10:00:00Z");
			assert.equal(checkEarly.isCompliant, true);
			assert.equal(checkEarly.status, "early");

			// 3. Просрочено на 2 дня (предупреждение)
			const checkOverdue = validateCleaningScheduleCompliance("2026-08-20", "2026-08-22T10:00:00Z");
			assert.equal(checkOverdue.isCompliant, false);
			assert.equal(checkOverdue.status, "overdue");
			assert.equal(checkOverdue.daysDifference, 2);

			// 4. Критическая просрочка (более 2 дней)
			const checkCrit = validateCleaningScheduleCompliance("2026-08-15", "2026-08-22T10:00:00Z");
			assert.equal(checkCrit.isCompliant, false);
			assert.equal(checkCrit.status, "critical_overdue");
			assert.equal(checkCrit.daysDifference, 7);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. DISINFECTANT SOLUTION MATH & STOCK BALANCE
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Disinfectant Math & Stock Balance Engine", () => {
		it("calculates working solution volume from concentrate", () => {
			// Из 0.5 л концентрата для приготовления 1.0% раствора:
			// V(раствора) = 0.5 / 0.01 = 50 л, Вода = 49.5 л
			const math = calculateDisinfectantSolutionMath(0.5, 1.0);
			assert.equal(math.solutionVolumeLiters, 50.0);
			assert.equal(math.waterVolumeLiters, 49.5);
			assert.equal(math.activeAgentVolumeLiters, 0.5);
			assert.ok(math.formulaRu.includes("50 л 1% рабочего раствора"));
		});

		it("calculates required concentrate for desired solution volume", () => {
			// Для приготовления 20 л 1.5% раствора:
			// Концентрат = 20 * 0.015 = 0.3 л (300 мл), Вода = 19.7 л
			const req = calculateRequiredConcentrateForVolume(20, 1.5);
			assert.equal(req.concentrateLiters, 0.3);
			assert.equal(req.concentrateMilliliters, 300);
			assert.equal(req.waterLiters, 19.7);
			assert.ok(req.formulaRu.includes("300 мл концентрата"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. OFFICIAL PRINTABLE HTML & CSV EXPORTERS
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Official Printable HTML & CSV Exporters", () => {
		const samplePso: PsoJournalRecord[] = [
			{
				id: "PSO-20260822-001",
				timestamp: "2026-08-22T09:00:00Z",
				instrumentName: "Терапевтический набор",
				categoryId: "therapeutic_kit",
				batchItemCount: 100,
				testedSampleCount: 3,
				testType: "both_standard",
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				detergentBrand: "Биолот 0.5%",
				isBatchApproved: true,
				operatorStaffFullName: "Смирнова А.В.",
				operatorStaffPosition: "Медсестра",
				electronicStampVerified: true,
			},
		];

		const sampleEquipment: BactericidalEquipmentRecord = {
			id: "eq-1",
			roomName: "Кабинет терапии №1",
			roomVolumeM3: 45,
			deviceBrand: "Дезар-4",
			serialNumber: "DZ-101",
			deviceType: "recirculator_closed",
			lampType: "TUV 15W",
			lampCount: 3,
			maxLampHours: 8000,
			totalOperatingHours: 1200,
			remainingLampHours: 6800,
			remainingLampPercent: 85,
			lampStatus: "normal",
			isLampCritical: false,
		};

		const sampleSession: BactericidalSessionRecord[] = [
			{
				id: "sess-1",
				equipmentId: "eq-1",
				date: "2026-08-22",
				sessionStartTime: "08:00",
				sessionEndTime: "14:00",
				durationMinutes: 360,
				durationHours: 6.0,
				operatingMode: "continuous_presence",
				cumulativeHoursAfterSession: 1200,
				roomName: "Кабинет терапии №1",
				deviceBrand: "Дезар-4",
				operatorStaffFullName: "Смирнова А.В.",
			},
		];

		const sampleCleaning: GeneralCleaningJournalRecord[] = [
			{
				id: "cl-1",
				roomType: "surgical",
				roomName: "Операционная",
				scheduledDate: "2026-08-22",
				actualDateTime: "2026-08-22T08:00:00Z",
				treatedAreaM2: 32.5,
				disinfectantName: "Аламинол 1.5%",
				activeIngredient: "ЧАС + Альдегид",
				solutionConcentrationPercent: 1.5,
				applicationMethodRu: "Двукратное протирание",
				exposureTimeMinutes: 60,
				uvIrradiationMinutes: 120,
				ventilationMinutes: 20,
				operatorStaffFullName: "Соколова Т.Н.",
				isInspectorVerified: true,
				status: "verified_by_inspector",
			},
		];

		const sampleDisinfectant: DisinfectantJournalRecord[] = [
			{
				id: "dis-1",
				timestamp: "2026-08-22T09:00:00Z",
				operationType: "consumption",
				tradeName: "Аламинол",
				amount: 0.5,
				unit: "л",
				invoiceOrObjectInfo: "Генеральная уборка",
				resultingStockBalance: 24.5,
				operatorStaffFullName: "Смирнова А.В.",
			},
		];

		it("generates official Form 366/u HTML document with required headers", () => {
			const html = generatePsoJournalPrintHtml({ records: samplePso });
			assert.ok(html.includes("ФОРМА № 366/у"));
			assert.ok(html.includes("СанПиН 3.3686-21"));
			assert.ok(html.includes("Терапевтический набор"));
			assert.ok(html.includes("Отрицат."));
			assert.ok(html.includes("Допущено"));
		});

		it("generates official Bactericidal Log HTML document", () => {
			const html = generateBactericidalJournalPrintHtml({
				equipment: sampleEquipment,
				sessions: sampleSession,
			});
			assert.ok(html.includes("ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНОЙ УСТАНОВКИ"));
			assert.ok(html.includes("Дезар-4"));
			assert.ok(html.includes("1200 ч"));
		});

		it("generates General Cleaning and Disinfectant HTML documents", () => {
			const clHtml = generateGeneralCleaningJournalPrintHtml({ records: sampleCleaning });
			assert.ok(clHtml.includes("ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК"));
			assert.ok(clHtml.includes("Операционная"));
			assert.ok(clHtml.includes("32.5 м²"));

			const disHtml = generateDisinfectantJournalPrintHtml({ records: sampleDisinfectant });
			assert.ok(disHtml.includes("КНИГА УЧЕТА ПОЛУЧЕНИЯ И РАСХОДА ДЕЗИНФИЦИРУЮЩИХ СРЕДСТВ"));
			assert.ok(disHtml.includes("Аламинол"));
		});

		it("exports all 4 journals to CSV with RFC 4180 and UTF-8 BOM", () => {
			const psoCsv = exportPsoJournalToCsv(samplePso);
			assert.ok(psoCsv.startsWith("\uFEFF"), "PSO CSV must start with UTF-8 BOM");
			assert.ok(psoCsv.includes("Азопирамовая проба (кровь)"));
			assert.ok(psoCsv.includes("Терапевтический набор"));

			const bacCsv = exportBactericidalJournalToCsv(sampleSession);
			assert.ok(bacCsv.startsWith("\uFEFF"));
			assert.ok(bacCsv.includes("Дезар-4"));

			const clCsv = exportGeneralCleaningJournalToCsv(sampleCleaning);
			assert.ok(clCsv.startsWith("\uFEFF"));
			assert.ok(clCsv.includes("Операционная"));

			const disCsv = exportDisinfectantJournalToCsv(sampleDisinfectant);
			assert.ok(disCsv.startsWith("\uFEFF"));
			assert.ok(disCsv.includes("Аламинол"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. COMPONENT EXPORT INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. Component & Module Barrel Export Integrity", () => {
		it("confirms SanpinJournalsModal is exported as a valid React component function", () => {
			assert.equal(typeof SanpinJournalsModal, "function");
			assert.equal(typeof calculatePsoSampleRequirements, "function");
			assert.equal(typeof calculateLampOperatingHours, "function");
			assert.equal(typeof calculateNextGeneralCleaningDate, "function");
			assert.equal(typeof calculateDisinfectantSolutionMath, "function");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. CONSOLIDATED BINDER & MULTI-SECTION EXPORT
	// ─────────────────────────────────────────────────────────────────────────
	describe("8. Consolidated Supervisory Inspection Binder (Rospotrebnadzor Dossier)", () => {
		it("formats Russian sheet counts and declensions properly", () => {
			assert.equal(numberToRussianWords(1), "один");
			assert.equal(numberToRussianWords(5), "пять");
			assert.equal(numberToRussianWords(21), "двадцать один");
			assert.equal(numberToRussianWords(32), "двадцать два".replace("двадцать два", "тридцать два"));

			const sheets1 = formatRussianSheetsCount(1);
			assert.equal(sheets1.formattedRu, "1 (один) лист");

			const sheets3 = formatRussianSheetsCount(3);
			assert.equal(sheets3.formattedRu, "3 (три) листа");

			const sheets10 = formatRussianSheetsCount(10);
			assert.equal(sheets10.formattedRu, "10 (десять) листов");
		});

		it("generates comprehensive Consolidated A4 Landscape HTML Binder with cover page and license", () => {
			const html = generateSanpinConsolidatedInspectionHtml({
				clinicInfo: {
					name: "ООО «Стоматологическая клиника ДЕНТЕ»",
					ogrn: "1027700123456",
					inn: "7701234567",
					address: "г. Москва, ул. Клиническая, д. 10",
					chiefDoctor: "Смирнов А. В.",
					headNurse: "Иванова М. П.",
					licenseNumber: "№ ЛО41-01137-77/00368421",
					volumeNumber: 1,
				},
				periodLabelRu: "за август 2026",
				totalPagesCount: 15,
				psoRecords: [
					{
						id: "pso-01",
						timestamp: "2026-08-22T09:00:00Z",
						instrumentName: "Терапевтический смотровой набор",
						categoryId: "therapeutic_kit",
						batchItemCount: 100,
						testedSampleCount: 5,
						testType: "both_standard",
						isAzopyramNegative: true,
						isPhenolphthaleinNegative: true,
						isSudanNegative: true,
						detergentBrand: "Биолот 0.5%",
						isBatchApproved: true,
						operatorStaffFullName: "Смирнова А. В.",
						operatorStaffPosition: "Медсестра ЦСО",
						electronicStampVerified: true,
					},
				],
				form257Records: [
					{
						id: "f257-01",
						date: "2026-08-22",
						cycleNumber: 1,
						sterilizerId: "autoclave-01",
						sterilizerCode: "АВТОКЛАВ-01",
						sterilizerBrandModel: "Euronda E9 Next",
						sterilizerSerialNumber: "SN-EUR-99824",
						regimeId: "steam_134_5min",
						regimeNameRu: "134°C Универсальный",
						targetTemperatureCelsius: 134,
						targetPressureBar: 2.1,
						targetExposureMinutes: 5,
						actualTemperatureCelsius: 134.5,
						actualPressureBar: 2.15,
						actualExposureMinutes: 5.5,
						itemsDescriptionRu: "Хирургический набор",
						packsCount: 10,
						packagingType: "kraft_pouch",
						packagingNameRu: "Пакеты комбинированные",
						shelfLifeDays: 50,
						chamberPoints: [
							{ pointIndex: 1, code: "KT-1", nameRu: "КТ-1", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
							{ pointIndex: 2, code: "KT-2", nameRu: "КТ-2", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
							{ pointIndex: 3, code: "KT-3", nameRu: "КТ-3", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
							{ pointIndex: 4, code: "KT-4", nameRu: "КТ-4", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
							{ pointIndex: 5, code: "KT-5", nameRu: "КТ-5", indicatorId: "ind", indicatorTradeNameRu: "Медтест", status: "passed", initialColorRu: "Желтый", actualColorRu: "Коричневый" },
						],
						areAllPointsPassed: true,
						chemicalIndicatorNameRu: "Медтест 134/5",
						isCyclePassed: true,
						status: "sterile_passed",
						operatorStaffFullName: "Смирнова А. В.",
						operatorStaffPosition: "Медсестра ЦСО",
						isHeadNurseVerified: true,
						digitalStampHash: "HASH",
						createdAt: "2026-08-22T10:00:00Z",
					},
				],
				bactericidalSessions: [
					{
						id: "bac-01",
						equipmentId: "eq-01",
						roomName: "Кабинет №1",
						deviceBrand: "Дезар-Кронт 802",
						date: "2026-08-22",
						sessionStartTime: "08:00",
						sessionEndTime: "08:30",
						durationMinutes: 30,
						durationHours: 0.5,
						operatingMode: "pre_op_preparation",
						cumulativeHoursAfterSession: 100,
						operatorStaffFullName: "Соколова Т. Н.",
					},
				],
				generalCleanings: [
					{
						id: "clean-01",
						roomType: "surgical",
						roomName: "Хирургический кабинет №2",
						scheduledDate: "2026-08-22",
						actualDateTime: "2026-08-22T08:00:00Z",
						treatedAreaM2: 32.5,
						disinfectantName: "Аламинол 1.5%",
						activeIngredient: "Альдегиды",
						solutionConcentrationPercent: 1.5,
						applicationMethodRu: "Протирание",
						exposureTimeMinutes: 60,
						uvIrradiationMinutes: 60,
						ventilationMinutes: 15,
						operatorStaffFullName: "Смирнова А. В.",
						inspectorStaffFullName: "Иванова М. П.",
						isInspectorVerified: true,
						status: "verified_by_inspector",
					},
				],
				temperatureLogs: [
					{
						id: "temp-01",
						measurementDate: "2026-08-22",
						measurementPeriod: "morning",
						equipmentName: "Фармацевтический холодильник Pozis",
						location: "ЦСО",
						meterDeviceName: "Термометр ТМН-1",
						temperatureCelsius: 4.2,
						targetTempMinCelsius: 2,
						targetTempMaxCelsius: 8,
						isWithinNorm: true,
						operatorStaffFullName: "Иванова М. П.",
					},
				],
			});

			assert.ok(html.includes("№ ЛО41-01137-77/00368421"));
			assert.ok(html.includes("ТОМ № 1"));
			assert.ok(html.includes("Смирнов А. В."));
			assert.ok(html.includes("Иванова М. П."));
			assert.ok(html.includes("Раздел 1 • СанПиН 3.3686-21"));
			assert.ok(html.includes("Раздел 2 • СанПиН 3.3686-21"));
			assert.ok(html.includes("Раздел 3 • Часть 1"));
			assert.ok(html.includes("Раздел 4 • Приказ Минздравсоцразвития РФ № 706н"));
			assert.ok(html.includes("ЗАВЕРИТЕЛЬНАЯ НАДПИСЬ СШИВА ТОМА № 1"));
			assert.ok(html.includes("15 (пятнадцать) листов"));
		});

		it("exports multi-section consolidated CSV archive with section banners and sheet certification", () => {
			const csv = exportSanpinConsolidatedArchiveToCsv({
				clinicInfo: {
					name: "ООО «Стоматологическая клиника ДЕНТЕ»",
					ogrn: "1027700123456",
					inn: "7701234567",
					address: "г. Москва, ул. Клиническая, д. 10",
					chiefDoctor: "Смирнов А. В.",
					headNurse: "Иванова М. П.",
					licenseNumber: "№ ЛО41-01137-77/00368421",
					volumeNumber: 1,
				},
				periodLabelRu: "за август 2026",
				totalPagesCount: 20,
				psoRecords: [],
				form257Records: [],
				bactericidalSessions: [],
				generalCleanings: [],
				temperatureLogs: [],
			});

			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("№ ЛО41-01137-77/00368421"));
			assert.ok(csv.includes("=== РАЗДЕЛ 1: ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/У) ==="));
			assert.ok(csv.includes("=== РАЗДЕЛ 2: ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/У) ==="));
			assert.ok(csv.includes("=== РАЗДЕЛ 3.1: ЖУРНАЛ РЕГИСТРАЦИИ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК (Р 3.5.1904-04) ==="));
			assert.ok(csv.includes("=== РАЗДЕЛ 3.2: ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК (САНПИН 3.3686-21) ==="));
			assert.ok(csv.includes("=== РАЗДЕЛ 4: ЖУРНАЛ ТЕМПЕРАТУРНОГО РЕЖИМА ХОЛОДИЛЬНИКОВ И ХРАНЕНИЯ ЛС (ПРИКАЗ 706Н) ==="));
			assert.ok(csv.includes("=== ЗАВЕРИТЕЛЬНЫЙ ЛИСТ СШИВА ТОМА № 1 ==="));
			assert.ok(csv.includes("20 (двадцать) листов"));
		});
	});
});


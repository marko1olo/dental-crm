/**
 * ============================================================================
 * SANPIN 3.3686-21 & FORM № 257/U STUDIO TEST SUITE
 * Exhaustive unit and integration tests for statutory autoclave presets,
 * 5-point chamber validation, cycle parameter engine, CSV export, and HTML print.
 * ============================================================================
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	calculateDigitalStampHash,
	calculateSterilizerStatistics,
	checkNextBioControlDeadline,
	createDefault5ChamberPoints,
	createForm257Record,
	DEFAULT_CLINIC_LEGAL_INFO,
	evaluate5ChamberPoints,
	evaluateBioControlResult,
	evaluateCycleParameters,
	exportForm257ToCsv,
	filterForm257Records,
	generateForm257PrintHtml,
	generateForm257RecordId,
	type BiologicalControlTestRecord,
	type ChamberPointEvaluation,
	type Form257Record,
} from "../components/sanpin/autoclaveLog/autoclaveLogEngine.js";
import {
	STATUTORY_BIO_INDICATORS,
	STATUTORY_CHAMBER_5_POINTS,
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
} from "../components/sanpin/autoclaveLog/autoclaveLogPresets.js";

describe("SanPiN 3.3686-21 Autoclave & Sterilization Log (Form 257/u) Studio Suite", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. STATUTORY PRESETS & REGIMES INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Statutory Presets & Sterilization Norms", () => {
		it("verifies statutory sterilization regimes (134°C 5m, 134°C 20m prion, 121°C 20m, 180°C 60m, Bowie-Dick, Helix)", () => {
			assert.ok(STATUTORY_STERILIZATION_REGIMES.length >= 6);

			// 134°C 5min
			const steam134 = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === "steam_134_5min");
			assert.ok(steam134);
			assert.equal(steam134?.targetTemperatureCelsius, 134);
			assert.equal(steam134?.targetPressureBar, 2.1);
			assert.equal(steam134?.exposureTimeMinutes, 5);
			assert.equal(steam134?.methodType, "steam_autoclave");

			// 134°C 20min prion
			const prion = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === "steam_134_20min_prion");
			assert.ok(prion);
			assert.equal(prion?.targetTemperatureCelsius, 134);
			assert.equal(prion?.exposureTimeMinutes, 20);

			// 121°C 20min
			const delicate = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === "steam_121_20min");
			assert.ok(delicate);
			assert.equal(delicate?.targetTemperatureCelsius, 121);
			assert.equal(delicate?.targetPressureBar, 1.1);
			assert.equal(delicate?.exposureTimeMinutes, 20);

			// 180°C 60min Dry Heat
			const dryHeat = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === "dry_heat_180_60min");
			assert.ok(dryHeat);
			assert.equal(dryHeat?.targetTemperatureCelsius, 180);
			assert.equal(dryHeat?.exposureTimeMinutes, 60);
			assert.equal(dryHeat?.methodType, "dry_heat_air");

			// Bowie-Dick & Helix tests
			const bowie = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === "bowie_dick_test");
			assert.ok(bowie);
			assert.equal(bowie?.exposureTimeMinutes, 3.5);

			const helix = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === "helix_pcd_test");
			assert.ok(helix);
			assert.equal(helix?.exposureTimeMinutes, 3.5);
		});

		it("verifies 5 statutory chamber test placement points (SanPiN 3.3686-21)", () => {
			assert.equal(STATUTORY_CHAMBER_5_POINTS.length, 5);

			const point1 = STATUTORY_CHAMBER_5_POINTS.find((p) => p.pointIndex === 1);
			assert.ok(point1);
			assert.equal(point1?.code, "КТ-1");
			assert.ok(point1?.nameRu.includes("Верхний"));

			const point2 = STATUTORY_CHAMBER_5_POINTS.find((p) => p.pointIndex === 2);
			assert.ok(point2);
			assert.equal(point2?.code, "КТ-2");
			assert.ok(point2?.nameRu.includes("Нижний"));

			const point3 = STATUTORY_CHAMBER_5_POINTS.find((p) => p.pointIndex === 3);
			assert.ok(point3);
			assert.equal(point3?.code, "КТ-3");
			assert.ok(point3?.nameRu.toLowerCase().includes("центр"));

			const point4 = STATUTORY_CHAMBER_5_POINTS.find((p) => p.pointIndex === 4);
			assert.ok(point4);
			assert.equal(point4?.code, "КТ-4");
			assert.ok(point4?.nameRu.includes("дверцы"));

			const point5 = STATUTORY_CHAMBER_5_POINTS.find((p) => p.pointIndex === 5);
			assert.ok(point5);
			assert.equal(point5?.code, "КТ-5");
			assert.ok(point5?.nameRu.includes("Задняя"));
		});

		it("verifies chemical and biological indicators catalogs", () => {
			assert.ok(STATUTORY_CHEMICAL_INDICATORS.length >= 4);

			const intetest = STATUTORY_CHEMICAL_INDICATORS.find((i) => i.id === "intetest_v_134_5");
			assert.ok(intetest);
			assert.equal(intetest?.indicatorClass, 5);
			assert.ok(intetest?.passedColorRu.includes("зеленый"));

			const steritest134 = STATUTORY_CHEMICAL_INDICATORS.find((i) => i.id === "steritest_v_134");
			assert.ok(steritest134);
			assert.equal(steritest134?.indicatorClass, 4);

			const medis180 = STATUTORY_CHEMICAL_INDICATORS.find((i) => i.id === "medis_180");
			assert.ok(medis180);
			assert.ok(medis180?.suitableRegimeIds.includes("dry_heat_180_60min"));

			// Biological indicators
			assert.ok(STATUTORY_BIO_INDICATORS.length >= 2);
			const geobacillus = STATUTORY_BIO_INDICATORS.find(
				(b) => b.id === "bio_geobacillus_stearothermophilus",
			);
			assert.ok(geobacillus);
			assert.equal(geobacillus?.incubationHours, 48);
			assert.equal(geobacillus?.incubationTempCelsius, 55);
		});

		it("verifies packaging types and shelf life rules", () => {
			assert.ok(STATUTORY_PACKAGING_TYPES.length >= 5);

			const sealedPouch = STATUTORY_PACKAGING_TYPES.find((p) => p.id === "kraft_pouch_sealed");
			assert.ok(sealedPouch);
			assert.equal(sealedPouch?.shelfLifeDays, 50);

			const selfSeal = STATUTORY_PACKAGING_TYPES.find((p) => p.id === "kraft_pouch_self_seal");
			assert.ok(selfSeal);
			assert.equal(selfSeal?.shelfLifeDays, 20);

			const bipack = STATUTORY_PACKAGING_TYPES.find((p) => p.id === "cassette_bipack");
			assert.ok(bipack);
			assert.equal(bipack?.shelfLifeDays, 60);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. CYCLE COMPLIANCE & PHYSICAL SENSORS EVALUATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Cycle Compliance & Sensor Evaluation Engine", () => {
		it("accepts nominal 134°C 5min parameters", () => {
			const compliance = evaluateCycleParameters("steam_134_5min", {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.15,
				actualExposureMinutes: 5.0,
			});

			assert.equal(compliance.isCompliant, true);
			assert.equal(compliance.isTempCompliant, true);
			assert.equal(compliance.isPressureCompliant, true);
			assert.equal(compliance.isTimeCompliant, true);
			assert.equal(compliance.failureReasons.length, 0);
		});

		it("detects under-temperature defect in steam cycle", () => {
			const compliance = evaluateCycleParameters("steam_134_5min", {
				actualTemperatureCelsius: 131.0, // under 134°C
				actualPressureBar: 2.1,
				actualExposureMinutes: 5.0,
			});

			assert.equal(compliance.isCompliant, false);
			assert.equal(compliance.isTempCompliant, false);
			assert.ok(compliance.failureReasons.some((r) => r.includes("Температура вне нормы")));
		});

		it("detects pressure drop defect in steam cycle", () => {
			const compliance = evaluateCycleParameters("steam_134_5min", {
				actualTemperatureCelsius: 135.0,
				actualPressureBar: 1.7, // under 2.0 bar
				actualExposureMinutes: 5.0,
			});

			assert.equal(compliance.isCompliant, false);
			assert.equal(compliance.isPressureCompliant, false);
			assert.ok(compliance.failureReasons.some((r) => r.includes("Давление")));
		});

		it("detects insufficient exposure time defect", () => {
			const compliance = evaluateCycleParameters("steam_134_5min", {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.1,
				actualExposureMinutes: 3.5, // required 5.0 min
			});

			assert.equal(compliance.isCompliant, false);
			assert.equal(compliance.isTimeCompliant, false);
			assert.ok(compliance.failureReasons.some((r) => r.includes("Недостаточная экспозиция")));
		});

		it("evaluates dry heat 180°C parameters correctly", () => {
			const compliance = evaluateCycleParameters("dry_heat_180_60min", {
				actualTemperatureCelsius: 181.0,
				actualPressureBar: 0,
				actualExposureMinutes: 60.0,
			});

			assert.equal(compliance.isCompliant, true);
			assert.equal(compliance.isTempCompliant, true);
			assert.equal(compliance.isTimeCompliant, true);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. 5 CHAMBER CONTROL POINTS EVALUATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. 5 Chamber Control Points Evaluation", () => {
		it("approves batch when all 5 points passed", () => {
			const points = createDefault5ChamberPoints("intetest_v_134_5", true);
			const evalResult = evaluate5ChamberPoints(points);

			assert.equal(evalResult.areAllPointsPassed, true);
			assert.equal(evalResult.passedPointsCount, 5);
			assert.equal(evalResult.failedPointsCount, 0);
			assert.equal(evalResult.failedPointIndices.length, 0);
			assert.ok(evalResult.summaryRu.includes("СТЕРИЛЬНО"));
		});

		it("rejects batch (declares defect) if even 1 point failed", () => {
			const points = createDefault5ChamberPoints("intetest_v_134_5", true);
			// Point 2 (bottom corner) fails
			const modifiedPoints: ChamberPointEvaluation[] = points.map((pt) =>
				pt.pointIndex === 2 ? { ...pt, status: "failed", actualColorRu: "Фиолетовый (исходный)" } : pt,
			);

			const evalResult = evaluate5ChamberPoints(modifiedPoints);

			assert.equal(evalResult.areAllPointsPassed, false);
			assert.equal(evalResult.passedPointsCount, 4);
			assert.equal(evalResult.failedPointsCount, 1);
			assert.deepEqual(evalResult.failedPointIndices, [2]);
			assert.ok(evalResult.summaryRu.includes("БРАК СТЕРИЛИЗАЦИИ"));
			assert.ok(evalResult.summaryRu.includes("КТ-2"));
		});

		it("handles empty or incomplete points array safely", () => {
			const evalEmpty = evaluate5ChamberPoints([]);
			assert.equal(evalEmpty.areAllPointsPassed, false);
			assert.equal(evalEmpty.passedPointsCount, 0);

			const partialPoints = createDefault5ChamberPoints("intetest_v_134_5", true).slice(0, 3);
			const evalPartial = evaluate5ChamberPoints(partialPoints);
			assert.equal(evalPartial.areAllPointsPassed, false);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. FORM 257/U RECORD GENERATOR & DIGITAL STAMP
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Form 257/u Record Factory & Cryptographic Stamp", () => {
		it("generates deterministic Form 257 record ID", () => {
			const id1 = generateForm257RecordId("2026-08-22", 3, "АК-01");
			assert.equal(id1, "F257-20260822-АК01-C03");
		});

		it("creates valid Form 257 record with digital stamp and status", () => {
			const record = createForm257Record({
				date: "2026-08-22",
				cycleNumber: 1,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: "steam_134_5min",
				sensors: {
					actualTemperatureCelsius: 134.5,
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.5,
				},
				itemsDescriptionRu: "Наконечники турбинные, смотровые лотки",
				packsCount: 15,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
				operatorStaffFullName: "Смирнова Анна Викторовна",
				isHeadNurseVerified: true,
			});

			assert.equal(record.status, "sterile_passed");
			assert.equal(record.isCyclePassed, true);
			assert.equal(record.areAllPointsPassed, true);
			assert.equal(record.packsCount, 15);
			assert.ok(record.digitalStampHash.startsWith("DENTE-CSO-257-"));
			assert.equal(record.isHeadNurseVerified, true);
		});

		it("marks batch as rejected_defect when temperature is deficient", () => {
			const record = createForm257Record({
				date: "2026-08-22",
				cycleNumber: 2,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: "steam_134_5min",
				sensors: {
					actualTemperatureCelsius: 128.0, // Defect!
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.5,
				},
				itemsDescriptionRu: "Наконечники",
				packsCount: 10,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
				operatorStaffFullName: "Смирнова Анна Викторовна",
			});

			assert.equal(record.status, "rejected_defect");
			assert.equal(record.isCyclePassed, false);
			assert.ok(record.rejectionReason?.includes("Температура"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. BIOLOGICAL CONTROL SCHEDULE & EVALUATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Biological Control Scheduling & Evaluation", () => {
		it("evaluates bio control results (sterile_passed vs growth_failed vs pending)", () => {
			const passedBio: BiologicalControlTestRecord = {
				id: "BIO-001",
				sterilizerId: "autoclave-melag-vacuklav-23b",
				sterilizerCode: "АК-01",
				datePlaced: "2026-06-15",
				dateReadout: "2026-06-17",
				bioIndicatorId: "bio_geobacillus_stearothermophilus",
				sporeCultureNameRu: "Geobacillus stearothermophilus",
				lotNumber: "LOT-01",
				incubationHours: 48,
				incubationTempCelsius: 55,
				testPointIndex: 3,
				result: "sterile_passed",
				laboratoryName: "ФБУЗ Центр гигиены",
				protocolNumber: "ПР-100",
				responsibleSpecialistFullName: "Смирнова А.В.",
			};

			const evalPassed = evaluateBioControlResult(passedBio);
			assert.equal(evalPassed.isCompliant, true);
			assert.ok(evalPassed.statusRu.includes("СТЕРИЛЬНО"));

			const failedBio: BiologicalControlTestRecord = {
				...passedBio,
				result: "growth_failed",
			};
			const evalFailed = evaluateBioControlResult(failedBio);
			assert.equal(evalFailed.isCompliant, false);
			assert.ok(evalFailed.statusRu.includes("БРАК"));

			const pendingBio: BiologicalControlTestRecord = {
				...passedBio,
				result: "pending",
			};
			const evalPending = evaluateBioControlResult(pendingBio);
			assert.equal(evalPending.isCompliant, false);
			assert.ok(evalPending.statusRu.includes("инкубации"));
		});

		it("calculates 6-month biological control deadlines and detects overdue state", () => {
			const baseDate = new Date("2026-08-22");
			// Recent bio test (2 months ago)
			const recentCheck = checkNextBioControlDeadline("2026-06-22", baseDate);
			assert.equal(recentCheck.isOverdue, false);
			assert.ok(recentCheck.daysRemaining > 100);

			// Overdue bio test (8 months ago)
			const overdueCheck = checkNextBioControlDeadline("2025-12-01", baseDate);
			assert.equal(overdueCheck.isOverdue, true);
			assert.ok(overdueCheck.statusDescriptionRu.includes("ВНИМАНИЕ"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. FILTERING & STATISTICS
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Filtering & Statistics Summary", () => {
		const sampleRecords: Form257Record[] = [
			createForm257Record({
				date: "2026-08-22",
				cycleNumber: 1,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: "steam_134_5min",
				sensors: { actualTemperatureCelsius: 134.5, actualPressureBar: 2.15, actualExposureMinutes: 5.5 },
				itemsDescriptionRu: "Наконечники турбинные",
				packsCount: 10,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
				operatorStaffFullName: "Смирнова Анна Викторовна",
			}),
			createForm257Record({
				date: "2026-08-22",
				cycleNumber: 2,
				sterilizerId: "dryheat-gpk-gp20-spu",
				regimeId: "dry_heat_180_60min",
				sensors: { actualTemperatureCelsius: 180.5, actualPressureBar: 0, actualExposureMinutes: 60.0 },
				itemsDescriptionRu: "Шпатели цельнометаллические",
				packsCount: 5,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: createDefault5ChamberPoints("medis_180", true),
				operatorStaffFullName: "Смирнова Анна Викторовна",
			}),
			createForm257Record({
				date: "2026-08-21",
				cycleNumber: 3,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: "steam_134_5min",
				sensors: { actualTemperatureCelsius: 125.0, actualPressureBar: 2.1, actualExposureMinutes: 5.0 }, // Defect
				itemsDescriptionRu: "Лотки",
				packsCount: 8,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
				operatorStaffFullName: "Петрова Елена Сергеевна",
			}),
		];

		it("filters records by search query and sterilizer", () => {
			const filteredByQuery = filterForm257Records(sampleRecords, { searchQuery: "Шпатели" });
			assert.equal(filteredByQuery.length, 1);
			assert.equal(filteredByQuery[0]?.itemsDescriptionRu, "Шпатели цельнометаллические");

			const filteredBySterilizer = filterForm257Records(sampleRecords, {
				sterilizerId: "autoclave-melag-vacuklav-23b",
			});
			assert.equal(filteredBySterilizer.length, 2);

			const filteredByStatus = filterForm257Records(sampleRecords, { status: "rejected_defect" });
			assert.equal(filteredByStatus.length, 1);
			assert.equal(filteredByStatus[0]?.cycleNumber, 3);
		});

		it("calculates statistics summary accurately", () => {
			const stats = calculateSterilizerStatistics(sampleRecords);
			assert.equal(stats.totalCycles, 3);
			assert.equal(stats.successfulCycles, 2);
			assert.equal(stats.failedCycles, 1);
			assert.equal(stats.totalPacksProcessed, 23);
			assert.equal(stats.successRatePercent, 66.7);
			assert.equal(stats.cyclesByRegime["steam_134_5min"], 2);
			assert.equal(stats.cyclesByRegime["dry_heat_180_60min"], 1);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. CSV EXPORTER (WITH UTF-8 BOM) & PRINTABLE HTML
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. RFC 4180 CSV Export & Official A4 Print Layout", () => {
		const sampleRecord = createForm257Record({
			date: "2026-08-22",
			cycleNumber: 1,
			sterilizerId: "autoclave-melag-vacuklav-23b",
			regimeId: "steam_134_5min",
			sensors: { actualTemperatureCelsius: 134.5, actualPressureBar: 2.15, actualExposureMinutes: 5.5 },
			itemsDescriptionRu: "Наконечники турбинные",
			packsCount: 12,
			packagingType: "kraft_pouch_sealed",
			chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
			operatorStaffFullName: "Смирнова Анна Викторовна",
			notes: "Замечаний нет",
		});

		it("exports Form 257/u to CSV with UTF-8 BOM and statutory columns", () => {
			const csv = exportForm257ToCsv([sampleRecord]);

			assert.ok(csv.startsWith("\uFEFF")); // UTF-8 BOM
			assert.ok(csv.includes("ID Записи"));
			assert.ok(csv.includes("Номер цикла"));
			assert.ok(csv.includes("Марка и модель стерилизатора"));
			assert.ok(csv.includes("КТ-1 (Верхний угол)"));
			assert.ok(csv.includes("КТ-5 (Задняя стенка)"));
			assert.ok(csv.includes("СТЕРИЛЬНО"));
			assert.ok(csv.includes("Смирнова Анна Викторовна"));
		});

		it("generates official printable HTML for A4 landscape", () => {
			const html = generateForm257PrintHtml([sampleRecord], DEFAULT_CLINIC_LEGAL_INFO);

			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Форма № 257/у"));
			assert.ok(html.includes("ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ"));
			assert.ok(html.includes(DEFAULT_CLINIC_LEGAL_INFO.name));
			assert.ok(html.includes(DEFAULT_CLINIC_LEGAL_INFO.ogrn));
			assert.ok(html.includes("СТЕРИЛЬНО"));
			assert.ok(html.includes("Ответственный за стерилизацию в ЦСО"));
		});
	});
});

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	calculatePatientCumulativeDose,
	createDoseRecord,
	estimateDoseFromExposureParams,
	evaluateDoseCompliance,
	exportDoseJournalToCsv,
	filterDoseRecords,
	formatRadiationDoseDisplay,
	generateDoseSheetHtml,
	normalizeDoseRecord,
	type DoseRecord,
} from "../components/radiology/doseSheet/radiationDoseEngine.js";
import {
	DENTAL_XRAY_APPARATUS_REGISTRY,
	getStatutoryDosePreset,
	RADIATION_SAFETY_LIMITS_MSV,
	RADIATION_ZONE_DEFINITIONS,
	SANPIN_PROTECTIVE_EQUIPMENT_CATALOG,
	SANPIN_RADIATION_REGULATORY_AUTHORITIES,
	STATUTORY_RADIATION_DOSE_PRESETS,
	type StatutoryRadiologyModality,
} from "../components/radiology/doseSheet/radiationDosePresets.js";
import { RadiationDoseSheetModal } from "../components/radiology/doseSheet/RadiationDoseSheetModal.js";

describe("Statutory Radiation Dose Sheet (SanPiN 2.6.1.1192-03) & X-Ray Engine Suite", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. STATUTORY PRESETS & REGULATORY LIMITS INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Statutory Presets & Regulatory Limits (SanPiN 2.6.1.1192-03)", () => {
		it("verifies all 4 statutory regulatory authorities are registered with clauses", () => {
			const auths = SANPIN_RADIATION_REGULATORY_AUTHORITIES;
			assert.ok(auths.sanpin1192_03);
			assert.ok(auths.sanpin1192_03.code.includes("2.6.1.1192-03"));
			assert.ok(auths.sanpin1192_03.relevantClauses.some((c) => c.includes("043/у")));

			assert.ok(auths.nrb99_2009);
			assert.ok(auths.nrb99_2009.code.includes("НРБ-99/2009"));
			assert.ok(auths.nrb99_2009.relevantClauses.some((c) => c.includes("1.0 мЗв")));

			assert.ok(auths.osporb99_2010);
			assert.ok(auths.osporb99_2010.code.includes("ОСПОРБ-99/2010"));

			assert.ok(auths.mu2944_11);
			assert.ok(auths.mu2944_11.code.includes("МУ 2.6.1.2944-11"));
		});

		it("verifies statutory safety limits (1.0 mSv annual preventive limit, 0.5 mSv warning)", () => {
			assert.equal(RADIATION_SAFETY_LIMITS_MSV.ANNUAL_PREVENTIVE_LIMIT_MSV, 1.0);
			assert.equal(RADIATION_SAFETY_LIMITS_MSV.WARNING_THRESHOLD_MSV, 0.5);
			assert.equal(RADIATION_SAFETY_LIMITS_MSV.CRITICAL_EXCEEDED_THRESHOLD_MSV, 1.0);
			assert.equal(RADIATION_SAFETY_LIMITS_MSV.RECOMMENDED_CBCT_INTERVAL_DAYS, 90);
		});

		it("verifies statutory dose presets match required SanPiN modalities and effective doses", () => {
			assert.ok(STATUTORY_RADIATION_DOSE_PRESETS.length >= 7);

			// 1. Visiography intraoral: 0.002 mSv (2.0 µSv)
			const rvg = STATUTORY_RADIATION_DOSE_PRESETS.find((p) => p.id === "visiography_intraoral");
			assert.ok(rvg);
			assert.equal(rvg.typicalDoseMsv, 0.002);
			assert.equal(rvg.typicalDoseMicrosv, 2.0);
			assert.ok(rvg.protectionEquipmentRu.includes("0.35 мм Pb"));

			// 2. OPTG Panoramic: 0.018 mSv (18.0 µSv)
			const optg = STATUTORY_RADIATION_DOSE_PRESETS.find((p) => p.id === "optg_panoramic");
			assert.ok(optg);
			assert.equal(optg.typicalDoseMsv, 0.018);
			assert.equal(optg.typicalDoseMicrosv, 18.0);

			// 3. CBCT Segmental 5x5: 0.035 mSv (35.0 µSv)
			const cbct5x5 = STATUTORY_RADIATION_DOSE_PRESETS.find((p) => p.id === "cbct_segmental");
			assert.ok(cbct5x5);
			assert.equal(cbct5x5.typicalDoseMsv, 0.035);
			assert.equal(cbct5x5.typicalDoseMicrosv, 35.0);

			// 4. CBCT Full Jaws 8x8 / 10x10: 0.065 mSv (65.0 µSv)
			const cbctJaws = STATUTORY_RADIATION_DOSE_PRESETS.find((p) => p.id === "cbct_full_jaws");
			assert.ok(cbctJaws);
			assert.equal(cbctJaws.typicalDoseMsv, 0.065);
			assert.equal(cbctJaws.typicalDoseMicrosv, 65.0);

			// 5. CBCT Maxillofacial 15x15: 0.095 mSv (95.0 µSv)
			const cbctMax = STATUTORY_RADIATION_DOSE_PRESETS.find((p) => p.id === "cbct_maxillofacial");
			assert.ok(cbctMax);
			assert.equal(cbctMax.typicalDoseMsv, 0.095);
			assert.equal(cbctMax.typicalDoseMicrosv, 95.0);

			// 6. TRG Cephalometric: 0.006 mSv (6.0 µSv)
			const trg = STATUTORY_RADIATION_DOSE_PRESETS.find((p) => p.id === "teleradiography_trg");
			assert.ok(trg);
			assert.equal(trg.typicalDoseMsv, 0.006);
			assert.equal(trg.typicalDoseMicrosv, 6.0);
		});

		it("verifies apparatus registry and protective equipment catalog", () => {
			assert.ok(DENTAL_XRAY_APPARATUS_REGISTRY.length >= 6);
			const kavo = DENTAL_XRAY_APPARATUS_REGISTRY.find((a) => a.id === "kavo_3d_exam");
			assert.ok(kavo);
			assert.equal(kavo.brand, "KaVo");
			assert.equal(kavo.hasDoseReductionMode, true);

			assert.ok(SANPIN_PROTECTIVE_EQUIPMENT_CATALOG.length >= 4);
			const collar = SANPIN_PROTECTIVE_EQUIPMENT_CATALOG.find((e) => e.id === "thyroid_collar_035");
			assert.ok(collar);
			assert.equal(collar.leadEquivalentMmPb, 0.35);

			const vest = SANPIN_PROTECTIVE_EQUIPMENT_CATALOG.find((e) => e.id === "protective_vest_050");
			assert.ok(vest);
			assert.equal(vest.leadEquivalentMmPb, 0.5);
		});

		it("verifies getStatutoryDosePreset with fallback", () => {
			const preset = getStatutoryDosePreset("cbct_full_jaws");
			assert.equal(preset.id, "cbct_full_jaws");

			const fallback = getStatutoryDosePreset("unknown_custom_modality");
			assert.equal(fallback.id, "visiography_intraoral");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. CUMULATIVE DOSE CALCULATION ENGINE
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Cumulative Radiation Dose Calculation Engine", () => {
		it("calculates annual and lifetime cumulative doses for single and multiple studies", () => {
			const studies: Partial<DoseRecord>[] = [
				{
					id: "s1",
					studyDate: "2026-01-15",
					modalityId: "visiography_intraoral",
					effectiveDoseMicrosv: 2.0,
					effectiveDoseMsv: 0.002,
				},
				{
					id: "s2",
					studyDate: "2026-03-20",
					modalityId: "optg_panoramic",
					effectiveDoseMicrosv: 18.0,
					effectiveDoseMsv: 0.018,
				},
				{
					id: "s3",
					studyDate: "2026-05-10",
					modalityId: "cbct_full_jaws",
					effectiveDoseMicrosv: 65.0,
					effectiveDoseMsv: 0.065,
				},
			];

			const summary = calculatePatientCumulativeDose(studies, 2026);
			// Total: 2.0 + 18.0 + 65.0 = 85.0 µSv (0.085 mSv)
			assert.equal(summary.annualMicrosv, 85.0);
			assert.equal(summary.annualMsv, 0.085);
			assert.equal(summary.annualStudiesCount, 3);
			assert.equal(summary.lifetimeMicrosv, 85.0);
			assert.equal(summary.lifetimeMsv, 0.085);
			assert.equal(summary.lifetimeStudiesCount, 3);
			assert.equal(summary.percentOfAnnualLimit, 8.5); // 0.085 / 1.0 * 100
			assert.equal(summary.safetyZone, "green");
		});

		it("handles multi-year studies and segregates target year from lifetime totals", () => {
			const studies: Partial<DoseRecord>[] = [
				{
					id: "s-2025-1",
					studyDate: "2025-06-12",
					modalityId: "cbct_full_jaws",
					effectiveDoseMicrosv: 65.0,
					effectiveDoseMsv: 0.065,
				},
				{
					id: "s-2026-1",
					studyDate: "2026-02-10",
					modalityId: "visiography_intraoral",
					effectiveDoseMicrosv: 2.0,
					effectiveDoseMsv: 0.002,
				},
				{
					id: "s-2026-2",
					studyDate: "2026-07-22",
					modalityId: "optg_panoramic",
					effectiveDoseMicrosv: 18.0,
					effectiveDoseMsv: 0.018,
				},
			];

			const summary2026 = calculatePatientCumulativeDose(studies, 2026);
			assert.equal(summary2026.annualMicrosv, 20.0);
			assert.equal(summary2026.annualMsv, 0.020);
			assert.equal(summary2026.annualStudiesCount, 2);

			assert.equal(summary2026.lifetimeMicrosv, 85.0);
			assert.equal(summary2026.lifetimeMsv, 0.085);
			assert.equal(summary2026.lifetimeStudiesCount, 3);

			// Check yearly breakdown dictionary
			assert.ok(summary2026.yearlyBreakdown[2025]);
			assert.equal(summary2026.yearlyBreakdown[2025]?.count, 1);
			assert.equal(summary2026.yearlyBreakdown[2025]?.msv, 0.065);

			assert.ok(summary2026.yearlyBreakdown[2026]);
			assert.equal(summary2026.yearlyBreakdown[2026]?.count, 2);
			assert.equal(summary2026.yearlyBreakdown[2026]?.msv, 0.020);
		});

		it("categorizes safety zones correctly (green < 0.5, yellow 0.5..1.0, red >= 1.0)", () => {
			// 1. Green Zone (< 0.5 mSv)
			const greenStudies: Partial<DoseRecord>[] = [
				{
					id: "g1",
					studyDate: "2026-01-01",
					modalityId: "cbct_full_jaws",
					effectiveDoseMicrosv: 65.0,
					effectiveDoseMsv: 0.065,
				},
			];
			const greenSummary = calculatePatientCumulativeDose(greenStudies, 2026);
			assert.equal(greenSummary.safetyZone, "green");

			// 2. Yellow Zone (0.5 .. 1.0 mSv)
			const yellowStudies: Partial<DoseRecord>[] = [];
			for (let i = 0; i < 9; i++) {
				yellowStudies.push({
					id: `y-${i}`,
					studyDate: "2026-03-01",
					modalityId: "cbct_full_jaws",
					effectiveDoseMicrosv: 65.0,
					effectiveDoseMsv: 0.065,
				});
			}
			// 9 * 0.065 = 0.585 mSv -> Yellow
			const yellowSummary = calculatePatientCumulativeDose(yellowStudies, 2026);
			assert.equal(yellowSummary.annualMsv, 0.585);
			assert.equal(yellowSummary.safetyZone, "yellow");
			assert.ok(yellowSummary.percentOfAnnualLimit >= 50 && yellowSummary.percentOfAnnualLimit < 100);

			// 3. Red Zone (>= 1.0 mSv)
			const redStudies: Partial<DoseRecord>[] = [];
			for (let i = 0; i < 16; i++) {
				redStudies.push({
					id: `r-${i}`,
					studyDate: "2026-04-01",
					modalityId: "cbct_full_jaws",
					effectiveDoseMicrosv: 65.0,
					effectiveDoseMsv: 0.065,
				});
			}
			// 16 * 0.065 = 1.040 mSv -> Red
			const redSummary = calculatePatientCumulativeDose(redStudies, 2026);
			assert.equal(redSummary.annualMsv, 1.04);
			assert.equal(redSummary.safetyZone, "red");
			assert.ok(redSummary.percentOfAnnualLimit >= 100);
			assert.ok(redSummary.alaraComplianceNotes.includes("превышен"));
		});

		it("handles zero studies gracefully", () => {
			const summary = calculatePatientCumulativeDose([], 2026);
			assert.equal(summary.annualMicrosv, 0);
			assert.equal(summary.annualMsv, 0);
			assert.equal(summary.annualStudiesCount, 0);
			assert.equal(summary.lifetimeMicrosv, 0);
			assert.equal(summary.lifetimeMsv, 0);
			assert.equal(summary.lifetimeStudiesCount, 0);
			assert.equal(summary.percentOfAnnualLimit, 0);
			assert.equal(summary.safetyZone, "green");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. COMPLIANCE EVALUATION & ALARA DOCTRINE
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. SanPiN Compliance Evaluation & Planning Engine", () => {
		it("evaluates safe study addition within green zone", () => {
			const currentAnnualMsv = 0.05; // 0.05 mSv already accumulated
			const newStudyMsv = 0.065; // CBCT 8x8 planned

			const res = evaluateDoseCompliance(currentAnnualMsv, newStudyMsv);
			assert.equal(res.status, "safe");
			assert.equal(res.zone, "green");
			assert.equal(res.totalAnnualMsv, 0.115);
			assert.equal(res.isExceeded, false);
			assert.equal(res.requiresMedicalCouncilJustification, false);
			assert.equal(res.remainingAnnualMsv, 0.885);
		});

		it("evaluates study addition entering warning yellow zone", () => {
			const currentAnnualMsv = 0.45;
			const newStudyMsv = 0.065; // total = 0.515 mSv

			const res = evaluateDoseCompliance(currentAnnualMsv, newStudyMsv);
			assert.equal(res.status, "warning");
			assert.equal(res.zone, "yellow");
			assert.equal(res.totalAnnualMsv, 0.515);
			assert.equal(res.isExceeded, false);
			assert.equal(res.requiresMedicalCouncilJustification, false);
			assert.ok(res.warningMessage.includes("Предупреждение"));
		});

		it("triggers critical exceeded state when study exceeds 1.0 mSv annual limit", () => {
			const currentAnnualMsv = 0.95;
			const newStudyMsv = 0.065; // total = 1.015 mSv

			const res = evaluateDoseCompliance(currentAnnualMsv, newStudyMsv);
			assert.equal(res.status, "limit_exceeded");
			assert.equal(res.zone, "red");
			assert.equal(res.totalAnnualMsv, 1.015);
			assert.equal(res.isExceeded, true);
			assert.equal(res.requiresMedicalCouncilJustification, true);
			assert.equal(res.remainingAnnualMsv, 0.0);
			assert.ok(res.protocolActionRequired.includes("жизненным показаниям"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. DOSE ESTIMATION FROM PHYSICAL TUBE EXPOSURE PARAMETERS
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Tube Physical Parameters & Dose Estimation (МУ 2.6.1.2944-11)", () => {
		it("estimates RVG dose from standard tube settings (65 kV, 7 mA, 0.08 s)", () => {
			const est = estimateDoseFromExposureParams({
				modalityId: "visiography_intraoral",
				kv: 65,
				ma: 7,
				exposureSec: 0.08,
				isDigital: true,
			});

			assert.ok(est.estimatedDoseMsv >= 0.001 && est.estimatedDoseMsv <= 0.005);
			assert.ok(est.estimatedDoseMicrosv >= 1.0 && est.estimatedDoseMicrosv <= 5.0);
			assert.ok(est.calculationMethod.includes("МУ 2.6.1.2944-11"));
		});

		it("estimates CBCT dose from standard settings (90 kV, 7 mA, 14 s)", () => {
			const est = estimateDoseFromExposureParams({
				modalityId: "cbct_full_jaws",
				kv: 90,
				ma: 7,
				exposureSec: 14.0,
				isDigital: true,
			});

			assert.ok(est.estimatedDoseMsv >= 0.040 && est.estimatedDoseMsv <= 0.090);
			assert.ok(est.estimatedDoseMicrosv >= 40.0 && est.estimatedDoseMicrosv <= 90.0);
		});

		it("formats radiation dose display for UI badges", () => {
			const d1 = formatRadiationDoseDisplay(2.0);
			assert.equal(d1.microsvText, "2 мкЗв");
			assert.equal(d1.msvText, "0.002 мЗв");
			assert.equal(d1.safetyZone, "green");

			const d2 = formatRadiationDoseDisplay(65.0);
			assert.equal(d2.microsvText, "65 мкЗв");
			assert.equal(d2.msvText, "0.065 мЗв");
			assert.equal(d2.safetyZone, "yellow");

			const d3 = formatRadiationDoseDisplay(600.0);
			assert.equal(d3.microsvText, "600 мкЗв");
			assert.equal(d3.msvText, "0.6 мЗв");
			assert.equal(d3.safetyZone, "red");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. OFFICIAL PRINTABLE FORM 043/U HTML GENERATOR
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Official Form 043/u Radiation Insert HTML Generator", () => {
		it("generates full print-ready HTML document with required statutory headers", () => {
			const sampleRecords: DoseRecord[] = [
				createDoseRecord({
					studyDate: "2026-03-15",
					modalityId: "visiography_intraoral",
					modalityLabel: "Прицельный снимок на визиографе (RVG)",
					anatomicalArea: "Зуб 16",
					teethFdi: ["16"],
					tubeVoltageKv: 65,
					tubeCurrentMa: 7,
					exposureTimeSec: 0.08,
					effectiveDoseMicrosv: 2.0,
					effectiveDoseMsv: 0.002,
					doctorName: "Др. Смирнов А.В.",
				}),
				createDoseRecord({
					studyDate: "2026-04-10",
					modalityId: "optg_panoramic",
					modalityLabel: "ОПТГ цифровая",
					anatomicalArea: "Обе челюсти",
					teethFdi: [],
					tubeVoltageKv: 70,
					tubeCurrentMa: 10,
					exposureTimeSec: 12.0,
					effectiveDoseMicrosv: 18.0,
					effectiveDoseMsv: 0.018,
					doctorName: "Др. Смирнов А.В.",
				}),
			];

			const html = generateDoseSheetHtml(sampleRecords, {
				clinicName: 'Стоматологическая клиника "Денте"',
				patientFullName: "Петров Петр Петрович",
				patientBirthDate: "1985-11-20",
				medicalCardNumber: "043/у-7788",
				reportingYear: 2026,
				responsibleDoctorName: "Др. Смирнов А.В.",
				paperFormat: "A4",
			});

			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА"));
			assert.ok(html.includes("Вкладыш в Форму № 043/у"));
			assert.ok(html.includes("СанПиН 2.6.1.1192-03"));
			assert.ok(html.includes("Петров Петр Петрович"));
			assert.ok(html.includes("043/у-7788"));
			assert.ok(html.includes("Зуб 16"));
			assert.ok(html.includes("0.0020") || html.includes("0.002"));
			assert.ok(html.includes("ЗАКЛЮЧЕНИЕ ОТВЕТСТВЕННОГО ЗА РАДИАЦИОННУЮ БЕЗОПАСНОСТЬ"));
			assert.ok(html.includes("Др. Смирнов А.В."));
		});

		it("supports A5 landscape paper formatting", () => {
			const html = generateDoseSheetHtml([], {
				paperFormat: "A5",
			});
			assert.ok(html.includes("size: A5 landscape"));
		});

		it("safely escapes HTML in patient name and notes to prevent XSS", () => {
			const maliciousRecords: Partial<DoseRecord>[] = [
				{
					studyDate: "2026-05-01",
					modalityLabel: "<script>alert(1)</script>",
					anatomicalArea: "<b>Тест</b>",
					doctorName: "Врач & Соавтор",
				},
			];

			const html = generateDoseSheetHtml(maliciousRecords, {
				patientFullName: "Иван <style>body{display:none}</style>",
			});

			assert.ok(!html.includes("<script>alert(1)</script>"));
			assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
			assert.ok(html.includes("&lt;b&gt;Тест&lt;/b&gt;"));
			assert.ok(html.includes("Врач &amp; Соавтор"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. RFC 4180 CSV EXPORTER WITH UTF-8 BOM
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. RFC 4180 CSV Exporter Engine", () => {
		it("exports CSV starting with UTF-8 BOM and correct headers", () => {
			const sampleRecords: DoseRecord[] = [
				createDoseRecord({
					studyDate: "2026-02-14",
					modalityId: "cbct_full_jaws",
					modalityLabel: "3D КЛКТ челюстей",
					anatomicalArea: "Верхняя и нижняя челюсти",
					teethFdi: ["16", "26"],
					apparatusModel: "KaVo 3D eXam",
					tubeVoltageKv: 90,
					tubeCurrentMa: 7,
					exposureTimeSec: 14.0,
					effectiveDoseMicrosv: 65.0,
					effectiveDoseMsv: 0.065,
					doctorName: "Др. Смирнов А.В.",
					notes: 'Планирование имплантации "All-on-4"',
				}),
			];

			const csv = exportDoseJournalToCsv(sampleRecords, {
				clinicName: 'ООО "Денте"',
				patientFullName: "Сидоров С.С.",
				medicalCardNumber: "043/у-0099",
				delimiter: ";",
			});

			// UTF-8 BOM check
			assert.equal(csv.charCodeAt(0), 0xfeff);

			// Metadata check
			assert.ok(csv.includes('ООО ""Денте""'));
			assert.ok(csv.includes("Сидоров С.С."));
			assert.ok(csv.includes("043/у-0099"));

			// Header check
			assert.ok(csv.includes("№ п/п"));
			assert.ok(csv.includes("Дата исследования"));
			assert.ok(csv.includes("Эффективная доза (мЗв)"));

			// Data check with escaped quotes in notes
			assert.ok(csv.includes("3D КЛКТ челюстей"));
			assert.ok(csv.includes("65.00"));
			assert.ok(csv.includes("0.0650"));
			assert.ok(csv.includes('""All-on-4""'));

			// Totals row check
			assert.ok(csv.includes("ИТОГО ЗА ВСЁ ВРЕМЯ"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. RECORD FILTERING & SEARCH
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. Dose Records Filter & Search Engine", () => {
		const dataset: DoseRecord[] = [
			createDoseRecord({
				id: "d1",
				studyDate: "2025-10-10",
				modalityId: "visiography_intraoral",
				anatomicalArea: "Зуб 16",
				doctorName: "Др. Иванов",
			}),
			createDoseRecord({
				id: "d2",
				studyDate: "2026-01-20",
				modalityId: "optg_panoramic",
				anatomicalArea: "Челюсти",
				doctorName: "Др. Смирнов",
			}),
			createDoseRecord({
				id: "d3",
				studyDate: "2026-05-15",
				modalityId: "cbct_full_jaws",
				anatomicalArea: "ВНЧС и челюсти",
				doctorName: "Др. Смирнов",
			}),
		];

		it("filters records by calendar year", () => {
			const y2025 = filterDoseRecords(dataset, { year: 2025 });
			assert.equal(y2025.length, 1);
			assert.equal(y2025[0]?.id, "d1");

			const y2026 = filterDoseRecords(dataset, { year: 2026 });
			assert.equal(y2026.length, 2);
		});

		it("filters records by modality", () => {
			const rvgOnly = filterDoseRecords(dataset, { modalityId: "visiography_intraoral" });
			assert.equal(rvgOnly.length, 1);
			assert.equal(rvgOnly[0]?.modalityId, "visiography_intraoral");
		});

		it("filters records by search keyword", () => {
			const found = filterDoseRecords(dataset, { search: "ВНЧС" });
			assert.equal(found.length, 1);
			assert.equal(found[0]?.id, "d3");

			const byDoc = filterDoseRecords(dataset, { search: "Иванов" });
			assert.equal(byDoc.length, 1);
			assert.equal(byDoc[0]?.id, "d1");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. COMPONENT & BARREL EXPORT INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("8. Component & Barrel Export Integrity", () => {
		it("confirms RadiationDoseSheetModal is exported as a valid React component function", () => {
			assert.equal(typeof RadiationDoseSheetModal, "function");
			assert.equal(RadiationDoseSheetModal.name, "RadiationDoseSheetModal");
		});
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculatePsoSampleRequirements,
	evaluatePsoTrialResult,
	generatePsoRecordId,
	exportPsoJournalToCsv,
	generatePsoJournalPrintHtml,
	type PsoJournalRecord,
	SANPIN_DETERGENTS_CATALOG,
	SANPIN_PSO_CHEMICAL_TESTS,
	DENTAL_INSTRUMENT_CATEGORIES,
} from "@dental/shared";

describe("SanPiN 3.3686-21 — Pre-Sterilization Cleansing Quality Control (ПСО, Форма № 366/у)", () => {
	describe("1. Statutory 1% Sampling Requirement Math (min 3–5 items)", () => {
		it("calculates minimum 3 items for standard small batches (< 300 pcs)", () => {
			const batch10 = calculatePsoSampleRequirements(10, false);
			assert.equal(batch10.minSampleCount, 3);

			const batch50 = calculatePsoSampleRequirements(50, false);
			assert.equal(batch50.minSampleCount, 3);

			const batch200 = calculatePsoSampleRequirements(200, false);
			assert.equal(batch200.minSampleCount, 3);
		});

		it("calculates exactly 1% rounded up for large batches (> 300 pcs)", () => {
			const batch350 = calculatePsoSampleRequirements(350, false);
			assert.equal(batch350.minSampleCount, 4); // ceil(3.5) = 4

			const batch500 = calculatePsoSampleRequirements(500, false);
			assert.equal(batch500.minSampleCount, 5); // 500 * 0.01 = 5

			const batch1200 = calculatePsoSampleRequirements(1200, false);
			assert.equal(batch1200.minSampleCount, 12);
		});

		it("enforces higher minimum of 5 items for critical surgical instrument sets", () => {
			const surgicalSmall = calculatePsoSampleRequirements(20, true);
			assert.equal(surgicalSmall.minSampleCount, 5);

			const surgicalLarge = calculatePsoSampleRequirements(600, true);
			assert.equal(surgicalLarge.minSampleCount, 6);
		});

		it("rejects batch if tested count is less than minimum sample required", () => {
			const evalResult = evaluatePsoTrialResult({
				batchCount: 100,
				testedSampleCount: 2, // Required min: 3
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
			});
			assert.equal(evalResult.isBatchApproved, false);
			assert.equal(evalResult.samplingSatisfied, false);
			assert.ok(evalResult.rejectionReason?.includes("Недостаточный объем выборки"));
		});
	});

	describe("2. Chemical Quality Tests (Azopyram, Phenolphthalein, Sudan III)", () => {
		it("approves batch when all tests are negative and sampling is satisfied", () => {
			const res = evaluatePsoTrialResult({
				batchCount: 150,
				testedSampleCount: 5,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
			});
			assert.equal(res.isBatchApproved, true);
			assert.equal(res.samplingSatisfied, true);
			assert.equal(res.rejectionReason, null);
		});

		it("rejects batch on positive Azopyram trial (occult blood / hemoglobin)", () => {
			const res = evaluatePsoTrialResult({
				batchCount: 80,
				testedSampleCount: 3,
				isAzopyramNegative: false, // Positive -> BLOOD DETECTED
				isPhenolphthaleinNegative: true,
			});
			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("азопирамовая проба"));
			assert.ok(res.rejectionReason?.includes("скрытая кровь"));
			assert.ok(res.complianceNoteRu.includes("следы крови"));
		});

		it("rejects batch on positive Phenolphthalein trial (alkaline detergent residue)", () => {
			const res = evaluatePsoTrialResult({
				batchCount: 80,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: false, // Positive -> ALKALINE RESIDUE
			});
			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("фенолфталеиновая проба"));
			assert.ok(res.rejectionReason?.includes("щелочн"));
		});

		it("rejects batch on positive Sudan III trial (grease / oil on handpieces)", () => {
			const res = evaluatePsoTrialResult({
				batchCount: 40,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: false, // Positive -> OIL CONTAMINATION
			});
			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("Суданом III"));
			assert.ok(res.rejectionReason?.includes("масляные/жировые"));
		});

		it("verifies PSO chemical tests catalog specifications", () => {
			const azopyram = SANPIN_PSO_CHEMICAL_TESTS.find((t) => t.id === "azopyram");
			assert.ok(azopyram);
			assert.ok(azopyram.targetPollutantRu.includes("Гемоглобин"));
			assert.equal(azopyram.observationTimeSeconds, 60);

			const phenolphthalein = SANPIN_PSO_CHEMICAL_TESTS.find((t) => t.id === "phenolphthalein");
			assert.ok(phenolphthalein);
			assert.ok(phenolphthalein.targetPollutantRu.includes("щелочных"));

			const sudan = SANPIN_PSO_CHEMICAL_TESTS.find((t) => t.id === "sudan_iii");
			assert.ok(sudan);
			assert.ok(sudan.targetPollutantRu.includes("Масляные смазки"));
		});

		it("verifies approved detergents catalog for PSO and disinfection", () => {
			const biolot = SANPIN_DETERGENTS_CATALOG.find((d) => d.brandNameRu.includes("Биолот"));
			assert.ok(biolot, "Биолот must be present");
			assert.equal(biolot.isEnzymatic, true);

			const alaminol = SANPIN_DETERGENTS_CATALOG.find((d) => d.brandNameRu.includes("Аламинол"));
			assert.ok(alaminol, "Аламинол must be present");
		});
	});

	describe("3. Form 366/u Registration, CSV Export & HTML Print Template", () => {
		it("generates structured record ID according to PSO numbering pattern", () => {
			const recId = generatePsoRecordId("2026-08-22", 12);
			assert.ok(recId.startsWith("PSO-20260822-0012"));
		});

		it("exports Form 366/u records to CSV with standard columns", () => {
			const sampleRecords: PsoJournalRecord[] = [
				{
					id: "rec-1",
					timestamp: "2026-08-22T09:30:00.000Z",
					instrumentName: "Терапевтический лоток (зеркало, зонд, пинцет, гладилка)",
					categoryId: "therapeutic",
					batchItemCount: 120,
					testedSampleCount: 4,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Биолот 0.5%",
					isBatchApproved: true,
					operatorStaffFullName: "Смирнова Е.В.",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
				},
				{
					id: "rec-2",
					timestamp: "2026-08-22T11:00:00.000Z",
					instrumentName: "Хирургические элеваторы и щипцы",
					categoryId: "surgical",
					batchItemCount: 45,
					testedSampleCount: 3,
					testType: "both_standard",
					isAzopyramNegative: false,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Аламинол 1.0%",
					isBatchApproved: false,
					rejectionReason: "Положительный азопирам",
					operatorStaffFullName: "Смирнова Е.В.",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
				},
			];

			const csv = exportPsoJournalToCsv(sampleRecords);
			assert.ok(csv.startsWith("\uFEFF"), "Must have UTF-8 BOM");
			assert.ok(csv.includes("Азопирамовая проба"));
			assert.ok(csv.includes("Фенолфталеиновая проба"));
			assert.ok(csv.includes("Биолот 0.5%"));
			assert.ok(csv.includes("Допущено"));
			assert.ok(csv.includes("БРАК"));
		});

		it("generates print-ready HTML for Form № 366/у with legal header and signature lines", () => {
			const sampleRecord: PsoJournalRecord = {
				id: "rec-1",
				timestamp: "2026-08-22T09:30:00.000Z",
				instrumentName: "Турбинные наконечники со спреем",
				categoryId: "handpieces",
				batchItemCount: 10,
				testedSampleCount: 3,
				testType: "both_standard",
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				detergentBrand: "Бланизол 0.5%",
				isBatchApproved: true,
				operatorStaffFullName: "Ковалева О.С.",
				operatorStaffPosition: "Главная медсестра",
				electronicStampVerified: true,
			};

			const html = generatePsoJournalPrintHtml({
				records: [sampleRecord],
				clinicInfo: {
					name: 'ООО "ДЕНТЕ КЛИНИК"',
					ogrn: "1234567890123",
					inn: "7701234567",
					address: "г. Москва",
					chiefDoctor: "Д-р Марков М.В.",
					headNurse: "Ковалева О.С.",
				},
			});

			assert.ok(html.includes("ФОРМА № 366/у"));
			assert.ok(html.includes("ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ"));
			assert.ok(html.includes("Турбинные наконечники"));
			assert.ok(html.includes("Бланизол 0.5%"));
			assert.ok(html.includes("Главная медицинская сестра"));
		});
	});
});

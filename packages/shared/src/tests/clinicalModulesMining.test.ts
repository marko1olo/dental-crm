import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateSepaCal } from "../perio/index.js";
import {
	calculateCombinedFamilyBalance,
	computeBopPercentage,
	computeCompletePerioIndices,
	computeMeanCal,
	computePlaqueIndex,
	countTeethWithDeepPockets,
	filterTimelineEntries,
	getInverseRelationshipType,
	getProbingDepthHeatmapTone,
	getRelationshipLabelRu,
	groupTimelineEntriesByDate,
	isPediatricGuardianRequired,
	patientRelationshipSchema,
	patientTimelineEntrySchema,
	periodontogramSnapshotSchema,
	SEPA_PERMANENT_TEETH,
	type PatientTimelineEntry,
	type SepaToothValue,
	validateGuardianForMinor,
} from "../emr/index.js";

describe("Clinical Modules Mining & Porting Tests", () => {
	describe("1. Periodontogram & SEPA 6-point probing engine", () => {
		function createMockTooth(toothNumber: number, override: Partial<SepaToothValue> = {}): SepaToothValue {
			return {
				toothNumber,
				isPresent: true,
				isImplant: false,
				mobility: 0,
				prognosis: "good",
				furcationBuccal: "0",
				furcationLingual: "0",
				keratinizedGingivaMm: 4,
				sites: [
					{ siteCode: "MV", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					{ siteCode: "V", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					{ siteCode: "DV", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					{ siteCode: "ML", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					{ siteCode: "L", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					{ siteCode: "DL", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				],
				...override,
			};
		}

		it("correctly identifies all 32 permanent teeth", () => {
			assert.equal(SEPA_PERMANENT_TEETH.length, 32);
			assert.ok(SEPA_PERMANENT_TEETH.includes(11));
			assert.ok(SEPA_PERMANENT_TEETH.includes(48));
		});

		it("calculates CAL accurately for positive, zero, and negative gingival margins", () => {
			// Normal: PD 3mm, GM 0mm -> CAL 3mm
			assert.equal(calculateSepaCal(3, 0), 3);
			// Recession: PD 4mm, GM 2mm -> CAL 6mm
			assert.equal(calculateSepaCal(4, 2), 6);
			// Hyperplasia/Pseudo-pocket: PD 5mm, GM -3mm -> CAL 2mm
			assert.equal(calculateSepaCal(5, -3), 2);
			// Extreme hyperplasia: PD 2mm, GM -4mm -> CAL 0mm (capped)
			assert.equal(calculateSepaCal(2, -4), 0);
		});

		it("computes BoP percentage with theoretical denominator (SEPA standard)", () => {
			// 2 present teeth = 12 total theoretical sites
			const teeth: SepaToothValue[] = [
				createMockTooth(11, {
					sites: [
						{ siteCode: "MV", probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "V", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "DV", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "ML", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "L", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "DL", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					],
				}),
				createMockTooth(12, {
					sites: [
						{ siteCode: "MV", probingDepthMm: 5, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true, suppuration: false, calculus: false },
						{ siteCode: "V", probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "DV", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "ML", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "L", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "DL", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					],
				}),
			];

			// 3 bleeding sites out of 12 = 25.0%
			const bop = computeBopPercentage(teeth, { mode: "theoretical" });
			assert.equal(bop, 25.0);

			// 1 plaque site out of 12 = 8.3%
			const pi = computePlaqueIndex(teeth, { mode: "theoretical" });
			assert.equal(pi, 8.3);
		});

		it("counts deep pockets and computes complete periodontal indices", () => {
			const teeth: SepaToothValue[] = [
				createMockTooth(16, {
					furcationBuccal: "II",
					mobility: 1,
					sites: [
						{ siteCode: "MV", probingDepthMm: 6, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: false },
						{ siteCode: "V", probingDepthMm: 4, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "DV", probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "ML", probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "L", probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "DL", probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					],
				}),
				createMockTooth(17, {
					sites: [
						{ siteCode: "MV", probingDepthMm: 5, gingivalMarginMm: 0, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "V", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "DV", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "ML", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "L", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
						{ siteCode: "DL", probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
					],
				}),
			];

			assert.equal(countTeethWithDeepPockets(teeth, 5), 2);

			const indices = computeCompletePerioIndices(teeth);
			assert.equal(indices.deepPocketsCount, 2);
			assert.equal(indices.moderatePocketsCount, 1);
			assert.equal(indices.teethWithFurcationCount, 1);
			assert.equal(indices.teethWithMobilityCount, 1);
			assert.equal(indices.sitesWithSuppurationCount, 1);
			assert.equal(indices.totalTeethExamined, 2);
		});

		it("maps probing depth to correct discrete heatmap tone", () => {
			assert.equal(getProbingDepthHeatmapTone(null), "neutral");
			assert.equal(getProbingDepthHeatmapTone(2), "success");
			assert.equal(getProbingDepthHeatmapTone(3), "success");
			assert.equal(getProbingDepthHeatmapTone(4), "warning-low");
			assert.equal(getProbingDepthHeatmapTone(5), "warning-high");
			assert.equal(getProbingDepthHeatmapTone(6), "warning-high");
			assert.equal(getProbingDepthHeatmapTone(7), "error");
			assert.equal(getProbingDepthHeatmapTone(9), "error");
		});

		it("validates full periodontogram snapshot schema", () => {
			const validSnapshot = {
				id: "33333333-3333-3333-3333-333333333333",
				clinicId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				status: "closed",
				recordedAt: "2026-08-27T01:00:00.000Z",
				recordedBy: "44444444-4444-4444-4444-444444444444",
				closedAt: "2026-08-27T01:30:00.000Z",
				closedBy: "44444444-4444-4444-4444-444444444444",
				notes: "Пародонтологический статус стабилен.",
				indices: {
					bopPct: 15.5,
					piPct: 12.0,
					calMeanMm: 2.8,
					deepPocketsCount: 1,
				},
				teeth: [createMockTooth(11)],
			};

			const parsed = periodontogramSnapshotSchema.parse(validSnapshot);
			assert.equal(parsed.status, "closed");
			assert.equal(parsed.indices?.bopPct, 15.5);
		});
	});

	describe("2. Patient Timeline & Event Aggregator", () => {
		const sampleEntries: PatientTimelineEntry[] = [
			{
				id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
				clinicId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				eventType: "appointment.completed",
				eventCategory: "visit",
				sourceTable: "appointments",
				sourceId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
				title: "Прием завершен: Терапевтическое лечение",
				description: "Проведена реставрация зуба 16",
				eventData: { toothNumber: 16 },
				occurredAt: "2026-08-27T10:00:00.000Z",
				createdBy: "44444444-4444-4444-4444-444444444444",
				createdByName: "Д-р Иванов",
			},
			{
				id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
				clinicId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				eventType: "budget.accepted",
				eventCategory: "financial",
				sourceTable: "budgets",
				sourceId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
				title: "Смета согласована пациентом: План имплантации",
				description: "Согласовано через 2FA SMS",
				eventData: { totalKopecks: 15000000 },
				occurredAt: "2026-08-27T08:30:00.000Z",
				createdBy: null,
				createdByName: null,
			},
			{
				id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
				clinicId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				eventType: "dicom.uploaded",
				eventCategory: "diagnostic",
				sourceTable: "dicom_series",
				sourceId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
				title: "Загружено КЛКТ исследование (3D)",
				description: "Область: Верхняя и нижняя челюсть",
				eventData: { slicesCount: 480 },
				occurredAt: "2026-08-25T14:00:00.000Z",
				createdBy: "44444444-4444-4444-4444-444444444444",
				createdByName: "Рентген-лаборант",
			},
		];

		it("validates timeline entry schemas", () => {
			const parsed = patientTimelineEntrySchema.parse(sampleEntries[0]);
			assert.equal(parsed.eventCategory, "visit");
			assert.equal(parsed.eventType, "appointment.completed");
		});

		it("groups timeline entries into date clusters", () => {
			const grouped = groupTimelineEntriesByDate(sampleEntries, "desc");
			assert.equal(grouped.length, 2);
			assert.equal(grouped[0]!.date, "2026-08-27");
			assert.equal(grouped[0]!.totalEvents, 2);
			assert.equal(grouped[1]!.date, "2026-08-25");
			assert.equal(grouped[1]!.totalEvents, 1);
		});

		it("filters timeline entries by category and search query", () => {
			const financialOnly = filterTimelineEntries(sampleEntries, {
				categories: ["financial"],
			});
			assert.equal(financialOnly.length, 1);
			assert.ok(financialOnly[0]!.title.includes("Смета"));

			const searchDicom = filterTimelineEntries(sampleEntries, {
				searchQuery: "КЛКТ",
			});
			assert.equal(searchDicom.length, 1);
			assert.equal(searchDicom[0]!.eventCategory, "diagnostic");
		});
	});

	describe("3. Patient Relationships & Pediatric Guardianship", () => {
		it("correctly computes inverse relationship types", () => {
			assert.equal(getInverseRelationshipType("parent"), "child");
			assert.equal(getInverseRelationshipType("child"), "parent");
			assert.equal(getInverseRelationshipType("guardian"), "ward");
			assert.equal(getInverseRelationshipType("ward"), "guardian");
			assert.equal(getInverseRelationshipType("spouse"), "spouse");
			assert.equal(getInverseRelationshipType("sibling"), "sibling");
			assert.equal(getInverseRelationshipType("grandparent"), "grandchild");
			assert.equal(getInverseRelationshipType("grandchild"), "grandparent");
			assert.equal(getInverseRelationshipType("other"), "other");
		});

		it("returns accurate Russian relationship labels", () => {
			assert.ok(getRelationshipLabelRu("parent", "direct").includes("Родитель"));
			assert.ok(getRelationshipLabelRu("parent", "inverse").includes("Ребёнок"));
			assert.ok(getRelationshipLabelRu("guardian", "direct").includes("Опекун"));
		});

		it("identifies pediatric legal consent requirement (< 15 years)", () => {
			assert.equal(isPediatricGuardianRequired(7), true);
			assert.equal(isPediatricGuardianRequired(14), true);
			assert.equal(isPediatricGuardianRequired(15), false);
			assert.equal(isPediatricGuardianRequired(18), false);
		});

		it("validates minor legal consent authority under FZ-323", () => {
			// Minor without guardian -> requires guardian
			const unrepresented = validateGuardianForMinor(10, []);
			assert.equal(unrepresented.requiresGuardianForConsent, true);
			assert.equal(unrepresented.hasValidGuardian, false);
			assert.ok(unrepresented.validationMessageRu?.includes("ВНИМАНИЕ"));

			// Minor with mother attached -> valid
			const represented = validateGuardianForMinor(10, [
				{
					relatedPatientId: "55555555-5555-5555-5555-555555555555",
					relatedPatientName: "Иванова Мария",
					relationshipType: "parent",
					isLegalGuardian: true,
					canSignConsent: true,
				},
			]);
			assert.equal(represented.requiresGuardianForConsent, true);
			assert.equal(represented.hasValidGuardian, true);
			assert.equal(represented.guardianPatientId, "55555555-5555-5555-5555-555555555555");

			// 16-year old teenager -> can sign independently
			const teenager = validateGuardianForMinor(16, []);
			assert.equal(teenager.requiresGuardianForConsent, false);
			assert.equal(teenager.hasValidGuardian, true);
		});

		it("calculates combined family deposit and individual balances", () => {
			const family = {
				id: "66666666-6666-6666-6666-666666666666",
				clinicId: "11111111-1111-1111-1111-111111111111",
				familyName: "Семья Ивановых",
				headPatientId: "77777777-7777-7777-7777-777777777777",
				sharedDepositBalanceKopecks: 500000, // 5,000 руб
				notes: null,
				members: [
					{
						patientId: "77777777-7777-7777-7777-777777777777",
						fullName: "Иванов Иван",
						relationshipToHead: "spouse" as const,
						balanceKopecks: 120000, // 1,200 руб
						isHeadOfFamily: true,
						isMinor: false,
						canUseSharedDeposit: true,
					},
					{
						patientId: "88888888-8888-8888-8888-888888888888",
						fullName: "Иванова Мария",
						relationshipToHead: "spouse" as const,
						balanceKopecks: 80000, // 800 руб
						isHeadOfFamily: false,
						isMinor: false,
						canUseSharedDeposit: true,
					},
					{
						patientId: "99999999-9999-9999-9999-999999999999",
						fullName: "Иванов Алексей (Сын)",
						relationshipToHead: "child" as const,
						balanceKopecks: 0,
						isHeadOfFamily: false,
						isMinor: true,
						canUseSharedDeposit: true,
					},
				],
			};

			const totals = calculateCombinedFamilyBalance(family);
			assert.equal(totals.individualTotalKopecks, 200000);
			assert.equal(totals.sharedDepositKopecks, 500000);
			assert.equal(totals.grandTotalKopecks, 700000); // 7,000 руб
		});

		it("validates patient relationship Zod schema", () => {
			const validRel = {
				id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
				clinicId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				relatedPatientId: "33333333-3333-3333-3333-333333333333",
				relationshipType: "parent",
				isLegalGuardian: true,
				canShareBalance: true,
				canSignConsent: true,
				notes: "Мать ребенка",
			};

			const parsed = patientRelationshipSchema.parse(validRel);
			assert.equal(parsed.relationshipType, "parent");
			assert.equal(parsed.isLegalGuardian, true);
		});
	});
});

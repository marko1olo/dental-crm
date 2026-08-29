import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	buildMultiOptionTreatmentPlan,
	calculateSingleTierEstimate,
	classifyProcedureStage,
	isProcedureHighCostCode02,
	splitLaborAndMaterials,
	calculateTierInstallments,
	calculateTierNdflDeduction,
	buildTreatmentPlanAppendix1Data,
	renderTreatmentPlanContractAppendix1Html,
	normalizeTreatmentPlanItem,
	planTierKeySchema,
	planStageKindSchema,
	planItemStatusSchema,
	PLAN_STAGE_METADATA,
	PLAN_TIER_CONFIGS,
	DEFAULT_CLINIC_LEGAL_REQUISITES,
	type TreatmentPlanItemInput,
	type PlanTierKey,
	type PlanStageKind,
} from "../treatment-plans/treatmentPlanEngine.js";
import { isValidToothFdi } from "../radiology/hotFolderSyncEngine.js";

describe("Wave 19: Multi-Option Treatment Plan & Phased Clinical Estimate Engine (treatmentPlanEngine.ts)", () => {
	const samplePatient = {
		patientId: "pat_770142_ivanov",
		patientFullName: "Иванов Иван Иванович",
		patientBirthDate: "15.04.1988",
		patientPhone: "+7 (926) 555-12-34",
		patientPassport: "45 10 123456 выдан ОВД Тверского р-на г. Москвы",
		doctorFullName: "Смирнова Елена Александровна",
		doctorSpecialty: "Врач-стоматолог-ортопед, хирург",
		clinicalDiagnosisRu: "K02.1 Кариес дентина зуба 16, K04.0 Пульпит зуба 26, K08.1 Вторичная адентия зуба 46",
	};

	// ─────────────────────────────────────────────────────────────────────────
	// 1. ZOD SCHEMAS & METADATA PRESETS
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Zod Schemas & Clinical Stage Metadata", () => {
		it("1.1 validates PlanTierKey and PlanStageKind enum schemas", () => {
			assert.strictEqual(planTierKeySchema.parse("economy"), "economy");
			assert.strictEqual(planTierKeySchema.parse("optimum"), "optimum");
			assert.strictEqual(planTierKeySchema.parse("premium"), "premium");
			assert.throws(() => planTierKeySchema.parse("ultra_cheap"));

			assert.strictEqual(planStageKindSchema.parse("stage_1_therapy"), "stage_1_therapy");
			assert.strictEqual(planStageKindSchema.parse("stage_2_surgery"), "stage_2_surgery");
			assert.strictEqual(planStageKindSchema.parse("stage_3_orthopedics"), "stage_3_orthopedics");
			assert.throws(() => planStageKindSchema.parse("stage_4_unknown"));

			assert.strictEqual(planItemStatusSchema.parse("planned"), "planned");
			assert.strictEqual(planItemStatusSchema.parse("completed"), "completed");
			assert.throws(() => planItemStatusSchema.parse("in_limbo"));
		});

		it("1.2 verifies statutory metadata for all 3 clinical stages", () => {
			const s1 = PLAN_STAGE_METADATA.stage_1_therapy;
			assert.strictEqual(s1.stageNumber, 1);
			assert.ok(s1.titleRu.includes("Этап 1"));
			assert.ok(s1.defaultOrder804nPrefixes.includes("A16.07.002"));

			const s2 = PLAN_STAGE_METADATA.stage_2_surgery;
			assert.strictEqual(s2.stageNumber, 2);
			assert.ok(s2.titleRu.includes("Этап 2"));
			assert.ok(s2.defaultOrder804nPrefixes.includes("A16.07.054"));

			const s3 = PLAN_STAGE_METADATA.stage_3_orthopedics;
			assert.strictEqual(s3.stageNumber, 3);
			assert.ok(s3.titleRu.includes("Этап 3"));
			assert.ok(s3.defaultOrder804nPrefixes.includes("A16.07.004"));
		});

		it("1.3 verifies tier configurations and default parameters", () => {
			assert.strictEqual(PLAN_TIER_CONFIGS.economy.warrantyYears, 1);
			assert.strictEqual(PLAN_TIER_CONFIGS.economy.isRecommended, false);

			assert.strictEqual(PLAN_TIER_CONFIGS.optimum.warrantyYears, 3);
			assert.strictEqual(PLAN_TIER_CONFIGS.optimum.isRecommended, true);

			assert.ok(String(PLAN_TIER_CONFIGS.premium.warrantyYears).includes("10"));
			assert.strictEqual(PLAN_TIER_CONFIGS.premium.isRecommended, false);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. ANATOMICAL FDI & ORDER 804N STAGE CLASSIFICATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. FDI Tooth Notation & Order 804n Classification", () => {
		it("2.1 accurately validates permanent (11–48) and primary (51–85) FDI tooth numbers", () => {
			// Permanent teeth
			assert.strictEqual(isValidToothFdi(11), true);
			assert.strictEqual(isValidToothFdi(18), true);
			assert.strictEqual(isValidToothFdi(26), true);
			assert.strictEqual(isValidToothFdi(36), true);
			assert.strictEqual(isValidToothFdi(48), true);

			// Deciduous teeth
			assert.strictEqual(isValidToothFdi(51), true);
			assert.strictEqual(isValidToothFdi(55), true);
			assert.strictEqual(isValidToothFdi(64), true);
			assert.strictEqual(isValidToothFdi(75), true);
			assert.strictEqual(isValidToothFdi(85), true);

			// Invalid teeth
			assert.strictEqual(isValidToothFdi(19), false);
			assert.strictEqual(isValidToothFdi(29), false);
			assert.strictEqual(isValidToothFdi(56), false);
			assert.strictEqual(isValidToothFdi(99), false);
			assert.strictEqual(isValidToothFdi(0), false);
			assert.strictEqual(isValidToothFdi(-11), false);
			assert.strictEqual(isValidToothFdi(11.5), false);
		});

		it("2.2 classifies Order 804n medical procedures into accurate 3-stage clinical progression", () => {
			// Stage 1: Therapy & Sanitation
			assert.strictEqual(classifyProcedureStage("A16.07.002.001", "Терапия"), "stage_1_therapy");
			assert.strictEqual(classifyProcedureStage("A16.07.008.003", "Эндодонтия"), "stage_1_therapy");
			assert.strictEqual(classifyProcedureStage("A16.07.050", "Гигиена"), "stage_1_therapy");
			assert.strictEqual(classifyProcedureStage("A16.07.051", "Пародонтология"), "stage_1_therapy");
			assert.strictEqual(classifyProcedureStage("A11.07.012", "Анестезия"), "stage_1_therapy");

			// Stage 2: Surgery & Implantation
			assert.strictEqual(classifyProcedureStage("A16.07.001.002", "Хирургия"), "stage_2_surgery");
			assert.strictEqual(classifyProcedureStage("A16.07.054.001", "Имплантация"), "stage_2_surgery");
			assert.strictEqual(classifyProcedureStage("A16.07.041.001", "Костная пластика"), "stage_2_surgery");
			assert.strictEqual(classifyProcedureStage("A16.07.093", "Хирургический шаблон"), "stage_2_surgery");

			// Stage 3: Orthopedics & Prosthetics
			assert.strictEqual(classifyProcedureStage("A16.07.004.001", "Ортопедия"), "stage_3_orthopedics");
			assert.strictEqual(classifyProcedureStage("A16.07.004.002", "Ортопедия"), "stage_3_orthopedics");
			assert.strictEqual(classifyProcedureStage("A16.07.006.001", "Протезирование"), "stage_3_orthopedics");
			assert.strictEqual(classifyProcedureStage("A16.07.003.001", "Виниры"), "stage_3_orthopedics");
			assert.strictEqual(classifyProcedureStage("A16.07.036", "Бюгель"), "stage_3_orthopedics");
		});

		it("2.3 identifies expensive medical procedures (Code 02 per Decree No. 458)", () => {
			// Implantation, bone graft, sinus lift, complex surgery are Code 02
			assert.strictEqual(isProcedureHighCostCode02("A16.07.054.001", "Внутрикостная дентальная имплантация", "Хирургия"), true);
			assert.strictEqual(isProcedureHighCostCode02("A16.07.041.001", "Костная пластика альвеолярного отростка", "Хирургия"), true);
			assert.strictEqual(isProcedureHighCostCode02("A16.07.041.002", "Синус-лифтинг открытый", "Хирургия"), true);

			// Standard therapy / fillings / hygiene are Code 01
			assert.strictEqual(isProcedureHighCostCode02("A16.07.002.001", "Лечение кариеса пломбой", "Терапия"), false);
			assert.strictEqual(isProcedureHighCostCode02("A16.07.050", "Профессиональная гигиена", "Гигиена"), false);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. INTEGER KOPECKS ARITHMETIC & WORK/MATERIALS DECOMPOSITION
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Integer Kopecks Arithmetic & Work/Materials Decomposition", () => {
		it("3.1 splits net cost into labor and materials without fractional penny loss", () => {
			const netCostKopecks = 1500055; // 15,000.55 ₽ (odd penny)
			const splitEconomy = splitLaborAndMaterials(netCostKopecks, "economy");
			assert.strictEqual(splitEconomy.laborKopecks + splitEconomy.materialsKopecks, netCostKopecks);
			assert.strictEqual(Number.isInteger(splitEconomy.laborKopecks), true);
			assert.strictEqual(Number.isInteger(splitEconomy.materialsKopecks), true);

			const splitOptimum = splitLaborAndMaterials(netCostKopecks, "optimum");
			assert.strictEqual(splitOptimum.laborKopecks + splitOptimum.materialsKopecks, netCostKopecks);

			const splitPremium = splitLaborAndMaterials(netCostKopecks, "premium");
			assert.strictEqual(splitPremium.laborKopecks + splitPremium.materialsKopecks, netCostKopecks);
		});

		it("3.2 honors explicit labor and material amounts when mathematically exact", () => {
			const netCostKopecks = 1000000;
			const explicitLabor = 700000;
			const explicitMaterials = 300000;

			const split = splitLaborAndMaterials(netCostKopecks, "optimum", explicitLabor, explicitMaterials);
			assert.strictEqual(split.laborKopecks, explicitLabor);
			assert.strictEqual(split.materialsKopecks, explicitMaterials);
		});

		it("3.3 calculates 0% installments with penny-exact split across 3, 6, 12, 24 months", () => {
			const totalCostKopecks = 10000001; // 100,000.01 ₽
			const installments = calculateTierInstallments(totalCostKopecks);

			// 3 months
			const sum3 = installments[3].partsKopecks.reduce((a, b) => a + b, 0);
			assert.strictEqual(sum3, totalCostKopecks);
			assert.strictEqual(installments[3].partsKopecks.length, 3);

			// 6 months
			const sum6 = installments[6].partsKopecks.reduce((a, b) => a + b, 0);
			assert.strictEqual(sum6, totalCostKopecks);

			// 12 months
			const sum12 = installments[12].partsKopecks.reduce((a, b) => a + b, 0);
			assert.strictEqual(sum12, totalCostKopecks);

			// 24 months
			const sum24 = installments[24].partsKopecks.reduce((a, b) => a + b, 0);
			assert.strictEqual(sum24, totalCostKopecks);
		});

		it("3.4 computes NDFL 13% tax refund with statutory 150 000 ₽ cap on Code 01 and unlimited Code 02", () => {
			const sampleItems = [
				{
					id: "1",
					toothNumber: 16,
					surfaces: [],
					code804n: "A16.07.002.001",
					nameRu: "Пломбирование зуба",
					categoryRu: "Терапия",
					stageKind: "stage_1_therapy" as PlanStageKind,
					stageNumber: 1 as const,
					tierKey: "optimum" as PlanTierKey,
					unitPriceKopecks: 20000000, // 200,000 ₽ (exceeds 150,000 limit)
					quantity: 1,
					grossCostKopecks: 20000000,
					discountKopecks: 0,
					netCostKopecks: 20000000,
					laborKopecks: 12000000,
					materialsKopecks: 8000000,
					totalCostKopecks: 20000000,
					materialNameRu: "Filtek",
					clinicalRationaleRu: "",
					isHighCostCode02: false, // Code 01
					status: "planned" as const,
				},
				{
					id: "2",
					toothNumber: 46,
					surfaces: [],
					code804n: "A16.07.054.001",
					nameRu: "Дентальная имплантация",
					categoryRu: "Хирургия",
					stageKind: "stage_2_surgery" as PlanStageKind,
					stageNumber: 2 as const,
					tierKey: "optimum" as PlanTierKey,
					unitPriceKopecks: 30000000, // 300,000 ₽
					quantity: 1,
					grossCostKopecks: 30000000,
					discountKopecks: 0,
					netCostKopecks: 30000000,
					laborKopecks: 18000000,
					materialsKopecks: 12000000,
					totalCostKopecks: 30000000,
					materialNameRu: "Straumann",
					clinicalRationaleRu: "",
					isHighCostCode02: true, // Code 02 (unlimited)
					status: "planned" as const,
				},
			];

			const ndfl = calculateTierNdflDeduction(sampleItems);

			// Code 01 capped at 150,000 ₽ (15,000,000 kopecks)
			assert.strictEqual(ndfl.standardCode01BaseKopecks, 20000000);
			assert.strictEqual(ndfl.standardCode01CappedKopecks, 15000000);

			// Code 02 full 300,000 ₽ (30,000,000 kopecks)
			assert.strictEqual(ndfl.expensiveCode02BaseKopecks, 30000000);

			// Total eligible base = 150,000 + 300,000 = 450,000 ₽ (45,000,000 kopecks)
			assert.strictEqual(ndfl.totalEligibleBaseKopecks, 45000000);

			// 13% of 450,000 = 58,500 ₽ (5,850,000 kopecks)
			assert.strictEqual(ndfl.refundKopecks, 5850000);
			assert.strictEqual(ndfl.netCostAfterNdflKopecks, 50000000 - 5850000);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. MULTI-TIER PARALLEL ESTIMATE GENERATION (ECONOMY, OPTIMUM, PREMIUM)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Multi-Option Parallel Tier Engine (Economy, Optimum, Premium)", () => {
		const clinicalCaseItems: TreatmentPlanItemInput[] = [
			// Stage 1: Therapy
			{
				toothNumber: 16,
				surfaces: ["M", "O"],
				code804n: "A16.07.002.001",
				nameRu: "Восстановление зуба пломбой (кариес эмали и дентина)",
				categoryRu: "Терапия",
				stageKind: "stage_1_therapy",
				unitPriceKopecks: 650000, // 6,500 ₽
				quantity: 1,
				materialNameRu: "Нанокомпозит Filtek Ultimate",
			},
			{
				toothNumber: 26,
				code804n: "A16.07.008.003",
				nameRu: "Пломбирование корневых каналов трехканального зуба",
				categoryRu: "Эндодонтия",
				stageKind: "stage_1_therapy",
				unitPriceKopecks: 1450000, // 14,500 ₽
				quantity: 1,
				materialNameRu: "Гуттаперча + биокерамический силлер",
			},
			{
				code804n: "A16.07.050",
				nameRu: "Профессиональная гигиена полости рта и зубов (Air-Flow, ультразвук)",
				categoryRu: "Гигиена",
				stageKind: "stage_1_therapy",
				unitPriceKopecks: 500000, // 5,000 ₽
				quantity: 1,
			},
			// Stage 2: Surgery
			{
				toothNumber: 46,
				code804n: "A16.07.054.001",
				nameRu: "Внутрикостная дентальная имплантация",
				categoryRu: "Хирургия",
				stageKind: "stage_2_surgery",
				unitPriceKopecks: 4500000, // 45,000 ₽
				quantity: 1,
				materialNameRu: "Дентальный имплантат Straumann",
				isHighCostCode02: true,
			},
			{
				code804n: "A16.07.041.002",
				nameRu: "Синус-лифтинг закрытый",
				categoryRu: "Хирургия",
				stageKind: "stage_2_surgery",
				unitPriceKopecks: 2500000, // 25,000 ₽
				quantity: 1,
				materialNameRu: "Остеопластический материал Bio-Oss",
				isHighCostCode02: true,
			},
			// Stage 3: Orthopedics
			{
				toothNumber: 26,
				code804n: "A16.07.004.002",
				nameRu: "Восстановление зуба коронкой безметалловой (цельная керамика E.max)",
				categoryRu: "Ортопедия",
				stageKind: "stage_3_orthopedics",
				unitPriceKopecks: 3500000, // 35,000 ₽
				quantity: 1,
				materialNameRu: "Керамика IPS e.max CAD",
			},
			{
				toothNumber: 46,
				code804n: "A16.07.006.001",
				nameRu: "Протезирование зуба с использованием имплантата коронкой из диоксида циркония",
				categoryRu: "Ортопедия",
				stageKind: "stage_3_orthopedics",
				unitPriceKopecks: 4500000, // 45,000 ₽
				quantity: 1,
				materialNameRu: "Диоксид циркония Katana на винтовой фиксации",
			},
		];

		it("4.1 builds 3 parallel tiers (Economy, Optimum, Premium) with strict penny balancing", () => {
			const plan = buildMultiOptionTreatmentPlan({
				...samplePatient,
				items: clinicalCaseItems,
			});

			assert.strictEqual(plan.isPennyExact, true);
			assert.strictEqual(plan.availableTierKeys.length, 3);
			assert.deepStrictEqual(plan.availableTierKeys, ["economy", "optimum", "premium"]);

			// Verify each tier
			for (const tierKey of plan.availableTierKeys) {
				const tier = plan.tiers[tierKey];
				assert.strictEqual(tier.isPennyExact, true);
				assert.strictEqual(tier.stages.length, 3);
				assert.strictEqual(tier.totalItemsCount, 7);

				// Verify Stage numbers and sequence
				assert.strictEqual(tier.stages[0]!.stageNumber, 1);
				assert.strictEqual(tier.stages[0]!.stageKind, "stage_1_therapy");
				assert.strictEqual(tier.stages[1]!.stageNumber, 2);
				assert.strictEqual(tier.stages[1]!.stageKind, "stage_2_surgery");
				assert.strictEqual(tier.stages[2]!.stageNumber, 3);
				assert.strictEqual(tier.stages[2]!.stageKind, "stage_3_orthopedics");

				// Verify penny balance: labor + materials === totalCostKopecks
				assert.strictEqual(tier.laborKopecks + tier.materialsKopecks, tier.totalCostKopecks);
				assert.strictEqual(
					tier.stages.reduce((acc, s) => acc + s.stageCostKopecks, 0),
					tier.totalCostKopecks,
				);
			}

			// Optimum is marked recommended
			assert.strictEqual(plan.tiers.optimum.isRecommended, true);
			assert.strictEqual(plan.tiers.economy.isRecommended, false);
			assert.strictEqual(plan.tiers.premium.isRecommended, false);
		});

		it("4.2 calculates accurate stage subtotals, item counts, and tooth mappings", () => {
			const plan = buildMultiOptionTreatmentPlan({
				...samplePatient,
				items: clinicalCaseItems,
			});

			const optimum = plan.tiers.optimum;
			const stage1 = optimum.stages[0]!;
			const stage2 = optimum.stages[1]!;
			const stage3 = optimum.stages[2]!;

			// Stage 1: Therapy (3 items: tooth 16, tooth 26, hygiene)
			assert.strictEqual(stage1.itemCount, 3);
			assert.deepStrictEqual(stage1.treatedTeeth, [16, 26]);
			assert.strictEqual(stage1.stageCostKopecks, 650000 + 1450000 + 500000); // 2,600,000 kopecks (26,000 ₽)

			// Stage 2: Surgery (2 items: tooth 46 implant, sinus-lift)
			assert.strictEqual(stage2.itemCount, 2);
			assert.deepStrictEqual(stage2.treatedTeeth, [46]);
			assert.strictEqual(stage2.stageCostKopecks, 4500000 + 2500000); // 7,000,000 kopecks (70,000 ₽)

			// Stage 3: Orthopedics (2 items: tooth 26 crown, tooth 46 crown)
			assert.strictEqual(stage3.itemCount, 2);
			assert.deepStrictEqual(stage3.treatedTeeth, [26, 46]);
			assert.strictEqual(stage3.stageCostKopecks, 3500000 + 4500000); // 8,000,000 kopecks (80,000 ₽)

			// Total plan cost = 26,000 + 70,000 + 80,000 = 176,000 ₽ (17,600,000 kopecks)
			assert.strictEqual(optimum.totalCostKopecks, 17600000);
		});

		it("4.3 applies global discount accurately across all items and stages", () => {
			const planWithDiscount = buildMultiOptionTreatmentPlan({
				...samplePatient,
				items: clinicalCaseItems,
				globalDiscountPercent: 10, // 10% discount
			});

			const optimum = planWithDiscount.tiers.optimum;
			const expectedGross = 17600000;
			const expectedDiscount = 1760000; // 10% of 17,600,000
			const expectedNet = 15840000;

			assert.strictEqual(optimum.grossCostKopecks, expectedGross);
			assert.strictEqual(optimum.discountKopecks, expectedDiscount);
			assert.strictEqual(optimum.totalCostKopecks, expectedNet);
			assert.strictEqual(optimum.isPennyExact, true);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. STATUTORY DOCUMENT GENERATION: DECREE NO. 736 APPENDIX 1
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Decree No. 736 Appendix 1 Contract & Estimate Generator", () => {
		it("5.1 builds structured Appendix 1 document payload with full legal requisites", () => {
			const plan = buildMultiOptionTreatmentPlan({
				...samplePatient,
				items: [
					{
						toothNumber: 16,
						code804n: "A16.07.002.001",
						nameRu: "Лечение кариеса",
						categoryRu: "Терапия",
						stageKind: "stage_1_therapy",
						unitPriceKopecks: 550000,
						quantity: 1,
					},
					{
						toothNumber: 46,
						code804n: "A16.07.054.001",
						nameRu: "Дентальная имплантация",
						categoryRu: "Хирургия",
						stageKind: "stage_2_surgery",
						unitPriceKopecks: 4000000,
						quantity: 1,
					},
				],
			});

			const docData = buildTreatmentPlanAppendix1Data(plan, "optimum");

			assert.ok(docData.planNumber.includes("ПЛ-"));
			assert.ok(docData.contractNumber.includes("ДОГ-"));
			assert.strictEqual(docData.patientFullName, "Иванов Иван Иванович");
			assert.strictEqual(docData.doctorFullName, "Смирнова Елена Александровна");
			assert.strictEqual(docData.clinicInn, "7707441122");
			assert.strictEqual(docData.clinicOgrn, "1217700554433");
			assert.ok(docData.clinicLicense.includes("ЛО41-01137-77/00368421"));
			assert.strictEqual(docData.totalCostKopecks, 4550000);
			assert.ok(docData.totalCostInWordsRu.includes("руб"));
			assert.strictEqual(docData.termsAndConditionsAccepted, true);
		});

		it("5.2 renders valid, complete HTML printable document matching Decree No. 736 specifications", () => {
			const plan = buildMultiOptionTreatmentPlan({
				...samplePatient,
				items: [
					{
						toothNumber: 16,
						code804n: "A16.07.002.001",
						nameRu: "Восстановление зуба светоотверждаемым композитом",
						categoryRu: "Терапия",
						stageKind: "stage_1_therapy",
						unitPriceKopecks: 600000,
						quantity: 1,
						materialNameRu: "Filtek Ultimate",
					},
					{
						toothNumber: 36,
						code804n: "A16.07.001.002",
						nameRu: "Сложное удаление зуба с разъединением корней",
						categoryRu: "Хирургия",
						stageKind: "stage_2_surgery",
						unitPriceKopecks: 450000,
						quantity: 1,
					},
					{
						toothNumber: 16,
						code804n: "A16.07.004.002",
						nameRu: "Восстановление зуба коронкой цельнокерамической E.max",
						categoryRu: "Ортопедия",
						stageKind: "stage_3_orthopedics",
						unitPriceKopecks: 3200000,
						quantity: 1,
						materialNameRu: "IPS e.max CAD",
					},
				],
			});

			const docData = buildTreatmentPlanAppendix1Data(plan, "optimum");
			const html = renderTreatmentPlanContractAppendix1Html(docData);

			// Assertions on statutory contents of Decree No. 736
			assert.ok(html.includes("ПРЕДВАРИТЕЛЬНЫЙ ПЛАН ЛЕЧЕНИЯ И СМЕТА РАСХОДОВ"));
			assert.ok(html.includes("Постановлением Правительства РФ от 11.05.2023 № 736"));
			assert.ok(html.includes("Приказа МЗ РФ № 804н"));
			assert.ok(html.includes("A16.07.002.001"));
			assert.ok(html.includes("A16.07.001.002"));
			assert.ok(html.includes("A16.07.004.002"));
			assert.ok(html.includes("Зуб 16"));
			assert.ok(html.includes("Зуб 36"));
			assert.ok(html.includes("Иванов Иван Иванович"));
			assert.ok(html.includes("Смирнова Елена Александровна"));
			assert.ok(html.includes("ИСПОЛНИТЕЛЬ:"));
			assert.ok(html.includes("ПАЦИЕНТ (ПОТРЕБИТЕЛЬ):"));
			assert.ok(html.includes("подпись, личная печать врача"));
			assert.ok(html.includes("личная подпись Пациента"));
			assert.ok(html.includes("Сумма прописью:"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. EDGE CASES & PARANOIA AUDIT
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Edge Cases & Resilience", () => {
		it("6.1 handles empty items list gracefully", () => {
			const plan = buildMultiOptionTreatmentPlan({
				...samplePatient,
				items: [],
			});

			assert.strictEqual(plan.isPennyExact, true);
			assert.strictEqual(plan.tiers.optimum.totalCostKopecks, 0);
			assert.strictEqual(plan.tiers.optimum.totalItemsCount, 0);
			assert.strictEqual(plan.tiers.optimum.installments[12].monthlyPaymentKopecks, 0);

			const docData = buildTreatmentPlanAppendix1Data(plan);
			const html = renderTreatmentPlanContractAppendix1Html(docData);
			assert.ok(html.includes("ПРЕДВАРИТЕЛЬНЫЙ ПЛАН ЛЕЧЕНИЯ"));
		});

		it("6.2 handles 100% discount without negative or NaN artifacts", () => {
			const plan = buildMultiOptionTreatmentPlan({
				...samplePatient,
				globalDiscountPercent: 100,
				items: [
					{
						toothNumber: 11,
						code804n: "A16.07.002.001",
						nameRu: "Реставрация резца",
						categoryRu: "Терапия",
						stageKind: "stage_1_therapy",
						unitPriceKopecks: 1000000,
						quantity: 1,
					},
				],
			});

			const optimum = plan.tiers.optimum;
			assert.strictEqual(optimum.grossCostKopecks, 1000000);
			assert.strictEqual(optimum.discountKopecks, 1000000);
			assert.strictEqual(optimum.totalCostKopecks, 0);
			assert.strictEqual(optimum.laborKopecks, 0);
			assert.strictEqual(optimum.materialsKopecks, 0);
			assert.strictEqual(optimum.isPennyExact, true);
		});

		it("6.3 handles tier-specific procedure items correctly", () => {
			const items: TreatmentPlanItemInput[] = [
				// Standard item for all tiers
				{
					toothNumber: 16,
					code804n: "A16.07.002.001",
					nameRu: "Лечение кариеса",
					categoryRu: "Терапия",
					stageKind: "stage_1_therapy",
					unitPriceKopecks: 500000,
				},
				// Economy specific item (Metal-ceramic crown)
				{
					toothNumber: 16,
					code804n: "A16.07.004.001",
					nameRu: "Коронка металлокерамическая",
					categoryRu: "Ортопедия",
					stageKind: "stage_3_orthopedics",
					tierKey: "economy",
					unitPriceKopecks: 1500000,
				},
				// Optimum specific item (E.max crown)
				{
					toothNumber: 16,
					code804n: "A16.07.004.002",
					nameRu: "Коронка E.max",
					categoryRu: "Ортопедия",
					stageKind: "stage_3_orthopedics",
					tierKey: "optimum",
					unitPriceKopecks: 3000000,
				},
				// Premium specific item (Zirconia Katana crown)
				{
					toothNumber: 16,
					code804n: "A16.07.004.002",
					nameRu: "Коронка Katana Multi-Layer",
					categoryRu: "Ортопедия",
					stageKind: "stage_3_orthopedics",
					tierKey: "premium",
					unitPriceKopecks: 5000000,
				},
			];

			const plan = buildMultiOptionTreatmentPlan({
				...samplePatient,
				items,
			});

			assert.strictEqual(plan.tiers.economy.totalItemsCount, 2);
			assert.strictEqual(plan.tiers.economy.totalCostKopecks, 2000000); // 5,000 + 15,000 = 20,000 ₽

			assert.strictEqual(plan.tiers.optimum.totalItemsCount, 2);
			assert.strictEqual(plan.tiers.optimum.totalCostKopecks, 3500000); // 5,000 + 30,000 = 35,000 ₽

			assert.strictEqual(plan.tiers.premium.totalItemsCount, 2);
			assert.strictEqual(plan.tiers.premium.totalCostKopecks, 5500000); // 5,000 + 50,000 = 55,000 ₽
		});

		it("6.4 normalizes invalid tooth numbers to null and preserves surfaces", () => {
			const item = normalizeTreatmentPlanItem(
				{
					toothNumber: 99, // invalid FDI tooth
					surfaces: ["M", "O", "D"],
					code804n: "A16.07.002.001",
					nameRu: "Реставрация",
					categoryRu: "Терапия",
					stageKind: "stage_1_therapy",
					unitPriceKopecks: 500000,
					quantity: 2,
					discountKopecks: 100000,
				},
				"optimum",
				0,
			);

			assert.strictEqual(item.toothNumber, null);
			assert.deepStrictEqual(item.surfaces, ["M", "O", "D"]);
			assert.strictEqual(item.grossCostKopecks, 1000000);
			assert.strictEqual(item.discountKopecks, 100000);
			assert.strictEqual(item.totalCostKopecks, 900000);
		});

		it("6.5 supports custom clinic requisites in multi-option plan and appendix 1", () => {
			const customClinic = {
				clinicFullName: "ООО «Стоматологический Центр Прогресс»",
				clinicBrandName: "Прогресс Дент",
				clinicAddress: "г. Санкт-Петербург, Невский пр-т, д. 45",
				clinicInn: "7801998877",
				clinicOgrn: "1207800112233",
				medicalLicenseNumber: "ЛО41-01138-78/00998877",
			};

			const plan = buildMultiOptionTreatmentPlan({
				...samplePatient,
				clinicRequisites: customClinic,
				items: [],
			});

			assert.strictEqual(plan.clinicRequisites.clinicFullName, customClinic.clinicFullName);
			assert.strictEqual(plan.clinicRequisites.clinicInn, customClinic.clinicInn);
			assert.strictEqual(plan.clinicRequisites.clinicOgrn, customClinic.clinicOgrn);

			const doc = buildTreatmentPlanAppendix1Data(plan);
			assert.strictEqual(doc.clinicFullName, customClinic.clinicFullName);
			assert.strictEqual(doc.clinicInn, customClinic.clinicInn);
			assert.strictEqual(doc.clinicOgrn, customClinic.clinicOgrn);
		});
	});
});

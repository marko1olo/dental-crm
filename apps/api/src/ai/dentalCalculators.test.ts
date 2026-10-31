/**
 * dentalCalculators.test.ts — Модульное тестирование клинических калькуляторов и EBM-протоколов:
 * 1. Расчет анестезии 4% артикаина и мепивакаина (40 кг, 70 кг, 100 кг, кардио-риски, потолок доз).
 * 2. Скрининг соматики (пенициллины, антикоагулянты, бисфосфонаты MRONJ, гипертония, НПВС).
 * 3. Медицинская карта приёма (SOAP / протоколы лечения).
 * 4. Экстренная помощь у кресла (анафилаксия, гипохлоритная авария, облом инструмента, перфорация МТА).
 * 5. Консилиум, перевод жалоб пациента и сравнение стоматологических материалов.
 *
 * Sweet Spot 200-300 строк (Мандат 8b / 8zi).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	calculateAnesthesiaTool,
	chairsideEmergencyTool,
	checkSomaticRisksTool,
	compareDentalMaterialsTool,
	generateForm043Tool,
	handleCalculateAnesthesia,
	handleChairsideEmergency,
	handleCheckSomaticRisks,
	handleCompareDentalMaterials,
	handleGenerateForm043,
	handleMultidisciplinaryConcilium,
	handleTranslatePatientComplaint,
	multidisciplinaryConciliumTool,
	translatePatientComplaintTool,
} from "./dentalTools.js";

const TEST_ORG_ID = "11111111-1111-1111-1111-111111111111";

describe("Dental Tool Arsenal — Клинические калькуляторы и расчеты", () => {
	test("calculate_anesthesia: масса 40 кг (подросток/астеник) без кардио-рисков", async () => {
		const res = await handleCalculateAnesthesia(
			{
				patientWeightKg: 40,
				anestheticType: "auto",
				hasCardiovascularRisk: false,
				plannedCarpules: 1,
			},
			{ organizationId: TEST_ORG_ID },
		);

		// 40 кг * 7.0 мг/кг = 280 мг. В 1 карпуле 68 мг -> 280 / 68 = 4 карпулы
		assert.strictEqual(res.maxDoseMg, 280);
		assert.strictEqual(res.maxCarpulesByAnesthetic, 4);
		assert.strictEqual(res.absoluteMaxCarpules, 4);
		assert.strictEqual(res.recommendedCarpules, 1);
		assert.strictEqual(res.isCardiovascularRisk, false);
		assert.strictEqual(res.safeToProceed, true);
	});

	test("calculate_anesthesia: масса 70 кг (стандартный взрослый)", async () => {
		const res = await handleCalculateAnesthesia(
			{
				patientWeightKg: 70,
				anestheticType: "articaine_1_100000",
				hasCardiovascularRisk: false,
				plannedCarpules: 2,
			},
			{ organizationId: TEST_ORG_ID },
		);

		// 70 кг * 7.0 мг/кг = 490 мг. В карпуле 68 мг -> 490 / 68 = 7 карпул
		assert.strictEqual(res.maxDoseMg, 490);
		assert.strictEqual(res.absoluteMaxCarpules, 7);
		assert.strictEqual(res.recommendedCarpules, 2);
		assert.strictEqual(res.totalEpinephrineMcg, 34); // 2 карпулы по 17 мкг
		assert.strictEqual(res.maxSafeEpinephrineMcg, 200);
	});

	test("calculate_anesthesia: масса 100 кг упирается в абсолютный потолок 500 мг", async () => {
		const res = await handleCalculateAnesthesia(
			{
				patientWeightKg: 100,
				anestheticType: "articaine_1_200000",
				hasCardiovascularRisk: false,
				plannedCarpules: 3,
			},
			{ organizationId: TEST_ORG_ID },
		);

		// 100 кг * 7 = 700 мг, но абсолютный потолок взрослого = 500 мг! 500 / 68 = 7 карпул
		assert.strictEqual(res.maxDoseMg, 500);
		assert.strictEqual(res.absoluteMaxCarpules, 7);
		assert.strictEqual(res.concentrationPercent, 4);
		assert.strictEqual(res.epinephrineMcgPerCarpule, 8.5);
	});

	test("calculate_anesthesia: пациент с кардио-рисками (лимит адреналина 0.04 мг / автопереключение)", async () => {
		// Автовыбор для кардио-пациента должен переключить на мепивакаин без адреналина
		const autoRes = await handleCalculateAnesthesia(
			{
				patientWeightKg: 70,
				anestheticType: "auto",
				hasCardiovascularRisk: true,
			},
			{ organizationId: TEST_ORG_ID },
		);
		assert.strictEqual(autoRes.drugName, "Мепивакаин 3% без вазоконстриктора");
		assert.strictEqual(autoRes.epinephrineMcgPerCarpule, 0);

		// Ручной выбор 1:100 000 для кардио-пациента должен выдать строгое предостережение и лимит адреналина
		const warnRes = await handleCalculateAnesthesia(
			{
				patientWeightKg: 70,
				anestheticType: "articaine_1_100000",
				hasCardiovascularRisk: true,
				plannedCarpules: 4,
			},
			{ organizationId: TEST_ORG_ID },
		);
		assert.strictEqual(warnRes.maxSafeEpinephrineMcg, 40); // 0.04 мг
		// Лимит по адреналину: 40 мкг / 17 мкг = 2 карпулы!
		assert.strictEqual(warnRes.maxCarpulesByEpinephrine, 2);
		assert.strictEqual(warnRes.absoluteMaxCarpules, 2);
		assert.ok(warnRes.warnings.length > 0);
		assert.ok(warnRes.warnings.some((w) => w.includes("сердечно-сосудистой")));
	});

	test("check_somatic_risks: антикоагулянты (варфарин/ксарелто) при экстракции", async () => {
		const res = await handleCheckSomaticRisks(
			{
				conditions: ["Мерцательная аритмия"],
				medications: ["Ксарелто 20 мг"],
				allergies: [],
				plannedIntervention: "tooth_extraction",
			},
			{ organizationId: TEST_ORG_ID },
		);

		assert.ok(res.highRiskFlags.some((f) => f.includes("кровотечения")));
		assert.ok(res.recommendations.some((r) => r.includes("гемостатическая губка")));
		assert.strictEqual(res.requiresConsultation, true);
	});

	test("check_somatic_risks: бисфосфонаты и критический риск остеонекроза MRONJ", async () => {
		const res = await handleCheckSomaticRisks(
			{
				conditions: ["Остеопороз"],
				medications: ["Акласта (золедроновая кислота)"],
				allergies: [],
				plannedIntervention: "implant_surgery",
			},
			{ organizationId: TEST_ORG_ID },
		);

		assert.ok(res.highRiskFlags.some((f) => f.includes("MRONJ")));
		assert.ok(res.contraindications.some((c) => c.includes("имплантация")));
		assert.strictEqual(res.safeToProceed, false);
	});

	test("check_somatic_risks: аллергия на пенициллины блокирует бета-лактамы", async () => {
		const res = await handleCheckSomaticRisks(
			{
				conditions: [],
				medications: [],
				allergies: ["Амоксиклав (крапивница в анамнезе)"],
				plannedIntervention: "routine_therapy",
			},
			{ organizationId: TEST_ORG_ID },
		);

		assert.ok(res.contraindications.some((c) => c.includes("пенициллинового")));
		assert.ok(res.recommendations.some((r) => r.includes("Клиндамицин")));
	});

	test("generate_form_043_entry: протокол лечения кариеса K02.1 для зуба 16", async () => {
		const res = await handleGenerateForm043(
			{
				toothNumber: 16,
				diagnosisMkb: "K02.1",
				anestheticTradeName: "Ультракаин Д-С",
				anestheticVolumeMl: 1.7,
				anesthesiaTechnique: "infiltration",
				fillingMaterial: "Estelite Asteria A2",
				useCofferdam: true,
			},
			{ organizationId: TEST_ORG_ID },
		);

		assert.strictEqual(res.toothNumber, 16);
		assert.strictEqual(res.diagnosisMkb, "K02.1");
		assert.ok(res.complaints.includes("сладкого"));
		assert.ok(res.statusLocalis.includes("кариозная полость"));
		assert.ok(res.treatmentProtocol.includes("коффердама"));
		assert.ok(res.treatmentProtocol.includes("Estelite Asteria A2"));
		assert.ok(res.fullForm043Text.includes("Медицинская карта приёма") || res.fullForm043Text.includes("ФОРМА № 043/У"));
	});

	test("multidisciplinary_concilium: синтезирует 6 клинических этапов", async () => {
		const res = await handleMultidisciplinaryConcilium(
			{
				clinicalFindings: ["Кариес 15, 16", "Пародонтит средней степени", "Отсутствие зуба 46"],
			},
			{ organizationId: TEST_ORG_ID },
		);

		assert.strictEqual(res.totalStagesCount, 6);
		assert.ok(res.stages[0]?.stageName.includes("Неотложный"));
		assert.ok(res.stages[1]?.stageName.includes("Пародонтологический"));
		assert.ok(res.stages[2]?.stageName.includes("Терапевтическая"));
		assert.ok(res.stages[3]?.stageName.includes("Хирургический"));
		assert.ok(res.stages[4]?.stageName.includes("Ортопедический"));
		assert.ok(res.stages[5]?.stageName.includes("Диспансерный"));
	});

	test("chairside_emergency_rescue: анафилактический шок требует немедленный адреналин 0.5 мг в бедро", async () => {
		const res = await handleChairsideEmergency(
			{
				emergencyType: "anaphylactic_shock",
			},
			{ organizationId: TEST_ORG_ID },
		);

		assert.strictEqual(res.urgencyLevel, "CRITICAL_RESUSCITATION");
		assert.ok(res.immediateActions.some((a) => a.includes("БЕДРА")));
		assert.ok(res.immediateActions.some((a) => a.includes("Тренделенбурга")));
		assert.ok(res.pharmacotherapy.some((p) => p.includes("0.5 мг в/м")));
	});

	test("chairside_emergency_rescue: гипохлоритная авария", async () => {
		const res = await handleChairsideEmergency(
			{
				emergencyType: "hypochlorite_accident",
				toothNumber: 21,
			},
			{ organizationId: TEST_ORG_ID },
		);

		assert.strictEqual(res.urgencyLevel, "URGENT_CLINICAL");
		assert.ok(res.immediateActions.some((a) => a.includes("прекратить ирригацию")));
		assert.ok(res.immediateActions.some((a) => a.includes("физиологического раствора")));
		assert.ok(res.pharmacotherapy.some((p) => p.includes("Дексаметазон")));
	});

	test("chairside_emergency_rescue: облом инструмента и перфорация МТА", async () => {
		const brokenRes = await handleChairsideEmergency(
			{ emergencyType: "separated_instrument", toothNumber: 36 },
			{ organizationId: TEST_ORG_ID },
		);
		assert.ok(brokenRes.immediateActions.some((a) => a.includes("байпаса") || a.includes("Bypass")));

		const perfRes = await handleChairsideEmergency(
			{ emergencyType: "root_perforation", toothNumber: 46 },
			{ organizationId: TEST_ORG_ID },
		);
		assert.ok(perfRes.immediateActions.some((a) => a.includes("МТА") || a.includes("Biodentine")));
	});

	test("translate_patient_complaint: семантическое распознавание жалоб", async () => {
		const pulpRes = await handleTranslatePatientComplaint(
			{ complaintText: "зуб сильно ноет по ночам, от горячего спать невозможно", toothMentioned: 24 },
			{ organizationId: TEST_ORG_ID },
		);
		assert.strictEqual(pulpRes.suspectedNosologies[0]?.codeMkb, "K04.0");

		const perioRes = await handleTranslatePatientComplaint(
			{ complaintText: "больно жевать и стучать по зубу, как будто вырос", toothMentioned: 46 },
			{ organizationId: TEST_ORG_ID },
		);
		assert.strictEqual(pulpRes.suspectedNosologies[0]?.codeMkb, "K04.0");
		assert.strictEqual(perioRes.suspectedNosologies[0]?.codeMkb, "K04.5");
	});

	test("compare_dental_materials: Bulk Fill vs layering", async () => {
		const res = await handleCompareDentalMaterials(
			{ comparisonCategory: "bulk_fill_vs_layering" },
			{ organizationId: TEST_ORG_ID },
		);
		assert.ok(res.materialA.includes("Bulk Fill"));
		assert.ok(res.clinicalVerdict.includes("C-фактор"));
		assert.ok(res.comparisonTable.length > 0);
	});
});

/**
 * cbctAutoPlanIntegrationBridge.test.ts — комплексное тестирование автосоставления планов лечения по КЛКТ.
 * (Мандаты DENTE CRM: 8b <= 800 строк, 8d ноль эмодзи, 8e Doctor Autonomy / 1 клик, ACID копейки, 54-ФЗ).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { parseKopecks, sumKopecks } from "@dental/shared";
import {
	buildBoneAugmentationItems,
	buildDestructionAndProstheticsItems,
	buildImplantSurgicalPackageItems,
	extractCbctFindingsFromOdontogramAndStorage,
	generateCbctAutoPlanScenarios,
	type CbctAutoPlanFindingsInput,
	type CbctBoneDefectFinding,
	type CbctImplantFinding,
	type CbctToothDestructionFinding,
} from "../ctImplantIntegrationBridge";
import {
	CBCT_CLINICAL_BUNDLES,
	applyClinicalBundleToStages,
	applyClinicalBundleToTier,
	calculateBundlePrice,
	createBundlePlanItems,
	getAllCbctBundles,
	getCbctBundleById,
} from "../treatmentPlanBundlesEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanStage, TreatmentPlanTier } from "../types";

describe("cbctAutoPlanIntegrationBridge — автоматическая генерация планов лечения по 3D КЛКТ", () => {
	describe("1. Хирургический пакет имплантации (buildImplantSurgicalPackageItems)", () => {
		test("позиционирование виртуального имплантата на КЛКТ формирует полный хирургический комплекс", () => {
			const implantFinding: CbctImplantFinding = {
				toothFdi: 46,
				brand: "dentium",
				diameterMm: 4.5,
				lengthMm: 10.0,
				angulationDeg: 1.5,
				ridgeHeightMm: 12.8,
				ridgeWidthMm: 7.6,
				meanHU: 720,
				mischClass: "D2",
				nerveClearanceMm: 4.8,
				recommendedTorqueNcm: "35-45 Н·см",
				drillingProtocol: "Пилот 2.0 -> Сверло 3.4 -> Формирующее 4.0",
			};

			const items = buildImplantSurgicalPackageItems(implantFinding, "standard");

			// Обязан содержать ровно 4 обязательных компонента:
			// 1) A16.07.054.001 Установка дентального имплантата
			// 2) A16.07.054.002 Формирователь десны
			// 3) A11.07.012 Местная анестезия
			// 4) A16.07.097 Наложение швов Vicryl
			assert.equal(items.length, 4);

			const codes = items.map((it) => it.code804n);
			assert.ok(codes.includes("A16.07.054.001"), "Должен содержать код имплантации A16.07.054.001");
			assert.ok(codes.includes("A16.07.054.002"), "Должен содержать формирователь десны A16.07.054.002");
			assert.ok(codes.includes("A11.07.012"), "Должен содержать местную анестезию A11.07.012");
			assert.ok(codes.includes("A16.07.097"), "Должен содержать наложение швов A16.07.097");

			// Проверка привязки к зубу 46
			for (const item of items) {
				assert.equal(item.toothNumber, 46);
			}

			// Проверка клинического обоснования (плотность Misch, HU, зазор до нерва)
			const implantItem = items.find((it) => it.code804n === "A16.07.054.001")!;
			assert.ok(implantItem.clinicalRationale?.includes("D2"));
			assert.ok(implantItem.clinicalRationale?.includes("720 HU"));
			assert.ok(implantItem.clinicalRationale?.includes("4.8 мм"));
			assert.ok(implantItem.materials?.toLowerCase().includes("dentium"));
		});

		test("предупреждает в обосновании при критическом зазоре до нижнечелюстного канала (< 2.0 мм)", () => {
			const implantFinding: CbctImplantFinding = {
				toothFdi: 37,
				brand: "osstem",
				diameterMm: 4.5,
				lengthMm: 10.0,
				ridgeHeightMm: 10.5,
				ridgeWidthMm: 6.8,
				meanHU: 650,
				mischClass: "D3",
				nerveClearanceMm: 1.4, // критический зазор!
			};

			const items = buildImplantSurgicalPackageItems(implantFinding, "standard");
			const implantItem = items.find((it) => it.code804n === "A16.07.054.001")!;
			assert.ok(
				implantItem.clinicalRationale?.includes("ВНИМАНИЕ: зазор до нижнечелюстного нерва"),
				"Должно содержать предупреждение о критической близости к нерву",
			);
		});

		test("дифференцирует бренды имплантатов по сценариям (Эконом: Osstem, Оптимум: Dentium, Премиум: Straumann)", () => {
			const finding: CbctImplantFinding = { toothFdi: 15 };
			const econItems = buildImplantSurgicalPackageItems(finding, "economy");
			const optItems = buildImplantSurgicalPackageItems(finding, "standard");
			const premItems = buildImplantSurgicalPackageItems(finding, "optimum");

			const econImplant = econItems.find((it) => it.code804n === "A16.07.054.001")!;
			const optImplant = optItems.find((it) => it.code804n === "A16.07.054.001")!;
			const premImplant = premItems.find((it) => it.code804n === "A16.07.054.001")!;

			assert.ok(econImplant.name.toLowerCase().includes("osstem"));
			assert.ok(optImplant.name.toLowerCase().includes("dentium"));
			assert.ok(premImplant.name.toLowerCase().includes("straumann"));

			// Финансовая субординация цен
			assert.ok(econImplant.priceRub < optImplant.priceRub);
			assert.ok(optImplant.priceRub < premImplant.priceRub);
		});
	});

	describe("2. Остеопластика и синус-лифтинг (buildBoneAugmentationItems)", () => {
		test("закрытый синус-лифтинг формирует транскрестальный доступ и остеопластику Bio-Oss", () => {
			const defect: CbctBoneDefectFinding = {
				toothFdi: 16,
				region: "maxilla_sinus",
				defectType: "sinus_pneumatization",
				residualHeightMm: 6.2,
				recommendedAugmentation: "closed_sinus_lift",
			};

			const items = buildBoneAugmentationItems(defect, "standard");
			assert.equal(items.length, 2);

			const codes = items.map((i) => i.code804n);
			assert.ok(codes.includes("A16.07.041.002"), "Закрытый синус-лифтинг A16.07.041.002");
			assert.ok(codes.includes("A16.07.041"), "Костная пластика Bio-Oss A16.07.041");

			for (const it of items) {
				assert.equal(it.toothNumber, 16);
			}
		});

		test("открытый синус-лифтинг формирует латеральное окно + Bio-Oss + мембрану Bio-Gide + швы", () => {
			const defect: CbctBoneDefectFinding = {
				toothFdi: 26,
				region: "maxilla_sinus",
				defectType: "sinus_pneumatization",
				residualHeightMm: 3.5, // критическая атрофия < 5 мм
				recommendedAugmentation: "open_sinus_lift",
			};

			const items = buildBoneAugmentationItems(defect, "standard");
			assert.equal(items.length, 4);

			const codes = items.map((i) => i.code804n);
			assert.ok(codes.includes("A16.07.041.001"), "Открытый синус-лифтинг A16.07.041.001");
			assert.ok(codes.includes("A16.07.041"), "Костная пластика Geistlich Bio-Oss A16.07.041");
			assert.ok(codes.includes("A16.07.041.003"), "Барьерная мембрана Geistlich Bio-Gide A16.07.041.003");
			assert.ok(codes.includes("A16.07.097"), "Швы Vicryl A16.07.097");
		});
	});

	describe("3. Санация, деструкция зубов и ортопедия (buildDestructionAndProstheticsItems)", () => {
		test("несостоятельный корень / поддесневой перелом формирует удаление и консервацию лунки", () => {
			const finding: CbctToothDestructionFinding = {
				toothFdi: 36,
				destructionLevel: "subgingival_fracture_hopeless",
				isHopelessForExtraction: true,
			};

			const result = buildDestructionAndProstheticsItems(finding, "standard");
			assert.ok(result.surgeryItems.length >= 2, "Хирургический этап должен содержать удаление и консервацию лунки");

			const codes = result.surgeryItems.map((i) => i.code804n);
			assert.ok(codes.includes("A16.07.001.003"), "Сложное удаление зуба A16.07.001.003");
			assert.ok(codes.includes("A16.07.041"), "Консервация лунки остеопластиком A16.07.041");
		});

		test("периапикальный дефект / пульпит формирует машинное эндо + 3D обтурацию + билд-ап + коронку", () => {
			const finding: CbctToothDestructionFinding = {
				toothFdi: 47,
				destructionLevel: "periodontitis_periapical",
				rootCanalCount: 3,
				crownRecommendation: "zirconia",
			};

			const result = buildDestructionAndProstheticsItems(finding, "standard");
			assert.ok(result.therapyItems.length >= 3, "Терапевтический этап должен содержать обработку, обтурацию и культю");
			assert.ok(result.orthoItems.length >= 3, "Ортопедический этап должен содержать слепок, коронку ZrO2 и фиксацию");

			const therapyCodes = result.therapyItems.map((i) => i.code804n);
			assert.ok(therapyCodes.includes("A16.07.030.003"), "Обработка 3 каналов ProTaper A16.07.030.003");
			assert.ok(therapyCodes.includes("A16.07.008.003"), "3D-обтурация 3 каналов A16.07.008.003");
			assert.ok(therapyCodes.includes("A16.07.002.001"), "Культевой билд-ап A16.07.002.001");

			const orthoCodes = result.orthoItems.map((i) => i.code804n);
			assert.ok(orthoCodes.includes("A16.07.004.003"), "Коронка из диоксида циркония A16.07.004.003");
		});

		test("коронки дифференцируются по тарифам (Эконом: металлокерамика, Оптимум: диоксид циркония, Премиум: E.max)", () => {
			const finding: CbctToothDestructionFinding = {
				toothFdi: 24,
				destructionLevel: "pulpitis",
				rootCanalCount: 2,
			};

			const econ = buildDestructionAndProstheticsItems(finding, "economy");
			const opt = buildDestructionAndProstheticsItems(finding, "standard");
			const prem = buildDestructionAndProstheticsItems(finding, "optimum");

			const econCrown = econ.orthoItems.find((i) => i.code804n === "A16.07.004.001")!;
			const optCrown = opt.orthoItems.find((i) => i.code804n === "A16.07.004.003")!;
			const premCrown = prem.orthoItems.find((i) => i.code804n === "A16.07.004.003")!;

			assert.ok(econCrown.name.includes("Металлокерамическая"));
			assert.ok(optCrown.name.includes("ZrO2"));
			assert.ok(premCrown.name.includes("e.max"));
		});
	});

	describe("4. 1-клик генерация 3 сценариев на 4 клинических этапа (generateCbctAutoPlanScenarios)", () => {
		const testCbctInput: CbctAutoPlanFindingsInput = {
			patientId: "PAT-CBCT-001",
			patientName: "Алексей Иванов",
			implants: [
				{
					toothFdi: 46,
					brand: "dentium",
					diameterMm: 4.5,
					lengthMm: 10.0,
					ridgeHeightMm: 12.0,
					ridgeWidthMm: 7.5,
					meanHU: 750,
					mischClass: "D2",
					nerveClearanceMm: 4.5,
				},
				{
					toothFdi: 16,
					brand: "dentium",
					diameterMm: 4.5,
					lengthMm: 10.0,
					ridgeHeightMm: 6.0,
					ridgeWidthMm: 7.0,
					needsSinusLift: true,
					sinusLiftType: "closed",
				},
			],
			boneDefects: [
				{
					toothFdi: 16,
					region: "maxilla_sinus",
					defectType: "sinus_pneumatization",
					residualHeightMm: 6.0,
					recommendedAugmentation: "closed_sinus_lift",
				},
			],
			toothDestructions: [
				{
					toothFdi: 47,
					destructionLevel: "periodontitis_periapical",
					rootCanalCount: 3,
					crownRecommendation: "zirconia",
				},
				{
					toothFdi: 38,
					destructionLevel: "subgingival_fracture_hopeless",
					isHopelessForExtraction: true,
				},
			],
		};

		test("генерирует ровно 3 тарифных сценария: economy, standard, optimum", () => {
			const [econ, opt, prem] = generateCbctAutoPlanScenarios(testCbctInput);

			assert.equal(econ.tierId, "economy");
			assert.equal(opt.tierId, "standard");
			assert.equal(prem.tierId, "optimum");

			assert.ok(econ.title.includes("Эконом"));
			assert.ok(opt.title.includes("Оптимум"));
			assert.ok(prem.title.includes("Премиум"));
		});

		test("каждый сценарий содержит ровно 4 клинических этапа по каноническому протоколу", () => {
			const tiers = generateCbctAutoPlanScenarios(testCbctInput);

			for (const tier of tiers) {
				assert.equal(tier.stages.length, 4, `Тариф ${tier.tierId} должен содержать ровно 4 этапа`);
				const stageNumbers = tier.stages.map((s) => s.stageNumber);
				assert.deepEqual(stageNumbers, [1, 2, 3, 4]);

				assert.equal(tier.stages[0]!.stageKind, "stage_1_therapy"); // Неотложка
				assert.equal(tier.stages[1]!.stageKind, "stage_1_therapy"); // Терапия
				assert.equal(tier.stages[2]!.stageKind, "stage_2_surgery"); // Хирургия и имплантация
				assert.equal(tier.stages[3]!.stageKind, "stage_3_orthopedics"); // Ортопедия
			}
		});

		test("математическая копеечная точность ACID: сумма этапов строго равна итогу тарифа", () => {
			const tiers = generateCbctAutoPlanScenarios(testCbctInput);

			for (const tier of tiers) {
				const sumStagesKopecks = sumKopecks(tier.stages.map((s) => s.totalKopecks));
				assert.equal(
					tier.totalKopecks,
					sumStagesKopecks,
					`Тариф ${tier.tierId}: totalKopecks (${tier.totalKopecks}) != сумма этапов (${sumStagesKopecks})`,
				);

				for (const stage of tier.stages) {
					const itemsSumKopecks = sumKopecks(
						stage.items.map((it) => parseKopecks(it.priceRub * (it.quantity ?? 1))),
					);
					assert.equal(
						stage.totalKopecks,
						itemsSumKopecks,
						`Этап ${stage.stageNumber}: totalKopecks (${stage.totalKopecks}) != сумма позиций (${itemsSumKopecks})`,
					);
				}
			}
		});

		test("ценовая субординация: Эконом < Оптимум < Премиум", () => {
			const [econ, opt, prem] = generateCbctAutoPlanScenarios(testCbctInput);

			assert.ok(
				econ.totalKopecks < opt.totalKopecks,
				`Эконом (${econ.totalRub} ₽) должен быть дешевле Оптимума (${opt.totalRub} ₽)`,
			);
			assert.ok(
				opt.totalKopecks < prem.totalKopecks,
				`Оптимум (${opt.totalRub} ₽) должен быть дешевле Премиума (${prem.totalRub} ₽)`,
			);
		});

		test("расчет рассрочки 0% без переплат (3, 6, 12, 24 мес.) для каждого тарифа", () => {
			const [econ, opt, prem] = generateCbctAutoPlanScenarios(testCbctInput);

			for (const tier of [econ, opt, prem]) {
				assert.ok(tier.installments[3].monthlyPaymentRub > 0);
				assert.ok(tier.installments[6].monthlyPaymentRub > 0);
				assert.ok(tier.installments[12].monthlyPaymentRub > 0);
				assert.ok(tier.installments[24].monthlyPaymentRub > 0);

				// 12 месяцев * платеж примерно равно общей сумме (с точностью до рубля округления)
				assert.ok(Math.abs(tier.installments[12].monthlyPaymentRub * 12 - tier.totalRub) <= 12);
			}
		});

		test("налоговый вычет 13% НДФЛ рассчитывается с разделением Код 01 / Код 02", () => {
			const [econ, opt, prem] = generateCbctAutoPlanScenarios(testCbctInput);

			for (const tier of [econ, opt, prem]) {
				assert.ok(tier.ndflRefundRub > 0, "Вычет должен быть больше 0");
				assert.ok(tier.ndflDetails, "Должна присутствовать детальная раскладка НДФЛ");
				assert.ok(
					tier.ndflDetails.isHighCostCode02,
					"Имплантация относится к дорогостоящему лечению (Код 02, без лимита 150 000 руб.)",
				);
			}
		});

		test("график поэтапной оплаты 30/40/30 формируется без копеечных погрешностей", () => {
			const [econ, opt, prem] = generateCbctAutoPlanScenarios(testCbctInput);

			for (const tier of [econ, opt, prem]) {
				assert.ok(tier.stagedSchedule, "Должен присутствовать график 30/40/30");
				const totalScheduleRub =
					tier.stagedSchedule.stage1AdvanceTherapyRub +
					tier.stagedSchedule.stage2SurgeryImplantRub +
					tier.stagedSchedule.stage3OrthopedicsRub;

				assert.equal(
					totalScheduleRub,
					tier.totalRub,
					`График 30/40/30 (${totalScheduleRub} ₽) должен строго равняться общей стоимости (${tier.totalRub} ₽)`,
				);
				assert.equal(tier.stagedSchedule.isBalanced, true);
			}
		});
	});

	describe("5. Автоизвлечение находок КЛКТ из одонтограммы (extractCbctFindingsFromOdontogramAndStorage)", () => {
		test("корректно извлекает отсутствующие зубы как кандидаты на имплантацию", () => {
			const testTeeth: ToothData[] = [
				{ toothNumber: 46, state: "Missing", notes: "Удален 2 года назад" },
				{ toothNumber: 16, state: "Missing", notes: "Отсутствует" },
				{ toothNumber: 47, state: "Periodontitis", notes: "Периапикальный очаг" },
			];

			const findings = extractCbctFindingsFromOdontogramAndStorage("PAT-EXTRACT-1", testTeeth);

			assert.ok(findings.implants && findings.implants.length >= 2);
			const fdiList = findings.implants.map((i) => i.toothFdi);
			assert.ok(fdiList.includes(46));
			assert.ok(fdiList.includes(16));

			// Верхний моляр 16 должен автоматически получить подозрение на синус-лифтинг
			const sinusDefects = findings.boneDefects?.filter((d) => d.toothFdi === 16);
			assert.ok(sinusDefects && sinusDefects.length > 0);
		});

		test("предоставляет безопасный фоллбэк с имплантатом #46 при полностью чистой одонтограмме", () => {
			const findings = extractCbctFindingsFromOdontogramAndStorage("PAT-EMPTY", []);

			assert.ok(findings.implants && findings.implants.length > 0);
			assert.equal(findings.implants[0]!.toothFdi, 46);
			assert.ok(findings.toothDestructions && findings.toothDestructions.length > 0);
		});
	});

	describe("6. Специализированные пакеты КЛКТ «под ключ» (CBCT_CLINICAL_BUNDLES)", () => {
		test("реестр пакетов КЛКТ содержит 3 специализированных пакета", () => {
			assert.equal(CBCT_CLINICAL_BUNDLES.length, 3);
			const ids = CBCT_CLINICAL_BUNDLES.map((b) => b.id);
			assert.ok(ids.includes("sinus_lift_closed_turnkey" as any));
			assert.ok(ids.includes("sinus_lift_open_turnkey" as any));
			assert.ok(ids.includes("crown_implant_zirconia_turnkey" as any));
		});

		test("getCbctBundleById находит пакеты по идентификаторам", () => {
			const closedLift = getCbctBundleById("sinus_lift_closed_turnkey");
			assert.ok(closedLift);
			assert.equal(closedLift.category, "surgery");
			assert.equal(closedLift.totalPriceRub, 32900);

			const openLift = getCbctBundleById("sinus_lift_open_turnkey");
			assert.ok(openLift);
			assert.equal(openLift.category, "surgery");
			assert.equal(openLift.totalPriceRub, 64200);

			const crownZr = getCbctBundleById("crown_implant_zirconia_turnkey");
			assert.ok(crownZr);
			assert.equal(crownZr.category, "orthopedics");
			assert.equal(crownZr.totalPriceRub, 37000);
		});

		test("calculateBundlePrice рассчитывает стоимость пакета КЛКТ с исключением опций", () => {
			const breakdown = calculateBundlePrice("sinus_lift_closed_turnkey" as any, ["closed_lift", "bio_oss"]);
			assert.equal(breakdown.totalRub, 32000); // 32900 - 900 (без анестезии)
			assert.equal(breakdown.excludedItems.length, 1);
			assert.equal(breakdown.excludedItems[0]!.id, "anesthesia");
		});

		test("applyClinicalBundleToStages интегрирует открытый синус-лифтинг в хирургический этап", () => {
			const initialStages: TreatmentPlanStage[] = [
				{
					stageNumber: 1,
					stageKind: "stage_1_therapy",
					title: "Этап I: Терапия",
					subtitle: "Санация",
					clinicalGoal: "Лечение кариеса",
					items: [],
					totalRub: 0,
					totalKopecks: 0 as any,
					estimatedVisits: 1,
					estimatedWeeks: 1,
					order804nCodes: [],
					status: "agreed",
				},
			];

			const updatedStages = applyClinicalBundleToStages(
				initialStages,
				"sinus_lift_open_turnkey" as any,
				{ toothNumber: 16 },
			);

			assert.equal(updatedStages.length, 2, "Должен создаться второй этап (хирургия)");
			const surgStage = updatedStages.find((s) => s.stageKind === "stage_2_surgery")!;
			assert.equal(surgStage.items.length, 5);
			assert.equal(surgStage.totalRub, 64200);
			assert.ok(surgStage.items[0]!.name.includes("Зуб 16"));
		});
	});
});

/**
 * dentalTools.test.ts — Модульное тестирование Dental Tool Arsenal:
 * 1. Расчет анестезии 4% артикаина и мепивакаина (40 кг, 70 кг, 100 кг, кардио-риски, потолок доз).
 * 2. Скрининг соматики (пенициллины, антикоагулянты, бисфосфонаты MRONJ, гипертония, НПВС).
 * 3. Форма 043/у по СтАР и МКБ-10.
 * 4. Экстренная помощь (анафилаксия, гипохлоритная авария, облом инструмента, перфорация МТА).
 * 5. Консилиум, перевод жалоб и сравнение материалов.
 * 6. CRM и EMR (тенантная изоляция, поиск по 804н, валидация FDI, сметы).
 * 7. Матрица рантаймов web_browser vs desktop_native.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	calculateAnesthesiaTool,
	chairsideEmergencyTool,
	checkSomaticRisksTool,
	compareDentalMaterialsTool,
	createAppointmentTool,
	createInvoiceDraftTool,
	executeDentalTool,
	generateForm043Tool,
	getDentalTools,
	getPatientEmrTool,
	handleCalculateAnesthesia,
	handleChairsideEmergency,
	handleCheckSomaticRisks,
	handleCompareDentalMaterials,
	handleGenerateForm043,
	handleMultidisciplinaryConcilium,
	handlePrintDocument,
	handleSearchServices,
	handleTranslatePatientComplaint,
	handleUpdateToothStatus,
	multidisciplinaryConciliumTool,
	printDocumentTool,
	searchServicesTool,
	translatePatientComplaintTool,
	updateToothStatusTool,
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
		assert.ok(res.fullForm043Text.includes("ФОРМА № 043/У"));
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

describe("Dental Tool Arsenal — CRM, База данных и Номенклатура 804н", () => {
	test("search_clinic_services_and_prices: находит услуги по Номенклатуре 804н через мягкий фолбек", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [],
					}),
				}),
			}),
		};

		const res = await handleSearchServices(
			{ codeOrName: "A16.07.002", category: "all" },
			{ organizationId: TEST_ORG_ID, db: mockDb },
		);

		assert.strictEqual(res.found, true);
		assert.ok(res.results.some((r) => r.code === "A16.07.002"));
		// В нормативном фолбеке цены честно null (без выдуманных хардкодов)
		assert.strictEqual(res.results[0]?.priceRub, null);
		assert.strictEqual(res.results[0]?.source, "order_804n_standard_catalog");
	});

	test("get_patient_emr_and_odontogram: при отсутствии пациента возвращает честное found: false", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [],
					}),
				}),
			}),
		};

		const res = (await getPatientEmrTool.handler(
			{ patientId: "22222222-2222-2222-2222-222222222222" },
			{ organizationId: TEST_ORG_ID, db: mockDb },
		)) as any;

		assert.strictEqual(res.found, false);
		assert.ok(res.message?.includes("не найден в базе данных"));
	});

	test("update_tooth_status: валидирует номера зубов FDI 11-48 и 51-85", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [],
					}),
				}),
			}),
			insert: () => ({
				values: async () => {},
			}),
			update: () => ({
				set: () => ({
					where: async () => {},
				}),
			}),
		};

		// Корректный зуб 26
		const validRes = await handleUpdateToothStatus(
			{
				patientId: "22222222-2222-2222-2222-222222222222",
				toothNumber: 26,
				state: "filling",
				surfaces: ["O", "M"],
			},
			{ organizationId: TEST_ORG_ID, db: mockDb },
		);
		assert.strictEqual(validRes.success, true);
		assert.strictEqual(validRes.toothNumber, 26);
		assert.strictEqual(validRes.newState, "filling");

		// Некорректный номер зуба 99 должен выбрасывать клиническую ошибку
		await assert.rejects(async () => {
			await handleUpdateToothStatus(
				{
					patientId: "22222222-2222-2222-2222-222222222222",
					toothNumber: 99,
					state: "caries",
				},
				{ organizationId: TEST_ORG_ID, db: mockDb },
			);
		}, /Недопустимый номер зуба/);
	});

	test("create_invoice_draft: вычисляет сумму и применяет скидку врача", async () => {
		const mockDb = {
			insert: () => ({
				values: () => ({
					returning: async () => [{ id: "inv-123" }],
				}),
			}),
		};

		const res = (await createInvoiceDraftTool.handler(
			{
				patientId: "22222222-2222-2222-2222-222222222222",
				items: [
					{ title: "Анестезия инфильтрационная", priceRub: 800, quantity: 1 },
					{ title: "Лечение кариеса зуба 16", priceRub: 4500, quantity: 1 },
				],
				discountRub: 300,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb },
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.subtotalRub, 5300);
		assert.strictEqual(res.discountRub, 300);
		assert.strictEqual(res.totalAmountRub, 5000);
	});

	test("print_document: разделяет поведение для web_browser и desktop_native", async () => {
		// Web browser
		const webRes = await handlePrintDocument(
			{
				documentType: "form_043",
				patientId: "22222222-2222-2222-2222-222222222222",
				format: "pdf",
			},
			{ organizationId: TEST_ORG_ID, runtimeMode: "web_browser" },
		);
		assert.strictEqual(webRes.actionDirective, "TRIGGER_BROWSER_PRINT");

		// Desktop native
		const deskRes = await handlePrintDocument(
			{
				documentType: "form_043",
				patientId: "22222222-2222-2222-2222-222222222222",
				format: "pdf",
			},
			{ organizationId: TEST_ORG_ID, runtimeMode: "desktop_native" },
		);
		assert.strictEqual(deskRes.actionDirective, "DESKTOP_PRINT_DISPATCHED");
	});
});

describe("Dental Tool Arsenal — Матрица рантаймов web_browser vs desktop_native", () => {
	test("getDentalTools: фильтрует инструменты по рантайму", () => {
		const webTools = getDentalTools("web_browser");
		const deskTools = getDentalTools("desktop_native");

		// В браузере 16 инструментов (15 клинических/CRM + manage_task_plan)
		assert.strictEqual(webTools.length, 16);
		assert.ok(webTools.some((t) => t.function.name === "manage_task_plan"));
		assert.ok(webTools.some((t) => t.function.name === "calculate_anesthesia"));
		assert.ok(webTools.some((t) => t.function.name === "get_patient_emr_and_odontogram"));
		assert.ok(webTools.some((t) => t.function.name === "create_appointment"));
		assert.ok(!webTools.some((t) => t.function.name === "launch_workstation_app"));
		assert.ok(!webTools.some((t) => t.function.name === "read_local_clinical_file"));

		// На десктопе все 31 инструмент доступны (16 веб/CRM/план + 15 нативных десктопных)
		assert.strictEqual(deskTools.length, 31);
		assert.ok(deskTools.some((t) => t.function.name === "manage_task_plan"));
		assert.ok(deskTools.some((t) => t.function.name === "launch_workstation_app"));
		assert.ok(deskTools.some((t) => t.function.name === "open_patient_dropzone_folder"));
		assert.ok(deskTools.some((t) => t.function.name === "read_clinical_file"));
		assert.ok(deskTools.some((t) => t.function.name === "write_clinical_file"));
		assert.ok(deskTools.some((t) => t.function.name === "list_patient_study_directory"));
		assert.ok(deskTools.some((t) => t.function.name === "run_workstation_command"));
		assert.ok(deskTools.some((t) => t.function.name === "manage_task"));
		assert.ok(deskTools.some((t) => t.function.name === "schedule"));
		assert.ok(deskTools.some((t) => t.function.name === "capture_workstation_screen"));
		assert.ok(deskTools.some((t) => t.function.name === "call_local_mcp_tool"));
		assert.ok(deskTools.some((t) => t.function.name === "list_local_mcp_tools"));
		assert.ok(deskTools.some((t) => t.function.name === "read_local_mcp_resource"));
	});

	test("executeDentalTool: отказ при вызове desktop_native инструмента в режиме web_browser", async () => {
		// Попытка запустить ПО визиографа из браузера
		const res = (await executeDentalTool(
			"launch_workstation_app",
			{ appType: "vatech_ezdent" },
			{ organizationId: TEST_ORG_ID, runtimeMode: "web_browser" },
		)) as { success: boolean; availableInWeb: boolean; error: string };

		assert.strictEqual(res.success, false);
		assert.strictEqual(res.availableInWeb, false);
		assert.ok(res.error.includes("только в режиме локальной станции врача"));
	});

	test("executeDentalTool: успешный вызов клинического инструмента в режиме web_browser", async () => {
		const res = (await executeDentalTool(
			"calculate_anesthesia",
			{
				patientWeightKg: 70,
				plannedCarpules: 1,
			},
			{ organizationId: TEST_ORG_ID, runtimeMode: "web_browser" },
		)) as { safeToProceed: boolean; absoluteMaxCarpules: number };

		assert.strictEqual(res.safeToProceed, true);
		assert.strictEqual(res.absoluteMaxCarpules, 7);
	});

	test("executeDentalTool: manage_task_plan создает план, отслеживает шаги и предотвращает зацикливание", async () => {
		// 1. Создание плана
		const createRes = (await executeDentalTool(
			"manage_task_plan",
			{
				action: "create",
				goal: "Комплексная санация и финансовый аудит",
				items: [
					{ id: "step_check", title: "Проверка зубной формулы" },
					{
						id: "step_invoice",
						title: "Формирование предварительной сметы",
						blockedBy: ["step_check"],
					},
				],
			},
			{ organizationId: TEST_ORG_ID, runtimeMode: "web_browser" },
		)) as {
			success: boolean;
			isComplete: boolean;
			actionableItems: Array<{ id: string; title: string }>;
			directive?: string;
		};

		assert.strictEqual(createRes.success, true);
		assert.strictEqual(createRes.isComplete, false);
		assert.strictEqual(createRes.actionableItems.length, 1);
		assert.strictEqual(createRes.actionableItems[0].id, "step_check");
		assert.ok(createRes.directive?.includes("НЕ ВЫЗЫВАЙ manage_task_plan повторно"));

		// 2. Обновление статуса первого шага
		const updateRes = (await executeDentalTool(
			"manage_task_plan",
			{
				action: "update_status",
				itemId: "step_check",
				status: "completed",
				notes: "Зубная формула актуальна",
			},
			{ organizationId: TEST_ORG_ID, runtimeMode: "web_browser" },
		)) as {
			success: boolean;
			isComplete: boolean;
			actionableItems: Array<{ id: string; title: string }>;
		};

		assert.strictEqual(updateRes.success, true);
		assert.strictEqual(updateRes.isComplete, false);
		assert.strictEqual(updateRes.actionableItems.length, 1);
		assert.strictEqual(updateRes.actionableItems[0].id, "step_invoice");

		// 3. Завершение последнего шага
		const finishRes = (await executeDentalTool(
			"manage_task_plan",
			{
				action: "update_status",
				itemId: "step_invoice",
				status: "completed",
				notes: "Смета согласована с пациентом",
			},
			{ organizationId: TEST_ORG_ID, runtimeMode: "web_browser" },
		)) as {
			success: boolean;
			isComplete: boolean;
			directive?: string;
		};

		assert.strictEqual(finishRes.success, true);
		assert.strictEqual(finishRes.isComplete, true);
		assert.ok(finishRes.directive?.includes("Все шаги плана завершены"));
	});
});

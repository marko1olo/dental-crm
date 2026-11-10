/**
 * dentalTools.test.ts — Модульное тестирование CRM-инструментов, одонтограммы и рантаймов:
 * 1. CRM и EMR (тенантная изоляция, прейскурант услуг, валидация FDI, счета в кассу 54-ФЗ).
 * 2. Печать документов и бланков (Мандат 8e).
 * 3. Матрица рантаймов web_browser vs desktop_native.
 *
 * Sweet Spot 200-300 строк (Мандат 8b / 8zi).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	createAppointmentTool,
	createInvoiceDraftTool,
	executeDentalTool,
	getDentalTools,
	getPatientEmrTool,
	handlePrintDocument,
	handleSearchServices,
	handleUpdateToothStatus,
	printDocumentTool,
	searchServicesTool,
	updateToothStatusTool,
} from "./dentalTools.js";

const TEST_ORG_ID = "11111111-1111-1111-1111-111111111111";

describe("Dental Tool Arsenal — CRM, База данных и Прейскурант услуг", () => {
	test("search_clinic_services_and_prices: находит услуги по нормативному каталогу через мягкий фолбек", async () => {
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
		assert.ok(res.results.some((r) => r.code === "A16.07.002" || r.serviceCode === "A16.07.002"));
		// В нормативном фолбеке цены честно null (без выдуманных хардкодов)
		assert.strictEqual(res.results[0]?.priceRub, null);
		assert.strictEqual(res.results[0]?.source, "standard_catalog");
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
				confirmed: true,
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
					confirmed: true,
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
				confirmed: true,
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

		// В браузере 17 инструментов (16 клинических/CRM + manage_task_plan)
		assert.strictEqual(webTools.length, 17);
		assert.ok(webTools.some((t) => t.function.name === "manage_task_plan"));
		assert.ok(webTools.some((t) => t.function.name === "record_treatment"));
		assert.ok(webTools.some((t) => t.function.name === "calculate_anesthesia"));
		assert.ok(webTools.some((t) => t.function.name === "get_patient_emr_and_odontogram"));
		assert.ok(webTools.some((t) => t.function.name === "create_appointment"));
		assert.ok(!webTools.some((t) => t.function.name === "launch_workstation_app"));
		assert.ok(!webTools.some((t) => t.function.name === "read_local_clinical_file"));

		// На десктопе все 32 инструмента доступны (17 веб/CRM/план + 15 нативных десктопных)
		assert.strictEqual(deskTools.length, 32);
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
		assert.strictEqual(createRes.actionableItems[0]!.id, "step_check");
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
		assert.strictEqual(updateRes.actionableItems[0]!.id, "step_invoice");

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

/**
 * desktopMcpAndScreen.test.ts — Тестирование аппаратного MCP-моста, захвата экрана и Web Guard:
 * 1. Локальный MCP-мост: кассы Атол 54-ФЗ (статус, открытие смены, печать чека, Z-отчет).
 * 2. 2D DataMatrix сканеры Честный Знак и TWAIN радиовизиографические сенсоры.
 * 3. capture_workstation_screen: оптический захват экрана визиографа/томографа в desktop_native.
 * 4. Web Browser Security Guard: отказ выполнения десктопных инструментов в web_browser.
 *
 * Sweet Spot 200-300 строк (Мандат 8b / 8zi).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import test, { describe } from "node:test";
import {
	DESKTOP_DENIED_RESPONSE,
	handleCallLocalMcpTool,
	handleCaptureWorkstationScreen,
	handleLaunchWorkstationApp,
	handleListLocalMcpTools,
	handleListPatientStudyDirectory,
	handleManageTask,
	handleOpenPatientDropzoneFolder,
	handleReadClinicalFile,
	handleReadLocalMcpResource,
	handleRunWorkstationCommand,
	handleSchedule,
	handleWriteClinicalFile,
} from "./dentalTools/desktopSystemTools.js";
import type { DentalToolContext } from "./dentalTools/types.js";

process.env.KKT_MODEL = "emulator";

const TEST_ORG_ID = "org-test-7777-8888-9999-000000000000";
const TEST_PATIENT_ID = "11111111-2222-3333-4444-555555555555";

const DESKTOP_CTX: DentalToolContext = {
	organizationId: TEST_ORG_ID,
	patientId: TEST_PATIENT_ID,
	runtimeMode: "desktop_native",
	allowLocalExecution: true,
};

const WEB_CTX: DentalToolContext = {
	organizationId: TEST_ORG_ID,
	patientId: TEST_PATIENT_ID,
	runtimeMode: "web_browser",
};

describe("Desktop Agent Harness — Локальный MCP-мост (Model Context Protocol)", () => {
	test("list_local_mcp_tools: возвращает реестр инструментов касс, сканеров и TWAIN", async () => {
		const res = (await handleListLocalMcpTools({}, DESKTOP_CTX)) as any;
		assert.strictEqual(res.success, true);
		assert.ok(res.totalTools >= 9);

		// Фильтрация по kkt_atol
		const atolOnly = (await handleListLocalMcpTools(
			{ serverName: "kkt_atol" },
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(atolOnly.success, true);
		assert.ok(atolOnly.tools.every((t: any) => t.serverName === "kkt_atol"));
		assert.ok(atolOnly.tools.some((t: any) => t.toolName === "print_receipt"));
		assert.ok(atolOnly.tools.some((t: any) => t.toolName === "get_kkt_status"));
	});

	test("call_local_mcp_tool: касса Атол (статус, открытие смены, чек, Z-отчет)", async () => {
		// 1. Статус
		const statusRes = (await handleCallLocalMcpTool(
			{
				serverName: "kkt_atol",
				toolName: "get_kkt_status",
				arguments: {},
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(statusRes.success, true);
		assert.strictEqual(statusRes.data.online, true);
		assert.strictEqual(statusRes.data.fnFiscalized, true);

		// 2. Открытие смены
		const openRes = (await handleCallLocalMcpTool(
			{
				serverName: "kkt_atol",
				toolName: "open_shift",
				arguments: { cashierName: "Иванов И.И." },
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(openRes.success, true);
		assert.strictEqual(openRes.data.cashier, "Иванов И.И.");

		// 3. Фискализация чека 54-ФЗ
		const printRes = (await handleCallLocalMcpTool(
			{
				serverName: "kkt_atol",
				toolName: "print_receipt",
				arguments: {
					totalKopecks: 450000,
					paymentType: "card",
					items: [{ name: "Лечение кариеса 16", priceRub: 4500, quantity: 1 }],
				},
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(printRes.success, true);
		assert.ok(printRes.data.fiscalDocumentNumber > 0);
		assert.ok(printRes.data.fiscalSign);

		// 4. Z-отчет
		const zRes = (await handleCallLocalMcpTool(
			{
				serverName: "kkt_atol",
				toolName: "close_z_report",
				arguments: {},
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(zRes.success, true);
		assert.ok(zRes.data.zReportNumber);
		assert.ok(zRes.data.shiftNumber);
	});

	test("call_local_mcp_tool: возвращает честный статус DEVICE_NOT_CONNECTED при отключенной ККТ", async () => {
		process.env.KKM_FORCE_OFFLINE = "1";
		try {
			const res = (await handleCallLocalMcpTool(
				{
					serverName: "kkt_atol",
					toolName: "get_kkt_status",
					arguments: {},
				},
				DESKTOP_CTX,
			)) as any;
			assert.strictEqual(res.success, false);
			assert.strictEqual(res.status, "DEVICE_NOT_CONNECTED");
			assert.ok(res.error);
		} finally {
			delete process.env.KKM_FORCE_OFFLINE;
		}
	});

	test("call_local_mcp_tool: 2D DataMatrix сканер Честный Знак и TWAIN сенсор", async () => {
		// Сканер: пустой буфер возвращает честный статус NO_BARCODE_SCANNED
		const emptyBufRes = (await handleCallLocalMcpTool(
			{
				serverName: "datamatrix_scanner",
				toolName: "get_last_scanned_barcode",
				arguments: {},
			},
			DESKTOP_CTX,
		)) as any;
		// Если до этого не сканировали, буфер честно сообщает NO_BARCODE_SCANNED
		if (!emptyBufRes.success) {
			assert.strictEqual(emptyBufRes.status, "NO_BARCODE_SCANNED");
		}

		// Сканирование реального DataMatrix
		const scanRes = (await handleCallLocalMcpTool(
			{
				serverName: "datamatrix_scanner",
				toolName: "parse_chestny_znak",
				arguments: { rawBarcode: "010460123456789021AB1234XYZ91EE06" },
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(scanRes.success, true);
		assert.strictEqual(scanRes.data.gtin, "04601234567890");
		assert.strictEqual(scanRes.data.serial, "AB1234XYZ");

		// После сканирования get_last_scanned_barcode возвращает реальный отсканированный штрихкод
		const lastBufRes = (await handleCallLocalMcpTool(
			{
				serverName: "datamatrix_scanner",
				toolName: "get_last_scanned_barcode",
				arguments: {},
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(lastBufRes.success, true);
		assert.strictEqual(lastBufRes.data.barcode, "010460123456789021AB1234XYZ91EE06");

		// TWAIN
		const twainRes = (await handleCallLocalMcpTool(
			{
				serverName: "twain_sensor",
				toolName: "list_devices",
				arguments: {},
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(twainRes.success, true);
		assert.ok(
			twainRes.data.devices.some((d: any) => d.id === "vatech_ezsensor_15"),
		);
	});

	test("read_local_mcp_resource: чтение ресурса кассы и буфера сканера", async () => {
		const kktRes = (await handleReadLocalMcpResource(
			{
				serverName: "kkt_atol",
				uri: "kkt://atol/status",
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(kktRes.success, true);
		assert.strictEqual(kktRes.mimeType, "application/json");
		const parsed = JSON.parse(kktRes.content);
		assert.strictEqual(parsed.status, "READY");

		// Буфер сканера: возвращает отсканированный штрихкод из памяти
		const scanBufRes = (await handleReadLocalMcpResource(
			{
				serverName: "datamatrix_scanner",
				uri: "scanner://datamatrix/buffer",
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(scanBufRes.success, true);
		assert.strictEqual(scanBufRes.content, "010460123456789021AB1234XYZ91EE06");
	});

	test("call_local_mcp_tool: отказ 54-ФЗ при отрицательных копейках или невалидном типе оплаты", async () => {
		const negRes = (await handleCallLocalMcpTool(
			{
				serverName: "kkt_atol",
				toolName: "print_receipt",
				arguments: {
					totalKopecks: -500,
					paymentType: "card",
				},
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(negRes.success, false);
		assert.ok(negRes.error.includes("totalKopecks должен быть целым неотрицательным"));

		const invalidTender = (await handleCallLocalMcpTool(
			{
				serverName: "kkt_atol",
				toolName: "print_receipt",
				arguments: {
					totalKopecks: 10000,
					paymentType: "invalid_unsupported_tender",
				},
			},
			DESKTOP_CTX,
		)) as any;
		assert.strictEqual(invalidTender.success, false);
		assert.ok(invalidTender.error.includes("недопустимый способ расчета"));
	});
});

describe("Desktop Agent Harness — Оптический Захват Экрана и Диагностика", () => {
	test("capture_workstation_screen: успешный захват экрана или ROI в desktop_native режиме", async () => {
		const res = (await handleCaptureWorkstationScreen(
			{
				diagnosticReason: "Red Team проверка захвата визиографа",
				targetScreenIndex: 0,
				saveToPatientDropzone: false,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.ok(res.savedPath);
		assert.ok(fs.existsSync(res.savedPath));
		assert.ok(res.fileSizeBytes > 0);
		assert.ok(res.dataUriThumbnail?.startsWith("data:image/png;base64,"));

		// Очистка скриншота
		await fs.promises.unlink(res.savedPath).catch(() => {});
	});
});

describe("Desktop Agent Harness — Отказ выполнения в Web Browser (Security Enforcement)", () => {
	test("Все десктопные инструменты возвращают DESKTOP_DENIED_RESPONSE в режиме web_browser", async () => {
		const toolsToTest = [
			() => handleReadClinicalFile({ filePath: "test.txt" }, WEB_CTX),
			() =>
				handleWriteClinicalFile(
					{ targetFile: "test.txt", content: "test" },
					WEB_CTX,
				),
			() =>
				handleListPatientStudyDirectory(
					{ patientId: TEST_PATIENT_ID },
					WEB_CTX,
				),
			() =>
				handleOpenPatientDropzoneFolder(
					{ patientId: TEST_PATIENT_ID },
					WEB_CTX,
				),
			() => handleRunWorkstationCommand({ commandLine: "dir" }, WEB_CTX),
			() => handleManageTask({ action: "list" }, WEB_CTX),
			() => handleSchedule({ prompt: "test", durationSeconds: 10 }, WEB_CTX),
			() => handleLaunchWorkstationApp({ appType: "vatech_ezdent" }, WEB_CTX),
			() =>
				handleCaptureWorkstationScreen({ diagnosticReason: "test" }, WEB_CTX),
			() =>
				handleCallLocalMcpTool(
					{ serverName: "kkt_atol", toolName: "status", arguments: {} },
					WEB_CTX,
				),
			() => handleListLocalMcpTools({}, WEB_CTX),
			() =>
				handleReadLocalMcpResource(
					{ serverName: "kkt_atol", uri: "kkt://atol/status" },
					WEB_CTX,
				),
		];

		for (const invoke of toolsToTest) {
			const res = (await invoke()) as any;
			assert.strictEqual(res.success, false);
			assert.strictEqual(res.availableInWeb, false);
			assert.ok(res.error.includes("только в режиме локальной станции врача"));
		}
	});
});

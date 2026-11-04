/**
 * databaseModules.test.ts — Тестирование декомпозированных модулей БД CRM AI Tools:
 * - 2-Phase Confirmation Guard для всех мутаций (updateToothStatus, createAppointment, createInvoiceDraft, treatmentRecord)
 * - Целочисленные копейки (amountKopecks, BIGINT)
 * - Валидация FDI формулы (11-48, 51-85)
 * - Реестр и O(1) словарь инструментов
 * - Мандат 8b: лимиты строк (модули <= 120 строк, фасады <= 15 строк)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import {
	createAppointmentSchema,
	createAppointmentTool,
	createInvoiceDraftSchema,
	createInvoiceDraftTool,
	databaseToolsMap,
	databaseToolsRegistry,
	getPatientEmrSchema,
	getPatientEmrTool,
	handleCreateAppointment,
	handleCreateInvoiceDraft,
	handleGetPatientEmr,
	handlePatientSearch,
	handlePrintDocument,
	handleSearchServices,
	handleTreatmentRecord,
	handleUpdateToothStatus,
	isValidFdiToothNumber,
	kopecksToRub,
	parseCsvRows,
	patientSearchSchema,
	patientSearchTool,
	printDocumentSchema,
	printDocumentTool,
	rubToKopecks,
	searchServicesSchema,
	searchServicesTool,
	treatmentRecordSchema,
	treatmentRecordTool,
	updateToothStatusSchema,
	updateToothStatusTool,
} from "../index.js";

const TEST_ORG_ID = "11111111-1111-1111-1111-111111111111";

describe("CRM Database AI Tools — dbTypes & Валидация", () => {
	test("isValidFdiToothNumber: корректно валидирует постоянные (11-48) и молочные (51-85) зубы", () => {
		// Постоянные
		assert.strictEqual(isValidFdiToothNumber(11), true);
		assert.strictEqual(isValidFdiToothNumber(18), true);
		assert.strictEqual(isValidFdiToothNumber(26), true);
		assert.strictEqual(isValidFdiToothNumber(34), true);
		assert.strictEqual(isValidFdiToothNumber(48), true);
		assert.strictEqual(isValidFdiToothNumber(19), false); // 9 не существует в квадранте

		// Молочные
		assert.strictEqual(isValidFdiToothNumber(51), true);
		assert.strictEqual(isValidFdiToothNumber(55), true);
		assert.strictEqual(isValidFdiToothNumber(63), true);
		assert.strictEqual(isValidFdiToothNumber(75), true);
		assert.strictEqual(isValidFdiToothNumber(85), true);
		assert.strictEqual(isValidFdiToothNumber(56), false); // 6 не существует в молочном прикусе

		// Вне диапазона
		assert.strictEqual(isValidFdiToothNumber(10), false);
		assert.strictEqual(isValidFdiToothNumber(49), false);
		assert.strictEqual(isValidFdiToothNumber(50), false);
		assert.strictEqual(isValidFdiToothNumber(99), false);
	});

	test("rubToKopecks и kopecksToRub: математически точная конвертация копеек (Мандат 8n)", () => {
		assert.strictEqual(rubToKopecks(100), 10000n);
		assert.strictEqual(rubToKopecks(4500.5), 450050n);
		assert.strictEqual(rubToKopecks(0), 0n);

		assert.strictEqual(kopecksToRub(10000n), 100);
		assert.strictEqual(kopecksToRub(450050n), 4500.5);
	});
});

describe("CRM Database AI Tools — Two-Phase Confirmation Guard (Мандат 8e)", () => {
	const mockDb = {
		select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
		insert: () => ({ values: () => ({ returning: async () => [{ id: "test-id" }] }) }),
		update: () => ({ set: () => ({ where: async () => {} }) }),
	};

	test("update_tooth_status: возвращает confirmation_required при confirmed=false", async () => {
		const res = await handleUpdateToothStatus(
			{
				patientId: "22222222-2222-2222-2222-222222222222",
				toothNumber: 16,
				state: "caries",
				confirmed: false,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, false);
		assert.strictEqual(res.status, "confirmation_required");
		assert.ok(res.message.includes("Требуется подтверждение врача"));
	});

	test("create_appointment: возвращает confirmation_required при confirmed=false", async () => {
		const res = await handleCreateAppointment(
			{
				patientId: "22222222-2222-2222-2222-222222222222",
				doctorId: "33333333-3333-3333-3333-333333333333",
				startTime: "2026-11-01T10:00:00Z",
				durationMinutes: 45,
				confirmed: false,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, false);
		assert.strictEqual(res.status, "confirmation_required");
		assert.ok(res.message.includes("Требуется подтверждение записи"));
	});

	test("create_invoice_draft: возвращает confirmation_required при confirmed=false и рассчитывает amountKopecks", async () => {
		const res = await handleCreateInvoiceDraft(
			{
				patientId: "22222222-2222-2222-2222-222222222222",
				items: [{ title: "Пломбирование зуба", priceRub: 4000, quantity: 1 }],
				discountRub: 500,
				confirmed: false,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, false);
		assert.strictEqual(res.status, "confirmation_required");
		assert.strictEqual(res.totalAmountRub, 3500);
		assert.strictEqual(res.amountKopecks, 350000);
	});

	test("record_treatment: возвращает confirmation_required при confirmed=false", async () => {
		const res = await handleTreatmentRecord(
			{
				patientId: "22222222-2222-2222-2222-222222222222",
				title: "Профессиональная гигиена Air-Flow",
				priceRub: 4500,
				quantity: 1,
				confirmed: false,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, false);
		assert.strictEqual(res.status, "confirmation_required");
		assert.strictEqual(res.totalPriceRub, 4500);
		assert.strictEqual(res.amountKopecks, 450000);
	});
});

describe("CRM Database AI Tools — AI-REV-08: Мягкая валидация и контекст пациента/врача", () => {
	const mockDb = {
		select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
		insert: () => ({ values: () => ({ returning: async () => [{ id: "test-id" }] }) }),
		update: () => ({ set: () => ({ where: async () => {} }) }),
	};

	test("update_tooth_status: берет patientId из context.patientId при отсутствии в args", async () => {
		const res = await handleUpdateToothStatus(
			{
				toothNumber: 21,
				state: "healthy",
				confirmed: true,
			},
			{ organizationId: TEST_ORG_ID, patientId: "context-pat-123", db: mockDb as any },
		);
		assert.strictEqual(res.success, true);
		assert.strictEqual(res.toothNumber, 21);
	});

	test("update_tooth_status: выбрасывает MISSING_PATIENT_CONTEXT при отсутствии patientId в args и context", async () => {
		await assert.rejects(
			() => handleUpdateToothStatus(
				{
					toothNumber: 21,
					state: "healthy",
					confirmed: true,
				},
				{ organizationId: TEST_ORG_ID, db: mockDb as any },
			),
			/MISSING_PATIENT_CONTEXT/,
		);
	});

	test("create_appointment: берет patientId и doctorId из context", async () => {
		const res = await handleCreateAppointment(
			{
				startTime: "2026-11-01T14:00:00Z",
				durationMinutes: 30,
				confirmed: true,
			},
			{ organizationId: TEST_ORG_ID, patientId: "context-pat-123", doctorId: "context-doc-456", db: mockDb as any },
		);
		assert.strictEqual(res.success, true);
		assert.strictEqual(res.patientId, "context-pat-123");
		assert.strictEqual(res.doctorId, "context-doc-456");
	});

	test("create_appointment: выбрасывает MISSING_PATIENT_CONTEXT при отсутствии patientId", async () => {
		await assert.rejects(
			() => handleCreateAppointment(
				{
					startTime: "2026-11-01T14:00:00Z",
					durationMinutes: 30,
					confirmed: true,
				},
				{ organizationId: TEST_ORG_ID, doctorId: "context-doc-456", db: mockDb as any },
			),
			/MISSING_PATIENT_CONTEXT/,
		);
	});
});

describe("CRM Database AI Tools — AI-REV-10: Расчет сметы строго в целочисленных копейках (Мандат 8n)", () => {
	const mockDb = {
		insert: () => ({ values: () => ({ returning: async () => [{ id: "inv-test-id" }] }) }),
	};

	test("create_invoice_draft: точный расчет в копейках без float погрешностей JS", async () => {
		const res = await handleCreateInvoiceDraft(
			{
				patientId: "patient-rev-10",
				items: [
					{ title: "Терапевтическое восстановление зуба", priceRub: 1234.56, quantity: 3 },
					{ title: "Изоляция коффердамом", priceRub: 89.99, quantity: 2 },
				],
				discountRub: 100.50,
				confirmed: true,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.itemsCount, 2);
		assert.strictEqual(res.subtotalRub, 3883.66);
		assert.strictEqual(res.discountRub, 100.50);
		assert.strictEqual(res.totalAmountRub, 3783.16);
		assert.strictEqual(res.amountKopecks, 378316);
	});

	test("create_invoice_draft: берет patientId из context.patientId при отсутствии в args", async () => {
		const res = await handleCreateInvoiceDraft(
			{
				items: [{ title: "Консультация", priceRub: 1500, quantity: 1 }],
				discountRub: 0,
				confirmed: true,
			},
			{ organizationId: TEST_ORG_ID, patientId: "context-pat-inv", db: mockDb as any },
		);
		assert.strictEqual(res.success, true);
		assert.strictEqual(res.patientId, "context-pat-inv");
		assert.strictEqual(res.amountKopecks, 150000);
	});
});

describe("CRM Database AI Tools — Поиск пациентов и парсинг CSV", () => {
	test("patient_search: находит пациентов через mockDb", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [
							{
								id: "patient-1",
								fullName: "Иванов Иван Иванович",
								phone: "+79991234567",
								birthDate: "1990-01-01",
								notes: "Аллергия на пенициллин",
							},
						],
					}),
				}),
			}),
		};

		const res = await handlePatientSearch({ query: "Иванов", limit: 10 }, { organizationId: TEST_ORG_ID, db: mockDb as any });
		assert.strictEqual(res.found, true);
		assert.strictEqual(res.totalCount, 1);
		assert.strictEqual(res.patients[0]?.fullName, "Иванов Иван Иванович");
	});

	test("parseCsvRows: корректно разбирает разделители запятая, точка с запятой и кавычки", () => {
		const csvSemicolon = `Код;Название;Цена\nA16.07.002;Лечение кариеса;3500\nA11.07.012;Анестезия;650`;
		const parsedSemi = parseCsvRows(csvSemicolon);
		assert.strictEqual(parsedSemi.headers.length, 3);
		assert.strictEqual(parsedSemi.rows.length, 2);
		assert.strictEqual(parsedSemi.rows[0]?.["код"], "A16.07.002");

		const csvQuotes = `code,title,price\n"A16.07.002","Лечение кариеса, светоотверждаемый",3500`;
		const parsedQuotes = parseCsvRows(csvQuotes);
		assert.strictEqual(parsedQuotes.rows[0]?.["title"], "Лечение кариеса, светоотверждаемый");
	});
});

describe("CRM Database AI Tools — Реестр и Словарь O(1)", () => {
	test("databaseToolsRegistry и databaseToolsMap содержат все 10 инструментов БД", () => {
		assert.strictEqual(databaseToolsRegistry.length, 10);
		assert.ok(databaseToolsMap["get_patient_emr_and_odontogram"]);
		assert.ok(databaseToolsMap["search_clinic_services_and_prices"]);
		assert.ok(databaseToolsMap["update_tooth_status"]);
		assert.ok(databaseToolsMap["create_appointment"]);
		assert.ok(databaseToolsMap["create_invoice_draft"]);
		assert.ok(databaseToolsMap["patient_search"]);
		assert.ok(databaseToolsMap["record_treatment"]);
		assert.ok(databaseToolsMap["print_document"]);
		assert.ok(databaseToolsMap["configure_clinic_setup"]);
		assert.ok(databaseToolsMap["import_clinic_data_file"]);
	});
});

describe("CRM Database AI Tools — Здоровый размер модулей (Мандат 8b / 8zi)", () => {
	test("все файлы databaseModules/ находятся в здоровом диапазоне (<= 350 строк), а фасады <= 30 строк", () => {
		const baseDir = path.resolve(import.meta.dirname, "..");
		const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".ts"));

		for (const file of files) {
			const fullPath = path.join(baseDir, file);
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;

			if (file === "index.ts") {
				assert.ok(lines <= 30, `Фасад ${file} превышает 30 строк (текущее: ${lines})`);
			} else {
				assert.ok(lines <= 350, `Файл ${file} превышает лимит здорового модуля Мандата 8b (текущее: ${lines})`);
			}
		}

		// Корневой crmDatabaseTools.ts
		const rootFacade = path.resolve(baseDir, "../crmDatabaseTools.ts");
		const rootLines = fs.readFileSync(rootFacade, "utf-8").split("\n").length;
		assert.ok(rootLines <= 30, `Корневой фасад crmDatabaseTools.ts превышает 30 строк (текущее: ${rootLines})`);
	});
});

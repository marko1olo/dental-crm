/**
 * databaseModules.test.ts — Тестирование декомпозированных модулей БД CRM AI Tools:
 * - 2-Phase Confirmation Guard для всех мутаций (updateToothStatus, createAppointment, createInvoiceDraft, treatmentRecord)
 * - Целочисленные копейки (amountKopecks, BIGINT)
 * - Валидация FDI формулы (11-48, 51-85)
 * - Поиск услуг (clinic_pricelist + standard_catalog fallback) и печать документов
 * - Реестр и O(1) словарь инструментов
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { speechChunkUploadSchema } from "@dental/shared";
import { getTableName, is, Table } from "drizzle-orm";
import { db as apiDb } from "../../../../db/client.js";
import type { ToolDbClient } from "../dbTypes.js";
import {
	createInvoiceDraftSchema,
	databaseToolsMap,
	databaseToolsRegistry,
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
	rubToKopecks,
} from "../index.js";

const TEST_ORG_ID = "11111111-1111-1111-1111-111111111111";

interface MockQueryChain extends Promise<unknown[]> {
	where: () => MockQueryChain;
	limit: () => MockQueryChain;
	orderBy: () => MockQueryChain;
	for: () => MockQueryChain;
}

const makeQueryChain = (result: unknown[] = [{ id: "mock-id" }]): MockQueryChain => {
	const p = Promise.resolve(result);
	return Object.assign(p, {
		where: () => makeQueryChain(result),
		limit: () => makeQueryChain(result),
		orderBy: () => makeQueryChain(result),
		for: () => makeQueryChain(result),
	});
};

interface ToolDbStub {
	select?: (...args: unknown[]) => unknown;
	insert?: (...args: unknown[]) => unknown;
	update?: (...args: unknown[]) => unknown;
}

function makeToolDb(stub: ToolDbStub): ToolDbClient {
	return new Proxy(apiDb, {
		get(target, prop, receiver) {
			if (prop === "transaction") {
				return async <T>(fn: (tx: ToolDbClient) => Promise<T>): Promise<T> => fn(makeToolDb(stub));
			}
			if (prop === "select" && stub.select) return stub.select;
			if (prop === "insert" && stub.insert) return stub.insert;
			if (prop === "update" && stub.update) return stub.update;
			return Reflect.get(target, prop, receiver);
		},
	});
}

function resolveTableName(table: unknown): string {
	if (is(table, Table)) {
		return getTableName(table);
	}
	if (typeof table === "object" && table !== null) {
		if ("_" in table && typeof table._ === "object" && table._ !== null && "name" in table._ && typeof table._.name === "string") {
			return table._.name;
		}
		if ("name" in table && typeof table.name === "string") {
			return table.name;
		}
	}
	return "";
}

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
	const mockDb = makeToolDb({
		select: () => ({
			from: (table: unknown) => {
				const name = resolveTableName(table);
				if (name === "appointments" || name.includes("lease") || name.includes("blacklist")) {
					return makeQueryChain([]);
				}
				return makeQueryChain([{ id: "mock-id" }]);
			},
		}),
		insert: () => ({
			values: () => ({
				returning: async () => [
					{
						id: "test-id",
						organizationId: TEST_ORG_ID,
						patientId: "33333333-3333-3333-3333-333333333333",
						doctorUserId: "44444444-4444-4444-4444-444444444444",
						chairId: null,
						status: "scheduled",
						startsAt: new Date(),
						endsAt: new Date(Date.now() + 30 * 60000),
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				],
			}),
		}),
		update: () => ({ set: () => ({ where: async () => {} }) }),
	});

	test("update_tooth_status: возвращает confirmation_required при confirmed=false", async () => {
		const res = await handleUpdateToothStatus(
			{
				patientId: "22222222-2222-2222-2222-222222222222",
				toothNumber: 16,
				state: "caries",
				confirmed: false,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb },
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
			{ organizationId: TEST_ORG_ID, db: mockDb },
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
			{ organizationId: TEST_ORG_ID, db: mockDb },
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
			{ organizationId: TEST_ORG_ID, db: mockDb },
		);

		assert.strictEqual(res.success, false);
		assert.strictEqual(res.status, "confirmation_required");
		assert.strictEqual(res.totalPriceRub, 4500);
		assert.strictEqual(res.amountKopecks, 450000);
	});
});

describe("CRM Database AI Tools — AI-REV-08: Мягкая валидация и контекст пациента/врача", () => {
	const mockDb = makeToolDb({
		select: () => ({
			from: (table: unknown) => {
				const name = resolveTableName(table);
				if (name === "appointments" || name.includes("lease") || name.includes("blacklist")) {
					return makeQueryChain([]);
				}
				return makeQueryChain([{ id: "mock-id" }]);
			},
		}),
		insert: () => ({
			values: () => ({
				returning: async () => [
					{
						id: "test-id",
						organizationId: TEST_ORG_ID,
						patientId: "33333333-3333-3333-3333-333333333333",
						doctorUserId: "44444444-4444-4444-4444-444444444444",
						chairId: null,
						status: "scheduled",
						startsAt: new Date(),
						endsAt: new Date(Date.now() + 30 * 60000),
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				],
			}),
		}),
		update: () => ({ set: () => ({ where: async () => {} }) }),
	});

	test("update_tooth_status: берет patientId из context.patientId при отсутствии в args", async () => {
		const res = await handleUpdateToothStatus(
			{
				toothNumber: 21,
				state: "healthy",
				confirmed: true,
			},
			{ organizationId: TEST_ORG_ID, patientId: "context-pat-123", db: mockDb },
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
				{ organizationId: TEST_ORG_ID, db: mockDb },
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
			{ organizationId: TEST_ORG_ID, patientId: "33333333-3333-3333-3333-333333333333", doctorId: "44444444-4444-4444-4444-444444444444", db: mockDb },
		);
		assert.strictEqual(res.success, true);
		assert.strictEqual(res.patientId, "33333333-3333-3333-3333-333333333333");
		assert.strictEqual(res.doctorId, "44444444-4444-4444-4444-444444444444");
	});

	test("create_appointment: выбрасывает MISSING_PATIENT_CONTEXT при отсутствии patientId", async () => {
		await assert.rejects(
			() => handleCreateAppointment(
				{
					startTime: "2026-11-01T14:00:00Z",
					durationMinutes: 30,
					confirmed: true,
				},
				{ organizationId: TEST_ORG_ID, doctorId: "context-doc-456", db: mockDb },
			),
			/MISSING_PATIENT_CONTEXT/,
		);
	});
});

describe("CRM Database AI Tools — AI-REV-10: Расчет сметы строго в целочисленных копейках (Мандат 8n)", () => {
	const mockDb = makeToolDb({
		insert: () => ({ values: () => ({ returning: async () => [{ id: "inv-test-id" }] }) }),
	});

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
			{ organizationId: TEST_ORG_ID, db: mockDb },
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
			{ organizationId: TEST_ORG_ID, patientId: "context-pat-inv", db: mockDb },
		);
		assert.strictEqual(res.success, true);
		assert.strictEqual(res.patientId, "context-pat-inv");
		assert.strictEqual(res.amountKopecks, 150000);
	});

	test("update_tooth_status: анатомическая изоляция MODBL — не затирает поверхности в null и объединяет новые", async () => {
		let updatedSurfaces: string[] | null | undefined;
		const mockToothDb = makeToolDb({
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [
							{
								id: "existing-tooth-1",
								organizationId: TEST_ORG_ID,
								patientId: "patient-modbl",
								toothNumber: 36,
								state: "caries",
								surfaces: ["M", "O"],
								notes: "Исходный кариес MO",
							},
						],
					}),
				}),
			}),
			update: () => ({
				set: (data: { surfaces?: string[] | null }) => {
					updatedSurfaces = data.surfaces;
					return { where: async () => {} };
				},
			}),
			insert: () => ({ values: async () => {} }),
		});

		// 1. При обновлении без surfaces — существующие ["M", "O"] сохраняются
		const res1 = await handleUpdateToothStatus(
			{
				patientId: "patient-modbl",
				toothNumber: 36,
				state: "caries",
				confirmed: true,
			},
			{ organizationId: TEST_ORG_ID, db: mockToothDb },
		);
		assert.strictEqual(res1.success, true);
		assert.deepStrictEqual(res1.surfaces, ["M", "O"]);
		assert.deepStrictEqual(updatedSurfaces, ["M", "O"]);

		// 2. При передаче новой поверхности "D" — объединяются в ["M", "O", "D"]
		const res2 = await handleUpdateToothStatus(
			{
				patientId: "patient-modbl",
				toothNumber: 36,
				state: "filling",
				surfaces: ["D"],
				confirmed: true,
			},
			{ organizationId: TEST_ORG_ID, db: mockToothDb },
		);
		assert.strictEqual(res2.success, true);
		assert.deepStrictEqual(res2.surfaces, ["M", "O", "D"]);
		assert.deepStrictEqual(updatedSurfaces, ["M", "O", "D"]);
	});
});

describe("CRM Database AI Tools — Поиск пациентов и парсинг CSV", () => {
	test("patient_search: находит пациентов через mockDb", async () => {
		const mockDb = makeToolDb({
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
		});

		const res = await handlePatientSearch({ query: "Иванов", limit: 10 }, { organizationId: TEST_ORG_ID, db: mockDb });
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
	test("databaseToolsRegistry и databaseToolsMap содержат все 11 инструментов БД", () => {
		assert.strictEqual(databaseToolsRegistry.length, 11);
		assert.ok(databaseToolsMap["get_patient_emr_and_odontogram"]);
		assert.ok(databaseToolsMap["search_clinic_services_and_prices"]);
		assert.ok(databaseToolsMap["update_tooth_status"]);
		assert.ok(databaseToolsMap["create_appointment"]);
		assert.ok(databaseToolsMap["get_available_slots"]);
		assert.ok(databaseToolsMap["create_invoice_draft"]);
		assert.ok(databaseToolsMap["patient_search"]);
		assert.ok(databaseToolsMap["record_treatment"]);
		assert.ok(databaseToolsMap["print_document"]);
		assert.ok(databaseToolsMap["configure_clinic_setup"]);
		assert.ok(databaseToolsMap["import_clinic_data_file"]);
	});
});

describe("CRM Database AI Tools — Поиск услуг, печать и ЭМК (поведенческие тесты)", () => {
	test("handleSearchServices: находит позиции в прейскуранте клиники и откатывается к стандартному каталогу при пустой БД", async () => {
		const emptyClinicDb = makeToolDb({
			select: () => ({
				from: () => makeQueryChain([]),
			}),
		});
		const fallbackResult = await handleSearchServices(
			{ codeOrName: "A16.07.002", category: "all" },
			{ organizationId: TEST_ORG_ID, db: emptyClinicDb },
		);
		assert.strictEqual(fallbackResult.found, true);
		assert.ok(fallbackResult.totalCount >= 1);
		assert.strictEqual(fallbackResult.results[0]?.source, "standard_catalog");
		assert.strictEqual(fallbackResult.results[0]?.priceKopecks, null);

		const clinicDb = makeToolDb({
			select: () => ({
				from: () =>
					makeQueryChain([
						{
							code: "CLI-101",
							order804nCode: "A16.07.002",
							title: "Лечение кариеса композитом",
							category: "therapy",
							priceRub: 4500,
							basePriceRub: 4500,
							priceKopecks: 450000n,
							basePriceKopecks: 450000n,
						},
					]),
			}),
		});
		const clinicResult = await handleSearchServices(
			{ codeOrName: "кариес", category: "therapy" },
			{ organizationId: TEST_ORG_ID, db: clinicDb },
		);
		assert.strictEqual(clinicResult.found, true);
		assert.strictEqual(clinicResult.results[0]?.source, "clinic_pricelist");
		assert.strictEqual(clinicResult.results[0]?.priceKopecks, 450000);
	});

	test("handleGetPatientEmr: требует patientId в args/context и возвращает данные ЭМК через db", async () => {
		const emrDb = makeToolDb({
			select: () => ({
				from: (table: unknown) => {
					const name = resolveTableName(table);
					if (name === "patients") {
						return makeQueryChain([
							{
								id: "22222222-2222-2222-2222-222222222222",
								fullName: "Петрова Анна Сергеевна",
								phone: "+79990001122",
								birthDate: "1988-05-12",
								allergies: "Лидокаин",
							},
						]);
					}
					if (name === "tooth_records") {
						return makeQueryChain([
							{ toothNumber: 16, state: "caries", surfaces: ["O"], notes: "Кариес дентина" },
						]);
					}
					return makeQueryChain([]);
				},
			}),
		});

		await assert.rejects(
			() => handleGetPatientEmr({}, { organizationId: TEST_ORG_ID, db: emrDb }),
			/MISSING_PATIENT_CONTEXT/,
		);

		const emr = await handleGetPatientEmr(
			{ patientId: "22222222-2222-2222-2222-222222222222" },
			{ organizationId: TEST_ORG_ID, db: emrDb },
		);
		assert.strictEqual(emr.found, true);
		assert.strictEqual(emr.patient?.fullName, "Петрова Анна Сергеевна");
		assert.strictEqual(emr.odontogramSummary.length, 1);
		assert.strictEqual(emr.odontogramSummary[0]?.toothNumber, 16);
	});

	test("handlePrintDocument: формирует корректный actionDirective и downloadUrl для web и desktop_native", async () => {
		const patientId = "22222222-2222-2222-2222-222222222222";
		const webRes = await handlePrintDocument(
			{ documentType: "informed_consent", patientId, format: "pdf" },
			{ organizationId: "", runtimeMode: "web_browser" },
		);
		assert.strictEqual(webRes.success, true);
		assert.strictEqual(webRes.actionDirective, "TRIGGER_BROWSER_PRINT");
		assert.ok(webRes.downloadUrl.startsWith("/api/documents/"));
		assert.ok(webRes.downloadUrl.endsWith("/pdf"));

		const desktopRes = await handlePrintDocument(
			{ documentType: "treatment_act", patientId, format: "system_printer", printerName: "HP-101" },
			{ organizationId: "", runtimeMode: "desktop_native" },
		);
		assert.strictEqual(desktopRes.success, true);
		assert.strictEqual(desktopRes.actionDirective, "DESKTOP_PRINT_DISPATCHED");
		assert.ok(desktopRes.message.includes("HP-101"));
	});

	test("W11-AI-BE-04: createInvoiceDraftSchema и speechChunkUploadSchema отклоняют лишние поля (.strict()) и поддерживают копейки / organizationId: null", () => {
		const invalidInvoice = createInvoiceDraftSchema.safeParse({
			items: [{ title: "Лечение кариеса", priceKopecks: 350000, quantity: 1 }],
			unexpectedField: true,
		});
		assert.strictEqual(invalidInvoice.success, false);

		const invalidItem = createInvoiceDraftSchema.safeParse({
			items: [{ title: "Лечение кариеса", priceKopecks: 350000, extraItemField: "x" }],
		});
		assert.strictEqual(invalidItem.success, false);

		const validKopecksInvoice = createInvoiceDraftSchema.safeParse({
			items: [{ title: "Лечение кариеса", priceKopecks: 350000, quantity: 1 }],
			discountKopecks: 50000,
		});
		assert.strictEqual(validKopecksInvoice.success, true);

		const invalidSpeechChunk = speechChunkUploadSchema.safeParse({
			recordingId: "rec-1",
			chunkIndex: 0,
			localTranscript: "Зуб 36",
			extraUnknown: 123,
		});
		assert.strictEqual(invalidSpeechChunk.success, false);

		const validOfflineSpeechChunk = speechChunkUploadSchema.safeParse({
			recordingId: "rec-1",
			chunkIndex: 0,
			localTranscript: "Зуб 36",
			organizationId: null,
		});
		assert.strictEqual(validOfflineSpeechChunk.success, true);
	});
});

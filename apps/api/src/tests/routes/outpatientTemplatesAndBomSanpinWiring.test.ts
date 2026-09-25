/**
 * outpatientTemplatesAndBomSanpinWiring.test.ts
 *
 * Mandate 8t: Compiles != Works.
 * Mandate 8s: Solo Doctor & Small Clinic Sovereignty (Zero Dead-Ends, soft overdraft).
 * Mandate 8e: 0 disabled buttons, non-blocking asynchronous sync.
 *
 * Verifies live route execution and integration contracts for:
 * 1. Outpatient Clinical Templates API (/api/clinical/outpatient-templates & /api/outpatient/templates).
 * 2. Warehouse BOM Visit Deduction API (/api/inventory/:orgId/deduct/visit & /api/inventory/deduct/visit).
 * 3. SanPiN Shift Auto-Closer Unified Registers API (/api/registers/sanpin & /api/registers/sanpin/shift-close).
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
	clinics,
	inventoryItems,
	organizations,
	outpatientTemplateCategories,
	outpatientTemplates,
	patients,
	sterilizerEquipments,
	temperatureHumidityEquipments,
	users,
} from "../../db/schema.js";
import { registerCashboxRoutes } from "../../routes/cashbox.js";
import { registerDayConfirmationRoutes } from "../../routes/dayConfirmations.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { registerOutpatientRoutes } from "../../routes/outpatient.js";
import { registerSanpinRoutes } from "../../routes/sanpin.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "outpatientTemplatesAndBomSanpinWiringTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const INVENTORY_ITEM_ID = fixtureUuid(NAMESPACE, 3);
const STERILIZER_ID = fixtureUuid(NAMESPACE, 4);
const EQUIP_ID = fixtureUuid(NAMESPACE, 5);
const VISIT_ID = fixtureUuid(NAMESPACE, 6);
const CLINIC_ID = fixtureUuid(NAMESPACE, 7);
const PATIENT_ID = fixtureUuid(NAMESPACE, 8);
const APPOINTMENT_ID = fixtureUuid(NAMESPACE, 9);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("Frontend-Backend API Wiring & Orphan Discovery Verification", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDbDown(error)) throw error;
			databaseReady = false;
		}

		if (databaseReady) {
			try {
				await withFixtureTenant(ORG_ID, async () => {
					await db.insert(organizations).values({
						id: ORG_ID,
						name: "Тестовая Клиника Валидации Маршрутов",
					});

					await db.insert(users).values({
						id: STAFF_ID,
						organizationId: ORG_ID,
						fullName: "Д-р Валидаторов И. И.",
						role: "admin",
					});

					// Seed an inventory item for BOM deduction
					await db.insert(inventoryItems).values({
						id: INVENTORY_ITEM_ID,
						organizationId: ORG_ID,
						name: "Анестетик Артикаин ИНИБСА",
						category: "anesthetics",
						unit: "карп.",
						currentQty: "5.000",
						stockQuantity: "5.000",
						minQty: "2.000",
						criticalThreshold: "1.000",
						pricePerUnit: "120.00",
						unitCostRub: "120.00",
					});

					// Seed sterilizer equipment for SanPiN
					await db.insert(sterilizerEquipments).values({
						id: STERILIZER_ID,
						organizationId: ORG_ID,
						name: "Автоклав Melag Vacuklav 23B+",
						brandModel: "Vacuklav 23B+",
						serialNumber: "SN-MELAG-9988",
						deviceType: "autoclave_steam",
						deviceClass: "autoclave_class_b",
						locationRoom: "ЦСО (Стерилизационная)",
						status: "active",
						isCommissioned: true,
					});

					// Seed temperature equipment for microclimate
					await db.insert(temperatureHumidityEquipments).values({
						id: EQUIP_ID,
						organizationId: ORG_ID,
						name: "Холодильник фармацевтический Pozis ХФ-250",
						equipmentType: "refrigerator_cold",
						location: "Кабинет №1",
						meterDeviceName: "Термометр ТЛ-4",
						targetTempMinCelsius: "2.00",
						targetTempMaxCelsius: "8.00",
						isActive: true,
					});

					// Seed clinic for appointments and timezones
					await db.insert(clinics).values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Главное отделение",
						address: "ул. Ленина, 10",
						timezone: "Europe/Moscow",
					});

					// Seed patient
					await db.insert(patients).values({
						id: PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Петров Петр Петрович",
						phone: "+79991112233",
					});

					// Seed appointment for tomorrow
					const tomorrow = new Date();
					tomorrow.setDate(tomorrow.getDate() + 1);
					tomorrow.setHours(12, 0, 0, 0);
					const tomorrowEnd = new Date(tomorrow);
					tomorrowEnd.setHours(13, 0, 0, 0);
					await db.insert(appointments).values({
						id: APPOINTMENT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						doctorUserId: STAFF_ID,
						status: "planned",
						startsAt: tomorrow,
						endsAt: tomorrowEnd,
					});
				});
			} catch (err) {
				if (isDbDown(err)) {
					databaseReady = false;
				} else {
					throw err;
				}
			}
		}

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerOutpatientRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await registerSanpinRoutes(app);
		await registerDayConfirmationRoutes(app);
		await registerCashboxRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch {}
	});

	// =========================================================================
	// 1. OUTPATIENT CLINICAL TEMPLATES API
	// =========================================================================
	describe("1. Outpatient Clinical Templates Wiring (/api/clinical/outpatient-templates)", () => {
		test("GET /api/clinical/outpatient-templates returns 200 with categories and templates", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/clinical/outpatient-templates?limit=10",
				headers: {
					"x-dente-staff-token": staffToken,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.ok(typeof data.count === "number");
			assert.ok(Array.isArray(data.categories));
			assert.ok(Array.isArray(data.templates));
		});

		test("GET /api/outpatient/templates alias returns consistent 200 payload", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/outpatient/templates?limit=5",
				headers: {
					"x-dente-staff-token": staffToken,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.ok(typeof data.count === "number");
			assert.ok(Array.isArray(data.templates));
		});

		test("Validation: rejects invalid query params with 400", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/clinical/outpatient-templates?limit=invalid_number",
			});

			assert.strictEqual(res.statusCode, 400);
			const data = JSON.parse(res.body);
			assert.strictEqual(data.error, "ValidationError");
		});
	});

	// =========================================================================
	// 2. WAREHOUSE VISIT BOM DEDUCTION & SOFT OVERDRAFT
	// =========================================================================
	describe("2. Warehouse Visit BOM Deduction & Soft Overdraft (/api/inventory/:orgId/deduct/visit)", () => {
		test("Rejects unauthenticated request without token or tenant with 401", async () => {
			const res = await app.inject({
				method: "POST",
				url: `/api/inventory/${ORG_ID}/deduct/visit`,
				headers: { "content-type": "application/json" },
				payload: {
					items: [{ inventory_item_id: INVENTORY_ITEM_ID, quantity: 1 }],
				},
			});

			assert.strictEqual(res.statusCode, 401);
		});

		test("Executes visit deduction with soft overdraft (Mandate 8e/8n: Never blocks doctor)", async () => {
			if (!databaseReady) return;

			// Request 10 units when only 5 are in stock
			const res = await app.inject({
				method: "POST",
				url: `/api/inventory/${ORG_ID}/deduct/visit`,
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				payload: {
					treatment_reference_id: VISIT_ID,
					clamp_at_zero: true,
					items: [{ inventory_item_id: INVENTORY_ITEM_ID, quantity: 10 }],
					notes: "Тестовое списание визита с мягким овердрафтом",
				},
			});

			// Must NEVER fail with 409 Conflict or 500! Must return 200 OK.
			assert.strictEqual(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.strictEqual(data.success, true);
			assert.strictEqual(data.is_overdraft, true);
			assert.ok(Array.isArray(data.warnings));
			assert.ok(data.warnings.length > 0);
		});

		test("Validation: rejects non-UUID item IDs with 400", async () => {
			const res = await app.inject({
				method: "POST",
				url: `/api/inventory/${ORG_ID}/deduct/visit`,
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				payload: {
					items: [{ inventory_item_id: "not-a-valid-uuid", quantity: 1 }],
				},
			});

			assert.strictEqual(res.statusCode, 400);
		});
	});

	// =========================================================================
	// 3. SANPIN SHIFT AUTO-CLOSER REGISTERS API
	// =========================================================================
	describe("3. SanPiN Shift Auto-Closer Registers (/api/registers/sanpin)", () => {
		test("GET /api/registers/sanpin returns 200 with daily register containers", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/registers/sanpin?date=2026-09-25",
				headers: {
					"x-dente-staff-token": staffToken,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.strictEqual(data.date, "2026-09-25");
			assert.ok(Array.isArray(data.sterilizationRecords));
			assert.ok(Array.isArray(data.psoRecords));
			assert.ok(Array.isArray(data.wasteRecords));
			assert.ok(Array.isArray(data.microclimateRecords));
		});

		test("POST /api/registers/sanpin commits shift auto-close records atomically", async () => {
			if (!databaseReady) return;

			const payload = {
				shiftDate: "2026-09-25",
				responsibleStaffName: "Д-р Валидаторов И. И.",
				form257Records: [
					{
						sterilizerEquipmentId: STERILIZER_ID,
						cycleNumber: 1,
						sterilizationProgram: "134C_standard",
						targetTemperatureC: 134,
						targetPressureBar: 2.1,
						exposureTimeMinutes: 5,
						packagingType: "kombinirovannye_pakety",
						packagingIntegrityVerified: true,
						chemicalIndicator5Verified: true,
						sporeBiologicalTestPassed: true,
						operatorStaffName: "Д-р Валидаторов И. И.",
						pouchBatchNumber: "BATCH-2026-09-25-01",
						packagedItemsCount: 4,
					},
				],
				psoRecords: [
					{
						testType: "azopiram",
						totalItemsTested: 5,
						negativeSamplesCount: 5,
						positiveBloodSamplesCount: 0,
						qualityTestPassed: true,
						operatorStaffName: "Д-р Валидаторов И. И.",
					},
				],
				wasteRecords: [
					{
						wasteClass: "B",
						wasteDescription: "Карпулы анестетиков и иглы после приёма",
						netWeightGrams: 350,
						packagesCount: 1,
						disinfectionMethod: "chemical",
						responsibleStaffName: "Д-р Валидаторов И. И.",
					},
				],
				microclimateRecords: [
					{
						equipmentId: EQUIP_ID,
						temperatureValueC: 4.5,
						isWithinNorm: true,
						controlTimeOfDay: "evening",
						loggedByStaffName: "Д-р Валидаторов И. И.",
					},
				],
			};

			const res = await app.inject({
				method: "POST",
				url: "/api/registers/sanpin",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				payload,
			});

			assert.strictEqual(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.strictEqual(data.success, true);
			assert.strictEqual(data.savedRecords.form257, 1);
			assert.strictEqual(data.savedRecords.pso, 1);
			assert.strictEqual(data.savedRecords.waste, 1);
			assert.strictEqual(data.savedRecords.microclimate, 1);
		});

		test("Validation: rejects missing required shift auto-close fields with 400", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/registers/sanpin",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				payload: {
					// Missing shiftDate
					responsibleStaffName: "Иванова А. С.",
				},
			});

			assert.strictEqual(res.statusCode, 400);
		});
	});

	// =========================================================================
	// 4. 1-CLICK BATCH TOMORROW REMINDERS DISPATCH (Mandate 8v: Zero Nurse Clicks)
	// =========================================================================
	describe("4. 1-Click Batch Tomorrow Reminders Dispatch (/api/schedule/tomorrow-reminders/dispatch)", () => {
		test("Dispatches tomorrow reminders in 1 click with quiet-hours override", async () => {
			if (!databaseReady) return;

			const res = await app.inject({
				method: "POST",
				url: "/api/schedule/tomorrow-reminders/dispatch",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				payload: {
					allowQuietHoursOverride: true,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.strictEqual(data.success, true);
			assert.ok(data.totalAppointments >= 1);
			assert.ok(data.dispatched >= 1);
			assert.ok(Array.isArray(data.results));
			assert.strictEqual(data.results[0].status, "dispatched");
		});

		test("GET /api/schedule/day-confirmations returns summary and planned rows", async () => {
			if (!databaseReady) return;

			const res = await app.inject({
				method: "GET",
				url: "/api/schedule/day-confirmations",
				headers: {
					"x-dente-staff-token": staffToken,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.ok(data.summary);
			assert.ok(data.summary.total >= 1);
			assert.ok(Array.isArray(data.rows));
		});
	});

	// =========================================================================
	// 5. 1-CLICK 54-FZ FISCAL SHIFT CLOSING (Mandate 8v: Zero Nurse Clicks & 54-FZ)
	// =========================================================================
	describe("5. 1-Click 54-FZ Fiscal Shift Closing (/api/fiscal/shift/close)", () => {
		test("Opens shift and closes shift atomically with full tender breakdown and Z-report", async () => {
			if (!databaseReady) return;

			// First open shift
			const openRes = await app.inject({
				method: "POST",
				url: "/api/fiscal/shift/open",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				payload: {
					cashierFullName: "Администратор Смены А. А.",
				},
			});
			assert.strictEqual(openRes.statusCode, 200);

			// Now close shift with 1-click kopeck-exact reconciliation
			const closeRes = await app.inject({
				method: "POST",
				url: "/api/fiscal/shift/close",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				payload: {
					cashierFullName: "Администратор Смены А. А.",
					zReportNumber: "Z-REP-2026-001",
					countedCashRub: 15000,
					incomeCashRub: 15000,
					incomeElectronicRub: 25000,
					incomeSbpRub: 10000,
					advanceOffsetRub: 5000,
					netRevenueRub: 50000,
					differenceRub: 0,
					isBalanced: true,
					reconciliation: {
						cashCounted: 15000,
						cashExpected: 15000,
						cardTotal: 25000,
						sbpTotal: 10000,
					},
				},
			});

			assert.strictEqual(closeRes.statusCode, 200);
			const data = JSON.parse(closeRes.body);
			assert.strictEqual(data.success, true);
			assert.ok(data.closedShiftsCount >= 1);
			assert.ok(Array.isArray(data.shifts));
			assert.strictEqual(data.reconciliation.differenceRub, 0);
			assert.strictEqual(data.reconciliation.isBalanced, true);
			assert.strictEqual(data.shifts[0].zReportData.countedCashRub, 15000);
			assert.strictEqual(data.shifts[0].zReportData.incomeSbpRub, 10000);
		});
	});
});

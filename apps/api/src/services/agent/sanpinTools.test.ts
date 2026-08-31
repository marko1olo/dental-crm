/**
 * sanpinTools.test.ts — Comprehensive Unit & Integration Test Suite for SanPiN 3.3686-21
 * Agent Tools: Kraft Pack Verification, Shelf Life Calculations, Autoclave Cycles,
 * Indicator Integrity, CSO Nurse Attribution, and Sterilization Test Logging with Tenant Isolation.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { getTableName } from "drizzle-orm";
import type { AgentContext } from "./context.js";
import { registerClinicalTools } from "./tools/clinicalTools.js";
import { ToolRegistry } from "./tools/registry.js";
import {
	recordSterilizationTestSchema,
	recordSterilizationTestTool,
	registerSanpinTools,
	verifyKraftPackSchema,
	verifyKraftPackTool,
} from "./tools/sanpinTools.js";

const ORG_ID_A = "00000000-0000-7000-8000-000000000001";
const ORG_ID_B = "00000000-0000-7000-8000-000000000099";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_NURSE_ID = "00000000-0000-7000-8000-000000000003";

function createMockContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerSanpinTools(registry, "sanpin");
	registerClinicalTools(registry, "clinical");

	return {
		organizationId: ORG_ID_A,
		clinicId: CLINIC_ID,
		userId: USER_NURSE_ID,
		sessionId: "test-session-sanpin",
		mode: "autonomous",
		permissions: [
			"clinical.read",
			"clinical.write",
			"sanpin.read",
			"sanpin.write",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. SanPiN 3.3686-21 Tools Registration & RBAC Gate", () => {
	test("verify_kraft_pack and record_sterilization_test are properly registered", () => {
		const registry = new ToolRegistry();
		registerSanpinTools(registry, "sanpin");
		registerClinicalTools(registry, "clinical");

		const sanpinVerify = registry.get("sanpin.verify_kraft_pack");
		assert.ok(sanpinVerify, "Must be registered as sanpin.verify_kraft_pack");
		assert.strictEqual(sanpinVerify.name, "verify_kraft_pack");
		assert.strictEqual(sanpinVerify.category, "read");
		assert.deepStrictEqual(sanpinVerify.permissions, ["clinical.read", "sanpin.read"]);

		const clinicalVerify = registry.get("clinical.verify_kraft_pack");
		assert.ok(clinicalVerify, "Must also be registered under clinical module");

		const sanpinRecord = registry.get("sanpin.record_sterilization_test");
		assert.ok(sanpinRecord, "Must be registered as sanpin.record_sterilization_test");
		assert.strictEqual(sanpinRecord.name, "record_sterilization_test");
		assert.strictEqual(sanpinRecord.category, "write");
		assert.deepStrictEqual(sanpinRecord.permissions, ["sanpin.write", "clinical.write"]);

		const clinicalRecord = registry.get("clinical.record_sterilization_test");
		assert.ok(clinicalRecord, "Must also be registered under clinical module");
	});

	test("registry chokepoint blocks invocation when permissions are missing", async () => {
		const ctxNoRead = createMockContext({
			permissions: ["schedule.read"], // Missing sanpin.read and clinical.read
		});

		const resultRead = await ctxNoRead.tools.call(
			ctxNoRead,
			"sanpin.verify_kraft_pack",
			{ packBarcode: "SANPIN:CSO-2026-08-30-01" },
		);
		assert.strictEqual(resultRead.ok, false);
		assert.ok(resultRead.error?.includes("permission denied"));

		const ctxNoWrite = createMockContext({
			permissions: ["clinical.read", "sanpin.read"], // Missing write permissions
		});

		const resultWrite = await ctxNoWrite.tools.call(
			ctxNoWrite,
			"sanpin.record_sterilization_test",
			{
				autoclaveId: "AUTOCLAVE-01",
				cycleNumber: 1,
				testType: "azopyram_pso",
				result: "passed",
			},
		);
		assert.strictEqual(resultWrite.ok, false);
		assert.ok(resultWrite.error?.includes("permission denied"));
	});
});

describe("2. Zod Schema Validation", () => {
	test("verifyKraftPackSchema requires at least one search key", () => {
		// Valid with barcode
		const v1 = verifyKraftPackSchema.safeParse({
			packBarcode: "SANPIN:CSO-2026-08-30-01",
		});
		assert.strictEqual(v1.success, true);

		// Valid with batch number
		const v2 = verifyKraftPackSchema.safeParse({
			packBatchNumber: "BATCH-2026-09-01",
		});
		assert.strictEqual(v2.success, true);

		// Valid with autoclave ID
		const v3 = verifyKraftPackSchema.safeParse({
			autoclaveId: "CSO-MELAG-23B",
		});
		assert.strictEqual(v3.success, true);

		// Invalid when empty object
		const vEmpty = verifyKraftPackSchema.safeParse({});
		assert.strictEqual(vEmpty.success, false);
	});

	test("recordSterilizationTestSchema validates test types, results, and integer cycles", () => {
		const validAzopyram = recordSterilizationTestSchema.safeParse({
			autoclaveId: "MELAG-VACUKLAV-01",
			cycleNumber: 3,
			testType: "azopyram_pso",
			result: "passed",
			testedByUserId: USER_NURSE_ID,
			notes: "Проба на 5 пинцетах отрицательная",
		});
		assert.strictEqual(validAzopyram.success, true);

		const validBiological = recordSterilizationTestSchema.safeParse({
			autoclaveId: "AUTOCLAVE-02",
			cycleNumber: 1,
			testType: "biological_spore",
			result: "passed",
		});
		assert.strictEqual(validBiological.success, true);

		// Invalid test type
		const invalidTestType = recordSterilizationTestSchema.safeParse({
			autoclaveId: "AUTOCLAVE-01",
			cycleNumber: 1,
			testType: "invalid_test_type",
			result: "passed",
		});
		assert.strictEqual(invalidTestType.success, false);

		// Invalid negative cycle
		const invalidCycle = recordSterilizationTestSchema.safeParse({
			autoclaveId: "AUTOCLAVE-01",
			cycleNumber: 0,
			testType: "chemical_indicator_class5",
			result: "passed",
		});
		assert.strictEqual(invalidCycle.success, false);
	});
});

describe("3. verify_kraft_pack: SanPiN 3.3686-21 Statutory Shelf Life & Cycle Rules", () => {
	test("returns sterile status for valid single kraft pack within 30-day window", async () => {
		const recentSterilization = new Date(Date.now() - 5 * 24 * 3600 * 1000); // 5 days ago
		const barcode = "SANPIN:CSO-2026-08-25-001";

		const mockDb: any = {
			select: () => ({
				from: () => ({
					leftJoin: () => ({
						where: () => ({
							orderBy: () => ({
								limit: () =>
									Promise.resolve([
										{
											id: "steril-log-001",
											organizationId: ORG_ID_A,
											deviceName: "Автоклав Melag Vacuklav 23B+",
											autoclaveId: "CSO-MELAG-01",
											cycleNumber: 2,
											temperatureCelsius: "134.5",
											pressureBar: "2.15",
											durationMin: 5,
											cycleMode: "B",
											itemsDescription: "Терапевтический лоток №4 (зеркало, зонд, гладилка)",
											operatorId: USER_NURSE_ID,
											operatorName: "Смирнова Елена Александровна (медсестра ЦСО)",
											barcode,
											status: "passed",
											passedIndicator: true,
											packagingType: "kraft_self_adhesive", // 30 days
											expiresAt: null,
											indicatorType: "class5_integrating",
											temperatureSet: "134.0",
											pressureSet: "2.10",
											timestamp: recentSterilization,
											createdAt: recentSterilization,
										},
									]),
							}),
						}),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = await verifyKraftPackTool.handler(ctx, { packBarcode: barcode });

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.status, "sterile");
		assert.strictEqual(res.warnings.length, 0);
		assert.ok(res.packDetails !== null);
		assert.strictEqual(res.packDetails.shelfLifeDays, 30);
		assert.strictEqual(res.packDetails.packagingTypeLabel, "Крафт-пакет (самоклеящийся)");
		assert.strictEqual(res.packDetails.passedIndicator, true);
		assert.strictEqual(res.packDetails.operatorName, "Смирнова Елена Александровна (медсестра ЦСО)");
	});

	test("returns expired status for single kraft pack exceeding 30 days", async () => {
		const oldSterilization = new Date(Date.now() - 35 * 24 * 3600 * 1000); // 35 days ago
		const barcode = "SANPIN:CSO-2026-07-20-002";

		const mockDb: any = {
			select: () => ({
				from: () => ({
					leftJoin: () => ({
						where: () => ({
							orderBy: () => ({
								limit: () =>
									Promise.resolve([
										{
											id: "steril-log-002",
											organizationId: ORG_ID_A,
											deviceName: "Автоклав Melag Vacuklav 23B+",
											autoclaveId: "CSO-MELAG-01",
											cycleNumber: 1,
											temperatureCelsius: "134.0",
											pressureBar: "2.10",
											durationMin: 5,
											cycleMode: "B",
											itemsDescription: "Хирургический набор элеваторов",
											operatorId: USER_NURSE_ID,
											operatorName: "Иванова Мария Петровна",
											barcode,
											status: "passed",
											passedIndicator: true,
											packagingType: "kraft_self_adhesive", // 30 days -> EXPIRED at 35 days
											expiresAt: null,
											indicatorType: "class5_integrating",
											timestamp: oldSterilization,
											createdAt: oldSterilization,
										},
									]),
							}),
						}),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = await verifyKraftPackTool.handler(ctx, { packBarcode: barcode });

		assert.strictEqual(res.isValid, false);
		assert.strictEqual(res.status, "expired");
		assert.ok(res.warnings.some((w) => w.includes("Истек допустимый срок сохранения стерильности")));
	});

	test("verifies 50-day shelf life for double heat-sealed kraft pack", async () => {
		const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 3600 * 1000); // 40 days ago
		const barcode = "SANPIN:CSO-HEATSEAL-003";

		const mockDb: any = {
			select: () => ({
				from: () => ({
					leftJoin: () => ({
						where: () => ({
							orderBy: () => ({
								limit: () =>
									Promise.resolve([
										{
											id: "steril-log-003",
											organizationId: ORG_ID_A,
											deviceName: "Автоклав Melag Vacuklav 23B+",
											autoclaveId: "CSO-MELAG-01",
											cycleNumber: 4,
											temperatureCelsius: "134.0",
											pressureBar: "2.10",
											durationMin: 5,
											cycleMode: "B",
											itemsDescription: "Имплантологический набор фрез",
											operatorId: USER_NURSE_ID,
											operatorName: "Смирнова Е.А.",
											barcode,
											status: "passed",
											passedIndicator: true,
											packagingType: "kraft_heat_sealed", // 50 days -> STERILE at 40 days
											expiresAt: null,
											indicatorType: "class6_emulating",
											timestamp: fortyDaysAgo,
											createdAt: fortyDaysAgo,
										},
									]),
							}),
						}),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = await verifyKraftPackTool.handler(ctx, { packBarcode: barcode });

		assert.strictEqual(res.isValid, true);
		assert.strictEqual(res.status, "sterile");
		assert.strictEqual(res.packDetails?.shelfLifeDays, 50);
		assert.strictEqual(res.packDetails?.packagingTypeLabel, "Крафт-пакет (термосварка)");
	});

	test("detects substandard sterilization cycle parameters (temperature / duration / pressure)", async () => {
		const recentDate = new Date(Date.now() - 2 * 24 * 3600 * 1000);
		const barcode = "SANPIN:CSO-DEFECT-CYCLE-004";

		const mockDb: any = {
			select: () => ({
				from: () => ({
					leftJoin: () => ({
						where: () => ({
							orderBy: () => ({
								limit: () =>
									Promise.resolve([
										{
											id: "steril-log-004",
											organizationId: ORG_ID_A,
											deviceName: "Автоклав 1",
											autoclaveId: "AUTOCLAVE-01",
											cycleNumber: 1,
											temperatureCelsius: "130.0", // Below 134°C
											pressureBar: "1.70", // Below 2.05 bar
											durationMin: 3, // Below 5 min
											cycleMode: "B",
											itemsDescription: "Наконечники турбинные",
											operatorId: null, // Missing nurse
											operatorName: null,
											barcode,
											status: "failed", // Cycle failed
											passedIndicator: false, // Indicator failed
											packagingType: "kraft_self_adhesive",
											expiresAt: null,
											indicatorType: "class4_multivariable",
											timestamp: recentDate,
											createdAt: recentDate,
										},
									]),
							}),
						}),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = await verifyKraftPackTool.handler(ctx, { packBarcode: barcode });

		assert.strictEqual(res.isValid, false);
		assert.strictEqual(res.status, "unverified");
		assert.ok(res.warnings.some((w) => w.includes("Недостаточная продолжительность")));
		assert.ok(res.warnings.some((w) => w.includes("Недостаточное давление пара")));
		assert.ok(res.warnings.some((w) => w.includes("индикатор не подтвердил")));
		assert.ok(res.warnings.some((w) => w.includes("не зафиксирована подпись / ФИО ответственной медсестры")));
	});

	test("returns unverified status when pack is not found in database", async () => {
		const mockDb: any = {
			select: () => ({
				from: () => ({
					leftJoin: () => ({
						where: () => ({
							orderBy: () => ({
								limit: () => Promise.resolve([]),
							}),
						}),
					}),
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });
		const res = await verifyKraftPackTool.handler(ctx, {
			packBarcode: "NON_EXISTENT_BARCODE",
		});

		assert.strictEqual(res.isValid, false);
		assert.strictEqual(res.status, "unverified");
		assert.strictEqual(res.packDetails, null);
		assert.ok(res.warnings[0].includes("не найдены в электронном журнале ЦСО"));
	});
});

describe("4. record_sterilization_test: PostgreSQL Persistence & Tenant Isolation", () => {
	test("records PSO azopyram test with tenant isolation", async () => {
		let insertedTable = "";
		let insertedValues: any = null;

		const mockDb: any = {
			insert: (table: any) => {
				insertedTable = getTableName(table);
				return {
					values: (vals: any) => {
						insertedValues = vals;
						return {
							returning: () => Promise.resolve([{ id: "pso-azopyram-uuid-1" }]),
						};
					},
				};
			},
		};

		const ctx = createMockContext({ db: mockDb, organizationId: ORG_ID_A });
		const result = await recordSterilizationTestTool.handler(ctx, {
			autoclaveId: "CSO-MELAG-01",
			cycleNumber: 1,
			testType: "azopyram_pso",
			result: "passed",
			testedByUserId: USER_NURSE_ID,
			notes: "Проверено 5 инструментов из партии 100 шт.",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.testId, "pso-azopyram-uuid-1");
		assert.strictEqual(result.logType, "pre_sterilization_cleaning_logs");
		assert.strictEqual(result.isApproved, true);
		assert.strictEqual(insertedTable, "pre_sterilization_cleaning_logs");

		// Strict tenant isolation verification
		assert.strictEqual(insertedValues.organizationId, ORG_ID_A);
		assert.strictEqual(insertedValues.testType, "azopyram");
		assert.strictEqual(insertedValues.isAzopyramNegative, true);
		assert.strictEqual(insertedValues.isBatchApproved, true);
		assert.strictEqual(insertedValues.operatorId, USER_NURSE_ID);
	});

	test("records PSO phenolphthalein test failure with rejection reason", async () => {
		let insertedValues: any = null;

		const mockDb: any = {
			insert: () => ({
				values: (vals: any) => {
					insertedValues = vals;
					return {
						returning: () => Promise.resolve([{ id: "pso-phenolphthalein-uuid-2" }]),
					};
				},
			}),
		};

		const ctx = createMockContext({ db: mockDb, organizationId: ORG_ID_A });
		const result = await recordSterilizationTestTool.handler(ctx, {
			autoclaveId: "CSO-MELAG-01",
			cycleNumber: 2,
			testType: "phenolphthalein_pso",
			result: "failed",
			testedByUserId: USER_NURSE_ID,
			notes: "Появилось розовое окрашивание на зеркалах",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isApproved, false);
		assert.strictEqual(insertedValues.isPhenolphthaleinNegative, false);
		assert.strictEqual(insertedValues.isBatchApproved, false);
		assert.ok(insertedValues.rejectionReason?.includes("щелочных компонентов"));
		assert.ok(result.sanpinRegulatoryNotice.includes("ВНИМАНИЕ: Положительная фенолфталеиновая проба"));
	});

	test("records chemical indicator class 5 in daily tests and sterilization logs", async () => {
		const insertedRecords: { table: string; values: any }[] = [];

		const mockDb: any = {
			insert: (table: any) => {
				const tableName = getTableName(table);
				return {
					values: (vals: any) => {
						insertedRecords.push({ table: tableName, values: vals });
						return {
							returning: () => Promise.resolve([{ id: "daily-test-uuid-3" }]),
						};
					},
				};
			},
		};

		const ctx = createMockContext({ db: mockDb, organizationId: ORG_ID_B });
		const result = await recordSterilizationTestTool.handler(ctx, {
			autoclaveId: "CSO-AUTOCLAVE-B",
			cycleNumber: 3,
			testType: "chemical_indicator_class5",
			result: "passed",
			testedByUserId: USER_NURSE_ID,
			notes: "Тест-полоска изменила цвет до эталона",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.organizationId, ORG_ID_B);
		assert.strictEqual(insertedRecords.length, 2);

		const dailyRecord = insertedRecords.find((r) => r.table === "autoclave_daily_tests");
		assert.ok(dailyRecord);
		assert.strictEqual(dailyRecord.values.organizationId, ORG_ID_B);
		assert.strictEqual(dailyRecord.values.testType, "helix_pcd");
		assert.strictEqual(dailyRecord.values.testResult, "passed");

		const sterilRecord = insertedRecords.find((r) => r.table === "sterilization_logs");
		assert.ok(sterilRecord);
		assert.strictEqual(sterilRecord.values.organizationId, ORG_ID_B);
		assert.strictEqual(sterilRecord.values.indicatorType, "class5_integrating");
		assert.strictEqual(sterilRecord.values.passedIndicator, true);
		assert.strictEqual(sterilRecord.values.status, "passed");
	});

	test("records biological spore control test and alerts on critical failure", async () => {
		const insertedRecords: { table: string; values: any }[] = [];

		const mockDb: any = {
			insert: (table: any) => {
				const tableName = getTableName(table);
				return {
					values: (vals: any) => {
						insertedRecords.push({ table: tableName, values: vals });
						return {
							returning: () => Promise.resolve([{ id: "bio-spore-uuid-4" }]),
						};
					},
				};
			},
		};

		const ctx = createMockContext({ db: mockDb, organizationId: ORG_ID_A });
		const result = await recordSterilizationTestTool.handler(ctx, {
			autoclaveId: "CSO-AUTOCLAVE-01",
			cycleNumber: 5,
			testType: "biological_spore",
			result: "failed",
			testedByUserId: USER_NURSE_ID,
			notes: "Обнаружено помутнение питательной среды при инкубации 55°C",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isApproved, false);
		assert.ok(result.sanpinRegulatoryNotice.includes("КРИТИЧЕСКАЯ АВАРИЯ: Обнаружен рост спор"));

		const sterilRecord = insertedRecords.find((r) => r.table === "sterilization_logs");
		assert.ok(sterilRecord);
		assert.strictEqual(sterilRecord.values.status, "failed");
		assert.strictEqual(sterilRecord.values.passedIndicator, false);
		assert.strictEqual(sterilRecord.values.indicatorType, "biological");
	});
});

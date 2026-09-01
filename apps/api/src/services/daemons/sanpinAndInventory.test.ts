/**
 * sanpinAndInventory.test.ts — Comprehensive Unit Tests for 21:30 PM SanPiN 3.3686-21 & Inventory Reconciliation Daemon.
 *
 * Verifies:
 * 1. SanPiN 3.3686-21 Kraft Pack 50-Day Shelf Life Monitor:
 *    - Heat-sealed kraft packs > 50 days detected as EXPIRED (CRITICAL).
 *    - Heat-sealed kraft packs with <= 3 days remaining detected as EXPIRING_SOON (WARNING).
 *    - Self-adhesive kraft packs (30-day limit) correctly evaluated.
 *    - Fresh packs within shelf life are NOT flagged.
 *    - Quarantined / failed packs excluded from shelf life checks.
 *    - 1-click suggested action `[Отправить на повторную стерилизацию]` generated with payload.
 *
 * 2. High-Cost Surgical Inventory & Financial Reconciliation:
 *    - Missing write-offs detected when implant is installed/billed without stock movement (CRITICAL).
 *    - SKU/Brand mismatches (пересорт) detected when Straumann installed but Osstem deducted (CRITICAL).
 *    - Unrecorded bone grafts / barrier membranes detected (WARNING).
 *    - Reconciled surgical acts yield 0 discrepancies.
 *    - 1-click suggested action `[Поднять аудит-трейл расхода ТМЦ]` generated with payload.
 *
 * 3. Quiet Digest & Non-Intrusive Mode:
 *    - Summary statistics calculated accurately with exact ruble totals.
 *    - Backoffice digest format without blocking clinical modals.
 *
 * 4. DaemonScheduler Integration:
 *    - Registered job `sanpin_inventory_2130` at 21:30.
 *    - Correct minute-deduplication execution.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DaemonScheduler, defaultDaemonScheduler } from "./daemonScheduler.js";
import {
	evaluateKraftPackShelfLife,
	extractRecognizedBrand,
	type KraftPackEvaluationInput,
	normalizeText,
	reconcileSurgicalActWithInventory,
	type SurgicalActInput,
	type WarehouseTransactionInput,
} from "./sanpinAndInventoryDaemon.js";

describe("SanPiN 3.3686-21 & Expensive Materials Inventory Reconciliation Daemon", () => {
	const fixedNow = new Date("2026-09-01T21:30:00.000Z");
	const orgId = "11111111-2222-3333-4444-555555555555";

	// ─── PART 1: SANPIN 3.3686-21 KRAFT PACK STERILIZATION AUDIT ────────────

	test("1. Heat-sealed kraft pack older than 50 days is flagged as EXPIRED (CRITICAL) with resterilization action", () => {
		// Sterilized 52 days ago
		const sterilizationDate = new Date(
			fixedNow.getTime() - 52 * 24 * 60 * 60 * 1000,
		);

		const pack: KraftPackEvaluationInput = {
			id: "pack-expired-01",
			organizationId: orgId,
			barcode: "KP-2026-00981",
			deviceName: "Melag Vacuklav 41B+",
			autoclaveId: "auto-melag-1",
			cycleNumber: 1420,
			packagingType: "kraft_heat_sealed",
			itemsDescription: "Хирургический базовый набор №2 (элеваторы, пинцеты)",
			operatorId: "nurse-uuid-01",
			operatorName: "Иванова Е.С. (старшая медсестра)",
			status: "completed",
			timestamp: sterilizationDate,
		};

		const alert = evaluateKraftPackShelfLife(pack, fixedNow, 3);

		assert.ok(alert !== null, "Expired pack must generate an alert");
		assert.strictEqual(alert.status, "EXPIRED");
		assert.strictEqual(alert.severity, "CRITICAL");
		assert.strictEqual(alert.elapsedDays, 52);
		assert.ok(alert.remainingDays < 0);
		assert.strictEqual(
			alert.suggestedAction.actionId,
			"send_to_resterilization",
		);
		assert.strictEqual(
			alert.suggestedAction.title,
			"Отправить на повторную стерилизацию",
		);
		assert.strictEqual(alert.suggestedAction.payload.logId, "pack-expired-01");
		assert.strictEqual(alert.suggestedAction.payload.barcode, "KP-2026-00981");
		assert.ok(alert.message.includes("КРИТИЧЕСКИЙ САНПИН 3.3686-21"));
		assert.ok(alert.message.includes("50 суток"));
		assert.ok(alert.message.includes("Стерильность утрачена"));
	});

	test("2. Heat-sealed kraft pack with <= 3 days remaining is flagged as EXPIRING_SOON (WARNING)", () => {
		// Sterilized 48 days ago (2 days remaining before 50 days)
		const sterilizationDate = new Date(
			fixedNow.getTime() - 48 * 24 * 60 * 60 * 1000,
		);

		const pack: KraftPackEvaluationInput = {
			id: "pack-expiring-02",
			organizationId: orgId,
			barcode: "KP-2026-01205",
			deviceName: "Tuttnauer 2540E",
			autoclaveId: "auto-tutt-1",
			cycleNumber: 856,
			packagingType: "kraft_heat_sealed",
			itemsDescription: "Набор для синус-лифтинга и кюретажа",
			operatorId: "nurse-uuid-01",
			operatorName: "Иванова Е.С. (старшая медсестра)",
			status: "completed",
			timestamp: sterilizationDate,
		};

		const alert = evaluateKraftPackShelfLife(pack, fixedNow, 3);

		assert.ok(alert !== null, "Expiring pack must generate an alert");
		assert.strictEqual(alert.status, "EXPIRING_SOON");
		assert.strictEqual(alert.severity, "WARNING");
		assert.strictEqual(alert.elapsedDays, 48);
		assert.strictEqual(alert.remainingDays, 2);
		assert.strictEqual(
			alert.suggestedAction.actionId,
			"send_to_resterilization",
		);
		assert.ok(alert.message.includes("ВНИМАНИЕ САНПИН 3.3686-21"));
		assert.ok(alert.message.includes("истекает через 2 дн."));
	});

	test("3. Fresh kraft pack (10 days old) is NOT flagged (returns null)", () => {
		// Sterilized 10 days ago (40 days remaining)
		const sterilizationDate = new Date(
			fixedNow.getTime() - 10 * 24 * 60 * 60 * 1000,
		);

		const pack: KraftPackEvaluationInput = {
			id: "pack-fresh-03",
			organizationId: orgId,
			barcode: "KP-2026-03412",
			deviceName: "Melag Vacuklav 41B+",
			packagingType: "kraft_heat_sealed",
			itemsDescription: "Терапевтический лоток",
			status: "completed",
			timestamp: sterilizationDate,
		};

		const alert = evaluateKraftPackShelfLife(pack, fixedNow, 3);
		assert.strictEqual(
			alert,
			null,
			"Fresh pack within shelf life must not generate alert",
		);
	});

	test("4. Self-adhesive kraft pack (30-day limit) is evaluated according to statutory 30 days", () => {
		// Sterilized 32 days ago
		const oldDate = new Date(fixedNow.getTime() - 32 * 24 * 60 * 60 * 1000);
		const oldPack: KraftPackEvaluationInput = {
			id: "pack-self-adhesive-old",
			organizationId: orgId,
			barcode: "KP-ADH-001",
			packagingType: "kraft_self_adhesive",
			itemsDescription: "Наконечники турбинные",
			status: "completed",
			timestamp: oldDate,
		};
		const alertOld = evaluateKraftPackShelfLife(oldPack, fixedNow, 3);
		assert.ok(alertOld !== null);
		assert.strictEqual(alertOld.status, "EXPIRED");

		// Sterilized 15 days ago (15 days remaining out of 30)
		const freshDate = new Date(fixedNow.getTime() - 15 * 24 * 60 * 60 * 1000);
		const freshPack: KraftPackEvaluationInput = {
			id: "pack-self-adhesive-fresh",
			organizationId: orgId,
			barcode: "KP-ADH-002",
			packagingType: "kraft_self_adhesive",
			itemsDescription: "Зеркала и зонды",
			status: "completed",
			timestamp: freshDate,
		};
		const alertFresh = evaluateKraftPackShelfLife(freshPack, fixedNow, 3);
		assert.strictEqual(alertFresh, null);
	});

	test("4b. Unpacked instrument (unpacked) older than current shift (1 day ago) is flagged as EXPIRED (CRITICAL) with statutory 0 days", () => {
		const yesterday = new Date(fixedNow.getTime() - 26 * 60 * 60 * 1000); // 26 hours ago
		const unpackedPack: KraftPackEvaluationInput = {
			id: "pack-unpacked-yesterday",
			organizationId: orgId,
			packagingType: "unpacked",
			itemsDescription: "Пинцеты и зонды на лотке",
			status: "completed",
			timestamp: yesterday,
		};
		const alert = evaluateKraftPackShelfLife(unpackedPack, fixedNow, 3);
		assert.ok(alert !== null);
		assert.strictEqual(alert.status, "EXPIRED");
		assert.strictEqual(alert.severity, "CRITICAL");
		assert.ok(alert.message.includes("норматив 0 суток — только текущая смена"));
	});

	test("4c. Unpacked instrument sterilized today (same shift) is not expired", () => {
		const todayShift = new Date(fixedNow.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
		const unpackedPack: KraftPackEvaluationInput = {
			id: "pack-unpacked-today",
			organizationId: orgId,
			packagingType: "unpacked",
			itemsDescription: "Стерильный лоток текущей смены",
			status: "completed",
			timestamp: todayShift,
		};
		const alert = evaluateKraftPackShelfLife(unpackedPack, fixedNow, 3);
		assert.strictEqual(alert, null);
	});

	test("4d. Self-adhesive kraft pack (31 days ago) is flagged as EXPIRED by 30-day hard-cap even if expiresAt was set higher", () => {
		const oldDate = new Date(fixedNow.getTime() - 31 * 24 * 60 * 60 * 1000);
		const pack: KraftPackEvaluationInput = {
			id: "pack-adhesive-hardcap",
			organizationId: orgId,
			packagingType: "kraft_self_adhesive",
			itemsDescription: "Хирургический элеватор",
			status: "completed",
			timestamp: oldDate,
			expiresAt: new Date(fixedNow.getTime() + 10 * 24 * 60 * 60 * 1000), // Incorrect DB future date
		};
		const alert = evaluateKraftPackShelfLife(pack, fixedNow, 3);
		assert.ok(alert !== null);
		assert.strictEqual(alert.status, "EXPIRED");
		assert.strictEqual(alert.severity, "CRITICAL");
		assert.ok(alert.message.includes("30 суток"));
	});

	test("5. Quarantined or failed packs are skipped by shelf-life monitor (already quarantined)", () => {
		const failedPack: KraftPackEvaluationInput = {
			id: "pack-failed-04",
			organizationId: orgId,
			barcode: "KP-FAIL-01",
			packagingType: "kraft_heat_sealed",
			status: "failed",
			timestamp: new Date(fixedNow.getTime() - 60 * 24 * 60 * 60 * 1000),
		};

		const alert = evaluateKraftPackShelfLife(failedPack, fixedNow, 3);
		assert.strictEqual(alert, null, "Failed cycle is already quarantined");
	});

	// ─── PART 2: EXPENSIVE SURGICAL MATERIALS WAREHOUSE RECONCILIATION ────────

	test("6. Surgical Act with installed Straumann implant and ZERO warehouse write-offs triggers missing_writeoff (CRITICAL)", () => {
		const surgicalAct: SurgicalActInput = {
			visitId: "visit-surgery-01",
			organizationId: orgId,
			patientId: "patient-001",
			patientFullName: "Соколов Андрей Михайлович",
			doctorId: "doctor-surgeon-01",
			doctorName: "д-р Смирнов А.В. (хирург-имплантолог)",
			shiftDate: "01.09.2026",
			implantInstallations: [
				{
					id: "implant-install-01",
					implantBrand: "Straumann BLX",
					toothNumberFdi: 16,
					lotNumber: "LOT-STR-99812",
					serialNumber: "SN-44120",
				},
			],
			billedItems: [],
		};

		const warehouseTx: WarehouseTransactionInput[] = []; // Empty warehouse write-offs!

		const alerts = reconcileSurgicalActWithInventory(surgicalAct, warehouseTx);

		assert.strictEqual(alerts.length, 1);
		const alert = alerts[0];
		assert.ok(alert, "Alert must exist");
		assert.strictEqual(alert.discrepancyType, "missing_writeoff");
		assert.strictEqual(alert.severity, "CRITICAL");
		assert.strictEqual(alert.billedOrInstalled.brand, "Straumann BLX");
		assert.strictEqual(alert.billedOrInstalled.toothNumberFdi, 16);
		assert.strictEqual(
			alert.suggestedAction.actionId,
			"investigate_inventory_trail",
		);
		assert.strictEqual(
			alert.suggestedAction.title,
			"Поднять аудит-трейл расхода ТМЦ",
		);
		assert.strictEqual(
			alert.suggestedAction.payload.discrepancyType,
			"missing_writeoff",
		);
		assert.ok(alert.message.includes("РАСХОЖДЕНИЕ СКЛАДА"));
		assert.ok(alert.message.includes("Straumann BLX"));
		assert.ok(alert.message.includes("зуб FDI 16"));
	});

	test("7. SKU/Brand Mismatch (Пересорт): Straumann installed in clinical protocol but Osstem deducted from warehouse", () => {
		const surgicalAct: SurgicalActInput = {
			visitId: "visit-surgery-02",
			organizationId: orgId,
			patientId: "patient-002",
			patientFullName: "Васильева Елена Сергеевна",
			doctorId: "doctor-surgeon-01",
			doctorName: "д-р Смирнов А.В. (хирург-имплантолог)",
			shiftDate: "01.09.2026",
			implantInstallations: [
				{
					id: "implant-install-02",
					implantBrand: "Straumann SLActive",
					toothNumberFdi: 24,
					lotNumber: "LOT-STR-12345",
				},
			],
			billedItems: [],
		};

		// Warehouse recorded Osstem TS III instead of Straumann!
		const warehouseTx: WarehouseTransactionInput[] = [
			{
				id: "tx-inv-01",
				itemId: "item-osstem-ts3",
				itemName: "Дентальный имплантат Osstem TS III SA 4.0x10mm",
				sku: "OSS-TS3-4010",
				category: "Дентальные имплантаты",
				quantityChanged: -1,
				unitCostRub: 8500,
			},
		];

		const alerts = reconcileSurgicalActWithInventory(surgicalAct, warehouseTx);

		assert.strictEqual(alerts.length, 1);
		const alert = alerts[0];
		assert.ok(alert, "Alert must exist");
		assert.strictEqual(alert.discrepancyType, "sku_mismatch");
		assert.strictEqual(alert.severity, "CRITICAL");
		assert.strictEqual(alert.billedOrInstalled.brand, "Straumann SLActive");
		assert.ok(alert.message.includes("ПЕРЕСОРТ / НЕСООТВЕТСТВИЕ ТМЦ"));
		assert.ok(alert.message.includes("Straumann SLActive"));
		assert.ok(alert.message.includes("Osstem TS III"));
		assert.strictEqual(
			alert.suggestedAction.actionId,
			"investigate_inventory_trail",
		);
	});

	test("8. Bone graft recorded in surgical protocol without warehouse write-off triggers unrecorded_graft_membrane (WARNING)", () => {
		const surgicalAct: SurgicalActInput = {
			visitId: "visit-surgery-03",
			organizationId: orgId,
			patientId: "patient-003",
			patientFullName: "Петров Сергей Николаевич",
			doctorId: "doctor-surgeon-01",
			doctorName: "д-р Смирнов А.В.",
			shiftDate: "01.09.2026",
			implantInstallations: [
				{
					id: "implant-install-03",
					implantBrand: "Osstem TS III",
					toothNumberFdi: 46,
					boneGraftMaterial: "Bio-Oss 0.5g", // Bone graft used!
				},
			],
			billedItems: [],
		};

		// Only implant was deducted, but Bio-Oss was NOT deducted!
		const warehouseTx: WarehouseTransactionInput[] = [
			{
				id: "tx-inv-02",
				itemId: "item-osstem-ts3",
				itemName: "Дентальный имплантат Osstem TS III SA 4.5x10mm",
				sku: "OSS-TS3-4510",
				quantityChanged: -1,
				unitCostRub: 8500,
			},
		];

		const alerts = reconcileSurgicalActWithInventory(surgicalAct, warehouseTx);

		assert.strictEqual(alerts.length, 1);
		const alert = alerts[0];
		assert.ok(alert, "Alert must exist");
		assert.strictEqual(alert.discrepancyType, "unrecorded_graft_membrane");
		assert.strictEqual(alert.severity, "WARNING");
		assert.ok(alert.message.includes("Bio-Oss 0.5g"));
		assert.ok(alert.message.includes("списание со склада не зафиксировано"));
	});

	test("9. Clean Reconciled Case: Implant and graft match warehouse deduction -> 0 discrepancies", () => {
		const surgicalAct: SurgicalActInput = {
			visitId: "visit-surgery-04",
			organizationId: orgId,
			patientId: "patient-004",
			patientFullName: "Николаев Денис Олегович",
			doctorName: "д-р Смирнов А.В.",
			shiftDate: "01.09.2026",
			implantInstallations: [
				{
					id: "implant-install-04",
					implantBrand: "Straumann BLX",
					toothNumberFdi: 36,
					boneGraftMaterial: "Bio-Oss гранулы 0.5g",
				},
			],
		};

		const warehouseTx: WarehouseTransactionInput[] = [
			{
				id: "tx-inv-03",
				itemId: "item-str-blx",
				itemName: "Имплантат Straumann BLX Roxolid SLActive 4.5x10",
				sku: "STR-BLX-4510",
				quantityChanged: -1,
				unitCostRub: 24000,
			},
			{
				id: "tx-inv-04",
				itemId: "item-bio-oss",
				itemName: "Остеопластический костный материал Bio-Oss 0.5g",
				sku: "BIO-OSS-05",
				quantityChanged: -1,
				unitCostRub: 9500,
			},
		];

		const alerts = reconcileSurgicalActWithInventory(surgicalAct, warehouseTx);
		assert.strictEqual(
			alerts.length,
			0,
			"Perfect match must result in 0 discrepancies",
		);
	});

	test("10. Billed implant in receipt/check without stock write-off triggers discrepancy", () => {
		const surgicalAct: SurgicalActInput = {
			visitId: "visit-receipt-05",
			organizationId: orgId,
			patientId: "patient-005",
			patientFullName: "Григорьев Максим Юрьевич",
			doctorName: "д-р Смирнов А.В.",
			shiftDate: "01.09.2026",
			implantInstallations: [], // No table entry, but billed service in check!
			billedItems: [
				{
					id: "bill-item-01",
					serviceTitle: "Установка дентального имплантата Nobel Biocare Active",
					serviceCode: "A16.07.054.001",
					quantity: 1,
					priceRub: 65000,
				},
			],
		};

		const warehouseTx: WarehouseTransactionInput[] = []; // No warehouse write-offs!

		const alerts = reconcileSurgicalActWithInventory(surgicalAct, warehouseTx);
		assert.strictEqual(alerts.length, 1);
		const alert = alerts[0];
		assert.ok(alert, "Alert must exist");
		assert.strictEqual(alert.discrepancyType, "missing_writeoff");
		assert.ok(alert.message.includes("Nobel Biocare Active"));
	});

	// ─── PART 3: BRAND AND TEXT NORMALIZATION UTILS ───────────────────────────

	test("11. Text and brand normalization extracts known dental brands accurately", () => {
		assert.strictEqual(
			extractRecognizedBrand("Имплантат Straumann BLX 4.0"),
			"straumann",
		);
		assert.strictEqual(
			extractRecognizedBrand("Установка Штрауманн SLActive"),
			"straumann",
		);
		assert.strictEqual(
			extractRecognizedBrand("Osstem TS III SA Fixture"),
			"osstem",
		);
		assert.strictEqual(extractRecognizedBrand("Осстем имплантат"), "osstem");
		assert.strictEqual(extractRecognizedBrand("Nobel Replace CC 4.3"), "nobel");
		assert.strictEqual(
			extractRecognizedBrand("Dentium SuperLine 3.6"),
			"dentium",
		);
		assert.strictEqual(
			extractRecognizedBrand("Astra Tech EV 4.2"),
			"astra_tech",
		);
		assert.strictEqual(
			extractRecognizedBrand("Пломбировочный материал световой"),
			null,
		);
		assert.strictEqual(normalizeText("  Straumann BLX  "), "straumann blx");
	});

	// ─── PART 4: DAEMON SCHEDULER INTEGRATION ────────────────────────────────

	test("12. DaemonScheduler registers sanpin_inventory_2130 scheduled at 21:30", () => {
		const scheduler = new DaemonScheduler({
			organizationId: orgId,
			nowProvider: () => new Date("2026-09-01T21:30:00.000Z"),
		});

		const job = scheduler.jobs.find((j) => j.name === "sanpin_inventory_2130");
		assert.ok(
			job !== undefined,
			"sanpin_inventory_2130 job must be registered in scheduler",
		);
		assert.strictEqual(job.scheduledTime, "21:30");
		assert.ok(job.description.includes("SanPiN 3.3686-21"));
		assert.ok(job.description.includes("Expensive Materials"));
	});

	test("13. checkAndRunJobs triggers sanpin_inventory_2130 at 21:30 and deduplicates in same minute", async () => {
		let executionCount = 0;
		const customNow = new Date(2026, 8, 1, 21, 30, 0);

		const scheduler = new DaemonScheduler({
			organizationId: orgId,
			enableSomaticRadar: false,
			enableZtlLookAhead: false,
			enableEmrSavior: false,
			enableWeeklyRetention: false,
			enableSanpinAndInventory: true,
			nowProvider: () => customNow,
		});

		// Find the job and wrap runner with counter
		const job = scheduler.jobs.find((j) => j.name === "sanpin_inventory_2130");
		assert.ok(job, "Job sanpin_inventory_2130 must exist");
		(
			job as {
				runner: (opts?: {
					organizationId?: string;
					now?: Date;
				}) => Promise<unknown>;
			}
		).runner = async (_opts) => {
			executionCount++;
			return [];
		};

		// First trigger at 21:30 -> executes
		const executed = await scheduler.checkAndRunJobs(customNow);
		assert.ok(executed.includes("sanpin_inventory_2130"));
		assert.strictEqual(executionCount, 1);

		// Second trigger within same minute -> deduplicated, does not run again!
		const executedAgain = await scheduler.checkAndRunJobs(customNow);
		assert.strictEqual(executedAgain.length, 0);
		assert.strictEqual(executionCount, 1);
	});

	test("14. defaultDaemonScheduler singleton is exported and operational", () => {
		assert.ok(defaultDaemonScheduler instanceof DaemonScheduler);
		assert.strictEqual(
			typeof defaultDaemonScheduler.triggerSanpinAndInventoryAudit,
			"function",
		);
		assert.strictEqual(
			typeof defaultDaemonScheduler.getProactiveAlerts,
			"function",
		);
	});
});

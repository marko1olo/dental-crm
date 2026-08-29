/**
 * transferM11Engine.test.ts — Unit Tests for Multi-Branch Architecture & Form M-11 Inter-Warehouse Transfer.
 *
 * Wave 21 — Domain 1.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	// Multi-Branch Engine
	validatePatientCrossBranchAccess,
	validateWarehouseBranchAccess,
	validateCashDeskBranchAccess,
	detectCrossBranchScheduleCollisions,
	calculateBranchPnL,
	calculateConsolidatedNetworkPnL,
	type BranchWarehouseRef,
	type BranchCashDeskRef,
	type DoctorBranchShift,
	type BranchPnLInput,
} from "../branches/multiBranchEngine.js";
import {
	// Inter-Warehouse Transfer Engine
	createTransferM11Draft,
	dispatchTransferM11,
	receiveTransferM11,
	cancelTransferM11,
	generateTransferM11DiscrepancyAct,
	renderTransferM11Html,
	numberToWordsRuKopecks,
	type TransferM11Document,
} from "../warehouse/transferM11Engine.js";

describe("Wave 21 — Domain 1: Multi-Branch & Inter-Warehouse Transfer Engine", () => {
	// ─── 1. MULTI-BRANCH TENANT ISOLATION & ACCESS GUARDS ──────────────────────

	describe("1. Multi-Branch Tenant & Facility Isolation", () => {
		it("allows cross-branch patient access within the same organization and blocks cross-tenant access", () => {
			const org1 = "org_dente_main";
			const org2 = "org_competitor";

			// Same network (Branch 1 -> Branch 2 in DENTE)
			assert.equal(
				validatePatientCrossBranchAccess({
					patientOrganizationId: org1,
					currentBranchOrganizationId: org1,
				}),
				true,
			);

			// Different network (DENTE -> Competitor)
			assert.equal(
				validatePatientCrossBranchAccess({
					patientOrganizationId: org1,
					currentBranchOrganizationId: org2,
				}),
				false,
			);
		});

		it("enforces branch-isolated warehouse access with central warehouse override", () => {
			const orgId = "org_dente";
			const branchNorth = "branch_north";
			const branchSouth = "branch_south";

			const localWarehouseNorth: BranchWarehouseRef = {
				id: "wh_north_main",
				branchId: branchNorth,
				organizationId: orgId,
				name: "Склад филиала Север",
				isCentralWarehouse: false,
				isActive: true,
			};

			const centralWarehouse: BranchWarehouseRef = {
				id: "wh_central",
				branchId: "branch_hq",
				organizationId: orgId,
				name: "Центральный логистический склад",
				isCentralWarehouse: true,
				isActive: true,
			};

			// Local warehouse accessed by its own branch -> Allowed
			assert.equal(
				validateWarehouseBranchAccess({
					warehouse: localWarehouseNorth,
					targetBranchId: branchNorth,
					targetOrganizationId: orgId,
				}),
				true,
			);

			// Local warehouse accessed by a different branch -> Blocked
			assert.equal(
				validateWarehouseBranchAccess({
					warehouse: localWarehouseNorth,
					targetBranchId: branchSouth,
					targetOrganizationId: orgId,
				}),
				false,
			);

			// Central warehouse accessed by any branch in the tenant -> Allowed
			assert.equal(
				validateWarehouseBranchAccess({
					warehouse: centralWarehouse,
					targetBranchId: branchSouth,
					targetOrganizationId: orgId,
				}),
				true,
			);

			// Warehouse accessed by another organization -> Blocked
			assert.equal(
				validateWarehouseBranchAccess({
					warehouse: centralWarehouse,
					targetBranchId: branchSouth,
					targetOrganizationId: "org_other",
				}),
				false,
			);
		});

		it("enforces strict physical cash desk isolation per branch", () => {
			const orgId = "org_dente";
			const branchEast = "branch_east";
			const branchWest = "branch_west";

			const cashDeskEast: BranchCashDeskRef = {
				id: "kkt_east_01",
				branchId: branchEast,
				organizationId: orgId,
				name: "Касса №1 (Восток)",
				isActive: true,
				currentCashBalanceKopecks: 1500000,
			};

			// Same branch access -> Allowed
			assert.equal(
				validateCashDeskBranchAccess({
					cashDesk: cashDeskEast,
					targetBranchId: branchEast,
					targetOrganizationId: orgId,
				}),
				true,
			);

			// Cross branch access -> Blocked
			assert.equal(
				validateCashDeskBranchAccess({
					cashDesk: cashDeskEast,
					targetBranchId: branchWest,
					targetOrganizationId: orgId,
				}),
				false,
			);
		});
	});

	// ─── 2. CROSS-BRANCH DOCTOR SCHEDULE COLLISION DETECTION ───────────────────

	describe("2. Cross-Branch Doctor Schedule Collision Engine", () => {
		it("detects exact schedule overlap when doctor is booked in two branches at same time", () => {
			const shifts: DoctorBranchShift[] = [
				{
					id: "shift_1",
					doctorId: "doc_petrov",
					doctorName: "Петров И.И.",
					organizationId: "org_dente",
					branchId: "branch_lenina",
					branchName: "Филиал на Ленина",
					shiftDate: "2026-09-01",
					startTime: "09:00",
					endTime: "14:00",
				},
				{
					id: "shift_2",
					doctorId: "doc_petrov",
					doctorName: "Петров И.И.",
					organizationId: "org_dente",
					branchId: "branch_mira",
					branchName: "Филиал на Мира",
					shiftDate: "2026-09-01",
					startTime: "13:00",
					endTime: "18:00",
				},
			];

			const report = detectCrossBranchScheduleCollisions(shifts, 30);

			assert.equal(report.hasCollisions, true);
			assert.equal(report.totalCollisions, 1);
			assert.equal(report.collisions[0]?.collisionType, "exact_overlap");
			assert.equal(report.collisions[0]?.overlapMinutes, 60); // 13:00 to 14:00 = 60 mins
			assert.match(report.collisions[0]!.messageRu, /одновременно назначен/);
		});

		it("detects insufficient transit time between consecutive cross-branch shifts", () => {
			const shifts: DoctorBranchShift[] = [
				{
					id: "shift_1",
					doctorId: "doc_smirnova",
					doctorName: "Смирнова Е.А.",
					organizationId: "org_dente",
					branchId: "branch_north",
					branchName: "Филиал Север",
					shiftDate: "2026-09-01",
					startTime: "09:00",
					endTime: "14:00",
				},
				{
					id: "shift_2",
					doctorId: "doc_smirnova",
					doctorName: "Смирнова Е.А.",
					organizationId: "org_dente",
					branchId: "branch_south",
					branchName: "Филиал Юг",
					shiftDate: "2026-09-01",
					startTime: "14:15", // Only 15 mins transit
					endTime: "19:00",
				},
			];

			const report = detectCrossBranchScheduleCollisions(shifts, 30); // 30 mins required

			assert.equal(report.hasCollisions, true);
			assert.equal(report.totalCollisions, 1);
			assert.equal(report.collisions[0]?.collisionType, "insufficient_transit_time");
			assert.match(report.collisions[0]!.messageRu, /Недостаточно времени на перемещение/);
		});

		it("returns zero collisions when doctor shifts have adequate transit time or are on different days", () => {
			const shifts: DoctorBranchShift[] = [
				{
					id: "shift_1",
					doctorId: "doc_ivanov",
					doctorName: "Иванов С.В.",
					organizationId: "org_dente",
					branchId: "branch_north",
					branchName: "Филиал Север",
					shiftDate: "2026-09-01",
					startTime: "08:00",
					endTime: "13:00",
				},
				{
					id: "shift_2",
					doctorId: "doc_ivanov",
					doctorName: "Иванов С.В.",
					organizationId: "org_dente",
					branchId: "branch_south",
					branchName: "Филиал Юг",
					shiftDate: "2026-09-01",
					startTime: "14:00", // 60 mins transit (>= 30 mins)
					endTime: "19:00",
				},
			];

			const report = detectCrossBranchScheduleCollisions(shifts, 30);
			assert.equal(report.hasCollisions, false);
			assert.equal(report.totalCollisions, 0);
		});
	});

	// ─── 3. CONSOLIDATED & BRANCH-LEVEL P&L FINANCIAL TELEMETRY ─────────────────

	describe("3. Multi-Branch & Consolidated Network P&L Engine", () => {
		it("calculates exact branch P&L with kopeck-exact margins and EBITDA", () => {
			const branchInput: BranchPnLInput = {
				branchId: "branch_1",
				branchName: "Филиал на Ленина",
				periodStart: "2026-08-01",
				periodEnd: "2026-08-31",
				revenues: {
					treatmentsKopecks: 200000000, // 2,000,000.00 ₽
					retailSalesKopecks: 10000000,  // 100,000.00 ₽
					insuranceDmsKopecks: 40000000, // 400,000.00 ₽
					depositReplenishmentsKopecks: 0,
					otherRevenuesKopecks: 0,
				},
				directCosts: {
					materialsCogsKopecks: 25000000,          // 250,000.00 ₽
					labWorksCogsKopecks: 35000000,           // 350,000.00 ₽
					doctorPieceRateSalariesKopecks: 60000000,// 600,000.00 ₽
				},
				operatingExpenses: {
					rentKopecks: 30000000,                   // 300,000.00 ₽
					fixedSalariesKopecks: 40000000,          // 400,000.00 ₽
					utilitiesKopecks: 5000000,               // 50,000.00 ₽
					equipmentLeaseKopecks: 10000000,         // 100,000.00 ₽
					marketingKopecks: 15000000,              // 150,000.00 ₽
					taxesFeesKopecks: 8000000,               // 80,000.00 ₽
					administrativeOtherKopecks: 2000000,     // 20,000.00 ₽
				},
			};

			const pnl = calculateBranchPnL(branchInput);

			// Gross Revenue: 2.0M + 0.1M + 0.4M = 2.5M ₽ (250,000,000 kop)
			assert.equal(pnl.grossRevenueKopecks, 250000000);
			assert.equal(pnl.grossRevenueRub, 2500000);

			// Direct Costs: 250k + 350k + 600k = 1.2M ₽ (120,000,000 kop)
			assert.equal(pnl.totalDirectCostsKopecks, 120000000);
			assert.equal(pnl.totalDirectCostsRub, 1200000);

			// Gross Profit: 2.5M - 1.2M = 1.3M ₽ (130,000,000 kop)
			assert.equal(pnl.grossProfitKopecks, 130000000);
			assert.equal(pnl.grossProfitRub, 1300000);
			assert.equal(pnl.grossMarginPercent, 52); // (1.3M / 2.5M) * 100 = 52%

			// Operating Expenses: 300k + 400k + 50k + 100k + 150k + 80k + 20k = 1.1M ₽ (110,000,000 kop)
			assert.equal(pnl.totalOperatingExpensesKopecks, 110000000);
			assert.equal(pnl.totalOperatingExpensesRub, 1100000);

			// Net Profit / EBITDA: 1.3M - 1.1M = 200,000.00 ₽ (20,000,000 kop)
			assert.equal(pnl.operatingProfitEbitdaKopecks, 20000000);
			assert.equal(pnl.netProfitKopecks, 20000000);
			assert.equal(pnl.netProfitRub, 200000);
			assert.equal(pnl.netProfitMarginPercent, 8); // (200k / 2.5M) * 100 = 8%
			assert.equal(pnl.isProfitable, true);
		});

		it("consolidates multi-branch network P&L with revenue shares and profit contributions", () => {
			const branch1: BranchPnLInput = {
				branchId: "branch_central",
				branchName: "Центральный филиал",
				periodStart: "2026-08-01",
				periodEnd: "2026-08-31",
				revenues: {
					treatmentsKopecks: 300000000, // 3,000,000 ₽
				},
				directCosts: {
					materialsCogsKopecks: 30000000,
					doctorPieceRateSalariesKopecks: 70000000,
				},
				operatingExpenses: {
					rentKopecks: 50000000,
					fixedSalariesKopecks: 50000000,
				},
			};

			const branch2: BranchPnLInput = {
				branchId: "branch_west",
				branchName: "Западный филиал",
				periodStart: "2026-08-01",
				periodEnd: "2026-08-31",
				revenues: {
					treatmentsKopecks: 100000000, // 1,000,000 ₽
				},
				directCosts: {
					materialsCogsKopecks: 15000000,
					doctorPieceRateSalariesKopecks: 25000000,
				},
				operatingExpenses: {
					rentKopecks: 20000000,
					fixedSalariesKopecks: 20000000,
				},
			};

			const consolidated = calculateConsolidatedNetworkPnL({
				organizationId: "org_dente_chain",
				periodStart: "2026-08-01",
				periodEnd: "2026-08-31",
				branches: [branch1, branch2],
			});

			assert.equal(consolidated.branchCount, 2);
			assert.equal(consolidated.activeBranchCount, 2);

			// Network Gross Revenue: 3.0M + 1.0M = 4.0M ₽ (400,000,000 kop)
			assert.equal(consolidated.networkGrossRevenueKopecks, 400000000);
			assert.equal(consolidated.networkGrossRevenueRub, 4000000);

			// Branch 1 Net Profit: 3.0M - 1.0M (direct) - 1.0M (opex) = 1.0M ₽ (100,000,000 kop)
			// Branch 2 Net Profit: 1.0M - 0.4M (direct) - 0.4M (opex) = 0.2M ₽ (20,000,000 kop)
			// Network Net Profit: 1.0M + 0.2M = 1.2M ₽ (120,000,000 kop)
			assert.equal(consolidated.networkNetProfitKopecks, 120000000);
			assert.equal(consolidated.networkNetProfitRub, 1200000);
			assert.equal(consolidated.networkNetProfitMarginPercent, 30); // 1.2M / 4.0M = 30%

			// Revenue shares: Branch 1 = 75%, Branch 2 = 25%
			assert.equal(consolidated.branchRevenueShares[0]?.sharePercent, 75);
			assert.equal(consolidated.branchRevenueShares[1]?.sharePercent, 25);

			// Top performing branch is Branch 1
			assert.equal(consolidated.topPerformingBranch?.branchId, "branch_central");
			assert.equal(consolidated.topPerformingBranch?.revenueKopecks, 300000000);
		});
	});

	// ─── 4. FORM M-11 INTER-WAREHOUSE TRANSFER LIFECYCLE ───────────────────────

	describe("4. Form M-11 Requirement-Waybill Lifecycle State Machine", () => {
		const sampleItems = [
			{
				inventoryItemId: "mat_filtek_a2",
				itemName: "Нанокомпозит Filtek Ultimate А2",
				nomenclatureCode: "НК-0042",
				unitName: "шприц",
				unitOkeiCode: "796",
				lotNumber: "LOT-2026-08",
				expirationDate: "2028-06-30",
				quantityRequested: 10,
				unitCostKopecks: 150000, // 1,500.00 ₽ / шт
			},
			{
				inventoryItemId: "mat_ultracain_ds",
				itemName: "Анестетик Ультракаин Д-С 1:100000",
				nomenclatureCode: "АН-0019",
				unitName: "упак",
				unitOkeiCode: "778",
				lotNumber: "LOT-2026-01",
				expirationDate: "2027-12-31",
				mdlpDataMatrix: "046012345678901234567890",
				quantityRequested: 5,
				unitCostKopecks: 420000, // 4,200.00 ₽ / упак
			},
		];

		it("creates DRAFT transfer document with correct totals in kopecks", () => {
			const draft = createTransferM11Draft({
				organizationId: "org_dente",
				documentNumber: "M11-2026-0001",
				documentDate: "2026-08-29",
				fromBranchId: "branch_hq",
				fromBranchName: "Центральный офис",
				fromWarehouseId: "wh_central",
				fromWarehouseName: "Центральный склад",
				toBranchId: "branch_north",
				toBranchName: "Филиал Север",
				toWarehouseId: "wh_north",
				toWarehouseName: "Склад филиала",
				requestedBy: {
					name: "Ковалева Н.В.",
					position: "Старшая медсестра филиала",
				},
				items: sampleItems,
				notes: "Пополнение запаса анестетиков и композитов",
			});

			assert.equal(draft.status, "DRAFT");
			assert.equal(draft.totalItemsCount, 2);
			assert.equal(draft.totalQuantityRequested, 15);
			assert.equal(draft.totalQuantityDispatched, 0);
			assert.equal(draft.totalQuantityAccepted, 0);
			assert.equal(draft.hasDiscrepancies, false);
			assert.equal(draft.fromWarehouseId, "wh_central");
			assert.equal(draft.toWarehouseId, "wh_north");
		});

		it("throws error if sender and receiver warehouse are identical", () => {
			assert.throws(() => {
				createTransferM11Draft({
					organizationId: "org_dente",
					documentNumber: "M11-ERR",
					documentDate: "2026-08-29",
					fromBranchId: "branch_hq",
					fromBranchName: "Центральный офис",
					fromWarehouseId: "wh_same",
					fromWarehouseName: "Склад",
					toBranchId: "branch_hq",
					toBranchName: "Центральный офис",
					toWarehouseId: "wh_same",
					toWarehouseName: "Склад",
					items: sampleItems,
				});
			}, /Склад-отправитель и склад-получатель не могут совпадать/);
		});

		it("dispatches items transitioning status DRAFT -> IN_TRANSIT with cost calculation", () => {
			const draft = createTransferM11Draft({
				organizationId: "org_dente",
				documentNumber: "M11-2026-0002",
				documentDate: "2026-08-29",
				fromBranchId: "branch_hq",
				fromBranchName: "Центральный офис",
				fromWarehouseId: "wh_central",
				fromWarehouseName: "Центральный склад",
				toBranchId: "branch_north",
				toBranchName: "Филиал Север",
				toWarehouseId: "wh_north",
				toWarehouseName: "Склад филиала",
				items: sampleItems,
			});

			const transit = dispatchTransferM11(draft, {
				dispatchedBy: {
					name: "Иванов С.В.",
					position: "Заведующий центральным складом",
				},
				dispatchedAt: "2026-08-29T10:00:00.000Z",
			});

			assert.equal(transit.status, "IN_TRANSIT");
			assert.equal(transit.totalQuantityDispatched, 15);
			// Cost: (10 * 1500.00) + (5 * 4200.00) = 15,000 + 21,000 = 36,000.00 ₽ (3,600,000 kop)
			assert.equal(transit.totalCostDispatchedKopecks, 3600000);
			assert.equal(transit.dispatchedBy?.name, "Иванов С.В.");
			assert.ok(transit.dispatchedAt);
		});

		it("receives items without discrepancy transitioning status IN_TRANSIT -> ACCEPTED", () => {
			const draft = createTransferM11Draft({
				organizationId: "org_dente",
				documentNumber: "M11-2026-0003",
				documentDate: "2026-08-29",
				fromBranchId: "branch_hq",
				fromBranchName: "Центральный офис",
				fromWarehouseId: "wh_central",
				fromWarehouseName: "Центральный склад",
				toBranchId: "branch_north",
				toBranchName: "Филиал Север",
				toWarehouseId: "wh_north",
				toWarehouseName: "Склад филиала",
				items: sampleItems,
			});

			const transit = dispatchTransferM11(draft, {
				dispatchedBy: { name: "Иванов С.В.", position: "Завскладом" },
			});

			const accepted = receiveTransferM11(transit, {
				acceptedBy: { name: "Петрова М.И.", position: "Материально ответственное лицо" },
				acceptedAt: "2026-08-29T12:00:00.000Z",
			});

			assert.equal(accepted.status, "ACCEPTED");
			assert.equal(accepted.hasDiscrepancies, false);
			assert.equal(accepted.totalQuantityAccepted, 15);
			assert.equal(accepted.totalCostAcceptedKopecks, 3600000);
			assert.equal(accepted.totalDiscrepancyCostKopecks, 0);
			assert.equal(accepted.acceptedBy?.name, "Петрова М.И.");
		});

		it("receives items with discrepancy transitioning status IN_TRANSIT -> DISCREPANCY and generates Discrepancy Act", () => {
			const draft = createTransferM11Draft({
				organizationId: "org_dente",
				documentNumber: "M11-2026-0004",
				documentDate: "2026-08-29",
				fromBranchId: "branch_hq",
				fromBranchName: "Центральный офис",
				fromWarehouseId: "wh_central",
				fromWarehouseName: "Центральный склад",
				toBranchId: "branch_north",
				toBranchName: "Филиал Север",
				toWarehouseId: "wh_north",
				toWarehouseName: "Склад филиала",
				items: sampleItems,
			});

			const transit = dispatchTransferM11(draft, {
				dispatchedBy: { name: "Иванов С.В.", position: "Завскладом" },
			});

			// Receiver accepted 8 composites instead of 10 (shortage of 2) and 6 anesthetics instead of 5 (surplus of 1)
			const discrepancyDoc = receiveTransferM11(transit, {
				acceptedBy: { name: "Петрова М.И.", position: "Завскладом филиала" },
				acceptedItems: [
					{
						inventoryItemId: "mat_filtek_a2",
						quantityAccepted: 8,
						discrepancyReason: "Бой и повреждение упаковки при транспортировке (2 шт)",
					},
					{
						inventoryItemId: "mat_ultracain_ds",
						quantityAccepted: 6,
						discrepancyReason: "Пересортица при отгрузке (излишек 1 упак)",
					},
				],
			});

			assert.equal(discrepancyDoc.status, "DISCREPANCY");
			assert.equal(discrepancyDoc.hasDiscrepancies, true);

			// Item 1: 8 accepted, diff = -2, cost diff = -2 * 1500 = -3000.00 ₽ (-300,000 kop)
			assert.equal(discrepancyDoc.items[0]?.quantityAccepted, 8);
			assert.equal(discrepancyDoc.items[0]?.discrepancyQuantity, -2);
			assert.equal(discrepancyDoc.items[0]?.discrepancyCostKopecks, -300000);

			// Item 2: 6 accepted, diff = +1, cost diff = +1 * 4200 = +4200.00 ₽ (+420,000 kop)
			assert.equal(discrepancyDoc.items[1]?.quantityAccepted, 6);
			assert.equal(discrepancyDoc.items[1]?.discrepancyQuantity, 1);
			assert.equal(discrepancyDoc.items[1]?.discrepancyCostKopecks, 420000);

			// Net discrepancy cost = 420,000 - 300,000 = 120,000 kop (+1,200.00 ₽)
			assert.equal(discrepancyDoc.totalDiscrepancyCostKopecks, 120000);

			// Generate formal Discrepancy Act
			const act = generateTransferM11DiscrepancyAct(discrepancyDoc);
			assert.equal(act.documentNumber, "АКТ-РАСХ-M11-2026-0004");
			assert.equal(act.totalShortageCostKopecks, 300000); // 3,000.00 ₽ shortage
			assert.equal(act.totalSurplusCostKopecks, 420000);  // 4,200.00 ₽ surplus
			assert.equal(act.netDiscrepancyCostKopecks, 120000);
			assert.equal(act.discrepancies.length, 2);
			assert.match(act.resolutionSummaryRu, /Выявлена недостача на сумму 3000.00 ₽ и излишек на сумму 4200.00 ₽/);
		});

		it("allows cancelling DRAFT or IN_TRANSIT transfer and forbids cancelling ACCEPTED transfer", () => {
			const draft = createTransferM11Draft({
				organizationId: "org_dente",
				documentNumber: "M11-2026-0005",
				documentDate: "2026-08-29",
				fromBranchId: "branch_hq",
				fromBranchName: "Центральный офис",
				fromWarehouseId: "wh_central",
				fromWarehouseName: "Центральный склад",
				toBranchId: "branch_north",
				toBranchName: "Филиал Север",
				toWarehouseId: "wh_north",
				toWarehouseName: "Склад филиала",
				items: sampleItems,
			});

			const cancelled = cancelTransferM11(draft, {
				cancellationReason: "Заявка отозвана заведующим филиала",
			});
			assert.equal(cancelled.status, "CANCELLED");
			assert.equal(cancelled.cancellationReason, "Заявка отозвана заведующим филиала");

			const acceptedDoc: TransferM11Document = {
				...draft,
				status: "ACCEPTED",
			};

			assert.throws(() => {
				cancelTransferM11(acceptedDoc, {
					cancellationReason: "Попытка отменить принятое",
				});
			}, /Невозможно отменить уже принятую накладную/);
		});
	});

	// ─── 5. RUSSIAN NUMBER TO WORDS & HTML RENDERING ───────────────────────────

	describe("5. Form M-11 Statutory Formatting & Print Layout", () => {
		it("converts kopecks to Russian words (Сумма прописью) accurately", () => {
			// Zero
			assert.equal(numberToWordsRuKopecks(0), "Ноль рублей 00 копеек");

			// 1 ruble 01 kopeck
			assert.equal(numberToWordsRuKopecks(101), "Один рубль 01 копейка");

			// 24 rubles 23 kopecks
			assert.equal(numberToWordsRuKopecks(2423), "Двадцать четыре рубля 23 копейки");

			// 1,500.50 ₽
			assert.equal(numberToWordsRuKopecks(150050), "Одна тысяча пятьсот рублей 50 копеек");

			// 36,000.00 ₽
			assert.equal(numberToWordsRuKopecks(3600000), "Тридцать шесть тысяч рублей 00 копеек");

			// 1,234,567.89 ₽
			assert.equal(
				numberToWordsRuKopecks(123456789),
				"Один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь рублей 89 копеек",
			);
		});

		it("renders compliant HTML print layout for Form M-11 (ОКУД 0315006)", () => {
			const draft = createTransferM11Draft({
				organizationId: "org_dente",
				documentNumber: "M11-2026-0042",
				documentDate: "2026-08-29",
				fromBranchId: "branch_hq",
				fromBranchName: "Центральный офис",
				fromWarehouseId: "wh_central",
				fromWarehouseName: "Центральный склад",
				toBranchId: "branch_north",
				toBranchName: "Филиал Север",
				toWarehouseId: "wh_north",
				toWarehouseName: "Склад филиала",
				items: [
					{
						inventoryItemId: "mat_filtek_a2",
						itemName: "Нанокомпозит Filtek Ultimate А2",
						nomenclatureCode: "НК-0042",
						unitName: "шприц",
						unitOkeiCode: "796",
						lotNumber: "LOT-2026-08",
						quantityRequested: 10,
						unitCostKopecks: 150000,
					},
				],
			});

			const transit = dispatchTransferM11(draft, {
				dispatchedBy: { name: "Иванов С.В.", position: "Заведующий центральным складом" },
			});

			const html = renderTransferM11Html(transit);

			assert.match(html, /0315006/); // OKUD code
			assert.match(html, /форма № М-11/i);
			assert.match(html, /M11-2026-0042/);
			assert.match(html, /Центральный офис/);
			assert.match(html, /Филиал Север/);
			assert.match(html, /Нанокомпозит Filtek Ultimate А2/);
			assert.match(html, /15000\.00 ₽/); // 10 * 1500 = 15000
			assert.match(html, /Пятнадцать тысяч рублей 00 копеек/);
			assert.match(html, /Заведующий центральным складом/);
		});
	});
});

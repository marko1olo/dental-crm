/**
 * multiBranchEngine.test.ts — Тесты доменного движка филиальной сети,
 * изоляции складов/ККМ, кросс-филиальных коллизий смен и консолидированного P&L.
 *
 * Домен 30: Сеть клиник, Франшиза, Филиалы, Межфилиальный трансфер.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	branchProfileSchema,
	calculateBranchPnL,
	calculateConsolidatedNetworkPnL,
	detectCrossBranchScheduleCollisions,
	validateCashDeskBranchAccess,
	validatePatientCrossBranchAccess,
	validateWarehouseBranchAccess,
	type BranchPnLInput,
	type DoctorBranchShift,
} from "../multiBranchEngine.js";

describe("Домен 30: Multi-Branch & Franchise Engine", () => {
	describe("1. Изоляция и доступность сущностей сети", () => {
		it("Пациент доступен во всех филиалах одной организации (сети)", () => {
			const orgId = "org-111";
			assert.strictEqual(
				validatePatientCrossBranchAccess({
					patientOrganizationId: orgId,
					currentBranchOrganizationId: orgId,
				}),
				true,
			);

			assert.strictEqual(
				validatePatientCrossBranchAccess({
					patientOrganizationId: orgId,
					currentBranchOrganizationId: "org-222",
				}),
				false,
			);
		});

		it("Склады физически изолированы по филиалам, за исключением центрального хаба", () => {
			const orgId = "org-1";
			const branch1 = "branch-north";
			const branch2 = "branch-south";

			// Локальный склад филиала 1
			const localWh = {
				id: "wh-1",
				branchId: branch1,
				organizationId: orgId,
				name: "Склад Север",
				isActive: true,
			};

			assert.strictEqual(
				validateWarehouseBranchAccess({
					warehouse: localWh,
					targetBranchId: branch1,
					targetOrganizationId: orgId,
				}),
				true,
			);

			assert.strictEqual(
				validateWarehouseBranchAccess({
					warehouse: localWh,
					targetBranchId: branch2,
					targetOrganizationId: orgId,
				}),
				false,
			);

			// Центральный распределительный склад (доступен всей сети)
			const centralWh = {
				id: "wh-central",
				branchId: branch1,
				organizationId: orgId,
				name: "Центральный хаб",
				isCentralWarehouse: true,
				isActive: true,
			};

			assert.strictEqual(
				validateWarehouseBranchAccess({
					warehouse: centralWh,
					targetBranchId: branch2,
					targetOrganizationId: orgId,
				}),
				true,
			);
		});

		it("Кассы 54-ФЗ и фискальные регистраторы строго привязаны к физическому отделению", () => {
			const orgId = "org-1";
			const branch1 = "branch-center";
			const branch2 = "branch-west";

			const cashDesk = {
				id: "cd-1",
				branchId: branch1,
				organizationId: orgId,
				name: "Касса 1 (Центр)",
				isActive: true,
				currentCashBalanceKopecks: 500000,
			};

			assert.strictEqual(
				validateCashDeskBranchAccess({
					cashDesk,
					targetBranchId: branch1,
					targetOrganizationId: orgId,
				}),
				true,
			);

			assert.strictEqual(
				validateCashDeskBranchAccess({
					cashDesk,
					targetBranchId: branch2,
					targetOrganizationId: orgId,
				}),
				false,
			);
		});
	});

	describe("2. Детектор кросс-филиальных коллизий смен врачей (detectCrossBranchScheduleCollisions)", () => {
		const docId = "doc-ivanov";
		const orgId = "org-1";

		it("Фиксирует точное пересечение времени (exact_overlap) в разных филиалах", () => {
			const shifts: DoctorBranchShift[] = [
				{
					id: "shift-1",
					doctorId: docId,
					doctorName: "Иванов И.И.",
					organizationId: orgId,
					branchId: "branch-a",
					branchName: "Север",
					shiftDate: "2026-11-25",
					startTime: "09:00",
					endTime: "14:00",
				},
				{
					id: "shift-2",
					doctorId: docId,
					doctorName: "Иванов И.И.",
					organizationId: orgId,
					branchId: "branch-b",
					branchName: "Юг",
					shiftDate: "2026-11-25",
					startTime: "13:00",
					endTime: "18:00",
				},
			];

			const report = detectCrossBranchScheduleCollisions(shifts);
			assert.strictEqual(report.hasCollisions, true);
			assert.strictEqual(report.totalCollisions, 1);
			assert.strictEqual(report.collisions[0]?.collisionType, "exact_overlap");
			assert.strictEqual(report.collisions[0]?.overlapMinutes, 60);
			assert.ok(report.collisions[0]?.messageRu.includes("одновременно назначен"));
		});

		it("Фиксирует нехватку времени на трансфер между филиалами (< 30 минут)", () => {
			const shifts: DoctorBranchShift[] = [
				{
					id: "shift-1",
					doctorId: docId,
					doctorName: "Иванов И.И.",
					organizationId: orgId,
					branchId: "branch-a",
					branchName: "Север",
					shiftDate: "2026-11-25",
					startTime: "09:00",
					endTime: "14:00",
				},
				{
					id: "shift-2",
					doctorId: docId,
					doctorName: "Иванов И.И.",
					organizationId: orgId,
					branchId: "branch-b",
					branchName: "Юг",
					shiftDate: "2026-11-25",
					startTime: "14:15", // зазор всего 15 минут вместо 30
					endTime: "19:00",
				},
			];

			const report = detectCrossBranchScheduleCollisions(shifts, 30);
			assert.strictEqual(report.hasCollisions, true);
			assert.strictEqual(report.totalCollisions, 1);
			assert.strictEqual(report.collisions[0]?.collisionType, "insufficient_transit_time");
			assert.ok(report.collisions[0]?.messageRu.includes("Недостаточно времени на перемещение"));
		});

		it("Пропускает смены с достаточным запасом времени на перемещение (>= 30 минут)", () => {
			const shifts: DoctorBranchShift[] = [
				{
					id: "shift-1",
					doctorId: docId,
					doctorName: "Иванов И.И.",
					organizationId: orgId,
					branchId: "branch-a",
					branchName: "Север",
					shiftDate: "2026-11-25",
					startTime: "09:00",
					endTime: "14:00",
				},
				{
					id: "shift-2",
					doctorId: docId,
					doctorName: "Иванов И.И.",
					organizationId: orgId,
					branchId: "branch-b",
					branchName: "Юг",
					shiftDate: "2026-11-25",
					startTime: "15:00", // зазор 60 минут > 30 минут
					endTime: "20:00",
				},
			];

			const report = detectCrossBranchScheduleCollisions(shifts, 30);
			assert.strictEqual(report.hasCollisions, false);
			assert.strictEqual(report.totalCollisions, 0);
		});

		it("Не ругается на смены в одном и том же филиале (обрабатываются локальным движком)", () => {
			const shifts: DoctorBranchShift[] = [
				{
					id: "shift-1",
					doctorId: docId,
					doctorName: "Иванов И.И.",
					organizationId: orgId,
					branchId: "branch-a",
					branchName: "Север",
					cabinetId: "cab-1",
					shiftDate: "2026-11-25",
					startTime: "09:00",
					endTime: "13:00",
				},
				{
					id: "shift-2",
					doctorId: docId,
					doctorName: "Иванов И.И.",
					organizationId: orgId,
					branchId: "branch-a",
					branchName: "Север",
					cabinetId: "cab-2",
					shiftDate: "2026-11-25",
					startTime: "14:00",
					endTime: "18:00",
				},
			];

			const report = detectCrossBranchScheduleCollisions(shifts, 30);
			assert.strictEqual(report.hasCollisions, false);
		});
	});

	describe("3. Консолидированный P&L сети клиник в копейках (BIGINT / integer)", () => {
		it("Считает операционный результат филиала и сети с точностью до копейки", () => {
			const branch1Input: BranchPnLInput = {
				branchId: "b1",
				branchName: "Филиал Центр",
				periodStart: "2026-11-01",
				periodEnd: "2026-11-30",
				revenues: {
					treatmentsKopecks: 100000000, // 1 000 000 руб
					retailSalesKopecks: 5000000,   // 50 000 руб
				},
				directCosts: {
					materialsCogsKopecks: 20000000, // 200 000 руб
					doctorPieceRateSalariesKopecks: 25000000, // 250 000 руб
				},
				operatingExpenses: {
					rentKopecks: 15000000, // 150 000 руб
					fixedSalariesKopecks: 10000000, // 100 000 руб
				},
			};

			const pnl1 = calculateBranchPnL(branch1Input);
			assert.strictEqual(pnl1.grossRevenueKopecks, 105000000);
			assert.strictEqual(pnl1.totalDirectCostsKopecks, 45000000);
			assert.strictEqual(pnl1.grossProfitKopecks, 60000000);
			assert.strictEqual(pnl1.totalOperatingExpensesKopecks, 25000000);
			assert.strictEqual(pnl1.netProfitKopecks, 35000000); // 350 000 руб чистая прибыль
			assert.strictEqual(pnl1.isProfitable, true);

			const branch2Input: BranchPnLInput = {
				branchId: "b2",
				branchName: "Филиал Запад",
				periodStart: "2026-11-01",
				periodEnd: "2026-11-30",
				revenues: {
					treatmentsKopecks: 50000000, // 500 000 руб
				},
				directCosts: {
					materialsCogsKopecks: 10000000, // 100 000 руб
				},
				operatingExpenses: {
					rentKopecks: 10000000, // 100 000 руб
					fixedSalariesKopecks: 10000000, // 100 000 руб
				},
			};

			const consolidated = calculateConsolidatedNetworkPnL({
				organizationId: "org-1",
				periodStart: "2026-11-01",
				periodEnd: "2026-11-30",
				branches: [branch1Input, branch2Input],
			});

			assert.strictEqual(consolidated.branchCount, 2);
			assert.strictEqual(consolidated.activeBranchCount, 2);
			assert.strictEqual(consolidated.networkGrossRevenueKopecks, 155000000); // 1.55 млн руб
			assert.strictEqual(consolidated.topPerformingBranch?.branchId, "b1");
			assert.strictEqual(consolidated.isNetworkProfitable, true);
		});
	});

	describe("4. Валидация Zod-схемы филиала (branchProfileSchema)", () => {
		it("Принимает корректный профиль филиала клиники", () => {
			const valid = {
				id: "branch-uuid-1",
				organizationId: "org-uuid-1",
				code: "BRANCH-NORTH",
				name: "Северное отделение",
				address: "г. Москва, ул. Ленина, д. 10",
				city: "Москва",
				phone: "+7 (495) 123-45-67",
				cabinetCount: 4,
			};

			const result = branchProfileSchema.safeParse(valid);
			assert.strictEqual(result.success, true);
			if (result.success) {
				assert.strictEqual(result.data.branchType, "branch");
				assert.strictEqual(result.data.status, "active");
			}
		});
	});
});

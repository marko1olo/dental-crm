/**
 * apps/api/src/tests/routes/cashbox.test.ts
 *
 * Comprehensive Integration Tests for Cash Box, Installments, 12 Expense Reasons & Installed Locks.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { db } from "../../db/client.js";
import {
	cashBoxes,
	labOrders,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerCashboxRoutes } from "../../routes/cashbox.js";
import { registerLabRoutes } from "../../routes/lab.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = createTenantTestApp();
	await registerCashboxRoutes(app);
	await registerLabRoutes(app);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId: string, role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("Cash Box V2, Installments & Lab Orders Financial Rails", () => {
	it("executes full lifecycle: 6 cash boxes, 12 reasons, shifts, money introduction, installments, lab pay & installed lock", async () => {
		const app = await buildTestApp();

		const orgId = fixtureUuid("cashboxTest", 1);
		const userId = fixtureUuid("cashboxTest", 2);
		const patientId = fixtureUuid("cashboxTest", 3);
		const labOrderId = fixtureUuid("cashboxTest", 4);

		await purgeFixtureOrganizations([orgId]);

		// 1. Setup isolated test organization and user under fixture tenant RLS
		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({
				id: orgId,
				name: `Финансовая Клиника Тест-${Date.now()}`,
			});
			await tx.insert(users).values({
				id: userId,
				organizationId: orgId,
				fullName: "Главный Врач / Кассир",
				role: "doctor",
				email: `cashier-${Date.now()}@dental.ru`,
			});
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Иванов Петр Сергеевич",
				phone: "+79991234567",
			});
		});

		try {
			const headers = createStaffHeaders(orgId, userId, "doctor");

			// 2. GET /api/cash/cash-box -> ensures 6 accounts exist and returns them
			const getBoxesRes = await app.inject({
				method: "GET",
				url: "/api/cash/cash-box",
				headers,
			});
			assert.equal(getBoxesRes.statusCode, 200);
			const boxesJson = getBoxesRes.json();
			assert.equal(boxesJson.total, 6);
			const mainBox = boxesJson.data.find((b: { type: string }) => b.type === "main");
			const cashlessBox = boxesJson.data.find((b: { type: string }) => b.type === "cashless");
			const accountBox = boxesJson.data.find((b: { type: string }) => b.type === "account");
			assert.ok(mainBox, "Main cash box should exist");
			assert.ok(cashlessBox, "Cashless box should exist");
			assert.ok(accountBox, "Account box should exist");

			// 3. GET /api/cash/expense-reasons -> ensures 12 canonical reasons exist
			const getReasonsRes = await app.inject({
				method: "GET",
				url: "/api/cash/expense-reasons",
				headers,
			});
			assert.equal(getReasonsRes.statusCode, 200);
			const reasonsJson = getReasonsRes.json();
			assert.equal(reasonsJson.total, 12);
			const reasonSalary = reasonsJson.data.find((r: { code: number }) => r.code === 1);
			const reasonUnderReport = reasonsJson.data.find((r: { code: number }) => r.code === 8);
			const reasonLab = reasonsJson.data.find((r: { code: number }) => r.code === 11);
			assert.equal(reasonSalary.isLocked, true, "Salary reason 1 must be locked");
			assert.equal(reasonUnderReport.isLocked, true, "Under-report reason 8 must be locked");
			assert.equal(reasonLab.isLocked, true, "Lab reason 11 must be locked");

			// 4. POST /api/cash/cash-box-all-open -> open shift across all boxes
			const openShiftsRes = await app.inject({
				method: "POST",
				url: "/api/cash/cash-box-all-open",
				headers,
				payload: {
					openedByUserId: userId,
				},
			});
			assert.equal(openShiftsRes.statusCode, 200);
			const openShiftsJson = openShiftsRes.json();
			assert.equal(openShiftsJson.success, true);
			assert.equal(openShiftsJson.openedShiftsCount, 6);

			// 5. POST /api/cash/cash-introduction -> deposit 10,000 RUB into main cash box
			const introRes = await app.inject({
				method: "POST",
				url: "/api/cash/cash-introduction",
				headers,
				payload: {
					cashBoxId: mainBox.id,
					amountRub: 10000,
					reasonText: "Внесение разменного фонда",
				},
			});
			assert.equal(introRes.statusCode, 200);
			const introJson = introRes.json();
			assert.equal(introJson.cashBox.balanceRub, 10000);
			assert.equal(introJson.operation.operationType, "introduction");

			// 6. POST /api/cash/cash-withdrawal -> withdraw 3,000 RUB
			const withRes = await app.inject({
				method: "POST",
				url: "/api/cash/cash-withdrawal",
				headers,
				payload: {
					cashBoxId: mainBox.id,
					amountRub: 3000,
					reasonText: "Инкассация в банк",
				},
			});
			assert.equal(withRes.statusCode, 200);
			const withJson = withRes.json();
			assert.equal(withJson.cashBox.balanceRub, 7000);

			// 7. POST /api/cash/cash-withdrawal -> try to withdraw more than balance (100,000 RUB)
			const withFailRes = await app.inject({
				method: "POST",
				url: "/api/cash/cash-withdrawal",
				headers,
				payload: {
					cashBoxId: mainBox.id,
					amountRub: 100000,
				},
			});
			assert.equal(withFailRes.statusCode, 400);

			// 8. POST /api/installments -> create 6-month installment contract for 60,000 RUB (down payment 15,000 RUB)
			const instRes = await app.inject({
				method: "POST",
				url: "/api/installments",
				headers,
				payload: {
					patientId,
					totalAmountRub: 60000,
					downPaymentRub: 15000,
					monthsCount: 6,
					notes: "Рассрочка на ортодонтию",
				},
			});
			assert.equal(instRes.statusCode, 201);
			const instJson = instRes.json();
			assert.equal(instJson.success, true);
			assert.equal(instJson.contract.totalAmountRub, 60000);
			assert.equal(instJson.tranches.length, 6);

			// 9. POST /api/installments/tranches/:id/pay -> pay 1st tranche
			const firstTranche = instJson.tranches[0];
			const payTrancheRes = await app.inject({
				method: "POST",
				url: `/api/installments/tranches/${firstTranche.id}/pay`,
				headers,
				payload: {
					cashBoxId: cashlessBox.id,
				},
			});
			assert.equal(payTrancheRes.statusCode, 200);
			const payTrancheJson = payTrancheRes.json();
			assert.equal(payTrancheJson.tranche.isPaid, true);
			assert.equal(payTrancheJson.contract.paidAmountRub, firstTranche.amountRub);

			// 10. Lab Order Pay via Article 11 & Mark Installed Lock
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(labOrders).values({
					id: labOrderId,
					organizationId: orgId,
					patientId,
					doctorId: userId,
					doctorName: "Главный Врач / Кассир",
					secureToken: `LO-TEST-${Date.now()}`,
					priceRub: 5000,
					toothFdi: "26",
					material: "Цирконий",
					status: "received",
				});
			});

			// Put some funds into account box to pay lab
			await app.inject({
				method: "POST",
				url: "/api/cash/cash-introduction",
				headers,
				payload: {
					cashBoxId: accountBox.id,
					amountRub: 10000,
				},
			});

			// Pay lab order from account cash box
			const payLabRes = await app.inject({
				method: "POST",
				url: `/api/lab-orders/${labOrderId}/pay`,
				headers,
				payload: {
					cashBoxId: accountBox.id,
				},
			});
			assert.equal(payLabRes.statusCode, 200);
			const payLabJson = payLabRes.json();
			assert.equal(payLabJson.cashOperation.reasonCode, 11, "Must use canonical expense reason 11");
			assert.ok(payLabJson.labOrder.paidFromCashOperationId);

			// Mark lab order as installed (locks it permanently)
			const installRes = await app.inject({
				method: "POST",
				url: `/api/lab-orders/${labOrderId}/mark-installed`,
				headers,
				payload: {
					clinicalNotes: "Коронка идеально зафиксирована на цемент Fuji I.",
				},
			});
			assert.equal(installRes.statusCode, 200);
			const installJson = installRes.json();
			assert.equal(installJson.labOrder.isLockedInstalled, true);
			assert.equal(installJson.labOrder.status, "completed");

			// Subsequent attempt to edit the lab order must be rejected with 409
			const patchAttemptRes = await app.inject({
				method: "PATCH",
				url: `/api/lab/orders/${labOrderId}`,
				headers,
				payload: {
					notes: "Попытка взломать наряд после установки",
				},
			});
			assert.equal(patchAttemptRes.statusCode, 409, "Locked installed lab order must reject edits with 409");

			// 11. POST /api/cash/cash-box-all-closing -> close shifts and get Z-reports
			const closeShiftsRes = await app.inject({
				method: "POST",
				url: "/api/cash/cash-box-all-closing",
				headers,
				payload: {
					closedByUserId: userId,
					zReportNumber: "Z-DAILY-END",
				},
			});
			assert.equal(closeShiftsRes.statusCode, 200);
			const closeShiftsJson = closeShiftsRes.json();
			assert.equal(closeShiftsJson.success, true);
			assert.equal(closeShiftsJson.closedShiftsCount, 6);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});

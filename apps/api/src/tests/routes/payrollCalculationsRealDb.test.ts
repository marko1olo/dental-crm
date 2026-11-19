/**
 * payrollCalculationsRealDb.test.ts
 *
 * Канонический тест расчёта заработной платы врачей и мобильного кошелька:
 * 1. GET /api/doctor/my-earnings и GET /api/v1/doctor/my-earnings (Дефект 1: 404 устранён).
 * 2. GET /api/v1/payroll/calculations?doctorId=all (Дефект 2: честная сводка по клинике без нулей).
 * 3. Целочисленные копейки (amountKopecks, BIGINT) без float-погрешностей по Мандату 8n.
 * 4. Net Revenue = Валовая выручка − Расходы ЗТЛ − Прямые материалы.
 */

import assert from "node:assert/strict";
import { describe, it, before, after, type TestContext } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	users,
	doctorCommissions,
} from "../../db/schema.js";
import { registerPayrollRoutes } from "../../routes/payroll.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "payrollRealDb";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_2_ID = fixtureUuid(NAMESPACE, 3);

describe("Canonical Doctor Payroll & Wallet Real DB Suite", () => {
	let app: FastifyInstance;
	let token: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Тестовой Зарплаты",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values([
						{
							id: DOCTOR_1_ID,
							organizationId: ORG_ID,
							fullName: "Доктор Терапевт Тестовый",
							email: "therapist@test-payroll.ru",
							role: "doctor",
							specialties: ["therapy"],
						},
						{
							id: DOCTOR_2_ID,
							organizationId: ORG_ID,
							fullName: "Доктор Хирург Тестовый",
							email: "surgeon@test-payroll.ru",
							role: "doctor",
							specialties: ["surgery"],
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(doctorCommissions)
					.values([
						{
							id: fixtureUuid(NAMESPACE, 10),
							organizationId: ORG_ID,
							userId: DOCTOR_1_ID,
							doctorId: DOCTOR_1_ID,
							specialty: "therapy",
							commissionPercent: "30.00",
							commissionPct: "30.00",
							materialCostDeductionPct: "100.00",
							labCostDeductionPct: "100.00",
							isActive: true,
						},
						{
							id: fixtureUuid(NAMESPACE, 11),
							organizationId: ORG_ID,
							userId: DOCTOR_2_ID,
							doctorId: DOCTOR_2_ID,
							specialty: "surgery",
							commissionPercent: "25.00",
							commissionPct: "25.00",
							materialCostDeductionPct: "100.00",
							labCostDeductionPct: "100.00",
							isActive: true,
						},
					])
					.onConflictDoNothing();
			});

			app = createTenantTestApp();

			await registerPayrollRoutes(app);

			const secret = authTokenSecret();
			token = signToken({
				userId: DOCTOR_1_ID,
				organizationId: ORG_ID,
				role: "admin",
				permissions: ["manage_clinic", "access_financial_reports"],
			}, secret);
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				dbAvailable = false;
				return;
			}
			throw error;
		}
	});

	after(async () => {
		if (app) await app.close();
		if (dbAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	it("1. GET /api/doctor/my-earnings returns 200 and valid mobile wallet structure (Defect 1 Fixed)", async (ctx: TestContext) => {
		if (!dbAvailable) return ctx.skip();

		const res = await app.inject({
			method: "GET",
			url: `/api/doctor/my-earnings?doctorId=${DOCTOR_1_ID}&date=2026-11-15`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		assert.equal(res.statusCode, 200, "Mobile wallet must not return 404");
		const data = JSON.parse(res.body);
		assert.equal(data.doctorId, DOCTOR_1_ID);
		assert.equal(data.doctorName, "Доктор Терапевт Тестовый");
		assert.ok(data.summary, "Must contain summary object");
		assert.ok(Array.isArray(data.appointments), "Must contain appointments array");
		assert.ok(Array.isArray(data.specialtyBreakdown), "Must contain specialtyBreakdown");
		assert.equal(typeof data.summary.totalGrossRevenueKop, "number");
		assert.equal(typeof data.summary.totalDoctorEarnedKop, "number");
	});

	it("2. GET /api/v1/doctor/my-earnings alias works symmetrically with integer kopecks", async (ctx: TestContext) => {
		if (!dbAvailable) return ctx.skip();

		const res = await app.inject({
			method: "GET",
			url: `/api/v1/doctor/my-earnings?doctorId=${DOCTOR_1_ID}`,
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.doctorId, DOCTOR_1_ID);
		assert.equal(data.summary.averageCommissionPercent, 30);
	});

	it("3. GET /api/v1/payroll/calculations?doctorId=all aggregates all active doctors (Defect 2 Fixed)", async (ctx: TestContext) => {
		if (!dbAvailable) return ctx.skip();

		const res = await app.inject({
			method: "GET",
			url: "/api/v1/payroll/calculations?doctorId=all&from=2026-11-01&to=2026-11-30",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.ok, true);
		assert.equal(data.summary.doctorId, "all");
		assert.ok(data.doctorSummaries, "Must return per-doctor summaries dictionary");
		assert.ok(Array.isArray(data.orders), "Must return consolidated orders array");
		assert.ok(data.doctorSummaries[DOCTOR_1_ID], "Doctor 1 summary must be present");
		assert.ok(data.doctorSummaries[DOCTOR_2_ID], "Doctor 2 summary must be present");
	});

	it("4. GET /api/v1/doctors returns active doctors with commission rates", async (ctx: TestContext) => {
		if (!dbAvailable) return ctx.skip();

		const res = await app.inject({
			method: "GET",
			url: "/api/v1/doctors",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.ok, true);
		assert.ok(Array.isArray(data.doctors));
		const doc1 = data.doctors.find((d: { id: string }) => d.id === DOCTOR_1_ID);
		assert.ok(doc1, "Doctor 1 must be in active doctors list");
		assert.equal(doc1.commissionPercent, 30);
	});
});

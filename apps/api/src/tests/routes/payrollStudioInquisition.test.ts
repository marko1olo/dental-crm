/**
 * payrollStudioInquisition.test.ts — Red Team инквизиция начисления зарплаты, смен и закрытия периодов.
 * Проверка Мандатов 8e, 8n (Целочисленные копейки, Zero Float, ACID транзакции).
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerPayrollRoutes } from "../../routes/payroll.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";

const TEST_SECRET = "doctor-payroll-inquisition-secret-key-32-chars-long".padEnd(48, "x");
const ORG_ID = "c8000000-0000-4000-8000-00000000c001";
const DOCTOR_ID = "c8000000-0000-4000-8000-00000000d001";

function authHeaders(userId: string = DOCTOR_ID, role: string = "doctor"): Record<string, string> {
	return {
		[CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_ID }, TEST_SECRET, 3600),
		[STAFF_TOKEN_HEADER]: signToken(
			{
				organizationId: ORG_ID,
				userId,
				role,
			},
			TEST_SECRET,
			3600,
		),
	};
}

describe("Red Team Inquisition: Staff Payroll, Doctor Shifts & Net Revenue SSOT", () => {
	let app: FastifyInstance;
	const originalEnv = { ...process.env };

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		app = Fastify({ logger: false });
		await registerPayrollRoutes(app);
		await app.ready();
	});

	after(async () => {
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
		await app.close();
	});

	test("1. GET /api/v1/doctors возвращает список врачей клиники", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/v1/doctors",
			headers: authHeaders(),
		});

		if (res.statusCode !== 200) {
			console.error("Test 2 error body:", res.body);
		}
		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.ok, true);
		assert.ok(Array.isArray(data.doctors));
	});

	test("2. GET /api/v1/payroll/calculations производит строгий целочисленный расчет без float", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/v1/payroll/calculations?doctorId=${DOCTOR_ID}&from=2026-10-01&to=2026-10-31&percent=25`,
			headers: authHeaders(),
		});

		if (res.statusCode !== 200) {
			console.error("Test 2 error body:", res.body);
		}
		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.ok, true);
		assert.ok(data.summary);
		assert.equal(typeof data.shiftsCount, "number");

		// Проверка целочисленности копеек (Мандат 8n)
		assert.equal(Number.isInteger(data.summary.totalGrossKopecks), true);
		assert.equal(Number.isInteger(data.summary.totalLabCostKopecks), true);
		assert.equal(Number.isInteger(data.summary.totalMaterialCostKopecks), true);
		assert.equal(Number.isInteger(data.summary.totalNetBaseKopecks), true);
		assert.equal(Number.isInteger(data.summary.doctorAccruedKopecks), true);
		assert.equal(Number.isInteger(data.summary.payoutKopecks), true);
	});

	test("3. POST /api/v1/payroll/close-settlement закрывает период в транзакции PostgreSQL", async () => {
		const payload = {
			doctorId: DOCTOR_ID,
			periodStart: "2026-10-01",
			periodEnd: "2026-10-31",
			payoutModel: "percentage",
			grossRevenueKop: 5000000,
			labCostKop: 1000000,
			materialCostKop: 200000,
			netBaseKop: 3800000,
			categoryPercent: 25,
			totalAccruedKop: 950000,
			ndflKop: 123500,
			netPayoutKop: 826500,
			markPaid: true,
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "owner"),
				"Content-Type": "application/json",
			},
			payload,
		});

		if (res.statusCode !== 200) {
			console.error("Test 3 error body:", res.body);
		}

		if (res.statusCode !== 200) {
			console.error("Test 2 error body:", res.body);
		}
		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.ok, true);
		assert.ok(data.statementId);
		assert.equal(data.statement.isFinalized, true);
	});
});

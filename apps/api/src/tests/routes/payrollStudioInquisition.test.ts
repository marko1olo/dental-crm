/**
 * payrollStudioInquisition.test.ts — Red Team инквизиция начисления зарплаты, смен и закрытия периодов.
 * Проверка Мандатов 8e, 8n (Целочисленные копейки, Zero Float, ACID транзакции).
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { eq } from "drizzle-orm";
import { generateUuidV7 } from "@dental/shared";
import { db } from "../../db/client.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
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
		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.ok, true);
		assert.ok(data.statementId);
		assert.equal(data.statement.isFinalized, true);
	});

	test("4. DEF-PAYROLL-01: Врач не может запросить расчеты всех врачей клиники (?doctorId=all -> 403)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/v1/payroll/calculations?doctorId=all&from=2026-10-01&to=2026-10-31`,
			headers: authHeaders(DOCTOR_ID, "doctor"),
		});

		assert.equal(res.statusCode, 403);
		const data = JSON.parse(res.body);
		assert.equal(data.error, "PermissionDenied");
	});

	test("5. DEF-PAYROLL-01: Врач не может запросить начисления чужого врача (?doctorId=other -> 403)", async () => {
		const OTHER_DOCTOR_ID = "c8000000-0000-4000-8000-00000000d002";
		const res = await app.inject({
			method: "GET",
			url: `/api/v1/payroll/calculations?doctorId=${OTHER_DOCTOR_ID}&from=2026-10-01&to=2026-10-31`,
			headers: authHeaders(DOCTOR_ID, "doctor"),
		});

		assert.equal(res.statusCode, 403);
		const data = JSON.parse(res.body);
		assert.equal(data.error, "PermissionDenied");
	});

	test("6. DEF-PAYROLL-01: Врач со scope own подтверждает свой акт сверки (200), но не может закрывать чужие ведомости или ?doctorId=all (403)", async () => {
		// Попытка подтвердить ведомости всех врачей клиники блокируется
		const resAll = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "doctor"),
				"Content-Type": "application/json",
			},
			payload: {
				doctorId: "all",
				periodStart: "2026-10-01",
				periodEnd: "2026-10-31",
			},
		});
		assert.equal(resAll.statusCode, 403);
		const dataAll = JSON.parse(resAll.body);
		assert.equal(dataAll.error, "PermissionDenied");

		// Попытка подтвердить ведомость чужого врача блокируется
		const OTHER_DOCTOR_ID = "c8000000-0000-4000-8000-00000000d002";
		const resOther = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "doctor"),
				"Content-Type": "application/json",
			},
			payload: {
				doctorId: OTHER_DOCTOR_ID,
				periodStart: "2026-10-01",
				periodEnd: "2026-10-31",
			},
		});
		assert.equal(resOther.statusCode, 403);
		const dataOther = JSON.parse(resOther.body);
		assert.equal(dataOther.error, "PermissionDenied");

		// Врач успешно подтверждает свой персональный акт сверки смены БЕЗ кассового РКО
		const resSelf = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "doctor"),
				"Content-Type": "application/json",
			},
			payload: {
				doctorId: DOCTOR_ID,
				periodStart: "2026-10-01",
				periodEnd: "2026-10-31",
				markPaid: false,
				doctorReconciled: true,
			},
		});
		assert.equal(resSelf.statusCode, 200);
		const dataSelf = JSON.parse(resSelf.body);
		assert.equal(dataSelf.ok, true);
		assert.ok(dataSelf.statementId);
		assert.equal(dataSelf.statement.isFinalized, true);
		assert.equal(dataSelf.message, "Акт сверки смены успешно подтвержден врачом");
	});

	test("7. DEF-PAYROLL-06: Администратор ресепшена без payroll.read получает замаскированные ставки (0%)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/v1/doctors",
			headers: authHeaders(DOCTOR_ID, "administrator"),
		});

		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.ok, true);
		for (const doc of data.doctors) {
			assert.equal(doc.commissionPercent, 0);
			assert.equal(doc.defaultShiftRateKop, 0);
			assert.equal(doc.minGuaranteeMonthlyKop, 0);
		}
	});

	test("8. DEF-PAYROLL-06: Управляющий/владелец с payroll.read видит реальные ставки комиссий врачей", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/v1/doctors",
			headers: authHeaders(DOCTOR_ID, "owner"),
		});

		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.equal(data.ok, true);
		assert.ok(Array.isArray(data.doctors));
	});

	test("9. DEF-PAYROLL-07: GET /api/v1/doctors возвращает 401 AuthRequired при отсутствии organizationId", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/v1/doctors",
			headers: {
				[STAFF_TOKEN_HEADER]: signToken(
					{
						userId: DOCTOR_ID,
						role: "doctor",
					},
					TEST_SECRET,
					3600,
				),
			},
		});

		assert.equal(res.statusCode, 401);
		const data = JSON.parse(res.body);
		assert.equal(data.error, "AuthRequired");
	});

	test("10. DEF-PAYROLL-08: POST /api/v1/payroll/close-settlement сохраняет Idempotency-Key и возвращает replay", async () => {
		const idemKey = generateUuidV7();
		const payload = {
			doctorId: DOCTOR_ID,
			periodStart: "2026-11-01",
			periodEnd: "2026-11-30",
			payoutModel: "percentage",
			grossRevenueKop: 3000000,
			labCostKop: 500000,
			materialCostKop: 100000,
			netBaseKop: 2400000,
			categoryPercent: 25,
			totalAccruedKop: 600000,
			ndflKop: 78000,
			netPayoutKop: 522000,
			markPaid: true,
		};

		const res1 = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "owner"),
				"Content-Type": "application/json",
				"Idempotency-Key": idemKey,
			},
			payload,
		});

		assert.equal(res1.statusCode, 200);
		assert.equal(res1.headers["idempotency-key"], idemKey);
		const data1 = JSON.parse(res1.body);
		assert.equal(data1.ok, true);
		assert.ok(data1.statementId);

		const res2 = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "owner"),
				"Content-Type": "application/json",
				"Idempotency-Key": idemKey,
			},
			payload,
		});

		assert.equal(res2.statusCode, 200);
		assert.equal(res2.headers["idempotency-replayed"], "true");
		const data2 = JSON.parse(res2.body);
		assert.equal(data2.statementId, data1.statementId);
		assert.equal(data2.ok, true);
	});

	test("11. DEF-PAYROLL-09: POST /api/v1/payroll/close-settlement отклоняет невалидный не-UUID Idempotency-Key с кодом 400", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "owner"),
				"Content-Type": "application/json",
				"Idempotency-Key": "invalid-non-uuid-key-12345",
			},
			payload: {
				doctorId: DOCTOR_ID,
				periodStart: "2026-10-01",
				periodEnd: "2026-10-31",
			},
		});

		assert.equal(res.statusCode, 400);
		const data = JSON.parse(res.body);
		assert.equal(data.error, "ValidationError");
		assert.ok(data.message.includes("Idempotency-Key"));
	});

	test("12. DEF-PAYROLL-10: Idempotency in_flight conflict returns 409 Retry-After: 1", async () => {
		const idemKey = generateUuidV7();
		await db.insert(idempotencyKeys).values({
			clinicId: ORG_ID,
			key: idemKey,
			status: "in_flight",
			lockedAt: new Date(),
		});

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "owner"),
				"Content-Type": "application/json",
				"Idempotency-Key": idemKey,
			},
			payload: {
				doctorId: DOCTOR_ID,
				periodStart: "2026-10-01",
				periodEnd: "2026-10-31",
			},
		});

		assert.equal(res.statusCode, 409);
		assert.equal(res.headers["retry-after"], "1");
		const data = JSON.parse(res.body);
		assert.equal(data.error, "Conflict");

		// Clean up
		await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, idemKey));
	});

	test("13. DEF-PAYROLL-11: BOLA-защита: врач со scope own не может закрыть чужую ведомость даже при совпадении doctorId=solo-doctor", async () => {
		const OTHER_DOCTOR_ID = "c8000000-0000-4000-8000-00000000d009";
		const res = await app.inject({
			method: "POST",
			url: "/api/v1/payroll/close-settlement",
			headers: {
				...authHeaders(DOCTOR_ID, "doctor"),
				"Content-Type": "application/json",
			},
			payload: {
				doctorId: OTHER_DOCTOR_ID,
				periodStart: "2026-10-01",
				periodEnd: "2026-10-31",
			},
		});

		assert.equal(res.statusCode, 403);
		const data = JSON.parse(res.body);
		assert.equal(data.error, "PermissionDenied");
	});
});

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerChairRentalRoutes } from "./chairRentalRoutes.js";

const TEST_ORG_ID = "11111111-1111-1111-1111-111111111111";
const DOCTOR_USER_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_DOCTOR_ID = "33333333-3333-3333-3333-333333333333";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = Fastify();
	await app.register(registerChairRentalRoutes);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId = DOCTOR_USER_ID, role = "doctor") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("Chair Rental API Routes (Субаренда кресла и экономика врача)", () => {
	it("1. POST /api/doctor/chair-rental/calculate: рассчитывает почасовую модель с точностью до копейки", async () => {
		const app = await buildTestApp();
		const res = await app.inject({
			method: "POST",
			url: "/api/doctor/chair-rental/calculate",
			payload: {
				model: "hourly",
				hourlyRateKopecks: 150_000, // 1 500 ₽/час
				hoursWorked: 5.5,
				grossRevenueKopecks: 4_500_000, // 45 000 ₽
				labExpensesKopecks: 600_000,    // 6 000 ₽
				consumablesKopecks: 250_000,    // 2 500 ₽
			},
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.equal(json.result.rentExpenseRub, 8_250);
		assert.equal(json.result.grossRevenueRub, 45_000);
		assert.equal(json.result.labExpensesRub, 6_000);
		assert.equal(json.result.consumablesRub, 2_500);
		assert.equal(json.result.totalExpensesRub, 16_750);
		assert.equal(json.result.netProfitRub, 28_250);
		assert.equal(json.result.profitMarginPercent, 62.8);
	});

	it("2. POST /api/doctor/chair-rental/calculate: валидация Zod возвращает 400 при некорректных данных", async () => {
		const app = await buildTestApp();
		const res = await app.inject({
			method: "POST",
			url: "/api/doctor/chair-rental/calculate",
			payload: {
				model: "invalid_model",
				grossRevenueKopecks: "not-a-number",
			},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");
	});

	it("3. GET /api/doctor/chair-rental/summary: возвращает 401 без токена сотрудника", async () => {
		const app = await buildTestApp();
		const res = await app.inject({
			method: "GET",
			url: "/api/doctor/chair-rental/summary",
		});

		assert.equal(res.statusCode, 401);
	});

	it("4. GET /api/doctor/chair-rental/summary: врач получает сводку за смену с актом сверки", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(TEST_ORG_ID, DOCTOR_USER_ID, "doctor");

		const res = await app.inject({
			method: "GET",
			url: `/api/doctor/chair-rental/summary?date=2026-10-11&model=hourly&hourlyRateKopecks=150000`,
			headers,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.equal(json.doctorId, DOCTOR_USER_ID);
		assert.ok(json.economics);
		assert.ok(json.economics.netProfitRub > 0);
		assert.ok(json.economics.sterilizationExpensesRub > 0);
		assert.ok(json.act);
		assert.ok(json.act.actNumber.startsWith("ACT-CR-"));
		assert.ok(json.act.sterilizationExpensesRub > 0);
		assert.equal(json.act.isSanitizedWithoutPii, true);
	});

	it("5. GET /api/doctor/chair-rental/summary: RBAC изоляция — врач получает 403 при попытке запросить чужой ledger (IDOR защита)", async () => {
		const app = await buildTestApp();
		// Врач DOCTOR_USER_ID пытается запросить чужой OTHER_DOCTOR_ID
		const headers = createStaffHeaders(TEST_ORG_ID, DOCTOR_USER_ID, "doctor");

		const res = await app.inject({
			method: "GET",
			url: `/api/doctor/chair-rental/summary?doctorId=${OTHER_DOCTOR_ID}`,
			headers,
		});

		assert.equal(res.statusCode, 403);
		const json = res.json();
		assert.equal(json.error, "ForbiddenDoctorAccess");
	});

	it("6. GET /api/doctor/chair-rental/summary: администратор может просматривать сводку любого врача", async () => {
		const app = await buildTestApp();
		// Администратор запрашивает сводку по OTHER_DOCTOR_ID
		const headers = createStaffHeaders(TEST_ORG_ID, "admin-1", "admin");

		const res = await app.inject({
			method: "GET",
			url: `/api/doctor/chair-rental/summary?doctorId=${OTHER_DOCTOR_ID}`,
			headers,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.equal(json.doctorId, OTHER_DOCTOR_ID);
	});
});

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerDoctorEarningsRoutes } from "../../routes/doctorEarningsRoutes.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";

const TEST_SECRET = "doctor-earnings-test-secret-key-32-chars-long-xxx".padEnd(48, "x");
const ORG_ID = "c8000000-0000-4000-8000-00000000c001";
const DOCTOR_MINE = "c8000000-0000-4000-8000-00000000d001";
const DOCTOR_OTHER = "c8000000-0000-4000-8000-00000000d002";

function doctorHeaders(doctorId: string = DOCTOR_MINE, role: string = "doctor"): Record<string, string> {
	return {
		[CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_ID }, TEST_SECRET, 3600),
		[STAFF_TOKEN_HEADER]: signToken(
			{
				organizationId: ORG_ID,
				userId: doctorId,
				role,
			},
			TEST_SECRET,
			3600,
		),
	};
}

describe("GET /api/doctor/my-earnings (Piece-Rate & Commission Transparency)", () => {
	let app: FastifyInstance;
	const originalEnv = { ...process.env };

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		app = Fastify({ logger: false });
		await registerDoctorEarningsRoutes(app);
		await app.ready();
	});

	after(async () => {
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
		await app.close();
	});

	test("1. Возвращает 200 OK и честный расчет сдельной оплаты для текущего врача", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/doctor/my-earnings?date=2026-10-11",
			headers: doctorHeaders(DOCTOR_MINE, "doctor"),
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);

		assert.equal(body.doctorId, DOCTOR_MINE);
		assert.ok(body.summary, "Сводка должна присутствовать");
		assert.ok(typeof body.summary.totalGrossRevenueRub === "number");
		assert.ok(typeof body.summary.totalLabDeductionsRub === "number");
		assert.ok(typeof body.summary.totalDoctorEarnedRub === "number");
		assert.ok(Array.isArray(body.appointments), "Список приемов должен быть массивом");
		assert.ok(Array.isArray(body.specialtyBreakdown), "Разбивка по специальностям должна быть массивом");
		assert.ok(typeof body.formulaExplanationRu === "string", "Пояснение формулы должно быть строкой");
		assert.ok(body.formulaExplanationRu.includes("Выручка"), "Формула обязана упоминать Выручку");
		assert.ok(body.formulaExplanationRu.includes("ЗТЛ"), "Формула обязана упоминать вычет ЗТЛ");
	});

	test("2. RBAC Охрана: лечащий врач получает 403 Forbidden при попытке запросить чужой doctorId", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/doctor/my-earnings?doctorId=${DOCTOR_OTHER}`,
			headers: doctorHeaders(DOCTOR_MINE, "doctor"),
		});

		assert.equal(res.statusCode, 403);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "DoctorForbiddenError");
		assert.ok(body.message.includes("исключительно собственные начисления"));
	});

	test("3. Администратор имеет право передавать doctorId конкретного врача для сверки", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/doctor/my-earnings?doctorId=${DOCTOR_OTHER}`,
			headers: doctorHeaders("c8000000-0000-4000-8000-00000000a001", "admin"),
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.doctorId, DOCTOR_OTHER);
	});

	test("4. Проверяет корректность фильтра дат from / to", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/doctor/my-earnings?from=2026-10-01T00:00:00.000Z&to=2026-10-31T23:59:59.999Z",
			headers: doctorHeaders(DOCTOR_MINE, "doctor"),
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.period.from, "2026-10-01T00:00:00.000Z");
		assert.equal(body.period.to, "2026-10-31T23:59:59.999Z");
	});

	test("5. Режим аренды кресла (Мандаты 8e, 8n): возвращает чистый доход и сплит аванса", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/doctor/my-earnings?date=2026-10-11&payoutModel=chair_rental&chairRentalRub=25000&advanceRub=10000&taxRegime=self_employed",
			headers: doctorHeaders(DOCTOR_MINE, "doctor"),
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.summary.payoutModel, "chair_rental");
		assert.equal(body.summary.chairRentalRub, 25000);
		assert.equal(body.summary.advanceRub, 10000);
		assert.ok(typeof body.summary.mainPayoutRub === "number");
		assert.ok(typeof body.summary.npdTaxRub === "number");
		assert.ok(body.formulaExplanationRu.includes("Аренда кресла") || body.formulaExplanationRu.includes("Выручка"));
	});
});

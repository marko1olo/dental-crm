import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { registerStaffRoutes } from "../../routes/staff.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "123e4567-e89b-12d3-a456-4266141740ff";
const USER_ID = "123e4567-e89b-12d3-a456-426614174001";

describe("Fastify API Route Contracts & Error Hardening (CWE-209 & SQL 22P02 Defense)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let staffHeaders: Record<string, string>;
	const originalEnv = process.env;

	before(async () => {
		process.env = {
			...originalEnv,
			DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS: "1",
		};

		app = Fastify({ logger: false });
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});

		await registerVisitRoutes(app);
		await registerBillingRoutes(app);
		await registerScheduleRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await registerStaffRoutes(app);

		await app.ready();

		const clinicToken = signToken(
			{ organizationId: ORG_ID },
			TOKEN_SECRET(),
			3600,
		);
		clinicHeaders = {
			"x-dente-clinic-token": clinicToken,
		};

		const staffToken = signToken(
			{ organizationId: ORG_ID, userId: USER_ID, role: "owner" },
			TOKEN_SECRET(),
			3600,
		);
		staffHeaders = {
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
		};
	});

	after(async () => {
		await app.close();
		process.env = originalEnv;
	});

	// ==========================================
	// 1. Visits Route Contracts & SQL 22P02 Defense
	// ==========================================
	describe("1. Visits Route Contracts & SQL 22P02 Defense", () => {
		test("GET /api/visits/not-a-uuid/draft/autosave returns 400 VisitValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/visits/not-a-uuid/draft/autosave",
				headers: clinicHeaders,
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "VisitValidationError");
			assert.strictEqual(body.reason, "invalid_uuid");
			assert.match(body.message, /Некорректный идентификатор приёма/);
		});

		test("POST /api/visits/not-a-uuid/apply-plan-items returns 400 ValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/visits/not-a-uuid/apply-plan-items",
				headers: clinicHeaders,
				payload: {
					planId: "123e4567-e89b-12d3-a456-426614174002",
					itemIds: ["123e4567-e89b-12d3-a456-426614174003"],
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "ValidationError");
			assert.match(body.message, /Некорректный идентификатор приёма/);
		});

		test("POST /api/visits/not-a-uuid/complete-work-order returns 400 ValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/visits/not-a-uuid/complete-work-order",
				headers: clinicHeaders,
				payload: { status: "signed" },
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "ValidationError");
			assert.match(body.message, /Некорректный идентификатор приёма/);
		});

		test("GET /api/visits/not-a-uuid/consumables returns 400 ValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/visits/not-a-uuid/consumables",
				headers: clinicHeaders,
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "ValidationError");
			assert.match(body.message, /Некорректный идентификатор приёма/);
		});

		test("POST /api/visits/not-a-uuid/consumables returns 400 ValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/visits/not-a-uuid/consumables",
				headers: clinicHeaders,
				payload: {
					bundleType: "standard_kit",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "ValidationError");
			assert.match(body.message, /Некорректный идентификатор приёма/);
		});

		test("POST /api/visits/{id}/consumables with non-UUID idempotency-key returns 400 InvalidIdempotencyKey", async () => {
			const validVisitId = "123e4567-e89b-12d3-a456-426614174000";
			const res = await app.inject({
				method: "POST",
				url: `/api/visits/${validVisitId}/consumables`,
				headers: {
					...clinicHeaders,
					"idempotency-key": "not-a-valid-uuid-key",
				},
				payload: {
					bundleType: "standard_kit",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "InvalidIdempotencyKey");
		});
	});

	// ==========================================
	// 2. Billing & Finance Contracts
	// ==========================================
	describe("2. Billing & Finance Contracts", () => {
		test("POST /api/invoices/not-a-uuid/pay returns 400 BillingValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/invoices/not-a-uuid/pay",
				headers: clinicHeaders,
				payload: {
					amountRub: 1500,
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "BillingValidationError");
			assert.match(body.message, /Некорректный идентификатор счёта/);
		});

		test("POST /api/billing/fiscal-queue/not-a-uuid/retry returns 400 ValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/billing/fiscal-queue/not-a-uuid/retry",
				headers: staffHeaders,
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "ValidationError");
			assert.match(body.message, /Некорректный идентификатор чека в очереди/);
		});

		test("POST /api/billing/payments with missing idempotency key returns 400 BillingValidationError", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: clinicHeaders,
				payload: {
					patientId: "123e4567-e89b-12d3-a456-426614174001",
					amountRub: 2500,
					method: "cash",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "BillingValidationError");
		});

		test("POST /api/billing/payments with negative amount returns 400 BillingValidationError", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: clinicHeaders,
				payload: {
					patientId: "123e4567-e89b-12d3-a456-426614174001",
					amountRub: -500,
					method: "cash",
					clientMutationId: "123e4567-e89b-12d3-a456-426614174099",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "BillingValidationError");
		});
	});

	// ==========================================
	// 3. Appointments & Schedule Query Contracts
	// ==========================================
	describe("3. Appointments & Schedule Query Contracts", () => {
		test("GET /api/appointments?doctorId=not-a-uuid returns 400 AppointmentValidationError", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/appointments?doctorId=not-a-uuid",
				headers: clinicHeaders,
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "AppointmentValidationError");
			assert.match(body.message, /Некорректный идентификатор врача/);
		});

		test("GET /api/appointments?patientId=not-a-uuid returns 400 AppointmentValidationError", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/appointments?patientId=not-a-uuid",
				headers: clinicHeaders,
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "AppointmentValidationError");
			assert.match(body.message, /Некорректный идентификатор пациента/);
		});

		test("GET /api/appointments?date=invalid-date returns 400 AppointmentValidationError", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/appointments?date=invalid-date",
				headers: clinicHeaders,
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "AppointmentValidationError");
			assert.match(body.message, /Некорректный формат даты/);
		});

		test("GET /api/appointments/not-a-uuid returns 400 AppointmentValidationError", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/appointments/not-a-uuid",
				headers: clinicHeaders,
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.code, "AppointmentValidationError");
		});
	});

	// ==========================================
	// 4. Inventory Catalog Mutation Contracts
	// ==========================================
	describe("4. Inventory Catalog Mutation Contracts", () => {
		test("PUT /api/inventory/:org/items/not-a-uuid returns 404 Item not found (not 500)", async () => {
			const res = await app.inject({
				method: "PUT",
				url: `/api/inventory/${ORG_ID}/items/not-a-uuid`,
				headers: staffHeaders,
				payload: {
					name: "Композит световой",
				},
			});

			assert.strictEqual(res.statusCode, 404);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "Item not found");
		});

		test("DELETE /api/inventory/:org/items/not-a-uuid returns 404 Item not found (not 500)", async () => {
			const res = await app.inject({
				method: "DELETE",
				url: `/api/inventory/${ORG_ID}/items/not-a-uuid`,
				headers: staffHeaders,
			});

			assert.strictEqual(res.statusCode, 404);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "Item not found");
		});

		test("PATCH /api/inventory/:org/items/not-a-uuid returns 404 Item not found (not 500)", async () => {
			const res = await app.inject({
				method: "PATCH",
				url: `/api/inventory/${ORG_ID}/items/not-a-uuid`,
				headers: staffHeaders,
				payload: {
					criticalThreshold: 10,
				},
			});

			assert.strictEqual(res.statusCode, 404);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "Item not found");
		});
	});

	// ==========================================
	// 5. Staff Mutation Route Contracts
	// ==========================================
	describe("5. Staff Mutation Route Contracts", () => {
		test("PUT /api/staff/not-a-uuid/profile returns 400 ValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "PUT",
				url: "/api/staff/not-a-uuid/profile",
				headers: staffHeaders,
				payload: {
					fullName: "Доктор Айболит",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "ValidationError");
			assert.match(body.message, /Некорректный идентификатор сотрудника/);
		});

		test("POST /api/staff/not-a-uuid/terminate-session returns 400 ValidationError (not 500)", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/staff/not-a-uuid/terminate-session",
				headers: staffHeaders,
			});

			assert.strictEqual(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.strictEqual(body.error, "ValidationError");
			assert.match(body.message, /Некорректный идентификатор сотрудника/);
		});
	});
});

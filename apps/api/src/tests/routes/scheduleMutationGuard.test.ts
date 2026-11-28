import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const ANY_APPOINTMENT = "00000000-0000-4000-8000-000000000001";
const ORG_ID = "00000000-0000-4000-8000-000000000099";
const DOCTOR_ID = "00000000-0000-4000-8000-000000000077";
const ASSISTANT_ID = "00000000-0000-4000-8000-000000000088";

interface ScheduleMutationTarget {
	readonly method: "POST" | "PUT" | "PATCH" | "DELETE";
	readonly url: string;
}

const MUTATING_ROUTES: readonly ScheduleMutationTarget[] = [
	{ method: "POST", url: "/api/appointments" },
	{ method: "PUT", url: `/api/appointments/${ANY_APPOINTMENT}` },
	{ method: "PATCH", url: `/api/appointments/${ANY_APPOINTMENT}` },
	{ method: "PUT", url: `/api/schedule/appointments/${ANY_APPOINTMENT}` },
	{ method: "PATCH", url: `/api/schedule/appointments/${ANY_APPOINTMENT}` },
	{ method: "POST", url: `/api/appointments/${ANY_APPOINTMENT}/next-stage` },
	{ method: "POST", url: "/api/schedule/leases/acquire" },
	{ method: "POST", url: "/api/schedule/leases/heartbeat" },
	{ method: "POST", url: "/api/schedule/leases/release" },
	{ method: "POST", url: "/api/schedule/clipboard-items" },
	{ method: "DELETE", url: `/api/schedule/clipboard-items/${ANY_APPOINTMENT}` },
	{ method: "POST", url: `/api/schedule/clipboard-items/${ANY_APPOINTMENT}/paste` },
];

describe("периметр расписания защищён токеном клиники и RBAC на каждом изменяющем маршруте (6Г)", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let doctorToken: string;
	let assistantToken: string;
	const adminSecret = randomBytes(24).toString("base64url");
	const savedEnvironment = {
		secret: process.env.DENTE_SCHEDULE_ADMIN_SECRET,
		flag: process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS,
		mode: process.env.NODE_ENV,
		persistence: process.env.DENTE_STATE_PERSISTENCE,
	};

	before(async () => {
		process.env.DENTE_SCHEDULE_ADMIN_SECRET = adminSecret;
		delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		process.env.NODE_ENV = "test";
		process.env.DENTE_STATE_PERSISTENCE = "database";

		const secret = authTokenSecret();
		clinicToken = signToken({ role: "clinic", organizationId: ORG_ID }, secret);
		doctorToken = signToken({ role: "doctor", organizationId: ORG_ID, userId: DOCTOR_ID }, secret);
		assistantToken = signToken({ role: "assistant", organizationId: ORG_ID, userId: ASSISTANT_ID }, secret);

		app = createTenantTestApp();
		await registerScheduleRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		if (savedEnvironment.secret === undefined) delete process.env.DENTE_SCHEDULE_ADMIN_SECRET;
		else process.env.DENTE_SCHEDULE_ADMIN_SECRET = savedEnvironment.secret;
		if (savedEnvironment.flag === undefined) delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		else process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = savedEnvironment.flag;
		if (savedEnvironment.mode === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = savedEnvironment.mode;
		if (savedEnvironment.persistence === undefined) delete process.env.DENTE_STATE_PERSISTENCE;
		else process.env.DENTE_STATE_PERSISTENCE = savedEnvironment.persistence;
	});

	test("анонимный запрос без токенов отбит 401 на каждом мутирующем маршруте", async () => {
		for (const route of MUTATING_ROUTES) {
			const res = await app.inject({
				method: route.method,
				url: route.url,
				payload: {},
			});
			assert.equal(
				res.statusCode,
				401,
				`${route.method} ${route.url} без токена вернул ${res.statusCode} вместо 401`,
			);
		}
	});

	test("клинический токен без секрета проходит шлюз (Мандат 8e, без лишних барьеров для врача)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: { "x-dente-clinic-token": clinicToken },
			payload: {},
		});
		assert.notEqual(res.statusCode, 401);
		assert.notEqual(res.statusCode, 403);
	});

	test("сотрудник с ролью assistant (без schedule.write) получает 403 на маршрутах с routeFactories", async () => {
		const leaseRes = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/acquire",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": assistantToken,
			},
			payload: {
				chairId: ANY_APPOINTMENT,
				startsAt: "2026-10-01T10:00:00.000Z",
				endsAt: "2026-10-01T10:30:00.000Z",
				holderSessionId: "sess-assist-1",
			},
		});
		assert.equal(leaseRes.statusCode, 403, `Expected 403 for assistant lease acquire, got ${leaseRes.statusCode}`);
	});

	test("врач с валидным staff-токеном не блокируется RBAC на /api/schedule/leases/acquire", async () => {
		const leaseRes = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/acquire",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {},
		});
		assert.notEqual(leaseRes.statusCode, 401);
		assert.notEqual(leaseRes.statusCode, 403);
	});
});

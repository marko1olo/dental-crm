import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients, users } from "../../db/schema.js";
import { registerTasksRoutes } from "../../routes/tasks.js";
import { registerTelegramAccountVerify2faRoute } from "../../routes/telegram/telegramAccountVerify2faRoute.js";
import { registerTemplateManagerRoutes } from "../../routes/whatsappModules/templateManagerRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";

const NS = "p1-routes-idemp-auth";
const ORG_ID = fixtureUuid(NS, 1);
const DOCTOR_ID = fixtureUuid(NS, 2);
const PATIENT_ID = fixtureUuid(NS, 3);

describe("P1 Routes Idempotency, Validation & Identity Hardening Suite", () => {
	let app: FastifyInstance;
	let headers: Record<string, string>;

	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника П1 Тест Идемпотентности",
			});
			await db.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Врач Тестов И.А.",
				role: "doctor",
				isActive: true,
			});
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Задач А.Б.",
				phone: "+79990001122",
			});
		});

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: ORG_ID, type: "clinic" }, secret, 3600);
		const staffToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" },
			secret,
			3600,
		);
		headers = {
			[CLINIC_TOKEN_HEADER]: clinicToken,
			[STAFF_TOKEN_HEADER]: staffToken,
			"content-type": "application/json",
		};

		app = await createIdempotentTenantTestApp();
		await registerTasksRoutes(app);
		await registerTemplateManagerRoutes(app);
		await registerTelegramAccountVerify2faRoute(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("1. Tasks CRUD under idempotencyPlugin executes cleanly without false 409 and validates DELETE UUID", async () => {
		const createKey = randomUUID();
		const createRes = await app.inject({
			method: "POST",
			url: "/api/tasks",
			headers: {
				...headers,
				"idempotency-key": createKey,
			},
			payload: {
				title: "Перезвонить после имплантации",
				patientId: PATIENT_ID,
				priority: "high",
			},
		});
		assert.equal(createRes.statusCode, 201, `Expected 201, got ${createRes.statusCode}: ${createRes.body}`);
		const created = createRes.json() as { id: string; title: string; status: string };
		assert.ok(created.id);
		assert.equal(created.status, "pending");

		// Exact replay returns cached 201 without duplicate creation
		const replayRes = await app.inject({
			method: "POST",
			url: "/api/tasks",
			headers: {
				...headers,
				"idempotency-key": createKey,
			},
			payload: {
				title: "Перезвонить после имплантации",
				patientId: PATIENT_ID,
				priority: "high",
			},
		});
		assert.equal(replayRes.statusCode, 201);
		assert.equal(replayRes.headers["idempotency-replayed"], "true");
		assert.equal((replayRes.json() as { id: string }).id, created.id);

		// PATCH status update executes without false 409
		const patchRes = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${created.id}`,
			headers: {
				...headers,
				"idempotency-key": randomUUID(),
			},
			payload: { status: "completed" },
		});
		assert.equal(patchRes.statusCode, 200, `Expected 200 on PATCH, got ${patchRes.statusCode}: ${patchRes.body}`);
		assert.equal((patchRes.json() as { status: string }).status, "completed");

		const deleteHeaders = {
			[CLINIC_TOKEN_HEADER]: headers[CLINIC_TOKEN_HEADER] ?? "",
			[STAFF_TOKEN_HEADER]: headers[STAFF_TOKEN_HEADER] ?? "",
		};

		// Invalid UUID in DELETE returns 400 ValidationError (not unhandled 500 ZodError)
		const badDeleteRes = await app.inject({
			method: "DELETE",
			url: "/api/tasks/not-a-uuid",
			headers: {
				...deleteHeaders,
				"idempotency-key": randomUUID(),
			},
		});
		assert.equal(badDeleteRes.statusCode, 400);
		assert.equal((badDeleteRes.json() as { error: string }).error, "ValidationError");

		// Valid DELETE executes without false 409
		const deleteRes = await app.inject({
			method: "DELETE",
			url: `/api/tasks/${created.id}`,
			headers: {
				...deleteHeaders,
				"idempotency-key": randomUUID(),
			},
		});
		assert.equal(deleteRes.statusCode, 200, `Expected 200 on DELETE, got ${deleteRes.statusCode}: ${deleteRes.body}`);
		assert.equal((deleteRes.json() as { success: boolean }).success, true);
	});

	it("2. WhatsApp templates sync under idempotencyPlugin executes cleanly without false 409", async () => {
		const syncKey = randomUUID();
		const firstRes = await app.inject({
			method: "POST",
			url: "/api/whatsapp/templates/sync",
			headers: {
				...headers,
				"idempotency-key": syncKey,
			},
			payload: {},
		});
		assert.equal(firstRes.statusCode, 200, `Expected 200, got ${firstRes.statusCode}: ${firstRes.body}`);
		const firstBody = firstRes.json() as { ok: boolean; count: number };
		assert.equal(firstBody.ok, true);
		assert.ok(firstBody.count >= 6);

		const replayRes = await app.inject({
			method: "POST",
			url: "/api/whatsapp/templates/sync",
			headers: {
				...headers,
				"idempotency-key": syncKey,
			},
			payload: {},
		});
		assert.equal(replayRes.statusCode, 200);
		assert.equal(replayRes.headers["idempotency-replayed"], "true");
	});

	it("3. Telegram verify-2fa ignores spoofed x-user-id / x-clinic-id headers and requires verified identity", async () => {
		const originalVerify2fa = TelegramAccountService.verify2fa;
		let capturedParams: { organizationId: string; userId?: string | null; clinicId?: string | null } | null = null;
		TelegramAccountService.verify2fa = async (params) => {
			capturedParams = {
				organizationId: params.organizationId,
				userId: params.userId ?? null,
				clinicId: params.clinicId ?? null,
			};
			return {
				ok: true,
				connected: true,
				account: {
					id: "acc-1",
					phone: params.phone,
					firstName: null,
					lastName: null,
					username: null,
					avatarUrl: null,
					status: "online",
					is2faEnabled: true,
					connectedAt: new Date().toISOString(),
					lastActiveAt: new Date().toISOString(),
				},
			};
		};

		try {
			const res = await app.inject({
				method: "POST",
				url: "/api/telegram/account/verify-2fa",
				headers: {
					...headers,
					"idempotency-key": randomUUID(),
					"x-user-id": "00000000-0000-0000-0000-00000000dead",
					"x-clinic-id": "00000000-0000-0000-0000-00000000beef",
				},
				payload: {
					phone: "+79997778892",
					password: "secret-2fa-password",
				},
			});
			assert.equal(res.statusCode, 200);
			assert.deepEqual(capturedParams, {
				organizationId: ORG_ID,
				userId: DOCTOR_ID,
				clinicId: ORG_ID,
			});
		} finally {
			TelegramAccountService.verify2fa = originalVerify2fa;
		}
	});
});

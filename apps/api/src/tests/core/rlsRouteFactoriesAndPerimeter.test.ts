import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import {
	definePublicRoute,
	defineStreamRoute,
	defineTenantMutation,
	defineTenantQuery,
	defineWebhookRoute,
} from "../../core/routeFactories.js";
import {
	db,
	runWithStrictUnscopedDbTrap,
	tenantAlsStorage,
	UnscopedTenantDbAccessError,
} from "../../db/client.js";
import {
	CrossTenantContextError,
	TenantCtxModeEscalationError,
	withTenantCtx,
	withTenantReadCtx,
	withTenantWriteCtx,
} from "../../db/rls.js";
import {
	organizations,
	patients,
	users,
	visitDiaries,
	visits,
} from "../../db/schema.js";
import registerDiaryRoutes from "../../routes/diary/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	getStaffSessionCacheStatsForTest,
	invalidateStaffSessionCache,
} from "../../security/unifiedAuthPerimeter.js";
import { dispatchDiarySigningSideEffects } from "../../services/clinical/signingModules/diarySideEffectsAsyncDispatcher.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NS = "rlsRouteFactoriesPerimeter";
const ORG_A = fixtureUuid(NS, 1);
const ORG_B = fixtureUuid(NS, 2);
const DOCTOR_A = fixtureUuid(NS, 3);
const MARKETER_A = fixtureUuid(NS, 4);
const PATIENT_A = fixtureUuid(NS, 5);
const PATIENT_B = fixtureUuid(NS, 6);
const VISIT_A = fixtureUuid(NS, 7);
const MISSING_USER_FK = fixtureUuid(NS, 99);

describe("PG18 RLS Read/Write Contexts, Route Factories & Unified Auth Perimeter", () => {
	let app: FastifyInstance;
	let doctorSessionId = "";
	let doctorToken = "";
	let marketerToken = "";
	const registeredSelfManagedFlags = new Map<string, boolean>();

	before(async () => {
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
		invalidateStaffSessionCache();

		doctorSessionId = crypto.randomUUID();
		await withFixtureTenant(ORG_A, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_A,
				name: "Клиника Фабрик А",
			});
			await tx.insert(users).values([
				{
					id: DOCTOR_A,
					organizationId: ORG_A,
					fullName: "Доктор Тестов А.А.",
					role: "doctor",
					isActive: true,
					currentSessionId: doctorSessionId,
				},
				{
					id: MARKETER_A,
					organizationId: ORG_A,
					fullName: "Маркетолог Тестов М.М.",
					role: "marketer",
					isActive: true,
				},
			]);
			await tx.insert(patients).values({
				id: PATIENT_A,
				organizationId: ORG_A,
				fullName: "Пациент Фабрики А",
			});
			await tx.insert(visits).values({
				id: VISIT_A,
				organizationId: ORG_A,
				patientId: PATIENT_A,
				status: "draft",
			});
		});

		await withFixtureTenant(ORG_B, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_B,
				name: "Клиника Фабрик Б",
			});
			await tx.insert(patients).values({
				id: PATIENT_B,
				organizationId: ORG_B,
				fullName: "Пациент Чужой Б",
			});
		});

		const secret = authTokenSecret();
		doctorToken = signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_A,
				role: "doctor",
				sessionId: doctorSessionId,
			},
			secret,
			3600,
		);
		marketerToken = signToken(
			{
				organizationId: ORG_A,
				userId: MARKETER_A,
				role: "marketer",
			},
			secret,
			3600,
		);

		app = Fastify({ logger: false });
		app.addHook("onRoute", (routeOptions) => {
			registeredSelfManagedFlags.set(
				`${String(routeOptions.method)} ${routeOptions.url}`,
				routeOptions.config?.tenantTxSelfManaged === true,
			);
		});

		defineTenantQuery(app, {
			path: "/test/patients",
			permission: "patients.read",
			handler: async ({ tx, organizationId }) => {
				const rows = await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(eq(patients.organizationId, organizationId));
				return { ok: true, count: rows.length, rows };
			},
		});

		defineTenantMutation(app, {
			method: "POST",
			path: "/test/patients",
			permission: "patients.write",
			bodySchema: z.object({ fullName: z.string().min(1) }).strict(),
			handler: async ({ tx, organizationId, body, idempotencyKey }) => {
				const newId = crypto.randomUUID();
				await tx.insert(patients).values({
					id: newId,
					organizationId,
					fullName: body.fullName,
				});
				return { ok: true, id: newId, idempotencyKey };
			},
		});

		defineStreamRoute(app, {
			method: "POST",
			path: "/test/stream-ai",
			permission: "clinical.read",
			bodySchema: z.object({ triggerBareDb: z.boolean().optional() }).strict(),
			handler: async ({ organizationId, body, runReadTx, runWriteTx }) => {
				const readResult = await runReadTx(async (tx) => {
					const [p] = await tx
						.select({ id: patients.id })
						.from(patients)
						.where(eq(patients.organizationId, organizationId!))
						.limit(1);
					return p?.id ?? null;
				});

				// Immediately after runReadTx returns, ALS transaction MUST be closed
				const alsAfterRead = tenantAlsStorage.getStore();

				if (body.triggerBareDb) {
					await db.select({ id: patients.id }).from(patients).limit(1);
				}

				await new Promise((resolve) => setTimeout(resolve, 10));

				const written = await runWriteTx(async (tx) => {
					const res = await tx.execute(sql`SELECT current_setting('app.current_tenant', true) AS t`);
					return res.rows[0];
				});

				return {
					ok: true,
					readResult,
					alsClosedAfterRead: alsAfterRead === undefined,
					alsClosedAfterWrite: tenantAlsStorage.getStore() === undefined,
					written,
				};
			},
		});

		definePublicRoute(app, {
			method: "GET",
			path: "/test/public-ping",
			handler: async () => ({ ok: true, public: true }),
		});

		defineWebhookRoute(app, {
			method: "POST",
			path: "/test/webhook",
			verifySignature: (request, reply) => {
				if (request.headers["x-webhook-sig"] !== "valid-hmac") {
					reply.code(401).send({ error: "InvalidWebhookSignature" });
					return false;
				}
				return true;
			},
			bodySchema: z.object({ orgId: z.string().uuid() }).strict(),
			handler: async ({ body, runTenantReadTx }) => {
				const rows = await runTenantReadTx(body.orgId, (tx) =>
					tx
						.select({ id: patients.id })
						.from(patients)
						.where(eq(patients.organizationId, body.orgId)),
				);
				return { ok: true, count: rows.length };
			},
		});

		await registerDiaryRoutes(app);
		await app.ready();
	});

	after(async () => {
		invalidateStaffSessionCache();
		await app.close();
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
	});

	test("all 5 route factories mark tenantTxSelfManaged: true on Fastify onRoute", () => {
		assert.equal(registeredSelfManagedFlags.get("GET /test/patients"), true);
		assert.equal(registeredSelfManagedFlags.get("POST /test/patients"), true);
		assert.equal(registeredSelfManagedFlags.get("POST /test/stream-ai"), true);
		assert.equal(registeredSelfManagedFlags.get("GET /test/public-ping"), true);
		assert.equal(registeredSelfManagedFlags.get("POST /test/webhook"), true);
		assert.equal(registeredSelfManagedFlags.get("POST /api/diaries"), true);
		assert.equal(registeredSelfManagedFlags.get("GET /api/diaries/visit/:visitId"), true);
	});

	test("withTenantReadCtx enforces PostgreSQL READ ONLY (25006), blocks escalation & cross-tenant switch, and reuses ALS in RAM", async () => {
		// 1. PG18 rejects INSERT inside withTenantReadCtx with 25006
		await assert.rejects(
			async () => {
				await withTenantReadCtx(ORG_A, async (tx) => {
					await tx.insert(patients).values({
						id: crypto.randomUUID(),
						organizationId: ORG_A,
						fullName: "Should Fail Readonly",
					});
				});
			},
			(err: unknown) => {
				const pgErr = err as { code?: string; cause?: { code?: string } };
				const code = pgErr.code ?? pgErr.cause?.code;
				assert.equal(code, "25006", `Expected PostgreSQL 25006 read_only error, got ${String(err)}`);
				return true;
			},
		);

		// 2. withTenantWriteCtx inside withTenantReadCtx throws TenantCtxModeEscalationError
		await assert.rejects(
			async () => {
				await withTenantReadCtx(ORG_A, async () => {
					await withTenantWriteCtx(ORG_A, async () => "blocked");
				});
			},
			(err: unknown) => err instanceof TenantCtxModeEscalationError,
		);

		// 3. Cross-tenant reentrancy inside withTenantReadCtx/WriteCtx throws CrossTenantContextError
		await assert.rejects(
			async () => {
				await withTenantReadCtx(ORG_A, async () => {
					await withTenantReadCtx(ORG_B, async () => "blocked");
				});
			},
			(err: unknown) => err instanceof CrossTenantContextError,
		);

		// 4. Same-tenant nested calls inside withTenantWriteCtx reuse exact outer tx with 0 extra SQL round-trips
		await withTenantWriteCtx(ORG_A, async (outerTx) => {
			let executeCalls = 0;
			const origExecute = outerTx.execute.bind(outerTx);
			outerTx.execute = ((...args: Parameters<typeof outerTx.execute>) => {
				executeCalls += 1;
				return origExecute(...args);
			}) as typeof outerTx.execute;

			await withTenantCtx(ORG_A, async (nestedTx) => {
				assert.equal(nestedTx, outerTx);
			});
			await withTenantReadCtx(ORG_A, async (readTx) => {
				assert.equal(readTx, outerTx);
				assert.equal(tenantAlsStorage.getStore()?.mode, "read_only");
			});
			// Outer mode restored back to read_write after read-only sub-scope exits
			assert.equal(tenantAlsStorage.getStore()?.mode, "read_write");
			await withTenantWriteCtx(ORG_A, async (writeTx) => {
				assert.equal(writeTx, outerTx);
			});

			assert.equal(executeCalls, 0, "Nested same-tenant calls must perform 0 SQL current_setting queries");
		});
	});

	test("defineStreamRoute closes TX before LLM/delay and throws UnscopedTenantDbAccessError on bare db access", async () => {
		await assert.rejects(
			async () => {
				await runWithStrictUnscopedDbTrap(async () => {
					await db.select({ id: patients.id }).from(patients).limit(1);
				});
			},
			(err: unknown) => err instanceof UnscopedTenantDbAccessError,
		);

		const okRes = await app.inject({
			method: "POST",
			url: "/test/stream-ai",
			headers: { "x-dente-staff-token": doctorToken },
			payload: { triggerBareDb: false },
		});
		assert.equal(okRes.statusCode, 200, okRes.body);
		const okJson = okRes.json() as {
			readResult: string;
			alsClosedAfterRead: boolean;
			alsClosedAfterWrite: boolean;
		};
		assert.equal(okJson.readResult, PATIENT_A);
		assert.equal(okJson.alsClosedAfterRead, true);
		assert.equal(okJson.alsClosedAfterWrite, true);

		const leakRes = await app.inject({
			method: "POST",
			url: "/test/stream-ai",
			headers: { "x-dente-staff-token": doctorToken },
			payload: { triggerBareDb: true },
		});
		assert.equal(leakRes.statusCode, 500, leakRes.body);
		assert.match(leakRes.body, /Forbidden unscoped db\.select\(\)/);
	});

	test("unifiedAuthPerimeter enforces RBAC, caches active session in BoundedTtlMap, and invalidates immediately on revocation", async () => {
		// Unauthenticated -> 401
		const unauth = await app.inject({ method: "GET", url: "/test/patients" });
		assert.equal(unauth.statusCode, 401);

		// Marketer lacks patients.read -> 403 fail-closed
		const marketerRes = await app.inject({
			method: "GET",
			url: "/test/patients",
			headers: { "x-dente-staff-token": marketerToken },
		});
		assert.equal(marketerRes.statusCode, 403, marketerRes.body);
		assert.equal(marketerRes.json().error, "PermissionDenied");

		// Doctor succeeds and populates BoundedTtlMap session cache
		invalidateStaffSessionCache();
		const doctorOk = await app.inject({
			method: "GET",
			url: "/test/patients",
			headers: { "x-dente-staff-token": doctorToken },
		});
		assert.equal(doctorOk.statusCode, 200, doctorOk.body);
		assert.equal(doctorOk.json().count, 1);
		assert.ok(getStaffSessionCacheStatsForTest().size >= 1);

		// Revoke doctor session in DB + invalidate cache -> old token immediately gets 401
		await withFixtureTenant(ORG_A, async (tx) => {
			await tx
				.update(users)
				.set({ currentSessionId: null })
				.where(and(eq(users.id, DOCTOR_A), eq(users.organizationId, ORG_A)));
		});
		invalidateStaffSessionCache(DOCTOR_A, ORG_A);

		const revokedRes = await app.inject({
			method: "GET",
			url: "/test/patients",
			headers: { "x-dente-staff-token": doctorToken },
		});
		assert.equal(revokedRes.statusCode, 401, revokedRes.body);
		assert.equal(revokedRes.json().error, "invalid_session");

		// Restore sessionId for subsequent tests
		await withFixtureTenant(ORG_A, async (tx) => {
			await tx
				.update(users)
				.set({ currentSessionId: doctorSessionId })
				.where(and(eq(users.id, DOCTOR_A), eq(users.organizationId, ORG_A)));
		});
		invalidateStaffSessionCache(DOCTOR_A, ORG_A);
	});

	test("defineTenantMutation requires valid Idempotency-Key, deduplicates replay, and rejects payload collision with 409", async () => {
		const missingKey = await app.inject({
			method: "POST",
			url: "/test/patients",
			headers: { "x-dente-staff-token": doctorToken },
			payload: { fullName: "Пациент Без Ключа" },
		});
		assert.equal(missingKey.statusCode, 400);
		assert.equal(missingKey.json().error, "IdempotencyKeyRequired");

		const idemKey = crypto.randomUUID();
		const first = await app.inject({
			method: "POST",
			url: "/test/patients",
			headers: {
				"x-dente-staff-token": doctorToken,
				"idempotency-key": idemKey,
			},
			payload: { fullName: "Пациент Идемпотентный" },
		});
		assert.equal(first.statusCode, 200, first.body);
		const createdId = first.json().id as string;

		const replay = await app.inject({
			method: "POST",
			url: "/test/patients",
			headers: {
				"x-dente-staff-token": doctorToken,
				"idempotency-key": idemKey,
			},
			payload: { fullName: "Пациент Идемпотентный" },
		});
		assert.equal(replay.statusCode, 200, replay.body);
		assert.equal(replay.headers["idempotent-replay"], "true");
		assert.equal(replay.json().id, createdId);

		const collision = await app.inject({
			method: "POST",
			url: "/test/patients",
			headers: {
				"x-dente-staff-token": doctorToken,
				"idempotency-key": idemKey,
			},
			payload: { fullName: "Другой Пациент На Тот Же Ключ" },
		});
		assert.equal(collision.statusCode, 409, collision.body);
	});

	test("definePublicRoute and defineWebhookRoute enforce perimeter without holding tenant TX", async () => {
		const pubRes = await app.inject({ method: "GET", url: "/test/public-ping" });
		assert.equal(pubRes.statusCode, 200);
		assert.equal(pubRes.json().public, true);

		const badSig = await app.inject({
			method: "POST",
			url: "/test/webhook",
			payload: { orgId: ORG_B },
		});
		assert.equal(badSig.statusCode, 401);

		const goodSig = await app.inject({
			method: "POST",
			url: "/test/webhook",
			headers: { "x-webhook-sig": "valid-hmac" },
			payload: { orgId: ORG_B },
		});
		assert.equal(goodSig.statusCode, 200);
		assert.equal(goodSig.json().count, 1);
	});

	test("Wave 1.2 diary side-effects use withSavepoint so SQL error in commission insert never poisons PG TX (25P02)", async () => {
		const diaryId = crypto.randomUUID();
		await withTenantWriteCtx(ORG_A, async (tx) => {
			await tx.insert(visitDiaries).values({
				id: diaryId,
				organizationId: ORG_A,
				visitId: VISIT_A,
				patientId: PATIENT_A,
				complaint: "Боль при накусывании",
				statusLocalis: "Зуб 26 интактен кроме фиссуры",
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "26",
				treatmentDescription: "Препарирование и реставрация",
			});

			// Pass a non-existent userId FK so step 2 (doctorCommissions.insert) triggers PG 23503.
			// Without withSavepoint, PG TX becomes 25P02 aborted and the outer TX rolls back!
			await dispatchDiarySigningSideEffects(tx, {
				organizationId: ORG_A,
				visitId: VISIT_A,
				userId: MISSING_USER_FK,
			});

			// Enclosing TX MUST remain healthy after side-effect failure!
			const [stillAlive] = await tx
				.select({ id: visitDiaries.id })
				.from(visitDiaries)
				.where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, ORG_A)))
				.limit(1);
			assert.equal(stillAlive?.id, diaryId);
		});

		// Verify diary actually committed in PostgreSQL
		const [committed] = await withTenantReadCtx(ORG_A, (tx) =>
			tx
				.select({ id: visitDiaries.id, diagnosisTooth: visitDiaries.diagnosisTooth })
				.from(visitDiaries)
				.where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, ORG_A)))
				.limit(1),
		);
		assert.equal(committed?.id, diaryId);
		assert.equal(committed?.diagnosisTooth, "26");
	});
});

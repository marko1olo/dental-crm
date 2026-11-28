import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { clinics, organizations, users } from "../../db/schema.js";
import { registerCohortRoutes } from "../../routes/analytics/cohortRoutes.js";
import { registerCuratorRoutes } from "../../routes/analytics/curatorRoutes.js";
import { registerRebookingRoutes } from "../../routes/analytics/rebookingRoutes.js";
import { registerClinicWorkflowsRoutes } from "../../routes/clinicWorkflows.js";
import { registerEgiszOutboxRoutes } from "../../routes/egisz/outboxRoutes.js";
import { fetchInboxConversations } from "../../routes/omnichannelBots/triageModules/triageConversationsQuery.js";
import {
	checkKioskRateLimit,
	kioskIpRequestCounts,
	resetKioskRateLimitsForTesting,
} from "../../routes/portal/kiosk/kioskRateLimiter.js";
import { registerBackupRoutes } from "../../routes/settings/backupRoutes.js";
import { registerTasksRoutes } from "../../routes/tasks.js";
import { workspaceProfileRoutes } from "../../routes/workspaceProfileRoutes/index.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "infraP1SecurityAndRlsProof";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const OWNER_ID = fixtureUuid(NAMESPACE, 3);
const ADMIN_ID = fixtureUuid(NAMESPACE, 4);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 5);
const REGISTRAR_ID = fixtureUuid(NAMESPACE, 6);
const ASSISTANT_ID = fixtureUuid(NAMESPACE, 7);

const OWNER_SESSION = randomUUID();
const ADMIN_SESSION = randomUUID();
const DOCTOR_SESSION = randomUUID();
const REGISTRAR_SESSION = randomUUID();
const ASSISTANT_SESSION = randomUUID();
const TEST_SECRET = "infra-p1-security-rls-proof-secret-".padEnd(48, "k");

describe("Infra P1 Security, routeFactories, RLS & BoundedTtlMap Proof", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";
	let ownerToken = "";
	let adminToken = "";
	let doctorToken = "";
	let registrarToken = "";
	let assistantToken = "";

	before(async () => {
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "0";
		process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS = "0";
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		resetAuthSecretCacheForTests();

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Инфра Тест",
					clinicMode: "small_clinic",
				})
				.onConflictDoNothing();
			await db
				.insert(clinics)
				.values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Филиал Инфра",
					timezone: "Europe/Moscow",
				})
				.onConflictDoNothing();

			for (const [id, fullName, role, sessionId] of [
				[OWNER_ID, "Владелец Инфра", "owner", OWNER_SESSION],
				[ADMIN_ID, "Админ Инфра", "admin", ADMIN_SESSION],
				[DOCTOR_ID, "Врач Инфра", "doctor", DOCTOR_SESSION],
				[REGISTRAR_ID, "Регистратор Инфра", "registrar", REGISTRAR_SESSION],
				[ASSISTANT_ID, "Ассистент Инфра", "assistant", ASSISTANT_SESSION],
			] as const) {
				await db
					.insert(users)
					.values({
						id,
						organizationId: ORG_ID,
						fullName,
						role,
						passwordHash: `synthetic-${role}`,
						currentSessionId: sessionId,
						isActive: true,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: { currentSessionId: sessionId, isActive: true },
					});
			}
		});

		process.env.DENTE_STRICT_TENANT_DB_TRAP = "1";

		clinicToken = signToken({ organizationId: ORG_ID }, TEST_SECRET);
		ownerToken = signToken(
			{ organizationId: ORG_ID, userId: OWNER_ID, role: "owner", sessionId: OWNER_SESSION },
			TEST_SECRET,
		);
		adminToken = signToken(
			{ organizationId: ORG_ID, userId: ADMIN_ID, role: "admin", sessionId: ADMIN_SESSION },
			TEST_SECRET,
		);
		doctorToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor", sessionId: DOCTOR_SESSION },
			TEST_SECRET,
		);
		registrarToken = signToken(
			{ organizationId: ORG_ID, userId: REGISTRAR_ID, role: "registrar", sessionId: REGISTRAR_SESSION },
			TEST_SECRET,
		);
		assistantToken = signToken(
			{ organizationId: ORG_ID, userId: ASSISTANT_ID, role: "assistant", sessionId: ASSISTANT_SESSION },
			TEST_SECRET,
		);

		app = Fastify();
		await app.register(workspaceProfileRoutes);
		await registerRebookingRoutes(app);
		registerBackupRoutes(app);
		registerEgiszOutboxRoutes(app);
		await registerClinicWorkflowsRoutes(app);
		await registerTasksRoutes(app);
		await registerCohortRoutes(app);
		await registerCuratorRoutes(app);
		await app.ready();
	});

	after(async () => {
		delete process.env.DENTE_STRICT_TENANT_DB_TRAP;
		resetKioskRateLimitsForTesting();
		await app?.close();
		await purgeFixtureOrganizations([ORG_ID]);
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("P1-2: workspaceProfile routes enforce strict RLS tx, auth, and settings.write RBAC", async () => {
		const anon = await app.inject({ method: "GET", url: "/api/workspace/profile" });
		assert.equal(anon.statusCode, 401);

		const getProfile = await app.inject({
			method: "GET",
			url: "/api/workspace/profile",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: ownerToken },
		});
		assert.equal(getProfile.statusCode, 200);

		const getChairs = await app.inject({
			method: "GET",
			url: "/api/workspace/chairs",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: doctorToken },
		});
		assert.equal(getChairs.statusCode, 200);

		const regMutate = await app.inject({
			method: "POST",
			url: "/api/workspace/profile",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: registrarToken },
			payload: { hasPediatricMode: true },
		});
		assert.equal(regMutate.statusCode, 403);

		const ownerMutate = await app.inject({
			method: "POST",
			url: "/api/workspace/profile",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: ownerToken },
			payload: { hasPediatricMode: true },
		});
		assert.equal(ownerMutate.statusCode, 200);
		assert.equal(ownerMutate.json().hasPediatricMode, true);
	});

	test("P1-3: fetchInboxConversations executes strictly inside withTenantReadCtx (DENTE_STRICT_TENANT_DB_TRAP=1)", async () => {
		const res = await fetchInboxConversations(ORG_ID);
		assert.deepEqual(res, { conversations: [] });
	});

	test("P1-4: rebookingRoutes enforces executive RBAC and rejects bare clinicToken", async () => {
		const bare = await app.inject({
			method: "GET",
			url: "/api/analytics/rebooking-conversion",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
		});
		assert.equal(bare.statusCode, 401);

		const reg = await app.inject({
			method: "GET",
			url: "/api/analytics/rebooking-conversion",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: registrarToken },
		});
		assert.equal(reg.statusCode, 403);

		const regPost = await app.inject({
			method: "POST",
			url: "/api/analytics/rebooking-conversion",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: registrarToken },
			payload: { patientName: "Тест", rebookedBy: "Рег", timeDeltaMinutes: 10 },
		});
		assert.equal(regPost.statusCode, 403);

		const ownerGet = await app.inject({
			method: "GET",
			url: "/api/analytics/rebooking-conversion",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: ownerToken },
		});
		assert.equal(ownerGet.statusCode, 200);
	});

	test("P1-4: backupRoutes blocks bare clinicToken (401) and non-owner staff (403)", async () => {
		for (const [method, url, payload] of [
			["GET", "/api/settings/backup/list", undefined],
			["POST", "/api/settings/backup/create", {}],
			["POST", "/api/settings/backup/restore", { filename: `org_${ORG_ID}_test.dentalbackup` }],
		] as const) {
			const bareRes = await app.inject({
				method,
				url,
				headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
				...(payload !== undefined ? { payload } : {}),
			});
			assert.equal(bareRes.statusCode, 401, `${method} ${url} must reject bare clinicToken`);
		}

		const adminCreate = await app.inject({
			method: "POST",
			url: "/api/settings/backup/create",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: adminToken },
			payload: {},
		});
		assert.equal(adminCreate.statusCode, 403);

		const adminRestore = await app.inject({
			method: "POST",
			url: "/api/settings/backup/restore",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: adminToken },
			payload: { filename: `org_${ORG_ID}_test.dentalbackup` },
		});
		assert.equal(adminRestore.statusCode, 403);
	});

	test("P1-4 & P1-1: egisz, cohorts, curators, workflows, and tasks enforce role permissions", async () => {
		const assistantEgisz = await app.inject({
			method: "GET",
			url: "/api/egisz/outbox",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: assistantToken },
		});
		assert.equal(assistantEgisz.statusCode, 403);

		const doctorEgisz = await app.inject({
			method: "GET",
			url: "/api/egisz/outbox",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: doctorToken },
		});
		assert.equal(doctorEgisz.statusCode, 200);

		const regCohorts = await app.inject({
			method: "GET",
			url: "/api/analytics/cohorts",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: registrarToken },
		});
		assert.equal(regCohorts.statusCode, 403);

		const ownerCurators = await app.inject({
			method: "GET",
			url: "/api/analytics/curators",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: ownerToken },
		});
		assert.equal(ownerCurators.statusCode, 200);

		const docWorkflow = await app.inject({
			method: "POST",
			url: "/api/clinic/workflows",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: doctorToken },
			payload: { name: "Test", definition: "{}" },
		});
		assert.equal(docWorkflow.statusCode, 403);

		const assistantTask = await app.inject({
			method: "POST",
			url: "/api/tasks",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: assistantToken },
			payload: { title: "Task", patientId: randomUUID() },
		});
		assert.equal(assistantTask.statusCode, 403);
	});

	test("P2-1: kioskIpRequestCounts uses BoundedTtlMap capped at 5000 entries", () => {
		resetKioskRateLimitsForTesting();
		for (let i = 0; i < 5150; i++) {
			checkKioskRateLimit(`10.0.${Math.floor(i / 256)}.${i % 256}`);
		}
		assert.ok(kioskIpRequestCounts.size <= 5000, `Expected <= 5000 entries, got ${kioskIpRequestCounts.size}`);
		resetKioskRateLimitsForTesting();
		assert.equal(kioskIpRequestCounts.size, 0);
	});
});

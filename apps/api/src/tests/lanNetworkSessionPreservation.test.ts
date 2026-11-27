import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { defineTenantQuery } from "../core/routeFactories.js";
import { organizations, users } from "../db/schema.js";
import {
	clearAutoJoinRateLimitsForTest,
	clearPairingNoncesForTest,
	registerLanNetworkRoutes,
} from "../routes/lanNetwork.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
	invalidateStaffSessionCache,
} from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";

const NS = "lanNetworkSessionPreservation";
const ORG_A = fixtureUuid(NS, 1);
const DOCTOR_ACTIVE = fixtureUuid(NS, 2);
const DOCTOR_NO_SESSION = fixtureUuid(NS, 3);
const DOCTOR_INACTIVE = fixtureUuid(NS, 4);

function readJsonRecord(bodyText: string): Record<string, unknown> {
	const parsed: unknown = JSON.parse(bodyText);
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error(`Expected JSON object, got: ${bodyText}`);
	}
	return Object.fromEntries(Object.entries(parsed));
}

function readStringField(record: Record<string, unknown>, key: string): string {
	const value = record[key];
	assert.equal(typeof value, "string", `Expected string field "${key}"`);
	return typeof value === "string" ? value : "";
}

describe("LAN QR Pairing preserves active desktop staff session & enforces revocation", () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let desktopSessionId = "";
	let desktopStaffToken = "";

	before(async () => {
		await purgeFixtureOrganizations([ORG_A]);
		clearPairingNoncesForTest();
		clearAutoJoinRateLimitsForTest();
		invalidateStaffSessionCache();

		desktopSessionId = crypto.randomUUID();

		await withFixtureTenant(ORG_A, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_A,
				name: "Клиника Сессионного Сопряжения",
			});
			await tx.insert(users).values([
				{
					id: DOCTOR_ACTIVE,
					organizationId: ORG_A,
					fullName: "Доктор Десктопный Д.Д.",
					role: "doctor",
					isActive: true,
					currentSessionId: desktopSessionId,
				},
				{
					id: DOCTOR_NO_SESSION,
					organizationId: ORG_A,
					fullName: "Доктор Новый Н.Н.",
					role: "doctor",
					isActive: true,
					currentSessionId: null,
				},
				{
					id: DOCTOR_INACTIVE,
					organizationId: ORG_A,
					fullName: "Уволенный Сотрудник У.У.",
					role: "doctor",
					isActive: false,
					currentSessionId: null,
				},
			]);
		});

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_A, role: "clinic" }, secret, 3600);
		desktopStaffToken = signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_ACTIVE,
				fullName: "Доктор Десктопный Д.Д.",
				role: "doctor",
				sessionId: desktopSessionId,
			},
			secret,
			3600,
		);

		app = Fastify({ logger: false });
		await registerLanNetworkRoutes(app);
		defineTenantQuery(app, {
			path: "/test/session-check",
			permission: "patients.read",
			handler: async ({ principal }) => ({
				ok: true,
				userId: principal.userId,
				sessionId: principal.sessionId,
			}),
		});
		await app.ready();
	});

	after(async () => {
		clearPairingNoncesForTest();
		clearAutoJoinRateLimitsForTest();
		invalidateStaffSessionCache();
		await app.close();
		await purgeFixtureOrganizations([ORG_A]);
	});

	it("1. POST /api/network/pair/verify preserves desktop currentSessionId and keeps both desktop & tablet tokens valid until logout", async () => {
		const beforeDesktopCheck = await app.inject({
			method: "GET",
			url: "/test/session-check",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: desktopStaffToken,
			},
		});
		assert.equal(beforeDesktopCheck.statusCode, 200);

		const genRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/generate",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: desktopStaffToken,
			},
			payload: {
				role: "doctor",
				staffUserId: DOCTOR_ACTIVE,
			},
		});
		assert.equal(genRes.statusCode, 200);
		const genJson = readJsonRecord(genRes.body);
		const pairingToken = readStringField(genJson, "pairingToken");
		const pairingPin = readStringField(genJson, "pairingPin");

		const verifyRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/verify",
			payload: {
				token: pairingToken,
				pin: pairingPin,
				deviceName: "Doctor Chairside iPad",
			},
		});
		assert.equal(verifyRes.statusCode, 200);
		const verifyJson = readJsonRecord(verifyRes.body);
		assert.equal(verifyJson.ok, true);
		const pairedStaffToken = readStringField(verifyJson, "staffToken");
		const pairedClinicToken = readStringField(verifyJson, "clinicToken");
		assert.ok(pairedStaffToken.length > 20);

		const [dbUser] = await withFixtureTenant(ORG_A, (tx) =>
			tx
				.select({ currentSessionId: users.currentSessionId })
				.from(users)
				.where(and(eq(users.id, DOCTOR_ACTIVE), eq(users.organizationId, ORG_A)))
				.limit(1),
		);
		assert.equal(dbUser?.currentSessionId, desktopSessionId);

		const afterDesktopCheck = await app.inject({
			method: "GET",
			url: "/test/session-check",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: desktopStaffToken,
			},
		});
		assert.equal(afterDesktopCheck.statusCode, 200, "Desktop session must NOT be evicted after tablet pairing");

		const tabletCheck = await app.inject({
			method: "GET",
			url: "/test/session-check",
			headers: {
				[CLINIC_TOKEN_HEADER]: pairedClinicToken,
				[STAFF_TOKEN_HEADER]: pairedStaffToken,
			},
		});
		assert.equal(tabletCheck.statusCode, 200, "Paired tablet staffToken must pass verifyActiveStaffSession");

		await withFixtureTenant(ORG_A, (tx) =>
			tx
				.update(users)
				.set({ currentSessionId: null })
				.where(and(eq(users.id, DOCTOR_ACTIVE), eq(users.organizationId, ORG_A))),
		);
		invalidateStaffSessionCache(DOCTOR_ACTIVE, ORG_A);

		const revokedDesktop = await app.inject({
			method: "GET",
			url: "/test/session-check",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: desktopStaffToken,
			},
		});
		assert.equal(revokedDesktop.statusCode, 401);
		assert.equal(readStringField(readJsonRecord(revokedDesktop.body), "error"), "invalid_session");

		const revokedTablet = await app.inject({
			method: "GET",
			url: "/test/session-check",
			headers: {
				[CLINIC_TOKEN_HEADER]: pairedClinicToken,
				[STAFF_TOKEN_HEADER]: pairedStaffToken,
			},
		});
		assert.equal(revokedTablet.statusCode, 401);
		assert.equal(readStringField(readJsonRecord(revokedTablet.body), "error"), "invalid_session");
	});

	it("2. POST /api/network/pair/verify initializes currentSessionId when user has none and invalidates stale null cache", async () => {
		const unauthPreCheck = await app.inject({
			method: "GET",
			url: "/test/session-check",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: signToken(
					{
						organizationId: ORG_A,
						userId: DOCTOR_NO_SESSION,
						role: "doctor",
						sessionId: crypto.randomUUID(),
					},
					authTokenSecret(),
					300,
				),
			},
		});
		assert.equal(unauthPreCheck.statusCode, 401);

		const genRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/generate",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
			payload: { role: "doctor", staffUserId: DOCTOR_NO_SESSION },
		});
		assert.equal(genRes.statusCode, 200);
		const genJson = readJsonRecord(genRes.body);
		const pairingToken = readStringField(genJson, "pairingToken");
		const pairingPin = readStringField(genJson, "pairingPin");

		const verifyRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/verify",
			payload: { token: pairingToken, pin: pairingPin },
		});
		assert.equal(verifyRes.statusCode, 200);
		const verifyJson = readJsonRecord(verifyRes.body);
		const pairedStaffToken = readStringField(verifyJson, "staffToken");
		const pairedClinicToken = readStringField(verifyJson, "clinicToken");

		const tabletCheck = await app.inject({
			method: "GET",
			url: "/test/session-check",
			headers: {
				[CLINIC_TOKEN_HEADER]: pairedClinicToken,
				[STAFF_TOKEN_HEADER]: pairedStaffToken,
			},
		});
		assert.equal(tabletCheck.statusCode, 200);
	});

	it("3. POST /api/network/pair/verify rejects deactivated staff user with 403", async () => {
		const genRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/generate",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
			payload: { role: "doctor", staffUserId: DOCTOR_INACTIVE },
		});
		assert.equal(genRes.statusCode, 200);
		const genJson = readJsonRecord(genRes.body);
		const pairingToken = readStringField(genJson, "pairingToken");
		const pairingPin = readStringField(genJson, "pairingPin");

		const verifyRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/verify",
			payload: { token: pairingToken, pin: pairingPin },
		});
		assert.equal(verifyRes.statusCode, 403);
		assert.equal(readStringField(readJsonRecord(verifyRes.body), "error"), "StaffUserNotFound");
	});
});

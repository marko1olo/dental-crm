import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	familyGroups,
	organizations,
	patientRelationships,
	patients,
	portalBudgetTokens,
	users,
} from "../../db/schema.js";
import { registerAuthRoutes } from "../../routes/auth.js";
import { portalRoutes } from "../../routes/portal/index.js";
import { publicBudgetRoutes } from "../../routes/publicBudgetRoutes.js";
import { registerTelegramReferralLoyaltyRoutes } from "../../routes/telegramBotLoyalty/index.js";
import { registerYandexCalendarRoutes } from "../../routes/yandexCalendar.js";
import { updateAppointmentStatusFromTelegram } from "../../routes/telegram/webhookModules/telegramCallbackMutations.js";
import { OmnichannelTokenVault } from "../../services/bots/OmnichannelTokenVault.js";
import { TelegramBotBillingService } from "../../services/telegram/TelegramBotBillingService.js";
import { TelegramTokenVault } from "../../services/telegram/TelegramTokenVault.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { hashTelegramChatFingerprint } from "../../utils/telegramChatHash.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const FIXTURE = "wave14Fixer";
const TEST_AUTH_SECRET = "wave14-test-auth-secret-key-32-chars!!";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const STAFF_ID = fixtureUuid(FIXTURE, 2);
const ADMIN_STAFF_ID = fixtureUuid(FIXTURE, 3);
const DOCTOR_ID = fixtureUuid(FIXTURE, 4);
const HEAD_PATIENT_ID = fixtureUuid(FIXTURE, 5);
const MEMBER_PATIENT_ID = fixtureUuid(FIXTURE, 6);
const OUTSIDER_PATIENT_ID = fixtureUuid(FIXTURE, 7);
const FAMILY_GROUP_ID = fixtureUuid(FIXTURE, 8);
const APPT_ID = fixtureUuid(FIXTURE, 9);
const BUDGET_TOKEN = `w14-budget-${fixtureUuid(FIXTURE, 10)}`;

function makeInitData(user: { id: number; first_name: string }, botToken: string): string {
	const params = new URLSearchParams();
	params.set("auth_date", String(Math.floor(Date.now() / 1000)));
	params.set("user", JSON.stringify(user));
	const checkStr = Array.from(params.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join("\n");
	const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
	params.set("hash", createHmac("sha256", secret).update(checkStr).digest("hex"));
	return params.toString();
}

describe("Wave 14 Messaging, Bots, Portals & Auth Fixer Regression Suite", () => {
	before(async () => {
		process.env.AUTH_TOKEN_SECRET = TEST_AUTH_SECRET;
		process.env.DENTE_AUTH_TOKEN_SECRET = TEST_AUTH_SECRET;
		resetAuthSecretCacheForTests();
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({ id: ORG_ID, name: "Клиника Волна 14" }).onConflictDoNothing();
			await tx.insert(users).values([
				{
					id: STAFF_ID,
					organizationId: ORG_ID,
					email: "w14doc@clinic.test",
					fullName: "Доктор Волна 14",
					role: "doctor",
					isActive: true,
					yandexCalendarToken: { tokenVersion: 2, rotatedAt: "2026-01-01T00:00:00.000Z" },
				},
				{
					id: ADMIN_STAFF_ID,
					organizationId: ORG_ID,
					email: "w14admin@clinic.test",
					fullName: "Администратор Волна 14",
					role: "administrator",
					isActive: true,
				},
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					email: "w14doc2@clinic.test",
					fullName: "Врач Второй 14",
					role: "doctor",
					isActive: true,
				},
			]).onConflictDoNothing();

			await tx.insert(familyGroups).values({
				id: FAMILY_GROUP_ID,
				organizationId: ORG_ID,
				name: "Семья Главы",
				groupName: "Семья Главы",
				headPatientId: HEAD_PATIENT_ID,
				primaryPatientId: HEAD_PATIENT_ID,
				balance: "100.00",
				balanceKopecks: 250000,
			}).onConflictDoNothing();

			await tx.insert(patients).values([
				{
					id: HEAD_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Глава Семьи",
					phone: "+79991112233",
					familyGroupId: FAMILY_GROUP_ID,
					administrativeProfile: { telegramUserId: "555001" },
				},
				{
					id: MEMBER_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Член Семьи",
					phone: "+79991112244",
					familyGroupId: FAMILY_GROUP_ID,
				},
				{
					id: OUTSIDER_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Посторонний Пациент",
					phone: "+79991112299",
				},
			]).onConflictDoNothing();

			await tx.insert(patientRelationships).values({
				organizationId: ORG_ID,
				patientId: HEAD_PATIENT_ID,
				relatedPatientId: MEMBER_PATIENT_ID,
				relationshipType: "child",
				canSpendFamilyWallet: false,
			}).onConflictDoNothing();

			await tx.insert(appointments).values({
				id: APPT_ID,
				organizationId: ORG_ID,
				patientId: HEAD_PATIENT_ID,
				doctorUserId: DOCTOR_ID,
				startsAt: new Date("2026-12-01T10:00:00.000Z"),
				endsAt: new Date("2026-12-01T11:00:00.000Z"),
				status: "planned",
			}).onConflictDoNothing();

			await tx.insert(portalBudgetTokens).values({
				organizationId: ORG_ID,
				planId: fixtureUuid(FIXTURE, 11),
				patientId: HEAD_PATIENT_ID,
				token: BUDGET_TOKEN,
				status: "accepted",
				authMethod: "phone_last4",
				patientPhone: "+79991112233",
				clinicName: "Клиника Волна 14",
				doctorName: "Доктор Волна 14",
				patientFirstName: "Глава",
				totalPriceRub: "5000.00",
				netTotalRub: "5000.00",
				items: [{ title: "Гигиена", priceRub: 5000 }],
			}).onConflictDoNothing();
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("[W14-MSG-01] rejects unauthenticated WebApp /complaint and /book and non-UUID /slots", async () => {
		const app = Fastify();
		await registerTelegramReferralLoyaltyRoutes(app);
		await app.ready();

		const complaintRes = await app.inject({
			method: "POST",
			url: "/api/telegram/webapp/complaint",
			payload: {
				organizationId: ORG_ID,
				patientId: HEAD_PATIENT_ID,
				toothNumber: 16,
				symptom: "Острая боль",
			},
		});
		assert.equal(complaintRes.statusCode, 401);

		const bookRes = await app.inject({
			method: "POST",
			url: "/api/telegram/webapp/book",
			payload: {
				organizationId: ORG_ID,
				patientId: HEAD_PATIENT_ID,
				doctorId: DOCTOR_ID,
				date: "2026-12-05",
				time: "12:00",
			},
		});
		assert.equal(bookRes.statusCode, 401);

		const slotsBadOrg = await app.inject({
			method: "GET",
			url: "/api/telegram/webapp/slots?organizationId=not-a-uuid",
		});
		assert.equal(slotsBadOrg.statusCode, 400);

		const prevBot = process.env.TELEGRAM_BOT_TOKEN;
		process.env.TELEGRAM_BOT_TOKEN = "w14_test_bot_token";
		try {
			const attackerInit = makeInitData({ id: 555001, first_name: "Head" }, "w14_test_bot_token");
			const crossPatientComplaint = await app.inject({
				method: "POST",
				url: "/api/telegram/webapp/complaint",
				headers: { "x-telegram-init-data": attackerInit },
				payload: {
					organizationId: ORG_ID,
					patientId: OUTSIDER_PATIENT_ID,
					toothNumber: 16,
					symptom: "Попытка BOLA",
				},
			});
			assert.equal(crossPatientComplaint.statusCode, 403);
		} finally {
			if (prevBot === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
			else process.env.TELEGRAM_BOT_TOKEN = prevBot;
		}
		await app.close();
	});

	it("[W14-MSG-02] rejects updateAppointmentStatusFromTelegram when chatHash is null or unlinked", async () => {
		const resNull = await updateAppointmentStatusFromTelegram(ORG_ID, APPT_ID, "confirmed", null);
		assert.equal(resNull, false);

		const resUnlinked = await updateAppointmentStatusFromTelegram(
			ORG_ID,
			APPT_ID,
			"confirmed",
			"000000000000000000000000",
		);
		assert.equal(resUnlinked, false);
	});

	it("[W14-MSG-03] gates demo-showcase tokens behind demoLoginAllowed and strips raw yandexCalendarToken from /api/auth/user/me", async () => {
		const prevAllow = process.env.DENTE_ALLOW_DEMO_LOGIN;
		delete process.env.DENTE_ALLOW_DEMO_LOGIN;

		const app = Fastify();
		await registerAuthRoutes(app);
		await app.ready();

		const demoStatus = await app.inject({
			method: "GET",
			url: "/api/auth/status",
			headers: {
				"x-dente-clinic-token": "demo-showcase-token",
				"x-dente-staff-token": "demo-showcase-staff-token-owner",
			},
		});
		assert.equal(demoStatus.statusCode, 200);
		assert.equal(demoStatus.json().clinicUnlocked, false);
		assert.equal(demoStatus.json().staffUnlocked, false);

		const staffToken = signToken(
			{ userId: STAFF_ID, organizationId: ORG_ID, role: "doctor", kind: "staff" },
			TEST_AUTH_SECRET,
			3600,
		);
		const meRes = await app.inject({
			method: "GET",
			url: "/api/auth/user/me",
			headers: { "x-dente-staff-token": staffToken },
		});
		assert.equal(meRes.statusCode, 200);
		const meJson = meRes.json();
		assert.equal("yandexCalendarToken" in meJson.user, false);
		assert.equal(meJson.user.hasYandexCalendar, true);

		if (prevAllow !== undefined) process.env.DENTE_ALLOW_DEMO_LOGIN = prevAllow;
		await app.close();
	});

	it("[W14-MSG-05] blocks non-head family member from updating family wallet permissions", async () => {
		const app = Fastify();
		await app.register(portalRoutes, { prefix: "/api/portal" });
		await app.ready();

		const memberToken = signToken(
			{ sub: MEMBER_PATIENT_ID, organizationId: ORG_ID, kind: "portal" },
			TEST_AUTH_SECRET,
			3600,
		);
		const badUuidRes = await app.inject({
			method: "PATCH",
			url: "/api/portal/family/permissions",
			headers: { authorization: `Bearer ${memberToken}` },
			payload: { memberId: "not-a-uuid", canSpendFamilyWallet: true },
		});
		assert.equal(badUuidRes.statusCode, 400);

		const nonHeadRes = await app.inject({
			method: "PATCH",
			url: "/api/portal/family/permissions",
			headers: { authorization: `Bearer ${memberToken}` },
			payload: { memberId: HEAD_PATIENT_ID, canSpendFamilyWallet: true },
		});
		assert.equal(nonHeadRes.statusCode, 403);

		await app.close();
	});

	it("[W14-MSG-06] masks accepted public budget when caller has no session token", async () => {
		const app = Fastify();
		await app.register(publicBudgetRoutes);
		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: `/api/v1/public/budgets/${BUDGET_TOKEN}`,
		});
		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.requiresVerification, true);
		assert.equal(body.isVerified, false);
		assert.equal(body.items, undefined);

		await app.close();
	});

	it("[W14-MSG-08] uses full 64-hex SHA-256 fingerprint helper", () => {
		const fp = hashTelegramChatFingerprint("770099");
		assert.equal(fp.length, 64);
		assert.match(fp, /^[0-9a-f]{64}$/);
	});

	it("[W14-MSG-10] validates UUID doctorId, allows administrator role, and preserves iCal tokenVersion on Yandex settings update", async () => {
		const app = Fastify();
		await registerYandexCalendarRoutes(app);
		await app.ready();

		const adminToken = signToken(
			{ userId: ADMIN_STAFF_ID, organizationId: ORG_ID, role: "administrator", kind: "staff" },
			TEST_AUTH_SECRET,
			3600,
		);
		const docToken = signToken(
			{ userId: STAFF_ID, organizationId: ORG_ID, role: "doctor", kind: "staff" },
			TEST_AUTH_SECRET,
			3600,
		);

		const badDoctorRes = await app.inject({
			method: "GET",
			url: "/api/schedule/ical/doctor/not-uuid/feed-url",
			headers: { "x-dente-staff-token": adminToken },
		});
		assert.equal(badDoctorRes.statusCode, 400);

		const adminAccessRes = await app.inject({
			method: "GET",
			url: `/api/schedule/ical/doctor/${STAFF_ID}/feed-url`,
			headers: { "x-dente-staff-token": adminToken },
		});
		assert.equal(adminAccessRes.statusCode, 200);
		assert.equal(adminAccessRes.json().tokenVersion, 2);

		const saveRes = await app.inject({
			method: "POST",
			url: "/api/integrations/yandex-calendar/settings",
			headers: { "x-dente-staff-token": docToken },
			payload: { yandexCalendarId: "cal-123", yandexCalendarToken: "oauth_xyz" },
		});
		assert.equal(saveRes.statusCode, 200);

		const [updatedStaff] = await withTenantCtx(ORG_ID, (tx) =>
			tx
				.select({ yandexCalendarToken: users.yandexCalendarToken })
				.from(users)
				.where(and(eq(users.id, STAFF_ID), eq(users.organizationId, ORG_ID)))
				.limit(1),
		);
		const meta = updatedStaff?.yandexCalendarToken as Record<string, unknown>;
		assert.equal(meta?.tokenVersion, 2);
		assert.equal(meta?.oauthToken, "oauth_xyz");

		await app.close();
	});

	it("[W14-MSG-11 & Vault] persists TelegramBotBillingService to DB and enforces production master key", async () => {
		TelegramBotBillingService.resetUsageForTesting(ORG_ID);
		TelegramBotBillingService.changePlan({ organizationId: ORG_ID, newPlanId: "pro" });
		await TelegramBotBillingService.persistBillingRecord(ORG_ID);
		TelegramBotBillingService.resetUsageForTesting(ORG_ID);
		const hydrated = await TelegramBotBillingService.hydrateOrganizationBilling(ORG_ID);
		assert.equal(hydrated.planId, "pro");

		const prevEnv = process.env.NODE_ENV;
		const prevTgKey = process.env.TELEGRAM_TOKEN_VAULT_MASTER_KEY;
		const prevOmniKey = process.env.OMNICHANNEL_BOT_VAULT_MASTER_KEY;
		const prevAppSecret = process.env.APP_SECRET;
		try {
			process.env.NODE_ENV = "production";
			delete process.env.TELEGRAM_TOKEN_VAULT_MASTER_KEY;
			delete process.env.OMNICHANNEL_BOT_VAULT_MASTER_KEY;
			delete process.env.APP_SECRET;

			assert.throws(() => TelegramTokenVault.encryptToken("123:abc", ORG_ID));
			assert.throws(() => OmnichannelTokenVault.encrypt("123:abc", ORG_ID));
		} finally {
			process.env.NODE_ENV = prevEnv;
			if (prevTgKey !== undefined) process.env.TELEGRAM_TOKEN_VAULT_MASTER_KEY = prevTgKey;
			if (prevOmniKey !== undefined) process.env.OMNICHANNEL_BOT_VAULT_MASTER_KEY = prevOmniKey;
			if (prevAppSecret !== undefined) process.env.APP_SECRET = prevAppSecret;
		}
	});
});

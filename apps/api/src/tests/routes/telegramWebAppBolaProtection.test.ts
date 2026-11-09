import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients } from "../../db/schema.js";
import { portalRoutes } from "../../routes/portal.js";
import { bookingVerificationEngine } from "../../services/publicBookingQueue/bookingVerificationEngine.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const FIXTURE = "tgBolaSec";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ALICE_ID = fixtureUuid(FIXTURE, 2);
const PATIENT_BOB_ID = fixtureUuid(FIXTURE, 3);
const BOT_TOKEN = "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_TestBotToken";

function createValidInitData(user: { id: number; first_name: string; username?: string }) {
	const userStr = JSON.stringify(user);
	const authDate = Math.floor(Date.now() / 1000);
	const params = new URLSearchParams();
	params.set("auth_date", String(authDate));
	params.set("query_id", "AAG_test_123");
	params.set("user", userStr);

	const dataCheckString = Array.from(params.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, val]) => `${key}=${val}`)
		.join("\n");

	const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
	const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
	params.set("hash", hash);

	return params.toString();
}

describe("Telegram WebApp BOLA / IDOR Protection & Verification Suite [POR-01]", () => {
	let app: FastifyInstance;

	before(async () => {
		process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
		process.env.DENTE_AUTH_TOKEN_SECRET = "test-secret-for-portal-jwt-token-32chars";

		app = Fastify({ logger: false });
		await app.register(portalRoutes, { prefix: "/api/portal" });
		await app.ready();

		await purgeFixtureOrganizations([ORG_ID]);

		// Seed tenant and test patients
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Безопасных Медкарт",
			}).onConflictDoNothing();

			// Пациент 1 (Алиса): уже привязан к Telegram ID 111111111
			await tx.insert(patients).values({
				id: PATIENT_ALICE_ID,
				organizationId: ORG_ID,
				fullName: "Алиса Власова",
				phone: "+79001112233",
				administrativeProfile: {
					telegramUserId: "111111111",
					telegramUsername: "alice_vlasova",
				},
			}).onConflictDoNothing();

			// Пациент 2 (Боб): Telegram ещё не привязан
			await tx.insert(patients).values({
				id: PATIENT_BOB_ID,
				organizationId: ORG_ID,
				fullName: "Боб Иванов",
				phone: "+79004445566",
				administrativeProfile: null,
			}).onConflictDoNothing();
		});
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("1. BOLA Attack: rejects attacker attempting to hijack Alice's medcard using Alice's phone with attacker Telegram ID", async () => {
		const attackerInitData = createValidInitData({
			id: 999999999, // Атакующий с чужим Telegram ID
			first_name: "Attacker",
			username: "evil_hacker",
		});

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/auth/telegram-webapp",
			payload: {
				initData: attackerInitData,
				organizationId: ORG_ID,
				phone: "+79001112233", // Телефон Алисы
			},
		});

		assert.strictEqual(res.statusCode, 403);
		const body = res.json();
		assert.strictEqual(body.error, "AccountMismatch");
		assert.ok(body.message.includes("привязан к другому"));
	});

	it("2. Initial link protection: rejects linking Bob's medcard without verification code", async () => {
		const userInitData = createValidInitData({
			id: 222222222,
			first_name: "Bob",
		});

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/auth/telegram-webapp",
			payload: {
				initData: userInitData,
				organizationId: ORG_ID,
				phone: "+79004445566", // Боб без кода
			},
		});

		// В режиме разработки/тестов без кода верификации
		assert.strictEqual(res.statusCode, 403);
		assert.strictEqual(res.json().error, "VerificationRequired");
	});

	it("3. Successfully verifies and links Telegram with valid verification code", async () => {
		const userInitData = createValidInitData({
			id: 222222222,
			first_name: "Bob",
			username: "bob_patient",
		});

		bookingVerificationEngine.requestPhoneVerification("+79004445566");
		const verificationCode = bookingVerificationEngine.getActiveCodeForTesting("+79004445566") || "123456";

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/auth/telegram-webapp",
			payload: {
				initData: userInitData,
				organizationId: ORG_ID,
				phone: "+79004445566",
				verificationCode,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = res.json();
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.patientId, PATIENT_BOB_ID);
		assert.ok(typeof body.token === "string" && body.token.length > 20);
	});

	it("4. Authenticates directly by telegramUserId without phone once bound", async () => {
		const aliceInitData = createValidInitData({
			id: 111111111,
			first_name: "Alice",
		});

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/auth/telegram-webapp",
			payload: {
				initData: aliceInitData,
				organizationId: ORG_ID,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = res.json();
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.patientId, PATIENT_ALICE_ID);
	});
});

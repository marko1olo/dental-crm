import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerTelegramRoutes } from "../routes/telegram.js";
import {
	TelegramTokenVault,
	TelegramTokenVaultAuthenticationError,
	TelegramTokenVaultError,
} from "../services/telegram/TelegramTokenVault.js";
import {
	TelegramBotBillingService,
	TELEGRAM_BOT_SAAS_TIERS,
	type TelegramBotSaasTierId,
} from "../services/telegram/TelegramBotBillingService.js";

describe("Telegram Bot B2B SaaS Billing, Quotas & Token Vault Suite", () => {
	const clinicA_OrgId = "11111111-2222-3333-4444-555555555555";
	const clinicB_OrgId = "99999999-8888-7777-6666-555555555555";
	const rawBotFatherToken = "7123456789:AAFn_DenteClinicBotSecretTokenXYZ123";

	beforeEach(() => {
		TelegramBotBillingService.resetUsageForTesting();
	});

	describe("1. TelegramTokenVault — AES-256-GCM Cryptographic Isolation", () => {
		it("encrypts raw BotFather token into enc:v1 format using AES-256-GCM and AAD", () => {
			const encrypted = TelegramTokenVault.encryptToken(rawBotFatherToken, clinicA_OrgId);
			assert.ok(encrypted.startsWith("enc:v1:"), "Token must have enc:v1: prefix");
			assert.ok(TelegramTokenVault.isEncrypted(encrypted), "isEncrypted must return true");

			const parts = encrypted.slice("enc:v1:".length).split(":");
			assert.strictEqual(parts.length, 3, "Encrypted payload must contain IV, AuthTag and Ciphertext");

			const [ivHex, tagHex, cipherHex] = parts;
			assert.strictEqual(ivHex?.length, 24, "IV must be 12 bytes (24 hex characters)");
			assert.strictEqual(tagHex?.length, 32, "AuthTag must be 16 bytes (32 hex characters)");
			assert.ok((cipherHex?.length ?? 0) > 0, "Ciphertext must not be empty");
		});

		it("successfully decrypts token when provided with the identical organizationId", () => {
			const encrypted = TelegramTokenVault.encryptToken(rawBotFatherToken, clinicA_OrgId);
			const decrypted = TelegramTokenVault.decryptToken(encrypted, clinicA_OrgId);
			assert.strictEqual(decrypted, rawBotFatherToken, "Decrypted token must exactly match raw token");
		});

		it("RED TEAM INQUISITION: Rejects decryption under a different organizationId (Tenant Leak Protection)", () => {
			const encryptedForClinicA = TelegramTokenVault.encryptToken(rawBotFatherToken, clinicA_OrgId);

			// Попытка расшифровать токен Клиники А в контексте Клиники Б
			assert.throws(
				() => {
					TelegramTokenVault.decryptToken(encryptedForClinicA, clinicB_OrgId);
				},
				TelegramTokenVaultAuthenticationError,
				"Must throw TelegramTokenVaultAuthenticationError due to AAD mismatch",
			);
		});

		it("RED TEAM INQUISITION: Rejects tampered ciphertext or altered auth tag (Anti-Tampering)", () => {
			const encrypted = TelegramTokenVault.encryptToken(rawBotFatherToken, clinicA_OrgId);
			const prefix = "enc:v1:";
			const [ivHex, tagHex, cipherHex] = encrypted.slice(prefix.length).split(":");

			// 1. Искажаем байты шифротекста
			const tamperedCipher = (cipherHex ?? "").slice(0, -2) + "00";
			const tamperedCipherPayload = `${prefix}${ivHex}:${tagHex}:${tamperedCipher}`;

			assert.throws(
				() => {
					TelegramTokenVault.decryptToken(tamperedCipherPayload, clinicA_OrgId);
				},
				TelegramTokenVaultAuthenticationError,
				"Must reject tampered ciphertext with TelegramTokenVaultAuthenticationError",
			);

			// 2. Искажаем байты AuthTag
			const tamperedTag = (tagHex ?? "").slice(0, -2) + "00";
			const tamperedTagPayload = `${prefix}${ivHex}:${tamperedTag}:${cipherHex}`;

			assert.throws(
				() => {
					TelegramTokenVault.decryptToken(tamperedTagPayload, clinicA_OrgId);
				},
				TelegramTokenVaultAuthenticationError,
				"Must reject tampered auth tag with TelegramTokenVaultAuthenticationError",
			);
		});

		it("masks token properly for frontend UI and telemetry (7123****...)", () => {
			const maskedRaw = TelegramTokenVault.maskToken(rawBotFatherToken);
			assert.strictEqual(maskedRaw, "7123****...", "Raw token must be masked starting with first 4 digits");

			const encrypted = TelegramTokenVault.encryptToken(rawBotFatherToken, clinicA_OrgId);
			const maskedEncrypted = TelegramTokenVault.maskToken(encrypted);
			assert.strictEqual(maskedEncrypted, "enc:v1:****...", "Encrypted token must be safely masked");

			assert.strictEqual(TelegramTokenVault.maskToken(null), "");
			assert.strictEqual(TelegramTokenVault.maskToken(""), "");
		});

		it("resolves operational token from encrypted value, env var or raw fallback", () => {
			const encrypted = TelegramTokenVault.encryptToken(rawBotFatherToken, clinicA_OrgId);
			const resolvedFromEnc = TelegramTokenVault.resolveOperationalToken(encrypted, clinicA_OrgId);
			assert.strictEqual(resolvedFromEnc, rawBotFatherToken);

			process.env.TEST_TEMP_BOT_TOKEN_REF = "987654321:EnvTokenVal";
			const resolvedFromEnv = TelegramTokenVault.resolveOperationalToken(
				"TEST_TEMP_BOT_TOKEN_REF",
				clinicA_OrgId,
			);
			assert.strictEqual(resolvedFromEnv, "987654321:EnvTokenVal");
			delete process.env.TEST_TEMP_BOT_TOKEN_REF;

			const resolvedDirect = TelegramTokenVault.resolveOperationalToken(
				"555555:DirectToken",
				clinicA_OrgId,
			);
			assert.strictEqual(resolvedDirect, "555555:DirectToken");
		});

		it("throws TelegramTokenVaultError on empty token or empty organizationId", () => {
			assert.throws(() => TelegramTokenVault.encryptToken("", clinicA_OrgId), TelegramTokenVaultError);
			assert.throws(() => TelegramTokenVault.encryptToken(rawBotFatherToken, ""), TelegramTokenVaultError);
			assert.throws(() => TelegramTokenVault.decryptToken("", clinicA_OrgId), TelegramTokenVaultError);
			assert.throws(() => TelegramTokenVault.decryptToken("enc:v1:abc:def:123", ""), TelegramTokenVaultError);
		});
	});

	describe("2. TelegramBotSaasTiers Specification (Free, Pro Clinic, Enterprise Network)", () => {
		it("provides exactly 3 official B2B SaaS tiers adhering to specifications", () => {
			const tiers = TELEGRAM_BOT_SAAS_TIERS;
			assert.ok(tiers.free, "Free tier must exist");
			assert.ok(tiers.pro, "Pro Clinic tier must exist");
			assert.ok(tiers.enterprise, "Enterprise Network tier must exist");
		});

		it("validates Free tier parameters (0 ₽, 1 bot, 300 msgs, basic templates, 5 presets, CITO unlimited)", () => {
			const free = TELEGRAM_BOT_SAAS_TIERS.free;
			assert.strictEqual(free.priceRubMonth, 0);
			assert.strictEqual(free.maxBotsPerClinic, 1);
			assert.strictEqual(free.monthlyMessageQuota, 300);
			assert.strictEqual(free.isUnlimited, false);
			assert.match(free.description, /1 бот на клинику/);
			assert.match(free.description, /300 сообщений/);

			const citoFeature = free.features.find((f) => f.key === "cito_emergency_unlimited");
			assert.ok(citoFeature?.included, "CITO emergency triage must be included in Free tier");
		});

		it("validates Pro Clinic tier parameters (990 ₽/мес, 2 bots, unlimited, Mini-App, CITO triage, photo, calculator)", () => {
			const pro = TELEGRAM_BOT_SAAS_TIERS.pro;
			assert.strictEqual(pro.priceRubMonth, 990);
			assert.strictEqual(pro.maxBotsPerClinic, 2);
			assert.strictEqual(pro.monthlyMessageQuota, null, "Pro tier must have unlimited quota");
			assert.strictEqual(pro.isUnlimited, true);

			const keys = pro.features.filter((f) => f.included).map((f) => f.key);
			assert.ok(keys.includes("staff_bot"), "Staff intercom bot included");
			assert.ok(keys.includes("webapp_miniapp"), "Mini-App included");
			assert.ok(keys.includes("cito_triage"), "CITO triage included");
			assert.ok(keys.includes("photo_intake"), "Photo intake included");
			assert.ok(keys.includes("cost_calculator"), "Cost calculator included");
		});

		it("validates Enterprise Network tier parameters (2490 ₽/мес, 10 bots, multi-branch, Whisper, telemonitoring)", () => {
			const ent = TELEGRAM_BOT_SAAS_TIERS.enterprise;
			assert.strictEqual(ent.priceRubMonth, 2490);
			assert.strictEqual(ent.maxBotsPerClinic, 10);
			assert.strictEqual(ent.monthlyMessageQuota, null);
			assert.strictEqual(ent.isUnlimited, true);

			const keys = ent.features.filter((f) => f.included).map((f) => f.key);
			assert.ok(keys.includes("multi_branch"), "Multi-branch included");
			assert.ok(keys.includes("whisper_voice"), "Whisper voice included");
			assert.ok(keys.includes("telemonitoring"), "Telemonitoring included");
			assert.ok(keys.includes("priority_sla"), "Priority SLA included");
		});

		it("governs max active bots per clinic based on active subscription tier", () => {
			// Free tier: max 1
			const freeCheck1 = TelegramBotBillingService.canAddBot(clinicA_OrgId, 0);
			assert.strictEqual(freeCheck1.allowed, true);
			const freeCheck2 = TelegramBotBillingService.canAddBot(clinicA_OrgId, 1);
			assert.strictEqual(freeCheck2.allowed, false, "Second bot must be blocked on Free tier");

			// Upgrade to Pro: allows 2 bots
			TelegramBotBillingService.changePlan({ organizationId: clinicA_OrgId, newPlanId: "pro" });
			const proCheck1 = TelegramBotBillingService.canAddBot(clinicA_OrgId, 1);
			assert.strictEqual(proCheck1.allowed, true);
			const proCheck2 = TelegramBotBillingService.canAddBot(clinicA_OrgId, 2);
			assert.strictEqual(proCheck2.allowed, false, "Third bot must be blocked on Pro tier");

			// Upgrade to Enterprise: allows up to 10 bots
			TelegramBotBillingService.changePlan({ organizationId: clinicA_OrgId, newPlanId: "enterprise" });
			const entCheck = TelegramBotBillingService.canAddBot(clinicA_OrgId, 9);
			assert.strictEqual(entCheck.allowed, true);
			const entCheckLimit = TelegramBotBillingService.canAddBot(clinicA_OrgId, 10);
			assert.strictEqual(entCheckLimit.allowed, false);
		});
	});

	describe("3. Quota & Usage Governor — Warnings at 80% & 100% Limits", () => {
		it("tracks sent messages and computes usage percentage accurately", () => {
			const initialUsage = TelegramBotBillingService.getBillingUsage(clinicA_OrgId);
			assert.strictEqual(initialUsage.monthlyUsageCount, 0);
			assert.strictEqual(initialUsage.quotaLimit, 300);
			assert.strictEqual(initialUsage.usagePercent, 0);
			assert.strictEqual(initialUsage.warningStatus, "ok");

			// Отправляем 150 сообщений (50%)
			for (let i = 0; i < 150; i++) {
				TelegramBotBillingService.recordMessageSent({ organizationId: clinicA_OrgId });
			}

			const midUsage = TelegramBotBillingService.getBillingUsage(clinicA_OrgId);
			assert.strictEqual(midUsage.monthlyUsageCount, 150);
			assert.strictEqual(midUsage.usagePercent, 50);
			assert.strictEqual(midUsage.warningStatus, "ok");
			assert.strictEqual(midUsage.remainingMessages, 150);
		});

		it("triggers 80% warning alert when reaching 240 messages on Free tier", () => {
			// Накручиваем до 239 сообщений (79.6% -> warningStatus: ok)
			for (let i = 0; i < 239; i++) {
				TelegramBotBillingService.recordMessageSent({ organizationId: clinicA_OrgId });
			}
			assert.strictEqual(TelegramBotBillingService.getBillingUsage(clinicA_OrgId).warningStatus, "ok");

			// 240-е сообщение (80.0%)
			const triggerResult = TelegramBotBillingService.recordMessageSent({
				organizationId: clinicA_OrgId,
			});
			assert.strictEqual(triggerResult.warningTriggered, "warning_80");
			assert.match(triggerResult.warningMessage ?? "", /80% лимита сообщений/);

			const usage = TelegramBotBillingService.getBillingUsage(clinicA_OrgId);
			assert.strictEqual(usage.warningStatus, "warning_80");
			assert.match(usage.warningMessage ?? "", /80%/);
		});

		it("triggers 100% exceeded alert and blocks regular messages at 300 messages on Free tier", () => {
			for (let i = 0; i < 299; i++) {
				TelegramBotBillingService.recordMessageSent({ organizationId: clinicA_OrgId });
			}

			// 300-е сообщение (100% лимита)
			const triggerResult = TelegramBotBillingService.recordMessageSent({
				organizationId: clinicA_OrgId,
			});
			assert.strictEqual(triggerResult.warningTriggered, "exceeded_100");
			assert.match(triggerResult.warningMessage ?? "", /полностью исчерпана/);

			const usage = TelegramBotBillingService.getBillingUsage(clinicA_OrgId);
			assert.strictEqual(usage.warningStatus, "exceeded_100");
			assert.strictEqual(usage.remainingMessages, 0);

			// Обычное сообщение теперь блокируется
			const regularAuth = TelegramBotBillingService.checkQuotaAndAuthorizeSend({
				organizationId: clinicA_OrgId,
				isCitoEmergency: false,
			});
			assert.strictEqual(regularAuth.allowed, false, "Regular send must be blocked");
			assert.strictEqual(regularAuth.reason, "QUOTA_EXCEEDED");
			assert.match(regularAuth.message ?? "", /Лимит сообщений тарифа Базовый/);
		});
	});

	describe("4. MANDATE 8e / 8n: CITO Emergency Life-Priority Bypass (Медицинский Приоритет)", () => {
		it("CRITICAL MEDICAL INVARIANT: CITO emergency messages ALWAYS bypass exhausted quota", () => {
			// Доводим клинику до полного исчерпания лимита Free тарифа (350 сообщений > 300)
			for (let i = 0; i < 350; i++) {
				TelegramBotBillingService.recordMessageSent({ organizationId: clinicA_OrgId });
			}

			// 1. Обычное напоминание о записи — БЛОКИРУЕТСЯ
			const regularCheck = TelegramBotBillingService.checkQuotaAndAuthorizeSend({
				organizationId: clinicA_OrgId,
				isCitoEmergency: false,
			});
			assert.strictEqual(regularCheck.allowed, false, "Regular reminder must be blocked at 350/300");

			// 2. Экстренное CITO сообщение (острая боль, кровотечение, осложнение) — РАЗРЕШЕНО ВСЕГДА!
			const citoCheck = TelegramBotBillingService.checkQuotaAndAuthorizeSend({
				organizationId: clinicA_OrgId,
				isCitoEmergency: true,
			});
			assert.strictEqual(citoCheck.allowed, true, "CITO emergency notification MUST BE PERMITTED ALWAYS!");
			assert.strictEqual(citoCheck.reason, "CITO_PRIORITY_BYPASS");
			assert.strictEqual(citoCheck.isEmergency, true);

			// 3. Отправляем CITO сообщение и фиксируем счетчик экстренных сообщений
			TelegramBotBillingService.recordMessageSent({
				organizationId: clinicA_OrgId,
				isCitoEmergency: true,
				messageKind: "post_visit_checkup",
			});

			const usage = TelegramBotBillingService.getBillingUsage(clinicA_OrgId);
			assert.strictEqual(usage.monthlyUsageCount, 351);
			assert.strictEqual(usage.emergencyCitoCount, 1);
			assert.strictEqual(usage.citoPriorityBypassActive, true);
		});
	});

	describe("5. Plan Upgrades & Unlimited Quota Execution", () => {
		it("upgrading to Pro Clinic immediately lifts message quotas and resets warnings", () => {
			// Накручиваем 300 сообщений
			for (let i = 0; i < 300; i++) {
				TelegramBotBillingService.recordMessageSent({ organizationId: clinicA_OrgId });
			}
			assert.strictEqual(
				TelegramBotBillingService.checkQuotaAndAuthorizeSend({ organizationId: clinicA_OrgId }).allowed,
				false,
			);

			// Переход на Pro Clinic
			const upgraded = TelegramBotBillingService.changePlan({
				organizationId: clinicA_OrgId,
				newPlanId: "pro",
			});
			assert.strictEqual(upgraded.tier, "pro");
			assert.strictEqual(upgraded.quotaLimit, null, "Quota is now unlimited");
			assert.strictEqual(upgraded.warningStatus, "ok");

			// Отправка сразу разблокирована
			const sendCheck = TelegramBotBillingService.checkQuotaAndAuthorizeSend({
				organizationId: clinicA_OrgId,
				isCitoEmergency: false,
			});
			assert.strictEqual(sendCheck.allowed, true);
			assert.strictEqual(sendCheck.reason, "UNLIMITED_PLAN");
		});

		it("rejects unknown plan IDs with clear error message", () => {
			assert.throws(
				() => {
					// @ts-expect-error Тестирование некорректного значения
					TelegramBotBillingService.changePlan({ organizationId: clinicA_OrgId, newPlanId: "invalid_plan" });
				},
				/Недопустимый тарифный план/,
			);
		});
	});

	describe("6. REST API Endpoints (/api/telegram/billing/...)", () => {
		let app: FastifyInstance;

		beforeEach(async () => {
			process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";
			app = Fastify();
			await registerTelegramRoutes(app);
			await app.ready();
		});

		it("GET /api/telegram/billing/plans returns official catalog of 3 plans", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/telegram/billing/plans",
			});

			assert.strictEqual(res.statusCode, 200);
			const payload = res.json();
			assert.ok(Array.isArray(payload.plans), "Plans must be returned as array");
			assert.strictEqual(payload.plans.length, 3);
			assert.ok(payload.plans.some((p: { id: string }) => p.id === "free"));
			assert.ok(payload.plans.some((p: { id: string }) => p.id === "pro"));
			assert.ok(payload.plans.some((p: { id: string }) => p.id === "enterprise"));
			assert.strictEqual(payload.currency, "RUB");
		});

		it("GET /api/telegram/billing/usage returns clinic usage and quota telemetry", async () => {
			// Отправим 50 сообщений
			for (let i = 0; i < 50; i++) {
				TelegramBotBillingService.recordMessageSent({ organizationId: clinicA_OrgId });
			}

			const res = await app.inject({
				method: "GET",
				url: `/api/telegram/billing/usage?organizationId=${clinicA_OrgId}`,
			});

			assert.strictEqual(res.statusCode, 200);
			const payload = res.json();
			assert.strictEqual(payload.organizationId, clinicA_OrgId);
			assert.strictEqual(payload.tier, "free");
			assert.strictEqual(payload.monthlyUsageCount, 50);
			assert.strictEqual(payload.quotaLimit, 300);
			assert.strictEqual(payload.usagePercent, 17);
			assert.strictEqual(payload.warningStatus, "ok");
		});

		it("POST /api/telegram/billing/change-plan switches plan to Pro Clinic", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/telegram/billing/change-plan",
				payload: {
					organizationId: clinicA_OrgId,
					planId: "pro",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const payload = res.json();
			assert.strictEqual(payload.success, true);
			assert.strictEqual(payload.usage.tier, "pro");
			assert.strictEqual(payload.usage.quotaLimit, null);
			assert.match(payload.message, /Оптимальный/);
		});

		it("POST /api/telegram/billing/change-plan rejects invalid plan ID with 400", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/telegram/billing/change-plan",
				payload: {
					organizationId: clinicA_OrgId,
					planId: "invalid_tier_123",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const payload = res.json();
			assert.strictEqual(payload.error, "TelegramBillingInvalidPlan");
		});
	});
});


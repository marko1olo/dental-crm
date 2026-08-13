import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import Fastify from "fastify";
import { withSuperuserBypass } from "../db/rls.js";
import * as rls from "../db/rls.js";
import { organizations, users } from "../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
} from "../tests/support/fixtureOrganizations.js";
import { createTenantTestApp } from "../tests/support/tenantTestApp.js";
import { hashCredential, signToken } from "../utils/cryptoHelper.js";
import * as auth from "./auth.js";

describe("auth routes", () => {
	let app: ReturnType<typeof Fastify>;
	let testIndex = 1;
	const purgeableOrgIds: string[] = [];

	function nextOrgId(purgeable = true): string {
		const id = fixtureUuid("auth.test.ts", testIndex++);
		if (purgeable) {
			purgeableOrgIds.push(id);
		}
		return id;
	}

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		process.env.AUTH_TOKEN_SECRET = "test-secret";
		app = createTenantTestApp();
		await app.register(auth.registerAuthRoutes);
	});

	afterEach(async () => {
		await app.close();
		mock.restoreAll();
		if (purgeableOrgIds.length > 0) {
			await purgeFixtureOrganizations(purgeableOrgIds);
			purgeableOrgIds.length = 0;
		}
	});

	describe("clinic login", () => {
		test("returns 400 for missing credentials", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/clinic/login",
				payload: {},
			});
			assert.strictEqual(response.statusCode, 400);
		});

		test("returns 500 when database throws an error", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/clinic/login",
				payload: { email: "test\0@example.com", password: "password123" },
			});
			assert.strictEqual(response.statusCode, 500);
			assert.strictEqual(response.json().error, "AuthUnavailable");
		});

		test("returns 401 when organization not found", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/clinic/login",
				payload: { email: "missing_org_nonexistent@example.com", password: "password123" },
			});
			assert.strictEqual(response.statusCode, 401);
		});

		test("returns 200 and token on success", async () => {
			const orgId = nextOrgId();
			const email = "clinic_login_success@example.com";
			const password = "password123";
			const passwordHash = await hashCredential(password);

			await withSuperuserBypass(async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: orgId,
						name: "Test Org Clinic Login Success",
						loginId: email,
						passwordHash,
					})
					.onConflictDoUpdate({
						target: organizations.id,
						set: {
							name: "Test Org Clinic Login Success",
							loginId: email,
							passwordHash,
						},
					});
			});

			const response = await app.inject({
				method: "POST",
				url: "/api/auth/clinic/login",
				payload: { email, password },
			});
			assert.strictEqual(response.statusCode, 200);
			assert.strictEqual(response.json().ok, true);
			assert.ok(response.json().clinicToken);
		});
	});

	describe("staff unlock", () => {
		test("returns 401 if clinic token is missing", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/staff/unlock",
				payload: { userId: "user1", pinCode: "1234" },
			});
			assert.strictEqual(response.statusCode, 401);
			assert.strictEqual(response.json().error, "ClinicAuthRequired");
		});

		test("несуществующий сотрудник неотличим от неверного PIN", async () => {
			const orgId = nextOrgId();
			const userId = fixtureUuid("auth.test.ts", testIndex++);

			await withSuperuserBypass(async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: orgId,
						name: "Org Staff Unlock Oracle Guard",
					})
					.onConflictDoUpdate({
						target: organizations.id,
						set: { name: "Org Staff Unlock Oracle Guard" },
					});
				await tx
					.insert(users)
					.values({
						id: userId,
						organizationId: orgId,
						fullName: "Real Staff Doctor",
						role: "doctor",
						pinCodeHash: await hashCredential("1234"),
						isActive: true,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							organizationId: orgId,
							fullName: "Real Staff Doctor",
							role: "doctor",
							pinCodeHash: await hashCredential("1234"),
							isActive: true,
						},
					});
			});

			const clinicToken = signToken(
				{ organizationId: orgId },
				"test-secret",
				60 * 60,
			);

			const missingUser = await app.inject({
				method: "POST",
				url: "/api/auth/staff/unlock",
				headers: { "x-dente-clinic-token": clinicToken },
				payload: { userId: fixtureUuid("auth.test.ts", 9999), pinCode: "1234" },
			});

			const wrongPin = await app.inject({
				method: "POST",
				url: "/api/auth/staff/unlock",
				headers: { "x-dente-clinic-token": clinicToken },
				payload: { userId, pinCode: "9999" },
			});

			assert.strictEqual(missingUser.statusCode, 401);
			assert.strictEqual(missingUser.json().error, "AuthError");
			assert.strictEqual(wrongPin.statusCode, missingUser.statusCode);
			assert.deepStrictEqual(wrongPin.json(), missingUser.json());
		});

		test("returns 200 on successful unlock", async () => {
			const orgId = nextOrgId(false);
			const userId = fixtureUuid("auth.test.ts", testIndex++);

			await withSuperuserBypass(async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: orgId,
						name: "Org Staff Unlock Success",
					})
					.onConflictDoUpdate({
						target: organizations.id,
						set: { name: "Org Staff Unlock Success" },
					});
				await tx
					.insert(users)
					.values({
						id: userId,
						organizationId: orgId,
						fullName: "Doctor Who Unlocks",
						role: "doctor",
						pinCodeHash: await hashCredential("1234"),
						isActive: true,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							organizationId: orgId,
							fullName: "Doctor Who Unlocks",
							role: "doctor",
							pinCodeHash: await hashCredential("1234"),
							isActive: true,
						},
					});
			});

			const clinicToken = signToken(
				{ organizationId: orgId },
				"test-secret",
				60 * 60,
			);

			const response = await app.inject({
				method: "POST",
				url: "/api/auth/staff/unlock",
				headers: { "x-dente-clinic-token": clinicToken },
				payload: { userId, pinCode: "1234" },
			});
			assert.strictEqual(response.statusCode, 200);
			assert.ok(response.json().staffToken);
		});
	});

	describe("direct user login (/api/auth/login)", () => {
		test("returns 400 for missing credentials", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/login",
				payload: {},
			});
			assert.strictEqual(response.statusCode, 400);
		});

		test("returns 401 for invalid credentials", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/login",
				payload: { email: "wrong_user_login@example.com", password: "pwd" },
			});
			assert.strictEqual(response.statusCode, 401);
		});

		test("returns 200 on successful direct login", async () => {
			const orgId = nextOrgId();
			const userId = fixtureUuid("auth.test.ts", testIndex++);
			const email = "direct_user_login@example.com";
			const password = "password123";
			const passwordHash = await hashCredential(password);

			await withSuperuserBypass(async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: orgId,
						name: "Direct Login Org",
					})
					.onConflictDoUpdate({
						target: organizations.id,
						set: { name: "Direct Login Org" },
					});
				await tx
					.insert(users)
					.values({
						id: userId,
						organizationId: orgId,
						fullName: "John Doe",
						email,
						role: "doctor",
						passwordHash,
						isActive: true,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							organizationId: orgId,
							fullName: "John Doe",
							email,
							role: "doctor",
							passwordHash,
							isActive: true,
						},
					});
			});

			const response = await app.inject({
				method: "POST",
				url: "/api/auth/login",
				payload: { email, password },
			});
			assert.strictEqual(response.statusCode, 200);
			assert.strictEqual(response.json().ok, true);
			assert.ok(response.json().clinicToken);
			assert.ok(response.json().staffToken);
		});
	});

	describe("user profile (/api/auth/user/me)", () => {
		test("returns 401 if staff token missing", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/auth/user/me",
			});
			assert.strictEqual(response.statusCode, 401);
		});

		test("нет демо-профиля в обход базы: неизвестный сотрудник -> 404", async () => {
			const unknownUserId = fixtureUuid("auth.test.ts", 9998);
			const staffToken = signToken({ userId: unknownUserId }, "test-secret", 60 * 60);
			const response = await app.inject({
				method: "GET",
				url: "/api/auth/user/me",
				headers: { "x-dente-staff-token": staffToken },
			});
			assert.strictEqual(response.statusCode, 404);
			assert.strictEqual(response.json().error, "NotFound");
		});

		test("returns 200 with user profile", async () => {
			const orgId = nextOrgId();
			const userId = fixtureUuid("auth.test.ts", testIndex++);

			await withSuperuserBypass(async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: orgId,
						name: "User Profile Org",
					})
					.onConflictDoUpdate({
						target: organizations.id,
						set: { name: "User Profile Org" },
					});
				await tx
					.insert(users)
					.values({
						id: userId,
						organizationId: orgId,
						fullName: "Jane",
						role: "admin",
						isActive: true,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: {
							organizationId: orgId,
							fullName: "Jane",
							role: "admin",
							isActive: true,
						},
					});
			});

			const staffToken = signToken({ userId }, "test-secret", 60 * 60);
			const response = await app.inject({
				method: "GET",
				url: "/api/auth/user/me",
				headers: { "x-dente-staff-token": staffToken },
			});
			assert.strictEqual(response.statusCode, 200);
			assert.strictEqual(response.json().ok, true);
			assert.strictEqual(response.json().user.id, userId);
		});
	});

	describe("права проверяются раньше тела запроса", () => {
		const SYNTHETIC_ORG_ID = fixtureUuid("auth.test.ts", 8000);
		const SYNTHETIC_USER_ID = fixtureUuid("auth.test.ts", 8001);
		const FOREIGN_ORG_ID = fixtureUuid("auth.test.ts", 8002);
		const TEST_TOKEN_SECRET = "test-secret";
		const SET_PASSWORD_URL = "/api/auth/clinic/set-password";
		const SET_PIN_URL = "/api/auth/staff/set-pin";

		let savedSetupKey: string | undefined;

		beforeEach(() => {
			savedSetupKey = process.env.ADMIN_SETUP_KEY;
			delete process.env.ADMIN_SETUP_KEY;
		});

		afterEach(() => {
			if (savedSetupKey === undefined) delete process.env.ADMIN_SETUP_KEY;
			else process.env.ADMIN_SETUP_KEY = savedSetupKey;
		});

		function ownerHeaders(): Record<string, string> {
			return {
				"x-dente-clinic-token": signToken(
					{ organizationId: SYNTHETIC_ORG_ID },
					TEST_TOKEN_SECRET,
					60 * 60,
				),
				"x-dente-staff-token": signToken(
					{
						userId: SYNTHETIC_USER_ID,
						organizationId: SYNTHETIC_ORG_ID,
						role: "owner",
						fullName: "Владелец",
					},
					TEST_TOKEN_SECRET,
					60 * 60,
				),
			};
		}

		async function seedSyntheticFixtures(): Promise<void> {
			await withSuperuserBypass(async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: SYNTHETIC_ORG_ID,
						name: "Synthetic Org",
					})
					.onConflictDoNothing();
				await tx
					.insert(users)
					.values({
						id: SYNTHETIC_USER_ID,
						organizationId: SYNTHETIC_ORG_ID,
						fullName: "Владелец",
						role: "owner",
						isActive: true,
					})
					.onConflictDoNothing();
				await tx
					.insert(organizations)
					.values({
						id: FOREIGN_ORG_ID,
						name: "Foreign Org",
					})
					.onConflictDoNothing();
			});
		}

		test("set-password без прав: ответ не зависит от тела и не выдаёт политику пароля", async () => {
			const payloads = [
				{},
				{ newPassword: "" },
				{ newPassword: "1" },
				{ newPassword: "достаточно-длинный-пароль" },
				{ organizationId: SYNTHETIC_ORG_ID, newPassword: "1" },
				{ newPassword: "1", adminKey: "неверный ключ установки" },
			];

			const responses = await Promise.all(
				payloads.map((payload) =>
					app.inject({ method: "POST", url: SET_PASSWORD_URL, payload }),
				),
			);

			for (const response of responses) {
				assert.strictEqual(response.statusCode, 403);
				assert.strictEqual(response.json().error, "Forbidden");
			}
			for (const response of responses.slice(1)) {
				assert.strictEqual(response.body, responses[0]?.body);
			}
			assert.ok(
				!/\d/.test(responses[0]?.body),
				`в отказе осталось число: ${responses[0]?.body}`,
			);
			assert.ok(
				!/символ/i.test(responses[0]?.body),
				`в отказе осталась политика: ${responses[0]?.body}`,
			);
		});

		test("set-pin без прав: ответ не зависит от тела и не выдаёт ни политику PIN, ни обязательные поля", async () => {
			const payloads = [
				{},
				{ userId: SYNTHETIC_USER_ID },
				{ newPin: "1234" },
				{ userId: SYNTHETIC_USER_ID, newPin: "12" },
				{ userId: SYNTHETIC_USER_ID, newPin: "abcd" },
				{ userId: SYNTHETIC_USER_ID, newPin: "1234" },
				{
					userId: "не идентификатор",
					newPin: "1234",
					adminKey: "неверный ключ установки",
				},
			];

			const responses = await Promise.all(
				payloads.map((payload) =>
					app.inject({ method: "POST", url: SET_PIN_URL, payload }),
				),
			);

			for (const response of responses) {
				assert.strictEqual(response.statusCode, 403);
				assert.strictEqual(response.json().error, "Forbidden");
			}
			for (const response of responses.slice(1)) {
				assert.strictEqual(response.body, responses[0]?.body);
			}
			assert.ok(
				!/\d/.test(responses[0]?.body),
				`в отказе осталось число: ${responses[0]?.body}`,
			);
			assert.ok(
				!/цифр/i.test(responses[0]?.body),
				`в отказе осталась политика PIN: ${responses[0]?.body}`,
			);
			assert.ok(
				!/Не указан/i.test(responses[0]?.body),
				`в отказе осталась проверка поля: ${responses[0]?.body}`,
			);
		});

		test("set-password с правами: контракт ошибок тела не изменился", async () => {
			const headers = ownerHeaders();

			const empty = await app.inject({
				method: "POST",
				url: SET_PASSWORD_URL,
				headers,
				payload: {},
			});
			assert.strictEqual(empty.statusCode, 400);
			assert.strictEqual(empty.json().error, "ValidationError");
			assert.strictEqual(
				empty.json().message,
				"Новый пароль должен быть не короче 8 символов.",
			);

			const short = await app.inject({
				method: "POST",
				url: SET_PASSWORD_URL,
				headers,
				payload: { newPassword: "1234567" },
			});
			assert.strictEqual(short.statusCode, 400);
			assert.strictEqual(short.json().error, "ValidationError");
			assert.strictEqual(
				short.json().message,
				"Новый пароль должен быть не короче 8 символов.",
			);

			const foreign = await app.inject({
				method: "POST",
				url: SET_PASSWORD_URL,
				headers,
				payload: {
					organizationId: FOREIGN_ORG_ID,
					newPassword: "достаточно-длинный-пароль",
				},
			});
			assert.strictEqual(foreign.statusCode, 403);
			assert.strictEqual(
				foreign.json().message,
				"Нельзя менять пароль чужой организации.",
			);
		});

		test("set-pin с правами: контракт ошибок тела не изменился", async () => {
			const headers = ownerHeaders();

			const empty = await app.inject({
				method: "POST",
				url: SET_PIN_URL,
				headers,
				payload: {},
			});
			assert.strictEqual(empty.statusCode, 400);
			assert.strictEqual(empty.json().error, "ValidationError");
			assert.strictEqual(empty.json().message, "Не указан сотрудник.");

			const noPin = await app.inject({
				method: "POST",
				url: SET_PIN_URL,
				headers,
				payload: { userId: SYNTHETIC_USER_ID },
			});
			assert.strictEqual(noPin.statusCode, 400);
			assert.strictEqual(
				noPin.json().message,
				"PIN должен состоять из 4–12 цифр.",
			);

			const shortPin = await app.inject({
				method: "POST",
				url: SET_PIN_URL,
				headers,
				payload: { userId: SYNTHETIC_USER_ID, newPin: "12" },
			});
			assert.strictEqual(shortPin.statusCode, 400);
			assert.strictEqual(
				shortPin.json().message,
				"PIN должен состоять из 4–12 цифр.",
			);

			const letters = await app.inject({
				method: "POST",
				url: SET_PIN_URL,
				headers,
				payload: { userId: SYNTHETIC_USER_ID, newPin: "abcd" },
			});
			assert.strictEqual(letters.statusCode, 400);
			assert.strictEqual(
				letters.json().message,
				"PIN должен состоять из 4–12 цифр.",
			);
		});

		test("охранник открывается: владелец меняет пароль клиники и PIN сотрудника", async () => {
			await seedSyntheticFixtures();
			const headers = ownerHeaders();

			const password = await app.inject({
				method: "POST",
				url: SET_PASSWORD_URL,
				headers,
				payload: { newPassword: "достаточно-длинный-пароль" },
			});
			assert.strictEqual(password.statusCode, 200);
			assert.strictEqual(password.json().ok, true);
			assert.strictEqual(password.json().message, "Пароль клиники обновлён.");

			const pin = await app.inject({
				method: "POST",
				url: SET_PIN_URL,
				headers,
				payload: { userId: SYNTHETIC_USER_ID, newPin: "4321" },
			});
			assert.strictEqual(pin.statusCode, 200);
			assert.strictEqual(pin.json().ok, true);
			assert.strictEqual(pin.json().message, "PIN сотрудника обновлён.");
		});

		test("ключ установки читается из тела и после переноса работает так же", async () => {
			const setupKey = `dente-setup-${randomUUID()}`;
			process.env.ADMIN_SETUP_KEY = setupKey;

			const wrongKey = await app.inject({
				method: "POST",
				url: SET_PASSWORD_URL,
				payload: {
					organizationId: SYNTHETIC_ORG_ID,
					newPassword: "достаточно-длинный-пароль",
					adminKey: `${setupKey}x`,
				},
			});
			assert.strictEqual(wrongKey.statusCode, 403);
			assert.strictEqual(wrongKey.json().error, "Forbidden");

			const shortPassword = await app.inject({
				method: "POST",
				url: SET_PASSWORD_URL,
				payload: {
					organizationId: SYNTHETIC_ORG_ID,
					newPassword: "1",
					adminKey: setupKey,
				},
			});
			assert.strictEqual(shortPassword.statusCode, 400);
			assert.strictEqual(
				shortPassword.json().message,
				"Новый пароль должен быть не короче 8 символов.",
			);

			const noOrganization = await app.inject({
				method: "POST",
				url: SET_PASSWORD_URL,
				payload: {
					newPassword: "достаточно-длинный-пароль",
					adminKey: setupKey,
				},
			});
			assert.strictEqual(noOrganization.statusCode, 400);
			assert.strictEqual(
				noOrganization.json().message,
				"Не указана организация.",
			);

			const badPin = await app.inject({
				method: "POST",
				url: SET_PIN_URL,
				payload: {
					userId: SYNTHETIC_USER_ID,
					newPin: "12",
					adminKey: setupKey,
				},
			});
			assert.strictEqual(badPin.statusCode, 400);
			assert.strictEqual(
				badPin.json().message,
				"PIN должен состоять из 4–12 цифр.",
			);

			await seedSyntheticFixtures();
			const accepted = await app.inject({
				method: "POST",
				url: SET_PASSWORD_URL,
				payload: {
					organizationId: SYNTHETIC_ORG_ID,
					newPassword: "достаточно-длинный-пароль",
					adminKey: setupKey,
				},
			});
			assert.strictEqual(accepted.statusCode, 200);
			assert.strictEqual(accepted.json().ok, true);
		});
	});

	describe("SaaS body Zod validation", () => {
		const TEST_TOKEN_SECRET = "test-secret";

		test("register: empty body → 400 Заполните все поля", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/register",
				payload: {},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(response.json().message, "Заполните все поля.");
		});

		test("register: short password → 400 password policy", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/register",
				payload: {
					clinicName: "Клиника",
					ownerName: "Владелец",
					email: "owner@example.com",
					password: "short",
				},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(
				response.json().message,
				"Пароль должен быть не короче 8 символов.",
			);
		});

		test("register: bad ownerPin → 400 PIN policy", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/register",
				payload: {
					clinicName: "Клиника",
					ownerName: "Владелец",
					email: "owner@example.com",
					password: "long-enough-password",
					ownerPin: "12",
				},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(
				response.json().message,
				"PIN должен состоять из 4–12 цифр.",
			);
		});

		test("login: empty body → 400 Введите email и пароль", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/login",
				payload: {},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(response.json().message, "Введите email и пароль.");
		});

		test("invites/accept: empty body → 400 Заполните все поля", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/invites/accept",
				payload: {},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(response.json().message, "Заполните все поля.");
		});

		test("invites/accept: short password → 400 password policy", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/invites/accept",
				payload: {
					token: "some-token",
					fullName: "Иван",
					password: "short",
					pinCode: "1234",
				},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(
				response.json().message,
				"Пароль должен быть не короче 8 символов.",
			);
		});

		test("invites/accept: bad pinCode → 400 PIN policy", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/invites/accept",
				payload: {
					token: "some-token",
					fullName: "Иван",
					password: "long-enough-password",
					pinCode: "ab",
				},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(
				response.json().message,
				"PIN должен состоять из 4–12 цифр.",
			);
		});

		test("invites/create: no token → 403 before body shape", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/invites/create",
				payload: {},
			});
			assert.strictEqual(response.statusCode, 403);
			assert.strictEqual(response.json().error, "Forbidden");
		});

		test("invites/create: admin token + empty body → 400 Укажите email и роль", async () => {
			const staffToken = signToken(
				{
					userId: "11111111-1111-4111-8111-111111111111",
					fullName: "Admin",
					role: "owner",
					organizationId: "22222222-2222-4222-8222-222222222222",
				},
				TEST_TOKEN_SECRET,
				60 * 60,
			);
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/invites/create",
				headers: { "x-dente-staff-token": staffToken },
				payload: {},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(response.json().message, "Укажите email и роль.");
		});

		test("update-password: no token → 401 before body", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/user/update-password",
				payload: {},
			});
			assert.strictEqual(response.statusCode, 401);
			assert.strictEqual(response.json().error, "AuthRequired");
		});

		test("update-password: token + empty body → 400", async () => {
			const staffToken = signToken(
				{ userId: "11111111-1111-4111-8111-111111111111" },
				TEST_TOKEN_SECRET,
				60 * 60,
			);
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/user/update-password",
				headers: { "x-dente-staff-token": staffToken },
				payload: {},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(
				response.json().message,
				"Введите старый и новый пароль.",
			);
		});

		test("update-password: token + short newPassword → 400", async () => {
			const staffToken = signToken(
				{ userId: "11111111-1111-4111-8111-111111111111" },
				TEST_TOKEN_SECRET,
				60 * 60,
			);
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/user/update-password",
				headers: { "x-dente-staff-token": staffToken },
				payload: { oldPassword: "old-password", newPassword: "short" },
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(
				response.json().message,
				"Новый пароль должен быть не короче 8 символов.",
			);
		});

		test("update-pin: no token → 401 before body", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/user/update-pin",
				payload: {},
			});
			assert.strictEqual(response.statusCode, 401);
			assert.strictEqual(response.json().error, "AuthRequired");
		});

		test("update-pin: token + empty body → 400", async () => {
			const staffToken = signToken(
				{ userId: "11111111-1111-4111-8111-111111111111" },
				TEST_TOKEN_SECRET,
				60 * 60,
			);
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/user/update-pin",
				headers: { "x-dente-staff-token": staffToken },
				payload: {},
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(
				response.json().message,
				"Введите старый и новый PIN-код.",
			);
		});

		test("update-pin: token + bad newPin → 400 PIN policy", async () => {
			const staffToken = signToken(
				{ userId: "11111111-1111-4111-8111-111111111111" },
				TEST_TOKEN_SECRET,
				60 * 60,
			);
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/user/update-pin",
				headers: { "x-dente-staff-token": staffToken },
				payload: { oldPin: "1234", newPin: "12" },
			});
			assert.strictEqual(response.statusCode, 400);
			assert.strictEqual(response.json().error, "ValidationError");
			assert.strictEqual(
				response.json().message,
				"PIN должен состоять из 4–12 цифр.",
			);
		});
	});
});

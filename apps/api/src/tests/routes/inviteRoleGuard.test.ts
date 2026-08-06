import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAuthRoutes } from "../../routes/auth.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * ПРИГЛАШЕНИЕ СОТРУДНИКА МОГЛО ВЫДАТЬ ПРАВА ВЛАДЕЛЬЦА.
 *
 * Два дефекта в одном маршруте `/api/auth/invites/create`.
 *
 * 1. Роль из тела запроса ложилась в `user_invitations.role` БЕЗ ПРОВЕРКИ, а
 *    `/api/auth/invites/accept` переносит её в `users.role` тоже без проверки.
 *    Экран настроек отправлял `admin` — роли с таким написанием в
 *    `staffRoleSchema` нет вовсе (owner, doctor, administrator, assistant,
 *    manager). Дальше `getFilteredAppViews` на незнакомой роли доходит до ветки
 *    «вернуть все разделы»: приглашённый администратор получал 14 разделов
 *    вместо 9, то есть фактически права владельца. Экранную часть починили
 *    отдельно, но проверка обязана стоять на сервере: клиент — не место для
 *    проверки прав.
 *
 * 2. Право приглашать проверялось как `role !== 'owner' && role !== 'admin'` —
 *    по тому же несуществующему написанию. Настоящий `administrator` получал
 *    403, и приглашать сотрудников мог только владелец.
 *
 * ПОЧЕМУ БЕЗ БАЗЫ. Оба отказа происходят ДО единственной записи в базу, поэтому
 * ни организация, ни пользователь здесь не нужны, и тест ничего за собой не
 * убирает. Ключевая проверка построена так, что доказывает оба исправления
 * разом: администратор с НЕВЕРНОЙ ролью обязан получить 400 (значит, мимо
 * проверки прав он прошёл), а не 403.
 */
describe("приглашение сотрудника: роль проверяется на сервере", () => {
	let app: FastifyInstance;

	function tokenFor(role: string): string {
		return signToken(
			{
				userId: "11111111-1111-4111-8111-111111111111",
				role,
				organizationId: "22222222-2222-4222-8222-222222222222",
			},
			authTokenSecret(),
			60 * 60,
		);
	}

	async function createInvite(role: string, inviterRole: string) {
		return app.inject({
			method: "POST",
			url: "/api/auth/invites/create",
			headers: { "x-dente-staff-token": tokenFor(inviterRole) },
			payload: { email: "novyj.sotrudnik@example.com", role },
		});
	}

	before(async () => {
		app = Fastify();
		await registerAuthRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
	});

	test("роль, которой нет в схеме, не принимается", async () => {
		const response = await createInvite("admin", "owner");
		assert.equal(
			response.statusCode,
			400,
			`роль «admin» принята с кодом ${response.statusCode}: она дошла бы до users.role и дала бы права владельца`,
		);
	});

	test("выдуманная роль тоже не принимается", async () => {
		const response = await createInvite("glavnyj-po-vsemu", "owner");
		assert.equal(
			response.statusCode,
			400,
			"в приглашение прошла произвольная строка вместо должности",
		);
	});

	test("отказ объяснён по-русски и без имён полей запроса", async () => {
		const response = await createInvite("admin", "owner");
		const body = response.json() as { message?: string };
		assert.ok(
			typeof body.message === "string" && /должност/i.test(body.message),
			`отказ не называет должность человеческим словом: ${String(body.message).slice(0, 120)}`,
		);
		assert.ok(
			!/role|staffRoleSchema|enum|invalid/i.test(String(body.message)),
			`в отказе латиница и имена полей: ${String(body.message).slice(0, 120)}`,
		);
	});

	test("настоящая должность из схемы принимается проверкой прав и роли", async () => {
		/*
		 * Дальше маршрут пишет в базу, и без организации запись не пройдёт —
		 * поэтому проверяется только то, что ни 403, ни 400 он уже не отдаёт:
		 * и право приглашать, и сама роль признаны верными.
		 */
		const response = await createInvite("doctor", "owner");
		assert.ok(
			response.statusCode !== 403 && response.statusCode !== 400,
			`должность «doctor» из staffRoleSchema отвергнута кодом ${response.statusCode}`,
		);
	});

	test("администратор клиники имеет право приглашать, а не получает 403", async () => {
		/*
		 * САМАЯ ВАЖНАЯ ПРОВЕРКА. Прежде здесь стоял 403: право сравнивалось с
		 * написанием `admin`, которого не бывает. Роль в теле намеренно неверная —
		 * значит 400 доказывает, что до проверки роли администратор ДОШЁЛ.
		 */
		const response = await createInvite("admin", "administrator");
		assert.equal(
			response.statusCode,
			400,
			`администратор получил ${response.statusCode}: право приглашать сотрудников снова проверяется по несуществующему написанию роли`,
		);
	});

	test("врач приглашать сотрудников не может", async () => {
		const response = await createInvite("doctor", "doctor");
		assert.equal(
			response.statusCode,
			403,
			"врач смог выдать приглашение — административное действие открыто всем",
		);
	});
});

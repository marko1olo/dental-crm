import assert from "node:assert/strict";
import { test, describe, before, after } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSettingsRoutes } from "../../routes/settings/index.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";

/**
 * ЧТО БЫЛО. Этот файл подписывал токен с ролью doctor и требовал 201/200 на
 * POST прайса, правке кресел и назначении СВОЕЙ комиссии врачу. То есть тест
 * охранял дыру: врач, у которого по матрице прав нет settings.write, мог из
 * интерфейса (или curl'ом) переписать каталог цен и поднять себе процент.
 * «Автономия врача» (Мандат 8e) — это свобода клинических решений и скидок,
 * а не самоуправство в прайсе и собственной зарплате.
 *
 * ЧТО ЗДЕСЬ. Мутации настроек выполняет токен владельца (его право
 * settings.write), persistence-проверки сохранены, и добавлен обратный
 * ассерт: токен врача на тех же адресах получает 403 PermissionDenied
 * с человеческим текстом отказа — ровно то, что обещает матрица прав.
 */
describe("Red Team Settings Autonomy & SSOT Proof (#settings)", () => {
	let app: FastifyInstance;
	let orgId: string;
	let doctorUserId: string;
	let ownerUserId: string;
	let doctorToken: string;
	let ownerToken: string;

	before(async () => {
		const [org] = await db
			.select({ id: schema.organizations.id })
			.from(schema.organizations)
			.limit(1);
		assert.ok(org, "Organization must exist in DB");
		orgId = org.id;

		const [doctor] = await db
			.insert(schema.users)
			.values({
				organizationId: orgId,
				fullName: "Тестовый Доктор Редтим",
				role: "doctor",
				isActive: true,
			})
			.returning({ id: schema.users.id });
		doctorUserId = doctor!.id;

		const [owner] = await db
			.insert(schema.users)
			.values({
				organizationId: orgId,
				fullName: "Тестовый Владелец Редтим",
				role: "owner",
				isActive: true,
			})
			.returning({ id: schema.users.id });
		ownerUserId = owner!.id;

		const secret = authTokenSecret();
		doctorToken = signToken(
			{
				userId: doctorUserId,
				organizationId: orgId,
				role: "doctor",
				fullName: "Тестовый Доктор Редтим",
			},
			secret,
		);
		ownerToken = signToken(
			{
				userId: ownerUserId,
				organizationId: orgId,
				role: "owner",
				fullName: "Тестовый Владелец Редтим",
			},
			secret,
		);

		app = Fastify({ logger: false });
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await registerSettingsRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		await db
			.delete(schema.doctorCommissions)
			.where(eq(schema.doctorCommissions.userId, doctorUserId));
		await db.delete(schema.users).where(eq(schema.users.id, doctorUserId));
		await db.delete(schema.users).where(eq(schema.users.id, ownerUserId));
	});

	test("0. Врач получает внятный отказ (403) на мутации настроек", async () => {
		await withFixtureTenant(orgId, async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/settings/catalog",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": doctorToken,
				},
				payload: {
					title: "Попытка врача изменить прайс",
					code: "A16.07.008.001",
					basePriceRub: 4500,
					active: true,
				},
			});
			assert.equal(res.statusCode, 403);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "PermissionDenied");
			assert.equal(body.permission, "settings.write");
			assert.ok(
				body.message.toLowerCase().includes("врач"),
				`Текст отказа должен называть роль, а не коды: ${body.message}`,
			);
			assert.ok(!body.message.includes("undefined"));
		});
	});

	test("1. Токен владельца создаёт услугу каталога без секрета администратора", async () => {
		await withFixtureTenant(orgId, async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/settings/catalog",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": ownerToken,
				},
				payload: {
					title: "Эндодонтическое лечение корневого канала зуба (RedTeam SSOT)",
					code: "A16.07.008.001",
					order804nCode: "A16.07.008",
					category: "therapy",
					specialty: "therapist",
					basePriceRub: 4500,
					materialsCostRub: 850.5,
					durationMinutes: 60,
					taxDeductible: true,
					active: true,
				},
			});

			assert.notEqual(res.statusCode, 403, "Владельцу не нужен секрет при живом токене");
			assert.notEqual(res.statusCode, 503, "Владельцу не нужен секрет при живом токене");
			assert.equal(res.statusCode, 201, `Service must be created: ${res.body}`);

			const body = JSON.parse(res.body);
			assert.equal(body.title, "Эндодонтическое лечение корневого канала зуба (RedTeam SSOT)");
			assert.equal(body.basePriceRub, 4500);
			assert.equal(body.order804nCode, "A16.07.008");
			assert.equal(body.materialsCostRub, 850.5);

			if (body.id) {
				await db
					.delete(schema.serviceCatalogItems)
					.where(eq(schema.serviceCatalogItems.id, body.id));
			}
		});
	});

	test("2. Authorization: Bearer токен владельца проходит", async () => {
		await withFixtureTenant(orgId, async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/settings/catalog",
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${ownerToken}`,
				},
				payload: {
					title: "Профессиональная гигиена полости рта (Bearer Test)",
					code: "A16.07.051",
					order804nCode: "A16.07.051",
					category: "hygiene",
					specialty: "therapist",
					basePriceRub: 3500,
					materialsCostRub: 300,
					durationMinutes: 45,
					taxDeductible: true,
					active: true,
				},
			});

			assert.notEqual(res.statusCode, 403, "Bearer токен владельца не должен получать 403");
			assert.equal(res.statusCode, 201, `Service must be created: ${res.body}`);
			const body = JSON.parse(res.body);
			if (body.id) {
				await db
					.delete(schema.serviceCatalogItems)
					.where(eq(schema.serviceCatalogItems.id, body.id));
			}
		});
	});

	test("3. Переименование кресла и статус сохраняются через PUT владельцем", async () => {
		await withFixtureTenant(orgId, async () => {
			const createRes = await app.inject({
				method: "POST",
				url: "/api/settings/chairs",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": ownerToken,
				},
				payload: {
					name: "Кресло RedTeam Тест",
					room: "Кабинет 1",
					specialization: "therapist",
					hasXraySensor: true,
					hasMicroscope: false,
					hasSurgeryKit: false,
				},
			});
			assert.equal(createRes.statusCode, 201, `Chair must be created: ${createRes.body}`);
			const createdChair = JSON.parse(createRes.body);

			const updateRes = await app.inject({
				method: "PUT",
				url: `/api/settings/chairs/${createdChair.id}`,
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": ownerToken,
				},
				payload: {
					name: "Кабинет №1 (Терапия VIP)",
					active: true,
				},
			});
			assert.equal(updateRes.statusCode, 200, `Chair must be updated: ${updateRes.body}`);
			const updatedChair = JSON.parse(updateRes.body);
			assert.equal(updatedChair.name, "Кабинет №1 (Терапия VIP)");

			await db.delete(schema.chairs).where(eq(schema.chairs.id, createdChair.id));
		});
	});

	test("4. Комиссия врача сохраняется при правке карточки сотрудника владельцем", async () => {
		await withFixtureTenant(orgId, async () => {
			const commRes = await app.inject({
				method: "PUT",
				url: `/api/settings/staff/${doctorUserId}/commission`,
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": ownerToken,
				},
				payload: {
					commissionPct: 35,
					materialCostDeductionPct: 10,
					labCostDeductionPct: 5,
				},
			});
			assert.equal(commRes.statusCode, 200, `Commission set: ${commRes.body}`);

			const profileRes = await app.inject({
				method: "PUT",
				url: `/api/settings/staff/${doctorUserId}`,
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": ownerToken,
				},
				payload: {
					fullName: "Д-р Тестовый Обновленный",
					phone: "+7 (999) 111-22-33",
				},
			});
			assert.equal(profileRes.statusCode, 200, `Profile update: ${profileRes.body}`);

			const [activeComm] = await db
				.select()
				.from(schema.doctorCommissions)
				.where(
					and(
						eq(schema.doctorCommissions.organizationId, orgId),
						eq(schema.doctorCommissions.userId, doctorUserId),
						eq(schema.doctorCommissions.isActive, true),
					),
				)
				.limit(1);

			assert.ok(activeComm, "Active commission must exist");
			assert.equal(Number(activeComm.commissionPct), 35, "Commission % must be preserved at 35");
			assert.equal(
				Number(activeComm.materialCostDeductionPct),
				10,
				"Материальный вычет сохранён",
			);
			assert.equal(
				Number(activeComm.labCostDeductionPct),
				5,
				"Лабораторный вычет сохранён",
			);
		});
	});
});

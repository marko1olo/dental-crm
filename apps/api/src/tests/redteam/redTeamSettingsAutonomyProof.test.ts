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

describe("Red Team Settings Autonomy & SSOT Proof (#settings)", () => {
	let app: FastifyInstance;
	let orgId: string;
	let doctorUserId: string;
	let validStaffToken: string;

	before(async () => {
		// Use real database
		const [org] = await db
			.select({ id: schema.organizations.id })
			.from(schema.organizations)
			.limit(1);
		assert.ok(org, "Organization must exist in DB");
		orgId = org.id;

		// Find or create doctor user in this org
		let [user] = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.organizationId, orgId))
			.limit(1);

		if (!user) {
			const [createdUser] = await db
				.insert(schema.users)
				.values({
					organizationId: orgId,
					fullName: "Тестовый Доктор Редтим",
					role: "doctor",
					isActive: true,
				})
				.returning({ id: schema.users.id });
			user = createdUser!;
		}
		doctorUserId = user.id;

		const secret = authTokenSecret();
		validStaffToken = signToken(
			{
				userId: doctorUserId,
				organizationId: orgId,
				role: "doctor",
				fullName: "Тестовый Доктор Редтим",
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
	});

	test("1. Authed staff token eliminates 403 Forbidden on /api/settings/catalog without admin secret", async () => {
		await withFixtureTenant(orgId, async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/settings/catalog",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": validStaffToken,
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

			assert.notEqual(res.statusCode, 403, "Must not return 403 Forbidden with valid session token");
			assert.notEqual(res.statusCode, 503, "Must not return 503 Secret Missing with valid session token");
			assert.equal(res.statusCode, 201, `Service must be created: ${res.body}`);

			const body = JSON.parse(res.body);
			assert.equal(body.title, "Эндодонтическое лечение корневого канала зуба (RedTeam SSOT)");
			assert.equal(body.basePriceRub, 4500);
			assert.equal(body.order804nCode, "A16.07.008");
			assert.equal(body.materialsCostRub, 850.5);

			// Clean up created test service
			if (body.id) {
				await db
					.delete(schema.serviceCatalogItems)
					.where(eq(schema.serviceCatalogItems.id, body.id));
			}
		});
	});

	test("2. Authorization: Bearer token also passes without 403 Forbidden", async () => {
		await withFixtureTenant(orgId, async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/settings/catalog",
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${validStaffToken}`,
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

			assert.notEqual(res.statusCode, 403, "Bearer token must not return 403");
			assert.equal(res.statusCode, 201, `Service must be created: ${res.body}`);
			const body = JSON.parse(res.body);
			if (body.id) {
				await db
					.delete(schema.serviceCatalogItems)
					.where(eq(schema.serviceCatalogItems.id, body.id));
			}
		});
	});

	test("3. Chair renaming & active status persists via PUT /api/settings/chairs/:id", async () => {
		await withFixtureTenant(orgId, async () => {
			// Create a chair first
			const createRes = await app.inject({
				method: "POST",
				url: "/api/settings/chairs",
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": validStaffToken,
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

			// Update chair name and active status
			const updateRes = await app.inject({
				method: "PUT",
				url: `/api/settings/chairs/${createdChair.id}`,
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": validStaffToken,
				},
				payload: {
					name: "Кабинет №1 (Терапия VIP)",
					active: true,
				},
			});
			assert.equal(updateRes.statusCode, 200, `Chair must be updated: ${updateRes.body}`);
			const updatedChair = JSON.parse(updateRes.body);
			assert.equal(updatedChair.name, "Кабинет №1 (Терапия VIP)");

			// Clean up created chair
			await db.delete(schema.chairs).where(eq(schema.chairs.id, createdChair.id));
		});
	});

	test("4. Doctor commission percentages are isolated and preserved when staff profile is edited", async () => {
		await withFixtureTenant(orgId, async () => {
			// Set doctor commission
			const commRes = await app.inject({
				method: "PUT",
				url: `/api/settings/staff/${doctorUserId}/commission`,
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": validStaffToken,
				},
				payload: {
					commissionPct: 35,
					materialCostDeductionPct: 10,
					labCostDeductionPct: 5,
				},
			});
			assert.equal(commRes.statusCode, 200, `Commission set: ${commRes.body}`);

			// Edit staff profile (name, phone)
			const profileRes = await app.inject({
				method: "PUT",
				url: `/api/settings/staff/${doctorUserId}`,
				headers: {
					"content-type": "application/json",
					"x-dente-staff-token": validStaffToken,
				},
				payload: {
					fullName: "Д-р Тестовый Обновленный",
					phone: "+7 (999) 111-22-33",
				},
			});
			assert.equal(profileRes.statusCode, 200, `Profile update: ${profileRes.body}`);

			// Verify commission is still 35% in doctor_commissions table
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
		});
	});
});

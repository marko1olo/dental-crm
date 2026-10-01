import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { doctorPreferences, organizations, users } from "../../db/schema.js";
import { registerDoctorPreferencesRoutes } from "../../routes/doctorPreferencesRoutes.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const ORG_MINE = "c8000000-0000-4000-8000-00000000c001";
const ORG_FOREIGN = "c8000000-0000-4000-8000-00000000c002";
const DOCTOR_MINE = "c8000000-0000-4000-8000-00000000d001";
const DOCTOR_FOREIGN = "c8000000-0000-4000-8000-00000000d002";
const TEST_SECRET = "doctor-preferences-persistence-secret-".padEnd(48, "x");

function clinicHeaders(organizationId: string, userId?: string): Record<string, string> {
	return {
		[CLINIC_TOKEN_HEADER]: signToken(
			{
				organizationId,
			},
			TEST_SECRET,
			3600,
		),
		[STAFF_TOKEN_HEADER]: signToken(
			{
				organizationId,
				userId: userId ?? DOCTOR_MINE,
				role: "doctor",
			},
			TEST_SECRET,
			3600,
		),
		"content-type": "application/json",
	};
}

describe("Сохранение клинических настроек врача в реальную PostgreSQL (127.0.0.1:5432)", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		resetAuthSecretCacheForTests();

		await withFixtureTenant(ORG_MINE, async () => {
			await db
				.delete(doctorPreferences)
				.where(sql`organization_id = ${ORG_MINE}`);
			await db.delete(users).where(sql`organization_id = ${ORG_MINE}`);
			await db.delete(organizations).where(sql`id = ${ORG_MINE}`);

			await db.insert(organizations).values({
				id: ORG_MINE,
				name: "Клиника Dente Персистентность",
			});
			await db.insert(users).values({
				id: DOCTOR_MINE,
				organizationId: ORG_MINE,
				fullName: "Смирнов Алексей Викторович",
				role: "doctor",
			});
		});

		await withFixtureTenant(ORG_FOREIGN, async () => {
			await db
				.delete(doctorPreferences)
				.where(sql`organization_id = ${ORG_FOREIGN}`);
			await db.delete(users).where(sql`organization_id = ${ORG_FOREIGN}`);
			await db.delete(organizations).where(sql`id = ${ORG_FOREIGN}`);

			await db.insert(organizations).values({
				id: ORG_FOREIGN,
				name: "Чужая клиника",
			});
			await db.insert(users).values({
				id: DOCTOR_FOREIGN,
				organizationId: ORG_FOREIGN,
				fullName: "Иванов Иван Иванович",
				role: "doctor",
			});
		});

		app = createTenantTestApp();
		await registerDoctorPreferencesRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("1. GET без авторизации отвергается со статусом 401", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/settings/doctor-preferences",
		});
		assert.equal(res.statusCode, 401);
	});

	test("2. PUT сохраняет настройки врача в PostgreSQL и отдаёт 200", async () => {
		const payload = {
			specialty: "therapist",
			preferences: {
				defaultVisitDuration: 60,
				favoriteAnesthetic: "articaine_200k",
				favoriteNeedleType: "septoject_30g_short",
				defaultIsolation: "cofferdam",
				defaultComposite: "estelite_asteria",
				defaultAdhesive: "optibond_fl",
				defaultEtchant: "ultra_etch",
				quickProtocolIds: ["caries_medium_k02_1", "pulpitis_acute_k04_0"],
				favoriteMedicationIds: ["nimesil_100", "chlorhexidine_005"],
			},
		};

		const res = await app.inject({
			method: "PUT",
			url: "/api/settings/doctor-preferences",
			headers: clinicHeaders(ORG_MINE, DOCTOR_MINE),
			payload,
		});

		assert.equal(res.statusCode, 200, `Save failed: ${res.body}`);
		const json = res.json();
		assert.equal(json.success, true);
		assert.equal(json.specialty, "therapist");
		assert.equal(json.preferences.favoriteAnesthetic, "articaine_200k");
		assert.equal(json.preferences.defaultComposite, "estelite_asteria");
	});

	test("3. Независимый pg.Client подтверждает запись в таблице doctor_preferences", async () => {
		const client = new pg.Client({
			connectionString: process.env.DATABASE_URL,
		});
		await client.connect();
		try {
			await client.query("select set_config('app.superuser_bypass', 'on', false)");
			const result = await client.query<{
				organization_id: string;
				doctor_id: string;
				specialty: string;
				preferences: Record<string, unknown>;
			}>(
				"SELECT organization_id, doctor_id, specialty, preferences FROM doctor_preferences WHERE organization_id = $1",
				[ORG_MINE],
			);

			assert.equal(result.rows.length, 1, "Должна быть ровно одна запись настроек");
			const row = result.rows[0];
			assert.ok(row);
			assert.equal(row.organization_id, ORG_MINE);
			assert.equal(row.doctor_id, DOCTOR_MINE);
			assert.equal(row.specialty, "therapist");
			assert.equal(row.preferences.favoriteAnesthetic, "articaine_200k");
			assert.equal(row.preferences.defaultIsolation, "cofferdam");
		} finally {
			await client.end();
		}
	});

	test("4. GET читает сохраненные настройки врача из PostgreSQL", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/settings/doctor-preferences",
			headers: clinicHeaders(ORG_MINE, DOCTOR_MINE),
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.ok(json.preferences, "Preferences must not be null");
		assert.equal(json.preferences.favoriteAnesthetic, "articaine_200k");
		assert.equal(json.preferences.defaultComposite, "estelite_asteria");
		assert.equal(json.specialty, "therapist");
	});

	test("5. Повторный PUT обновляет запись (upsert без дубликатов)", async () => {
		const patchPayload = {
			specialty: "surgeon",
			preferences: {
				defaultVisitDuration: 45,
				favoriteAnesthetic: "articaine_100k",
				favoriteNeedleType: "septoject_27g_long",
				favoriteImplantSystem: "implant_osstem_tsiii",
				favoriteBoneMaterial: "bone_bio_oss_spongiosa",
			},
		};

		const res = await app.inject({
			method: "PUT",
			url: "/api/settings/doctor-preferences",
			headers: clinicHeaders(ORG_MINE, DOCTOR_MINE),
			payload: patchPayload,
		});

		assert.equal(res.statusCode, 200);

		// Проверка счетчика строк в базе
		const client = new pg.Client({
			connectionString: process.env.DATABASE_URL,
		});
		await client.connect();
		try {
			await client.query("select set_config('app.superuser_bypass', 'on', false)");
			const countRes = await client.query(
				"SELECT count(*)::int as cnt FROM doctor_preferences WHERE organization_id = $1",
				[ORG_MINE],
			);
			assert.equal(countRes.rows[0].cnt, 1, "Запись обновлена in-place без дублирования");
		} finally {
			await client.end();
		}
	});

	test("6. Изоляция клиник: чужая клиника не видит настройки первой", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/settings/doctor-preferences",
			headers: clinicHeaders(ORG_FOREIGN, "c8000000-0000-4000-8000-00000000d002"),
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.preferences, null, "Чужая клиника не должна видеть чужие настройки");
	});
});

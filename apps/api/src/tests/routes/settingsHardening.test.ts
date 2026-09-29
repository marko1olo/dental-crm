/**
 * apps/api/src/tests/routes/settingsHardening.test.ts
 *
 * Red Team Hardening Integration Tests for DENTE CRM Settings:
 * 1. PUT /api/settings/clinic/profile persists logoUrl and stampUrl into PostgreSQL 18
 *    (organizations.workspace_feature_flags) and GET /api/settings/clinic returns them.
 * 2. PUT /api/settings/doctor-preferences persists digital signature & doctor autonomy standards.
 * 3. POST /api/hardware/test-print executes direct ESC/POS test print.
 *
 * Mandate 8b: Strictly <= 800 lines.
 * Mandate 8e: Zero mocks, real PostgreSQL 18 persistence.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { clinics, doctorPreferences, organizations, users } from "../../db/schema.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { registerDoctorPreferencesRoutes } from "../../routes/doctorPreferencesRoutes.js";
import { registerHardwareRoutes } from "../../routes/hardware.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const ORG_ID = fixtureUuid("settingsHardening", 1);
const OWNER_USER_ID = fixtureUuid("settingsHardening", 2);
const CLINIC_ID = fixtureUuid("settingsHardening", 3);
const TEST_AUTH_SECRET = "settings-hardening-test-secret-value-".padEnd(48, "x");
const ADMIN_SECRET = "settings-hardening-admin-secret-".padEnd(32, "y");

function authHeaders(organizationId: string, role = "owner"): Record<string, string> {
	return {
		[CLINIC_TOKEN_HEADER]: signToken({ organizationId }, TEST_AUTH_SECRET, 3600),
		[STAFF_TOKEN_HEADER]: signToken(
			{ organizationId, userId: OWNER_USER_ID, role },
			TEST_AUTH_SECRET,
			3600,
		),
		"x-dente-admin-secret": ADMIN_SECRET,
		"content-type": "application/json",
	};
}

describe("Settings & Branch Hardening Integration Suite", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.AUTH_TOKEN_SECRET = TEST_AUTH_SECRET;
		process.env.DENTE_CLINICAL_ADMIN_SECRET = ADMIN_SECRET;
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		resetAuthSecretCacheForTests();

		await withFixtureTenant(ORG_ID, async () => {
			await db.delete(doctorPreferences).where(sql`organization_id = ${ORG_ID}`);
			await db.delete(clinics).where(sql`organization_id = ${ORG_ID}`);
			await db.delete(users).where(sql`organization_id = ${ORG_ID}`);
			await db.delete(organizations).where(sql`id = ${ORG_ID}`);

			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Dente Харденинг",
			});
			await db.insert(clinics).values({
				id: CLINIC_ID,
				organizationId: ORG_ID,
				name: "Клиника Dente Харденинг",
			});
			await db.insert(users).values({
				id: OWNER_USER_ID,
				organizationId: ORG_ID,
				fullName: "Главный Врач Владелец",
				role: "owner",
			});
		});

		app = createTenantTestApp();
		await registerSettingsRoutes(app);
		await registerDoctorPreferencesRoutes(app);
		await registerHardwareRoutes(app);
		await app.ready();
	});

	after(async () => {
		process.env = { ...originalEnv };
		resetAuthSecretCacheForTests();

		await withFixtureTenant(ORG_ID, async () => {
			await db.delete(doctorPreferences).where(sql`organization_id = ${ORG_ID}`);
			await db.delete(clinics).where(sql`organization_id = ${ORG_ID}`);
			await db.delete(users).where(sql`organization_id = ${ORG_ID}`);
			await db.delete(organizations).where(sql`id = ${ORG_ID}`);
		});

		if (app) {
			await app.close();
		}
	});

	it("1. PUT /api/settings/clinic/profile persists logoUrl and stampUrl to DB and GET /api/settings/clinic returns them", async () => {
		const testLogoUrl = "https://cdn.clinic.ru/assets/logo-dente.png";
		const testStampUrl = "https://cdn.clinic.ru/assets/stamp-facsimile.png";

		// 1. Update clinic profile with logo and facsimile stamp
		const putResponse = await app.inject({
			method: "PUT",
			url: "/api/settings/clinic/profile",
			headers: authHeaders(ORG_ID),
			payload: {
				clinicName: "Клиника Dente Харденинг Плюс",
				inn: "7701234567",
				kpp: "770101001",
				logoUrl: testLogoUrl,
				stampUrl: testStampUrl,
			},
		});

		assert.equal(putResponse.statusCode, 200, `Expected 200, got ${putResponse.statusCode}: ${putResponse.payload}`);
		const putBody = JSON.parse(putResponse.payload);
		assert.equal(putBody.profile.logoUrl, testLogoUrl);
		assert.equal(putBody.profile.stampUrl, testStampUrl);

		// 2. Query GET /api/settings/clinic to verify fail-closed persistence
		const getResponse = await app.inject({
			method: "GET",
			url: "/api/settings/clinic",
			headers: authHeaders(ORG_ID),
		});

		assert.equal(getResponse.statusCode, 200, `Expected 200, got ${getResponse.statusCode}: ${getResponse.payload}`);
		const getBody = JSON.parse(getResponse.payload);
		assert.equal(getBody.profile.clinicName, "Клиника Dente Харденинг Плюс");
		assert.equal(getBody.profile.inn, "7701234567");
		assert.equal(getBody.profile.kpp, "770101001");
		assert.equal(getBody.profile.logoUrl, testLogoUrl);
		assert.equal(getBody.profile.stampUrl, testStampUrl);
	});

	it("2. PUT /api/settings/doctor-preferences persists digital signature and autonomy preferences into PostgreSQL", async () => {
		const putResponse = await app.inject({
			method: "PUT",
			url: "/api/settings/doctor-preferences",
			headers: authHeaders(ORG_ID, "doctor"),
			payload: {
				specialty: "therapist",
				preferences: {
					digitalSignatureMode: "ukep",
					signatureTitle: "Врач-стоматолог-терапевт высшей квалификационной категории",
					autoStampEmkOnClose: true,
					autoMkb10: true,
					somaticWarnings: true,
				},
			},
		});

		assert.equal(putResponse.statusCode, 200, `Expected 200, got ${putResponse.statusCode}: ${putResponse.payload}`);
		const putBody = JSON.parse(putResponse.payload);
		assert.equal(putBody.success, true);
		assert.equal(putBody.preferences.digitalSignatureMode, "ukep");
		assert.equal(putBody.preferences.signatureTitle, "Врач-стоматолог-терапевт высшей квалификационной категории");
		assert.equal(putBody.preferences.autoStampEmkOnClose, true);

		// Verify retrieval
		const getResponse = await app.inject({
			method: "GET",
			url: "/api/settings/doctor-preferences",
			headers: authHeaders(ORG_ID, "doctor"),
		});

		assert.equal(getResponse.statusCode, 200);
		const getBody = JSON.parse(getResponse.payload);
		assert.equal(getBody.preferences.digitalSignatureMode, "ukep");
		assert.equal(getBody.preferences.signatureTitle, "Врач-стоматолог-терапевт высшей квалификационной категории");
		assert.equal(getBody.preferences.autoStampEmkOnClose, true);
	});

	it("3. POST /api/hardware/test-print dispatches print job and returns hex preview", async () => {
		const printResponse = await app.inject({
			method: "POST",
			url: "/api/hardware/test-print",
			headers: authHeaders(ORG_ID),
			payload: {
				deviceType: "thermal_receipt",
				interface: "system_spooler",
				paperWidthMm: 58,
				systemPrinterName: "Xprinter XP-58",
				customMessage: "DENTE CRM TEST PRINT",
			},
		});

		assert.equal(printResponse.statusCode, 200, `Expected 200, got ${printResponse.statusCode}: ${printResponse.payload}`);
		const printBody = JSON.parse(printResponse.payload);
		assert.equal(printBody.success, true);
		assert.ok(printBody.result.bytesSent > 0);
		assert.ok(printBody.result.rawHexPreview);
	});
});

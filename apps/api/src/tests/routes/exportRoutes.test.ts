import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { crmLeads, organizations, patients, treatmentItems, users } from "../../db/schema.js";
import { registerExportRoutes } from "../../routes/export.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { registerMedicalSecrecyPayloadStripping } from "../../security/medicalSecrecyWarden.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "exportRoutesDefExp02";
const ORG_A = fixtureUuid(NAMESPACE, 1);
const ORG_B = fixtureUuid(NAMESPACE, 2);
const ADMIN_A = fixtureUuid(NAMESPACE, 3);
const MARKETER_A = fixtureUuid(NAMESPACE, 4);
const PATIENT_A_ID = fixtureUuid(NAMESPACE, 10);
const LEAD_A_ID = fixtureUuid(NAMESPACE, 20);
const LEAD_B_ID = fixtureUuid(NAMESPACE, 21);

describe("DEF-EXP-02: /api/export/{patients,leads} CSV BOM, Formula Safety, balanceKopecks & RLS", () => {
	let app: FastifyInstance;
	let adminToken = "";
	let marketerToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		await purgeFixtureOrganizations([ORG_A, ORG_B]);

		const secret = authTokenSecret();
		adminToken = signToken(
			{
				organizationId: ORG_A,
				userId: ADMIN_A,
				role: "admin",
				clinicalRole: null,
				canSignMedicalRecords: false,
			},
			secret,
		);
		marketerToken = signToken(
			{
				organizationId: ORG_A,
				userId: MARKETER_A,
				role: "marketer",
				clinicalRole: null,
				canSignMedicalRecords: false,
			},
			secret,
		);

		await withFixtureTenant(ORG_A, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_A,
				name: "Клиника Экспорт А",
				loginId: `exp_a_${Date.now()}`,
			});
			await tx.insert(users).values([
				{ id: ADMIN_A, organizationId: ORG_A, role: "admin", fullName: "Админ Экспорт А" },
				{ id: MARKETER_A, organizationId: ORG_A, role: "marketer", fullName: "Маркетолог А" },
			]);
			await tx.insert(patients).values({
				id: PATIENT_A_ID,
				organizationId: ORG_A,
				fullName: "=CMD('calc')",
				phone: "+79991112233",
				birthDate: "1991-03-10",
				status: "active",
				notes: "Жалоба +SUM(A1:A2), соматика гепатит B",
			});
			await tx.insert(treatmentItems).values({
				organizationId: ORG_A,
				patientId: PATIENT_A_ID,
				title: "Консультация",
				quantity: "1",
				priceRub: 1500,
				unitPriceRub: 1500,
				discountRub: 0,
				priceKopecks: 150000n,
				unitPriceKopecks: 150000n,
				discountKopecks: 0n,
				status: "completed",
			});
			await tx.insert(crmLeads).values({
				id: LEAD_A_ID,
				organizationId: ORG_A,
				name: "@IMPORTXML('https://evil.test')",
				phone: "-cmd_payload",
				source: "site",
				status: "new",
				notes: "=1+1 и подозрение на туберкулез",
				expectedRevenue: "12000.00",
			});
		});

		await withFixtureTenant(ORG_B, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_B,
				name: "Клиника Экспорт Б",
				loginId: `exp_b_${Date.now()}`,
			});
			await tx.insert(crmLeads).values({
				id: LEAD_B_ID,
				organizationId: ORG_B,
				name: "Чужой лид Б",
				phone: "+79990009999",
				source: "phone",
				status: "new",
				notes: "Не должен утечь в организацию А",
				expectedRevenue: "5000.00",
			});
		});

		app = createTenantTestApp();
		registerMedicalSecrecyPayloadStripping(app);
		await registerExportRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
	});

	it("blocks marketer from exporting patient registry with 403 PermissionDenied", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/export/patients?format=csv",
			headers: { "x-dente-staff-token": marketerToken },
		});
		assert.equal(res.statusCode, 403);
		const body = JSON.parse(res.body) as { error: string; permission: string };
		assert.equal(body.error, "PermissionDenied");
		assert.equal(body.permission, "patients.export");
	});

	it("exports patients CSV with UTF-8 BOM, CSV formula escaping, preserved negative numbers, and somatic masking", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/export/patients?format=csv",
			headers: { "x-dente-staff-token": adminToken },
		});
		assert.equal(res.statusCode, 200);
		assert.equal(res.body.charCodeAt(0), 0xfeff);
		assert.ok(res.body.includes("'=CMD('calc')"));
		assert.ok(!res.body.includes("гепатит"));
		assert.ok(res.body.includes("[Сведения защищены 152-ФЗ]"));
		// Numeric -1500 must NOT be turned into '-1500 formula string
		assert.ok(res.body.endsWith(",-1500"));
	});

	it("exports patients JSON with exact integer balanceKopecks alongside balanceRub", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/export/patients?format=json",
			headers: { "x-dente-staff-token": adminToken },
		});
		assert.equal(res.statusCode, 200);
		const rawList = JSON.parse(res.body) as
			| { data?: Array<{ id: string; balanceRub: number; balanceKopecks: number; notes: string | null }> }
			| Array<{ id: string; balanceRub: number; balanceKopecks: number; notes: string | null }>;
		const list = Array.isArray(rawList) ? rawList : (rawList.data ?? []);
		const row = list.find((item) => item.id === PATIENT_A_ID);
		assert.ok(row);
		assert.equal(row.balanceRub, -1500);
		assert.equal(row.balanceKopecks, -150000);
		assert.ok(row.notes?.includes("[Сведения защищены 152-ФЗ]"));
	});

	it("exports leads CSV/JSON strictly isolated by withTenantCtx RLS with BOM and formula protection", async () => {
		const csvRes = await app.inject({
			method: "GET",
			url: "/api/export/leads?format=csv",
			headers: { "x-dente-staff-token": marketerToken },
		});
		assert.equal(csvRes.statusCode, 200);
		assert.equal(csvRes.body.charCodeAt(0), 0xfeff);
		assert.ok(csvRes.body.includes("'@IMPORTXML('https://evil.test')"));
		assert.ok(csvRes.body.includes("'-cmd_payload"));
		assert.ok(csvRes.body.includes("'=1+1"));
		assert.ok(!csvRes.body.includes("туберкулез"));
		assert.ok(!csvRes.body.includes("Чужой лид Б"));

		const jsonRes = await app.inject({
			method: "GET",
			url: "/api/export/leads?format=json",
			headers: { "x-dente-staff-token": marketerToken },
		});
		assert.equal(jsonRes.statusCode, 200);
		const rawLeads = JSON.parse(jsonRes.body) as { data?: Array<{ id: string }> } | Array<{ id: string }>;
		const leads = Array.isArray(rawLeads) ? rawLeads : (rawLeads.data ?? []);
		assert.equal(leads.some((lead) => lead.id === LEAD_A_ID), true);
		assert.equal(leads.some((lead) => lead.id === LEAD_B_ID), false);
	});
});

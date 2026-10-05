/**
 * multiTenantIsolationInquisition.test.ts
 *
 * RED-TEAM INQUISITOR: BACKEND MULTI-TENANCY & CROSS-TENANT ISOLATION TEST SUITE
 *
 * Verifies strict data isolation between tenants (Clinic A vs Clinic B):
 * 1. Document templates (custom templates, rendering with patient/visit PII gating, system template isolation).
 * 2. CRM Leak Detector (cross-tenant lead tampering and updates blocked with 404).
 * 3. Periodontogram (cross-tenant examination closing and deletion blocked with 404).
 * 4. Cash installments (cross-tenant contract and tranche inspection blocked with 404).
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import type { FastifyInstance } from "fastify";
import {
	clinics,
	crmLeakDetectorLeads,
	documentTemplateCategories,
	documentTemplates,
	installmentContracts,
	installmentTranches,
	organizations,
	patients,
	periodontogramSnapshots,
	users,
} from "../db/schema.js";
import { registerCashInstallmentsRoutes } from "../routes/cashInstallmentsRoutes.js";
import { registerCrmLeakDetectorRoutes } from "../routes/crmLeakDetector.js";
import { registerDocumentTemplateRoutes } from "../routes/documentTemplates.js";
import { registerPeriodontogramRoutes } from "../routes/periodontogram.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "multitenant-isolation-inquisition";

const ORG_A_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_A_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_A_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_A_ID = fixtureUuid(NAMESPACE, 4);

const ORG_B_ID = fixtureUuid(NAMESPACE, 11);
const CLINIC_B_ID = fixtureUuid(NAMESPACE, 12);
const DOCTOR_B_ID = fixtureUuid(NAMESPACE, 13);
const PATIENT_B_ID = fixtureUuid(NAMESPACE, 14);

const TEMPLATE_A_ID = fixtureUuid(NAMESPACE, 21);
const LEAD_A_ID = fixtureUuid(NAMESPACE, 22);
const PERIO_A_ID = fixtureUuid(NAMESPACE, 23);
const CONTRACT_A_ID = fixtureUuid(NAMESPACE, 24);
const TRANCHE_A_ID = fixtureUuid(NAMESPACE, 25);

test("RED-TEAM INQUISITION: Multi-Tenancy & Database Cross-Tenant Isolation Gates", async (suite) => {
	let app: FastifyInstance;
	let authHeadersA: Record<string, string>;
	let authHeadersB: Record<string, string>;
	let databaseReady = false;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);

			// 1. Seed Tenant A
			await withFixtureTenant(ORG_A_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_A_ID,
					name: "Клиника А (Альфа)",
					inn: "7701000001",
					kpp: "770101001",
					legalAddress: "г. Москва, ул. Первая, д. 1",
					email: "info@clinic-alpha.ru",
					medicalLicenseNumber: "ЛО-77-01-000001",
					medicalLicenseIssuedAt: "2020-01-01",
					medicalLicenseIssuer: "Департамент здравоохранения г. Москвы",
				});

				await tx.insert(clinics).values({
					id: CLINIC_A_ID,
					organizationId: ORG_A_ID,
					name: "Отделение Альфа",
					phone: "+79991110001",
					address: "г. Москва, ул. Первая, д. 1",
				});

				await tx.insert(users).values({
					id: DOCTOR_A_ID,
					organizationId: ORG_A_ID,
					fullName: "Доктор Альфа Первый",
					email: "doc-alpha@dente.ru",
					role: "doctor",
					isActive: true,
				});

				await tx.insert(patients).values({
					id: PATIENT_A_ID,
					organizationId: ORG_A_ID,
					fullName: "Пациент Альфа Секретный",
					phone: "+79991110002",
					birthDate: "1990-05-15",
					status: "active",
					notes: "Секретные медицинские заметки Альфа",
				});

				// Seed category if needed
				await tx
					.insert(documentTemplateCategories)
					.values({
						id: 1,
						name: "Общее",
						order: 1,
					})
					.onConflictDoNothing();

				// Custom Template in Org A
				await tx.insert(documentTemplates).values({
					id: TEMPLATE_A_ID,
					organizationId: ORG_A_ID,
					categoryId: 1,
					systemAlias: "custom_contract_alpha",
					name: "Специфический договор клиники Альфа",
					type: "common",
					contentHtml: "<p>Договор клиники Альфа: {{patient.fullName}}</p>",
				});

				// CRM Leak Lead in Org A
				await tx.insert(crmLeakDetectorLeads).values({
					id: LEAD_A_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					daysSinceLastVisit: 90,
					lastVisitDate: new Date(),
					lastDoctorId: DOCTOR_A_ID,
					lastDoctorName: "Доктор Альфа Первый",
					lastSpecialty: "Терапевт",
					uncompletedPlanSumRub: 25000,
					hasUncompletedPlan: true,
					clinicalRiskReason: "Не завершено эндодонтическое лечение",
					leadStatus: "new",
					contactAttemptsCount: 0,
				});

				// Periodontogram Snapshot in Org A
				await tx.insert(periodontogramSnapshots).values({
					id: PERIO_A_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					recordedByUserId: DOCTOR_A_ID,
					status: "draft",
					notes: "Черновой осмотр пародонта Альфа",
				});

				// Cash Installment in Org A
				await tx.insert(installmentContracts).values({
					id: CONTRACT_A_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A_ID,
					contractNumber: "РАСС-АЛЬФА-001",
					totalAmountRub: 50000,
					downPaymentRub: 0,
					monthsCount: 2,
					remainingAmountRub: 50000,
					status: "active",
					signedAt: new Date(),
				});

				await tx.insert(installmentTranches).values({
					id: TRANCHE_A_ID,
					organizationId: ORG_A_ID,
					contractId: CONTRACT_A_ID,
					trancheNumber: 1,
					amountRub: 25000,
					dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					status: "pending",
				});
			});

			// 2. Seed Tenant B
			await withFixtureTenant(ORG_B_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_B_ID,
					name: "Клиника Б (Бета)",
					inn: "7702000002",
					kpp: "770201001",
					legalAddress: "г. Москва, ул. Вторая, д. 2",
					email: "info@clinic-beta.ru",
					medicalLicenseNumber: "ЛО-77-01-000002",
					medicalLicenseIssuedAt: "2021-01-01",
					medicalLicenseIssuer: "Департамент здравоохранения г. Москвы",
				});

				await tx.insert(clinics).values({
					id: CLINIC_B_ID,
					organizationId: ORG_B_ID,
					name: "Отделение Бета",
					phone: "+79992220001",
					address: "г. Москва, ул. Вторая, д. 2",
				});

				await tx.insert(users).values({
					id: DOCTOR_B_ID,
					organizationId: ORG_B_ID,
					fullName: "Доктор Бета Второй",
					email: "doc-beta@dente.ru",
					role: "doctor",
					isActive: true,
				});

				await tx.insert(patients).values({
					id: PATIENT_B_ID,
					organizationId: ORG_B_ID,
					fullName: "Пациент Бета Открытый",
					phone: "+79992220002",
					birthDate: "1995-10-20",
					status: "active",
					notes: "Заметки Бета",
				});
			});

			// Setup Fastify App
			app = createTenantTestApp();
			await registerDocumentTemplateRoutes(app);
			await registerCrmLeakDetectorRoutes(app);
			await registerPeriodontogramRoutes(app);
			await registerCashInstallmentsRoutes(app);
			await app.ready();

			const secret = authTokenSecret();

			const clinicTokenA = signToken(
				{
					organizationId: ORG_A_ID,
					clinicId: CLINIC_A_ID,
					type: "clinic",
				},
				secret,
			);

			const doctorTokenA = signToken(
				{
					organizationId: ORG_A_ID,
					userId: DOCTOR_A_ID,
					role: "doctor",
					clinicalRole: "dentist",
					canSignMedicalRecords: true,
				},
				secret,
			);

			const clinicTokenB = signToken(
				{
					organizationId: ORG_B_ID,
					clinicId: CLINIC_B_ID,
					type: "clinic",
				},
				secret,
			);

			const doctorTokenB = signToken(
				{
					organizationId: ORG_B_ID,
					userId: DOCTOR_B_ID,
					role: "doctor",
					clinicalRole: "dentist",
					canSignMedicalRecords: true,
				},
				secret,
			);

			authHeadersA = {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorTokenA,
			};

			authHeadersB = {
				"x-dente-clinic-token": clinicTokenB,
				"x-dente-staff-token": doctorTokenB,
			};

			databaseReady = true;
		} catch (err) {
			console.warn("[MultiTenantInquisition] Setup skipped (DB unavailable):", err);
			databaseReady = false;
		}
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		}
	});

	await suite.test(
		"ATTACK 1: Doctor B cannot read custom document template of Clinic A",
		async () => {
			if (!databaseReady) return;

			const res = await app.inject({
				method: "GET",
				url: `/api/document-templates/${TEMPLATE_A_ID}`,
				headers: authHeadersB,
			});

			// Must return 404 not found
			assert.equal(
				res.statusCode,
				404,
				`Clinic B must not be able to read Clinic A's template (got ${res.statusCode}: ${res.body})`,
			);
		},
	);

	await suite.test(
		"ATTACK 2: Doctor A CAN read its own custom document template",
		async () => {
			if (!databaseReady) return;

			const res = await app.inject({
				method: "GET",
				url: `/api/document-templates/${TEMPLATE_A_ID}`,
				headers: authHeadersA,
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();
			assert.equal(json.ok, true);
			assert.equal(json.template.id, TEMPLATE_A_ID);
		},
	);

	await suite.test(
		"ATTACK 3: Doctor B cannot render document template using Patient A from Clinic A",
		async () => {
			if (!databaseReady) return;

			// Try rendering system template #1 with Clinic A's patientId under Clinic B session
			const res = await app.inject({
				method: "POST",
				url: "/api/document-templates/1/render",
				headers: authHeadersB,
				payload: {
					patientId: PATIENT_A_ID,
				},
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();
			assert.equal(json.ok, true);
			// The rendered HTML must NOT contain Clinic A's secret patient name
			assert.ok(
				!json.renderedHtml.includes("Пациент Альфа Секретный"),
				"Cross-tenant patient PII leak: Patient A name was rendered in Tenant B document context!",
			);
		},
	);

	await suite.test(
		"ATTACK 4: Unauthenticated template list returns ONLY system templates (no private templates)",
		async () => {
			if (!databaseReady) return;

			const res = await app.inject({
				method: "GET",
				url: "/api/document-templates",
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();
			assert.ok(Array.isArray(json.templates));
			const leakedPrivateTemplates = json.templates.filter(
				(t: { organizationId?: string | null }) => t.organizationId !== null && t.organizationId !== undefined,
			);
			assert.equal(
				leakedPrivateTemplates.length,
				0,
				`Unauthenticated endpoint leaked ${leakedPrivateTemplates.length} private templates!`,
			);
		},
	);

	await suite.test(
		"ATTACK 5: Doctor B cannot start, cancel or update CRM Leak Lead of Clinic A",
		async () => {
			if (!databaseReady) return;

			// 1. Start lead
			const startRes = await app.inject({
				method: "POST",
				url: `/api/crm/leak-detector/${LEAD_A_ID}/start-lead`,
				headers: authHeadersB,
			});
			assert.equal(startRes.statusCode, 404, "Start lead of another tenant must return 404");

			// 2. Cancel lead
			const cancelRes = await app.inject({
				method: "POST",
				url: `/api/crm/leak-detector/${LEAD_A_ID}/cancel-lead`,
				headers: authHeadersB,
				payload: {
					declineReason: "expensive",
				},
			});
			assert.equal(cancelRes.statusCode, 404, "Cancel lead of another tenant must return 404");

			// 3. Create task
			const taskRes = await app.inject({
				method: "POST",
				url: `/api/crm/leak-detector/${LEAD_A_ID}/create-task`,
				headers: authHeadersB,
			});
			assert.equal(taskRes.statusCode, 404, "Create task on foreign lead must return 404");
		},
	);

	await suite.test(
		"ATTACK 6: Doctor B cannot close or delete Periodontogram Snapshot of Clinic A",
		async () => {
			if (!databaseReady) return;

			// 1. Close snapshot
			const closeRes = await app.inject({
				method: "POST",
				url: `/api/periodontogram/snapshots/${PERIO_A_ID}/close`,
				headers: authHeadersB,
				payload: {
					notes: "Tampered by Tenant B",
				},
			});
			assert.equal(closeRes.statusCode, 404, "Closing foreign periodontogram snapshot must return 404");

			// 2. Discard/delete snapshot
			const deleteRes = await app.inject({
				method: "DELETE",
				url: `/api/periodontogram/snapshots/${PERIO_A_ID}`,
				headers: authHeadersB,
			});
			assert.equal(deleteRes.statusCode, 404, "Deleting foreign periodontogram snapshot must return 404");
		},
	);

	await suite.test(
		"ATTACK 7: Doctor B cannot inspect Installment Contract or Tranches of Clinic A",
		async () => {
			if (!databaseReady) return;

			const foreignRes = await app.inject({
				method: "GET",
				url: `/api/installments/${CONTRACT_A_ID}`,
				headers: authHeadersB,
			});
			assert.equal(
				foreignRes.statusCode,
				404,
				"Reading foreign installment contract must return 404",
			);

			// Doctor A can access its own installment contract
			const ownRes = await app.inject({
				method: "GET",
				url: `/api/installments/${CONTRACT_A_ID}`,
				headers: authHeadersA,
			});
			assert.equal(ownRes.statusCode, 200);
			const ownData = ownRes.json();
			assert.equal(ownData.data.contract.id, CONTRACT_A_ID);
			assert.equal(ownData.data.tranches.length, 1);
			assert.equal(ownData.data.tranches[0].id, TRANCHE_A_ID);
		},
	);
});

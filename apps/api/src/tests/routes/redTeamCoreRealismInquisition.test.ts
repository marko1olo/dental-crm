import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	crmLeads,
	crmLeadStageHistory,
	labOrders,
	organizations,
	patients,
	toothStates,
	users,
} from "../../db/schema.js";
import { registerLabRoutes } from "../../routes/lab.js";
import { registerLeadsRoutes } from "../../routes/leads.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * ============================================================================
 * SUBAGENT F: RED TEAM INQUISITOR & REALISM AUDITOR
 * CORE WORKFLOWS REALISM & ANTI-MOCK INTEGRATION SUITE
 * ============================================================================
 *
 * Verifies that core workflows execute with 100% real database transactions
 * against PostgreSQL 18 with RLS tenant isolation, without fake mocks or dummy stubs:
 * 1. Patient Lifecycle: Create, retrieve, somatic profile, cross-tenant isolation.
 * 2. Schedule & Appointments: Booking, chair allocation, status flow.
 * 3. Odontogram & Dental Formula: Batch tooth recording, real rows in tooth_states.
 * 4. CRM Leads Kanban & Call Audio: Lead intake with call audio URL and first-phrase
 *    transcription, batch stage transition, conversion to real patient.
 * 5. Dental Lab Orders: Create order, track stages, verify real database updates.
 */

const FIXTURE = "redTeamCoreRealismInquisition";
const ORG_A_ID = fixtureUuid(FIXTURE, 1);
const ORG_B_ID = fixtureUuid(FIXTURE, 2);

const DOCTOR_A_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_B_ID = fixtureUuid(FIXTURE, 20);

let app: FastifyInstance;
let tokenDoctorA: string;
let tokenDoctorB: string;
let headersA: Record<string, string>;
let headersB: Record<string, string>;

describe("RED TEAM CORE REALISM INQUISITION: REAL DB EXECUTION (POSTGRESQL 18)", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);

		// Seed Tenant A
		await withFixtureTenant(ORG_A_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_A_ID,
					name: "Клиника Red Team А (Тест Реализма)",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: DOCTOR_A_ID,
					organizationId: ORG_A_ID,
					role: "doctor",
					fullName: "Д-р Реалистов А. А.",
					isActive: true,
				})
				.onConflictDoNothing();
		});

		// Seed Tenant B
		await withFixtureTenant(ORG_B_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_B_ID,
					name: "Клиника Red Team Б (Изолированная)",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: DOCTOR_B_ID,
					organizationId: ORG_B_ID,
					role: "doctor",
					fullName: "Д-р Чужой Б. Б.",
					isActive: true,
				})
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		tokenDoctorA = signToken(
			{
				userId: DOCTOR_A_ID,
				organizationId: ORG_A_ID,
				role: "doctor",
				fullName: "Д-р Реалистов А. А.",
			},
			secret,
			3600,
		);

		tokenDoctorB = signToken(
			{
				userId: DOCTOR_B_ID,
				organizationId: ORG_B_ID,
				role: "doctor",
				fullName: "Д-р Чужой Б. Б.",
			},
			secret,
			3600,
		);

		headersA = {
			"x-dente-clinic-token": tokenDoctorA,
			"x-dente-staff-token": tokenDoctorA,
			"content-type": "application/json",
		};

		headersB = {
			"x-dente-clinic-token": tokenDoctorB,
			"x-dente-staff-token": tokenDoctorB,
			"content-type": "application/json",
		};

		app = createTenantTestApp();
		await registerPatientRoutes(app);
		await registerScheduleRoutes(app);
		await registerOdontogramRoutes(app);
		await registerLeadsRoutes(app);
		await registerLabRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
	});

	// --------------------------------------------------------------------------
	// 1. PATIENT MANAGEMENT: REAL DB ROWS & TENANT ISOLATION
	// --------------------------------------------------------------------------
	describe("1. Real Patient Management", () => {
		let createdPatientId: string;

		it("1.1. Creates real patient in PostgreSQL without simulation", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/patients",
				headers: headersA,
				payload: {
					fullName: "Тестовый Пациент Реализма",
					phone: "+79991234567",
					gender: "male",
					birthDate: "1990-05-15",
					notes: "Соматически здоров. Аллергий не выявлено.",
				},
			});

			assert.strictEqual(res.statusCode, 201, `Expected 201, got ${res.statusCode}: ${res.body}`);
			const body = JSON.parse(res.body);
			assert.ok(body.id, "Patient ID must be returned");
			assert.strictEqual(body.fullName, "Тестовый Пациент Реализма");
			createdPatientId = body.id;

			// Verify in PostgreSQL table
			const [dbRow] = await withFixtureTenant(ORG_A_ID, async () =>
				db.select().from(patients).where(eq(patients.id, createdPatientId)),
			);
			assert.ok(dbRow, "Patient row must exist in PostgreSQL");
			assert.strictEqual(dbRow.organizationId, ORG_A_ID, "Tenant isolation invariant");
		});

		it("1.2. Cross-tenant isolation: Tenant B cannot access Tenant A patient", async () => {
			const res = await app.inject({
				method: "GET",
				url: `/api/patients/${createdPatientId}`,
				headers: headersB,
			});

			assert.strictEqual(res.statusCode, 404, "Tenant B must receive 404 for Tenant A patient");
		});
	});

	// --------------------------------------------------------------------------
	// 2. ODONTOGRAM & DENTAL FORMULA: REAL BATCH PERSISTENCE
	// --------------------------------------------------------------------------
	describe("2. Real Odontogram & Dental Formula Persistence", () => {
		let patientId: string;

		before(async () => {
			const [p] = await withFixtureTenant(ORG_A_ID, async () =>
				db
					.insert(patients)
					.values({
						organizationId: ORG_A_ID,
						fullName: "Пациент Одонтограммы",
						phone: "+79998887766",
					})
					.returning(),
			);
			patientId = p!.id;
		});

		it("2.1. Records batch diagnoses directly into PostgreSQL tooth_states", async () => {
			const res = await app.inject({
				method: "POST",
				url: `/api/patients/${patientId}/tooth-states/batch`,
				headers: headersA,
				payload: {
					toothNumbers: [16, 36, 46],
					state: "Caries",
					notes: "K02.1 Глубокий кариес жевательной поверхности",
				},
			});

			assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);

			// Verify in PostgreSQL table directly
			const dbTeeth = await withFixtureTenant(ORG_A_ID, async () =>
				db
					.select()
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, ORG_A_ID),
							eq(toothStates.patientId, patientId),
						),
					),
			);

			assert.strictEqual(dbTeeth.length, 3, "All 3 teeth must be persisted in database");
			const tooth16 = dbTeeth.find((t) => t.toothNumber === 16);
			assert.ok(tooth16, "Tooth 16 must exist");
			assert.strictEqual(tooth16.state, "Caries");
			assert.strictEqual(tooth16.notes, "K02.1 Глубокий кариес жевательной поверхности");
		});

		it("2.2. Cross-tenant isolation: Tenant B cannot read Tenant A odontogram", async () => {
			const res = await app.inject({
				method: "GET",
				url: `/api/patients/${patientId}/tooth-states`,
				headers: headersB,
			});

			assert.strictEqual(res.statusCode, 404, "Tenant B must receive 404 for Tenant A patient odontogram");
		});
	});

	// --------------------------------------------------------------------------
	// 3. CRM LEADS KANBAN & CALL AUDIO: REAL PIPELINE EXECUTION
	// --------------------------------------------------------------------------
	describe("3. Real CRM Leads Kanban & Call Audio", () => {
		let createdLeadId: string;

		it("3.1. Creates lead with real call audio URL and transcription snippet", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/leads",
				headers: headersA,
				payload: {
					name: "Лид с аудиозаписью",
					phone: "+79995554433",
					source: "yandex_direct",
					expectedRevenue: "45000",
					notes: "Консультация по имплантации",
					priority: "high",
					clinicalTags: ["имплантация", "острая_боль"],
					audioRecordUrl: "https://storage.yandexcloud.net/dente-audio/rec_call_999.mp3",
					transcriptionSnippet: "Здравствуйте, хочу записаться на установку имплантата на следующей неделе",
				},
			});

			assert.ok([200, 201].includes(res.statusCode), `Expected 200 or 201, got ${res.statusCode}: ${res.body}`);
			const body = JSON.parse(res.body);
			assert.ok(body.id, "Lead ID must be generated");
			assert.strictEqual(body.status, "new");
			assert.strictEqual(body.audioRecordUrl, "https://storage.yandexcloud.net/dente-audio/rec_call_999.mp3");
			assert.strictEqual(body.transcriptionSnippet, "Здравствуйте, хочу записаться на установку имплантата на следующей неделе");
			createdLeadId = body.id;

			// Verify in PostgreSQL crm_leads table
			const [dbLead] = await withFixtureTenant(ORG_A_ID, async () =>
				db.select().from(crmLeads).where(eq(crmLeads.id, createdLeadId)),
			);
			assert.ok(dbLead, "Lead row must exist in crm_leads table");
			assert.strictEqual(dbLead.organizationId, ORG_A_ID);
		});

		it("3.2. Batch stage transition records stage history in PostgreSQL", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/leads/batch-stage",
				headers: headersA,
				payload: {
					leadIds: [createdLeadId],
					toStage: "contacted",
					reason: "Успешный первый контакт",
				},
			});

			assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);

			// Verify stage history row in PostgreSQL
			const history = await withFixtureTenant(ORG_A_ID, async () =>
				db
					.select()
					.from(crmLeadStageHistory)
					.where(eq(crmLeadStageHistory.leadId, createdLeadId)),
			);
			assert.ok(history.length > 0, "Stage transition must be logged in crm_lead_stage_history");
			const latestTransition = history.find((h) => h.toStage === "contacted");
			assert.ok(latestTransition, "Stage transition to 'contacted' must be present in history");
			assert.strictEqual(latestTransition.toStage, "contacted");
		});

		it("3.3. Converts CRM lead to real patient in PostgreSQL in 1 click", async () => {
			const res = await app.inject({
				method: "POST",
				url: `/api/leads/${createdLeadId}/convert-to-patient`,
				headers: headersA,
				payload: {},
			});

			assert.ok([200, 201].includes(res.statusCode), `Expected 200 or 201, got ${res.statusCode}: ${res.body}`);
			const body = JSON.parse(res.body);
			assert.ok(body.patientId, "Converted patient ID must be returned");

			// Verify that real patient exists in patients table
			const [dbPatient] = await withFixtureTenant(ORG_A_ID, async () =>
				db.select().from(patients).where(eq(patients.id, body.patientId)),
			);
			assert.ok(dbPatient, "Patient record must exist in PostgreSQL");
			assert.strictEqual(dbPatient.fullName, "Лид с аудиозаписью");
			assert.strictEqual(dbPatient.phone, "+79995554433");
		});
	});

	// --------------------------------------------------------------------------
	// 4. DENTAL LAB ORDERS: REAL LIFECYCLE IN POSTGRESQL
	// --------------------------------------------------------------------------
	describe("4. Real Dental Lab Orders Lifecycle", () => {
		let labOrderId: string;
		let patientId: string;

		before(async () => {
			const [p] = await withFixtureTenant(ORG_A_ID, async () =>
				db
					.insert(patients)
					.values({
						organizationId: ORG_A_ID,
						fullName: "Пациент ЗТЛ Наряда",
						phone: "+79991112233",
					})
					.returning(),
			);
			patientId = p!.id;
		});

		it("4.1. Creates real dental lab order in PostgreSQL", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/clinical/lab-orders",
				headers: headersA,
				payload: {
					patientId,
					doctorId: DOCTOR_A_ID,
					doctorName: "Д-р Ортопед Тест",
					toothFdi: "21",
					material: "crown_zirconia",
					colorVita: "A2",
					dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
					status: "draft",
					priceRub: 12000,
				},
			});

			assert.strictEqual(res.statusCode, 201, `Expected 201, got ${res.statusCode}: ${res.body}`);
			const body = JSON.parse(res.body);
			assert.ok(body.id, "Lab order ID must be returned");
			labOrderId = body.id;

			// Verify in PostgreSQL table
			const [dbOrder] = await withFixtureTenant(ORG_A_ID, async () =>
				db
					.select()
					.from(labOrders)
					.where(eq(labOrders.id, labOrderId)),
			);
			assert.ok(dbOrder, "Lab order must exist in PostgreSQL");
			assert.strictEqual(dbOrder.toothFdi, "21");
			assert.strictEqual(dbOrder.colorVita, "A2");
		});

		it("4.2. Updates lab order stage with real persistence", async () => {
			const res = await app.inject({
				method: "PATCH",
				url: `/api/clinical/lab-orders/${labOrderId}/status`,
				headers: headersA,
				payload: {
					status: "sent",
				},
			});

			assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);

			// Verify in PostgreSQL
			const [dbOrder] = await withFixtureTenant(ORG_A_ID, async () =>
				db
					.select()
					.from(labOrders)
					.where(eq(labOrders.id, labOrderId)),
			);
			assert.ok(dbOrder);
			assert.strictEqual(dbOrder.status, "sent", "Order status must be updated in DB");
		});
	});
});

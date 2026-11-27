import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { tenantAlsStorage } from "../../db/client.js";
import { withTenantReadCtx } from "../../db/rls.js";
import {
	organizations,
	patients,
	toothStates,
	users,
	visits,
} from "../../db/schema.js";
import { registerAnesthesiaRoutes } from "../../routes/anesthesia/index.js";
import { registerClinicalImplantRoutes } from "../../routes/clinicalImplants/index.js";
import { registerClinicalRoutes } from "../../routes/clinicalRoutes/index.js";
import { registerConsentRoutes } from "../../routes/consents/index.js";
import registerDiaryRoutes from "../../routes/diary/index.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { registerLabRoutes } from "../../routes/lab/index.js";
import { registerOdontogramRoutes } from "../../routes/odontogram/index.js";
import { registerOrthodonticsRoutes } from "../../routes/orthodontics/index.js";
import { registerOutpatientRoutes } from "../../routes/outpatient.js";
import { registerPediatricRoutes } from "../../routes/pediatric/index.js";
import { registerPeriodontogramRoutes } from "../../routes/periodontogram/index.js";
import { registerPharmacologyRoutes } from "../../routes/pharmacology.js";
import { registerPrescriptionRoutes } from "../../routes/prescriptions.js";
import { registerSanpinRoutes } from "../../routes/sanpin.js";
import { registerSurgeryRoutes } from "../../routes/surgery/index.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { registerWarrantyRoutes } from "../../routes/warranty/index.js";
import { authTokenSecret, resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { invalidateStaffSessionCache } from "../../security/unifiedAuthPerimeter.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const ORG_A = crypto.randomUUID();
const ORG_B = crypto.randomUUID();
const DOCTOR_A = crypto.randomUUID();
const DOCTOR_B = crypto.randomUUID();
const PATIENT_A = crypto.randomUUID();
const PATIENT_B = crypto.randomUUID();
const VISIT_A = crypto.randomUUID();

describe("Wave 7 Clinical Domain Migration off Global onRoute RW Wrapper", () => {
	let app: FastifyInstance;
	let doctorAToken = "";
	let doctorARevokedToken = "";
	let doctorBToken = "";
	const routeSelfManagedFlags = new Map<string, boolean>();

	before(async () => {
		resetAuthSecretCacheForTests();
		invalidateStaffSessionCache();

		const activeSessionA = crypto.randomUUID();
		const activeSessionB = crypto.randomUUID();
		const revokedSessionA = crypto.randomUUID();

		await withFixtureTenant(ORG_A, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_A,
				name: "Стоматология Волна 7 А",
			});
			await tx.insert(users).values({
				id: DOCTOR_A,
				organizationId: ORG_A,
				fullName: "Врач Волна Семь А",
				role: "doctor",
				isActive: true,
				currentSessionId: activeSessionA,
			});
			await tx.insert(patients).values({
				id: PATIENT_A,
				organizationId: ORG_A,
				fullName: "Пациент Клинический А",
				birthDate: "1990-05-15",
			});
			await tx.insert(visits).values({
				id: VISIT_A,
				organizationId: ORG_A,
				patientId: PATIENT_A,
				status: "draft",
			});
		});

		await withFixtureTenant(ORG_B, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_B,
				name: "Стоматология Волна 7 Б",
			});
			await tx.insert(users).values({
				id: DOCTOR_B,
				organizationId: ORG_B,
				fullName: "Врач Волна Семь Б",
				role: "doctor",
				isActive: true,
				currentSessionId: activeSessionB,
			});
			await tx.insert(patients).values({
				id: PATIENT_B,
				organizationId: ORG_B,
				fullName: "Пациент Чужой Б",
				birthDate: "1988-09-20",
			});
		});

		const secret = authTokenSecret();
		doctorAToken = signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_A,
				role: "doctor",
				sessionId: activeSessionA,
			},
			secret,
			3600,
		);
		doctorARevokedToken = signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_A,
				role: "doctor",
				sessionId: revokedSessionA,
			},
			secret,
			3600,
		);
		doctorBToken = signToken(
			{
				organizationId: ORG_B,
				userId: DOCTOR_B,
				role: "doctor",
				sessionId: activeSessionB,
			},
			secret,
			3600,
		);

		app = Fastify({ logger: false });
		app.addHook("onRoute", (routeOptions) => {
			if (routeOptions.url.startsWith("/api/")) {
				routeSelfManagedFlags.set(
					`${String(routeOptions.method)} ${routeOptions.url}`,
					routeOptions.config?.tenantTxSelfManaged === true,
				);
			}
		});

		await registerAnesthesiaRoutes(app);
		await registerClinicalImplantRoutes(app);
		await registerClinicalRoutes(app);
		await registerConsentRoutes(app);
		await registerDiaryRoutes(app);
		await registerOdontogramRoutes(app);
		await registerPeriodontogramRoutes(app);
		await registerWarrantyRoutes(app, {});
		await registerDocumentRoutes(app);
		await registerSanpinRoutes(app);
		await registerVisitRoutes(app);
		await registerLabRoutes(app);
		registerPediatricRoutes(app);
		await registerOrthodonticsRoutes(app);
		await registerSurgeryRoutes(app);
		await registerOutpatientRoutes(app);
		await registerPrescriptionRoutes(app);
		await registerPharmacologyRoutes(app);

		await app.ready();
	});

	after(async () => {
		invalidateStaffSessionCache();
		await app.close();
		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (err) {
			void err;
		}
	});

	test("all registered routes across 18 clinical domains declare tenantTxSelfManaged: true", () => {
		assert.ok(
			routeSelfManagedFlags.size >= 140,
			`Expected >= 140 clinical routes, got ${routeSelfManagedFlags.size}`,
		);
		const legacyRoutes: string[] = [];
		for (const [routeKey, selfManaged] of routeSelfManagedFlags.entries()) {
			if (!selfManaged) {
				legacyRoutes.push(routeKey);
			}
		}
		assert.deepEqual(
			legacyRoutes,
			[],
			`Clinical routes still relying on legacy global onRoute wrapper: ${legacyRoutes.join(", ")}`,
		);
	});

	test("P0 regression: POST /api/patients/:patientId/tooth-states/batch accepts optional patientId and toothNumber without 400 and persists in PG18", async () => {
		const resBatchWithBoth = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_A}/tooth-states/batch`,
			headers: {
				[STAFF_TOKEN_HEADER]: doctorAToken,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: {
				patientId: PATIENT_A,
				toothNumber: 16,
				toothNumbers: [16, 17],
				state: "Caries",
				surfaces: ["O"],
			},
		});
		assert.equal(
			resBatchWithBoth.statusCode,
			200,
			`Expected 200 for batch odontogram save with patientId+toothNumber, got ${resBatchWithBoth.statusCode}: ${resBatchWithBoth.body}`,
		);
		const bodyBoth = resBatchWithBoth.json() as { success?: boolean; states?: unknown[] };
		assert.equal(bodyBoth.success, true);
		assert.equal(bodyBoth.states?.length, 2);

		const resSingleToothOnly = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_A}/tooth-states/batch`,
			headers: {
				[STAFF_TOKEN_HEADER]: doctorAToken,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: {
				patientId: PATIENT_A,
				toothNumber: 26,
				state: "Caries",
			},
		});
		assert.equal(
			resSingleToothOnly.statusCode,
			200,
			`Expected 200 for batch odontogram save with single toothNumber, got ${resSingleToothOnly.statusCode}: ${resSingleToothOnly.body}`,
		);

		const resInvalidTooth = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_A}/tooth-states/batch`,
			headers: {
				[STAFF_TOKEN_HEADER]: doctorAToken,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: {
				toothNumbers: [99],
				state: "Caries",
			},
		});
		assert.equal(resInvalidTooth.statusCode, 400);

		const persistedRows = await withTenantReadCtx(ORG_A, (tx) =>
			tx
				.select({ toothNumber: toothStates.toothNumber, state: toothStates.state })
				.from(toothStates)
				.where(eq(toothStates.patientId, PATIENT_A)),
		);
		const savedTeeth = persistedRows.map((r) => r.toothNumber).sort((a, b) => a - b);
		assert.ok(savedTeeth.includes(16) && savedTeeth.includes(17) && savedTeeth.includes(26));
	});

	test("clinical GET endpoints execute in READ ONLY mode without XID and enforce FORCE RLS cross-tenant isolation", async () => {
		const readStats = await withTenantReadCtx(ORG_A, async (tx) => {
			const res = await tx.execute(
				sql`SELECT current_setting('transaction_read_only') AS ro, txid_current_if_assigned() AS xid`,
			);
			return res.rows[0] as { ro?: string; xid?: unknown } | undefined;
		});
		assert.equal(readStats?.ro, "on");
		assert.equal(readStats?.xid, null);

		const clinicalReadUrls = [
			`/api/patients/${PATIENT_A}/tooth-states`,
			`/api/anesthesia/patients/${PATIENT_A}/logs`,
			`/api/periodontogram/patients/${PATIENT_A}/snapshots`,
			`/api/patients/${PATIENT_A}/consents`,
			`/api/diaries/visit/${VISIT_A}`,
			"/api/clinical/lab-orders",
			"/api/registers/sanpin",
			"/api/registers/summary",
			`/api/clinical/implants/patient/${PATIENT_A}`,
			"/api/surgery/protocols/templates",
			"/api/clinical/nomenclature",
			"/api/outpatient/templates",
			"/api/prescriptions",
			"/api/pharmacology/catalog",
			`/api/patients/${PATIENT_A}/pediatric/indices`,
			`/api/warranty/patient/${PATIENT_A}`,
		];

		for (const url of clinicalReadUrls) {
			const res = await app.inject({
				method: "GET",
				url,
				headers: { [STAFF_TOKEN_HEADER]: doctorAToken },
			});
			assert.equal(
				res.statusCode,
				200,
				`Expected 200 on ${url}, got ${res.statusCode}: ${res.body}`,
			);
		}
		assert.equal(tenantAlsStorage.getStore(), undefined);

		const crossTenantToothRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_A}/tooth-states`,
			headers: { [STAFF_TOKEN_HEADER]: doctorBToken },
		});
		assert.ok(
			crossTenantToothRes.statusCode === 404 ||
				(crossTenantToothRes.statusCode === 200 &&
					JSON.stringify(crossTenantToothRes.json()).includes('"states":[]')),
			`Expected cross-tenant isolation on tooth-states, got ${crossTenantToothRes.statusCode}: ${crossTenantToothRes.body}`,
		);

		const crossTenantAnesthesiaRes = await app.inject({
			method: "GET",
			url: `/api/anesthesia/patients/${PATIENT_A}/logs`,
			headers: { [STAFF_TOKEN_HEADER]: doctorBToken },
		});
		assert.equal(crossTenantAnesthesiaRes.statusCode, 200);
		const anesthesiaPayload = crossTenantAnesthesiaRes.json() as { logs?: unknown[]; data?: unknown[] };
		const leakedLogs = anesthesiaPayload.logs ?? anesthesiaPayload.data ?? [];
		assert.equal(leakedLogs.length, 0);
	});

	test("revoked staff sessionId returns 401 across migrated clinical routes", async () => {
		const guardedUrls = [
			"/api/clinical/lab-orders",
			"/api/registers/sanpin",
			`/api/patients/${PATIENT_A}/tooth-states`,
		];
		for (const url of guardedUrls) {
			const res = await app.inject({
				method: "GET",
				url,
				headers: { [STAFF_TOKEN_HEADER]: doctorARevokedToken },
			});
			assert.equal(
				res.statusCode,
				401,
				`Expected 401 for revoked session on ${url}, got ${res.statusCode}: ${res.body}`,
			);
		}
	});

	test("public lab portal route and document HTML render avoid unscoped DB errors and release PG TX before render", async () => {
		const portalRes = await app.inject({
			method: "GET",
			url: "/api/portal/lab-order/nonexistent-wave7-token",
		});
		assert.equal(
			portalRes.statusCode,
			404,
			`Expected clean 404 OrderNotFound (no UNSCOPED_DB_ACCESS 500), got ${portalRes.statusCode}: ${portalRes.body}`,
		);

		const createDocRes = await app.inject({
			method: "POST",
			url: "/api/documents",
			headers: {
				[STAFF_TOKEN_HEADER]: doctorAToken,
				"idempotency-key": crypto.randomUUID(),
			},
			payload: {
				patientId: PATIENT_A,
				visitId: VISIT_A,
				kind: "informed_consent",
			},
		});
		assert.ok(
			createDocRes.statusCode === 200 || createDocRes.statusCode === 201,
			`Expected 200/201 creating clinical document, got ${createDocRes.statusCode}: ${createDocRes.body}`,
		);
		const createdDocBody = createDocRes.json() as {
			id?: string;
			document?: { id?: string };
			data?: { id?: string };
		};
		const docId =
			createdDocBody.id ??
			createdDocBody.document?.id ??
			createdDocBody.data?.id;
		assert.ok(docId, `Expected created document id in response: ${createDocRes.body}`);

		const docHtmlRes = await app.inject({
			method: "GET",
			url: `/api/documents/${docId}/html`,
			headers: { [STAFF_TOKEN_HEADER]: doctorAToken },
		});
		assert.equal(
			docHtmlRes.statusCode,
			200,
			`Expected 200 HTML render for clinical document, got ${docHtmlRes.statusCode}: ${docHtmlRes.body}`,
		);
		assert.ok(docHtmlRes.headers["content-type"]?.includes("text/html"));
		assert.equal(tenantAlsStorage.getStore(), undefined);
	});
});

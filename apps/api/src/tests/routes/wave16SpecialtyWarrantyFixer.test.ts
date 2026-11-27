import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { generateUuidV7 } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	clinicalAuditLogs,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	organizations,
	patientImplantInstallations,
	patientInvoices,
	patientReclamations,
	patients,
	periodontogramSnapshots,
	toothStateHistory,
	toothStates,
	treatmentItems,
	users,
	visits,
	warrantyCertificates,
} from "../../db/schema.js";
import { idempotencyPlugin } from "../../plugins/idempotencyPlugin.js";
import { registerClinicalImplantRoutes } from "../../routes/clinicalImplants/index.js";
import { registerDentalLabRoutes } from "../../routes/lab/index.js";
import { createLabOrderSchema } from "../../routes/lab/labTypesModules/labMaterialAndShadeTypes.js";
import { labOrderPatchSchema } from "../../routes/lab/patchModules/labOrderPatchSchema.js";
import { registerPatientReclamationRoutes } from "../../routes/patients/reclamationRoutes.js";
import { registerPeriodontogramRoutes } from "../../routes/periodontogram/index.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { registerWarrantyRoutes } from "../../routes/warranty/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { fetchPatientLatestPeriodontogram, upsertPatientFullPeriodontogram } from "../../services/periodontogramService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "wave16SpecialtyWarrantyFixer";
const ORG_A = fixtureUuid(FIXTURE, 1);
const ORG_B = fixtureUuid(FIXTURE, 2);
const DOCTOR_A = fixtureUuid(FIXTURE, 10);
const DOCTOR_B = fixtureUuid(FIXTURE, 11);
const PATIENT_A = fixtureUuid(FIXTURE, 20);
const PATIENT_B = fixtureUuid(FIXTURE, 21);
const PATIENT_EMPTY_IMPLANTS = fixtureUuid(FIXTURE, 22);
const VISIT_A = fixtureUuid(FIXTURE, 30);
const LAB_ORDER_A = fixtureUuid(FIXTURE, 40);
const INVENTORY_IMPLANT_ID = fixtureUuid(FIXTURE, 50);

describe("Wave 16 Pediatric, Warranty, Orthopedics, Perio & Implants Fixer Verification", () => {
	let app: FastifyInstance;
	let tokenDoctorA = "";
	let tokenDoctorB = "";
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_A, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
			} else {
				throw err;
			}
		}

		const secret = authTokenSecret();
		tokenDoctorA = signToken(
			{
				userId: DOCTOR_A,
				email: "w16_doc_a@test.local",
				role: "doctor",
				organizationId: ORG_A,
				isStaff: true,
			},
			secret,
			3600,
		);
		tokenDoctorB = signToken(
			{
				userId: DOCTOR_B,
				email: "w16_doc_b@test.local",
				role: "doctor",
				organizationId: ORG_B,
				isStaff: true,
			},
			secret,
			3600,
		);

		if (dbAvailable) {
			for (const [orgId, docId, docEmail, patIds] of [
				[ORG_A, DOCTOR_A, "w16_doc_a@test.local", [PATIENT_A, PATIENT_EMPTY_IMPLANTS]],
				[ORG_B, DOCTOR_B, "w16_doc_b@test.local", [PATIENT_B]],
			] as const) {
				await withFixtureTenant(orgId, async (tx) => {
					await tx.delete(patientReclamations).where(eq(patientReclamations.organizationId, orgId));
					await tx.delete(warrantyCertificates).where(eq(warrantyCertificates.organizationId, orgId));
					await tx.delete(labOrders).where(eq(labOrders.organizationId, orgId));
					await tx.delete(patientImplantInstallations).where(eq(patientImplantInstallations.organizationId, orgId));
					await tx.delete(inventoryTransactions).where(eq(inventoryTransactions.organizationId, orgId));
					await tx.delete(inventoryItems).where(eq(inventoryItems.organizationId, orgId));
					await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, orgId));
					await tx.delete(toothStateHistory).where(eq(toothStateHistory.organizationId, orgId));
					await tx.delete(toothStates).where(eq(toothStates.organizationId, orgId));
					await tx.delete(periodontogramSnapshots).where(eq(periodontogramSnapshots.organizationId, orgId));
					await tx.delete(visits).where(eq(visits.organizationId, orgId));
					await tx.delete(patientInvoices).where(eq(patientInvoices.organizationId, orgId));
					await tx.execute(sql`delete from patient_recalls where organization_id = ${orgId}`);

					await tx
						.insert(organizations)
						.values({
							id: orgId,
							name: `Клиника Wave16 ${orgId.slice(0, 6)}`,
							email: `org_${orgId.slice(0, 6)}@test.local`,
						})
						.onConflictDoNothing();

					await tx
						.insert(users)
						.values({
							id: docId,
							organizationId: orgId,
							email: docEmail,
							fullName: "Д-р Смирнов В.А.",
							role: "doctor",
							isActive: true,
						})
						.onConflictDoNothing();

					for (const patId of patIds) {
						await tx
							.insert(patients)
							.values({
								id: patId,
								organizationId: orgId,
								fullName: `Пациент Wave16 ${patId.slice(0, 4)}`,
								birthDate: "1990-05-15",
							})
							.onConflictDoNothing();
					}
				});
			}

			await withFixtureTenant(ORG_A, async (tx) => {
				await tx.insert(visits).values({
					id: VISIT_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					status: "draft",
				});

				await tx.insert(labOrders).values({
					id: LAB_ORDER_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					doctorId: DOCTOR_A,
					orderNumber: "ЗТЛ-2026-W16",
					secureToken: `sec-${LAB_ORDER_A}`,
					toothFdi: "16",
					material: "ZrO2 Multi-Layer",
					colorVita: "A2",
					status: "completed",
					isLockedInstalled: true,
					completedAt: new Date(),
				});

				await tx.insert(inventoryItems).values({
					id: INVENTORY_IMPLANT_ID,
					organizationId: ORG_A,
					name: "Имплантат Straumann BLX Ø4.0 L10",
					sku: "BLX-4010",
					category: "implant_screw",
					stockQuantity: "10.000",
					pricePerUnitKopecks: 2200000n,
					unitCostKopecks: 2200000n,
					lotNumber: "LOT-W16-01",
					expirationDate: "2029-12-31",
					unit: "шт",
				});
			});
		}

		if (dbAvailable) {
			app = createTenantTestApp();
			await app.register(idempotencyPlugin);
			await registerDentalLabRoutes(app);
			await app.register(registerWarrantyRoutes);
			registerPatientReclamationRoutes(app);
			await registerPeriodontogramRoutes(app);
			await registerVisitRoutes(app);
			await registerClinicalImplantRoutes(app);
			await app.ready();
		} else {
			app = Fastify({ logger: false });
			await app.register(registerWarrantyRoutes);
			registerPatientReclamationRoutes(app);
			await app.ready();
		}
	});

	after(async () => {
		if (app) await app.close();
	});

	it("W16-SPEC-01: createLabOrderSchema & labOrderPatchSchema reject createdAt/teeth/techStage and accept canonical orthopedics payload", () => {
		const canonicalPayload = {
			teethFdi: "16, 17",
			jawScope: "upper",
			construction: "crown_zirconia",
			constructionType: "crown_zirconia",
			material: "ZrO2 Multi-Layer",
			colorVita: "A2",
			stumpShade: "ND2",
			preparationMargin: "chamfer",
			fixationType: "cement",
			hasAntagonists: true,
			articulatorType: "bio_art",
			hasFacebow: false,
			laboratoryName: "Арт-Дент Лаб",
			dueDate: "2026-12-10",
			patientId: PATIENT_A,
			patientName: "Пациент Wave16",
			priceRub: 24000,
			priceKopecks: 2400000,
			patientPriceKopecks: 2400000,
			amountKopecks: 2400000,
			costRub: 7500,
			labCostKopecks: 750000,
			isWarrantyRework: false,
			isWarranty: false,
		};
		assert.equal(createLabOrderSchema.safeParse(canonicalPayload).success, true);
		assert.equal(
			createLabOrderSchema.safeParse({ ...canonicalPayload, createdAt: new Date().toISOString() }).success,
			false,
		);
		assert.equal(
			createLabOrderSchema.safeParse({ ...canonicalPayload, teeth: ["16"] }).success,
			false,
		);

		assert.equal(labOrderPatchSchema.safeParse({ stage: "fitting_ready" }).success, true);
		assert.equal(
			labOrderPatchSchema.safeParse({ stage: "fitting_ready", techStage: "Примерка" }).success,
			false,
		);
	});

	it("W16-SPEC-02: POST /api/patients/:id/reclamations rejects WAR- string in warrantyCertificateId and resolves certificateNumber", async () => {
		const badRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_A}/reclamations`,
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
			},
			payload: {
				complicationDetails: "Скол края реставрации 1.6",
				doctorId: DOCTOR_A,
				warrantyCertificateId: "WAR-2026-00001",
			},
		});
		assert.equal(badRes.statusCode, 400);

		const certNumber = `WAR-2026-W16-${PATIENT_A.slice(0, 6)}`;
		if (dbAvailable) {
			const createCertRes = await app.inject({
				method: "POST",
				url: "/api/warranty/certificates",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": tokenDoctorA,
					"x-dente-staff-token": tokenDoctorA,
					"Idempotency-Key": generateUuidV7(),
				},
				payload: {
					patientId: PATIENT_A,
					certificateNumber: certNumber,
					status: "active",
					items: [{ toothNumber: "1.6", clinicalWorkTitle: "Коронка ZrO2" }],
					warrantyMonths: 24,
					serviceLifeMonths: 120,
					integritySha256: "a".repeat(64),
				},
			});
			assert.equal(createCertRes.statusCode, 201);
			const certJson = createCertRes.json<{ certificate?: { id: string } }>();
			const createdCertUuid = certJson.certificate?.id;
			assert.ok(createdCertUuid);

			const reclRes = await app.inject({
				method: "POST",
				url: `/api/patients/${PATIENT_A}/reclamations`,
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": tokenDoctorA,
					"x-dente-staff-token": tokenDoctorA,
					"Idempotency-Key": generateUuidV7(),
				},
				payload: {
					complicationDetails: "Скол керамической облицовки зуба 1.6",
					proposedAction: "Гарантийная переделка (0 ₽)",
					doctorId: DOCTOR_A,
					toothNumber: 16,
					warrantyCertificateId: null,
					certificateNumber: certNumber,
					defectType: "ceramic_chip",
				},
			});
			assert.equal(reclRes.statusCode, 201);
			const reclJson = reclRes.json<{ warrantyCertificateId?: string | null }>();
			assert.equal(reclJson.warrantyCertificateId, createdCertUuid);
		}
	});

	it("W16-SPEC-04: warranty passport generation runs in single TX and respects orgId setWhere on conflict", async (t) => {
		if (!dbAvailable) return t.skip();

		const passportRes = await app.inject({
			method: "GET",
			url: `/api/lab/orders/${LAB_ORDER_A}/warranty-passport`,
			headers: {
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
			},
		});
		assert.equal(passportRes.statusCode, 200);
		const passportJson = passportRes.json<{
			success: boolean;
			hasCertificate: boolean;
			certificateNumber: string;
			certificateId: string | null;
		}>();
		assert.equal(passportJson.success, true);
		assert.equal(passportJson.hasCertificate, true);
		assert.ok(passportJson.certificateId);

		const sharedCertNumber = `WAR-SHARED-${FIXTURE.slice(0, 6)}`;
		const certARes = await app.inject({
			method: "POST",
			url: "/api/warranty/certificates",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				patientId: PATIENT_A,
				certificateNumber: sharedCertNumber,
				status: "active",
				items: [{ toothNumber: "2.1", clinicalWorkTitle: "Винир E.max" }],
				warrantyMonths: 24,
				serviceLifeMonths: 120,
				integritySha256: "b".repeat(64),
			},
		});
		assert.equal(certARes.statusCode, 201);

		const certBRes = await app.inject({
			method: "POST",
			url: "/api/warranty/certificates",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": tokenDoctorB,
				"x-dente-staff-token": tokenDoctorB,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				patientId: PATIENT_B,
				certificateNumber: sharedCertNumber,
				status: "voided",
				items: [{ toothNumber: "1.1", clinicalWorkTitle: "Чужая запись" }],
				warrantyMonths: 12,
				serviceLifeMonths: 60,
				integritySha256: "c".repeat(64),
			},
		});
		assert.notEqual(certBRes.statusCode, 500);

		const [rowInOrgA] = await withFixtureTenant(ORG_A, (tx) =>
			tx
				.select()
				.from(warrantyCertificates)
				.where(
					and(
						eq(warrantyCertificates.organizationId, ORG_A),
						eq(warrantyCertificates.certificateNumber, sharedCertNumber),
					),
				)
				.limit(1),
		);
		assert.ok(rowInOrgA);
		assert.equal(rowInOrgA.status, "active", "Foreign org upsert must NOT overwrite Org A certificate");
	});

	it("W16-SPEC-05: visitPerioRoutes and periodontogram services reuse outer tx without nested withTenantCtx", async (t) => {
		if (!dbAvailable) return t.skip();

		const savedInsideOuterTx = await withFixtureTenant(ORG_A, async (tx) => {
			const snap = await upsertPatientFullPeriodontogram({
				orgId: ORG_A,
				patientId: PATIENT_A,
				visitId: VISIT_A,
				recordedByUserId: DOCTOR_A,
				teeth: [{ toothNumber: 16, isPresent: true, mobility: 1 }],
				sites: [{ toothNumber: 16, siteCode: "MV", probingDepthMm: 3, bleedingOnProbing: true }],
				notes: "Tx propagation check",
				status: "draft",
				tx,
			});
			const fetched = await fetchPatientLatestPeriodontogram(ORG_A, PATIENT_A, tx);
			return { snap, fetched };
		});
		assert.ok(savedInsideOuterTx.snap.id);
		assert.equal(savedInsideOuterTx.fetched?.id, savedInsideOuterTx.snap.id);

		const getRes = await app.inject({
			method: "GET",
			url: `/api/visits/${VISIT_A}/perio`,
			headers: {
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
			},
		});
		assert.equal(getRes.statusCode, 200);

		const postRes = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_A}/perio`,
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				notes: "Updated via route tx",
				teeth: [{ toothNumber: 26, isPresent: true, mobility: 0 }],
			},
		});
		assert.equal(postRes.statusCode, 200);
	});

	it("W16-SPEC-06: batch implant installation creates 1 consolidated invoice and empty implant passport GET writes audit", async (t) => {
		if (!dbAvailable) return t.skip();

		const batchRes = await app.inject({
			method: "POST",
			url: "/api/clinical/implants/installations/batch",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				patientId: PATIENT_A,
				teeth: [36, 46],
				toothNumberFdi: 36,
				implantBrand: "straumann",
				inventoryItemId: INVENTORY_IMPLANT_ID,
				implantDiameterMm: 4.0,
				implantLengthMm: 10.0,
				catalogArticle: "BLX-4010",
				lotNumber: "LOT-W16-01",
				serialNumber: "SN-W16-BATCH",
				connectionType: "conical_connection",
				boneDensityClass: "D2",
				finalInsertionTorqueNcm: 40,
				operationPriceKopecks: 4500000,
			},
		});
		assert.equal(batchRes.statusCode, 201, batchRes.body);
		const batchJson = batchRes.json<{ count: number }>();
		assert.equal(batchJson.count, 2);

		const invoices = await withFixtureTenant(ORG_A, (tx) =>
			tx
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.organizationId, ORG_A),
						eq(patientInvoices.patientId, PATIENT_A),
					),
				),
		);
		assert.equal(invoices.length, 1, "Batch installation without visitId/invoiceId must create exactly 1 invoice");
		assert.equal(invoices[0]?.totalPriceKopecks, 9000000n, "Consolidated invoice must sum both implants (45000 + 45000 RUB)");

		const auditsBefore = await withFixtureTenant(ORG_A, (tx) =>
			tx
				.select()
				.from(clinicalAuditLogs)
				.where(
					and(
						eq(clinicalAuditLogs.organizationId, ORG_A),
						eq(clinicalAuditLogs.patientId, PATIENT_EMPTY_IMPLANTS),
						eq(clinicalAuditLogs.action, "VIEW_IMPLANT_PASSPORT"),
					),
				),
		);

		const emptyGetRes = await app.inject({
			method: "GET",
			url: `/api/clinical/implants/patient/${PATIENT_EMPTY_IMPLANTS}`,
			headers: {
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
			},
		});
		assert.equal(emptyGetRes.statusCode, 200);
		const emptyGetJson = emptyGetRes.json<{ installations: unknown[] }>();
		assert.equal(emptyGetJson.installations.length, 0);

		const auditsAfter = await withFixtureTenant(ORG_A, (tx) =>
			tx
				.select()
				.from(clinicalAuditLogs)
				.where(
					and(
						eq(clinicalAuditLogs.organizationId, ORG_A),
						eq(clinicalAuditLogs.patientId, PATIENT_EMPTY_IMPLANTS),
						eq(clinicalAuditLogs.action, "VIEW_IMPLANT_PASSPORT"),
					),
				),
		);
		assert.equal(
			auditsAfter.length,
			auditsBefore.length + 1,
			"VIEW_IMPLANT_PASSPORT audit must be written even when installations.length === 0",
		);
	});
});

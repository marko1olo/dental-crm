/**
 * localLanHardwareResilience.test.ts — Statutory & Resilience Verification Suite for Local Hardware & LAN Integration.
 *
 * Covers:
 * 1. Local Fiscalization Buffer 54-FZ & KKT:
 *    - Direct TCP/IP LAN connect to ATOL / Shtrikh-M registers in clinic subnet (192.168.x.x)
 *    - Hardware offline / out-of-paper detection with non-blocking queue buffering (hardware_offline)
 *    - Automated background retry worker when KKT comes back online
 * 2. Local Radiology & PACS/DICOM:
 *    - Local storage of multi-gigabyte CBCT / Visiograph scans on clinic workstation (local_offline_available)
 *    - Zero-wait consultation start: doctor begins appointment immediately without waiting for cloud upload
 *    - Asynchronous background cloud sync queue (local_only -> sync_queued)
 * 3. Local Telephony:
 *    - WebRTC SIP registration credentials for local Asterisk / FreePBX
 *    - Asterisk AMI / ARI event processing with WebSocket broadcast
 *    - Transparent failover to Cloud Webhooks (Mango / Zadarma / UIS)
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	fiscalReceiptQueue,
	imagingStudies,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { registerImagingRoutes } from "../../routes/imaging.js";
import { telephonyRoutes } from "../../routes/telephony.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { LocalPacsStorageService } from "../../services/imaging/localPacsStorageService.js";
import {
	FiscalQueueRetryWorker,
	LanKktDriverService,
} from "../../services/kkt/lanKktDriverService.js";
import { TelephonyGatewayService } from "../../services/telephony/telephonyGatewayService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "lanHardwareTest";
const ORG_A_ID = fixtureUuid(NAMESPACE, 1);
const ORG_B_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_A_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_B_ID = fixtureUuid(NAMESPACE, 20);
const USER_A_ID = fixtureUuid(NAMESPACE, 30);
const USER_B_ID = fixtureUuid(NAMESPACE, 40);

describe("Local LAN Hardware Integration & Resilience (54-FZ KKT, PACS/DICOM, WebRTC SIP)", () => {
	let app: FastifyInstance;
	let clinicTokenA: string;
	let staffTokenA: string;
	let clinicTokenB: string;
	let staffTokenB: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.TELEPHONY_WEBHOOK_SECRET = "test-webhook-secret-xyz";

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerFiscalReceiptRoutes(app);
		await registerImagingRoutes(app);
		await app.register(telephonyRoutes, { prefix: "/api/telephony" });
		await app.ready();

		clinicTokenA = signToken({ organizationId: ORG_A_ID }, authTokenSecret());
		staffTokenA = signToken(
			{ organizationId: ORG_A_ID, userId: USER_A_ID, role: "admin" },
			authTokenSecret(),
		);

		clinicTokenB = signToken({ organizationId: ORG_B_ID }, authTokenSecret());
		staffTokenB = signToken(
			{ organizationId: ORG_B_ID, userId: USER_B_ID, role: "admin" },
			authTokenSecret(),
		);

		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);

		// Seed Org A
		await withFixtureTenant(ORG_A_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_A_ID,
				name: "Стоматология ДЕНТЕ Локальная",
				inn: "7701999888",
			});
			await db.insert(users).values({
				id: USER_A_ID,
				organizationId: ORG_A_ID,
				fullName: "Администратор Клиники А",
				role: "admin",
				isActive: true,
			});
			await db.insert(patients).values({
				id: PATIENT_A_ID,
				organizationId: ORG_A_ID,
				fullName: "Смирнов Алексей Владимирович",
				phone: "+79261234567",
			});
		});

		// Seed Org B
		await withFixtureTenant(ORG_B_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_B_ID,
				name: "Стоматология Ортодент",
				inn: "7702999888",
			});
			await db.insert(users).values({
				id: USER_B_ID,
				organizationId: ORG_B_ID,
				fullName: "Администратор Клиники Б",
				role: "admin",
				isActive: true,
			});
			await db.insert(patients).values({
				id: PATIENT_B_ID,
				organizationId: ORG_B_ID,
				fullName: "Кузнецова Ольга Павловна",
				phone: "+79267654321",
			});
		});
	});

	after(async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;
		delete process.env.KKM_OUT_OF_PAPER;
		delete process.env.PBX_FORCE_OFFLINE;
		FiscalQueueRetryWorker.stopAutoRetryLoop();
		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		await app.close();
	});

	// =========================================================================
	// 1. LOCAL FISCALIZATION 54-FZ & LAN KKT BUFFER
	// =========================================================================

	it("1.1 GET /api/fiscal/devices/status returns live status and paper check of LAN KKT register", async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_OUT_OF_PAPER;

		const response = await app.inject({
			method: "GET",
			url: "/api/fiscal/devices/status",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.status.online, true);
		assert.equal(json.status.paperOk, true);
		assert.ok(json.status.modelName);
		assert.ok(json.status.fnSerial);
	});

	it("1.2 POST /api/fiscal/devices/test-connection performs socket ping in clinic LAN", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/fiscal/devices/test-connection",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: {
				host: "127.0.0.1",
				port: 16732,
				timeoutMs: 1000,
			},
		});

		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.equal(json.host, "127.0.0.1");
		assert.equal(json.port, 16732);
		assert.ok(typeof json.latencyMs === "number");
	});

	it("1.3 Out-of-paper or offline register gracefully buffers receipt into fiscal_receipt_queue without blocking checkout", async () => {
		process.env.KKM_OUT_OF_PAPER = "1";

		const response = await app.inject({
			method: "POST",
			url: "/api/fiscal/receipts",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: {
				patientId: PATIENT_A_ID,
				operationType: "income",
				customerContact: "+79261234567",
				cashierFullName: "Администратор Клиники А",
				totalKopecks: 250000,
				cashKopecks: 250000,
				items: [
					{
						name: "Профессиональная гигиена полости рта",
						priceKopecks: 250000,
						quantity: 1,
						amountKopecks: 250000,
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
					},
				],
			},
		});

		assert.equal(response.statusCode, 201);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.status, "hardware_offline");
		assert.ok(json.queueId);
		assert.ok(json.hardwareWarning);

		// Check database row
		const [queueRow] = await withFixtureTenant(ORG_A_ID, async () => {
			return await db
				.select()
				.from(fiscalReceiptQueue)
				.where(and(eq(fiscalReceiptQueue.id, json.queueId), eq(fiscalReceiptQueue.organizationId, ORG_A_ID)));
		});
		assert.ok(queueRow);
		assert.equal(queueRow.status, "hardware_offline");
		assert.equal(queueRow.retryCount, 1);
		assert.match(queueRow.lastError || "", /лента|paper|offline/i);
	});

	it("1.4 POST /api/fiscal/queue/:id/retry transitions receipt to printed when paper replaced and KKT back online", async () => {
		// Replace paper / restore online KKT
		delete process.env.KKM_OUT_OF_PAPER;
		delete process.env.KKM_FORCE_OFFLINE;

		// Get offline item
		const queueRes = await app.inject({
			method: "GET",
			url: "/api/fiscal/queue?status=hardware_offline",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});
		assert.equal(queueRes.statusCode, 200);
		const items = queueRes.json().items;
		assert.ok(items.length >= 1);
		const offlineItem = items[0];

		const retryRes = await app.inject({
			method: "POST",
			url: `/api/fiscal/queue/${offlineItem.id}/retry`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(retryRes.statusCode, 200);
		const retryJson = retryRes.json();
		assert.equal(retryJson.success, true);
		assert.equal(retryJson.status, "printed");
		assert.ok(retryJson.item?.printedAt);
	});

	it("1.5 POST /api/fiscal/queue/auto-retry/start & stop controls background auto-retry lifecycle", async () => {
		const startRes = await app.inject({
			method: "POST",
			url: "/api/fiscal/queue/auto-retry/start",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});
		assert.equal(startRes.statusCode, 200);
		assert.equal(startRes.json().success, true);

		const stopRes = await app.inject({
			method: "POST",
			url: "/api/fiscal/queue/auto-retry/stop",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});
		assert.equal(stopRes.statusCode, 200);
		assert.equal(stopRes.json().success, true);
	});

	// =========================================================================
	// 2. LOCAL RADIOLOGY & PACS/DICOM OFFLINE AVAILABILITY
	// =========================================================================

	it("2.1 POST /api/imaging/local-offline/register registers multi-gigabyte CBCT scan with local_offline_available: true", async () => {
		const localDicomPath = "C:\\RadiologyData\\Scans\\2026-08\\study-cbct-patientA.dcm";

		const response = await app.inject({
			method: "POST",
			url: "/api/imaging/local-offline/register",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: {
				patientId: PATIENT_A_ID,
				kind: "cbct",
				title: "КЛКТ верхней и нижней челюсти 3D",
				localFilePath: localDicomPath,
				fileSizeBytes: 1024 * 1024 * 750, // 750 MB volume
				dicomStudyUid: "1.2.643.5.1.13.1.20260822.9812401",
				dicomSeriesUid: "1.2.643.5.1.13.1.20260822.9812401.1",
				region: "MAXILLA_MANDIBLE",
				localThumbnailDataUri: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
			},
		});

		assert.equal(response.statusCode, 201);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.localOfflineAvailable, true);
		assert.equal(json.canStartConsultationImmediately, true);
		assert.equal(json.cloudSyncStatus, "local_only");
		assert.ok(json.studyId);
		assert.equal(json.diagnostics.fileSizeMb, 750);
		assert.equal(json.diagnostics.isMultiGigabyteScan, true);

		// Verify study in DB is immediately available
		const [study] = await withFixtureTenant(ORG_A_ID, async () => {
			return await db
				.select()
				.from(imagingStudies)
				.where(and(eq(imagingStudies.id, json.studyId), eq(imagingStudies.organizationId, ORG_A_ID)));
		});
		assert.ok(study);
		assert.equal(study.status, "available");
		assert.equal(study.storagePath, localDicomPath);
	});

	it("2.2 GET /api/imaging/local-offline/studies/:id provides immediate consultation access without cloud latency", async () => {
		const listRes = await withFixtureTenant(ORG_A_ID, async () => {
			return await db
				.select({ id: imagingStudies.id })
				.from(imagingStudies)
				.where(eq(imagingStudies.organizationId, ORG_A_ID))
				.limit(1);
		});
		assert.ok(listRes[0]);
		const studyId = listRes[0].id;

		const response = await app.inject({
			method: "GET",
			url: `/api/imaging/local-offline/studies/${studyId}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.study.localOfflineAvailable, true);
		assert.equal(json.study.canStartConsultationImmediately, true);
		assert.ok(json.study.localFilePath);
	});

	it("2.3 POST /api/imaging/local-offline/sync-queue enqueues background cloud sync without blocking UI", async () => {
		const listRes = await withFixtureTenant(ORG_A_ID, async () => {
			return await db
				.select({ id: imagingStudies.id })
				.from(imagingStudies)
				.where(eq(imagingStudies.organizationId, ORG_A_ID))
				.limit(1);
		});
		const studyId = listRes[0]!.id;

		const response = await app.inject({
			method: "POST",
			url: "/api/imaging/local-offline/sync-queue",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: { studyId },
		});

		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.equal(json.queued, true);
		assert.equal(json.syncStatus, "sync_queued");

		// Check sync status route
		const statusRes = await app.inject({
			method: "GET",
			url: "/api/imaging/local-offline/sync-status",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});
		assert.equal(statusRes.statusCode, 200);
		assert.ok(statusRes.json().items.length >= 1);
	});

	// =========================================================================
	// 3. LOCAL TELEPHONY (WebRTC SIP & ASTERISK / CLOUD FALLBACK)
	// =========================================================================

	it("3.1 POST /api/telephony/sip/credentials generates valid WebRTC SIP credentials for local Asterisk/FreePBX", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/telephony/sip/credentials",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: {
				extension: "204",
				staffFullName: "Доктор Смирнов",
			},
		});

		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.credentials.authorizationUser, "204");
		assert.ok(json.credentials.wsServerUrl.startsWith("wss://"));
		assert.ok(json.credentials.sipUri.includes("204@"));
		assert.ok(json.credentials.passwordToken);
		assert.ok(json.credentials.iceServers.length >= 1);
	});

	it("3.2 GET /api/telephony/sip/status checks local PBX health and confirms cloud webhook fallback readiness", async () => {
		delete process.env.PBX_FORCE_OFFLINE;

		const response = await app.inject({
			method: "GET",
			url: "/api/telephony/sip/status",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.status.activeMode, "local_webrtc_sip");
		assert.equal(json.status.localPbxOnline, true);
		assert.equal(json.status.cloudWebhookActive, true);
	});

	it("3.3 POST /api/telephony/asterisk/ami-event processes local PBX ringing and matches patient card", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/api/telephony/${ORG_A_ID}/asterisk/ami-event`,
			headers: {
				"x-dente-webhook-secret": "test-webhook-secret-xyz",
			},
			payload: {
				event: "Ringing",
				callerIdNum: "+79261234567",
				uniqueid: `ast-${Date.now()}`,
				exten: "101",
			},
		});

		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.event, "ringing");
		assert.equal(json.patientId, PATIENT_A_ID);
		assert.equal(json.patientName, "Смирнов Алексей Владимирович");
	});

	it("3.4 POST /api/telephony/sip/failover seamlessly toggles to cloud fallback when local PBX is down", async () => {
		// Force failover
		const failoverRes = await app.inject({
			method: "POST",
			url: "/api/telephony/sip/failover",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: { forceCloudFallback: true },
		});

		assert.equal(failoverRes.statusCode, 200);
		const failoverJson = failoverRes.json();
		assert.equal(failoverJson.failoverActive, true);
		assert.equal(failoverJson.status.activeMode, "cloud_webhooks");
		assert.equal(failoverJson.status.localPbxOnline, false);
		assert.ok(failoverJson.status.fallbackReason);

		// Cloud webhook incoming call continues to work seamlessly during failover
		const cloudWebhookRes = await app.inject({
			method: "POST",
			url: `/api/telephony/${ORG_A_ID}/webhook`,
			headers: {
				"x-dente-webhook-secret": "test-webhook-secret-xyz",
			},
			payload: {
				event: "ringing",
				from: "+79261234567",
				to: "+74950001122",
				call_id: `cloud-call-${Date.now()}`,
			},
		});
		assert.equal(cloudWebhookRes.statusCode, 200);
		assert.equal(cloudWebhookRes.json().success, true);
		assert.equal(cloudWebhookRes.json().patientId, PATIENT_A_ID);

		// Restore failover back to normal
		await app.inject({
			method: "POST",
			url: "/api/telephony/sip/failover",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: { forceCloudFallback: false },
		});
	});
});

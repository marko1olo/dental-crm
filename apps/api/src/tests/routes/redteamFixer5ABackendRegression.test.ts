import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	clinics,
	dicomWorkbenchBundles,
	inventoryItems,
	inventoryTransactions,
	labOrderEvents,
	labOrders,
	organizations,
	patients,
	serviceCatalogItems,
	stockBatches,
	users,
	warrantyCertificates,
} from "../../db/schema.js";
import { listDicomWorkbenchBundles, saveDicomWorkbenchBundle } from "../../db/imaging/imagingWorkbenchBundles.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { parseOds } from "../../migration/parsers/spreadsheet.js";
import { registerCbctRoutes } from "../../routes/imaging/cbctRoutes.js";
import { registerDicomRoutes } from "../../routes/imaging/dicomRoutes.js";
import { parseDicomSeriesManifest } from "../../routes/imaging/dicomSeries.js";
import { getImagingOrganizationId } from "../../routes/imaging/imagingHelpers.js";
import { buildDicomViewerWorkbenchManifest } from "../../routes/imaging/workstationReadiness.js";
import { registerLabRoutes } from "../../routes/lab/index.js";
import { insertLabOrderInDb } from "../../routes/lab/ordersCrudModules/labOrderInsertDb.js";
import { registerPricelistRoutes } from "../../routes/pricelist.js";
import { registerSanpinBactericidalRoutes, registerSanpinSterilizationRoutes } from "../../routes/sanpin.js";
import { executeSterilizationConsumablesDeduction } from "../../routes/sanpin/sterilizationModules/handlers/sterilizationConsumablesDeduction.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = `fixer5A-${randomUUID()}`;
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const MARKETER_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const LAB_ORDER_1 = "00000000-0000-4000-8000-000000000101";
const LAB_ORDER_2 = "00000000-0000-4000-8000-000000000102";
const LAB_ORDER_3 = fixtureUuid(NAMESPACE, 10);
const EQUIP_1 = fixtureUuid(NAMESPACE, 20);
const EQUIP_2 = fixtureUuid(NAMESPACE, 21);

function crc32(buf: Buffer): number {
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i += 1) {
		crc ^= buf[i] ?? 0;
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZipBuffer(entries: Array<{ name: string; data: Buffer }>): Buffer {
	const localChunks: Buffer[] = [];
	const centralChunks: Buffer[] = [];
	let offset = 0;

	for (const entry of entries) {
		const nameBuf = Buffer.from(entry.name, "utf8");
		const crc = crc32(entry.data);
		const localHeader = Buffer.alloc(30);
		localHeader.writeUInt32LE(0x04034b50, 0);
		localHeader.writeUInt16LE(20, 4);
		localHeader.writeUInt16LE(0, 6);
		localHeader.writeUInt16LE(0, 8);
		localHeader.writeUInt16LE(0, 10);
		localHeader.writeUInt16LE(0, 12);
		localHeader.writeUInt32LE(crc, 14);
		localHeader.writeUInt32LE(entry.data.length, 18);
		localHeader.writeUInt32LE(entry.data.length, 22);
		localHeader.writeUInt16LE(nameBuf.length, 26);
		localHeader.writeUInt16LE(0, 28);

		localChunks.push(localHeader, nameBuf, entry.data);

		const centralHeader = Buffer.alloc(46);
		centralHeader.writeUInt32LE(0x02014b50, 0);
		centralHeader.writeUInt16LE(20, 4);
		centralHeader.writeUInt16LE(20, 6);
		centralHeader.writeUInt16LE(0, 8);
		centralHeader.writeUInt16LE(0, 10);
		centralHeader.writeUInt16LE(0, 12);
		centralHeader.writeUInt16LE(0, 14);
		centralHeader.writeUInt32LE(crc, 16);
		centralHeader.writeUInt32LE(entry.data.length, 20);
		centralHeader.writeUInt32LE(entry.data.length, 24);
		centralHeader.writeUInt16LE(nameBuf.length, 28);
		centralHeader.writeUInt16LE(0, 30);
		centralHeader.writeUInt16LE(0, 32);
		centralHeader.writeUInt16LE(0, 34);
		centralHeader.writeUInt16LE(0, 36);
		centralHeader.writeUInt32LE(0, 38);
		centralHeader.writeUInt32LE(offset, 42);

		centralChunks.push(centralHeader, nameBuf);
		offset += localHeader.length + nameBuf.length + entry.data.length;
	}

	const centralBuf = Buffer.concat(centralChunks);
	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0);
	eocd.writeUInt16LE(0, 4);
	eocd.writeUInt16LE(0, 6);
	eocd.writeUInt16LE(entries.length, 8);
	eocd.writeUInt16LE(entries.length, 10);
	eocd.writeUInt32LE(centralBuf.length, 12);
	eocd.writeUInt32LE(offset, 16);
	eocd.writeUInt16LE(0, 20);

	return Buffer.concat([...localChunks, centralBuf, eocd]);
}

describe("RedTeam Fixer-5A Backend Regression Suite (PG18 Live)", { concurrency: false }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let doctorToken = "";
	let marketerToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET || "fixer-5a-test-secret-32-bytes-minimum!!";

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Fixer-5A Тест",
			});
			await tx
				.insert(clinics)
				.values({
					id: ORG_ID,
					organizationId: ORG_ID,
					name: "Клиника Fixer-5A Тест",
					timezone: "Asia/Vladivostok",
				})
				.onConflictDoUpdate({
					target: clinics.id,
					set: { timezone: "Asia/Vladivostok" },
				});

			await tx.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Ортопед Соло",
					role: "doctor",
					isActive: true,
				},
				{
					id: MARKETER_ID,
					organizationId: ORG_ID,
					fullName: "Маркетолог Без Доступа",
					role: "marketer",
					isActive: true,
				},
			]);

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Fixer-5A",
				status: "active",
			});

			await tx.insert(bactericidalEquipments).values([
				{
					id: EQUIP_1,
					organizationId: ORG_ID,
					roomName: "Кабинет 1",
					roomVolumeM3: "45.00",
					deviceBrand: "Дезар-3",
					serialNumber: "SN-5A-01",
					isCommissioned: true,
				},
				{
					id: EQUIP_2,
					organizationId: ORG_ID,
					roomName: "Кабинет 2",
					roomVolumeM3: "50.00",
					deviceBrand: "Дезар-5",
					serialNumber: "SN-5A-02",
					isCommissioned: true,
				},
			]);

			await tx.insert(labOrders).values([
				{
					id: LAB_ORDER_1,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					doctorName: "Доктор Ортопед Соло",
					secureToken: "tok-5a-1",
					toothFdi: "16",
					material: "zirconia_ml",
					status: "draft",
					priceKopecks: 2000000,
					labCostKopecks: 700000,
				},
				{
					id: LAB_ORDER_2,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					doctorName: "Доктор Ортопед Соло",
					secureToken: "tok-5a-2",
					toothFdi: "26",
					material: "emax_press",
					status: "draft",
					priceKopecks: 2200000,
					labCostKopecks: 750000,
				},
				{
					id: LAB_ORDER_3,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					doctorName: "Доктор Ортопед Соло",
					secureToken: "tok-5a-3",
					toothFdi: "36",
					material: "zirconia_ml",
					status: "received",
					priceKopecks: 2500000,
					labCostKopecks: 800000,
				},
			]);
		});

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID, role: "doctor" }, secret);
		doctorToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" },
			secret,
		);
		marketerToken = signToken(
			{ organizationId: ORG_ID, userId: MARKETER_ID, role: "marketer" },
			secret,
		);

		app = await createIdempotentTenantTestApp();
		await registerSanpinSterilizationRoutes(app);
		await registerSanpinBactericidalRoutes(app);
		await registerLabRoutes(app);
		await registerPricelistRoutes(app);
		await registerDicomRoutes(app);
		await registerCbctRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("P1-1.1: parallel sterilization deductions and bactericidal shift autopilot run cleanly without 40P01", async () => {
		await withTenantWriteCtx(ORG_ID, async (tx) => {
			await tx.insert(inventoryItems).values({
				organizationId: ORG_ID,
				name: "Крафт-пакет самоклеящийся 100х200",
				category: "sterilization",
				unit: "шт",
				currentQty: "10",
				stockQuantity: "10",
				minQty: "5",
				criticalThreshold: "5",
				unitCostKopecks: 1500n,
				pricePerUnitKopecks: 1500n,
			});
		});

		const [resA, resB] = await Promise.all([
			executeSterilizationConsumablesDeduction({
				organizationId: ORG_ID,
				count: 6,
				packagingType: "kraft_bag",
				indicatorType: "class_4",
				cycleNumber: 1,
				barcode: "BC-5A-1",
			}),
			executeSterilizationConsumablesDeduction({
				organizationId: ORG_ID,
				count: 6,
				packagingType: "kraft_bag",
				indicatorType: "class_4",
				cycleNumber: 2,
				barcode: "BC-5A-2",
			}),
		]);

		assert.ok(resA.deductedItems.length >= 2);
		assert.ok(resB.deductedItems.length >= 2);
		assert.ok(
			resA.deductedItems.some((d) => d.isOverdraft) || resB.deductedItems.some((d) => d.isOverdraft),
			"Parallel deductions must trigger soft overdraft cleanly",
		);

		const autoRes = await app.inject({
			method: "POST",
			url: "/api/registers/bactericidal/shift-autopilot",
			headers: {
				[STAFF_TOKEN_HEADER]: doctorToken,
				"idempotency-key": randomUUID(),
			},
			payload: { durationMinutes: 120 },
		});
		assert.equal(autoRes.statusCode, 201, autoRes.body);

		const expectedLocalDate = new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Vladivostok",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date());

		const logs = await withTenantReadCtx(ORG_ID, (tx) =>
			tx.select().from(bactericidalIrradiatorLogs).where(eq(bactericidalIrradiatorLogs.organizationId, ORG_ID)),
		);
		assert.equal(logs.length, 2);
		for (const log of logs) {
			assert.equal(log.date, expectedLocalDate, "Bactericidal autopilot must resolve date in clinic timezone");
		}
	});

	test("P1-1.2: migrated routes enforce 401/403 RBAC and imagingHelpers rejects DENTAL_STATE_PERSISTENCE=off hardcoded org", async () => {
		const guardedGetUrls = [
			"/api/sanpin/sterilization",
			`/api/clinical/lab-orders/${LAB_ORDER_1}/events`,
			"/api/pricelist",
			"/api/imaging/daemon/status",
		];

		for (const url of guardedGetUrls) {
			const unauthRes = await app.inject({ method: "GET", url });
			assert.equal(unauthRes.statusCode, 401, `Unauthenticated GET ${url} must return 401`);

			const marketerRes = await app.inject({
				method: "GET",
				url,
				headers: { [STAFF_TOKEN_HEADER]: marketerToken },
			});
			assert.equal(marketerRes.statusCode, 403, `Marketer GET ${url} must return 403`);

			const doctorRes = await app.inject({
				method: "GET",
				url,
				headers: { [STAFF_TOKEN_HEADER]: doctorToken, "idempotency-key": randomUUID() },
			});
			assert.equal(doctorRes.statusCode, 200, `Doctor GET ${url} failed: ${doctorRes.body}`);
		}

		const prevPersistence = process.env.DENTAL_STATE_PERSISTENCE;
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		try {
			let statusCode = 200;
			const fakeReply = {
				code(c: number) {
					statusCode = c;
					return this;
				},
				send() {
					return this;
				},
			} as unknown as FastifyReply;
			const fakeReq = { headers: {}, method: "GET", url: "/api/imaging/daemon/status" } as unknown as FastifyRequest;
			const resolved = getImagingOrganizationId(fakeReq, fakeReply);
			assert.equal(resolved, null);
			assert.equal(statusCode, 401);
		} finally {
			if (prevPersistence !== undefined) process.env.DENTAL_STATE_PERSISTENCE = prevPersistence;
			else delete process.env.DENTAL_STATE_PERSISTENCE;
		}
	});

	test("P1-2.2 & P1-2.3: lab order solo doctor fallback vs invalid explicit UUID, batch-status .strict()/order, and mark-installed Idempotency-Key", async () => {
		// 1. Omitted doctorId & placeholder "Врач-ортопед" with no currentUserId resolves deterministic specialist
		const soloInsert = await withTenantWriteCtx(ORG_ID, (tx) =>
			insertLabOrderInDb(
				tx,
				ORG_ID,
				{
					patientId: PATIENT_ID,
					doctorName: "Врач-ортопед",
					toothFdi: "11",
					material: "zirconia_ml",
					colorVita: "A2",
					priceRub: 24000,
				},
				null,
			),
		);
		assert.equal(soloInsert.kind, "ok");
		if (soloInsert.kind === "ok") {
			assert.equal(soloInsert.order.doctorId, DOCTOR_ID);
		}

		// Also verify via HTTP route when doctorId is omitted and placeholder "Врач-ортопед" is sent
		const soloCreateRes = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				[STAFF_TOKEN_HEADER]: doctorToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				patientId: PATIENT_ID,
				doctorName: "Врач-ортопед",
				toothFdi: "11",
				material: "zirconia_ml",
				colorVita: "A2",
				priceRub: 24000,
			},
		});
		assert.equal(soloCreateRes.statusCode, 201, soloCreateRes.body);
		const soloBody = soloCreateRes.json<{ doctorId: string }>();
		assert.equal(soloBody.doctorId, DOCTOR_ID);

		// 2. Explicit nonexistent UUID doctorId must still return 400 doctor_not_found
		const badDocRes = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				[STAFF_TOKEN_HEADER]: doctorToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				patientId: PATIENT_ID,
				doctorId: randomUUID(),
				toothFdi: "12",
				material: "zirconia_ml",
				colorVita: "A2",
				priceRub: 24000,
			},
		});
		assert.equal(badDocRes.statusCode, 400);

		// 3. batch-status .strict() rejects extra field
		const badBatchRes = await app.inject({
			method: "PATCH",
			url: "/api/lab/orders/batch-status",
			headers: {
				[STAFF_TOKEN_HEADER]: doctorToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				orderIds: [LAB_ORDER_1, LAB_ORDER_2],
				status: "sent",
				unexpectedField: true,
			},
		});
		assert.equal(badBatchRes.statusCode, 400);

		// 4. Concurrent reversed orderIds succeed cleanly in deterministic lock order
		const [batchA, batchB] = await Promise.all([
			app.inject({
				method: "PATCH",
				url: "/api/lab/orders/batch-status",
				headers: {
					[STAFF_TOKEN_HEADER]: doctorToken,
					"idempotency-key": randomUUID(),
				},
				payload: { orderIds: [LAB_ORDER_2, LAB_ORDER_1], status: "sent" },
			}),
			app.inject({
				method: "PATCH",
				url: "/api/lab/orders/batch-status",
				headers: {
					[STAFF_TOKEN_HEADER]: doctorToken,
					"idempotency-key": randomUUID(),
				},
				payload: { orderIds: [LAB_ORDER_1, LAB_ORDER_2], status: "in_progress" },
			}),
		]);
		assert.equal(batchA.statusCode, 200, batchA.body);
		assert.equal(batchB.statusCode, 200, batchB.body);

		const events = await withTenantReadCtx(ORG_ID, (tx) =>
			tx
				.select()
				.from(labOrderEvents)
				.where(and(eq(labOrderEvents.organizationId, ORG_ID), inArray(labOrderEvents.labOrderId, [LAB_ORDER_1, LAB_ORDER_2]))),
		);
		assert.ok(events.length >= 2);

		// 5. mark-installed requires Idempotency-Key and sets warranty certificate dates in clinicTimezone
		const noKeyInstall = await app.inject({
			method: "POST",
			url: `/api/lab-orders/${LAB_ORDER_3}/mark-installed`,
			headers: { [STAFF_TOKEN_HEADER]: doctorToken },
			payload: {},
		});
		assert.equal(noKeyInstall.statusCode, 400);
		assert.equal(noKeyInstall.json<{ error: string }>().error, "IdempotencyKeyRequired");

		const okInstall = await app.inject({
			method: "POST",
			url: `/api/lab-orders/${LAB_ORDER_3}/mark-installed`,
			headers: {
				[STAFF_TOKEN_HEADER]: doctorToken,
				"idempotency-key": randomUUID(),
			},
			payload: { clinicalNotes: "Фиксация по адгезивному протоколу" },
		});
		assert.equal(okInstall.statusCode, 200, okInstall.body);
		const certs = await withTenantReadCtx(ORG_ID, (tx) =>
			tx.select().from(warrantyCertificates).where(eq(warrantyCertificates.organizationId, ORG_ID)),
		);
		assert.equal(certs.length, 1);
	});

	test("P1-4.2: imagingWorkbenchBundles shares caller TX without nested withTenantCtx", async () => {
		const previewBody = await withTenantReadCtx(ORG_ID, () =>
			parseDicomSeriesManifest(ORG_ID, {
				sourceName: "Test CBCT Folder",
				sourceKind: "dicom_file",
				rawText: "001.dcm\n002.dcm\n003.dcm",
			}),
		);
		const series = previewBody.series[0];
		assert.ok(series, "Series preview must produce at least 1 series group");

		const manifest = buildDicomViewerWorkbenchManifest({
			viewerKind: "ohif",
			target: "generic_json",
			series,
			client: {
				deviceMemoryGb: 8,
				hardwareConcurrency: 4,
				webgl2Supported: true,
				indexedDbSupported: true,
				storageQuotaMb: 2048,
				storageUsageMb: 128,
				online: true,
				platform: "win32",
			},
			annotations: [],
			allowExternalHandoff: true,
		});

		const saved = await withTenantWriteCtx(ORG_ID, (tx) =>
			saveDicomWorkbenchBundle(ORG_ID, { manifest, seriesKey: `series-5a-${randomUUID()}` }, tx),
		);
		assert.ok(saved.id);

		const listed = await withTenantReadCtx(ORG_ID, (tx) => listDicomWorkbenchBundles(ORG_ID, 5, tx));
		assert.ok(listed.some((b) => b.id === saved.id));
	});

	test("P2-3.1: pricelist *Kopecks round-trip, streamed CSV export, and bounded parseOds", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: "/api/pricelist",
			headers: {
				[STAFF_TOKEN_HEADER]: doctorToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				code: "5A-KOP-01",
				title: "Коронка ZrO2 копеечный контракт",
				category: "prosthetics",
				specialty: "orthopedist",
				basePriceKopecks: 550050,
				durationMinutes: 60,
				materialsCostKopecks: 35000,
				labCostKopecks: 120000,
			},
		});
		assert.equal(createRes.statusCode, 201, createRes.body);
		const created = createRes.json<{
			id: string;
			basePriceKopecks: number;
			materialsCostKopecks: number;
			labCostKopecks: number;
			basePriceRub: number;
		}>();
		assert.equal(created.basePriceKopecks, 550050);
		assert.equal(created.materialsCostKopecks, 35000);
		assert.equal(created.labCostKopecks, 120000);
		assert.equal(created.basePriceRub, 5500.5);

		const exportCsvRes = await app.inject({
			method: "GET",
			url: "/api/pricelist/export?format=csv",
			headers: { [STAFF_TOKEN_HEADER]: doctorToken, "idempotency-key": randomUUID() },
		});
		assert.equal(exportCsvRes.statusCode, 200);
		assert.ok(exportCsvRes.body.startsWith("\uFEFF"));
		assert.ok(exportCsvRes.body.includes("5A-KOP-01"));

		const contentXml =
			'<?xml version="1.0" encoding="UTF-8"?>' +
			'<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">' +
			"<office:body><office:spreadsheet>" +
			'<table:table table:name="Прайс">' +
			'<table:table-row table:number-rows-repeated="500">' +
			'<table:table-cell><text:p>Позиция</text:p></table:table-cell>' +
			'<table:table-cell office:value="1200"><text:p>1200</text:p></table:table-cell>' +
			"</table:table-row>" +
			"</table:table>" +
			"</office:spreadsheet></office:body></office:document-content>";
		const odsZip = buildStoredZipBuffer([
			{ name: "content.xml", data: Buffer.from(contentXml, "utf8") },
		]);
		const parsedOds = await parseOds(odsZip, { maxRowsPerSheet: 25, selectedSheetIndex: 0 });
		assert.equal(parsedOds.sheets.length, 1);
		assert.equal(parsedOds.sheets[0]?.rows.length, 25);
		assert.ok(parsedOds.warnings.some((w) => w.includes("25")));
	});
});

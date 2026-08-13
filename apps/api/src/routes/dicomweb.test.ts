import assert from "node:assert";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { TestContext } from "node:test";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { denteAdminSecretHeader } from "../accessGuard.js";
import { db, dbRaw } from "../db/client.js";
import * as schema from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerDicomwebRoutes } from "./dicomweb.js";

const SAMPLE_DICOM_PATH = fileURLToPath(
	new URL("../../../../.data/dicom/test.dcm", import.meta.url),
);

const SAMPLE_STUDY_UID = "1.3.6.1.4.1.5962.1.2.2.20040826185059.5457";
const SAMPLE_SERIES_UID = "1.3.6.1.4.1.5962.1.3.2.1.20040826185059.5457";
const SAMPLE_SOP_UID = "1.3.6.1.4.1.5962.1.1.2.1.2.20040826185059.5457";
const SAMPLE_BYTES = 121356;

const ORGANIZATION_ID = fixtureUuid("m2.dicomweb.test", 1);
const OTHER_ORGANIZATION_ID = fixtureUuid("m2.dicomweb.test", 2);
const MISSING_ORGANIZATION_ID = fixtureUuid("m2.dicomweb.test", 99);
const PATIENT_ID = fixtureUuid("m2.dicomweb.test", 100);
const MALFORMED_ORGANIZATION_ID = "not-a-uuid-at-all";

const OTHER_STORAGE_PATH = fileURLToPath(
	new URL("./dicomweb.test.ts", import.meta.url),
);

const ADMIN_GATE_PROBE = randomBytes(24).toString("base64url");

process.env.DENTE_DICOM_SAMPLE_PATH = SAMPLE_DICOM_PATH;
process.env.DENTE_DICOM_SAMPLE_ORGANIZATION_ID = ORGANIZATION_ID;
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

assert.ok(
	existsSync(SAMPLE_DICOM_PATH),
	`Образец DICOM отсутствует: ${SAMPLE_DICOM_PATH}. Без него проверять нечего.`,
);
assert.strictEqual(readFileSync(SAMPLE_DICOM_PATH).length, SAMPLE_BYTES);

describe("dicomweb routes", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORGANIZATION_ID, OTHER_ORGANIZATION_ID]);
		await withFixtureTenant(ORGANIZATION_ID, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORGANIZATION_ID,
				name: "Test DICOM Org 1",
			});
			await tx.insert(schema.patients).values({
				id: PATIENT_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Test Patient DICOM",
			});
		});
		await withFixtureTenant(OTHER_ORGANIZATION_ID, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: OTHER_ORGANIZATION_ID,
				name: "Test DICOM Org 2",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORGANIZATION_ID, OTHER_ORGANIZATION_ID]);
	});

	async function buildApp(): Promise<ReturnType<typeof Fastify>> {
		const app = Fastify();
		await app.register(cors, { origin: "http://example.com" });
		await registerDicomwebRoutes(app);
		return app;
	}

	function clinicHeaders(
		organizationId: string = ORGANIZATION_ID,
	): Record<string, string> {
		return {
			"x-dente-clinic-token": signToken({ organizationId }, authTokenSecret()),
		};
	}

	function instanceUrl(
		studyUid: string,
		seriesUid: string,
		instanceUid: string,
	): string {
		return `/api/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}`;
	}

	function enableClinicalReadGate(t: TestContext): void {
		process.env.DENTE_CLINICAL_ADMIN_SECRET = ADMIN_GATE_PROBE;
		t.after(() => {
			delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		});
	}

	function clearSampleOwner(t: TestContext): void {
		const previous = process.env.DENTE_DICOM_SAMPLE_ORGANIZATION_ID;
		delete process.env.DENTE_DICOM_SAMPLE_ORGANIZATION_ID;
		t.after(() => {
			if (previous === undefined) return;
			process.env.DENTE_DICOM_SAMPLE_ORGANIZATION_ID = previous;
		});
	}

	function assertNoDicomBytes(response: {
		headers: Record<string, unknown>;
		rawPayload: Buffer;
	}): void {
		assert.ok(
			!String(response.headers["content-type"] ?? "").includes(
				"application/dicom",
			),
		);
		assert.notStrictEqual(response.rawPayload.length, SAMPLE_BYTES);
	}

	test("выдуманный UID больше не получает байты снимка", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl("1", "1", "1"),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 404);
		assertNoDicomBytes(response);
		assert.strictEqual(response.json().error, "DicomInstanceNotFound");

		await app.close();
	});

	test("образец отдаётся организации-владельцу под её собственными UID", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 200);
		assert.strictEqual(response.headers["content-type"], "application/dicom");
		assert.strictEqual(response.rawPayload.length, SAMPLE_BYTES);
		assert.strictEqual(
			response.rawPayload.subarray(128, 132).toString("latin1"),
			"DICM",
		);

		await app.close();
	});

	test("вторая клиника установки не получает демонстрационный снимок владельца", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: clinicHeaders(OTHER_ORGANIZATION_ID),
		});

		assert.strictEqual(response.statusCode, 404);
		assert.strictEqual(response.json().error, "DicomInstanceNotFound");
		assertNoDicomBytes(response);

		await app.close();
	});

	test("организации, которой нет в базе, снимок не выдаётся", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: clinicHeaders(MISSING_ORGANIZATION_ID),
		});

		assert.strictEqual(response.statusCode, 403);
		assert.strictEqual(response.json().error, "OrganizationUnknown");
		assertNoDicomBytes(response);

		await app.close();
	});

	test("идентификатор организации не в формате UUID отклоняется без обращения к базе", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: clinicHeaders(MALFORMED_ORGANIZATION_ID),
		});

		assert.strictEqual(response.statusCode, 403);
		assert.strictEqual(response.json().error, "OrganizationUnknown");
		assertNoDicomBytes(response);

		await app.close();
	});

	test("без назначенного владельца образец не отдаётся никому", async (t) => {
		clearSampleOwner(t);
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 404);
		assert.strictEqual(response.json().error, "DicomInstanceNotFound");
		assertNoDicomBytes(response);

		await app.close();
	});

	test("недоступная база не превращается в вывод «такой организации нет»", async (t) => {
		t.mock.method(
			dbRaw,
			"transaction",
			async (callback: (tx: unknown) => Promise<unknown>) => {
				const mockTx = {
					execute: async () => ({ rows: [] }),
					select: () => {
						throw new Error("соединение с PostgreSQL потеряно");
					},
				};
				return callback(mockTx);
			},
		);
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 503);
		assert.strictEqual(response.json().error, "OrganizationCheckUnavailable");
		assertNoDicomBytes(response);

		await app.close();
	});

	test("гейт клинического чтения отказывает токену клиники без секрета администратора", async (t) => {
		enableClinicalReadGate(t);
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 403);
		assert.strictEqual(response.json().error, "ClinicalReadSecretRequired");
		assert.strictEqual(response.json().protectedArea, "dicom instance read");
		assertNoDicomBytes(response);

		await app.close();
	});

	test("гейт клинического чтения с верным секретом администратора отдаёт снимок владельцу", async (t) => {
		enableClinicalReadGate(t);
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: { ...clinicHeaders(), [denteAdminSecretHeader]: ADMIN_GATE_PROBE },
		});

		assert.strictEqual(response.statusCode, 200);
		assert.strictEqual(response.headers["content-type"], "application/dicom");
		assert.strictEqual(response.rawPayload.length, SAMPLE_BYTES);
		assert.strictEqual(
			response.rawPayload.subarray(128, 132).toString("latin1"),
			"DICM",
		);

		await app.close();
	});

	test("гейт клинического чтения отказывает при неверном секрете администратора", async (t) => {
		enableClinicalReadGate(t);
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: {
				...clinicHeaders(),
				[denteAdminSecretHeader]: `${ADMIN_GATE_PROBE}x`,
			},
		});

		assert.strictEqual(response.statusCode, 403);
		assert.strictEqual(response.json().error, "ClinicalReadSecretRequired");
		assertNoDicomBytes(response);

		await app.close();
	});

	test("верный UID исследования с чужой серией не отдаёт снимок", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, "1.2.3.чужая.серия", SAMPLE_SOP_UID),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 404);
		assert.strictEqual(response.json().error, "DicomInstanceNotFound");

		await app.close();
	});

	test("верные UID исследования и серии с чужим объектом не отдают снимок", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, "9.9.9.чужой.объект"),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 404);
		assert.strictEqual(response.json().error, "DicomInstanceNotFound");

		await app.close();
	});

	test("строка imaging_instances отдаёт файл именно по своему storage_path", async () => {
		const studyId = fixtureUuid("m2.dicomweb.test", 10);
		const seriesId = fixtureUuid("m2.dicomweb.test", 11);
		const instanceId = fixtureUuid("m2.dicomweb.test", 12);

		await withFixtureTenant(ORGANIZATION_ID, async (tx) => {
			await tx.insert(schema.imagingStudies).values({
				id: studyId,
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_ID,
				kind: "cbct",
				title: "Test Study 1",
				capturedAt: new Date(),
				sourceKind: "manual_upload",
				sourceName: "Manual",
				dicomStudyUid: "1.2.826.0.1.3680043.8.498.1",
			});
			await tx.insert(schema.imagingSeries).values({
				id: seriesId,
				organizationId: ORGANIZATION_ID,
				studyId: studyId,
				dicomSeriesUid: "1.2.826.0.1.3680043.8.498.2",
			});
			await tx.insert(schema.imagingInstances).values({
				id: instanceId,
				organizationId: ORGANIZATION_ID,
				seriesId: seriesId,
				dicomSopInstanceUid: "1.2.826.0.1.3680043.8.498.3",
				storagePath: SAMPLE_DICOM_PATH,
			});
		});
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(
				"1.2.826.0.1.3680043.8.498.1",
				"1.2.826.0.1.3680043.8.498.2",
				"1.2.826.0.1.3680043.8.498.3",
			),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 200);
		assert.strictEqual(response.headers["content-type"], "application/dicom");
		assert.strictEqual(response.rawPayload.length, SAMPLE_BYTES);

		await app.close();
	});

	test("storage_path исследования не отдаётся, если байты не подтверждают серию и объект", async () => {
		const studyId = fixtureUuid("m2.dicomweb.test", 20);

		await withFixtureTenant(ORGANIZATION_ID, async (tx) => {
			await tx.insert(schema.imagingStudies).values({
				id: studyId,
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_ID,
				kind: "cbct",
				title: "Test Study",
				capturedAt: new Date(),
				sourceKind: "manual_upload",
				sourceName: "Manual",
				dicomStudyUid: "1.2.826.0.1.3680043.8.498.10",
				storagePath: OTHER_STORAGE_PATH,
			});
		});
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(
				"1.2.826.0.1.3680043.8.498.10",
				"1.2.826.0.1.3680043.8.498.11",
				"1.2.826.0.1.3680043.8.498.12",
			),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 404);
		assert.strictEqual(response.json().error, "DicomInstanceNotFound");

		await app.close();
	});

	test("storage_path исследования отдаётся, когда байты подтверждают все три UID", async () => {
		const studyId = fixtureUuid("m2.dicomweb.test", 30);

		await withFixtureTenant(ORGANIZATION_ID, async (tx) => {
			await tx.insert(schema.imagingStudies).values({
				id: studyId,
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_ID,
				kind: "cbct",
				title: "Test Study 3",
				capturedAt: new Date(),
				sourceKind: "manual_upload",
				sourceName: "Manual",
				dicomStudyUid: SAMPLE_STUDY_UID,
				storagePath: SAMPLE_DICOM_PATH,
			});
		});
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: clinicHeaders(),
		});

		assert.strictEqual(response.statusCode, 200);
		assert.strictEqual(response.rawPayload.length, SAMPLE_BYTES);

		await app.close();
	});

	test("без токена клиники снимок не выдаётся", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
		});

		assert.strictEqual(response.statusCode, 401);
		assert.strictEqual(response.json().error, "AuthRequired");

		await app.close();
	});

	test("DICOM route does not return wildcard CORS", async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
			headers: { ...clinicHeaders(), origin: "http://example.com" },
		});

		assert.strictEqual(
			response.headers["access-control-allow-origin"],
			"http://example.com",
		);
		assert.notStrictEqual(response.headers["access-control-allow-origin"], "*");

		await app.close();
	});
});

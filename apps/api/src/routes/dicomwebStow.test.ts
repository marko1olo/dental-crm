import assert from "node:assert";
import fs from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { TestContext } from "node:test";
import { describe, it, before, after } from "node:test";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { db, dbRaw } from "../db/client.js";
import * as schema from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	cleanDicomPatientName,
	parseDicomBufferForStow,
	registerDicomwebStowRoutes,
	resolvePatientForStow,
	stripMultipartWrapperFromBuffer,
} from "./dicomwebStow.js";

const SAMPLE_DICOM_PATH = fileURLToPath(
	new URL("../../../../.data/dicom/test.dcm", import.meta.url),
);

const ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const PATIENT_ID = "99999999-9999-4999-8999-999999999999";
const PATIENT_B_ID = "88888888-8888-4888-8888-888888888888";

const SAMPLE_STUDY_UID = "1.3.6.1.4.1.5962.1.2.2.20040826185059.5457";
const SAMPLE_SERIES_UID = "1.3.6.1.4.1.5962.1.3.2.1.20040826185059.5457";
const SAMPLE_SOP_UID = "1.3.6.1.4.1.5962.1.1.2.1.2.20040826185059.5457";

function clinicHeaders(
	organizationId: string = ORG_ID,
	role: string = "doctor",
	userId: string = "doctor-uuid-1",
): Record<string, string> {
	const secret = authTokenSecret();
	return {
		"x-dente-clinic-token": signToken({ organizationId }, secret),
		"x-dente-staff-token": signToken(
			{ organizationId, userId, role, fullName: "Доктор Иванов" },
			secret,
		),
	};
}

describe("DICOMweb STOW-RS & Patient Resolution Inquisitor Suite", () => {
	it("cleanDicomPatientName converts DICOM carets to clean full name", () => {
		assert.strictEqual(
			cleanDicomPatientName("Иванов^Иван^Иванович"),
			"Иванов Иван Иванович",
		);
		assert.strictEqual(
			cleanDicomPatientName("Smirnova^Elena"),
			"Smirnova Elena",
		);
		assert.strictEqual(cleanDicomPatientName(""), null);
		assert.strictEqual(cleanDicomPatientName(null), null);
	});

	it("stripMultipartWrapperFromBuffer strips multipart headers and boundaries", () => {
		const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
		const rawDicom = Buffer.from("DICOM_TEST_BYTES_HERE");
		const multipart = Buffer.concat([
			Buffer.from(`--${boundary}\r\nContent-Type: application/dicom\r\n\r\n`),
			rawDicom,
			Buffer.from(`\r\n--${boundary}--`),
		]);

		const stripped = stripMultipartWrapperFromBuffer(multipart);
		assert.strictEqual(stripped.toString(), rawDicom.toString());
	});

	it("parseDicomBufferForStow extracts tags and patient info from valid DICOM sample", () => {
		assert.ok(existsSync(SAMPLE_DICOM_PATH));
		const buffer = readFileSync(SAMPLE_DICOM_PATH);
		const parsed = parseDicomBufferForStow(buffer);

		assert.strictEqual(parsed.studyUid, SAMPLE_STUDY_UID);
		assert.strictEqual(parsed.seriesUid, SAMPLE_SERIES_UID);
		assert.strictEqual(parsed.sopInstanceUid, SAMPLE_SOP_UID);
		assert.ok(parsed.rows !== null && parsed.rows > 0);
		assert.ok(parsed.columns !== null && parsed.columns > 0);
	});

	it("resolvePatientForStow returns patient on explicit valid patientId", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([{ id: PATIENT_ID, mergedIntoPatientId: null }]),
				}),
			}),
		}));

		const resolved = await resolvePatientForStow({
			organizationId: ORG_ID,
			explicitPatientId: PATIENT_ID,
		});

		assert.ok(resolved);
		assert.strictEqual(resolved.patientId, PATIENT_ID);
		assert.strictEqual(resolved.matchMethod, "explicit");
	});

	it("resolvePatientForStow returns null when explicit patientId is not found (NEVER guesses)", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([]),
				}),
			}),
		}));

		const resolved = await resolvePatientForStow({
			organizationId: ORG_ID,
			explicitPatientId: "00000000-0000-0000-0000-000000000000",
		});

		assert.strictEqual(resolved, null);
	});

	it("resolvePatientForStow resolves patient by dicomPatientId when it matches a patient UUID", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([{ id: PATIENT_B_ID, mergedIntoPatientId: null }]),
				}),
			}),
		}));

		const resolved = await resolvePatientForStow({
			organizationId: ORG_ID,
			dicomPatientId: PATIENT_B_ID,
		});

		assert.ok(resolved);
		assert.strictEqual(resolved.patientId, PATIENT_B_ID);
		assert.strictEqual(resolved.matchMethod, "dicom_patient_id");
	});

	it("resolvePatientForStow resolves patient by exact DICOM patient name and matching birth date", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: () =>
					Promise.resolve([
						{
							id: PATIENT_ID,
							fullName: "Петров Петр Петрович",
							birthDate: "1985-04-12",
							mergedIntoPatientId: null,
						},
					]),
			}),
		}));

		const resolved = await resolvePatientForStow({
			organizationId: ORG_ID,
			dicomPatientName: "Петров^Петр^Петрович",
			dicomBirthDate: "19850412",
		});

		assert.ok(resolved);
		assert.strictEqual(resolved.patientId, PATIENT_ID);
		assert.strictEqual(resolved.matchMethod, "dicom_name_exact");
	});

	it("resolvePatientForStow rejects match when birth dates conflict", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: () =>
					Promise.resolve([
						{
							id: PATIENT_ID,
							fullName: "Петров Петр Петрович",
							birthDate: "1990-01-01",
							mergedIntoPatientId: null,
						},
					]),
			}),
		}));

		const resolved = await resolvePatientForStow({
			organizationId: ORG_ID,
			dicomPatientName: "Петров^Петр^Петрович",
			dicomBirthDate: "19850412", // Conflict!
		});

		assert.strictEqual(resolved, null);
	});
});

describe("STOW-RS Route Security & Zero Dead-Ends Endpoints", () => {
	async function buildStowApp(): Promise<ReturnType<typeof Fastify>> {
		const app = Fastify();
		registerDicomwebStowRoutes(app);
		return app;
	}

	function setupDbMock(
		t: TestContext,
		onInsert?: (vals: any) => void,
		patientsList: any[] = [{ id: PATIENT_ID, mergedIntoPatientId: null }],
	) {
		const select = () => {
			let currentTable: any = null;
			const node: Record<string, unknown> = {};
			node.from = (tbl: any) => {
				currentTable = tbl;
				return node;
			};
			node.where = () => node;
			node.limit = () => {
				if (currentTable === schema.organizations) {
					return Promise.resolve([{ id: ORG_ID }]);
				}
				if (currentTable === schema.patients) {
					return Promise.resolve(patientsList);
				}
				return Promise.resolve([]);
			};
			node.then = (onfulfilled?: ((value: unknown) => unknown) | null) => {
				if (currentTable === schema.organizations) {
					return Promise.resolve([{ id: ORG_ID }]).then(onfulfilled);
				}
				if (currentTable === schema.patients) {
					return Promise.resolve(patientsList).then(onfulfilled);
				}
				return Promise.resolve([]).then(onfulfilled);
			};
			return node;
		};

		const insert = () => {
			const node: Record<string, unknown> = {};
			node.values = (vals: any) => {
				if (onInsert) onInsert(vals);
				return node;
			};
			node.returning = () => Promise.resolve([{ id: "generated-uuid-id" }]);
			return node;
		};

		const update = () => {
			const node: Record<string, unknown> = {};
			node.set = () => node;
			node.where = () => Promise.resolve([]);
			return node;
		};

		t.mock.method(db, "select", select);
		t.mock.method(db, "insert", insert);
		t.mock.method(db, "update", update);

		t.mock.method(
			dbRaw,
			"transaction",
			async (callback: (tx: unknown) => Promise<unknown>) =>
				callback({
					execute: async () => ({ rows: [] }),
					select,
					insert,
					update,
				}),
		);
	}

	it("POST /api/dicomweb/studies stores unassigned study when patient cannot be auto-resolved (Zero Dead-Ends & Mandate 8l)", async (t) => {
		const app = await buildStowApp();

		let insertedStudyValues: any = null;
		setupDbMock(
			t,
			(vals) => {
				if (vals.title?.includes("КЛКТ")) {
					insertedStudyValues = vals;
				}
			},
			[], // Empty patient list
		);

		const sampleBuf = readFileSync(SAMPLE_DICOM_PATH);

		const response = await app.inject({
			method: "POST",
			url: "/api/dicomweb/studies",
			headers: {
				...clinicHeaders(ORG_ID, "doctor"),
				"content-type": "application/dicom",
			},
			payload: sampleBuf,
		});

		assert.strictEqual(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.status, "stored");
		assert.strictEqual(body.bindingStatus, "unassigned");
		assert.strictEqual(body.patientId, null);
	});

	it("POST /api/dicomweb/studies saves with relative normalized path uploads/dicom/... when explicit patientId provided", async (t) => {
		const app = await buildStowApp();

		let insertedStudyValues: any = null;
		let insertedInstanceValues: any = null;

		setupDbMock(t, (vals) => {
			if (vals.title?.includes("КЛКТ")) {
				insertedStudyValues = vals;
			} else if (vals.dicomSopInstanceUid) {
				insertedInstanceValues = vals;
			}
		});

		const sampleBuf = readFileSync(SAMPLE_DICOM_PATH);

		const response = await app.inject({
			method: "POST",
			url: `/api/dicomweb/studies?patientId=${PATIENT_ID}`,
			headers: {
				...clinicHeaders(ORG_ID, "doctor", "dr-vitaly"),
				"content-type": "application/dicom",
			},
			payload: sampleBuf,
		});

		if (response.statusCode !== 200) {
			console.error("RESPONSE ERROR BODY:", response.body);
		}
		assert.strictEqual(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.status, "stored");
		assert.strictEqual(body.patientId, PATIENT_ID);

		// Verify that storagePath in DB is strictly a relative normalized path without C:\
		assert.ok(insertedStudyValues, "Study record must be inserted");
		assert.ok(
			insertedStudyValues.storagePath.startsWith("uploads/dicom/"),
			`Storage path must be normalized relative: ${insertedStudyValues.storagePath}`,
		);
		assert.ok(
			!insertedStudyValues.storagePath.includes(":\\"),
			"No Windows drive letter in storage path",
		);
		assert.ok(
			!insertedStudyValues.storagePath.includes("C:"),
			"No C: in storage path",
		);

		// Verify doctor/staff tag propagation
		assert.ok(
			insertedStudyValues.sourceName.includes("STOW-RS"),
			"Source name must indicate STOW-RS",
		);
		assert.ok(
			insertedStudyValues.aiSummary.includes("dr-vitaly") ||
				insertedStudyValues.aiSummary.includes("Доктор Иванов") ||
				insertedStudyValues.aiSummary.includes("STOW-RS"),
		);
	});

	it("POST /api/dicomweb/studies supports streaming multipart/related payload", async (t) => {
		const app = await buildStowApp();

		let insertedStoragePath = "";

		setupDbMock(t, (vals) => {
			if (vals.storagePath) insertedStoragePath = vals.storagePath;
		});

		const boundary = "stow-multipart-boundary-12345";
		const sampleBuf = readFileSync(SAMPLE_DICOM_PATH);
		const multipartPayload = Buffer.concat([
			Buffer.from(`--${boundary}\r\nContent-Type: application/dicom\r\n\r\n`),
			sampleBuf,
			Buffer.from(`\r\n--${boundary}--`),
		]);

		const response = await app.inject({
			method: "POST",
			url: `/api/dicomweb/studies?patientId=${PATIENT_ID}`,
			headers: {
				...clinicHeaders(ORG_ID, "doctor"),
				"content-type": `multipart/related; type="application/dicom"; boundary=${boundary}`,
			},
			payload: multipartPayload,
		});

		assert.strictEqual(response.statusCode, 200);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.status, "stored");
		assert.ok(insertedStoragePath.startsWith("uploads/dicom/"));
	});
});

import assert from "node:assert";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import type { TestContext } from "node:test";
import { describe, it } from "node:test";
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
	resolveStowBinding,
	stripMultipartWrapperFromBuffer,
} from "./dicomwebStow.js";

const SAMPLE_DICOM_URL = fileURLToPath(
	new URL("../../../../.data/dicom/test.dcm", import.meta.url),
);

const ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const PATIENT_ID = "99999999-9999-4999-8999-999999999999";

const SAMPLE_STUDY_UID = "1.3.6.1.4.1.5962.1.2.2.20040826185059.5457";
const SAMPLE_SERIES_UID = "1.3.6.1.4.1.5962.1.3.2.1.20040826185059.5457";
const SAMPLE_SOP_UID = "1.3.6.1.4.1.5962.1.1.2.1.2.20040826185059.5457";

interface InsertedDicomPayload {
	title?: string;
	storagePath?: string;
	dicomSopInstanceUid?: string;
	sourceName?: string;
	aiSummary?: string;
}

interface PatientStubRow {
	id: string;
	mergedIntoPatientId: string | null;
	fullName?: string;
}

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

async function loadBinaryDicomFixture(): Promise<Buffer> {
	return fs.readFile(SAMPLE_DICOM_URL);
}

describe("DICOMweb STOW-RS & Patient Resolution Inquisitor Suite (6G Live SUT)", () => {
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

	it("parseDicomBufferForStow extracts tags and patient info from valid DICOM sample", async () => {
		assert.strictEqual(existsSync(SAMPLE_DICOM_URL), true);
		const buffer = await loadBinaryDicomFixture();
		const parsed = parseDicomBufferForStow(buffer);

		assert.strictEqual(parsed.studyUid, SAMPLE_STUDY_UID);
		assert.strictEqual(parsed.seriesUid, SAMPLE_SERIES_UID);
		assert.strictEqual(parsed.sopInstanceUid, SAMPLE_SOP_UID);
		assert.ok(parsed.rows !== null && parsed.rows > 0);
		assert.ok(parsed.columns !== null && parsed.columns > 0);
	});

	it("resolveStowBinding returns patient on explicit valid patientId", async (t) => {
		const select = () => ({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([{ id: PATIENT_ID, mergedIntoPatientId: null, fullName: "Тестовый Пациент" }]),
				}),
			}),
		});
		t.mock.method(db, "select", select);
		t.mock.method(dbRaw, "transaction", async (cb: (tx: unknown) => unknown) =>
			cb({ select, execute: () => Promise.resolve([]) }),
		);

		const resolved = await resolveStowBinding(ORG_ID, PATIENT_ID, {});

		assert.ok(resolved);
		assert.strictEqual(resolved.resolvedPatientId, PATIENT_ID);
		assert.strictEqual(resolved.matchMethod, "explicit");
		assert.strictEqual(resolved.bindingStatus, "manual_bound");
	});

	it("resolveStowBinding returns unassigned when explicit patientId is not found (NEVER guesses)", async (t) => {
		const select = () => ({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([]),
				}),
			}),
		});
		t.mock.method(db, "select", select);
		t.mock.method(dbRaw, "transaction", async (cb: (tx: unknown) => unknown) =>
			cb({ select, execute: () => Promise.resolve([]) }),
		);

		const resolved = await resolveStowBinding(ORG_ID, "00000000-0000-0000-0000-000000000000", {});

		assert.strictEqual(resolved.resolvedPatientId, null);
		assert.strictEqual(resolved.bindingStatus, "unassigned");
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
		onInsert?: (vals: InsertedDicomPayload) => void,
		patientsList: PatientStubRow[] = [{ id: PATIENT_ID, mergedIntoPatientId: null }],
	) {
		const select = () => {
			let currentTable: unknown = null;
			const node: {
				from: (tbl: unknown) => typeof node;
				where: () => typeof node;
				limit: () => Promise<unknown[]>;
				then: (onfulfilled?: ((value: unknown[]) => unknown) | null) => Promise<unknown>;
			} = {
				from: (tbl: unknown) => {
					currentTable = tbl;
					return node;
				},
				where: () => node,
				limit: () => {
					if (currentTable === schema.organizations) {
						return Promise.resolve([{ id: ORG_ID }]);
					}
					if (currentTable === schema.patients) {
						return Promise.resolve(patientsList);
					}
					return Promise.resolve([]);
				},
				then: (onfulfilled) => {
					if (currentTable === schema.organizations) {
						return Promise.resolve([{ id: ORG_ID }]).then(onfulfilled ?? undefined);
					}
					if (currentTable === schema.patients) {
						return Promise.resolve(patientsList).then(onfulfilled ?? undefined);
					}
					return Promise.resolve([]).then(onfulfilled ?? undefined);
				},
			};
			return node;
		};

		const insert = () => {
			const node = {
				values: (vals: InsertedDicomPayload) => {
					onInsert?.(vals);
					return node;
				},
				returning: () => Promise.resolve([{ id: "generated-uuid-id" }]),
			};
			return node;
		};

		const update = () => {
			const node = {
				set: () => node,
				where: () => Promise.resolve([]),
			};
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

		let insertedStudyValues: InsertedDicomPayload | null = null;
		setupDbMock(
			t,
			(vals) => {
				if (vals.title?.includes("КЛКТ")) {
					insertedStudyValues = vals;
				}
			},
			[],
		);

		const sampleBuf = await loadBinaryDicomFixture();

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
		const body = JSON.parse(response.body) as { status?: string; bindingStatus?: string; patientId?: string | null };
		assert.strictEqual(body.status, "stored");
		assert.strictEqual(body.bindingStatus, "unassigned");
		assert.strictEqual(body.patientId, null);
		assert.ok(insertedStudyValues !== null);
		await app.close();
	});

	it("POST /api/dicomweb/studies saves with relative normalized path uploads/dicom/... when explicit patientId provided", async (t) => {
		const app = await buildStowApp();

		let insertedStudyValues: InsertedDicomPayload | null = null;

		setupDbMock(t, (vals) => {
			if (vals.title?.includes("КЛКТ")) {
				insertedStudyValues = vals;
			}
		});

		const sampleBuf = await loadBinaryDicomFixture();

		const response = await app.inject({
			method: "POST",
			url: `/api/dicomweb/studies?patientId=${PATIENT_ID}`,
			headers: {
				...clinicHeaders(ORG_ID, "doctor", "dr-vitaly"),
				"content-type": "application/dicom",
			},
			payload: sampleBuf,
		});

		assert.strictEqual(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as { status?: string; patientId?: string };
		assert.strictEqual(body.status, "stored");
		assert.strictEqual(body.patientId, PATIENT_ID);

		assert.ok(insertedStudyValues !== null, "Study record must be inserted");
		const studyRecord = insertedStudyValues as InsertedDicomPayload;
		assert.strictEqual(
			studyRecord.storagePath?.startsWith("uploads/dicom/"),
			true,
			`Storage path must be normalized relative: ${studyRecord.storagePath ?? ""}`,
		);
		assert.strictEqual(studyRecord.storagePath?.includes(":\\"), false, "No Windows drive letter in storage path");
		assert.strictEqual(studyRecord.storagePath?.includes("C:"), false, "No C: in storage path");

		assert.strictEqual(studyRecord.sourceName?.includes("STOW-RS"), true, "Source name must indicate STOW-RS");
		assert.strictEqual(
			Boolean(
				studyRecord.aiSummary?.includes("dr-vitaly") ||
					studyRecord.aiSummary?.includes("Доктор Иванов") ||
					studyRecord.aiSummary?.includes("STOW-RS"),
			),
			true,
		);
		await app.close();
	});

	it("POST /api/dicomweb/studies supports streaming multipart/related payload", async (t) => {
		const app = await buildStowApp();

		let insertedStoragePath = "";

		setupDbMock(t, (vals) => {
			if (vals.storagePath) insertedStoragePath = vals.storagePath;
		});

		const boundary = "stow-multipart-boundary-12345";
		const sampleBuf = await loadBinaryDicomFixture();
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
		const body = JSON.parse(response.body) as { status?: string };
		assert.strictEqual(body.status, "stored");
		assert.strictEqual(insertedStoragePath.startsWith("uploads/dicom/"), true);
		await app.close();
	});
});

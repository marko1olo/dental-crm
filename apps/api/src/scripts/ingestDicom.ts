import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import dicomParser from "dicom-parser";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	imagingInstances,
	imagingSeries,
	imagingStudies,
} from "../db/schema.js";

export async function parseAndIngestDicomFile(
	filePath: string,
	organizationId: string,
	patientId: string,
) {
	try {
		const buffer = await fs.readFile(filePath);
		const dicomData = dicomParser.parseDicom(new Uint8Array(buffer));

		// Extract Metadata
		const dicomStudyUid = dicomData.string("x0020000d"); // Study Instance UID
		const dicomSeriesUid = dicomData.string("x0020000e"); // Series Instance UID
		const dicomSopInstanceUid = dicomData.string("x00080018"); // SOP Instance UID
		const seriesNumber = parseInt(dicomData.string("x00200011") || "1");
		const instanceNumber = parseInt(dicomData.string("x00200013") || "1");
		const rows = dicomData.uint16("x00280010");
		const columns = dicomData.uint16("x00280011");
		const sopClassUid = dicomData.string("x00080016");
		const modality = dicomData.string("x00080060");

		if (!dicomStudyUid || !dicomSeriesUid || !dicomSopInstanceUid) {
			console.warn(`[Skip] Missing vital UID in DICOM file: ${filePath}`);
			return;
		}

		console.log(
			`[Ingest] Processing Instance: ${dicomSopInstanceUid} (Study: ${dicomStudyUid})`,
		);

		// In a real flow, we'd use DB transactions to upsert Study -> Series -> Instance
		// Since we don't have a live postgres, we'll just demonstrate the queries:

		const studyId = randomUUID();
		const seriesId = randomUUID();
		const instanceId = randomUUID();

		await db
			.insert(imagingStudies)
			.values({
				id: studyId,
				organizationId,
				patientId,
				kind: "cbct",
				title: "CT Scan",
				capturedAt: new Date(),
				sourceKind: "dicom_file",
				sourceName: "ingestDicom.ts",
				dicomStudyUid,
			})
			.onConflictDoNothing();

		console.log(`[Ingest] Inserted Study: ${studyId}`);

		await db
			.insert(imagingSeries)
			.values({
				id: seriesId,
				organizationId,
				studyId,
				dicomSeriesUid,
				seriesNumber,
				modality,
			})
			.onConflictDoNothing();

		console.log(`[Ingest] Inserted Series: ${seriesId}`);

		await db
			.insert(imagingInstances)
			.values({
				id: instanceId,
				organizationId,
				seriesId,
				dicomSopInstanceUid,
				instanceNumber,
				sopClassUid,
				storagePath: filePath,
				rows,
				columns,
			})
			.onConflictDoNothing();

		console.log(`[Ingest] Inserted Instance: ${instanceId}`);

		const instance = await db
			.select()
			.from(imagingInstances)
			.where(eq(imagingInstances.dicomSopInstanceUid, dicomSopInstanceUid))
			.limit(1);

		console.log(`[Verify] Found Instance in DB:`, instance.length > 0);
	} catch (error) {
		console.error(`[Error] Failed to process ${filePath}:`, error);
	}
}

// Run immediately for script execution
const filePath =
	process.argv[2] || path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
console.log(`\nStarting DICOM Ingestion for: ${filePath}\n`);
parseAndIngestDicomFile(filePath, randomUUID(), randomUUID());

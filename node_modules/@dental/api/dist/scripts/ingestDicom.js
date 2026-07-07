import * as fs from "node:fs/promises";
import * as path from "node:path";
import dicomParser from "dicom-parser";
import { db } from "../db/client.js";
import { imagingInstances, imagingSeries, imagingStudies } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
export async function parseAndIngestDicomFile(filePath, organizationId, patientId) {
    try {
        const buffer = await fs.readFile(filePath);
        const dicomData = dicomParser.parseDicom(new Uint8Array(buffer));
        // Extract Metadata
        const dicomStudyUid = dicomData.string('x0020000d'); // Study Instance UID
        const dicomSeriesUid = dicomData.string('x0020000e'); // Series Instance UID
        const dicomSopInstanceUid = dicomData.string('x00080018'); // SOP Instance UID
        const seriesNumber = parseInt(dicomData.string('x00200011') || "1");
        const instanceNumber = parseInt(dicomData.string('x00200013') || "1");
        const rows = dicomData.uint16('x00280010');
        const columns = dicomData.uint16('x00280011');
        const sopClassUid = dicomData.string('x00080016');
        const modality = dicomData.string('x00080060');
        if (!dicomStudyUid || !dicomSeriesUid || !dicomSopInstanceUid) {
            console.warn(`[Skip] Missing vital UID in DICOM file: ${filePath}`);
            return;
        }
        console.log(`[Ingest] Processing Instance: ${dicomSopInstanceUid} (Study: ${dicomStudyUid})`);
        // In a real flow, we'd use DB transactions to upsert Study -> Series -> Instance
        // Since we don't have a live postgres, we'll just demonstrate the queries:
        const insertStudyQuery = db.insert(imagingStudies).values({
            id: randomUUID(),
            organizationId,
            patientId,
            kind: "cbct",
            title: "CT Scan",
            capturedAt: new Date(),
            sourceKind: "dicom_file",
            sourceName: "ingestDicom.ts",
            dicomStudyUid
        }).onConflictDoNothing();
        console.log("[Query] Insert Study:\n", insertStudyQuery.toSQL());
        const insertSeriesQuery = db.insert(imagingSeries).values({
            id: randomUUID(),
            organizationId,
            studyId: randomUUID(), // mock
            dicomSeriesUid,
            seriesNumber,
            modality
        }).onConflictDoNothing();
        console.log("[Query] Insert Series:\n", insertSeriesQuery.toSQL());
        const insertInstanceQuery = db.insert(imagingInstances).values({
            id: randomUUID(),
            organizationId,
            seriesId: randomUUID(), // mock
            dicomSopInstanceUid,
            instanceNumber,
            sopClassUid,
            storagePath: filePath,
            rows,
            columns
        }).onConflictDoNothing();
        console.log("[Query] Insert Instance:\n", insertInstanceQuery.toSQL());
        // Demonstration of an indexed query on the instance
        const findInstanceQuery = db.select()
            .from(imagingInstances)
            .where(eq(imagingInstances.dicomSopInstanceUid, dicomSopInstanceUid));
        console.log("\n[Query] Find Instance (Should use Index `imaging_instances_uid_idx`):");
        console.log(findInstanceQuery.toSQL());
        // Demonstration of EXPLAIN ANALYZE wrapper:
        console.log("\n[EXPLAIN ANALYZE Mocking] Since Postgres is offline (ECONNREFUSED 127.0.0.1:5432), we cannot execute the real EXPLAIN.");
        console.log("If it was online, we would run:");
        console.log(`EXPLAIN ANALYZE ${findInstanceQuery.toSQL().sql.replace(/\$1/g, `'${dicomSopInstanceUid}'`)}`);
    }
    catch (error) {
        console.error(`[Error] Failed to process ${filePath}:`, error);
    }
}
// Run immediately for script execution
const filePath = process.argv[2] || path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
console.log(`\nStarting DICOM Ingestion for: ${filePath}\n`);
parseAndIngestDicomFile(filePath, randomUUID(), randomUUID());

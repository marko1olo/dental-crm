import { PGlite } from "@electric-sql/pglite";
import * as path from "path";

async function run() {
    const dbPath = path.resolve(process.cwd(), "dente-db");
    const db = new PGlite(dbPath);
    await db.waitReady;
    try {
        await db.exec('ALTER TABLE "generated_documents" DROP CONSTRAINT "generated_documents_visit_patient_organization_fk" CASCADE;');
    } catch(e) { /* ignore expected error if constraint does not exist */ }
    try {
        await db.exec('ALTER TABLE "visits" DROP CONSTRAINT "visits_id_patient_organization_unique" CASCADE;');
    } catch(e) { /* ignore expected error if constraint does not exist */ }
}
run();

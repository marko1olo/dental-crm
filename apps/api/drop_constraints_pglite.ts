import { PGlite } from "@electric-sql/pglite";
import * as path from "path";

async function run() {
    const dbPath = path.resolve(process.cwd(), "dente-db");
    const db = new PGlite(dbPath);
    await db.waitReady;
    try {
        await db.exec('ALTER TABLE "generated_documents" DROP CONSTRAINT "generated_documents_visit_patient_organization_fk" CASCADE;');
        console.log('Dropped generated_documents_visit_patient_organization_fk');
    } catch(e) { console.error(e.message); }
    try {
        await db.exec('ALTER TABLE "visits" DROP CONSTRAINT "visits_id_patient_organization_unique" CASCADE;');
        console.log('Dropped visits_id_patient_organization_unique');
    } catch(e) { console.error(e.message); }
    console.log("Done");
}
run();

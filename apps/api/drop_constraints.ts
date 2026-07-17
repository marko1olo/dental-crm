import pg from "pg";
const { Client } = pg;
const client = new Client({ connectionString: "postgres://dental:dental@127.0.0.1:5432/dental_crm" });
client.connect().then(async () => {
    try {
        await client.query('ALTER TABLE "generated_documents" DROP CONSTRAINT "generated_documents_visit_patient_organization_fk" CASCADE;');
        console.log('Dropped generated_documents_visit_patient_organization_fk');
    } catch(e) { console.error(e.message); }
    try {
        await client.query('ALTER TABLE "visits" DROP CONSTRAINT "visits_id_patient_organization_unique" CASCADE;');
        console.log('Dropped visits_id_patient_organization_unique');
    } catch(e) { console.error(e.message); }
    console.log("Done");
}).finally(() => client.end());

import { PGlite } from '@electric-sql/pglite';
import path from 'path';

async function run() {
  const dbPath = path.resolve('./dente-db');
  console.log("Connecting to:", dbPath);
  const db = new PGlite(dbPath);
  await db.waitReady;
  
  try {
    await db.exec(`
      ALTER TABLE "organizations" ADD COLUMN "ai_enable_treatment_plan" boolean DEFAULT true NOT NULL;
      ALTER TABLE "organizations" ADD COLUMN "ai_enable_recommendations" boolean DEFAULT true NOT NULL;
      ALTER TABLE "organizations" ADD COLUMN "ai_enable_documents" boolean DEFAULT true NOT NULL;
    `);
    console.log("Successfully added AI columns!");
  } catch (e) {
    console.error("Error modifying table:", e.message);
  } finally {
    await db.close();
  }
}

run();

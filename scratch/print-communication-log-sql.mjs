/**
 * Read-only. Печатает SQL, который реально уходит в PostgreSQL из
 * services/patients/patientCommunicationLog.ts. Нужно для проверки ловушки
 * drizzle: в коррелированном подзапросе голое "id" связалось бы с внутренней
 * таблицей (a.patient_id = a.id) — валидный SQL, всегда ложь, пустой экран.
 *
 * Запуск из корня репозитория:
 *   node --import tsx scratch/print-communication-log-sql.mjs
 */
import {
	buildPatientCommunicationEntriesQuery,
	buildPatientCommunicationTotalsQuery,
} from "../apps/api/src/services/patients/patientCommunicationLog.ts";
import { pool } from "../apps/api/src/db/client.ts";

const ORG = "cc110000-0000-4000-8000-0000000000a1";
const PATIENT = "cc110000-0000-4000-8000-0000000000b1";

const entries = buildPatientCommunicationEntriesQuery(ORG, PATIENT, 100).toSQL();
console.log("=== ENTRIES SQL ===");
console.log(entries.sql);
console.log("params:", entries.params);

const totals = buildPatientCommunicationTotalsQuery(ORG, PATIENT).toSQL();
console.log("\n=== TOTALS SQL ===");
console.log(totals.sql);
console.log("params:", totals.params);

await pool.end();

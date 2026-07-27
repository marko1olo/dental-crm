/**
 * Проверка пакета C2. Бьёт по уже запущенному dev-серверу, читает строку обратно
 * SQL-запросом и удаляет за собой созданную строку.
 *
 * ЗАПУСКАТЬ ТОЛЬКО ИЗ apps/api:
 *   cd apps/api && node --import tsx ../../.agents/archon/packets/C2-clinical-not-persisted/proof.ts
 *
 * Почему именно оттуда: AUTH_TOKEN_SECRET лежит в apps/api/.env, а loadServerEnv читает
 * cwd/.env ПЕРВЫМ. Из корня репозитория токен подпишется другим секретом, и сервер ответит
 * 401 — не потому, что роут сломан.
 */
import { sql } from "drizzle-orm";
import { db, pool } from "../../../../apps/api/src/db/client.js";
import { authTokenSecret } from "../../../../apps/api/src/security/authSecret.js";
import { signToken } from "../../../../apps/api/src/utils/cryptoHelper.js";

const EXPECTED_TITLE = "Этап II: передача в ортопедию";
const base = `http://127.0.0.1:${process.env.PORT ?? process.env.API_PORT ?? "4100"}`;

async function main() {
  const row = (
    await db.execute(sql`SELECT id, organization_id FROM patients ORDER BY created_at ASC NULLS LAST LIMIT 1`)
  ).rows[0] as { id: string; organization_id: string };
  const organizationId = String(row.organization_id);
  const patientId = String(row.id);
  console.log("org =", organizationId, "patient =", patientId);

  const token = signToken({ organizationId }, authTokenSecret());
  const adminSecret = process.env.DENTE_CLINICAL_ADMIN_SECRET?.trim();
  console.log("clinical admin secret configured:", Boolean(adminSecret));
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-dente-clinic-token": token,
  };
  if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;

  const postRes = await fetch(`${base}/api/clinical/phase-completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId,
      completedPhaseCode: "PHASE_1_THERAPY",
      notes: "апи-проверка C2",
      toothCodes: ["11", "12"],
    }),
  });
  const created = (await postRes.json()) as Record<string, unknown>;
  console.log("POST /api/clinical/phase-completions ->", postRes.status);
  console.log("  body:", JSON.stringify(created));
  console.log("  titleMatchesExpectedRussian:", created.title === EXPECTED_TITLE);

  const taskId = String(created.id ?? "");
  if (!taskId || postRes.status !== 201) {
    console.log("POST did not create a task; stopping before DB read.");
    await pool.end();
    return;
  }

  const dbRow = (await db.execute(sql`SELECT * FROM clinical_tasks WHERE id = ${taskId}::uuid`)).rows[0] as
    | Record<string, unknown>
    | undefined;
  console.log("SQL SELECT * FROM clinical_tasks WHERE id =", taskId);
  console.log("  row found:", Boolean(dbRow));
  if (dbRow) {
    console.log("  organization_id:", String(dbRow.organization_id));
    console.log("  patient_id:", String(dbRow.patient_id));
    console.log("  task_type:", String(dbRow.task_type));
    console.log("  status:", String(dbRow.status));
    console.log("  created_at:", String(dbRow.created_at));
    console.log("  title bytes(base64):", Buffer.from(String(dbRow.title), "utf8").toString("base64"));
    console.log("  titleMatchesExpectedRussian:", String(dbRow.title) === EXPECTED_TITLE);
  }

  const getRes = await fetch(`${base}/api/clinical/tasks?patientId=${patientId}`, { headers });
  const list = (await getRes.json()) as Array<Record<string, unknown>>;
  console.log("GET /api/clinical/tasks?patientId=... ->", getRes.status, "count =", list.length);
  console.log("  contains created task:", list.some((t) => t.id === taskId));

  const getRes2 = await fetch(`${base}/api/clinical/tasks?patientId=${patientId}`, { headers });
  const list2 = (await getRes2.json()) as Array<Record<string, unknown>>;
  console.log("SECOND GET ->", getRes2.status, "still contains created task:", list2.some((t) => t.id === taskId));

  const dupRes = await fetch(`${base}/api/clinical/phase-completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId,
      completedPhaseCode: "PHASE_1_THERAPY",
      notes: "апи-проверка C2",
      toothCodes: ["11", "12"],
    }),
  });
  const dup = (await dupRes.json()) as Record<string, unknown>;
  console.log("DUPLICATE POST ->", dupRes.status, "same id:", dup.id === taskId);

  const badRes = await fetch(`${base}/api/clinical/phase-completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ patientId, completedPhaseCode: "NOPE" }),
  });
  console.log("POST unknown phase ->", badRes.status);

  const noAuth = await fetch(`${base}/api/clinical/tasks`);
  console.log("GET without token ->", noAuth.status);

  await db.execute(sql`DELETE FROM clinical_tasks WHERE id = ${taskId}::uuid`);
  const left = (await db.execute(sql`SELECT count(*)::int AS n FROM clinical_tasks`)).rows[0] as { n: number };
  console.log("cleanup done; clinical_tasks rowcount now:", left.n);
  await pool.end();
}

main().catch(async (error) => {
  console.error("PROOF FAILED:", error);
  await pool.end();
  process.exit(1);
});

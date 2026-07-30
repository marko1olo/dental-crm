/**
 * Замер: DENTAL_STATE_PERSISTENCE=off уважают не все модули apps/api/src/db.
 *
 * Один прогон, одна организация, один и тот же токен кабинета. Маршруты:
 *   GET /api/patients                        -> patientsQuery   (флаг УВАЖАЕТ)
 *   GET /api/documents/:id/html              -> documentQuery   (флаг ИГНОРИРУЕТ)
 *   GET /api/patients/:id/reclamations       -> patientReclamationsQuery (флаг ИГНОРИРУЕТ)
 *
 * ВАЖНО ПРО ПОРЯДОК. Все импорты здесь динамические. Статический import в ESM
 * поднимается выше тела модуля, поэтому при `import ... from` присваивание
 * process.env ниже выполнилось бы ПОСЛЕ вычисления sampleData/persistentState —
 * флаг не увидели бы, состояние восстановилось бы из .data и фикстуры в памяти
 * оказались бы пустыми. Замерено на первой версии этого файла.
 *
 * Только чтение. Ни одной строки в базу не пишется.
 */
process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
process.env.AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET ?? "dev-auth-token-secret-for-tests";

const ORG = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";

async function main() {
  const { createRequire } = await import("node:module");
  const path = (await import("node:path")).default;
  const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
  const Fastify = requireFromApi("fastify") as typeof import("fastify").default;

  const { signToken } = await import("../apps/api/src/utils/cryptoHelper.js");
  const { documents, patients } = await import("../apps/api/src/sampleData.js");

  const secret = process.env.AUTH_TOKEN_SECRET as string;
  const token = signToken(
    { organizationId: ORG, userId: "8356141b-7cfa-4221-95f7-70f47e7344b1", role: "owner" },
    secret,
  );
  const headers = { "x-dente-clinic-token": token, "x-dente-staff-token": token };

  const app = Fastify({ logger: false });
  const { registerPatientRoutes } = await import("../apps/api/src/routes/patients.js");
  const { registerDocumentRoutes } = await import("../apps/api/src/routes/documents.js");
  await registerPatientRoutes(app);
  await registerDocumentRoutes(app);
  await app.ready();

  console.log(`FLAG DENTAL_STATE_PERSISTENCE=${JSON.stringify(process.env.DENTAL_STATE_PERSISTENCE)}`);
  console.log(`in-memory fixtures: patients=${patients.length} documents=${documents.length}`);
  const fixtureDoc = documents[0];
  console.log(`fixture document id = ${fixtureDoc?.id}`);
  console.log(`fixture patient  id = ${patients[0]?.id}`);
  console.log("");

  const a = await app.inject({ method: "GET", url: "/api/patients", headers });
  let aCount = "n/a";
  try {
    aCount = String((JSON.parse(a.body) as unknown[]).length);
  } catch {
    /* ответ не массив */
  }
  console.log(`[RESPECTS FLAG] GET /api/patients                     -> ${a.statusCode} rows=${aCount}`);

  const b = await app.inject({ method: "GET", url: `/api/documents/${fixtureDoc?.id}/html`, headers });
  console.log(`[IGNORES  FLAG] GET /api/documents/<fixture>/html      -> ${b.statusCode} ${b.body.slice(0, 200)}`);

  const c = await app.inject({
    method: "GET",
    url: `/api/patients/${patients[0]?.id}/reclamations`,
    headers,
  });
  console.log(`[IGNORES  FLAG] GET /api/patients/<fixture>/reclamations -> ${c.statusCode} ${c.body.slice(0, 200)}`);

  await app.close();
}

main().catch((e) => {
  console.error("PROBE FAILED:", e);
  process.exit(1);
});

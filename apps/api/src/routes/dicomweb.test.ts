import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { test } from "node:test";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { db } from "../db/client.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerDicomwebRoutes } from "./dicomweb.js";

/**
 * Тесты ничего не пишут на диск и не ходят в PostgreSQL: db.select подменяется
 * через t.mock.method, как в db/billingQuery.test.ts.
 *
 * Раньше здесь был один тест на CORS, и он создавал ".data/dicom/test.dcm" по
 * пути path.resolve(process.cwd(), "../../.data/dicom"), затирая файл из
 * репозитория: вместо снимка на 121 КБ оставалось 19 байт "dummy dicom
 * content". Прогон тестов портил рабочее дерево. Теперь путь к образцу
 * передаётся через DENTE_DICOM_SAMPLE_PATH и указывает на существующий файл.
 */

const SAMPLE_DICOM_PATH = fileURLToPath(new URL("../../../../.data/dicom/test.dcm", import.meta.url));

/**
 * Подлинные идентификаторы, физически записанные в образце (публичный набор
 * DICOM «CompressedSamples^CT2»). Значения зафиксированы намеренно: если файл
 * подменят, тест обязан упасть, а не подстроиться под новое содержимое.
 */
const SAMPLE_STUDY_UID = "1.3.6.1.4.1.5962.1.2.2.20040826185059.5457";
const SAMPLE_SERIES_UID = "1.3.6.1.4.1.5962.1.3.2.1.20040826185059.5457";
const SAMPLE_SOP_UID = "1.3.6.1.4.1.5962.1.1.2.1.2.20040826185059.5457";
const SAMPLE_BYTES = 121356;

const ORGANIZATION_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const OTHER_STORAGE_PATH = fileURLToPath(new URL("./dicomweb.test.ts", import.meta.url));

process.env.DENTE_DICOM_SAMPLE_PATH = SAMPLE_DICOM_PATH;
// Гейт клинического чтения проверяется отдельно в accessGuard; здесь он не
// должен зависеть от того, что лежит в окружении разработчика.
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

assert.ok(
  existsSync(SAMPLE_DICOM_PATH),
  `Образец DICOM отсутствует: ${SAMPLE_DICOM_PATH}. Без него проверять нечего.`
);
assert.strictEqual(readFileSync(SAMPLE_DICOM_PATH).length, SAMPLE_BYTES);

type SelectRow = Record<string, unknown>;

/**
 * Заглушка цепочки drizzle: .from().innerJoin().innerJoin().where().limit().
 * Каждый вызов db.select() забирает следующий набор строк из очереди, потому
 * что маршрут делает два разных запроса — по объекту и по исследованию.
 */
function mockSelectQueue(t: { mock: { method: Function } }, queue: SelectRow[][]): void {
  let call = 0;
  t.mock.method(db, "select", () => {
    const rows = queue[call] ?? [];
    call += 1;
    const node: Record<string, unknown> = {};
    node.from = () => node;
    node.innerJoin = () => node;
    node.where = () => node;
    node.limit = async () => rows;
    return node;
  });
}

async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify();
  await app.register(cors, { origin: "http://example.com" });
  await registerDicomwebRoutes(app);
  return app;
}

function clinicHeaders(): Record<string, string> {
  return { "x-dente-clinic-token": signToken({ organizationId: ORGANIZATION_ID }, authTokenSecret()) };
}

function instanceUrl(studyUid: string, seriesUid: string, instanceUid: string): string {
  return `/api/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}`;
}

test("выдуманный UID больше не получает байты снимка", async (t) => {
  mockSelectQueue(t, [[], []]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl("1", "1", "1"),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 404);
  assert.ok(!(response.headers["content-type"] ?? "").includes("application/dicom"));
  assert.strictEqual(response.json().error, "DicomInstanceNotFound");

  await app.close();
});

test("образец отдаётся только под своими собственными UID", async (t) => {
  mockSelectQueue(t, [[], []]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.headers["content-type"], "application/dicom");
  assert.strictEqual(response.rawPayload.length, SAMPLE_BYTES);
  assert.strictEqual(response.rawPayload.subarray(128, 132).toString("latin1"), "DICM");

  await app.close();
});

test("верный UID исследования с чужой серией не отдаёт снимок", async (t) => {
  mockSelectQueue(t, [[], []]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, "1.2.3.чужая.серия", SAMPLE_SOP_UID),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.json().error, "DicomInstanceNotFound");

  await app.close();
});

test("верные UID исследования и серии с чужим объектом не отдают снимок", async (t) => {
  mockSelectQueue(t, [[], []]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, "9.9.9.чужой.объект"),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.json().error, "DicomInstanceNotFound");

  await app.close();
});

test("строка imaging_instances отдаёт файл именно по своему storage_path", async (t) => {
  // UID запроса не встречаются в самом файле: если бы маршрут проверял байты,
  // ответ был бы 404. Двести означает, что сработала именно ветка базы —
  // индекс объектов, единственный путь, пригодный для многокадровых томов.
  mockSelectQueue(t, [[{ storagePath: SAMPLE_DICOM_PATH }]]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl("1.2.826.0.1.3680043.8.498.1", "1.2.826.0.1.3680043.8.498.2", "1.2.826.0.1.3680043.8.498.3"),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.headers["content-type"], "application/dicom");
  assert.strictEqual(response.rawPayload.length, SAMPLE_BYTES);

  await app.close();
});

test("storage_path исследования не отдаётся, если байты не подтверждают серию и объект", async (t) => {
  // Ветка исследования: строка подтверждает только UID исследования. Файл
  // указан не-DICOM, значит подтвердить серию и объект нечем — 404.
  mockSelectQueue(t, [[], [{ storagePath: OTHER_STORAGE_PATH }]]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl("1.2.826.0.1.3680043.8.498.10", "1.2.826.0.1.3680043.8.498.11", "1.2.826.0.1.3680043.8.498.12"),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.json().error, "DicomInstanceNotFound");

  await app.close();
});

test("storage_path исследования отдаётся, когда байты подтверждают все три UID", async (t) => {
  mockSelectQueue(t, [[], [{ storagePath: SAMPLE_DICOM_PATH }]]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.rawPayload.length, SAMPLE_BYTES);

  await app.close();
});

test("без токена клиники снимок не выдаётся", async (t) => {
  mockSelectQueue(t, [[], []]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID)
  });

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.json().error, "AuthRequired");

  await app.close();
});

/**
 * Для проверки заголовка файл не нужен: @fastify/cors выставляет
 * Access-Control-Allow-Origin на уровне хука, то есть и на 200, и на 404.
 * Проверяется главное — что обработчик не подменяет политику звёздочкой.
 */
test("DICOM route does not return wildcard CORS", async (t) => {
  mockSelectQueue(t, [[], []]);
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: { ...clinicHeaders(), origin: "http://example.com" }
  });

  assert.strictEqual(response.headers["access-control-allow-origin"], "http://example.com");
  assert.notStrictEqual(response.headers["access-control-allow-origin"], "*");

  await app.close();
});

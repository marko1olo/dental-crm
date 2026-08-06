import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { test } from "node:test";
import type { TestContext } from "node:test";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { db, dbRaw } from "../db/client.js";
import * as schema from "../db/schema.js";
import { denteAdminSecretHeader } from "../accessGuard.js";
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
/** Вторая клиника той же установки: существует в базе, владельцем образца не является. */
const OTHER_ORGANIZATION_ID = "11111111-2222-4333-8444-555555555555";
/**
 * UUID, которого нет ни в одной строке organizations. Именно это значение
 * ревьюер подписал в пробе H и получил 200 и 121356 байт медицинских данных.
 */
const MISSING_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000000";
/** Строка, которую PostgreSQL не приведёт к типу uuid: до базы дойти не должна. */
const MALFORMED_ORGANIZATION_ID = "not-a-uuid-at-all";

const OTHER_STORAGE_PATH = fileURLToPath(new URL("./dicomweb.test.ts", import.meta.url));

/**
 * Секрет администратора для проверки гейта клинического чтения генерируется на
 * каждый прогон: в репозитории не остаётся ни одной секретной строки, а
 * сравнение в timingSafeSecretEqual проверяется на настоящем значении, а не на
 * константе, которую можно было бы случайно захардкодить и в коде гейта.
 */
const ADMIN_GATE_PROBE = randomBytes(24).toString("base64url");

process.env.DENTE_DICOM_SAMPLE_PATH = SAMPLE_DICOM_PATH;
// Образец теперь принадлежит конкретной организации. Без этой переменной ветки
// образца нет ни для кого — отказ по умолчанию проверяется отдельным тестом.
process.env.DENTE_DICOM_SAMPLE_ORGANIZATION_ID = ORGANIZATION_ID;
// По умолчанию гейт клинического чтения выключен, чтобы остальные тесты
// проверяли арендную изоляцию, а не наличие секрета в окружении разработчика.
// Тесты гейта включают его сами.
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

assert.ok(
  existsSync(SAMPLE_DICOM_PATH),
  `Образец DICOM отсутствует: ${SAMPLE_DICOM_PATH}. Без него проверять нечего.`
);
assert.strictEqual(readFileSync(SAMPLE_DICOM_PATH).length, SAMPLE_BYTES);

type SelectRow = Record<string, unknown>;

interface DbFixture {
  /** Строки organizations. Пустой массив = организации с таким id не существует. */
  organizations?: SelectRow[];
  /** Строки ветки imaging_instances (индекс объектов). */
  instances?: SelectRow[];
  /** Строки ветки imaging_studies (storage_path исследования). */
  studies?: SelectRow[];
  /** Если задано — db.select бросает это исключение: имитация недоступной базы. */
  failure?: Error;
}

/** Организация, которая действительно есть в базе. */
function existingOrganization(organizationId: string = ORGANIZATION_ID): SelectRow[] {
  return [{ id: organizationId }];
}

/**
 * Заглушка цепочки drizzle: .from().innerJoin().where().limit().
 *
 * Строки выбираются по таблице из .from(), а не по номеру вызова. Позиционная
 * очередь ломалась при добавлении любого нового запроса: маршрут теперь делает
 * до трёх обращений (organizations, imaging_instances, imaging_studies), и тест,
 * привязанный к порядку, молча проверял бы не ту ветку.
 *
 * Возвращает счётчик вызовов: он нужен, чтобы доказать, что заведомо неверный
 * идентификатор организации в базу не отправляется вовсе.
 */
function mockDb(t: TestContext, fixture: DbFixture): { calls: number } {
  const counter = { calls: 0 };
  const select = () => {
    counter.calls += 1;
    if (fixture.failure) throw fixture.failure;
    let table: unknown = null;
    const node: Record<string, unknown> = {};
    node.from = (source: unknown) => {
      table = source;
      return node;
    };
    node.innerJoin = () => node;
    node.where = () => node;
    node.limit = async () => {
      if (table === schema.organizations) return fixture.organizations ?? [];
      if (table === schema.imagingInstances) return fixture.instances ?? [];
      if (table === schema.imagingStudies) return fixture.studies ?? [];
      throw new Error("Маршрут dicomweb запросил таблицу, которой нет в фикстуре теста");
    };
    return node;
  };
  t.mock.method(db, "select", select);
  /*
   * ЗАЧЕМ ЗАГЛУШКА dbRaw.transaction, А НЕ ТОЛЬКО db.select.
   *
   * Маршрут больше не полагается на автоматическую обёртку server.ts и открывает
   * контекст арендатора сам (withTenantCtx), чтобы не держать транзакцию всё
   * время передачи снимка. Как только транзакция открыта, прокси `db`
   * (db/client.ts) отдаёт свойства ТРАНЗАКЦИИ, а не dbRaw — и подмена
   * `db.select` перестаёт действовать: запрос ушёл бы в настоящий PostgreSQL,
   * которого у этого файла нет и быть не должно.
   *
   * Здесь подменяется сама транзакция: withTenantCtx получает объект с
   * `execute` (его он зовёт для set_config) и с тем же `select`, что и раньше.
   * Обещание файла «в PostgreSQL не ходим» сохранено, а проверяется настоящий
   * код маршрута вместе с его контекстом арендатора.
   */
  t.mock.method(dbRaw, "transaction", async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({ execute: async () => ({ rows: [] }), select })
  );
  return counter;
}

async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify();
  await app.register(cors, { origin: "http://example.com" });
  await registerDicomwebRoutes(app);
  return app;
}

function clinicHeaders(organizationId: string = ORGANIZATION_ID): Record<string, string> {
  return { "x-dente-clinic-token": signToken({ organizationId }, authTokenSecret()) };
}

function instanceUrl(studyUid: string, seriesUid: string, instanceUid: string): string {
  return `/api/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}`;
}

/** Включает настоящий гейт клинического чтения на время одного теста. */
function enableClinicalReadGate(t: TestContext): void {
  process.env.DENTE_CLINICAL_ADMIN_SECRET = ADMIN_GATE_PROBE;
  t.after(() => {
    delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
  });
}

/** Снимает владельца образца на время одного теста. */
function clearSampleOwner(t: TestContext): void {
  const previous = process.env.DENTE_DICOM_SAMPLE_ORGANIZATION_ID;
  delete process.env.DENTE_DICOM_SAMPLE_ORGANIZATION_ID;
  t.after(() => {
    if (previous === undefined) return;
    process.env.DENTE_DICOM_SAMPLE_ORGANIZATION_ID = previous;
  });
}

/** Ни один отказ не имеет права нести байты DICOM. */
function assertNoDicomBytes(response: { headers: Record<string, unknown>; rawPayload: Buffer }): void {
  assert.ok(!String(response.headers["content-type"] ?? "").includes("application/dicom"));
  assert.notStrictEqual(response.rawPayload.length, SAMPLE_BYTES);
}

test("выдуманный UID больше не получает байты снимка", async (t) => {
  mockDb(t, { organizations: existingOrganization() });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl("1", "1", "1"),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 404);
  assertNoDicomBytes(response);
  assert.strictEqual(response.json().error, "DicomInstanceNotFound");

  await app.close();
});

test("образец отдаётся организации-владельцу под её собственными UID", async (t) => {
  mockDb(t, { organizations: existingOrganization() });
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

test("вторая клиника установки не получает демонстрационный снимок владельца", async (t) => {
  // Проба G ревьюера: подписанный токен ДРУГОЙ организации + подлинные UID
  // образца давали 200 application/dicom и 121356 байт. Организация в базе есть,
  // владельцем образца она не является — байтов быть не должно.
  mockDb(t, { organizations: existingOrganization(OTHER_ORGANIZATION_ID) });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: clinicHeaders(OTHER_ORGANIZATION_ID)
  });

  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.json().error, "DicomInstanceNotFound");
  assertNoDicomBytes(response);

  await app.close();
});

test("организации, которой нет в базе, снимок не выдаётся", async (t) => {
  // Проба H ревьюера: токен с UUID, отсутствующим во всех строках organizations,
  // получал 200 и 121356 байт. Подпись токена не доказывает существование
  // арендатора — теперь это проверяется запросом к organizations.
  mockDb(t, { organizations: [] });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: clinicHeaders(MISSING_ORGANIZATION_ID)
  });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error, "OrganizationUnknown");
  assertNoDicomBytes(response);

  await app.close();
});

test("идентификатор организации не в формате UUID отклоняется без обращения к базе", async (t) => {
  // organizations.id — колонка uuid. Строка неверного формата, отданная в
  // сравнение, вызвала бы ошибку 22P02 и ответ 500 вместо честного отказа.
  const dbCalls = mockDb(t, { organizations: existingOrganization() });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: clinicHeaders(MALFORMED_ORGANIZATION_ID)
  });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error, "OrganizationUnknown");
  assert.strictEqual(dbCalls.calls, 0);
  assertNoDicomBytes(response);

  await app.close();
});

test("без назначенного владельца образец не отдаётся никому", async (t) => {
  clearSampleOwner(t);
  mockDb(t, { organizations: existingOrganization() });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.json().error, "DicomInstanceNotFound");
  assertNoDicomBytes(response);

  await app.close();
});

test("недоступная база не превращается в вывод «такой организации нет»", async (t) => {
  // Разница принципиальная: 403 OrganizationUnknown — проверенный факт, 503 —
  // признание, что проверить не удалось. Подставлять первое вместо второго
  // значило бы выдавать выдумку за проверку.
  mockDb(t, { failure: new Error("соединение с PostgreSQL потеряно") });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 503);
  assert.strictEqual(response.json().error, "OrganizationCheckUnavailable");
  assertNoDicomBytes(response);

  await app.close();
});

test("гейт клинического чтения отказывает токену клиники без секрета администратора", async (t) => {
  // Этот путь не исполнялся ни одним тестом и ни одним запросом к живому
  // серверу: и тесты, и apps/api/.env держат DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1
  // при пустом секрете, поэтому accessGuard возвращал true безусловно. Здесь
  // секрет задан, значит послабление не действует и гейт работает по-настоящему.
  enableClinicalReadGate(t);
  mockDb(t, { organizations: existingOrganization() });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: clinicHeaders()
  });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error, "ClinicalReadSecretRequired");
  assert.strictEqual(response.json().protectedArea, "dicom instance read");
  assertNoDicomBytes(response);

  await app.close();
});

test("гейт клинического чтения с верным секретом администратора отдаёт снимок владельцу", async (t) => {
  enableClinicalReadGate(t);
  mockDb(t, { organizations: existingOrganization() });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: { ...clinicHeaders(), [denteAdminSecretHeader]: ADMIN_GATE_PROBE }
  });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.headers["content-type"], "application/dicom");
  assert.strictEqual(response.rawPayload.length, SAMPLE_BYTES);
  assert.strictEqual(response.rawPayload.subarray(128, 132).toString("latin1"), "DICM");

  await app.close();
});

test("гейт клинического чтения отказывает при неверном секрете администратора", async (t) => {
  enableClinicalReadGate(t);
  mockDb(t, { organizations: existingOrganization() });
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: instanceUrl(SAMPLE_STUDY_UID, SAMPLE_SERIES_UID, SAMPLE_SOP_UID),
    headers: { ...clinicHeaders(), [denteAdminSecretHeader]: `${ADMIN_GATE_PROBE}x` }
  });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error, "ClinicalReadSecretRequired");
  assertNoDicomBytes(response);

  await app.close();
});

test("верный UID исследования с чужой серией не отдаёт снимок", async (t) => {
  mockDb(t, { organizations: existingOrganization() });
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
  mockDb(t, { organizations: existingOrganization() });
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
  mockDb(t, {
    organizations: existingOrganization(),
    instances: [{ storagePath: SAMPLE_DICOM_PATH }]
  });
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
  mockDb(t, {
    organizations: existingOrganization(),
    studies: [{ storagePath: OTHER_STORAGE_PATH }]
  });
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
  mockDb(t, {
    organizations: existingOrganization(),
    studies: [{ storagePath: SAMPLE_DICOM_PATH }]
  });
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
  mockDb(t, { organizations: existingOrganization() });
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
  mockDb(t, { organizations: existingOrganization() });
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

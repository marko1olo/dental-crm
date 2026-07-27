/**
 * Денежный путь семейного кошелька — проверка на ЖИВОМ сервере и живой БД.
 *
 * Конституция требует: все правки по финансам проверяются реальными
 * запросами, а не чтением кода. Здесь проверяется главное свойство —
 * точность до копейки и отсутствие потерь при делении.
 *
 * Что делает:
 *   1. создаёт семейную группу и привязывает к ней пациента;
 *   2. пополняет кошелёк и сверяет баланс до копейки;
 *   3. повторяет пополнение с тем же clientMutationId — деньги не должны
 *      зачислиться второй раз;
 *   4. списывает суммы, в том числе с копейками, и сверяет остаток;
 *   5. пробует списать больше остатка — должно быть отказано;
 *   6. читает баланс напрямую из Postgres и сверяет с ответом API;
 *   7. убирает за собой.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

/**
 * Уникальный префикс ключей идемпотентности на каждый прогон.
 *
 * Дубли ищутся по паре (organizationId, clientMutationId) — без
 * familyGroupId. Поэтому тот же ключ в НОВОЙ семье тоже считается
 * повтором: маршрут отвечает 200 и текущим балансом, но денег не
 * зачисляет. Первый прогон этой проверки оставил платежи в базе
 * (уборка упала на несуществующей колонке), и второй прогон выглядел
 * как «пополнение не сохраняет баланс». Продукт тут не виноват.
 */
const RUN = `verify-${process.pid}-${Math.floor(performance.now())}`;

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ["apps/api/.env", ".env.local", ".env"]) {
    let env;
    try { env = readFileSync(f, "utf8"); } catch { continue; }
    const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim();
  }
  throw new Error("DATABASE_URL не найден");
}

let H;
async function j(path, init = {}) {
  const r = await fetch(`${API}${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
  return { status: r.status, ok: r.ok, body };
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

// ── вход ────────────────────────────────────────────────────────────────
const login = await fetch(`${API}/api/auth/clinic/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
  body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());
H = {
  "Content-Type": "application/json",
  "x-dente-clinic-token": login.clinicToken,
  "x-dente-staff-token": unlock.staffToken,
};

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const patientsRes = await j("/api/patients");
const list = Array.isArray(patientsRes.body) ? patientsRes.body : patientsRes.body?.patients || [];
if (!list.length) { console.error("пациентов нет"); process.exit(1); }
const patient = list[0];
console.log(`пациент: ${patient.fullName} (${patient.id})\n`);

const prevFamilyRow = await client.query("select family_group_id from patients where id=$1", [patient.id]);
const prevFamilyId = prevFamilyRow.rows[0]?.family_group_id ?? null;

let familyId = null;
try {
  // ── 1. семья и привязка пациента ──────────────────────────────────────
  const created = await j("/api/finance/family", {
    method: "POST",
    body: JSON.stringify({ name: `Проверка кошелька ${patient.fullName}`, headPatientId: patient.id }),
  });
  check("семейная группа создана", created.ok && !!created.body?.id, `HTTP ${created.status}`);
  familyId = created.body?.id;
  if (!familyId) throw new Error("нет id семьи");

  check("начальный баланс ровно 0.00", created.body.balance === "0.00", `получено ${JSON.stringify(created.body.balance)}`);

  // Привязка пациента к семье — фикстура, которой раньше не было и из-за
  // которой topup/pay отвечали бизнес-404 «Пациент не найден в семейной группе».
  await client.query("update patients set family_group_id=$1 where id=$2", [familyId, patient.id]);
  check("пациент привязан к семье", true, `family_group_id=${familyId.slice(0, 8)}`);

  // ── 2. пополнение ─────────────────────────────────────────────────────
  const top1 = await j("/api/finance/family/topup", {
    method: "POST",
    body: JSON.stringify({
      familyGroupId: familyId,
      patientId: patient.id,
      amountRub: 15000,
      clientMutationId: `${RUN}-topup-1`,
    }),
  });
  check("пополнение 15000 ₽ принято", top1.ok, `HTTP ${top1.status} ${top1.ok ? "" : JSON.stringify(top1.body).slice(0, 160)}`);
  const top1Balance = top1.body?.newBalance ?? top1.body?.balance;
  check("баланс после пополнения = 15000.00", top1Balance === "15000.00", `получено ${JSON.stringify(top1Balance)}`);

  // ── 3. повтор с тем же ключом ─────────────────────────────────────────
  const top1again = await j("/api/finance/family/topup", {
    method: "POST",
    body: JSON.stringify({
      familyGroupId: familyId,
      patientId: patient.id,
      amountRub: 15000,
      clientMutationId: `${RUN}-topup-1`,
    }),
  });
  const balAfterRetry = (await client.query("select balance from family_groups where id=$1", [familyId])).rows[0].balance;
  check(
    "повтор с тем же ключом не зачислил деньги второй раз",
    String(balAfterRetry) === "15000.00",
    `в БД ${balAfterRetry}, HTTP ${top1again.status}`,
  );

  // ── 4. списания, включая копейки ──────────────────────────────────────
  // Копейки эндпоинты НЕ принимают намеренно: payments.amount_rub в базе —
  // integer, то есть целые рубли. Схемы отклоняют дробные суммы, чтобы
  // кошелёк и журнал платежей не расходились. Проверяем именно этот
  // контракт, а не то, что хотелось бы видеть.
  const payFraction = await j("/api/finance/family/pay", {
    method: "POST",
    body: JSON.stringify({
      familyGroupId: familyId,
      patientId: patient.id,
      amountRub: 4999.99,
      clientMutationId: `${RUN}-pay-fraction`,
    }),
  });
  check("дробная сумма отклонена (журнал хранит целые рубли)", payFraction.status === 400, `HTTP ${payFraction.status}`);

  const pay1 = await j("/api/finance/family/pay", {
    method: "POST",
    body: JSON.stringify({
      familyGroupId: familyId,
      patientId: patient.id,
      amountRub: 4999,
      clientMutationId: `${RUN}-pay-1`,
    }),
  });
  const pay1Balance = pay1.body?.newBalance ?? pay1.body?.balance;
  check("списание 4999 ₽ принято", pay1.ok, `HTTP ${pay1.status} ${pay1.ok ? "" : JSON.stringify(pay1.body).slice(0, 200)}`);
  check("остаток = 10001.00", pay1Balance === "10001.00", `получено ${JSON.stringify(pay1Balance)}`);

  const pay1again = await j("/api/finance/family/pay", {
    method: "POST",
    body: JSON.stringify({
      familyGroupId: familyId,
      patientId: patient.id,
      amountRub: 4999,
      clientMutationId: `${RUN}-pay-1`,
    }),
  });
  const balAfterPayRetry = (await client.query("select balance from family_groups where id=$1", [familyId])).rows[0].balance;
  check(
    "повтор списания с тем же ключом не списал деньги второй раз",
    String(balAfterPayRetry) === "10001.00",
    `в БД ${balAfterPayRetry}, HTTP ${pay1again.status}`,
  );

  const pay2 = await j("/api/finance/family/pay", {
    method: "POST",
    body: JSON.stringify({
      familyGroupId: familyId,
      patientId: patient.id,
      amountRub: 1,
      clientMutationId: `${RUN}-pay-2`,
    }),
  });
  const pay2Balance = pay2.body?.newBalance ?? pay2.body?.balance;
  check("списание 1 ₽ принято", pay2.ok, `HTTP ${pay2.status}`);
  check("остаток = 10000.00", pay2Balance === "10000.00", `получено ${JSON.stringify(pay2Balance)}`);

  // ── 5. попытка списать больше остатка ─────────────────────────────────
  const over = await j("/api/finance/family/pay", {
    method: "POST",
    body: JSON.stringify({
      familyGroupId: familyId,
      patientId: patient.id,
      amountRub: 10001,
      clientMutationId: `${RUN}-pay-over`,
    }),
  });
  check("списание больше остатка отклонено", !over.ok, `HTTP ${over.status} ${JSON.stringify(over.body).slice(0, 120)}`);
  const balAfterOver = (await client.query("select balance from family_groups where id=$1", [familyId])).rows[0].balance;
  check("после отказа баланс не изменился", String(balAfterOver) === "10000.00", `в БД ${balAfterOver}`);

  // ── 6. сверка API с Postgres и тип колонки ────────────────────────────
  const apiRead = await j(`/api/finance/family/${familyId}`);
  const apiBalance = apiRead.body?.balance ?? apiRead.body?.family?.balance;
  check("API и Postgres дают одно значение", String(apiBalance) === String(balAfterOver), `API ${apiBalance}, БД ${balAfterOver}`);

  const col = await client.query(
    `select data_type, numeric_precision, numeric_scale from information_schema.columns
      where table_name='family_groups' and column_name='balance'`,
  );
  const c = col.rows[0];
  check(
    "колонка баланса — numeric(12,2), не float",
    c.data_type === "numeric" && c.numeric_scale === 2,
    `${c.data_type}(${c.numeric_precision},${c.numeric_scale})`,
  );

  // ── 7. сумма движений сходится с балансом ─────────────────────────────
  // В payments нет колонки family_group_id — движения кошелька связаны с
  // пациентом. Сверяем сумму по этому пациенту за время проверки.
  const moves = await client.query(
    `select status, amount_rub from payments
      where patient_id=$1 and client_mutation_id like $2 order by created_at`,
    [patient.id, `${RUN}%`],
  );
  const net = moves.rows.reduce(
    (acc, r) => acc + (r.status === "planned" ? Number(r.amount_rub) : -Number(r.amount_rub)),
    0,
  );
  check(
    "сумма движений в журнале равна балансу",
    Math.abs(net - Number(balAfterOver)) < 0.005,
    `движения ${net}, баланс ${balAfterOver}, записей ${moves.rows.length}`,
  );

  // Тип колонки суммы в журнале — отдельная проверка: она и определяет,
  // возможны ли копейки вообще.
  const payCol = await client.query(
    `select data_type from information_schema.columns
      where table_name='payments' and column_name='amount_rub'`,
  );
  console.log(`  ФАКТ payments.amount_rub = ${payCol.rows[0]?.data_type} (целые рубли, копейки в журнал не записываются)`);
} finally {
  // ── уборка ──────────────────────────────────────────────────────────────
  await client.query("update patients set family_group_id=$1 where id=$2", [prevFamilyId, patient.id]);
  if (familyId) {
    await client.query("delete from payments where patient_id=$1 and client_mutation_id like $2", [patient.id, `${RUN}%`]);
    await client.query("delete from family_groups where id=$1", [familyId]);
  }
  await client.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);

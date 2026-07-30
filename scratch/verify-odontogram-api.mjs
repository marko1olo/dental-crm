/**
 * Проверяет, что зубная формула действительно СОХРАНЯЕТСЯ через живой API:
 * создаёт пациента, пишет состояния зубов, читает их обратно новым запросом.
 *
 * Именно это и было сломано в интерфейсе: прежний компонент писал в локальный
 * стор, поэтому отметки исчезали при перезагрузке.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const repoEnv = readFileSync(".env", "utf8");
const apiEnv = readFileSync("apps/api/.env", "utf8");

const pick = (text, key) => {
	const line = text.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
	return line ? line.slice(key.length + 1).trim() : null;
};

const databaseUrl = pick(repoEnv, "DATABASE_URL");
const adminSecret =
	pick(apiEnv, "DENTE_CLINICAL_ADMIN_SECRET") ??
	pick(repoEnv, "DENTE_CLINICAL_ADMIN_SECRET");
if (!adminSecret) throw new Error("DENTE_CLINICAL_ADMIN_SECRET не найден");

const API = "http://127.0.0.1:4100";
const headers = {
	"content-type": "application/json",
	"x-dente-admin-secret": adminSecret,
};

const c = new pg.Client({ connectionString: databaseUrl });
await c.connect();

// Организация и пациент нужны, потому что маршрут проверяет принадлежность.
const org = await c.query(
	`insert into organizations (name) values ('Одонтограмма — проверка') returning id`,
);
const orgId = org.rows[0].id;
const patient = await c.query(
	`insert into patients (organization_id, full_name, status)
	 values ($1, 'Проверочный Пациент', 'active') returning id`,
	[orgId],
);
const patientId = patient.rows[0].id;
console.log(`организация: ${orgId}`);
console.log(`пациент    : ${patientId}`);

const show = async (label) => {
	const res = await fetch(`${API}/api/patients/${patientId}/tooth-states`, {
		headers,
	});
	const body = await res.json().catch(() => null);
	console.log(
		`${label}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`,
	);
	return body;
};

await show("до записи   ");

const saveRes = await fetch(
	`${API}/api/patients/${patientId}/tooth-states/batch`,
	{
		method: "POST",
		headers,
		body: JSON.stringify({
			organizationId: orgId,
			states: [
				{ toothNumber: 36, state: "Caries", surfaces: ["O", "M"] },
				{ toothNumber: 11, state: "Crown", surfaces: [] },
			],
		}),
	},
);
console.log(
	`запись      : HTTP ${saveRes.status} ${JSON.stringify(await saveRes.json().catch(() => null)).slice(0, 200)}`,
);

const after = await show("после записи");

const tooth36 = after?.states?.find((s) => s.toothNumber === 36);
console.log(
	`\nзуб 36 сохранён: ${tooth36 ? `ДА (${tooth36.state}, поверхности ${JSON.stringify(tooth36.surfaces)})` : "НЕТ"}`,
);

// История зуба — та самая таблица, из-за которой падали миграции на чистой базе.
const history = await c.query(
	`select tooth_number, previous_state, new_state from tooth_state_history
	 where patient_id = $1 order by changed_at`,
	[patientId],
);
console.log(`записей в истории зуба: ${history.rows.length}`);
for (const row of history.rows) {
	console.log(
		`  зуб ${row.tooth_number}: ${row.previous_state ?? "—"} -> ${row.new_state}`,
	);
}

await c.query(`delete from tooth_state_history where patient_id = $1`, [patientId]);
await c.query(`delete from tooth_states where patient_id = $1`, [patientId]);
await c.query(`delete from patients where id = $1`, [patientId]);
await c.query(`delete from organizations where id = $1`, [orgId]);
await c.end();

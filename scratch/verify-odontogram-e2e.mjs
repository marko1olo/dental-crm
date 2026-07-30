/**
 * Сквозная проверка: сохраняется ли зубная формула через настоящий вход.
 *
 * Это то, что было сломано в интерфейсе: подключённый ранее
 * components/Odontogram.tsx писал состояния в локальный Zustand-стор и не
 * обращался к серверу, поэтому отметки исчезали при перезагрузке, а стор был
 * общий на всех пациентов.
 *
 * Учётные данные — те, что печатает штатный apps/api/src/scripts/seedAuth.ts
 * для локальной разработки. В коммит этот файл не идёт.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = "http://127.0.0.1:4100";
const databaseUrl = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

const post = (path, body, headers = {}) =>
	fetch(`${API}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});

// 1. Вход в кабинет клиники.
const clinicRes = await post("/api/auth/clinic/login", {
	email: "clinic@example.com",
	password: "dente2026",
});
const { clinicToken, clinicProfile } = await clinicRes.json();
const orgId = clinicProfile.organizationId;
console.log(`вход в кабинет : HTTP ${clinicRes.status}, организация ${orgId}`);

const c = new pg.Client({ connectionString: databaseUrl });
await c.connect();

// 2. Вход сотрудника: батч-сохранение требует именно сотрудника, а не только
//    токен кабинета (requireResolvedStaffOrAdminOrganizationId).
const staff = await c.query(
	`select id, full_name from users
	 where organization_id = $1 and is_active = true and pin_code_hash is not null
	 order by full_name limit 1`,
	[orgId],
);
const staffUser = staff.rows[0];

let staffToken = null;
for (const pin of ["0000", "1234"]) {
	const res = await post(
		"/api/auth/staff/unlock",
		{ userId: staffUser.id, pinCode: pin },
		{ "x-dente-clinic-token": clinicToken },
	);
	if (res.ok) {
		staffToken = (await res.json()).staffToken;
		console.log(`вход сотрудника: HTTP ${res.status}, ${staffUser.full_name}`);
		break;
	}
}
if (!staffToken) throw new Error("не удалось войти сотрудником");

const authHeaders = {
	"x-dente-clinic-token": clinicToken,
	"x-dente-staff-token": staffToken,
};

// 3. Пациент, которому принадлежит формула.
const patient = await c.query(
	`insert into patients (organization_id, full_name, status)
	 values ($1, 'Проверка Одонтограммы', 'active') returning id`,
	[orgId],
);
const patientId = patient.rows[0].id;
console.log(`пациент        : ${patientId}`);

const readStates = async (label) => {
	const res = await fetch(`${API}/api/patients/${patientId}/tooth-states`, {
		headers: authHeaders,
	});
	const body = await res.json().catch(() => null);
	console.log(`${label}: HTTP ${res.status}, состояний ${body?.states?.length ?? "?"}`);
	return body;
};

await readStates("до записи      ");

// 4. Сохранение — то, чего прежний компонент не делал вовсе.
//    Контракт: один статус на набор зубов (это и есть мультивыбор в интерфейсе).
const save = async (toothNumbers, state, surfaces) => {
	const res = await post(
		`/api/patients/${patientId}/tooth-states/batch`,
		{ toothNumbers, state, ...(surfaces ? { surfaces } : {}) },
		authHeaders,
	);
	const body = await res.json().catch(() => null);
	console.log(
		`сохранение ${JSON.stringify(toothNumbers)} -> ${state}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 120)}`,
	);
};

await save([36], "Caries", ["O", "M"]);
await save([11], "Crown");

// 5. Чтение НОВЫМ запросом — так же, как после перезагрузки страницы.
const after = await readStates("после записи   ");
const tooth36 = after?.states?.find((s) => s.toothNumber === 36);
const tooth11 = after?.states?.find((s) => s.toothNumber === 11);
console.log("");
console.log(
	`зуб 36: ${tooth36 ? `${tooth36.state}, поверхности ${JSON.stringify(tooth36.surfaces)}` : "НЕ СОХРАНЁН"}`,
);
console.log(`зуб 11: ${tooth11 ? tooth11.state : "НЕ СОХРАНЁН"}`);

// 6. История зуба — таблица, из-за которой падали миграции на чистой базе.
const history = await c.query(
	`select tooth_number, previous_state, new_state from tooth_state_history
	 where patient_id = $1 order by tooth_number`,
	[patientId],
);
console.log(`\nзаписей в истории зуба: ${history.rows.length}`);
for (const r of history.rows) {
	console.log(`  зуб ${r.tooth_number}: ${r.previous_state ?? "—"} -> ${r.new_state}`);
}

await c.query(`delete from tooth_state_history where patient_id = $1`, [patientId]);
await c.query(`delete from tooth_states where patient_id = $1`, [patientId]);
await c.query(`delete from patients where id = $1`, [patientId]);
await c.end();
console.log("\nвременные данные удалены");

/** Несколько пациентов в засеянную организацию, чтобы интерфейс было чем наполнить. */
import { readFileSync } from "node:fs";
import pg from "pg";

const url = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

const c = new pg.Client({ connectionString: url });
await c.connect();

const org = await c.query(
	`select id from organizations order by created_at limit 1`,
);
const orgId = org.rows[0].id;

const people = [
	["Смирнова Ольга Петровна", "1988-04-12", "+79161234567"],
	["Абдуллаев Тимур Рустамович", "1975-11-03", "+79167654321"],
	["Ковальчук Дмитрий Игоревич", "1996-02-25", "+79165551122"],
];

for (const [fullName, birthDate, phone] of people) {
	const existing = await c.query(
		`select id from patients where organization_id = $1 and full_name = $2`,
		[orgId, fullName],
	);
	if (existing.rows.length > 0) {
		console.log(`уже есть: ${fullName}`);
		continue;
	}
	const r = await c.query(
		`insert into patients (organization_id, full_name, birth_date, phone, status)
		 values ($1, $2, $3, $4, 'active') returning id`,
		[orgId, fullName, birthDate, phone],
	);
	console.log(`создан  : ${fullName} -> ${r.rows[0].id}`);
}

const total = await c.query(
	`select count(*)::int n from patients where organization_id = $1`,
	[orgId],
);
console.log(`\nвсего пациентов в организации: ${total.rows[0].n}`);
console.log(`организация: ${orgId}`);
await c.end();

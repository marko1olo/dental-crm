/**
 * Проверяет приём оплаты на живом API при двойном нажатии.
 *
 * В базе есть уникальный индекс (organization_id, client_mutation_id),
 * поэтому двух платежей быть не должно. Но маршрут сначала ищет платёж по
 * ключу, и только потом вставляет — двумя запросами вне транзакции. При
 * одновременных запросах оба видят «платежа нет», оба вставляют, и второй
 * получает нарушение уникальности. Вопрос: что видит кассир — спокойный
 * повтор или ошибку сервера при том, что деньги приняты.
 *
 * Проверяем: в базе ровно один платёж, и ни один ответ не является 5xx.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

function envValue(key) {
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith(`${key}=`));
	return line ? line.slice(key.length + 1).trim() : null;
}

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

const H = {
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};
// Маршрут кассы охраняется секретом клинических мутаций.
const clinicalSecret = envValue("DENTE_CLINICAL_MUTATION_SECRET") || envValue("DENTE_ADMIN_SECRET");
if (clinicalSecret) H["x-dente-admin-secret"] = clinicalSecret;

const dash = await fetch(`${API}/api/dashboard`, { headers: H }).then((r) => r.json());
const patient = dash?.patients?.[0];
if (!patient) {
	console.error("в дашборде нет пациентов");
	process.exit(1);
}

const client = new pg.Client({ connectionString: envValue("DATABASE_URL") });
await client.connect();

const mutationId = `probe-payment-${Date.now()}-${process.pid}`;
const AMOUNT = 777;

async function pay() {
	const res = await fetch(`${API}/api/billing/payments`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			patientId: patient.id,
			amountRub: AMOUNT,
			method: "card",
			clientMutationId: mutationId,
		}),
	});
	const body = await res.json().catch(() => ({}));
	return { status: res.status, body };
}

async function countPayments() {
	const r = await client.query(`select count(*)::int as n from payments where client_mutation_id = $1`, [mutationId]);
	return r.rows[0].n;
}

try {
	console.log(`пациент ${patient.fullName}, ключ ${mutationId}\n`);

	console.log("1. Два одновременных запроса с одним ключом идемпотентности");
	const [a, b] = await Promise.all([pay(), pay()]);
	const statuses = `${a.status}/${b.status}`;
	const inDb = await countPayments();
	check("в базе ровно один платёж", inDb === 1, `платежей ${inDb}, ответы ${statuses}`);
	check(
		"ни один ответ не является ошибкой сервера",
		a.status < 500 && b.status < 500,
		`ответы ${statuses}` +
			(a.status >= 500 ? ` | первый: ${JSON.stringify(a.body).slice(0, 90)}` : "") +
			(b.status >= 500 ? ` | второй: ${JSON.stringify(b.body).slice(0, 90)}` : ""),
	);
	check("хотя бы один ответ успешен", a.status < 300 || b.status < 300, `ответы ${statuses}`);

	console.log("\n2. Повторный запрос тем же ключом позже");
	const again = await pay();
	const inDbAfter = await countPayments();
	check("повтор не создаёт второй платёж", inDbAfter === 1, `платежей ${inDbAfter}`);
	check("повтор отвечает успехом, а не ошибкой", again.status < 300, `HTTP ${again.status} ${JSON.stringify(again.body).slice(0, 90)}`);

	console.log("\n3. Контроль: другой ключ создаёт отдельный платёж");
	const otherId = `${mutationId}-other`;
	const other = await fetch(`${API}/api/billing/payments`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ patientId: patient.id, amountRub: AMOUNT, method: "card", clientMutationId: otherId }),
	});
	const otherCount = Number(
		(await client.query(`select count(*)::int as n from payments where client_mutation_id = $1`, [otherId])).rows[0].n,
	);
	check("другой ключ даёт новый платёж", other.status < 300 && otherCount === 1, `HTTP ${other.status}, платежей ${otherCount}`);
	await client.query(`delete from payments where client_mutation_id = $1`, [otherId]).catch(() => {});
} finally {
	await client.query(`delete from payments where client_mutation_id = $1`, [mutationId]).catch(() => {});
	await client.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);

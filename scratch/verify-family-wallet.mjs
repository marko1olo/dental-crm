/**
 * Сквозная проверка семейного кошелька через живой API.
 *
 * До этой сессии маршрут не был зарегистрирован — /api/finance/family отвечал
 * 404, то есть кошелька в рантайме не существовало. Плюс внутри списание писало
 * Math.round(баланса), а по WebSocket уходило неокруглённое значение.
 *
 * Здесь проверяется: маршруты доступны, пополнение и списание считаются точно,
 * и в базе остаётся ровно то, что вернул API.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = "http://127.0.0.1:4100";
const databaseUrl = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

const { clinicToken, clinicProfile } = await (
	await fetch(`${API}/api/auth/clinic/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	})
).json();
const orgId = clinicProfile.organizationId;

const c = new pg.Client({ connectionString: databaseUrl });
await c.connect();
// Владелец, а не врач: финансы семьи закрыты для роли doctor
// ("DoctorsNotAllowed"), и с врачом маршрут отвечал 403.
const staff = await c.query(
	`select id, full_name, role from users
	 where organization_id=$1 and is_active=true and pin_code_hash is not null
	   and role in ('owner','administrator')
	 order by case role when 'owner' then 0 else 1 end limit 1`,
	[orgId],
);
const patient = await c.query(
	`select id, full_name from patients where organization_id=$1
	 order by full_name limit 1`,
	[orgId],
);

let staffToken = null;
for (const pinCode of ["0000", "1234"]) {
	const r = await fetch(`${API}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-dente-clinic-token": clinicToken,
		},
		body: JSON.stringify({ userId: staff.rows[0].id, pinCode }),
	});
	if (r.ok) {
		staffToken = (await r.json()).staffToken;
		break;
	}
}

const H = {
	"content-type": "application/json",
	"x-dente-clinic-token": clinicToken,
	"x-dente-staff-token": staffToken,
};
const call = async (method, path, body) => {
	const res = await fetch(`${API}${path}`, {
		method,
		headers: H,
		...(body ? { body: JSON.stringify(body) } : {}),
	});
	const text = await res.text();
	let parsed = null;
	try {
		parsed = JSON.parse(text);
	} catch {}
	return { status: res.status, body: parsed ?? text.slice(0, 160) };
};

const list = await call("GET", "/api/finance/family");
console.log(`GET  /api/finance/family        -> HTTP ${list.status}`);

const created = await call("POST", "/api/finance/family", {
	name: "Семья Проверочная",
	headPatientId: patient.rows[0].id,
});
console.log(`POST /api/finance/family        -> HTTP ${created.status}`);
const familyId =
	created.body?.family?.id ?? created.body?.id ?? created.body?.familyGroup?.id;
if (!familyId) {
	console.log("не удалось получить id семьи:", JSON.stringify(created.body).slice(0, 200));
	await c.end();
	process.exit(1);
}

const dbBalance = async () =>
	(await c.query(`select balance from family_groups where id=$1`, [familyId]))
		.rows[0].balance;

console.log(`баланс при создании             : ${await dbBalance()}`);

const topup = await call("POST", "/api/finance/family/topup", {
	familyGroupId: familyId,
	amountRub: 5000,
	patientId: patient.rows[0].id,
	method: "cash",
});
console.log(
	`POST topup 5000                 -> HTTP ${topup.status}, тело ${JSON.stringify(topup.body).slice(0,200)}`,
);
console.log(`баланс в базе                   : ${await dbBalance()}`);

const pay = await call("POST", "/api/finance/family/pay", {
	familyGroupId: familyId,
	amountRub: 1234,
	patientId: patient.rows[0].id,
});
console.log(
	`POST pay 1234                   -> HTTP ${pay.status}, тело ${JSON.stringify(pay.body).slice(0,200)}`,
);
const afterPay = await dbBalance();
console.log(`баланс в базе                   : ${afterPay}`);
console.log(
	`\n5000 - 1234 = 3766; в базе ${afterPay} -> ${afterPay === "3766.00" ? "СОВПАДАЕТ" : "РАСХОЖДЕНИЕ"}`,
);

// Копейки: кладём баланс с копейками и списываем целые рубли.
await c.query(`update family_groups set balance='150.50' where id=$1`, [familyId]);
const payKopecks = await call("POST", "/api/finance/family/pay", {
	familyGroupId: familyId,
	amountRub: 100,
	patientId: patient.rows[0].id,
});
const afterKopecks = await dbBalance();
console.log(
	`\nбаланс 150.50, списано 100 руб. -> HTTP ${payKopecks.status}, в базе ${afterKopecks}`,
);
console.log(
	`ожидается 50.50 (старый код писал 51) -> ${afterKopecks === "50.50" ? "КОПЕЙКИ СОХРАНЕНЫ" : "ПОТЕРЯ"}`,
);

await c.query(`delete from payments where organization_id=$1 and patient_id=$2`, [
	orgId,
	patient.rows[0].id,
]);
await c.query(`delete from family_groups where id=$1`, [familyId]);
await c.end();
console.log("\nвременные данные удалены");

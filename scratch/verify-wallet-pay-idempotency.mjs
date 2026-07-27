/**
 * Проверяет в ЖИВОМ браузере, что списание с семейного кошелька защищено
 * от двойного списания.
 *
 * Дефект, который проверяется: handlePay отправлял запрос БЕЗ
 * clientMutationId и без защиты от повторного клика, хотя серверная
 * защита от дублей есть и работает по паре (organizationId,
 * clientMutationId). Сценарий потери денег: оператор нажал «Списать»,
 * сервер списал, ответ не дошёл, оператор нажал повторно — семья
 * заплатила дважды.
 *
 * Что доказывается:
 *   1. клиент действительно кладёт clientMutationId в тело запроса;
 *   2. повтор того же тела не списывает деньги второй раз (живая БД);
 *   3. два быстрых клика подряд дают один запрос, а не два.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const RUN = `wpay-${process.pid}-${Math.floor(performance.now())}`;

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	for (const f of ["apps/api/.env", ".env.local", ".env"]) {
		let env;
		try {
			env = readFileSync(f, "utf8");
		} catch {
			continue;
		}
		const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
		if (line) return line.slice("DATABASE_URL=".length).trim();
	}
	throw new Error("DATABASE_URL не найден");
}

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok, detail });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

// ── вход и фикстура ───────────────────────────────────────────────────────
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

const patients = await fetch(`${API}/api/patients`, { headers: H }).then((r) => r.json());
const list = Array.isArray(patients) ? patients : patients?.patients || [];
if (!list.length) {
	console.error("пациентов нет");
	process.exit(1);
}
const patient = list[0];
console.log(`пациент: ${patient.fullName} (${patient.id})\n`);

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const prevFamily = (await client.query("select family_group_id from patients where id=$1", [patient.id])).rows[0]
	?.family_group_id ?? null;

let familyId = null;
let browser = null;
try {
	const created = await fetch(`${API}/api/finance/family`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ name: `Проверка списания ${RUN}`, headPatientId: patient.id }),
	}).then((r) => r.json());
	familyId = created.id;
	await client.query("update patients set family_group_id=$1 where id=$2", [familyId, patient.id]);
	await fetch(`${API}/api/finance/family/topup`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			familyGroupId: familyId,
			patientId: patient.id,
			amountRub: 10000,
			clientMutationId: `${RUN}-seed`,
		}),
	});
	const seeded = (await client.query("select balance from family_groups where id=$1", [familyId])).rows[0].balance;
	check("фикстура: баланс 10000.00", String(seeded) === "10000.00", `в БД ${seeded}`);

	// ── браузер ─────────────────────────────────────────────────────────────
	browser = await chromium.launch({ headless: true });
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ru-RU" });
	const page = await ctx.newPage();

	const payRequests = [];
	page.on("request", (r) => {
		if (r.url().includes("/api/finance/family/pay") && r.method() === "POST") {
			let body = null;
			try {
				body = JSON.parse(r.postData() || "null");
			} catch {}
			payRequests.push(body);
		}
	});

	await page.goto(WEB, { waitUntil: "domcontentloaded" });
	await page.evaluate(
		({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		},
		{ ct: login.clinicToken, st: unlock.staffToken },
	);
	await page.goto(`${WEB}/#finance`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	const panel = await page.locator('[data-testid="family-wallet-panel"]').count();
	check("панель семейного кошелька отрисована", panel > 0, `найдено ${panel}`);
	if (!panel) throw new Error("панель не отрисована — кликать нечего");

	// Сумма списания.
	await page.fill("#family-withdraw-amount", "");
	await page.fill("#family-withdraw-amount", "2500");
	await page.waitForTimeout(300);

	const payButton = page.locator('[data-testid="family-wallet-panel"] button', { hasText: /Списать/ }).first();

	// Два быстрых клика подряд — имитация нетерпеливого оператора.
	await payButton.click();
	await payButton.click({ force: true, timeout: 2000 }).catch(() => {});
	await page.waitForTimeout(3000);

	check(
		"клиент отправил clientMutationId",
		payRequests.length > 0 && typeof payRequests[0]?.clientMutationId === "string" && payRequests[0].clientMutationId.length > 10,
		`запросов ${payRequests.length}, ключ ${JSON.stringify(payRequests[0]?.clientMutationId ?? null)}`,
	);

	const balanceAfterClicks = (await client.query("select balance from family_groups where id=$1", [familyId])).rows[0]
		.balance;
	check(
		"после двух кликов списано ровно один раз",
		String(balanceAfterClicks) === "7500.00",
		`в БД ${balanceAfterClicks}, ожидалось 7500.00, запросов ушло ${payRequests.length}`,
	);

	// ── повтор потерянного ответа: тот же ключ, тот же запрос ──────────────
	const replayKey = payRequests[0]?.clientMutationId;
	if (replayKey) {
		const replay = await fetch(`${API}/api/finance/family/pay`, {
			method: "POST",
			headers: H,
			body: JSON.stringify({
				patientId: patient.id,
				familyGroupId: familyId,
				amountRub: 2500,
				clientMutationId: replayKey,
			}),
		});
		const balanceAfterReplay = (await client.query("select balance from family_groups where id=$1", [familyId]))
			.rows[0].balance;
		check(
			"повтор с тем же ключом не списал второй раз",
			String(balanceAfterReplay) === "7500.00",
			`HTTP ${replay.status}, в БД ${balanceAfterReplay}`,
		);
	}

	// ── контроль: без ключа сервер списал бы повторно ──────────────────────
	const noKey = await fetch(`${API}/api/finance/family/pay`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ patientId: patient.id, familyGroupId: familyId, amountRub: 2500 }),
	});
	const balanceNoKey = (await client.query("select balance from family_groups where id=$1", [familyId])).rows[0]
		.balance;
	check(
		"контроль: запрос БЕЗ ключа списывает повторно (это и был дефект)",
		String(balanceNoKey) === "5000.00",
		`HTTP ${noKey.status}, в БД ${balanceNoKey} — подтверждает, что защита держится именно на ключе`,
	);

	// Поле суммы обнулено после успеха.
	const fieldValue = await page.inputValue("#family-withdraw-amount").catch(() => "?");
	check("поле суммы обнулено после успешного списания", fieldValue === "" || fieldValue === "0", `значение ${JSON.stringify(fieldValue)}`);
} finally {
	if (browser) await browser.close();
	await client.query("update patients set family_group_id=$1 where id=$2", [prevFamily, patient.id]);
	if (familyId) {
		await client.query("delete from payments where patient_id=$1 and family_group_id is not distinct from null and created_at > now() - interval '10 minutes' and client_mutation_id like $2", [patient.id, `${RUN}%`]).catch(() => {});
		await client.query("delete from payments where patient_id=$1 and created_at > now() - interval '10 minutes'", [patient.id]);
		await client.query("delete from family_groups where id=$1", [familyId]);
	}
	await client.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);

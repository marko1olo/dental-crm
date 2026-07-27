/**
 * Доказывает, что живые обновления доходят до ИНТЕРФЕЙСА, а не только до
 * сокета: баланс семейного кошелька на открытой странице меняется после
 * пополнения, сделанного снаружи, без перезагрузки.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const RUN = `rtui-${process.pid}-${Math.floor(performance.now())}`;

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
const patient = list[0];

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
		body: JSON.stringify({ name: `Realtime UI ${RUN}`, headPatientId: patient.id }),
	}).then((r) => r.json());
	familyId = created.id;
	await client.query("update patients set family_group_id=$1 where id=$2", [familyId, patient.id]);
	await fetch(`${API}/api/finance/family/topup`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			familyGroupId: familyId,
			patientId: patient.id,
			amountRub: 1000,
			clientMutationId: `${RUN}-seed`,
		}),
	});

	browser = await chromium.launch({ headless: true });
	const page = await (
		await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "ru-RU" })
	).newPage();
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
	await page.waitForTimeout(5000);

	const balanceSel = ".family-wallet-balance";
	const readBalance = async () =>
		(await page.locator(balanceSel).count())
			? (await page.locator(balanceSel).first().innerText()).replace(/\s| /g, "")
			: "<нет>";

	const before = await readBalance();
	check("баланс отрисован до пополнения", before.includes("1000"), `показано «${before}»`);

	// Пополнение делается СНАРУЖИ, страница не трогается.
	const topup = await fetch(`${API}/api/finance/family/topup`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			familyGroupId: familyId,
			patientId: patient.id,
			amountRub: 4321,
			clientMutationId: `${RUN}-external`,
		}),
	});
	check("внешнее пополнение принято", topup.ok, `HTTP ${topup.status}`);

	// Анимация useCountUp занимает около секунды.
	await page.waitForTimeout(4000);
	const after = await readBalance();
	check(
		"баланс на открытой странице обновился БЕЗ перезагрузки",
		after.includes("5321"),
		`было «${before}», стало «${after}», ожидалось 5321.00`,
	);
} finally {
	if (browser) await browser.close();
	await client.query("update patients set family_group_id=$1 where id=$2", [prevFamily, patient.id]);
	if (familyId) {
		await client.query("delete from payments where patient_id=$1 and client_mutation_id like $2", [
			patient.id,
			`${RUN}%`,
		]);
		await client.query("delete from family_groups where id=$1", [familyId]);
	}
	await client.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);

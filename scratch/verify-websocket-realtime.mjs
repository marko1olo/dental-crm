/**
 * Сквозная проверка живых обновлений.
 *
 * Раньше эндпоинта /api/ws/schedule не существовало (HTTP 404 на
 * рукопожатии), wsBroker.addClient не вызывался ниоткуда, и все 27 вызовов
 * wsBroker.broadcast* рассылали сообщения в пустой набор клиентов.
 *
 * Здесь проверяется весь путь целиком:
 *   1. сокет открывается и авторизуется кадром AUTH;
 *   2. без токенов сервер закрывает соединение, а не подписывает;
 *   3. реальное пополнение кошелька через HTTP порождает уведомление,
 *      которое доходит до подписанного сокета;
 *   4. сумма в уведомлении совпадает с балансом в Postgres;
 *   5. PING получает PONG.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { WebSocket } from "ws";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WS = API.replace(/^http/, "ws") + "/api/ws/schedule";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const RUN = `wsrt-${process.pid}-${Math.floor(performance.now())}`;

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

// ── 1. сокет без токенов должен быть закрыт сервером ──────────────────────
await new Promise((resolve) => {
	const ws = new WebSocket(WS);
	let closedCode = null;
	const timer = setTimeout(() => {
		check("сокет без AUTH закрывается сервером", closedCode !== null, `код закрытия ${closedCode ?? "не закрыт за 13с"}`);
		try {
			ws.close();
		} catch {}
		resolve();
	}, 13_000);
	ws.on("close", (code) => {
		closedCode = code;
		clearTimeout(timer);
		check("сокет без AUTH закрывается сервером", code === 4408, `код закрытия ${code}`);
		resolve();
	});
	ws.on("error", () => {});
});

// ── 2. сокет с мусорным токеном не подписывается ──────────────────────────
await new Promise((resolve) => {
	const ws = new WebSocket(WS);
	let verdict = "нет ответа";
	const timer = setTimeout(() => {
		check("сокет с поддельным токеном не подписан", verdict !== "AUTH_OK", verdict);
		try {
			ws.close();
		} catch {}
		resolve();
	}, 6000);
	ws.on("open", () =>
		ws.send(JSON.stringify({ type: "AUTH", payload: { clinicToken: "подделка.подделка.подделка" } })),
	);
	ws.on("message", (d) => {
		if (String(d).includes("AUTH_OK")) verdict = "AUTH_OK";
	});
	ws.on("close", (code) => {
		clearTimeout(timer);
		check("сокет с поддельным токеном не подписан", verdict !== "AUTH_OK", `закрыт кодом ${code}`);
		resolve();
	});
	ws.on("error", () => {});
});

// ── 3. подписка настоящими токенами и приём уведомления ───────────────────
const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const patients = await fetch(`${API}/api/patients`, { headers: H }).then((r) => r.json());
const list = Array.isArray(patients) ? patients : patients?.patients || [];
const patient = list[0];
const prevFamily = (await client.query("select family_group_id from patients where id=$1", [patient.id])).rows[0]
	?.family_group_id ?? null;

let familyId = null;
const received = [];
let ws = null;

try {
	ws = new WebSocket(WS);
	const authOk = await new Promise((resolve) => {
		const timer = setTimeout(() => resolve(false), 8000);
		ws.on("open", () =>
			ws.send(
				JSON.stringify({
					type: "AUTH",
					payload: { clinicToken: login.clinicToken, staffToken: unlock.staffToken },
				}),
			),
		);
		ws.on("message", (d) => {
			const text = String(d);
			if (text === "PONG") {
				received.push({ type: "PONG" });
				return;
			}
			let msg;
			try {
				msg = JSON.parse(text);
			} catch {
				return;
			}
			if (msg.type === "AUTH_OK") {
				clearTimeout(timer);
				resolve(true);
				return;
			}
			received.push(msg);
		});
		ws.on("error", () => {
			clearTimeout(timer);
			resolve(false);
		});
	});
	check("сокет подписан настоящими токенами (AUTH_OK)", authOk, authOk ? "" : "подтверждения не пришло");
	if (!authOk) throw new Error("подписка не удалась, дальше проверять нечего");

	// PING → PONG
	ws.send("PING");
	await new Promise((r) => setTimeout(r, 800));
	check("на PING приходит PONG", received.some((m) => m.type === "PONG"), `получено кадров ${received.length}`);

	// Реальное денежное действие через HTTP.
	const created = await fetch(`${API}/api/finance/family`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ name: `Проверка realtime ${RUN}`, headPatientId: patient.id }),
	}).then((r) => r.json());
	familyId = created.id;
	await client.query("update patients set family_group_id=$1 where id=$2", [familyId, patient.id]);

	received.length = 0;
	const topup = await fetch(`${API}/api/finance/family/topup`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			familyGroupId: familyId,
			patientId: patient.id,
			amountRub: 7300,
			clientMutationId: `${RUN}-topup`,
		}),
	});
	check("пополнение принято по HTTP", topup.ok, `HTTP ${topup.status}`);

	// Ждём уведомление.
	await new Promise((r) => setTimeout(r, 2500));
	const balanceEvent = received.find((m) => m.type === "FAMILY_BALANCE_UPDATED");
	check(
		"уведомление FAMILY_BALANCE_UPDATED дошло до сокета",
		Boolean(balanceEvent),
		balanceEvent
			? `payload ${JSON.stringify(balanceEvent.payload)}`
			: `за 2.5с получено ${received.length} кадров: ${received.map((m) => m.type).join(", ") || "ни одного"}`,
	);

	const dbBalance = (await client.query("select balance from family_groups where id=$1", [familyId])).rows[0].balance;
	check(
		"сумма в уведомлении совпадает с балансом в Postgres",
		Boolean(balanceEvent) && String(balanceEvent.payload?.balance) === String(dbBalance),
		`в уведомлении ${balanceEvent?.payload?.balance}, в БД ${dbBalance}`,
	);
} finally {
	try {
		if (ws) ws.close();
	} catch {}
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

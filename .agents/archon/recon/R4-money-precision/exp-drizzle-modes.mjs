// R4: prove what Drizzle hands to app code for a numeric(12,2) money column in
// each of the two modes the schema actually uses. Real table, real rows, real libs.
// READ-ONLY: two SELECTs against payments, nothing else.
import { readFileSync } from "node:fs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, uuid, numeric } from "drizzle-orm/pg-core";

const SAFE_KOPECKS = Number.MAX_SAFE_INTEGER;
function parseNumericMoney(value) {
	if (value === null || value === undefined) return value ?? null;
	const trimmed = String(value).trim();
	if (trimmed === "") return trimmed;
	if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
	const asNumber = Number(trimmed);
	if (!Number.isFinite(asNumber)) return trimmed;
	if (Math.abs(asNumber) * 100 > SAFE_KOPECKS) return trimmed;
	const scale = trimmed.includes(".") ? trimmed.split(".")[1].length : 0;
	if (asNumber.toFixed(scale) !== trimmed.replace(/^(-?)0*(\d)/, "$1$2")) {
		const normalized = trimmed.replace(/^(-?)0+(\d)/, "$1$2");
		if (asNumber.toFixed(scale) !== normalized) return trimmed;
	}
	return asNumber;
}

const url = readFileSync("C:/Clinic_MVP/dental-crm/.env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

pg.types.setTypeParser(1700, parseNumericMoney); // exactly what client.ts does

const pool = new pg.Pool({ connectionString: url, max: 1 });
const db = drizzle(pool);

// mode:"number" — how payments.amount_rub is really declared (schema.ts:535)
const payNum = pgTable("payments", {
	id: uuid("id"),
	amountRub: numeric("amount_rub", { precision: 12, scale: 2, mode: "number" }),
});
// no mode — how family_groups.balance is really declared (schema.ts:1724)
const payStr = pgTable("payments", {
	id: uuid("id"),
	amountRub: numeric("amount_rub", { precision: 12, scale: 2 }),
});

// Same deterministic ORDER BY on all three reads so the rows line up.
const raw = await pool.query(
	`select id, amount_rub, amount_rub::text as as_text from payments order by amount_rub, id`,
);
const asNumber = (await db.select({ id: payNum.id, a: payNum.amountRub }).from(payNum)).sort(
	(x, y) => x.a - y.a || String(x.id).localeCompare(String(y.id)),
);
const asString = (await db.select({ id: payStr.id, a: payStr.amountRub }).from(payStr)).sort(
	(x, y) => Number(x.a) - Number(y.a) || String(x.id).localeCompare(String(y.id)),
);
for (let i = 0; i < raw.rows.length; i++) {
	if (raw.rows[i].id !== asNumber[i].id || raw.rows[i].id !== asString[i].id) {
		throw new Error(`row alignment broken at ${i} — refusing to print misleading output`);
	}
}

console.log("=== real rows from payments.amount_rub, same DB, same process ===");
console.log("stored text | raw driver value      | drizzle mode:number | drizzle default (string)");
for (let i = 0; i < raw.rows.length; i++) {
	console.log(
		`${String(raw.rows[i].as_text).padEnd(11)} | ${(typeof raw.rows[i].amount_rub + " " + JSON.stringify(raw.rows[i].amount_rub)).padEnd(21)} | ${(typeof asNumber[i].a + " " + JSON.stringify(asNumber[i].a)).padEnd(19)} | ${typeof asString[i].a} ${JSON.stringify(asString[i].a)}`,
	);
}

console.log("\n=== does the string-mode value keep two decimals? ===");
console.log(
	`  DB text "14800.00"  ->  string-mode app value ${JSON.stringify(asString[0]?.a)}  ` +
		`keeps ".00"? ${String(asString[0]?.a).includes(".") ? "yes" : "NO"}`,
);

console.log("\n=== what the money util does with each shape ===");
// parseKopecks logic, byte-copied from packages/shared/src/utils/money.ts:53-76
function parseKopecks(value) {
	if (value === null || value === undefined || value === "") return 0;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new Error("not a number");
		if (Number.isInteger(value)) return value * 100;
		return parseKopecks(value.toFixed(2));
	}
	const text = value.trim();
	const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
	if (!m) throw new Error(`Не похоже на денежное значение: "${value}"`);
	const [, sign, whole, fraction = ""] = m;
	const k = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
	return sign ? -k : k;
}
for (const v of ["1500.50", "1500.5", 1500.5, "1500.005", "1500.500", 1500]) {
	let out;
	try {
		out = parseKopecks(v);
	} catch (e) {
		out = "THROWS: " + e.message;
	}
	console.log(`  parseKopecks(${typeof v} ${JSON.stringify(v)}) -> ${out}`);
}

await pool.end();

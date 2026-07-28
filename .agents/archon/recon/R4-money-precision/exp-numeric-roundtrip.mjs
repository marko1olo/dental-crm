// R4 experiment: what value shape does money actually reach app code as?
// Uses the REAL installed pg + drizzle-orm + a byte-copy of the real parser.
// READ-ONLY: every statement is a SELECT of literals; touches no table.
import { readFileSync } from "node:fs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, numeric, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---- byte-copy of apps/api/src/db/moneyTypeParsers.ts parseNumericMoney ----
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
// ---------------------------------------------------------------------------

const url = readFileSync("C:/Clinic_MVP/dental-crm/.env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

pg.types.setTypeParser(1700, parseNumericMoney);

const pool = new pg.Pool({ connectionString: url, max: 1 });
const db = drizzle(pool);

const probe = pgTable("probe", {
	amountRub: numeric("amount_rub", { precision: 12, scale: 2 }),
});

const VALUES = [
	"1500.50", "1500.00", "0.10", "0.01", "0.00", "-0.00", "-1500.50",
	"9999999999.99", "1234567.89", "100.30", "0.07", "20.20", "3.30",
];

console.log("=== A. RAW DRIVER PATH (pool.query -> what the parser returns) ===");
for (const v of VALUES) {
	const r = await pool.query(`select $1::numeric(12,2) as amount_rub`, [v]);
	const got = r.rows[0].amount_rub;
	console.log(
		`  stored ${v.padEnd(14)} -> ${typeof got} ${JSON.stringify(got)}`,
	);
}

console.log("\n=== B. DRIZZLE COLUMN PATH (numeric() default mode) ===");
for (const v of VALUES) {
	const rows = await db
		.select({ amountRub: probe.amountRub })
		.from(sql`(select ${v}::numeric(12,2) as amount_rub) as probe`);
	const got = rows[0].amountRub;
	console.log(
		`  stored ${v.padEnd(14)} -> ${typeof got} ${JSON.stringify(got)}`,
	);
}

console.log("\n=== C. SAME COLUMN, TWO PATHS, SAME PROCESS: do they agree? ===");
for (const v of ["1500.50", "1500.00", "0.10"]) {
	const raw = (await pool.query(`select $1::numeric(12,2) as a`, [v])).rows[0].a;
	const rows = await db
		.select({ amountRub: probe.amountRub })
		.from(sql`(select ${v}::numeric(12,2) as amount_rub) as probe`);
	const dz = rows[0].amountRub;
	console.log(
		`  ${v.padEnd(10)} raw=${typeof raw}:${JSON.stringify(raw)}  drizzle=${typeof dz}:${JSON.stringify(dz)}  strictEqual=${raw === dz}`,
	);
}

console.log("\n=== D. FLOAT ARITHMETIC ON THE PARSED NUMBERS ===");
const parts = ["0.10", "0.20", "1500.50", "100.30", "3.30", "20.20", "0.07"];
let jsSum = 0;
for (const p of parts) {
	jsSum += (await pool.query(`select $1::numeric(12,2) as a`, [p])).rows[0].a;
}
const pgSum = (
	await pool.query(
		`select (${parts.map((p) => `${p}::numeric(12,2)`).join("+")}) as s`,
	)
).rows[0].s;
console.log(`  JS  sum of the 7 parsed numbers : ${jsSum}`);
console.log(`  SQL sum of the same 7 numerics  : ${pgSum}`);
console.log(`  identical? ${jsSum === pgSum}   diff=${jsSum - pgSum}`);
console.log(`  JS sum toFixed(2) = ${jsSum.toFixed(2)}`);

console.log("\n=== E. HIGHER-SCALE numeric COLUMNS (qty / score / temp) ===");
for (const [v, t] of [
	["0.1235", "numeric(5,4) match_score"],
	["1.0005", "numeric(12,4) required_qty"],
	["8.1650", "numeric(12,4) required_qty"],
	["1.005", "numeric(10,3) current_qty"],
	["36.6", "numeric(5,1) temperature"],
	["0.995", "numeric(4,3) confidence"],
]) {
	const scale = v.split(".")[1]?.length ?? 0;
	const r = await pool.query(`select $1::numeric(12,${scale}) as a`, [v]);
	const got = r.rows[0].a;
	console.log(`  ${t.padEnd(28)} ${v.padEnd(9)} -> ${typeof got} ${JSON.stringify(got)}`);
}

await pool.end();

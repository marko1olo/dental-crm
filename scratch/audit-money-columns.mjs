/**
 * Инвентаризация денежных колонок в живой базе.
 *
 * Правило проекта: деньги хранятся целыми копейками и не теряются при
 * делении. Колонка типа integer с названием *_rub хранит рубли целыми —
 * значит копейки в неё физически не влезают, а numeric без масштаба или
 * с масштабом меньше 2 теряет копейки при округлении.
 *
 * Печатаем тип, масштаб и заполненность, чтобы отличить настоящую
 * проблему от неиспользуемой колонки.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL не найден");
	return line.slice("DATABASE_URL=".length).trim();
}

const c = new pg.Client({ connectionString: databaseUrl() });
await c.connect();

const cols = (
	await c.query(`
	select table_name, column_name, data_type, numeric_precision, numeric_scale
	  from information_schema.columns
	 where table_schema = 'public'
	   and (
	     column_name ~ '(rub|amount|price|cost|sum|total|balance|kopeck|kop|salary|payout|discount|deposit|fee|tariff)'
	   )
	 order by table_name, column_name
`)
).rows;

const money = cols.filter((r) => !/^(id|.*_id)$/.test(r.column_name));

// Опасные: целые числа в рублях и numeric с недостаточным масштабом.
const integerRub = money.filter((r) => /^(integer|bigint|smallint)$/.test(r.data_type));
const looseNumeric = money.filter((r) => r.data_type === "numeric" && (r.numeric_scale === null || r.numeric_scale < 2));
const doubles = money.filter((r) => /^(double precision|real)$/.test(r.data_type));
const ok = money.filter((r) => r.data_type === "numeric" && r.numeric_scale >= 2);

async function rowsWithData(table, column) {
	try {
		const r = await c.query(`select count(*)::int as n from "${table}" where "${column}" is not null`);
		return r.rows[0].n;
	} catch {
		return -1;
	}
}

console.log(`Денежных колонок найдено: ${money.length}\n`);

console.log(`=== ЦЕЛЫЕ ЧИСЛА (копейки не влезают): ${integerRub.length} ===`);
for (const r of integerRub) {
	const n = await rowsWithData(r.table_name, r.column_name);
	console.log(`  ${r.table_name}.${r.column_name}  ${r.data_type}  заполнено строк: ${n}`);
}

console.log(`\n=== ЧИСЛА С ПЛАВАЮЩЕЙ ТОЧКОЙ (деньгам противопоказаны): ${doubles.length} ===`);
for (const r of doubles) {
	const n = await rowsWithData(r.table_name, r.column_name);
	console.log(`  ${r.table_name}.${r.column_name}  ${r.data_type}  заполнено строк: ${n}`);
}

console.log(`\n=== NUMERIC БЕЗ КОПЕЕК (масштаб < 2): ${looseNumeric.length} ===`);
for (const r of looseNumeric) {
	const n = await rowsWithData(r.table_name, r.column_name);
	console.log(`  ${r.table_name}.${r.column_name}  numeric(${r.numeric_precision},${r.numeric_scale})  заполнено строк: ${n}`);
}

console.log(`\n=== ПОРЯДОК (numeric с масштабом >= 2): ${ok.length} ===`);
for (const r of ok) console.log(`  ${r.table_name}.${r.column_name}  numeric(${r.numeric_precision},${r.numeric_scale})`);

await c.end();

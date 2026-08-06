const fs = require("node:fs");
const { Client } = require("pg");
function u() {
	for (const l of fs.readFileSync("../../.env", "utf8").split(/\r?\n/)) {
		const i = l.indexOf("=");
		if (i > 0 && l.slice(0, i).trim() === "DATABASE_URL")
			return l
				.slice(i + 1)
				.trim()
				.replace(/^["']|["']$/g, "");
	}
	throw new Error("no url");
}
const Q = [
	[
		"egisz_logs_fks",
		`select tc.constraint_name, kcu.column_name, ccu.table_name as ref_table, ccu.column_name as ref_col
 from information_schema.table_constraints tc
 join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name
 join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name
 where tc.table_name='egisz_logs' and tc.constraint_type='FOREIGN KEY'`,
	],
];
(async () => {
	const c = new Client({ connectionString: u() });
	await c.connect();
	for (const [l, s] of Q) {
		try {
			const r = await c.query(s);
			console.log("### " + l + " (" + r.rowCount + ")");
			console.log(JSON.stringify(r.rows));
		} catch (e) {
			console.log("### " + l + " ERROR: " + e.message);
		}
	}
	await c.end();
})().catch((e) => {
	console.error("FATAL", e.message);
	process.exit(1);
});

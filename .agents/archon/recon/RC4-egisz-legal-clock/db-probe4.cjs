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
		"generated_documents_columns",
		"select column_name,data_type from information_schema.columns where table_schema='public' and table_name='generated_documents' order by ordinal_position",
	],
	[
		"visits_total_and_orgs",
		"select organization_id,count(*) from visits group by 1",
	],
	[
		"tooth_states_by_org",
		"select organization_id,count(*) from tooth_states group by 1",
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

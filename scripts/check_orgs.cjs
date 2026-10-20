const { Pool } = require("pg");
const { DEMO_SHOWCASE_ORG_ID } = require("@dental/shared");
const pool = new Pool({
	connectionString: "postgres://postgres:postgres@127.0.0.1:5432/dental_crm",
});

async function run() {
	try {
		console.log("DEMO_SHOWCASE_ORG_ID:", DEMO_SHOWCASE_ORG_ID);
		const org = await pool.query("SELECT id, name FROM organizations WHERE id = $1", [DEMO_SHOWCASE_ORG_ID]);
		console.log("Found demo org in DB?", org.rows);
		if (org.rows.length === 0) {
			console.log("Inserting DEMO_SHOWCASE_ORG_ID into organizations...");
			await pool.query(
				"INSERT INTO organizations (id, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
				[DEMO_SHOWCASE_ORG_ID, "Стоматология ДЕНТЕ (Демо)"]
			);
			console.log("DEMO_SHOWCASE_ORG_ID inserted successfully!");
		}
	} catch (e) {
		console.error("DB Error:", e.message);
	} finally {
		await pool.end();
	}
}

run();

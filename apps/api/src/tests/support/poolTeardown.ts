import { after } from "node:test";
import { pool } from "../../db/client.js";

after(async () => {
	try {
		await pool.end();
	} catch {
		// pool may already be closed
	}
});

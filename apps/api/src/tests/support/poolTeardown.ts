import { after } from "node:test";
import { endPool } from "../../db/client.js";

// Ensure test environment variables are properly initialized
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS =
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS || "1";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS =
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS || "1";

after(async () => {
	console.log("[POOL TEARDOWN] running");
	try {
		// endPool вместо pool.end(): закрытие одно на процесс и идемпотентно, так
		// что этот хук не спорит с файлами, закрывающими пул своим after().
		await endPool();
	} catch {
		// pool may already be closed
	}
});

import { after } from "node:test";
import { endPool } from "../../db/client.js";

after(async () => {
	try {
		// endPool вместо pool.end(): закрытие одно на процесс и идемпотентно, так
		// что этот хук не спорит с файлами, закрывающими пул своим after().
		await endPool();
	} catch {
		// pool may already be closed
	}
});

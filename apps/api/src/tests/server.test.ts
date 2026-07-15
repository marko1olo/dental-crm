import assert from "node:assert";
import { test } from "node:test";
import { createDenteApiApp } from "../server.js";

test("createDenteApiApp - rejects insecure origins in production", async () => {
	const originalEnv = process.env.NODE_ENV;
	const originalOrigin = process.env.WEB_ORIGIN;

	process.env.NODE_ENV = "production";
	process.env.WEB_ORIGIN = "*";

	await assert.rejects(
		async () => {
			await createDenteApiApp({ startTelegramWorker: false });
		},
		{
			message:
				'Insecure WEB_ORIGIN configured: "*" is not allowed in production',
		},
	);

	process.env.WEB_ORIGIN = "null";
	await assert.rejects(
		async () => {
			await createDenteApiApp({ startTelegramWorker: false });
		},
		{
			message:
				'Insecure WEB_ORIGIN configured: "null" is not allowed in production',
		},
	);

	process.env.WEB_ORIGIN = "https://example.com";
	const app = await createDenteApiApp({ startTelegramWorker: false });
	assert.ok(app);
	await app.close();

	process.env.NODE_ENV = originalEnv;
	process.env.WEB_ORIGIN = originalOrigin;
});

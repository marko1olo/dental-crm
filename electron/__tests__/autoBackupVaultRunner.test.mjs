import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import zlib from "node:zlib";
import autoBackupVaultRunner from "../src/autoBackupVaultRunner.cjs";

test("autoBackupVaultRunner fails closed without CLINIC_ENCRYPTION_KEY and never emits plaintext .sql.gz", async () => {
	const vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dente-vault-nokey-"));
	const prevKey = process.env.CLINIC_ENCRYPTION_KEY;
	delete process.env.CLINIC_ENCRYPTION_KEY;

	try {
		const resMissing = await autoBackupVaultRunner.runPgDumpStreamBackup({ vaultDir: vaultRoot });
		assert.equal(resMissing.success, false);
		assert.equal(resMissing.error.includes("CLINIC_ENCRYPTION_KEY"), true);
		assert.deepEqual(await autoBackupVaultRunner.listVaultBackups({ vaultDir: vaultRoot }), []);

		const resPlaceholder = await autoBackupVaultRunner.runPgDumpStreamBackup({
			vaultDir: vaultRoot,
			encryptionKey: "DUMMY_SAMPLE_KEY_NOT_A_REAL_SECRET",
		});
		assert.equal(resPlaceholder.success, false);
		assert.deepEqual(await autoBackupVaultRunner.listVaultBackups({ vaultDir: vaultRoot }), []);
	} finally {
		if (prevKey !== undefined) process.env.CLINIC_ENCRYPTION_KEY = prevKey;
		fs.rmSync(vaultRoot, { recursive: true, force: true });
	}
});

test("autoBackupVaultRunner encrypts local pg_dump stream with AEAD AES-256-GCM + AuthTag and rejects tampering", async () => {
	const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dente-vault-gcm-"));
	const fakeDumpScript = path.join(tmpRoot, "mock_pg_dump.cjs");
	const sampleSql = "-- PostgreSQL database dump\nCOPY public.patients FROM stdin;\n1\tTest\n\\.\n";
	fs.writeFileSync(
		fakeDumpScript,
		`process.stdout.write(${JSON.stringify(sampleSql)});\n`,
		"utf8",
	);

	const rawKey = "0123456789abcdef0123456789abcdef";
	try {
		const res = await autoBackupVaultRunner.runPgDumpStreamBackup({
			vaultDir: path.join(tmpRoot, "vault"),
			pgDumpPath: process.execPath,
			spawnFn: (_bin, _args, opts) => spawn(process.execPath, [fakeDumpScript], opts),
			pgPassword: "test-pg-password",
			encryptionKey: rawKey,
		});

		assert.equal(res.success, true, res.error);
		assert.equal(res.encryption, "aes-256-gcm");
		assert.ok(res.fileName.endsWith(".sql.gz.enc"));

		const encrypted = fs.readFileSync(res.filePath);
		assert.deepEqual(
			encrypted.subarray(0, autoBackupVaultRunner.VAULT_MAGIC.length),
			autoBackupVaultRunner.VAULT_MAGIC,
		);

		const ivStart = autoBackupVaultRunner.VAULT_MAGIC.length;
		const cipherStart = ivStart + autoBackupVaultRunner.VAULT_GCM_IV_BYTES;
		const tagStart = encrypted.length - autoBackupVaultRunner.VAULT_GCM_TAG_BYTES;
		const iv = encrypted.subarray(ivStart, cipherStart);
		const ciphertext = encrypted.subarray(cipherStart, tagStart);
		const authTag = encrypted.subarray(tagStart);

		const decipher = crypto.createDecipheriv(
			"aes-256-gcm",
			Buffer.from(rawKey, "utf8"),
			iv,
		);
		decipher.setAuthTag(authTag);
		const gunzipped = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
		const plaintext = zlib.gunzipSync(gunzipped).toString("utf8");
		assert.equal(plaintext, sampleSql);

		// Flip a byte in ciphertext and prove GCM AuthTag fails authentication
		const tampered = Buffer.from(ciphertext);
		tampered[0] = tampered[0] ^ 0xff;
		const badDecipher = crypto.createDecipheriv(
			"aes-256-gcm",
			Buffer.from(rawKey, "utf8"),
			iv,
		);
		badDecipher.setAuthTag(authTag);
		assert.throws(() => {
			Buffer.concat([badDecipher.update(tampered), badDecipher.final()]);
		});
	} finally {
		fs.rmSync(tmpRoot, { recursive: true, force: true });
	}
});

test("triggerApiBackup and runVaultBackupCycle call /api/settings/backup/create with staff token", async () => {
	const received = [];
	const srv = http.createServer((req, res) => {
		let body = "";
		req.on("data", (c) => {
			body += c;
		});
		req.on("end", () => {
			received.push({
				method: req.method,
				url: req.url,
				auth: req.headers.authorization,
				staffToken: req.headers["x-dente-staff-token"],
				body,
			});
			res.writeHead(200, { "content-type": "application/json" });
			res.end(JSON.stringify({ success: true, format: "DENTETB2" }));
		});
	});

	await new Promise((r) => srv.listen(0, "127.0.0.1", r));
	const { port } = srv.address();
	try {
		const baseUrl = `http://127.0.0.1:${port}`;
		const res = await autoBackupVaultRunner.triggerApiBackup(baseUrl, "staff-tok-123");
		assert.equal(res.ok, true);
		assert.equal(received.length, 1);
		assert.equal(received[0].method, "POST");
		assert.equal(received[0].url, "/api/settings/backup/create");
		assert.equal(received[0].auth, "Bearer staff-tok-123");
		assert.equal(received[0].staffToken, "staff-tok-123");
		assert.equal(received[0].body, "{}");

		const cycleRes = await autoBackupVaultRunner.runVaultBackupCycle({
			apiBaseUrl: () => baseUrl,
			authToken: () => "staff-tok-456",
		});
		assert.equal(cycleRes.success, true);
		assert.equal(cycleRes.mode, "api");
		assert.equal(received[1].url, "/api/settings/backup/create");
	} finally {
		await new Promise((r) => srv.close(r));
	}
});

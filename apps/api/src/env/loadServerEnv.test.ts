import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	getLoadedServerEnvFiles,
	loadAdditionalServerEnv,
} from "./loadServerEnv.js";

/**
 * Каталог теста обязан лежать вне репозитория.
 *
 * Было path.join(process.cwd(), ".test-env-dir") — внутри проекта. Поиск
 * файлов окружения помимо cwd просматривает ещё и cwd/../.., поэтому
 * подхватывались настоящие .env проекта: тест на слияние GROQ_API_KEYS получал
 * к своим key1,key2,key3 ещё и живые ключи из рабочего окружения. Мало того что
 * проверка становилась зависимой от машины — при падении node печатает
 * фактическое значение, то есть настоящие ключи утекали в вывод тестов и в
 * логи CI.
 *
 * mkdtemp в системном временном каталоге: и cwd, и cwd/../.. заведомо пусты.
 */
let TEST_DIR = "";

describe("loadAdditionalServerEnv", () => {
	let originalEnv: NodeJS.ProcessEnv;
	let originalCwd: () => string;

	beforeEach(() => {
		originalEnv = { ...process.env };
		originalCwd = process.cwd;
		TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "dente-env-test-"));

		// Clear relevant process.env variables
		delete process.env.DENTAL_ENV_FILE;
		delete process.env.DENTAL_SPEECH_ENV_FILE;
		delete process.env.DENTAL_EXTRA_ENV_FILES;
		delete process.env.GROQ_API_KEYS;
		delete process.env.TEST_VAR;
		delete process.env.EXISTING_VAR;
		delete process.env.VAR1;
		delete process.env.VAR2;
		delete process.env.VAR3;
		delete process.env.VAR4;

		process.cwd = () => TEST_DIR;
	});

	afterEach(() => {
		// Restore process.env keys safely instead of replacing the proxy object
		for (const key in process.env) {
			delete process.env[key];
		}
		for (const key in originalEnv) {
			if (originalEnv[key] !== undefined) {
				process.env[key] = originalEnv[key];
			}
		}
		process.cwd = originalCwd;
		fs.rmSync(TEST_DIR, { recursive: true, force: true });
	});

	test("loads base env files if they exist", () => {
		fs.writeFileSync(path.join(TEST_DIR, ".env.local"), "TEST_VAR=base_value");

		const loaded = loadAdditionalServerEnv();

		assert.strictEqual(process.env.TEST_VAR, "base_value");
		assert(loaded.includes(path.resolve(TEST_DIR, ".env.local")));
	});

	test("does not overwrite existing environment variables", () => {
		process.env.EXISTING_VAR = "existing_value";
		fs.writeFileSync(
			path.join(TEST_DIR, ".env"),
			"EXISTING_VAR=new_value\nTEST_VAR=new_test_value",
		);

		const loaded = loadAdditionalServerEnv();

		assert.strictEqual(process.env.EXISTING_VAR, "existing_value"); // should remain
		assert.strictEqual(process.env.TEST_VAR, "new_test_value"); // should be added
	});

	test("merges mergeable env keys like GROQ_API_KEYS", () => {
		process.env.GROQ_API_KEYS = "key1";
		fs.writeFileSync(path.join(TEST_DIR, ".env"), "GROQ_API_KEYS=key2,key3");

		loadAdditionalServerEnv();

		assert.strictEqual(process.env.GROQ_API_KEYS, "key1,key2,key3");
	});

	test("loads explicit env files and does NOT recursively follow DENTAL_EXTRA_ENV_FILES since it does not overwrite existing ones", () => {
		const explicitEnv = path.join(TEST_DIR, "explicit.env");
		const extra1 = path.join(TEST_DIR, "extra1.env");
		const extra2 = path.join(TEST_DIR, "extra2.env");

		fs.writeFileSync(explicitEnv, "VAR1=val1");
		fs.writeFileSync(extra1, `VAR2=val2\nDENTAL_EXTRA_ENV_FILES=${extra2}`);
		fs.writeFileSync(extra2, "VAR3=val3");

		process.env.DENTAL_ENV_FILE = explicitEnv;
		process.env.DENTAL_EXTRA_ENV_FILES = `${extra1}`;

		const loaded = loadAdditionalServerEnv();

		assert.strictEqual(process.env.VAR1, "val1");
		assert.strictEqual(process.env.VAR2, "val2");

		assert.strictEqual(process.env.VAR3, undefined);

		const expectedLoaded = [explicitEnv, extra1];

		for (const f of expectedLoaded) {
			assert(loaded.includes(f), `Missing loaded file ${f}`);
		}
	});

	test("ignores missing files without erroring", () => {
		const loaded = loadAdditionalServerEnv();
		assert.strictEqual(Array.isArray(loaded), true);
	});
});

describe("getLoadedServerEnvFiles", () => {
	let tmpDir: string;
	let env1: string;
	let env2: string;
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-test-"));
		env1 = path.join(tmpDir, ".env.test1");
		env2 = path.join(tmpDir, ".env.test2");
		fs.writeFileSync(env1, "VAR1=1\n");
		fs.writeFileSync(env2, "VAR2=2\n");
	});

	afterEach(() => {
		for (const key in process.env) {
			delete process.env[key];
		}
		for (const key in originalEnv) {
			if (originalEnv[key] !== undefined) {
				process.env[key] = originalEnv[key];
			}
		}
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	test("returns deduplicated array of loaded env files", async () => {
		// Этот блок не подменяет cwd, поэтому загружаются и настоящие .env проекта.
		// Прежний замер «стало ровно на 2 больше» исходил из того, что других
		// файлов нет: на рабочей машине их семь, и тест падал (9 вместо 7).
		// Сначала даём загрузчику осесть, затем меряем прирост — список
		// дедуплицируется, поэтому повторный вызов ничего не добавляет.
		loadAdditionalServerEnv();
		const initialFiles = getLoadedServerEnvFiles();

		process.env.DENTAL_EXTRA_ENV_FILES = `${env1},${env2}`;

		loadAdditionalServerEnv();

		const afterFirstLoad = getLoadedServerEnvFiles();
		assert.ok(afterFirstLoad.includes(env1), "Should include env1");
		assert.ok(afterFirstLoad.includes(env2), "Should include env2");

		// We expect the original array to have grown by exactly 2
		assert.strictEqual(
			afterFirstLoad.length,
			initialFiles.length + 2,
			"Should add exactly 2 new files",
		);

		// Load again to verify deduplication
		loadAdditionalServerEnv();
		const afterSecondLoad = getLoadedServerEnvFiles();

		assert.strictEqual(
			afterSecondLoad.length,
			afterFirstLoad.length,
			"Length should remain the same due to deduplication",
		);
		assert.deepStrictEqual(
			afterSecondLoad,
			afterFirstLoad,
			"Contents should remain the same due to deduplication",
		);
	});

	test("returns a new array instance to prevent accidental mutation of internal state", async () => {
		const files1 = getLoadedServerEnvFiles();
		const files2 = getLoadedServerEnvFiles();

		// The references should not be exactly the same
		assert.notStrictEqual(files1, files2, "Should return a new array instance");

		// Mutating the returned array should not affect subsequent calls
		const originalLength = files1.length;
		files1.push("/fake/path.env");

		const files3 = getLoadedServerEnvFiles();
		assert.strictEqual(
			files3.length,
			originalLength,
			"Internal state should not be mutated by modifying returned array",
		);
	});
});

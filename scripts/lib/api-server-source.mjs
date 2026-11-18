/**
 * api-server-source.mjs — единый источник для проверок, ищущих маркеры в коде сервера API.
 *
 * ЗАЧЕМ: после декомпозиции монолита `apps/api/src/server.ts` (1093 строки) в
 * модули `apps/api/src/serverModules/*.ts`, файл `server.ts` стал тонким фасадом (<= 25 строк).
 * Проверки (smoke-тесты), инспектирующие реализацию хуков, CSP, обработку ошибок
 * и воркеров, читают объединённый исходный код сервера через этот модуль
 * аналогично `scripts/lib/app-logic-source.mjs`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const API_SOURCE_ROOT = "apps/api/src";
const ENTRY_FILE = path.join(API_SOURCE_ROOT, "server.ts");
const MODULES_DIR = path.join(API_SOURCE_ROOT, "serverModules");

/** Файлы, из которых складывается сервер API: тонкий фасад + подмодули. */
export function apiServerSourceFiles() {
	const files = [ENTRY_FILE];
	if (existsSync(MODULES_DIR)) {
		try {
			const entries = readdirSync(MODULES_DIR, { withFileTypes: true });
			for (const entry of entries) {
				if (
					entry.isFile() &&
					entry.name.endsWith(".ts") &&
					!entry.name.endsWith(".test.ts")
				) {
					files.push(path.join(MODULES_DIR, entry.name));
				}
			}
		} catch {
			// Папки модулей может не быть
		}
	}
	return files;
}

export function readApiServerSourceSync() {
	return apiServerSourceFiles()
		.map((file) => readFileSync(file, "utf8"))
		.join("\n");
}

export async function readApiServerSource() {
	return readApiServerSourceSync();
}

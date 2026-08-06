/**
 * app-logic-source.mjs — единый источник для проверок, ищущих маркеры в логике
 * приложения.
 *
 * ЗАЧЕМ: раньше вся логика лежала одним файлом `apps/web/src/useAppLogic.tsx`,
 * и десятки smoke-проверок читали именно его. Часть кода вынесена в
 * `apps/web/src/hooks/domains/*.ts` — и 35 проверок начали падать на том, что
 * код ПЕРЕЕХАЛ, а не на том, что он сломался. Например
 * `speechTranscriptionMatchesActiveVisit` (защита от применения расшифровки
 * диктовки к карточке другого пациента) никуда не делся — он теперь в
 * useVisitLogic.ts.
 *
 * Такие падения опаснее, чем кажется: в 86 красных проверках настоящие
 * регрессии не видно.
 *
 * Проверки, которым важен именно файл useAppLogic.tsx (например, ограничение
 * на его размер), должны читать его напрямую, а не через этот модуль.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const WEB_SOURCE_ROOT = "apps/web/src";
const ENTRY_FILE = path.join(WEB_SOURCE_ROOT, "useAppLogic.tsx");
const DOMAINS_DIR = path.join(WEB_SOURCE_ROOT, "hooks", "domains");

/** Файлы, из которых складывается логика приложения: точка входа + домены. */
export function appLogicSourceFiles() {
	let domains = [];
	try {
		domains = readdirSync(DOMAINS_DIR)
			.filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
			.sort()
			.map((name) => path.join(DOMAINS_DIR, name));
	} catch {
		// Папки доменов может не быть — тогда источник только один.
	}
	return [ENTRY_FILE, ...domains];
}

export function readAppLogicSourceSync() {
	return appLogicSourceFiles()
		.map((file) => readFileSync(file, "utf8"))
		.join("\n");
}

export async function readAppLogicSource() {
	return readAppLogicSourceSync();
}

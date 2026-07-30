/**
 * Ищет дубли method+path среди файлов маршрутов.
 *
 * Fastify падает при старте на повторной регистрации того же method+path.
 * Прежде чем подключать 11 модулей, которые никогда не регистрировались, надо
 * убедиться, что они не переопределяют уже работающие маршруты.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROUTES_DIR = "apps/api/src/routes";
const server = readFileSync("apps/api/src/server.ts", "utf8");

const UNREGISTERED = [
	"files",
	"finance_family",
	"imaging_planning",
	"insurance",
	"lab",
	"leads",
	"max",
	"sterilization",
	"vk",
	"waitlist",
	"whatsapp",
];

/** method+path -> список файлов, где он объявлен */
const routes = new Map();

const collect = (file, text) => {
	// app.get("/path", ...) и многострочный вариант app.post(\n  "/path",
	const re = /app\.(get|post|put|patch|delete|options|head)\(\s*[`"']([^`"']+)[`"']/gi;
	for (const m of text.matchAll(re)) {
		const key = `${m[1].toUpperCase()} ${m[2]}`;
		if (!routes.has(key)) routes.set(key, new Set());
		routes.get(key).add(file);
	}
};

const walk = (dir) => {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full);
		else if (entry.name.endsWith(".ts")) {
			collect(path.relative(ROUTES_DIR, full).replace(/\\/g, "/"), readFileSync(full, "utf8"));
		}
	}
};
walk(ROUTES_DIR);

const moduleOf = (file) => file.replace(/\.ts$/, "").split("/")[0];
const isRegistered = (file) => {
	const mod = moduleOf(file);
	if (UNREGISTERED.includes(mod)) return false;
	// Считаем зарегистрированным, если server.ts упоминает файл или его модуль.
	return server.includes(`/routes/${mod}.js`) || server.includes(`/routes/${file.replace(/\.ts$/, ".js")}`);
};

let collisions = 0;
for (const [key, files] of [...routes].sort()) {
	if (files.size < 2) continue;
	const list = [...files];
	const touchesNew = list.some((f) => UNREGISTERED.includes(moduleOf(f)));
	if (!touchesNew) continue;
	const registered = list.filter(isRegistered);
	const marker = registered.length > 0 ? "КОНФЛИКТ" : "оба выключены";
	console.log(`${marker}: ${key}`);
	for (const f of list) {
		console.log(`    ${f}${isRegistered(f) ? "  [зарегистрирован]" : ""}`);
	}
	if (registered.length > 0) collisions += 1;
}

console.log(
	`\nвсего путей: ${routes.size}; конфликтов с уже работающими маршрутами: ${collisions}`,
);
process.exit(collisions > 0 ? 1 : 0);
